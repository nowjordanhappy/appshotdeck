import { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '../../store/useEditorStore'
import type { Callout, Slide } from '../../types'

interface Props {
  slide: Slide
  slotX: number
  slotY: number
  slotW: number
  slotH: number
  W: number
  H: number
  interactive: boolean
}

interface SlotDrag {
  startX: number  // slot %
  startY: number
  curX: number
  curY: number
}

interface BubbleDrag {
  calloutId: string
  startMouseX: number
  startMouseY: number
  startBX: number
  startBY: number
}

export function CalloutLayer({ slide, slotX, slotY, slotW, slotH, W, H, interactive }: Props) {
  const { updateSlide, activeSlideId } = useEditorStore()
  const callouts: Callout[] = slide.callouts ?? []

  const [slotDrag, setSlotDrag] = useState<SlotDrag | null>(null)
  const [isDraggingBubble, setIsDraggingBubble] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const overlayRef    = useRef<HTMLDivElement>(null)
  const bubbleDragRef = useRef<BubbleDrag | null>(null)

  const borderW = Math.max(2, Math.round(W * 0.004))
  const cornerR = Math.round(W * 0.01)

  // ── Convert client coords → canvas pixels ─────────────────────────────────
  const toCanvasPx = (clientX: number, clientY: number) => {
    const rect = overlayRef.current!.getBoundingClientRect()
    return {
      x: (clientX - rect.left)  / rect.width  * W,
      y: (clientY - rect.top)   / rect.height * H,
    }
  }

  // ── Convert canvas pixels → slot % (clamped 0–100) ────────────────────────
  const toSlotPct = (cpx: number, cpy: number) => ({
    x: Math.max(0, Math.min(100, (cpx - slotX) / slotW * 100)),
    y: Math.max(0, Math.min(100, (cpy - slotY) / slotH * 100)),
  })

  const inSlot = (cpx: number, cpy: number) =>
    cpx >= slotX && cpx <= slotX + slotW && cpy >= slotY && cpy <= slotY + slotH

  // ── Hit-test a canvas point against all bubbles ────────────────────────────
  const hitBubble = (cpx: number, cpy: number): Callout | null => {
    for (const c of callouts) {
      const bubD      = c.bubbleSize / 100 * W
      const bubCX     = c.bubbleX / 100 * W
      const bubCY     = c.bubbleY / 100 * H
      const selAspect = (c.selW / 100 * slotW) / Math.max(c.selH / 100 * slotH, 1)
      const bubW      = bubD
      const bubH      = c.shape === 'rect' ? bubD / selAspect : bubD
      if (cpx >= bubCX - bubW / 2 && cpx <= bubCX + bubW / 2 &&
          cpy >= bubCY - bubH / 2 && cpy <= bubCY + bubH / 2) return c
    }
    return null
  }

  // ── Bubble drag via window listeners (avoids stale closures) ──────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = bubbleDragRef.current
      if (!drag || !overlayRef.current) return
      const rect  = overlayRef.current.getBoundingClientRect()
      const scale = rect.width / W
      const newBX = Math.max(2, Math.min(98, drag.startBX + (e.clientX - drag.startMouseX) / scale / W * 100))
      const newBY = Math.max(2, Math.min(98, drag.startBY + (e.clientY - drag.startMouseY) / scale / H * 100))
      const currentSlide = useEditorStore.getState().slides.find(s => s.id === activeSlideId)
      if (!currentSlide) return
      useEditorStore.getState().updateSlide(activeSlideId, {
        callouts: (currentSlide.callouts ?? []).map(c =>
          c.id === drag.calloutId ? { ...c, bubbleX: newBX, bubbleY: newBY } : c
        ),
      })
    }
    const onUp = () => {
      if (!bubbleDragRef.current) return
      bubbleDragRef.current = null
      setIsDraggingBubble(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [activeSlideId, W, H])

  // ── Deselect when clicking outside the canvas ─────────────────────────────
  useEffect(() => {
    if (!selectedId || !interactive) return
    const onDown = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        setSelectedId(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [selectedId, interactive])

  // ── Delete selected callout with keyboard ─────────────────────────────────
  useEffect(() => {
    if (!selectedId || !interactive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.stopImmediatePropagation() // prevent slide-delete in App.tsx
      const current = useEditorStore.getState().slides.find(s => s.id === activeSlideId)
      if (!current) return
      useEditorStore.getState().updateSlide(activeSlideId, {
        callouts: (current.callouts ?? []).filter(c => c.id !== selectedId),
      })
      setSelectedId(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [selectedId, activeSlideId, interactive])

  if (!interactive && callouts.length === 0) return null

  // ── Pointer down on full-canvas overlay ───────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = toCanvasPx(e.clientX, e.clientY)

    // 1. Hit a bubble anywhere on canvas → select + move it
    const hit = hitBubble(x, y)
    if (hit) {
      setSelectedId(hit.id)
      bubbleDragRef.current = {
        calloutId: hit.id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startBX: hit.bubbleX,
        startBY: hit.bubbleY,
      }
      setIsDraggingBubble(true)
      e.preventDefault()
      return
    }

    // 2. Click outside any bubble → deselect
    setSelectedId(null)

    // 3. Within slot and slots available → start new callout drag
    if (inSlot(x, y) && callouts.length < 3) {
      const { x: sx, y: sy } = toSlotPct(x, y)
      setSlotDrag({ startX: sx, startY: sy, curX: sx, curY: sy })
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!slotDrag) return
    const { x, y } = toCanvasPx(e.clientX, e.clientY)
    const { x: sx, y: sy } = toSlotPct(x, y)
    setSlotDrag(d => d ? { ...d, curX: sx, curY: sy } : null)
  }

  const handleMouseUp = () => {
    if (!slotDrag) return
    const { startX, startY, curX, curY } = slotDrag
    const selX = Math.min(startX, curX)
    const selY = Math.min(startY, curY)
    const selW = Math.abs(curX - startX)
    const selH = Math.abs(curY - startY)
    if (selW > 4 && selH > 4) {
      updateSlide(activeSlideId, {
        callouts: [...callouts, {
          id: crypto.randomUUID(),
          selX, selY, selW, selH,
          bubbleX: 50, bubbleY: 50,
          bubbleSize: 90,
          shape: 'rect',
          showLine: false,
        }],
      })
    }
    setSlotDrag(null)
  }

  // Preview rect in canvas pixels
  const preview = slotDrag ? {
    left:   slotX + Math.min(slotDrag.startX, slotDrag.curX) / 100 * slotW,
    top:    slotY + Math.min(slotDrag.startY, slotDrag.curY) / 100 * slotH,
    width:  Math.abs(slotDrag.curX - slotDrag.startX) / 100 * slotW,
    height: Math.abs(slotDrag.curY - slotDrag.startY) / 100 * slotH,
  } : null

  return (
    <>
      {/* Full-canvas interactive overlay — handles both create and move */}
      {interactive && (
        <div
          ref={overlayRef}
          style={{
            position: 'absolute', inset: 0,
            cursor: isDraggingBubble ? 'grabbing' : (callouts.length >= 3 ? 'default' : 'crosshair'),
            zIndex: 35,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {preview && (
            <div style={{
              position: 'absolute',
              left: preview.left, top: preview.top,
              width: preview.width, height: preview.height,
              border: `${borderW}px dashed rgba(255,255,255,0.9)`,
              background: 'rgba(255,255,255,0.08)',
              boxSizing: 'border-box',
              borderRadius: cornerR,
              pointerEvents: 'none',
            }} />
          )}
        </div>
      )}

      {/* Grabbing cursor overlay during bubble drag */}
      {interactive && isDraggingBubble && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 51, cursor: 'grabbing' }} />
      )}

      {/* Zoom bubbles */}
      {callouts.map(c => {
        const bubD  = Math.round(c.bubbleSize / 100 * W)
        const bubCX = Math.round(c.bubbleX / 100 * W)
        const bubCY = Math.round(c.bubbleY / 100 * H)

        const selPixW   = c.selW / 100 * slotW
        const selPixH   = c.selH / 100 * slotH
        const selAspect = selPixW / Math.max(selPixH, 1)
        const bubW = bubD
        const bubH = c.shape === 'rect' ? Math.round(bubD / selAspect) : bubD

        const effectiveZoom = bubW / Math.max(selPixW, 1)
        const imgW    = Math.round(slotW * effectiveZoom)
        const imgH    = Math.round(slotH * effectiveZoom)
        const imgLeft = Math.round(bubW / 2 - (c.selX + c.selW / 2) / 100 * slotW * effectiveZoom)
        const imgTop  = Math.round(bubH / 2 - (c.selY + c.selH / 2) / 100 * slotH * effectiveZoom)

        return (
          <div
            key={c.id + '_bub'}
            style={{
              position: 'absolute',
              left: bubCX - bubW / 2,
              top:  bubCY - bubH / 2,
              width: bubW,
              height: bubH,
              borderRadius: c.shape === 'circle' ? '50%' : cornerR * 2,
              overflow: 'hidden',
              border: 'none',
              boxShadow: `0 ${borderW * 4}px ${borderW * 12}px rgba(0,0,0,0.45)`,
              zIndex: 30,
            }}
          >
            {slide.screenshotDataUrl && (
              <img
                src={slide.screenshotDataUrl}
                style={{
                  position: 'absolute',
                  width: imgW,
                  height: imgH,
                  left: imgLeft,
                  top: imgTop,
                  objectFit: 'cover',
                  objectPosition: 'top center',
                  display: 'block',
                  maxWidth: 'none',
                  maxHeight: 'none',
                }}
              />
            )}
            {selectedId === c.id && (
              <div style={{
                position: 'absolute', inset: 0,
                boxShadow: `inset 0 0 0 ${borderW * 2}px rgba(99,102,241,0.9)`,
                borderRadius: c.shape === 'circle' ? '50%' : cornerR * 2,
                pointerEvents: 'none',
              }} />
            )}
          </div>
        )
      })}
    </>
  )
}
