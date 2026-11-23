import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import games from '../games.json'
import { findGame, gameTitle } from '../src/lib/games'

// Nov 23, phase A: the shared settings menu (floating ✕, New Game + End Game side by side), the alarm-clock timer,
// and Jeopardy removed.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const menuJs = read('public/games/shared/kru-menu.js')
const win: { KruMenu?: { snap: (v: unknown, min?: number, max?: number) => number } } = {}
runInNewContext(menuJs, { window: win, document: { readyState: 'complete', getElementById: () => null, addEventListener: () => {} }, MutationObserver: class {} })

describe('shared timer control', () => {
  it('whole 10-second steps between 10 and 300; old saved times snap (45 → 50, 25 → 30, junk → 30)', () => {
    const snap = win.KruMenu!.snap
    expect([snap(45), snap(25), snap(30), snap(5), snap(999), snap('x'), snap(undefined)]).toEqual([50, 30, 30, 10, 300, 30, 30])
  })
  it('an alarm clock, a minus, a box with "30s" and a plus', () => {
    expect(menuJs).toContain("class=\"ktimer-ic\"")
    expect(menuJs).toContain("'<output aria-live=\"polite\">' + v + 's</output>'")
    expect(menuJs).toContain('data-d="-1"')
  })
  it('Quiz Dash, Christmas Dash, Quiz Island and the Battles use it, with a 30-second start', () => {
    for (const f of ['race-board/app.js', 'quiz-island/app.js', 'shared/kru-battle.js']) expect(read(`public/games/${f}`), f).toContain('KruMenu.timer($(')
    expect(read('public/games/race-board/app.js')).toContain('secs: 30, last: null,')
    expect(read('public/games/quiz-island/app.js')).toContain('secs: S ? S.secs : 30,')
    expect(read('public/games/shared/kru-battle.js')).toContain("KruMenu.timer($('readRow'), S.readSecs || 60,") // Readers: two timers
    expect(read('public/games/shared/kru-battle.js')).toContain('Time per question')
    expect(read('public/games/shared/kru-battle.js')).toContain('Time to read the story')
  })
})

describe('shared settings menu', () => {
  it('every game page loads kru-menu.js', () => {
    for (const d of readdirSync(new URL('../public/games', import.meta.url))) {
      if (!existsSync(new URL(`../public/games/${d}/index.html`, import.meta.url))) continue
      expect(read(`public/games/${d}/index.html`), d).toContain('/games/shared/kru-menu.js')
    }
  })
  it('the Close button is hidden and replaced by a floating ✕; New Game + End Game sit at the bottom', () => {
    expect(menuJs).toContain('close.hidden = true;')
    expect(menuJs).toContain("x.className = 'kmenu-x'")
    expect(menuJs).toContain("var RESETS = ['restart', 'kbtReset', 'newGame', 'resetScores'];")
    const css = read('public/games/shared/kru-game.css')
    expect(css).toMatch(/\.kmenu-foot \{[\s\S]*display: flex;[\s\S]*position: sticky;/)
    expect(css).toContain('.kmenu-foot .btn { flex: 1 1 0;')
  })
  it('the buttons are called New Game and End Game everywhere', () => {
    expect(read('public/games/shared/kru-end.js')).toContain("btn.textContent = 'End Game';")
    for (const f of ['race-board/index.html', 'christmas-race-board/index.html', 'quiz-island/index.html', 'think-tank-showdown/index.html', 'word-rush/index.html', 'tag-team/index.html']) {
      const h = read(`public/games/${f}`)
      expect(h, f).toContain('>New Game</button>')
      expect(h, f).not.toMatch(/Reset all scores|Start the race again|New game \(/)
    }
    expect(read('public/games/shared/kru-battle.js')).toContain('<button class="btn ghost danger" id="kbtReset">New Game</button>')
  })
})

describe('Jeopardy is gone', () => {
  it('not in the library or on disk; old sessions keep the name', () => {
    expect(games.some((g) => g.slug === 'jeopardy')).toBe(false)
    expect(existsSync(new URL('../public/games/jeopardy', import.meta.url))).toBe(false)
    expect(findGame('jeopardy')).toBeUndefined()
    expect(gameTitle('quiz-board')).toBe('Jeopardy')
  })
  it('no lesson pack or unit list still offers it', () => {
    for (const f of ['public/units/index.json', 'public/units/m3-u8-l1.json', 'public/units/m3-u8-l2.json', 'public/units/m3-u8-review.json']) expect(read(f), f).not.toContain('"jeopardy"')
    expect(read('src/lib/units.ts')).not.toContain("'jeopardy'")
  })
})
