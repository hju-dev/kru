import { useMemo, useState } from 'react'
import { classKeyOf } from '../../lib/bootstrap'
import { binCountFor, binsFromTeamSet, clearBins, moveTo, resizeBins, shuffleTeams, unassigned, type Bin } from '../../lib/teams'
import { adminErrorText } from '../../store/admin'
import { useApp } from '../../store/app'
import type { Student, TeamSet } from '../../types'
import '../Setup.css' // shares chip / team-box styles with the classroom setup screen

export function TeamsAdmin() {
  const { data, lastClass } = useApp()
  const classes = (data?.classes ?? []).filter((c) => !c.archived)
  const [cls, setCls] = useState<string | null>(null)
  const [editing, setEditing] = useState<TeamSet | 'new' | null>(null)
  const current = classes.find((c) => c.name === cls) ?? classes.find((c) => c.name === lastClass) ?? classes[0] ?? null
  const sets = (data?.teamSets ?? []).filter((t) => current && classKeyOf(t.class) === classKeyOf(current.name))

  return (
    <main className="admin-page">
      <div className="page-head">
        <h1>Saved teams</h1>
        {current && !editing && (
          <button className="btn small" onClick={() => setEditing('new')}>
            + New team set
          </button>
        )}
      </div>

      {!editing && (
        <div className="class-chips" role="list">
          {classes.map((c) => (
            <button key={c.name} role="listitem" className={`class-chip${c.name === current?.name ? ' selected' : ''}`} onClick={() => setCls(c.name)}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {current && !editing && <SetList cls={current.name} sets={sets} onEdit={setEditing} />}
      {current && editing && (
        <SetEditor
          key={editing === 'new' ? 'new' : editing.id}
          cls={current.name}
          set={editing === 'new' ? null : editing}
          roster={(data?.rosters[current.name] ?? []).filter((s) => s.active)}
          defaultSize={current.defaultTeamSize ?? 4}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  )
}

function SetList({ cls, sets, onEdit }: { cls: string; sets: TeamSet[]; onEdit: (s: TeamSet) => void }) {
  const { saveTeamSet, deleteTeamSet } = useApp()
  const [renaming, setRenaming] = useState<string | null>(null)
  const [armed, setArmed] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(adminErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  const strip = (s: TeamSet) => ({ id: s.id, class: s.class, name: s.name, teams: s.teams })

  if (sets.length === 0) return <p className="muted">No saved teams for {cls} yet. Make teams before a game and tap “Save teams”, or tap “New team set”.</p>

  return (
    <div className="list">
      {error && <p className="error">{error}</p>}
      {sets.map((s) => {
        const students = s.teams.reduce((n, t) => n + t.members.length, 0)
        return (
          <div key={s.id} className="list-item static">
            <span className="grow">
              {renaming === s.id ? (
                <input
                  className="inline-input"
                  defaultValue={s.name}
                  autoFocus
                  maxLength={40}
                  onBlur={(e) => {
                    const name = e.target.value.trim()
                    setRenaming(null)
                    if (name && name !== s.name) void run(() => saveTeamSet({ ...strip(s), name }))
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                />
              ) : (
                <b>{s.name || 'Untitled'}</b>
              )}
              <span className="sub">
                {s.teams.length} teams · {students} students{s.savedAt ? ` · saved ${s.savedAt.slice(0, 10)}` : ''}
              </span>
            </span>
            <div className="row-actions">
              <button className="btn small" onClick={() => onEdit(s)} disabled={busy}>
                Edit
              </button>
              <button className="btn small ghost" onClick={() => setRenaming(s.id)} disabled={busy}>
                Rename
              </button>
              <button className="btn small ghost" onClick={() => void run(() => saveTeamSet({ ...strip(s), id: `set-${Date.now().toString(36)}`, name: `${s.name} (copy)` }))} disabled={busy}>
                Duplicate
              </button>
              <button
                className={`btn small ${armed === s.id ? 'danger' : 'ghost'}`}
                onClick={() => (armed === s.id ? void run(() => deleteTeamSet(s.id)) : setArmed(s.id))}
                disabled={busy}
              >
                {armed === s.id ? 'Delete?' : 'Delete'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Tap-to-place editor for a saved team set: tap a name, then tap a team. */
function SetEditor({ cls, set, roster, defaultSize, onClose }: { cls: string; set: TeamSet | null; roster: Student[]; defaultSize: number; onClose: () => void }) {
  const saveTeamSet = useApp((s) => s.saveTeamSet)
  const ids = roster.map((s) => s.id)
  const byId = useMemo(() => new Map(roster.map((s) => [s.id, s])), [roster])
  const [name, setName] = useState(set?.name ?? '')
  const [bins, setBins] = useState<Bin[]>(() => (set ? binsFromTeamSet(set.teams, roster, ids) : resizeBins([], binCountFor(ids.length, defaultSize))))
  const [selected, setSelected] = useState<number[]>([])
  const [several, setSeveral] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pool = unassigned(ids, bins)

  function tapChip(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (several) setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
    else setSelected((s) => (s.length === 1 && s[0] === id ? [] : [id]))
  }
  function drop(target: string | null) {
    if (!selected.length) return
    setBins((b) => moveTo(b, selected, target))
    setSelected([])
  }

  async function save() {
    if (!name.trim()) return setError('Give the team set a name.')
    setBusy(true)
    setError(null)
    try {
      await saveTeamSet({
        id: set?.id ?? `set-${Date.now().toString(36)}`,
        class: cls,
        name: name.trim(),
        teams: bins.filter((b) => b.members.length).map((b) => ({ name: b.name, members: b.members.map((id) => ({ no: byId.get(id)?.no ?? id, nick: byId.get(id)?.nick ?? '' })) })),
      })
      onClose()
    } catch (err) {
      setError(adminErrorText(err))
      setBusy(false)
    }
  }

  const chip = (id: number) => {
    const s = byId.get(id)
    if (!s) return null
    return (
      <button key={id} className={`chip${selected.includes(id) ? ' selected' : ''}`} onClick={(e) => tapChip(id, e)} aria-pressed={selected.includes(id)}>
        <b>{s.no}</b> · {s.nick}
      </button>
    )
  }

  return (
    <section className={`card set-editor${selected.length ? ' placing' : ''}`}>
      <div className="page-head">
        <div className="field grow">
          <label htmlFor="setname">Team set name ({cls})</label>
          <input id="setname" value={name} maxLength={40} placeholder="Debate teams" onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div className="row-actions">
        <button className={`tool${several ? ' on' : ''}`} onClick={() => setSeveral((v) => !v)} aria-pressed={several}>
          Pick several
        </button>
        <button className="tool" onClick={() => setBins(shuffleTeams(bins, ids))}>
          Shuffle
        </button>
        <button className="tool" onClick={() => setBins(clearBins(bins))}>
          Clear
        </button>
        <button className="tool" onClick={() => setBins(resizeBins(bins, bins.length + 1))}>
          + Team
        </button>
        <span className="muted small">Tap a name, then tap a team.</span>
      </div>
      <div className="editor-body">
        <div className="pool" onClick={() => drop(null)}>
          <div className="panel-head">
            <span>
              Not in a team <b>{pool.length}</b>
            </span>
          </div>
          <div className="chips">{pool.map(chip)}</div>
        </div>
        <div className="bins">
          {bins.map((b) => (
            <div key={b.id} className={`bin${b.members.length ? '' : ' empty'}`} onClick={() => drop(b.id)}>
              <div className="bin-head">
                {renaming === b.id ? (
                  <input
                    className="rename"
                    defaultValue={b.name}
                    autoFocus
                    maxLength={30}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      const n = e.target.value.trim()
                      setRenaming(null)
                      if (n) setBins((x) => x.map((y) => (y.id === b.id ? { ...y, name: n } : y)))
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                ) : (
                  <button
                    className="bin-name"
                    onClick={(e) => {
                      if (selected.length) return
                      e.stopPropagation()
                      setRenaming(b.id)
                    }}
                  >
                    {b.name} <span className="pencil">✎</span>
                  </button>
                )}
                <span className="count">{b.members.length || 'Empty'}</span>
                {bins.length > 1 && (
                  <button
                    className="remove"
                    aria-label={`Remove ${b.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setBins((x) => x.filter((y) => y.id !== b.id))
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="chips">{b.members.map(chip)}</div>
            </div>
          ))}
        </div>
      </div>
      {error && <p className="error">Not saved: {error}</p>}
      <div className="row-actions">
        <button className="btn ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <span className="grow" />
        <button className="btn primary" onClick={() => void save()} disabled={busy}>
          {busy ? 'Saving…' : 'Save team set'}
        </button>
      </div>
    </section>
  )
}
