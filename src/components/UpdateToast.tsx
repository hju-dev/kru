import { useLocation } from 'react-router'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './UpdateToast.css'

/**
 * When a new version of Kru is deployed, the phone downloads it in the background
 * but keeps running the old one until Henry taps Reload. A game never changes mid-lesson,
 * and the message only shows outside games and tools.
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

  const { pathname } = useLocation()
  // never pop up over a game or tool on the board: it waits until Henry is back in the library
  const inGame = pathname.startsWith('/play/') || pathname.startsWith('/tool/')
  if (!needRefresh || inGame) return null
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
