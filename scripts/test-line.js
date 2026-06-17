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
  const summary = `## 今日一句話
LINE 通知測試成功！

## Top 5 精選
### 1. 測試影片
- **重點**：這是一則測試通知
- **適合誰**：所有人
- **連結**：https://example.com`

  await sendLineNotification({ summary, date })
  console.log('測試完成')
}

main().catch((error) => {
  console.error('測試失敗：', error.message)
  process.exit(1)
})
