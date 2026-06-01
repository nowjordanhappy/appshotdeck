import { forwardRef } from 'react'
import type { CSSProperties } from 'react'
import type { Slide, SlideFormat } from '../../types'
import { frameById } from '../../data/frames'
import { Device3D } from './Device3D'
import { ScreenContent } from './ScreenContent'
import { ScreenOverlay } from './ScreenOverlay'
import { CalloutLayer } from './CalloutLayer'

interface Props {
  slide: Slide
  scale?: number
  interactive?: boolean
}

interface FormatConfig {
  W: number
  H: number
  slotW: number
  slotH: number
  landscape: boolean
  /** ViewBox dimensions used to scale frame outerRx and bezel width to slot pixels */
  frameViewBox: string
}

const FORMAT: Record<SlideFormat, FormatConfig> = {
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

export const SlideCanvas = forwardRef<HTMLDivElement, Props>(
  ({ slide, scale = 1, interactive = true }, ref) => {
    const fmt = FORMAT[slide.format]
    const { W, H, slotW, slotH, landscape, frameViewBox } = fmt
    const frame = frameById(slide.frame)

    // Apply device scale (portrait only; tablets keep their fixed layout)
    const deviceScaleFactor = (slide.deviceScale ?? 100) / 100
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

    const offsetPx = Math.round((landscape ? W : H) * ((slide.deviceOffset ?? 0) / 100))
    const slotX = (landscape ? slotX_landscape : slotX_portrait) + (landscape ? offsetPx : 0)
    const slotY = (landscape ? slotY_landscape : slotY_portrait) + (landscape ? 0 : offsetPx)

    // Relative font sizing — scales with canvas width for all formats
    const headlineSize = Math.round(W * (landscape ? 0.036 : 0.063) * ((slide.headlineFontSize ?? 100) / 100))
    const subtitleSize = Math.round(W * (landscape ? 0.022 : 0.039) * ((slide.subtitleFontSize ?? 100) / 100))
    const textAlign = slide.textAlign ?? 'center'
    const shadowBlur = Math.round(W * 0.025)
    const shadowValue = (() => {
      const mode = slide.textShadow ?? 'off'
      if (mode === 'dark')  return `0 0 ${shadowBlur}px rgba(0,0,0,0.85), 0 ${Math.round(shadowBlur * 0.3)}px ${shadowBlur * 2}px rgba(0,0,0,0.85)`
      if (mode === 'light') return `0 0 ${shadowBlur}px rgba(255,255,255,0.45), 0 ${Math.round(shadowBlur * 0.3)}px ${shadowBlur * 2}px rgba(255,255,255,0.45)`
      return undefined
    })()
    const headlineShadow = shadowValue
    const subtitleShadow = shadowValue

    return (
      <div
        ref={ref}
        style={{
          width: W,
          height: H,
          position: 'relative',
          overflow: 'hidden',
          transformOrigin: 'top left',
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          flexShrink: 0,
          ...bgStyle(slide.background),
        }}
      >
        {/* ── Text ──────────────────────────────────────────────────────── */}
        {landscape ? (
          // Tablet: left column, vertically centered
          <div
            style={{
              position: 'absolute',
              left: Math.round(W * 0.05),
              top: 0,
              width: Math.round(W * 0.23),
              height: H,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              textAlign,
            }}
          >
            {(slide.showHeadline ?? true) && slide.headline && (
              <div style={{ fontSize: headlineSize, fontWeight: slide.headlineFontWeight ?? 700, fontFamily: slide.headlineFontFamily ?? 'Inter', lineHeight: 1.2, marginBottom: 24, color: slide.textColor, textShadow: headlineShadow }}>
                {slide.headline}
              </div>
            )}
            {(slide.showSubtitle ?? true) && slide.subtitle && (
              <div style={{ fontSize: subtitleSize, fontWeight: slide.subtitleFontWeight ?? 400, fontFamily: slide.subtitleFontFamily ?? 'Inter', lineHeight: 1.5, color: slide.subtitleColor, textShadow: subtitleShadow }}>
                {slide.subtitle}
              </div>
            )}
          </div>
        ) : (
          // Portrait: top or bottom
          <div
            style={{
              position: 'absolute',
              left: Math.round(W * 0.07),
              right: Math.round(W * 0.07),
              top: slide.textPosition === 'top'
                ? Math.round(H * 0.055)
                : slotY + dSlotH + Math.round(H * 0.03),
              textAlign,
            }}
          >
            {(slide.showHeadline ?? true) && slide.headline && (
              <div style={{ fontSize: headlineSize, fontWeight: slide.headlineFontWeight ?? 700, fontFamily: slide.headlineFontFamily ?? 'Inter', lineHeight: 1.15, letterSpacing: '-1px', marginBottom: Math.round(H * 0.012), color: slide.textColor, textShadow: headlineShadow }}>
                {slide.headline}
              </div>
            )}
            {(slide.showSubtitle ?? true) && slide.subtitle && (
              <div style={{ fontSize: subtitleSize, fontWeight: slide.subtitleFontWeight ?? 400, fontFamily: slide.subtitleFontFamily ?? 'Inter', lineHeight: 1.45, color: slide.subtitleColor, textShadow: subtitleShadow }}>
                {slide.subtitle}
              </div>
            )}
          </div>
        )}

        {/* ── Device slot ───────────────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute', left: slotX, top: slotY, width: dSlotW, height: dSlotH,
          }}
        >
          {frame.device3d ? (
            <Device3D
              spec={frame.device3d}
              slotW={dSlotW}
              slotH={dSlotH}
              vbW={vbW}
              tilt={slide.frameTilt}
              screenshotDataUrl={slide.screenshotDataUrl}
            />
          ) : (
            <div
              style={{
                position: 'relative', width: '100%', height: '100%',
              }}
            >
              {frame.bezel ? (
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: screenshotRadius,
                  background: frame.bezel.color,
                  overflow: 'hidden',
                  boxShadow: '0 48px 80px -24px rgba(0,0,0,0.5)',
                }}>
                  <div style={{
                    position: 'absolute',
                    inset: bezelWidth,
                    borderRadius: Math.max(0, (screenshotRadius ?? 0) - (bezelWidth ?? 0)),
                    overflow: 'hidden',
                  }}>
                    <ScreenContent screenshotDataUrl={slide.screenshotDataUrl} slotW={dSlotW} />
                    {interactive && <ScreenOverlay slideId={slide.id} slotW={dSlotW} />}
                  </div>
                </div>
              ) : (
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: screenshotRadius,
                  overflow: 'hidden',
                  boxShadow: '0 48px 80px -24px rgba(0,0,0,0.5)',
                }}>
                  <ScreenContent screenshotDataUrl={slide.screenshotDataUrl} slotW={dSlotW} />
                  {interactive && <ScreenOverlay slideId={slide.id} slotW={dSlotW} />}
                </div>
              )}
            </div>
          )}
        </div>

        <CalloutLayer
          slide={slide}
          slotX={slotX} slotY={slotY}
          slotW={dSlotW} slotH={dSlotH}
          W={W} H={H}
          interactive={interactive}
        />
      </div>
    )
  }
)
SlideCanvas.displayName = 'SlideCanvas'
