import { useCallback, useLayoutEffect, useRef } from 'react'
import type { Session } from '../lib/session'
import './TeamsReveal.css'

const COLORS = ['#FFB703', '#FF6B6B', '#2EC4B6', '#A7D129', '#9B7BFF', '#4CC9F0', '#FF9EC7', '#FFB27A', '#7CE0B3', '#E8D38C']

/**
 * The teams, big, before a group game starts: every team on one screen (no scrolling), so students can see
 * which team they are on and move to sit together. Henry taps "Start the game" when everyone has moved.
 */
export function TeamsReveal({ session, title, onStart, onChange }: { session: Session; title: string; onStart: () => void; onChange: () => void }) {
  const grid = useRef<HTMLDivElement>(null)
  const teams = session.teams
  const n = teams.length

  // Biggest text that fits: try a few column counts, shrink the font until nothing overflows.
  const fit = useCallback(() => {
    const el = grid.current
    if (!el || !n) return
    const W = el.clientWidth, H = el.clientHeight
    const base = Math.max(1, Math.round(Math.sqrt((n * W) / H / 1.6)))
    let best = { cols: base, size: 10 }
    for (const cols of [base - 1, base, base + 1, base + 2]) {
      if (cols < 1 || cols > n) continue
      el.style.setProperty('--cols', String(cols))
      for (let size = 40; size >= 10; size -= 1) {
        el.style.setProperty('--fs', size + 'px')
        const cards = el.children
        let ok = el.scrollHeight <= H + 1
        for (let i = 0; ok && i < cards.length; i++) {
          const c = cards[i] as HTMLElement
          const h = c.firstElementChild as HTMLElement | null
          if (c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1 || (h && h.scrollWidth > h.clientWidth + 1)) ok = false
        }
        if (ok) {
          if (size > best.size) best = { cols, size }
          break
        }
      }
    }
    el.style.setProperty('--cols', String(best.cols))
    el.style.setProperty('--fs', best.size + 'px')
  }, [n])

  useLayoutEffect(() => {
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [fit])

  return (
    <main className="teams-reveal">
      <header className="tr-bar">
        <button className="btn small ghost" onClick={onChange}>
          ← Change teams
        </button>
        <div className="tr-title">
          <b>Find your team!</b>
          <span className="muted">
            {' '}
            · {title} · {session.class}
          </span>
        </div>
        <button className="btn primary" onClick={onStart}>
          Start the game ▶
        </button>
      </header>
      <div className="tr-grid" ref={grid} role="list" aria-label="Teams">
        {teams.map((t, i) => (
          <section key={t.id} className="tr-team" role="listitem" style={{ '--c': COLORS[i % COLORS.length] } as React.CSSProperties}>
            <h2>{t.name}</h2>
            <p>
              {t.members.map((m) => (
                <span key={`${m.no}:${m.nick}`}>{m.nick}</span>
              ))}
            </p>
          </section>
        ))}
      </div>
      {session.teacherTeam && <p className="tr-teacher muted">+ {session.teacherTeam.name} (teacher team)</p>}
      <div className="turn-hint" aria-hidden>
        <span>↻</span>
        Turn the phone sideways
      </div>
    </main>
  )
}
