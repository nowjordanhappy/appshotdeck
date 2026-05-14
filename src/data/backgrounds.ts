import type { Background } from '../types'

export interface BackgroundPreset {
  label: string
  bg: Background
}

export const GRADIENT_PRESETS: BackgroundPreset[] = [
  { label: 'Midnight Slate',  bg: { type: 'gradient', from: '#0F172A', to: '#1E3A5F', angle: 135 } },
  { label: 'Deep Purple',     bg: { type: 'gradient', from: '#1A1035', to: '#2D1B69', angle: 135 } },
  { label: 'Warm Dark',       bg: { type: 'gradient', from: '#1C1008', to: '#3B1F00', angle: 135 } },
  { label: 'Orange Glow',     bg: { type: 'gradient', from: '#7C2D12', to: '#1C0A00', angle: 150 } },
  { label: 'Charcoal Blue',   bg: { type: 'gradient', from: '#111827', to: '#1E293B', angle: 135 } },
  { label: 'Violet Dusk',     bg: { type: 'gradient', from: '#4C1D95', to: '#1E1B4B', angle: 135 } },
]

export const LIGHT_GRADIENT_PRESETS: BackgroundPreset[] = [
  { label: 'Sky',         bg: { type: 'gradient', from: '#E0F2FE', to: '#BFDBFE', angle: 135 } },
  { label: 'Mint',        bg: { type: 'gradient', from: '#D1FAE5', to: '#A7F3D0', angle: 135 } },
  { label: 'Peach',       bg: { type: 'gradient', from: '#FEF3C7', to: '#FECACA', angle: 135 } },
  { label: 'Lavender',    bg: { type: 'gradient', from: '#EDE9FE', to: '#E0E7FF', angle: 135 } },
  { label: 'Rose Mist',   bg: { type: 'gradient', from: '#FFE4E6', to: '#FBCFE8', angle: 135 } },
  { label: 'Warm Cream',  bg: { type: 'gradient', from: '#FFFBEB', to: '#FEF9C3', angle: 135 } },
]

export const SOLID_PRESETS: BackgroundPreset[] = [
  { label: 'Slate 950',   bg: { type: 'solid', color: '#020617' } },
  { label: 'Zinc 900',    bg: { type: 'solid', color: '#18181b' } },
  { label: 'Deep Navy',   bg: { type: 'solid', color: '#0a0f1e' } },
  { label: 'Black',       bg: { type: 'solid', color: '#000000' } },
  { label: 'White',       bg: { type: 'solid', color: '#ffffff' } },
  { label: 'Light Gray',  bg: { type: 'solid', color: '#f1f5f9' } },
  { label: 'Warm White',  bg: { type: 'solid', color: '#fffbf0' } },
  { label: 'Off White',   bg: { type: 'solid', color: '#fafaf9' } },
  { label: 'Warm Gray',   bg: { type: 'solid', color: '#44403c' } },
]

export const ALL_PRESETS = [...GRADIENT_PRESETS, ...LIGHT_GRADIENT_PRESETS, ...SOLID_PRESETS]
