import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { findGame, GAMES } from '../src/lib/games'
import {
  applyMix,
  displayTeams,
  markPlayed,
  mixedSession,
  MIXED_CLASS,
  mixKey,
  mixRoster,
  playedBefore,
  shortClass,
  updateMix,
  type MixPick,
} from '../src/lib/mix'
import { buildSubmission } from '../src/lib/results'
import { initMessage, type Team } from '../src/lib/session'

// placeholder students: two classes that both have a No. 1 called "S1"
const pick = (cls: string, id: number, nick = `S${id}`): MixPick => ({ class: cls, student: { id, no: id, nick } })

describe('Mixed group (Christmas Race Board)', () => {
  it('is offered for Christmas Race Board only', () => {
    expect(findGame('christmas-race-board')?.mixed).toBe(true)
    expect(GAMES.filter((g) => g.mixed).map((g) => g.slug)).toEqual(['christmas-race-board'])
  })

  it('gives every picked student their own id, even when classes share numbers', () => {
    const mix = updateMix([], [pick('M.1/2', 1), pick('M.2/3', 1), pick('M.2/3', 2)])
    expect(mix.map((m) => m.id)).toEqual([1, 2, 3])
    expect(mix[1]).toMatchObject({ class: 'M.2/3', sid: 1, no: 1, nick: 'S1' })
    expect(mixRoster(mix).map((s) => s.id)).toEqual([1, 2, 3])
  })

  it('keeps ids when the group is changed, so team places survive', () => {
    const first = updateMix([], [pick('M.1/2', 1), pick('M.2/3', 1), pick('M.2/3', 2)])
    const second = updateMix(first, [pick('M.2/3', 1), pick('M.3/3', 5), pick('M.2/3', 2)])
    expect(second.map((m) => [m.class, m.sid, m.id])).toEqual([
      ['M.2/3', 1, 2],
      ['M.3/3', 5, 4],
      ['M.2/3', 2, 3],
    ])
  })

  it('a changed group drops leavers from their teams and fits the team count', () => {
    const mix = updateMix([], Array.from({ length: 8 }, (_, i) => pick('M.1/2', i + 1)))
    const s = mixedSession('christmas-race-board', mix, 4)
    expect(s.class).toBe(MIXED_CLASS)
    expect(s.bins).toHaveLength(2)
    s.bins[0].members = [1, 2, 3, 4]
    const change = applyMix(s, mix.slice(0, 3))
    expect(change.bins).toHaveLength(1)
    expect(change.bins![0].members).toEqual([1, 2, 3])
  })

  it('writes each student to their own class in Results; the Sessions row says Christmas mix', () => {
    const s = mixedSession('christmas-race-board', [], 4)
    s.teams = [
      { id: 'a', name: 'Team 1', members: [{ no: 1, nick: 'S1', class: 'M.1/2' }, { no: 1, nick: 'S1', class: 'M.3/2' }] },
      { id: 'b', name: 'Team 2', members: [{ no: 7, nick: 'S7', class: 'M.2/3' }] },
    ]
    const sub = buildSubmission(s, { a: 5, b: 2 }, '', 'Christmas Race Board')
    expect(sub.rows.map((r) => [r.Class, r.Level, r.No, r.Nickname, r.Points])).toEqual([
      ['M.1/2', 'M.1', 1, 'S1', 5],
      ['M.3/2', 'M.3', 1, 'S1', 5],
      ['M.2/3', 'M.2', 7, 'S7', 2],
    ])
    expect(sub.session.Class).toBe(MIXED_CLASS)
    expect(sub.session.Level).toBe('')
  })

  it('shows the class only when two students share a nickname (screen only, not the Sheet)', () => {
    const teams: Team[] = [
      { id: 'a', name: 'Team 1', members: [{ no: 1, nick: 'S1', class: 'M.1/2' }, { no: 2, nick: 'S2', class: 'M.1/2' }] },
      { id: 'b', name: 'Team 2', members: [{ no: 4, nick: 's1', class: 'M.3/2' }] },
    ]
    const shown = displayTeams(teams).flatMap((t) => t.members.map((m) => m.nick))
    expect(shown).toEqual(['S1 (1/2)', 'S2', 's1 (3/2)'])
    expect(teams[0].members[0].nick).toBe('S1')
    // a normal class game is left alone
    const plain: Team[] = [{ id: 'a', name: 'T', members: [{ no: 1, nick: 'S1' }, { no: 2, nick: 'S1' }] }]
    expect(displayTeams(plain)).toBe(plain)
    // the game gets the display names
    const s = mixedSession('christmas-race-board', [], 4)
    s.teams = teams
    expect(initMessage(s).session.teams[1].members[0].nick).toBe('s1 (3/2)')
  })

  it('short class labels', () => {
    expect(shortClass('M.2/3')).toBe('2/3')
    expect(shortClass('3/2P')).toBe('3/2P')
  })

  it('remembers who played in an earlier group, but not in the group being set up', () => {
    const mix = updateMix([], [pick('M.1/2', 1), pick('M.2/3', 1)])
    const played = markPlayed({}, 'game-1', mix)
    expect(played[mixKey('M.2/3', 1)]).toBe('game-1')
    expect(playedBefore(played, 'M.2/3', 1, 'game-2')).toBe(true)
    expect(playedBefore(played, 'M.2/3', 1, 'game-1')).toBe(false)
    expect(playedBefore(played, 'M.2/3', 2, 'game-2')).toBe(false)
  })

  it('wires the screens: Home chooser, /mix route, setup ?mix=1 and played marks', () => {
    const home = readFileSync('src/routes/ChooseClass.tsx', 'utf8')
    expect(home).toContain('Mixed group (pick from every class)')
    expect(readFileSync('src/App.tsx', 'utf8')).toContain("path: 'mix/:game'")
    const setup = readFileSync('src/routes/Setup.tsx', 'utf8')
    expect(setup).toContain("get('mix') === '1'")
    expect(setup).toContain('storage.setPlayed')
    expect(readFileSync('src/routes/Play.tsx', 'utf8')).toContain("session.mix ? '?mix=1' : ''")
  })
})
