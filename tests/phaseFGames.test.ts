import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
type G = { slug: string; modes: string[]; twoTeams?: boolean; startMode?: string }
const games = JSON.parse(read('games.json')) as G[]
const game = (s: string) => games.find((g) => g.slug === s)!

describe('20 Questions: the whole class or two teams (Henry, Nov 23)', () => {
  it('is marked twoTeams and opens on Whole class', () => {
    expect(game('twenty-questions')).toMatchObject({ twoTeams: true, startMode: 'solo' })
  })
  it('Setup: fixed two teams, no team size, add, remove or load teams', () => {
    const s = read('src/routes/Setup.tsx')
    expect(s).toContain('gameInfo?.fixedTeams ?? (gameInfo?.twoTeams ? 2 : 0)')
    expect(s).toContain('Whole class')
    expect(s).toContain('Two teams')
    expect(s).toContain('resizeBins(s.bins, fixedN)')
    expect(s).toContain('{group && !two && (')
  })
})

describe('Would You Rather: a whole-class game with no points (Henry, Nov 23)', () => {
  it('solo only, "Pick a student", no points, no Undo or New Game, global timer', () => {
    expect(game('would-you-rather').modes).toEqual(['solo'])
    const js = read('public/games/would-you-rather/app.js')
    expect(js).toContain("pickerLabel: 'Pick a student'")
    expect(js).toContain('noScores: true')
    const eng = read('public/games/shared/kru-cards.js')
    expect(eng).toContain("(cfg.noScores ? '' : '<button class=\"btn\" id=\"undo\">Undo last points</button>')")
    expect(eng).toContain('KruMenu.timer($(\'secsRow\')')
    expect(JSON.stringify(JSON.parse(read('public/games/would-you-rather/content.json')).intro)).not.toMatch(/team/i)
  })
})

describe('One-Word Story: timers and word conditions (Henry, Nov 23)', () => {
  const js = read('public/games/one-word-story/app.js')
  it('10 s to the board, 20 s to write, adjustable with the alarm-clock timer', () => {
    expect(js).toContain('write: 20, gap: 10')
    expect(js).toContain("KruMenu.timer($('gapRow')")
    expect(js).toContain("KruMenu.timer($('writeRow')")
  })
  it('conditions only use letters and length (true after any previous word) and the review lists them numbered', () => {
    expect(js).toContain('function makeConds(n, hard)')
    expect(js).not.toMatch(/must be a (verb|noun|adjective)/i)
    const h = read('public/games/one-word-story/index.html')
    expect(h).toContain('<ol class="conds" id="condList">')
    expect(h).toContain('id="condPts"')
    expect(js).toContain("give(id, d, 'word followed its condition')")
  })
  it('word rules are asked before the first story and can be switched in Settings', () => {
    const h = read('public/games/one-word-story/index.html')
    expect(h).toContain('id="condAsk"')
    expect(h).toContain('id="condToggle"')
    expect(js).toContain('if (S.useConds === undefined)')
    expect(js).toContain('S.conds = S.useConds ? makeConds(S.words, HARD) : null')
  })

  it('20 Questions: the picked student shows on the main screen; Next student counts a question, Free question does not (Henry, Nov 24)', () => {
    const js20 = read('public/games/twenty-questions/app.js')
    const html20 = read('public/games/twenty-questions/index.html')
    expect(html20).toContain('id="asker"')
    expect(html20).toContain('id="free"')
    expect(html20).not.toContain('id="pickBack"')
    expect(js20).toContain("S.cur ? '🎯 Next student −1' : '🎯 Who asks?'")
    expect(js20).toContain('if (left(id) > 0) ask(id);')
    expect(js20).toContain("toast('Free question: nobody loses a guess.', false);")
  })

  it('20 Questions, whole class mode: the entire class gets the points (Henry, Nov 24)', () => {
    const js20 = read('public/games/twenty-questions/app.js')
    expect(js20).toContain('function winAll()')
    expect(js20).toContain("teams.forEach(function (t) { S.pts[t.id] = pts(t.id) + points; Kru.score(t.id, points, 'the class guessed it'); });")
    expect(js20).toContain("'The whole class got it?'")
    expect(js20).toContain('if (L.all)') // Undo takes the points back from everyone
  })
})
