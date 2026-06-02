import { useState, useRef, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '../../store/useEditorStore'
import { compressImage } from '../../utils/compress'

interface Props {
  slideId: string
}

export function ReplaceButton({ slideId }: Props) {
  const { t } = useTranslation()
  const [replacing, setReplacing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { activeLanguage, updateSlide, updateSlideVariantScreenshot } = useEditorStore()

  const handleFile = useCallback(async (file: File) => {
    setReplacing(true)
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const compressed = await compressImage(dataUrl)

      if (activeLanguage === 'en') {
        updateSlide(slideId, { screenshotDataUrl: compressed })
      } else {
        await updateSlideVariantScreenshot(slideId, activeLanguage, compressed)
      }
    } finally {
      setReplacing(false)
    }
  }, [slideId, activeLanguage, updateSlide, updateSlideVariantScreenshot])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const langCode = activeLanguage === 'en' ? 'EN' : activeLanguage.toUpperCase()

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={replacing}
        className="flex items-center gap-2 px-4 py-2 text-sm btn-ghost"
        style={{ opacity: replacing ? 0.6 : 1 }}
      >
        <Upload className="w-4 h-4" />
        {replacing ? t('replace.replacing') : t('replace.button', { lang: langCode })}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        disabled={replacing}
        style={{ display: 'none' }}
      />
    </>
  )
}
