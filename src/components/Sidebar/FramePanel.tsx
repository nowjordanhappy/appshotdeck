import { useTranslation } from 'react-i18next'
import { RotateCcw, AlignCenterHorizontal, AlignCenterVertical, Link2 } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { framesForFormat, frameById } from '../../data/frames'
import { Tooltip } from '../Tooltip'
import { spanSource } from '../../utils/span'

const RESIZABLE_FORMATS = new Set(['phone', 'iphone-69', 'iphone-65', 'ipad-13', 'tablet-7', 'tablet-10'])
const LANDSCAPE_FORMATS = new Set(['tablet-7', 'tablet-10'])
const PORTRAIT_PHONE_FORMATS = new Set(['phone', 'iphone-69', 'iphone-65', 'ipad-13'])

const DEFAULT_OFFSET: Record<string, number> = {
  'phone': 30, 'iphone-69': 30, 'iphone-65': 30, 'ipad-13': 30,
  'tablet-7': 16, 'tablet-10': 16,
}


export function FramePanel() {
  const { t } = useTranslation()
  const { slides, activeSlideId, updateSlide, setActiveSlide } = useEditorStore()
  const index = slides.findIndex((s) => s.id === activeSlideId)
  const slide = slides[index]
  if (!slide) return null

  const available = framesForFormat(slide.format)
  const activeFrame = frameById(slide.frame)
  const receivingFrom = spanSource(slides, index)
  const next = slides[index + 1]
  const canSpan = !!next && next.format === slide.format

  // The device on a receiving slide belongs to the previous slide; edit it there
  if (receivingFrom) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-xs text-muted uppercase tracking-wider mb-3">{t('frame.title')}</p>
        <div className="flex items-start gap-2 px-3 py-3 rounded-xl option-idle text-sm">
          <Link2 size={16} className="flex-shrink-0 mt-0.5 text-indigo-400" />
          <span>{t('frame.span_received', { n: index })}</span>
        </div>
        <button
          onClick={() => setActiveSlide(receivingFrom.id)}
          className="w-full px-4 py-2 text-sm btn-ghost text-indigo-400"
        >
          {t('frame.span_edit', { n: index })}
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-2">
      <p className="text-xs text-muted uppercase tracking-wider mb-3">{t('frame.title')}</p>
      {available.map((frame) => (
        <button
          key={frame.id}
          onClick={() => updateSlide(activeSlideId, { frame: frame.id })}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
            slide.frame === frame.id
              ? 'border-indigo-400 bg-indigo-500/20 text-gray-900 dark:text-white'
              : 'option-idle'
          }`}
        >
          {slide.format === 'phone' || slide.format === 'iphone-69' || slide.format === 'iphone-65' ? (
            <div className={`w-7 h-12 border-2 border-current rounded-lg flex items-center justify-center flex-shrink-0 opacity-75 ${frame.tilt ? '[transform:rotateY(20deg)] [perspective:120px]' : ''}`}>
              {(frame.id === 'android-flat' || frame.id === 'android-3d') && (
                <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              )}
            </div>
          ) : (
            <div className="w-12 h-8 border-2 border-current rounded-md flex-shrink-0 opacity-75" />
          )}
          <span className="text-sm font-medium">{frame.label}</span>
          {slide.frame === frame.id && (
            <span className="ml-auto text-xs text-indigo-400 dark:text-indigo-400">{t('frame.active')}</span>
          )}
        </button>
      ))}
      {RESIZABLE_FORMATS.has(slide.format) && (
        <>
          <div className="flex items-center gap-2 pt-2 pr-1">
            <span className="flex items-center gap-1 text-xs text-muted flex-shrink-0">
              {t('frame.pos')} <Tooltip text={t('tips.pos')} />
            </span>
            <input
              type="range" min={-30} max={30} value={slide.deviceOffset ?? 0}
              onChange={(e) => updateSlide(activeSlideId, { deviceOffset: Number(e.target.value) })}
              className="flex-1 min-w-0"
            />
            <span className="text-xs text-dim font-mono w-8 text-right flex-shrink-0">{(slide.deviceOffset ?? 0) > 0 ? `+${slide.deviceOffset}` : (slide.deviceOffset ?? 0)}%</span>
            {PORTRAIT_PHONE_FORMATS.has(slide.format) && (
              <button
                onClick={() => updateSlide(activeSlideId, { deviceOffset: 0 })}
                className="flex-shrink-0 text-muted hover:text-foreground transition-colors p-0.5"
                title={t('frame.center_v')}
              >
                <AlignCenterVertical size={14} />
              </button>
            )}
            {LANDSCAPE_FORMATS.has(slide.format) && (
              <button
                onClick={() => updateSlide(activeSlideId, { deviceOffset: 0 })}
                className="flex-shrink-0 text-muted hover:text-foreground transition-colors p-0.5"
                title={t('frame.center_h')}
              >
                <AlignCenterHorizontal size={14} />
              </button>
            )}
            <button
              onClick={() => updateSlide(activeSlideId, { deviceOffset: DEFAULT_OFFSET[slide.format] ?? 0 })}
              className="flex-shrink-0 text-muted hover:text-foreground transition-colors p-0.5"
              title={t('frame.reset_pos')}
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 pr-1">
            <span className="flex items-center gap-1 text-xs text-muted flex-shrink-0">
              {t('frame.size')} <Tooltip text={t('tips.size')} />
            </span>
            <input
              type="range" min={60} max={LANDSCAPE_FORMATS.has(slide.format) || slide.format === 'ipad-13' ? 180 : 150} value={slide.deviceScale ?? 100}
              onChange={(e) => updateSlide(activeSlideId, { deviceScale: Number(e.target.value) })}
              className="flex-1 min-w-0"
            />
            <span className="text-xs text-dim font-mono w-8 text-right flex-shrink-0">{slide.deviceScale ?? 100}%</span>
            <button
              onClick={() => updateSlide(activeSlideId, { deviceScale: 100 })}
              className="flex-shrink-0 text-muted hover:text-foreground transition-colors p-0.5"
              title={t('frame.reset_size')}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </>
      )}

      <div className="flex items-center gap-2 pt-2 pr-1">
        <span className="flex items-center gap-1 text-xs text-muted flex-shrink-0">
          {t('frame.rotate')} <Tooltip text={t('tips.rotate')} />
        </span>
        <input
          type="range" min={-40} max={40} value={slide.deviceRotate ?? 0}
          onChange={(e) => updateSlide(activeSlideId, { deviceRotate: Number(e.target.value) })}
          className="flex-1 min-w-0"
        />
        <span className="text-xs text-dim font-mono w-8 text-right flex-shrink-0">{slide.deviceRotate ?? 0}°</span>
        <button
          onClick={() => updateSlide(activeSlideId, { deviceRotate: 0 })}
          className="flex-shrink-0 text-muted hover:text-foreground transition-colors p-0.5"
          title={t('frame.reset_rotate')}
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {activeFrame.tilt && (
        <div className="flex items-center gap-2 pt-2 pr-1">
          <span className="flex items-center gap-1 text-xs text-muted flex-shrink-0">
            {t('frame.tilt')} <Tooltip text={t('tips.tilt')} />
          </span>
          <input
            type="range" min={-60} max={60} value={slide.frameTilt}
            onChange={(e) => updateSlide(activeSlideId, { frameTilt: Number(e.target.value) })}
            className="flex-1 min-w-0"
          />
          <span className="text-xs text-dim font-mono w-8 text-right flex-shrink-0">{slide.frameTilt}°</span>
          <button
            onClick={() => updateSlide(activeSlideId, { frameTilt: 0 })}
            className="flex-shrink-0 text-muted hover:text-foreground transition-colors p-0.5"
            title={t('frame.reset_tilt')}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      )}

      <div className="pt-3 mt-2 border-t border-gray-200 dark:border-white/10 space-y-2">
        <label className={`flex items-center gap-2 text-sm ${canSpan ? 'cursor-pointer' : 'opacity-50'}`}>
          <input
            type="checkbox"
            disabled={!canSpan}
            checked={canSpan && (slide.spanNext ?? false)}
            onChange={(e) => updateSlide(activeSlideId, { spanNext: e.target.checked })}
          />
          {t('frame.span_next')}
          <Tooltip text={canSpan ? t('tips.span') : t('tips.span_unavailable')} />
        </label>
        {canSpan && slide.spanNext && (
          <>
            <div className="flex items-center gap-2 pr-1">
              <span className="flex items-center gap-1 text-xs text-muted flex-shrink-0">
                {t('frame.span_x')} <Tooltip text={t('tips.span_x')} />
              </span>
              <input
                type="range" min={50} max={150} value={slide.spanX ?? 100}
                onChange={(e) => updateSlide(activeSlideId, { spanX: Number(e.target.value) })}
                className="flex-1 min-w-0"
              />
              <span className="text-xs text-dim font-mono w-8 text-right flex-shrink-0">{slide.spanX ?? 100}</span>
              <button
                onClick={() => updateSlide(activeSlideId, { spanX: 100 })}
                className="flex-shrink-0 text-muted hover:text-foreground transition-colors p-0.5"
                title={t('frame.span_x_reset')}
              >
                <RotateCcw size={14} />
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={slide.spanBackground ?? false}
                onChange={(e) => updateSlide(activeSlideId, { spanBackground: e.target.checked })}
              />
              {t('frame.span_bg')}
              <Tooltip text={t('tips.span_bg')} />
            </label>
          </>
        )}
      </div>
    </div>
  )
}
