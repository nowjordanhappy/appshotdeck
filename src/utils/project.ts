import JSZip from 'jszip'
import type { Slide } from '../types'

const PROJECT_VERSION = 1

function extractBase64(dataUrl: string): string | null {
  const parts = dataUrl.split(',')
  return parts.length === 2 ? parts[1] : null
}

interface ProjectConfig {
  version: number
  slides: Array<Omit<Slide, 'screenshotDataUrl' | 'screenshotVariants'> & {
    image: string | null
    imageVariants?: Record<string, string>
  }>
}

// ─── Save ────────────────────────────────────────────────────────────────────

export async function saveProject(slides: Slide[], projectName = 'appshotdeck-project'): Promise<void> {
  const zip = new JSZip()
  const images = zip.folder('images')!

  const config: ProjectConfig = {
    version: PROJECT_VERSION,
    slides: await Promise.all(
      slides.map(async (slide, idx) => {
        const { screenshotDataUrl, screenshotVariants, ...rest } = slide
        let image: string | null = null
        const imageVariants: Record<string, string> = {}

        if (screenshotDataUrl) {
          const base64 = extractBase64(screenshotDataUrl)
          if (base64) {
            const filename = `slide-${idx + 1}.png`
            images.file(filename, base64, { base64: true })
            image = `images/${filename}`
          }
        }

        if (screenshotVariants) {
          for (const [lang, dataUrl] of Object.entries(screenshotVariants)) {
            if (dataUrl) {
              const base64 = extractBase64(dataUrl)
              if (base64) {
                const filename = `slide-${idx + 1}-${lang}.png`
                images.file(filename, base64, { base64: true })
                imageVariants[lang] = `images/${filename}`
              }
            }
          }
        }

        return { ...rest, image, ...(Object.keys(imageVariants).length ? { imageVariants } : {}) }
      })
    ),
  }

  zip.file('config.json', JSON.stringify(config, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = projectName.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()
  a.download = `appshotdeck-${safeName}.zip`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ─── Load ────────────────────────────────────────────────────────────────────

export interface LoadedProject {
  slides: Slide[]
}

export async function loadProject(file: File): Promise<LoadedProject> {
  const zip = await JSZip.loadAsync(file)

  const configFile = zip.file('config.json')
  if (!configFile) throw new Error('Invalid project file: missing config.json')

  const config: ProjectConfig = JSON.parse(await configFile.async('text'))
  if (!config.version || !Array.isArray(config.slides)) {
    throw new Error('Invalid project file: unrecognised format')
  }

  const slides: Slide[] = await Promise.all(
    config.slides.map(async ({ image, imageVariants, ...rest }) => {
      let screenshotDataUrl: string | null = null
      const screenshotVariants: Record<string, string | null> = {}

      if (image) {
        const imgFile = zip.file(image)
        if (imgFile) {
          const base64 = await imgFile.async('base64')
          screenshotDataUrl = `data:image/png;base64,${base64}`
        }
      }

      if (imageVariants) {
        for (const [lang, path] of Object.entries(imageVariants)) {
          const imgFile = zip.file(path)
          if (imgFile) {
            const base64 = await imgFile.async('base64')
            screenshotVariants[lang] = `data:image/png;base64,${base64}`
          }
        }
      }

      return {
        ...rest,
        screenshotDataUrl,
        ...(Object.keys(screenshotVariants).length ? { screenshotVariants } : {}),
      } as Slide
    })
  )

  return { slides }
}
