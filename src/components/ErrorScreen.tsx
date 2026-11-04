import { isRouteErrorResponse, useRouteError } from 'react-router'

/**
 * Shown instead of a blank screen if something in Kru breaks. Games in progress and waiting
 * scores are safe on the phone (IndexedDB), so reloading is always OK.
 */
export function ErrorScreen() {
  const err = useRouteError()
  const detail = isRouteErrorResponse(err) ? `${err.status} ${err.statusText}` : err instanceof Error ? err.message : String(err ?? '')
  return (
    <main className="screen error-screen">
      <h1>Something went wrong</h1>
      <p>Kru hit a problem on this screen. Your games in progress and any scores waiting to send are saved on this phone.</p>
      <div className="row">
        <button className="btn primary" onClick={() => location.reload()}>
          Reload Kru
        </button>
        <a className="btn" href="/">
          Back to library
        </a>
      </div>
      {detail && <p className="muted small">Details (for a screenshot): {detail}</p>}
    </main>
  )
}
