import JSZip from 'jszip'
import type { ProjectMeta, Slide, SlideConfig } from '../types'
import { getScreenshot, getScreenshotVariant } from './db'

const WORKSPACE_VERSION = 1

function extractBase64(dataUrl: string): string | null {
  const parts = dataUrl.split(',')
  return parts.length === 2 ? parts[1] : null
}

interface WorkspaceSlide extends SlideConfig {
  image: string | null
  imageVariants?: Record<string, string>
}

interface WorkspaceProject {
  id: string
  name: string
  createdAt: number
  slides: WorkspaceSlide[]
  activeSlideId: string
  languages?: string[]
  protectedWords?: string[]
}

interface WorkspaceConfig {
  version: number
  projects: WorkspaceProject[]
}

export interface LoadedWorkspaceProject {
  meta: ProjectMeta
  screenshots: Array<{ slideId: string; dataUrl: string }>
  variantScreenshots: Array<{ slideId: string; lang: string; dataUrl: string }>
}

// ─── Save ────────────────────────────────────────────────────────────────────

export async function saveWorkspace(
  projects: ProjectMeta[],
  activeProjectId: string,
  activeSlides: Slide[],
  activeSlideId: string
): Promise<void> {
  const zip = new JSZip()

  const workspaceProjects: WorkspaceProject[] = await Promise.all(
    projects.map(async (project) => {
      const isActive = project.id === activeProjectId
      const slides: SlideConfig[] = isActive
        ? activeSlides.map(({ screenshotDataUrl: _, screenshotVariants: __, ...rest }) => rest)
        : project.slides
      const langs = project.languages ?? []

      const slidesWithImages = await Promise.all(
        slides.map(async (slide) => {
          const dataUrl = await getScreenshot(`${project.id}/${slide.id}`)
          let image: string | null = null
          const imageVariants: Record<string, string> = {}

          if (dataUrl) {
            const base64 = extractBase64(dataUrl)
            if (base64) {
              const path = `images/${project.id}/${slide.id}.png`
              zip.file(path, base64, { base64: true })
              image = path
            }
          }

          for (const lang of langs) {
            const variantUrl = await getScreenshotVariant(project.id, slide.id, lang)
            if (variantUrl) {
              const base64 = extractBase64(variantUrl)
              if (base64) {
                const path = `images/${project.id}/${slide.id}-${lang}.png`
                zip.file(path, base64, { base64: true })
                imageVariants[lang] = path
              }
            }
          }

          return {
            ...slide,
            image,
            ...(Object.keys(imageVariants).length ? { imageVariants } : {}),
          }
        })
      )

      return {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        slides: slidesWithImages,
        activeSlideId: isActive ? activeSlideId : project.activeSlideId,
        languages: project.languages,
        protectedWords: project.protectedWords,
      }
    })
  )

  const config: WorkspaceConfig = { version: WORKSPACE_VERSION, projects: workspaceProjects }
  zip.file('workspace.json', JSON.stringify(config, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const date = new Date().toISOString().slice(0, 10)
  a.download = `appshotdeck-workspace-${date}.zip`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ─── Load ────────────────────────────────────────────────────────────────────

export async function loadWorkspace(file: File): Promise<LoadedWorkspaceProject[]> {
  const zip = await JSZip.loadAsync(file)

  const configFile = zip.file('workspace.json')
  if (!configFile) throw new Error('Invalid workspace file: missing workspace.json')

  const config: WorkspaceConfig = JSON.parse(await configFile.async('text'))
  if (!config.version || !Array.isArray(config.projects)) {
    throw new Error('Invalid workspace file: unrecognised format')
  }

  return Promise.all(
    config.projects
      .filter((p) => p.id && p.name && Array.isArray(p.slides))
      .map(async (p) => {
        const screenshots: Array<{ slideId: string; dataUrl: string }> = []
        const variantScreenshots: Array<{ slideId: string; lang: string; dataUrl: string }> = []

        const slides: SlideConfig[] = await Promise.all(
          p.slides.map(async ({ image, imageVariants, ...rest }) => {
            if (image) {
              const imgFile = zip.file(image)
              if (imgFile) {
                const base64 = await imgFile.async('base64')
                screenshots.push({ slideId: rest.id, dataUrl: `data:image/png;base64,${base64}` })
              }
            }

            if (imageVariants) {
              for (const [lang, path] of Object.entries(imageVariants)) {
                const imgFile = zip.file(path)
                if (imgFile) {
                  const base64 = await imgFile.async('base64')
                  variantScreenshots.push({ slideId: rest.id, lang, dataUrl: `data:image/png;base64,${base64}` })
                }
              }
            }

            return rest as SlideConfig
          })
        )

        const meta: ProjectMeta = {
          id: p.id,
          name: p.name,
          createdAt: p.createdAt ?? Date.now(),
          slides,
          activeSlideId: p.activeSlideId || slides[0]?.id || '',
          languages: p.languages,
          protectedWords: p.protectedWords,
        }

        return { meta, screenshots, variantScreenshots }
      })
  )
}
