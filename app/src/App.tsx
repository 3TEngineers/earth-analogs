import { Navigate, Route, Routes } from 'react-router'
import { StarField } from './components/StarField'
import { SpaceScene } from './globe/SpaceScene'
import { AboutPage } from './pages/AboutPage'
import ExplorePage from './pages/ExplorePage'
import { LandingPage } from './pages/LandingPage'

/**
 * Layers, back to front:
 *   StarField   — static stars
 *   SpaceScene  — the one 3D scene (Moon, Earth, Mars); never unmounts, so page changes animate
 *   page        — text and panels; empty areas let clicks through to the planets
 *
 * Pages:
 *   /               LandingPage  — intro over the floating planets
 *   /explore/:body  ExplorePage  — Moon or Mars in focus + panels, then Earth training areas
 *   /about          AboutPage    — team, method, data, AI usage
 */
export default function App() {
  return (
    <div className="relative h-full overflow-hidden bg-space">
      <StarField />
      <SpaceScene />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore/:body" element={<ExplorePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
