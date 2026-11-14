import * as THREE from 'three'
import ThreeGlobe from 'three-globe'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PLANET_IDS, PLANETS, type PlanetId } from './planets'

/**
 * Imperative three.js engine behind <SpaceScene>: one scene, one camera, three globes, a deep star field.
 * React decides *what* to show (layout + markers); this class decides *how* it moves.
 *
 * Layouts:
 *  - landing: the planets float behind the page text, spin slowly and drift with the mouse (parallax).
 *             On "/" the page scroll drives a story (setStory): one planet at a time slides in large beside
 *             its section text (Mars, Moon, Earth), then all three settle back behind the method card.
 *  - focus:   one planet flies to the center at full size, the others drift far away;
 *             the user can orbit it, and the camera can fly to a lat/lon on it.
 *
 * Journey: flying from a spot on one planet to a spot on another (site → its Earth training area, and back) draws a
 * glowing arc between the two spots while the planets swap places, coloured from one planet's accent to the other's.
 *
 * Motion (after Emil Kowalski's rules): enter/settle moves use a strong ease-out, on-screen moves an
 * ease-in-out; the field of view "breathes" during long flights for a sense of speed; reduced motion
 * turns every flight into a cut and disables parallax and the intro.
 */

export type Layout = { kind: 'landing' } | { kind: 'focus'; planet: PlanetId; target: LatLon | null }

export interface LatLon {
  lat: number
  lon: number
}

export interface Marker extends LatLon {
  id: string
  label: string
  /**
   * strong = our candidates / training areas; muted = past landings we validate against (clickable);
   * landing = every other past landing, a name tag only (not clickable, no fly-to).
   */
  emphasis: 'strong' | 'muted' | 'landing'
  active: boolean
}

export interface EngineEvents {
  onPlanetClick: (planet: PlanetId) => void
  onMarkerClick: (planet: PlanetId, markerId: string) => void
  onHover: (hover: { label: string; x: number; y: number } | null) => void
  /** All textures are in and the intro has started. */
  onReady: () => void
}

/** Point marker as stored inside three-globe (it adds bookkeeping fields to each datum). */
type PointDatum = Marker & { planet: PlanetId }

const FOCUS_DISTANCE = 430
const LANDING_CAMERA = new THREE.Vector3(0, 0, 1000)
const INTRO_CAMERA = new THREE.Vector3(0, 260, 3400)
const BASE_FOV = 45
const FLY_MS = 1500
const INTRO_MS = 3200
/** Mobile: share of the screen height covered by the bottom sheet; the focused planet is centered above it. */
const SHEET_SHARE = 0.4
/** Desktop (≥ 768 px): width of the right site panel plus its margin — keep in sync with SitePanel (md:w-[30rem] md:right-6, lg:w-[34rem] lg:right-12). */
const DESKTOP_MIN = 768
const panelPx = (w: number) => (w >= 1024 ? 34 * 16 + 48 : 30 * 16 + 24)
/** How far the landing camera drifts with the mouse (world units). */
const PARALLAX = { x: 70, y: 45 }

/**
 * Story stages on the landing page, one per screen height of scroll.
 * 'hero' = Earth rising from the bottom edge, the Moon and Mars half off the left and right edges (labels in LandingPage);
 * a planet = that planet large beside its chapter text; `null` = the floating poses behind the method card (and /about).
 */
type Stage = 'hero' | { planet: PlanetId; side: 1 | -1 } | null
const STORY: Stage[] = ['hero', { planet: 'mars', side: 1 }, { planet: 'moon', side: -1 }, { planet: 'earth', side: 1 }, null]
/** Hero poses as screen fractions (x, y in -1..1 at depth z = 0) — LandingPage places the Moon/Mars labels to match. */
const HERO: Record<PlanetId, { x: number; y: number; scale: number; drop?: number }> = {
  moon: { x: -0.98, y: 0.05, scale: 0.9 },
  mars: { x: 0.98, y: 0.05, scale: 0.9 },
  earth: { x: 0, y: -1, scale: 4.1, drop: 170 },
}
/** Depth of a featured planet (camera sits at z = 1000) and its size on wide and narrow screens. */
const FEATURE = { z: 250, scale: 1.9, mobileScale: 1.15 }

/** Journey arc: points along the curve and the fade after landing. */
const JOURNEY_POINTS = 96
const JOURNEY_FADE_MS = 1100

const easeOut = (t: number) => 1 - (1 - t) ** 4 // close to cubic-bezier(0.23, 1, 0.32, 1)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

