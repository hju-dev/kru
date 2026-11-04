import type { Session } from './session'
import { todayKey } from './session'

/** Competition ranking, highest first: 17, 12, 12, 5 -> 1, 2, 2, 4. */
export function rankTeams(points: { teamId: string; points: number }[]): Record<string, number> {
  const sorted = points.slice().sort((a, b) => b.points - a.points)
  const ranks: Record<string, number> = {}
  sorted.forEach((t, i) => {
    ranks[t.teamId] = i > 0 && t.points === sorted[i - 1].points ? ranks[sorted[i - 1].teamId] : i + 1
  })
  return ranks
}

/** One row of the Results tab (SessionID is added by the script). */
export interface ResultRow {
  Date: string
  Time: string
  Class: string
  Game: string
  Level: string
  Mode: string
  Team: string
  No: number
  Nickname: string
  Points: number
  Rank: number
  Teammates: string
  Notes: string
}

export interface SessionRow {
  id: string
  Date: string
  Class: string
  Game: string
  Level: string
  Mode: string
  TeamCount: number
  TeacherTeamPoints: number | ''
}

export interface Submission {
  session: SessionRow
  rows: ResultRow[]
}

/**
 * Turns a finished session into Sheet rows: one row per present student, each getting their
 * team's points. The teacher team is never a student row; its points go in the Sessions tab only.
 * Ranks are among the student teams.
 * onlyScored (games with "results": "scored", e.g. Name Picker): teams with 0 points get no rows.
 */
export function buildSubmission(
  s: Session,
  points: Record<string, number>,
  notes: string,
  gameTitle: string,
  now = new Date(),
  opts: { onlyScored?: boolean } = {},
): Submission {
  const date = todayKey(now)
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const teams = submittedTeams(s, points, opts.onlyScored)
  const ranks = rankTeams(teams.map((t) => ({ teamId: t.id, points: points[t.id] ?? 0 })))
  const rows: ResultRow[] = []
  for (const team of teams) {
    for (const m of team.members) {
      rows.push({
        Date: date,
        Time: time,
        Class: s.class,
        Game: gameTitle,
        Level: s.level,
        Mode: s.mode,
        Team: team.name,
        No: m.no,
        Nickname: m.nick,
        Points: points[team.id] ?? 0,
        Rank: ranks[team.id],
        Teammates: team.members
          .filter((o) => o.no !== m.no)
          .map((o) => o.nick)
          .join(', '),
        Notes: notes,
      })
    }
  }
  return {
    session: {
      id: s.id,
      Date: date,
      Class: s.class,
      Game: gameTitle,
      Level: s.level,
      Mode: s.mode,
      TeamCount: teams.length,
      TeacherTeamPoints: s.teacherTeam ? (points[s.teacherTeam.id] ?? 0) : '',
    },
    rows,
  }
}

/** The student teams that get Results rows. */
export function submittedTeams(s: Session, points: Record<string, number>, onlyScored = false) {
  return onlyScored ? s.teams.filter((t) => (points[t.id] ?? 0) !== 0) : s.teams
}
