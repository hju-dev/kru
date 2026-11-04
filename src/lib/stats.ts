import type { ResultRowLite, ResultSession, ResultsData } from './api'
import { classKeyOf } from './bootstrap'

/** Pure helpers for the dashboard: filtering results and adding up student totals. */

export interface Filter {
  class: string
  game: string
  level: string
  from: string
  to: string
  showDeleted: boolean
}

export const emptyFilter: Filter = { class: '', game: '', level: '', from: '', to: '', showDeleted: false }

export function filterSessions(sessions: ResultSession[], f: Filter): ResultSession[] {
  const key = f.class ? classKeyOf(f.class) : ''
  return sessions.filter(
    (s) =>
      (f.showDeleted || !s.deleted) &&
      (!key || classKeyOf(s.class) === key) &&
      (!f.game || s.game === f.game) &&
      (!f.level || s.level === f.level) &&
      (!f.from || s.date >= f.from) &&
      (!f.to || s.date <= f.to),
  )
}

export interface TeamResult {
  team: string
  points: number
  rank: number | null
  members: { no: number | null; nick: string }[]
}

/** Groups a session's student rows back into teams, best first. */
export function teamsOf(rows: ResultRowLite[], sessionId: string): TeamResult[] {
  const map = new Map<string, TeamResult>()
  for (const r of rows) {
    if (r.s !== sessionId) continue
    const t = map.get(r.team) ?? { team: r.team, points: r.points, rank: r.rank, members: [] }
    t.members.push({ no: r.no, nick: r.nick })
    map.set(r.team, t)
  }
  return [...map.values()].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.points - a.points)
}

export interface StudentTotal {
  key: string
  class: string
  no: number | null
  nick: string
  total: number
  games: number
  average: number
  lastPlayed: string
}

/** One line per student (class + number + nickname): total points, games played, average, last played. */
export function studentTotals(data: ResultsData, sessions: ResultSession[]): StudentTotal[] {
  const byId = new Map(sessions.map((s) => [s.id, s]))
  const totals = new Map<string, StudentTotal>()
  for (const r of data.rows) {
    const s = byId.get(r.s)
    if (!s) continue
    const key = `${classKeyOf(s.class)}|${r.no}|${r.nick.toLowerCase()}`
    const t = totals.get(key) ?? { key, class: s.class, no: r.no, nick: r.nick, total: 0, games: 0, average: 0, lastPlayed: '' }
    t.total += r.points
    t.games += 1
    if (s.date > t.lastPlayed) t.lastPlayed = s.date
    totals.set(key, t)
  }
  return [...totals.values()]
    .map((t) => ({ ...t, average: t.games ? Math.round((t.total / t.games) * 10) / 10 : 0 }))
    .sort((a, b) => a.class.localeCompare(b.class, 'en', { numeric: true }) || (a.no ?? 0) - (b.no ?? 0))
}

/** CSV text with a byte-order mark so Excel shows Thai nicknames correctly. */
export function toCsv(header: string[], lines: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + [header, ...lines].map((l) => l.map(cell).join(',')).join('\r\n')
}
