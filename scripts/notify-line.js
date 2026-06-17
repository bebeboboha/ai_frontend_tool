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

const extractTopPicks = (summary) => {
  const picks = [...summary.matchAll(/### \d+\. (.+)\n- \*\*重點\*\*：(.+)/g)]

  return picks
    .slice(0, 3)
    .map(([, title, point], index) => `${index + 1}. ${title}\n   ${point.trim()}`)
    .join('\n\n')
}

export const buildLineMessage = ({ summary, date }) => {
  const headline = extractHeadline(summary)
  const topPicks = extractTopPicks(summary)

  const parts = [
    `📋 AI 每日摘要 — ${date}`,
    '',
    `💡 ${headline}`,
  ]

  if (topPicks) {
    parts.push('', '🎬 Top 3 精選', topPicks)
  }

  return truncate(parts.join('\n'), 4800)
}

export const sendLineNotification = async ({ summary, date }) => {
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
          text: buildLineMessage({ summary, date }),
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
