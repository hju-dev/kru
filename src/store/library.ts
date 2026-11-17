import { createStore, get, set } from 'idb-keyval'
import { create } from 'zustand'
import { currentSlug } from '../lib/games'
import { addRecent, toggleFavorite } from '../lib/library'

const store = createStore('kru-prefs', 'kv')

interface LibraryState {
  favorites: string[]
  recent: string[]
  loaded: boolean
  load: () => Promise<void>
  toggleFavorite: (slug: string) => void
  played: (slug: string) => void
}

/** Favorites + recently played games, per device. Failures to save are ignored (it's only a convenience). */
export const useLibrary = create<LibraryState>((setState, getState) => ({
  favorites: [],
  recent: [],
  loaded: false,
  async load() {
    if (getState().loaded) return
    const [favorites, recent] = await Promise.all([
      get<string[]>('favorites', store).catch(() => undefined),
      get<string[]>('recent', store).catch(() => undefined),
    ])
    const fix = (list: string[] | undefined) => [...new Set((list ?? []).map(currentSlug))]
    setState({ favorites: fix(favorites), recent: fix(recent), loaded: true })
  },
  toggleFavorite(slug) {
    const favorites = toggleFavorite(getState().favorites, slug)
    setState({ favorites })
    void set('favorites', favorites, store).catch(() => undefined)
  },
  played(slug) {
    const recent = addRecent(getState().recent, slug)
    setState({ recent })
    void set('recent', recent, store).catch(() => undefined)
  },
}))
