import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import games from '../games.json'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

describe('Dice, Spinner, Coin (Nov 25)', () => {
  const js = read('public/games/dice-spinner/app.js')
  const html = read('public/games/dice-spinner/index.html')
  const css = read('public/games/dice-spinner/style.css')
  it('is renamed, the slug stays', () => {
    const g = games.find((x) => x.slug === 'dice-spinner')!
    expect(g.title).toBe('Dice, Spinner, Coin')
  })
  it('the spin is fast and dramatic (14 turns, 4.4 s, a glowing wheel)', () => {
    expect(js).toContain('var turns = 14 * 360;')
    expect(css).toContain('transform 4.4s')
    expect(css).toContain('.wheel-wrap.spinning')
  })
  it('a random effect plays when someone is picked (confetti, fire, tornado, fireworks, stars, lightning, bubbles) with a louder fanfare', () => {
    expect(js).toContain("var EFFECTS = ['confetti', 'fire', 'tornado', 'fireworks', 'stars', 'lightning', 'bubbles'];")
    expect(js).toContain('EFFECTS[Math.floor(Math.random() * EFFECTS.length)]')
    expect(js).toContain('function fanfare()')
    expect(js).toContain('prefers-reduced-motion')
  })
  it('the announcement is a centred pop-up; the wheel and the text are centred', () => {
    expect(html).toContain('id="pickPop"')
    expect(css).toContain('.pick-pop { position: absolute; inset: 0;')
    expect(css).toContain('.spin-stage { justify-content: center;')
  })
  it('the last team can still be spun (one option left), and the buttons update when nobody is left', () => {
    expect(js).toContain('if (spinning || list.length < 1) return;')
    expect(js).toContain("$('spin').disabled = n < 1 || spinning;")
    expect(js).toContain('Last one! You can still spin it.')
  })
  it('the coin: the Kru owl on heads, the Kru logo on tails', () => {
    expect(html).toContain('class="face heads"')
    expect(html).toContain('src="/kru-logo.svg"')
  })
})

describe('Gossip Circle (Nov 25 tweaks)', () => {
  const js = read('public/games/group-maker/app.js')
  const html = read('public/games/group-maker/index.html')
  const css = read('public/games/group-maker/style.css')
  it('3 questions by default; the timer is in the settings (global KruMenu.timer), the old pop-up is gone', () => {
    expect(js).toContain('size: 3, qn: 3')
    expect(html).toContain('id="timerStep"')
    expect(html).not.toContain('id="timerBack"')
    expect(js).toContain('KruMenu.timer($(\'timerStep\')')
  })
  it('every group has its own colour, with a lighter number circle, and the legend sits in the same container', () => {
    expect(js).toContain('TEAM_COLORS[gi % TEAM_COLORS.length]')
    expect(css).toContain('.card .gn { background: color-mix(in srgb, var(--gc, #ffb703) 70%, #ffffff);')
    expect(js).toContain("cardsHtml(r.groups, { q: r.q }) + legend + '</div>'")
  })
})

describe('Quiz Island (Nov 25 tweaks)', () => {
  const js = read('public/games/quiz-island/app.js')
  const css = read('public/games/quiz-island/style.css')
  const art = read('public/games/quiz-island/art.js')
  it('the power-up buttons are big solid colours', () => {
    expect(css).toContain(".powers .pw[data-pw='fifty'] { background: #ffe566; }")
    expect(css).toContain('min-height: 54px')
  })
  it('using a power-up, and a right answer, each get a pop-up', () => {
    for (const t of ["title: '50 / 50!'", "title: '+20 SECONDS!'", "title: 'FREE PLAY!'", "title: 'PIRATE RAID ARMED!'", 'ART.correct()']) expect(js).toContain(t)
    expect(js).toContain('quick: true')
    expect(js).toContain('function cheer(t)')
  })
  it('"Land ho!" is one of 8 sayings, each with its own island picture', () => {
    expect(js.match(/\{ t: '[A-Z !]+', s: '/g)?.length).toBe(8)
    expect(js).toContain('ART.isleV(is.v, col)')
    expect((art.match(/^ {4}function \(c\) \{ return svg\(waves/gm) ?? []).length).toBeGreaterThanOrEqual(8)
  })
})

describe('Grand Prix dice: easy and regular questions roll one fair die', () => {
  const js = read('public/games/race-board/app.js')
  it('easy and regular = 1 ordinary die (1-6, every face equally likely), no weighting anywhere in the roll', () => {
    expect(js).toContain("easy: { label: 'Easy', share: 30, dice: 1, big: false, note: '1 die' }")
    expect(js).toContain("regular: { label: 'Regular', share: 45, dice: 1, big: false, note: '1 die' }")
    expect(js).toContain('function face(big) { return big ? BIG_MIN + Math.floor(Math.random() * 6) : 1 + Math.floor(Math.random() * 6); }')
    const roll = js.slice(js.indexOf('function roll(id, spec)'), js.indexOf('// ---------- undo'))
    expect(roll).not.toContain('weighted(')
  })
  it('the North Pole Grand Prix runs the same engine, so it rolls the same fair die', () => {
    expect(read('public/games/christmas-race-board/index.html')).toContain('race-board/app.js')
  })
})
