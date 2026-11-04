import { useState, type FormEvent } from 'react'
import { ApiError, checkScriptUrl } from '../lib/api'
import { DEMO_URL } from '../lib/demo'
import { useApp } from '../store/app'
import './SignIn.css'

export function SignIn() {
  const signIn = useApp((s) => s.signIn)
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function connect(conn: { url: string; key: string }) {
    setError(null)
    const problem = checkScriptUrl(conn.url)
    if (problem) return setError(problem)
    if (conn.url !== DEMO_URL && !conn.key.trim()) return setError('Type the secret key from the Sheet.')
    setBusy(true)
    try {
      await signIn(conn)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Something went wrong: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void connect({ url, key })
  }

  return (
    <main className="screen signin">
      <section className="signin-intro">
        <div className="logo">
          K<span>ru</span>
        </div>
        <h1>Connect your Google Sheet</h1>
        <p className="muted">
          Paste the <b>Web app URL</b> and the <b>secret key</b> from your Kru Sheet. You only do this once on
          each device. Both stay on this device.
        </p>
        <p className="muted small">
          No Sheet yet? Follow <code>apps-script/README.md</code>, or try the app with made-up students first.
        </p>
      </section>

      <form className="card signin-form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="url">Web app URL</label>
          <input
            id="url"
            type="url"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://script.google.com/macros/s/…/exec"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="key">Secret key</label>
          <div className="key-row">
            <input
              id="key"
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <button type="button" className="btn ghost small" onClick={() => setShowKey((v) => !v)}>
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="signin-actions">
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Connecting…' : 'Connect'}
          </button>
          <button
            className="btn ghost"
            type="button"
            disabled={busy}
            onClick={() => void connect({ url: DEMO_URL, key: '' })}
          >
            Try demo
          </button>
        </div>
      </form>
    </main>
  )
}
