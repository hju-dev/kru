import { timeAgo } from '../lib/time'
import { useOnline } from '../lib/useOnline'
import { useApp } from '../store/app'

/** Small status pill: synced / syncing / offline / sync problem. Tapping it syncs. */
export function SyncPill() {
  const { syncing, syncedAt, syncError, conn, sync } = useApp()
  const online = useOnline()
  const demo = conn?.url === 'demo'

  let tone = ''
  let text = `Synced ${timeAgo(syncedAt)}`
  if (demo) text = 'Demo mode'
  else if (syncing) text = 'Syncing…'
  else if (!online) {
    tone = 'warn'
    text = `Offline · saved ${timeAgo(syncedAt)}`
  } else if (syncError) {
    tone = 'bad'
    text = 'Sync problem · tap to retry'
  }

  return (
    <button
      className={`pill ${tone}`}
      style={{ background: 'transparent', cursor: 'pointer' }}
      onClick={() => void sync()}
      disabled={syncing || !online}
      title={syncError ?? undefined}
    >
      <span className="dot" aria-hidden />
      {text}
    </button>
  )
}
