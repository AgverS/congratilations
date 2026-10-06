import * as THREE from 'three'
import gsap from 'gsap'
import { PALETTE, createFlower, createGrass, type Flower } from './flowers'
import { Burst, SoftPoints, pxUniform } from './softPoints'
import { reducedMotion, type Quality } from './quality'

export type Stage = 'intro' | 'seed' | 'garden' | 'photos' | 'letter' | 'heart' | 'finale'
export interface PhotoInfo {
  src: string
  width: number
  height: number
}
export interface WorldEvents {
  onSeedTap(): void
  onPhotoTap(index: number): void
  onPhotoIndex(index: number): void
  onHeartTap(): void
}

const FOV = 50
const WORD_COLORS = [0xe8508a, 0xf08a5d, 0xb36bd6, 0xe9a21c, 0xf26d8f]
const SPARK_COLORS = [0xffd36b, 0xff8fb1, 0xffffff, 0xc7a2ff, 0xffb38a]
const dur = (s: number) => (reducedMotion ? s * 0.4 : s)

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,240,190,1)')
  grad.addColorStop(0.35, 'rgba(255,214,120,0.55)')
  grad.addColorStop(1, 'rgba(255,214,120,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

/** Точки, из которых складывается слово. Координаты в единицах сцены, ширина = 6. */
function sampleWord(text: string, count: number): Float32Array {
  const font = '700 200px "Marck Script", cursive'
  const probe = document.createElement('canvas').getContext('2d')!
  probe.font = font
  const textW = Math.ceil(probe.measureText(text).width) + 40
  const H = 320
  const c = document.createElement('canvas')
  c.width = textW
  c.height = H
  const g = c.getContext('2d')!
  g.font = font
  g.textBaseline = 'middle'
  g.fillText(text, 20, H / 2)
  const data = g.getImageData(0, 0, textW, H).data
  const pts: number[] = []
  const unit = 6 / textW
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < textW; x += 3) {
      if (data[(y * textW + x) * 4 + 3] > 140) pts.push((x - textW / 2) * unit, (H / 2 - y) * unit)
    }
  }
  const n = pts.length / 2
  const out = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) {
    const j = Math.floor(Math.random() * n)
    out[i * 2] = pts[j * 2] + (Math.random() - 0.5) * 0.04
    out[i * 2 + 1] = pts[j * 2 + 1] + (Math.random() - 0.5) * 0.04
  }
  return out
}

function heartShape(): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(0, -1)
  s.bezierCurveTo(-0.3, -0.7, -1.2, -0.2, -1.2, 0.45)
  s.bezierCurveTo(-1.2, 1.05, -0.5, 1.3, 0, 0.7)
  s.bezierCurveTo(0.5, 1.3, 1.2, 1.05, 1.2, 0.45)
  s.bezierCurveTo(1.2, -0.2, 0.3, -0.7, 0, -1)
  return s
}

