import { useRef, useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Header } from './components/Header'
import { ConfirmDialog } from './components/ConfirmDialog'
import { ToastContainer } from './components/ToastContainer'
import { Sidebar } from './components/Sidebar/Sidebar'
import { SlideCanvas } from './components/Canvas/SlideCanvas'
import { SlideStrip } from './components/SlideStrip'
import { useEditorStore } from './store/useEditorStore'
import { useThemeStore } from './store/useThemeStore'
import { exportSlide } from './utils/export'
import type { SlideFormat } from './types'

function HiddenExportCanvases({
  canvasRefs,
}: {
  canvasRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
}) {
  const { slides } = useEditorStore()
  const setRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) canvasRefs.current.set(id, el)
      else canvasRefs.current.delete(id)
    },
    [canvasRefs]
  )
  return (
    <div aria-hidden style={{ position: 'fixed', top: 0, left: '-9999px', pointerEvents: 'none' }}>
      {slides.map((slide) => (
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

export default function App() {
  const canvasRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const { slides, activeSlideId, setActiveSlide, duplicateSlide, removeSlide } = useEditorStore()
  const { isDark } = useThemeStore()
  const { t } = useTranslation()
  const activeSlide = slides.find((s) => s.id === activeSlideId)

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
    await exportSlide(el, activeSlide.format, `slide-${idx + 1}`)
  }, [activeSlide, activeSlideId, slides])

  const scale = activeSlide ? previewScale(activeSlide.format) : 1
  const dims  = activeSlide ? FORMAT_DIMS[activeSlide.format] : { W: 1080, H: 1920 }
  const displayW = Math.round(dims.W * scale)
  const displayH = Math.round(dims.H * scale)

  return (
    <div className="flex flex-col h-screen surface-app text-gray-900 dark:text-white">
      <Header canvasRefs={canvasRefs} />

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <main className="flex-1 flex flex-col items-center justify-center gap-4 overflow-auto p-6">
          {activeSlide && (
            <>
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
                <SlideCanvas slide={activeSlide} scale={scale} />
              </div>

              <button
                onClick={handleExportCurrent}
                className="flex items-center gap-2 px-4 py-2 text-sm btn-ghost"
              >
                <Download className="w-4 h-4" />
                {t('export.slide')}
              </button>
            </>
          )}
        </main>
      </div>

      <SlideStrip />
      <HiddenExportCanvases canvasRefs={canvasRefs} />

      {pendingDelete && (
        <ConfirmDialog
          message="Remove this slide? This can't be undone."
          onConfirm={() => { removeSlide(pendingDelete); setPendingDelete(null) }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <ToastContainer />
    </div>
  )
}
