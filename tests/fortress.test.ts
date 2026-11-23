import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const js = read('public/games/fortress/app.js')
const games = JSON.parse(read('games.json')) as { slug: string; [k: string]: unknown }[]

describe('Fortress (Henry, Nov 23)', () => {
  it('is in the library: always four teams, group only, with units', () => {
    expect(games.find((g) => g.slug === 'fortress')).toMatchObject({ status: 'ready', modes: ['group'], fixedTeams: 4, units: true, section: 'quizzes' })
  })
  it('bases: HQ 100, Depot 60, two Towers 40', () => {
    expect(js).toContain('var MAXHP = { hq: 100, depot: 60, t1: 40, t2: 40 };')
  })
  it('bombs: four sizes; harder questions make bigger bombs likelier', () => {
    expect(js).toContain('var DMG = [20, 35, 55, 90]')
    expect(js).toContain('easy: [70, 30, 0, 0]')
    expect(js).toContain('impossible: [0, 20, 50, 30]')
  })
  it('towers: block small bombs, 5% resistance (max 17%), 16% shoot-down; allies share towers and depots, +10% HQ', () => {
    expect(js).toContain('ROUND_HEAL = 5, SHOOT = 0.16, RES = 0.05, RES_CAP = 0.17, ALLY_HQ = 0.1')
    expect(js).toContain('if (size === 0 && towers(to) > 0)')
    expect(js).toContain('function depotOk(id)')
  })
  it('a destroyed Depot: only easy and regular questions, no bombs; a destroyed HQ asks for a sacrifice', () => {
    expect(js).toContain("var tiers = depotOk(id) ? ORDER : ['easy', 'regular'];")
    expect(js).toContain('function hqFell(id)')
    expect(js).toContain("{ html: '<b>💣 A bomb</b>")
  })
  it('power-ups: +20 s, Free Answer, Risk It, and the Alliance (both teams skip)', () => {
    for (const p of ["{ id: 'time', label: '+20 s' }", "{ id: 'free', label: 'Free Answer' }", "{ id: 'risk', label: '🎲 Risk It' }"]) expect(js).toContain(p)
    expect(js).toContain('S.skip[b] = true')
    expect(js).toContain('function askPartner(a, b)')
    expect(js).toContain('every building except the HQ loses half of its starting HP')
  })
  it('points by place: 5 / 3 / 2 / 1; last base (or allied last bases) wins', () => {
    expect(js).toContain('var PLACE_PTS = [5, 3, 2, 1];')
    expect(js).toContain('function checkEnd()')
  })
  it('credits Job by first name only, with a drawn avatar', () => {
    const c = JSON.parse(read('public/games/fortress/content.json')) as { intro: { title: string; text: string[] }[] }
    expect(JSON.stringify(c.intro)).toContain('Job')
    expect(read('public/games/fortress/art.js')).toContain('job: function')
    expect(c.intro.length).toBeLessThanOrEqual(6)
    for (const s of c.intro) { expect(s.title.length).toBeLessThanOrEqual(30); for (const l of s.text) expect(l.length).toBeLessThanOrEqual(90) }
  })
})
