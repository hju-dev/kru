import { useEffect } from 'react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router'
import { UpdateToast } from './components/UpdateToast'
import { Home } from './routes/Home'
import { SignIn } from './routes/SignIn'
import { Settings } from './routes/admin/Settings'
import { useApp } from './store/app'

/** Shows Sign in until Henry is connected; after that, the requested screen. */
function Root() {
  const status = useApp((s) => s.status)

  useEffect(() => {
    void useApp.getState().init()
    // refresh from the Sheet when the connection comes back
    const onOnline = () => void useApp.getState().sync()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
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
      { path: 'admin', element: <Settings /> },
      { path: 'admin/settings', element: <Settings /> },
      { path: '*', element: <Home /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
