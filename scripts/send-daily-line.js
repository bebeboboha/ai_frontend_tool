import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import 'dotenv/config'
import { OUTPUT_DIR } from './config.js'
import { getTaipeiDate } from './date.js'
import { sendLineNotification } from './notify-line.js'

const NOTIFY_PAYLOAD_PATH = join(OUTPUT_DIR, 'notify-payload.json')

const loadNotifyPayload = async () => {
  const raw = await readFile(NOTIFY_PAYLOAD_PATH, 'utf-8')
  return JSON.parse(raw)
}

const run = async () => {
  const payload = await loadNotifyPayload()
  const date = payload.date || getTaipeiDate()

  await sendLineNotification({
    summary: payload.summary,
    date,
    videos: payload.videos ?? [],
    pageUrl: payload.pageUrl,
  })
}

run().catch((error) => {
  console.error('LINE 通知失敗：', error.message)
  process.exit(1)
})
