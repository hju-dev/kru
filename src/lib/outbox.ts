import type { Submission } from './results'

/**
 * Finished games waiting to reach the Sheet. Every submission goes here first, then the app
 * tries to send it. On failure it stays and is retried on launch, when the phone comes back
 * online, and every 60 seconds while Kru is open.
 */
export interface OutboxEntry {
  id: string // the SessionID
  label: string // "M.3/2 · Scoreboard · 4 Nov 14:05"
  payload: Submission
  queuedAt: number
  attempts: number
  lastError: string | null
}

export function outboxLabel(p: Submission): string {
  const time = p.rows[0]?.Time ?? ''
  return `${p.session.Class} · ${p.session.Game} · ${p.session.Date}${time ? ' ' + time : ''}`
}
