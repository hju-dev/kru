import { useCallback, useEffect, useState } from 'react'

/** How long a game gets to say kru:ready before Kru offers "Try again" (slow phone + no internet). */
export const FRAME_READY_MS = 12_000

/**
 * Watches a game frame: if the game never says it's ready (it didn't download, or it broke),
 * `stuck` turns true so the screen can say so instead of staying blank. A new `key` starts over.
 */
export function useFrameReady(key: number) {
  const [readyKey, setReadyKey] = useState<number | null>(null)
  const [stuckKey, setStuckKey] = useState<number | null>(null)
  useEffect(() => {
    const t = setTimeout(() => setStuckKey(key), FRAME_READY_MS)
    return () => clearTimeout(t)
  }, [key])
  const markReady = useCallback(() => setReadyKey(key), [key])
  return { stuck: stuckKey === key && readyKey !== key, markReady }
}
