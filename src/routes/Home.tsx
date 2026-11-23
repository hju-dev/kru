import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { SyncPill } from '../components/SyncPill'
import { SectionIcon } from '../components/SectionIcon'
import { findGame, gameTitle, librarySections, SECTIONS, type GameInfo, type SectionId } from '../lib/games'
import { useLibrary } from '../store/library'
import { useApp } from '../store/app'
import { useSessions } from '../store/sessions'
import './Home.css'

/** What a game card does (Henry, Nov 23): tools open at once; every other game goes on to "Choose a class". */
export function openGame(g: GameInfo, navigate: (to: string) => void) {
  if (g.status !== 'ready') return
  if (g.modes.length === 0) {
    useLibrary.getState().played(g.slug)
    navigate(`/tool/${g.slug}`)
    return
  }
  navigate(`/class/${g.slug}`)
}

export function Home() {
  const { data, syncError, syncing, outbox } = useApp()
  const sessions = useSessions((s) => s.sessions)
  const navigate = useNavigate()
  const [showOpen, setShowOpen] = useState(false)
  const classes = (data?.classes ?? []).filter((c) => !c.archived)

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

  const cats: { id: SectionId | 'favorites' | 'recent'; title: string; color: string; count: number }[] = [
    ...librarySections().map((s) => ({ id: s.id as SectionId, title: s.title, color: s.color, count: s.games.length })),
    ...(favGames.length ? [{ id: 'favorites' as const, title: 'Favorites', color: 'var(--gold)', count: favGames.length }] : []),
    ...(recentGames.length ? [{ id: 'recent' as const, title: 'Recently played', color: 'var(--muted)', count: recentGames.length }] : []),
  ]

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

      {open.length > 0 && (
        <section className="inprogress" aria-label="Games in progress">
          <button className="inprogress-btn" aria-expanded={showOpen} onClick={() => setShowOpen((v) => !v)}>
            <span>
              Games in progress <b>({open.length})</b>
            </span>
            <span aria-hidden="true">{showOpen ? '▲' : '▼'}</span>
          </button>
          {showOpen &&
            open.map((s) => (
              <Link key={s.id} className="resume" to={s.status === 'review' ? `/results/${s.id}` : `/play/${s.id}`}>
                <span>
                  {s.status === 'review' ? 'Scores to review' : 'In progress'}: <b>{gameTitle(s.game)}</b> · {s.class}
                </span>
                <span className="resume-go">{s.status === 'review' ? 'Review ▶' : 'Continue ▶'}</span>
              </Link>
            ))}
        </section>
      )}

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

      <nav className="cat-grid" aria-label="Game types">
        {cats.map((c) => (
          <button key={c.id} className="cat-btn" style={{ '--sec': c.color } as React.CSSProperties} onClick={() => navigate(`/library/${c.id}`)}>
            <span className="cat-ico">
              <SectionIcon id={c.id} />
            </span>
            <span className="cat-title">{c.title}</span>
            <span className="cat-count">{c.count} {c.count === 1 ? 'game' : 'games'}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

export function GameCard({ game: g, fav, onPick, onTry }: { game: GameInfo; fav: boolean; onPick: (g: GameInfo) => void; onTry: (g: GameInfo) => void }) {
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
      {g.status === 'ready' && g.modes.length > 0 && (
        <button className="try-btn" aria-label={`How to play ${g.title} (try it first)`} onClick={() => onTry(g)}>
          ?
        </button>
      )}
    </div>
  )
}
