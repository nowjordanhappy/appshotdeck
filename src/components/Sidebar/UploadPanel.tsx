import { useCallback, useState } from 'react'
import { Upload, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '../../store/useEditorStore'
import { getLangMeta } from '../../utils/translate'
import { compressImage } from '../../utils/compress'

function VariantUploadSection({
  lang,
  variantDataUrl,
  onUpload,
  onRemove,
}: {
  lang: string
  variantDataUrl: string | null
  onUpload: (lang: string, dataUrl: string) => void
  onRemove: (lang: string) => void
}) {
  const [compressing, setCompressing] = useState(false)
  const meta = getLangMeta(lang)
  const label = meta?.native ?? lang.toUpperCase()

  const handleFile = useCallback(async (file: File) => {
    setCompressing(true)
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const compressed = await compressImage(dataUrl)
      onUpload(lang, compressed)
    } finally {
      setCompressing(false)
    }
  }, [lang, onUpload])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleFile(file)
  }, [handleFile])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted uppercase tracking-wider">
          <span className="font-mono">{lang.toUpperCase()}</span>
          {' · '}{label}
          <span className="ml-1 text-dim normal-case font-normal">(optional)</span>
        </p>
        {variantDataUrl && (
          <button
            onClick={() => onRemove(lang)}
            className="flex items-center gap-1 text-xs text-muted hover:text-red-400 transition-colors"
            title="Remove — reverts to EN screenshot"
          >
            <X className="w-3 h-3" />
            Remove
          </button>
        )}
      </div>

      {variantDataUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-indigo-400/30">
          <img src={variantDataUrl} alt={`${label} screenshot`} className="w-full object-cover rounded-xl" />
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
            <div className="flex flex-col items-center gap-2 text-white">
              <Upload className="w-6 h-6" />
              <span className="text-xs font-medium">Replace</span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }} />
          </label>
        </div>
      ) : (
        <label
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-black/15 dark:border-white/15 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {compressing ? (
            <>
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <p className="text-xs text-muted">Compressing…</p>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-muted" />
              <div>
                <p className="text-xs text-muted font-medium">Upload {label} screenshot</p>
                <p className="text-xs text-dim">Falls back to EN if empty</p>
              </div>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }} disabled={compressing} />
        </label>
      )}
    </div>
  )
}

export function UploadPanel() {
  const { t } = useTranslation()
  const { activeSlideId, slides, languages, updateSlide, updateSlideVariantScreenshot } = useEditorStore()
  const [compressing, setCompressing] = useState(false)

  const slide = slides.find((s) => s.id === activeSlideId)
  const hasLanguages = languages.length > 0

  const handleFileEN = useCallback(async (file: File) => {
    setCompressing(true)
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const compressed = await compressImage(dataUrl)
      updateSlide(activeSlideId, { screenshotDataUrl: compressed })
    } finally {
      setCompressing(false)
    }
  }, [activeSlideId, updateSlide])

  const onDropEN = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleFileEN(file)
  }, [handleFileEN])

  const handleVariantUpload = useCallback(async (lang: string, dataUrl: string) => {
    await updateSlideVariantScreenshot(activeSlideId, lang, dataUrl)
  }, [activeSlideId, updateSlideVariantScreenshot])

  const handleVariantRemove = useCallback(async (lang: string) => {
    await updateSlideVariantScreenshot(activeSlideId, lang, null)
  }, [activeSlideId, updateSlideVariantScreenshot])

  return (
    <div className="p-4 space-y-4">
      {/* EN / default */}
      <div className="space-y-2">
        {hasLanguages && (
          <p className="text-xs text-muted uppercase tracking-wider">Default (EN)</p>
        )}
        <label
          onDrop={onDropEN}
          onDragOver={(e) => e.preventDefault()}
          className={`flex items-center justify-center border-2 border-dashed border-black/20 dark:border-white/20 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
            hasLanguages ? 'gap-2 px-4 py-3 flex-row' : 'flex-col gap-3 p-8'
          }`}
        >
          {compressing ? (
            <>
              <Loader2 className={`text-indigo-400 animate-spin ${hasLanguages ? 'w-4 h-4' : 'w-8 h-8'}`} />
              <p className="text-sm text-black/50 dark:text-white/50">{t('upload.compressing')}</p>
            </>
          ) : (
            <>
              <Upload className={`text-muted ${hasLanguages ? 'w-4 h-4' : 'w-8 h-8'}`} />
              {hasLanguages ? (
                <p className="text-sm text-muted">{t('upload.drop_title')}</p>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-soft font-medium">{t('upload.drop_title')}</p>
                  <p className="text-xs text-muted mt-1">{t('upload.drop_subtitle')}</p>
                </div>
              )}
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileEN(file)
          }} disabled={compressing} />
        </label>
        {!hasLanguages && (
          <p className="text-xs text-black/30 dark:text-white/30 text-center">{t('upload.hint')}</p>
        )}
      </div>

      {/* Per-language variant sections */}
      {languages.map((lang) => (
        <VariantUploadSection
          key={lang}
          lang={lang}
          variantDataUrl={slide?.screenshotVariants?.[lang] ?? null}
          onUpload={handleVariantUpload}
          onRemove={handleVariantRemove}
        />
      ))}
    </div>
  )
}
