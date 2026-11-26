import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Henry, Nov 26: the pop-ups of Quiz Island, Battle of Wits, Quiz Grand Prix and North Pole Grand Prix should move like
// RedPoint's. Shared scenes: games/shared/kru-scene.js + .css, used by kru-fx.js and by Quiz Island's own banner.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const css = read('public/games/shared/kru-scene.css')
const js = read('public/games/shared/kru-scene.js')

describe('animated pop-up scenes', () => {
  it('every page with the big pop-ups loads the scenes', () => {
    for (const g of ['race-board', 'christmas-race-board', 'quiz-island', 'quiz-battle', 'battle-of-readers', 'battle-of-writers', 'think-tank-showdown']) {
      const html = read(`public/games/${g}/index.html`)
      expect(html, g).toContain('<script src="/games/shared/kru-scene.js"></script>')
      expect(html, g).toContain('<link rel="stylesheet" href="/games/shared/kru-scene.css" />')
      // the scene script comes before the code that uses it
      const at = html.indexOf('kru-scene.js'), use = Math.max(html.indexOf('kru-fx.js'), html.indexOf('src="app.js"'))
      expect(at, g).toBeLessThan(use)
    }
  })
  it('eleven kinds of motion, each with its keyframes, and Reduce Motion stops them', () => {
    for (const k of ['zoom', 'spinout', 'boom', 'bounce', 'spin', 'tumble', 'shake', 'ripple', 'wobble', 'swim', 'pop']) {
      expect(js).toContain(`'${k}'`)
      expect(css).toContain(`.ksc-${k} > svg { animation:`)
    }
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(js).toContain('if (reduced()) return;')
  })
  it('KruFx (both Grand Prix games, the Battle games, Think Tank) wraps every picture in a scene, with a shine, confetti or a flash', () => {
    const fx = read('public/games/shared/kru-fx.js')
    expect(fx).toContain('KruScene.wrap(o.motion || KruScene.kindFor(o.art, o.mood), pic)')
    expect(fx).toContain("KruScene.extras(box.querySelector('.kfx-card'), box, o.mood || 'good')")
  })
  it('Grand Prix: the vehicle zooms in on a right answer and spins out on a wrong one', () => {
    const rb = read('public/games/race-board/app.js')
    expect(rb).toContain("var VMOTION = { right: 'zoom', go: 'zoom'")
    expect(rb).toContain("wrong: 'spinout'")
    expect(rb).toContain('motion: motion, wait: wait || 2700')
  })
  it('Quiz Island: its own banner plays a scene per pop-up (cannons explode, the Kraken swims, gold spins)', () => {
    const qi = read('public/games/quiz-island/app.js')
    expect(qi).toContain('KruScene.wrap(o.motion || motionFor(o), o.art)')
    expect(qi).toContain("'CANNON FIRE!': 'boom'")
    expect(qi).toContain("sea: 'swim'")
    expect(qi).toContain("KruScene.extras(fx.querySelector('.fx-card'), fx, o.mood || 'good')")
  })
})
