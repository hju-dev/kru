import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

describe('Phase D podiums (Henry, Nov 23)', () => {
  it('Battle of Readers: piles of books for the steps', () => {
    const css = read('public/games/battle-of-readers/style.css')
    expect(css).toContain('three piles of books')
    expect(css).toContain('.kp-step {')
    expect(css).toContain('repeating-linear-gradient(180deg')
  })
  it('Battle of Writers: bundles of pencils with pointed tips', () => {
    const css = read('public/games/battle-of-writers/style.css')
    expect(css).toContain('bundles of pencils and pens')
    expect(css).toContain('clip-path: polygon(')
    expect(css).toContain('.p1 .kp-step')
  })

  it('Battle games: the material students look at is black on white; instructions and the yellow lines keep their style (Henry, Nov 24)', () => {
    const css = read('public/games/shared/kru-battle.css')
    expect(css).toContain('.kbt-q.kbt-mat, .kbt-rq.kbt-mat { background: #fff; color: #111;')
    expect(css).toContain('.kbt-quote { background: #fff; color: #111; }')
    expect(css).toContain('.kbt-story p { background: #fff; color: #111;')
    expect(css).not.toMatch(/\.kbt-hint\s*\{[^}]*#fff/)
    expect(read('public/games/shared/kru-battle.js')).toContain("(x.quote ? '' : ' kbt-mat')")
  })
})
