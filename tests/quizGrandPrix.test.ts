import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Quiz Grand Prix (the old Quiz Dash, Henry Nov 25): the racing theme. Christmas Dash is untouched.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const js = read('public/games/race-board/app.js')
const racing = read('public/games/race-board/racing.js')
const games = JSON.parse(read('games.json')) as { slug: string; title: string }[]

describe('Quiz Grand Prix: racing theme', () => {
  it('has a new name; Christmas Dash keeps its own page without the racing file', () => {
    expect(games.find((g) => g.slug === 'race-board')!.title).toBe('Quiz Grand Prix')
    expect(read('public/games/race-board/index.html')).toContain('<script src="racing.js"></script>')
    expect(read('public/games/christmas-race-board/index.html')).not.toContain('racing.js')
    expect(read('public/games/christmas-race-board/index.html')).toContain('<script src="xmas-rides.js"></script>')
    expect(js).toContain('RACING = !!window.KruRacing')
  })
  it('ten different vehicles, one per team colour (by the team\'s place in the list)', () => {
    expect(racing).toContain("var NAMES = ['Formula racer', 'Sports car', 'Pickup truck', 'Motorbike', 'Monster truck', 'Tuk-tuk', 'Go-kart', 'Rocket dragster', 'Bus', 'Jeep'];")
    expect((racing.match(/^\s+\/\/ \d+ /gm) ?? []).length).toBe(10)
    expect(js).toContain('KruRacing.vehicle(rideIdx(t), color(t))')
  })
  it('the vehicle shows in the pop-ups (right, wrong, moves, finish) and "is up" at the start of every turn', () => {
    expect(js).toContain("var VEHICLE_FX = ['right', 'wrong', 'riskWin', 'riskLose', 'shield', 'go', 'back', 'again', 'finish', 'free', 'skip', 'bounce'];")
    expect(js).toContain("title: t.name + ' is up!'")
    expect(js).toContain('upFlash();')
  })
  it('a mix of racing puns for moving, with 8+ for a right answer and racing lines for a wrong one', () => {
    const rt = (racing.match(/right: \[(.*?)\]\],/s) ?? [''])[0]
    expect((rt.match(/\['/g) ?? []).length).toBeGreaterThanOrEqual(8)
    for (const k of ['go', 'back', 'again', 'finish']) expect(racing, k).toContain(`${k}: [[`)
    expect(racing).toContain('PEDAL TO THE METAL!')
    expect(js).toContain('rot(\'rp\' + key, KruRacing.POOLS[key])')
  })
  it('every chance card is told as a racing story, and the secret trap and slide too (same effects)', () => {
    for (const id of ['back2', 'ahead3', 'ahead1', 'roll2', 'again', 'dbl', 'skip', 'mathsci', 'swap', 'shield', 'others', 'leap']) expect(racing, id).toMatch(new RegExp(String.raw`${id}: \['[A-Z ]+!'`))
    expect(racing).toContain('Secret road block!')
    expect(racing).toContain('Secret shortcut!')
    // the effects are still in the code, untouched
    for (const id of ['back2: function () { move(id, -2', 'ahead3: function () { move(id, 3', 'others: function', 'leap: function']) expect(js, id).toContain(id)
  })
  it('swapping places shows an overtake pop-up with both vehicles', () => {
    expect(js).toContain('title: KruRacing.OVERTAKE.title')
    expect(js).toContain('KruRacing.overtake(rideIdx(fwd)')
    expect(racing).toContain('function overtake(ia, ca, na, ib, cb, nb)')
    expect(read('public/games/race-board/style.css')).toContain('@keyframes ovt-a')
  })
  it('the podium is racing themed and shows each team\'s vehicle', () => {
    expect(js).toContain('art: RACING ? KruRacing.vehicle(rideIdx(t), color(t)) : \'\'')
    expect(read('public/games/shared/kru-end.js')).toContain('<span class="kp-art">')
    const css = read('public/games/race-board/style.css')
    expect(css).toContain('.gp .kp-step')
    expect(css).toContain('repeating-conic-gradient(#f4f1ea 0 25%, #1b1b1f 0 50%)')
  })
  it('every game that lists the Quiz Grand Prix questions uses the new name', () => {
    for (const f of ['public/games/quiz-island/app.js', 'public/games/fortress/app.js', 'src/lib/sets.ts']) {
      expect(read(f), f).toContain('Quiz Grand Prix questions')
      expect(read(f), f).not.toContain('Quiz Dash questions')
    }
  })
})

describe('North Pole Grand Prix (the old Christmas Dash): the same engine in Christmas', () => {
  const x = read('public/games/christmas-race-board/xmas-rides.js')
  it('is renamed and loads its own rides file that gives the game the same API as racing.js', () => {
    expect(games.find((g) => g.slug === 'christmas-race-board')!.title).toBe('North Pole Grand Prix')
    for (const key of ['vehicle: vehicle', 'overtake: overtake', 'POOLS: POOLS', 'ENC: ENC', 'CHANCE: CHANCE', 'SECRET: SECRET', "PREFIX: '🎄 '", 'OVERTAKE:']) expect(x, key).toContain(key)
  })
  it('ten winter rides, Christmas pop-up pools, all 12 chance cards and the two secret squares retold', () => {
    expect(x).toContain("var NAMES = [\"Santa's sleigh\", 'Reindeer sled', 'Snowmobile', 'Gingerbread van', 'Snowman on skis', 'Penguin toboggan', 'Elf skateboard', 'Polar bear sled', 'Toy train', 'Cocoa mug truck'];")
    expect((x.match(/^\s+\/\/ \d+ /gm) ?? []).length).toBe(10)
    for (const k of ['right', 'riskWin', 'go', 'back', 'again', 'finish', 'shield', 'free']) expect(x, k).toContain(`${k}: [[`)
    for (const id of ['back2', 'ahead3', 'ahead1', 'roll2', 'again', 'dbl', 'skip', 'mathsci', 'swap', 'shield', 'others', 'leap']) expect(x, id).toMatch(new RegExp(String.raw`${id}: \['[A-Z ]+!'`))
    expect(x).toContain('Secret snow trap!')
    expect(x).toContain('Secret ski slope!')
  })
  it('the Grand Prix look (asphalt, checkered podium) is for Quiz Grand Prix only; the overtake scene and ride pictures are shared', () => {
    const css = read('public/games/race-board/style.css')
    expect(css).toContain('.gp .track')
    expect(css).toContain('.ovt.xmas')
    expect(css).toContain('.racing .kp-art')
    expect(js).toContain("document.body.classList.toggle('gp', RACING && !c.christmas)")
  })
})
