import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Secret Message (Henry, Nov 25): whisper down the line, two teams, reported speech.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
type P = { k: string; say: string; answer: string }
const c = JSON.parse(read('public/games/secret-message/content.json')) as Record<string, { phrases: P[] }>
const games = JSON.parse(read('games.json')) as { slug: string; twoTeams?: boolean; modes?: string[]; section?: string; levels?: string[] }[]
const js = read('public/games/secret-message/app.js')

describe('Secret Message', () => {
  it('is a Speaking group game for exactly two teams, all three levels', () => {
    const g = games.find((x) => x.slug === 'secret-message')!
    expect(g).toMatchObject({ twoTeams: true, section: 'speaking', modes: ['group'], levels: ['M.1', 'M.2', 'M.3'] })
  })
  for (const lv of ['M.1', 'M.2', 'M.3']) {
    it(`${lv}: 60 phrases, all four kinds, each secret has a different model answer, American spelling`, () => {
      const ps = c[lv].phrases
      expect(ps).toHaveLength(60)
      for (const k of ['ds', 'dq', 'rs', 'rq']) expect(ps.filter((p) => p.k === k).length, k).toBe(15)
      expect(new Set(ps.map((p) => p.say)).size).toBe(60)
      for (const p of ps) {
        expect(p.say.length).toBeGreaterThan(8)
        expect(p.answer).not.toBe(p.say)
        // direct secrets contain a quote, reported ones do not; questions end like their kind
        expect(p.say.includes('"')).toBe(p.k.startsWith('d'))
        expect(p.answer.includes('"')).toBe(p.k.startsWith('r'))
        if (p.k === 'dq') expect(p.say).toMatch(/\?"\.?$/)
        if (p.k === 'rq') expect(p.say).not.toContain('?')
      }
      expect(JSON.stringify(c[lv])).not.toMatch(/colour|favourite|football|cinema|\bfilm\b/i)
    })
  }
  it('the secret is only on the phone: the un-mirror and re-mirror prompts bracket it', () => {
    expect(js).toContain("phase = 'warn1'")
    expect(js).toContain('Stop Mirroring')
    expect(js).toContain("hideSecret()")
    expect(js).toContain('MISSION LAUNCHED')
    // the lines screen (the one that can be mirrored) never prints the phrase text
    const lineFn = js.slice(js.indexOf('function lineHtml'), js.indexOf('function linesHtml'))
    expect(lineFn).not.toContain('p.say')
  })
  it('a new first and last student each round; everybody goes before anyone repeats', () => {
    expect(js).toContain('line[0] === prev[0] || line[n - 1] === prev[1]')
    expect(js).toContain('S.q[t.id] = q.slice(n)')
  })
  it('+1 per correct team, answers behind a Reveal tap, End game podium wired', () => {
    expect(js).toContain('var PT = 1;')
    expect(js).toContain('Reveal the answer')
    expect(js).toContain('KruEnd.setup')
  })
})

describe('Secret Message: whole team by default, a stepper, scores on top, twisters (Nov 25)', () => {
  const html = read('public/games/secret-message/index.html')
  it('the line length is a stepper like the timer, default 15 (the whole team)', () => {
    expect(js).toContain("KruMenu.stepper($('chainRow'), S.chain || 15")
    expect(js).toContain('Math.min(S.chain || 15, all.length)')
    expect(js).toContain('chain: 15')
    expect(html).toContain('id="chainRow"')
    expect(read('public/games/shared/kru-menu.js')).toContain('function stepper(el, value, onChange, o)')
  })
  it('names read left to right in 1-4 columns, the biggest size where nothing wraps or is cut; no legend text', () => {
    expect(js).toContain('for (var cols = 1; cols <= 4; cols++)')
    expect(js).toContain("li.scrollWidth <= li.clientWidth + 1")
    expect(js).not.toContain('sees the secret · ')
    expect(js).not.toContain('Get in line')
    expect(read('public/games/secret-message/style.css')).toContain('.line li .nm { font-weight: 800; white-space: nowrap; }')
  })
  it('the points sit at the top next to the round; the bottom row has only the timer and the buttons', () => {
    const top = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
    expect(top).toContain('id="totals"')
    expect(top.indexOf('id="count"')).toBeLessThan(top.indexOf('id="totals"'))
    const bottom = html.slice(html.indexOf('<div class="controls">'), html.indexOf('</main>'))
    expect(bottom).not.toContain('id="totals"')
  })
  for (const lv of ['M.1', 'M.2', 'M.3']) {
    it(`${lv}: 50 twisters and hard words (tongue twisters are 5 words or fewer), said exactly the same`, () => {
      const tw = (c[lv] as unknown as { twisters: P[] }).twisters
      expect(tw).toHaveLength(50)
      expect(new Set(tw.map((p) => p.say.toLowerCase())).size).toBe(50)
      expect(tw.filter((p) => p.k === 'tt')).toHaveLength(25)
      expect(tw.filter((p) => p.k === 'hw')).toHaveLength(25)
      for (const p of tw) {
        expect(p.answer).toBe(p.say)
        if (p.k === 'tt') expect(p.say.split(/\s+/).length, p.say).toBeLessThanOrEqual(5)
      }
    })
  }
  it('the menu picks Reported speech, Twisters or Both; the judging screen says "EXACTLY the same"', () => {
    expect(js).toContain("var SETS = [['reported', 'Reported speech'], ['twisters', 'Twisters'], ['both', 'Both']]")
    expect(js).toContain('function poolFor(set)')
    expect(js).toContain('EXACTLY the same')
    expect(html).toContain('id="setRow"')
  })
})
