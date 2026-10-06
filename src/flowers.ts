import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const PALETTE = [0xff8fb1, 0xffb38a, 0xc7a2ff, 0xffe27a, 0xffffff, 0xff7a9c]

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
])
const centerGeo = new THREE.SphereGeometry(0.2, 12, 8)
centerGeo.scale(1, 1, 0.6)
centerGeo.translate(0, 0, 0.04)
const centerMat = new THREE.MeshStandardMaterial({ color: 0xf2b134, roughness: 0.6 })
const stemMat = new THREE.MeshStandardMaterial({ color: 0x6fae6a, roughness: 0.8 })
const leafMat = new THREE.MeshStandardMaterial({
  color: 0x8cc57d,
  roughness: 0.8,
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
      roughness: 0.7,
      side: THREE.DoubleSide,
      emissive: color,
      emissiveIntensity: 0.14,
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
    mesh.setColorAt(i, color.setHSL(0.27 + Math.random() * 0.06, 0.5, 0.3 + Math.random() * 0.1))
  }
  return mesh
}
