import * as THREE from 'three'
import ThreeGlobe from 'three-globe'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PLANET_IDS, PLANETS, type PlanetId } from './planets'
import { STAGES, type Pose } from './story'

/**
 * Imperative three.js engine behind <SpaceScene>: one scene, one camera, three globes, a deep star field.
 * React decides *what* to show (layout, markers, the pair on the landing page); this class decides *how* it moves.
 *
 * Layouts:
 *  - story: the planets hold the poses of the landing page's scroll story (story.ts) and drift with the mouse.
 *           On the first stage a glowing arc links one of our sites to its best match on Earth (setPair); both
 *           bodies turn so the two spots face the viewer. Other pages use the quiet "backdrop" stage.
 *  - focus: one planet flies to the middle of the free area (the screen minus the panels, see setInsets),
 *           the others drift far away; the user can orbit it, and the camera can fly to a lat/lon on it.
 *
 * Journey: flying from a spot on one planet to a spot on another (site → its Earth training area, and back) draws
 * the same kind of arc between the two spots while the planets swap places.
 *
 * Motion (after Emil Kowalski's rules): enter/settle moves use a strong ease-out, on-screen moves an
 * ease-in-out; the field of view "breathes" during long flights for a sense of speed; reduced motion
 * turns every flight into a cut and disables parallax, spin and the intro.
 */

export type Layout = { kind: 'story' } | { kind: 'focus'; planet: PlanetId; target: LatLon | null }

export interface LatLon {
  lat: number
  lon: number
}

/** One end of the landing-page pair: a spot on a body and the name shown beside it. */
export interface PairEnd extends LatLon {
  planet: PlanetId
  label: string
}

export interface Pair {
  from: PairEnd
  to: PairEnd
}

/** Screen space taken by panels, in px from each edge. A focused planet is centred in what is left. */
export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
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
  /** Overrides the planet's accent (Earth markers take the colour of the body they stand in for). */
  color?: string
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

const CAMERA_Z = 1000
const STORY_CAMERA = new THREE.Vector3(0, 0, CAMERA_Z)
const INTRO_CAMERA = new THREE.Vector3(0, 260, 3400)
const BASE_FOV = 45
const FLY_MS = 1500
const INTRO_MS = 3200
/** Share of the free area's smaller side that a focused planet's diameter fills; a selected spot comes closer. */
const FOCUS_FILL = 0.8
const CLOSE_UP = 0.72
/** How far the story camera drifts with the mouse (world units). */
const PARALLAX = { x: 60, y: 40 }

/** The pair arc shows while the story is on its first stage; it fades as the page scrolls on. */
const PAIR_REACH = 0.55
/** Each spot of a pair is turned this far (degrees) toward the other body, so the arc starts on the near side. */
const PAIR_BIAS = 24
const PAIR_SWAP_MS = 350
const PAIR_TURN_MS = 800
const PAIR_GROW_MS = 1400

/** Arc resolution and the fade of a journey arc after landing. */
const ARC_POINTS = 96
const JOURNEY_FADE_MS = 1100

const rad = THREE.MathUtils.degToRad
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1)
const easeOut = (t: number) => 1 - (1 - t) ** 4 // close to cubic-bezier(0.23, 1, 0.32, 1)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

