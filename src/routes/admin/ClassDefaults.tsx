import { useState } from 'react'
import * as api from '../../lib/api'
import { adminErrorText } from '../../store/admin'
import { useApp } from '../../store/app'

/** Default team size per class (saved in the Classes tab of the Sheet). */
export function ClassDefaults() {
  const { data, conn, sync } = useApp()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const classes = (data?.classes ?? []).filter((c) => !c.archived)
  if (!classes.length) return null

  async function setSize(cls: string, size: number | null) {
    if (!conn) return
    setBusy(cls)
    setError(null)
    try {
      await api.saveClass(conn, cls, { defaultTeamSize: size })
      await sync()
    } catch (err) {
      setError(`${cls}: ${adminErrorText(err)}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card">
      <h2>Default team size</h2>
      <p className="muted small">The team size the setup screen starts with for each class. You can still change it before a game.</p>
      {error && <p className="error">{error}</p>}
      <div className="size-list">
        {classes.map((c) => {
          const size = c.defaultTeamSize ?? 4
          return (
            <div key={c.name} className="size-row">
              <b>{c.name}</b>
              <div className="stepper">
                <button onClick={() => void setSize(c.name, Math.max(2, size - 1))} disabled={busy !== null || size <= 2} aria-label={`${c.name} smaller teams`}>
                  −
                </button>
                <span>
                  <b>{size}</b>
                  {c.defaultTeamSize == null && <span className="muted"> (default)</span>}
                </span>
                <button onClick={() => void setSize(c.name, Math.min(6, size + 1))} disabled={busy !== null || size >= 6} aria-label={`${c.name} bigger teams`}>
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
