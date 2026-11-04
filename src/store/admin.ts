import { createStore, get, set } from 'idb-keyval'
import { create } from 'zustand'
import * as api from '../lib/api'
import type { ResultsData } from '../lib/api'
import { DEMO_URL } from '../lib/demo'
import { findGame } from '../lib/games'
import { buildSubmission, rankTeams } from '../lib/results'
import { useApp } from './app'
import { useSessions } from './sessions'

const cache = createStore('kru-admin', 'kv')

interface AdminState {
  results: ResultsData | null
  fetchedAt: number | null
  loading: boolean
  error: string | null
  /** Load every result (including deleted ones); screens filter on the device. Cached for offline viewing. */
  loadResults: (force?: boolean) => Promise<void>
  /** Change a session's team points. Ranks are recalculated. Throws a plain-language error on failure. */
  updatePoints: (sessionId: string, points: Record<string, number>, teacherTeamPoints?: number | null) => Promise<void>
  setDeleted: (sessionId: string, deleted: boolean) => Promise<void>
}

const errorText = (err: unknown) => (err instanceof api.ApiError ? err.message : `Something went wrong: ${(err as Error).message}`)

function conn() {
  const c = useApp.getState().conn
  if (!c) throw new api.ApiError('unauthorised', 'Sign in first.')
  return c
}

/** Demo mode has no Sheet: show the games submitted on this device instead. */
function demoResults(): ResultsData {
  const out: ResultsData = { sessions: [], rows: [] }
  for (const s of Object.values(useSessions.getState().sessions)) {
    if (s.status !== 'submitted' || !s.scores) continue
    const sub = buildSubmission(s, s.scores, s.notes, findGame(s.game)?.title ?? s.game, new Date(s.submittedAt ?? s.updatedAt))
    out.sessions.push({
      id: s.id,
      date: sub.session.Date,
      time: sub.rows[0]?.Time ?? '',
      class: s.class,
      game: sub.session.Game,
      level: s.level,
      mode: s.mode,
      teamCount: s.teams.length,
      teacherTeamPoints: sub.session.TeacherTeamPoints === '' ? null : sub.session.TeacherTeamPoints,
      submittedAt: new Date(s.submittedAt ?? s.updatedAt).toISOString(),
      deleted: false,
      editedAt: '',
    })
    for (const r of sub.rows) out.rows.push({ s: s.id, team: r.Team, no: r.No, nick: r.Nickname, points: r.Points, rank: r.Rank, notes: r.Notes })
  }
  out.sessions.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  return out
}

export const useAdmin = create<AdminState>((setState, getState) => {
  async function save(results: ResultsData) {
    const fetchedAt = Date.now()
    setState({ results, fetchedAt })
    await set('results', { results, fetchedAt }, cache)
  }

  return {
    results: null,
    fetchedAt: null,
    loading: false,
    error: null,

    async loadResults(force = false) {
      if (getState().loading) return
      if (!getState().results) {
        const saved = await get<{ results: ResultsData; fetchedAt: number }>('results', cache)
        if (saved && !getState().results) setState({ results: saved.results, fetchedAt: saved.fetchedAt })
      }
      if (!force && getState().fetchedAt && Date.now() - (getState().fetchedAt ?? 0) < 30_000) return
      setState({ loading: true, error: null })
      try {
        const c = conn()
        const results = c.url === DEMO_URL ? demoResults() : await api.fetchResults(c, { includeDeleted: true })
        await save(results)
      } catch (err) {
        setState({ error: errorText(err) })
      } finally {
        setState({ loading: false })
      }
    },

    async updatePoints(sessionId, points, teacherTeamPoints) {
      const r = getState().results
      if (!r) return
      const teamNames = [...new Set(r.rows.filter((x) => x.s === sessionId).map((x) => x.team))]
      const ranks = rankTeams(teamNames.map((t) => ({ teamId: t, points: points[t] ?? 0 })))
      const teams = teamNames.map((t) => ({ team: t, points: points[t] ?? 0, rank: ranks[t] }))
      await api.updateSession(conn(), sessionId, teams, teacherTeamPoints)
      const now = new Date().toISOString()
      await save({
        sessions: r.sessions.map((s) => (s.id === sessionId ? { ...s, editedAt: now, teacherTeamPoints: teacherTeamPoints ?? s.teacherTeamPoints } : s)),
        rows: r.rows.map((x) => (x.s === sessionId ? { ...x, points: points[x.team] ?? x.points, rank: ranks[x.team] ?? x.rank } : x)),
      })
    },

    async setDeleted(sessionId, deleted) {
      await api.setSessionDeleted(conn(), sessionId, deleted)
      const r = getState().results
      if (r) await save({ ...r, sessions: r.sessions.map((s) => (s.id === sessionId ? { ...s, deleted } : s)) })
    },
  }
})

export { errorText as adminErrorText }
