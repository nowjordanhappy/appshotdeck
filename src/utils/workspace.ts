import JSZip from 'jszip'
import type { ProjectMeta, Slide, SlideConfig } from '../types'
import { getScreenshot } from './db'

const WORKSPACE_VERSION = 1

interface WorkspaceSlide extends SlideConfig {
  image: string | null
}

interface WorkspaceProject {
  id: string
  name: string
  createdAt: number
  slides: WorkspaceSlide[]
  activeSlideId: string
}

interface WorkspaceConfig {
  version: number
  projects: WorkspaceProject[]
}

export interface LoadedWorkspaceProject {
  meta: ProjectMeta
  screenshots: Array<{ slideId: string; dataUrl: string }>
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
        ? activeSlides.map(({ screenshotDataUrl: _, ...rest }) => rest)
        : project.slides

      const slidesWithImages = await Promise.all(
        slides.map(async (slide) => {
          const dataUrl = await getScreenshot(`${project.id}/${slide.id}`)
          let image: string | null = null
          if (dataUrl) {
            const base64 = dataUrl.split(',')[1]
            const path = `images/${project.id}/${slide.id}.png`
            zip.file(path, base64, { base64: true })
            image = path
          }
          return { ...slide, image }
        })
      )

      return {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        slides: slidesWithImages,
        activeSlideId: isActive ? activeSlideId : project.activeSlideId,
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

        const slides: SlideConfig[] = await Promise.all(
          p.slides.map(async ({ image, ...rest }) => {
            if (image) {
              const imgFile = zip.file(image)
              if (imgFile) {
                const base64 = await imgFile.async('base64')
                screenshots.push({ slideId: rest.id, dataUrl: `data:image/png;base64,${base64}` })
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
        }

        return { meta, screenshots }
      })
  )
}
