import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import games from '../games.json'

// Battle of Wits (Henry, Nov 19; was Quiz Battle): rounds of 5 written answers, then a class review, hidden bonuses
// and a tally. The flow is the shared Battle engine (also for Battle of Readers / Writers).
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const engine = read('public/games/shared/kru-battle.js')
const c = JSON.parse(read('public/games/quiz-battle/content.json'))
type Q = { q: string; choices?: string[]; answer: number | string; why?: string }

describe('Battle of Wits', () => {
  it('is Battle of Wits everywhere students see it (the id stays quiz-battle)', () => {
    expect((games.find((g) => g.slug === 'quiz-battle') as { title: string }).title).toBe('Battle of Wits')
    expect(read('public/games/quiz-battle/index.html')).toContain('<title>Battle of Wits</title>')
    expect(read('public/games/quiz-battle/app.js')).toContain("title: 'Battle of Wits'")
    expect(read('public/games/quiz-battle/index.html')).toContain('/games/shared/kru-battle.js')
  })
  it('rounds of 5; 30 / 45 / 60 s (30 to start); the next question comes by itself after a 3-second countdown', () => {
    expect(engine).toContain('var ROUND = 5, GAP = 3, FINAL_PTS = 5, DEFAULT_ROUNDS = 3, FINAL_SECS = 120;')
    expect(engine).toContain("if (l <= 0) { S.running = false; if (S.phase === 'fask') finalTimeUp(); else timeUp(); return; }")
    expect(engine).toContain("S.phase = 'gap'; startClock(GAP); render();")
    expect(engine).toContain("else if (S.phase === 'gap' && l <= 0) { S.running = false; nextQuestion(); return; }")
  })
  it('after the round: pens down → review (Henry taps Next) → hidden bonuses → tally → results', () => {
    for (const p of ["ph === 'pens'", "ph === 'review'", "ph === 'bonus'", "ph === 'tally'", "ph === 'result'"]) expect(engine).toContain(p)
    expect(engine).toContain("data-do=\"fwd\">Next answer ▶")
    expect(engine).toContain("Kru.score(t.id, d, 'round ' + (S.round + 1))")
  })
  it('every built-in question has a short explanation for the review', () => {
    for (const lv of ['M.1', 'M.2', 'M.3']) for (const s of c[lv].sets) for (const q of s.questions as Q[]) {
      expect(q.why, q.q).toBeTruthy()
      expect(q.why!.length, q.why).toBeLessThanOrEqual(100)
    }
  })
  it('only hidden bonuses (no Fast hands cards); 2 per round, matched to the questions', () => {
    expect(c.bonus).toBeUndefined()
    expect(read('public/games/quiz-battle/index.html')).not.toContain('kru-bonus')
    const ids = c.hidden.map((b: { id: string }) => b.id)
    // Henry, Nov 24: bonuses are quick facts about the team (siblings, birthdays...), nothing to do with English, no challenges
    expect(ids.length).toBeGreaterThanOrEqual(30)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining(['siblings', 'bday7']))
    for (const b of c.hidden) { expect(b.points).toBeGreaterThan(0); expect(b.text.length).toBeLessThanOrEqual(80); expect(b.needs, b.id).toBeUndefined(); expect(b.text, b.id).not.toMatch(/\{n\}|\{letter\}|spell|word|letter|sentence|answer/i) }
    expect(engine).toContain('var pick = shuffle(ok.slice()).slice(0, 2);')
  })
  it('the slides are about writing (not saying) the answers', () => {
    const text = JSON.stringify(c.intro)
    expect(c.intro.map((s: { title: string }) => s.title)).toEqual(['Battle of Wits', 'Be quick!', 'Check together', 'Hidden bonuses!', 'Count your points'])
    expect(text).toMatch(/writes each answer/)
    expect(text).not.toMatch(/out loud|say it|shout the/i)
  })
})

describe('Hidden bonus cards fit (Henry, Nov 24)', () => {
  it('the card text shrinks to fit: icon, name, text and +points all inside the card', () => {
    const engine = readFileSync(new URL('../public/games/shared/kru-battle.js', import.meta.url), 'utf8')
    const css = readFileSync(new URL('../public/games/shared/kru-battle.css', import.meta.url), 'utf8')
    expect(engine).toContain('function fitCards()')
    expect(engine).toContain('f.scrollHeight > f.clientHeight + 1')
    expect(css).toContain('.kbt-card .front { font-size: 17px; overflow: hidden;')
    expect(css).toContain('.kbt-card .front em { font: 900 1.6em/1')
  })
})
