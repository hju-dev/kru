import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { unitsFor } from '../src/lib/units'

// Reported Speech set for Quiz Battle (Henry, Nov 17): M.3 English, a unit with its own sets.
const u = JSON.parse(readFileSync(new URL('../public/units/m3-english-reported-speech.json', import.meta.url), 'utf8')) as {
  sets: { name: string; questions: { q: string; choices?: string[]; answer: number | string }[] }[]
}

describe('Reported Speech unit', () => {
  it('shows for M.3 in Quiz Battle only, for every class', () => {
    expect(unitsFor('M.3', 'quiz-battle', 'M.3/1').map((x) => x.id)).toContain('m3-english-reported-speech')
    expect(unitsFor('M.3', 'quiz-board').map((x) => x.id)).not.toContain('m3-english-reported-speech')
    expect(unitsFor('M.2', 'quiz-battle').map((x) => x.id)).not.toContain('m3-english-reported-speech')
  })
  it('has direct to reported, reported to direct, tense and multiple-choice sets', () => {
    expect(u.sets.map((s) => s.name)).toEqual(['Direct → reported', 'Reported → direct', 'Tenses: backshift', 'Rules: multiple choice'])
    for (const s of u.sets) expect(s.questions.length, s.name).toBeGreaterThanOrEqual(8)
    expect(u.sets[3].questions.every((q) => q.choices?.length === 4)).toBe(true)
    expect(u.sets.slice(0, 3).every((s) => s.questions.every((q) => !q.choices && String(q.answer).length > 0))).toBe(true)
  })
  it('multiple-choice answers are valid and spread over A-D; American spelling', () => {
    const mc = u.sets[3].questions
    expect(new Set(mc.map((q) => q.answer)).size).toBe(4)
    for (const q of mc) expect(new Set(q.choices).size).toBe(4)
    expect(JSON.stringify(u)).not.toMatch(/colour|favourite|realise|organise/i)
  })
})
