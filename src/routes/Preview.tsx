import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { findGame, gameUrl } from '../lib/games'
import type { Level } from '../types'
import './Play.css'

const LEVELS: Level[] = ['M.1', 'M.2', 'M.3']

/** Wipe the game's practice save, so the How to play slides show first every time. */
function clearPractice(slug: string) {
  const path = gameUrl(slug)
  try {
    for (const k of ['kru-mock-state:', 'kru-mock-day:', 'kru-mock-keep:']) sessionStorage.removeItem(k + path)
  } catch {
    /* private mode: fine */
  }
}

/**
 * Library → ? on a game card: try the game before setting up teams. It opens in practice mode
 * (the How to play slides first, then the game with made-up teams S1…S30). Nothing is saved or sent.
 */
export function Preview() {
  const { game: slug = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const game = findGame(slug)
  const first = (LEVELS as string[]).includes(params.get('level') ?? '') ? (params.get('level') as Level) : 'M.1'
  const [level, setLevel] = useState<Level>(first)
  const [key, setKey] = useState(() => {
    clearPractice(slug)
    return 0
  })
  const [menu, setMenu] = useState(false)

  if (!game || game.status !== 'ready') return <Navigate to="/" replace />
  const solo = !game.modes.includes('group')
  const src = `${gameUrl(slug)}?mock=1&level=${level}&teams=4${solo ? '&mode=solo' : ''}`

  function restart(l: Level) {
    clearPractice(slug)
    setLevel(l)
    setKey((k) => k + 1)
    setMenu(false)
  }

  return (
    <main className="play">
      <iframe key={key} className="game-frame" src={src} title={`${game.title} (practice)`} allow="screen-wake-lock; microphone" />
      <button className="home-btn" onClick={() => setMenu(true)} aria-label="Practice menu">
        ⌂
      </button>
      {menu && (
        <div className="play-menu-backdrop" onClick={() => setMenu(false)}>
          <div className="play-menu" role="dialog" aria-label="Practice menu" onClick={(e) => e.stopPropagation()}>
            <p className="muted">
              {game.title} · practice with made-up teams. Nothing is saved.
            </p>
            {game.levels.length > 0 && (
              <div className="seg" role="group" aria-label="Level">
                {LEVELS.map((l) => (
                  <button key={l} aria-pressed={l === level} onClick={() => restart(l)}>
                    {l}
                  </button>
                ))}
              </div>
            )}
            <button className="btn" onClick={() => restart(level)}>
              Start again (slides first)
            </button>
            <button className="btn primary" onClick={() => navigate('/', { replace: true })}>
              Back to library
            </button>
            <button className="btn ghost" onClick={() => setMenu(false)}>
              Keep trying it
            </button>
          </div>
        </div>
      )}
      <div className="turn-hint" aria-hidden>
        <span>↻</span>
        Turn the phone sideways
      </div>
    </main>
  )
}
