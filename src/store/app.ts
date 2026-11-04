import { create } from 'zustand'
import { ApiError, fetchBootstrap, ping } from '../lib/api'
import { storage } from '../lib/storage'
import type { Bootstrap, Connection } from '../types'

type Status = 'loading' | 'signedOut' | 'ready'

interface AppState {
  status: Status
  conn: Connection | null
  data: Bootstrap | null
  syncedAt: number | null
  syncing: boolean
  syncError: string | null
  lastClass: string | null

  /** Load the saved connection + data from the phone, then refresh from the Sheet if online. */
  init: () => Promise<void>
  /** Test the connection and download the rosters. Throws ApiError with a plain message on failure. */
  signIn: (conn: Connection) => Promise<void>
  signOut: () => Promise<void>
  /** Refresh classes, rosters and team sets from the Sheet. Keeps the saved copy on failure. */
  sync: () => Promise<void>
  setLastClass: (name: string) => void
}

export const useApp = create<AppState>((setState, getState) => ({
  status: 'loading',
  conn: null,
  data: null,
  syncedAt: null,
  syncing: false,
  syncError: null,
  lastClass: null,

  async init() {
    const [conn, cached, lastClass] = await Promise.all([
      storage.getConnection(),
      storage.getBootstrap(),
      storage.getLastClass(),
    ])
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
  },

  async signIn(conn) {
    const clean = { url: conn.url.trim(), key: conn.key.trim() }
    await ping(clean)
    const data = await fetchBootstrap(clean)
    const syncedAt = Date.now()
    await storage.setConnection(clean)
    await storage.setBootstrap({ data, syncedAt })
    setState({ status: 'ready', conn: clean, data, syncedAt, syncError: null })
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
      setState({ syncError: err instanceof ApiError ? err.message : `Sync failed: ${(err as Error).message}` })
    } finally {
      setState({ syncing: false })
    }
  },

  setLastClass(name) {
    setState({ lastClass: name })
    void storage.setLastClass(name)
  },
}))
