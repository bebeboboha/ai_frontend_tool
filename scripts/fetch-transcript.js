import nodeFetch from 'node-fetch'
import { YoutubeTranscript } from 'youtube-transcript'
import { TRANSCRIPT_CHAR_LIMIT, TRANSCRIPT_FETCH_DELAY_MS, TRANSCRIPT_LANGUAGES } from './config.js'

if (!globalThis.fetch) {
  globalThis.fetch = nodeFetch
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const truncateTranscript = (text) => {
  if (!text) return null
  if (text.length <= TRANSCRIPT_CHAR_LIMIT) return text
  return `${text.slice(0, TRANSCRIPT_CHAR_LIMIT)}…（字幕已截斷）`
}

const fetchTranscriptForVideo = async (videoId) => {
  for (const lang of TRANSCRIPT_LANGUAGES) {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId, { lang })
      if (items?.length) {
        return {
          text: items.map((item) => item.text).join(' '),
          language: lang,
        }
      }
    } catch {
      // try next language
    }
  }

  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId)
    if (items?.length) {
      return {
        text: items.map((item) => item.text).join(' '),
        language: 'auto',
      }
    }
  } catch {
    return null
  }

  return null
}

export const enrichVideosWithTranscripts = async (videos) => {
  const enriched = []

  for (const [index, video] of videos.entries()) {
    if (index > 0) await sleep(TRANSCRIPT_FETCH_DELAY_MS)

    const result = await fetchTranscriptForVideo(video.videoId)

    enriched.push({
      ...video,
      transcript: result ? truncateTranscript(result.text) : null,
      transcriptLanguage: result?.language ?? null,
      hasTranscript: Boolean(result?.text),
    })
  }

  return enriched
}
