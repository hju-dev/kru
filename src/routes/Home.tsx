import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { SyncPill } from '../components/SyncPill'
import { findGame, GAMES, type GameInfo } from '../lib/games'
import { useApp } from '../store/app'
import { useSessions } from '../store/sessions'
import './Home.css'

export function Home() {
  const { data, lastClass, setLastClass, syncError, syncing, outbox } = useApp()
  const sessions = useSessions((s) => s.sessions)
  const navigate = useNavigate()
  const [nudge, setNudge] = useState(false)
  const classes = (data?.classes ?? []).filter((c) => !c.archived)
  const selected = classes.find((c) => c.name === lastClass) ?? null

  useEffect(() => void useSessions.getState().load(), [])

  // games left open (played but not reviewed) — "Back to library (keep game)"
  const open = Object.values(sessions)
    .filter((s) => s.status === 'playing' || s.status === 'review')
    .sort((a, b) => b.updatedAt - a.updatedAt)

  function pickGame(g: GameInfo) {
    if (g.status !== 'ready') return
    if (!selected) {
      setNudge(true)
      setTimeout(() => setNudge(false), 1500)
      return
    }
    navigate(`/setup/${g.slug}`)
  }

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
            {outbox.length > 0 && <span className="badge">{outbox.length}</span>}
          </Link>
        </div>
      </header>

      {open.map((s) => (
        <Link key={s.id} className="resume" to={s.status === 'review' ? `/results/${s.id}` : `/play/${s.id}`}>
          <span>
            {s.status === 'review' ? 'Scores to review' : 'Game in progress'}: <b>{findGame(s.game)?.title ?? s.game}</b> · {s.class}
          </span>
          <span className="resume-go">{s.status === 'review' ? 'Review ▶' : 'Continue ▶'}</span>
        </Link>
      ))}

      {!data && (
        <div className="card">
          {syncing ? (
            <p className="muted">Loading your classes…</p>
          ) : (
            <p className="error">No saved data yet. {syncError ?? 'Connect to the internet and tap the sync button.'}</p>
          )}
        </div>
      )}

      {data && classes.length === 0 && (
        <div className="card">
          <h2>No classes yet</h2>
          <p className="muted">
            Type your students into the <b>Rosters</b> tab of your Google Sheet (Class · No · Nickname · Active), then tap
            the sync button above.
          </p>
        </div>
      )}

      {classes.length > 0 && (
        <section aria-label="Choose class" className={nudge ? 'nudge' : ''}>
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
          {nudge && <p className="nudge-text">Choose a class first.</p>}
        </section>
      )}

      {classes.length > 0 && (
        <section aria-label="Games" className="library">
          {GAMES.map((g) => (
            <button
              key={g.slug}
              className={`game-card${g.status === 'ready' ? '' : ' soon'}`}
              onClick={() => pickGame(g)}
              disabled={g.status !== 'ready'}
            >
              <span className="game-title">{g.title}</span>
              <span className="game-meta">
                {g.modes.includes('group') && <span className="tag">Group</span>}
                {g.modes.includes('solo') && <span className="tag">Solo</span>}
                {g.minutes ? <span>{g.minutes} min</span> : null}
                {g.status !== 'ready' && <span className="soon-label">Coming soon</span>}
                {g.levels.length > 0 && (
                  <span className="dots" aria-label={`Levels ${g.levels.join(', ')}`}>
                    {['M.1', 'M.2', 'M.3'].map((l) => (
                      <i key={l} className={g.levels.includes(l as never) ? 'on' : ''} />
                    ))}
                  </span>
                )}
              </span>
            </button>
          ))}
        </section>
      )}
    </main>
  )
}
