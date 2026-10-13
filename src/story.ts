import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { bow, muted, note, petal, spark } from './art'
import { bloom, PAL, stemFlower, type Kind } from './flowers'
import type { Person } from './people'
import { Piano } from './piano'

gsap.registerPlugin(ScrollTrigger, Draggable)
ScrollTrigger.config({ ignoreMobileResize: true })

const COLORS = ['#7a1226', '#a31a30', '#c4313f', '#e7a3ab', '#f3d6d6']
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

// набор цветов у каждой открытки свой
type PalKey = keyof typeof PAL
const MIX: Record<Person['id'], [Kind, PalKey][]> = {
  babushka: [['rose', 'red'], ['rose', 'wine'], ['daisy', 'cream'], ['tulip', 'red'], ['peony', 'blush']],
  mama: [['rose', 'red'], ['rose', 'wine'], ['daisy', 'cream'], ['tulip', 'red']],
  tetya: [['peony', 'blush'], ['daisy', 'cream'], ['rose', 'coral'], ['tulip', 'coral'], ['peony', 'blush']],
}

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

// разрезаем заголовок на слова и буквы, чтобы они выезжали по очереди
function split(el: HTMLElement) {
  const walk = (node: Node) => {
    ;[...node.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment()
        ;(c.textContent ?? '').split(/(\s+)/).forEach((w) => {
          if (!w.trim()) return frag.append(' ')
          const word = document.createElement('span')
          word.className = 'w'
          ;[...w].forEach((ch) => {
            const s = document.createElement('span')
            s.className = 'ch'
            s.textContent = ch
            word.append(s)
          })
          frag.append(word)
        })
        c.replaceWith(frag)
      } else walk(c)
    })
  }
  walk(el)
  return [...el.querySelectorAll('.ch')]
}

