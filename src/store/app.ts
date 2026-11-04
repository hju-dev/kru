import { create } from 'zustand'
import * as api from '../lib/api'
import { ApiError, fetchBootstrap, ping } from '../lib/api'
import { outboxLabel, type OutboxEntry } from '../lib/outbox'
import type { Submission } from '../lib/results'
import { storage } from '../lib/storage'
import type { Bootstrap, Connection, TeamSet } from '../types'

type Status = 'loading' | 'signedOut' | 'ready'

interface AppState {
  status: Status
  conn: Connection | null
  data: Bootstrap | null
  syncedAt: number | null
  syncing: boolean
  syncError: string | null
  lastClass: string | null
  outbox: OutboxEntry[]
  sending: boolean

  /** Load the saved connection + data from the phone, then refresh from the Sheet if online. */
  init: () => Promise<void>
  /** Test the connection and download the rosters. Throws ApiError with a plain message on failure. */
  signIn: (conn: Connection) => Promise<void>
  signOut: () => Promise<void>
  /** Refresh classes, rosters and team sets from the Sheet. Keeps the saved copy on failure. */
  sync: () => Promise<void>
  setLastClass: (name: string) => void

  /** Put a finished game in the outbox and try to send it. Resolves true if it reached the Sheet. */
  queueResults: (payload: Submission) => Promise<boolean>
  /** Try to send everything in the outbox, oldest first. */
  sendOutbox: () => Promise<void>
  removeFromOutbox: (id: string) => Promise<void>

  /** Save a named team set to the Sheet (needs internet). Throws ApiError on failure. */
  saveTeamSet: (set: Omit<TeamSet, 'savedAt'>) => Promise<void>
  deleteTeamSet: (id: string) => Promise<void>
}

const errorText = (err: unknown) => (err instanceof ApiError ? err.message : `Something went wrong: ${(err as Error).message}`)

export const useApp = create<AppState>((setState, getState) => {
  async function setOutbox(outbox: OutboxEntry[]) {
    setState({ outbox })
    await storage.setOutbox(outbox)
  }

  /** Update the cached team sets after a save or delete, without a full sync. */
  async function setTeamSets(teamSets: TeamSet[]) {
    const { data, syncedAt } = getState()
    if (!data) return
    const next = { ...data, teamSets }
    setState({ data: next })
    await storage.setBootstrap({ data: next, syncedAt: syncedAt ?? Date.now() })
  }

  return {
    status: 'loading',
    conn: null,
    data: null,
    syncedAt: null,
    syncing: false,
    syncError: null,
    lastClass: null,
    outbox: [],
    sending: false,

    async init() {
      const [conn, cached, lastClass, outbox] = await Promise.all([
        storage.getConnection(),
        storage.getBootstrap(),
        storage.getLastClass(),
        storage.getOutbox(),
      ])
      setState({ outbox: outbox ?? [] })
      if (!conn) {
        setState({ status: 'signedOut' })
        return
      }
      setState({
        status: 'ready',
        conn,
        data: cached?.data ?? null,
        syncedAt: cached?.syncedAt ?? null,
        lastClass: lastClass ?? null,
      })
      void getState().sync()
      void getState().sendOutbox()
    },

    async signIn(conn) {
      const clean = { url: conn.url.trim(), key: conn.key.trim() }
      await ping(clean)
      const data = await fetchBootstrap(clean)
      const syncedAt = Date.now()
      await storage.setConnection(clean)
      await storage.setBootstrap({ data, syncedAt })
      setState({ status: 'ready', conn: clean, data, syncedAt, syncError: null })
      void getState().sendOutbox()
    },

    async signOut() {
      await storage.clearAll()
      setState({ status: 'signedOut', conn: null, data: null, syncedAt: null, syncError: null, lastClass: null })
    },

    async sync() {
      const { conn, syncing } = getState()
      if (!conn || syncing) return
      setState({ syncing: true })
      try {
        const data = await fetchBootstrap(conn)
        const syncedAt = Date.now()
        await storage.setBootstrap({ data, syncedAt })
        setState({ data, syncedAt, syncError: null })
      } catch (err) {
        setState({ syncError: errorText(err) })
      } finally {
        setState({ syncing: false })
      }
    },

    setLastClass(name) {
      setState({ lastClass: name })
      void storage.setLastClass(name)
    },

    async queueResults(payload) {
      const entry: OutboxEntry = {
        id: payload.session.id,
        label: outboxLabel(payload),
        payload,
        queuedAt: Date.now(),
        attempts: 0,
        lastError: null,
      }
      // the outbox is saved on the phone BEFORE any network attempt, so nothing is lost
      await setOutbox([...getState().outbox.filter((e) => e.id !== entry.id), entry])
      await getState().sendOutbox()
      return !getState().outbox.some((e) => e.id === entry.id)
    },

    async sendOutbox() {
      const { conn, sending } = getState()
      if (!conn || sending || getState().outbox.length === 0) return
      setState({ sending: true })
      try {
        for (const entry of getState().outbox.slice()) {
          try {
            await api.submitResults(conn, entry.payload)
            await setOutbox(getState().outbox.filter((e) => e.id !== entry.id))
          } catch (err) {
            await setOutbox(
              getState().outbox.map((e) =>
                e.id === entry.id ? { ...e, attempts: e.attempts + 1, lastError: errorText(err) } : e,
              ),
            )
            // no signal or wrong key: the rest would fail the same way, so stop for now
            if (err instanceof ApiError && ['offline', 'timeout', 'unauthorised', 'not-json'].includes(err.kind)) break
          }
        }
      } finally {
        setState({ sending: false })
      }
    },

    async removeFromOutbox(id) {
      await setOutbox(getState().outbox.filter((e) => e.id !== id))
    },

    async saveTeamSet(set) {
      const { conn } = getState()
      if (!conn) throw new ApiError('unauthorised', 'Sign in first.')
      const savedAt = await api.saveTeamSet(conn, set)
      const others = (getState().data?.teamSets ?? []).filter((t) => t.id !== set.id)
      await setTeamSets([...others, { ...set, savedAt }])
    },

    async deleteTeamSet(id) {
      const { conn } = getState()
      if (!conn) throw new ApiError('unauthorised', 'Sign in first.')
      await api.deleteTeamSet(conn, id)
      await setTeamSets((getState().data?.teamSets ?? []).filter((t) => t.id !== id))
    },
  }
})
