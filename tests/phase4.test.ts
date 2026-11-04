import { describe, expect, it } from 'vitest'
import { buildSubmission, submittedTeams } from '../src/lib/results'
import type { Session } from '../src/lib/session'

// Name Picker plays solo: one "team" per student. Only students given points are saved.
const solo: Session = {
  id: 'np', createdAt: 0, updatedAt: 0, status: 'review', class: 'M.2/1', game: 'name-picker', level: 'M.2', mode: 'solo',
  size: 1, bins: [], absent: [], teacher: false, leaveOut: false,
  teams: [1, 2, 3, 4].map((n) => ({ id: 's' + n, name: 'S' + n, members: [{ no: n, nick: 'S' + n }] })),
  teacherTeam: null,
  log: [], scores: null, notes: '',
}

describe('games that only save students with points ("results": "scored")', () => {
  it('leaves out students with 0 points, ranks the rest', () => {
    const sub = buildSubmission(solo, { s2: 2, s3: 1, s4: 0 }, '', 'Name Picker', new Date(2026, 10, 4, 9, 0), { onlyScored: true })
    expect(sub.rows.map((r) => [r.Nickname, r.Points, r.Rank])).toEqual([
      ['S2', 2, 1],
      ['S3', 1, 2],
    ])
    expect(sub.session.TeamCount).toBe(2)
  })
  it('keeps a negative score (it is not 0)', () => {
    expect(submittedTeams(solo, { s1: -1 }, true).map((t) => t.id)).toEqual(['s1'])
  })
  it('nothing to save when nobody got points', () => {
    expect(buildSubmission(solo, {}, '', 'Name Picker', new Date(), { onlyScored: true }).rows).toEqual([])
  })
  it('other games still save every student', () => {
    expect(buildSubmission(solo, { s2: 2 }, '', 'Scoreboard').rows).toHaveLength(4)
  })
})
