import { useState } from 'react'
import { Upload, Smartphone, Image, Type, Monitor } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UploadPanel } from './UploadPanel'
import { FramePanel } from './FramePanel'
import { BackgroundPanel } from './BackgroundPanel'
import { TextPanel } from './TextPanel'
import { useEditorStore } from '../../store/useEditorStore'
import { defaultFrameForFormat } from '../../store/useEditorStore'
import { framesForFormat } from '../../data/frames'
import type { SlideFormat } from '../../types'

type Tab = 'upload' | 'frame' | 'background' | 'text'
type Platform = 'android' | 'ios'

export function Sidebar() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('upload')
  const [platform, setPlatform] = useState<Platform>('android')
  const { slides, activeSlideId, updateSlide } = useEditorStore()
  const slide = slides.find((s) => s.id === activeSlideId)

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'upload',     label: t('sidebar.tabs.upload'),     icon: <Upload className="w-4 h-4" /> },
    { id: 'frame',      label: t('sidebar.tabs.frame'),      icon: <Smartphone className="w-4 h-4" /> },
    { id: 'background', label: t('sidebar.tabs.background'), icon: <Image className="w-4 h-4" /> },
    { id: 'text',       label: t('sidebar.tabs.text'),       icon: <Type className="w-4 h-4" /> },
  ]

  const ANDROID_FORMATS: { id: SlideFormat; label: string; sub: string }[] = [
    { id: 'phone',     label: t('sidebar.formats.phone'),     sub: '1080×1920' },
    { id: 'tablet-7',  label: t('sidebar.formats.tablet_7'), sub: '1920×1080' },
    { id: 'tablet-10', label: t('sidebar.formats.tablet_10'),sub: '2560×1440' },
  ]

  const IOS_FORMATS: { id: SlideFormat; label: string; sub: string }[] = [
    { id: 'iphone-69', label: t('sidebar.formats.iphone_69'), sub: '1320×2868' },
    { id: 'iphone-65', label: t('sidebar.formats.iphone_65'), sub: '1242×2688' },
    { id: 'ipad-13',   label: t('sidebar.formats.ipad_13'),   sub: '2048×2732' },
  ]

  const formatList = platform === 'android' ? ANDROID_FORMATS : IOS_FORMATS

  const handleFormat = (format: SlideFormat) => {
    if (!slide) return
    const validFrames = framesForFormat(format).map((f) => f.id)
    const frame = validFrames.includes(slide.frame)
      ? slide.frame
      : defaultFrameForFormat(format)
    updateSlide(activeSlideId, { format, frame })
  }

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col surface border-r border-subtle">
      {/* Format picker */}
      <div className="p-3 border-b border-subtle space-y-2">
        <div className="flex bg-black/8 dark:bg-white/10 rounded-lg p-0.5">
          {(['android', 'ios'] as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPlatform(p)
                const firstFormat = (p === 'android' ? ANDROID_FORMATS : IOS_FORMATS)[0].id
                handleFormat(firstFormat)
              }}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                platform === p
                  ? 'bg-black/10 dark:bg-white/15 text-gray-900 dark:text-white'
                  : 'text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70'
              }`}
            >
              {p === 'android'
                ? `🤖 ${t('sidebar.platform_android')}`
                : <span className="flex items-center justify-center gap-1">🍎 {t('sidebar.platform_ios')} <span className="text-[9px] font-semibold bg-amber-400/20 text-amber-400 px-1 py-0.5 rounded">Beta</span></span>
              }
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {formatList.map((f) => (
            <button
              key={f.id}
              onClick={() => handleFormat(f.id)}
              className={`flex-1 py-2 rounded-lg text-center transition-all ${
                slide?.format === f.id
                  ? 'bg-indigo-500/25 border border-indigo-400 text-indigo-300'
                  : 'option-idle border'
              }`}
            >
              {f.id.startsWith('ipad') || f.id.startsWith('tablet') ? (
                <Monitor className="w-3.5 h-3.5 mx-auto mb-0.5" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 mx-auto mb-0.5" />
              )}
              <div className="text-[10px] font-medium leading-none">{f.label}</div>
              <div className="text-[9px] text-black/30 dark:text-white/30 mt-0.5">{f.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-subtle">
        {TABS.map((t_) => (
          <button
            key={t_.id}
            onClick={() => setTab(t_.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
              tab === t_.id
                ? 'text-indigo-500 dark:text-indigo-400 border-b-2 border-indigo-500 dark:border-indigo-400 -mb-px'
                : 'text-muted hover:text-dim'
            }`}
          >
            {t_.icon}
            {t_.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {tab === 'upload'     && <UploadPanel />}
        {tab === 'frame'      && <FramePanel />}
        {tab === 'background' && <BackgroundPanel />}
        {tab === 'text'       && <TextPanel />}
      </div>
    </aside>
  )
}
