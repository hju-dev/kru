import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Random rides with a garage-door reveal, pirate crew mascots, and Point 1-4's animated pop-ups (Henry, Nov 25).
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const reveal = read('public/games/shared/kru-reveal.js')
const race = read('public/games/race-board/app.js')

describe('KruReveal: the door cut scene', () => {
  it('draws different picks for every team, wrapping round only when there are more teams than rides', () => {
    const src = reveal.slice(reveal.indexOf('function shuffle'), reveal.indexOf('// ---------- sound'))
    const draw = new Function(`${src}; return draw;`)() as (n: number, k: number) => number[]
    for (let i = 0; i < 50; i++) {
      const a = draw(4, 10)
      expect(new Set(a).size).toBe(4)
      expect(draw(10, 10).slice().sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    }
    expect(draw(12, 10)).toHaveLength(12)
  })
  it('has a door that shakes then rolls up, a rumble and a fanfare, a Skip button and three skins', () => {
    for (const s of ['krv-door', "'shake'", "'open'", 'function rumble()', 'function fanfare()', 'krv-skip', 'skin-']) expect(reveal, s).toContain(s)
    const css = read('public/games/shared/kru-reveal.css')
    for (const skin of ['skin-workshop', 'skin-cabin']) expect(css, skin).toContain(skin)
    expect(css).toContain('translateY(-104%)')
    expect(css).toContain('prefers-reduced-motion')
  })
})

describe('the two Grand Prix games: a random ride per team, colours follow the ride', () => {
  it('both pages load the reveal and each ride has its own colour', () => {
    for (const f of ['public/games/race-board/index.html', 'public/games/christmas-race-board/index.html']) {
      const h = read(f)
      expect(h, f).toContain('/games/shared/kru-reveal.js')
      expect(h, f).toContain('/games/shared/kru-reveal.css')
    }
    for (const f of ['public/games/race-board/racing.js', 'public/games/christmas-race-board/xmas-rides.js']) {
      const j = read(f)
      expect(j, f).toContain('pool: NAMES.map')
      expect(j, f).toContain('REVEAL: REVEAL')
    }
    expect(read('public/games/race-board/racing.js')).toContain("skin: 'garage'")
    expect(read('public/games/christmas-race-board/xmas-rides.js')).toContain("skin: 'workshop'")
  })
  it('the draw is saved (S.rides), runs after the slides and after New Game, and the team colour is the ride colour', () => {
    expect(race).toContain('function startReveal(then)')
    expect(race).toContain('S.rides = assign; save()')
    expect(race).toContain('S.rides = {};')
    expect(race).toContain('return KruRacing.color(S.rides[t.id])')
  })
  it('the board piece is the ride itself and the scoreboard shows it', () => {
    expect(race).toContain('<i class="piece ride')
    expect(race).toContain('<span class="lgv">')
  })
})

describe('Quiz Island: pirate crew mascots', () => {
  const qi = read('public/games/quiz-island/app.js')
  const art = read('public/games/quiz-island/art.js')
  it('ten crew members, drawn at random in the opening reveal, in a captain\'s cabin', () => {
    expect(art).toContain("var CREW_NAMES = ['Captain Redbeard', 'Skeleton Sam', 'Mermaid Marina', 'Parrot Pete', 'Cook Biscuit', 'Admiral Ironclad', 'Cabin Boy Finn', 'Lady Cutlass', 'Gunner Gus', 'Lookout Lulu'];")
    expect((art.match(/^\s+\/\/ \d+ /gm) ?? []).length).toBe(10)
    expect(qi).toContain("skin: 'cabin'")
    expect(qi).toContain('S.crew = assign; save()')
  })
  it('the team colour is its mascot colour, shown on the scoreboard, the turn label and the podium', () => {
    expect(qi).toContain('return ART.crewColor(S.crew[id])')
    expect(qi).toContain("mascot(t.id, 'crew')")
    expect(qi).toContain("mascot(cur.id, 'crew sm')")
    expect(qi).toContain('art: S && S.crew && S.crew[t.id] != null ? ART.crew(')
  })
})

describe('Point 1-4: LM2 only on his credit slide; pop-ups are animated cartoons', () => {
  const fo = read('public/games/fortress/app.js')
  it('LM2 is no longer in the pop-ups', () => {
    expect(fo).not.toContain("$('fxJob')")
    expect(read('public/games/fortress/index.html')).not.toContain('id="fxJob"')
    expect(read('public/games/fortress/content.json')).toContain('Made with LM2')
  })
  it('every pop-up picture is wrapped in an animated scene (ART.sc), with CSS animations, no emoji', () => {
    expect((fo.match(/art: ART\.sc\(/g) ?? []).length).toBeGreaterThanOrEqual(30)
    const css = read('public/games/fortress/style.css')
    for (const k of ['sc-weapon', 'sc-boom', 'sc-shield', 'sc-repair', 'sc-coin', 'sc-alliance', 'sc-risk', 'sc-ruins', 'sc-trophy', 'sc-incorrect']) expect(css, k).toContain(`.${k}`)
    for (const k of ['sc-fly', 'sc-smoke', 'sc-spin', 'sc-ring']) expect(css, k).toContain(`@keyframes ${k}`)
    expect(read('public/games/fortress/art.js')).toContain('A.sc = function (kind, inner)')
  })
})