interface PlanetState {
  globe: ThreeGlobe
  group: THREE.Group
  ready: boolean
  /** Scale from the layout; hover multiplies on top of it. */
  base: number
  hover: number
  from: { position: THREE.Vector3; scale: number; tilt: number }
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
  private layout: Layout = { kind: 'story' }
  /** Scroll story: target from the page, smoothed value used for drawing (both in stages). */
  private storyTarget = 0
  private story = 0
  private pendingLayout: Layout | null = null
  private ready = false
  private tween: Tween | null = null
  private insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 }
  /** Picture shift that centres a focused planet in the free area, eased toward its target (px). */
  private offset = new THREE.Vector2()
  private offsetTarget = new THREE.Vector2()
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
  /** The site → Earth arc of a flight between two bodies; null when no journey is running. */
  private journey: { from: { planet: PlanetId } & LatLon; to: { planet: PlanetId } & LatLon; start: number; duration: number } | null = null
  private journeyTrail: Trail
  /** The landing-page pair: the one on screen, the one waiting for the old arc to fade, and when the current one began. */
  private pair: Pair | null = null
  private pairQueued: Pair | null | undefined = undefined
  private pairSwapAt = 0
  private pairStart = 0
  private pairTrail: Trail
  private pairEnds: [THREE.Sprite, THREE.Sprite]
  private pairTags: [HTMLElement, HTMLElement]
  private pointerDown: { x: number; y: number } | null = null
  private frame = 0
  private lastTime = performance.now()
  private disposed = false
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
    this.camera.position.copy(this.reduceMotion ? STORY_CAMERA : INTRO_CAMERA)
    this.camera.lookAt(0, 0, 0)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.enablePan = false
    this.controls.minDistance = 170
    this.controls.maxDistance = 900
    this.controls.rotateSpeed = 0.5
    this.controls.autoRotateSpeed = 0.35
    this.controls.enabled = false
    // OrbitControls claims every touch gesture; in the story the page has to scroll (see applyLayout).
    this.renderer.domElement.style.touchAction = 'pan-y'

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

    this.resize()
    this.createStars()
    for (const id of PLANET_IDS) this.createPlanet(id)

    this.journeyTrail = new Trail(this.scene, this.glowTexture)
    this.pairTrail = new Trail(this.scene, this.glowTexture)
    this.pairEnds = [this.makeEndSprite(), this.makeEndSprite()]
    this.pairTags = [this.makePairTag(), this.makePairTag()]

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
    this.disposed = true
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
    for (const tag of this.pairTags) tag.remove()
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

  /** Scroll-story position in stages (see story.ts). Planets follow it smoothly. */
  setStory(stage: number) {
    this.storyTarget = Math.max(0, Math.min(stage, STAGES.length - 1))
    if (this.reduceMotion || !this.ready) this.story = this.storyTarget
  }

  /** The site ↔ Earth pair shown on the first story stage; null clears it. The old arc fades before the new one grows. */
  setPair(pair: Pair | null) {
    const current = this.pairQueued !== undefined ? this.pairQueued : this.pair
    if (JSON.stringify(current) === JSON.stringify(pair)) return
    this.pairQueued = pair
    this.pairSwapAt = performance.now() + (this.pair && !this.reduceMotion ? PAIR_SWAP_MS : 0)
  }

  /** Screen space covered by panels. A focused planet re-centres in what is left and name tags stay out of it. */
  setInsets(insets: Insets) {
    const same = (Object.keys(insets) as (keyof Insets)[]).every((k) => Math.abs(insets[k] - this.insets[k]) < 1)
    if (same) return
    this.insets = { ...insets }
    this.updateViewOffset()
    if (this.layout.kind !== 'focus') return
    const distance = this.focusDistance(this.layout.target !== null)
    this.controls.maxDistance = Math.max(900, distance * 1.6)
    if (this.tween) {
      this.tween.camTo.setLength(distance)
    } else if (this.ready) {
      // Keep the viewing direction, only step back or in so the planet fits the new free area.
      const direction = this.camera.position.clone().sub(this.controls.target).normalize()
      this.controls.enabled = false
      this.tween = {
        start: performance.now(),
        duration: this.reduceMotion ? 0 : 700,
        ease: easeInOut,
        fovKick: 0,
        camFrom: this.camera.position.clone(),
        camTo: direction.multiplyScalar(distance),
        centerFrom: this.controls.target.clone(),
        centerTo: new THREE.Vector3(0, 0, 0),
      }
      for (const id of PLANET_IDS) {
        const p = this.planets[id]
        p.from = { position: p.group.position.clone(), scale: p.base, tilt: p.group.rotation.x }
      }
    }
  }

  /** Camera distance at which the focused planet fills FOCUS_FILL of the free area. */
  private focusDistance(closeUp: boolean) {
    const { clientWidth: w, clientHeight: h } = this.container
    const free = Math.max(160, Math.min(w - this.insets.left - this.insets.right, h - this.insets.top - this.insets.bottom))
    const k = (100 * h) / (2 * Math.tan(rad(BASE_FOV / 2)) * ((free * FOCUS_FILL) / 2))
    const distance = Math.sqrt(k * k + 100 * 100)
    return closeUp ? Math.max(distance * CLOSE_UP, 200) : distance
  }

  /** Where every planet sits at a (fractional) story stage: the two neighbouring stages, blended with an ease. */
  private storyPoses(stage: number) {
    const i = Math.min(Math.floor(stage), STAGES.length - 2)
    const t = easeInOut(clamp01(stage - i))
    const result = {} as Record<PlanetId, { position: THREE.Vector3; scale: number }>
    for (const id of PLANET_IDS) {
      const a = this.stagePose(i, id)
      const b = this.stagePose(i + 1, id)
      result[id] = { position: a.position.lerp(b.position, t), scale: a.scale + (b.scale - a.scale) * t }
    }
    return result
  }

  private stagePose(stage: number, id: PlanetId) {
    const def = STAGES[stage]
    const pose: Pose = (this.camera.aspect < 0.9 ? def.narrow : def.wide)[id]
    const halfH = Math.tan(rad(BASE_FOV / 2)) * (CAMERA_Z - pose.z)
    return { position: new THREE.Vector3(pose.x * halfH * this.camera.aspect, pose.y * halfH, pose.z), scale: pose.scale }
  }

  /**
   * Markers per planet. Each is a bright disc with a soft glow, radar rings for candidates and the active one.
   * The planet named in `labelled` also gets an HTML name tag beside every marker (see updateLabels).
   */
  setMarkers(sets: Partial<Record<PlanetId, Marker[]>>, labelled: PlanetId | null) {
    this.glows = []
    for (const id of PLANET_IDS) {
      const data: PointDatum[] = (sets[id] ?? []).map((m) => ({ ...m, planet: id }))
      const accent = PLANETS[id].accent
      const color = (m: PointDatum) =>
        m.active ? '#ffffff' : m.emphasis === 'strong' ? (m.color ?? accent) : m.emphasis === 'muted' ? '#9aa4b6' : '#c3cad6'
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
          const rgb = m.active ? '255,255,255' : hexToRgb(m.color ?? accent)
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
    this.buildLabels(labelled, labelled ? (sets[labelled] ?? []) : [])
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
      el.className = `absolute top-0 left-0 flex max-w-[16rem] items-center gap-1.5 whitespace-nowrap rounded-full font-mono transition-opacity duration-200 will-change-transform ${
        m.active
          ? 'border border-white bg-white px-3 py-1.5 text-xs font-medium text-[#04060b] shadow-[0_0_28px_rgba(255,255,255,0.35)]'
          : m.emphasis === 'strong'
            ? 'border border-white/20 bg-[#04060b]/75 px-2.5 py-1 text-[11px] text-[#eef0f3] backdrop-blur-md hover:border-white/60'
            : m.emphasis === 'muted'
              ? 'px-1 text-[11px] text-[#aeb6c4] [text-shadow:0_1px_6px_#04060b] hover:text-white'
              : 'cursor-default px-1 text-[11px] text-[#c3cad6]/80 [text-shadow:0_1px_6px_#04060b]'
      }`
      if (m.emphasis === 'strong' && !m.active) {
        const dot = document.createElement('span')
        dot.className = 'size-1.5 shrink-0 rounded-full'
        dot.style.background = m.color ?? accent
        dot.style.boxShadow = `0 0 8px ${m.color ?? accent}`
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

  /** Places the name tags next to their markers; hides tags on the far side, under a panel, or overlapping a higher-priority tag. */
  private updateLabels() {
    const show = this.layout.kind === 'focus'
    this.labelLayer.style.visibility = show ? 'visible' : 'hidden'
    if (!show || this.labels.length === 0) return
    const { clientWidth: w, clientHeight: h } = this.container
    const free = { left: this.insets.left + 4, right: w - this.insets.right - 8, top: this.insets.top + 14, bottom: h - this.insets.bottom - 14 }
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
      let x = px + 14 + label.width > free.right ? px - 14 - label.width : px + 14
      if (label.datum.active) x = Math.max(free.left, Math.min(x, free.right - label.width))
      const box = { x0: x, x1: x + label.width, y0: y - 12, y1: y + 12 }
      const hidden =
        facing < 0.12 ||
        x < free.left ||
        y < free.top ||
        y > free.bottom ||
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
      p.from = { position: p.group.position.clone(), scale: p.base, tilt: p.group.rotation.x }
      if (layout.kind === 'story') {
        p.to = this.storyPoses(this.story)[id]
      } else if (id === layout.planet) {
        p.to = { position: new THREE.Vector3(0, 0, 0), scale: 1 }
      } else {
        const away = PLANETS[id].focusAway
        p.to = { position: new THREE.Vector3(...away.position), scale: away.scale }
      }
    }

    let camTo: THREE.Vector3
    if (layout.kind === 'story') {
      camTo = STORY_CAMERA.clone()
    } else {
      // Look at the target spot if there is one; otherwise keep the current viewing direction.
      const samePlanet = previous.kind === 'focus' && previous.planet === layout.planet
      const direction =
        layout.target !== null
          ? this.directionTo(layout.planet, layout.target)
          : samePlanet
            ? this.camera.position.clone().sub(this.controls.target).normalize()
            : new THREE.Vector3(...PLANETS[layout.planet].focusFrom).normalize()
      // A selected spot is a close-up: the camera comes in low over it (the panel shows the orbital image).
      const distance = this.focusDistance(layout.target !== null)
      this.controls.maxDistance = Math.max(900, distance * 1.6)
      camTo = direction.multiplyScalar(distance)
    }
    // A flight between two spots on the same planet is short; don't kick the field of view.
    const sameFocus = previous.kind === 'focus' && layout.kind === 'focus' && previous.planet === layout.planet

    this.controls.enabled = false
    this.controls.autoRotate = false
    this.renderer.domElement.style.touchAction = layout.kind === 'focus' ? 'none' : 'pan-y'
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
      .globeCurvatureResolution(2)
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
    const rest = this.stagePose(0, id)
    group.position.copy(rest.position)
    group.scale.setScalar(rest.scale)
    group.rotation.y = Math.random() * Math.PI * 2
    group.userData.planet = id
    this.scene.add(group)

    this.planets[id] = {
      globe,
      group,
      ready: false,
      base: rest.scale,
      hover: 1,
      from: { ...rest, tilt: 0 },
      to: rest,
    }
  }

  private planetReady(id: PlanetId) {
    const p = this.planets[id]
    p.ready = true
    // Sharper surfaces at glancing angles (the limb, close-ups): sample the textures anisotropically.
    const material = p.globe.globeMaterial() as THREE.MeshPhongMaterial
    for (const map of [material.map, material.bumpMap]) {
      if (!map) continue
      map.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
      map.needsUpdate = true
    }
    if (this.ready || !PLANET_IDS.every((other) => this.planets[other].ready)) return
    this.ready = true
    this.story = this.storyTarget
    this.events.onReady()
    // Intro: a slow push-in from deep space to wherever the page wants us.
    this.applyLayout(this.pendingLayout ?? { kind: 'story' }, INTRO_MS, easeOut, 0)
    this.pendingLayout = null
    this.loadSharpTextures()
  }

  /**
   * After the intro has started, swap each planet's surface for its 8192 × 4096 version, one planet at a time so
   * the downloads don't compete with the first frames. Skipped on small screens, on data-saver connections and on
   * GPUs that can't hold an 8K texture; those keep the 2K/4K images.
   */
  private async loadSharpTextures() {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    const small = Math.min(window.screen.width, window.screen.height) < 700
    if (small || connection?.saveData || this.renderer.capabilities.maxTextureSize < 8192) return
    const loader = new THREE.TextureLoader()
    for (const id of PLANET_IDS) {
      try {
        const texture = await loader.loadAsync(PLANETS[id].sharpTexture)
        if (this.disposed) return texture.dispose()
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
        const material = this.planets[id].globe.globeMaterial() as THREE.MeshPhongMaterial
        const old = material.map
        material.map = texture
        material.needsUpdate = true
        old?.dispose()
      } catch {
        // Keep the smaller texture if the large one can't be loaded.
      }
    }
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

  /** Unit vector from the planet's center to a spot on its surface once the planet stands upright (tilt eased out). */
  private directionTo(planet: PlanetId, spot: LatLon) {
    const p = this.planets[planet]
    const local = p.globe.getCoords(spot.lat, spot.lon, 0)
    const rotation = new THREE.Matrix4().makeRotationY(p.group.rotation.y)
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
        // In focus every planet stands upright, so orbiting it feels like a globe on a stand.
        if (this.layout.kind === 'focus') p.group.rotation.x = p.from.tilt * (1 - t)
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
    // Story: planets follow the scroll once no flight is running.
    if (this.layout.kind === 'story' && !this.tween) {
      this.story += (this.storyTarget - this.story) * smooth(5)
      const poses = this.storyPoses(this.story)
      for (const id of PLANET_IDS) {
        this.planets[id].group.position.copy(poses[id].position)
        this.planets[id].base = poses[id].scale
      }
    }
    for (const id of PLANET_IDS) {
      const p = this.planets[id]
      const lift = this.layout.kind === 'story' && this.hoveredPlanet === id && !this.tween ? 1.05 : 1
      p.hover += (lift - p.hover) * smooth(10)
      p.group.scale.setScalar(p.base * p.hover)
    }

    if (this.layout.kind === 'story') {
      this.turnPlanets(dt, smooth)
      if (!this.reduceMotion) {
        // Parallax: the camera drifts a little with the mouse, so near planets slide against far stars.
        this.mouse.lerp(this.mouseTarget, smooth(3))
        if (!this.tween) {
          this.camera.position.set(STORY_CAMERA.x + this.mouse.x * PARALLAX.x, STORY_CAMERA.y + this.mouse.y * PARALLAX.y, STORY_CAMERA.z)
          this.camera.lookAt(0, 0, 0)
        }
      }
    }
    if (!this.reduceMotion) this.stars.rotation.y += 0.004 * dt

    if (this.offset.distanceToSquared(this.offsetTarget) > 0.05) {
      this.offset.lerp(this.offsetTarget, this.reduceMotion ? 1 : smooth(5))
      this.applyViewOffset()
    }

    if (this.controls.enabled) this.controls.update()
    this.drawJourney(time)
    this.drawPair(time)

    // The active marker's glow breathes.
    if (!this.reduceMotion) {
      const pulse = 1 + 0.18 * Math.sin(time / 260)
      for (const g of this.glows) if (g.active) g.sprite.scale.setScalar(g.size * pulse)
    }
    this.renderer.render(this.scene, this.camera)
    this.updateLabels()
    this.frame = requestAnimationFrame(this.animate)
  }

  /**
   * Story only: a planet with a spot to show (the pair on the first stage, or the stage's own `face`) turns that
   * spot toward the viewer; the others spin slowly and stand upright.
   * A globe shows longitude L at its centre when turned by -L around its axis, and latitude φ when tipped by φ.
   */
  private turnPlanets(dt: number, smooth: (rate: number) => number) {
    for (const id of PLANET_IDS) {
      const rotation = this.planets[id].group.rotation
      const face = this.faceFor(id)
      if (face) {
        const k = this.reduceMotion ? 1 : smooth(2.6)
        rotation.y += shortestTurn(rotation.y, -rad(face.lon) + rad(face.yaw)) * k
        rotation.x += (rad(face.lat) + rad(face.tilt) - rotation.x) * k
      } else {
        rotation.x += (0 - rotation.x) * (this.reduceMotion ? 1 : smooth(2))
        if (!this.reduceMotion) rotation.y += PLANETS[id].spin * dt
      }
    }
  }

  private faceFor(id: PlanetId): (LatLon & { yaw: number; tilt: number }) | null {
    if (this.pair && this.story < PAIR_REACH) {
      const end = this.pair.from.planet === id ? this.pair.from : this.pair.to.planet === id ? this.pair.to : null
      if (end) {
        // Lean the spot toward the other body: right of centre if the partner is to the right, lower if it is below.
        const partner = end === this.pair.from ? this.pair.to.planet : this.pair.from.planet
        const toward = this.planets[partner].group.position.clone().sub(this.planets[id].group.position).setZ(0).normalize()
        return { lat: end.lat, lon: end.lon, yaw: PAIR_BIAS * toward.x, tilt: -PAIR_BIAS * toward.y }
      }
    }
    const stage = Math.round(this.story)
    const face = STAGES[stage]?.face?.[id]
    return face && Math.abs(this.story - stage) < 0.6 ? { ...face, yaw: 0, tilt: 0 } : null
  }

  /** World position of a lat/lon spot on a planet, as the planet is placed right now. */
  private worldSpot(planet: PlanetId, spot: LatLon, altitude = 0.01) {
    const p = this.planets[planet]
    p.group.updateMatrixWorld()
    const local = p.globe.getCoords(spot.lat, spot.lon, altitude)
    return new THREE.Vector3(local.x, local.y, local.z).applyMatrix4(p.group.matrixWorld)
  }

  /** A curve that leaves the first planet straight up from its spot and comes down onto the second planet's spot. */
  private arcBetween(from: { planet: PlanetId } & LatLon, to: { planet: PlanetId } & LatLon) {
    const a = this.worldSpot(from.planet, from)
    const b = this.worldSpot(to.planet, to)
    const na = a.clone().sub(this.planets[from.planet].group.position).normalize()
    const nb = b.clone().sub(this.planets[to.planet].group.position).normalize()
    const lift = a.distanceTo(b) * 0.35
    return new THREE.CubicBezierCurve3(a, a.clone().addScaledVector(na, lift), b.clone().addScaledVector(nb, lift), b)
  }

  /** The journey arc: drawn as it grows (head = a glowing dot), then fading out once the flight has landed. */
  private drawJourney(time: number) {
    const j = this.journey
    if (!j) return this.journeyTrail.hide()
    const elapsed = time - j.start
    const fade = 1 - clamp01((elapsed - j.duration) / JOURNEY_FADE_MS)
    if (fade <= 0) {
      this.journey = null
      return this.journeyTrail.hide()
    }
    const grow = easeInOut(clamp01(elapsed / j.duration))
    this.journeyTrail.draw(this.arcBetween(j.from, j.to), PLANETS[j.from.planet].accent, PLANETS[j.to.planet].accent, grow, fade, 18 * (1 - 0.4 * grow))
  }

  /**
   * The landing-page pair: once both bodies have turned their spots forward, the arc grows from our site to its
   * match on Earth and stays. Name tags sit above the start and below the end. Fades out as the page scrolls on.
   */
  private drawPair(time: number) {
    if (this.pairQueued !== undefined && (!this.pair || time >= this.pairSwapAt)) {
      this.pair = this.pairQueued
      this.pairQueued = undefined
      this.pairStart = time
    }
    // Wait for flights (the intro, coming back from another page) to finish before the arc starts.
    if (this.tween) this.pairStart = time
    const pair = this.pair
    const swapFade = this.pairQueued !== undefined ? clamp01((this.pairSwapAt - time) / PAIR_SWAP_MS) : 1
    const scrollFade = 1 - clamp01((this.story - 0.2) / (PAIR_REACH - 0.2))
    const opacity = this.layout.kind === 'story' && this.ready && !this.tween ? swapFade * scrollFade : 0
    if (!pair || opacity <= 0) {
      this.pairTrail.hide()
      for (const end of this.pairEnds) end.visible = false
      for (const tag of this.pairTags) tag.style.opacity = '0'
      return
    }
    const elapsed = time - this.pairStart
    const grow = this.reduceMotion ? 1 : easeInOut(clamp01((elapsed - PAIR_TURN_MS) / PAIR_GROW_MS))
    const curve = this.arcBetween(pair.from, pair.to)
    const colors = [PLANETS[pair.from.planet].accent, PLANETS[pair.to.planet].accent]
    this.pairTrail.draw(curve, colors[0], colors[1], grow, opacity, grow < 1 ? 16 : 0)

    const pulse = this.reduceMotion ? 1 : 1 + 0.14 * Math.sin(time / 300)
    const shown = [clamp01(elapsed / 500), clamp01((elapsed - PAIR_TURN_MS - PAIR_GROW_MS * 0.85) / 400)]
    const { clientWidth: w, clientHeight: h } = this.container
    ;[pair.from, pair.to].forEach((end, i) => {
      const point = i === 0 ? curve.v0 : curve.v3
      const sprite = this.pairEnds[i]
      sprite.position.copy(point)
      sprite.scale.setScalar((9 + 5 * this.planets[end.planet].base) * pulse)
      const material = sprite.material as THREE.SpriteMaterial
      material.color.set(colors[i]).lerp(new THREE.Color('#ffffff'), 0.5)
      material.opacity = opacity * shown[i]
      sprite.visible = true

      // Name tag: above the start, below the end, kept inside the screen.
      const tag = this.pairTags[i]
      const name = tag.lastElementChild as HTMLElement
      if (name.textContent !== end.label) {
        name.textContent = end.label
        ;(tag.firstElementChild as HTMLElement).style.background = colors[i]
      }
      const ndc = point.clone().project(this.camera)
      const width = tag.offsetWidth
      const x = Math.max(8, Math.min(((ndc.x + 1) / 2) * w - width / 2, w - width - 8))
      const y = ((1 - ndc.y) / 2) * h + (i === 0 ? -30 : 30)
      tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%)`
      tag.style.opacity = String(opacity * shown[i])
    })
  }

  private makeEndSprite() {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.glowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }),
    )
    sprite.visible = false
    this.scene.add(sprite)
    return sprite
  }

  private makePairTag() {
    const tag = document.createElement('div')
    tag.className =
      'pointer-events-none absolute top-0 left-0 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-[#04060b]/80 px-2.5 py-1 font-mono text-[11px] text-[#eef0f3] backdrop-blur-md will-change-transform'
    tag.style.opacity = '0'
    const dot = document.createElement('span')
    dot.className = 'size-1.5 shrink-0 rounded-full'
    tag.append(dot, document.createElement('span'))
    this.container.append(tag)
    return tag
  }

  private resize = () => {
    const { clientWidth: w, clientHeight: h } = this.container
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / Math.max(h, 1)
    this.applyViewOffset()
  }

  /** In focus mode the picture shifts so the planet sits in the middle of the free area; the shift itself is eased in animate(). */
  private updateViewOffset() {
    const focus = this.layout.kind === 'focus'
    this.offsetTarget.set(focus ? (this.insets.right - this.insets.left) / 2 : 0, focus ? (this.insets.bottom - this.insets.top) / 2 : 0)
  }

  private applyViewOffset() {
    const { clientWidth: w, clientHeight: h } = this.container
    if (Math.abs(this.offset.x) < 0.5 && Math.abs(this.offset.y) < 0.5) this.camera.clearViewOffset()
    else this.camera.setViewOffset(w, h, this.offset.x, this.offset.y, w, h)
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
    else if (this.layout.kind === 'story') this.events.onPlanetClick(result.planet)
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (this.pointerDown) return
    const result = this.hit(event)
    const rect = this.renderer.domElement.getBoundingClientRect()
    const position = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const storyPlanet = result && this.layout.kind === 'story' ? result.planet : null
    this.hoveredPlanet = storyPlanet
    if (result?.point && this.layout.kind === 'focus') {
      // Markers carry their own name tags in focus, so no tooltip here.
      this.renderer.domElement.style.cursor = 'pointer'
      this.events.onHover(null)
    } else if (result?.point) {
      this.renderer.domElement.style.cursor = 'pointer'
      this.events.onHover({ label: result.point.label, ...position })
    } else if (storyPlanet) {
      this.renderer.domElement.style.cursor = 'pointer'
      this.events.onHover({ label: `Open ${PLANETS[storyPlanet].label}`, ...position })
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

/**
 * A glowing arc between two points: a 1 px line, soft dots on the same geometry so it reads as a trail of light,
 * and a bright head at the growing end. Coloured from the first body's accent to the second's.
 */
class Trail {
  private line: THREE.Line
  private glow: THREE.Points
  private head: THREE.Sprite

  constructor(scene: THREE.Scene, texture: THREE.Texture) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_POINTS * 3), 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ARC_POINTS * 3), 3))
    this.line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    this.glow = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        map: texture,
        size: 7,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    this.head = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
    this.line.frustumCulled = false
    this.glow.frustumCulled = false
    this.hide()
    scene.add(this.line, this.glow, this.head)
  }

  hide() {
    this.line.visible = false
    this.glow.visible = false
    this.head.visible = false
  }

  /** `grow` 0..1 = how much of the curve is drawn; `headSize` 0 hides the head (the arc has arrived). */
  draw(curve: THREE.Curve<THREE.Vector3>, fromColor: string, toColor: string, grow: number, opacity: number, headSize: number) {
    const colorA = new THREE.Color(fromColor)
    const colorB = new THREE.Color(toColor)
    const positions = this.line.geometry.getAttribute('position') as THREE.BufferAttribute
    const colors = this.line.geometry.getAttribute('color') as THREE.BufferAttribute
    const point = new THREE.Vector3()
    const color = new THREE.Color()
    for (let i = 0; i < ARC_POINTS; i++) {
      const along = i / (ARC_POINTS - 1)
      curve.getPoint(along * grow, point)
      positions.setXYZ(i, point.x, point.y, point.z)
      // Brighter toward the head, so the arc reads as something travelling.
      color.copy(colorA).lerp(colorB, along * grow).multiplyScalar(0.35 + 0.65 * along)
      colors.setXYZ(i, color.r, color.g, color.b)
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
    ;(this.line.material as THREE.LineBasicMaterial).opacity = opacity
    ;(this.glow.material as THREE.PointsMaterial).opacity = opacity * 0.55
    this.line.visible = grow > 0
    this.glow.visible = grow > 0

    curve.getPoint(grow, point)
    this.head.position.copy(point)
    this.head.scale.setScalar(Math.max(headSize, 0.001))
    const head = this.head.material as THREE.SpriteMaterial
    head.color.copy(colorA).lerp(colorB, grow).lerp(new THREE.Color('#ffffff'), 0.45)
    head.opacity = opacity
    this.head.visible = headSize > 0 && grow > 0
  }
}

function tagged(obj: THREE.Object3D, type: string) {
  return (obj as THREE.Object3D & { __globeObjType?: string }).__globeObjType === type
}

/** Signed angle (radians) to turn from `from` to `to` the short way round. */
function shortestTurn(from: number, to: number) {
  const turn = (to - from) % (Math.PI * 2)
  return turn > Math.PI ? turn - Math.PI * 2 : turn < -Math.PI ? turn + Math.PI * 2 : turn
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
