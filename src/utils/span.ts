import type { Slide } from '../types'

// The slide whose device continues into slides[index], if any. A slide that is itself
// receiving a span can't start another one, so chains are ignored rather than rendered.
export function spanSource<T extends Slide>(slides: T[], index: number): T | undefined {
  const prev = slides[index - 1]
  if (!prev?.spanNext || prev.format !== slides[index].format) return undefined
  if (spanSource(slides, index - 1)) return undefined
  return prev
}

// Whether slides[index] actually spans into the next slide (the next slide is a valid receiver).
export function spansNext(slides: Slide[], index: number): boolean {
  return index + 1 < slides.length && spanSource(slides, index + 1) === slides[index]
}
