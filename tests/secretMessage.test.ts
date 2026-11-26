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
    // the picks screen (the one that can be mirrored) never prints the phrase text
    const cardFn = js.slice(js.indexOf('function teamCard'), js.indexOf('function reporterNames'))
    expect(cardFn).not.toContain('p.say')
  })
  it('each round picks a Messenger and a Reporter; each role goes round the whole team before it repeats', () => {
    expect(js).toContain('function rolesFor(t)')
    expect(js).toContain('S.fq[t.id] = fq.filter(')
    expect(js).toContain('S.bq[t.id] = bq.filter(')
  })
  it('+1 per correct team, answers behind a Reveal tap, End game podium wired', () => {
    expect(js).toContain('var PT = 1;')
    expect(js).toContain('Reveal the answer')
    expect(js).toContain('KruEnd.setup')
  })
})

describe('Secret Message: whole team by default, a stepper, scores on top, twisters (Nov 25)', () => {
  const html = read('public/games/secret-message/index.html')
  it('no line-length setting and no whole line on screen any more (Nov 26)', () => {
    expect(html).not.toContain('chainRow')
    expect(js).not.toContain('function lineFor')
    expect(js).not.toContain('S.chain =')
  })
  it('the points and the buttons sit at the top (R1, scores, timer, buttons); there is no bottom row', () => {
    const top = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
    expect(top).toContain('id="totals"')
    expect(top.indexOf('id="count"')).toBeLessThan(top.indexOf('id="totals"'))
    expect(top.indexOf('id="totals"')).toBeLessThan(top.indexOf('id="go"'))
    expect(html).not.toContain('<div class="controls">')
    expect(js).toContain("'R' + S.round")
  })
  it('short button words: Secret, a lock, a back arrow, Hide, eyes, Start, ||, Ready', () => {
    for (const w of ["go = '🎲 Pick';", "go = 'Secret';", "go = '🔒'; alt = '←';", "go = 'Hide';", "go = 'Start'; alt = '👀';", "go = running ? 'Ready' : '▶'; alt = running ? '||' : '';"]) expect(js).toContain(w)
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
    // the picks screen (the one that can be mirrored) never prints the phrase text
    const cardFn = js.slice(js.indexOf('function teamCard'), js.indexOf('function reporterNames'))
    expect(cardFn).not.toContain('p.say')
  })
  it('each round picks a Messenger and a Reporter; each role goes round the whole team before it repeats', () => {
    expect(js).toContain('function rolesFor(t)')
    expect(js).toContain('S.fq[t.id] = fq.filter(')
    expect(js).toContain('S.bq[t.id] = bq.filter(')
  })
  it('+1 per correct team, answers behind a Reveal tap, End game podium wired', () => {
    expect(js).toContain('var PT = 1;')
    expect(js).toContain('Reveal the answer')
    expect(js).toContain('KruEnd.setup')
  })
})

describe('Secret Message: whole team by default, a stepper, scores on top, twisters (Nov 25)', () => {
  const html = read('public/games/secret-message/index.html')
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

// Henry, Nov 26: only the front and the back student matter; a cinematic random pick, no repeats in a game.
describe('Secret Message: Messenger and Reporter picks (Nov 26)', () => {
  type Team = { id: string; members: { no: number; nick: string }[] }
  // load the two pure helpers out of app.js
  const src = js.slice(js.indexOf('  function mid(m)'), js.indexOf('  function nameOf('))
  const make = new Function('S', 'shuffle', `${src}; return rolesFor;`) as (S: unknown, sh: (a: string[]) => string[]) => (t: Team) => [string, string]
  const shuffle = (a: string[]) => { a = a.slice(); for (let j = a.length - 1; j > 0; j--) { const k = Math.floor(Math.random() * (j + 1)); [a[j], a[k]] = [a[k], a[j]] } return a }
  const team = (n: number): Team => ({ id: 't1', members: Array.from({ length: n }, (_, i) => ({ no: i + 1, nick: `S${i + 1}` })) })
  it('a student is never Messenger and Reporter in the same round', () => {
    const S = { fq: {}, bq: {} }, roles = make(S, shuffle)
    for (let r = 0; r < 200; r++) { const [f, b] = roles(team(5)); expect(f).not.toBe(b) }
  })
  it('everybody is Messenger once and Reporter once before anyone gets a role twice (many games, many cycles)', () => {
    for (const n of [2, 3, 4, 5, 8, 15]) {
      for (let trial = 0; trial < 300; trial++) {
        const S = { fq: {}, bq: {} }, roles = make(S, shuffle)
        for (let cycle = 0; cycle < 3; cycle++) {
          const fs: string[] = [], bs: string[] = []
          for (let r = 0; r < n; r++) { const [f, b] = roles(team(n)); expect(f).not.toBe(b); fs.push(f); bs.push(b) }
          expect(new Set(fs).size, `messengers, team of ${n}`).toBe(n)
          expect(new Set(bs).size, `reporters, team of ${n}`).toBe(n)
        }
      }
    }
  })
  it('the spin is cinematic: four slot machines that stop one after another, a drum roll, a flash on landing', () => {
    expect(js).toContain('function spin()')
    expect(js).toContain('1500 + i * 650')
    expect(js).toContain('function drum()')
    const css = read('public/games/secret-message/style.css')
    for (const k of ['@keyframes sm-roll', '@keyframes sm-lock', '@keyframes sm-flash', '@keyframes sm-sweep']) expect(css).toContain(k)
    expect(css).toContain('prefers-reduced-motion')
  })
})
