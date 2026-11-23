import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const js = read('public/games/fortress/app.js')
const games = JSON.parse(read('games.json')) as { slug: string; [k: string]: unknown }[]

describe('Fortress (Henry, Nov 23)', () => {
  it('is in the library: always four teams, group only, with units', () => {
    expect(games.find((g) => g.slug === 'fortress')).toMatchObject({ status: 'ready', modes: ['group'], fixedTeams: 4, units: true, section: 'quizzes' })
  })
  it('bases: HQ 10,000, Depot 7,000, two Towers 8,000; 450 HP healing per round', () => {
    expect(js).toContain('var MAXHP = { hq: 10000, depot: 7000, t1: 8000, t2: 8000 };')
    expect(js).toContain('var ROUND_HEAL = 450,')
  })
  it("the store has Henry's nine items and prices", () => {
    for (const p of ['dmg: 100, price: 200', 'dmg: 250, price: 350', 'dmg: 180, price: 500', 'dmg: 500, price: 1500', 'dmg: 350, price: 2400', 'price: 4000', 'dmg: 2000, price: 10000', 'dmg: 4000, price: 15000', 'dmg: 9000, price: 30000']) expect(js).toContain(p)
    expect(js).toContain('var KIT = 300, KIT_RISE = 200, KIT_HP = 1000;')
  })
  it('towers shoot down [LQ] 100%, [Q] 32%, [HQ] 16% (Sarmat 1%); 5% resistance (max 17%); allies +10% HQ', () => {
    expect(js).toContain('var SHOOT = { LQ: 1, Q: 0.32, HQ: 0.16 };')
    expect(js).toContain('chance: 0.01')
    expect(js).toContain('RES = 0.05, RES_CAP = 0.17, ALLY_HQ = 0.1')
  })
  it('no Depot: bombs 20% weaker, [Q] and better 1.6x; a destroyed HQ asks for a sacrifice', () => {
    expect(js).toContain('NO_DEPOT_DMG = 0.8, NO_DEPOT_PRICE = 1.6')
    expect(js).toContain('function hqFell(id, next)')
  })
  it('the TOS-2M curses the hit team: its next bomb may explode in its own Depot', () => {
    expect(js).toContain('CURSE_CHANCE = 0.4')
    expect(js).toContain('exploded in the Depot')
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
    expect(js).toContain('function dissolveAlliances()') // two bases left: every alliance ends
  })
  it('credits Job by first name only, with a drawn avatar', () => {
    const c = JSON.parse(read('public/games/fortress/content.json')) as { intro: { title: string; text: string[] }[] }
    expect(JSON.stringify(c.intro)).toContain('Job')
    expect(read('public/games/fortress/art.js')).toContain('job: function')
    expect(c.intro.length).toBeLessThanOrEqual(6)
    for (const s of c.intro) { expect(s.title.length).toBeLessThanOrEqual(30); for (const l of s.text) expect(l.length).toBeLessThanOrEqual(90) }
  })
  it('the store is one screen in the buying team color with a shopping cart (Henry, Nov 23)', () => {
    const h = read('public/games/fortress/index.html')
    expect(h).toContain('id="shopGrid"')
    expect(h).toContain('id="shopCart"')
    expect(js).toContain("$('shop').style.setProperty('--c', color(id));")
    expect(js).toContain('cart.items[key] = (cart.items[key] || 0) + 1;')
    expect(read('public/games/fortress/style.css')).toContain('grid-template-columns: repeat(5, minmax(0, 1fr));')
  })
  it('firing: tap the team first, then a menu with each building and what it does, then the target', () => {
    expect(js).toContain('function openTarget(tid)')
    expect(js).toContain("var b = e.target.closest('.base.target');")
    expect(js).toContain('The headquarters. If it falls the team is out')
    expect(read('public/games/fortress/index.html')).toContain('id="aimGrid"')
  })
})
