import 'dotenv/config'
import { fetchYouTubeVideos } from './fetch-youtube.js'
import { summarizeVideos } from './summarize.js'

const SEARCH_QUERY = 'AI frontend tool'
const MAX_RESULTS = 5

const main = async () => {
  console.log(`🔍 搜尋過去 24 小時內關於「${SEARCH_QUERY}」的 YouTube 影片...\n`)

  const videos = await fetchYouTubeVideos({
    keywords: [SEARCH_QUERY],
    hoursAgo: 24,
    maxResultsPerKeyword: MAX_RESULTS,
    maxTotal: MAX_RESULTS,
  })

  if (videos.length === 0) {
    console.log('過去 24 小時內找不到相關影片，無法產生摘要。')
    return
  }

  console.log(`✅ 找到 ${videos.length} 支影片，正在請 Groq 產生繁體中文摘要...\n`)

  const summary = await summarizeVideos(videos, [SEARCH_QUERY])

  console.log('========== 繁體中文重點摘要 ==========\n')
  console.log(summary)
  console.log('\n========== 原始影片清單 ==========\n')

  videos.forEach((video) => {
    console.log(`${video.rank}. ${video.title}`)
    console.log(`   頻道：${video.channel}`)
    console.log(`   連結：${video.url}`)
    console.log('')
  })
}

main().catch((error) => {
  console.error('執行失敗：', error.message)
  process.exit(1)
})
