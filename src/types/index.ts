export type SlideFormat =
  // Android / Play Store
  | 'phone'
  | 'tablet-7'
  | 'tablet-10'
  // iOS / App Store
  | 'iphone-69'
  | 'iphone-65'
  | 'ipad-13'

export type FrameId =
  | 'minimal'
  | 'android-flat'
  | 'android-3d'
  | 'tablet-flat'
  | 'ios-flat'
  | 'ios-3d'
  | 'ios-ipad'

export type Background =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; from: string; to: string; angle: number }

export type TextPosition = 'top' | 'bottom'
export type TextAlign = 'left' | 'center' | 'right'

export interface Slide {
  id: string
  format: SlideFormat
  screenshotDataUrl: string | null
  frame: FrameId
  background: Background
  headline: string
  subtitle: string
  textColor: string
  subtitleColor: string
  frameTilt: number
  textPosition: TextPosition
  deviceOffset: number
  deviceScale: number
  showHeadline: boolean
  showSubtitle: boolean
  headlineFontFamily: string
  headlineFontWeight: number
  headlineFontSize: number
  subtitleFontFamily: string
  subtitleFontWeight: number
  subtitleFontSize: number
  textAlign: TextAlign
  textShadow: 'off' | 'dark' | 'light'
}

export type SlideConfig = Omit<Slide, 'screenshotDataUrl'>

export interface ProjectMeta {
  id: string
  name: string
  createdAt: number
  slides: SlideConfig[]
  activeSlideId: string
}

export interface EditorState {
  projects: ProjectMeta[]
  activeProjectId: string
  slides: Slide[]
  activeSlideId: string
  addSlide: () => void
  duplicateSlide: (id: string) => void
  removeSlide: (id: string) => void
  setActiveSlide: (id: string) => void
  updateSlide: (id: string, patch: Partial<Slide>) => void
  reorderSlides: (fromIndex: number, toIndex: number) => void
  applyToAllSlides: (patch: Partial<SlideConfig>) => void
  createProject: (name: string) => void
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => void
  switchProject: (id: string) => Promise<void>
}
