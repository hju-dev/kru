import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

describe('Battle of Writers board handout (Henry, Nov 24)', () => {
  for (const f of ['battle-of-writers-board.html', 'battle-of-writers-board-2up.html']) {
    it(`${f}: a Round field, 5 numbered answer spaces and a tally for the teacher`, () => {
      const html = read(`public/handouts/${f}`)
      const boards = f.includes('2up') ? 2 : 1
      expect(html.match(/<section class="board">/g)).toHaveLength(boards)
      expect(html.match(/<span class="n">\d<\/span>/g)).toHaveLength(5 * boards)
      expect(html).toContain('Round <i></i>')
      expect(html).toContain('Tally for your teacher')
      expect(html).toContain('bonus points')
      expect(html).toContain('round total')
      expect(html).toContain('href="board.css"')
    })
  }
  it('prints on A4', () => {
    expect(read('public/handouts/board.css')).toContain('@page { size: A4 portrait;')
  })
})
