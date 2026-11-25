import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import games from '../games.json'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

interface Api {
  sizes(n: number, g?: number): number[]
  teacherJoins(mode: string, n: number, g?: number, force?: boolean | null): boolean
  pairCounts(rounds: unknown[]): Record<string, number>
  cost(groups: string[][], counts: Record<string, number>): number
  repeats(groups: string[][], counts: Record<string, number>): number
  shuffle(players: string[], g: number, counts: Record<string, number>, opt?: { restarts?: number; swaps?: number }): { groups: string[][]; cost: number; repeats: number }
  role(seat: number, q: number): string
}
const mod = { exports: {} as unknown as Api }
new Function('module', read('public/games/group-maker/groups.js'))(mod)
const G = mod.exports

const students = (n: number) => Array.from({ length: n }, (_, i) => `S${i + 1}`)

describe('Gossip Circle: group sizes', () => {
  it('3s when it divides, one 4 for a remainder of 1, two 4s for a remainder of 2, never a 1 or 2', () => {
    expect(G.sizes(30)).toEqual(Array(10).fill(3))
    expect(G.sizes(31).sort()).toEqual([...Array(9).fill(3), 4].sort())
    expect(G.sizes(29).sort()).toEqual([...Array(7).fill(3), 4, 4].sort())
    expect(G.sizes(8)).toEqual([4, 4])
    for (let n = 3; n <= 60; n++) for (const s of G.sizes(n)) expect(s, `n=${n}`).toBeGreaterThanOrEqual(3)
    for (let n = 3; n <= 60; n++) expect(G.sizes(n).reduce((a, b) => a + b, 0)).toBe(n)
  })
})

describe('Gossip Circle: teacher rules', () => {
  it('Auto: joins only when it makes every group exactly 3 (remainder 2)', () => {
    for (const n of [29, 32, 35]) expect(G.teacherJoins('auto', n), String(n)).toBe(true)
    for (const n of [30, 31, 33, 34]) expect(G.teacherJoins('auto', n), String(n)).toBe(false)
    expect(G.sizes(32 + 1)).toEqual(Array(11).fill(3)) // 32 present + teacher
  })
  it('31 present in Auto: no teacher, one group of 4', () => {
    expect(G.teacherJoins('auto', 31)).toBe(false)
    expect(G.sizes(31).filter((s) => s === 4)).toHaveLength(1)
  })
  it('Always and Never', () => {
    expect(G.teacherJoins('always', 30)).toBe(true)
    expect(G.teacherJoins('never', 32)).toBe(false)
    expect(G.teacherJoins('never', 29)).toBe(false)
    expect(G.teacherJoins('auto', 32, 3, false)).toBe(false) // the "Teacher joins this round" quick toggle
    expect(G.teacherJoins('auto', 30, 3, true)).toBe(true)
  })
})

describe('Gossip Circle: shuffle', () => {
  it('30 students: at least the first 6 rounds have no repeated pair', () => {
    const rounds: { groups: string[][] }[] = []
    for (let r = 1; r <= 6; r++) {
      const res = G.shuffle(students(30), 3, G.pairCounts(rounds))
      expect(res.repeats, `round ${r}`).toBe(0)
      expect(res.groups.map((g) => g.length)).toEqual(Array(10).fill(3))
      rounds.push({ groups: res.groups })
    }
  })
  it('every player appears exactly once per round, also with a teacher', () => {
    const players = [...students(32), '@T']
    const res = G.shuffle(players, 3, {})
    expect(res.groups.flat().sort()).toEqual([...players].sort())
    expect(res.groups).toHaveLength(11)
  })
  it('31 students with the teacher always in: one group of 4', () => {
    const res = G.shuffle([...students(30), '@T'], 3, {})
    expect(res.groups.map((g) => g.length).sort()).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 4])
  })
  it('the teacher counts like any player in the history', () => {
    const counts = G.pairCounts([{ groups: [['@T', 'S1', 'S2']] }])
    expect(counts['@T|S1']).toBe(1)
    expect(G.repeats([['S1', '@T', 'S9']], counts)).toBe(1)
  })
  it('absent students keep their history but are left out of the shuffle', () => {
    const rounds = [{ groups: [['S1', 'S2', 'S3']] }]
    const counts = G.pairCounts(rounds)
    const res = G.shuffle(['S1', 'S2', 'S4', 'S5', 'S6', 'S7'], 3, counts) // S3 is absent today
    expect(res.groups.flat()).not.toContain('S3')
    expect(counts['S1|S3']).toBe(1) // history untouched
    expect(res.repeats).toBe(0)
  })
  it('history survives a reload (JSON round trip gives the same pair counts)', () => {
    const rounds: { groups: string[][] }[] = []
    for (let r = 0; r < 4; r++) rounds.push({ groups: G.shuffle(students(30), 3, G.pairCounts(rounds)).groups })
    expect(G.pairCounts(JSON.parse(JSON.stringify(rounds)))).toEqual(G.pairCounts(rounds))
  })
  it('when a repeat cannot be avoided it says so (repeats > 0) instead of hiding it', () => {
    const rounds: { groups: string[][] }[] = [{ groups: [['S1', 'S2', 'S3']] }, { groups: [['S1', 'S2', 'S3']] }]
    const res = G.shuffle(['S1', 'S2', 'S3'], 3, G.pairCounts(rounds), { restarts: 3 })
    expect(res.repeats).toBe(3)
  })
})

describe('Gossip Circle: roles rotate clockwise', () => {
  it('Q1: seat 1 asks, 2 reports, 3 checks; Q2: 2 asks, 3 reports, 1 checks; Q3: 3 asks, 1 reports, 2 checks; Q4 = Q1', () => {
    const roles = (q: number) => [0, 1, 2].map((s) => G.role(s, q))
    expect(roles(1)).toEqual(['ask', 'report', 'check'])
    expect(roles(2)).toEqual(['check', 'ask', 'report'])
    expect(roles(3)).toEqual(['report', 'check', 'ask'])
    expect(roles(4)).toEqual(roles(1))
    expect(roles(15)).toEqual(roles(3))
  })
  it('the 4th seat of a group of 4 is the observer, every question', () => {
    for (let q = 1; q <= 15; q++) expect(G.role(3, q)).toBe('observe')
  })
})

describe('Gossip Circle: tool wiring', () => {
  const g = games.find((x) => x.slug === 'group-maker') as Record<string, unknown>
  it('is a Speaking class tool called Gossip Circle that gets the whole roster', () => {
    expect(g.title).toBe('Gossip Circle')
    expect(g.section).toBe('speaking')
    expect(g.classTool).toBe(true)
    expect(g.fullRoster).toBe(true)
  })
  it('never scores anyone and never sends the teacher anywhere (no results, no Sheet)', () => {
    const app = read('public/games/group-maker/app.js')
    expect(app).not.toContain('Kru.score(')
    expect(app).toContain('Kru.finish([])')
    expect(app).not.toContain('localStorage')
    expect(app).toContain("var TEACHER = '@T'")
  })
  it('history is kept per class on this phone (Kru.saveKeep -> keep:<game>:<class>); reset clears only this class', () => {
    expect(read('src/lib/storage.ts')).toContain('`keep:${game}:${cls}`')
    const app = read('public/games/group-maker/app.js')
    expect(app).toContain('Kru.saveKeep(K)')
    expect(app).toContain('K.rounds = []')
  })
  it('the shell passes today’s absent students and the full roster only to tools that ask', () => {
    expect(read('src/routes/ChooseClass.tsx')).toContain('!!game.fullRoster')
    expect(read('src/lib/session.ts')).toContain('absentIds')
  })
})
