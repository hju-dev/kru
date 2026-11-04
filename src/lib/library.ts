/** Recently played + Favorites on the home screen: kept on this phone only (kru-prefs IndexedDB). */
export const RECENT_MAX = 6

/** Put a game first in the recently played list (no repeats, at most RECENT_MAX). */
export function addRecent(list: readonly string[], slug: string, max = RECENT_MAX): string[] {
  return [slug, ...list.filter((s) => s !== slug)].slice(0, max)
}

/** Add a game to the favorites, or take it out again. */
export function toggleFavorite(list: readonly string[], slug: string): string[] {
  return list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]
}
