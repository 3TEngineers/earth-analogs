import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { SpaceScene } from './globe/SpaceScene'
import { AboutPage } from './pages/AboutPage'
import { CalculationsPage } from './pages/CalculationsPage'
import { EarthPage } from './pages/EarthPage'
import ExplorePage from './pages/ExplorePage'
import { LandingPage } from './pages/LandingPage'

/**
 * Layers, back to front:
 *   SpaceScene  — the one 3D scene (stars, Moon, Earth, Mars); never unmounts, so page changes animate
 *   loader      — one quiet line until the planet textures are in
 *   page        — text and panels; empty areas let clicks through to the planets
 *
 * Pages:
 *   /                 LandingPage       — what the project is, as a scroll story over the planets
 *   /explore/:body    ExplorePage       — Moon or Mars in focus: its sites, one site, then its Earth training areas
 *   /earth, /earth/:analogId  EarthPage — Earth in focus with every training area
 *   /calculations     CalculationsPage  — how the sites were found and matched
 *   /about            AboutPage         — team, data, AI usage
 */
export default function App() {
  const { pathname } = useLocation()
  // A new page starts at its top (the landing story reads the scroll position).
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