interface PlanetState {
  globe: ThreeGlobe
  group: THREE.Group
  ready: boolean
  /** Scale from the layout; hover multiplies on top of it. */
  base: number
  hover: number
  from: { position: THREE.Vector3; scale: number }
  to: { position: THREE.Vector3; scale: number }
}

interface Tween {
  start: number
  duration: number
  ease: (t: number) => number
  /** Peak extra field of view mid-flight, in degrees. */
  fovKick: number
  camFrom: THREE.Vector3
  camTo: THREE.Vector3
  centerFrom: THREE.Vector3
  centerTo: THREE.Vector3
}

export class SpaceEngine {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private planets = {} as Record<PlanetId, PlanetState>
  private stars = new THREE.Group()
  private layout: Layout = { kind: 'landing' }
  /** Landing-page scroll story: target from the page, smoothed value used for drawing (both in stages). */
  private storyTarget = 0
  private story = 0
  private pendingLayout: Layout | null = null
  private ready = false
  private tween: Tween | null = null
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  /** Mouse position for parallax, -1..1, smoothed toward `mouseTarget`. */
  private mouse = new THREE.Vector2()
  private mouseTarget = new THREE.Vector2()
  private hoveredPlanet: PlanetId | null = null
  /** HTML name tags that follow the markers on screen (hidden on the far side, overlaps dropped by priority). */
  private labelLayer = document.createElement('div')
  private labels: { el: HTMLElement; datum: PointDatum; width: number }[] = []
  /** Additive glow sprites under the markers; the active one pulses. */
  private glows: { sprite: THREE.Sprite; size: number; active: boolean }[] = []
  private glowTexture = makeGlowTexture()
  /** The site → Earth arc (see drawJourney); null when no journey is running. */
  private journey: {
    from: { planet: PlanetId } & LatLon
    to: { planet: PlanetId } & LatLon
    start: number
    duration: number
  } | null = null
  private journeyLine: THREE.Line
  /** Soft dots on the same geometry, so the 1 px line reads as a glowing trail. */
  private journeyGlow: THREE.Points
  private journeyHead: THREE.Sprite
  private pointerDown: { x: number; y: number } | null = null
  private frame = 0
  private lastTime = performance.now()
  private reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private container: HTMLElement
  private events: EngineEvents

