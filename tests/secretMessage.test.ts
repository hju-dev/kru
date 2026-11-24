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
