// Плоские SVG-цветы в палитре открытки: роза, пион, ромашка, тюльпан.

export type Kind = 'rose' | 'peony' | 'daisy' | 'tulip'
export interface Pal { a: string; b: string; c: string }

export const PAL = {
  red: { a: '#ee5a6c', b: '#c4162f', c: '#7a0f20' },
  wine: { a: '#c4314a', b: '#8f1a30', c: '#5a0f20' },
  blush: { a: '#ffd7da', b: '#f4a3ae', c: '#d9586d' },
  cream: { a: '#fffaf2', b: '#f2e6d6', c: '#e7a93a' },
  coral: { a: '#ffb199', b: '#ff7a6b', c: '#d94a4a' },
} satisfies Record<string, Pal>

const layered = (layers: [number, number, number][], pal: Pal, pr: number) =>
  layers
    .map(([r, n, tone], li) =>
      Array.from({ length: n }, (_, i) => {
        const ang = (i * 360) / n + li * 23
        const fill = [pal.a, pal.b, pal.c][tone]
        return `<ellipse cx="0" cy="${-r * pr}" rx="${r * 0.52}" ry="${r * 0.62}" transform="rotate(${ang})" fill="${fill}" stroke="${pal.c}" stroke-opacity=".35" stroke-width="1"/>`
      }).join(''),
    )
    .join('')

export function bloom(kind: Kind, pal: Pal): string {
  if (kind === 'daisy') {
    const petals = Array.from(
      { length: 14 },
      (_, i) => `<ellipse cx="0" cy="-27" rx="6.5" ry="17" transform="rotate(${(i * 360) / 14})" fill="${pal.a}" stroke="${pal.b}" stroke-width="1"/>`,
    ).join('')
    return `<svg viewBox="-50 -50 100 100" aria-hidden="true">${petals}<circle r="11" fill="${pal.c}"/><circle r="6" fill="${pal.c}" stroke="#0002" stroke-width="1.5"/></svg>`
  }
  if (kind === 'tulip') {
    return `<svg viewBox="0 0 60 80" aria-hidden="true">
      <path d="M30 74C6 70 2 34 10 6c10 12 20 32 20 68Z" fill="${pal.b}" stroke="${pal.c}" stroke-opacity=".4"/>
      <path d="M30 74c0-36 10-56 20-68 8 28 4 64-20 68Z" fill="${pal.b}" stroke="${pal.c}" stroke-opacity=".4"/>
      <path d="M30 76C14 58 18 24 30 2c12 22 16 56 0 74Z" fill="${pal.a}" stroke="${pal.c}" stroke-opacity=".4"/></svg>`
  }
  const rose = kind === 'rose'
  const layers: [number, number, number][] = rose
    ? [[42, 6, 0], [34, 5, 1], [25, 5, 0], [17, 4, 1], [9, 3, 2]]
    : [[44, 8, 0], [37, 8, 1], [29, 7, 0], [21, 6, 1], [13, 5, 0], [6, 4, 2]]
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true">${layered(layers, pal, 0.55)}
    <path d="M0 -2q6-2 6 4t-8 4" fill="none" stroke="${pal.c}" stroke-width="1.6" stroke-linecap="round"/></svg>`
}

const leaf = (cls: string) =>
  `<svg class="sf-leaf ${cls}" viewBox="0 0 50 20" aria-hidden="true"><path d="M0 10C14-6 38-4 50 8 36 20 12 20 0 10Z" fill="var(--leaf)"/></svg>`

// цветок на стебле с листьями — растёт снизу вверх
export function stemFlower(kind: Kind, pal: Pal, size: number, h: number, left: string) {
  return `<div class="sf" style="left:${left};--s:${size}px;height:${h}px"><div class="sf-stem"></div>${leaf('l')}${leaf('r')}<div class="sf-head">${bloom(kind, pal)}</div></div>`
}
