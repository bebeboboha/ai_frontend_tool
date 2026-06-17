import { readdir, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { marked } from 'marked'
import { DOCS_DIR, SITE_BASE_URL } from './config.js'

marked.setOptions({
  breaks: true,
  gfm: true,
})

const getSummaryPageUrl = (date) => `${SITE_BASE_URL}/summaries/${date}.html`

const wrapPage = ({ title, description, content, backLink }) => `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="stylesheet" href="${backLink ? '../assets/style.css' : './assets/style.css'}" />
</head>
<body>
  <div class="container">
    ${backLink ? `<a class="back-link" href="${backLink}">← 返回摘要列表</a>` : ''}
    <div class="header">
      <h1>${title}</h1>
      ${description ? `<p>${description}</p>` : ''}
    </div>
    <main class="card content">
      ${content}
    </main>
    <footer class="footer">AI Frontend Tool · 每日自動摘要</footer>
  </div>
</body>
</html>`

const getAvailableDates = async () => {
  const summariesDir = join(DOCS_DIR, 'summaries')

  try {
    const files = await readdir(summariesDir)
    return files
      .filter((file) => file.endsWith('.html'))
      .map((file) => file.replace('.html', ''))
      .sort()
      .reverse()
  } catch {
    return []
  }
}

const generateIndexPage = async () => {
  const dates = await getAvailableDates()

  const listItems = dates.length
    ? dates
        .map(
          (date) =>
            `<li><a href="./summaries/${date}.html">AI 每日摘要 — ${date}</a></li>`
        )
        .join('\n')
    : '<li>尚無摘要，請等待每日自動產生。</li>'

  const html = wrapPage({
    title: 'AI 前端每日摘要',
    description: 'YouTube AI 前端熱門影片每日精選摘要',
    content: `<ul class="summary-list">${listItems}</ul>`,
    backLink: null,
  })

  await writeFile(join(DOCS_DIR, 'index.html'), html, 'utf-8')
}

export const generateSummaryPage = async (markdown, date) => {
  const summariesDir = join(DOCS_DIR, 'summaries')
  await mkdir(summariesDir, { recursive: true })
  await mkdir(join(DOCS_DIR, 'assets'), { recursive: true })

  const htmlContent = marked.parse(markdown)
  const pageUrl = getSummaryPageUrl(date)

  const html = wrapPage({
    title: `AI 每日摘要 — ${date}`,
    description: 'YouTube AI 前端熱門影片精選摘要',
    content: htmlContent,
    backLink: `${SITE_BASE_URL}/`,
  })

  const pagePath = join(summariesDir, `${date}.html`)
  await writeFile(pagePath, html, 'utf-8')
  await generateIndexPage()

  return { pagePath, pageUrl }
}

export { getSummaryPageUrl }
