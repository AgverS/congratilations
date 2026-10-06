import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// оттенки кобальта: множитель на градиент лепестков (светлый кончик, тёмная середина)
export const PALETTE = [0xffffff, 0xc9d8ff, 0x9fb5f5, 0xe6ecff, 0xb5c7fa, 0x86a4f5]

function petalRing(
  count: number,
  length: number,
  width: number,
  tilt: number,
  offset: number,
  z: number,
): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < count; i++) {
    const g = new THREE.SphereGeometry(1, 10, 6)
    g.scale(width, length, 0.07)
    g.translate(0, length * 0.95, 0)
    g.rotateX(tilt)
    g.translate(0, 0, z)
    g.rotateZ(offset + (i / count) * Math.PI * 2)
    parts.push(g)
  }
  return parts
}

const headGeo = mergeGeometries([
  ...petalRing(8, 0.62, 0.27, 0.35, 0, 0),
  ...petalRing(8, 0.5, 0.24, 0.75, Math.PI / 8, -0.05),
])!
{
  // мазок гжели: тёмный кобальт у середины, светлый к кончику лепестка
  const pos = headGeo.attributes.position
  const col = new Float32Array(pos.count * 3)
  const deep = new THREE.Color(0x1c3cae)
  const light = new THREE.Color(0xf1f5ff)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.hypot(pos.getX(i), pos.getY(i)) / 1.15)
    c.copy(deep).lerp(light, Math.pow(t, 0.8))
    col.set([c.r, c.g, c.b], i * 3)
  }
  headGeo.setAttribute('color', new THREE.BufferAttribute(col, 3))
}
const centerGeo = new THREE.SphereGeometry(0.2, 12, 8)
centerGeo.scale(1, 1, 0.6)
centerGeo.translate(0, 0, 0.04)
const centerMat = new THREE.MeshStandardMaterial({ color: 0x14287a, roughness: 0.5 })
const stemMat = new THREE.MeshStandardMaterial({ color: 0x2748b8, roughness: 0.6 })
const leafMat = new THREE.MeshStandardMaterial({
  color: 0x5a7fe0,
  roughness: 0.6,
  side: THREE.DoubleSide,
})

const leafGeo = (() => {
  const make = (rot: number) => {
    const g = new THREE.SphereGeometry(1, 8, 6)
    g.scale(0.11, 0.38, 0.025)
    g.translate(0, 0.38, 0)
    g.rotateZ(rot)
    return g
  }
  return mergeGeometries([make(-1.0), make(1.0)])
})()

const petalMats = new Map<number, THREE.MeshStandardMaterial>()
function petalMat(color: number) {
  let m = petalMats.get(color)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      vertexColors: true,
      roughness: 0.5,
      side: THREE.DoubleSide,
    })
    petalMats.set(color, m)
  }
  return m
}

export interface Flower extends THREE.Group {
  userData: { head: THREE.Group; size: number }
}

/** Цветок: корень в (0,0,0), головка на конце `end`, смотрит в +Z. */
export function createFlower(color: number, end: THREE.Vector3, size: number): Flower {
  const root = new THREE.Group() as Flower
  const mid = new THREE.Vector3(end.x * 0.15, end.y * 0.55, end.z * 0.15)
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), mid, end.clone()])
  root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.04, 5), stemMat))

  const leaves = new THREE.Mesh(leafGeo, leafMat)
  leaves.position.copy(curve.getPoint(0.3))
  leaves.rotation.y = Math.random() * Math.PI
  root.add(leaves)

  const head = new THREE.Group()
  head.position.copy(end)
  head.add(new THREE.Mesh(headGeo, petalMat(color)), new THREE.Mesh(centerGeo, centerMat))
  head.scale.setScalar(size * 0.28)
  root.add(head)

  root.userData = { head, size: size * 0.28 }
  return root
}

export function createGrass(count: number, width: number): THREE.InstancedMesh {
  const geo = new THREE.ConeGeometry(0.05, 1, 3)
  geo.translate(0, 0.5, 0)
  const mesh = new THREE.InstancedMesh(
    geo,
    new THREE.MeshStandardMaterial({ roughness: 0.9 }),
    count,
  )
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const color = new THREE.Color()
  for (let i = 0; i < count; i++) {
    q.setFromEuler(new THREE.Euler(0, 0, (Math.random() - 0.5) * 0.5))
    m.compose(
      new THREE.Vector3((Math.random() - 0.5) * width, 0, (Math.random() - 0.5) * 3),
      q,
      new THREE.Vector3(1, 0.3 + Math.random() * 0.7, 1),
    )
    mesh.setMatrixAt(i, m)
    mesh.setColorAt(i, color.setHSL(0.62 + Math.random() * 0.03, 0.7, 0.32 + Math.random() * 0.22))
  }
  return mesh
}
