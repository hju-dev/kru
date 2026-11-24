import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Grand Prix polish + question level switches (Henry, Nov 25).
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const race = read('public/games/race-board/app.js')

describe('Grand Prix: skipped turns, exact finish, shared squares, scoreboard numbers', () => {
  it('a skipped turn gets a big pop-up that says why and encourages (both games)', () => {
    expect(race).toContain("fx('skip', { t: current().name, id: id, why:")
    for (const f of ['public/games/race-board/racing.js', 'public/games/christmas-race-board/xmas-rides.js']) {
      const j = read(f)
      expect(j, f).toContain('skip: [[')
      expect(j, f).toContain('{why}')
      expect(j, f).toContain("WHY: { skip:")
    }
    expect(race).toContain("(S.skipWhy = S.skipWhy || {})[id] = RACING ? KruRacing.WHY.skip")
    expect(race).toContain("KruRacing.WHY.trap")
  })
  it('a bounce at the finish shows a pop-up that explains the exact-finish rule', () => {
    expect(race).toContain("fx('bounce', { t: racer(id).name, id: id, n:")
    for (const f of ['public/games/race-board/racing.js', 'public/games/christmas-race-board/xmas-rides.js']) expect(read(f), f).toMatch(/bounce: \[\['EXACT FINISH!'.*exact number/)
  })
  it('two or more teams on one square show as glowing orbs in their colours, one ride alone', () => {
    expect(race).toContain('if (RACING && on.length > 1) return')
    expect(read('public/games/race-board/style.css')).toContain('.racing .piece.orb')
  })
  it('the team number in the Grand Prix scoreboard has room (not cut off)', () => {
    expect(read('public/games/race-board/style.css')).toContain('.gp .legend .lg i { border-radius: 7px; width: 28px; height: 24px;')
  })
})

describe('question level switches (Easy / Regular / Hard / Impossible) in the settings', () => {
  const quiz = read('public/games/shared/kru-quiz.js')
  it('the shared switch row never lets every level go off, and greys out a level with no questions', () => {
    expect(quiz).toContain('function tierRow(el, off, counts, onChange)')
    expect(quiz).toContain('if (!left.length) return; // never switch every level off')
    expect(quiz).toContain("(none ? ' disabled' : '')")
  })
  for (const [name, f, html] of [['Quiz Grand Prix / North Pole', 'public/games/race-board/app.js', 'public/games/race-board/index.html'], ['Quiz Island', 'public/games/quiz-island/app.js', 'public/games/quiz-island/index.html'], ['Point 1-4', 'public/games/fortress/app.js', 'public/games/fortress/index.html']] as const) {
    it(`${name}: a "Question levels" row in the settings; the next question follows the switches`, () => {
      expect(read(html), html).toContain('id="tierRow"')
      const j = read(f)
      expect(j, f).toContain('KruQuiz.tierRow($(\'tierRow\')')
      expect(j, f).toContain('KruQuiz.tierOn(S.tiersOff, t)')
      expect(j, f).toContain('S.tiersOff = S.tiersOff || {}')
    })
  }
})
