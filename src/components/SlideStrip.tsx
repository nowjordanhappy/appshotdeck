import { useState } from 'react'
import { Plus, X, Copy, Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '../store/useEditorStore'
import { spanSource, spansNext } from '../utils/span'
import { SlideDeleteDialog } from './SlideDeleteDialog'
import { deviceLayout, slideBackground } from '../utils/layout'
import type { Slide } from '../types'

const FORMAT_BADGE: Record<string, string> = {
  'phone':     '📱',
  'tablet-7':  '🤖 7"',
  'tablet-10': '🤖 10"',
  'iphone-69': '🍎 6.9',
  'iphone-65': '🍎 6.5',
  'ipad-13':   '🍎 iPad',
}

// Thumbnail of one half of a span pair: the shared device drawn at its real (scaled-down)
// position, so the two thumbnails read as one picture across the seam.
function SpanThumb({ slide, spanFrom, spanning, width }: { slide: Slide; spanFrom?: Slide; spanning: boolean; width: number }) {
  const { W, device, frame, rotate, vbW, dSlotW, dSlotH, slotX, slotY } = deviceLayout(slide, spanFrom, spanning)
  const k = width / W
  const outerRx = frame.outerRx ?? frame.device3d?.outerRx ?? 0
  const bezel = frame.bezel?.width ?? frame.device3d?.bezelWidth ?? 0
  const radius = outerRx * dSlotW / vbW * k
  const bezelPx = bezel * dSlotW / vbW * k
  return (
    <div style={{
      position: 'absolute', left: slotX * k, top: slotY * k, width: dSlotW * k, height: dSlotH * k,
      transform: rotate ? `rotate(${rotate}deg)` : undefined,
      borderRadius: radius, padding: bezelPx, overflow: 'hidden',
      background: frame.bezel?.color ?? frame.device3d?.shellColor,
    }}>
      {device.screenshotDataUrl && (
        <img src={device.screenshotDataUrl} alt="" className="w-full h-full object-cover object-top"
          style={{ borderRadius: Math.max(0, radius - bezelPx) }} />
      )}
    </div>
  )
}

export function SlideStrip() {
  const { t } = useTranslation()
  const { slides, activeSlideId, addSlide, removeSlide, duplicateSlide, setActiveSlide, reorderSlides } =
    useEditorStore()
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  return (
    <div
      className="h-28 flex-shrink-0 surface border-t border-subtle flex items-center gap-3 px-4 overflow-x-auto"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
          reorderSlides(dragIdx, overIdx)
        }
        setDragIdx(null)
        setOverIdx(null)
      }}
    >
      {slides.map((slide, idx) => {
        const isActive = slide.id === activeSlideId
        const bg = slide.background
        const bgStyle =
          bg.type === 'solid'
            ? { background: bg.color }
            : { background: `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})` }

        const isLandscape = slide.format === 'tablet-7' || slide.format === 'tablet-10'
        const isIpad = slide.format === 'ipad-13'
        const thumbW = isLandscape ? 80 : isIpad ? 56 : 46
        const thumbH = isLandscape ? 46 : 74
        // A pair is dragged as one block, so its partner fades with it
        const isDragging = dragIdx !== null && (dragIdx === idx ||
          (spansNext(slides, dragIdx) && idx === dragIdx + 1) ||
          (!!spanSource(slides, dragIdx) && idx === dragIdx - 1))
        const isOver = overIdx === idx && dragIdx !== idx
        const spanFrom = spanSource(slides, idx)
        const spanning = spansNext(slides, idx)
        const inPair = !!spanFrom || spanning

        return (
          <div
            key={slide.id}
            className="relative flex-shrink-0 group"
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => { e.preventDefault(); setOverIdx(idx) }}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (dragIdx !== null && dragIdx !== idx) reorderSlides(dragIdx, idx)
              setDragIdx(null); setOverIdx(null)
            }}
            style={{ opacity: isDragging ? 0.4 : 1 }}
          >
            <button
              onClick={() => setActiveSlide(slide.id)}
              className={`relative rounded-lg border-2 overflow-hidden transition-all ${
                isOver ? 'border-indigo-400 scale-105' :
                isActive ? 'border-indigo-400' : 'border-black/20 dark:border-white/20 hover:border-black/40 dark:hover:border-white/40'
              }`}
              style={{ width: thumbW, height: thumbH, ...(inPair ? slideBackground(slide, spanFrom, spanning) : bgStyle) }}
            >
              {inPair && <SpanThumb slide={slide} spanFrom={spanFrom} spanning={spanning} width={thumbW - 4 /* inside border-2 */} />}
              {slide.screenshotDataUrl && !inPair && (
                <img src={slide.screenshotDataUrl} alt="" className="w-full h-full object-cover opacity-70" />
              )}
              <span className="absolute top-0.5 left-0.5 text-[8px] text-white/60 leading-none">
                {FORMAT_BADGE[slide.format]}
              </span>
              <span className="absolute bottom-0.5 right-1 text-[8px] text-white/50 font-medium">
                {idx + 1}
              </span>
            </button>

            {spansNext(slides, idx) && (
              <span
                title={t('strip.span_link', { a: idx + 1, b: idx + 2 })}
                className="absolute top-1/2 -right-[14px] -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center pointer-events-auto"
              >
                <Link2 className="w-2.5 h-2.5 text-white" />
              </span>
            )}

            <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1">
              <button onClick={() => duplicateSlide(slide.id)} title={t('strip.duplicate')}
                className="w-5 h-5 rounded-full bg-black/20 dark:bg-white/20 hover:bg-indigo-500 flex items-center justify-center transition-colors">
                <Copy className="w-3 h-3 text-white" />
              </button>
              {slides.length > 1 && (
                <button
                  onClick={() => {
                    // Single slides still delete immediately; a span pair asks what to remove
                    if (spansNext(slides, idx) || spanSource(slides, idx)) setPendingDelete(slide.id)
                    else removeSlide(slide.id)
                  }}
                  title={t('strip.remove')}
                  className="w-5 h-5 rounded-full bg-black/20 dark:bg-white/20 hover:bg-red-500 flex items-center justify-center transition-colors">
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
          </div>
        )
      })}

      <button
          onClick={addSlide}
          onDragOver={(e) => { e.preventDefault(); setOverIdx(slides.length) }}
          onDragLeave={() => setOverIdx(null)}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (dragIdx !== null && dragIdx !== slides.length - 1) {
              reorderSlides(dragIdx, slides.length - 1)
            }
            setDragIdx(null); setOverIdx(null)
          }}
          className={`flex-shrink-0 w-12 h-20 rounded-lg border-2 border-dashed transition-all flex items-center justify-center ${
            overIdx === slides.length
              ? 'border-indigo-400 bg-indigo-500/10'
              : 'border-black/20 dark:border-white/20 hover:border-indigo-400 hover:bg-indigo-500/10'
          }`}
        >
          <Plus className="w-5 h-5 text-muted" />
        </button>

      {pendingDelete && <SlideDeleteDialog slideId={pendingDelete} onClose={() => setPendingDelete(null)} />}
    </div>
  )
}
