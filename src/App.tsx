import { useEffect } from 'react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router'
import { UpdateToast } from './components/UpdateToast'
import { Home } from './routes/Home'
import { Play } from './routes/Play'
import { Results } from './routes/Results'
import { Setup } from './routes/Setup'
import { SignIn } from './routes/SignIn'
import { Tool } from './routes/Tool'
import { AdminLayout } from './routes/admin/AdminLayout'
import { Content } from './routes/admin/Content'
import { Overview } from './routes/admin/Overview'
import { ResultsAdmin } from './routes/admin/ResultsAdmin'
import { Rosters } from './routes/admin/Rosters'
import { Settings } from './routes/admin/Settings'
import { TeamsAdmin } from './routes/admin/TeamsAdmin'
import { useApp } from './store/app'
import { useSessions } from './store/sessions'

const OUTBOX_RETRY_MS = 60_000

/** Shows Sign in until Henry is connected; after that, the requested screen. */
function Root() {
  const status = useApp((s) => s.status)

  useEffect(() => {
    void useApp.getState().init()
    void useSessions.getState().load()
    // when the connection comes back: refresh rosters and send any waiting results
    const onOnline = () => {
      void useApp.getState().sync()
      void useApp.getState().sendOutbox()
    }
    window.addEventListener('online', onOnline)
    // retry the outbox every 60 s while Kru is open
    const timer = setInterval(() => {
      if (useApp.getState().outbox.length) void useApp.getState().sendOutbox()
    }, OUTBOX_RETRY_MS)
    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(timer)
    }
  }, [])

  return (
    <>
      {status === 'loading' ? null : status === 'signedOut' ? <SignIn /> : <Outlet />}
      <UpdateToast />
    </>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      { path: 'setup/:game', element: <Setup /> },
      { path: 'play/:id', element: <Play /> },
      { path: 'tool/:game', element: <Tool /> },
      { path: 'results/:id', element: <Results /> },
      {
        path: 'admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Overview /> },
          { path: 'rosters', element: <Rosters /> },
          { path: 'teams', element: <TeamsAdmin /> },
          { path: 'results', element: <ResultsAdmin /> },
          { path: 'content', element: <Content /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
      { path: '*', element: <Home /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
