// Sound: mostly synthesised on the spot with Web Audio (footsteps, creaks, squeaks, glass, barks,
// snores), plus a few CC0 recordings (music, crickets, coins, the church bell). Everything is placed
// left/right by its x relative to the camera and fades with distance. Starts on the first tap/key.
const FILES = { music: 'audio/music-graveyard.mp3', menu: 'audio/music-menu.mp3', crickets: 'audio/amb-crickets.mp3', coins: 'audio/coins.mp3', pickup: 'audio/pickup.mp3', click: 'audio/click.mp3', select: 'audio/select.mp3', toll: 'audio/horn-toll.mp3', shatter: 'audio/shatter1.mp3', shatter2: 'audio/shatter2.mp3', crack: 'audio/crack1.mp3', bump: 'audio/bump1.mp3', bump2: 'audio/bump2.mp3', crunch: 'audio/crunch1.mp3', boom: 'audio/boom1.mp3', boomtail: 'audio/boomtail.mp3', jingle: 'audio/jingle.mp3', crow: 'audio/crow.mp3', whoosh: 'audio/whoosh1.mp3', tick: 'audio/tick.mp3', clang: 'audio/clang1.mp3' };

export class Sfx {
  constructor() {
    this.ctx = null;
    this.buf = {};
    this.listenerX = 0;
    this.vol = { music: 0.5, sfx: 1 };
    this.muted = false;
    this.musicEl = null;
    this.ambEl = null;
    this.snores = new Map();
    const start = () => { this.init(); removeEventListener('pointerdown', start); removeEventListener('keydown', start); };
    addEventListener('pointerdown', start);
    addEventListener('keydown', start);
    try { const s = JSON.parse(localStorage.getItem('tb.vol') || 'null'); if (s) this.vol = { ...this.vol, ...s }; } catch { /* */ }
  }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.out = this.ctx.createGain();
    this.out.connect(this.ctx.destination);
    this.applyVol();
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    for (const [k, url] of Object.entries(FILES)) {
      if (k === 'music' || k === 'menu' || k === 'crickets') continue;
      fetch(url).then((r) => r.arrayBuffer()).then((a) => this.ctx.decodeAudioData(a)).then((b) => { this.buf[k] = b; }).catch(() => {});
    }
    if (this.wantMusic) this.music(this.wantMusic);
  }
  setVolume(kind, v) { this.vol[kind] = v; try { localStorage.setItem('tb.vol', JSON.stringify(this.vol)); } catch { /* */ } this.applyVol(); }
  setMuted(m) { this.muted = m; this.applyVol(); }
  applyVol() {
    if (this.out) this.out.gain.value = this.muted ? 0 : this.vol.sfx;
    const mv = this.muted ? 0 : this.vol.music;
    if (this.musicEl) this.musicEl.volume = mv * 0.55;
    if (this.ambEl) this.ambEl.volume = this.muted ? 0 : 0.35 * this.vol.sfx;
  }
  /** background music: 'menu', 'night' or '' */
  music(which) {
    this.wantMusic = which;
    if (!this.ctx) return;
    const src = which === 'night' || which === 'play' ? FILES.music : which === 'menu' ? FILES.menu : '';
    if (this.musicEl && this.musicEl.dataset.src === src) return;
    if (this.musicEl) { this.musicEl.pause(); this.musicEl = null; }
    if (src) { const a = new Audio(src); a.loop = true; a.dataset.src = src; this.musicEl = a; this.applyVol(); a.play().catch(() => {}); }
    if (which === 'night' && !this.ambEl) { const a = new Audio(FILES.crickets); a.loop = true; this.ambEl = a; this.applyVol(); a.play().catch(() => {}); }
    if (which !== 'night' && this.ambEl) { this.ambEl.pause(); this.ambEl = null; }
  }

  // ---------------------------------------------------------------- building blocks
  bus(x, vol = 1) {
    const c = this.ctx;
    const g = c.createGain();
    const dx = x === undefined ? 0 : x - this.listenerX;
    g.gain.value = vol * Math.max(0, 1 - Math.abs(dx) / 34);
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.max(-0.85, Math.min(0.85, dx / 14)); g.connect(p); p.connect(this.out); } else g.connect(this.out);
    return g.gain.value > 0.003 ? g : null;
  }
  noise(dest, { t = 0, dur = 0.1, f = 1000, q = 1, type = 'bandpass', a = 0.004, peak = 0.5 }) {
    const c = this.ctx, now = c.currentTime + t;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(peak, now + a); g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    s.connect(fl); fl.connect(g); g.connect(dest);
    s.start(now, Math.random()); s.stop(now + dur + 0.05);
    return fl;
  }
  tone(dest, { t = 0, dur = 0.2, f0 = 400, f1 = f0, type = 'sine', peak = 0.2, a = 0.005 }) {
    const c = this.ctx, now = c.currentTime + t;
    const jit = 0.95 + Math.random() * 0.1; f0 *= jit; f1 *= jit; // a touch of pitch variety
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, now); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), now + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(peak, now + a); g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    o.connect(g); g.connect(dest); o.start(now); o.stop(now + dur + 0.05);
  }
  sample(dest, key, { rate = 1, vol = 1, t = 0 } = {}) {
    const b = this.buf[key];
    if (!b) return;
    const s = this.ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(dest); s.start(this.ctx.currentTime + t);
  }

  // ---------------------------------------------------------------- the sounds
  play(name, o = {}) {
    if (!this.ctx || this.muted) return;
    const v = o.vol ?? 1;
    const d = this.bus(o.x, 1);
    if (!d) return;
    const R = Math.random;
    switch (name) {
      case 'step': this.noise(d, { dur: o.crouch ? 0.05 : 0.09, f: 280 + R() * 120, q: 0.8, peak: 0.12 + v * 0.35, type: 'lowpass' }); break;
      case 'scuff': this.noise(d, { dur: 0.18, f: 900, q: 0.6, peak: 0.2 }); break;
      case 'land': this.noise(d, { dur: 0.22, f: 160, q: 0.7, peak: 0.25 + v * 0.5, type: 'lowpass' }); this.sample(d, 'bump', { vol: 0.25 * v }); break;
      case 'creak': { const f = this.noise(d, { dur: 0.45, f: 380, q: 18, peak: 0.6 * v }); f.frequency.exponentialRampToValueAtTime(230 + R() * 90, this.ctx.currentTime + 0.4); break; }
      case 'squeak': { const f = this.noise(d, { dur: 0.7, f: 900, q: 30, peak: 0.55 }); f.frequency.exponentialRampToValueAtTime(1600 + R() * 500, this.ctx.currentTime + 0.6); this.tone(d, { dur: 0.6, f0: 700, f1: 1250, type: 'sawtooth', peak: 0.02 }); break; }
      case 'door': this.noise(d, { dur: 0.25, f: 500, q: 2, peak: 0.12 }); break;
      case 'doorShut': this.noise(d, { dur: 0.15, f: 200, q: 1, peak: 0.25, type: 'lowpass' }); this.sample(d, 'bump2', { vol: 0.3 }); break;
      case 'sash': this.noise(d, { dur: 0.5, f: 1400, q: 3, peak: 0.08 }); break;
      case 'latch': this.tone(d, { dur: 0.05, f0: 2200, f1: 1800, type: 'square', peak: 0.05 }); this.tone(d, { t: 0.09, dur: 0.06, f0: 1500, f1: 1200, type: 'square', peak: 0.06 }); break;
      case 'crack': this.sample(d, 'crack', { vol: 0.8 }); this.noise(d, { dur: 0.3, f: 700, q: 1, peak: 0.4 }); break;
      case 'cut': this.noise(d, { dur: 0.6, f: 4500, q: 8, peak: 0.06 }); break;
      case 'glass': this.sample(d, 'shatter', { vol: 0.9 }); this.sample(d, 'shatter2', { vol: 0.6, t: 0.08, rate: 1.2 }); break;
      case 'click': this.sample(d, 'click', { vol: 0.5 }); break;
      case 'select': this.sample(d, 'select', { vol: 0.5 }); break;
      case 'pickup': this.sample(d, 'pickup', { vol: 0.45, rate: 0.9 + R() * 0.2 }); break;
      case 'coins': this.sample(d, 'coins', { vol: 0.8 }); break;
      case 'thud': this.noise(d, { dur: 0.2, f: 120, q: 0.7, peak: 0.5 * v, type: 'lowpass' }); break;
      case 'clunk': this.sample(d, 'clang', { vol: 0.35 * v, rate: 0.7 }); this.noise(d, { dur: 0.2, f: 180, peak: 0.4 * v, type: 'lowpass' }); break;
      case 'crunch': this.sample(d, 'crunch', { vol: 0.5 * v, rate: 0.8 }); break;
      case 'thrown': this.sample(d, 'whoosh', { vol: 0.5 }); this.noise(d, { t: 0.45, dur: 0.35, f: 110, q: 0.6, peak: 0.7, type: 'lowpass' }); this.sample(d, 'crunch', { vol: 0.5, t: 0.45, rate: 0.6 }); break;
      case 'whoosh': this.sample(d, 'whoosh', { vol: 0.4 * v, rate: 1.3 }); break;
      case 'pebble': for (let i = 0; i < 3; i++) this.tone(d, { t: i * 0.12 * (1 - i * 0.2), dur: 0.05, f0: 2500 - i * 300, f1: 1800, type: 'triangle', peak: 0.12 / (i + 1) }); break;
      case 'bang': this.sample(d, 'boom', { vol: 0.9 }); this.sample(d, 'boomtail', { vol: 0.5, t: 0.1 }); break;
      case 'shot': this.sample(d, 'boom', { vol: 1, rate: 1.3 }); this.noise(d, { dur: 0.4, f: 2000, q: 0.5, peak: 0.6 }); break;
      case 'puff': this.noise(d, { dur: 0.9, f: 600, q: 0.4, peak: 0.25, a: 0.05 }); break;
      case 'safe': this.tone(d, { dur: 0.15, f0: 300, f1: 180, type: 'square', peak: 0.1 }); this.sample(d, 'clang', { vol: 0.4, t: 0.15 }); this.sample(d, 'coins', { vol: 0.5, t: 0.4 }); break;
      case 'tick': this.sample(d, 'tick', { vol: 0.25 * v, rate: 0.8 + R() * 0.4 }); break;
      case 'snuff': this.noise(d, { dur: 0.25, f: 2500, q: 0.7, peak: 0.08 }); break;
      case 'cloth': this.noise(d, { dur: 0.3, f: 2200, q: 0.6, peak: 0.07 * (v || 1) }); break;
      case 'rope': this.noise(d, { dur: 0.6, f: 900, q: 1.5, peak: 0.12 }); break;
      case 'pipe': this.tone(d, { dur: 0.12, f0: 180 + R() * 60, f1: 150, type: 'triangle', peak: 0.08 }); break;
      case 'grunt': this.tone(d, { dur: 0.18, f0: 140, f1: 100, type: 'sawtooth', peak: 0.05 }); break;
      case 'rattle': for (let i = 0; i < 5; i++) this.noise(d, { t: i * 0.07, dur: 0.06, f: 1200 + R() * 800, q: 4, peak: 0.25 }); break;
      case 'bark': for (let i = 0; i < 2; i++) { this.tone(d, { t: i * 0.22, dur: 0.12, f0: 420, f1: 260, type: 'sawtooth', peak: 0.16 }); this.noise(d, { t: i * 0.22, dur: 0.12, f: 900, q: 2, peak: 0.25 }); } break;
      case 'yowl': this.tone(d, { dur: 0.7, f0: 500, f1: 900, type: 'sawtooth', peak: 0.06 }); this.tone(d, { t: 0.3, dur: 0.6, f0: 900, f1: 380, type: 'triangle', peak: 0.08 }); break;
      case 'meow': this.tone(d, { dur: 0.4, f0: 650, f1: 450, type: 'triangle', peak: 0.06 }); break;
      case 'whistle': this.tone(d, { dur: 0.6, f0: 2800, f1: 2700, type: 'square', peak: 0.05 }); this.tone(d, { t: 0.7, dur: 0.9, f0: 2900, f1: 2750, type: 'square', peak: 0.05 }); break;
      case 'shout': this.tone(d, { dur: 0.35, f0: 260, f1: 330, type: 'sawtooth', peak: 0.12 }); this.tone(d, { t: 0.4, dur: 0.45, f0: 340, f1: 230, type: 'sawtooth', peak: 0.12 }); break;
      case 'hurt': this.noise(d, { dur: 0.25, f: 160, q: 0.8, peak: 0.6, type: 'lowpass' }); this.tone(d, { dur: 0.25, f0: 220, f1: 110, type: 'sawtooth', peak: 0.08 }); break;
      case 'toll': this.sample(d, 'toll', { vol: 0.5 }); break;
      case 'crow': this.sample(d, 'crow', { vol: 0.25 }); break;
      case 'jingle': this.sample(d, 'jingle', { vol: 0.7 }); break;
      case 'snore': this.noise(d, { dur: 1.1, f: 140, q: 3, peak: 0.18 * v, a: 0.5 }); break;
      case 'heart': this.tone(d, { dur: 0.12, f0: 70, f1: 45, type: 'sine', peak: 0.5 }); this.tone(d, { t: 0.18, dur: 0.14, f0: 60, f1: 40, type: 'sine', peak: 0.35 }); break;
      case 'spotted': this.tone(d, { dur: 0.35, f0: 880, f1: 880, type: 'triangle', peak: 0.07 }); this.tone(d, { t: 0.12, dur: 0.4, f0: 1320, f1: 1320, type: 'triangle', peak: 0.06 }); break;
      // ---- The Thread-Bearers
      case 'twang': this.tone(d, { dur: 0.22, f0: 190 + R() * 40, f1: 150, type: 'triangle', peak: 0.1 * v }); this.noise(d, { dur: 0.08, f: 1800, q: 2, peak: 0.05 * v }); break;
      case 'gate': this.noise(d, { dur: 1.1, f: 90, q: 0.8, peak: 0.6, type: 'lowpass', a: 0.1 }); this.sample(d, 'clang', { vol: 0.3, rate: 0.5 }); this.sample(d, 'bump2', { vol: 0.4, t: 0.9, rate: 0.7 }); break;
      case 'plate': this.noise(d, { dur: 0.16, f: 140, q: 0.8, peak: 0.45, type: 'lowpass' }); this.tone(d, { dur: 0.5, f0: 520, f1: 520, type: 'sine', peak: 0.05 }); break;
      case 'plateUp': this.noise(d, { dur: 0.1, f: 200, q: 0.8, peak: 0.2, type: 'lowpass' }); break;
      case 'lever': this.tone(d, { dur: 0.06, f0: 900, f1: 500, type: 'square', peak: 0.06 }); this.noise(d, { t: 0.05, dur: 0.14, f: 220, q: 1, peak: 0.35, type: 'lowpass' }); break;
      case 'bell': for (const [f, p, du] of [[620, 0.16, 2.2], [1244, 0.08, 1.6], [1870, 0.05, 1.1], [2630, 0.03, 0.7]]) this.tone(d, { dur: du, f0: f, f1: f * 0.995, type: 'sine', peak: p * v, a: 0.002 }); break;
      case 'tinybell': for (const [f, p, du] of [[1900, 0.1, 0.9], [2850, 0.06, 0.6], [4100, 0.03, 0.4]]) this.tone(d, { dur: du, f0: f, f1: f, type: 'sine', peak: p * v, a: 0.002 }); break;
      case 'worm': { const f = this.noise(d, { dur: 0.5, f: 260, q: 4, peak: 0.5 * v, a: 0.03 }); f.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.3); this.tone(d, { dur: 0.4, f0: 95, f1: 55, type: 'sawtooth', peak: 0.09 * v }); break; }
      case 'rumble': this.noise(d, { dur: 0.6, f: 70, q: 0.7, peak: 0.3 * v, type: 'lowpass', a: 0.15 }); break;
      case 'skitter': for (let i = 0; i < 7; i++) this.noise(d, { t: i * 0.045 + R() * 0.02, dur: 0.03, f: 2600 + R() * 1800, q: 5, peak: 0.16 * v }); break;
      case 'stab': this.sample(d, 'whoosh', { vol: 0.5, rate: 1.9 }); this.noise(d, { t: 0.06, dur: 0.18, f: 150, q: 0.7, peak: 0.7, type: 'lowpass' }); this.sample(d, 'crunch', { vol: 0.5, t: 0.06, rate: 1.2 }); break;
      case 'stomp': this.noise(d, { dur: 0.35, f: 80, q: 0.7, peak: 0.7 * v, type: 'lowpass' }); this.sample(d, 'bump', { vol: 0.35 * v, rate: 0.5 }); break;
      case 'crash': this.sample(d, 'boom', { vol: 0.9, rate: 0.8 }); this.sample(d, 'boomtail', { vol: 0.6, t: 0.1 }); this.sample(d, 'crunch', { vol: 0.6, t: 0.05, rate: 0.6 }); break;
      case 'groan': this.tone(d, { dur: 0.9, f0: 70, f1: 48, type: 'sawtooth', peak: 0.12 * v, a: 0.15 }); this.noise(d, { dur: 0.9, f: 120, q: 3, peak: 0.2 * v, a: 0.2 }); break;
      case 'scream': for (let i = 0; i < 5; i++) this.tone(d, { t: i * 0.03, dur: 1.3, f0: 380 + i * 67, f1: 900 + i * 110, type: 'sawtooth', peak: 0.045, a: 0.2 }); this.noise(d, { dur: 1.2, f: 2400, q: 1.5, peak: 0.12, a: 0.3 }); break;
      case 'splash': this.noise(d, { dur: 0.45, f: 1100, q: 0.6, peak: 0.3 * v, a: 0.02 }); this.noise(d, { dur: 0.3, f: 300, q: 0.8, peak: 0.3 * v, type: 'lowpass' }); break;
      case 'water': this.noise(d, { dur: 1.6, f: 420, q: 0.5, peak: 0.22, a: 0.5 }); break;
      case 'crackle': this.sample(d, 'crack', { vol: 0.55, rate: 1.5 }); this.noise(d, { dur: 0.25, f: 5200, q: 3, peak: 0.1 }); break;
      case 'snip': this.sample(d, 'clang', { vol: 0.5, rate: 1.7 }); this.noise(d, { dur: 0.09, f: 4200, q: 2, peak: 0.3 }); this.noise(d, { t: 0.02, dur: 0.2, f: 160, q: 0.8, peak: 0.4, type: 'lowpass' }); break;
      case 'trap': this.sample(d, 'clang', { vol: 0.7, rate: 1.25 }); this.noise(d, { dur: 0.12, f: 2600, q: 1.5, peak: 0.4 }); break;
      case 'die': this.tone(d, { dur: 0.7, f0: 180, f1: 50, type: 'sine', peak: 0.3 }); this.noise(d, { dur: 0.3, f: 140, q: 0.7, peak: 0.5, type: 'lowpass' }); break;
      case 'chime': this.tone(d, { dur: 1.4, f0: 660, f1: 660, type: 'sine', peak: 0.07, a: 0.01 }); this.tone(d, { t: 0.12, dur: 1.6, f0: 990, f1: 990, type: 'sine', peak: 0.05, a: 0.01 }); break;
      case 'hook': this.tone(d, { dur: 0.08, f0: 1500, f1: 1100, type: 'triangle', peak: 0.08 }); this.noise(d, { dur: 0.3, f: 900, q: 1.5, peak: 0.1 }); break;
      case 'reel': this.noise(d, { dur: 0.35, f: 1500, q: 2.5, peak: 0.1, a: 0.05 }); break;
      case 'win': this.sample(d, 'jingle', { vol: 0.5, rate: 0.75 }); for (const [i, f] of [330, 415, 494, 660].entries()) this.tone(d, { t: i * 0.22, dur: 3.2, f0: f, f1: f, type: 'sine', peak: 0.07, a: 0.2 }); break;
      default: break;
    }
  }
}
