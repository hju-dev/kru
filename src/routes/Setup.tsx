import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { Sheet } from '../components/Sheet'
import { ApiError } from '../lib/api'
import { teamSetsForClass } from '../lib/bootstrap'
import { findGame } from '../lib/games'
import { newSessionId, TEACHER_NAME, todayKey, type Mode, type Session, type Team } from '../lib/session'
import { storage } from '../lib/storage'
import {
  binCountFor,
  binsFromTeamSet,
  clearBins,
  fillEvenly,
  moveTo,
  newBinId,
  removeFromBins,
  resizeBins,
  shuffleTeams,
  TEACHER_TEAM_ID,
  TEAM_SIZE_MAX,
  TEAM_SIZE_MIN,
  unassigned,
  type Bin,
} from '../lib/teams'
import { useChipDrag } from '../lib/useChipDrag'
import { useApp } from '../store/app'
import { useSessions } from '../store/sessions'
import type { Level, Student, TeamSet } from '../types'
import { unitsFor } from '../lib/units'
import { markPlayed, MIXED_CLASS, mixRoster, shortClass } from '../lib/mix'
import './Setup.css'

const LEVELS: Level[] = ['M.1', 'M.2', 'M.3']

export function Setup() {
  const { game: slug = '' } = useParams()
  const navigate = useNavigate()
  const game = findGame(slug)
  const { data, lastClass } = useApp()
  const { sessions, loaded, put, patch } = useSessions()
  // ?mix=1: a mixed group picked from every class (/mix/<game>), not the class chosen on Home
  const mixed = useSearchParams()[0].get('mix') === '1'
  const cls = mixed ? null : (data?.classes.find((c) => c.name === lastClass) ?? null)

  useEffect(() => void useSessions.getState().load(), [])

  // Reuse an unfinished setup for this class + game, otherwise start a new one
  const session = Object.values(sessions).find(
    (s) => s.status === 'setup' && s.game === slug && (mixed ? !!s.mix && s.class === MIXED_CLASS : !s.mix && s.class === cls?.name),
  )
  // a mixed game that was just started: this screen is on its way to /play (don't bounce to /mix)
  const [started, setStarted] = useState(false)
  const roster: Student[] = useMemo(
    () => (mixed ? mixRoster(session?.mix ?? []) : cls ? (data?.rosters[cls.name] ?? []).filter((s) => s.active) : []),
    [mixed, session?.mix, cls, data],
  )
  useEffect(() => {
    if (mixed || !loaded || !cls || !game || session) return
    let cancelled = false
    void storage.getAbsent(cls.name, todayKey()).then((absent = []) => {
      if (cancelled) return
      const present = roster.filter((s) => !absent.includes(s.id)).length
      const size = cls.defaultTeamSize ?? 4
      const now = Date.now()
      const fresh: Session = {
        id: newSessionId(),
        createdAt: now,
        updatedAt: now,
        status: 'setup',
        class: cls.name,
        game: game.slug,
        level: cls.level ?? 'M.2',
        mode: game.modes.includes('group') ? 'group' : 'solo',
        size,
        bins: resizeBins([], binCountFor(present, size)),
        absent,
        teacher: false,
        leaveOut: false,
        teams: [],
        teacherTeam: null,
        log: [],
        scores: null,
        notes: '',
      }
      put(fresh)
    })
    return () => {
      cancelled = true
    }
  }, [mixed, loaded, cls, game, session, roster, put])

  if (!game || game.status !== 'ready') return <Problem text="That game isn’t available yet." />
  if (mixed) {
    if (!loaded) return <main className="screen" />
    if (started) return <main className="screen" />
    // no group picked yet (or it was finished): pick the students first
    if (!session || roster.length === 0) return <Navigate to={`/mix/${slug}`} replace />
    return <SetupBoard key={session.id} session={session} roster={roster} gameTitle={game.title} modes={game.modes} hasLevels={game.levels.length > 0} hasUnits={!!game.units} slug={slug} patch={patch} onStart={(id) => { setStarted(true); navigate(`/play/${id}`, { replace: true }) }} />
  }
  if (!cls) return <Problem text="Choose a class on the home screen first." />
  if (roster.length === 0) return <Problem text={`${cls.name} has no active students yet. Add them in Dashboard → Rosters (or in the Rosters tab of your Sheet), then tap the sync button.`} />
  if (!session) return <main className="screen" />
  return <SetupBoard key={session.id} session={session} roster={roster} gameTitle={game.title} modes={game.modes} hasLevels={game.levels.length > 0} hasUnits={!!game.units} slug={slug} patch={patch} onStart={(id) => navigate(`/play/${id}`, { replace: true })} />
}

