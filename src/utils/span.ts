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

// Move slides[from] to index `to`. A spanning pair moves as one block, whichever of its two
// slides is dragged, and nothing is ever dropped between another pair's two slides — it lands
// just past that pair. Returns the same array when nothing moves.
export function reorderWithPairs<T extends Slide>(slides: T[], from: number, to: number): T[] {
  const start = spansNext(slides, from) ? from : spanSource(slides, from) ? from - 1 : from
  const len = start === from && !spansNext(slides, from) ? 1 : 2
  if (to >= start && to < start + len) return slides
  const block = slides.slice(start, start + len)
  const rest = [...slides.slice(0, start), ...slides.slice(start + len)]
  const movingRight = to > start
  let pos = movingRight ? to - len + 1 : to
  if (pos > 0 && pos < rest.length && spansNext(rest, pos - 1)) pos += movingRight ? 1 : -1
  rest.splice(pos, 0, ...block)
  return keepSpanPartners(slides, rest)
}
