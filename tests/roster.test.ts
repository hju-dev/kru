import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyTeamLayout, benchFor, memberKey } from '../src/lib/roster'
import { initMessage, type Session, type Team } from '../src/lib/session'
import { buildSubmission } from '../src/lib/results'
import games from '../games.json'

// Henry, Nov 26: tap a team in any game -> its students; move, add or remove students during the game.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const roster = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, no: i + 1, nick: `S${i + 1}`, active: i !== 7 })) // S8 has left the class
const teams = (): Team[] => [
  { id: 't1', name: 'Team 1', members: [{ no: 1, nick: 'S1' }, { no: 2, nick: 'S2' }, { no: 3, nick: 'S3' }] },
  { id: 't2', name: 'Team 2', members: [{ no: 4, nick: 'S4' }, { no: 5, nick: 'S5' }] },
]
const session = (over: Partial<Session> = {}): Session => ({
  id: 'x', createdAt: 0, updatedAt: 0, status: 'playing', class: 'M.2/1', game: 'race-board', level: 'M.2', mode: 'group',
  size: 3, bins: [], absent: [6, 7], teacher: false, leaveOut: false, teams: teams(), teacherTeam: null, log: [], scores: null, notes: '', ...over,
})

describe('roster: the bench', () => {
  it('active class students on no team (absent today included), by number; not in Solo', () => {
    expect(benchFor(session(), roster).map((m) => m.nick)).toEqual(['S6', 'S7'])
    expect(benchFor(session({ mode: 'solo' }), roster)).toEqual([])
  })
  it('a mixed group: the picked students on no team, with their own class', () => {
    const mix = [
      { id: 1, class: 'M.2/1', sid: 1, no: 1, nick: 'S1' },
      { id: 2, class: 'M.2/3', sid: 9, no: 9, nick: 'S9' },
    ]
    const s = session({ mix, teams: [{ id: 't1', name: 'Team 1', members: [{ no: 1, nick: 'S1', class: 'M.2/1' }] }] })
    expect(benchFor(s, null)).toEqual([{ no: 9, nick: 'S9', class: 'M.2/3' }])
  })
})

describe('roster: rebuilding the teams from keys', () => {
  const k = (no: number) => memberKey({ no, nick: `S${no}` })
  it('move, add and remove', () => {
    const bench = benchFor(session(), roster)
    const out = applyTeamLayout(teams(), bench, [
      { id: 't1', keys: [k(1), k(2), k(6)] }, // S3 removed, S6 added
      { id: 't2', keys: [k(4), k(5), k(3)].filter((x) => x !== k(3)).concat(k(2)) }, // S2 also listed here: ignored (already on t1)
    ])!
    expect(out[0].members.map((m) => m.nick)).toEqual(['S1', 'S2', 'S6'])
    expect(out[1].members.map((m) => m.nick)).toEqual(['S4', 'S5'])
  })
  it('a student moved to another team gets that team’s points on the Sheet; a removed one gets no row', () => {
    const s = session()
    const moved = applyTeamLayout(s.teams, benchFor(s, roster), [
      { id: 't1', keys: [k(1), k(2)] },
      { id: 't2', keys: [k(4), k(5), k(3), k(7)] },
    ])!
    const sub = buildSubmission({ ...s, teams: moved, status: 'review' }, { t1: 10, t2: 4 }, '', 'Quiz Grand Prix', new Date(2026, 10, 26))
    const pts = Object.fromEntries(sub.rows.map((r) => [r.Nickname, r.Points]))
    expect(pts).toEqual({ S1: 10, S2: 10, S3: 4, S4: 4, S5: 4, S7: 4 })
  })
  it('unknown keys and team ids are ignored; nonsense gives null', () => {
    expect(applyTeamLayout(teams(), [], [{ id: 'zz', keys: [k(1)] }])).toBeNull()
    expect(applyTeamLayout(teams(), [], 'nope')).toBeNull()
    const out = applyTeamLayout(teams(), [], [{ id: 't1', keys: [k(1), 'fake|99|x'] }])!
    expect(out[0].members.map((m) => m.nick)).toEqual(['S1'])
    expect(out[1].members).toHaveLength(2) // not mentioned: unchanged
  })
  it('a mixed group’s display name ("S1 (2/3)") never comes back into the session', () => {
    const t: Team[] = [
      { id: 't1', name: 'Team 1', members: [{ no: 1, nick: 'S1', class: 'M.2/1' }] },
      { id: 't2', name: 'Team 2', members: [{ no: 1, nick: 'S1', class: 'M.2/3' }] },
    ]
    const msg = initMessage(session({ teams: t }))
    const sent = msg.session.teams as (Team & { members: { nick: string; key: string }[] })[]
    expect(sent[1].members[0].nick).toBe('S1 (2/3)')
    const out = applyTeamLayout(t, [], [{ id: 't1', keys: [sent[0].members[0].key, sent[1].members[0].key] }, { id: 't2', keys: [] }])!
    expect(out[0].members).toEqual([{ no: 1, nick: 'S1', class: 'M.2/1' }, { no: 1, nick: 'S1', class: 'M.2/3' }])
  })
  it('initMessage sends every member and the bench with keys', () => {
    const s = session()
    const msg = initMessage(s, benchFor(s, roster))
    expect(msg.session.teams[0].members[0]).toMatchObject({ no: 1, nick: 'S1', key: memberKey({ no: 1, nick: 'S1' }) })
    expect(msg.session.bench.map((m) => m.nick)).toEqual(['S6', 'S7'])
  })
})

describe('roster: the pop-up in every group game', () => {
  const group = (games as { slug: string; file: string; modes: string[]; status: string }[]).filter((g) => g.status === 'ready' && g.modes.includes('group'))
  it.each(group.map((g) => [g.slug, g.file]))('%s loads kru-roster.js + .css', (_slug, file) => {
    const html = read(file)
    expect(html).toContain('<script src="/games/shared/kru-roster.js"></script>')
    expect(html).toContain('<link rel="stylesheet" href="/games/shared/kru-roster.css" />')
  })
  it.each(group.map((g) => [g.slug, g.file]))('%s opens the roster from a team (its own code or its engine calls KruRoster)', (_slug, file) => {
    const html = read(file)
    const dir = file.slice(0, file.lastIndexOf('/') + 1)
    const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((x) => !x.includes('kru-roster.js'))
    const code = srcs.map((x) => read(x.startsWith('/') ? `public${x}` : dir + x)).join('\n')
    expect(code).toMatch(/KruRoster\.(open|link|addButton)\(/)
  })
  it('the shell takes kru:teams from its own frame and patches the session teams', () => {
    const play = read('src/routes/Play.tsx')
    expect(play).toContain("case 'kru:teams': {")
    expect(play).toContain('applyTeamLayout(current.teams')
    expect(read('public/sdk/kru.js')).toContain("post({ type: 'kru:teams'")
  })
  it('tap-to-place, a team keeps one student, no editing in Solo', () => {
    const js = read('public/games/shared/kru-roster.js')
    expect(js).toContain('if (b.dataset.kto) return move(sel, b.dataset.kto);')
    expect(js).toContain('if (!t || !to || t.members.length <= 1) return;')
    expect(js).toContain("s.mode === 'group'")
  })
})
