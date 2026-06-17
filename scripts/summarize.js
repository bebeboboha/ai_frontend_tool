import { GROQ_MODEL } from './config.js'
import { fetch } from './http.js'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const DESCRIPTION_LIMIT = 500

const formatVideoSource = (video) => {
  if (video.hasTranscript && video.transcript) {
    return `字幕語言：${video.transcriptLanguage ?? 'unknown'}
影片字幕（主要依據，請根據此總結影片內容）：
${video.transcript}

影片描述（輔助）：
${video.description.slice(0, DESCRIPTION_LIMIT)}`
  }

  return `影片字幕：無法取得
影片描述（請依此推斷，並註明資訊有限）：
${video.description.slice(0, DESCRIPTION_LIMIT)}`
}

const buildPrompt = (videos, keywords) => {
  const keywordList = keywords.join('、')
  const transcriptCount = videos.filter((video) => video.hasTranscript).length

  const videoList = videos
    .map(
      (video) => `
【#${video.rank}】${video.title}
觀看次數：${video.viewCount ?? 0}
頻道：${video.channel}
發布時間：${video.publishedAt}
連結：${video.url}
關鍵字：${video.matchedKeyword}
${formatVideoSource(video)}
`
    )
    .join('\n---\n')

  return `你是資深 AI 前端工程師的技術情報分析師。讀者關心：Cursor、v0、Claude Code、AI 輔助寫 code、design-to-code、前端開發工具。

以下是過去 24 小時內、依觀看次數排序的 ${videos.length} 支高相關熱門 YouTube 影片（關鍵字：${keywordList}）。
其中 ${transcriptCount} 支附有影片字幕，有字幕者請以字幕為主要依據撰寫內容摘要。

請用繁體中文總結影片實際內容。格式嚴格如下：

## 今日一句話
（用 1-2 句話概括今天最重要的 AI 前端動態）

## Top 5 精選
（挑最有價值的 5 支，每支格式如下）
### 1. [影片標題]
- **內容摘要**：（5-8 句，詳細總結影片實際講了什麼：開場問題、示範步驟、使用的工具/指令、比較或測試結果、作者結論。有字幕者必須反映字幕中的具體細節）
- **關鍵重點**：（條列 3-5 點，每點一句，寫可執行的 insight 或具體資訊）
- **適合誰**：（例如：React 開發者、Cursor 使用者）
- **連結**：（貼上 URL）

## 新工具 / 新消息
（條列 2-4 點，只寫具體產品名稱、功能或事件）

## 可以略過
（簡短列出低價值或離題影片，若無則寫「無」）

要求：
- 有字幕的影片：摘要必須基於字幕內容，寫出影片實際流程與論點
- 無字幕的影片：依描述保守推斷，並標註「（無字幕，依描述推斷）」
- 禁止空泛用語（如「介紹了 AI 工具」「展示了強大能力」）
- Top 5 不足 5 支時，有幾支寫幾支

影片資料：
${videoList}`
}

export const summarizeVideos = async (videos, keywords) => {
  if (!GROQ_API_KEY) {
    throw new Error('缺少環境變數 GROQ_API_KEY')
  }

  if (videos.length === 0) {
    return null
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: buildPrompt(videos, keywords),
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Groq API 請求失敗 (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content

  if (!text) {
    throw new Error('Groq API 回傳格式異常，未取得文字摘要')
  }

  return text
}
