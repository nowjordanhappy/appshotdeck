import type { Slide } from '../types'

// The slide whose device continues into slides[index], if any. A slide that is itself
// receiving a span can't start another one, so chains are ignored rather than rendered.
export function spanSource<T extends Slide>(slides: T[], index: number): T | undefined {
  const prev = slides[index - 1]
  if (!prev?.spanNext || prev.format !== slides[index].format) return undefined
  if (spanSource(slides, index - 1)) return undefined
  return prev
}

// After an add/delete/reorder, a span survives only if it still continues into the same slide.
// Otherwise spanNext is cleared, so a span never silently moves to (or later revives on)
// whichever slide happens to land next.
export function keepSpanPartners<T extends Slide>(before: T[], after: T[]): T[] {
  const partner = new Map(before.map((sl, i) => [sl.id, spansNext(before, i) ? before[i + 1].id : null]))
  return after.map((sl, i) =>
    sl.spanNext && (!spansNext(after, i) || after[i + 1].id !== partner.get(sl.id))
      ? { ...sl, spanNext: false }
      : sl
  )
}

// Whether slides[index] actually spans into the next slide (the next slide is a valid receiver).
export function spansNext(slides: Slide[], index: number): boolean {
  return index + 1 < slides.length && spanSource(slides, index + 1) === slides[index]
}
