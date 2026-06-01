import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X, Loader2 } from 'lucide-react'
import { SUPPORTED_LANGUAGES, translatePair } from '../utils/translate'
import { useEditorStore } from '../store/useEditorStore'
import { useToastStore } from '../store/useToastStore'
import { QuotaDialog } from './QuotaDialog'
import type { TextVariant } from '../types'

interface Props {
  onClose: () => void
}

export function AddLanguageDialog({ onClose }: Props) {
  const { t } = useTranslation()
  const { slides, languages, protectedWords, addLanguage, setActiveLanguage } = useEditorStore()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [autoTranslate, setAutoTranslate] = useState(true)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQuota, setShowQuota] = useState(false)
  const [pendingRetry, setPendingRetry] = useState<(() => void) | null>(null)

  const available = useMemo(
    () => SUPPORTED_LANGUAGES.filter((l) => !languages.includes(l.code)),
    [languages]
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return available
    return available.filter(
      (l) => l.label.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.code.includes(q)
    )
  }, [available, query])

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  async function handleAdd() {
    if (!selected.size) return
    setLoading(true)

    for (const code of selected) {
      const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === code)!
      const variantMap: Record<string, TextVariant> = {}

      if (autoTranslate) {
        const results = await Promise.all(
          slides.map(async (slide) => {
            const { headline, subtitle } = await translatePair(slide.headline, slide.subtitle, code, protectedWords)
            const hasError = !headline.ok || !subtitle.ok
            const isEmpty = !slide.headline && !slide.subtitle

            let status: TextVariant['status'] = 'ok'
            if (isEmpty) status = 'empty'
            else if (hasError) status = 'error'

            return {
              id: slide.id,
              quotaExceeded: headline.quotaExceeded || subtitle.quotaExceeded,
              variant: {
                headline: headline.text,
                subtitle: subtitle.text,
                status,
                fromHeadline: slide.headline,
                fromSubtitle: slide.subtitle,
              } satisfies TextVariant,
            }
          })
        )

        if (results.some((r) => r.quotaExceeded)) {
          setLoading(false)
          setPendingRetry(() => () => { void handleAdd() })
          setShowQuota(true)
          return
        }

        for (const { id, variant } of results) {
          variantMap[id] = variant
        }

        const allFailed = results.every((r) => r.variant.status === 'error')
        if (allFailed) {
          useToastStore.getState().addToast(t('translations.error_network'), 'error')
          setLoading(false)
          return
        }
      } else {
        for (const slide of slides) {
          variantMap[slide.id] = { headline: '', subtitle: '', status: 'empty' }
        }
      }

      addLanguage(code, variantMap)
      if (autoTranslate) {
        useToastStore.getState().addToast(
          t('translations.success', { lang: langMeta.native }),
          'success'
        )
      }
    }

    // Switch to the last added language
    const codes = [...selected]
    setActiveLanguage(codes[codes.length - 1])
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="surface border border-subtle rounded-xl shadow-2xl w-80 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-subtle flex-shrink-0">
          <span className="font-semibold text-sm">{t('translations.dialog_title')}</span>
          <button onClick={onClose} className="p-1 btn-ghost rounded-lg" disabled={loading}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
            <Search className="w-3.5 h-3.5 text-muted flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('translations.search_lang')}
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder-black/30 dark:placeholder-white/30"
            />
          </div>
        </div>

        {/* Language list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">{t('translations.no_results')}</p>
          ) : (
            filtered.map((lang) => (
              <button
                key={lang.code}
                onClick={() => toggle(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  selected.has(lang.code)
                    ? 'bg-indigo-500/15 text-indigo-400'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-900 dark:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted uppercase w-6">{lang.code}</span>
                  <span className="font-medium">{lang.native}</span>
                </div>
                <span className="text-xs text-muted">{lang.label}</span>
              </button>
            ))
          )}
        </div>

        {/* Auto-translate option */}
        <div className="px-4 py-3 border-t border-subtle flex-shrink-0 space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="radio"
              name="translate_mode"
              checked={autoTranslate}
              onChange={() => setAutoTranslate(true)}
              className="accent-indigo-500"
            />
            <span className="text-sm text-gray-900 dark:text-white">{t('translations.dialog_translate_auto')}</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="translate_mode"
              checked={!autoTranslate}
              onChange={() => setAutoTranslate(false)}
              className="accent-indigo-500"
            />
            <span className="text-sm text-gray-900 dark:text-white">{t('translations.dialog_translate_manual')}</span>
          </label>

          {autoTranslate && (
            <p className="text-xs text-muted pl-5">
              {t('translations.powered_by')}{' '}
              <a
                href="https://mymemory.translated.net"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline"
              >
                MyMemory
              </a>
            </p>
          )}
        </div>

        {/* Scope hint */}
        <p className="px-4 pb-2 text-xs text-muted flex-shrink-0">
          {t('translations.scope_hint', { count: slides.length })}
        </p>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 text-sm btn-ghost rounded-lg border border-subtle"
          >
            {t('translations.dialog_cancel')}
          </button>
          <button
            onClick={handleAdd}
            disabled={!selected.size || loading}
            className="flex-1 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t('translations.dialog_add')}
            {selected.size > 0 && !loading && ` (${selected.size})`}
          </button>
        </div>
      </div>

      {showQuota && (
        <QuotaDialog
          onRetry={() => { setShowQuota(false); pendingRetry?.() }}
          onSkip={() => { setShowQuota(false); setPendingRetry(null) }}
        />
      )}
    </div>
  )
}
