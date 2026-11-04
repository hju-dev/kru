import { createStore, del, get, set } from 'idb-keyval'
import type { Bootstrap, Connection } from '../types'

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
  /** Sign out: forget the connection and the cached Sheet data. */
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
