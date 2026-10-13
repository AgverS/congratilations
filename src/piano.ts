// Нежное пианино, синтезируется прямо в браузере: Am – F – C – G, арпеджио и тихая мелодия.

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

const BARS = [
  { bass: 45, arp: [57, 60, 64], mel: [0, 0, 76, 0, 72, 0, 74, 0], alt: [0, 0, 81, 0, 76, 0, 72, 0] },
  { bass: 41, arp: [53, 57, 60], mel: [0, 0, 77, 0, 72, 0, 69, 0], alt: [0, 0, 77, 0, 81, 0, 77, 0] },
  { bass: 48, arp: [55, 60, 64], mel: [0, 0, 76, 0, 79, 0, 76, 0], alt: [0, 0, 79, 0, 84, 0, 79, 0] },
  { bass: 43, arp: [55, 59, 62], mel: [0, 0, 74, 0, 71, 0, 67, 0], alt: [0, 0, 71, 0, 74, 0, 79, 0] },
]
const STEP = 0.46 // секунд на восьмую
const SHAPE = [0, 1, 2, 1, 0, 1, 2, 1]

export class Piano {
  private ctx?: AudioContext
  private out?: GainNode
  private timer?: number
  private next = 0
  private bar = 0
  playing = false

  async start() {
    if (!this.ctx) this.build()
    const ctx = this.ctx!
    await ctx.resume()
    this.out!.gain.cancelScheduledValues(ctx.currentTime)
    this.out!.gain.setTargetAtTime(0.9, ctx.currentTime, 0.4)
    this.playing = true
    if (this.timer === undefined) {
      this.next = ctx.currentTime + 0.1
      this.timer = window.setInterval(() => this.schedule(), 250)
      this.schedule()
    }
  }

  stop() {
    if (!this.ctx) return
    this.out!.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3)
    this.playing = false
  }

  toggle() {
    void (this.playing ? this.stop() : this.start())
    return this.playing
  }

  // короткий звонкий аккорд — для «развязывания банта»
  chime() {
    if (!this.ctx || !this.playing) return
    const t = this.ctx.currentTime
    ;[72, 76, 79, 84, 88].forEach((n, i) => this.note(n, t + i * 0.09, 0.5, 3))
  }

  // одна нота — для лепестков ромашки
  pluck(i: number) {
    if (!this.ctx || !this.playing) return
    const scale = [72, 76, 79, 81, 84, 88]
    this.note(scale[i % scale.length], this.ctx.currentTime, 0.45, 2.6)
  }

  private build() {
    const ctx = new AudioContext()
    const out = ctx.createGain()
    out.gain.value = 0
    // «комната»: реверберация из затухающего шума
    const len = ctx.sampleRate * 3
    const ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6
    }
    const verb = ctx.createConvolver()
    verb.buffer = ir
    const wet = ctx.createGain()
    wet.gain.value = 0.38
    out.connect(ctx.destination)
    out.connect(verb)
    verb.connect(wet)
    wet.connect(ctx.destination)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void ctx.suspend()
      else if (this.playing) void ctx.resume()
    })
    this.ctx = ctx
    this.out = out
  }

  private schedule() {
    const ctx = this.ctx!
    while (this.next < ctx.currentTime + 1.2) {
      const bar = BARS[this.bar % 4]
      const alt = Math.floor(this.bar / 4) % 2 === 1
      const mel = alt ? bar.alt : bar.mel
      for (let s = 0; s < 8; s++) {
        const t = this.next + s * STEP
        if (s === 0) this.note(bar.bass, t, 0.5, 4)
        this.note(bar.arp[SHAPE[s]], t, 0.2, 2.2)
        if (mel[s]) this.note(mel[s], t + 0.01, 0.34, 3)
      }
      this.next += 8 * STEP
      this.bar++
    }
  }

  private note(n: number, t: number, vel: number, dur: number) {
    const ctx = this.ctx!
    const f = midi(n)
    const g = ctx.createGain()
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(Math.min(f * 7, 6000), t)
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.5, 400), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vel * 0.5, t + 0.006)
    g.gain.exponentialRampToValueAtTime(vel * 0.12, t + 0.35)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    g.connect(lp)
    lp.connect(this.out!)
    ;[1, 2, 3, 4, 5, 6].forEach((k, i) => {
      const o = ctx.createOscillator()
      const pg = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f * k * (1 + (Math.random() - 0.5) * 0.0015)
      pg.gain.value = [1, 0.5, 0.22, 0.12, 0.06, 0.03][i]
      o.connect(pg)
      pg.connect(g)
      o.start(t)
      o.stop(t + dur + 0.05)
    })
  }
}
