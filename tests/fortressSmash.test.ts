import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Point 1-4 has two rule sets (Henry, Nov 25): LM2 = the student's version (unchanged), SMASH = a faster, fairer one.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const js = read('public/games/fortress/app.js')
type Slide = { title: string; text: string[] }
const content = JSON.parse(read('public/games/fortress/content.json')) as { intro: Slide[]; introSmash: Slide[] }

describe('Point 1-4: LM2 and SMASH', () => {
  it('LM2 is copied from the existing constants before anything is switched, and SMASH has its own table', () => {
    expect(js).toContain('lm2: { MAXHP: clone(MAXHP), ITEMS: clone(ITEMS), SHOOT: clone(SHOOT)')
    expect(js).toContain('smash: { MAXHP: { hq: 3200, depot: 2000, t1: 1400, t2: 1400 }')
    expect(js).toContain('function applyRules(name)')
    expect(js).toContain("var rules = S && S.rules ? S.rules : 'smash'")
  })
  it('the player chooses SMASH or LM2 before the first question; the first question locks it; old saves are LM2', () => {
    expect(js).toContain("title: 'Choose the rules'")
    expect(js).toContain('S.started = true')
    expect(js).toContain("var open = !S.started && S.round === 1")
    expect(js).toContain("S.rules = S.rules || 'lm2'")
    expect(read('public/games/fortress/index.html')).toContain('id="rulesBtn"')
  })
  it('SMASH: no store or repair phase, a right answer picks a weapon for its difficulty and fires at once', () => {
    expect(js).toContain("if (S.phase === 'turn' && isSmash()) { endRound(); return; }")
    expect(js).toContain("var SM_OPTS = { easy: ['crude'], regular: ['bomb', 'scatter'], hard: ['missile', 'dual', 'jammer'], impossible: ['avangard', 'tos', 'jammer'] }")
    expect(js).toContain('function smashReward(id, tier, rk)')
    expect(js).toContain('function smashArm(id, key, rk)')
    expect(js).toContain('if (streakOn) keys.unshift(')
  })
  it('SMASH: towers are armor (15% each, max 30%), nothing is shot down; no alliances', () => {
    expect(js).toContain('SHOOT: { LQ: 0, Q: 0, HQ: 0 }, RES: 0.15, RES_CAP: 0.3')
    expect(js).toContain('armor blocks')
    expect(js).toContain('return !isSmash() && S.phase')
  })
  it('SMASH: every one of the student\'s nine weapons is in it, and each does damage or jams', () => {
    const smashItems = js.slice(js.indexOf('var SM_ITEMS = {'), js.indexOf('var SM_OPTS'))
    for (const k of ['crude', 'bomb', 'scatter', 'missile', 'dual', 'jammer', 'tos', 'avangard', 'sarmat']) expect(smashItems, k).toContain(`${k}: { name:`)
  })
  it('SMASH slides: 2-6, short titles, at most 2 short lines, credit to LM2 kept', () => {
    expect(content.introSmash.length).toBeGreaterThanOrEqual(2)
    expect(content.introSmash.length).toBeLessThanOrEqual(6)
    for (const s of content.introSmash) {
      expect(s.title.length, s.title).toBeLessThanOrEqual(30)
      expect(s.text.length, s.title).toBeLessThanOrEqual(2)
      for (const l of s.text) expect(l.length, l).toBeLessThanOrEqual(90)
    }
    expect(JSON.stringify(content.introSmash)).toContain('Made with LM2')
    expect(content.intro).toHaveLength(6) // LM2's slides are untouched
  })
})
