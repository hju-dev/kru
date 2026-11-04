import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { ResultSession, ResultsData } from '../../lib/api'
import { classKeyOf } from '../../lib/bootstrap'
import { emptyFilter, filterSessions, studentTotals, teamsOf, toCsv, type Filter, type StudentTotal } from '../../lib/stats'
import { timeAgo } from '../../lib/time'
import { adminErrorText, useAdmin } from '../../store/admin'
import { useApp } from '../../store/app'

/**
 * On a phone, hand the file to the share sheet (Save to Files, AirDrop, Mail…), because a
 * plain download is unreliable in an iPhone home-screen app. On a laptop, download it.
 */
function download(name: string, text: string) {
  const file = new File([text], name, { type: 'text/csv' })
  const phone = window.matchMedia('(pointer: coarse)').matches
  if (phone && navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], title: name }).catch((err: unknown) => {
      // cancelled by the user: do nothing; anything else: fall back to a normal download
      if (!(err instanceof DOMException && err.name === 'AbortError')) saveFile(name, text)
    })
    return
  }
  saveFile(name, text)
}

function saveFile(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function ResultsAdmin() {
  const { results, loading, error, loadResults, fetchedAt } = useAdmin()
  const sheetUrl = useApp((s) => s.data?.sheetUrl)
  const appClasses = useApp((s) => s.data?.classes)
  const classNames = useMemo(() => appClasses?.map((c) => c.name) ?? [], [appClasses])
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>(emptyFilter)
  const [view, setView] = useState<'sessions' | 'students'>('sessions')
  const [student, setStudent] = useState<StudentTotal | null>(null)
  const selectedId = params.get('session')

  useEffect(() => void loadResults(), [loadResults])

  const sessions = useMemo(() => (results ? filterSessions(results.sessions, filter) : []), [results, filter])
  const totals = useMemo(() => (results ? studentTotals(results, sessions.filter((s) => !s.deleted)) : []), [results, sessions])
  const games = useMemo(() => [...new Set(results?.sessions.map((s) => s.game) ?? [])].sort(), [results])
  const classes = useMemo(() => {
    const keys = new Map<string, string>()
    for (const n of [...classNames, ...(results?.sessions.map((s) => s.class) ?? [])]) if (!keys.has(classKeyOf(n))) keys.set(classKeyOf(n), n)
    return [...keys.values()].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
  }, [classNames, results])
  const selected = results?.sessions.find((s) => s.id === selectedId) ?? null

  const set = (p: Partial<Filter>) => setFilter((f) => ({ ...f, ...p }))
  const select = (id: string | null) => setParams(id ? { session: id } : {}, { replace: true })

  function exportCsv() {
    if (!results) return
    const stamp = new Date().toISOString().slice(0, 10)
    if (view === 'students') {
      download(`kru-students-${stamp}.csv`, toCsv(['Class', 'No', 'Nickname', 'Total', 'Games', 'Average', 'LastPlayed'], totals.map((t) => [t.class, t.no, t.nick, t.total, t.games, t.average, t.lastPlayed])))
    } else {
      const byId = new Map(sessions.map((s) => [s.id, s]))
      const lines = results.rows
        .filter((r) => byId.has(r.s))
        .map((r) => {
          const s = byId.get(r.s)!
          return [s.date, s.time, s.class, s.game, s.level, r.team, r.no, r.nick, r.points, r.rank, s.deleted ? 'deleted' : '']
        })
      download(`kru-results-${stamp}.csv`, toCsv(['Date', 'Time', 'Class', 'Game', 'Level', 'Team', 'No', 'Nickname', 'Points', 'Rank', 'Deleted'], lines))
    }
  }

  return (
    <main className="admin-page">
      <div className="page-head">
        <h1>Results</h1>
        <button className="btn small" onClick={() => void loadResults(true)} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <button className="btn small" onClick={exportCsv} disabled={!results}>
          Export CSV
        </button>
        {sheetUrl && (
          <a className="btn small ghost" href={sheetUrl} target="_blank" rel="noreferrer">
            Open in Google Sheets
          </a>
        )}
      </div>
      {error && (
        <p className="error">
          {error} {results && <span className="muted">Showing the copy saved {timeAgo(fetchedAt)}.</span>}
        </p>
      )}

      <div className="filters">
        <label>
          Class
          <select value={filter.class} onChange={(e) => set({ class: e.target.value })}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Game
          <select value={filter.game} onChange={(e) => set({ game: e.target.value })}>
            <option value="">All games</option>
            {games.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label>
          Level
          <select value={filter.level} onChange={(e) => set({ level: e.target.value })}>
            <option value="">All</option>
            <option>M.1</option>
            <option>M.2</option>
            <option>M.3</option>
          </select>
        </label>
        <label>
          From
          <input type="date" value={filter.from} onChange={(e) => set({ from: e.target.value })} />
        </label>
        <label>
          To
          <input type="date" value={filter.to} onChange={(e) => set({ to: e.target.value })} />
        </label>
        <label className="check-inline">
          <input type="checkbox" checked={filter.showDeleted} onChange={(e) => set({ showDeleted: e.target.checked })} />
          Show deleted
        </label>
        {JSON.stringify(filter) !== JSON.stringify(emptyFilter) && (
          <button className="btn small ghost" onClick={() => setFilter(emptyFilter)}>
            Clear filters
          </button>
        )}
      </div>

      <div className="tabs" role="group" aria-label="View">
        <button aria-pressed={view === 'sessions'} onClick={() => setView('sessions')}>
          By game ({sessions.length})
        </button>
        <button aria-pressed={view === 'students'} onClick={() => setView('students')}>
          By student ({totals.length})
        </button>
      </div>

      {!results && loading && <p className="muted">Loading results from your Sheet…</p>}

      {results && view === 'sessions' && (
        <div className={`split${selected ? ' has-detail' : ''}`}>
          <div className={`list${selected ? ' hide-on-phone' : ''}`}>
            {sessions.length === 0 && <p className="muted">No games match these filters.</p>}
            {sessions.map((s) => {
              const top = teamsOf(results.rows, s.id)[0]
              const students = results.rows.filter((r) => r.s === s.id).length
              return (
                <button key={s.id} className={`list-item${s.id === selectedId ? ' selected' : ''}${s.deleted ? ' deleted' : ''}`} onClick={() => select(s.id)}>
                  <span className="grow">
                    <b>
                      {s.game} · {s.class}
                    </b>
                    <span className="sub">
                      {s.date} {s.time} · {s.level} · {students} students{top ? ` · winner ${top.team}` : ''}
                    </span>
                  </span>
                  {s.deleted && <span className="pill-tag bad">Deleted</span>}
                  {s.editedAt && !s.deleted && <span className="pill-tag">Edited</span>}
                </button>
              )
            })}
          </div>
          {selected && <SessionDetail key={selected.id} session={selected} data={results} onClose={() => select(null)} />}
        </div>
      )}

      {results && view === 'students' && (
        <div className="split">
          <div className={`table-wrap${student ? ' hide-on-phone' : ''}`}>
            <table className="rtable cards">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>No</th>
                  <th>Nickname</th>
                  <th className="num">Total</th>
                  <th className="num">Games</th>
                  <th className="num">Average</th>
                  <th>Last played</th>
                </tr>
              </thead>
              <tbody>
                {totals.map((t) => (
                  <tr key={t.key} className="clickable" onClick={() => setStudent(t)}>
                    <td data-label="Class">{t.class}</td>
                    <td data-label="No">{t.no}</td>
                    <td data-label="Nickname">
                      <b>{t.nick}</b>
                    </td>
                    <td data-label="Total" className="num">
                      {t.total}
                    </td>
                    <td data-label="Games" className="num">
                      {t.games}
                    </td>
                    <td data-label="Average" className="num">
                      {t.average}
                    </td>
                    <td data-label="Last played">{t.lastPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totals.length === 0 && <p className="muted pad">No results match these filters.</p>}
          </div>
          {student && <StudentHistory student={student} data={results} sessions={sessions} onClose={() => setStudent(null)} />}
        </div>
      )}
    </main>
  )
}

function SessionDetail({ session: s, data, onClose }: { session: ResultSession; data: ResultsData; onClose: () => void }) {
  const { updatePoints, setDeleted } = useAdmin()
  const teams = teamsOf(data.rows, s.id)
  const original = Object.fromEntries(teams.map((t) => [t.team, t.points]))
  const [draft, setDraft] = useState<Record<string, number>>(original)
  const [teacher, setTeacher] = useState<number | null>(s.teacherTeamPoints)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [armed, setArmed] = useState(false)
  const dirty = teams.some((t) => draft[t.team] !== t.points) || teacher !== s.teacherTeamPoints
  const notes = data.rows.find((r) => r.s === s.id && r.notes)?.notes

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await updatePoints(s.id, draft, s.teacherTeamPoints === null ? undefined : teacher)
      setSaved(true)
    } catch (err) {
      setError(adminErrorText(err)) // the edit stays on screen so it can be retried
    } finally {
      setBusy(false)
    }
  }

  async function toggleDelete() {
    if (!s.deleted && !armed) return setArmed(true)
    setBusy(true)
    setError(null)
    try {
      await setDeleted(s.id, !s.deleted)
      setArmed(false)
    } catch (err) {
      setError(adminErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  const step = (team: string, d: number) => {
    setSaved(false)
    setDraft((x) => ({ ...x, [team]: (x[team] ?? 0) + d }))
  }

  return (
    <section className="card sticky detail">
      <div className="page-head">
        <button className="btn small ghost show-on-phone" onClick={onClose}>
          ← All games
        </button>
        <h2 className="grow">
          {s.game} · {s.class}
        </h2>
        {s.deleted && <span className="pill-tag bad">Deleted</span>}
      </div>
      <p className="muted small">
        {s.date} {s.time} · {s.level} · {s.mode}
        {s.editedAt ? ` · edited ${timeAgo(Date.parse(s.editedAt))}` : ''}
        {notes ? ` · “${notes}”` : ''}
      </p>
      <div className="list">
        {teams.map((t) => (
          <div key={t.team} className="team-edit">
            <div className="grow">
              <b>{t.team}</b>
              <span className="sub">{t.members.map((m) => m.nick).join(', ')}</span>
            </div>
            <div className="points-edit">
              <button onClick={() => step(t.team, -1)} aria-label={`${t.team} minus 1`} disabled={s.deleted}>
                −
              </button>
              <span className={draft[t.team] !== t.points ? 'changed' : ''}>{draft[t.team]}</span>
              <button onClick={() => step(t.team, 1)} aria-label={`${t.team} plus 1`} disabled={s.deleted}>
                +
              </button>
            </div>
          </div>
        ))}
        {s.teacherTeamPoints !== null && (
          <div className="team-edit teacher">
            <div className="grow">
              <b>Teacher team</b>
              <span className="sub">Not in student results</span>
            </div>
            <div className="points-edit">
              <button onClick={() => { setSaved(false); setTeacher((v) => (v ?? 0) - 1) }} disabled={s.deleted}>
                −
              </button>
              <span className={teacher !== s.teacherTeamPoints ? 'changed' : ''}>{teacher}</span>
              <button onClick={() => { setSaved(false); setTeacher((v) => (v ?? 0) + 1) }} disabled={s.deleted}>
                +
              </button>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="error">
          Not saved: {error} Your changes are still here; try again when you’re online.
        </p>
      )}
      <div className="row-actions">
        <button className="btn primary" onClick={() => void save()} disabled={!dirty || busy || s.deleted}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        {dirty && (
          <button className="btn ghost" onClick={() => { setDraft(original); setTeacher(s.teacherTeamPoints) }} disabled={busy}>
            Undo changes
          </button>
        )}
        {saved && !dirty && <span className="saved-note">Updated just now ✓</span>}
        <span className="grow" />
        <button className={`btn ${s.deleted ? '' : armed ? 'danger' : 'ghost'}`} onClick={() => void toggleDelete()} disabled={busy}>
          {s.deleted ? 'Restore game' : armed ? 'Tap again to delete' : 'Delete game'}
        </button>
      </div>
      <p className="muted small">Deleting hides this game from all totals. It stays in the Sheet (marked Deleted) and can be restored.</p>
    </section>
  )
}

function StudentHistory({ student, data, sessions, onClose }: { student: StudentTotal; data: ResultsData; sessions: ResultSession[]; onClose: () => void }) {
  const byId = new Map(sessions.filter((s) => !s.deleted).map((s) => [s.id, s]))
  const rows = data.rows
    .filter((r) => byId.has(r.s) && classKeyOf(byId.get(r.s)!.class) === classKeyOf(student.class) && r.no === student.no && r.nick.toLowerCase() === student.nick.toLowerCase())
    .map((r) => ({ r, s: byId.get(r.s)! }))
  return (
    <section className="card sticky detail">
      <div className="page-head">
        <button className="btn small ghost show-on-phone" onClick={onClose}>
          ← All students
        </button>
        <h2 className="grow">
          {student.no} · {student.nick} <span className="muted">({student.class})</span>
        </h2>
      </div>
      <p className="muted small">
        {student.total} points · {student.games} games · average {student.average}
      </p>
      <div className="table-wrap">
        <table className="rtable cards">
          <thead>
            <tr>
              <th>Date</th>
              <th>Game</th>
              <th>Team</th>
              <th className="num">Points</th>
              <th className="num">Rank</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, s }) => (
              <tr key={r.s}>
                <td data-label="Date">{s.date}</td>
                <td data-label="Game">{s.game}</td>
                <td data-label="Team">{r.team}</td>
                <td data-label="Points" className="num">
                  {r.points}
                </td>
                <td data-label="Rank" className="num">
                  {r.rank}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
