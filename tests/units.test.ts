import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import games from '../games.json'
import { initMessage, type Session } from '../src/lib/session'
import { UNITS, unitsFor } from '../src/lib/units'

// Units: game content made from Henry's Gamma lessons (public/units/<id>.json), picked on the setup screen.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
type Q = { q: string; choices?: string[]; answer: number | string; double?: boolean }
type Unit = { id: string; level: string; title: string; sets: { name: string; questions: Q[] }[]; words?: { word: string }[]; motions?: string[] }
const files = readdirSync(new URL('../public/units/', import.meta.url)).filter((f) => f !== 'index.json' && f.endsWith('.json'))

describe('units', () => {
  it('every unit file is in the index, and every index entry has a file', () => {
    expect(UNITS.map((u) => `${u.id}.json`).sort()).toEqual([...files].sort())
  })
  for (const f of files) {
    const u = JSON.parse(read(`public/units/${f}`)) as Unit
    describe(u.title, () => {
      it('has an id that matches its file and a known level', () => {
        expect(`${u.id}.json`).toBe(f)
        expect(['M.1', 'M.2', 'M.3']).toContain(u.level)
        expect(unitsFor(u.level as 'M.1').map((x) => x.id)).toContain(u.id)
      })
      it('every question has an answer (A-D index in range, or a short answer)', () => {
        for (const s of u.sets) for (const q of s.questions) {
          expect(q.q, s.name).toBeTruthy()
          if (q.choices) expect(q.choices[q.answer as number], q.q).toBeTruthy()
          else expect(String(q.answer).length, q.q).toBeGreaterThan(0)
        }
      })
      it('enough for a full Quiz Board (5 topics with 5+ questions)', () => {
        expect(u.sets.filter((s) => s.questions.length >= 5).length).toBeGreaterThanOrEqual(5)
      })
      it('right answers are spread over the choices (not nearly always one letter)', () => {
        const counts = [0, 0, 0, 0]
        for (const s of u.sets) for (const q of s.questions) if (q.choices?.length === 4) counts[q.answer as number]++
        const total = counts.reduce((a, b) => a + b, 0)
        for (const n of counts) expect(n / total).toBeGreaterThanOrEqual(0.15)
      })
      it('American spelling (Gamma decks can be British: organisation, practise, centre…)', () => {
        const british = /\b(\w+is(e|ed|ing|ation)s?\b(?<=(organis|realis|apologis|recognis|memoris|summaris|criticis|analys)\w+)|colou?r(?<=colour)|favour|behaviour|centre|practis(e|ed|ing)|judgement|cashpoint|adverts?)\b/i
        expect(read(`public/units/${f}`).match(british)?.[0]).toBeUndefined()
      })
      it('words for Hot Seat Vocab (10+) and motions for Tag-Team Debate, no repeats', () => {
        const words = (u.words ?? []).map((w) => w.word.toLowerCase())
        expect(words.length).toBeGreaterThanOrEqual(10)
        expect(new Set(words).size).toBe(words.length)
        expect(new Set(u.motions ?? []).size).toBe((u.motions ?? []).length)
      })
    })
  }
})

describe('picking a unit', () => {
  it('only games that use a unit offer the choice', () => {
    const withUnits = games.filter((g) => (g as { units?: boolean }).units).map((g) => g.slug).sort()
    expect(withUnits).toEqual(['hot-seat-vocab', 'quiz-battle', 'quiz-board', 'race-board', 'tag-team-debate'])
    for (const slug of withUnits) {
      const html = read(`public/games/${slug}/index.html`)
      expect(html, slug).toContain('/games/shared/kru-quiz.js')
    }
  })
  it('the chosen unit goes to the game with the session', () => {
    const s = { id: 'x', class: 'M.3/1', level: 'M.3', mode: 'group', teams: [], teacherTeam: null, unit: 'm3-english-u7' } as unknown as Session
    expect(initMessage(s).session).toMatchObject({ level: 'M.3', unit: 'm3-english-u7' })
    expect(initMessage({ ...s, unit: undefined }).session).toMatchObject({ unit: null })
  })
  it('the setup screen offers units for the class level only', () => {
    expect(unitsFor('M.3').map((u) => u.title)).toContain('Unit 7: Capital Punishment')
    expect(unitsFor('M.1').some((u) => u.id === 'm3-english-u7')).toBe(false)
  })
})
