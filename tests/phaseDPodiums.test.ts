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
})
