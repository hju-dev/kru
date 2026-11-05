import { useEffect } from 'react'
import { loadPrefs } from './prefs'

/** Keeps the screen on while a game is open (fails silently where not supported). */
export function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const request = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
        if (wl && document.visibilityState === 'visible') lock = await wl.request('screen')
      } catch {
        /* not supported or not allowed: Auto-Lock → Never is the backup */
      }
    }
    let enabled = false
    const onVisible = () => enabled && document.visibilityState === 'visible' && void request()
    // respects Settings → Options → Keep the screen awake
    void loadPrefs().then((p) => {
      enabled = p.keepAwake
      if (enabled) void request()
    })
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => undefined)
    }
  }, [])
}
