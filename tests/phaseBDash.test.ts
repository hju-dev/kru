import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Nov 23, phase B: Quiz Dash + Christmas Dash.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const js = read('public/games/race-board/app.js')
const css = read('public/games/race-board/style.css')
const pages = ['race-board', 'christmas-race-board'].map((g) => [g, read(`public/games/${g}/index.html`), read(`public/games/${g}/content.json`)] as const)

describe('Golden Dice (the big dice)', () => {
  it('gold dice with a shine, a gold Impossible label and a gold Risk it button', () => {
    expect(css).toContain('.die.big::after {')
    expect(css).toContain('.tier.impossible { background: linear-gradient(135deg, #ffe58a, #f4b400);')
    expect(css).toContain(".powers .pw[data-pw='risk'] { border-color: var(--gold); }")
    expect(read('public/games/christmas-race-board/christmas.css')).toContain('.die.big .pip {\n  background: #5a3a00;')
  })
  it('every prompt and rule says Golden Dice, never "big purple dice"', () => {
    expect(js).toContain("note: '2 Golden Dice (8+)!!'")
    expect(js).toContain("spec.n + ' Golden ' + (spec.n > 1 ? 'Dice' : 'Die')")
    expect(js).toContain("'{t} rolls 2 GOLDEN DICE!'")
    expect(js).toContain("'Right: 2 Golden Dice. Wrong: 2 Golden Dice back!'")
    for (const [g, , json] of pages) {
      expect(json, g).toContain('"2 Golden Dice (8+)"')
      expect(json, g).toContain('"right 2 Golden Dice, wrong 2 back"')
      expect(json, g).not.toMatch(/big purple dice|2 big dice/)
    }
    expect(js).not.toMatch(/BIG dice|big purple/)
  })
})

describe('question screen', () => {
  it('Reveal first: ✗ Wrong and ✓ Right are hidden until Reveal, then take its place (Wrong left, Right right)', () => {
    for (const [g, html] of pages) {
      expect(html, g).toMatch(/id="reveal">Reveal<\/button>\s*<button class="btn ghost iconbtn" id="wrong" aria-label="Wrong" hidden>✗<\/button>\s*<button class="btn gold iconbtn" id="right"[^>]*hidden>✓<\/button>/)
    }
    expect(js).toContain("$('reveal').hidden = shown;")
    expect(js).toContain("$('wrong').hidden = $('right').hidden = !shown;")
  })
  it('the timer button is a || / |> icon that changes color with the state', () => {
    for (const [g, html] of pages) expect(html, g).toContain('<button class="btn pausebtn is-paused" id="go"')
    expect(js).toContain("$('go').className = 'btn pausebtn ' + (running ? 'is-running' : 'is-paused');")
    expect(js).toContain('running ? PAUSE_ICON : PLAY_ICON')
    expect(css).toContain('.pausebtn.is-running { background: #ff8a3d;')
    expect(css).toContain('.pausebtn.is-paused { background: #a7d129;')
  })
})

describe('pop-ups', () => {
  it('a wrong answer says INCORRECT with a rotating line of encouragement (also on START and with a shield)', () => {
    expect(js).toContain("wrong: ['cone', 'INCORRECT', '{e}', 'bad']")
    expect(js).toContain("wrong: ['coal', 'INCORRECT', '{e}', 'bad']")
    expect(js).toContain("if (title === 'INCORRECT') v.e = rot(XMAS ? 'xe' : 're', XMAS ? XENC : ENC);")
    expect(js).toContain("fx('wrong', { t: t.name }); fx('shield', { t: t.name });")
    expect(js).toContain("fx('wrong', { t: t.name }); nextTurn(); return; }")
  })
  it('they stay a second longer (2.7 s; the quick top ones 2.4 s)', () => {
    expect(js).toContain('wait: 2700,')
    expect(js).toContain("wait: 2400 });")
  })
  it('Christmas Dash rotates its cheers instead of always "Ho Ho Ho!", never the same one twice in a row', () => {
    expect(js).toContain("if (XMAS && key === 'right') { var r = rot('xr', XRIGHT); title = r[0]; sub = r[1]; }")
    expect(js).toContain('if (list.length > 1 && i === lastPick[key]) i = (i + 1) % list.length;')
    const n = (js.match(/\['[A-Z' !-]+', '[^']*\{t\}[^']*'\]/g) || []).length
    expect(n).toBeGreaterThanOrEqual(10)
  })
})

describe('Santa hat on the Christmas podium', () => {
  it('a cone with a folded tip, pom-pom and fluffy brim, bigger and centered over the winner', () => {
    const art = read('public/games/christmas-race-board/xmas-art.js')
    expect(art).toContain('<rect x="8" y="76" width="104" height="26" rx="13" fill="#fff"')
    expect(art).toContain('<circle cx="100" cy="52" r="12" fill="#fff"')
    const c = read('public/games/christmas-race-board/christmas.css')
    expect(c).toContain('transform: translateX(-50%) rotate(-8deg);')
  })
})
