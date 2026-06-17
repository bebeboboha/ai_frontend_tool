import { getSummaryPageUrl } from './generate-site.js'
import { formatViewCount } from './fetch-youtube.js'
import { fetch } from './http.js'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const LINE_USER_ID = process.env.LINE_USER_ID

const truncate = (text, maxLength) => {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

const extractHeadline = (summary) => {
  const match = summary.match(/## 今日一句話\n+([\s\S]+?)(?=\n## |$)/)
  return match?.[1]?.trim() ?? '今日摘要已更新'
}

const extractSummaryPicks = (summary) => {
  const contentMatches = [
    ...summary.matchAll(/### \d+\. (.+)\n- \*\*內容摘要\*\*：([\s\S]+?)(?=\n- \*\*)/g),
  ]

  if (contentMatches.length > 0) {
    return contentMatches.map(([, title, content]) => ({
      title: title.trim(),
      point: content.trim().replace(/\n+/g, ' ').slice(0, 150),
    }))
  }

  return [...summary.matchAll(/### \d+\. (.+)\n- \*\*重點\*\*：(.+)/g)].map(([, title, point]) => ({
    title: title.trim(),
    point: point.trim(),
  }))
}

const formatTopPicks = (summary, videos) => {
  const summaryPicks = extractSummaryPicks(summary)

  return videos.slice(0, 3).map((video, index) => {
    const pick = summaryPicks[index]
    const title = pick?.title ?? video.title
    const point = pick?.point ?? truncate(video.description, 60)

    return `${index + 1}. ${title}\n   ${point}\n   👀 ${formatViewCount(video.viewCount)} 次觀看\n   🔗 ${video.url}`
  })
}

export const buildLineMessage = ({ summary, date, videos = [], pageUrl }) => {
  const headline = extractHeadline(summary)
  const topItems = formatTopPicks(summary, videos)
  const fullPageUrl = pageUrl || getSummaryPageUrl(date)

  const parts = [`📋 AI 每日摘要 — ${date}`, '', `💡 ${headline}`]

  if (topItems.length > 0) {
    parts.push('', '🎬 Top 3 精選', topItems.join('\n\n'))
  }

  parts.push('', '📖 查看完整摘要：', fullPageUrl)

  return truncate(parts.join('\n'), 4800)
}

export const sendLineNotification = async ({ summary, date, videos = [], pageUrl }) => {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_USER_ID) {
    console.log('ℹ️  未設定 LINE 憑證，跳過通知')
    return false
  }

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: LINE_USER_ID,
      messages: [
        {
          type: 'text',
          text: buildLineMessage({ summary, date, videos, pageUrl }),
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`LINE 通知失敗 (${response.status}): ${errorBody}`)
  }

  console.log('📱 LINE 通知已送出')
  return true
}
