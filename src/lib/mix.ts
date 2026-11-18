/**
 * Mixed group (Henry, Nov 2026, Christmas Race Board): about 30 students from several classes play
 * one game together. Henry picks them from one list of every class. Pure helpers (no React).
 *
 * In the session the mixed students get their own ids 1..n (`Session.mix`), so the normal team setup
 * works unchanged. Every Results row keeps the student's real class (`Member.class`).
 */
import type { Student } from '../types'
import { binCountFor, resizeBins } from './teams'
import { newSessionId, type Member, type Session, type Team } from './session'
import type { Level } from '../types'

/** The class name on the Sessions row (the Results rows keep each student's own class). */
export const MIXED_CLASS = 'Christmas mix'

export interface MixStudent {
  /** id inside this session (1..n); bins hold these */
  id: number
  /** the student's real class and their id in that class's roster */
  class: string
  sid: number
  no: number
  nick: string
}

/** A student as picked on the list: their class + roster entry. */
export interface MixPick {
  class: string
  student: Pick<Student, 'id' | 'no' | 'nick'>
}

/** "class|student id": the same student on every screen, even when two classes share numbers. */
export function mixKey(cls: string, sid: number): string {
  return `${cls}|${sid}`
}

/** "M.2/3" -> "2/3": a short class label for chips and duplicate names. */
export function shortClass(cls: string): string {
  return cls.replace(/^\s*M\s*\.?\s*/i, '').trim() || cls
}

/**
 * The session's mixed students after Henry changes the pick. Students already in the group keep
 * their id (so their team place survives); new students get the next free ids.
 */
export function updateMix(prev: MixStudent[], picks: MixPick[]): MixStudent[] {
  const old = new Map(prev.map((m) => [mixKey(m.class, m.sid), m]))
  let next = prev.reduce((n, m) => Math.max(n, m.id), 0) + 1
  return picks.map((p) => {
    const kept = old.get(mixKey(p.class, p.student.id))
    const id = kept ? kept.id : next++
    return { id, class: p.class, sid: p.student.id, no: p.student.no, nick: p.student.nick }
  })
}

/** The mixed students as a roster for the team setup screen. */
export function mixRoster(mix: MixStudent[]): Student[] {
  return mix.map((m) => ({ id: m.id, no: m.no, nick: m.nick, active: true }))
}

/** A new team setup for a mixed group (status "setup", group mode). */
export function mixedSession(game: string, mix: MixStudent[], size = 4, level: Level = 'M.2', now = new Date()): Session {
  const t = now.getTime()
  return {
    id: newSessionId(now),
    createdAt: t,
    updatedAt: t,
    status: 'setup',
    class: MIXED_CLASS,
    game,
    level,
    mode: 'group',
    mix,
    size,
    bins: resizeBins([], binCountFor(mix.length, size)),
    absent: [],
    teacher: false,
    leaveOut: false,
    teams: [],
    teacherTeam: null,
    log: [],
    scores: null,
    notes: '',
  }
}

/** Henry changed the pick: new mix, students who left are taken out of their teams, team count fits again. */
export function applyMix(s: Session, mix: MixStudent[]): Partial<Session> {
  const ids = new Set(mix.map((m) => m.id))
  const bins = s.bins.map((b) => ({ ...b, members: b.members.filter((id) => ids.has(id)) }))
  const count = binCountFor(mix.length, s.size)
  return { mix, bins: bins.length === count ? bins : resizeBins(bins, count) }
}

/**
 * Names to show students: the nickname, or "Nok (2/3)" when two students in the group share it.
 * Only for the screen: Results rows keep the plain nickname.
 */
export function displayTeams(teams: Team[]): Team[] {
  const all = teams.flatMap((t) => t.members)
  if (!all.some((m) => m.class)) return teams
  const seen = new Map<string, Set<string>>()
  for (const m of all) {
    const k = m.nick.trim().toLowerCase()
    if (!seen.has(k)) seen.set(k, new Set())
    seen.get(k)!.add(`${m.class ?? ''}|${m.no}`)
  }
  const show = (m: Member): Member => {
    const same = seen.get(m.nick.trim().toLowerCase())
    return same && same.size > 1 && m.class ? { ...m, nick: `${m.nick} (${shortClass(m.class)})` } : m
  }
  return teams.map((t) => ({ ...t, members: t.members.map(show) }))
}

/** Who already played this game in a mixed group: "class|student id" -> the session they played in. */
export type PlayedMap = Record<string, string>

/** Mark everyone in this mixed session as played (their earlier sessions are replaced by this one). */
export function markPlayed(played: PlayedMap, sessionId: string, mix: MixStudent[]): PlayedMap {
  const out = { ...played }
  for (const m of mix) out[mixKey(m.class, m.sid)] = sessionId
  return out
}

/** Played in an earlier group (not the one being set up now). */
export function playedBefore(played: PlayedMap, cls: string, sid: number, currentSession?: string): boolean {
  const s = played[mixKey(cls, sid)]
  return !!s && s !== currentSession
}
