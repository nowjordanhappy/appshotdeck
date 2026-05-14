import JSZip from 'jszip'
import type { Slide } from '../types'

const PROJECT_VERSION = 1

interface ProjectConfig {
  version: number
  slides: Array<Omit<Slide, 'screenshotDataUrl'> & { image: string | null }>
}

// ─── Save ────────────────────────────────────────────────────────────────────

export async function saveProject(slides: Slide[], projectName = 'appshotdeck-project'): Promise<void> {
  const zip = new JSZip()
  const images = zip.folder('images')!

  const config: ProjectConfig = {
    version: PROJECT_VERSION,
    slides: await Promise.all(
      slides.map(async (slide, idx) => {
        const { screenshotDataUrl, ...rest } = slide
        let image: string | null = null

        if (screenshotDataUrl) {
          // Strip data URL prefix and store as actual file
          const base64 = screenshotDataUrl.split(',')[1]
          const filename = `slide-${idx + 1}.png`
          images.file(filename, base64, { base64: true })
          image = `images/${filename}`
        }

        return { ...rest, image }
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
    config.slides.map(async ({ image, ...rest }) => {
      let screenshotDataUrl: string | null = null

      if (image) {
        const imgFile = zip.file(image)
        if (imgFile) {
          const base64 = await imgFile.async('base64')
          screenshotDataUrl = `data:image/png;base64,${base64}`
        }
      }

      return { ...rest, screenshotDataUrl } as Slide
    })
  )

  return { slides }
}
