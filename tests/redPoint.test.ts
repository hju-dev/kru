import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// RedPoint (Henry, Nov 26): the new name of Point 1-4 (id fortress). Only LM2's rules are left (SMASH removed),
// "HTC" / Haishi is gone, and the hidden teacher panel opens from a square ✦ button.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const js = read('public/games/fortress/app.js')
const html = read('public/games/fortress/index.html')
const content = read('public/games/fortress/content.json')

describe('RedPoint (was Point 1-4)', () => {
  it('is called RedPoint everywhere a player sees it', () => {
    const games = JSON.parse(read('games.json')) as { slug: string; title: string }[]
    expect(games.find((g) => g.slug === 'fortress')?.title).toBe('RedPoint')
    expect(html).toContain('<title>RedPoint</title>')
    expect(html).toContain('<span class="logo"><b>Red</b>Point</span>')
    expect(js).toContain("{ title: 'RedPoint' }")
    for (const f of [html, content]) expect(f).not.toContain('Point 1-4')
  })
  it('only the LM2 rules: no SMASH code, no rules choice, no rules button', () => {
    for (const s of ['isSmash', 'SM_ITEMS', 'smashReward', 'RULESETS', 'applyRules', 'pickRules', 'Choose the rules']) expect(js, s).not.toContain(s)
    expect(html).not.toContain('rulesBtn')
    expect(content).not.toContain('introSmash')
    expect(js).toContain("startPhase('shop', 'THE STORE IS OPEN!'")
    expect(js).toContain("saved.rules !== 'smash'") // a SMASH game in progress starts again with LM2's rules
  })
  it('no HTC / Haishi anywhere; the teacher panel is a square ✦ button', () => {
    for (const f of [js, html, content]) {
      expect(f).not.toContain('HTC')
      expect(f).not.toContain('HTT')
      expect(f).not.toContain('Haishi')
    }
    expect(html).toContain('<button class="btn sq" id="toolsBtn" aria-label="Tools">✦</button>')
    expect(read('public/games/fortress/style.css')).toMatch(/#toolsBtn\.sq \{[^}]*width: 48px;[^}]*height: 48px;/)
    expect(js).toContain('Gold for every team')
  })
})

describe('RedPoint fixes (Henry, Nov 26, round 2)', () => {
  const js2 = read('public/games/fortress/app.js')
  it('a bomb reward works again (gotBomb was lost with SMASH; the game got stuck on the last team)', () => {
    expect(js2).toContain('function gotBomb(id, key)')
    expect(js2).toContain('gotBomb(id, rollItem(tier, rk))')
  })
  it('short top label: "1/6 · TEAM 2"', () => {
    expect(js2).toContain("var rl = S.round + '/' + (S.maxRounds || DEFAULT_ROUNDS), tn = id ? 'TEAM ' + Kru.teamNo(team(id)) : ''")
    expect(js2).not.toContain("\"'s question\"")
  })
  it('rounds can be added any time (up to 30) and when the last round ends', () => {
    expect(js2).toContain('function lastRoundDone(healed)')
    expect(js2).toContain('One more round')
    expect(js2).toContain('Math.min(30,')
  })
  it('the team chooses its question level on four different-looking cards; no level switches in the settings', () => {
    expect(js2).toContain('function openTierPick(id)')
    expect(js2).toContain('askTier(b.dataset.tier)')
    expect(js2).not.toContain('tiersOff')
    expect(read('public/games/fortress/index.html')).not.toContain('tierRow')
    const css = read('public/games/fortress/style.css')
    for (const t of ['easy', 'regular', 'hard', 'impossible']) expect(css).toContain(`.tp-${t} {`)
  })
})

describe('Nov 26 round 3', () => {
  it('RedPoint: Question Change and a missed turn have their own cartoons (no die); a fallen base is captured by its attacker', () => {
    const js3 = read('public/games/fortress/app.js'), art = read('public/games/fortress/art.js')
    expect(art).toContain('orders: function ()')
    expect(art).toContain('jammed: function ()')
    expect(art).toContain('captured: function (c)')
    expect(js3).toContain("title: 'NEW ORDERS!'")
    expect(js3).toContain("ART.sc('orders', ART.orders())")
    expect(js3).toContain("title: 'RADIO SILENCE!'")
    expect(js3).not.toContain("ART.sc('risk', ART.risk()), title: 'NEW ORDERS!'")
    expect(js3).toContain('function captorOf(id)')
    expect(js3).not.toContain('Join which team?')
  })
  it('Quiz Island: slide wording, and a Pirate Raid that cannot use all three attacks can be kept', () => {
    const qi = read('public/games/quiz-island/content.json'), app = read('public/games/quiz-island/app.js')
    for (const w of ['Forces of Nature', '🏴‍☠️ Pirate Raid', '☠ Pirates: miss a turn', 'Kraken: lose half your gold']) expect(qi).toContain(w)
    expect(qi).not.toContain('Storm')
    expect(app).toContain("if (ch.banked || (ch.kind === 'raid' && !enemy)) opts.push({ k: 'keep'")
    expect(app).toContain('rew: !!tier.reward')
  })
  it('North Pole Grand Prix: TEAM 2 label; challenge and forfeit screens with Santa picks, a manual timer and a done button', () => {
    const rb = read('public/games/race-board/app.js'), st = read('public/games/christmas-race-board/xmas-stage.js')
    expect(rb).toContain("'\"></span>TEAM ' + esc(Kru.teamNo(t))")
    expect(rb).toContain("XmasStage.run({ kind: 'challenge'")
    expect(rb).toContain("XmasStage.run({ kind: 'forfeit'")
    expect(read('public/games/christmas-race-board/index.html')).toContain('<script src="xmas-stage.js"></script>')
    for (const w of ['🎅 Santa picks a student', '✅ Take Forfeit', 'Challenge complete', 'Forfeit done: stay put', 'Refuse: roll the back dice']) expect(st).toContain(w)
    // every card in the decks has its own scene
    const c = JSON.parse(read('public/games/christmas-race-board/content.json')).christmas as Record<string, { title: string }[]>
    const titles = [...c.challenge, ...c.forfeit].map((x) => x.title)
    for (const t of titles) expect(st.includes(`'${t}': [`) || st.includes(`"${t}": [`), t).toBe(true)
  })
})
