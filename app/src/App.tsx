import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { SpaceScene } from './globe/SpaceScene'
import { AboutPage } from './pages/AboutPage'
import { CalculationsPage } from './pages/CalculationsPage'
import { EarthPage } from './pages/EarthPage'
import ExplorePage from './pages/ExplorePage'
import { LandingPage } from './pages/LandingPage'

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="relative min-h-full bg-space">
      <SpaceScene />
      <p className="scene-loader pointer-events-none fixed inset-x-0 bottom-10 z-20 text-center font-display text-sm text-ink-muted">
        Bringing the Moon, Earth and Mars into view…
      </p>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore/:body" element={<ExplorePage />} />
        <Route path="/earth" element={<EarthPage />} />
        <Route path="/earth/:analogId" element={<EarthPage />} />
        <Route path="/calculations" element={<CalculationsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
