import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { loadPrefs } from '../../lib/prefs'
import { emptyFilter, filterSessions, studentTotals, teamsOf } from '../../lib/stats'
import { timeAgo } from '../../lib/time'
import { useAdmin } from '../../store/admin'
import { useApp } from '../../store/app'

export function Overview() {
  const { results, loading, error, loadResults, fetchedAt } = useAdmin()
  const { outbox, syncedAt, data } = useApp()
  const [termStart, setTermStart] = useState<string | null>(null)

  useEffect(() => {
    void loadResults()
    void loadPrefs().then((p) => setTermStart(p.termStart))
  }, [loadResults])

  const sessions = useMemo(() => (results ? filterSessions(results.sessions, emptyFilter) : []), [results])
  const recent = sessions.slice(0, 5)

  // top 5 students per class since the start of term
  const topByClass = useMemo(() => {
    if (!results || !termStart) return []
    const termSessions = filterSessions(results.sessions, { ...emptyFilter, from: termStart })
    const totals = studentTotals(results, termSessions)
    const classes = (data?.classes ?? []).filter((c) => !c.archived).map((c) => c.name)
    const byClass = new Map<string, typeof totals>()
    for (const t of totals) byClass.set(t.class, [...(byClass.get(t.class) ?? []), t])
    const names = [...new Set([...classes, ...byClass.keys()])]
    return names
      .map((name) => ({ name, top: (byClass.get(name) ?? []).sort((a, b) => b.total - a.total).slice(0, 5) }))
      .filter((c) => c.top.length > 0)
  }, [results, termStart, data])

  return (
    <main className="admin-page">
      <div className="page-head">
        <h1>Overview</h1>
        <button className="btn small" onClick={() => void loadResults(true)} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {error && <p className="error">{error} {results && <span className="muted">Showing the copy saved {timeAgo(fetchedAt)}.</span>}</p>}

      <div className="stat-grid">
        <section className="card">
          <h2>Status</h2>
          <dl className="mini-dl">
            <dt>Rosters synced</dt>
            <dd>{timeAgo(syncedAt)}</dd>
            <dt>Results loaded</dt>
            <dd>{timeAgo(fetchedAt)}</dd>
            <dt>Outbox</dt>
            <dd>
              {outbox.length === 0 ? (
                'All sent ✓'
              ) : (
                <Link to="/admin/settings" className="error">
                  {outbox.length} waiting to send
                </Link>
              )}
            </dd>
            <dt>Games played</dt>
            <dd>{sessions.length}</dd>
          </dl>
        </section>

        <section className="card">
          <h2>Last 5 games</h2>
          {recent.length === 0 && <p className="muted">{loading ? 'Loading…' : 'No games submitted yet.'}</p>}
          <div className="list">
            {recent.map((s) => {
              const top = results ? teamsOf(results.rows, s.id)[0] : undefined
              return (
                <Link key={s.id} className="list-item" to={`/admin/results?session=${encodeURIComponent(s.id)}`}>
                  <span className="grow">
                    <b>
                      {s.game} · {s.class}
                    </b>
                    <span className="sub">
                      {s.date} {s.time}
                      {top ? ` · winner ${top.team} (${top.points})` : ''}
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      </div>

      <section className="card">
        <h2>Top students this term</h2>
        <p className="muted small">Since {termStart} (change it in Settings → Options).</p>
        {topByClass.length === 0 && <p className="muted">No results this term yet.</p>}
        <div className="top-grid">
          {topByClass.map((c) => (
            <div key={c.name} className="top-class">
              <h3>{c.name}</h3>
              <ol>
                {c.top.map((t) => (
                  <li key={t.key}>
                    <span>
                      {t.no} · {t.nick}
                    </span>
                    <b>{t.total}</b>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
