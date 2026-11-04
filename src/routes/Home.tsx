import { Link } from 'react-router'
import { SyncPill } from '../components/SyncPill'
import { useApp } from '../store/app'
import './Home.css'

export function Home() {
  const { data, lastClass, setLastClass, syncError, syncing } = useApp()
  const classes = (data?.classes ?? []).filter((c) => !c.archived)
  const selected = classes.find((c) => c.name === lastClass) ?? null
  const roster = selected ? (data?.rosters[selected.name] ?? []) : []
  const present = roster.filter((s) => s.active)
  const inactive = roster.length - present.length

  return (
    <main className="screen home">
      <header className="topbar">
        <div className="logo">
          K<span>ru</span>
        </div>
        <div className="topbar-right">
          <SyncPill />
          <Link className="btn small" to="/admin/settings">
            Dashboard
          </Link>
        </div>
      </header>

      {!data && (
        <div className="card">
          {syncing ? (
            <p className="muted">Loading your classes…</p>
          ) : (
            <p className="error">
              No saved data yet. {syncError ?? 'Connect to the internet and tap the sync button.'}
            </p>
          )}
        </div>
      )}

      {data && classes.length === 0 && (
        <div className="card">
          <h2>No classes yet</h2>
          <p className="muted">
            Type your students into the <b>Rosters</b> tab of your Google Sheet (Class · No · Nickname · Active), then
            tap the sync button above.
          </p>
        </div>
      )}

      {classes.length > 0 && (
        <section aria-label="Choose class">
          <div className="class-grid" role="list">
            {classes.map((c) => (
              <button
                key={c.name}
                role="listitem"
                className={`class-btn${c.name === lastClass ? ' selected' : ''}`}
                aria-pressed={c.name === lastClass}
                onClick={() => setLastClass(c.name)}
              >
                <span className="class-name">{c.name}</span>
                <span className="class-count">{(data?.rosters[c.name] ?? []).filter((s) => s.active).length}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {selected && (
        <section className="card roster" aria-label={`${selected.name} roster`}>
          <div className="roster-head">
            <h2>{selected.name}</h2>
            <span className="muted">
              {present.length} students{selected.level ? ` · level ${selected.level}` : ''}
              {inactive > 0 ? ` · ${inactive} inactive hidden` : ''}
            </span>
          </div>
          {present.length === 0 ? (
            <p className="muted">No active students in this class.</p>
          ) : (
            <ul className="chips">
              {present.map((s) => (
                <li key={s.no} className="chip">
                  <b>{s.no}</b> · {s.nick}
                </li>
              ))}
            </ul>
          )}
          <p className="muted note">Games and team setup arrive in Phase 2.</p>
        </section>
      )}

      {classes.length > 0 && !selected && <p className="muted">Tap a class to see its students.</p>}
    </main>
  )
}