  constructor(container: HTMLElement, events: EngineEvents) {
    this.container = container
    this.events = events

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    Object.assign(this.renderer.domElement.style, { display: 'block', width: '100%', height: '100%' })
    container.appendChild(this.renderer.domElement)
    Object.assign(this.labelLayer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden' })
    container.appendChild(this.labelLayer)

    this.camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 1, 20000)
    this.camera.position.copy(this.reduceMotion ? LANDING_CAMERA : INTRO_CAMERA)
    this.camera.lookAt(0, 0, 0)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.enablePan = false
    this.controls.minDistance = 180
    this.controls.maxDistance = 900
    this.controls.rotateSpeed = 0.5
    this.controls.autoRotateSpeed = 0.35
    this.controls.enabled = false

    // Key light from the upper left, a cool rim light from behind, a low fill so night sides aren't flat black.
    this.scene.add(new THREE.AmbientLight(0x9fb4d9, 0.35))
    // Lights ride with the camera, so whatever spot we fly to is lit from the upper left, never on the night side.
    this.scene.add(this.camera)
    const sun = new THREE.DirectionalLight(0xfff4e6, 2.6)
    sun.position.set(-700, 450, 300)
    this.camera.add(sun)
    const rim = new THREE.DirectionalLight(0x6fb8ff, 1.4)
    rim.position.set(600, 150, -1200)
    this.camera.add(rim)

    this.createStars()
    for (const id of PLANET_IDS) this.createPlanet(id)

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(JOURNEY_POINTS * 3), 3))
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(JOURNEY_POINTS * 3), 3))
    this.journeyLine = new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    this.journeyLine.frustumCulled = false
    this.journeyLine.visible = false
    this.journeyGlow = new THREE.Points(
      lineGeometry,
      new THREE.PointsMaterial({
        map: this.glowTexture,
        size: 7,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    this.journeyGlow.frustumCulled = false
    this.journeyGlow.visible = false
    this.journeyHead = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.glowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    this.journeyHead.visible = false
    this.scene.add(this.journeyLine, this.journeyGlow, this.journeyHead)

    this.resize()
    window.addEventListener('resize', this.resize)
    window.addEventListener('pointermove', this.trackMouse)
    const el = this.renderer.domElement
    el.addEventListener('pointerdown', this.handlePointerDown)
    el.addEventListener('pointerup', this.handlePointerUp)
    el.addEventListener('pointermove', this.handlePointerMove)
    el.addEventListener('pointerleave', this.handlePointerLeave)
    this.frame = requestAnimationFrame(this.animate)
  }

  dispose() {
    cancelAnimationFrame(this.frame)
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('pointermove', this.trackMouse)
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this.handlePointerDown)
    el.removeEventListener('pointerup', this.handlePointerUp)
    el.removeEventListener('pointermove', this.handlePointerMove)
    el.removeEventListener('pointerleave', this.handlePointerLeave)
    for (const id of PLANET_IDS) this.planets[id].globe.pauseAnimation()
    this.controls.dispose()
    this.renderer.dispose()
    el.remove()
    this.labelLayer.remove()
    this.glowTexture.dispose()
  }

  /** Moves planets and camera to a new layout with one smooth flight. Waits for the textures first. */
  setLayout(layout: Layout) {
    if (!this.ready) {
      this.pendingLayout = layout
      return
    }
    this.applyLayout(layout, FLY_MS, easeInOut, 9)
  }

  /** Landing-page scroll position in stages (1 = one screen height). Planets follow it smoothly. */
  setStory(stage: number) {
    this.storyTarget = Math.max(0, Math.min(stage, STORY.length - 1))
    if (this.reduceMotion) this.story = this.storyTarget
  }

  /** Where every planet sits at a (fractional) story stage: the two neighbouring stages, blended with an ease. */
  private storyPoses(stage: number) {
    const i = Math.min(Math.floor(stage), STORY.length - 2)
    const t = easeInOut(Math.min(Math.max(stage - i, 0), 1))
    const result = {} as Record<PlanetId, { position: THREE.Vector3; scale: number }>
    for (const id of PLANET_IDS) {
      const a = this.stagePose(i, id)
      const b = this.stagePose(i + 1, id)
      result[id] = { position: a.position.lerp(b.position, t), scale: a.scale + (b.scale - a.scale) * t }
    }
    return result
  }

  private stagePose(stage: number, id: PlanetId) {
    const config = PLANETS[id]
    const step = STORY[stage]
    if (step === 'hero') {
      const halfH = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) * LANDING_CAMERA.z
      const h = HERO[id]
      // Phones: the Moon and Mars shrink and slip further off the edges, so they don't cover the title.
      const narrow = this.camera.aspect < 0.9 && id !== 'earth'
      const x = (narrow ? Math.sign(h.x) * 1.12 : h.x) * halfH * this.camera.aspect
      return { position: new THREE.Vector3(x, h.y * halfH - (h.drop ?? 0), 0), scale: narrow ? 0.6 : h.scale }
    }
    if (!step) return { position: new THREE.Vector3(...config.landing.position), scale: config.landing.scale }
    if (step.planet !== id) return { position: new THREE.Vector3(...config.away.position), scale: config.away.scale }
    // Featured: beside the text on wide screens, above it on narrow ones.
    const depth = LANDING_CAMERA.z - FEATURE.z
    const halfH = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) * depth
    const aspect = this.camera.aspect
    if (aspect < 0.9) return { position: new THREE.Vector3(0, halfH * 0.5, FEATURE.z), scale: FEATURE.mobileScale }
    return { position: new THREE.Vector3(step.side * halfH * aspect * 0.42, 0, FEATURE.z), scale: FEATURE.scale }
  }

  /**
   * Markers drawn on one planet; other planets are cleared. Each marker is a bright disc with a soft glow, radar rings
   * for candidates and the active one, and an HTML name tag beside it (see updateLabels).
   */
  setMarkers(planet: PlanetId | null, markers: Marker[]) {
    this.glows = []
    for (const id of PLANET_IDS) {
      const data: PointDatum[] = id === planet ? markers.map((m) => ({ ...m, planet: id })) : []
      const accent = PLANETS[id].accent
      const color = (m: PointDatum) =>
        m.active ? '#ffffff' : m.emphasis === 'strong' ? accent : m.emphasis === 'muted' ? '#9aa4b6' : '#c3cad6'
      this.planets[id].globe
        .pointsData(data)
        .pointColor((d) => color(d as PointDatum))
        .pointAltitude(0.004)
        .pointRadius((d) => {
          const m = d as PointDatum
          return m.active ? 1.1 : m.emphasis === 'strong' ? 0.75 : m.emphasis === 'muted' ? 0.45 : 0.32
        })
        .ringsData(data.filter((m) => m.active || m.emphasis === 'strong'))
        .ringColor((d: object) => {
          const m = d as PointDatum
          const rgb = m.active ? '255,255,255' : hexToRgb(accent)
          return (t: number) => `rgba(${rgb},${0.9 * (1 - t)})`
        })
        .ringMaxRadius((d) => ((d as PointDatum).active ? 6 : 3.5))
        .ringPropagationSpeed((d) => ((d as PointDatum).active ? 3 : 1.6))
        .ringRepeatPeriod((d) => ((d as PointDatum).active ? 800 : 1800))
        .ringAltitude(0.003)
        .objectsData(data)
        .objectLat((d) => (d as PointDatum).lat)
        .objectLng((d) => (d as PointDatum).lon)
        .objectAltitude(0.012)
        .objectThreeObject((d) => {
          const m = d as PointDatum
          const material = new THREE.SpriteMaterial({
            map: this.glowTexture,
            color: color(m),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: m.active || m.emphasis === 'strong' ? 0.95 : m.emphasis === 'muted' ? 0.55 : 0.35,
          })
          const sprite = new THREE.Sprite(material)
          const size = m.active ? 13 : m.emphasis === 'strong' ? 8 : m.emphasis === 'muted' ? 4.5 : 3
          sprite.scale.setScalar(size)
          this.glows.push({ sprite, size, active: m.active })
          return sprite
        })
    }
    this.buildLabels(planet, markers)
  }

  private buildLabels(planet: PlanetId | null, markers: Marker[]) {
    this.labelLayer.replaceChildren()
    this.labels = []
    if (!planet) return
    const accent = PLANETS[planet].accent
    // Priority: active first, then candidates, then the muted ones; later tags give way when they overlap.
    const rank = (m: Marker) => (m.active ? 0 : m.emphasis === 'strong' ? 1 : m.emphasis === 'muted' ? 2 : 3)
    for (const m of [...markers].sort((a, b) => rank(a) - rank(b))) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = `absolute top-0 left-0 flex max-w-[16rem] items-center gap-1.5 whitespace-nowrap rounded-full font-mono uppercase transition-opacity duration-200 will-change-transform ${
        m.active
          ? 'border border-white bg-white px-3 py-1.5 text-xs tracking-[0.14em] text-[#05070d] shadow-[0_0_28px_rgba(255,255,255,0.35)]'
          : m.emphasis === 'strong'
            ? 'border border-white/20 bg-[#05070d]/75 px-2.5 py-1 text-[11px] tracking-[0.14em] text-[#e8ecf2] backdrop-blur-md hover:border-white/60'
            : m.emphasis === 'muted'
              ? 'px-1 text-[10px] tracking-[0.12em] text-[#aeb6c4] [text-shadow:0_1px_6px_#05070d] hover:text-white'
              : 'cursor-default px-1 text-[11px] tracking-[0.1em] text-[#c3cad6]/80 [text-shadow:0_1px_6px_#05070d]'
      }`
      if (m.emphasis === 'strong' && !m.active) {
        const dot = document.createElement('span')
        dot.className = 'size-1.5 shrink-0 rounded-full'
        dot.style.background = accent
        dot.style.boxShadow = `0 0 8px ${accent}`
        el.append(dot)
      }
      const text = document.createElement('span')
      text.className = 'min-w-0 truncate'
      text.textContent = m.label
      el.title = m.label
      el.append(text)
      el.style.opacity = '0'
      if (m.emphasis === 'landing') el.tabIndex = -1
      else el.addEventListener('click', () => this.events.onMarkerClick(planet, m.id))
      this.labelLayer.append(el)
      this.labels.push({ el, datum: { ...m, planet }, width: 0 })
    }
  }

  /** Places the name tags next to their markers; hides tags on the far side and lower-priority tags that overlap. */
  private updateLabels() {
    const show = this.layout.kind === 'focus'
    this.labelLayer.style.visibility = show ? 'visible' : 'hidden'
    if (!show || this.labels.length === 0) return
    const { clientWidth: w, clientHeight: h } = this.container
    // Tags stay out of the site text on the right (desktop); a tag that would cross it flips to the marker's left.
    const limit = w >= DESKTOP_MIN ? w - panelPx(w) - 8 : w - 8
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = []
    const center = new THREE.Vector3()
    const toCamera = new THREE.Vector3()
    for (const label of this.labels) {
      const p = this.planets[label.datum.planet]
      const local = p.globe.getCoords(label.datum.lat, label.datum.lon, 0.012)
      const world = new THREE.Vector3(local.x, local.y, local.z).applyMatrix4(p.group.matrixWorld)
      p.group.getWorldPosition(center)
      const facing = world.clone().sub(center).normalize().dot(toCamera.copy(this.camera.position).sub(world).normalize())
      const ndc = world.clone().project(this.camera)
      const px = ((ndc.x + 1) / 2) * w
      const y = ((1 - ndc.y) / 2) * h
      if (!label.width) label.width = label.el.offsetWidth
      // Right of the marker if it fits, else left of it; the active tag is never dropped, only nudged into the free area.
      let x = px + 14 + label.width > limit ? px - 14 - label.width : px + 14
      if (label.datum.active) x = Math.max(4, Math.min(x, limit - label.width))
      const box = { x0: x, x1: x + label.width, y0: y - 12, y1: y + 12 }
      const hidden =
        facing < 0.12 ||
        x < 4 ||
        (!label.datum.active && placed.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0))
      label.el.style.opacity = hidden ? '0' : String(Math.min(1, (facing - 0.12) / 0.2))
      label.el.style.pointerEvents = hidden || label.datum.emphasis === 'landing' ? 'none' : 'auto'
      label.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%)`
      if (!hidden) placed.push(box)
    }
  }

  private applyLayout(layout: Layout, duration: number, ease: (t: number) => number, fovKick: number) {
    const previous = this.layout
    this.layout = layout

    // Spot on one planet → spot on another: draw the journey arc during the flight.
    if (
      !this.reduceMotion &&
      previous.kind === 'focus' &&
      layout.kind === 'focus' &&
      previous.planet !== layout.planet &&
      previous.target &&
      layout.target
    ) {
      this.journey = {
        from: { planet: previous.planet, ...previous.target },
        to: { planet: layout.planet, ...layout.target },
        start: performance.now(),
        duration,
      }
    } else if (layout.kind !== 'focus' || previous.kind !== 'focus' || previous.planet !== layout.planet) {
      this.journey = null
    }

    for (const id of PLANET_IDS) {
      const p = this.planets[id]
      const config = PLANETS[id]
      p.from = { position: p.group.position.clone(), scale: p.base }
      if (layout.kind === 'landing') {
        p.to = this.storyPoses(this.story)[id]
      } else if (id === layout.planet) {
        p.to = { position: new THREE.Vector3(0, 0, 0), scale: 1 }
      } else {
        p.to = { position: new THREE.Vector3(...config.focusAway), scale: config.away.scale }
      }
    }

    let camTo: THREE.Vector3
    if (layout.kind === 'landing') {
      camTo = LANDING_CAMERA.clone()
    } else {
      // Look at the target spot if there is one; otherwise keep the current viewing direction.
      const samePlanet = previous.kind === 'focus' && previous.planet === layout.planet
      const direction =
        layout.target !== null
          ? this.directionTo(layout.planet, layout.target)
          : samePlanet
            ? this.camera.position.clone().sub(this.controls.target).normalize()
            : new THREE.Vector3(0, 0.25, 1).normalize()
      // A selected spot is a close-up: the camera comes in low over it (the panel shows the orbital image).
      const distance = layout.target !== null ? FOCUS_DISTANCE * 0.62 : FOCUS_DISTANCE
      camTo = direction.multiplyScalar(distance)
    }
    // A flight between two spots on the same planet is short; don't kick the field of view.
    const sameFocus = previous.kind === 'focus' && layout.kind === 'focus' && previous.planet === layout.planet

    this.controls.enabled = false
    this.controls.autoRotate = false
    this.tween = {
      start: performance.now(),
      duration: this.reduceMotion ? 0 : sameFocus ? FLY_MS * 0.8 : duration,
      ease,
      fovKick: this.reduceMotion || sameFocus ? 0 : fovKick,
      camFrom: this.camera.position.clone(),
      camTo,
      centerFrom: this.controls.target.clone(),
      centerTo: new THREE.Vector3(0, 0, 0),
    }
    this.updateViewOffset()
  }

  private createPlanet(id: PlanetId) {
    const config = PLANETS[id]
    const globe = new ThreeGlobe({ animateIn: false })
      .globeImageUrl(config.texture)
      .bumpImageUrl(config.bump)
      .showAtmosphere(config.atmosphere !== null)
      .pointResolution(32)
      .ringLat((d) => (d as PointDatum).lat)
      .ringLng((d) => (d as PointDatum).lon)
      .pointLat((d) => (d as PointDatum).lat)
      .pointLng((d) => (d as PointDatum).lon)
      .onGlobeReady(() => this.planetReady(id))
    if (config.atmosphere) globe.atmosphereColor(config.atmosphere.color).atmosphereAltitude(config.atmosphere.altitude)
    const material = globe.globeMaterial() as THREE.MeshPhongMaterial
    material.bumpScale = config.bumpScale
    material.shininess = id === 'earth' ? 14 : 3
    if (id === 'earth') material.specular = new THREE.Color(0x1a2a3a)

    const group = new THREE.Group()
    group.add(globe)
    group.position.set(...config.landing.position)
    group.scale.setScalar(config.landing.scale)
    group.rotation.y = Math.random() * Math.PI * 2
    group.userData.planet = id
    this.scene.add(group)

    const rest = { position: group.position.clone(), scale: config.landing.scale }
    this.planets[id] = { globe, group, ready: false, base: config.landing.scale, hover: 1, from: rest, to: rest }
  }

  private planetReady(id: PlanetId) {
    this.planets[id].ready = true
    if (this.ready || !PLANET_IDS.every((p) => this.planets[p].ready)) return
    this.ready = true
    this.events.onReady()
    // Intro: a slow push-in from deep space to wherever the page wants us.
    this.applyLayout(this.pendingLayout ?? { kind: 'landing' }, INTRO_MS, easeOut, 0)
    this.pendingLayout = null
  }

  /** Three shells of stars at different depths, so they parallax against each other. */
  private createStars() {
    const layers = [
      { count: 1400, radius: [2500, 5000], size: 1.1, opacity: 0.55 },
      { count: 500, radius: [1800, 3000], size: 1.6, opacity: 0.75 },
      { count: 120, radius: [1400, 2200], size: 2.4, opacity: 0.9 },
    ]
    for (const layer of layers) {
      const positions = new Float32Array(layer.count * 3)
      const colors = new Float32Array(layer.count * 3)
      const tint = [new THREE.Color(0xffffff), new THREE.Color(0xcfe0ff), new THREE.Color(0xffe6c7)]
      for (let i = 0; i < layer.count; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(layer.radius[0] + Math.random() * (layer.radius[1] - layer.radius[0]))
        positions.set([v.x, v.y, v.z], i * 3)
        const c = tint[Math.random() < 0.8 ? 0 : Math.random() < 0.5 ? 1 : 2]
        colors.set([c.r, c.g, c.b], i * 3)
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      const material = new THREE.PointsMaterial({
        size: layer.size,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        opacity: layer.opacity,
        depthWrite: false,
      })
      this.stars.add(new THREE.Points(geometry, material))
    }
    this.scene.add(this.stars)
  }

  /** Unit vector from the planet's center to a spot on its surface, in world space. */
  private directionTo(planet: PlanetId, spot: LatLon) {
    const p = this.planets[planet]
    const local = p.globe.getCoords(spot.lat, spot.lon, 0)
    const rotation = new THREE.Matrix4().makeRotationFromEuler(p.group.rotation)
    return new THREE.Vector3(local.x, local.y, local.z).applyMatrix4(rotation).normalize()
  }

  private animate = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1)
    this.lastTime = time
    const smooth = (rate: number) => 1 - Math.exp(-rate * dt) // frame-rate independent easing toward a target

    // Planets: layout tween + hover lift.
    if (this.tween) {
      const raw = this.tween.duration === 0 ? 1 : Math.min((time - this.tween.start) / this.tween.duration, 1)
      const t = this.tween.ease(raw)
      for (const id of PLANET_IDS) {
        const p = this.planets[id]
        p.group.position.lerpVectors(p.from.position, p.to.position, t)
        p.base = p.from.scale + (p.to.scale - p.from.scale) * t
      }
      this.controls.target.lerpVectors(this.tween.centerFrom, this.tween.centerTo, t)
      this.camera.position.copy(slerpAround(this.tween.camFrom, this.tween.camTo, this.controls.target, t))
      this.camera.fov = BASE_FOV + this.tween.fovKick * Math.sin(Math.PI * raw)
      this.camera.updateProjectionMatrix()
      this.camera.lookAt(this.controls.target)
      if (raw >= 1) {
        this.tween = null
        if (this.layout.kind === 'focus') {
          this.controls.enabled = true
          this.controls.autoRotate = this.layout.target === null && !this.reduceMotion
        }
      }
    }
    // Landing page: planets follow the scroll story once no flight is running.
    if (this.layout.kind === 'landing' && !this.tween) {
      this.story += (this.storyTarget - this.story) * smooth(5)
      const poses = this.storyPoses(this.story)
      for (const id of PLANET_IDS) {
        this.planets[id].group.position.copy(poses[id].position)
        this.planets[id].base = poses[id].scale
      }
    }
    for (const id of PLANET_IDS) {
      const p = this.planets[id]
      const lift = this.layout.kind === 'landing' && this.story < 0.5 && this.hoveredPlanet === id && !this.tween ? 1.08 : 1
      p.hover += (lift - p.hover) * smooth(10)
      p.group.scale.setScalar(p.base * p.hover)
    }

    if (this.layout.kind === 'landing' && !this.reduceMotion) {
      for (const id of PLANET_IDS) this.planets[id].group.rotation.y += PLANETS[id].landing.spin * dt
      // Parallax: the camera drifts a little with the mouse, so near planets slide against far stars.
      this.mouse.lerp(this.mouseTarget, smooth(3))
      if (!this.tween) {
        this.camera.position.set(LANDING_CAMERA.x + this.mouse.x * PARALLAX.x, LANDING_CAMERA.y + this.mouse.y * PARALLAX.y, LANDING_CAMERA.z)
        this.camera.lookAt(0, 0, 0)
      }
    }
    if (!this.reduceMotion) this.stars.rotation.y += 0.004 * dt

    if (this.controls.enabled) this.controls.update()
    this.drawJourney(time)

    // The active marker's glow breathes.
    if (!this.reduceMotion) {
      const pulse = 1 + 0.18 * Math.sin(time / 260)
      for (const g of this.glows) if (g.active) g.sprite.scale.setScalar(g.size * pulse)
    }
    this.renderer.render(this.scene, this.camera)
    this.updateLabels()
    this.frame = requestAnimationFrame(this.animate)
  }

  /** World position of a lat/lon spot on a planet, as the planet is placed right now. */
  private worldSpot(planet: PlanetId, spot: LatLon, altitude = 0.01) {
    const p = this.planets[planet]
    p.group.updateMatrixWorld()
    const local = p.globe.getCoords(spot.lat, spot.lon, altitude)
    return new THREE.Vector3(local.x, local.y, local.z).applyMatrix4(p.group.matrixWorld)
  }

  /**
   * The journey arc: a cubic curve that leaves the first planet straight up from the site and comes down onto the
   * second planet's spot, drawn as it grows (head = a glowing dot), then fading out once the flight has landed.
   */
  private drawJourney(time: number): void {
    const j = this.journey
    if (!j) {
      this.journeyLine.visible = false
      this.journeyGlow.visible = false
      this.journeyHead.visible = false
      return
    }
    const elapsed = time - j.start
    const grow = easeInOut(Math.min(Math.max(elapsed / j.duration, 0), 1))
    const fade = 1 - Math.min(Math.max((elapsed - j.duration) / JOURNEY_FADE_MS, 0), 1)
    if (fade <= 0) {
      this.journey = null
      return this.drawJourney(time)
    }

    const a = this.worldSpot(j.from.planet, j.from)
    const b = this.worldSpot(j.to.planet, j.to)
    const na = a.clone().sub(this.planets[j.from.planet].group.position).normalize()
    const nb = b.clone().sub(this.planets[j.to.planet].group.position).normalize()
    const lift = a.distanceTo(b) * 0.35
    const curve = new THREE.CubicBezierCurve3(a, a.clone().addScaledVector(na, lift), b.clone().addScaledVector(nb, lift), b)

    const colorA = new THREE.Color(PLANETS[j.from.planet].accent)
    const colorB = new THREE.Color(PLANETS[j.to.planet].accent)
    const positions = this.journeyLine.geometry.getAttribute('position') as THREE.BufferAttribute
    const colors = this.journeyLine.geometry.getAttribute('color') as THREE.BufferAttribute
    const point = new THREE.Vector3()
    const color = new THREE.Color()
    for (let i = 0; i < JOURNEY_POINTS; i++) {
      const u = (i / (JOURNEY_POINTS - 1)) * grow
      curve.getPoint(u, point)
      positions.setXYZ(i, point.x, point.y, point.z)
      // Brighter toward the head, so the arc reads as something travelling.
      color.copy(colorA).lerp(colorB, u).multiplyScalar(0.35 + 0.65 * (i / (JOURNEY_POINTS - 1)))
      colors.setXYZ(i, color.r, color.g, color.b)
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
    ;(this.journeyLine.material as THREE.LineBasicMaterial).opacity = fade
    this.journeyLine.visible = true
    ;(this.journeyGlow.material as THREE.PointsMaterial).opacity = fade * 0.55
    this.journeyGlow.visible = true

    curve.getPoint(grow, point)
    this.journeyHead.position.copy(point)
    this.journeyHead.scale.setScalar(18 * (1 - 0.4 * grow))
    const head = this.journeyHead.material as THREE.SpriteMaterial
    head.color.copy(colorA).lerp(colorB, grow).lerp(new THREE.Color('#ffffff'), 0.45)
    head.opacity = fade * (grow < 1 ? 1 : 0.6)
    this.journeyHead.visible = true
  }

  private resize = () => {
    const { clientWidth: w, clientHeight: h } = this.container
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.updateViewOffset()
  }

  /** In focus mode, center the planet in the free area: left of the side panel (desktop) or above the bottom sheet (mobile). */
  private updateViewOffset() {
    const { clientWidth: w, clientHeight: h } = this.container
    if (this.layout.kind !== 'focus') this.camera.clearViewOffset()
    else if (w >= DESKTOP_MIN) this.camera.setViewOffset(w, h, panelPx(w) / 2, 0, w, h)
    else this.camera.setViewOffset(w, h, 0, (h * SHEET_SHARE) / 2, w, h)
    this.camera.updateProjectionMatrix()
  }

  private hit(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(
      PLANET_IDS.map((id) => this.planets[id].group),
      true,
    )
    for (const h of hits) {
      if (tagged(h.object, 'atmosphere')) continue
      let obj: THREE.Object3D | null = h.object
      let point: PointDatum | null = null
      let planet: PlanetId | null = null
      while (obj) {
        const t = obj as THREE.Object3D & { __globeObjType?: string; __data?: unknown }
        if ((t.__globeObjType === 'point' || t.__globeObjType === 'object') && t.__data) point = t.__data as PointDatum
        if (obj.userData.planet) planet = obj.userData.planet as PlanetId
        obj = obj.parent
      }
      // Name-only landing markers are not clickable: treat a hit on them as a hit on the planet.
      if (planet) return { planet, point: point?.emphasis === 'landing' ? null : point }
    }
    return null
  }

  private trackMouse = (event: PointerEvent) => {
    this.mouseTarget.set((event.clientX / window.innerWidth) * 2 - 1, -((event.clientY / window.innerHeight) * 2 - 1))
  }

  private handlePointerDown = (event: PointerEvent) => {
    this.pointerDown = { x: event.clientX, y: event.clientY }
  }

  private handlePointerUp = (event: PointerEvent) => {
    const down = this.pointerDown
    this.pointerDown = null
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return // a drag, not a click
    const result = this.hit(event)
    if (!result) return
    if (result.point) this.events.onMarkerClick(result.planet, result.point.id)
    else if (this.layout.kind === 'landing' && PLANETS[result.planet].clickable) this.events.onPlanetClick(result.planet)
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (this.pointerDown) return
    const result = this.hit(event)
    const rect = this.renderer.domElement.getBoundingClientRect()
    const position = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const landingPlanet = result && this.layout.kind === 'landing' && PLANETS[result.planet].clickable ? result.planet : null
    this.hoveredPlanet = landingPlanet
    if (result?.point) {
      // Markers carry their own name tags, so no tooltip here.
      this.renderer.domElement.style.cursor = 'pointer'
      this.events.onHover(null)
    } else if (landingPlanet) {
      this.renderer.domElement.style.cursor = 'pointer'
      this.events.onHover({ label: `Explore ${PLANETS[landingPlanet].label}`, ...position })
    } else {
      this.renderer.domElement.style.cursor = this.controls.enabled ? 'grab' : 'default'
      this.events.onHover(null)
    }
  }

  private handlePointerLeave = () => {
    this.hoveredPlanet = null
    this.events.onHover(null)
  }
}

function tagged(obj: THREE.Object3D, type: string) {
  return (obj as THREE.Object3D & { __globeObjType?: string }).__globeObjType === type
}

/** Moves along an arc around `center` (so the camera never cuts through a planet). */
function slerpAround(from: THREE.Vector3, to: THREE.Vector3, center: THREE.Vector3, t: number) {
  const a = from.clone().sub(center)
  const ra = a.length()
  const rb = to.length()
  const q = new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(a.clone().normalize(), to.clone().normalize()), t)
  return a.normalize().applyQuaternion(q).multiplyScalar(ra + (rb - ra) * t).add(center)
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

/** Soft white dot fading to transparent; tinted per marker through the sprite color. */
function makeGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.22)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
