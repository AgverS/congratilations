// Гжельская роспись: кобальт по фарфору. Все узоры — векторные, рисуются кодом.

const petalPath = (len: number, w: number) =>
  `M0 ${-len * 0.09} C${-w} ${-len * 0.34} ${-w * 0.85} ${-len * 0.75} 0 ${-len} C${w * 0.85} ${-len * 0.75} ${w} ${-len * 0.34} 0 ${-len * 0.09}Z`

/** Общие градиенты (светлая середина лепестка, тёмный кобальтовый край). */
export const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <radialGradient id="gzPetal" cx="50%" cy="82%" r="85%">
      <stop offset="0" stop-color="#eaf0ff"/>
      <stop offset="0.55" stop-color="#7f9fee"/>
      <stop offset="1" stop-color="#1c3cae"/>
    </radialGradient>
    <linearGradient id="gzLeaf" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#1c3cae"/>
      <stop offset="1" stop-color="#8fabf0"/>
    </linearGradient>
  </defs></svg>`

function ring(count: number, len: number, w: number, rot = 0, r0 = 0): string {
  let s = ''
  for (let i = 0; i < count; i++) {
    const a = rot + (360 / count) * i
    s += `<path d="${petalPath(len, w)}" transform="rotate(${a}) translate(0 ${-r0})" fill="url(#gzPetal)" stroke="#1c3cae" stroke-width="1.2" stroke-linejoin="round"/>`
  }
  return s
}

/** Розетка — главный цветок гжели. */
export function rosette(): string {
  let dots = ''
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10
    dots += `<circle cx="${Math.cos(a) * 17}" cy="${Math.sin(a) * 17}" r="1.9" fill="#eaf0ff"/>`
  }
  return `<svg viewBox="-100 -100 200 200" aria-hidden="true">
    ${ring(8, 88, 21)}${ring(8, 56, 14, 22.5)}
    <circle r="23" fill="#1c3cae"/>${dots}<circle r="7" fill="#eaf0ff"/><circle r="3" fill="#1c3cae"/></svg>`
}

/** Веточка с листьями и завитком. */
export function sprig(): string {
  const leaf = (x: number, y: number, rot: number, s: number) =>
    `<path d="M0 0 C-14 -14 -12 -42 0 -60 C12 -42 14 -14 0 0Z" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="url(#gzLeaf)" stroke="#1c3cae" stroke-width="1.2"/>`
  return `<svg viewBox="-100 -100 200 200" aria-hidden="true">
    <path d="M-70 70 C-30 50 -20 10 10 -20 S50 -60 70 -70" fill="none" stroke="#1c3cae" stroke-width="3" stroke-linecap="round"/>
    ${leaf(-48, 56, 35, 0.8)}${leaf(-20, 30, -30, 0.9)}${leaf(-8, 8, 50, 0.75)}${leaf(18, -14, -35, 0.8)}${leaf(36, -42, 40, 0.65)}
    <circle cx="70" cy="-70" r="9" fill="url(#gzPetal)" stroke="#1c3cae" stroke-width="1.5"/>
    <path d="M70 -61 C70 -40 52 -34 46 -48" fill="none" stroke="#1c3cae" stroke-width="2.4" stroke-linecap="round"/></svg>`
}

/** Тарелка для стартового экрана. */
export function plate(): string {
  let rim = ''
  const n = 28
  for (let i = 0; i < n; i++) {
    rim += `<path d="${petalPath(24, 6)}" transform="rotate(${(360 / n) * i}) translate(0 -150)" fill="#2f55c9" stroke="#1c3cae" stroke-width="0.8"/>`
  }
  let dots = ''
  for (let i = 0; i < 40; i++) {
    const a = (Math.PI * 2 * i) / 40
    dots += `<circle cx="${Math.cos(a) * 122}" cy="${Math.sin(a) * 122}" r="2.2" fill="#3f66d8"/>`
  }
  let leaves = ''
  for (let i = 0; i < 6; i++) {
    leaves += `<path d="${petalPath(70, 15)}" transform="rotate(${30 + i * 60}) translate(0 -58)" fill="url(#gzLeaf)" stroke="#1c3cae" stroke-width="1"/>`
  }
  return `<svg viewBox="-200 -200 400 400" aria-hidden="true">
    <circle r="196" fill="#fdfeff" stroke="#1c3cae" stroke-width="4"/>
    <circle r="186" fill="none" stroke="#3f66d8" stroke-width="1.5"/>
    <circle r="178" fill="#f2f6ff"/>
    ${rim}
    <circle r="130" fill="none" stroke="#1c3cae" stroke-width="2.5"/>
    <circle r="126" fill="#fdfeff"/>
    ${dots}
    <circle r="112" fill="none" stroke="#a9bdf0" stroke-width="1.2"/>
    <g transform="scale(0.78)">${leaves}</g>
    <g transform="scale(0.52)">
      <g>${ring(8, 88, 21).replace(/transform="rotate/g, 'transform="rotate')}${ring(8, 56, 14, 22.5)}</g>
      <circle r="23" fill="#1c3cae"/><circle r="7" fill="#eaf0ff"/>
    </g></svg>`
}

export const art: Record<string, () => string> = { rosette, sprig, plate }
