const MYMEMORY_URL = 'https://api.mymemory.translated.net/get'
const MAX_CHARS = 450
export const TRANSLATE_EMAIL_KEY = 'appshotdeck-translate-email'

export function getTranslateEmail(): string {
  return localStorage.getItem(TRANSLATE_EMAIL_KEY) ?? ''
}

export function saveTranslateEmail(email: string): void {
  localStorage.setItem(TRANSLATE_EMAIL_KEY, email.trim())
}

export interface TranslateResult {
  text: string
  ok: boolean
  quotaExceeded?: boolean
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function applyProtectedWords(text: string, words: string[]): { processed: string; restore: (t: string) => string } {
  if (!words.length) return { processed: text, restore: (t) => t }

  const tokenMap: [string, string][] = []
  let processed = text

  words.forEach((word, i) => {
    const trimmed = word.trim()
    if (!trimmed) return
    const token = `XPROT${i}X`
    tokenMap.push([token, trimmed])
    processed = processed.replace(new RegExp(escapeRegex(trimmed), 'gi'), token)
  })

  const restore = (translated: string): string => {
    let result = translated
    tokenMap.forEach(([token, original]) => {
      result = result.replace(new RegExp(escapeRegex(token), 'gi'), original)
    })
    return result
  }

  return { processed, restore }
}

// Strip markdown formatting before sending
function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\|/g, '\n')
}

export async function translateText(text: string, to: string, protectedWords: string[] = []): Promise<TranslateResult> {
  if (!text.trim()) return { text, ok: true }

  const { processed, restore } = applyProtectedWords(text, protectedWords)
  const toSend = stripMarkdown(processed)

  if (toSend.length > MAX_CHARS) return { text, ok: false }

  try {
    const email = getTranslateEmail()
    const deParam = email ? `&de=${encodeURIComponent(email)}` : ''
    const res = await fetch(
      `${MYMEMORY_URL}?q=${encodeURIComponent(toSend)}&langpair=en|${to}${deParam}`
    )
    if (!res.ok) return { text, ok: false }
    const data = await res.json()
    if (data.quotaFinished) return { text, ok: false, quotaExceeded: true }
    if (data.responseStatus !== 200) return { text, ok: false }
    return { text: restore(data.responseData.translatedText as string), ok: true }
  } catch {
    return { text, ok: false }
  }
}

export async function translatePair(
  headline: string,
  subtitle: string,
  to: string,
  protectedWords: string[] = [],
): Promise<{ headline: TranslateResult; subtitle: TranslateResult }> {
  const [h, s] = await Promise.all([
    translateText(headline, to, protectedWords),
    translateText(subtitle, to, protectedWords),
  ])
  return { headline: h, subtitle: s }
}

export const SUPPORTED_LANGUAGES: { code: string; label: string; native: string }[] = [
  { code: 'de', label: 'German',     native: 'Deutsch' },
  { code: 'es', label: 'Spanish',    native: 'Español' },
  { code: 'fr', label: 'French',     native: 'Français' },
  { code: 'it', label: 'Italian',    native: 'Italiano' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'nl', label: 'Dutch',      native: 'Nederlands' },
  { code: 'ru', label: 'Russian',    native: 'Русский' },
  { code: 'ja', label: 'Japanese',   native: '日本語' },
  { code: 'ko', label: 'Korean',     native: '한국어' },
  { code: 'zh', label: 'Chinese',    native: '中文' },
  { code: 'ar', label: 'Arabic',     native: 'العربية' },
  { code: 'hi', label: 'Hindi',      native: 'हिन्दी' },
  { code: 'tr', label: 'Turkish',    native: 'Türkçe' },
  { code: 'pl', label: 'Polish',     native: 'Polski' },
]

export function getLangMeta(code: string) {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)
}
