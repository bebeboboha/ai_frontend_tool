import 'dotenv/config'
import { sendLineNotification } from './notify-line.js'

const getTodayDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const main = async () => {
  const date = getTodayDate()
  const videos = [
    {
      title: '測試影片 A',
      description: '這是一則測試通知',
      viewCount: 125000,
      url: 'https://www.youtube.com/watch?v=test1',
    },
    {
      title: '測試影片 B',
      description: '第二則測試通知',
      viewCount: 87000,
      url: 'https://www.youtube.com/watch?v=test2',
    },
  ]

  const summary = `## 今日一句話
LINE 通知測試成功！

## Top 5 精選
### 1. 測試影片 A
- **內容摘要**：這是一支測試影片，示範如何從 Figma 設計稿自動生成 React 元件，並整合 Tailwind CSS。
- **關鍵重點**：支援 design-to-code 流程
- **適合誰**：前端開發者

### 2. 測試影片 B
- **內容摘要**：介紹 Cursor IDE 的新 agent 模式，可自動重構整個專案的 routing 結構。
- **關鍵重點**：Agent 可批次修改多檔案
- **適合誰**：Cursor 使用者`

  await sendLineNotification({ summary, date, videos })
  console.log('測試完成')
}

main().catch((error) => {
  console.error('測試失敗：', error.message)
  process.exit(1)
})
