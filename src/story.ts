import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { bow, muted, note, petal, spark } from './art'
import type { Person } from './people'
import { Piano } from './piano'

gsap.registerPlugin(ScrollTrigger)

const COLORS = ['#7a1226', '#a31a30', '#c4313f', '#e7a3ab', '#f3d6d6']
const rand = (a: number, b: number) => a + Math.random() * (b - a)

// неровный «рваный» край фото
function torn() {
  const pts: string[] = []
  const edge = (n: number, f: (t: number, j: number) => string) => {
    for (let i = 0; i < n; i++) pts.push(f(i / n, rand(0, 1.8)))
  }
  edge(18, (t, j) => `${(t * 100).toFixed(1)}% ${j.toFixed(1)}%`)
  edge(24, (t, j) => `${(100 - j).toFixed(1)}% ${(t * 100).toFixed(1)}%`)
  edge(18, (t, j) => `${(100 - t * 100).toFixed(1)}% ${(100 - j).toFixed(1)}%`)
  edge(24, (t, j) => `${j.toFixed(1)}% ${(100 - t * 100).toFixed(1)}%`)
  return `polygon(${pts.join(',')})`
}

export function mount(root: HTMLElement, p: Person) {
  const piano = new Piano()
  const n = p.photos.length
  // фото по кругу; если фото ещё нет — стильная заглушка
  const img = (i: number, cls = '') =>
    n
      ? `<img class="ph ${cls}" src="${p.photos[i % n]}" alt="" loading="eager" decoding="async" />`
      : `<div class="ph ph-empty ${cls}">${bow()}</div>`
  const shots = Math.max(n, 5)
  const marquee = ('С ДНЁМ МАТЕРИ ' + spark + ' ').repeat(8)

  root.innerHTML = `
  <div class="progress"></div>
  <button class="music" aria-label="Музыка">${note}</button>
  <div class="grain"></div>

  <div class="gate">
    <p class="gate-small">открытка для тебя</p>
    <div class="gate-word fit">${p.word}</div>
    <button class="gate-btn">
      ${bow('gate-bow')}
      <span>Открыть</span>
    </button>
    <p class="gate-note">со звуком — так лучше</p>
  </div>

  <main>
    <section class="hero">
      <div class="hero-word fit">${p.word}</div>
      <div class="hero-photo">${img(0)}</div>
      <p class="hero-script">с Днём<br>матери</p>
      ${bow('hero-bow')}
      <p class="hero-intro">${p.intro}</p>
      <p class="hero-date">14 · 10 · 2026</p>
      <p class="hero-hint">листай <i></i></p>
    </section>

    <div class="band"><div class="band-in">${marquee}</div></div>

    <section class="booth-sec">
      <div class="booth-text">
        <h2 class="script">${p.boothTitle}</h2>
        <p>${p.boothText}</p>
      </div>
      <div class="booth">
        ${[1, 2, 3, 4].map((k) => `<div class="frame">${img(k)}</div>`).join('')}
        <span class="booth-date">14.10.26</span>
      </div>
    </section>

    <section class="reasons">
      <h2 class="big">За что <em>люблю</em></h2>
      <p class="tip">нажми на строчку</p>
      <ol>
        ${p.reasons
          .map(
            (r, i) => `<li><button><span class="no">0${i + 1}</span><span class="rt">${r.t}</span><span class="plus"></span></button>
              <div class="rd"><p>${r.d}</p></div></li>`,
          )
          .join('')}
      </ol>
    </section>

    <section class="hgal">
      <h2 class="big hg-title">Мы <em>рядом</em></h2>
      <div class="hg-track">
        ${Array.from({ length: shots }, (_, i) => {
          const cap = p.captions[i] ?? ''
          return `<figure class="card" style="--r:${rand(-5, 5).toFixed(1)}deg;--y:${Math.round(rand(-4, 8))}vh;clip-path:none">
            <div class="card-img" style="clip-path:${torn()}">${img(i)}</div>
            ${cap ? `<figcaption class="script">${cap}</figcaption>` : ''}</figure>`
        }).join('')}
        <div class="card end"><p class="script">и это только<br>начало…</p></div>
      </div>
    </section>

    <section class="letter">
      <p class="letter-label">письмо</p>
      <p class="letter-text">${p.letter
        .split(' ')
        .map((w) => `<span>${w}</span>`)
        .join(' ')}</p>
      <p class="letter-sign script">${p.sign}</p>
    </section>

    <section class="knot">
      <h2 class="script">Для тебя ещё кое-что…</h2>
      <button class="knot-btn" aria-label="Развязать бант">${bow('knot-bow')}</button>
      <p class="knot-hint">нажми на бант</p>
      <p class="knot-secret">${p.secret}</p>
    </section>

    <section class="finale">
      <div class="finale-word fit">ЛЮБИМ</div>
      <p class="finale-script">с Днём матери,<br>${p.to === 'бабушке' ? 'бабуля' : 'родная'}</p>
      <button class="again">Сначала ↑</button>
    </section>
  </main>`

  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!
  const $$ = (s: string) => [...root.querySelectorAll<HTMLElement>(s)]

  // ---- огромные слова: подгоняем под ширину экрана, слегка обрезая края
  const fit = () =>
    $$('.fit').forEach((el) => {
      const k = el.closest('.finale') ? 1.0 : 1.04
      el.style.fontSize = '100px'
      el.style.width = 'max-content'
      const w = el.getBoundingClientRect().width
      el.style.fontSize = `${(innerWidth * k * 100) / w}px`
    })
  document.fonts.ready.then(() => {
    fit()
    ScrollTrigger.refresh()
  })
  addEventListener('resize', fit)

  // ---- музыка
  const musicBtn = $('.music')
  const syncMusic = () => (musicBtn.innerHTML = piano.playing ? note : muted)
  musicBtn.addEventListener('click', () => {
    piano.toggle()
    syncMusic()
  })

  // ---- лепестки по тапу
  function burst(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement('i')
      el.className = 'petal'
      el.innerHTML = petal(COLORS[Math.floor(rand(0, COLORS.length))])
      const s = rand(10, 22)
      el.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s * 1.6}px`
      document.body.append(el)
      gsap.to(el, {
        x: rand(-90, 90),
        y: rand(120, 340),
        rotation: rand(-300, 300),
        rotationX: rand(0, 360),
        opacity: 0,
        duration: rand(1.6, 2.8),
        ease: 'power1.out',
        onComplete: () => el.remove(),
      })
    }
  }
  document.addEventListener('pointerdown', (e) => {
    if (!(e.target as HTMLElement).closest('.gate, .reasons button, .music, .knot-btn')) burst(e.clientX, e.clientY, 7)
  })

  // ---- вход
  document.body.classList.add('locked')
  const hero = $('.hero')
  gsap.set(['.hero-word', '.hero-photo', '.hero-script', '.hero-bow', '.hero-intro', '.hero-date', '.hero-hint'], { opacity: 0 })
  $('.gate-btn').addEventListener('click', async () => {
    void piano.start().then(syncMusic)
    document.body.classList.remove('locked')
    scrollTo(0, 0)
    gsap.timeline()
      .to('.gate', { yPercent: -100, duration: 1.1, ease: 'power4.inOut', onComplete: () => $('.gate').remove() })
      .fromTo('.hero-word', { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.4, ease: 'power3.out' }, 0.5)
      .fromTo('.hero-photo', { scale: 0.85, opacity: 0, y: 60 }, { scale: 1, opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }, 0.8)
      .fromTo('.hero-script', { opacity: 0, rotate: -14, y: 30 }, { opacity: 1, rotate: -8, y: 0, duration: 1, ease: 'back.out(1.6)' }, 1.3)
      .fromTo('.hero-bow', { scale: 0, rotate: 30 }, { scale: 1, rotate: 0, opacity: 1, duration: 1, ease: 'elastic.out(1,.5)' }, 1.5)
      .to(['.hero-intro', '.hero-date', '.hero-hint'], { opacity: 1, duration: 1, stagger: 0.15 }, 1.8)
  })

  // ---- скролл-история
  gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { scrub: 0.3, start: 0, end: 'max' } })
  gsap.to('.hero-word', { yPercent: -25, ease: 'none', scrollTrigger: { trigger: hero, scrub: true, start: 'top top', end: 'bottom top' } })
  gsap.to('.hero-photo', { yPercent: -18, scale: 1.08, ease: 'none', scrollTrigger: { trigger: hero, scrub: true, start: 'top top', end: 'bottom top' } })
  gsap.to('.hero-bow', { rotate: 25, y: -80, ease: 'none', scrollTrigger: { trigger: hero, scrub: true, start: 'top top', end: 'bottom top' } })

  gsap.to('.band-in', { xPercent: -50, duration: 40, ease: 'none', repeat: -1 })
  gsap.fromTo('.band', { rotate: -4 }, { rotate: 2, ease: 'none', scrollTrigger: { trigger: '.band', scrub: true, start: 'top bottom', end: 'bottom top' } })

  // фото-будка: кадры «проявляются» из ч/б в цвет
  $$('.frame').forEach((f, i) => {
    gsap.fromTo(f, { y: 80, rotate: i % 2 ? 3 : -3, opacity: 0 }, { y: 0, rotate: 0, opacity: 1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: f, start: 'top 90%' } })
    ScrollTrigger.create({ trigger: f, start: 'top 60%', end: 'bottom 40%', toggleClass: { targets: f, className: 'on' } })
  })
  // на широком экране подпись «плывёт» рядом с лентой кадров
  if (innerWidth >= 900) gsap.fromTo('.booth-text', { y: 0 }, { y: () => $('.booth').offsetHeight * 0.35, ease: 'none', scrollTrigger: { trigger: '.booth-sec', scrub: true, start: 'top 80%', end: 'bottom 40%' } })

  // причины: строки выезжают, по тапу раскрываются
  gsap.from('.reasons .big', { y: 60, opacity: 0, duration: 1, scrollTrigger: { trigger: '.reasons', start: 'top 75%' } })
  gsap.from('.reasons li', { x: -40, opacity: 0, stagger: 0.12, duration: 0.8, scrollTrigger: { trigger: '.reasons ol', start: 'top 80%' } })
  $$('.reasons li').forEach((li) => {
    const d = li.querySelector<HTMLElement>('.rd')!
    gsap.set(d, { height: 0 })
    li.querySelector('button')!.addEventListener('click', () => {
      const open = li.classList.toggle('open')
      gsap.to(d, { height: open ? 'auto' : 0, duration: 0.5, ease: 'power3.out', onComplete: () => ScrollTrigger.refresh() })
      if (open) burst(li.getBoundingClientRect().right - 40, li.getBoundingClientRect().top + 30, 6)
    })
  })

  // горизонтальная галерея
  const track = $('.hg-track')
  const slide = gsap.to(track, {
    x: () => -(track.scrollWidth - innerWidth + 24),
    ease: 'none',
    scrollTrigger: { trigger: '.hgal', pin: true, scrub: 0.6, end: () => '+=' + track.scrollWidth, invalidateOnRefresh: true },
  })
  $$('.hgal .card:not(.end)').forEach((c) =>
    ScrollTrigger.create({ trigger: c, containerAnimation: slide, start: 'left 75%', end: 'right 25%', toggleClass: { targets: c, className: 'on' } }),
  )

  // письмо: слова «зажигаются» по мере чтения
  gsap.fromTo('.letter-text span', { opacity: 0.16 }, { opacity: 1, stagger: 1, ease: 'none', scrollTrigger: { trigger: '.letter-text', start: 'top 75%', end: 'bottom 45%', scrub: true } })
  gsap.from('.letter-sign', { opacity: 0, y: 20, scrollTrigger: { trigger: '.letter-sign', start: 'top 90%' } })

  // бант
  const k = $('.knot-btn')
  gsap.set('.knot-secret', { opacity: 0, y: 20 })
  gsap.from('.knot-bow', { scale: 0.6, rotate: -10, opacity: 0, duration: 1.2, ease: 'elastic.out(1,.6)', scrollTrigger: { trigger: k, start: 'top 80%' } })
  gsap.to('.knot-bow', { y: -8, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  let untied = false
  k.addEventListener('click', () => {
    if (untied) return
    untied = true
    piano.chime()
    const r = k.getBoundingClientRect()
    burst(r.left + r.width / 2, r.top + r.height / 2, 34)
    gsap.timeline()
      .to('.b-l', { x: -80, rotate: -30, opacity: 0, duration: 1, transformOrigin: '100% 50%' })
      .to('.b-r', { x: 80, rotate: 30, opacity: 0, duration: 1, transformOrigin: '0% 50%' }, 0)
      .to('.b-tl', { y: 60, x: -30, rotate: 25, opacity: 0, duration: 1.2 }, 0.1)
      .to('.b-tr', { y: 60, x: 30, rotate: -25, opacity: 0, duration: 1.2 }, 0.1)
      .to('.b-k', { scale: 0, opacity: 0, transformOrigin: '50% 50%', duration: 0.6 }, 0.2)
      .to('.knot-hint', { opacity: 0, duration: 0.4 }, 0)
      .to('.knot-secret', { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, 0.8)
    gsap.to(k, { height: 0, margin: 0, duration: 1, delay: 0.8, ease: 'power2.inOut', onComplete: () => ScrollTrigger.refresh() })
  })

  // финал
  gsap.from('.finale-word', { yPercent: 50, opacity: 0, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: '.finale', start: 'top 60%' } })
  gsap.from('.finale-script', { opacity: 0, rotate: -12, y: 30, duration: 1, delay: 0.5, scrollTrigger: { trigger: '.finale', start: 'top 55%' } })
  ScrollTrigger.create({
    trigger: '.finale',
    start: 'top 50%',
    once: true,
    onEnter: () => {
      for (let i = 0; i < 6; i++) setTimeout(() => burst(rand(40, innerWidth - 40), -20, 8), i * 250)
    },
  })
  $('.again').addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }))
}
