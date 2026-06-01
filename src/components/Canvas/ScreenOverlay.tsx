import { useState, useRef, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { compressImage } from '../../utils/compress'

interface Props {
  slideId: string
  slotW: number
}

export function ScreenOverlay({ slideId, slotW }: Props) {
  const [hovering, setHovering] = useState(false)
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

  return (
    <>
      <div
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hovering ? 'rgba(0,0,0,0.4)' : 'transparent',
          transition: 'background 200ms',
          cursor: hovering ? 'pointer' : 'default',
          zIndex: 10,
        }}
        onClick={() => inputRef.current?.click()}
      >
        {hovering && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: Math.round(slotW * 0.03),
            color: 'white',
            opacity: replacing ? 0.5 : 1,
            pointerEvents: 'none',
          }}>
            <Upload style={{ width: Math.round(slotW * 0.08), height: Math.round(slotW * 0.08) }} />
            <span style={{ fontSize: Math.round(slotW * 0.04), fontWeight: 500 }}>
              {replacing ? 'Replacing…' : 'Click to replace'}
            </span>
          </div>
        )}
      </div>
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
