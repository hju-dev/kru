import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const js = read('public/games/fortress/app.js')

describe('Point 1-4, id fortress (Henry, Nov 23-24): modern military theme', () => {
  it('Nov 25 stats: HQ 10,000, Depot 6,000, Towers 4,000; the Depot heals 450 per round', () => {
    expect(js).toContain('var MAXHP = { hq: 10000, depot: 6000, t1: 4000, t2: 4000 };')
    expect(js).toContain('var ROUND_HEAL = 450,')
  })
  it('store prices as usual, new damage: crude 250, bomb 750, scatter 650, HSM 1,750, dual 1,500', () => {
    const price = (k: string) => Number(js.match(new RegExp(String.raw`${k}: \{[^}]*price: (\d+)`))![1])
    const dmg = (k: string) => Number(js.match(new RegExp(String.raw`${k}: \{[^}]*dmg: (\d+)`))![1])
    expect(['crude', 'bomb', 'scatter', 'missile', 'dual', 'jammer', 'tos', 'avangard', 'sarmat'].map(price)).toEqual([200, 350, 500, 1500, 2400, 4000, 10000, 15000, 30000])
    expect(['crude', 'bomb', 'scatter', 'missile', 'dual'].map(dmg)).toEqual([250, 750, 650, 1750, 1500])
  })
  it('question gold: base 150/250/500/836, x4.5 in rounds 1-2 and x7.5 from round 3; Risk It pays 5x', () => {
    expect(js).toContain('var GOLD = { easy: 150, regular: 250, hard: 500, impossible: 836 };')
    expect(js).toContain('GOLD_EARLY = 4.5, GOLD_LATE = 7.5, LATE_FROM = 3, RISK_GOLD = 5')
    expect(js).toContain('GOLD[tier] * goldBoost() * (rk ? RISK_GOLD : 1) * goldMult(id)')
  })
  it('the RS-28 Sarmat cannot come from a reward (store only), also not through Risk It', () => {
    expect(js).toContain('impossible: [0, 0, 0, 10, 15, 10, 25, 40, 0]')
    expect(js).toContain("Math.min(IORDER.indexOf('avangard'), i + 1)")
  })
  it('towers: [Q] 16% and [HQ] 8% with both towers (8% / 4% each), [LQ] 100%, Sarmat 1%; one tower = half; 5% resistance (max 17%)', () => {
    expect(js).toContain('var SHOOT = { LQ: 1, Q: 0.16, HQ: 0.08 };')
    expect(js).toContain('chance: 0.01')
    expect(js).toContain('* Math.min(1, towers(id) / 2)')
    expect(js).toContain('RES = 0.05, RES_CAP = 0.17, ALLY_HQ = 0.1')
  })
  it('repair kits: 400 base (+200 per round), +1,350 HP, and usable any number of times at the end of every round', () => {
    expect(js).toContain('var KIT = 400, KIT_RISE = 200, KIT_HP = 1350;')
    expect(js).toContain("startPhase('repair', 'END OF ROUND!'")
    expect(js).toContain('function openRepair()')
    expect(js).toContain("if (S.phase === 'repair' && !canRepair(id))")
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
  it('the game ends after 6 rounds by default: the strongest base wins', () => {
    expect(js).toContain('var DEFAULT_ROUNDS = 6;')
    expect(js).toContain('function timesUp()')
    expect(read('public/games/fortress/index.html')).toContain('id="roundsRow"')
  })
  it('the store: one screen in the buying team color, the buyer and gold together, the inventory and the cart', () => {
    const h = read('public/games/fortress/index.html')
    expect(h).toContain('THE STORE')
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
    for (const p of ["{ id: 'free', label: '🎟 Free Answer' }", "{ id: 'risk', label: '🎲 Risk It' }"]) expect(js).toContain(p)
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

describe('Point 1-4: ties and the whole-base target menu (Nov 25)', () => {
  const js2 = readFileSync(new URL('../public/games/fortress/app.js', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../public/games/fortress/style.css', import.meta.url), 'utf8')
  it('equal health: the most gold left decides, then the most weapons; still equal = a shared place with shared points', () => {
    expect(js2).toContain('return [totalHp(id), T(id).gold, T(id).bombs.length]')
    expect(js2).toContain('cmp(survivors[i - 1], id) === 0 ? out[i - 1].rank')
    expect(js2).toContain('return Math.floor(sum / same)')
    expect(js2).toContain('Nobody won a fight!')
    expect(js2).toContain('are tied for first and share the points!')
  })
  it('TOS-2M / Sarmat / Jammer: the Fire button is first in the target menu and the menu scrolls, so it is never off screen', () => {
    expect(js2).toContain("$('aimGrid').className = 'aim-grid' + (whole ? ' compact' : '')")
    expect(js2).toContain("(whole ? '<button class=\"btn gold aim-go\"")
    expect(css).toContain('.shop.aim { overflow-y: auto; }')
    expect(css).toContain('.aim-grid.compact .acard small { display: none; }')
  })
})
