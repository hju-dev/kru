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

describe('How to play slides', () => {
  type Slide = { title?: string; text?: string | string[]; example?: Record<string, unknown> }
  for (const g of ready) {
    const html = read(`public/games/${g.slug}/index.html`)
    if (!html.includes('/games/shared/kru-intro.js') || g.slug === 'talk-timer') continue // Talk Timer: rules per timer, tested below
    it(`${g.slug}: has slides (2-6, each with a short title and at most 2 short lines)`, () => {
      expect(html).toContain('/games/shared/kru-intro.css')
      const c = JSON.parse(read(`public/games/${g.slug}/content.json`)) as Record<string, unknown> & { intro?: Slide[] }
      const decks: Slide[][] = [c.intro, ...['M.1', 'M.2', 'M.3'].map((l) => (c[l] as { intro?: Slide[] } | undefined)?.intro)].filter(Boolean) as Slide[][]
      expect(decks.length).toBeGreaterThan(0)
      for (const deck of decks) {
        expect(deck.length).toBeGreaterThanOrEqual(2)
        expect(deck.length).toBeLessThanOrEqual(6)
        for (const s of deck) {
          expect(s.title, JSON.stringify(s)).toBeTruthy()
          expect(s.title!.length, s.title).toBeLessThanOrEqual(30)
          const lines = Array.isArray(s.text) ? s.text : s.text ? [s.text] : []
          expect(lines.length, s.title).toBeLessThanOrEqual(2) // not a wall of text
          for (const l of lines) expect(l.length, l).toBeLessThanOrEqual(90)
        }
      }
    })
  }
})

describe('every student game has How to play slides', () => {
  const tools = ['name-picker', 'scoreboard', 'talk-timer'] // teacher tools: no rules for students
  for (const g of ready.filter((x) => !tools.includes(x.slug))) {
    it(g.slug, () => expect(read(`public/games/${g.slug}/index.html`)).toContain('/games/shared/kru-intro.js'))
  }
})

describe('library sections', () => {
  it('every game is in a known section; sections A-Z with Tools last; games A-Z inside', async () => {
    const { SECTIONS, librarySections } = await import('../src/lib/games')
    const ids = SECTIONS.map((s) => s.id)
    for (const g of games) expect(ids, g.slug).toContain((g as { section?: string }).section)
    const titles = SECTIONS.map((s) => s.title)
    expect(titles[titles.length - 1]).toBe('Tools')
    expect(titles.slice(0, -1)).toEqual([...titles.slice(0, -1)].sort())
    for (const s of librarySections()) {
      const t = s.games.map((g) => g.title)
      expect(t).toEqual([...t].sort((a, b) => a.localeCompare(b, 'en')))
    }
  })
})

describe('bonus cards', () => {
  const withBonus = ['board-race', 'hot-seat-vocab', 'quiz-battle', 'sentence-scramble', 'tag-team', 'think-tank-showdown', 'word-rush']
  type Card = { id: string; name: string; text: string; points?: number }
  for (const slug of withBonus) {
    it(`${slug}: loads the shared bonus cards; cards are short, with unique ids and small points`, () => {
      const html = read(`public/games/${slug}/index.html`)
      expect(html).toContain('/games/shared/kru-bonus.js')
      expect(html).toContain('/games/shared/kru-bonus.css')
      const b = (JSON.parse(read(`public/games/${slug}/content.json`)) as { bonus?: { before?: Card[]; secret?: Card[] } }).bonus
      expect(b?.secret?.length, 'secret cards').toBeGreaterThanOrEqual(3)
      for (const kind of ['before', 'secret'] as const) {
        const list = b?.[kind] ?? []
        expect(new Set(list.map((c) => c.id)).size).toBe(list.length)
        for (const c of list) {
          expect(c.name.length, c.name).toBeLessThanOrEqual(24)
          expect(c.text.length, c.text).toBeLessThanOrEqual(70)
          if (c.points !== undefined) expect([1, 2, 3, 4, 5]).toContain(c.points)
        }
      }
    })
  }
  it('draw: about 1 in 3 rounds gets a before card, 1 in 4 a secret one, never the same card twice running', async () => {
    const { runInNewContext } = await import('node:vm')
    const win: Record<string, unknown> = {}
    runInNewContext(read('public/games/shared/kru-bonus.js'), { window: win, document: {}, setTimeout })
    const draw = (win.KruBonus as { draw: (c: object, p: unknown, k: string, r: () => number) => { before: Card | null; secret: Card | null } }).draw
    const cards = { before: [{ id: 'a', name: 'A', text: '' }, { id: 'b', name: 'B', text: '' }], secret: [{ id: 's', name: 'S', text: '' }] }
    expect(draw(cards, null, 'k', () => 0.9)).toMatchObject({ before: null, secret: null })
    const both = draw(cards, null, 'k', () => 0.1)
    expect(both.before).not.toBeNull()
    expect(both.secret?.id).toBe('s')
    const next = draw(cards, both, 'k2', () => 0.1)
    expect(next.before?.id).not.toBe(both.before?.id)
    let n = 0
    for (let i = 0; i < 3000; i++) if (draw(cards, null, String(i), Math.random).before) n++
    expect(n / 3000).toBeGreaterThan(0.28)
    expect(n / 3000).toBeLessThan(0.39)
  })
})

describe('Talk Timer rules', () => {
  type Slide = { title?: string; text?: string | string[] }
  const c = JSON.parse(read('public/games/talk-timer/content.json')) as { presets: { id: string; name: string; rules?: Slide[] }[] }
  it('every starting timer has 2-6 short rules slides', () => {
    for (const p of c.presets) {
      expect(p.rules?.length, p.id).toBeGreaterThanOrEqual(2)
      expect(p.rules!.length, p.id).toBeLessThanOrEqual(6)
      for (const s of p.rules!) {
        expect(s.title!.length, s.title).toBeLessThanOrEqual(30)
        const lines = Array.isArray(s.text) ? s.text : [s.text ?? '']
        expect(lines.length, s.title).toBeLessThanOrEqual(2)
        for (const l of lines) expect(l.length, l).toBeLessThanOrEqual(90)
      }
    }
  })
})
