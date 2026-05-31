import { useTranslation } from 'react-i18next'
import { Trash2, AlignCenterHorizontal, AlignCenterVertical, Crosshair } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import type { Callout } from '../../types'

export function CalloutPanel() {
  const { t } = useTranslation()
  const { slides, activeSlideId, updateSlide } = useEditorStore()
  const slide = slides.find(s => s.id === activeSlideId)
  if (!slide) return null

  const callouts: Callout[] = slide.callouts ?? []

  const update = (id: string, patch: Partial<Callout>) =>
    updateSlide(activeSlideId, {
      callouts: callouts.map(c => c.id === id ? { ...c, ...patch } : c),
    })

  const remove = (id: string) =>
    updateSlide(activeSlideId, {
      callouts: callouts.filter(c => c.id !== id),
    })

  return (
    <div className="p-4 space-y-4">
      {/* Instruction */}
      <div className="text-xs text-muted bg-black/5 dark:bg-white/5 rounded-lg p-3 leading-relaxed">
        {callouts.length < 3 ? t('callout.hint') : t('callout.hint_max')}
      </div>


      {callouts.map((c, i) => (
        <div key={c.id} className="space-y-3 rounded-lg border border-subtle p-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              {t('callout.callout')} {i + 1}
            </span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => update(c.id, { bubbleX: 50 })} className="p-1 text-muted hover:text-foreground transition-colors" title="Center horizontally">
                <AlignCenterHorizontal size={13} />
              </button>
              <button onClick={() => update(c.id, { bubbleY: 50 })} className="p-1 text-muted hover:text-foreground transition-colors" title="Center vertically">
                <AlignCenterVertical size={13} />
              </button>
              <button onClick={() => update(c.id, { bubbleX: 50, bubbleY: 50 })} className="p-1 text-muted hover:text-foreground transition-colors" title="Center both">
                <Crosshair size={13} />
              </button>
              <button
                onClick={() => remove(c.id)}
                className="p-1 text-muted hover:text-red-400 transition-colors ml-1"
                title={t('callout.remove')}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Shape */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted uppercase tracking-wider">{t('callout.shape')}</span>
            <div className="flex gap-1">
              {(['rect', 'circle'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => update(c.id, { shape: s })}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    c.shape === s
                      ? 'bg-indigo-500/25 border-indigo-400 text-indigo-300'
                      : 'border-black/10 dark:border-white/10 text-muted hover:text-foreground'
                  }`}
                >
                  {t(`callout.shape_${s}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Bubble size */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted uppercase tracking-wider">{t('callout.size')}</span>
              <span className="text-xs text-dim font-mono">{c.bubbleSize}%</span>
            </div>
            <input
              type="range" min={40} max={90} step={1}
              value={c.bubbleSize}
              onChange={e => update(c.id, { bubbleSize: Number(e.target.value) })}
              className="w-full"
            />
          </div>


        </div>
      ))}
    </div>
  )
}
