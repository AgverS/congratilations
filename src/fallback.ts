import { content } from './content'
import { art, defs } from './art'
import type { PhotoInfo } from './world'

/** Простая 2D-версия: фото + текст + CSS-анимации. */
export function showFallback(photos: PhotoInfo[], startAudio: () => void) {
  document.getElementById('loader')?.classList.add('gone')
  document.getElementById('scene')?.remove()
  const root = document.getElementById('fallback')!
  const base = import.meta.env.BASE_URL
  const { letter, finale, photos: ph } = content
  root.innerHTML = `${defs}
    <div class="fb">
      <div class="big">${art.rosette()}</div>
      <h1>${letter.title}</h1>
      <div class="photos">
        ${photos
          .map(
            (p, i) =>
              `<figure style="animation-delay:${0.3 + i * 0.25}s"><img src="${base}${p.src}" alt="" loading="lazy" />${
                ph.captions[i] ? `<figcaption>${ph.captions[i]}</figcaption>` : ''
              }</figure>`,
          )
          .join('')}
      </div>
      ${letter.lines.map((l) => `<p>${l}</p>`).join('')}
      <h1>${letter.signature}</h1>
      <p>${finale.text}</p>
      <div class="big">${art.rosette()}</div>
    </div>`
  root.hidden = false
  document.addEventListener('pointerdown', startAudio, { once: true })
}
