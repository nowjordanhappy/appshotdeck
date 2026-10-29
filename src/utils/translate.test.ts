import { describe, expect, it } from 'vitest'
import { applyProtectedWords } from './translate'

// Simulates the translation service: changes the surrounding words, may change token casing
const fakeTranslate = (t: string) => t.replace('Share', 'Comparte').replace('with', 'con')

describe('applyProtectedWords', () => {
  it('hides protected words from the translator and puts them back', () => {
    const { processed, restore } = applyProtectedWords('Share Verbum with WhatsApp', ['Verbum', 'WhatsApp'])
    expect(processed).not.toMatch(/Verbum|WhatsApp/)
    expect(restore(fakeTranslate(processed))).toBe('Comparte Verbum con WhatsApp')
  })

  it('matches case-insensitively and restores the protected spelling', () => {
    const { processed, restore } = applyProtectedWords('open verbum daily', ['Verbum'])
    expect(restore(processed)).toBe('open Verbum daily')
  })

  it('restores tokens even if the translator changes their casing', () => {
    const { processed, restore } = applyProtectedWords('Verbum', ['Verbum'])
    expect(restore(processed.toLowerCase())).toBe('Verbum')
  })

  it('treats regex characters in protected words literally', () => {
    const { processed, restore } = applyProtectedWords('Built with C++ and Wi-Fi.', ['C++', 'Wi-Fi.'])
    expect(processed).not.toContain('C++')
    expect(restore(processed)).toBe('Built with C++ and Wi-Fi.')
  })

  it('ignores empty entries and passes text through when nothing is protected', () => {
    expect(applyProtectedWords('Hello', []).processed).toBe('Hello')
    const { processed, restore } = applyProtectedWords('Hello', ['', '  '])
    expect(restore(processed)).toBe('Hello')
  })
})
