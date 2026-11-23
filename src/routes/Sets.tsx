import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { findGame } from '../lib/games'
import { unitsFor } from '../lib/units'
import { useApp } from '../store/app'
import type { Level } from '../types'
import './Home.css'

const LEVELS: Level[] = ['M.1', 'M.2', 'M.3']

/**
 * Step 2 (Henry, Nov 23): the question sets. The level, then the built-in content or a unit from the lessons.
 * The team builder comes after this screen; the choice travels in the address (?level=&unit=).
 */
export function Sets() {
  const { game: slug = '' } = useParams()
  const navigate = useNavigate()
  const game = findGame(slug)
  const { data, lastClass } = useApp()
  const cls = data?.classes.find((c) => c.name === lastClass) ?? null
  const [level, setLevel] = useState<Level>(cls?.level ?? 'M.2')
  const [unit, setUnit] = useState('')
  if (!game || game.status !== 'ready' || !cls) return <Navigate to={game ? `/class/${game.slug}` : '/'} replace />

  const units = game.units ? unitsFor(level, slug, cls.name) : []
  const q = new URLSearchParams()
  if (game.levels.length > 0) q.set('level', level)
  if (unit) q.set('unit', unit)

  return (
    <main className="screen home step">
      <header className="topbar">
        <Link className="btn small" to={`/class/${slug}`}>
          ◀ Back
        </Link>
        <span className="step-count">Step 2 of 3</span>
      </header>
      <h1 className="step-title">{game.title}</h1>
      <p className="muted step-sub">
        {cls.name} · choose the question sets
      </p>

      {game.levels.length > 0 && (
        <div className="seg lvl-seg" role="group" aria-label="Level">
          {LEVELS.filter((l) => game.levels.includes(l)).map((l) => (
            <button
              key={l}
              aria-pressed={level === l}
              onClick={() => {
                setLevel(l)
                setUnit('')
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {units.length > 0 && (
        <div className="set-list" role="radiogroup" aria-label="Question sets">
          <button className={`set-opt${unit === '' ? ' on' : ''}`} role="radio" aria-checked={unit === ''} onClick={() => setUnit('')}>
            <b>Built-in content</b>
            <small>The questions that come with the game</small>
          </button>
          {units.map((u) => (
            <button key={u.id} className={`set-opt${unit === u.id ? ' on' : ''}`} role="radio" aria-checked={unit === u.id} onClick={() => setUnit(u.id)}>
              <b>{u.title}</b>
              <small>From your lessons</small>
            </button>
          ))}
        </div>
      )}

      <button className="btn primary step-btn" onClick={() => navigate(`/setup/${slug}${q.toString() ? `?${q.toString()}` : ''}`)}>
        Next: make the teams ▶
      </button>
    </main>
  )
}
