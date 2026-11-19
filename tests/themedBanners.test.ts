import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Themed event banners (Henry, Nov 19): Quiz Island style "moments" in seven more games, via shared kru-fx.js.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const fx = read('public/games/shared/kru-fx.js')
const art = read('public/games/shared/kru-fx-art.js')

describe('shared banner engine', () => {
  it('big banners (queued, tap or wait) and quick ones at the top that never block a tap', () => {
    expect(fx).toContain('show: function (o) { build(); queue.push(o); if (!on) next(); }')
    expect(fx).toContain('flash: function (o) {')
    expect(read('public/games/shared/kru-fx.css')).toMatch(/\.kfx-flash \{[\s\S]*pointer-events: none;/)
  })
  it('a look per game theme, and Reduce Motion stops the movement', () => {
    const css = read('public/games/shared/kru-fx.css')
    for (const t of ['race', 'xmas', 'show', 'lab', 'arena', 'library', 'quill']) expect(css, t).toContain(`.kfx.t-${t} {`)
    expect(css).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*\.kfx\.go \.kfx-rays/)
  })
  it('every picture the games ask for is drawn', () => {
    const names = ['trophy', 'star', 'cross', 'dice', 'stopwatch', 'ticket', 'shield', 'fifty', 'flame', 'crown', 'hourglass', 'checkflag', 'rocket', 'oil', 'cone', 'pit',
      'gift', 'coal', 'sleigh', 'snowflake', 'tree', 'spotlight', 'buzzer', 'double', 'bulb', 'flask', 'brain', 'chips', 'swords', 'book', 'quill']
    for (const n of names) expect(art, n).toContain(`${n}: function`)
  })
})

describe('games with banners', () => {
  const pages = ['race-board', 'christmas-race-board', 'jeopardy', 'think-tank-showdown', 'quiz-battle', 'battle-of-readers', 'battle-of-writers']
  it('each page loads the banner engine and its pictures', () => {
    for (const g of pages) {
      const html = read(`public/games/${g}/index.html`)
      expect(html, g).toContain('/games/shared/kru-fx.js')
      expect(html, g).toContain('/games/shared/kru-fx-art.js')
      expect(html, g).toContain('/games/shared/kru-fx.css')
    }
  })
  it('Quiz Dash (race) and Christmas Dash (Christmas): right, wrong, Risk it, shield, squares, finish, power-ups', () => {
    const js = read('public/games/race-board/app.js')
    expect(js).toContain("if (window.KruFx) KruFx.theme(c.christmas ? 'xmas' : 'race');")
    for (const k of ['right:', 'wrong:', 'riskWin:', 'riskLose:', 'shield:', 'go:', 'back:', 'again:', 'finish:', 'free:', 'fifty:', 'time:', 'riskOn:', 'skip:']) expect(js, k).toContain(k)
    expect(js).toContain("['gift', 'HO HO HO!'")
    expect(js).toContain("['checkflag', 'CORRECT!'")
    expect(js).toContain("fx(rk ? 'riskWin' : 'right', { t: tn }, function () { roll(id, spec); });")
  })
  it('Jeopardy (game show): DOUBLE, right / wrong / Risk it, power-ups, the end of the board', () => {
    const js = read('public/games/jeopardy/app.js')
    expect(js).toContain("KruFx.theme('show')")
    for (const t of ["title: 'DOUBLE!'", "'CORRECT!'", "'BZZZT! WRONG!'", "'RISK PAID OFF!'", "title: \"THAT'S THE BOARD!\"", "title: 'FREE PLAY!'"]) expect(js, t).toContain(t)
  })
  it('Think Tank Showdown (brain lab): each new round, points, ALL IN wins and losses', () => {
    const js = read('public/games/think-tank-showdown/app.js')
    expect(js).toContain("KruFx.theme('lab')")
    for (const t of ["'ALL IN… AND WON!'", "'ALL IN… AND LOST!'", "title: 'ROUND ' + (r + 1)"]) expect(js, t).toContain(t)
  })
  it('the Battles (arena, library, quill): round start, pens down, bonuses, the round champion', () => {
    const engine = read('public/games/shared/kru-battle.js')
    expect(engine).toContain("var THEME_ART = { arena: 'swords', library: 'book', quill: 'quill' };")
    for (const t of ["title: 'ROUND ' + (S.round + 1) + '!'", "title: 'PENS DOWN!'", "' CHAMPION!'"]) expect(engine, t).toContain(t)
    expect(read('public/games/quiz-battle/app.js')).toContain("theme: 'arena',")
    expect(read('public/games/battle-of-readers/app.js')).toContain("theme: 'library',")
    expect(read('public/games/battle-of-writers/app.js')).toContain("theme: 'quill',")
  })
})
