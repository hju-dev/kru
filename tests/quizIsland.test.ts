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
  it('gold: easy 2, regular 3, hard 5, impossible 7; hard and impossible give a reward', () => {
    expect(js).toContain("easy: { label: 'Easy', share: 30, pts: 2 }")
    expect(js).toContain("regular: { label: 'Regular', share: 45, pts: 3 }")
    expect(js).toContain("hard: { label: 'Hard', share: 17, pts: 5, reward: true }")
    expect(js).toContain("impossible: { label: 'Impossible', share: 8, pts: 7, reward: true }")
  })
  it('the map: 30 islands; one fortress per team, 4 treasures (+5), a volcano, a hurricane, a tsunami, 3 pirates, 3 chests (+10), three Krakens, Blackbeard and Captain Kidd (+30), 3 free-raid islands', () => {
    expect(js).toContain('var COLS = 6, ROWS = 5, CELLS = COLS * ROWS;')
    expect(js).toContain('VOLCANOES = 1, HURRICANES = 1, TSUNAMIS = 1, PIRATES = 3, CHESTS = 3, RAIDS = 3, KRAKENS = 3;')
    expect(js).toContain('var GEM = 5, CHEST = 10, BEARD = 30, DIG = 10, EMPIRE = 10, NO_ANSWER = 3, BOTTLE = 3;')
    expect(js).toContain('var nf = Math.min(players.length, 8)')
    expect(js).toContain('m.seaMonster = take(KRAKENS);')
    expect(js).toContain('m.hurricane = take(HURRICANES);'); expect(js).toContain('m.tsunami = take(TSUNAMIS);')
    expect(js).toContain('m.beard = take(1);')
    expect(js).toContain('m.kidd = take(1);')
    expect(js).toContain('m.raid = take(RAIDS);')
    expect(js).toContain("title: \"CAPTAIN KIDD'S TREASURE!\"")
    expect(js).toContain("title: 'FREE PIRATE RAID!'")
    expect(js).toContain('ART.kraken()'); expect(js).not.toContain('dragon')
  })
  it('the free raid comes after the claim (sink or steal only); a full map asks once whether to end the game', () => {
    expect(js).toContain('if (S.claim) S.claim.raidAfter = true;')
    expect(js).toContain("S.choice = { id: free, kind: 'raid', free: true, v: 0 };")
    expect(js).toContain("return !(ch.free && o.k === 'two');")
    expect(js).toContain('if (S.phase === \'play\' && !S.fullAsked && !emptyCells().length) {')
    expect(js).toContain("if (k === 'end') endGame(); else nextTurn();")
    expect(js).toContain("var half = Math.floor(gold(id) / 2)")
  })
  it("fortresses guard themselves and their owner's neighbors; one fortress per team; a stolen island is locked for a round", () => {
    expect(js).toContain('if (has(S.map.fort, c)) return true;')
    expect(js).toContain('return near(c).some(function (n) { return has(S.map.fort, n) && S.map.own[n] === o; });')
    expect(js).toContain('return emptyCells().filter(function (c) { return !(fort && has(S.map.fort, c)); });')
    expect(js).toContain('S.map.lock[c] = S.turn + players.length;')
    expect(js).toContain('return o && o !== id && !guarded(c) && !locked(c);')
  })
  it('rewards: Gold Dig, Cannon Fire, Double Claim; Pirate Raid: sink, steal or claim 2, and wrong loses 2 islands', () => {
    expect(js).toContain("steps = [{ m: 'claim', v: v, dig: true }]")
    expect(js).toContain("steps = [{ m: 'claim', v: v }, { m: 'sink', announce: true }]")
    expect(js).toContain("steps = [{ m: 'claim', v: v }, { m: 'claim', v: v, second: true }]")
    expect(js).toContain("var lost = newest(t.id).slice(0, 2)")
    expect(js).toContain("(p.id === 'free' && raid)") // no Free answer with a Pirate Raid
    expect(js).toContain("{ id: 'raid', label: '🏴‍☠️ Pirate Raid' }")
    expect(js).not.toContain('Risk it')
  })
  it('no answer = -3 gold; gold never below 0; a full map turns a claim into a steal', () => {
    expect(html).toContain('id="noAnswer"')
    expect(js).toContain("addPts(t.id, -NO_ANSWER, 'no answer')")
    expect(js).toContain('Math.max(0, now + d)')
    expect(js).toContain("if (s.m === 'claim' && !claimCells(cl.id).length && targets(cl.id).length) { s.m = 'steal';")
  })
  it('Final Wager is gone; Last round evens out the turns, then the treasure map and the empire (+10)', () => {
    expect(js).not.toContain('Final Wager')
    expect(html).not.toContain('finalBtn')
    expect(html).toContain('id="lastRound"')
    expect(js).toContain('S.lastEnd = S.turn % n === 0 ? S.turn + n : Math.ceil(S.turn / n) * n;')
    expect(js).toContain('if (S.lastEnd && S.turn >= S.lastEnd) { endGame(); return true; }')
    expect(js).toContain("S.phase = 'done'; S.reveal = true;")
    expect(js).toContain('Kru.finish(teams.map(function (t) { return { teamId: t.id, points: t.teacher ? 0 : finalPts(t.id) }; }))')
  })
  it('Message in a Bottle: the last-place team gets +3 at the start of each round', () => {
    expect(js).toContain("addPts(t.id, BOTTLE, 'message in a bottle')")
    expect(js).toContain('if (players.length < 2 || min === max) return;')
  })
  it('every event shows a big banner with a picture; Reduce Motion stops the animation', () => {
    const art = read(`${dir}/art.js`)
    for (const k of ['island', 'double', 'dig', 'chest', 'beard', 'gem', 'fort', 'volcano', 'pirates', 'kraken', 'hurricane', 'tsunami', 'incorrect', 'cannon', 'boom', 'steal', 'raid', 'sinking', 'silence', 'bottle', 'crown', 'map', 'flag']) expect(art, k).toContain(`${k}: function`)
    expect(html).toContain('<script src="art.js"></script>')
    for (const t of ['LAND HO!', 'TREASURE CHEST!', "BLACKBEARD'S TREASURE!", 'KRAKEN!', 'INCORRECT', 'KABOOM!', 'STOLEN!', 'VOLCANO!', 'PIRATE AMBUSH!', 'RAID FAILED!', 'SILENCE ON DECK!', 'MESSAGE IN A BOTTLE!', 'LAST ROUND!', 'ISLAND EMPIRE!']) expect(js, t).toContain(t)
    expect(read(`${dir}/style.css`)).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*\.fx\.go \.fx-rays/)
  })
  it('How to play comes from Quiz Island itself, not Race Board', () => {
    expect(js).toContain("fetch('content.json')")
    expect(js).toContain('INTRO = KruIntro.forLevel(mine, QZ.level);')
    const c = JSON.parse(read(`${dir}/content.json`)) as { intro: { title: string }[] }
    expect(c.intro.map((s) => s.title)).toEqual(['Quiz Island', 'Big answers, big rewards', 'Secret islands', '🏰 Fortresses', '🏴‍☠️ Pirate Raid', 'Always guess!'])
  })
  it('the optional Who answers spinner is still wired in', () => {
    expect(js).toContain('KruPicker.member({')
  })
  it('decks: Race Board bank, Quiz Battle sets, units; a saved claim survives a reload', () => {
    for (const k of ["key: 'bank'", "key: 'qb-all'", "key: 'unit'"]) expect(js).toContain(k)
    expect(js).toContain("fetch('/games/race-board/content.json')")
    expect(js).toContain('saved.map.own.length === CELLS')
    expect(js).toContain('S.claim = { id: id, steps: steps };')
    expect(js).toContain('saved.v === 3')
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
  it('the Kraken is found three times with a different line each time; nature events have their own pop-ups (Henry, Nov 23)', () => {
    expect(js).toContain('var KRAKEN_LINES = [')
    for (const t of ['THE KRAKEN!', 'THE KRAKEN RETURNS!', 'THE KRAKEN IS FURIOUS!', 'HURRICANE!', 'TSUNAMI!', 'VOLCANO!']) expect(js, t).toContain(t)
    const art = read(`${dir}/art.js`)
    expect(art).not.toContain('dragon')
    const kr = art.slice(art.indexOf('kraken: function'), art.indexOf('hurricane: function'))
    expect(kr).not.toContain('waves') // it used to hang off the bottom of its tile
  })
  it('the target outlines when aiming are black, and the gear button is centered with a grid', () => {
    expect(read(`${dir}/style.css`)).toMatch(/\.map\.aim\.steal \.isle\.can \{\s*outline: 3px dashed #000;/)
    expect(read('public/games/shared/kru-game.css')).toContain('#more { display: inline-grid; place-items: center;')
  })
})
