import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { useSession } from './features/auth/session'
import './styles/index.css'

// A session restored from storage is re-checked against the API (role or account may have changed).
if (useSession.getState().status === 'checking') {
  void useSession.getState().refresh()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
