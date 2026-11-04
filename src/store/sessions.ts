import { create } from 'zustand'
import type { Session } from '../lib/session'
import { storage } from '../lib/storage'

interface SessionsState {
  sessions: Record<string, Session>
  loaded: boolean
  load: () => Promise<void>
  put: (s: Session) => void
  patch: (id: string, change: Partial<Session> | ((s: Session) => Partial<Session>)) => void
  remove: (id: string) => void
}

const KEEP_FINISHED = 30
let saveTimer: ReturnType<typeof setTimeout> | undefined

/** Saves to the phone shortly after the last change (games may save state often). */
function persistSoon(sessions: Record<string, Session>) {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void storage.setSessions(prune(sessions)), 300)
}

/** Keep every unfinished game, and only the most recent finished ones. */
function prune(sessions: Record<string, Session>): Record<string, Session> {
  const finished = Object.values(sessions)
    .filter((s) => s.status === 'submitted' || s.status === 'discarded')
    .sort((a, b) => b.updatedAt - a.updatedAt)
  const drop = new Set(finished.slice(KEEP_FINISHED).map((s) => s.id))
  return Object.fromEntries(Object.entries(sessions).filter(([id]) => !drop.has(id)))
}

/** Games on this phone: being set up, being played, waiting for review, or recently finished. */
export const useSessions = create<SessionsState>((setState, getState) => ({
  sessions: {},
  loaded: false,

  async load() {
    if (getState().loaded) return
    const saved = (await storage.getSessions()) ?? {}
    setState({ sessions: { ...saved, ...getState().sessions }, loaded: true })
  },

  put(s) {
    const sessions = { ...getState().sessions, [s.id]: { ...s, updatedAt: Date.now() } }
    setState({ sessions })
    persistSoon(sessions)
  },

  patch(id, change) {
    const cur = getState().sessions[id]
    if (!cur) return
    const delta = typeof change === 'function' ? change(cur) : change
    const sessions = { ...getState().sessions, [id]: { ...cur, ...delta, updatedAt: Date.now() } }
    setState({ sessions })
    persistSoon(sessions)
  },

  remove(id) {
    const sessions = { ...getState().sessions }
    delete sessions[id]
    setState({ sessions })
    persistSoon(sessions)
  },
}))
