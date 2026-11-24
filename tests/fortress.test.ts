import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const js = read('public/games/fortress/app.js')
const games = JSON.parse(read('games.json')) as { slug: string; [k: string]: unknown }[]

describe('Point 1-4, id fortress (Henry, Nov 23-24): modern military theme', () => {
  it('is titled Point 1-4 everywhere the player sees it; the id stays fortress', () => {
    expect(games.find((g) => g.slug === 'fortress')).toMatchObject({ title: 'Point 1-4', status: 'ready', modes: ['group'], fixedTeams: 4, units: true, section: 'quizzes' })
    expect(read('public/games/fortress/index.html')).toContain('<title>Point 1-4</title>')
    expect(js).toContain("{ title: 'Point 1-4' }")
  })
  it('lower HP for a faster game: HQ 1,200, Depot 800, Towers 900; 20 HP healing per round', () => {
    expect(js).toContain('var MAXHP = { hq: 1200, depot: 800, t1: 900, t2: 900 };')
    expect(js).toContain('var ROUND_HEAL = 20,')
  })
  it('lower prices: 2 regular questions buy [Q] items, 5 regular buy [HQ] items; question gold unchanged', () => {
    const price = (k: string) => Number(js.match(new RegExp(`${k}: \\{[^}]*price: (\\d+)`))![1])
    const regular = 375
    for (const k of ['missile', 'dual', 'jammer']) expect(price(k), k).toBeLessThanOrEqual(2 * regular)
    for (const k of ['tos', 'avangard', 'sarmat']) expect(price(k), k).toBeLessThanOrEqual(5 * regular)
    expect(js).toContain('var GOLD = { easy: 225, regular: 375, hard: 750, impossible: 1350 };')
  })
  it('the High Speed Missile does 25% more damage (625)', () => {
    expect(js).toMatch(/missile: \{[^}]*dmg: 625,/)
  })
  it('towers: [LQ] 35%, [Q] 20%, [HQ] 10%, Sarmat 1%; one tower = half; 5% resistance (max 17%)', () => {
    expect(js).toContain('var SHOOT = { LQ: 0.35, Q: 0.2, HQ: 0.1 };')
    expect(js).toContain('chance: 0.01')
    expect(js).toContain('* Math.min(1, towers(id) / 2)')
    expect(js).toContain('RES = 0.05, RES_CAP = 0.17, ALLY_HQ = 0.1')
  })
  it('no Depot: question gold halved, [Q] and better 1.6x, no healing', () => {
    expect(js).toContain('NO_DEPOT_GOLD = 0.5, NO_DEPOT_PRICE = 1.6')
  })
  it('repair kits are kept in the inventory and can rebuild a destroyed building; the HQ can come back with a kit', () => {
    expect(js).toContain('d.kits++')
    expect(js).toContain('function useKit(id)')
    expect(js).toContain("'destroyed · rebuild it'")
    expect(js).toContain('function hqFell(id, next)')
    expect(js).toContain('Buy and use a repair kit')
    expect(js).toContain('EMERGENCY REPAIRS!')
  })
  it('Question Change replaces +20 s: a Hard or Impossible question; it cannot be stacked with Free Answer', () => {
    expect(js).toContain("{ id: 'change', label: '🔁 Question Change' }")
    expect(js).not.toContain("label: '+20 s'")
    expect(js).toContain("(p.id === 'free' && (risk || Q._changed))")
    expect(js).toContain('function changeQuestion(tier)')
  })
  it('an eliminated team joins a remaining team and shares its points; beating an alliance is noted for the grading', () => {
    expect(js).toContain('function joinChoice(id, done)')
    expect(js).toContain('the team that destroyed you')
    expect(js).toContain('return finalPts(S.joined[id])')
    expect(js).toContain('function allianceBeaten(winner)')
    expect(js).toContain('bonus points in the grading!')
  })
  it('the game ends after 4 rounds by default: the strongest base wins', () => {
    expect(js).toContain('var DEFAULT_ROUNDS = 4;')
    expect(js).toContain('function timesUp()')
    expect(read('public/games/fortress/index.html')).toContain('id="roundsRow"')
  })
  it('the store is Haishi Trade Company: one screen in the buying team color, the buyer and gold together, the inventory and the cart', () => {
    const h = read('public/games/fortress/index.html')
    expect(h).toContain('HAISHI TRADE COMPANY')
    for (const id of ['shopBuyer', 'shopGrid', 'shopInv', 'shopCart']) expect(h).toContain(`id="${id}"`)
    expect(js).toContain("$('shop').style.setProperty('--c', color(id));")
    expect(js).toContain('cart.items[key] = (cart.items[key] || 0) + 1;')
    expect(js).toContain(" is buying</b>'")
  })
  it('weapons are drawn as bombs and rockets; the bases are military', () => {
    const art = read('public/games/fortress/art.js')
    expect(art).toContain('weapon: function (key)')
    for (const k of ['crude', 'bomb', 'scatter', 'missile', 'dual', 'jammer', 'tos', 'avangard', 'sarmat']) expect(art).toContain(`case '${k}'`)
    expect(art).toContain('a command bunker')
  })
  it('teacher tools give gold, kits, weapons and repairs at any time', () => {
    expect(js).toContain('function openTools()')
    expect(read('public/games/fortress/index.html')).toContain('id="toolsBtn"')
    for (const a of ['data-tg', 'data-tk', 'data-ti', 'data-tb']) expect(js).toContain(a)
  })
  it('the podium is war themed', () => {
    expect(read('public/games/fortress/style.css')).toContain('The podium: war themed')
  })
  it('power-ups once each, Alliance (both teams skip); allies end at two bases', () => {
    for (const p of ["{ id: 'free', label: 'Free Answer' }", "{ id: 'risk', label: '🎲 Risk It' }"]) expect(js).toContain(p)
    expect(js).toContain('S.skip[b] = true')
    expect(js).toContain('function askPartner(a, b)')
    expect(js).toContain('function dissolveAlliances()')
    expect(js).toContain('every building except the HQ loses half of its starting HP')
  })
  it('points by place: 5 / 3 / 2 / 1', () => {
    expect(js).toContain('var PLACE_PTS = [5, 3, 2, 1];')
    expect(js).toContain('function checkEnd()')
  })
  it('credits LM2, with a drawn avatar', () => {
    const c = JSON.parse(read('public/games/fortress/content.json')) as { intro: { title: string; text: string[] }[] }
    expect(JSON.stringify(c.intro)).toContain('LM2')
    expect(JSON.stringify(c.intro)).not.toContain('Job')
    expect(read('public/games/fortress/art.js')).toContain('job: function')
    expect(c.intro.length).toBeLessThanOrEqual(6)
    for (const s of c.intro) {
      expect(s.title.length).toBeLessThanOrEqual(30)
      for (const l of s.text) expect(l.length).toBeLessThanOrEqual(90)
    }
  })
  it('firing: tap the team first, then a menu with each building and what it does, then the target', () => {
    expect(js).toContain('function openTarget(tid)')
    expect(js).toContain("var b = e.target.closest('.base.target');")
    expect(js).toContain('The command HQ. If it falls the team is out')
    expect(read('public/games/fortress/index.html')).toContain('id="aimGrid"')
  })
})
