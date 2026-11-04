import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { findGame, gameUrl } from '../lib/games'
import { storage } from '../lib/storage'
import { useWakeLock } from '../lib/useWakeLock'
import './Play.css'

const FADE_MS = 3000

/**
 * A tool (for example Talk Timer): no class, no teams, no results.
 * Same full-screen frame and home button as a game. The tool's own settings
 * (kru:state) are saved on this phone and handed back as `resume` next time.
 */
export function Tool() {
  const { game: slug = '' } = useParams()
  const game = findGame(slug)
  if (!game || game.status !== 'ready' || game.modes.length > 0) return <Navigate to="/" replace />
  return <ToolFrame slug={slug} title={game.title} />
}

function ToolFrame({ slug, title }: { slug: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [showHome, setShowHome] = useState(true)
  const [menu, setMenu] = useState(false)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useWakeLock()

  const wake = useCallback(() => {
    setShowHome(true)
    clearTimeout(fadeTimer.current)
    fadeTimer.current = setTimeout(() => setShowHome(false), FADE_MS)
  }, [])
  useEffect(() => {
    fadeTimer.current = setTimeout(() => setShowHome(false), FADE_MS)
    return () => clearTimeout(fadeTimer.current)
  }, [])

  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return
      const d = e.data as { type?: string; state?: unknown }
      if (d?.type === 'kru:ready') {
        const resume = (await storage.getToolState(slug).catch(() => undefined)) ?? undefined
        const session = { id: `tool:${slug}`, class: '', level: null, mode: 'tool', teams: [], teacherTeam: null, resume }
        frame.current?.contentWindow?.postMessage({ type: 'kru:init', session }, location.origin)
      } else if (d?.type === 'kru:state') {
        void storage.setToolState(slug, d.state).catch(() => undefined)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [slug])

  function onFrameLoad() {
    try {
      frame.current?.contentDocument?.addEventListener('pointerdown', wake)
    } catch {
      /* not same-origin: ignore */
    }
  }

  return (
    <main className="play">
      <iframe ref={frame} className="game-frame" src={gameUrl(slug)} title={title} onLoad={onFrameLoad} allow="screen-wake-lock" />
      <button
        className={`home-btn${showHome ? '' : ' faded'}`}
        onClick={() => {
          wake()
          setMenu(true)
        }}
        aria-label="Menu"
      >
        ⌂
      </button>

      {menu && (
        <div className="play-menu-backdrop" onClick={() => setMenu(false)}>
          <div className="play-menu" role="dialog" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
            <p className="muted">{title}</p>
            <Link className="btn primary" to="/">
              Back to library
            </Link>
            <button className="btn ghost" onClick={() => setMenu(false)}>
              Keep using {title}
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
