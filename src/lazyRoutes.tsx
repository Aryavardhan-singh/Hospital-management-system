import { lazy } from 'react'

export const AdminApp = lazy(() => import('./App'))
export const PublicPage = lazy(() =>
  import('./pages/PublicPage').then(({ PublicPage }) => ({ default: PublicPage }))
)
export const DriverPortalPage = lazy(() =>
  import('./pages/DriverPortalPage').then(({ DriverPortalPage }) => ({ default: DriverPortalPage }))
)
export const HospitalPortalPage = lazy(() =>
  import('./pages/HospitalPortalPage').then(({ HospitalPortalPage }) => ({ default: HospitalPortalPage }))
)
