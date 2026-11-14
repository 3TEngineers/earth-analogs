import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { StarField } from './components/StarField'
import { AboutPage } from './pages/AboutPage'
import { LandingPage } from './pages/LandingPage'

// The 3D globe (three.js) is large, so it loads only when the user opens a body.
const ExplorePage = lazy(() => import('./pages/ExplorePage'))

/**
 * Pages:
 *   /               LandingPage  — intro, small Moon / Earth / Mars, pick a body
 *   /explore/:body  ExplorePage  — 3D globe of the Moon or Mars + panels, then Earth analogs
 *   /about          AboutPage    — team, method, data, AI usage
 * The star field sits behind every page so page changes never flash.
 */
export default function App() {
  return (
    <div className="relative h-full overflow-hidden bg-space">
      <StarField />
      <Suspense fallback={<p className="absolute inset-0 grid place-items-center text-ink-muted">Loading globe…</p>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/explore/:body" element={<ExplorePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}
