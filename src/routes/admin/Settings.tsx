import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { SyncPill } from '../../components/SyncPill'
import { ApiError, ping } from '../../lib/api'
import { DEMO_URL } from '../../lib/demo'
import { requestPersistentStorage } from '../../lib/storage'
import { timeAgo } from '../../lib/time'
import { useApp } from '../../store/app'
import './Settings.css'

/** Shows the start and end of the URL only, so it's recognisable but not readable over a shoulder. */
function shortUrl(url: string) {
  if (url === DEMO_URL) return 'Demo mode (made-up students)'
  const id = url.match(/\/s\/([^/]+)\//)?.[1]
  return id ? `script.google.com/…/${id.slice(0, 6)}…${id.slice(-4)}/exec` : url
}

export function Settings() {
  const { conn, data, syncedAt, syncing, syncError, sync, signOut } = useApp()
  const [test, setTest] = useState<{ ok: boolean; msg: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [armed, setArmed] = useState(false)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    void requestPersistentStorage().then(setPersisted)
  }, [])

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])

  async function runTest() {
    if (!conn) return
    setTesting(true)
    setTest(null)
    try {
      await ping(conn)
      setTest({ ok: true, msg: 'Connected. The Sheet answered.' })
    } catch (err) {
      setTest({ ok: false, msg: err instanceof ApiError ? err.message : String(err) })
    } finally {
      setTesting(false)
    }
  }

  const students = data ? Object.values(data.rosters).reduce((n, r) => n + r.filter((s) => s.active).length, 0) : 0

  return (
    <main className="screen settings">
      <header className="topbar">
        <Link className="btn small ghost" to="/">
          ← Library
        </Link>
        <h1>Settings</h1>
        <SyncPill />
      </header>

      <div className="settings-grid">
        <section className="card">
          <h2>Google Sheet</h2>
          <dl>
            <dt>Script</dt>
            <dd className="mono">{conn ? shortUrl(conn.url) : '—'}</dd>
            <dt>Last synced</dt>
            <dd>{timeAgo(syncedAt)}</dd>
            <dt>Saved on this phone</dt>
            <dd>
              {data ? `${data.classes.length} classes · ${students} students · ${data.teamSets.length} team sets` : 'nothing yet'}
            </dd>
          </dl>
          {syncError && <p className="error">{syncError}</p>}
          {test && <p className={test.ok ? 'ok' : 'error'}>{test.msg}</p>}
          <div className="row">
            <button className="btn primary" onClick={() => void sync()} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
            <button className="btn" onClick={() => void runTest()} disabled={testing}>
              {testing ? 'Testing…' : 'Test connection'}
            </button>
            {data?.sheetUrl && (
              <a className="btn ghost" href={data.sheetUrl} target="_blank" rel="noreferrer">
                Open Sheet
              </a>
            )}
          </div>
        </section>

        <section className="card">
          <h2>This device</h2>
          <dl>
            <dt>Saved data protected</dt>
            <dd>
              {persisted == null ? '…' : persisted ? 'Yes' : 'Not guaranteed (your Sheet is the backup)'}
            </dd>
            <dt>App version</dt>
            <dd>{__APP_VERSION__}</dd>
          </dl>
          <div className="row">
            <button
              className="btn danger"
              onClick={() => (armed ? void signOut() : setArmed(true))}
            >
              {armed ? 'Tap again to sign out' : 'Sign out'}
            </button>
          </div>
          <p className="muted small">Signing out removes the key and saved rosters from this device. Your Sheet is not changed.</p>
        </section>

        <section className="card tips">
          <h2>Tips for class</h2>
          <ul>
            <li>
              Open Kru from the <b>home-screen icon</b>, not Safari, so there's no address bar.
            </li>
            <li>
              Turn off <b>Portrait Orientation Lock</b> in Control Center so the app turns sideways.
            </li>
            <li>
              Set <b>Settings → Display &amp; Brightness → Auto-Lock → Never</b> during lessons, and keep a charger at
              the board.
            </li>
            <li>Chimes may be silent when the ring/silent switch is on silent.</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