export function mount(root: HTMLElement, p: Person) {
  const piano = new Piano()
  const n = p.photos.length
  const mix = MIX[p.id]
  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!
  const $$ = (s: string) => [...root.querySelectorAll<HTMLElement>(s)]
  const has = (s: string) => !!root.querySelector(s)

  // фото по кругу; если фото ещё нет — стильная заглушка
  const img = (i: number, lazy = true) =>
    n
      ? `<img class="ph" src="${p.photos[i % n]}" alt="" ${lazy ? 'loading="lazy"' : ''} decoding="async" />`
      : `<div class="ph ph-empty">${bow()}</div>`
  const pickFlower = () => mix[Math.floor(Math.random() * mix.length)]
  // свободный цветок: kind, палитра, размер, позиция, скорость параллакса
  const F = (i: number, size: number, pos: string, speed = 0, hero = false) => {
    const [k, pk] = mix[i % mix.length]
    return `<i class="fl px ${hero ? 'h-fl' : ''}" data-speed="${speed}" style="--s:${size}px;${pos}">${bloom(k, PAL[pk])}</i>`
  }
  const row = (count: number) =>
    Array.from({ length: count }, (_, i) => {
      const [k, pk] = mix[i % mix.length]
      return stemFlower(k, PAL[pk], rand(54, 96), rand(110, 250), `${((i + 0.5) / count) * 100 + rand(-3, 3)}%`)
    }).join('')
  const heroTail = `
      <p class="hero-date h-in">14 · 10 · 2026</p>
      <p class="hero-hint h-in">листай <i></i></p>`

  // ---------------- блоки ----------------
  const parts: Record<string, () => { html: string; init?: () => void }> = {
    hero: () => {
      if (p.id === 'mama')
        return {
          html: `<section class="hero cover">
            <div class="cover-photo h-in">${img(0, false)}</div>
            <p class="cover-top h-in">выпуск №1 · только для тебя</p>
            <div class="hero-word fit h-in">${p.word}</div>
            <ul class="cover-lines h-in"><li>Лучшая на свете</li><li>Почему ты — лучшая</li><li>Секретное послание внутри</li></ul>
            <p class="hero-script h-in">с Днём<br>матери</p>
            ${F(0, 120, 'right:-4vw;bottom:8svh', 0.2, true)}${F(2, 84, 'right:22vw;bottom:2svh', 0.4, true)}${F(1, 96, 'left:-6vw;bottom:-2svh', 0.3, true)}
            ${heroTail}<div class="amb"></div></section>`,
        }
      if (p.id === 'tetya')
        return {
          html: `<section class="hero sticker">
            <div class="hero-word fit h-in">${p.word}</div>
            <div class="st-photo h-in">${img(0, false)}</div>
            <svg class="badge h-in" viewBox="0 0 120 120"><defs><path id="bc" d="M60 60m-43 0a43 43 0 1 1 86 0a43 43 0 1 1-86 0"/></defs><circle cx="60" cy="60" r="58" fill="var(--accent)"/><text font-size="10.5" fill="var(--light)" font-family="Playfair Display,serif" font-weight="900"><textPath href="#bc" textLength="262" lengthAdjust="spacing">С ДНЁМ МАТЕРИ ✦ С ДНЁМ МАТЕРИ ✦</textPath></text><path d="M60 44c1.4 9 6 14 16 16-10 2-14.600 7-16 16-1.400-9-6-14-16-16 10-2 14.600-7 16-16Z" fill="var(--light)"/></svg>
            <p class="hero-script h-in">с Днём<br>матери</p>
            <p class="hero-intro h-in">${p.intro}</p>
            ${F(0, 110, 'left:-5vw;top:46svh', 0.3, true)}${F(1, 80, 'right:-3vw;top:58svh', 0.5, true)}${F(2, 96, 'left:14vw;top:68svh', 0.2, true)}${F(3, 70, 'right:16vw;top:20svh', 0.4, true)}
            ${heroTail}<div class="amb"></div></section>`,
        }
      return {
        html: `<section class="hero arch">
          <div class="hero-word fit h-in">${p.word}</div>
          <div class="hero-photo h-in">${img(0, false)}</div>
          <p class="hero-script h-in">с Днём<br>матери</p>
          ${bow('hero-bow h-fl')}
          <p class="hero-intro h-in">${p.intro}</p>
          ${F(0, 104, 'left:-3vw;top:52svh', 0.3, true)}${F(2, 80, 'right:2vw;top:60svh', 0.5, true)}${F(4, 90, 'left:20vw;top:64svh', 0.2, true)}${F(1, 70, 'right:12vw;top:22svh', 0.4, true)}
          ${heroTail}<div class="amb"></div></section>`,
      }
    },

    band: () => ({
      html: `<div class="band"><div class="band-in">${(p.band + ' ' + spark + ' ').repeat(10)}</div></div>`,
      init() {
        // лента бежит быстрее и косится в сторону скролла
        const run = gsap.to('.band-in', { xPercent: -50, duration: 40, ease: 'none', repeat: -1 })
        ScrollTrigger.create({
          onUpdate(self) {
            const v = self.getVelocity()
            run.timeScale(self.direction * (1 + Math.min(Math.abs(v) / 260, 7)))
            gsap.to('.band-in', { skewX: clamp(-v / 220, -12, 12), duration: 0.3, overwrite: 'auto' })
          },
        })
        ScrollTrigger.addEventListener('scrollEnd', () => {
          gsap.to(run, { timeScale: 1, duration: 1 })
          gsap.to('.band-in', { skewX: 0, duration: 0.6 })
        })
        gsap.fromTo('.band', { rotate: -4 }, { rotate: 2, ease: 'none', scrollTrigger: { trigger: '.band', scrub: true, start: 'top bottom', end: 'bottom top' } })
      },
    }),

    booth: () => ({
      html: `<section class="booth-sec">
        <div class="booth-text"><h2 class="script">${p.boothTitle}</h2><p>${p.boothText}</p></div>
        <div class="booth">${[1, 2, 3, 4].map((k) => `<div class="frame">${img(k)}</div>`).join('')}<span class="booth-date">14.10.26</span></div>
        ${F(1, 90, 'right:-6vw;top:6vh', 0.4)}${F(0, 70, 'left:-3vw;bottom:6vh', 0.6)}</section>`,
      init() {
        $$('.frame').forEach((f, i) => {
          gsap.fromTo(f, { y: 80, rotate: i % 2 ? 3 : -3, opacity: 0 }, { y: 0, rotate: 0, opacity: 1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: f, start: 'top 90%' } })
          ScrollTrigger.create({ trigger: f, start: 'top 60%', end: 'bottom 40%', toggleClass: { targets: f, className: 'on' } })
        })
        if (innerWidth >= 900) gsap.fromTo('.booth-text', { y: 0 }, { y: () => $('.booth').offsetHeight * 0.35, ease: 'none', scrollTrigger: { trigger: '.booth-sec', scrub: true, start: 'top 80%', end: 'bottom 40%' } })
      },
    }),

    reasons: () => ({
      html: `<section class="reasons">
        <h2 class="big">${p.reasonsTitle[0]} <em>${p.reasonsTitle[1]}</em></h2>
        <p class="tip">нажми на строчку</p>
        <ol>${p.reasons
          .map(
            (r, i) => `<li><button><span class="no">0${i + 1}</span><span class="rt">${r.t}</span><span class="plus"></span></button><div class="rd"><p>${r.d}</p></div></li>`,
          )
          .join('')}</ol>
        ${F(0, 130, 'right:-9vw;top:6vh', 0.5)}${F(2, 80, 'left:-5vw;bottom:5vh', 0.7)}</section>`,
      init() {
        gsap.from('.reasons li', { x: -40, opacity: 0, stagger: 0.12, duration: 0.8, scrollTrigger: { trigger: '.reasons ol', start: 'top 80%' } })
        $$('.reasons li').forEach((li) => {
          const d = li.querySelector<HTMLElement>('.rd')!
          gsap.set(d, { height: 0 })
          li.querySelector('button')!.addEventListener('click', () => {
            const open = li.classList.toggle('open')
            gsap.to(d, { height: open ? 'auto' : 0, duration: 0.5, ease: 'power3.out', onComplete: () => ScrollTrigger.refresh() })
            if (open) burst(li.getBoundingClientRect().right - 40, li.getBoundingClientRect().top + 30, 8)
          })
        })
      },
    }),

    // фото раскрывается из арки на весь экран — на нативном sticky, без тяжёлого pin
    zoom: () => ({
      html: `<section class="zoom"><div class="zoom-stick">
        <div class="zoom-img">${img(2)}</div>
        <h2 class="zoom-txt big">${p.zoom[0]} <em>${p.zoom[1]}</em></h2></div></section>`,
      init() {
        const tl = gsap.timeline({ scrollTrigger: { trigger: '.zoom', start: 'top top', end: 'bottom bottom', scrub: true } })
        tl.fromTo('.zoom-img', { clipPath: 'inset(24% 20% round 999px)' }, { clipPath: 'inset(0% 0% round 0px)', ease: 'none', duration: 1 })
          .fromTo('.zoom-img .ph', { scale: 1.35 }, { scale: 1, ease: 'none', duration: 1 }, 0)
          .fromTo('.zoom-txt', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5 }, 0.55)
        ScrollTrigger.create({ trigger: '.zoom', start: 'top top', end: 'bottom bottom', onUpdate: (s) => $('.zoom-img .ph').classList.toggle('color', s.progress > 0.7) })
      },
    }),

    stats: () => ({
      html: `<section class="stats">${p.stats
        .map((s) => `<div class="stat"><span class="stat-n" data-to="${s.n}" data-suf="${s.suf ?? ''}">${s.n === '∞' ? '∞' : '0'}</span><span class="stat-l script">${s.label}</span></div>`)
        .join('')}${F(3, 100, 'right:-6vw;top:4vh', 0.5)}</section>`,
      init() {
        $$('.stat').forEach((st) => {
          const num = st.querySelector<HTMLElement>('.stat-n')!
          const to = num.dataset.to!
          gsap.from(st, { y: 50, opacity: 0, duration: 0.9, scrollTrigger: { trigger: st, start: 'top 88%' } })
          if (to === '∞') return
          const o = { v: 0 }
          gsap.to(o, { v: Number(to), duration: 2, ease: 'power2.out', scrollTrigger: { trigger: st, start: 'top 85%' }, onUpdate: () => (num.textContent = Math.round(o.v).toLocaleString('ru') + (num.dataset.suf ?? '')) })
        })
      },
    }),

    scatter: () => ({
      html: `<section class="scat"><h2 class="big">Мы <em>рядом</em></h2>
        <div class="scat-grid">${Array.from({ length: Math.max(n, 4) }, (_, i) => {
          const cap = p.captions[i] ?? ''
          return `<figure class="sc" data-speed="${i % 2 ? 0.35 : -0.15}" style="--r:${rand(-5, 5).toFixed(1)}deg">
            <div class="torn" style="clip-path:${torn()}"><div class="torn-in">${img(i)}</div></div>
            ${cap ? `<figcaption class="script">${cap}</figcaption>` : ''}</figure>`
        }).join('')}</div>
        ${F(0, 110, 'right:-7vw;top:30vh', 0.6)}${F(2, 76, 'left:-4vw;top:90vh', 0.4)}${F(1, 96, 'right:-5vw;bottom:14vh', 0.5)}</section>`,
      init() {
        $$('.sc').forEach((c) => ScrollTrigger.create({ trigger: c, start: 'top 68%', end: 'bottom 32%', toggleClass: { targets: c, className: 'on' } }))
      },
    }),

    letter: () => ({
      html: `<section class="letter"><p class="letter-label">письмо</p>
        <p class="letter-text">${p.letter.split(' ').map((w) => `<span>${w}</span>`).join(' ')}</p>
        <p class="letter-sign script">${p.sign}</p>
        ${F(0, 120, 'left:-8vw;bottom:2vh', 0.4)}<div class="amb"></div></section>`,
      init() {
        gsap.fromTo('.letter-text span', { opacity: 0.16 }, { opacity: 1, stagger: 1, ease: 'none', scrollTrigger: { trigger: '.letter-text', start: 'top 75%', end: 'bottom 45%', scrub: true } })
        gsap.from('.letter-sign', { opacity: 0, y: 20, scrollTrigger: { trigger: '.letter-sign', start: 'top 90%' } })
      },
    }),

    // бабушка: посади свой сад
    garden: () => ({
      html: `<section class="garden"><h2 class="script">Посади сад<br>для меня</h2>
        <p class="garden-hint">нажимай куда угодно — вырастет цветок</p>
        <p class="garden-msg script">${p.garden}</p></section>`,
      init() {
        const g = $('.garden')
        let planted = 0
        const plant = (x: number, y: number) => {
          const r = g.getBoundingClientRect()
          const [k, pk] = pickFlower()
          const wrap = document.createElement('div')
          wrap.innerHTML = stemFlower(k, PAL[pk], rand(60, 100), r.height - y, `${x}px`)
          const sf = wrap.firstElementChild as HTMLElement
          g.append(sf)
          gsap.set(sf, { bottom: 0 })
          gsap.from(sf.querySelector('.sf-stem'), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.8, ease: 'power2.out' })
          gsap.from(sf.querySelectorAll('.sf-leaf'), { scale: 0, duration: 0.6, delay: 0.4, ease: 'back.out(2)' })
          gsap.from(sf.querySelector('.sf-head'), { scale: 0, rotate: -140, duration: 1.1, delay: 0.6, ease: 'elastic.out(1,.55)' })
          gsap.to(sf, { rotation: rand(-3, 3), transformOrigin: '50% 100%', duration: rand(2, 3.5), yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.5 })
        }
        g.addEventListener('click', (e) => {
          const r = g.getBoundingClientRect()
          plant(e.clientX - r.left, e.clientY - r.top)
          burst(e.clientX, e.clientY, 6)
          piano.pluck(planted)
          if (++planted === 1) gsap.to('.garden-hint', { opacity: 0, duration: 0.5 })
          if (planted === 7) gsap.to('.garden-msg', { opacity: 1, y: 0, duration: 1.2 })
        })
        // несколько цветов уже растут — подсказка, что сад можно продолжить
        ScrollTrigger.create({
          trigger: g, start: 'top 60%', once: true,
          onEnter: () => [[0.14, 0.7], [0.5, 0.82], [0.86, 0.74]].forEach(([fx, fy], i) => setTimeout(() => plant(g.clientWidth * fx, g.clientHeight * fy), i * 350)),
        })
        gsap.set('.garden-msg', { opacity: 0, y: 20 })
      },
    }),

    // бабушка: бант
    knot: () => ({
      html: `<section class="knot"><h2 class="script">Для тебя ещё кое-что…</h2>
        <button class="knot-btn" aria-label="Развязать бант">${bow('knot-bow')}</button>
        <p class="knot-hint">нажми на бант</p><p class="knot-secret">${p.secret}</p></section>`,
      init() {
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
      },
    }),

    // мама: колода полароидов — свайп в сторону
    deck: () => ({
      html: `<section class="deck-sec"><h2 class="big">Наши <em>кадры</em></h2><p class="tip">свайпай карточки в сторону</p>
        <div class="deck">${Array.from({ length: Math.max(n, 4) }, (_, i) => `<div class="pol"><div class="pol-img">${img(i)}</div><p class="script">${p.captions[i] ?? ''}</p></div>`).join('')}</div>
        ${F(0, 110, 'left:-7vw;top:6vh', 0.5)}${F(2, 80, 'right:-4vw;bottom:5vh', 0.6)}</section>`,
      init() {
        const cards = $$('.pol')
        const base = new Map(cards.map((c) => [c, rand(-6, 6)]))
        const order = [...cards]
        const layout = () =>
          order.forEach((c, i) => {
            c.style.pointerEvents = i ? 'none' : 'auto'
            c.classList.toggle('on', i === 0)
            gsap.set(c, { zIndex: cards.length - i })
            gsap.to(c, { scale: i < 3 ? 1 - i * 0.04 : 0.88, y: i < 3 ? i * 10 : 20, rotation: base.get(c)!, x: 0, duration: 0.45, ease: 'power2.out', overwrite: 'auto' })
          })
        const toss = (c: HTMLElement, dir: number) => {
          piano.pluck(order.indexOf(c) + 2)
          gsap.to(c, {
            x: dir * innerWidth, rotation: dir * 35, y: -30, duration: 0.55, ease: 'power2.in',
            onComplete() {
              order.push(order.shift()!)
              base.set(c, rand(-6, 6))
              gsap.set(c, { x: 0, y: 0, opacity: 0 })
              Draggable.get(c)?.update()
              layout()
              gsap.to(c, { opacity: 1, duration: 0.4 })
            },
          })
        }
        cards.forEach((c) =>
          Draggable.create(c, {
            type: 'x',
            onDrag() { gsap.set(c, { rotation: base.get(c)! + this.x * 0.06 }) },
            onDragEnd() { Math.abs(this.x) > 70 ? toss(c, this.x > 0 ? 1 : -1) : gsap.to(c, { x: 0, rotation: base.get(c)!, duration: 0.5, ease: 'back.out(2)' }) },
            onClick() { toss(c, Math.random() < 0.5 ? -1 : 1) },
          }),
        )
        layout()
        gsap.from('.deck', { y: 80, opacity: 0, duration: 1, scrollTrigger: { trigger: '.deck', start: 'top 85%' } })
      },
    }),

    // мама: стираемая карточка
    scratch: () => ({
      html: `<section class="scratch"><p class="letter-label">для тебя</p>
        <div class="scr-wrap"><p class="scr-text">${p.secret}</p><canvas class="scr-cv"></canvas></div>
        <p class="tip scr-tip">${p.scratchHint}</p></section>`,
      init() {
        const cv = $<HTMLCanvasElement>('.scr-cv')
        const ctx = cv.getContext('2d', { willReadFrequently: true })!
        const draw = () => {
          cv.width = cv.clientWidth
          cv.height = cv.clientHeight
          const g = ctx.createLinearGradient(0, 0, cv.width, cv.height)
          g.addColorStop(0, '#c8102e')
          g.addColorStop(1, '#5e0f20')
          ctx.fillStyle = g
          ctx.fillRect(0, 0, cv.width, cv.height)
          ctx.fillStyle = '#ffffff22'
          for (let i = 0; i < 40; i++) ctx.fillRect(rand(0, cv.width), rand(0, cv.height), 2, 2)
          ctx.fillStyle = '#f8e7e7'
          ctx.font = `${Math.round(cv.width / 8)}px "Marck Script", cursive`
          ctx.textAlign = 'center'
          ctx.fillText('потри здесь ✦', cv.width / 2, cv.height / 2 + cv.width / 22)
        }
        document.fonts.ready.then(draw)
        let down = false
        let moves = 0
        let done = false
        const scratchAt = (e: PointerEvent) => {
          const r = cv.getBoundingClientRect()
          ctx.globalCompositeOperation = 'destination-out'
          ctx.beginPath()
          ctx.arc(e.clientX - r.left, e.clientY - r.top, 26, 0, 7)
          ctx.fill()
          if (++moves % 12 || done) return
          const d = ctx.getImageData(0, 0, cv.width, cv.height).data
          let clear = 0
          let total = 0
          for (let i = 3; i < d.length; i += 64) {
            total++
            if (d[i] === 0) clear++
          }
          if (clear / total > 0.5) {
            done = true
            piano.chime()
            gsap.to(cv, { opacity: 0, duration: 0.8, onComplete: () => (cv.style.display = 'none') })
            gsap.to('.scr-tip', { opacity: 0 })
            const r2 = cv.getBoundingClientRect()
            burst(r2.left + r2.width / 2, r2.top + r2.height / 2, 30)
          }
        }
        cv.addEventListener('pointerdown', (e) => { down = true; cv.setPointerCapture(e.pointerId); scratchAt(e) })
        cv.addEventListener('pointermove', (e) => down && scratchAt(e))
        cv.addEventListener('pointerup', () => (down = false))
        gsap.from('.scr-wrap', { scale: 0.85, rotate: -3, opacity: 0, duration: 1, ease: 'back.out(1.5)', scrollTrigger: { trigger: '.scr-wrap', start: 'top 85%' } })
      },
    }),

    // тётя: гадание на ромашке
    daisy: () => ({
      html: `<section class="daisy"><h2 class="script">Ромашка<br>для тебя</h2>
        <svg class="daisy-svg" viewBox="-100 -100 200 200" aria-label="Ромашка">
          ${p.daisy
            .map((_, i) => `<g transform="rotate(${(i * 360) / p.daisy.length})"><ellipse class="dp" cx="0" cy="-60" rx="15" ry="38" fill="#fffaf2" stroke="#f2c9cc" stroke-width="1.5"/></g>`)
            .join('')}
          <circle r="27" fill="#e9a93a"/><circle r="17" fill="#d68f1e" opacity=".5"/>
        </svg>
        <p class="daisy-cap script">нажимай на лепестки</p>
        <p class="daisy-secret">${p.secret}</p></section>`,
      init() {
        const petals = $$('.dp')
        let gone = 0
        petals.forEach((el, i) =>
          el.addEventListener('click', () => {
            if (el.dataset.gone) return
            el.dataset.gone = '1'
            const r = el.getBoundingClientRect()
            burst(r.left + r.width / 2, r.top + r.height / 2, 5)
            piano.pluck(i)
            gsap.to(el, { y: -90, rotation: rand(-70, 70), opacity: 0, duration: 0.9, ease: 'power2.in', transformOrigin: '50% 100%' })
            const cap = $('.daisy-cap')
            cap.textContent = p.daisy[i]
            gsap.fromTo(cap, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' })
            if (++gone === petals.length) {
              piano.chime()
              burst(innerWidth / 2, r.top, 36)
              gsap.to('.daisy-secret', { opacity: 1, y: 0, duration: 1.2, delay: 0.5 })
            }
          }),
        )
        gsap.set('.daisy-secret', { opacity: 0, y: 20 })
        gsap.from('.daisy-svg', { rotate: -90, scale: 0.4, opacity: 0, duration: 1.4, ease: 'back.out(1.4)', scrollTrigger: { trigger: '.daisy-svg', start: 'top 85%' } })
        gsap.to('.daisy-svg', { rotation: 360, duration: 120, ease: 'none', repeat: -1 })
      },
    }),

    finale: () => ({
      html: `<section class="finale"><div class="amb"></div>
        <div class="finale-word fit">${p.finale.word}</div>
        <p class="finale-script">${p.finale.script}</p>
        <button class="again">Сначала ↑</button>
        <div class="finale-row">${row(9)}</div></section>`,
      init() {
        gsap.from('.finale-word', { yPercent: 50, opacity: 0, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: '.finale', start: 'top 60%' } })
        gsap.from('.finale-script', { opacity: 0, rotate: -12, y: 30, duration: 1, delay: 0.5, scrollTrigger: { trigger: '.finale', start: 'top 55%' } })
        // сад из цветов вырастает снизу вверх
        const sfs = $$('.finale-row .sf')
        const tl = gsap.timeline({ scrollTrigger: { trigger: '.finale', start: 'top 55%' } })
        sfs.forEach((sf, i) => {
          tl.from(sf.querySelector('.sf-stem'), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.9, ease: 'power2.out' }, i * 0.12)
            .from(sf.querySelectorAll('.sf-leaf'), { scale: 0, duration: 0.5, ease: 'back.out(2)' }, i * 0.12 + 0.5)
            .from(sf.querySelector('.sf-head'), { scale: 0, rotate: -160, duration: 1.1, ease: 'elastic.out(1,.55)' }, i * 0.12 + 0.7)
          gsap.to(sf, { rotation: rand(-2.5, 2.5), transformOrigin: '50% 100%', duration: rand(2.2, 3.6), yoyo: true, repeat: -1, ease: 'sine.inOut' })
        })
        ScrollTrigger.create({
          trigger: '.finale', start: 'top 50%', once: true,
          onEnter: () => { for (let i = 0; i < 6; i++) setTimeout(() => burst(rand(40, innerWidth - 40), -20, 8), i * 250) },
        })
        $('.again').addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }))
      },
    }),
  }

  const built = p.flow.map((k) => parts[k]())

  root.innerHTML = `
  <div class="progress"></div>
  <button class="music" aria-label="Музыка">${note}</button>
  <div class="grain"></div>
  <div class="gate">
    <p class="gate-small">открытка для тебя</p>
    <div class="gate-word fit">${p.word}</div>
    <button class="gate-btn">${bow('gate-bow')}<span>Открыть</span></button>
    <p class="gate-note">со звуком — так лучше</p>
    ${F(0, 110, 'left:-6vw;top:8svh', 0, false).replace('fl px', 'fl')}${F(2, 90, 'right:-4vw;bottom:10svh', 0, false).replace('fl px', 'fl')}
  </div>
  <main>${built.map((b) => b.html).join('')}</main>`

  // ---- огромные слова: подгоняем под ширину экрана, слегка обрезая края
  const fit = () =>
    $$('.fit').forEach((el) => {
      const k = el.closest('.finale') ? 1.0 : 1.04
      el.style.fontSize = '100px'
      el.style.width = 'max-content'
      el.style.fontSize = `${(innerWidth * k * 100) / el.getBoundingClientRect().width}px`
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
      gsap.to(el, { x: rand(-90, 90), y: rand(120, 340), rotation: rand(-300, 300), opacity: 0, duration: rand(1.6, 2.8), ease: 'power1.out', onComplete: () => el.remove() })
    }
  }
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.gate, .reasons, .music, .knot-btn, .garden, .deck, .scratch, .daisy')) burst(e.clientX, e.clientY, 7)
  })

  // ---- плывущие лепестки на фоне (только когда секция на экране)
  $$('.amb').forEach((host) => {
    const tws: gsap.core.Tween[] = []
    for (let i = 0; i < 9; i++) {
      const el = document.createElement('i')
      el.className = 'petal amb-p'
      el.innerHTML = petal(COLORS[i % COLORS.length])
      el.style.cssText = `left:${rand(0, 100)}%;top:0;width:${rand(10, 18)}px;height:${rand(16, 28)}px;opacity:.55`
      host.append(el)
      tws.push(gsap.fromTo(el, { y: -40 }, { y: () => host.offsetHeight + 40, x: `+=${rand(-70, 70)}`, rotation: rand(200, 560), duration: rand(10, 18), repeat: -1, ease: 'none', delay: -rand(0, 14), paused: true }))
    }
    ScrollTrigger.create({ trigger: host, start: 'top bottom', end: 'bottom top', onToggle: (s) => tws.forEach((t) => (s.isActive ? t.resume() : t.pause())) })
  })

  // ---- вход
  document.body.classList.add('locked')
  gsap.set('.hero .h-in, .hero .h-fl', { opacity: 0 })
  $('.gate-btn').addEventListener('click', () => {
    void piano.start().then(syncMusic)
    document.body.classList.remove('locked')
    scrollTo(0, 0)
    gsap.timeline()
      .to('.gate', { yPercent: -100, duration: 1.1, ease: 'power4.inOut', onComplete: () => $('.gate').remove() })
      .fromTo('.hero .h-in', { opacity: 0, y: 50, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 1.2, stagger: 0.12, ease: 'power3.out' }, 0.5)
      .fromTo('.hero .h-fl', { scale: 0, rotate: -120, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 1.4, stagger: 0.1, ease: 'back.out(1.7)' }, 1.1)
  })

  // ---- общие эффекты скролла
  gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { scrub: 0.3, start: 0, end: 'max' } })
  built.forEach((b) => b.init?.())

  // герой: слово и фото уплывают с разной скоростью
  const heroTrig = { trigger: '.hero', scrub: true, start: 'top top', end: 'bottom top' }
  gsap.to('.hero .hero-word', { yPercent: -25, ease: 'none', scrollTrigger: heroTrig })
  if (has('.hero-photo')) gsap.to('.hero-photo', { yPercent: -18, scale: 1.08, ease: 'none', scrollTrigger: heroTrig })
  if (has('.st-photo')) gsap.to('.st-photo', { yPercent: -14, rotate: 4, ease: 'none', scrollTrigger: heroTrig })
  if (has('.cover-photo .ph')) gsap.to('.cover-photo .ph', { scale: 1.2, ease: 'none', scrollTrigger: heroTrig })
  if (has('.hero-bow')) gsap.to('.hero-bow', { rotate: 25, y: -80, ease: 'none', scrollTrigger: heroTrig })

  // цветы: распускаются при появлении, покачиваются, плывут с разной скоростью
  $$('.fl:not(.h-fl)').forEach((el) => {
    if (el.closest('.gate')) return
    gsap.from(el, { scale: 0, rotate: -90, duration: 1.4, ease: 'back.out(1.6)', scrollTrigger: { trigger: el, start: 'top 95%' } })
  })
  $$('.fl').forEach((el) => gsap.to(el.firstElementChild, { rotation: rand(6, 12) * (Math.random() < 0.5 ? -1 : 1), duration: rand(2.5, 4), yoyo: true, repeat: -1, ease: 'sine.inOut' }))
  $$('[data-speed]').forEach((el) => {
    const s = Number(el.dataset.speed)
    if (!s) return
    gsap.to(el, { y: -s * 220, ease: 'none', scrollTrigger: { trigger: el.closest('section')!, scrub: true, start: 'top bottom', end: 'bottom top' } })
  })

  // заголовки: буквы выезжают по очереди
  $$('.big, .zoom-txt').forEach((h) => {
    const chars = split(h)
    if (h.classList.contains('zoom-txt')) return
    gsap.from(chars, { yPercent: 115, rotate: 6, opacity: 0, stagger: 0.03, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } })
  })
}
