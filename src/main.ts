import './style.css'
import gsap from 'gsap'
import photosManifest from './photos.json'
import { content } from './content'
import { icons } from './icons'
import { art, defs } from './art'
import { detectQuality, hasWebGL, isTooWeak } from './quality'
import { showFallback } from './fallback'
import { World, type Stage } from './world'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const base = import.meta.env.BASE_URL

document.title = content.pageTitle

// ---------- музыка ----------
const audio = new Audio(`${base}music/song.mp3`)
audio.loop = true
audio.preload = 'auto'
let musicOn = true
const musicBtn = $<HTMLButtonElement>('musicBtn')
function syncMusicBtn() {
  musicBtn.innerHTML = musicOn ? icons.soundOn : icons.soundOff
}
syncMusicBtn()

$('artDefs').innerHTML = defs
document
  .querySelectorAll<HTMLElement>('[data-art]')
  .forEach((el) => (el.innerHTML = art[el.dataset.art!]()))
$('secretIcon').innerHTML = icons.mail
for (const id of ['prevBtn', 'viewerPrev']) $(id).innerHTML = icons.chevronL
for (const id of ['nextArrow', 'viewerNext']) $(id).innerHTML = icons.chevronR
function startAudio() {
  musicOn = true
  audio.play().catch(() => {
    musicBtn.hidden = true
  })
  syncMusicBtn()
}
audio.addEventListener('error', () => (musicBtn.hidden = true))
musicBtn.addEventListener('click', () => {
  musicOn = !musicOn
  if (musicOn) audio.play().catch(() => {})
  else audio.pause()
  syncMusicBtn()
})
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.pause()
  else if (musicOn && started) audio.play().catch(() => {})
})
let started = false

// ---------- запуск ----------
if (!hasWebGL() || isTooWeak()) {
  showFallback(photosManifest, startAudio)
} else {
  void boot()
}

