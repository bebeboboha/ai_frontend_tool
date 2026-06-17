const FRONTEND_SIGNALS = [
  'frontend',
  'front-end',
  'front end',
  'react',
  'vue',
  'next.js',
  'nextjs',
  'cursor',
  'v0',
  'kombai',
  'claude',
  'copilot',
  'ide',
  'ui',
  'ux',
  'design to code',
  'web dev',
  'typescript',
  'figma',
  'openrouter',
  'shadcn',
  'tailwind',
  'component',
  'agent',
  'coding',
  'developer',
  'bolt',
  'lovable',
  'windsurf',
  'codegen',
]

const NOISE_SIGNALS = [
  'make money',
  'earn money',
  'passive income',
  'what is an llm',
  'explained in simple',
  'for beginners',
  'beginner guide',
  'break apple',
  'amd',
  'strix',
  'm4 pro',
  'gpu',
  'crypto',
  'bitcoin',
]

const BLOCKED_SCRIPTS = [
  /[\u3040-\u309f\u30a0-\u30ff]/,
  /[\u0400-\u04ff]/,
  /[\u0600-\u06ff]/,
  /[\u0900-\u097f]/,
  /[\u0e00-\u0e7f]/,
  /[\uac00-\ud7af]/,
  /[\u1100-\u11ff\u3130-\u318f]/,
]

const NON_EN_ZH_WORDS =
  /\b(statt|und|der|die|das|ein|eine|für|über|nicht|wie|oder|auch|mit|vom|zum|beim|nach|vor|aus|bei|nur|noch|schon|wird|werden|ist|sind|haben|kann|müssen|dakikada|nasıl|için|değil|veya|bir|pour|avec|dans|les|des|une|comment|est|sont|hong|không|hướng dẫn|dev trends|qiita)\b/i

const hasBlockedScript = (text) => BLOCKED_SCRIPTS.some((pattern) => pattern.test(text))

const hasLatinExtended = (text) => /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿß]/i.test(text)

const isEnglishOrChinese = (text) => {
  if (hasBlockedScript(text)) return false
  if (hasLatinExtended(text)) return false
  if (NON_EN_ZH_WORDS.test(text)) return false

  const stripped = text.replace(/[\s\|\-—:?!.,#@()[\]'""\d]/g, '')
  if (!stripped) return true

  const allowed = (stripped.match(/[a-zA-Z\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length
  return allowed / stripped.length >= 0.7
}

const getRelevanceScore = (video) => {
  const text = `${video.title} ${video.description} ${video.matchedKeyword}`.toLowerCase()
  let score = 0

  for (const signal of FRONTEND_SIGNALS) {
    if (text.includes(signal)) score += 2
  }

  for (const noise of NOISE_SIGNALS) {
    if (text.includes(noise)) score -= 4
  }

  if (video.matchedKeyword.toLowerCase().includes('frontend')) score += 3
  if (video.matchedKeyword.toLowerCase().includes('cursor')) score += 3
  if (video.matchedKeyword.toLowerCase().includes('v0')) score += 3
  if (video.matchedKeyword.toLowerCase().includes('claude')) score += 2
  if (video.matchedKeyword.toLowerCase().includes('coding')) score += 2

  if (isEnglishOrChinese(video.title)) score += 1
  else score -= 5

  return score
}

export const filterVideos = (videos, { minScore = 0, maxCount = 8 } = {}) => {
  const scored = videos
    .map((video) => ({
      ...video,
      relevanceScore: getRelevanceScore(video),
    }))
    .filter((video) => video.relevanceScore >= minScore && isEnglishOrChinese(video.title))
    .sort((a, b) => {
      if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount
      return b.relevanceScore - a.relevanceScore
    })
    .slice(0, maxCount)
    .map((video, index) => ({
      ...video,
      rank: index + 1,
    }))

  return scored
}
