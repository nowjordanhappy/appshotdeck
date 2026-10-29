import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { loadProject } from './project'

// 1×1 PNG
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

async function zipFile(config: unknown, images: Record<string, string> = {}): Promise<File> {
  const zip = new JSZip()
  zip.file('config.json', JSON.stringify(config))
  for (const [path, b64] of Object.entries(images)) zip.file(path, b64, { base64: true })
  return new File([await zip.generateAsync({ type: 'arraybuffer' })], 'project.zip')
}

// A slide as saved before span/rotation existed (PROJECT_VERSION 2)
const v2Slide = {
  id: 'a', format: 'phone', frame: 'android-3d', frameTilt: 18, deviceOffset: 30, deviceScale: 100,
  background: { type: 'solid', color: '#000' }, textColor: '#fff', subtitleColor: '#fff', textPosition: 'top',
  headline: 'Your App Headline', subtitle: 'Short supporting description', callouts: [],
  image: 'images/slide-1.png',
}

describe('loadProject', () => {
  it('loads a version 2 ZIP: screenshot restored, new fields absent, old default text cleared', async () => {
    const { slides, languages, protectedWords } = await loadProject(
      await zipFile({ version: 2, slides: [v2Slide] }, { 'images/slide-1.png': PNG }),
    )
    expect(slides).toHaveLength(1)
    expect(slides[0].screenshotDataUrl).toBe(`data:image/png;base64,${PNG}`)
    expect(slides[0].spanNext).toBeUndefined()
    expect(slides[0].deviceRotate).toBeUndefined()
    expect([slides[0].headline, slides[0].subtitle]).toEqual(['', ''])
    // Fields missing from old ZIPs fall back instead of throwing
    expect(languages).toEqual([])
    expect(protectedWords).toEqual([])
  })

  it('round-trips span fields, languages and per-language screenshots from a version 3 ZIP', async () => {
    const config = {
      version: 3, languages: ['es'], protectedWords: ['Verbum'],
      slides: [
        { ...v2Slide, headline: 'Share the Word', spanNext: true, spanX: 115, spanBackground: true, deviceRotate: -20,
          imageVariants: { es: 'images/slide-1-es.png' } },
        { ...v2Slide, id: 'b', image: null, headline: '' },
      ],
    }
    const { slides, languages, protectedWords } = await loadProject(
      await zipFile(config, { 'images/slide-1.png': PNG, 'images/slide-1-es.png': PNG }),
    )
    expect(slides[0]).toMatchObject({ headline: 'Share the Word', spanNext: true, spanX: 115, spanBackground: true, deviceRotate: -20 })
    expect(slides[0].screenshotVariants?.es).toBe(`data:image/png;base64,${PNG}`)
    expect(slides[1].screenshotDataUrl).toBeNull()
    expect(languages).toEqual(['es'])
    expect(protectedWords).toEqual(['Verbum'])
  })

  it('keeps fields it does not know (forward compatibility)', async () => {
    const { slides } = await loadProject(await zipFile({ version: 9, slides: [{ ...v2Slide, futureField: 42 }] }))
    expect((slides[0] as unknown as Record<string, unknown>).futureField).toBe(42)
  })

  it('rejects a ZIP without config.json', async () => {
    const zip = new JSZip()
    zip.file('other.txt', 'x')
    const file = new File([await zip.generateAsync({ type: 'arraybuffer' })], 'bad.zip')
    await expect(loadProject(file)).rejects.toThrow('missing config.json')
  })
})
