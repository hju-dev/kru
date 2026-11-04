import { useEffect, useMemo, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import * as api from '../../lib/api'
import { drafts } from '../../lib/prefs'
import { mergeRoster, parsePasted, replaceRoster, sharedNumbers, type PastedRow, type RosterRow } from '../../lib/rosterImport'
import { adminErrorText } from '../../store/admin'
import { useApp } from '../../store/app'

type Row = RosterRow & { key: string }
let keySeq = 0
const withKeys = (rows: RosterRow[]): Row[] => rows.map((r) => ({ ...r, key: `r${keySeq++}` }))
const strip = (rows: Row[]): RosterRow[] => rows.map(({ no, nick, active }) => ({ no, nick, active }))

export function Rosters() {
  const { data, lastClass } = useApp()
  const classes = data?.classes ?? []
  const [cls, setCls] = useState<string | null>(null)
  const [sheet, setSheet] = useState<'add' | 'rename' | null>(null)
  const current = classes.find((c) => c.name === cls) ?? classes.find((c) => c.name === lastClass) ?? classes[0] ?? null

  return (
    <main className="admin-page">
      <div className="page-head">
        <h1>Rosters</h1>
        <button className="btn small" onClick={() => setSheet('add')}>
          + Add class
        </button>
      </div>

      <div className="class-chips" role="list">
        {classes.map((c) => (
          <button key={c.name} role="listitem" className={`class-chip${c.name === current?.name ? ' selected' : ''}${c.archived ? ' archived' : ''}`} onClick={() => setCls(c.name)}>
            {c.name}
            {c.archived && <span className="pill-tag">Archived</span>}
          </button>
        ))}
      </div>

      {current ? <RosterEditor key={current.name} cls={current.name} archived={current.archived} onRename={() => setSheet('rename')} /> : <p className="muted">No classes yet. Tap “Add class”.</p>}

      {sheet === 'add' && <ClassNameSheet title="Add a class" onClose={() => setSheet(null)} onDone={(name) => setCls(name)} />}
      {sheet === 'rename' && current && <ClassNameSheet title={`Rename ${current.name}`} from={current.name} onClose={() => setSheet(null)} onDone={(name) => setCls(name)} />}
    </main>
  )
}

function RosterEditor({ cls, archived, onRename }: { cls: string; archived: boolean; onRename: () => void }) {
  const { data, conn, sync } = useApp()
  const saved = useMemo(() => strip(withKeys((data?.rosters[cls] ?? []).map((s) => ({ no: s.no, nick: s.nick, active: s.active })))), [data, cls])
  const [rows, setRows] = useState<Row[]>(() => withKeys(saved))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [paste, setPaste] = useState(false)
  const [armedArchive, setArmedArchive] = useState(false)
  const dirty = JSON.stringify(strip(rows)) !== JSON.stringify(saved)
  const shared = sharedNumbers(rows.filter((r) => r.nick.trim()))

  // bring back an unsaved edit from last time
  useEffect(() => {
    void drafts.get<RosterRow[]>(`roster:${cls}`).then((d) => {
      if (d && JSON.stringify(d) !== JSON.stringify(saved)) {
        setRows(withKeys(d))
        setNote('Restored your unsaved changes from last time.')
      }
    })
  }, [cls, saved])

  function update(next: Row[]) {
    setRows(next)
    setNote(null)
    void drafts.set(`roster:${cls}`, strip(next))
  }

  const edit = (key: string, change: Partial<RosterRow>) => update(rows.map((r) => (r.key === key ? { ...r, ...change } : r)))

  function addRow() {
    const next = Math.max(0, ...rows.map((r) => r.no)) + 1
    update([...rows, ...withKeys([{ no: next, nick: '', active: true }])])
  }

  async function save() {
    if (!conn) return
    setBusy(true)
    setError(null)
    try {
      const clean = strip(rows).filter((r) => r.nick.trim()).map((r) => ({ ...r, nick: r.nick.trim() }))
      await api.saveRoster(conn, cls, clean)
      await drafts.clear(`roster:${cls}`)
      await sync()
      setNote('Saved to your Sheet ✓ It appears on the phone after the next sync.')
    } catch (err) {
      setError(adminErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  function discard() {
    setRows(withKeys(saved))
    void drafts.clear(`roster:${cls}`)
    setNote(null)
  }

  async function toggleArchive() {
    if (!conn) return
    if (!archived && !armedArchive) return setArmedArchive(true)
    setBusy(true)
    setError(null)
    try {
      await api.saveClass(conn, cls, { archived: !archived })
      await sync()
      setArmedArchive(false)
    } catch (err) {
      setError(adminErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  const active = rows.filter((r) => r.active && r.nick.trim()).length

  return (
    <section className="card roster-card">
      <div className="page-head">
        <h2 className="grow">
          {cls} <span className="muted small">· {active} active</span>
        </h2>
        <button className="btn small ghost" onClick={onRename} disabled={busy}>
          Rename
        </button>
        <button className={`btn small ${armedArchive ? 'danger' : 'ghost'}`} onClick={() => void toggleArchive()} disabled={busy}>
          {archived ? 'Unarchive' : armedArchive ? 'Tap again to archive' : 'Archive'}
        </button>
      </div>
      {archived && <p className="muted small">Archived: hidden from the class picker on the phone. Results are kept.</p>}

      <div className="table-wrap">
        <table className="rtable roster-table">
          <thead>
            <tr>
              <th style={{ width: 84 }}>No.</th>
              <th>Nickname</th>
              <th style={{ width: 80 }}>Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={r.active ? '' : 'inactive'}>
                <td>
                  <input
                    className={`inline-input num-input${shared.includes(r.no) ? ' warn' : ''}`}
                    inputMode="numeric"
                    value={Number.isFinite(r.no) ? r.no : ''}
                    aria-label="Number"
                    onChange={(e) => edit(r.key, { no: parseInt(e.target.value, 10) || 0 })}
                  />
                </td>
                <td>
                  <input className="inline-input nick-input" value={r.nick} placeholder="Nickname" aria-label="Nickname" onChange={(e) => edit(r.key, { nick: e.target.value })} />
                </td>
                <td>
                  <label className="active-toggle">
                    <input type="checkbox" checked={r.active} onChange={(e) => edit(r.key, { active: e.target.checked })} aria-label={`${r.nick || 'Student'} active`} />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted pad">No students yet. Add rows or paste a list.</p>}
      </div>

      {shared.length > 0 && <p className="warn-text small">Number{shared.length > 1 ? 's' : ''} {shared.join(', ')} used more than once. That's fine for a mixed class; otherwise fix the typo.</p>}
      <p className="muted small">Untick “Active” for a student who has left: they disappear from games but their results stay.</p>

      {error && <p className="error">Not saved: {error} Your changes are kept on this device; try again.</p>}
      {note && <p className="saved-note">{note}</p>}

      <div className="row-actions">
        <button className="btn" onClick={addRow} disabled={busy}>
          + Add student
        </button>
        <button className="btn" onClick={() => setPaste(true)} disabled={busy}>
          Paste a list
        </button>
        <span className="grow" />
        {dirty && (
          <button className="btn ghost" onClick={discard} disabled={busy}>
            Discard changes
          </button>
        )}
        <button className="btn primary" onClick={() => void save()} disabled={!dirty || busy}>
          {busy ? 'Saving…' : 'Save roster'}
        </button>
      </div>

      {paste && (
        <PasteSheet
          existing={strip(rows)}
          onClose={() => setPaste(false)}
          onApply={(next) => {
            update(withKeys(next))
            setPaste(false)
            setNote('List added. Check it, then tap “Save roster”.')
          }}
        />
      )}
    </section>
  )
}

function PasteSheet({ existing, onApply, onClose }: { existing: RosterRow[]; onApply: (rows: RosterRow[]) => void; onClose: () => void }) {
  const [text, setText] = useState('')
  const pasted: PastedRow[] = parsePasted(text, Math.max(0, ...existing.map((r) => r.no)))
  return (
    <Sheet title="Paste a list" onClose={onClose}>
      <p className="muted small">Copy two columns from a spreadsheet (number and nickname) and paste them here. One name per line also works.</p>
      <textarea className="paste-box" value={text} onChange={(e) => setText(e.target.value)} placeholder={'1\tNickname\n2\tNickname'} rows={6} autoFocus />
      {pasted.length > 0 && (
        <>
          <p className="small">
            <b>{pasted.length}</b> students found:
          </p>
          <div className="paste-preview">
            {pasted.map((p, i) => (
              <span key={i} className="pill-tag">
                {p.no} · {p.nick}
              </span>
            ))}
          </div>
          <div className="row-actions">
            <button className="btn" onClick={() => onApply(mergeRoster(existing, pasted))}>
              Merge
            </button>
            <button className="btn primary" onClick={() => onApply(replaceRoster(existing, pasted))}>
              Replace
            </button>
          </div>
          <p className="muted small">
            <b>Merge</b> adds these students and updates nicknames by number. <b>Replace</b> makes this the class list; anyone not in it is kept but set to inactive.
          </p>
        </>
      )}
    </Sheet>
  )
}

function ClassNameSheet({ title, from, onDone, onClose }: { title: string; from?: string; onDone: (name: string) => void; onClose: () => void }) {
  const { conn, sync, data } = useApp()
  const [name, setName] = useState(from ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go() {
    const clean = name.trim()
    if (!clean || !conn) return setError('Type a class name, like M.1/2.')
    if (!from && data?.classes.some((c) => c.name.replace(/\s+/g, '').toUpperCase() === clean.replace(/\s+/g, '').toUpperCase())) return setError('That class already exists.')
    setBusy(true)
    setError(null)
    try {
      if (from) await api.renameClass(conn, from, clean)
      else await api.saveClass(conn, clean, {})
      await sync()
      onDone(clean)
      onClose()
    } catch (err) {
      setError(adminErrorText(err))
      setBusy(false)
    }
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="field">
        <label htmlFor="classname">Class name</label>
        <input id="classname" value={name} autoFocus maxLength={20} placeholder="M.1/2" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void go()} />
      </div>
      {from && <p className="muted small">Renames it everywhere in your Sheet, including past results and saved teams.</p>}
      {error && <p className="error">{error}</p>}
      <button className="btn primary" onClick={() => void go()} disabled={busy}>
        {busy ? 'Saving…' : from ? 'Rename' : 'Add class'}
      </button>
    </Sheet>
  )
}
