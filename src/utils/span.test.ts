import { describe, expect, it } from 'vitest'
import type { Slide, SlideFormat } from '../types'
import { keepSpanPartners, reorderWithPairs, spanSource, spansNext } from './span'
import { deviceLayout } from './layout'
import { clearLegacyPlaceholders } from './project'

// Only the fields these helpers read; the rest of Slide is irrelevant here
function slide(id: string, extra: Partial<Slide> = {}): Slide {
  return {
    id, format: 'phone', frame: 'android-flat', deviceScale: 100, deviceOffset: 30,
    headline: '', subtitle: '', ...extra,
  } as Slide
}

// "A→ B C" = A spans into B, C on its own
const ids = (slides: Slide[]) => slides.map((s) => s.id + (s.spanNext ? '→' : '')).join(' ')
const deck = (spec: string) =>
  spec.split(' ').map((t) => slide(t.replace('→', ''), { spanNext: t.endsWith('→') }))

describe('pairing', () => {
  it('pairs a spanning slide with the next one', () => {
    const s = deck('A→ B C')
    expect(spanSource(s, 1)?.id).toBe('A')
    expect(spansNext(s, 0)).toBe(true)
    expect(spanSource(s, 2)).toBeUndefined()
  })

  it('ignores a span into a different format', () => {
    const s = [slide('A', { spanNext: true }), slide('B', { format: 'tablet-10' })]
    expect(spansNext(s, 0)).toBe(false)
    expect(spanSource(s, 1)).toBeUndefined()
  })

  it('ignores chains: a receiving slide cannot span again', () => {
    const s = deck('A→ B→ C')
    expect(spanSource(s, 1)?.id).toBe('A')
    expect(spansNext(s, 1)).toBe(false)
    expect(spanSource(s, 2)).toBeUndefined()
  })

  it('does not span from the last slide', () => {
    expect(spansNext(deck('A B→'), 1)).toBe(false)
  })
})

describe('keepSpanPartners', () => {
  it('clears the span when the partner is deleted instead of moving it to the next slide', () => {
    const before = deck('A→ B C')
    expect(ids(keepSpanPartners(before, before.filter((s) => s.id !== 'B')))).toBe('A C')
  })

  it('does not revive a stale flag when a slide is added after it', () => {
    const before = deck('A→')
    expect(ids(keepSpanPartners(before, [...before, slide('N')]))).toBe('A N')
  })

  it('keeps a pair whose partner did not change', () => {
    const before = deck('A→ B C')
    expect(ids(keepSpanPartners(before, before.filter((s) => s.id !== 'C')))).toBe('A→ B')
  })
})

describe('reorderWithPairs', () => {
  // A→B and D→E are pairs, C is single
  const cases: Array<[string, number, number, string]> = [
    ['drag A to the end', 0, 4, 'C D→ E A→ B'],
    ['drag B (receiver) to the end', 1, 4, 'C D→ E A→ B'],
    ['drag A onto C', 0, 2, 'C A→ B D→ E'],
    ['drag C to the start', 2, 0, 'C A→ B D→ E'],
    ['drop C between A and B', 2, 1, 'C A→ B D→ E'],
    ['drop C between D and E', 2, 4, 'A→ B D→ E C'],
    ['drag E to the start', 4, 0, 'D→ E A→ B C'],
  ]
  it.each(cases)('%s', (_, from, to, want) => {
    expect(ids(reorderWithPairs(deck('A→ B C D→ E'), from, to))).toBe(want)
  })

  it('returns the same array when dropped on its own pair', () => {
    const s = deck('A→ B C')
    expect(reorderWithPairs(s, 0, 1)).toBe(s)
  })

  it('clears a span when a single slide is moved away from its partner', () => {
    expect(ids(reorderWithPairs(deck('A→ B C'), 2, 0))).toBe('C A→ B')
    expect(ids(reorderWithPairs(deck('A B C'), 1, 2))).toBe('A C B')
  })
})

describe('deviceLayout', () => {
  it('keeps the non-span layout unchanged', () => {
    const l = deviceLayout(slide('A'))
    // phone: slot 780×1686 centered, Pos 30% of H below center
    expect([l.slotX, l.slotY, l.dSlotW, l.dSlotH]).toEqual([150, 117 + 576, 780, 1686])
  })

  it.each<SlideFormat>(['phone', 'tablet-10', 'iphone-69'])('lines up both halves at the seam (%s)', (format) => {
    const a = slide('A', { format, spanNext: true, spanX: 115, deviceRotate: -20, deviceScale: 90 })
    const b = slide('B', { format })
    const left = deviceLayout(a, undefined, true)
    const right = deviceLayout(b, a)
    expect(right.slotX).toBe(left.slotX - left.W)
    expect(right.slotY).toBe(left.slotY)
    expect([right.dSlotW, right.dSlotH, right.rotate]).toEqual([left.dSlotW, left.dSlotH, left.rotate])
  })

  it('moves a spanning tablet device vertically with Pos', () => {
    const a = slide('A', { format: 'tablet-10', frame: 'tablet-flat', spanNext: true, deviceOffset: 20 })
    const centered = deviceLayout({ ...a, deviceOffset: 0 }, undefined, true)
    const moved = deviceLayout(a, undefined, true)
    expect(moved.slotX).toBe(centered.slotX)
    expect(moved.slotY - centered.slotY).toBe(Math.round(1440 * 0.2))
  })
})

describe('clearLegacyPlaceholders', () => {
  it('clears the old default English copy', () => {
    const s = clearLegacyPlaceholders(slide('A', { headline: 'Your App Headline', subtitle: 'Short supporting description' }))
    expect([s.headline, s.subtitle]).toEqual(['', ''])
  })

  it('checks each field on its own', () => {
    const s = clearLegacyPlaceholders(slide('A', { headline: 'Share the Word', subtitle: 'Short supporting description' }))
    expect([s.headline, s.subtitle]).toEqual(['Share the Word', ''])
  })

  it('leaves real text untouched', () => {
    const s = slide('A', { headline: 'Your App Headline!', subtitle: 'A card for WhatsApp' })
    expect(clearLegacyPlaceholders(s)).toBe(s)
  })
})
