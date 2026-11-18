import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { findGame } from '../lib/games'
import { applyMix, mixedSession, mixKey, MIXED_CLASS, playedBefore, updateMix, type MixPick as Pick, type PlayedMap } from '../lib/mix'
import { storage } from '../lib/storage'
import { useApp } from '../store/app'
import { useSessions } from '../store/sessions'
import './MixPick.css'

/**
 * Mixed group (Christmas Race Board): one list of every class, with a header per class.
 * Tap the students who came; Next goes to the normal team setup with only them.
 */
export function MixPick() {
  const { game: slug = '' } = useParams()
  const navigate = useNavigate()
  const game = findGame(slug)
  const data = useApp((s) => s.data)
  const { sessions, put, patch } = useSessions()
  const [query, setQuery] = useState('')
  const [played, setPlayed] = useState<PlayedMap>({})
  const [picked, setPicked] = useState<Set<string> | null>(null)

  useEffect(() => void useSessions.getState().load(), [])
  useEffect(() => {
    void storage.getPlayed(slug).then((p) => setPlayed(p ?? {}))
  }, [slug])

  // the unfinished mixed setup for this game, if Henry is changing the group
  const session = Object.values(sessions).find((s) => s.status === 'setup' && s.game === slug && !!s.mix && s.class === MIXED_CLASS)

  const classes = useMemo(
    () =>
      (data?.classes ?? [])
        .filter((c) => !c.archived)
        .map((c) => ({ name: c.name, students: (data?.rosters[c.name] ?? []).filter((s) => s.active) }))
        .filter((c) => c.students.length > 0),
    [data],
  )

  // until Henry taps: the group already picked (when changing it), otherwise nobody
  const start = useMemo(() => new Set((session?.mix ?? []).map((m) => mixKey(m.class, m.sid))), [session?.mix])
  const sel = picked ?? start
  const q = query.trim().toLowerCase()
  const match = (s: { no: number; nick: string }) => !q || s.nick.toLowerCase().includes(q) || String(s.no) === q

  function toggle(keys: string[], on: boolean) {
    setPicked((prev) => {
      const next = new Set(prev ?? start)
      for (const k of keys) {
        if (on) next.add(k)
        else next.delete(k)
      }
      return next
    })
  }

  function next() {
    // in class order, then roster order, so the ids (and the pool on the next screen) stay tidy
    const picks: Pick[] = classes.flatMap((c) =>
      c.students.filter((s) => sel.has(mixKey(c.name, s.id))).map((s) => ({ class: c.name, student: s })),
    )
    if (session) {
      patch(session.id, applyMix(session, updateMix(session.mix ?? [], picks)))
    } else {
      put(mixedSession(slug, updateMix([], picks), 4, data?.classes.find((c) => c.level)?.level ?? 'M.2'))
    }
    navigate(`/setup/${slug}?mix=1`, { replace: !!session })
  }

  if (!game || !game.mixed) {
    return (
      <main className="screen">
        <p>That game can’t be played by a mixed group.</p>
        <Link className="btn" to="/">
          ← Back to library
        </Link>
      </main>
    )
  }

  return (
    <main className="mix">
      <header className="mix-bar">
        <Link className="btn small ghost" to={session ? `/setup/${slug}?mix=1` : '/'} aria-label="Back">
          ←
        </Link>
        <div className="mix-title">
          <b>🎄 Mixed group</b>
          <span className="muted game-name"> · {game.title}</span>
        </div>
        <div className="mix-search">
          <input
            type="search"
            placeholder="Find a name or number"
            aria-label="Find a student"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn small ghost" disabled={sel.size === 0} onClick={() => setPicked(new Set())}>
            Clear all
          </button>
        </div>
        <span className="mix-count" aria-live="polite">
          <b>{sel.size}</b> picked
        </span>
        <button className="btn primary" disabled={sel.size === 0} onClick={next}>
          Next ▶
        </button>
      </header>

      <div className="mix-list">
        {classes.length === 0 && <p className="muted">No students yet. Sync first (the button on the home screen).</p>}
        {classes.length > 0 && q && !classes.some((c) => c.students.some(match)) && <p className="muted">Nobody matches “{query.trim()}”.</p>}
        {classes.map((c) => {
          const shown = c.students.filter(match)
          if (shown.length === 0) return null
          const keys = c.students.map((s) => mixKey(c.name, s.id))
          const count = keys.filter((k) => sel.has(k)).length
          const all = count === keys.length
          return (
            <section key={c.name} className="mix-class" aria-label={c.name}>
              <div className="mix-head">
                <h2>{c.name}</h2>
                <span className="muted">
                  {count} / {keys.length}
                </span>
                <span className="grow" />
                {!q && (
                  <button className="btn small" onClick={() => toggle(keys, !all)}>
                    {all ? 'Remove all' : 'Add all'}
                  </button>
                )}
              </div>
              <div className="mix-grid">
                {shown.map((s) => {
                  const k = mixKey(c.name, s.id)
                  const on = sel.has(k)
                  const was = playedBefore(played, c.name, s.id, session?.id)
                  return (
                    <button key={k} className={`mix-st${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggle([k], !on)}>
                      <span className="nick">{s.nick}</span>
                      <span className="meta">
                        <b>{s.no}</b>
                        {was && <i className="played">played</i>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
