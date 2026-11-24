import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { BackButton } from '../components/BackButton'
import { Sheet } from '../components/Sheet'
import { findGame } from '../lib/games'
import { quickSession, todayKey } from '../lib/session'
import { storage } from '../lib/storage'
import { useApp } from '../store/app'
import { useLibrary } from '../store/library'
import { useSessions } from '../store/sessions'
import './Home.css'

/**
 * Step 1 after tapping a game (Henry, Nov 23): choose the class with ONE button (not a wall of classes on the home screen).
 * Then: question sets (games with levels or units) -> team builder. Class tools start straight away. Mixed groups
 * (Christmas Dash) can skip the class.
 */
export function ChooseClass() {
  const { game: slug = '' } = useParams()
  const navigate = useNavigate()
  const game = findGame(slug)
  const { data, setLastClass } = useApp()
  const sessions = useSessions((s) => s.sessions)
  const [query] = useSearchParams()
  const [chosen, setChosen] = useState<string | null>(query.get('class')) // asked every time; kept when you come Back to this screen
  const [pick, setPick] = useState(false)
  useEffect(() => void useSessions.getState().load(), [])
  const classes = (data?.classes ?? []).filter((c) => !c.archived)
  const selected = classes.find((c) => c.name === chosen) ?? null
  if (!game || game.status !== 'ready') return <Navigate to="/" replace />

  const needsSets = game.levels.length > 0 || !!game.units

  function next() {
    if (!selected || !game) return
    setLastClass(selected.name)
    // keep the choice in this screen's own address, so Back from the next screen returns here unchanged
    navigate(`/class/${game.slug}?class=${encodeURIComponent(selected.name)}`, { replace: true })
    useLibrary.getState().played(game.slug)
    if (game.classTool) {
      // already open for this class? go back to it
      const open = Object.values(sessions).find((s) => s.status === 'playing' && s.game === game.slug && s.class === selected.name)
      if (open) return navigate(`/play/${open.id}`)
      // Name Picker / Class Order: no team setup; today's absent students (from team setup) are left out
      const roster = data?.rosters[selected.name] ?? []
      void storage.getAbsent(selected.name, todayKey()).then((absent = []) => {
        const s = quickSession(selected, game.slug, roster, absent)
        useSessions.getState().put(s)
        navigate(`/play/${s.id}`)
      })
      return
    }
    navigate(needsSets ? `/sets/${game.slug}` : `/setup/${game.slug}`)
  }

  function mixed() {
    if (!game) return
    useLibrary.getState().played(game.slug)
    const open = Object.values(sessions).some((s) => s.status === 'setup' && s.game === game.slug && !!s.mix)
    navigate(open ? `/setup/${game.slug}?mix=1` : `/mix/${game.slug}`)
  }

  return (
    <main className="screen home step">
      <header className="topbar">
        <BackButton fallback={`/library/${game.section}`} />
        <span className="step-count">Step 1 of {needsSets ? 3 : 2}</span>
      </header>
      <h1 className="step-title">{game.title}</h1>
      <p className="muted step-sub">Which class is playing?</p>

      {game.mixed && (
        <button className="btn primary step-btn" onClick={mixed}>
          🎄 Mixed group (pick from every class)
        </button>
      )}
      {classes.length === 0 ? (
        <p className="muted">No classes yet. Add students in your Google Sheet, then sync on the home screen.</p>
      ) : (
        <button className={`class-pick${selected ? ' on' : ''}`} onClick={() => setPick(true)}>
          {selected ? (
            <>
              <span className="muted">Class</span> <b>{selected.name}</b> <span className="muted">· tap to change</span>
            </>
          ) : (
            <b>Choose a class</b>
          )}
        </button>
      )}
      <button className="btn primary step-btn" disabled={!selected} onClick={next}>
        Next ▶
      </button>

      {pick && (
        <Sheet title="Choose a class" onClose={() => setPick(false)}>
          <div className="class-grid" role="list">
            {classes.map((c) => (
              <button
                key={c.name}
                role="listitem"
                className={`class-btn${c.name === chosen ? ' selected' : ''}`}
                aria-pressed={c.name === chosen}
                onClick={() => {
                  setChosen(c.name)
                  setPick(false)
                }}
              >
                <span className="class-name">{c.name}</span>
                <span className="class-count">{(data?.rosters[c.name] ?? []).filter((s) => s.active).length}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </main>
  )
}