export class World {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100)
  stage: Stage = 'intro'
  photoIndex = 0

  private q: Quality
  private ev: WorldEvents
  private photos: PhotoInfo[]
  private clock = new THREE.Clock()
  private time = 0
  private camPos = new THREE.Vector3(0, 0.2, 9)
  private camLook = new THREE.Vector3()
  private par = { x: 0, y: 0, tx: 0, ty: 0 }
  private width = 1
  private height = 1
  private visW = 8
  private glow = glowTexture()
  private raycaster = new THREE.Raycaster()

  // объекты
  private seed = new THREE.Group()
  private seedGlow!: THREE.Sprite
  private garden = new THREE.Group()
  private flowers: Flower[] = []
  private grass!: THREE.InstancedMesh
  private wordGroup = new THREE.Group()
  private word!: SoftPoints
  private wordTarget!: Float32Array
  private wordStart!: Float32Array
  private wordDelay!: Float32Array
  private wordP = { v: 0 }
  private fireflies!: SoftPoints
  private firefliesSeed: number[] = []
  private petals!: THREE.InstancedMesh
  private petalData: { x: number; y: number; z: number; s: number; ph: number; r: number }[] = []
  private petalMix = { v: 0 }
  private petalSpeed = 1
  private butterflies: {
    g: THREE.Group
    wl: THREE.Mesh
    wr: THREE.Mesh
    c: THREE.Vector3
    p: number
  }[] = []
  private ring = new THREE.Group()
  private cards: THREE.Group[] = []
  private ringState = { pos: 0 }
  private cardBox = { w: 2.4, h: 3 }
  private ringR = 3
  private heart = new THREE.Group()
  private bouquet = new THREE.Group()
  private bouquetFlowers: Flower[] = []
  private burst: Burst
  private dragging: {
    x: number
    y: number
    px: number
    moved: number
    t: number
    v: number
  } | null = null
  private frames = 0
  private slow = 0
  private tmp = new THREE.Matrix4()

  constructor(canvas: HTMLCanvasElement, q: Quality, photos: PhotoInfo[], ev: WorldEvents) {
    this.q = q
    this.ev = ev
    this.photos = photos
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: q.antialias, alpha: true })
    this.renderer.setPixelRatio(q.dpr)
    this.renderer.setClearColor(0x000000, 0)

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xffd9c0, 1.9))
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.2)
    sun.position.set(3, 5, 7)
    this.scene.add(sun)

    this.burst = new Burst(320)
    this.burst.sp.points.renderOrder = 10

    this.buildSeed()
    this.buildGarden()
    this.buildFireflies()
    this.buildPetals()
    this.buildButterflies()
    this.buildHeart()
    this.scene.add(this.ring, this.heart, this.bouquet, this.burst.sp.points)
    this.ring.scale.setScalar(0.001)
    this.heart.visible = false
    this.bouquet.visible = false
    this.garden.visible = false
    this.wordGroup.visible = false
    this.petals.visible = false
    this.butterflies.forEach((b) => (b.g.visible = false))

    this.bindInput(canvas)
    window.addEventListener('resize', () => this.resize())
    this.resize()
    this.applyCamera(true)
  }

  /** Асинхронная подготовка: слово и текстуры фото. */
  async init(word: string) {
    await Promise.all([
      document.fonts.load('700 200px "Marck Script"', word),
      document.fonts.load('700 20px Nunito'),
    ])
    this.buildWord(word)
    await this.buildPhotos()
  }

  start() {
    this.clock.start()
    this.renderer.setAnimationLoop(() => this.tick())
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.renderer.setAnimationLoop(null)
      else {
        this.clock.getDelta()
        this.renderer.setAnimationLoop(() => this.tick())
      }
    })
  }

  // ---------- построение ----------

  private buildSeed() {
    this.seedGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.glow, transparent: true, depthWrite: false }),
    )
    this.seedGlow.scale.setScalar(3.2)
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 20, 14),
      new THREE.MeshStandardMaterial({
        color: 0xffd36b,
        emissive: 0xffb830,
        emissiveIntensity: 0.9,
        roughness: 0.4,
      }),
    )
    core.scale.set(0.8, 1.15, 0.8)
    this.seed.add(this.seedGlow, core)
    this.seed.position.set(0, 0.3, 0)
    this.scene.add(this.seed)
  }

  private buildGarden() {
    const n = this.q.flowers
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1)
      const x = (t - 0.5) * 9 + (Math.random() - 0.5) * 0.5
      const h = 1.4 + Math.random() * 1.7 + (1 - Math.abs(t - 0.5) * 2) * 0.5
      const f = createFlower(
        PALETTE[i % PALETTE.length],
        new THREE.Vector3((Math.random() - 0.5) * 0.7, h, 0),
        0.9 + Math.random() * 0.5,
      )
      f.position.set(x, 0, -1.6 + Math.random() * 2.4)
      f.scale.setScalar(0.001)
      this.garden.add(f)
      this.flowers.push(f)
    }
    this.grass = createGrass(this.q.grass, 10)
    this.grass.scale.y = 0.001
    this.garden.add(this.grass)
    this.garden.position.y = -3.4
    this.scene.add(this.garden)
  }

  private buildWord(text: string) {
    const n = this.q.wordPoints
    this.word = new SoftPoints(n)
    this.wordTarget = sampleWord(text, n)
    this.wordStart = new Float32Array(n * 3)
    this.wordDelay = new Float32Array(n)
    const c = new THREE.Color()
    for (let i = 0; i < n; i++) {
      this.wordStart.set(
        [(Math.random() - 0.5) * 10, -3 + Math.random() * 1.5 - 2, (Math.random() - 0.5) * 3],
        i * 3,
      )
      this.wordDelay[i] = Math.random() * 0.35
      c.set(WORD_COLORS[i % WORD_COLORS.length])
      this.word.col.set([c.r, c.g, c.b], i * 3)
      this.word.size[i] = 0.09 + Math.random() * 0.06
      this.word.alpha[i] = 0.95
    }
    this.word.flush(true, true)
    this.wordGroup.add(this.word.points)
    this.wordGroup.position.set(0, 2.5, 0)
    this.scene.add(this.wordGroup)
    this.updateWord()
  }

  private updateWord() {
    const P = this.wordP.v
    const { pos } = this.word
    const t = this.time
    for (let i = 0; i < this.word.count; i++) {
      const k = Math.min(1, Math.max(0, (P - this.wordDelay[i]) / 0.65))
      const e = k * k * (3 - 2 * k)
      const tx = this.wordTarget[i * 2]
      const ty = this.wordTarget[i * 2 + 1]
      const wob = reducedMotion ? 0 : 0.035 * Math.sin(t * 1.4 + i)
      pos[i * 3] = this.wordStart[i * 3] + (tx - this.wordStart[i * 3]) * e + wob
      pos[i * 3 + 1] = this.wordStart[i * 3 + 1] + (ty - this.wordStart[i * 3 + 1]) * e + wob
      pos[i * 3 + 2] = this.wordStart[i * 3 + 2] * (1 - e)
    }
    this.word.flush()
  }

  private buildFireflies() {
    const n = this.q.fireflies
    this.fireflies = new SoftPoints(n)
    const c = new THREE.Color(0xffc94d)
    for (let i = 0; i < n; i++) {
      this.fireflies.pos.set(
        [(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 5],
        i * 3,
      )
      this.fireflies.col.set([c.r, c.g, c.b], i * 3)
      this.fireflies.size[i] = 0.12 + Math.random() * 0.14
      this.firefliesSeed.push(Math.random() * 100)
    }
    this.fireflies.flush(true, true)
    this.scene.add(this.fireflies.points)
  }

  private buildPetals() {
    const geo = new THREE.CircleGeometry(0.11, 8)
    geo.scale(1, 0.62, 1)
    this.petals = new THREE.InstancedMesh(
      geo,
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, transparent: true }),
      this.q.petals,
    )
    const col = new THREE.Color()
    for (let i = 0; i < this.q.petals; i++) {
      this.petalData.push({
        x: (Math.random() - 0.5) * 12,
        y: Math.random() * 11 - 5,
        z: (Math.random() - 0.5) * 6,
        s: 0.35 + Math.random() * 0.5,
        ph: Math.random() * 6.28,
        r: 0.5 + Math.random() * 1.2,
      })
      this.petals.setColorAt(i, col.set(PALETTE[i % PALETTE.length]))
    }
    this.petals.frustumCulled = false
    this.scene.add(this.petals)
  }

  private buildButterflies() {
    const wingShape = new THREE.Shape()
    wingShape.absellipse(0.2, 0.1, 0.2, 0.16, 0, Math.PI * 2, false, 0.5)
    const wing = new THREE.ShapeGeometry(wingShape)
    const low = new THREE.Shape()
    low.absellipse(0.15, -0.1, 0.14, 0.11, 0, Math.PI * 2, false, -0.3)
    const wing2 = new THREE.ShapeGeometry(low)
    const colors = [0xff8fb1, 0xffb347, 0xc7a2ff, 0x7fd1e8, 0xffe27a, 0xff7a9c]
    for (let i = 0; i < this.q.butterflies; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        side: THREE.DoubleSide,
      })
      const g = new THREE.Group()
      const mk = (mirror: boolean) => {
        const w = new THREE.Mesh(wing, mat)
        w.add(new THREE.Mesh(wing2, mat))
        if (mirror) w.scale.x = -1
        g.add(w)
        return w
      }
      const wr = mk(false)
      const wl = mk(true)
      g.scale.setScalar(0.9)
      this.scene.add(g)
      this.butterflies.push({
        g,
        wl,
        wr,
        c: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 3 - 1.5, Math.random() * 2),
        p: Math.random() * 10,
      })
    }
  }

  private async buildPhotos() {
    const loader = new THREE.TextureLoader()
    const maxAniso = Math.min(4, this.renderer.capabilities.getMaxAnisotropy())
    const base = import.meta.env.BASE_URL
    const texes = await Promise.all(
      this.photos.map(async (p) => {
        try {
          const t = await loader.loadAsync(base + p.src)
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = maxAniso
          return t
        } catch {
          // фото не загрузилось — оставляем мягкую заглушку, а 3D-сцену не ломаем
          const c = document.createElement('canvas')
          c.width = c.height = 4
          const g = c.getContext('2d')!
          g.fillStyle = '#ffd3e2'
          g.fillRect(0, 0, 4, 4)
          return new THREE.CanvasTexture(c)
        }
      }),
    )
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xfffaf2, roughness: 0.6 })
    let maxW = 0
    let maxH = 0
    let sumW = 0
    this.photos.forEach((p, i) => {
      const asp = p.width / p.height
      const pw = asp >= 1 ? 2.5 : 2.2 * asp
      const ph = pw / asp
      const fw = pw + 0.24
      const fh = ph + 0.24 + 0.5
      maxW = Math.max(maxW, fw)
      maxH = Math.max(maxH, fh)
      sumW += fw
      const card = new THREE.Group()
      const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.05), frameMat)
      frame.userData.index = i
      const pic = new THREE.Mesh(
        new THREE.PlaneGeometry(pw, ph),
        new THREE.MeshBasicMaterial({ map: texes[i] }),
      )
      pic.position.set(0, (fh - ph) / 2 - 0.12, 0.03)
      card.add(frame, pic)
      this.cards.push(card)
      this.ring.add(card)
    })
    this.cardBox = { w: maxW, h: maxH }
    const n = this.cards.length
    this.ringR = Math.max(2.8, ((sumW / n + 0.7) * n) / (Math.PI * 2))
    this.layoutRing()
  }

  private layoutRing() {
    const n = this.cards.length
    const step = (Math.PI * 2) / n
    this.cards.forEach((c, i) => {
      c.position.set(Math.sin(i * step) * this.ringR, 0, Math.cos(i * step) * this.ringR)
      c.rotation.y = i * step * 0.4
    })
    this.applyRing()
  }

  private applyRing() {
    const n = this.cards.length
    if (!n) return
    const step = (Math.PI * 2) / n
    const pos = this.ringState.pos
    this.ring.rotation.y = -pos * step
    this.cards.forEach((c, i) => {
      let rel = (((i - pos) % n) + n) % n
      if (rel > n / 2) rel -= n
      const z = Math.cos(rel * step)
      c.visible = z > -0.3
      c.scale.setScalar(0.78 + 0.22 * Math.max(0, z))
    })
    const idx = ((Math.round(pos) % n) + n) % n
    if (idx !== this.photoIndex) {
      this.photoIndex = idx
      this.ev.onPhotoIndex(idx)
    }
  }

  private buildHeart() {
    const geo = new THREE.ExtrudeGeometry(heartShape(), {
      depth: 0.45,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.18,
      bevelSegments: 5,
      curveSegments: 24,
    })
    geo.center()
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: 0xff5d8f,
        emissive: 0xff2f6d,
        emissiveIntensity: 0.35,
        roughness: 0.3,
      }),
    )
    mesh.userData.isHeart = true
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glow,
        transparent: true,
        depthWrite: false,
        opacity: 0.8,
      }),
    )
    halo.scale.setScalar(6)
    halo.position.z = -0.6
    this.heart.add(halo, mesh)
  }

  private buildBouquet() {
    if (this.bouquetFlowers.length) return
    const n = this.q.flowers > 14 ? 15 : 11
    const base = new THREE.Vector3(0, -1.2, 0)
    for (let i = 0; i < n; i++) {
      const r = 1.65 * Math.sqrt((i + 0.5) / n)
      const a = i * 2.39996
      const x = r * Math.cos(a)
      const z = r * Math.sin(a) * 0.7
      const y = 0.25 + (1 - (r / 1.65) ** 2) * 0.75
      const end = new THREE.Vector3(x, y, z).sub(base)
      const f = createFlower(PALETTE[i % PALETTE.length], end, 1.5)
      f.position.copy(base)
      const dir = new THREE.Vector3(x * 0.6, 1.1, z * 0.6 + 1.1).normalize()
      f.userData.head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
      f.scale.setScalar(0.001)
      this.bouquet.add(f)
      this.bouquetFlowers.push(f)
    }
    const paper = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 0.28, 2.4, 28, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xf6e3c4, roughness: 0.9, side: THREE.DoubleSide }),
    )
    paper.position.y = -1.9
    const paper2 = paper.clone()
    paper2.scale.set(0.9, 0.96, 0.9)
    paper2.material = new THREE.MeshStandardMaterial({
      color: 0xffc1d4,
      roughness: 0.9,
      side: THREE.DoubleSide,
    })
    paper2.position.y = -1.95
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xe8508a, roughness: 0.5 })
    const ribbon = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.08, 10, 40), ribbonMat)
    ribbon.rotation.x = Math.PI / 2
    ribbon.position.y = -1.35
    const loopGeo = new THREE.SphereGeometry(1, 14, 10)
    loopGeo.scale(0.32, 0.18, 0.06)
    const bow = new THREE.Group()
    for (const s of [-1, 1]) {
      const loop = new THREE.Mesh(loopGeo, ribbonMat)
      loop.position.x = 0.32 * s
      loop.rotation.z = 0.35 * s
      bow.add(loop)
    }
    bow.position.set(0, -1.35, 1.04)
    this.bouquet.add(paper2, paper, ribbon, bow)
    this.bouquet.userData.parts = [paper, paper2, ribbon, bow]
    this.bouquet.position.y = 0.95
  }

  // ---------- ввод ----------

  private bindInput(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = {
        x: e.clientX,
        y: e.clientY,
        px: e.clientX,
        moved: 0,
        t: performance.now(),
        v: 0,
      }
      canvas.setPointerCapture(e.pointerId)
    })
    canvas.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / this.width) * 2 - 1
      const ny = (e.clientY / this.height) * 2 - 1
      this.par.tx = nx
      this.par.ty = ny
      const d = this.dragging
      if (!d) return
      const dx = e.clientX - d.px
      d.px = e.clientX
      d.moved += Math.abs(dx) + Math.abs(e.movementY || 0) * 0.3
      d.v = dx
      if (this.stage === 'photos' && d.moved > 6) {
        gsap.killTweensOf(this.ringState)
        this.ringState.pos -= (dx / this.width) * 2.2
        this.applyRing()
      }
    })
    const end = (e: PointerEvent) => {
      const d = this.dragging
      this.dragging = null
      if (!d) return
      if (d.moved < 8) this.handleTap(e.clientX, e.clientY)
      else if (this.stage === 'photos') {
        this.snapRing(Math.round(this.ringState.pos - d.v * 0.06))
      }
    }
    canvas.addEventListener('pointerup', end)
    canvas.addEventListener('pointercancel', () => (this.dragging = null))
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || e.beta == null) return
      this.par.tx = Math.max(-1, Math.min(1, e.gamma / 25))
      this.par.ty = Math.max(-1, Math.min(1, (e.beta - 50) / 25))
    })
  }

  private handleTap(cx: number, cy: number) {
    const ndc = new THREE.Vector2((cx / this.width) * 2 - 1, -(cy / this.height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.camera)
    if (this.stage === 'seed') {
      this.ev.onSeedTap()
    } else if (this.stage === 'photos') {
      const frames = this.cards.filter((c) => c.visible).map((c) => c.children[0] as THREE.Mesh)
      const hit = this.raycaster.intersectObjects(frames, false)[0]
      if (hit) this.ev.onPhotoTap(hit.object.userData.index as number)
    } else if (this.stage === 'heart') {
      const hit = this.raycaster
        .intersectObject(this.heart, true)
        .find((h) => h.object.userData.isHeart)
      if (hit) this.ev.onHeartTap()
    } else if (this.stage === 'finale') {
      const p = new THREE.Vector3()
      this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -1), p)
      if (p) this.burst.emit(p, 40, SPARK_COLORS, 2)
    }
  }

  snapRing(target: number) {
    gsap.killTweensOf(this.ringState)
    gsap.to(this.ringState, {
      pos: target,
      duration: dur(0.7),
      ease: 'power3.out',
      onUpdate: () => this.applyRing(),
    })
  }
  stepPhoto(dir: number) {
    this.snapRing(Math.round(this.ringState.pos) + dir)
  }
  focusPhoto(index: number) {
    const n = this.cards.length
    const cur = Math.round(this.ringState.pos)
    let delta = (((index - cur) % n) + n) % n
    if (delta > n / 2) delta -= n
    this.snapRing(cur + delta)
  }

  // ---------- размеры и камера ----------

  private resize() {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.renderer.setSize(this.width, this.height, false)
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
    const tanH = Math.tan((FOV * Math.PI) / 360)
    pxUniform.value = (this.height * this.renderer.getPixelRatio()) / (2 * tanH)
    this.visW = 2 * 10 * tanH * this.camera.aspect
    const fit = Math.min(1, this.visW / 9.5)
    this.garden.scale.setScalar(Math.max(fit, 0.45))
    if (this.stage === 'intro' || this.stage === 'seed' || this.stage === 'garden') {
      this.wordGroup.scale.setScalar(Math.min(1.1, (this.visW * 0.9) / 6))
    }
    this.bouquet.scale.setScalar(Math.min(1, Math.max(0.55, (this.visW * 0.85) / 4.2)))
    if (this.stage !== 'intro') this.goCamera(0)
  }

  private preset(stage: Stage): { pos: THREE.Vector3; look: THREE.Vector3 } {
    const tanH = Math.tan((FOV * Math.PI) / 360)
    switch (stage) {
      case 'garden':
      case 'letter':
        return { pos: new THREE.Vector3(0, 0.8, 10), look: new THREE.Vector3(0, 0.4, 0) }
      case 'photos': {
        const asp = this.camera.aspect
        const d = Math.max(this.cardBox.w / (0.74 * asp), this.cardBox.h / 0.62) / (2 * tanH)
        return {
          pos: new THREE.Vector3(0, 0.1, this.ringR + Math.max(d, 4.5)),
          look: new THREE.Vector3(0, 0, 0),
        }
      }
      case 'heart':
        return { pos: new THREE.Vector3(0, 0.3, 8.5), look: new THREE.Vector3(0, 0, 0) }
      case 'finale': {
        const z = Math.max(8.5, 4.0 / (2 * tanH * Math.min(1, this.camera.aspect)) + 1)
        return { pos: new THREE.Vector3(0, 0.5, z), look: new THREE.Vector3(0, 0, 0) }
      }
      default:
        return { pos: new THREE.Vector3(0, 0.2, 9), look: new THREE.Vector3(0, 0, 0) }
    }
  }

  private goCamera(d: number) {
    const p = this.preset(this.stage)
    gsap.to(this.camPos, { x: p.pos.x, y: p.pos.y, z: p.pos.z, duration: d, ease: 'power2.inOut' })
    gsap.to(this.camLook, {
      x: p.look.x,
      y: p.look.y,
      z: p.look.z,
      duration: d,
      ease: 'power2.inOut',
    })
  }

  private applyCamera(snap = false) {
    const k = reducedMotion ? 0 : 1
    this.par.x += (this.par.tx - this.par.x) * (snap ? 1 : 0.04)
    this.par.y += (this.par.ty - this.par.y) * (snap ? 1 : 0.04)
    this.camera.position.set(
      this.camPos.x + this.par.x * 0.6 * k,
      this.camPos.y - this.par.y * 0.35 * k,
      this.camPos.z,
    )
    this.camera.lookAt(this.camLook)
  }

  // ---------- сценарий ----------

  async setStage(stage: Stage): Promise<void> {
    this.stage = stage
    this.goCamera(dur(1.6))
    const hideRing = () =>
      gsap.to(this.ring.scale, { x: 0.001, y: 0.001, z: 0.001, duration: dur(0.6) })
    if (stage === 'photos') {
      this.ringState.pos = 0
      this.applyRing()
      gsap.to(this.wordGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: dur(0.6) })
      gsap.to(this.ring.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: dur(1.4),
        ease: 'back.out(1.4)',
        delay: 0.5,
      })
    } else {
      hideRing()
    }
    if (stage === 'heart') {
      this.heart.visible = true
      this.heart.scale.setScalar(0.001)
      gsap.to(this.heart.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: dur(1.2),
        ease: 'back.out(1.8)',
        delay: 0.6,
      })
    } else if (this.heart.visible) {
      gsap.to(this.heart.scale, {
        x: 0.001,
        y: 0.001,
        z: 0.001,
        duration: dur(0.6),
        onComplete: () => void (this.heart.visible = false),
      })
    }
    if (stage === 'finale') await this.playFinale()
    else await new Promise((r) => setTimeout(r, dur(900)))
  }

  /** Семечко падает в землю, сад вырастает, лепестки складываются в слово. */
  async plant(): Promise<void> {
    this.stage = 'garden'
    this.garden.visible = true
    this.petals.visible = true
    this.wordGroup.visible = true
    this.goCamera(dur(2))
    const tl = gsap.timeline()
    tl.to(this.seed.position, { y: -3.2 * 0.9, duration: dur(1.1), ease: 'power2.in' })
    tl.call(() => this.burst.emit(new THREE.Vector3(0, -2.9, 0.5), 50, SPARK_COLORS, 1.6))
    tl.to(this.seed.scale, { x: 0.001, y: 0.001, z: 0.001, duration: dur(0.3) })
    tl.to(this.petalMix, { v: 1, duration: dur(2) }, '<')
    tl.to(this.grass.scale, { y: 1, duration: dur(1.4), ease: 'power2.out' }, '-=0.1')
    const order = this.flowers
      .map((f, i) => ({ f, i }))
      .sort((a, b) => Math.abs(a.f.position.x) - Math.abs(b.f.position.x))
    order.forEach(({ f }, k) => {
      tl.to(
        f.scale,
        { x: 1, y: 1, z: 1, duration: dur(1.3), ease: 'power2.out' },
        0.9 + k * dur(0.16),
      )
      tl.fromTo(
        f.userData.head.scale,
        { x: 0.01, y: 0.01, z: 0.01 },
        {
          x: f.userData.size,
          y: f.userData.size,
          z: f.userData.size,
          duration: dur(0.9),
          ease: 'back.out(2)',
        },
        1.5 + k * dur(0.16),
      )
    })
    const endT = 1.5 + order.length * dur(0.16) + 0.4
    tl.to(this.wordP, { v: 1.35, duration: dur(3.6), ease: 'power1.inOut' }, endT - 1.5)
    tl.call(() => this.butterflies.forEach((b) => (b.g.visible = true)), [], endT)
    await tl.then()
    await new Promise((r) => setTimeout(r, dur(600)))
  }

  private async playFinale() {
    this.buildBouquet()
    this.bouquet.visible = true
    gsap.to(this.wordGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: dur(0.5) })
    gsap.to(this.garden.scale, {
      x: this.garden.scale.x * 0.8,
      y: this.garden.scale.y * 0.8,
      z: this.garden.scale.z * 0.8,
      duration: dur(1),
    })
    this.petalSpeed = 2.2
    const parts = this.bouquet.userData.parts as THREE.Object3D[]
    parts.forEach((p) => {
      p.scale.multiplyScalar(0.001)
    })
    const tl = gsap.timeline({ delay: 0.8 })
    const paper = parts[0]
    tl.to(parts[1].scale, { x: 0.9, y: 0.96, z: 0.9, duration: dur(0.9), ease: 'back.out(1.5)' }, 0)
    tl.to(paper.scale, { x: 1, y: 1, z: 1, duration: dur(0.9), ease: 'back.out(1.5)' }, 0.05)
    tl.to(parts[2].scale, { x: 1, y: 1, z: 1, duration: dur(0.6) }, 0.5)
    tl.to(parts[3].scale, { x: 1, y: 1, z: 1, duration: dur(0.6), ease: 'back.out(2)' }, 0.8)
    this.bouquetFlowers.forEach((f, k) => {
      const t = 0.7 + k * dur(0.28)
      tl.to(f.scale, { x: 1, y: 1, z: 1, duration: dur(1), ease: 'power2.out' }, t)
      tl.fromTo(
        f.userData.head.scale,
        { x: 0.01, y: 0.01, z: 0.01 },
        {
          x: f.userData.size,
          y: f.userData.size,
          z: f.userData.size,
          duration: dur(0.8),
          ease: 'back.out(2.2)',
        },
        t + 0.5,
      )
      tl.call(
        () => {
          this.burst.emit(
            f.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.2, 0.5)),
            14,
            SPARK_COLORS,
            1.3,
          )
        },
        [],
        t + 1,
      )
    })
    await tl.then()
    this.burst.emit(new THREE.Vector3(0, 0.8, 1), 120, SPARK_COLORS, 3.2)
  }

  /** Лёгкое «сердцебиение» и всплеск сердечек. */
  heartBurst() {
    const p = new THREE.Vector3(0, 0, 0.8)
    this.burst.emit(p, 90, [0xff5d8f, 0xff8fb1, 0xffc2d4, 0xffd36b], 3)
  }

  // ---------- кадр ----------

  private tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.time += dt
    const t = this.time

    // адаптивное качество: если кадры долгие — снижаем нагрузку
    this.frames++
    if (this.frames > 40 && this.frames <= 160) {
      if (dt > 0.034) this.slow++
      if (this.frames === 160 && this.slow > 55 && this.renderer.getPixelRatio() > 1) {
        this.renderer.setPixelRatio(1)
        this.petals.count = Math.ceil(this.petals.count / 2)
        this.resize()
      }
    }

    // семечко
    if (this.seed.visible) {
      this.seed.position.x = Math.sin(t * 0.7) * 0.05
      if (this.stage === 'intro' || this.stage === 'seed') {
        this.seed.position.y = 0.3 + Math.sin(t * 1.3) * 0.12
        this.seedGlow.scale.setScalar(3.2 + Math.sin(t * 2.2) * 0.35)
      }
    }
    // светлячки
    const f = this.fireflies
    for (let i = 0; i < f.count; i++) {
      const s = this.firefliesSeed[i]
      f.pos[i * 3] += Math.sin(t * 0.3 + s) * 0.18 * dt
      f.pos[i * 3 + 1] += Math.cos(t * 0.4 + s * 1.7) * 0.16 * dt
      f.alpha[i] = 0.45 + 0.5 * Math.sin(t * 1.5 + s)
    }
    f.flush(true, true)

    // слово
    if (this.wordGroup.visible && this.wordGroup.scale.x > 0.01) this.updateWord()

    // лепестки
    if (this.petals.visible) {
      const mix = this.petalMix.v
      const e = new THREE.Euler()
      const q = new THREE.Quaternion()
      const sc = new THREE.Vector3()
      const p = new THREE.Vector3()
      const n = this.petals.count
      for (let i = 0; i < n; i++) {
        const d = this.petalData[i]
        if (!reducedMotion) {
          d.y -= d.s * dt * this.petalSpeed
          d.x += Math.sin(t * 0.6 + d.ph) * 0.25 * dt
          if (d.y < -5) {
            d.y = 6
            d.x = (Math.random() - 0.5) * 12
          }
        }
        e.set(t * d.r + d.ph, t * d.r * 0.7, d.ph)
        q.setFromEuler(e)
        sc.setScalar(mix)
        p.set(d.x, d.y, d.z)
        this.petals.setMatrixAt(i, this.tmp.compose(p, q, sc))
      }
      this.petals.instanceMatrix.needsUpdate = true
    }

    // бабочки
    for (const b of this.butterflies) {
      if (!b.g.visible) continue
      const k = t * 0.5 + b.p
      b.g.position.set(
        b.c.x + Math.sin(k * 1.1) * 2.2,
        b.c.y + Math.sin(k * 1.7) * 0.9,
        b.c.z + Math.cos(k * 0.9) * 1.2,
      )
      b.g.rotation.y = Math.cos(k * 1.1) * 0.5
      b.g.rotation.z = Math.sin(k * 1.1) * 0.25
      const flap = Math.sin(t * 11 + b.p) * 0.9
      b.wr.rotation.y = flap
      b.wl.rotation.y = -flap
    }

    // карточки и сердце
    if (this.ring.scale.x > 0.01) {
      this.cards.forEach((c, i) => {
        c.position.y = Math.sin(t * 0.8 + i) * 0.08
        c.rotation.z = Math.sin(t * 0.5 + i * 1.3) * 0.025
      })
    }
    if (this.heart.visible) {
      const beat = 1 + Math.pow(Math.max(0, Math.sin(t * 3)), 6) * 0.08
      this.heart.children[1].scale.setScalar(beat)
      this.heart.rotation.y = Math.sin(t * 0.8) * 0.3
    }
    if (this.bouquet.visible) this.bouquet.rotation.y = Math.sin(t * 0.5) * 0.12

    this.burst.update(dt)
    this.applyCamera()
    this.renderer.render(this.scene, this.camera)
  }
}
