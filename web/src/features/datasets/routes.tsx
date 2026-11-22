import type { RouteObject } from 'react-router-dom'
import { DatasetDetailPage } from './DatasetDetailPage'
import { DatasetsPage } from './DatasetsPage'

/**
 * Routes of the datasets feature, to mount in the app router:
 *   createBrowserRouter([{ path: '/', element: <Layout />, children: [...datasetsRoutes] }])
 */
export const datasetsRoutes: RouteObject[] = [
  { path: 'datasets', element: <DatasetsPage /> },
  { path: 'datasets/:id', element: <DatasetDetailPage /> },
]
