import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildSubmission, submittedTeams } from '../src/lib/results'
import type { Session } from '../src/lib/session'

// Name Picker plays solo: one "team" per student. Only students given points are saved.
const solo: Session = {
  id: 'np', createdAt: 0, updatedAt: 0, status: 'review', class: 'M.2/1', game: 'name-picker', level: 'M.2', mode: 'solo',
  size: 1, bins: [], absent: [], teacher: false, leaveOut: false,
  teams: [1, 2, 3, 4].map((n) => ({ id: 's' + n, name: 'S' + n, members: [{ no: n, nick: 'S' + n }] })),
  teacherTeam: null,
  log: [], scores: null, notes: '',
}

describe('games that only save students with points ("results": "scored")', () => {
  it('leaves out students with 0 points, ranks the rest', () => {
    const sub = buildSubmission(solo, { s2: 2, s3: 1, s4: 0 }, '', 'Name Picker', new Date(2026, 10, 4, 9, 0), { onlyScored: true })
    expect(sub.rows.map((r) => [r.Nickname, r.Points, r.Rank])).toEqual([
      ['S2', 2, 1],
      ['S3', 1, 2],
    ])
    expect(sub.session.TeamCount).toBe(2)
  })
  it('keeps a negative score (it is not 0)', () => {
    expect(submittedTeams(solo, { s1: -1 }, true).map((t) => t.id)).toEqual(['s1'])
  })
  it('nothing to save when nobody got points', () => {
    expect(buildSubmission(solo, {}, '', 'Name Picker', new Date(), { onlyScored: true }).rows).toEqual([])
  })
  it('other games still save every student', () => {
    expect(buildSubmission(solo, { s2: 2 }, '', 'Scoreboard').rows).toHaveLength(4)
  })
})

describe('Sentence Scramble sentences match HANDOFF word counts', () => {
  const read = (p: string) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'))
  const c = read('public/games/sentence-scramble/content.json') as Record<string, { sentences: { text: string }[] }>
  const range: Record<string, [number, number]> = { 'M.1': [5, 7], 'M.2': [8, 10], 'M.3': [11, 14] }
  for (const [level, [min, max]] of Object.entries(range)) {
    it(`${level}: ${min}-${max} words, at least 50 sentences, no repeats, each ends with . or ?`, () => {
      const list = c[level].sentences
      expect(list.length).toBeGreaterThanOrEqual(50)
      expect(new Set(list.map((s) => s.text)).size).toBe(list.length)
      for (const s of list) {
        const n = s.text.trim().split(/\s+/).length
        expect(n, s.text).toBeGreaterThanOrEqual(min)
        expect(n, s.text).toBeLessThanOrEqual(max)
        expect(s.text, s.text).toMatch(/[.?]$/)
      }
    })
  }
})

describe('Board Race tasks', () => {
  const c = JSON.parse(readFileSync(new URL('../public/games/board-race/content.json', import.meta.url), 'utf8')) as Record<
    string,
    { tasks: { kind: string; title: string; prompt: string; items?: string[]; answers?: string[]; examples?: string }[] }
  >
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: every forms task has one answer per item; every list task has examples`, () => {
      expect(c[level].tasks.length).toBeGreaterThanOrEqual(10)
      for (const t of c[level].tasks) {
        expect(t.title && t.prompt).toBeTruthy()
        if (t.kind === 'forms') expect(t.answers?.length, t.title).toBe(t.items?.length)
        else {
          expect(t.kind).toBe('list')
          expect(t.examples, t.title).toBeTruthy()
        }
      }
    })
  }
})

describe('Hot Seat Vocab words', () => {
  const c = JSON.parse(readFileSync(new URL('../public/games/hot-seat-vocab/content.json', import.meta.url), 'utf8')) as Record<
    string,
    { words: { word: string; cat?: string }[]; categories?: string[] }
  >
  for (const level of ['M.1', 'M.2', 'M.3']) {
    it(`${level}: at least 40 words, no repeats`, () => {
      const words = c[level].words.map((w) => w.word.toLowerCase())
      expect(words.length).toBeGreaterThanOrEqual(40)
      expect(new Set(words).size).toBe(words.length)
    })
  }
  it('M.3 words are all Person / Place / Thing / Idea, with at least 10 of each', () => {
    const cats = c['M.3'].categories!
    expect(cats).toEqual(['Person', 'Place', 'Thing', 'Idea'])
    for (const w of c['M.3'].words) expect(cats, w.word).toContain(w.cat)
    for (const cat of cats) expect(c['M.3'].words.filter((w) => w.cat === cat).length).toBeGreaterThanOrEqual(10)
  })
})

describe('Quiz Battle questions', () => {
  it('normalizeQuestions keeps only well-formed Sheet questions', async () => {
    const { normalizeQuestions } = await import('../src/lib/bootstrap')
    expect(normalizeQuestions(undefined)).toEqual([])
    const sets = normalizeQuestions([
      { level: 'M.2', name: 'Unit 3', questions: [
        { q: 'ok mc', choices: ['a', 'b'], answer: 1, double: true },
        { q: 'bad index', choices: ['a', 'b'], answer: 5 },
        { q: 'ok short', answer: 'went' },
        { q: '', answer: 'x' },
      ] },
      { level: 'M.9', name: 'bad level', questions: [{ q: 'x', answer: 'y' }] },
      { level: 'M.1', name: 'empty', questions: [] },
    ])
    expect(sets).toEqual([{ level: 'M.2', name: 'Unit 3', questions: [
      { q: 'ok mc', choices: ['a', 'b'], answer: 1, double: true },
      { q: 'ok short', answer: 'went', double: false },
    ] }])
  })
  it('built-in sets: every level has sets of 8+ questions with valid answers', () => {
    const c = JSON.parse(readFileSync(new URL('../public/games/quiz-battle/content.json', import.meta.url), 'utf8')) as Record<
      string,
      { sets: { name: string; questions: { q: string; choices?: string[]; answer: number | string; double: boolean }[] }[] }
    >
    for (const level of ['M.1', 'M.2', 'M.3']) {
      expect(c[level].sets.length).toBeGreaterThanOrEqual(2)
      for (const s of c[level].sets) {
        expect(s.questions.length, s.name).toBeGreaterThanOrEqual(8)
        for (const q of s.questions) {
          if (q.choices) {
            expect(typeof q.answer, q.q).toBe('number')
            expect(q.answer as number, q.q).toBeLessThan(q.choices.length)
            expect(new Set(q.choices).size, q.q).toBe(q.choices.length)
          } else expect(String(q.answer).length, q.q).toBeGreaterThan(0)
        }
      }
    }
  })
})
