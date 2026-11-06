import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { SyncPill } from '../components/SyncPill'
import { SectionIcon } from '../components/SectionIcon'
import { findGame, gameTitle, librarySections, SECTIONS, type GameInfo, type SectionId } from '../lib/games'
import { useLibrary } from '../store/library'
import { quickSession, todayKey } from '../lib/session'
import { storage } from '../lib/storage'
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
  useEffect(() => void useLibrary.getState().load(), [])
  const favorites = useLibrary((s) => s.favorites)
  const recent = useLibrary((s) => s.recent)
  // only games that still exist and are ready (a renamed or removed game just drops out)
  const favGames = useMemo(() => favorites.map(findGame).filter((g): g is GameInfo => !!g && g.status === 'ready'), [favorites])
  const recentGames = useMemo(() => recent.map(findGame).filter((g): g is GameInfo => !!g && g.status === 'ready'), [recent])

  // games left open (played but not reviewed) — "Back to library (keep game)"
  const open = Object.values(sessions)
    .filter((s) => s.status === 'playing' || s.status === 'review')
    .sort((a, b) => b.updatedAt - a.updatedAt)

  function pickGame(g: GameInfo) {
    if (g.status !== 'ready') return
    // tools (no teams, no results) open straight away, no class needed
    if (g.modes.length === 0) {
      useLibrary.getState().played(g.slug)
      return navigate(`/tool/${g.slug}`)
    }
    if (!selected) {
      setNudge(true)
      setTimeout(() => setNudge(false), 1500)
      return
    }
    useLibrary.getState().played(g.slug)
    if (g.classTool) {
      // already open for this class? go back to it (no pile of "game in progress" banners)
      const open = Object.values(sessions).find((s) => s.status === 'playing' && s.game === g.slug && s.class === selected.name)
      if (open) return navigate(`/play/${open.id}`)
      // Name Picker / Class Order: no team setup; today's absent students (from team setup) are left out
      const roster = data?.rosters[selected.name] ?? []
      void storage.getAbsent(selected.name, todayKey()).then((absent = []) => {
        const s = quickSession(selected, g.slug, roster, absent)
        useSessions.getState().put(s)
        navigate(`/play/${s.id}`)
      })
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
          <Link className="btn small" to="/admin">
            Dashboard
            {outbox.length > 0 && <span className="badge">{outbox.length}</span>}
          </Link>
        </div>
      </header>

      {open.map((s) => (
        <Link key={s.id} className="resume" to={s.status === 'review' ? `/results/${s.id}` : `/play/${s.id}`}>
          <span>
            {s.status === 'review' ? 'Scores to review' : 'Game in progress'}: <b>{gameTitle(s.game)}</b> · {s.class}
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

      {classes.length > 0 && favGames.length > 0 && (
        <GameRow id="favorites" title="Favorites" color="var(--gold)" games={favGames} favorites={favorites} onPick={pickGame} />
      )}
      {classes.length > 0 && recentGames.length > 0 && (
        <GameRow id="recent" title="Recently played" color="var(--muted)" games={recentGames} favorites={favorites} onPick={pickGame} />
      )}
      {classes.length > 0 &&
        librarySections().map((sec) => (
          <GameRow key={sec.id} id={sec.id} title={sec.title} color={sec.color} games={sec.games} favorites={favorites} onPick={pickGame} />
        ))}
    </main>
  )
}

function GameRow(props: { id: SectionId | 'favorites' | 'recent'; title: string; color: string; games: GameInfo[]; favorites: string[]; onPick: (g: GameInfo) => void }) {
  const { id, title, color, games, favorites, onPick } = props
  return (
    <section aria-label={title} className={`library-section sec-${id}`}>
      <h2 className="section-head" style={{ '--sec': color } as React.CSSProperties}>
        <SectionIcon id={id} />
        {title}
      </h2>
      <div className="library">
        {games.map((g) => (
          <GameCard key={g.slug} game={g} fav={favorites.includes(g.slug)} onPick={onPick} />
        ))}
      </div>
    </section>
  )
}

function GameCard({ game: g, fav, onPick }: { game: GameInfo; fav: boolean; onPick: (g: GameInfo) => void }) {
  return (
    <div className="game-card-wrap" style={{ '--sec': SECTIONS.find((x) => x.id === g.section)?.color } as React.CSSProperties}>
      <button className={`game-card${g.status === 'ready' ? '' : ' soon'}`} onClick={() => onPick(g)} disabled={g.status !== 'ready'}>
        <span className="game-title">{g.title}</span>
        <span className="game-meta">
          {g.modes.includes('group') && <span className="tag">Group</span>}
          {g.modes.includes('solo') && !g.classTool && <span className="tag">Solo</span>}
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
      {g.status === 'ready' && (
        <button
          className={`fav-btn${fav ? ' on' : ''}`}
          aria-pressed={fav}
          aria-label={fav ? `Remove ${g.title} from favorites` : `Add ${g.title} to favorites`}
          onClick={() => useLibrary.getState().toggleFavorite(g.slug)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
