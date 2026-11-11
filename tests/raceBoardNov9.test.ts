import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const js = read('public/games/race-board/app.js')
const html = read('public/games/race-board/index.html')
const content = JSON.parse(read('public/games/race-board/content.json'))
type Q = { tier: string; cat: string; q: string; choices?: string[]; answer: number | string }

describe('Race Board dice (Henry, Nov 11)', () => {
  it('easy and regular: 1 die; hard: 2 dice; impossible: 2 big dice', () => {
    expect(js).toMatch(/easy: \{[^}]*dice: 1, big: false/)
    expect(js).toMatch(/regular: \{[^}]*dice: 1, big: false/)
    expect(js).toMatch(/hard: \{[^}]*dice: 2, big: false/)
    expect(js).toMatch(/impossible: \{[^}]*dice: 2, big: true/)
  })
  it('a big die shows 4 to 9, so two big dice are never less than 8', () => {
    expect(js).toContain('var BIG_MIN = 4;')
    expect(js).toContain('return big ? BIG_MIN + Math.floor(Math.random() * 6) : 1 + Math.floor(Math.random() * 6);')
  })
  it('a wrong answer rolls the same dice backwards; Risk It = 2 big (3 on impossible) or 2 big back dice', () => {
    expect(js).toContain("if (risk) return { n: right && tier === 'impossible' ? 3 : 2, big: true, back: !right };")
    expect(js).toContain('return { n: t.dice, big: t.big, back: !right };')
    expect(js).toContain('if (spec.back) move(id, -sum,')
  })
  it('hard and impossible questions are rarer', () => {
    const share = (t: string) => Number(js.match(new RegExp(`${t}: \\{[^}]*share: (\\d+)`))![1])
    expect(share('hard')).toBeLessThan(share('regular'))
    expect(share('impossible')).toBeLessThan(share('hard'))
  })
  it('the big dice are purple', () => {
    expect(read('public/games/race-board/style.css')).toContain('.die.big { background: #9b7bff;')
  })
})

describe('Race Board power-ups (Henry, Nov 11)', () => {
  it('50/50, +20 s, Free answer, Risk it: one of each per team per game', () => {
    for (const p of ["{ id: 'fifty', label: '50/50' }", "{ id: 'time', label: '+20 s' }", "{ id: 'free', label: 'Free answer' }", "{ id: 'risk', label: 'Risk it' }"]) expect(js).toContain(p)
    expect(js).toContain('function used(id, p) { return !!(S.powers[id] && S.powers[id][p]); }')
    expect(html).toContain('id="powers"')
  })
  it('+20 s works even after the clock hit zero', () => {
    expect(js).toContain('left = Math.max(0, left) + 20;')
  })
  it("the switch-places card shows every team's square and comes up more often", () => {
    expect(js).toContain("{ id: 'swap', text: 'Switch places with the team of your choice!', w: 3 }")
    expect(js).toContain("t.name + ' is on ' + (pos(id) ? 'square ' + pos(id) : 'START')")
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
    it(`${level}: 165+ questions (Henry, Nov 10: triple) in 4 tiers, hard and impossible rarer, 10+ math or science`, () => {
      const qs = content.questions[level] as Q[]
      expect(qs.length).toBeGreaterThanOrEqual(165)
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

describe('Race Board levels moved up (Henry, Nov 10)', () => {
  const qs = (l: string) => (content.questions[l] as Q[]).map((q) => q.q)
  it('the old, too-easy M.1 questions are gone', () => {
    for (const l of ['M.1', 'M.2', 'M.3']) for (const old of ['What is 6 + 7?', 'Which one is a fruit?', 'What is the opposite of "hot"?']) expect(qs(l)).not.toContain(old)
  })
  it('M.1 starts from the old M.2 questions, M.2 from the old M.3 ones, M.3 is all new', () => {
    expect(qs('M.1')).toContain('What is the past tense of "go"?')
    expect(qs('M.2')).toContain('What is the past tense of "take"?')
    expect(qs('M.3')).not.toContain('What is the past tense of "take"?')
    expect(qs('M.3')).toContain('What is the plural of "criterion"?')
  })
})

describe('Quiz Board: choosing team only + power-ups (Henry, Nov 11)', () => {
  const qb = read('public/games/quiz-board/app.js')
  const qbHtml = read('public/games/quiz-board/index.html')
  it('a ⋯ menu switch: all teams (default) or the choosing team only', () => {
    expect(qbHtml).toContain('id="oneTeamOpt"')
    expect(qb).toContain("'Who answers: ' + (S.oneTeam ? 'choosing team only' : 'all teams')")
  })
  it('✓ Right / ✗ Wrong for the choosing team; Risk it = double or lose the points', () => {
    expect(qb).toContain('var d = right ? v * (S.risk ? 2 : 1) : (S.risk ? -v : 0);')
  })
  it('power-ups once each per team per game: 50/50, +20 s, Free answer, Risk it', () => {
    for (const p of ["{ id: 'fifty', label: '50/50' }", "{ id: 'time', label: '+20 s' }", "{ id: 'free', label: 'Free answer' }", "{ id: 'risk', label: 'Risk it' }"]) expect(qb).toContain(p)
    expect(qb).toContain('left = Math.max(0, left) + 20;')
  })
})
