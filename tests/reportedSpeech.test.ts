import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { unitsFor } from '../src/lib/units'

// Reported Speech set for Quiz Battle (Henry, Nov 17): M.3 English, a unit with its own sets.
const u = JSON.parse(readFileSync(new URL('../public/units/m3-english-reported-speech.json', import.meta.url), 'utf8')) as {
  sets: { name: string; questions: { q: string; choices?: string[]; answer: number | string }[] }[]
}

describe('Reported Speech unit', () => {
  it('shows for M.3 in Quiz Battle and Race Board, for every class', () => {
    expect(unitsFor('M.3', 'quiz-battle', 'M.3/1').map((x) => x.id)).toContain('m3-english-reported-speech')
    expect(unitsFor('M.3', 'jeopardy').map((x) => x.id)).not.toContain('m3-english-reported-speech')
    expect(unitsFor('M.3', 'race-board', 'M.3/2P').map((x) => x.id)).toContain('m3-english-reported-speech')
    expect(unitsFor('M.2', 'quiz-battle').map((x) => x.id)).not.toContain('m3-english-reported-speech')
  })
  it('has direct to reported, reported to direct, tense and multiple-choice sets', () => {
    expect(u.sets.map((s) => s.name)).toEqual(['Direct → reported', 'Reported → direct', 'Tenses: backshift', 'Rules: multiple choice', 'Relationship phrasal verbs', 'Said or told?', 'Report it: relationships'])
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

// Reported Speech: Race Board deck + worksheet concepts (Henry, Nov 18).
describe('Reported Speech: tiers and worksheet concepts', () => {
  const all = u.sets.flatMap((s) => s.questions) as { q: string; choices?: string[]; answer: number | string; tier: string }[]
  it('every question has a tier; each tier has enough questions for a Race Board game', () => {
    const n = (t: string) => all.filter((q) => q.tier === t).length
    for (const q of all) expect(['easy', 'regular', 'hard', 'impossible'], q.q).toContain(q.tier)
    expect(all.length).toBeGreaterThanOrEqual(60)
    expect(n('easy')).toBeGreaterThanOrEqual(12)
    expect(n('regular')).toBeGreaterThanOrEqual(15)
    expect(n('hard')).toBeGreaterThanOrEqual(12)
    expect(n('impossible')).toBeGreaterThanOrEqual(6)
  })
  it('covers relationship phrasal verbs, said vs. told, and time-word changes', () => {
    const text = JSON.stringify(u)
    for (const v of ['made up', 'get on', 'fell out', 'let ... down', 'put up with', 'get over', 'ask ... out', 'get together', 'break up', 'going out']) expect(text, v).toContain(v)
    expect(u.sets.find((s) => s.name === 'Said or told?')!.questions.some((q) => q.answer === 'told')).toBe(true)
    expect(text).toContain('the next day')
    expect(text).toContain('that night')
    expect(text).toContain('the day before')
  })
  it('the right answer is spread over A-D and no multiple-choice answer repeats an option', () => {
    const mc = all.filter((q) => q.choices)
    for (const i of [0, 1, 2, 3]) expect(mc.filter((q) => q.answer === i).length).toBeGreaterThanOrEqual(3)
    for (const q of mc) expect(new Set(q.choices).size, q.q).toBe(q.choices!.length)
  })
  it("American spelling; Race Board uses each question's own tier", () => {
    expect(JSON.stringify(u)).not.toMatch(/neighbour|\bfilm\b|colour|favourite/i)
    expect(readFileSync(new URL('../public/games/race-board/app.js', import.meta.url), 'utf8')).toContain('TIERS[q.tier] ? q.tier : guessTier(q)')
  })
})

// Team Builder & Scoreboard (Henry, Nov 17): the old Scoreboard, renamed, with a members pop-up and a prominent note.
describe('Team Builder & Scoreboard', () => {
  const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  it('is renamed in the library and the page; the internal name stays scoreboard', () => {
    const g = (JSON.parse(read('games.json')) as { slug: string; title: string }[]).find((x) => x.slug === 'scoreboard')!
    expect(g.title).toBe('Team Builder & Scoreboard')
    expect(read('public/games/scoreboard/index.html')).toContain('<title>Team Builder &amp; Scoreboard</title>')
  })
  it('tapping a team name opens a pop-up with its members', () => {
    const js = read('public/games/scoreboard/app.js')
    expect(js).toContain('data-members')
    expect(js).toContain('function showMembers(teamId)')
    expect(read('public/games/scoreboard/index.html')).toContain('id="popList"')
  })
  it('the review note says what the points were for', () => {
    expect(read('src/routes/Results.tsx')).toContain('What were these points for?')
  })
})

// Quiz Board became Jeopardy (Henry, Nov 17): new id and title; old saved ids still work; old Sheet rows keep "Quiz Board".
describe('Jeopardy rename', () => {
  it('old Quiz Board ids resolve to Jeopardy', async () => {
    const g = await import('../src/lib/games')
    expect(g.findGame('quiz-board')?.title).toBe('Jeopardy')
    expect(g.gameTitle('jeopardy')).toBe('Jeopardy')
    expect(g.gameUrl('quiz-board')).toBe('/games/jeopardy/index.html')
    expect(g.GAMES.some((x) => x.slug === 'quiz-board')).toBe(false)
  })
  it('the game lives in games/jeopardy and says Jeopardy', () => {
    const html = readFileSync(new URL('../public/games/jeopardy/index.html', import.meta.url), 'utf8')
    expect(html).toContain('<title>Jeopardy</title>')
  })
})

// Quiz Battle (Henry, Nov 18): students write the answer first; Reveal opens when the time is up.
describe('Quiz Battle write first', () => {
  const js = readFileSync(new URL('../public/games/quiz-battle/app.js', import.meta.url), 'utf8')
  it('shows a write-it-down line and locks Reveal until 0:00', () => {
    expect(js).toContain('Write your answer on your board: A, B, C or D')
    expect(js).toContain("$('reveal').disabled = shown || left > 0;")
  })
  it('has a way to show the answer now', () => {
    expect(js).toContain("$('showNow').addEventListener")
    expect(readFileSync(new URL('../public/games/quiz-battle/index.html', import.meta.url), 'utf8')).toContain('id="showNow"')
  })
})

// "Who answers?" spinner (Henry, Nov 18): one random student per question, no repeats until the whole team has answered.
describe('KruPicker.member (Who answers?)', () => {
  const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const win: { KruPicker?: { next: (p: string[], all: string[], r?: () => number) => { id: string; picked: string[] }; member: unknown } } = {}
  new Function('window', read('public/games/shared/kru-picker.js'))(win)
  it('nobody twice until everyone has had a turn, then a new round', () => {
    const all = ['a', 'b', 'c', 'd']
    let picked: string[] = []
    const seen: string[] = []
    for (let i = 0; i < 4; i++) { const r = win.KruPicker!.next(picked, all); seen.push(r.id); picked = r.picked }
    expect(new Set(seen).size).toBe(4)
    expect(win.KruPicker!.next(picked, all).picked).toHaveLength(1) // everyone has gone: starts over
  })
  it('is exported and Race Board offers it as an optional switch (off by default)', () => {
    expect(typeof win.KruPicker!.member).toBe('function')
    const js = read('public/games/race-board/app.js')
    expect(js).toContain('if (S.who && window.KruPicker')
    for (const slug of ['race-board', 'christmas-race-board']) {
      const html = read(`public/games/${slug}/index.html`)
      expect(html).toContain('id="whoOn"')
      expect(html).toContain('/games/shared/kru-picker.js')
      expect(html).toContain('/games/shared/kru-picker.css')
    }
  })
})

// Reading Island (Henry, Nov 18): renamed from Reading Think Tank, with pirates and chests on the map.
describe('Reading Island', () => {
  const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const js = read('public/games/reading-island/app.js')
  it('old Reading Think Tank ids resolve to Reading Island', async () => {
    const g = await import('../src/lib/games')
    expect(g.findGame('reading-think-tank')?.title).toBe('Reading Island')
    expect(g.gameUrl('reading-think-tank')).toBe('/games/reading-island/index.html')
  })
  it('the map has 4 volcanoes, 4 pirates and 4 chests, none on the same island', () => {
    expect(js).toContain('VOLCANOES = 4, PIRATES = 4, CHESTS = 4')
    expect(js).toContain('m.volcano = cells.slice(at, at += VOLCANOES)')
    expect(js).toContain('m.pirate = cells.slice(at, at += PIRATES)')
    expect(js).toContain('m.chest = cells.slice(at, at += CHESTS)')
  })
  it('pirates make a team miss its next claim; chests give +3 bonus on top of the island', () => {
    expect(js).toContain('S.skip[id] = 1;')
    expect(js).toContain("var missed = S.queue.filter(function (id) { return S.skip[id]; });")
    expect(js).toContain("addPts(id, 4, 'treasure chest');")
  })
  it('older saved maps without pirates still load', () => {
    expect(js).toContain('S.map.pirate = S.map.pirate || []')
  })
})

// One-Word Story writing relay (Henry, Nov 18).
describe('One-Word Story writing relay', () => {
  const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  const js = read('public/games/one-word-story/app.js')
  it('picks one writer per team with no repeats until the team has all gone', () => {
    expect(js).toContain('KruPicker.next(S.picked[t.id] || [], ids)')
    expect(read('public/games/one-word-story/index.html')).toContain('/games/shared/kru-picker.js')
  })
  it('the best story gets 3 points, a draw 1 each, and the award can be changed', () => {
    expect(js).toContain('var WIN = 3, DRAW = 1;')
    expect(js).toContain("data-j=\"undo\"")
  })
  it('How to play slides: 4 short slides about writing one word in 5 seconds', () => {
    const c = JSON.parse(read('public/games/one-word-story/content.json')) as { intro: { title: string; text: string[] }[] }
    expect(c.intro).toHaveLength(4)
    for (const s of c.intro) { expect(s.title.length).toBeLessThanOrEqual(30); for (const l of s.text) expect(l.length).toBeLessThanOrEqual(90) }
    expect(JSON.stringify(c.intro)).toContain('5 seconds')
  })
})
