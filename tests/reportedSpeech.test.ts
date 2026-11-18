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
    expect(unitsFor('M.3', 'jeopardy').map((x) => x.id)).not.toContain('m3-english-reported-speech')
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
