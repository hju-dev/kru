import type { Level } from '../types'
import type { Bin } from './teams'

export type Mode = 'solo' | 'group'
export type SessionStatus = 'setup' | 'playing' | 'review' | 'submitted' | 'discarded'

export interface Member {
  no: number
  nick: string
}

export interface Team {
  id: string
  name: string
  members: Member[]
}

/** One game played by one class. Lives on the phone until it is submitted (or discarded). */
export interface Session {
  id: string
  createdAt: number
  updatedAt: number
  status: SessionStatus
  class: string
  game: string // slug
  level: Level
  mode: Mode

  // team setup (status "setup")
  size: number
  bins: Bin[]
  absent: number[]
  teacher: boolean
  leaveOut: boolean

  // fixed when the game starts
  teams: Team[]
  teacherTeam: { id: string; name: string } | null

  // while playing
  state?: unknown // the game's own saved state
  log: { teamId: string; delta: number; reason?: string; at: number }[]

  // review
  scores: Record<string, number> | null
  notes: string
  submittedAt?: number
}

export const TEACHER_NAME = 'T. Henry'

/** The message sent to a game when it opens (HANDOFF section 6). */
export function initMessage(s: Session) {
  return {
    type: 'kru:init',
    session: {
      id: s.id,
      class: s.class,
      level: s.level,
      mode: s.mode,
      teams: s.teams,
      teacherTeam: s.teacherTeam,
      resume: s.state,
    },
  }
}

/** "20261104-1405-k3f9": readable, sortable, unique enough for one teacher. */
export function newSessionId(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`
  return `${stamp}-${Math.random().toString(36).slice(2, 6)}`
}

export function todayKey(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}
