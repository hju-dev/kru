import { createStore, del, get, set } from 'idb-keyval'
import type { Bootstrap, Connection } from '../types'
import type { OutboxEntry } from './outbox'
import type { Session } from './session'

/**
 * Everything Kru keeps on the phone lives in one IndexedDB database.
 * The Google Sheet is the backup; this is the offline copy.
 */
const store = createStore('kru', 'kv')

export interface CachedBootstrap {
  data: Bootstrap
  syncedAt: number
}

export const storage = {
  getConnection: () => get<Connection>('connection', store),
  setConnection: (c: Connection) => set('connection', c, store),
  getBootstrap: () => get<CachedBootstrap>('bootstrap', store),
  setBootstrap: (b: CachedBootstrap) => set('bootstrap', b, store),
  getLastClass: () => get<string>('lastClass', store),
  setLastClass: (name: string) => set('lastClass', name, store),
  getSessions: () => get<Record<string, Session>>('sessions', store),
  setSessions: (s: Record<string, Session>) => set('sessions', s, store),
  getOutbox: () => get<OutboxEntry[]>('outbox', store),
  setOutbox: (o: OutboxEntry[]) => set('outbox', o, store),
  /** Students marked absent today in a class, so the next game that day remembers them. */
  getAbsent: (cls: string, day: string) => get<number[]>(`absent:${cls}:${day}`, store),
  setAbsent: (cls: string, day: string, nos: number[]) => set(`absent:${cls}:${day}`, nos, store),
  /** A tool's own saved settings (for example Talk Timer presets), kept on this phone. */
  getToolState: (slug: string) => get<unknown>(`tool:${slug}`, store),
  setToolState: (slug: string, state: unknown) => set(`tool:${slug}`, state, store),
  /**
   * Sign out: forget the connection and the cached Sheet data.
   * Unsent results (outbox) and games in progress are kept, so nothing is lost.
   */
  async clearAll() {
    await Promise.all([del('connection', store), del('bootstrap', store), del('lastClass', store)])
  },
}

/** Ask the browser not to clear Kru's saved data when space runs low. Returns whether it agreed. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
