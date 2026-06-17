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
    order: 'viewCount',
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

const fetchVideoDetails = async (videoIds) => {
  if (videoIds.length === 0) return {}

  const details = {}

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    const params = new URLSearchParams({
      part: 'statistics,snippet',
      id: batch.join(','),
      key: YOUTUBE_API_KEY,
    })

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`
    )

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`YouTube API 詳情請求失敗 (${response.status}): ${errorBody}`)
    }

    const data = await response.json()

    for (const item of data.items ?? []) {
      details[item.id] = {
        viewCount: Number.parseInt(item.statistics?.viewCount ?? '0', 10),
        description: item.snippet?.description?.trim() || '',
      }
    }
  }

  return details
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

const dedupeVideos = (videos) => {
  const seen = new Set()
  const unique = []

  for (const video of videos) {
    if (seen.has(video.videoId)) continue
    seen.add(video.videoId)
    unique.push(video)
  }

  return unique
}

export const formatViewCount = (count) => {
  if (!count) return '0'
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return String(count)
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

  const uniqueVideos = dedupeVideos(allVideos)
  const details = await fetchVideoDetails(uniqueVideos.map((video) => video.videoId))

  return uniqueVideos
    .map((video) => {
      const detail = details[video.videoId] ?? {}
      const fullDescription = detail.description || video.description

      return {
        ...video,
        description: fullDescription,
        viewCount: detail.viewCount ?? 0,
      }
    })
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, maxTotal)
    .map((video, index) => ({
      ...video,
      rank: index + 1,
    }))
}
