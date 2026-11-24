import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { BackButton } from '../components/BackButton'
import { SectionIcon } from '../components/SectionIcon'
import { findGame, librarySections, type GameInfo, type SectionId } from '../lib/games'
import { useApp } from '../store/app'
import { useLibrary } from '../store/library'
import { GameCard, openGame } from './Home'
import './Home.css'

const ready = (list: string[]) => list.map(findGame).filter((g): g is GameInfo => !!g && g.status === 'ready')

/** One game type on its own page (Henry, Nov 23): Quizzes, Speaking, Reading, Writing, Tools, Favorites, Recently played. */
export function Library() {
  const { section = '' } = useParams()
  const navigate = useNavigate()
  const { data } = useApp()
  useEffect(() => void useLibrary.getState().load(), [])
  const favorites = useLibrary((s) => s.favorites)
  const recent = useLibrary((s) => s.recent)
  const sections = librarySections()
  const sec = sections.find((s) => s.id === section)
  const games = useMemo(
    () => (section === 'favorites' ? ready(favorites) : section === 'recent' ? ready(recent) : (sec?.games ?? [])),
    [section, favorites, recent, sec],
  )
  if (!sec && section !== 'favorites' && section !== 'recent') return <Navigate to="/" replace />
  const title = section === 'favorites' ? 'Favorites' : section === 'recent' ? 'Recently played' : sec!.title
  const color = section === 'favorites' ? 'var(--gold)' : section === 'recent' ? 'var(--muted)' : sec!.color

  function tryGame(g: GameInfo) {
    navigate(`/preview/${g.slug}`)
  }

  return (
    <main className="screen home">
      <header className="topbar">
        <BackButton fallback="/" label="◀ Home" />
        <h1 className="lib-title" style={{ '--sec': color } as React.CSSProperties}>
          <SectionIcon id={section as SectionId | 'favorites' | 'recent'} />
          {title}
        </h1>
        <span />
      </header>
      {!data && <p className="muted">Loading…</p>}
      <div className="library lib-page">
        {games.map((g) => (
          <GameCard key={g.slug} game={g} fav={favorites.includes(g.slug)} onPick={(x) => openGame(x, navigate)} onTry={tryGame} />
        ))}
      </div>
      {games.length === 0 && <p className="muted">Nothing here yet.</p>}
    </main>
  )
}
