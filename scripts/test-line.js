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
      url: 'https://www.youtube.com/watch?v=test1',
    },
    {
      title: '測試影片 B',
      description: '第二則測試通知',
      url: 'https://www.youtube.com/watch?v=test2',
    },
  ]

  const summary = `## 今日一句話
LINE 通知測試成功！

## Top 5 精選
### 1. 測試影片 A
- **重點**：這是一則測試通知
- **適合誰**：所有人

### 2. 測試影片 B
- **重點**：第二則測試通知
- **適合誰**：所有人`

  await sendLineNotification({ summary, date, videos })
  console.log('測試完成')
}

main().catch((error) => {
  console.error('測試失敗：', error.message)
  process.exit(1)
})
