import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const js = read('public/games/race-board/app.js')
const html = read('public/games/race-board/index.html')
const content = JSON.parse(read('public/games/race-board/content.json'))
type Q = { tier: string; cat: string; q: string; choices?: string[]; answer: number | string }

/** The face weights of a tier, read from app.js */
function weights(tier: string): number[] {
  const m = js.match(new RegExp(`${tier}: \\{[^}]*w: \\[([\\d, ]+)\\]`))
  if (!m) throw new Error('no weights for ' + tier)
  return m[1].split(',').map(Number)
}
function chanceOf(w: number[], dice: number, test: (sum: number) => boolean) {
  const t = w.reduce((a, b) => a + b, 0)
  const p = w.map((x) => x / t)
  let s = 0
  if (dice === 1) p.forEach((x, i) => { if (test(i + 1)) s += x })
  else p.forEach((a, i) => p.forEach((b, j) => { if (test(i + j + 2)) s += a * b }))
  return s
}

describe('Race Board dice (Henry, Nov 9)', () => {
  it('easy: 1 die, mostly 1-3', () => expect(chanceOf(weights('easy'), 1, (n) => n <= 3)).toBeGreaterThanOrEqual(0.7))
  it('regular: 1 fair die', () => expect(weights('regular')).toEqual([1, 1, 1, 1, 1, 1]))
  it('hard: 2 dice, 7 or more is more likely than with fair dice', () => {
    expect(js).toMatch(/hard: \{[^}]*dice: 2/)
    expect(chanceOf(weights('hard'), 2, (n) => n >= 7)).toBeGreaterThan(0.75)
  })
  it('impossible: 2 dice, most likely 9 or more', () => {
    expect(js).toMatch(/impossible: \{[^}]*dice: 2/)
    expect(chanceOf(weights('impossible'), 2, (n) => n >= 9)).toBeGreaterThan(0.65)
  })
  it('hard and impossible questions are rarer', () => {
    const share = (t: string) => Number(js.match(new RegExp(`${t}: \\{[^}]*share: (\\d+)`))![1])
    expect(share('hard')).toBeLessThan(share('regular'))
    expect(share('impossible')).toBeLessThan(share('hard'))
  })
  it('a wrong answer rolls the back die (an ordinary die) and moves back', () => {
    expect(js).toContain('var BACK_DIE = [1, 1, 1, 1, 1, 1];')
    expect(js).toContain("roll(t.id, 'back');")
    expect(js).toContain("if (kind === 'back') move(id, -sum,")
  })
})

describe('Race Board board and rules', () => {
  it('60 squares (double the old 30)', () => {
    expect(js).toContain('var COLS = 12, FINISH = 59;')
  })
  it('exact roll to finish: extra steps bounce back', () => {
    expect(js).toContain('if (dir > 0 && pos(id) >= FINISH) { dir = -1; bounced = true; }')
  })
  it('secret trap (skip a turn) and secret slide, only for the first team there', () => {
    expect(js).toContain('if (p === sec.trap && !sec.trapUsed)')
    expect(js).toContain('if (p === sec.slide && !sec.slideUsed)')
  })
  it("chance cards: Henry's list", () => {
    for (const id of ['back2', 'ahead3', 'ahead1', 'roll2', 'again', 'dbl', 'skip', 'mathsci', 'swap']) expect(js).toContain(`{ id: '${id}',`)
  })
  it('the question timer starts by itself; teams can be tapped to see who is on them', () => {
    expect(js).toContain('startTimer(); // Henry: the timer starts by itself')
    expect(html).toContain('id="teamBack"')
    expect(js).toContain('data-team=')
  })
})

describe('Race Board questions', () => {
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: 50+ questions in 4 tiers, hard and impossible rarer, 10+ math or science`, () => {
      const qs = content.questions[level] as Q[]
      expect(qs.length).toBeGreaterThanOrEqual(50)
      const n = (t: string) => qs.filter((q) => q.tier === t).length
      expect(n('easy')).toBeGreaterThan(0)
      expect(n('regular')).toBeGreaterThan(n('hard'))
      expect(n('hard')).toBeGreaterThan(n('impossible'))
      expect(n('impossible')).toBeGreaterThan(0)
      expect(qs.filter((q) => q.cat === 'math' || q.cat === 'science').length).toBeGreaterThanOrEqual(10)
      expect(new Set(qs.map((q) => q.q)).size).toBe(qs.length)
      for (const q of qs) {
        if (q.choices) {
          expect(q.choices, q.q).toHaveLength(4)
          expect(typeof q.answer === 'number' && q.choices[q.answer] != null, q.q).toBe(true)
        } else expect(String(q.answer).length, q.q).toBeGreaterThan(0)
      }
      const at = qs.filter((q) => q.choices).map((q) => q.answer as number)
      for (const i of [0, 1, 2, 3]) expect(at.filter((x) => x === i).length, `answer ${'ABCD'[i]}`).toBeGreaterThan(at.length / 6)
    })
  }
})
