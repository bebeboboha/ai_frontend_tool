import { readdir, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { marked } from 'marked'
import { DOCS_DIR, SITE_BASE_URL } from './config.js'

marked.setOptions({
  breaks: true,
  gfm: true,
})

const getSummaryPageUrl = (date) => `${SITE_BASE_URL}/summaries/${date}.html`

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const splitMetaLine = (text) => {
  return text
    .split(/[|｜]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

const enhanceSummaryHtml = (html) => {
  let result = html

  result = result.replace(/<blockquote>\s*<p>([\s\S]*?)<\/p>\s*<\/blockquote>/g, (_, text) => {
    const plain = text.replace(/<br\s*\/?>/gi, '|')
    const pills = splitMetaLine(plain)
      .map((pill) => `<span class="meta-pill">${pill}</span>`)
      .join('')

    return `<div class="meta-bar">${pills}</div>`
  })

  result = result.replace(
    /<a href="(https:\/\/www\.youtube\.com\/watch\?v=[^"]+)">[^<]*<\/a>/g,
    '<a class="yt-link" href="$1" target="_blank" rel="noopener noreferrer">▶ 觀看影片</a>'
  )

  return result
}

const wrapPage = ({ title, description, content, backLink, isIndex = false }) => `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="theme-color" content="#0b0f17" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${backLink ? '../assets/style.css' : './assets/style.css'}" />
</head>
<body>
  <div class="page-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-kicker">AI Frontend Tool</span>
        <span class="brand-title">每日情報摘要</span>
      </div>
      ${backLink ? `<a class="back-link" href="${backLink}">← 返回列表</a>` : ''}
    </header>

    <section class="hero">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
    </section>

    <main class="card">
      <div class="card-inner content">
        ${content}
      </div>
    </main>

    <footer class="footer">${isIndex ? '每天早上自動更新' : '由 YouTube 熱門影片 + AI 自動產生'}</footer>
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

  const content = dates.length
    ? `<div class="summary-grid">${dates
        .map(
          (date) => `
        <a class="summary-card" href="./summaries/${date}.html">
          <div class="summary-card-main">
            <span class="summary-date">${date}</span>
            <span class="summary-title">AI 前端每日摘要</span>
          </div>
          <span class="summary-arrow">→</span>
        </a>`
        )
        .join('')}</div>`
    : '<div class="empty-state">尚無摘要，請等待每日自動產生。</div>'

  const html = wrapPage({
    title: 'AI 前端每日摘要',
    description: 'YouTube 熱門影片精選 · 繁體中文重點整理',
    content,
    backLink: null,
    isIndex: true,
  })

  await writeFile(join(DOCS_DIR, 'index.html'), html, 'utf-8')
}

export const generateSummaryPage = async (markdown, date) => {
  const summariesDir = join(DOCS_DIR, 'summaries')
  await mkdir(summariesDir, { recursive: true })
  await mkdir(join(DOCS_DIR, 'assets'), { recursive: true })

  const htmlContent = enhanceSummaryHtml(marked.parse(markdown))
  const pageUrl = getSummaryPageUrl(date)

  const html = wrapPage({
    title: `AI 每日摘要 — ${date}`,
    description: '熱門影片 Top 5 精選 · 含字幕內容整理',
    content: htmlContent,
    backLink: `${SITE_BASE_URL}/`,
  })

  const pagePath = join(summariesDir, `${date}.html`)
  await writeFile(pagePath, html, 'utf-8')
  await generateIndexPage()

  return { pagePath, pageUrl }
}

export { getSummaryPageUrl }
