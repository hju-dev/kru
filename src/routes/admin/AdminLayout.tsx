import { NavLink, Outlet, Link } from 'react-router'
import { SyncPill } from '../../components/SyncPill'
import { useApp } from '../../store/app'
import './Admin.css'

const ICONS: Record<string, string> = {
  overview: 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z',
  rosters: 'M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.7 0-8 1.3-8 4v3h8v-3c0-1.2.5-2.2 1.3-3A11 11 0 0 0 8 13zm8 0c-2.7 0-8 1.3-8 4v3h16v-3c0-2.7-5.3-4-8-4z',
  teams: 'M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z',
  results: 'M5 21V10h3v11zm5.5 0V3h3v18zM16 21v-7h3v7z',
  content: 'M5 3h10l4 4v14H5zm9 1.5V8h3.5zM8 12h8v1.5H8zm0 3h8v1.5H8zm0 3h5v1.5H8z',
  settings: 'M12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5zm7.4-2.5a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.3 2.9a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1L11 21h4l.3-2.9a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5z',
}

const NAV = [
  { to: '/admin', label: 'Overview', icon: 'overview', end: true },
  { to: '/admin/rosters', label: 'Rosters', icon: 'rosters' },
  { to: '/admin/teams', label: 'Teams', icon: 'teams' },
  { to: '/admin/results', label: 'Results', icon: 'results' },
  { to: '/admin/content', label: 'Content', icon: 'content' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
]

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="currentColor">
      <path d={ICONS[name]} />
    </svg>
  )
}

/** Dashboard frame: sidebar on a laptop (≥ 1024 px), tab bar at the bottom on a phone. */
export function AdminLayout() {
  const outbox = useApp((s) => s.outbox.length)
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Dashboard">
        <Link to="/" className="admin-brand">
          <span className="logo">
            K<span>ru</span>
          </span>
          <span className="muted">← Library</span>
        </Link>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="admin-link">
            <Icon name={n.icon} />
            <span>{n.label}</span>
            {n.icon === 'settings' && outbox > 0 && <span className="badge">{outbox}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="admin-main">
        <header className="admin-top">
          <Link to="/" className="btn small ghost admin-back">
            ← Library
          </Link>
          <SyncPill />
        </header>
        <Outlet />
      </div>
    </div>
  )
}
