// Нарисованные от руки красные элементы: бант, лепесток, искра.

export const bow = (cls = '') => `
<svg class="bow ${cls}" viewBox="0 0 200 130" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <g class="b-l"><path d="M98 62C70 8 8 2 11 46c3 40 62 38 87 16Z"/><path d="M92 58C72 32 40 26 30 44"/></g>
  <g class="b-r"><path d="M102 62c28-54 90-60 87-16-3 40-62 38-87 16Z"/><path d="M108 58c20-26 52-32 62-14"/></g>
  <g class="b-tl"><path d="M96 68C88 92 72 108 56 118"/><path d="M56 118c8-2 14 0 18 6"/><path d="M102 70C96 88 86 98 78 104"/></g>
  <g class="b-tr"><path d="M104 68c8 24 24 40 40 50"/><path d="M144 118c-8-2-14 0-18 6"/><path d="M98 70c6 18 16 28 24 34"/></g>
  <path class="b-k" d="M91 53c6-8 14-8 19 0 4 9 0 19-9 21-9-2-14-12-10-21Z"/>
</svg>`

export const petal = (c: string) =>
  `<svg viewBox="0 0 20 32" aria-hidden="true"><path d="M10 0C21 9 21 24 10 32 -1 24-1 9 10 0Z" fill="${c}"/><path d="M10 6v20" stroke="#0003" stroke-width=".8"/></svg>`

export const spark = `<svg class="spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12Z" fill="currentColor"/></svg>`

export const note = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>`
export const muted = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/><path d="M2 2l20 20"/></svg>`
