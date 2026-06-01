import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EditorState, FrameId, ProjectMeta, Slide, SlideConfig, SlideFormat, TextVariant } from '../types'
import {
  saveScreenshot,
  getScreenshot,
  deleteScreenshot,
  copyScreenshot,
  deleteProjectScreenshots,
  saveScreenshotVariant,
  deleteScreenshotVariant,
  deleteSlideVariantScreenshots,
  getSlideVariants,
  copyScreenshotVariants,
} from '../utils/db'

export function defaultFrameForFormat(format: SlideFormat): FrameId {
  switch (format) {
    case 'phone':      return 'minimal'
    case 'tablet-7':
    case 'tablet-10':  return 'tablet-flat'
    case 'iphone-69':
    case 'iphone-65':  return 'ios-flat'
    case 'ipad-13':    return 'ios-ipad'
  }
}

const defaultSlide = (format: SlideFormat = 'phone'): Slide => ({
  id: crypto.randomUUID(),
  format,
  screenshotDataUrl: null,
  frame: defaultFrameForFormat(format),
  background: { type: 'gradient', from: '#0F172A', to: '#1E3A5F', angle: 135 },
  headline: 'Your App Headline',
  subtitle: 'Short supporting description',
  textColor: '#ffffff',
  subtitleColor: '#ffffff',
  frameTilt: 18,
  textPosition: 'top',
  deviceOffset: ['phone', 'iphone-69', 'iphone-65', 'ipad-13'].includes(format) ? 30 : 16,
  deviceScale: 100,
  showHeadline: true,
  showSubtitle: true,
  headlineFontFamily: 'Inter',
  headlineFontWeight: 700,
  headlineFontSize: 100,
  subtitleFontFamily: 'Inter',
  subtitleFontWeight: 400,
  subtitleFontSize: 100,
  textAlign: 'center',
  textShadow: 'off',
  callouts: [],
})

function toConfig({ screenshotDataUrl: _, screenshotVariants: __, ...rest }: Slide): SlideConfig {
  return rest
}

function makeInitialProject(): { project: ProjectMeta; slide: Slide } {
  const slide = defaultSlide('phone')
  const project: ProjectMeta = {
    id: crypto.randomUUID(),
    name: 'My Project',
    createdAt: Date.now(),
    slides: [toConfig(slide)],
    activeSlideId: slide.id,
  }
  return { project, slide }
}

