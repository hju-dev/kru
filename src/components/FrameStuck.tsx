import { Link } from 'react-router'

/** "The game didn't open": shown over a game frame that never got ready. */
export function FrameStuck({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="play-menu-backdrop">
      <div className="play-menu" role="alertdialog" aria-label={`${title} didn't open`}>
        <p>
          <b>{title}</b> didn’t open.
        </p>
        <p className="muted">
          If this phone is offline, the game may not be downloaded yet. Connect to the internet, then try again.
        </p>
        <button className="btn primary" onClick={onRetry}>
          Try again
        </button>
        <Link className="btn" to="/">
          Back to library
        </Link>
      </div>
    </div>
  )
}
