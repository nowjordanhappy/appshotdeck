import { useState, useRef, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { compressImage } from '../../utils/compress'
import { getLangMeta } from '../../utils/translate'

interface Props {
  slideId: string
  slotW: number
  lang: string
  borderRadius?: number
  mode?: 'overlay' | 'hint'
  positionX?: number
  positionY?: number
}

export function ScreenOverlay({ slideId, slotW, lang, borderRadius = 0, mode = 'overlay', positionX = 0, positionY = 0 }: Props) {
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

  if (mode === 'hint') {
    return (
      <>
        <div
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onClick={() => inputRef.current?.click()}
          style={{
            position: 'absolute',
            left: positionX,
            top: positionY + Math.round(slotW * 0.08),
            padding: `${Math.round(slotW * 0.025)}px ${Math.round(slotW * 0.05)}px`,
            background: hovering ? 'rgba(100,150,255,0.25)' : 'rgba(100,150,255,0.15)',
            borderRadius: Math.round(slotW * 0.015),
            color: 'rgba(255,255,255,0.9)',
            fontSize: Math.round(slotW * 0.032),
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 200ms',
            border: hovering ? '1px solid rgba(100,150,255,0.5)' : '1px solid rgba(100,150,255,0.3)',
            zIndex: 50,
            pointerEvents: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          ↑ {lang === 'en' ? 'Replace screenshot' : `Replace screenshot for ${getLangMeta(lang)?.native || lang.toUpperCase()}`}
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
          background: hovering ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
          transition: 'background 200ms',
          cursor: hovering ? 'pointer' : 'default',
          zIndex: 50,
          pointerEvents: 'auto',
          borderRadius,
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
              {replacing ? 'Replacing…' : 'Replace screenshot'}
            </span>
            {lang !== 'en' && (
              <span style={{ fontSize: Math.round(slotW * 0.032), fontWeight: 400, opacity: 0.8 }}>
                {getLangMeta(lang)?.native || lang.toUpperCase()}
              </span>
            )}
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