const { project: _initProject, slide: _initSlide } = makeInitialProject()

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      projects: [_initProject],
      activeProjectId: _initProject.id,
      slides: [_initSlide],
      activeSlideId: _initSlide.id,
      languages: [] as string[],
      activeLanguage: 'en',
      protectedWords: [] as string[],

      addSlide: () =>
        set((s) => {
          const active = s.slides.find((sl) => sl.id === s.activeSlideId)
          const slide = defaultSlide(active?.format ?? 'phone')
          return { slides: [...s.slides, slide], activeSlideId: slide.id }
        }),

      duplicateSlide: (id) =>
        set((s) => {
          const src = s.slides.find((sl) => sl.id === id)
          if (!src) return s
          const copy = { ...src, id: crypto.randomUUID() }
          const idx = s.slides.findIndex((sl) => sl.id === id)
          const slides = [...s.slides]
          slides.splice(idx + 1, 0, copy)
          if (src.screenshotDataUrl) {
            copyScreenshot(`${s.activeProjectId}/${id}`, `${s.activeProjectId}/${copy.id}`)
          }
          if (s.languages.length > 0) {
            copyScreenshotVariants(s.activeProjectId, id, s.activeProjectId, copy.id, s.languages)
          }
          return { slides, activeSlideId: copy.id }
        }),

      removeSlide: (id) =>
        set((s) => {
          if (s.slides.length === 1) return s
          deleteScreenshot(`${s.activeProjectId}/${id}`)
          deleteSlideVariantScreenshots(s.activeProjectId, id)
          const slides = s.slides.filter((sl) => sl.id !== id)
          const activeSlideId = s.activeSlideId === id ? slides[0].id : s.activeSlideId
          return { slides, activeSlideId }
        }),

      setActiveSlide: (id) => set({ activeSlideId: id }),

      updateSlide: (id, patch) => {
        set((s) => ({
          slides: s.slides.map((sl) => (sl.id === id ? { ...sl, ...patch } : sl)),
        }))
        if ('screenshotDataUrl' in patch) {
          const { activeProjectId } = get()
          const key = `${activeProjectId}/${id}`
          if (patch.screenshotDataUrl) saveScreenshot(key, patch.screenshotDataUrl)
          else deleteScreenshot(key)
        }
      },

      reorderSlides: (from, to) =>
        set((s) => {
          const slides = [...s.slides]
          const [moved] = slides.splice(from, 1)
          slides.splice(to, 0, moved)
          return { slides }
        }),

      applyToAllSlides: (patch) =>
        set((s) => ({ slides: s.slides.map((sl) => ({ ...sl, ...patch })) })),

      setActiveLanguage: (lang) => set({ activeLanguage: lang }),

      setProtectedWords: (words) => set({ protectedWords: words }),

      updateSlideVariantScreenshot: async (slideId, lang, dataUrl) => {
        const { activeProjectId } = get()
        if (dataUrl) {
          await saveScreenshotVariant(activeProjectId, slideId, lang, dataUrl)
        } else {
          await deleteScreenshotVariant(activeProjectId, slideId, lang)
        }
        set((s) => ({
          slides: s.slides.map((sl) =>
            sl.id === slideId
              ? { ...sl, screenshotVariants: { ...(sl.screenshotVariants ?? {}), [lang]: dataUrl } }
              : sl
          ),
        }))
      },

      addLanguage: (code, variants) =>
        set((s) => ({
          languages: s.languages.includes(code) ? s.languages : [...s.languages, code],
          slides: s.slides.map((sl) => ({
            ...sl,
            textVariants: {
              ...(sl.textVariants ?? {}),
              [code]: variants[sl.id] ?? { headline: '', subtitle: '', status: 'empty' as const },
            },
          })),
        })),

      removeLanguage: (code) =>
        set((s) => ({
          languages: s.languages.filter((l) => l !== code),
          activeLanguage: s.activeLanguage === code ? 'en' : s.activeLanguage,
          slides: s.slides.map((sl) => {
            const variants = { ...(sl.textVariants ?? {}) }
            delete variants[code]
            return { ...sl, textVariants: variants }
          }),
        })),

      updateTextVariant: (slideId, lang, patch) =>
        set((s) => ({
          slides: s.slides.map((sl) =>
            sl.id === slideId
              ? {
                  ...sl,
                  textVariants: {
                    ...(sl.textVariants ?? {}),
                    [lang]: { ...(sl.textVariants?.[lang] ?? { headline: '', subtitle: '', status: 'empty' as const }), ...patch },
                  },
                }
              : sl
          ),
        })),

      markVariantsStale: (slideId, lang) =>
        set((s) => ({
          slides: s.slides.map((sl) =>
            sl.id === slideId && sl.textVariants?.[lang]?.status === 'ok'
              ? {
                  ...sl,
                  textVariants: {
                    ...sl.textVariants,
                    [lang]: { ...sl.textVariants[lang], status: 'stale' as TextVariant['status'] },
                  },
                }
              : sl
          ),
        })),

      createProject: (name) => {
        const { slides, activeProjectId, activeSlideId, projects, languages } = get()
        const newSlide = defaultSlide('phone')
        const newProject: ProjectMeta = {
          id: crypto.randomUUID(),
          name,
          createdAt: Date.now(),
          slides: [toConfig(newSlide)],
          activeSlideId: newSlide.id,
          languages: [],
        }
        set({
          projects: [
            ...projects.map((p) =>
              p.id === activeProjectId
                ? { ...p, slides: slides.map(toConfig), activeSlideId, languages }
                : p
            ),
            newProject,
          ],
          activeProjectId: newProject.id,
          slides: [{ ...newSlide }],
          activeSlideId: newSlide.id,
          languages: [],
          activeLanguage: 'en',
          protectedWords: [],
        })
      },

      renameProject: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)),
        })),

      deleteProject: async (id) => {
        const { projects, activeProjectId } = get()
        if (projects.length <= 1) return
        const remaining = projects.filter((p) => p.id !== id)
        deleteProjectScreenshots(id)
        if (id !== activeProjectId) {
          set({ projects: remaining })
          return
        }
        const next = remaining[0]
        const newSlides = await Promise.all(
          next.slides.map(async (config) => ({
            ...config,
            screenshotDataUrl: await getScreenshot(`${next.id}/${config.id}`),
          }))
        )
        set({
          projects: remaining,
          activeProjectId: next.id,
          slides: newSlides.length > 0 ? newSlides : [defaultSlide('phone')],
          activeSlideId: next.activeSlideId || newSlides[0]?.id || '',
        })
      },

      switchProject: async (id) => {
        const { slides, activeProjectId, activeSlideId, projects, languages, protectedWords } = get()
        if (id === activeProjectId) return
        const updatedProjects = projects.map((p) =>
          p.id === activeProjectId
            ? { ...p, slides: slides.map(toConfig), activeSlideId, languages, protectedWords }
            : p
        )
        const target = projects.find((p) => p.id === id)
        if (!target) return
        const targetLangs = target.languages ?? []
        const newSlides = await Promise.all(
          target.slides.map(async (config) => ({
            ...config,
            screenshotDataUrl: await getScreenshot(`${id}/${config.id}`),
            screenshotVariants: await getSlideVariants(id, config.id, targetLangs),
          }))
        )
        set({
          projects: updatedProjects,
          activeProjectId: id,
          slides: newSlides.length > 0 ? newSlides : [defaultSlide('phone')],
          activeSlideId: target.activeSlideId || newSlides[0]?.id || '',
          languages: targetLangs,
          activeLanguage: 'en',
          protectedWords: target.protectedWords ?? [],
        })
      },
    }),
    {
      name: 'appshotdeck-editor',
      partialize: (state) => ({
        _v: 2,
        projects: state.projects.map((p) =>
          p.id === state.activeProjectId
            ? { ...p, slides: state.slides.map(toConfig), activeSlideId: state.activeSlideId, languages: state.languages, protectedWords: state.protectedWords }
            : p
        ),
        activeProjectId: state.activeProjectId,
        activeSlideId: state.activeSlideId,
        activeLanguage: state.activeLanguage,
      }),
      onRehydrateStorage: () => async (state) => {
        if (!state) return

        // Migration from v1 (slides at top level, no projects)
        const raw = state as unknown as Record<string, unknown>
        const isOldFormat = !raw._v && Array.isArray(raw.slides)
        if (isOldFormat) {
          const oldSlides = raw.slides as Slide[]
          const projectId = _initProject.id
          for (const s of oldSlides) {
            if (s.screenshotDataUrl) {
              await saveScreenshot(`${projectId}/${s.id}`, s.screenshotDataUrl)
            }
          }
          useEditorStore.setState({
            projects: [{
              id: projectId,
              name: 'My Project',
              createdAt: Date.now(),
              slides: oldSlides.map(toConfig),
              activeSlideId: oldSlides[0]?.id ?? '',
            }],
            activeProjectId: projectId,
            slides: oldSlides.map((s) => ({ ...s, screenshotDataUrl: s.screenshotDataUrl ?? null })),
            activeSlideId: (raw.activeSlideId as string) || oldSlides[0]?.id || '',
          })
          return
        }

        if (!state.projects?.length) return
        const active = state.projects.find((p) => p.id === state.activeProjectId)
        if (!active?.slides.length) return

        const activeLangs = active.languages ?? []
        const slides = await Promise.all(
          active.slides.map(async (config) => ({
            ...config,
            screenshotDataUrl: await getScreenshot(`${state.activeProjectId}/${config.id}`),
            screenshotVariants: await getSlideVariants(state.activeProjectId, config.id, activeLangs),
          }))
        )
        const storedLang = (state as unknown as Record<string, unknown>).activeLanguage as string ?? 'en'
        const validatedLang = activeLangs.includes(storedLang) ? storedLang : 'en'
        useEditorStore.setState({
          slides,
          activeSlideId: state.activeSlideId || slides[0]?.id || '',
          languages: activeLangs,
          activeLanguage: validatedLang,
          protectedWords: active.protectedWords ?? [],
        })
      },
    }
  )
)
