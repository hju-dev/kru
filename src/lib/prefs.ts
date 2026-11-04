import { createStore, get, set } from 'idb-keyval'

/** Small per-device settings (not in the Sheet). */
export interface Prefs {
  keepAwake: boolean
  /** "YYYY-MM-DD": the Overview's "this term" counts from here */
  termStart: string
}

const store = createStore('kru-prefs', 'kv')

/** Thai school terms roughly start mid-May and November: default to the most recent of those. */
export function defaultTermStart(now = new Date()): string {
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  if (m >= 11) return `${y}-11-01`
  if (m >= 5) return `${y}-05-01`
  return `${y - 1}-11-01`
}

export async function loadPrefs(): Promise<Prefs> {
  const saved = (await get<Partial<Prefs>>('prefs', store)) ?? {}
  return { keepAwake: saved.keepAwake ?? true, termStart: saved.termStart ?? defaultTermStart() }
}

export async function savePrefs(p: Prefs) {
  await set('prefs', p, store)
}

/** Unsaved edits (e.g. a roster being edited) kept on the device so nothing is lost if a save fails. */
export const drafts = {
  get: <T>(key: string) => get<T>(`draft:${key}`, store),
  set: <T>(key: string, value: T) => set(`draft:${key}`, value, store),
  clear: (key: string) => set(`draft:${key}`, undefined, store),
}
