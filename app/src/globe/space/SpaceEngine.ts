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
 *  - focus:   one planet flies to the center at full size, the others drift far away;
 *             the user can orbit it, and the camera can fly to a lat/lon on it.
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
  /** Highlighted (our candidates / the selected item) vs muted (validation sites). */
  emphasis: 'strong' | 'muted'
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
/** Width reserved for the side panel on wide screens; the focused planet is centered in the rest. */
const PANEL_WIDTH = 400
/** How far the landing camera drifts with the mouse (world units). */
const PARALLAX = { x: 70, y: 45 }

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
  private pendingLayout: Layout | null = null
  private ready = false
  private tween: Tween | null = null
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  /** Mouse position for parallax, -1..1, smoothed toward `mouseTarget`. */
  private mouse = new THREE.Vector2()
  private mouseTarget = new THREE.Vector2()
  private hoveredPlanet: PlanetId | null = null
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
    const sun = new THREE.DirectionalLight(0xfff4e6, 2.6)
    sun.position.set(-900, 500, 800)
    this.scene.add(sun)
    const rim = new THREE.DirectionalLight(0x6fb8ff, 1.4)
    rim.position.set(700, 200, -900)
    this.scene.add(rim)

    this.createStars()
    for (const id of PLANET_IDS) this.createPlanet(id)

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
  }

  /** Moves planets and camera to a new layout with one smooth flight. Waits for the textures first. */
  setLayout(layout: Layout) {
    if (!this.ready) {
      this.pendingLayout = layout
      return
    }
    this.applyLayout(layout, FLY_MS, easeInOut, 9)
  }

  /** Markers drawn on one planet; other planets are cleared. */
  setMarkers(planet: PlanetId | null, markers: Marker[]) {
    for (const id of PLANET_IDS) {
      const data: PointDatum[] = id === planet ? markers.map((m) => ({ ...m, planet: id })) : []
      const accent = PLANETS[id].accent
      this.planets[id].globe
        .pointsData(data)
        .pointColor((d) => {
          const m = d as PointDatum
          return m.active ? '#ffffff' : m.emphasis === 'strong' ? accent : '#8a94a6'
        })
        .pointAltitude((d) => ((d as PointDatum).active ? 0.08 : (d as PointDatum).emphasis === 'strong' ? 0.04 : 0.015))
        .pointRadius((d) => ((d as PointDatum).emphasis === 'strong' ? 1.1 : 0.7))
        .ringsData(data.filter((m) => m.active || m.emphasis === 'strong'))
        .ringColor((d: object) => {
          const m = d as PointDatum
          const rgb = m.active ? '255,255,255' : hexToRgb(accent)
          return (t: number) => `rgba(${rgb},${1 - t})`
        })
        .ringMaxRadius((d) => ((d as PointDatum).active ? 6 : 3))
        .ringPropagationSpeed(2)
        .ringRepeatPeriod((d) => ((d as PointDatum).active ? 900 : 1600))
    }
  }

  private applyLayout(layout: Layout, duration: number, ease: (t: number) => number, fovKick: number) {
    const previous = this.layout
    this.layout = layout

    for (const id of PLANET_IDS) {
      const p = this.planets[id]
      const config = PLANETS[id]
      p.from = { position: p.group.position.clone(), scale: p.base }
      if (layout.kind === 'landing') {
        p.to = { position: new THREE.Vector3(...config.landing.position), scale: config.landing.scale }
      } else if (id === layout.planet) {
        p.to = { position: new THREE.Vector3(0, 0, 0), scale: 1 }
      } else {
        p.to = { position: new THREE.Vector3(...config.away.position), scale: config.away.scale }
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
      const distance = layout.target !== null ? FOCUS_DISTANCE * 0.82 : FOCUS_DISTANCE
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
      .pointResolution(16)
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
    for (const id of PLANET_IDS) {
      const p = this.planets[id]
      const lift = this.layout.kind === 'landing' && this.hoveredPlanet === id && !this.tween ? 1.08 : 1
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
    this.renderer.render(this.scene, this.camera)
    this.frame = requestAnimationFrame(this.animate)
  }

  private resize = () => {
    const { clientWidth: w, clientHeight: h } = this.container
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.updateViewOffset()
  }

  /** On wide screens in focus mode, center the planet in the area left of the side panel. */
  private updateViewOffset() {
    const { clientWidth: w, clientHeight: h } = this.container
    if (this.layout.kind === 'focus' && w >= 768) this.camera.setViewOffset(w, h, PANEL_WIDTH / 2, 0, w, h)
    else this.camera.clearViewOffset()
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
        if (t.__globeObjType === 'point' && t.__data) point = t.__data as PointDatum
        if (obj.userData.planet) planet = obj.userData.planet as PlanetId
        obj = obj.parent
      }
      if (planet) return { planet, point }
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
      this.renderer.domElement.style.cursor = 'pointer'
      this.events.onHover({ label: result.point.label, ...position })
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
