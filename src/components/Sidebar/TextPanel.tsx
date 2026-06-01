import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, CopyCheck, AlignLeft, AlignCenter, AlignRight, RotateCcw, ChevronDown, Check } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import type { TextAlign } from '../../types'
import { Tooltip } from '../Tooltip'
import { TranslationsSection } from './TranslationsSection'

const FONTS = [
  'Inter',
  'Poppins',
  'Montserrat',
  'Nunito',
  'Space Grotesk',
]

function FontPicker({ value, onChange }: { value: string; onChange: (f: string) => void }) {
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 hover:border-indigo-400 transition-colors"
      >
        <span className="text-sm text-gray-900 dark:text-white" style={{ fontFamily: value }}>{value}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 surface border border-subtle rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          {FONTS.map((f) => (
            <button
              key={f}
              onClick={() => { onChange(f); setOpen(false) }}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className="text-sm text-gray-900 dark:text-white" style={{ fontFamily: f }}>{f}</span>
              {value === f && <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const WEIGHTS = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 600, label: 'Semi' },
  { value: 700, label: 'Bold' },
]

interface TextBlockProps {
  label: string
  text: string
  onTextChange: (v: string) => void
  placeholder: string
  visible: boolean
  onToggleVisible: () => void
  fontFamily: string
  onFontFamily: (v: string) => void
  fontWeight: number
  onFontWeight: (v: number) => void
  fontSize: number
  onFontSize: (v: number) => void
  onResetSize: () => void
  color: string
  onColor: (v: string) => void
  colorLabel: string
}

function TextBlock({
  label, text, onTextChange, placeholder,
  visible, onToggleVisible,
  fontFamily, onFontFamily,
  fontWeight, onFontWeight,
  fontSize, onResetSize, onFontSize,
  color, onColor, colorLabel,
}: TextBlockProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
        <button onClick={onToggleVisible} className="text-muted hover:text-foreground transition-colors p-0.5">
          {visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={2}
        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-black/30 dark:placeholder-white/30 resize-none focus:outline-none focus:border-indigo-400 transition-colors"
        placeholder={placeholder}
      />

      <div className="space-y-1.5">
        <span className="text-xs text-muted uppercase tracking-wider">{t('text.font')}</span>
        <FontPicker value={fontFamily} onChange={onFontFamily} />
      </div>

      <div className="space-y-1.5">
        <span className="text-xs text-muted uppercase tracking-wider">{t('text.weight')}</span>
        <div className="flex gap-1">
          {WEIGHTS.map((w) => (
            <button
              key={w.value}
              onClick={() => onFontWeight(w.value)}
              className={`flex-1 py-1.5 rounded-lg text-xs border transition-all ${
                fontWeight === w.value
                  ? 'bg-indigo-500/25 border-indigo-400 text-indigo-300'
                  : 'border-black/10 dark:border-white/10 text-muted hover:text-foreground'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted uppercase tracking-wider">{t('text.size')}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-dim font-mono">{fontSize}%</span>
            <button onClick={onResetSize} className="text-muted hover:text-foreground transition-colors" title="Reset">
              <RotateCcw size={11} />
            </button>
          </div>
        </div>
        <input type="range" min={60} max={140} step={5}
          value={fontSize}
          onChange={(e) => onFontSize(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-xs text-muted uppercase tracking-wider">{colorLabel}</span>
        <label className="flex items-center gap-3">
          <input type="color" value={color}
            onChange={(e) => onColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
          />
          <span className="text-sm text-dim font-mono">{color}</span>
        </label>
      </div>
    </div>
  )
}

export function TextPanel() {
  const { t } = useTranslation()
  const { slides, activeSlideId, updateSlide, applyToAllSlides, languages, markVariantsStale, updateTextVariant } = useEditorStore()
  const slide = slides.find((s) => s.id === activeSlideId)
  if (!slide) return null

  function handleHeadlineChange(v: string) {
    const s = slide!
    updateSlide(activeSlideId, { headline: v })
    if (languages.length > 0) {
      languages.forEach((lang) => {
        const variant = s.textVariants?.[lang]
        if (!variant || variant.status === 'empty') return
        const isBack = variant.fromHeadline !== undefined && v === variant.fromHeadline
        if (isBack) updateTextVariant(activeSlideId, lang, { status: 'ok' })
        else markVariantsStale(activeSlideId, lang)
      })
    }
  }

  function handleSubtitleChange(v: string) {
    const s = slide!
    updateSlide(activeSlideId, { subtitle: v })
    if (languages.length > 0) {
      languages.forEach((lang) => {
        const variant = s.textVariants?.[lang]
        if (!variant || variant.status === 'empty') return
        const isBack = variant.fromSubtitle !== undefined && v === variant.fromSubtitle
        if (isBack) updateTextVariant(activeSlideId, lang, { status: 'ok' })
        else markVariantsStale(activeSlideId, lang)
      })
    }
  }

  return (
    <>
    <div className="p-4 space-y-4">
      <TextBlock
        label={t('text.headline')}
        text={slide.headline}
        onTextChange={handleHeadlineChange}
        placeholder={t('text.headline_placeholder')}
        visible={slide.showHeadline ?? true}
        onToggleVisible={() => updateSlide(activeSlideId, { showHeadline: !(slide.showHeadline ?? true) })}
        fontFamily={slide.headlineFontFamily ?? 'Inter'}
        onFontFamily={(v) => updateSlide(activeSlideId, { headlineFontFamily: v })}
        fontWeight={slide.headlineFontWeight ?? 700}
        onFontWeight={(v) => updateSlide(activeSlideId, { headlineFontWeight: v })}
        fontSize={slide.headlineFontSize ?? 100}
        onFontSize={(v) => updateSlide(activeSlideId, { headlineFontSize: v })}
        onResetSize={() => updateSlide(activeSlideId, { headlineFontSize: 100 })}
        color={slide.textColor}
        onColor={(v) => updateSlide(activeSlideId, { textColor: v })}
        colorLabel={t('text.headline_color')}
      />

      <div className="border-t border-subtle" />

      <TextBlock
        label={t('text.subtitle')}
        text={slide.subtitle}
        onTextChange={handleSubtitleChange}
        placeholder={t('text.subtitle_placeholder')}
        visible={slide.showSubtitle ?? true}
        onToggleVisible={() => updateSlide(activeSlideId, { showSubtitle: !(slide.showSubtitle ?? true) })}
        fontFamily={slide.subtitleFontFamily ?? 'Inter'}
        onFontFamily={(v) => updateSlide(activeSlideId, { subtitleFontFamily: v })}
        fontWeight={slide.subtitleFontWeight ?? 400}
        onFontWeight={(v) => updateSlide(activeSlideId, { subtitleFontWeight: v })}
        fontSize={slide.subtitleFontSize ?? 100}
        onFontSize={(v) => updateSlide(activeSlideId, { subtitleFontSize: v })}
        onResetSize={() => updateSlide(activeSlideId, { subtitleFontSize: 100 })}
        color={slide.subtitleColor}
        onColor={(v) => updateSlide(activeSlideId, { subtitleColor: v })}
        colorLabel={t('text.subtitle_color')}
      />

      <div className="border-t border-subtle" />

      <div className="space-y-1.5">
        <span className="text-xs text-muted uppercase tracking-wider">{t('text.alignment')}</span>
        <div className="flex gap-1">
          {([
            { value: 'left',   Icon: AlignLeft },
            { value: 'center', Icon: AlignCenter },
            { value: 'right',  Icon: AlignRight },
          ] as { value: TextAlign; Icon: React.FC<{ size?: number }> }[]).map(({ value, Icon }) => (
            <button
              key={value}
              onClick={() => updateSlide(activeSlideId, { textAlign: value })}
              className={`flex-1 py-2 flex items-center justify-center rounded-lg border transition-all ${
                (slide.textAlign ?? 'center') === value
                  ? 'bg-indigo-500/25 border-indigo-400 text-indigo-300'
                  : 'border-black/10 dark:border-white/10 text-muted hover:text-foreground'
              }`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs text-muted uppercase tracking-wider">{t('text.shadow')}</span>
        <div className="flex gap-1">
          {(['off', 'dark', 'light'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => updateSlide(activeSlideId, { textShadow: mode })}
              className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                (slide.textShadow ?? 'off') === mode
                  ? 'bg-indigo-500/25 border-indigo-400 text-indigo-300'
                  : 'border-black/10 dark:border-white/10 text-muted hover:text-foreground'
              }`}
            >
              {t(`text.shadow_${mode}`)}
            </button>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <button
          onClick={() => applyToAllSlides({

            textColor: slide.textColor,
            subtitleColor: slide.subtitleColor,
            textPosition: slide.textPosition,
            textAlign: slide.textAlign,
            textShadow: slide.textShadow,
            headlineFontFamily: slide.headlineFontFamily,
            headlineFontWeight: slide.headlineFontWeight,
            headlineFontSize: slide.headlineFontSize,
            subtitleFontFamily: slide.subtitleFontFamily,
            subtitleFontWeight: slide.subtitleFontWeight,
            subtitleFontSize: slide.subtitleFontSize,
          })}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted hover:text-foreground transition-colors"
        >
          <CopyCheck className="w-3.5 h-3.5" />
          {t('text.apply_to_all')}
          <Tooltip text={t('tips.apply_text')} side="top-end" />
        </button>
      )}
    </div>
    <TranslationsSection />
    </>
  )
}
