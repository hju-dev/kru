/**
 * Changing teams during a game (Henry, Nov 26). Every game's team panel can open the roster pop-up
 * (public/games/shared/kru-roster.js): move a student to another team, add a student who is on no team,
 * take a student out. The game sends back only team ids + member keys; the shell rebuilds the teams from
 * its own Member objects, so display names ("Nok (2/3)") never end up in the session or on the Sheet.
 */
import type { Student } from '../types'
import type { Member, Session, Team } from './session'

/** A stable key for one student in this session (class for mixed groups, number, nickname). */
export function memberKey(m: Member): string {
  return `${m.class ?? ''}|${m.no}|${m.nick.trim().toLowerCase()}`
}

/**
 * Students who could join a team: the class's active students (or a mixed group's picked students) who are
 * on no team right now (absent today, left out, or taken out during the game). Sorted by number.
 */
export function benchFor(session: Session, roster: Student[] | null | undefined): Member[] {
  if (session.mode !== 'group') return []
  const onTeam = new Set(session.teams.flatMap((t) => t.members.map(memberKey)))
  const pool: Member[] = session.mix
    ? session.mix.map((m) => ({ no: m.no, nick: m.nick, class: m.class }))
    : (roster ?? []).filter((s) => s.active).map((s) => ({ no: s.no, nick: s.nick }))
  const seen = new Set<string>()
  return pool
    .filter((m) => {
      const k = memberKey(m)
      if (onTeam.has(k) || seen.has(k)) return false
      seen.add(k)
      return true
    })
    .sort((a, b) => a.no - b.no || a.nick.localeCompare(b.nick))
}

/**
 * The teams after a change in the game. `layout` = each team's id and its members' keys, in order.
 * Unknown team ids and unknown keys are ignored; a student is never on two teams; a team the game did not
 * mention keeps its members. Returns null when nothing usable came in.
 */
export function applyTeamLayout(teams: Team[], bench: Member[], layout: unknown): Team[] | null {
  if (!Array.isArray(layout)) return null
  const known = new Map<string, Member>()
  for (const t of teams) for (const m of t.members) known.set(memberKey(m), m)
  for (const m of bench) if (!known.has(memberKey(m))) known.set(memberKey(m), m)
  const byId = new Map<string, string[]>()
  for (const row of layout) {
    const r = row as { id?: unknown; keys?: unknown }
    if (typeof r?.id !== 'string' || !Array.isArray(r.keys)) continue
    byId.set(r.id, r.keys.filter((k): k is string => typeof k === 'string'))
  }
  if (!teams.some((t) => byId.has(t.id))) return null
  const used = new Set<string>()
  return teams.map((t) => {
    const keys = byId.get(t.id)
    if (!keys) return t
    const members: Member[] = []
    for (const k of keys) {
      const m = known.get(k)
      if (m && !used.has(k)) {
        used.add(k)
        members.push(m)
      }
    }
    return { ...t, members }
  })
}
