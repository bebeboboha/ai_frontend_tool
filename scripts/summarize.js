import { GROQ_MODEL } from './config.js'
import { fetch } from './http.js'

const GROQ_API_KEY = process.env.GROQ_API_KEY

const buildPrompt = (videos, keywords) => {
  const keywordList = keywords.join('、')
  const videoList = videos
    .map(
      (video) => `
【#${video.rank}】${video.title}
頻道：${video.channel}
連結：${video.url}
關鍵字：${video.matchedKeyword}
描述：${video.description.slice(0, 200)}
`
    )
    .join('\n')

  return `你是資深 AI 前端工程師的技術情報分析師。讀者關心：Cursor、v0、Claude Code、AI 輔助寫 code、design-to-code、前端開發工具。

以下是過去 24 小時內篩選後的 ${videos.length} 支高相關 YouTube 影片（關鍵字：${keywordList}）。

請用繁體中文輸出，格式嚴格如下（不要多寫其他段落）：

## 今日一句話
（用 1 句話概括今天最重要的 AI 前端動態）

## Top 5 精選
（只挑最有價值的 5 支，每支格式如下）
### 1. [影片標題]
- **重點**：（1-2 句，具體說明學到什麼）
- **適合誰**：（例如：React 開發者、Cursor 使用者）
- **連結**：（貼上 URL）

## 新工具 / 新消息
（條列 2-4 點，只寫具體產品名稱或事件，不要空泛描述）

## 可以略過
（簡短列出明顯低價值或離題的影片類型，若無則寫「無」）

要求：
- 禁止空泛用語（如「AI 很熱門」「涵蓋廣泛領域」）
- 優先前端開發、IDE、design-to-code、agent 相關內容
- 忽略「用 AI 賺錢」、入門科普、硬體評測類內容
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
      max_tokens: 1500,
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
