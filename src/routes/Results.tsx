import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { DEMO_URL } from '../lib/demo'
import { findGame } from '../lib/games'
import { buildSubmission, rankTeams } from '../lib/results'
import type { Session } from '../lib/session'
import { useApp } from '../store/app'
import { useSessions } from '../store/sessions'
import './Results.css'

export function Results() {
  const { id = '' } = useParams()
  const session = useSessions((st) => st.sessions[id])
  const loaded = useSessions((st) => st.loaded)
  useEffect(() => void useSessions.getState().load(), [])

  if (!loaded) return <main className="screen" />
  if (!session || session.status === 'discarded' || session.status === 'setup') return <Navigate to="/" replace />
  if (session.status === 'playing') return <Navigate to={`/play/${id}`} replace />
  return <ResultsView session={session} />
}

function ResultsView({ session: s }: { session: Session }) {
  const navigate = useNavigate()
  const patch = useSessions((st) => st.patch)
  const { queueResults, conn, outbox } = useApp()
  const [armedDiscard, setArmedDiscard] = useState(false)
  const [busy, setBusy] = useState(false)
  const game = findGame(s.game)
  const scores = s.scores ?? {}
  const pts = (teamId: string) => scores[teamId] ?? 0
  const ranks = rankTeams(s.teams.map((t) => ({ teamId: t.id, points: pts(t.id) })))
  const submitted = s.status === 'submitted'
  const waiting = outbox.some((e) => e.id === s.id)

  function setPoints(teamId: string, value: number) {
    if (!Number.isFinite(value)) return
    patch(s.id, (cur) => ({ scores: { ...(cur.scores ?? {}), [teamId]: Math.max(-999, Math.min(9999, Math.round(value))) } }))
  }

  async function submit() {
    setBusy(true)
    const payload = buildSubmission(s, scores, s.notes.trim(), game?.title ?? s.game)
    patch(s.id, { status: 'submitted', submittedAt: Date.now() })
    await queueResults(payload)
    setBusy(false)
  }

  function discard() {
    if (!armedDiscard) {
      setArmedDiscard(true)
      setTimeout(() => setArmedDiscard(false), 4000)
      return
    }
    patch(s.id, { status: 'discarded' })
    navigate('/', { replace: true })
  }

  function backToGame() {
    patch(s.id, { status: 'playing' })
    navigate(`/play/${s.id}`, { replace: true })
  }

  const rowsCount = s.teams.reduce((n, t) => n + t.members.length, 0)
  const order = s.teams.slice().sort((a, b) => ranks[a.id] - ranks[b.id])

  return (
    <main className="screen results">
      <header className="results-bar">
        {!submitted && (
          <button className="btn small ghost" onClick={backToGame}>
            ← Game
          </button>
        )}
        <h1>
          {game?.title ?? s.game} <span className="muted">· {s.class} · {s.level}</span>
        </h1>
        {!submitted && (
          <>
            <button className={`btn small ${armedDiscard ? 'danger' : 'ghost'}`} onClick={discard}>
              {armedDiscard ? 'Tap again to discard' : 'Discard'}
            </button>
            <button className="btn primary" onClick={() => void submit()} disabled={busy}>
              {busy ? 'Saving…' : 'Submit scores'}
            </button>
          </>
        )}
      </header>

      {submitted && (
        <div className={`card done ${waiting ? 'waiting' : ''}`} role="status">
          {conn?.url === DEMO_URL ? (
            <p>
              <b>Demo mode:</b> nothing was sent. In your real Sheet this would add {rowsCount} rows to Results.
            </p>
          ) : waiting ? (
            <p>
              <b>Saved on this phone.</b> No connection to the Sheet right now; it will send automatically. You can check
              it in Dashboard → Outbox.
            </p>
          ) : (
            <p>
              <b>Sent to your Sheet ✓</b> {rowsCount} student rows added to Results.
            </p>
          )}
          <Link className="btn primary" to="/">
            Back to library
          </Link>
        </div>
      )}

      <section className="result-list" aria-label="Team scores">
        {order.map((t) => (
          <div key={t.id} className={`result-row${ranks[t.id] === 1 ? ' first' : ''}`}>
            <span className="rank" aria-label={`Rank ${ranks[t.id]}`}>
              {ranks[t.id]}
            </span>
            <div className="result-team">
              <b>{t.name}</b>
              {s.mode === 'group' && <span className="muted">{t.members.map((m) => m.nick).join(', ')}</span>}
            </div>
            <Points value={pts(t.id)} disabled={submitted} onChange={(v) => setPoints(t.id, v)} label={t.name} />
          </div>
        ))}
        {s.teacherTeam && (
          <div className="result-row teacher">
            <span className="rank">T</span>
            <div className="result-team">
              <b>{s.teacherTeam.name}</b>
              <span className="muted">Teacher team: kept in Sessions, not in student results</span>
            </div>
            <Points value={pts(s.teacherTeam.id)} disabled={submitted} onChange={(v) => setPoints(s.teacherTeam!.id, v)} label={s.teacherTeam.name} />
          </div>
        )}
      </section>

      {!submitted && (
        <div className="field notes">
          <label htmlFor="notes">Notes (optional)</label>
          <input id="notes" value={s.notes} maxLength={200} placeholder="e.g. Unit 3 vocabulary" onChange={(e) => patch(s.id, { notes: e.target.value })} />
        </div>
      )}
    </main>
  )
}

function Points({ value, onChange, disabled, label }: { value: number; onChange: (v: number) => void; disabled: boolean; label: string }) {
  const [text, setText] = useState(String(value))
  const [editing, setEditing] = useState(false)
  const shown = editing ? text : String(value)
  return (
    <div className="points">
      <button onClick={() => onChange(value - 1)} disabled={disabled} aria-label={`${label} minus 1`}>
        −
      </button>
      <input
        inputMode="numeric"
        pattern="-?[0-9]*"
        value={shown}
        disabled={disabled}
        aria-label={`${label} points`}
        onFocus={() => {
          setText(String(value))
          setEditing(true)
        }}
        onChange={(e) => {
          setText(e.target.value)
          const n = parseInt(e.target.value, 10)
          if (Number.isFinite(n)) onChange(n)
        }}
        onBlur={() => setEditing(false)}
      />
      <button onClick={() => onChange(value + 1)} disabled={disabled} aria-label={`${label} plus 1`}>
        +
      </button>
    </div>
  )
}
