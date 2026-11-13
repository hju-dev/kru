import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { classKey, unitsFor } from '../src/lib/units'

// Henry's Unit 8 lesson packs (M.3 Communication, Nov 13): quiz packs for Quiz Battle + Quiz Board,
// a Hot Seat Vocab pack with meanings and taboo words, and Sentence Scramble sentences. Only for M.3/2 and M.3/3.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const pack = (id: string) => JSON.parse(read(`public/units/${id}.json`))
type Q = { q: string; choices: string[]; answer: number; read_aloud: string }
const questions = (id: string) => (pack(id).sets as { questions: Q[] }[]).flatMap((s) => s.questions)

// Henry's correct options, 1-based, item by item
const KEY: Record<string, number[]> = {
  'm3-u8-l1': [3, 1, 2, 3, 1, 4, 2, 1, 4, 4],
  'm3-u8-l2': [2, 4, 1, 3, 1, 2, 4, 3, 1, 2],
  'm3-u8-review': [1, 3, 2, 4, 1, 3, 4, 2, 3, 1, 4, 2],
}
const SPREAD: Record<string, number[]> = { 'm3-u8-l1': [3, 2, 2, 3], 'm3-u8-l2': [3, 3, 2, 2], 'm3-u8-review': [3, 3, 3, 3] }

describe('Unit 8 quiz packs', () => {
  for (const id of Object.keys(KEY)) {
    it(`${id}: every question, Henry's answer, the option order kept, and a read-aloud sentence`, () => {
      const qs = questions(id)
      expect(qs.map((q) => q.answer + 1)).toEqual(KEY[id])
      const counts = [0, 0, 0, 0]
      for (const q of qs) {
        expect(q.choices, q.q).toHaveLength(4)
        expect(q.read_aloud.length, q.q).toBeGreaterThan(5)
        counts[q.answer]++
      }
      expect(counts).toEqual(SPREAD[id])
      expect(pack(id).games).toEqual(expect.arrayContaining(['quiz-battle', 'quiz-board']))
    })
  }
  it('spot checks: the right option is the one Henry marked', () => {
    const l1 = questions('m3-u8-l1')
    expect(l1[0].choices[l1[0].answer]).toBe('letting')
    expect(l1[1].choices[l1[1].answer]).toBe('I apologize for calling Ben that name.')
    expect(questions('m3-u8-l2')[5].choices[questions('m3-u8-l2')[5].answer]).toBe('were')
    const rev = questions('m3-u8-review')
    expect(rev[11].choices[rev[11].answer]).toBe('refused')
    expect(rev[6].read_aloud).toBe('Ellie said she would call me the next day.')
  })
})

describe('Unit 8 L3: Hot Seat Vocab', () => {
  const p = pack('m3-u8-l3-vocab')
  it('10 phrasal verbs, each with a meaning and taboo words', () => {
    expect(p.games).toEqual(['hot-seat-vocab'])
    expect(p.hotseat.map((h: { word: string }) => h.word)).toEqual(['ask out', 'break up', 'fall out', 'get on (with)', 'get over', 'get together', 'go out (with)', 'let down', 'make up', 'put up with'])
    for (const h of p.hotseat) {
      expect(h.meaning.length, h.word).toBeGreaterThan(5)
      expect(h.taboo.length, h.word).toBeGreaterThan(0)
    }
  })
  it('the game shows the taboo words in the round and the meanings after it', () => {
    const js = read('public/games/hot-seat-vocab/app.js')
    expect(js).toContain("unit && unit.hotseat && unit.hotseat.length >= 5")
    expect(js).toContain("'🚫 Don’t say: '")
    expect(() => new Function(js)).not.toThrow() // the script parses
    expect(js).toContain("esc(WORDS[x.w].meaning)")
  })
})

describe('Unit 8 L1: Sentence Scramble', () => {
  it('12 sentences, American spelling, used when the pack is picked', () => {
    const s = pack('m3-u8-l1').scramble as { text: string }[]
    expect(s).toHaveLength(12)
    expect(s.map((x) => x.text)).toContain('I apologize for calling him a name.')
    expect(read('public/games/sentence-scramble/app.js')).toContain('SENTENCES = mine.length >= 5 ? mine : content[level].sentences;')
  })
})

describe('who sees the Unit 8 packs', () => {
  const ids = (game: string, cls?: string) => unitsFor('M.3', game, cls).map((u) => u.id).filter((id) => id.startsWith('m3-u8'))
  it('M.3/2 and M.3/3 only (also written "3/2", "m.3 / 3")', () => {
    expect(ids('quiz-board', 'M.3/2')).toEqual(['m3-u8-l1', 'm3-u8-l2', 'm3-u8-review'])
    expect(ids('quiz-board', '3/3')).toEqual(['m3-u8-l1', 'm3-u8-l2', 'm3-u8-review'])
    expect(ids('quiz-board', 'm.3 / 2')).toHaveLength(3)
    expect(ids('quiz-board', 'M.3/1')).toEqual([])
    expect(classKey('M.3/2')).toBe(classKey('3/2'))
  })
  it('only in their games', () => {
    expect(ids('quiz-battle', 'M.3/2')).toEqual(['m3-u8-l1', 'm3-u8-l2', 'm3-u8-review'])
    expect(ids('hot-seat-vocab', 'M.3/2')).toEqual(['m3-u8-l3-vocab'])
    expect(ids('sentence-scramble', 'M.3/2')).toEqual(['m3-u8-l1'])
    expect(ids('race-board', 'M.3/2')).toEqual([])
    expect(ids('tag-team-debate', 'M.3/2')).toEqual([])
    // the old full units stay out of Sentence Scramble (they have no sentences)
    expect(unitsFor('M.3', 'sentence-scramble', 'M.3/2').map((u) => u.id)).toEqual(['m3-u8-l1'])
  })
  it('practice mode (?) can run every pack, whatever the class', () => {
    expect(ids('quiz-board')).toHaveLength(3)
    expect(read('src/routes/Preview.tsx')).toContain("unitsFor(level, slug)")
  })
})

describe('reveal + small packs', () => {
  it('the read-aloud sentence shows after the reveal (shared quiz + Quiz Battle)', () => {
    expect(read('public/games/shared/kru-quiz.js')).toContain('if (shown && q.read_aloud) h += say(q.read_aloud);')
    expect(read('public/games/quiz-battle/app.js')).toContain("$('say').innerHTML = shown && q.read_aloud ? KruQuiz.say(q.read_aloud) : '';")
  })
  it('Quiz Board puts every question of a small pack on the board (10 = 2 × 5, 12 = 3 × 4)', () => {
    const js = read('public/games/quiz-board/app.js')
    expect(js).toContain("var rows = n % 5 === 0 || n % 4 !== 0 ? 5 : 4, cols = Math.min(COLS, Math.floor(n / rows));")
  })
})
