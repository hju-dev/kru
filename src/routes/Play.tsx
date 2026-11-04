import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { findGame, gameUrl } from '../lib/games'
import { loadPrefs } from '../lib/prefs'
import { initMessage, type Session } from '../lib/session'
import { useSessions } from '../store/sessions'
import './Play.css'

const FADE_MS = 3000
const FINISH_WAIT_MS = 2000

/** Keeps the screen on while a game is open (fails silently where not supported). */
function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const request = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
        if (wl && document.visibilityState === 'visible') lock = await wl.request('screen')
      } catch {
        /* not supported or not allowed: Auto-Lock → Never is the backup */
      }
    }
    let enabled = false
    const onVisible = () => enabled && document.visibilityState === 'visible' && void request()
    // respects Settings → Options → Keep the screen awake
    void loadPrefs().then((p) => {
      enabled = p.keepAwake
      if (enabled) void request()
    })
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => undefined)
    }
  }, [])
}

/** Totals from the live score log: used if a game doesn't answer "finish". */
function totalsFromLog(s: Session): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const t of s.teams) totals[t.id] = 0
  if (s.teacherTeam) totals[s.teacherTeam.id] = 0
  for (const e of s.log) totals[e.teamId] = (totals[e.teamId] ?? 0) + e.delta
  return totals
}

export function Play() {
  const { id = '' } = useParams()
  const session = useSessions((st) => st.sessions[id])
  const loaded = useSessions((st) => st.loaded)
  useEffect(() => void useSessions.getState().load(), [])

  if (!loaded) return <main className="play" />
  if (!session) return <Navigate to="/" replace />
  if (session.status === 'review') return <Navigate to={`/results/${id}`} replace />
  if (session.status !== 'playing') return <Navigate to="/" replace />
  return <PlayFrame session={session} />
}

function PlayFrame({ session }: { session: Session }) {
  const navigate = useNavigate()
  const patch = useSessions((st) => st.patch)
  const frame = useRef<HTMLIFrameElement>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [showHome, setShowHome] = useState(true)
  const [menu, setMenu] = useState(false)
  const [armedRestart, setArmedRestart] = useState(false)
  const finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const game = findGame(session.game)
  useWakeLock()

  const wake = useCallback(() => {
    setShowHome(true)
    clearTimeout(fadeTimer.current)
    fadeTimer.current = setTimeout(() => setShowHome(false), FADE_MS)
  }, [])
  useEffect(() => {
    // the button starts visible; fade it after a few seconds
    fadeTimer.current = setTimeout(() => setShowHome(false), FADE_MS)
    return () => clearTimeout(fadeTimer.current)
  }, [])

  const goToResults = useCallback(
    (scores: Record<string, number>, notes?: string) => {
      clearTimeout(finishTimer.current)
      patch(session.id, (s) => ({ status: 'review', scores, notes: notes ?? s.notes }))
      navigate(`/results/${session.id}`, { replace: true })
    },
    [navigate, patch, session.id],
  )

  // Messages from the game (HANDOFF section 6). Only accept our own frame, same origin.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return
      const d = e.data as { type?: string; state?: unknown; teamId?: string; delta?: number; reason?: string; scores?: { teamId: string; points: number }[]; notes?: string }
      const current = useSessions.getState().sessions[session.id]
      if (!current) return
      switch (d?.type) {
        case 'kru:ready':
          frame.current?.contentWindow?.postMessage(initMessage(current), location.origin)
          break
        case 'kru:state':
          patch(session.id, { state: d.state })
          break
        case 'kru:score':
          if (d.teamId && typeof d.delta === 'number') {
            patch(session.id, (s) => ({ log: [...s.log, { teamId: d.teamId!, delta: d.delta!, reason: d.reason, at: Date.now() }] }))
          }
          break
        case 'kru:finish': {
          const scores = totalsFromLog(current)
          for (const sc of d.scores ?? []) if (typeof sc.points === 'number') scores[sc.teamId] = sc.points
          goToResults(scores, d.notes)
          break
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [goToResults, patch, session.id])

  // Taps inside the game bring the home button back
  function onFrameLoad() {
    try {
      frame.current?.contentDocument?.addEventListener('pointerdown', wake)
    } catch {
      /* not same-origin: ignore */
    }
  }

  function finish() {
    setMenu(false)
    frame.current?.contentWindow?.postMessage({ type: 'kru:finish-request' }, location.origin)
    // a game that doesn't answer still gets reviewed, using the live score log
    finishTimer.current = setTimeout(() => goToResults(totalsFromLog(useSessions.getState().sessions[session.id] ?? session)), FINISH_WAIT_MS)
  }

  function restart() {
    if (!armedRestart) return setArmedRestart(true)
    patch(session.id, { state: undefined, log: [] })
    setArmedRestart(false)
    setMenu(false)
    setReloadKey((k) => k + 1)
  }

  return (
    <main className="play">
      <iframe
        key={reloadKey}
        ref={frame}
        className="game-frame"
        src={gameUrl(session.game)}
        title={game?.title ?? 'Game'}
        onLoad={onFrameLoad}
        allow="screen-wake-lock"
      />
      <button
        className={`home-btn${showHome ? '' : ' faded'}`}
        onClick={() => {
          wake()
          setMenu(true)
          setArmedRestart(false)
        }}
        aria-label="Game menu"
      >
        ⌂
      </button>

      {menu && (
        <div className="play-menu-backdrop" onClick={() => setMenu(false)}>
          <div className="play-menu" role="dialog" aria-label="Game menu" onClick={(e) => e.stopPropagation()}>
            <p className="muted">
              {game?.title} · {session.class}
            </p>
            <button className="btn primary" onClick={finish}>
              Finish &amp; review scores
            </button>
            <Link className="btn" to="/">
              Back to library (keep game)
            </Link>
            <button className={`btn ${armedRestart ? 'danger' : 'ghost'}`} onClick={restart}>
              {armedRestart ? 'Tap again: restart and lose scores' : 'Restart game'}
            </button>
            <button className="btn ghost" onClick={() => setMenu(false)}>
              Keep playing
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
