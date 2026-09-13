import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { PublicPage } from './pages/PublicPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public citizen-facing emergency finder */}
        <Route path="/public"    element={<PublicPage />} />
        <Route path="/find-help" element={<PublicPage />} />

        {/* Admin command center (all other paths) */}
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
