export interface Quality {
  dpr: number
  petals: number
  fireflies: number
  wordPoints: number
  flowers: number
  grass: number
  butterflies: number
  antialias: boolean
}

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function detectQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const mem = nav.deviceMemory ?? 4
  const cores = navigator.hardwareConcurrency ?? 4
  const low = mem <= 2 || cores <= 4
  return {
    dpr: Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2),
    petals: reducedMotion ? 20 : low ? 50 : 110,
    fireflies: low ? 30 : 60,
    wordPoints: low ? 900 : 1700,
    flowers: low ? 12 : 20,
    grass: low ? 60 : 130,
    butterflies: reducedMotion ? 0 : low ? 3 : 6,
    antialias: !low,
  }
}

/** Совсем слабое устройство — сразу показываем 2D-версию. */
export function isTooWeak(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return (nav.deviceMemory ?? 4) <= 1
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