function Problem({ text }: { text: string }) {
  return (
    <main className="screen">
      <p>{text}</p>
      <Link className="btn" to="/">
        ← Back to library
      </Link>
    </main>
  )
}

interface BoardProps {
  session: Session
  roster: Student[]
  gameTitle: string
  modes: Mode[]
  hasLevels: boolean
  hasUnits: boolean
  slug: string
  patch: (id: string, change: Partial<Session> | ((s: Session) => Partial<Session>)) => void
  onStart: (id: string) => void
}

function SetupBoard({ session: s, roster, gameTitle, modes, hasLevels, hasUnits, slug, patch, onStart }: BoardProps) {
  const allSets = useApp((st) => st.data?.teamSets)
  const teamSets = allSets ?? []
  const [selected, setSelected] = useState<number[]>([])
  const [several, setSeveral] = useState(false)
  const [absentMode, setAbsentMode] = useState(false)
  const [sheet, setSheet] = useState<'load' | 'save' | null>(null)

  // Everything on this screen works with student ids (not numbers), so two students who share a number stay separate
  const byId = useMemo(() => new Map(roster.map((st) => [st.id, st])), [roster])
  const presentIds = roster.filter((st) => !s.absent.includes(st.id)).map((st) => st.id)
  const absentIds = roster.filter((st) => s.absent.includes(st.id)).map((st) => st.id)
  // ignore students who left the roster since this setup was saved
  const bins = s.bins.map((b) => ({ ...b, members: b.members.filter((no) => byId.has(no) && !s.absent.includes(no)) }))
  const pool = s.mode === 'group' ? unassigned(presentIds, bins) : presentIds
  const group = s.mode === 'group'

  const update = useCallback((change: Partial<Session>) => patch(s.id, change), [patch, s.id])
  const setBins = (next: Bin[]) => update({ bins: next })

  function setAbsent(next: number[]) {
    update({ absent: next, bins: removeFromBins(s.bins, next) })
    setSelected((sel) => sel.filter((no) => !next.includes(no)))
    void storage.setAbsent(s.class, todayKey(), next)
  }

  const { drag, press, wasDrag } = useChipDrag(
    useCallback(
      (no: number, target: string) => {
        const st = useSessions.getState().sessions[s.id]
        if (!st || st.mode !== 'group') return
        const moving = selected.includes(no) ? selected : [no]
        patch(s.id, { bins: moveTo(st.bins, moving, target === 'pool' ? null : target) })
        setSelected([])
      },
      [patch, s.id, selected],
    ),
  )

  function tapChip(no: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (wasDrag()) return
    if (!group || absentMode) {
      setAbsent(s.absent.includes(no) ? s.absent.filter((n) => n !== no) : [...s.absent, no])
      return
    }
    if (s.absent.includes(no)) return
    if (several) setSelected((sel) => (sel.includes(no) ? sel.filter((n) => n !== no) : [...sel, no]))
    else setSelected((sel) => (sel.length === 1 && sel[0] === no ? [] : [no]))
  }

  function tapBin(id: string) {
    if (!selected.length) return
    setBins(moveTo(s.bins, selected, id))
    setSelected([])
  }

  function tapPool() {
    if (!selected.length || !group) return
    setBins(moveTo(s.bins, selected, null))
    setSelected([])
  }

  function setSize(size: number) {
    const n = Math.min(TEAM_SIZE_MAX, Math.max(TEAM_SIZE_MIN, size))
    update({ size: n, bins: resizeBins(s.bins, binCountFor(presentIds.length, n)) })
  }

  function setMode(mode: Mode) {
    setSelected([])
    setAbsentMode(false)
    update({ mode })
  }

  function addBin() {
    setBins(resizeBins(s.bins, s.bins.length + 1))
  }

  function removeBin(id: string) {
    setBins(s.bins.filter((b) => b.id !== id))
  }

  function start() {
    const mixOf = new Map((s.mix ?? []).map((m) => [m.id, m]))
    const member = (id: number) => {
      const m = { no: byId.get(id)?.no ?? id, nick: byId.get(id)?.nick ?? `No. ${id}` }
      const cls = mixOf.get(id)?.class
      return cls ? { ...m, class: cls } : m
    }
    const teams: Team[] = group
      ? bins.filter((b) => b.members.length > 0).map((b) => ({ id: b.id, name: b.name, members: b.members.map(member) }))
      : presentIds.map((id) => ({ id: `s${id}`, name: member(id).nick, members: [member(id)] }))
    patch(s.id, {
      status: 'playing',
      teams,
      teacherTeam: s.teacher ? { id: TEACHER_TEAM_ID, name: TEACHER_NAME } : null,
      state: undefined,
      log: [],
      scores: null,
      // group games: show the teams big on screen first, so students can find their team and move
      teamsShown: group ? false : undefined,
    })
    if (s.mix) {
      // mixed group: everyone who plays gets a "played" tag on the pick list for the next groups
      const playing = new Set(group ? bins.flatMap((b) => b.members) : presentIds)
      const mix = s.mix.filter((m) => playing.has(m.id))
      void storage.getPlayed(s.game).then((p = {}) => storage.setPlayed(s.game, markPlayed(p, s.id, mix)))
    }
    onStart(s.id)
  }

  const filledTeams = bins.filter((b) => b.members.length > 0).length
  const emptyBins = bins.length - filledTeams
  const canStart = group ? filledTeams > 0 && (pool.length === 0 || s.leaveOut) : presentIds.length > 0

  // mixed group: chips show the class ("2/3") instead of the number
  const mixTag = new Map((s.mix ?? []).map((m) => [m.id, shortClass(m.class)]))
  const chip = (no: number, where: 'pool' | 'bin') => {
    const st = byId.get(no)
    if (!st) return null
    const isAbsent = s.absent.includes(no)
    return (
      <button
        key={st.id}
        className={`chip${selected.includes(no) ? ' selected' : ''}${isAbsent ? ' absent' : ''}${drag?.no === no ? ' dragging' : ''}${where === 'bin' ? ' small' : ''}`}
        onPointerDown={group && !absentMode && !isAbsent ? (e) => press(no, e) : undefined}
        onClick={(e) => tapChip(no, e)}
        aria-pressed={selected.includes(no)}
      >
        <b>{mixTag.get(st.id) ?? st.no}</b> · {st.nick}
      </button>
    )
  }

  // units and lesson packs for this game, level and class
  const units = hasUnits ? unitsFor(s.level, slug, s.class) : []
  return (
    <main className={`setup${selected.length ? ' placing' : ''}`}>
      <header className="setup-bar">
        <Link className="btn small ghost" to="/" aria-label="Back to library">
          ←
        </Link>
        <div className="setup-title">
          <b>{gameTitle}</b>
          <span className="muted"> · {s.mix ? `🎄 Mixed group (${s.mix.length})` : s.class}</span>
        </div>
        {s.mix && (
          <Link className="btn small" to={`/mix/${slug}`}>
            Edit the group
          </Link>
        )}
        {hasLevels && (
          <div className="seg" role="group" aria-label="Level">
            {LEVELS.map((l) => (
              <button key={l} aria-pressed={s.level === l} onClick={() => update({ level: l, unit: undefined })}>
                {l}
              </button>
            ))}
          </div>
        )}
        {units.length > 0 && (
          <select
            className="unit-pick"
            aria-label="Content: built-in or a unit from your lessons"
            value={s.unit ?? ''}
            onChange={(e) => update({ unit: e.target.value || undefined })}
          >
            <option value="">Built-in content</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title}
              </option>
            ))}
          </select>
        )}
        {modes.length > 1 && (
          <div className="seg" role="group" aria-label="Mode">
            <button aria-pressed={group} onClick={() => setMode('group')}>
              Group
            </button>
            <button aria-pressed={!group} onClick={() => setMode('solo')}>
              Solo
            </button>
          </div>
        )}
        {group && (
          <div className="stepper" aria-label="Team size">
            <button onClick={() => setSize(s.size - 1)} disabled={s.size <= TEAM_SIZE_MIN} aria-label="Smaller teams">
              −
            </button>
            <span>
              <b>{s.size}</b> per team
            </span>
            <button onClick={() => setSize(s.size + 1)} disabled={s.size >= TEAM_SIZE_MAX} aria-label="Bigger teams">
              +
            </button>
          </div>
        )}
        <button className="btn primary start" disabled={!canStart} onClick={start}>
          Start ▶
        </button>
      </header>

      {group ? (
        <div className="setup-tools">
          <button className={`tool${several ? ' on' : ''}`} onClick={() => setSeveral((v) => !v)} aria-pressed={several}>
            Pick several
          </button>
          {!s.mix && (
            <button className={`tool${absentMode ? ' on' : ''}`} onClick={() => { setAbsentMode((v) => !v); setSelected([]) }} aria-pressed={absentMode}>
              Absent
            </button>
          )}
          <button className="tool" onClick={() => setBins(shuffleTeams(s.bins, presentIds))}>
            Shuffle
          </button>
          <button className="tool" onClick={() => setBins(fillEvenly(bins, presentIds))} disabled={pool.length === 0}>
            Fill evenly
          </button>
          <button className="tool" onClick={() => { setBins(clearBins(s.bins)); setSelected([]) }}>
            Clear
          </button>
          <button className={`tool${s.teacher ? ' on' : ''}`} onClick={() => update({ teacher: !s.teacher })} aria-pressed={s.teacher} title="Add a teacher team">
            {TEACHER_NAME}
          </button>
          {!s.mix && (
            <>
              <button className="tool" onClick={() => setSheet('load')}>
                Load teams
              </button>
              <button className="tool" onClick={() => setSheet('save')} disabled={filledTeams === 0}>
                Save teams
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="setup-tools">
          <span className="muted hint">Everyone plays as themselves. Tap a name to mark them absent.</span>
          <button className={`tool${s.teacher ? ' on' : ''}`} onClick={() => update({ teacher: !s.teacher })} aria-pressed={s.teacher}>
            {TEACHER_NAME} plays
          </button>
        </div>
      )}

      <div className={`setup-body${group ? '' : ' solo'}`}>
        <section className={`pool${drag?.over === 'pool' ? ' over' : ''}`} data-drop="pool" onClick={tapPool} aria-label="Students not in a team">
          <div className="panel-head">
            {group ? (
              <span>
                Unassigned <b>{pool.length}</b>
              </span>
            ) : (
              <span>
                Playing <b>{presentIds.length}</b>
              </span>
            )}
            {absentMode && <span className="mode-hint">Tap names to mark absent</span>}
          </div>
          <div className="chips">
            {pool.map((no) => chip(no, 'pool'))}
            {absentIds.length > 0 && <div className="absent-label">Absent {absentIds.length}</div>}
            {absentIds.map((no) => chip(no, 'pool'))}
          </div>
        </section>

        {group && (
          <section className="bins" aria-label="Teams">
            {s.teacher && (
              <div className="bin teacher">
                <div className="bin-head">
                  <span className="bin-name">Team 0 · {TEACHER_NAME}</span>
                </div>
                <p className="muted small">Plays against the class. Not saved to student results.</p>
              </div>
            )}
            {bins.map((b) => (
              <div
                key={b.id}
                className={`bin${b.members.length === 0 ? ' empty' : ''}${drag?.over === b.id ? ' over' : ''}`}
                data-drop={b.id}
                onClick={() => tapBin(b.id)}
              >
                <div className="bin-head">
                  {/* Henry, Nov 19: no custom team names; games show the number in a colored circle */}
                  <span className="bin-name">{b.name}</span>
                  <span className="count">{b.members.length || 'Empty'}</span>
                  {s.bins.length > 1 && (
                    <button
                      className="remove"
                      aria-label={`Remove ${b.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeBin(b.id)
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="chips">{b.members.map((no) => chip(no, 'bin'))}</div>
              </div>
            ))}
            <button className="bin add" onClick={addBin}>
              + Team
            </button>
          </section>
        )}
      </div>

      {group && (pool.length > 0 || emptyBins > 0) && (
        <footer className="setup-status">
          {pool.length > 0 && (
            <>
              <span>
                {pool.length} not in a team{s.leaveOut ? ' — they will sit out' : ''}.
              </span>
              <button className={`tool${s.leaveOut ? ' on' : ''}`} onClick={() => update({ leaveOut: !s.leaveOut })} aria-pressed={s.leaveOut}>
                Leave them out
              </button>
            </>
          )}
          {emptyBins > 0 && <span className="warn">{emptyBins} empty team{emptyBins > 1 ? 's' : ''} (left out of the game)</span>}
        </footer>
      )}

      {drag && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {selected.includes(drag.no) && selected.length > 1 ? `${selected.length} students` : byId.get(drag.no)?.nick}
        </div>
      )}

      {sheet === 'load' && (
        <LoadSheet
          sets={teamSetsForClass(teamSets, s.class)}
          onClose={() => setSheet(null)}
          onPick={(teams) => {
            const next = binsFromTeamSet(teams, roster, presentIds)
            update({ mode: 'group', bins: next.length ? next : [{ id: newBinId(), name: 'Team 1', members: [] }] })
            setSelected([])
            setSheet(null)
          }}
        />
      )}
      {sheet === 'save' && <SaveSheet session={s} bins={bins} byId={byId} onClose={() => setSheet(null)} />}
    </main>
  )
}

function LoadSheet({ sets, onPick, onClose }: { sets: TeamSet[]; onPick: (teams: { name: string; members: { no: number; nick?: string }[] }[]) => void; onClose: () => void }) {
  const deleteTeamSet = useApp((st) => st.deleteTeamSet)
  const [armed, setArmed] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function remove(id: string) {
    if (armed !== id) return setArmed(id)
    setError(null)
    try {
      await deleteTeamSet(id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
    }
    setArmed(null)
  }

  return (
    <Sheet title="Load saved teams" onClose={onClose}>
      {sets.length === 0 && <p className="muted">No saved teams for this class yet. Make teams, then tap “Save teams”.</p>}
      {error && <p className="error">{error}</p>}
      {sets.map((set) => (
        <div key={set.id} className="set-row">
          <button className="btn set-pick" onClick={() => onPick(set.teams)}>
            <b>{set.name || 'Untitled'}</b>
            <span className="muted"> · {set.teams.length} teams</span>
          </button>
          <button className={`btn small ${armed === set.id ? 'danger' : 'ghost'}`} onClick={() => void remove(set.id)}>
            {armed === set.id ? 'Delete?' : '✕'}
          </button>
        </div>
      ))}
    </Sheet>
  )
}

function SaveSheet({ session, bins, byId, onClose }: { session: Session; bins: Bin[]; byId: Map<number, Student>; onClose: () => void }) {
  const { saveTeamSet, data } = useApp()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const existing = teamSetsForClass(data?.teamSets, session.class).find((t) => t.name.toLowerCase() === name.trim().toLowerCase())

  async function save() {
    if (!name.trim()) return setError('Give the teams a name, like “Debate teams”.')
    setBusy(true)
    setError(null)
    try {
      await saveTeamSet({
        id: existing?.id ?? `set-${Date.now().toString(36)}`,
        class: session.class,
        name: name.trim(),
        teams: bins
          .filter((b) => b.members.length > 0)
          .map((b) => ({ name: b.name, members: b.members.map((id) => ({ no: byId.get(id)?.no ?? id, nick: byId.get(id)?.nick ?? '' })) })),
      })
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <Sheet title="Save these teams" onClose={onClose}>
      <div className="field">
        <label htmlFor="setname">Name</label>
        <input id="setname" value={name} autoFocus maxLength={40} placeholder="Debate teams" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void save()} />
      </div>
      {existing && <p className="muted">This will replace the saved set “{existing.name}”.</p>}
      <p className="muted small">Saved in your Google Sheet, so they’re kept even if the phone is reset. Needs internet.</p>
      {error && <p className="error">{error}</p>}
      <button className="btn primary" onClick={() => void save()} disabled={busy}>
        {busy ? 'Saving…' : existing ? 'Replace' : 'Save'}
      </button>
    </Sheet>
  )
}
