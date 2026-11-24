import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { BackButton } from '../components/BackButton'
import { findGame } from '../lib/games'
import { SetPreviewSheet } from '../components/SetPreviewSheet'
import { loadBankPreview, loadSets, loadUnitPreview, type SetOption, type SetPreview } from '../lib/sets'
import { unitsFor } from '../lib/units'
import { useApp } from '../store/app'
import type { Level } from '../types'
import './Home.css'

const LEVELS: Level[] = ['M.1', 'M.2', 'M.3']

/**
 * Step 2 (Henry, Nov 24): tap the level, then see ALL the question sets of that game and pick exactly the one you want,
 * before the team builder. The choice travels in the address (?level=&set=&unit=) and is also kept in this screen's own
 * address, so Back from the team builder returns here with everything still selected.
 */
export function Sets() {
  const { game: slug = '' } = useParams()
  const navigate = useNavigate()
  const [query] = useSearchParams()
  const game = findGame(slug)
  const { data, lastClass } = useApp()
  const cls = data?.classes.find((c) => c.name === lastClass) ?? null
  const [level, setLevel] = useState<Level>((query.get('level') as Level | null) ?? cls?.level ?? 'M.2')
  const [setKey, setSetKey] = useState(query.get('set') ?? '')
  const [unit, setUnit] = useState(query.get('unit') ?? '')
  // the (i) button: a summary and the list of questions of one set
  const [peek, setPeek] = useState<{ title: string; source: SetPreview | (() => Promise<SetPreview>) } | null>(null)
  const sheet = useMemo(() => (data?.questions ?? []).filter((q) => q.level === level), [data, level])
  // the sets for the current game + level; 'loading' until they arrive
  const askKey = `${slug}|${level}|${cls?.name ?? ''}|${sheet.length}`
  const [result, setResult] = useState<{ key: string; options: SetOption[] | null } | null>(null)
  const options: SetOption[] | null | 'loading' = result && result.key === askKey ? result.options : 'loading'

  useEffect(() => {
    if (!game || !cls) return
    let cancelled = false
    loadSets(slug, level, cls.name, sheet)
      .then((o) => !cancelled && setResult({ key: askKey, options: o }))
      .catch(() => !cancelled && setResult({ key: askKey, options: null }))
    return () => {
      cancelled = true
    }
  }, [slug, level, cls, game, sheet, askKey])

  if (!game || game.status !== 'ready' || !cls) return <Navigate to={game ? `/class/${game.slug}` : '/'} replace />

  const listed = Array.isArray(options)
  // games whose content is a unit only (no list of sets): the old built-in / unit choice
  const units = !listed && options !== 'loading' && game.units ? unitsFor(level, slug, cls.name) : []
  const needsPick = listed && options.length > 0
  const ready = options !== 'loading' && (!needsPick || setKey !== '')

  function pickLevel(l: Level) {
    setLevel(l)
    setSetKey('')
    setUnit('')
  }

  function next() {
    const q = new URLSearchParams()
    if (game!.levels.length > 0) q.set('level', level)
    if (setKey) q.set('set', setKey)
    if (unit) q.set('unit', unit)
    const qs = q.toString()
    // remember the choice in this screen's own address, so Back from the team builder comes back to it unchanged
    navigate(`/sets/${slug}${qs ? `?${qs}` : ''}`, { replace: true })
    navigate(`/setup/${slug}${qs ? `?${qs}` : ''}`)
  }

  const groups: { name: string; items: SetOption[] }[] = []
  if (listed) for (const o of options) (groups.find((g) => g.name === o.group) ?? (groups[groups.length] = { name: o.group, items: [] })).items.push(o)

  return (
    <main className="screen home step">
      <header className="topbar">
        <BackButton fallback={`/class/${slug}`} />
        <span className="step-count">Step 2 of 3</span>
      </header>
      <h1 className="step-title">{game.title}</h1>
      <p className="muted step-sub">{cls.name} · choose the question set</p>

      {game.levels.length > 0 && (
        <div className="seg lvl-seg" role="group" aria-label="Level">
          {LEVELS.filter((l) => game.levels.includes(l)).map((l) => (
            <button key={l} aria-pressed={level === l} onClick={() => pickLevel(l)}>
              {l}
            </button>
          ))}
        </div>
      )}

      {options === 'loading' && <p className="muted">Loading the sets…</p>}

      {groups.map((g) => (
        <section key={g.name} className="set-group" aria-label={g.name}>
          <h2 className="set-group-title">{g.name}</h2>
          <div className="set-list" role="radiogroup">
            {g.items.map((o) => {
              const on = setKey === o.key && unit === (o.unit ?? '')
              return (
                <div key={`${o.unit ?? ''}:${o.key}`} className="set-row">
                  <button
                    className={`set-opt${on ? ' on' : ''}`}
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setSetKey(o.key)
                      setUnit(o.unit ?? '')
                    }}
                  >
                    <b>{o.label}</b>
                    <small>{o.sub}</small>
                  </button>
                  {o.preview && (
                    <button className="set-info" aria-label={`What is in ${o.label}?`} title="See the questions" onClick={() => setPeek({ title: o.label, source: o.preview! })}>
                      ⓘ
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {units.length > 0 && (
        <div className="set-list" role="radiogroup" aria-label="Question sets">
          <div className="set-row">
            <button className={`set-opt${unit === '' ? ' on' : ''}`} role="radio" aria-checked={unit === ''} onClick={() => setUnit('')}>
              <b>Built-in content</b>
              <small>The questions that come with the game</small>
            </button>
            {slug === 'race-board' && (
              <button className="set-info" aria-label="What is in the built-in questions?" title="See the questions" onClick={() => setPeek({ title: 'Built-in questions', source: () => loadBankPreview(level) })}>
                ⓘ
              </button>
            )}
          </div>
          {units.map((u) => (
            <div key={u.id} className="set-row">
              <button className={`set-opt${unit === u.id ? ' on' : ''}`} role="radio" aria-checked={unit === u.id} onClick={() => setUnit(u.id)}>
                <b>{u.title}</b>
                <small>From your lessons</small>
              </button>
              <button className="set-info" aria-label={`What is in ${u.title}?`} title="See the questions" onClick={() => setPeek({ title: u.title, source: () => loadUnitPreview(u.id) })}>
                ⓘ
              </button>
            </div>
          ))}
        </div>
      )}

      {peek && <SetPreviewSheet title={peek.title} source={peek.source} onClose={() => setPeek(null)} />}

      <button className="btn primary step-btn" disabled={!ready} onClick={next}>
        {needsPick && setKey === '' ? 'Choose a set first' : 'Next: make the teams ▶'}
      </button>
    </main>
  )
}
