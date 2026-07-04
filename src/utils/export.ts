import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import type { SlideFormat } from '../types'

const FORMAT_SIZE: Record<SlideFormat, { width: number; height: number }> = {
  'phone':     { width: 1080,  height: 1920 },
  'tablet-7':  { width: 1920,  height: 1080 },
  'tablet-10': { width: 2560,  height: 1440 },
  'iphone-69': { width: 1320,  height: 2868 },
  'iphone-65': { width: 1242,  height: 2688 },
  'ipad-13':   { width: 2048,  height: 2732 },
}

const FORMAT_FOLDER: Record<SlideFormat, string> = {
  'phone':     'android/phone',
  'tablet-7':  'android/tablet-7',
  'tablet-10': 'android/tablet-10',
  'iphone-69': 'ios/iphone-69',
  'iphone-65': 'ios/iphone-65',
  'ipad-13':   'ios/ipad-13',
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function captureElement(el: HTMLElement, format: SlideFormat): Promise<string> {
  const { width, height } = FORMAT_SIZE[format]

  // Check for a WebGL canvas (3D frames). Must be captured before html-to-image
  // because html-to-image cannot read WebGL content — it renders the canvas as blank.
  const webglCanvas = el.querySelector('canvas') as HTMLCanvasElement | null

  if (!webglCanvas) {
    return toPng(el, { width, height, pixelRatio: 1 })
  }

  // Grab WebGL frame while the buffer is still live (preserveDrawingBuffer: true)
  const webglDataUrl = webglCanvas.toDataURL('image/png')

  // Compute the WebGL canvas position in the slide's full-res coordinate space.
  // The slide element has transform:scale(s), so divide bounding rects by that scale.
  const slideRect  = el.getBoundingClientRect()
  const webglRect  = webglCanvas.getBoundingClientRect()
  const scaleX     = slideRect.width  / width
  const scaleY     = slideRect.height / height
  const webglX     = (webglRect.left - slideRect.left) / scaleX
  const webglY     = (webglRect.top  - slideRect.top)  / scaleY
  const webglW     = webglRect.width  / scaleX
  const webglH     = webglRect.height / scaleY

  // Capture DOM layer (WebGL area will be transparent/blank here)
  const domDataUrl = await toPng(el, { width, height, pixelRatio: 1 })

  // Composite: DOM background + WebGL frame on top
  const composite  = document.createElement('canvas')
  composite.width  = width
  composite.height = height
  const ctx = composite.getContext('2d')!
  const [domImg, webglImg] = await Promise.all([loadImage(domDataUrl), loadImage(webglDataUrl)])
  ctx.drawImage(domImg,   0, 0, width, height)
  ctx.drawImage(webglImg, webglX, webglY, webglW, webglH)

  // The WebGL frame was just painted over any callout bubble overlapping the
  // device. Re-draw the callout layer on top so zoom lenses sit above the 3D
  // device (matches the live preview). Flat frames don't hit this path.
  const calloutLayer = el.querySelector('[data-callout-layer]') as HTMLElement | null
  if (calloutLayer && calloutLayer.childElementCount > 0) {
    const calloutImg = await loadImage(await toPng(calloutLayer, { width, height, pixelRatio: 1 }))
    ctx.drawImage(calloutImg, 0, 0, width, height)
  }

  return composite.toDataURL('image/png')
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

export async function exportSlide(
  el: HTMLElement,
  format: SlideFormat,
  name: string
): Promise<void> {
  const dataUrl = await captureElement(el, format)
  triggerDownload(dataUrl, `${name}.png`)
}

export interface ExportEntry {
  el: HTMLElement
  format: SlideFormat
  name: string
}

// Capture each entry and add it to the zip under `[prefix/]<format-folder>/<name>.png`.
export async function addEntriesToZip(zip: JSZip, entries: ExportEntry[], prefix = ''): Promise<void> {
  for (const { el, format, name } of entries) {
    const dataUrl = await captureElement(el, format)
    const base64 = dataUrl.split(',')[1]
    const folderPath = prefix ? `${prefix}/${FORMAT_FOLDER[format]}` : FORMAT_FOLDER[format]
    zip.folder(folderPath)!.file(`${name}.png`, base64, { base64: true })
  }
}

export async function downloadZip(zip: JSZip, projectName: string): Promise<void> {
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const safeName = projectName.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()
  triggerDownload(url, `${safeName}-screenshots.zip`)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export async function exportAll(entries: ExportEntry[], projectName = 'appshotdeck'): Promise<void> {
  const zip = new JSZip()
  await addEntriesToZip(zip, entries)
  await downloadZip(zip, projectName)
}
