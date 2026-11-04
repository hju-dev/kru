import { useRegisterSW } from 'virtual:pwa-register/react'
import './UpdateToast.css'

/**
 * When a new version of Kru is deployed, the phone downloads it in the background
 * but keeps running the old one until Henry taps Reload. A game never changes mid-lesson.
 */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // check for a new version every hour while the app is open
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null
  return (
    <div className="toast" role="status">
      <span>Update available</span>
      <button className="btn small primary" onClick={() => void updateServiceWorker(true)}>
        Reload
      </button>
      <button className="btn small ghost" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  )
}
