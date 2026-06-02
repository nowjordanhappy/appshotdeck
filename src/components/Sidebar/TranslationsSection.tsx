import { useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Plus, Loader2, AlertTriangle, Trash2, X } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { useToastStore } from '../../store/useToastStore'
import { translatePair, getLangMeta } from '../../utils/translate'
import { AddLanguageDialog } from '../AddLanguageDialog'
import { QuotaDialog } from '../QuotaDialog'
import type { TextVariant } from '../../types'

function ProtectedWordsInput({ words, onChange }: { words: string[]; onChange: (w: string[]) => void }) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function commit() {
    const trimmed = input.trim()
    if (trimmed && !words.includes(trimmed)) {
      onChange([...words, trimmed])
    }
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !input && words.length > 0) {
      onChange(words.slice(0, -1))
    }
  }

  return (
    <div className="border-t border-subtle pt-3 space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted uppercase tracking-wider">{t('translations.protected_words')}</p>
        {words.length > 0 && (
          <span className="text-xs bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-medium">
            {words.length}
          </span>
        )}
      </div>
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex flex-wrap gap-1.5 min-h-[36px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-2 cursor-text focus-within:border-indigo-400 transition-colors"
      >
        {words.map((word) => (
          <span key={word} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/15 text-indigo-400 rounded-full text-xs font-medium">
            {word}
            <button
              onClick={(e) => { e.stopPropagation(); onChange(words.filter((w) => w !== word)) }}
              className="hover:text-indigo-200 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={words.length === 0 ? t('translations.protected_placeholder') : ''}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-gray-900 dark:text-white placeholder-black/30 dark:placeholder-white/30 outline-none"
        />
      </div>
      <p className="text-xs text-dim">{t('translations.protected_hint')}</p>
    </div>
  )
}

interface EditState {
  lang: string
  headline: string
  subtitle: string
}

export function TranslationsSection() {
  const { t } = useTranslation()
  const {
    slides, activeSlideId, languages, protectedWords, setProtectedWords,
    updateTextVariant, removeLanguage,
  } = useEditorStore()

  const slide = slides.find((s) => s.id === activeSlideId)

  const [open, setOpen] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [retranslating, setRetranslating] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [showQuota, setShowQuota] = useState(false)
  const [pendingRetry, setPendingRetry] = useState<(() => void) | null>(null)

  if (!slide) return null

  const staleLangs = useMemo(
    () => languages.filter((lang) => {
      const s = slide.textVariants?.[lang]?.status
      return s === 'stale' || s === 'error'
    }),
    [languages, slide.textVariants]
  )

  async function handleSyncAll() {
    if (!slide || syncing) return
    setSyncing(true)
    await Promise.all(
      staleLangs.map(async (code) => {
        const { headline, subtitle } = await translatePair(slide.headline, slide.subtitle, code, protectedWords)
        updateTextVariant(slide.id, code, {
          headline: headline.text,
          subtitle: subtitle.text,
          status: (!headline.ok || !subtitle.ok) ? 'error' : 'ok',
          fromHeadline: slide.headline,
          fromSubtitle: slide.subtitle,
        })
      })
    )
    setSyncing(false)
  }

  async function handleRetranslate(code: string) {
    if (!slide) return
    setRetranslating(code)
    const { headline, subtitle } = await translatePair(slide.headline, slide.subtitle, code, protectedWords)
    if (headline.quotaExceeded || subtitle.quotaExceeded) {
      setRetranslating(null)
      setPendingRetry(() => () => handleRetranslate(code))
      setShowQuota(true)
      return
    }
    const hasError = !headline.ok || !subtitle.ok
    updateTextVariant(slide.id, code, {
      headline: headline.text,
      subtitle: subtitle.text,
      status: hasError ? 'error' : 'ok',
      fromHeadline: slide.headline,
      fromSubtitle: slide.subtitle,
    })
    if (hasError) useToastStore.getState().addToast(t('translations.error_network'), 'error')
    setRetranslating(null)
  }

  function startEdit(code: string) {
    if (!slide) return
    const variant = slide.textVariants?.[code]
    setEditing({
      lang: code,
      headline: variant?.headline ?? '',
      subtitle: variant?.subtitle ?? '',
    })
  }

  function saveEdit() {
    if (!editing || !slide) return
    updateTextVariant(slide.id, editing.lang, {
      headline: editing.headline,
      subtitle: editing.subtitle,
      status: 'ok',
    })
    setEditing(null)
  }

  function statusIcon(variant?: TextVariant) {
    if (!variant || variant.status === 'ok') return null
    if (variant.status === 'empty') return (
      <span className="text-xs text-muted italic">{t('translations.status_empty')}</span>
    )
    if (variant.status === 'stale') return (
      <span className="flex items-center gap-1 text-xs text-amber-400">
        <AlertTriangle className="w-3 h-3" />
        {t('translations.status_stale')}
      </span>
    )
    if (variant.status === 'error') return (
      <span className="flex items-center gap-1 text-xs text-red-400">
        <AlertTriangle className="w-3 h-3" />
        {t('translations.status_error')}
      </span>
    )
    return null
  }

  return (
    <div className="border-t border-subtle">
      {/* Section header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-muted" />}
          <span className="text-xs text-muted uppercase tracking-wider">{t('translations.section_title')}</span>
          {languages.length > 0 && (
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-medium">
              {languages.length}
            </span>
          )}
          {!open && protectedWords.length > 0 && (
            <span className="text-xs text-muted" title={`${protectedWords.length} protected word${protectedWords.length !== 1 ? 's' : ''}: ${protectedWords.join(', ')}`}>
              🔒 {protectedWords.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {languages.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); if (staleLangs.length > 0) handleSyncAll() }}
              disabled={syncing || staleLangs.length === 0}
              title={staleLangs.length === 0 ? t('translations.sync_all_done') : t('translations.sync_all_stale')}
              className={`flex items-center gap-1 text-xs transition-colors px-1.5 py-0.5 rounded ${
                staleLangs.length > 0
                  ? 'text-amber-400 hover:text-amber-300 cursor-pointer'
                  : 'text-muted cursor-default opacity-40'
              } disabled:opacity-40`}
            >
              {syncing
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <span className="leading-none">↻</span>
              }
              <span>{syncing ? t('translations.syncing') : t('translations.sync_all')}</span>
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setShowDialog(true) }}
            className="flex items-center gap-1 text-xs text-muted hover:text-indigo-400 transition-colors p-1"
            title={t('translations.add')}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {languages.length === 0 ? (
            <button
              onClick={() => setShowDialog(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-black/10 dark:border-white/10 rounded-lg text-xs text-muted hover:text-indigo-400 hover:border-indigo-400/50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('translations.add')}
            </button>
          ) : (
            <>
              {languages.map((code) => {
                const meta = getLangMeta(code)
                const variant = slide.textVariants?.[code]
                const isEditing = editing?.lang === code
                const isRetranslating = retranslating === code

                return (
                  <div key={code} className="space-y-1.5 rounded-lg bg-black/3 dark:bg-white/3 p-3">
                    {/* Language header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted uppercase">{code}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {meta?.native ?? code}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => isEditing ? saveEdit() : startEdit(code)}
                          className="text-xs text-muted hover:text-indigo-400 transition-colors px-1.5 py-0.5 rounded"
                        >
                          {isEditing ? t('translations.save') : '✎'}
                        </button>
                        <button
                          onClick={() => handleRetranslate(code)}
                          disabled={isRetranslating}
                          className="text-xs text-muted hover:text-indigo-400 transition-colors px-1.5 py-0.5 rounded disabled:opacity-40"
                          title={t('translations.retranslate')}
                        >
                          {isRetranslating
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : '↺'
                          }
                        </button>
                        <button
                          onClick={() => removeLanguage(code)}
                          className="text-xs text-muted hover:text-red-400 transition-colors p-0.5 rounded"
                          title={t('translations.remove_lang')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Status */}
                    {statusIcon(variant)}

                    {/* Text display or edit */}
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <div>
                          <p className="text-xs text-muted mb-1">{t('translations.headline_label')}</p>
                          <textarea
                            rows={2}
                            value={editing.headline}
                            onChange={(e) => setEditing((prev) => prev ? { ...prev, headline: e.target.value } : prev)}
                            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:border-indigo-400 transition-colors"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted mb-1">{t('translations.subtitle_label')}</p>
                          <textarea
                            rows={2}
                            value={editing.subtitle}
                            onChange={(e) => setEditing((prev) => prev ? { ...prev, subtitle: e.target.value } : prev)}
                            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:border-indigo-400 transition-colors"
                          />
                        </div>
                        <button
                          onClick={() => setEditing(null)}
                          className="text-xs text-muted hover:text-foreground transition-colors"
                        >
                          {t('translations.cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {variant?.headline ? (
                          <p className="text-sm text-gray-900 dark:text-white leading-snug">{variant.headline}</p>
                        ) : (
                          <p className="text-sm text-muted italic">—</p>
                        )}
                        {variant?.subtitle && (
                          <p className="text-xs text-dim leading-snug">{variant.subtitle}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              <button
                onClick={() => setShowDialog(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted hover:text-indigo-400 transition-colors"
              >
                <Plus className="w-3 h-3" />
                {t('translations.add')}
              </button>

              <ProtectedWordsInput
                words={protectedWords}
                onChange={setProtectedWords}
              />
            </>
          )}
        </div>
      )}

      {showDialog && <AddLanguageDialog onClose={() => setShowDialog(false)} />}
      {showQuota && (
        <QuotaDialog
          onRetry={() => { setShowQuota(false); pendingRetry?.() }}
          onSkip={() => { setShowQuota(false); setPendingRetry(null) }}
        />
      )}
    </div>
  )
}
