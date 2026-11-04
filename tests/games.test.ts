import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import games from '../games.json'

const ready = games.filter((g) => g.status === 'ready')
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

describe('every playable game follows the Kru rules', () => {
  for (const g of ready) {
    describe(g.slug, () => {
      const file = `public/games/${g.slug}/index.html`
      it('lives at public/games/<slug>/index.html', () => {
        expect(g.file).toBe(file)
        expect(existsSync(new URL(`../${file}`, import.meta.url))).toBe(true)
      })
      it('is a full document that loads the SDK and the shared styles', () => {
        const html = read(file)
        expect(html).toMatch(/^<!doctype html>/i)
        expect(html).toContain('viewport-fit=cover')
        expect(html).toContain('<script src="/sdk/kru.js"></script>')
        expect(html).toContain('/games/shared/kru-game.css')
      })
      it('has no inline scripts, inline handlers or Google Fonts (blocked by the CSP)', () => {
        const html = read(file)
        expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i)
        expect(html).not.toMatch(/\son[a-z]+=/i)
        expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/)
      })
      it('keeps nothing in localStorage (the shell keeps state)', () => {
        const dir = `public/games/${g.slug}/`
        const js = existsSync(new URL(`../${dir}app.js`, import.meta.url)) ? read(`${dir}app.js`) : ''
        expect(js).not.toMatch(/localStorage/)
      })
    })
  }
})

describe('Talk Timer starting presets', () => {
  const c = JSON.parse(read('public/games/talk-timer/content.json')) as {
    start: string
    presets: { id: string; name: string; phases: { label: string; secs: number }[] }[]
  }
  it('are all valid and the start preset exists', () => {
    expect(c.presets.length).toBeGreaterThan(0)
    expect(new Set(c.presets.map((p) => p.id)).size).toBe(c.presets.length)
    expect(c.presets.some((p) => p.id === c.start)).toBe(true)
    for (const p of c.presets) {
      expect(p.name.length).toBeGreaterThan(0)
      expect(p.phases.length).toBeGreaterThan(0)
      for (const ph of p.phases) expect(ph.secs).toBeGreaterThan(0)
    }
  })
})