async function boot() {
  const canvas = $<HTMLCanvasElement>('scene')
  let world: World
  try {
    world = new World(canvas, detectQuality(), photosManifest, {
      onSeedTap: () => void plant(),
      onPhotoTap: (i) => openViewer(i),
      onPhotoIndex: () => {},
      onHeartTap: () => openSecret(),
    })
    await world.init(content.garden.word)
  } catch (e) {
    console.error(e)
    showFallback(photosManifest, startAudio)
    return
  }
  world.start()

  const hint = $('hint')
  const mainBtn = $<HTMLButtonElement>('mainBtn')
  const hud = $('hud')
  let busy = false

  const setHint = (t: string) => (hint.textContent = t)
  function showBtn(label: string, fn: () => void, delay = 0) {
    mainBtn.hidden = true
    gsap.delayedCall(delay, () => {
      mainBtn.textContent = label
      mainBtn.onclick = fn
      mainBtn.hidden = false
      gsap.fromTo(mainBtn, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 })
      mainBtn.classList.add('pulse')
    })
  }
  const hideBtn = () => {
    mainBtn.hidden = true
    mainBtn.onclick = null
  }
  const arrows = (on: boolean) => {
    $('prevBtn').hidden = !on
    $('nextArrow').hidden = !on
  }

  // стартовый экран
  const start = $('start')
  $('startTitle').textContent = content.start.title
  $('startSub').textContent = content.start.subtitle
  const openBtn = $<HTMLButtonElement>('openBtn')
  openBtn.textContent = content.start.button
  openBtn.classList.add('pulse')
  start.hidden = false
  $('loader').classList.add('gone')

  openBtn.addEventListener('click', async () => {
    started = true
    startAudio()
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
    DOE.requestPermission?.().catch(() => {})
    start.classList.add('opening')
    await wait(1400)
    start.classList.add('leaving')
    hud.hidden = false
    go('seed')
    await wait(1000)
    start.hidden = true
  })

  // ---------- сцены ----------
  async function go(stage: Stage) {
    if (busy) return
    busy = true
    hideBtn()
    arrows(false)
    $('letter').hidden = true
    $('final').hidden = true
    await world.setStage(stage)
    busy = false

    switch (stage) {
      case 'seed':
        setHint(content.seed.hint)
        showBtn(content.seed.button, () => void plant())
        break
      case 'photos':
        setHint(content.photos.hint)
        arrows(true)
        showBtn(content.photos.button, () => go('letter'), 1.5)
        break
      case 'letter':
        setHint('')
        await showLetter()
        break
      case 'heart':
        setHint(content.heart.hint)
        showBtn(content.heart.button, () => go('finale'), 9)
        break
      case 'finale':
        await showFinale()
        break
    }
  }

  async function plant() {
    if (busy || world.stage !== 'seed') return
    busy = true
    hideBtn()
    setHint(content.garden.hint)
    await world.plant()
    busy = false
    showBtn(content.garden.button, () => go('photos'), 0.8)
  }

  async function showLetter() {
    const panel = $('letter')
    $('letterTitle').textContent = content.letter.title
    const box = $('letterLines')
    box.innerHTML = content.letter.lines.map((l) => `<p>${l}</p>`).join('')
    const sign = $('letterSign')
    sign.textContent = content.letter.signature
    panel.hidden = false
    const tl = gsap.timeline()
    tl.fromTo(panel, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1 })
    tl.to('#letterLines p', { opacity: 1, duration: 1, stagger: 1.7 }, 0.8)
    tl.to(sign, { opacity: 1, duration: 1 }, '+=0.3')
    await tl.then()
    panel.scrollTo?.({ top: panel.scrollHeight, behavior: 'smooth' })
    showBtn(content.letter.button, () => go('heart'), 0.3)
  }

  async function showFinale() {
    $('finalTitle').textContent = content.finale.title
    $('finalText').textContent = content.finale.text
    const fin = $('final')
    fin.hidden = false
    gsap.fromTo(fin, { opacity: 0 }, { opacity: 1, duration: 1.5 })
    setHint(content.finale.hint)
    showBtn(content.finale.replay, () => location.reload(), 2)
  }

  // ---------- секрет ----------
  function openSecret() {
    world.heartBurst()
    $('secretText').textContent = content.heart.secret
    const close = $<HTMLButtonElement>('secretClose')
    close.textContent = content.heart.close
    const modal = $('secret')
    modal.hidden = false
    gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.5 })
    close.onclick = () => {
      modal.hidden = true
      world.heartBurst()
      setHint('')
      showBtn(content.heart.button, () => go('finale'), 0.4)
    }
  }

  // ---------- просмотр фото ----------
  const viewer = $('viewer')
  let viewIndex = 0
  function renderViewer() {
    const p = photosManifest[viewIndex]
    const img = $<HTMLImageElement>('viewerImg')
    img.src = base + p.src
    $('viewerCap').textContent = content.photos.captions[viewIndex] ?? ''
  }
  function openViewer(i: number) {
    viewIndex = i
    $('viewerClose').textContent = content.viewer.close
    renderViewer()
    viewer.hidden = false
    gsap.fromTo(viewer, { opacity: 0 }, { opacity: 1, duration: 0.35 })
  }
  function closeViewer() {
    viewer.hidden = true
    world.focusPhoto(viewIndex)
  }
  const n = photosManifest.length
  $('viewerClose').addEventListener('click', closeViewer)
  $('viewerPrev').addEventListener('click', () => {
    viewIndex = (viewIndex - 1 + n) % n
    renderViewer()
  })
  $('viewerNext').addEventListener('click', () => {
    viewIndex = (viewIndex + 1) % n
    renderViewer()
  })
  viewer.addEventListener('click', (e) => {
    if (e.target === viewer) closeViewer()
  })
  $('prevBtn').addEventListener('click', () => world.stepPhoto(-1))
  $('nextArrow').addEventListener('click', () => world.stepPhoto(1))
  window.addEventListener('keydown', (e) => {
    if (!viewer.hidden) {
      if (e.key === 'Escape') closeViewer()
      if (e.key === 'ArrowLeft') $('viewerPrev').click()
      if (e.key === 'ArrowRight') $('viewerNext').click()
    } else if (world.stage === 'photos') {
      if (e.key === 'ArrowLeft') world.stepPhoto(-1)
      if (e.key === 'ArrowRight') world.stepPhoto(1)
    }
  })
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}
