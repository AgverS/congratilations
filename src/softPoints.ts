import * as THREE from 'three'

/** Общий юниформ: пикселей на единицу размера на расстоянии 1 от камеры. */
export const pxUniform = { value: 400 }

/** Мягкие светящиеся точки с индивидуальным цветом, размером и прозрачностью. */
export class SoftPoints {
  readonly points: THREE.Points
  readonly pos: Float32Array
  readonly col: Float32Array
  readonly size: Float32Array
  readonly alpha: Float32Array
  private geo = new THREE.BufferGeometry()

  readonly count: number

  constructor(count: number) {
    this.count = count
    this.pos = new Float32Array(count * 3)
    this.col = new Float32Array(count * 3)
    this.size = new Float32Array(count).fill(0.1)
    this.alpha = new Float32Array(count).fill(1)
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3))
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3))
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1))
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1))
    const mat = new THREE.ShaderMaterial({
      uniforms: { uPx: pxUniform, uOpacity: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
        uniform float uPx; varying vec3 vColor; varying float vAlpha;
        void main() {
          vColor = aColor; vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPx / max(-mv.z, 0.1);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity; varying vec3 vColor; varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.12, d) * vAlpha * uOpacity;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor, a);
        }`,
      transparent: true,
      depthWrite: false,
    })
    this.points = new THREE.Points(this.geo, mat)
    this.points.frustumCulled = false
  }

  get opacity(): number {
    return (this.points.material as THREE.ShaderMaterial).uniforms.uOpacity.value
  }
  set opacity(v: number) {
    ;(this.points.material as THREE.ShaderMaterial).uniforms.uOpacity.value = v
  }

  flush(pos = true, extra = false) {
    if (pos) this.geo.attributes.position.needsUpdate = true
    if (extra) {
      this.geo.attributes.aColor.needsUpdate = true
      this.geo.attributes.aSize.needsUpdate = true
      this.geo.attributes.aAlpha.needsUpdate = true
    }
  }
}

/** Фейерверк искорок/сердечек. */
export class Burst {
  readonly sp: SoftPoints
  private vel: Float32Array
  private life: Float32Array
  private maxLife: Float32Array
  private cursor = 0

  constructor(count: number) {
    this.sp = new SoftPoints(count)
    this.vel = new Float32Array(count * 3)
    this.life = new Float32Array(count)
    this.maxLife = new Float32Array(count).fill(1)
    this.sp.alpha.fill(0)
  }

  emit(origin: THREE.Vector3, count: number, colors: number[], speed = 2.2) {
    const c = new THREE.Color()
    for (let k = 0; k < count; k++) {
      const i = this.cursor++ % this.sp.count
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const s = speed * (0.4 + Math.random() * 0.6)
      this.sp.pos.set([origin.x, origin.y, origin.z], i * 3)
      this.vel.set(
        [s * Math.sin(ph) * Math.cos(th), s * Math.sin(ph) * Math.sin(th) + 0.8, s * Math.cos(ph)],
        i * 3,
      )
      c.set(colors[Math.floor(Math.random() * colors.length)])
      this.sp.col.set([c.r, c.g, c.b], i * 3)
      this.sp.size[i] = 0.12 + Math.random() * 0.16
      this.maxLife[i] = 1.2 + Math.random() * 1.2
      this.life[i] = this.maxLife[i]
    }
  }

  update(dt: number) {
    let any = false
    for (let i = 0; i < this.sp.count; i++) {
      if (this.life[i] <= 0) continue
      any = true
      this.life[i] -= dt
      const k = i * 3
      this.vel[k + 1] -= 1.4 * dt
      const drag = 1 - 1.2 * dt
      this.vel[k] *= drag
      this.vel[k + 1] *= drag
      this.vel[k + 2] *= drag
      this.sp.pos[k] += this.vel[k] * dt
      this.sp.pos[k + 1] += this.vel[k + 1] * dt
      this.sp.pos[k + 2] += this.vel[k + 2] * dt
      this.sp.alpha[i] =
        Math.max(0, Math.min(1, this.life[i] / this.maxLife[i] + 0.1)) * (this.life[i] > 0 ? 1 : 0)
    }
    if (any) this.sp.flush(true, true)
  }
}
