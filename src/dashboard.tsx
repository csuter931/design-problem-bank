import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { StudentDashboard } from './components/StudentDashboard.tsx'

// Second page of the multi-page build (see dashboard/index.html and the
// `build.rolldownOptions.input` map in vite.config.ts). Served at
// <base>/dashboard/ — the URL handed directly to students, so the public
// gallery no longer carries an in-app view switch. Back / sign-out return to
// the gallery with a real navigation. BASE_URL comes from Vite's `base`; never
// hardcode the Pages subpath here.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudentDashboard onBack={() => { window.location.href = import.meta.env.BASE_URL }} />
  </StrictMode>,
)
