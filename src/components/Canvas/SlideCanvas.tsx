import { forwardRef } from 'react'
import type { Slide } from '../../types'
import { deviceLayout, slideBackground } from '../../utils/layout'
import { Device3D } from './Device3D'
import { ScreenContent } from './ScreenContent'
import { CalloutLayer } from './CalloutLayer'

interface Props {
  slide: Slide
  scale?: number
  interactive?: boolean
  /** Previous slide whose device continues into this one; this slide's own device is hidden. */
  spanFrom?: Slide
  /** This slide's device continues into the next slide. */
  spanning?: boolean
}

export const SlideCanvas = forwardRef<HTMLDivElement, Props>(
  ({ slide, scale = 1, interactive = true, spanFrom, spanning = false }, ref) => {
    const {
      W, H, landscape, device, frame, rotate, dSlotW, dSlotH, vbW, screenshotRadius, bezelWidth, slotX, slotY,
    } = deviceLayout(slide, spanFrom, spanning)
    const background = slideBackground(slide, spanFrom, spanning)

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
          ...background,
        }}
      >
        {/* ── Text ──────────────────────────────────────────────────────── */}
        {landscape ? (
          // Tablet: left column, vertically centered. A receiving slide mirrors it to the right,
          // since the device continuing from the previous slide enters from the left.
          <div
            style={{
              position: 'absolute',
              left: spanFrom ? W - Math.round(W * 0.05) - Math.round(W * 0.23) : Math.round(W * 0.05),
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
            transform: rotate && !frame.device3d ? `rotate(${rotate}deg)` : undefined,
          }}
        >
          {frame.device3d ? (
            <Device3D
              spec={frame.device3d}
              slotW={dSlotW}
              slotH={dSlotH}
              vbW={vbW}
              tilt={device.frameTilt}
              rotate={rotate}
              screenshotDataUrl={device.screenshotDataUrl}
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
                    <ScreenContent screenshotDataUrl={device.screenshotDataUrl} slotW={dSlotW} />
                  </div>
                </div>
              ) : (
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: screenshotRadius,
                  overflow: 'hidden',
                  boxShadow: '0 48px 80px -24px rgba(0,0,0,0.5)',
                }}>
                  <ScreenContent screenshotDataUrl={device.screenshotDataUrl} slotW={dSlotW} />
                </div>
              )}
            </div>
          )}
        </div>

        {!spanFrom && <CalloutLayer
          slide={slide}
          slotX={slotX} slotY={slotY}
          slotW={dSlotW} slotH={dSlotH}
          W={W} H={H}
          interactive={interactive}
          rotate={rotate}
        />}
      </div>
    )
  }
)
SlideCanvas.displayName = 'SlideCanvas'
