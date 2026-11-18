import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import games from '../games.json'
import { unitsFor } from '../src/lib/units'

// Quiz Island (Henry, Nov 18): Race Board's quiz on Reading Island's island map.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const dir = 'public/games/quiz-island'
const js = read(`${dir}/app.js`)
const html = read(`${dir}/index.html`)

describe('Quiz Island', () => {
  it('is a team quiz in the Quizzes section that uses units', () => {
    const g = games.find((x) => x.slug === 'quiz-island') as Record<string, unknown>
    expect(g).toMatchObject({ title: 'Quiz Island', section: 'quizzes', status: 'ready', modes: ['group'], units: true })
    expect(unitsFor('M.3', 'quiz-island', 'M.3/2P').map((u) => u.id)).toContain('m3-english-reported-speech')
  })
  it('loads the shared quiz, End game, spinner picker and Race Board styles; no inline scripts', () => {
    for (const f of ['kru-quiz.js', 'kru-end.js', 'kru-picker.js', 'kru-intro.js']) expect(html, f).toContain('/games/shared/' + f)
    expect(html).toContain('/games/race-board/style.css')
    expect(html).not.toMatch(/<script(?![^>]*src=)/)
  })
  it('tiers are worth 1 to 4 and only hard / impossible answers can steal', () => {
    expect(js).toContain("easy: { label: 'Easy', share: 30, pts: 1 }")
    expect(js).toContain("impossible: { label: 'Impossible', share: 8, pts: 4, steal: true }")
    expect(js).toContain("hard: { label: 'Hard', share: 17, pts: 3, steal: true }")
    expect(js).toContain('S.claim = { id: id, v: v, steal: stealOK || !emptyCells().length };') // a full map: everything steals
  })
  it('the map has 4 treasures, 4 volcanoes, 4 pirates and 4 chests; the empire gets +5', () => {
    expect(js).toContain('TREASURES = 4, VOLCANOES = 4, PIRATES = 4, CHESTS = 4, EMPIRE = 5, BONUS = 3')
    expect(js).toContain('function finalPts(id) { return pts(id) + (empireLeaders().indexOf(id) >= 0 ? EMPIRE : 0); }')
    expect(js).toContain('Kru.finish(teams.map(function (t) { return { teamId: t.id, points: t.teacher ? 0 : finalPts(t.id) }; }))')
  })
  it("points never go below 0, a steal moves the island's own value, pirates skip the next turn", () => {
    expect(js).toContain('Math.max(0, now + d)')
    expect(js).toContain("addPts(id, w, 'stole an island'); addPts(o, -w, 'island stolen');")
    expect(js).toContain('S.skip[id] = 1;')
    expect(js).toContain('if (!S.skip[cur.id]) break;')
  })
  it('Risk it doubles the island and loses the tier points when wrong; Free answer counts as right', () => {
    expect(js).toContain('TIERS[tierOf(Q)].pts * (risk ? 2 : 1)')
    expect(js).toContain("addPts(t.id, -tp, 'risk it')")
    expect(js).toContain('rightAnswer();')
  })
  it('the optional Who answers spinner and the Final Wager are wired in', () => {
    expect(js).toContain('KruPicker.member({')
    expect(js).toContain("pickQuestion(['hard', 'impossible'])")
    expect(html).toContain('id="finalBtn"')
  })
  it('decks: Race Board bank, Quiz Battle sets, units; a saved claim survives a reload', () => {
    for (const k of ["key: 'bank'", "key: 'qb-all'", "key: 'unit'"]) expect(js).toContain(k)
    expect(js).toContain("fetch('/games/race-board/content.json')")
    expect(js).toContain('saved.map.own.length === CELLS')
    expect(js).toContain('S.claim = { id')
  })
  it('How to play: 2 to 6 short slides', () => {
    const c = JSON.parse(read(`${dir}/content.json`)) as { intro: { title: string; text: string[] }[] }
    expect(c.intro.length).toBeGreaterThanOrEqual(2)
    expect(c.intro.length).toBeLessThanOrEqual(6)
    for (const s of c.intro) { expect(s.title.length).toBeLessThanOrEqual(30); for (const l of s.text) expect(l.length, l).toBeLessThanOrEqual(90) }
  })
})

// Hot Seat (Henry, Nov 18): no bonus cards, a team pop-up, and a Battle Round after every full cycle.
describe('Hot Seat Vocab update', () => {
  const hs = read('public/games/hot-seat-vocab/app.js')
  const hsHtml = read('public/games/hot-seat-vocab/index.html')
  it('has no bonus cards any more', () => {
    expect(hs).not.toContain('KruBonus')
    expect(hsHtml).not.toContain('kru-bonus')
    expect(JSON.parse(read('public/games/hot-seat-vocab/content.json')).bonus).toBeUndefined()
  })
  it('tapping a team shows its members, +1 / -1 points and a hot seat button', () => {
    for (const id of ['teamMembers', 'ptsPlus', 'ptsMinus', 'teamSeat']) expect(hsHtml).toContain(`id="${id}"`)
    expect(hs).toContain("S.log.push({ t: id, d: d, m: 1 });")
    expect(hs).toContain("Kru.score(id, d, 'manual')")
  })
  it('after every team has had a turn: Battle Round, student teams in pairs, 2 points a word, random student', () => {
    expect(hs).toContain('if (cycleDone() && startBattles()) return;')
    expect(hs).toContain('var BATTLE_PTS = 2;')
    expect(hs).toContain("pairs.push([studs[i].id, (studs[i + 1] || studs[0]).id])")
    expect(hs).toContain('KruPicker.next(S.bpicked[id] || [], ids)')
    expect(hs).toContain("Kru.score(id, BATTLE_PTS, 'battle word')")
    expect(hsHtml).toContain('id="skipBattle"')
  })
  it('the Battle slide is in How to play', () => {
    const c = JSON.parse(read('public/games/hot-seat-vocab/content.json')) as { intro: { title: string; text: string[] }[] }
    expect(c.intro.map((s) => s.title)).toContain('Battle Round!')
    expect(c.intro.length).toBeLessThanOrEqual(6)
    for (const s of c.intro) for (const l of s.text) expect(l.length).toBeLessThanOrEqual(90)
  })
})
