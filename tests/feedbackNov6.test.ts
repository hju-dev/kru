import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import games from '../games.json'

// Henry's feedback after playing (Quiz Battle, podium, One-Word Story).
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const json = (p: string) => JSON.parse(read(p))
type Q = { q: string; choices?: string[]; answer: number | string }

describe('Quiz Battle', () => {
  const c = json('public/games/quiz-battle/content.json')
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: the right answer is spread over A, B, C and D (not nearly always B)`, () => {
      const counts = [0, 0, 0, 0]
      for (const s of c[level].sets) for (const q of s.questions as Q[]) if (q.choices) counts[q.answer as number]++
      const total = counts.reduce((a, b) => a + b, 0)
      for (const n of counts) expect(n / total).toBeGreaterThanOrEqual(0.2)
    })
  }
  it('starts with a 10-second timer', () => {
    expect(read('public/games/quiz-battle/app.js')).toContain('secs: 10,')
  })
  it('the end of a set opens the podium (Keep playing = another set)', () => {
    expect(read('public/games/quiz-battle/app.js')).toContain('KruEnd.show({ keepPlaying: openSets })')
  })
  it('"Spelling counts" only comes up before a short-answer question', () => {
    const spelling = c.bonus.before.find((b: { id: string }) => b.id === 'spelling')
    expect(spelling.only).toEqual(['short'])
    const win: Record<string, { draw: (...a: unknown[]) => { before: { id: string } | null } }> = {}
    runInNewContext(read('public/games/shared/kru-bonus.js'), { window: win, document: {}, setTimeout })
    const draw = win.KruBonus.draw
    const cards = { before: [spelling] }
    expect(draw(cards, null, 'k', () => 0, ['choice']).before).toBeNull()
    expect(draw(cards, null, 'k', () => 0, ['short']).before).toMatchObject({ id: 'spelling' })
  })
})

describe('no "Steal" bonus or rule in any game', () => {
  for (const g of games.filter((x) => x.status === 'ready')) {
    it(g.slug, () => {
      let text: string
      try { text = read(`public/games/${g.slug}/content.json`) } catch { return }
      const c = JSON.parse(text)
      const cards = [...(c.bonus?.before ?? []), ...(c.bonus?.secret ?? [])]
      expect(cards.map((b: { id: string }) => b.id)).not.toContain('steal')
      expect(text).not.toMatch(/Steal = /)
    })
  }
})

describe('podium first, then the scores are sent (every scored game)', () => {
  it('Kru → Finish asks the game first; the game says "wait" while the podium shows', () => {
    const sdk = read('public/sdk/kru.js')
    expect(sdk).toContain("post({ type: 'kru:finish-wait' }); beforeFinish();")
    expect(read('src/routes/Play.tsx')).toContain("case 'kru:finish-wait':")
    expect(read('public/games/shared/kru-end.js')).toContain('Kru.beforeFinish(function () { window.KruEnd.show(); })')
  })
  it('a 🏆 button in the top bar, and Save scores & finish right on the podium', () => {
    const end = read('public/games/shared/kru-end.js')
    expect(end).toContain("t.textContent = '🏆'")
    expect(end).toContain('data-k="save">Save scores &amp; finish ✓')
  })
  it('games with a natural end open the podium themselves', () => {
    for (const slug of ['quiz-battle', 'quiz-board', 'race-board', 'think-tank-showdown', 'word-rush']) {
      expect(read(`public/games/${slug}/app.js`), slug).toMatch(/KruEnd\.show\(/)
    }
  })
  it('Kru waits (no 2-second timeout) when the game is showing its podium', () => {
    // the end screen in a mock window: Finish from Kru → podium, not straight to the scores
    const posted: unknown[] = []
    const listeners: ((e: { data: unknown; origin: string; source: unknown }) => void)[] = []
    const parent = { postMessage: (m: unknown) => posted.push(m) }
    const win: Record<string, unknown> = {
      parent, location: { search: '', origin: 'https://kru.test', pathname: '/games/x/' },
      addEventListener: (_t: string, fn: (e: { data: unknown; origin: string; source: unknown }) => void) => listeners.push(fn),
    }
    win.window = win
    runInNewContext(read('public/sdk/kru.js'), { window: win, location: win.location, sessionStorage: { getItem: () => null }, setTimeout, URLSearchParams })
    const Kru = win.Kru as { beforeFinish: (f: () => void) => void; onFinishRequest: (f: () => void) => void }
    let podium = 0, finished = 0
    Kru.onFinishRequest(() => finished++)
    Kru.beforeFinish(() => podium++)
    listeners.forEach((fn) => fn({ data: { type: 'kru:finish-request' }, origin: 'https://kru.test', source: parent }))
    expect([podium, finished]).toEqual([1, 0])
    expect(posted).toContainEqual({ type: 'kru:finish-wait' })
  })
})

describe('One-Word Story', () => {
  it('"Full stop!" (not "Period!") and a 3-second beat', () => {
    const html = read('public/games/one-word-story/index.html')
    const js = read('public/games/one-word-story/app.js')
    expect(html).toContain('>Full stop!</button>')
    expect(html + js + read('public/games/one-word-story/content.json')).not.toMatch(/Period!/)
    expect(js).toContain('beat: 3,')
  })
})

describe('Race Board gets Henry’s Questions-tab sets', () => {
  it('is marked for them in games.json (the app only sends them to marked games)', () => {
    expect(games.find((g) => g.slug === 'race-board')).toMatchObject({ sheetQuestions: true })
  })
})
