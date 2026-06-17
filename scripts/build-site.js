import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import 'dotenv/config'
import { OUTPUT_DIR } from './config.js'
import { generateSummaryPage } from './generate-site.js'

const main = async () => {
  const files = await readdir(OUTPUT_DIR)
  const markdownFiles = files.filter((file) => file.endsWith('.md'))

  for (const file of markdownFiles) {
    const date = file.replace('.md', '')
    const markdown = await readFile(join(OUTPUT_DIR, file), 'utf-8')
    const { pageUrl } = await generateSummaryPage(markdown, date)
    console.log(`✅ 已產生 ${date} → ${pageUrl}`)
  }
}

main().catch((error) => {
  console.error('產生網頁失敗：', error.message)
  process.exit(1)
})
