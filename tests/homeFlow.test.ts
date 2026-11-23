import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(p, 'utf8')

describe('Home and the steps before the team builder (Henry, Nov 23)', () => {
  it('Home has one button per game type and a collapsed Games in progress; no class buttons', () => {
    const home = read('src/routes/Home.tsx')
    expect(home).toContain('className="cat-grid"')
    expect(home).toContain('navigate(`/library/${c.id}`)')
    expect(home).toContain('aria-expanded={showOpen}')
    expect(home).not.toContain('class-grid')
  })
  it('each game type opens its own page', () => {
    expect(read('src/App.tsx')).toContain("path: 'library/:section'")
    const lib = read('src/routes/Library.tsx')
    expect(lib).toContain("section === 'favorites'")
    expect(lib).toContain("section === 'recent'")
  })
  it('a game goes to Choose a class first, then the question sets, then the team builder', () => {
    expect(read('src/routes/Home.tsx')).toContain('navigate(`/class/${g.slug}`)')
    const cc = read('src/routes/ChooseClass.tsx')
    expect(cc).toContain('Choose a class')
    expect(cc).toContain('navigate(needsSets ? `/sets/${game.slug}` : `/setup/${game.slug}`)')
    expect(read('src/App.tsx')).toContain("path: 'sets/:game'")
    const sets = read('src/routes/Sets.tsx')
    expect(sets).toContain('Next: make the teams')
    expect(sets).toContain("q.set('level', level)")
  })
  it('the team builder no longer shows level or unit pickers; it reads the choice from the address', () => {
    const setup = read('src/routes/Setup.tsx')
    expect(setup).not.toContain('aria-label="Level"')
    expect(setup).toContain("query.get('level')")
    expect(setup).toContain('<Navigate to={`/class/${slug}`} replace />')
  })
  it('the gear is an 8-tooth symmetric drawing in every game', () => {
    for (const f of ['public/games/quiz-island/index.html', 'public/games/shared/kru-cards.js', 'public/games/shared/kru-battle.js', 'public/games/fortress/index.html']) expect(read(f), f).toContain('M9.6 4.16 L10.16 1.56')
  })
})
