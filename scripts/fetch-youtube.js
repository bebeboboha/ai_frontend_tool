import { fetch } from './http.js'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

const getPublishedAfter = (hoursAgo) => {
  const date = new Date()
  date.setHours(date.getHours() - hoursAgo)
  return date.toISOString()
}

const searchByKeyword = async (keyword, { hoursAgo, maxResults }) => {
  const params = new URLSearchParams({
    part: 'snippet',
    q: keyword,
    type: 'video',
    order: 'relevance',
    maxResults: String(maxResults),
    publishedAfter: getPublishedAfter(hoursAgo),
    key: YOUTUBE_API_KEY,
  })

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
  )

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`YouTube API 請求失敗 (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  return data.items ?? []
}

const parseVideoItem = (item, keyword) => {
  const { title, description, channelTitle, publishedAt } = item.snippet
  const videoId = item.id?.videoId

  if (!videoId) return null

  return {
    videoId,
    title,
    channel: channelTitle,
    publishedAt,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    description: description?.trim() || '（無描述）',
    matchedKeyword: keyword,
  }
}

const dedupeVideos = (videos, maxTotal) => {
  const seen = new Set()
  const unique = []

  for (const video of videos) {
    if (seen.has(video.videoId)) continue
    seen.add(video.videoId)
    unique.push(video)
    if (unique.length >= maxTotal) break
  }

  return unique.map((video, index) => ({
    ...video,
    rank: index + 1,
  }))
}

export const fetchYouTubeVideos = async ({
  keywords,
  hoursAgo = 24,
  maxResultsPerKeyword = 5,
  maxTotal = 15,
}) => {
  if (!YOUTUBE_API_KEY) {
    throw new Error('缺少環境變數 YOUTUBE_API_KEY')
  }

  const allVideos = []

  for (const keyword of keywords) {
    const items = await searchByKeyword(keyword, { hoursAgo, maxResults: maxResultsPerKeyword })

    for (const item of items) {
      const video = parseVideoItem(item, keyword)
      if (video) allVideos.push(video)
    }
  }

  return dedupeVideos(allVideos, maxTotal)
}
