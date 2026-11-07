import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './i18n'
import './index.css'
import 'leaflet/dist/leaflet.css'
import { AdminApp, PublicPage, DriverPortalPage, HospitalPortalPage } from './lazyRoutes'
import { ThemeProvider } from './context/ThemeContext'
import PWAUpdateToast from './components/PWAUpdateToast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <PWAUpdateToast />
      <BrowserRouter>
        <Suspense fallback={<div className="p-8 text-sm font-semibold text-slate-600 dark:text-slate-400" role="status">Loading MedNet Ops...</div>}>
          <Routes>
            {/* Public citizen-facing emergency finder */}
            <Route path="/public" element={<PublicPage />} />
            <Route path="/find-help" element={<PublicPage />} />

            {/* Staff portals */}
            <Route path="/driver" element={<DriverPortalPage />} />
            <Route path="/hospital" element={<HospitalPortalPage />} />

            {/* Admin command center */}
            <Route path="/dashboard/*" element={<AdminApp />} />
            {/* Preserve the dashboard as the fallback for existing links. */}
            <Route path="/*" element={<AdminApp />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
