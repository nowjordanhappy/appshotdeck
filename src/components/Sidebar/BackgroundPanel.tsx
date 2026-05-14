import { useTranslation } from 'react-i18next'
import { CopyCheck } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { GRADIENT_PRESETS, LIGHT_GRADIENT_PRESETS, SOLID_PRESETS } from '../../data/backgrounds'
import type { Background } from '../../types'

function bgPreviewStyle(bg: Background): React.CSSProperties {
  if (bg.type === 'solid') return { background: bg.color }
  return { background: `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})` }
}

export function BackgroundPanel() {
  const { t } = useTranslation()
  const { slides, activeSlideId, updateSlide, applyToAllSlides } = useEditorStore()
  const slide = slides.find((s) => s.id === activeSlideId)
  if (!slide) return null

  const bg = slide.background

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-muted uppercase tracking-wider">{t('background.gradients')}</p>
        <div className="grid grid-cols-3 gap-2">
          {GRADIENT_PRESETS.map((p) => (
            <button key={p.label} title={p.label}
              onClick={() => updateSlide(activeSlideId, { background: p.bg })}
              className="aspect-video rounded-lg border-2 border-medium hover:border-indigo-400 transition-all"
              style={bgPreviewStyle(p.bg)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted uppercase tracking-wider">{t('background.light_gradients')}</p>
        <div className="grid grid-cols-3 gap-2">
          {LIGHT_GRADIENT_PRESETS.map((p) => (
            <button key={p.label} title={p.label}
              onClick={() => updateSlide(activeSlideId, { background: p.bg })}
              className="aspect-video rounded-lg border-2 border-medium hover:border-indigo-400 transition-all"
              style={bgPreviewStyle(p.bg)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted uppercase tracking-wider">{t('background.solids')}</p>
        <div className="grid grid-cols-3 gap-2">
          {SOLID_PRESETS.map((p) => (
            <button key={p.label} title={p.label}
              onClick={() => updateSlide(activeSlideId, { background: p.bg })}
              className="aspect-video rounded-lg border-2 border-medium hover:border-indigo-400 transition-all"
              style={bgPreviewStyle(p.bg)}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-medium pt-4 space-y-3">
        <p className="text-xs text-muted uppercase tracking-wider">{t('background.custom')}</p>

        <div className="flex gap-2">
          <button
            onClick={() => updateSlide(activeSlideId, {
              background: { type: 'solid', color: bg.type === 'solid' ? bg.color : '#1e293b' },
            })}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              bg.type === 'solid'
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400'
                : 'bg-black/5 dark:bg-white/10 text-dim border border-medium hover:text-black dark:hover:text-white'
            }`}
          >
            {t('background.solid')}
          </button>
          <button
            onClick={() => updateSlide(activeSlideId, {
              background: bg.type === 'gradient'
                ? bg
                : { type: 'gradient', from: '#0F172A', to: '#1E3A5F', angle: 135 },
            })}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              bg.type === 'gradient'
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400'
                : 'bg-black/5 dark:bg-white/10 text-dim border border-medium hover:text-black dark:hover:text-white'
            }`}
          >
            {t('background.gradient')}
          </button>
        </div>

        {bg.type === 'solid' && (
          <label className="flex items-center gap-3">
            <input type="color" value={bg.color}
              onChange={(e) => updateSlide(activeSlideId, { background: { type: 'solid', color: e.target.value } })}
              className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
            />
            <span className="text-sm text-dim font-mono">{bg.color}</span>
          </label>
        )}

        {bg.type === 'gradient' && (
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input type="color" value={bg.from}
                onChange={(e) => updateSlide(activeSlideId, { background: { ...bg, from: e.target.value } })}
                className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-xs text-muted">{t('background.from')}</span>
              <span className="text-xs text-dim font-mono ml-auto">{bg.from}</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="color" value={bg.to}
                onChange={(e) => updateSlide(activeSlideId, { background: { ...bg, to: e.target.value } })}
                className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-xs text-muted">{t('background.to')}</span>
              <span className="text-xs text-dim font-mono ml-auto">{bg.to}</span>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted w-10">{t('background.angle')}</span>
              <input type="range" min={0} max={360} value={bg.angle}
                onChange={(e) => updateSlide(activeSlideId, { background: { ...bg, angle: Number(e.target.value) } })}
                className="flex-1"
              />
              <span className="text-xs text-dim font-mono w-10 text-right">{bg.angle}°</span>
            </div>
          </div>
        )}
      </div>

      {slides.length > 1 && (
        <button
          onClick={() => applyToAllSlides({ background: slide.background })}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted hover:text-foreground transition-colors"
        >
          <CopyCheck className="w-3.5 h-3.5" />
          {t('background.apply_to_all')}
        </button>
      )}
    </div>
  )
}
