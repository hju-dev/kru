import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const engine = read('public/games/shared/kru-battle.js')

describe('Battle games: 3 rounds, then add a round or the final question (Henry, Nov 24)', () => {
  it('a game is 3 rounds by default; a pop-up after them offers another round or the final question', () => {
    expect(engine).toContain('DEFAULT_ROUNDS = 3')
    expect(engine).toContain("S.maxRounds = (S.maxRounds || DEFAULT_ROUNDS) + 1;")
    expect(engine).toContain('function openNext()')
    expect(engine).toContain("'🏆 Final question (' + FINAL_PTS + ' points)'")
    expect(engine).toContain("var after = S.round + 1 >= maxRounds() ? openNext : null;")
  })
  it('the final question: one task, its own timer, no bonuses, 5 points for each team marked right', () => {
    expect(engine).toContain('FINAL_PTS = 5')
    expect(engine).toContain("Kru.score(t.id, FINAL_PTS, 'final question')")
    expect(engine).toContain("KruMenu.timer($('finalRow')")
    for (const ph of ["'fstart'", "'fread'", "'fask'", "'freview'"]) expect(engine).toContain(`ph === ${ph}`)
    expect(engine).not.toMatch(/ph === 'freview'[\s\S]{0,2000}pickBonuses/)
  })
  type Item = { q: string; answer: string; why: string; read?: { title: string; sentences: string[] } }
  for (const [game, key] of [['quiz-battle', 'Wits'], ['battle-of-writers', 'Writers'], ['battle-of-readers', 'Readers']] as const) {
    it(`${key}: 6 very hard final tasks for each level, each with an answer and a reason`, () => {
      const c = JSON.parse(read(`public/games/${game}/content.json`)) as { final: Record<string, Item[]> }
      for (const level of ['M.1', 'M.2', 'M.3']) {
        expect(c.final[level], level).toHaveLength(6)
        for (const t of c.final[level]) {
          expect(t.q.length, t.q).toBeGreaterThan(10)
          expect(t.answer.length, t.q).toBeGreaterThan(3)
          expect(t.why.length, t.q).toBeGreaterThan(10)
          if (key === 'Readers') expect(t.read?.sentences.length, t.q).toBeGreaterThanOrEqual(5)
        }
      }
      expect(read(`public/games/${game}/app.js`)).toContain('final:')
    })
  }
})
