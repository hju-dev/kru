import { describe, expect, it } from 'vitest'
import { mergeRoster, parsePasted, replaceRoster, sharedNumbers } from '../src/lib/rosterImport'
import { filterSessions, studentTotals, teamsOf, toCsv, emptyFilter } from '../src/lib/stats'
import type { ResultsData } from '../src/lib/api'

describe('paste import', () => {
  it('reads tab, comma and space separated lines, and skips a header', () => {
    expect(parsePasted('No\tNickname\n1\tS1\n2\tS2')).toEqual([{ no: 1, nick: 'S1' }, { no: 2, nick: 'S2' }])
    expect(parsePasted('3, S3\n4,S4')).toEqual([{ no: 3, nick: 'S3' }, { no: 4, nick: 'S4' }])
    expect(parsePasted('5 S5')).toEqual([{ no: 5, nick: 'S5' }])
  })
  it('numbers names without numbers after the highest number', () => {
    expect(parsePasted('S7\nS8', 6)).toEqual([{ no: 7, nick: 'S7' }, { no: 8, nick: 'S8' }])
  })
  it('accepts name then number', () => {
    expect(parsePasted('S9\t9')).toEqual([{ no: 9, nick: 'S9' }])
  })
})

describe('merge and replace', () => {
  const existing = [
    { no: 1, nick: 'S1', active: true },
    { no: 2, nick: 'S2', active: true },
  ]
  it('merge adds new students and updates nicknames by number', () => {
    expect(mergeRoster(existing, [{ no: 2, nick: 'S21' }, { no: 3, nick: 'S3' }])).toEqual([
      { no: 1, nick: 'S1', active: true },
      { no: 2, nick: 'S21', active: true },
      { no: 3, nick: 'S3', active: true },
    ])
  })
  it('replace keeps students who left, but inactive', () => {
    expect(replaceRoster(existing, [{ no: 1, nick: 'S1' }, { no: 3, nick: 'S3' }])).toEqual([
      { no: 1, nick: 'S1', active: true },
      { no: 2, nick: 'S2', active: false },
      { no: 3, nick: 'S3', active: true },
    ])
  })
  it('flags shared numbers', () => {
    expect(sharedNumbers([...existing, { no: 2, nick: 'S20', active: true }])).toEqual([2])
  })
})

describe('dashboard stats', () => {
  const data: ResultsData = {
    sessions: [
      { id: 'a', date: '2026-11-01', time: '09:00', class: '1/2', game: 'Scoreboard', level: 'M.1', mode: 'group', teamCount: 2, teacherTeamPoints: null, submittedAt: '', deleted: false, editedAt: '' },
      { id: 'b', date: '2026-11-03', time: '09:00', class: '1/2', game: 'Scoreboard', level: 'M.1', mode: 'group', teamCount: 2, teacherTeamPoints: null, submittedAt: '', deleted: true, editedAt: '' },
    ],
    rows: [
      { s: 'a', team: 'Team 1', no: 1, nick: 'S1', points: 5, rank: 2, notes: '' },
      { s: 'a', team: 'Team 2', no: 2, nick: 'S2', points: 9, rank: 1, notes: '' },
      { s: 'b', team: 'Team 1', no: 1, nick: 'S1', points: 100, rank: 1, notes: '' },
    ],
  }
  it('deleted games are left out of lists and totals', () => {
    const shown = filterSessions(data.sessions, emptyFilter)
    expect(shown.map((s) => s.id)).toEqual(['a'])
    const totals = studentTotals(data, shown)
    expect(totals.find((t) => t.no === 1)).toMatchObject({ total: 5, games: 1, average: 5, lastPlayed: '2026-11-01' })
  })
  it('filters by class ignoring spaces and capitals, and by date', () => {
    expect(filterSessions(data.sessions, { ...emptyFilter, class: '1 / 2', showDeleted: true })).toHaveLength(2)
    expect(filterSessions(data.sessions, { ...emptyFilter, class: '1/3', showDeleted: true })).toHaveLength(0)
    expect(filterSessions(data.sessions, { ...emptyFilter, class: '1/2', from: '2026-11-02', showDeleted: true }).map((s) => s.id)).toEqual(['b'])
  })
  it('rebuilds teams from student rows, winner first', () => {
    expect(teamsOf(data.rows, 'a').map((t) => [t.team, t.points])).toEqual([['Team 2', 9], ['Team 1', 5]])
  })
  it('CSV quotes commas and starts with a BOM for Excel', () => {
    expect(toCsv(['A', 'B'], [['x, y', 1]])).toBe('﻿A,B\r\n"x, y",1')
  })
})
