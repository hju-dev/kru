import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { unitsFor } from '../src/lib/units'

// Trivia (Henry, Nov 25): 500 club questions, 5 sets of 100, for every level, in the four quiz games.
type Q = { q: string; choices: string[]; answer: number; tier: string; why: string }
const u = JSON.parse(readFileSync(new URL('../public/units/trivia.json', import.meta.url), 'utf8')) as { level: string; games: string[]; sets: { name: string; questions: Q[] }[] }

describe('Trivia pack', () => {
  it('has the five sets of 100, and shows for every level and for classes without one', () => {
    expect(u.sets.map((s) => s.name)).toEqual(['General Knowledge', 'Dictionary', 'History', 'Geography', 'Science & Nature'])
    for (const s of u.sets) expect(s.questions, s.name).toHaveLength(100)
    expect(u.level).toBe('any')
    for (const g of ['quiz-battle', 'race-board', 'quiz-island', 'fortress']) for (const lv of ['M.1', 'M.2', 'M.3'] as const) expect(unitsFor(lv, g, `${lv}/1`).map((x) => x.id), `${g} ${lv}`).toContain('trivia')
    expect(unitsFor(null, 'quiz-island').map((x) => x.id)).toContain('trivia')
    expect(unitsFor('M.2', 'hot-seat-vocab').map((x) => x.id)).not.toContain('trivia')
  })
  it('regular, hard and impossible only: 50 / 35 / 15 in every set; right answers spread A-D', () => {
    for (const s of u.sets) {
      const n = (t: string) => s.questions.filter((q) => q.tier === t).length
      expect([n('regular'), n('hard'), n('impossible'), n('easy')], s.name).toEqual([50, 35, 15, 0])
      for (let a = 0; a < 4; a++) expect(s.questions.filter((q) => q.answer === a).length, s.name).toBeGreaterThanOrEqual(20)
    }
  })
  it('every question has 4 different choices, an answer in range and a one-line why; no repeats; American spelling', () => {
    const seen = new Set<string>()
    for (const s of u.sets) for (const q of s.questions) {
      expect(new Set(q.choices.map((c) => c.toLowerCase())).size, q.q).toBe(4)
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.answer).toBeLessThan(4)
      expect(q.why.length, q.q).toBeGreaterThan(5)
      expect(q.q, 'a leftover note').not.toMatch(/\.\.\./)
      const k = `${q.q}|${q.choices[q.answer]}`.toLowerCase()
      expect(seen.has(k), k).toBe(false)
      seen.add(k)
    }
    expect(seen.size).toBe(500)
    expect(JSON.stringify(u)).not.toMatch(/colour|favourite|cinema|\bfilm\b|\bflavour|\bneighbour|\borganis|\brealis(e|ed|ing)\b/i)
  })
})

describe('games accept an any-level pack', () => {
  it('the shared unit loader skips the level check for level "any"', () => {
    expect(readFileSync(new URL('../public/games/shared/kru-quiz.js', import.meta.url), 'utf8')).toContain("u.level !== 'any'")
  })
})
