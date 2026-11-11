import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { binCountFor, TEAM_SIZE_MAX, TEAM_SIZE_MIN } from '../src/lib/teams'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

describe('team size 1 to 15 (Henry, Nov 9)', () => {
  it('limits', () => {
    expect([TEAM_SIZE_MIN, TEAM_SIZE_MAX]).toEqual([1, 15])
  })
  it('team count follows the size', () => {
    expect(binCountFor(28, 1)).toBe(28)
    expect(binCountFor(28, 15)).toBe(2)
    expect(binCountFor(30, 15)).toBe(2)
  })
  it('setup screen and class defaults use the limits', () => {
    expect(read('src/routes/Setup.tsx')).toContain('Math.min(TEAM_SIZE_MAX, Math.max(TEAM_SIZE_MIN, size))')
    expect(read('src/routes/admin/ClassDefaults.tsx')).toContain('TEAM_SIZE_MAX')
  })
})

describe('teams screen before every group game', () => {
  const play = read('src/routes/Play.tsx')
  it('a new group game starts on the teams screen; Start the game opens the game', () => {
    expect(read('src/routes/Setup.tsx')).toContain('teamsShown: group ? false : undefined')
    expect(play).toContain("if (session.teamsShown === false) return <TeamsScreen session={session} />")
    expect(play).toContain('onStart={() => patch(session.id, { teamsShown: true })}')
  })
  it('Change teams goes back to setup with the same teams', () => {
    expect(play).toContain("if (session.status === 'setup') return <Navigate to={`/setup/${session.game}`} replace />")
  })
  it('the teams screen shrinks the text to fit (no scrolling)', () => {
    const tsx = read('src/components/TeamsReveal.tsx')
    expect(tsx).toContain('el.scrollHeight <= H + 1')
    expect(read('src/components/TeamsReveal.css')).toMatch(/\.tr-grid \{[^}]*overflow: hidden/)
  })
})

describe('How to play preview from the library', () => {
  it('? on every game card (not tools) opens practice mode', () => {
    const home = read('src/routes/Home.tsx')
    expect(home).toContain('className="try-btn"')
    expect(home).toContain('g.modes.length > 0')
    expect(read('src/App.tsx')).toContain("{ path: 'preview/:game', element: <Preview /> }")
    const preview = read('src/routes/Preview.tsx')
    expect(preview).toContain('?mock=1&level=')
    expect(preview).toContain("'kru-mock-state:'") // cleared, so the slides show first
  })
})

describe('teams screen never cuts names off (Henry, Nov 11)', () => {
  const tsx = read('src/components/TeamsReveal.tsx')
  const css = read('src/components/TeamsReveal.css')
  it('measures each card\'s text block, not just the card', () => {
    expect(tsx).toContain('if (inner.offsetHeight > room - 2 ||')
    expect(tsx).toContain('<div className="tr-in">')
  })
  it('measures again once the fonts have loaded and when the grid changes size', () => {
    expect(tsx).toContain("fonts?.addEventListener?.('loadingdone', fit)")
    expect(tsx).toContain('fonts?.ready.then(')
    expect(tsx).toContain('new ResizeObserver(')
  })
  it('if anything ever spills, the team name at the top stays visible', () => {
    expect(css).toContain('justify-content: safe center;')
  })
})
