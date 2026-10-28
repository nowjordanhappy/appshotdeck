import type { CSSProperties } from 'react'
import type { Slide, SlideFormat } from '../types'
import { frameById } from '../data/frames'

interface FormatConfig {
  W: number
  H: number
  slotW: number
  slotH: number
  landscape: boolean
  /** ViewBox dimensions used to scale frame outerRx and bezel width to slot pixels */
  frameViewBox: string
}

export const FORMAT: Record<SlideFormat, FormatConfig> = {
  // Android / Play Store — portrait
  phone:     { W: 1080, H: 1920, slotW: 780,  slotH: 1686, landscape: false, frameViewBox: '0 0 390 844' },
  // Android tablets — landscape
  'tablet-7':  { W: 1920, H: 1080, slotW: 1000, slotH: 625,  landscape: true,  frameViewBox: '0 0 960 600' },
  'tablet-10': { W: 2560, H: 1440, slotW: 1360, slotH: 850,  landscape: true,  frameViewBox: '0 0 960 600' },
  // iOS / App Store — portrait
  'iphone-69': { W: 1320, H: 2868, slotW: 990,  slotH: 2148, landscape: false, frameViewBox: '0 0 393 852' },
  'iphone-65': { W: 1242, H: 2688, slotW: 930,  slotH: 2020, landscape: false, frameViewBox: '0 0 393 852' },
  'ipad-13':   { W: 2048, H: 2732, slotW: 1440, slotH: 1897, landscape: false, frameViewBox: '0 0 820 1080' },
}

function bgStyle(bg: Slide['background']): CSSProperties {
  if (bg.type === 'solid') return { background: bg.color }
  return { background: `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})` }
}

// Shared background: both slides of a span draw the spanning slide's background at
// double width, the left one showing its left half and the right one its right half.
function spanBgStyle(bg: Slide['background'], half: 'left' | 'right'): CSSProperties {
  return { ...bgStyle(bg), backgroundSize: '200% 100%', backgroundPosition: half === 'left' ? '0 0' : '100% 0' }
}

export function slideBackground(slide: Slide, spanFrom?: Slide, spanning = false): CSSProperties {
  return spanFrom?.spanBackground
    ? spanBgStyle(spanFrom.background, 'right')
    : spanning && slide.spanBackground
      ? spanBgStyle(slide.background, 'left')
      : bgStyle(slide.background)
}

// Device slot geometry in full-resolution canvas pixels. Shared by SlideCanvas and the
// slide strip thumbnails so both place the device identically.
export function deviceLayout(slide: Slide, spanFrom?: Slide, spanning = false) {
  const { W, H, slotW, slotH, landscape, frameViewBox } = FORMAT[slide.format]
  // A receiving slide draws the spanning slide's device instead of its own
  const device = spanFrom ?? slide
  const isSpanned = spanning || !!spanFrom
  const frame = frameById(device.frame)
  const rotate = device.deviceRotate ?? 0

  // Apply device scale (portrait only; tablets keep their fixed layout)
  const deviceScaleFactor = (device.deviceScale ?? 100) / 100
  const dSlotW = Math.round(slotW * deviceScaleFactor)
  const dSlotH = Math.round(slotH * deviceScaleFactor)

  // Compute pixel values scaled from viewBox units to (scaled) slot pixels
  const vbW = Number(frameViewBox.split(' ')[2])
  const screenshotRadius = frame.outerRx != null
    ? Math.round(frame.outerRx * dSlotW / vbW)
    : undefined
  const bezelWidth = frame.bezel != null
    ? Math.round(frame.bezel.width * dSlotW / vbW)
    : undefined

  // ── Portrait layout (phone / iPhone / iPad) ───────────────────────────
  const slotX_portrait = Math.round((W - dSlotW) / 2)
  const slotY_portrait = Math.round((H - dSlotH) / 2)

  // ── Landscape layout (Android tablets) ───────────────────────────────
  const slotX_landscape = Math.round((W - dSlotW) / 2)
  const slotY_landscape = Math.round((H - dSlotH) / 2)

  // Pos is horizontal on tablets — except while spanning, where spanX owns X and Pos moves Y
  const offsetVertical = !landscape || isSpanned
  const offsetPx = Math.round((offsetVertical ? H : W) * ((device.deviceOffset ?? 0) / 100))
  // Spanning: spanX (100 = on the seam) replaces the horizontal position; the receiving
  // slide draws the same device one canvas width to the left so the halves line up.
  const slotX = isSpanned
    ? Math.round(W * (device.spanX ?? 100) / 100 - dSlotW / 2) - (spanFrom ? W : 0)
    : (landscape ? slotX_landscape : slotX_portrait) + (landscape ? offsetPx : 0)
  const slotY = (landscape ? slotY_landscape : slotY_portrait) + (offsetVertical ? offsetPx : 0)

  return { W, H, landscape, device, frame, rotate, dSlotW, dSlotH, vbW, screenshotRadius, bezelWidth, slotX, slotY }
}
