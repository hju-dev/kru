import { describe, expect, it } from 'vitest'
import { buildSubmission, rankTeams } from '../src/lib/results'
import type { Session } from '../src/lib/session'
import {
  binCountFor,
  binsFromTeamSet,
  fillEvenly,
  moveTo,
  resizeBins,
  shuffleTeams,
  unassigned,
  type Bin,
} from '../src/lib/teams'

const nos = (n: number) => Array.from({ length: n }, (_, i) => i + 1)
const bins = (...members: number[][]): Bin[] => members.map((m, i) => ({ id: `b${i + 1}`, name: `Team ${i + 1}`, members: m }))

describe('team setup', () => {
  it('rounds the number of teams up', () => {
    expect(binCountFor(26, 4)).toBe(7)
    expect(binCountFor(24, 4)).toBe(6)
    expect(binCountFor(0, 4)).toBe(1)
  })

  it('resizes bins, keeping names and sending removed members back to the pool', () => {
    const b = resizeBins(bins([1, 2], [3], [4]), 2)
    expect(b.map((x) => x.name)).toEqual(['Team 1', 'Team 2'])
    expect(unassigned([1, 2, 3, 4], b)).toEqual([4])
    expect(resizeBins(b, 4).map((x) => x.name)).toEqual(['Team 1', 'Team 2', 'Team 3', 'Team 4'])
  })

  it('moves selected students to a bin or back to the pool', () => {
    let b = bins([1, 2], [3])
    b = moveTo(b, [1, 3], 'b2')
    expect(b[0].members).toEqual([2])
    expect(b[1].members).toEqual([3, 1])
    b = moveTo(b, [3], null)
    expect(unassigned([1, 2, 3], b)).toEqual([3])
  })

  it('shuffles into balanced teams with everyone placed once', () => {
    const b = shuffleTeams(bins([], [], [], []), nos(26))
    const sizes = b.map((x) => x.members.length).sort()
    expect(sizes).toEqual([6, 6, 7, 7])
    expect(b.flatMap((x) => x.members).sort((a, c) => a - c)).toEqual(nos(26))
  })

  it('fills the smallest teams first', () => {
    const b = fillEvenly(bins([1, 2, 3], [4], []), nos(7))
    expect(b.map((x) => x.members.length)).toEqual([3, 2, 2])
    expect(unassigned(nos(7), b)).toEqual([])
  })

  it('loads a saved team set, skipping students absent today', () => {
    const b = binsFromTeamSet([{ name: 'Dragons', members: [{ no: 1 }, { no: 2 }] }], [2, 3])
    expect(b[0].members).toEqual([2])
    expect(b[0].name).toBe('Dragons')
  })
})

describe('results', () => {
  it('ranks with ties sharing a place', () => {
    expect(rankTeams([
      { teamId: 'a', points: 12 },
      { teamId: 'b', points: 17 },
      { teamId: 'c', points: 12 },
      { teamId: 'd', points: 5 },
    ])).toEqual({ b: 1, a: 2, c: 2, d: 4 })
  })

  // HANDOFF "Joe test": Joe (No. 7) is in Team 2, which finishes with 17.
  it('Joe test: one row per student, team points to every member, no teacher or absent rows', () => {
    const session: Session = {
      id: 'sid', createdAt: 0, updatedAt: 0, status: 'review', class: 'M.3/2', game: 'scoreboard', level: 'M.3', mode: 'group',
      size: 3, bins: [], absent: [9], teacher: true, leaveOut: false,
      teams: [
        { id: 't1', name: 'Team 1', members: [{ no: 1, nick: 'S1' }, { no: 2, nick: 'S2' }] },
        { id: 't2', name: 'Team 2', members: [{ no: 7, nick: 'Joe' }, { no: 8, nick: 'S8' }, { no: 3, nick: 'S3' }] },
      ],
      teacherTeam: { id: 't0', name: 'T. Henry' },
      log: [], scores: null, notes: '',
    }
    const sub = buildSubmission(session, { t1: 12, t2: 17, t0: 20 }, 'good game', 'Scoreboard', new Date(2026, 10, 4, 14, 5))
    expect(sub.rows).toHaveLength(5)
    const joe = sub.rows.find((r) => r.No === 7)!
    expect(joe).toEqual({
      Date: '2026-11-04', Time: '14:05', Class: 'M.3/2', Game: 'Scoreboard', Level: 'M.3', Mode: 'group',
      Team: 'Team 2', No: 7, Nickname: 'Joe', Points: 17, Rank: 1, Teammates: 'S8, S3', Notes: 'good game',
    })
    expect(sub.rows.some((r) => r.No === 9)).toBe(false) // absent
    expect(sub.rows.some((r) => r.Team === 'T. Henry')).toBe(false) // teacher
    expect(sub.session.TeacherTeamPoints).toBe(20)
    expect(sub.session.TeamCount).toBe(2)
  })
})
