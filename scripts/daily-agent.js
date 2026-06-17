import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import 'dotenv/config'
import {
  HOURS_AGO,
  KEYWORDS,
  MAX_RESULTS_PER_KEYWORD,
  MAX_TOTAL_VIDEOS,
  MAX_VIDEOS_FOR_SUMMARY,
  MIN_RELEVANCE_SCORE,
  OUTPUT_DIR,
} from './config.js'
import { filterVideos } from './filter-videos.js'
import { fetchYouTubeVideos, formatViewCount } from './fetch-youtube.js'
import { enrichVideosWithTranscripts } from './fetch-transcript.js'
import { sendLineNotification } from './notify-line.js'
import { summarizeVideos } from './summarize.js'

const getTodayDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatVideoList = (videos) => {
  return videos
    .map(
      (video) =>
        `${video.rank}. **${video.title}**（觀看：${formatViewCount(video.viewCount)} | 相關度：${video.relevanceScore ?? '-'}${video.hasTranscript ? ' | 有字幕' : ''}）\n   - 頻道：${video.channel}\n   - 關鍵字：${video.matchedKeyword}\n   - 連結：${video.url}`
    )
    .join('\n\n')
}

const buildMarkdown = ({ date, summary, featuredVideos, allVideos, keywords }) => {
  const keywordList = keywords.join('、')

  return `# AI 每日摘要 — ${date}

> 資料來源：YouTube（含字幕） | 時間範圍：過去 ${HOURS_AGO} 小時 | 排序：熱門優先（觀看次數） | 關鍵字：${keywordList}
> 搜尋 ${allVideos.length} 支 → 篩選 ${featuredVideos.length} 支進行摘要

${summary}

---

## 精選影片清單

${formatVideoList(featuredVideos)}
`
}

const saveSummary = async (markdown, date) => {
  const outputPath = join(OUTPUT_DIR, `${date}.md`)
  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(outputPath, markdown, 'utf-8')
  return outputPath
}

export const runDailyAgent = async () => {
  const date = getTodayDate()

  console.log(`🔍 [${date}] 搜尋過去 ${HOURS_AGO} 小時內的 AI 前端熱門 YouTube 影片...`)
  console.log(`   關鍵字：${KEYWORDS.join('、')}\n`)

  const allVideos = await fetchYouTubeVideos({
    keywords: KEYWORDS,
    hoursAgo: HOURS_AGO,
    maxResultsPerKeyword: MAX_RESULTS_PER_KEYWORD,
    maxTotal: MAX_TOTAL_VIDEOS,
  })

  if (allVideos.length === 0) {
    console.log('過去 24 小時內找不到相關影片，無法產生摘要。')
    return { date, videos: [], summary: null, outputPath: null }
  }

  const featuredVideos = filterVideos(allVideos, {
    minScore: MIN_RELEVANCE_SCORE,
    maxCount: MAX_VIDEOS_FOR_SUMMARY,
  })

  if (featuredVideos.length === 0) {
    console.log('找不到足夠相關的影片，無法產生摘要。')
    return { date, videos: allVideos, summary: null, outputPath: null }
  }

  console.log(`✅ 搜尋 ${allVideos.length} 支熱門影片 → 篩選 ${featuredVideos.length} 支`)
  console.log('   正在取得影片字幕...\n')

  const videosWithTranscripts = await enrichVideosWithTranscripts(featuredVideos)
  const transcriptCount = videosWithTranscripts.filter((video) => video.hasTranscript).length

  console.log(`📝 成功取得 ${transcriptCount}/${videosWithTranscripts.length} 支影片字幕`)
  console.log('   正在請 Groq 產生繁體中文精選摘要...\n')

  const summary = await summarizeVideos(videosWithTranscripts, KEYWORDS)
  const markdown = buildMarkdown({
    date,
    summary,
    featuredVideos: videosWithTranscripts,
    allVideos,
    keywords: KEYWORDS,
  })
  const outputPath = await saveSummary(markdown, date)

  console.log('========== 繁體中文精選摘要 ==========\n')
  console.log(summary)
  console.log('\n========== 精選影片清單 ==========\n')

  videosWithTranscripts.forEach((video) => {
    console.log(`${video.rank}. ${video.title}${video.hasTranscript ? ' 📝' : ''}`)
    console.log(`   頻道：${video.channel}`)
    console.log(`   連結：${video.url}`)
    console.log('')
  })

  console.log(`📄 摘要已儲存至：${outputPath}`)

  await sendLineNotification({ summary, date, videos: videosWithTranscripts })

  return { date, videos: videosWithTranscripts, summary, outputPath }
}

const isDirectRun = process.argv[1]?.endsWith('daily-agent.js')

if (isDirectRun) {
  runDailyAgent().catch((error) => {
    console.error('執行失敗：', error.message)
    process.exit(1)
  })
}
