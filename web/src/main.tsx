// Minimal app shell so the datasets feature runs on its own.
// TODO(Zaid): replace with the real shell (layout, navigation, auth routes, design system).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { datasetsRoutes } from './features/datasets'
import './index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      { index: true, element: <Navigate to="/datasets" replace /> },
      ...datasetsRoutes,
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
