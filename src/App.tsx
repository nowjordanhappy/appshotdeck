import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { Download, Plus, ChevronDown, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Header } from './components/Header'
import { ConfirmDialog } from './components/ConfirmDialog'
import { ToastContainer } from './components/ToastContainer'
import { Sidebar } from './components/Sidebar/Sidebar'
import { SlideCanvas } from './components/Canvas/SlideCanvas'
import { SlideStrip } from './components/SlideStrip'
import { useEditorStore } from './store/useEditorStore'
import { AddLanguageDialog } from './components/AddLanguageDialog'
import { useThemeStore } from './store/useThemeStore'
import { exportSlide } from './utils/export'
import { getLangMeta } from './utils/translate'
import type { SlideFormat } from './types'

function HiddenExportCanvases({
  canvasRefs,
  exportLanguage,
}: {
  canvasRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
  exportLanguage: string
}) {
  const { slides } = useEditorStore()
  const setRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) canvasRefs.current.set(id, el)
      else canvasRefs.current.delete(id)
    },
    [canvasRefs]
  )
  const displaySlides = useMemo(() => {
    if (exportLanguage === 'en') return slides
    return slides.map((sl) => {
      const textVariant = sl.textVariants?.[exportLanguage]
      const screenshotVariant = sl.screenshotVariants?.[exportLanguage]
      return {
        ...sl,
        headline: textVariant?.headline || sl.headline,
        subtitle: textVariant?.subtitle || sl.subtitle,
        screenshotDataUrl: screenshotVariant ?? sl.screenshotDataUrl,
      }
    })
  }, [slides, exportLanguage])

  return (
    <div aria-hidden style={{ position: 'fixed', top: 0, left: '-9999px', pointerEvents: 'none' }}>
      {displaySlides.map((slide) => (
        <SlideCanvas key={slide.id} ref={setRef(slide.id)} slide={slide} interactive={false} />
      ))}
    </div>
  )
}

const DISPLAY: Record<SlideFormat, { maxW: number; maxH: number }> = {
  'phone':     { maxW: 340,  maxH: 620 },
  'tablet-7':  { maxW: 820,  maxH: 490 },
  'tablet-10': { maxW: 820,  maxH: 490 },
  'iphone-69': { maxW: 300,  maxH: 620 },
  'iphone-65': { maxW: 300,  maxH: 620 },
  'ipad-13':   { maxW: 460,  maxH: 620 },
}

const FORMAT_DIMS: Record<SlideFormat, { W: number; H: number }> = {
  'phone':     { W: 1080,  H: 1920 },
  'tablet-7':  { W: 1920,  H: 1080 },
  'tablet-10': { W: 2560,  H: 1440 },
  'iphone-69': { W: 1320,  H: 2868 },
  'iphone-65': { W: 1242,  H: 2688 },
  'ipad-13':   { W: 2048,  H: 2732 },
}

function previewScale(format: SlideFormat) {
  const { maxW, maxH } = DISPLAY[format]
  const { W, H } = FORMAT_DIMS[format]
  return Math.min(maxW / W, maxH / H)
}

function LangDropdown({
  languages,
  activeLanguage,
  onSelect,
  onAdd,
}: {
  languages: string[]
  activeLanguage: string
  onSelect: (lang: string) => void
  onAdd: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const activeLabel = activeLanguage === 'en'
    ? 'EN · Default'
    : (getLangMeta(activeLanguage)?.code.toUpperCase() ?? activeLanguage.toUpperCase())

  return (
    <div className="flex items-center gap-1">
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-black/5 dark:bg-white/8 hover:bg-black/8 dark:hover:bg-white/12 text-gray-900 dark:text-white transition-colors"
        >
          {activeLabel}
          <ChevronDown className="w-3 h-3 text-muted" />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 w-44 surface border border-subtle rounded-lg shadow-lg z-50 py-1">
            <button
              onClick={() => { onSelect('en'); setOpen(false) }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted">EN</span>
                <span className="text-gray-900 dark:text-white">Default</span>
              </div>
              {activeLanguage === 'en' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
            </button>
            {languages.map((code) => {
              const meta = getLangMeta(code)
              return (
                <button
                  key={code}
                  onClick={() => { onSelect(code); setOpen(false) }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted">{code.toUpperCase()}</span>
                    <span className="text-gray-900 dark:text-white">{meta?.native ?? code}</span>
                  </div>
                  {activeLanguage === code && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button
        onClick={onAdd}
        className="w-6 h-6 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/8 text-muted hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
        title="Add language"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function App() {
  const canvasRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [showAddLang, setShowAddLang] = useState(false)
  const [exportLanguage, setExportLanguage] = useState('en')
  const { slides, activeSlideId, setActiveSlide, duplicateSlide, removeSlide, languages, activeLanguage, setActiveLanguage } = useEditorStore()
  const { isDark } = useThemeStore()
  const { t } = useTranslation()
  const activeSlide = slides.find((s) => s.id === activeSlideId)

  const displaySlide = useMemo(() => {
    if (!activeSlide || activeLanguage === 'en') return activeSlide
    const textVariant = activeSlide.textVariants?.[activeLanguage]
    const screenshotVariant = activeSlide.screenshotVariants?.[activeLanguage]
    return {
      ...activeSlide,
      headline: textVariant?.headline || activeSlide.headline,
      subtitle: textVariant?.subtitle || activeSlide.subtitle,
      screenshotDataUrl: screenshotVariant ?? activeSlide.screenshotDataUrl,
    }
  }, [activeSlide, activeLanguage])

  // Apply dark class to <html> whenever theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable
      const isMod = e.metaKey || e.ctrlKey

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (isTyping) return
        const idx = slides.findIndex((s) => s.id === activeSlideId)
        const next = e.key === 'ArrowLeft' ? idx - 1 : idx + 1
        if (next >= 0 && next < slides.length) setActiveSlide(slides[next].id)
        return
      }

      if (isMod && e.key === 'd') {
        e.preventDefault()
        duplicateSlide(activeSlideId)
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
        if (slides.length > 1) setPendingDelete(activeSlideId)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [slides, activeSlideId, setActiveSlide, duplicateSlide, removeSlide])

  const handleExportCurrent = useCallback(async () => {
    if (!activeSlide) return
    const el = canvasRefs.current.get(activeSlideId)
    if (!el) return
    const idx = slides.findIndex((s) => s.id === activeSlideId)
    const lang = activeLanguage
    flushSync(() => setExportLanguage(lang))
    const suffix = lang === 'en' ? '' : `-${lang}`
    await exportSlide(el, activeSlide.format, `slide-${idx + 1}${suffix}`)
    flushSync(() => setExportLanguage('en'))
  }, [activeSlide, activeSlideId, slides, activeLanguage])

  const scale = activeSlide ? previewScale(activeSlide.format) : 1
  const dims  = activeSlide ? FORMAT_DIMS[activeSlide.format] : { W: 1080, H: 1920 }
  const displayW = Math.round(dims.W * scale)
  const displayH = Math.round(dims.H * scale)

  return (
    <div className="flex flex-col h-screen surface-app text-gray-900 dark:text-white">
      <Header canvasRefs={canvasRefs} setExportLanguage={setExportLanguage} />

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <main className="flex-1 flex flex-col items-center justify-center gap-4 overflow-auto p-6">
          {activeSlide && displaySlide && (
            <>
              <LangDropdown
                languages={languages}
                activeLanguage={activeLanguage}
                onSelect={setActiveLanguage}
                onAdd={() => setShowAddLang(true)}
              />

              <div
                style={{
                  width: displayW,
                  height: displayH,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 10,
                  boxShadow: isDark
                    ? '0 8px 48px rgba(0,0,0,0.6)'
                    : '0 8px 48px rgba(0,0,0,0.15)',
                  flexShrink: 0,
                }}
              >
                <SlideCanvas slide={displaySlide} scale={scale} />
              </div>

              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={handleExportCurrent}
                  className="flex items-center gap-2 px-4 py-2 text-sm btn-ghost"
                >
                  <Download className="w-4 h-4" />
                  {t('export.slide')}
                </button>
                {activeLanguage !== 'en' && (
                  <span className="text-xs text-muted">
                    {getLangMeta(activeLanguage)?.native ?? activeLanguage.toUpperCase()}
                  </span>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <SlideStrip />
      <HiddenExportCanvases canvasRefs={canvasRefs} exportLanguage={exportLanguage} />

      {pendingDelete && (
        <ConfirmDialog
          message="Remove this slide? This can't be undone."
          onConfirm={() => { removeSlide(pendingDelete); setPendingDelete(null) }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {showAddLang && <AddLanguageDialog onClose={() => setShowAddLang(false)} />}

      <ToastContainer />
    </div>
  )
}
