// One journey through the Loom. Each browser moves its own wanderer (and, alone, its spool) and
// checks its own dangers; the host's browser also keeps the world: plates, levers, gates, the glass,
// the bells, the water, the two hunters, checkpoints, death and the way back, and the ending.
// Alone, you are the host and nothing goes over the wire.
import { LINK, wormOut, wormWarn, shearsBeat, waterLevel } from './level.js';
import { buildChapter, CHAPTERS } from './chapters/index.js';
import { Space, newBody, stepPlayer, stepSpool, newSpool, linkLen, WAIST, HT, HT_LOW, GRAV } from './phys.js';
import { Scene, mats, ent, halo, AMBER, sharedMesh, ink } from './scene.js';
import { addLathe } from './meshes.js';
import { glowMaterial } from './render.js';
import { Threads, SpoolView } from './rope.js';
import { Rig } from './chars.js';
import { newMonster, thinkMonster, packMonster, unpackMonster, viewFor } from './monsters.js';
import { unlatch, DRAIN } from './creatures/drinker.js';
import { FX } from './fx.js';
import { Gore } from './gore.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const NONE = { x: 0, y: 0, jump: false, jumpHeld: false, brace: false, sneak: false };
const F = { ground: 1, braced: 2, sneak: 4, right: 8, hang: 16, dead: 32, mantle: 64, use: 128, climb: 256, caged: 512, taut: 1024, dark: 2048 };
const SCALE = 0.68; // a doll is small
const RED = [1, 0.12, 0.08];
let redMat = null;
const redGlow = () => { if (!redMat) { redMat = glowMaterial(2.4); redMat.setParameter('uTint', new Float32Array([1, 0.16, 0.12, 1])); } return redMat; };
// the worm that gets into a head: how long it gives you, alone and with others
const TAKES_ALONE = 5.5, TAKES_TOGETHER = 10;
const R01 = Math.random;
const bits = (arr) => arr.reduce((m, v, i) => (v ? m | (1 << i) : m), 0);
const unbits = (m, n) => Array.from({ length: n }, (_, i) => !!(m & (1 << i)));

export class Game {
  constructor({ app, R, sfx, input, net, hud, low = false }) {
    Object.assign(this, { app, R, sfx, input, net, hud, low });
    this.fx = new FX(app);
    this.gore = new Gore(app, { low });
    this.goreMode = 'full';
    this.running = false;
    this.attract = false;
    this.paused = false;
    this.Tlocal = 0;
    this.time = 0;
    this.cam = { x: 6, y: 2.5, h: 9.2 };
    this.players = [];
    R.cam.camera.fov = 18;
    net.on('p', (m) => this.onPlayer(m));
    net.on('i', (m) => { if (this.running && this.net.isHost) this.hostIntent(m, this.players.findIndex((p) => p.id === m.from)); });
    net.on('e', (m) => { if (this.running) this.onEvent(m); });
    net.on('s', (m) => { if (this.running) this.onSnapshot(m); });
  }
  get isHost() { return !this.net.online || this.net.isHost; }
  get me() { return this.players[this.meIdx]; }

  // ------------------------------------------------------------------ setting out
  /** order: [{ id, name, slot }] along the thread; startedAt: server ms (online) or null */
  start({ order, meId, startedAt = null, chapter = 0, cp = 0, open = {}, tripped = false, deaths = 0, cut = 0, attract = false, runT0 = null, found = [] }) {
    this.stop();
    const app = this.app, n = order.length;
    this.n = n;
    this.ci = Math.max(0, Math.min(CHAPTERS.length - 1, chapter | 0));
    this.L = buildChapter(this.ci, n);
    this.order = order;
    const L = this.L;
    this.space = new Space(L);
    this.gore.clear(); this.gore.setting = this.goreMode;
    this.scene = new Scene(app, L, { low: this.low });
    this.threads = new Threads(app, Math.max(1, n - 1));
    this.startedAt = startedAt;
    this.attract = attract;
    this.paused = false;
    this.meIdx = Math.max(0, order.findIndex((o) => o.id === meId));
    const dev = app.graphicsDevice;
    const wormM = sharedMesh(dev, 'headworm', (mb) => addLathe(mb, [[0.075, 0], [0.085, 0.09], [0.06, 0.18], [0.075, 0.27], [0.05, 0.37], [0.06, 0.45], [0.03, 0.53], [0.0, 0.58]], { seg: 7, colFn: () => ink() }));
    this.players = order.map((o, i) => {
      const rig = new Rig(app, { variant: o.slot });
      rig.root.setLocalScale(SCALE, SCALE, SCALE);
      const h = ent(app.root, halo(dev), mats().glow, 0, 0, 0.3, 90);
      // what shows when a worm is in this one's head: its tail thrashing out of the top, an eye gone red
      const worm = ent(rig.head, wormM, mats().world, 0.02, 0.4, -0.03); worm.enabled = false;
      const eye = ent(app.root, halo(dev), redGlow(), 0, 0, 0.36, 91); eye.enabled = false;
      return { id: o.id, name: o.name, slot: o.slot, i, me: i === this.meIdx, b: newBody(0, 0), rig, halo: h, worm, eye, wormed: false, lungeT: 0, net: null, use: false, noise: 0, stepD: 0, wasTaut: false, hid: false, fall: false };
    });
    // the dread: how afraid this screen should be right now, and what keeps it company
    this.dreadK = 0; this.beatT = 0; this.ambT = 6 + R01() * 6; this.eyesT = 10 + R01() * 8; this.blackT = 0; this.watchers = [];
    this.wormT = 0; this.shakeOut = 0; this.lungeT = 0; this.lungeCd = 0; this.wormSafe = 0; this.latchT = 0; this.shookT = 0; this.jerkT = 0; this.jerkDir = 0; this.squirmT = 0;
    this.spool = n === 1 ? newSpool(0, 0) : null;
    this.spoolView = this.spool ? new SpoolView(app) : null;
    this.W = { open: { ...open }, plates: [], levers: [], traps: [], slabs: [], wake: 0, scream: false, wT0: {}, wl: L.waters.map((w) => w.y0), cp: Math.min(cp, L.cps.length - 1), rings: [], won: 0, phase: 'play', deaths, cut, epoch: 0, tripped, bell: {}, found: [...found], exitT: 0 };
    this.host = { slabT: {}, bellT: {}, respawnAt: 0, ringT: 0, snapT: 0, beats: L.shears.map(() => null), wormed: {}, exitT: 0, latched: {} };
    this.mon = L.monsters.map(newMonster);
    this.monViews = L.monsters.map((m) => viewFor(app, m));
    if (tripped) for (const m of this.mon) if (m.kind === 'collector') m.mode = 'down';
    cp = this.W.cp;
    this.beats = L.shears.map(() => null);
    this.bellAt = {}; this.bellMine = {};
    this.wormWas = L.worms.map(() => 0);
    this.dying = false; this.deadT = 0; this.wonT = 0; this.sendT = 0; this.noiseOut = 0; this.hintKey = null; this.useLabel = null; this.caught = -1;
    this.runT0 = runT0; this.cutT = 0; this.ended = false; this.result = null; this.leaving = false;
    this.place(cp);
    const c = L.cps[cp];
    this.cam.x = c.x + (attract ? 3.6 : 1.5); this.cam.y = c.y + 2.7; this.cam.h = attract ? 7.4 : 8.6;
    this.running = true;
    this.hud.fade(1, 0); this.hud.fade(0, 1.4);
    if (!attract) this.hud.card(c.name, cp === 0 ? this.chapterLine() : '');
    if (!attract) this.saveNow();
  }
  chapterLine() { const L = this.L; return `chapter ${L.num}  ·  ${this.n === 1 ? 'alone, with your spool' : `${this.n} bound by one thread`}`; }
  /** leave the title screen and take the first step (alone) */
  begin() { this.attract = false; this.runT0 = this.T(); this.hud.card(this.L.cps[0].name, this.chapterLine()); this.saveNow(); }
  /** where the journey stands, for the save slot (main.js decides where it goes) */
  saveNow() {
    if (this.attract || !this.W || !this.onSave) return;
    const W = this.W;
    this.onSave({ chapter: this.L.id, ci: this.ci, lantern: W.cp, deaths: W.deaths, cuts: W.cut, time: Math.round(this.T() - (this.runT0 ?? 0) + (this.timeBefore || 0)), players: this.n, found: W.found });
  }
  stop() {
    if (!this.running && !this.scene) return;
    this.running = false;
    for (const p of this.players) { p.rig.destroy(); p.halo.destroy(); p.eye.destroy(); }
    this.players = [];
    for (const w of this.watchers || []) w.e.destroy();
    this.watchers = [];
    this.wormT = 0;
    this.sfx.drone(0); this.sfx.duck(1); this.hud.dread?.(0, 0, 60);
    this.scene?.destroy(); this.scene = null;
    this.threads?.destroy(); this.threads = null;
    this.spoolView?.destroy(); this.spoolView = null;
    for (const v of this.monViews || []) v.destroy();
    this.monViews = [];
    this.fx.clear();
    this.hud.hint(null); this.hud.use(null); this.hud.tags([]);
  }
  /** everyone to the checkpoint, the thread slack between them */
  place(cp) {
    const c = this.L.cps[cp];
    this.players.forEach((p, i) => { const b = p.b; Object.assign(b, newBody(c.x - i * 0.9, c.y)); b.id = i; b.ground = true; b.facing = 1; p.net = null; p.hid = false; p.fall = false; p.rig.setVisible(true); });
    if (this.spool) { Object.assign(this.spool, newSpool(c.x - 0.9, c.y)); if (this.spoolView) this.spoolView.x = null; }
    this.threads.reset();
    this.caught = -1;
  }
  T() { return this.startedAt != null && this.net.online ? Math.max(0, (this.net.serverNow() - this.startedAt) / 1000) : this.Tlocal; }

  // ------------------------------------------------------------------ the wire
  send(type, msg) { if (this.net.online) this.net.send(type, msg); }
  intent(i) { if (this.isHost) this.hostIntent(i, this.meIdx); else this.send('i', i); }
  emit(e) { this.onEvent(e); this.send('e', e); }
  onPlayer(m) {
    if (!this.running) return;
    const p = this.players.find((q) => q.id === m.from);
    if (!p || p.me) return;
    const b = p.b, f = m.f | 0;
    p.net = { x: m.x, y: m.y, vx: m.vx, vy: m.vy, t: performance.now() };
    b.vx = m.vx; b.vy = m.vy; b.ground = !!(f & F.ground); b.braced = !!(f & F.braced); b.sneak = !!(f & F.sneak); b.facing = f & F.right ? 1 : -1;
    b.hang = !!(f & F.hang); b.mantling = !!(f & F.mantle); b.climbing = f & F.climb ? 1 : 0; b.taut = !!(f & F.taut); b.reel = m.r || 0; b.reelTo = m.rt ?? null;
    p.use = !!(f & F.use); p.noise = m.n || 0; p.dark = !!(f & F.dark);
    if (Math.hypot(b.x - m.x, b.y - m.y) > 4) { b.x = m.x; b.y = m.y; }
  }
  sendMe(dt) {
    this.sendT -= dt;
    const b = this.me.b;
    this.noiseOut = Math.max(this.noiseOut, b.noise);
    if (this.sendT > 0 || !this.net.online) return;
    this.sendT = 0.05;
    const f = (b.ground ? F.ground : 0) | (b.braced ? F.braced : 0) | (b.sneak ? F.sneak : 0) | (b.facing > 0 ? F.right : 0) | (b.hang ? F.hang : 0) | (b.mantle ? F.mantle : 0) | (this.me.use ? F.use : 0) | (b.climbing ? F.climb : 0) | (b.taut ? F.taut : 0) | (b.dark > 0 ? F.dark : 0);
    const r2 = (v) => Math.round(v * 100) / 100;
    this.send('p', { x: r2(b.x), y: r2(b.y), vx: r2(b.vx), vy: r2(b.vy), f, r: r2(b.reel), rt: b.reelTo, n: r2(this.noiseOut) });
    this.noiseOut = 0;
  }
  onSnapshot(m) {
    const W = this.W, L = this.L;
    if (m.ep !== W.epoch) return;
    for (const id of m.o) W.open[id] = true;
    W.plates = unbits(m.pl, L.plates.length); W.levers = unbits(m.lv, L.levers.length); W.traps = unbits(m.tr, L.traps.length); W.rings = unbits(m.rg, L.rings.length);
    W.slabs = m.sl; W.wake = m.wk; W.wT0 = m.w0 || {}; W.cp = Math.max(W.cp, m.cp); W.deaths = m.d;
    m.m.forEach((a, i) => { if (this.mon[i]) unpackMonster(this.mon[i], a); });
  }
  /** someone left: those who remain go on from the last lantern, with a thread cut for their number */
  onLeft(id) {
    if (!this.running || !this.isHost || this.attract) return;
    const order = this.players.filter((p) => p.id !== id).map((p) => ({ id: p.id, name: p.name, slot: p.slot }));
    if (order.length === this.players.length) return;
    this.emit({ t: 'regroup', order, chapter: this.ci, cp: this.W.cp, open: this.W.open, tripped: this.W.tripped, deaths: this.W.deaths, cut: this.W.cut, runT0: this.runT0, found: this.W.found });
  }

  // ------------------------------------------------------------------ what the host decides
  hostIntent(i, from) {
    const W = this.W, T = this.T();
    if (W.phase !== 'play') return;
    const H = this.host;
    if (i.t === 'die') {
      if (i.why === 'trap' && i.k != null) W.traps[i.k] = true;
      // a worm-ridden one reaching a friend: the friend dies, if the worm is still in there
      const who = i.why === 'possessed' ? i.victim : from;
      if (i.why === 'possessed' && !H.wormed[from]) return;
      const p = this.players[who];
      this.kill(who, i.why, p ? p.b.x : 0, p ? p.b.y : 0, i.why === 'possessed' ? from : i.k);
    } else if (i.t === 'possess') { // a worm got in (on) or was shaken out (off)
      if (!!H.wormed[from] === !!i.on) return;
      H.wormed[from] = !!i.on;
      this.emit({ t: 'possess', who: from, on: !!i.on, how: 'shook' });
    } else if (i.t === 'rip') { // a friend tears the worm out of i.k
      if (!H.wormed[i.k]) return;
      H.wormed[i.k] = false;
      this.emit({ t: 'possess', who: i.k, on: false, how: 'ripped', by: from });
    } else if (i.t === 'shake' || i.t === 'pull') { // a Drinker shaken off (by its victim) or pulled off (by a friend)
      const who = i.t === 'shake' ? from : i.k, mi = H.latched[who];
      if (mi == null) return;
      delete H.latched[who];
      unlatch(this.mon[mi]);
      this.emit({ t: 'unlatch', mi, who, by: i.t === 'pull' ? from : -1 });
    } else if (i.t === 'lunge') {
      if (H.wormed[from]) this.emit({ t: 'lunge', who: from });
    } else if (i.t === 'bell') {
      if (T - (this.host.bellT[i.k] ?? -9) < 1.2) return;
      this.host.bellT[i.k] = T;
      W.wake += 0.6;
      this.emit({ t: 'bell', k: i.k });
      if (W.wake >= 1) this.kill(-1, 'choir', 0, 0);
    }
  }
  kill(who, why, x, y, k) {
    const W = this.W;
    if (W.phase !== 'play') return;
    W.deaths++;
    if (why === 'cut') W.cut++;
    this.host.wormed = {}; this.host.latched = {};
    this.host.respawnAt = this.T() + (why === 'caged' ? 2.6 : 2.0);
    this.emit({ t: 'die', who, why, x, y, k, d: W.deaths });
  }
  hostTick(dt, T) {
    const W = this.W, L = this.L, H = this.host;
    if (W.phase === 'dead') {
      if (T >= H.respawnAt) {
        this.mon = L.monsters.map((m, i) => (m.kind === 'collector' && W.tripped ? this.mon[i] : newMonster(m)));
        H.slabT = {}; H.bellT = {}; H.ringT = 0;
        this.emit({ t: 'respawn', cp: W.cp, ep: W.epoch + 1 });
      }
      return;
    }
    if (W.phase !== 'play') return;
    // everyone who can weigh something down, or be heard
    const bodies = this.players.map((p, i) => ({ i, x: p.b.x, y: p.b.y, vx: p.b.vx, noise: p.me ? p.b.noise : p.noise, sneak: p.b.sneak, braced: p.b.braced, ground: p.b.ground, dead: p.b.dead, anchor: p.b.braced && p.b.ground, use: p.use, real: true, lit: !(p.me ? p.b.dark > 0 : p.dark) && !p.hid }));
    if (this.spool) bodies.push({ i: -1, x: this.spool.x, y: this.spool.y, vx: 0, noise: 0, sneak: true, braced: this.spool.mode === 'planted', ground: this.spool.ground || this.spool.mode === 'planted', dead: false, anchor: this.spool.mode === 'planted', use: false, real: false, flying: this.spool.mode === 'return' || this.spool.mode === 'hooked', lit: !(this.spool.dark > 0) });
    const on = (x, y, hw) => bodies.some((b) => !b.dead && !b.flying && b.ground && Math.abs(b.x - x) < hw && Math.abs(b.y - y) < 0.3);
    // plates, levers, gates
    L.plates.forEach((p, i) => { const v = on(p.x, p.y, p.w / 2 + 0.12); if (v !== !!W.plates[i]) { W.plates[i] = v; this.emit({ t: 'plate', k: i, on: v }); } });
    L.levers.forEach((l, i) => { const v = bodies.some((b) => b.real && !b.dead && b.use && Math.abs(b.x - l.x) < 1.0 && Math.abs(b.y - l.y) < 1.2); if (v !== !!W.levers[i]) { W.levers[i] = v; this.emit({ t: 'lever', k: i, on: v }); } });
    for (const g of L.gates) {
      if (W.open[g.id]) continue;
      const ps = L.plates.map((p, i) => [p, i]).filter(([p]) => p.id === g.id), ls = L.levers.map((l, i) => [l, i]).filter(([l]) => l.id === g.id);
      if (ps.length + ls.length === 0) continue;
      if (ps.every(([, i]) => W.plates[i]) && ls.every(([, i]) => W.levers[i])) { W.open[g.id] = true; this.emit({ t: 'gate', id: g.id }); }
    }
    // the next lantern
    const next = L.cps[W.cp + 1];
    if (next && bodies.some((b) => b.real && !b.dead && b.x >= next.x - 0.6 && Math.abs(b.y - next.y) < 3)) { W.cp++; this.emit({ t: 'cp', k: W.cp }); }
    // the water comes in once someone is well inside
    for (const w of L.waters) if (w.trigger != null && W.wT0[w.id] == null && bodies.some((b) => b.real && !b.dead && b.x > w.trigger && b.x < w.x1 && b.y < w.floor + 7)) { W.wT0[w.id] = T; this.emit({ t: 'flood', id: w.id }); }
    // the way on: everyone still standing through the arch
    if (L.exit && !this.ended) {
      const live = bodies.filter((b) => b.real && !b.dead);
      if (live.length && live.every((b) => b.x >= L.exit.x - 0.3)) { H.exitT += dt; if (H.exitT > 0.6) { W.phase = 'leaving'; (window.__trace ||= []).push(`exit ${L.id} T=${T.toFixed(1)} ${live.map((b) => b.x.toFixed(1)).join(',')} ex=${L.exit.x}`); this.emit({ t: 'chapter', ci: this.ci + 1, d: W.deaths, cut: W.cut, found: W.found }); } } else H.exitT = 0;
    }
    // glass: too many on one slab and it goes
    L.slabs.forEach((s, i) => {
      const st = W.slabs[i] || 0;
      if (st === 0) { const c = bodies.filter((b) => !b.dead && !b.flying && b.ground && b.x > s.x0 - 0.1 && b.x < s.x1 + 0.1 && Math.abs(b.y - s.y) < 0.25).length; if (c > s.cap) { W.slabs[i] = 1; H.slabT[i] = T; this.emit({ t: 'crack', k: i }); } }
      else if (st === 1 && T - H.slabT[i] > 0.7) { W.slabs[i] = 2; this.emit({ t: 'shatter', k: i }); }
    });
    W.wake = Math.max(0, W.wake - 0.04 * dt);
    // shears: a thread across the blades when they shut is a thread cut
    L.shears.forEach((s, i) => {
      const beat = shearsBeat(s, T);
      if (H.beats[i] !== null && beat !== H.beats[i]) {
        const chain = bodies.filter((b) => b.real || !b.flying);
        for (let k = 0; k < chain.length - 1; k++) { const a = chain[k], b = chain[k + 1]; if ((a.x - s.x) * (b.x - s.x) < 0 && Math.abs(a.x - s.x) > 0.5 && Math.abs(b.x - s.x) > 0.5 && Math.min(a.y, b.y) < s.y + 6) { this.kill(-1, 'cut', s.x, s.y + 1); break; } }
      }
      H.beats[i] = beat;
    });
    // the hunters
    this.mon.forEach((m, mi) => {
      for (const e of thinkMonster(m, dt, bodies, L)) {
        if (e.t === 'stab') this.emit({ t: 'stab', x: e.x, mi });
        else if (e.t === 'grab') { if (e.i >= 0) { const p = this.players[e.i]; this.kill(e.i, 'caged', p.b.x, p.b.y, mi); } }
        else if (e.t === 'trip') this.emit({ t: 'trip', mi, x: e.x });
        else if (e.t === 'crash') { W.tripped = true; const g = L.monsters[mi].gate; if (g) W.open[g] = true; this.emit({ t: 'crash', mi, x: e.x }); if (g) this.emit({ t: 'gate', id: g }); }
        else if (e.t === 'hear') this.emit({ t: 'hear', mi });
        else if (e.t === 'latch') { H.latched[e.i] = mi; this.emit({ t: 'latch', mi, who: e.i }); }
        else if (e.t === 'drained') { delete H.latched[e.i]; const p = this.players[e.i]; if (p) this.kill(e.i, 'drained', p.b.x, p.b.y, mi); }
        else if (e.t === 'burn' || e.t === 'ash') this.emit({ t: e.t, mi, x: e.x, y: e.y });
      }
    });
    // the spindle: every ring stood in at once
    L.rings.forEach((r, i) => { W.rings[i] = on(r.x, r.y, 0.8); });
    if (L.rings.length && L.rings.every((r, i) => W.rings[i])) { H.ringT += dt; if (H.ringT > 1.1) { W.phase = 'won'; this.emit({ t: 'win', time: T - (this.runT0 ?? 0), d: W.deaths, cut: W.cut }); } } else H.ringT = 0;
    // tell the others how the world stands
    H.snapT -= dt;
    if (H.snapT <= 0 && this.net.online) {
      H.snapT = 0.1;
      this.send('s', { ep: W.epoch, o: Object.keys(W.open).filter((k) => W.open[k]), pl: bits(W.plates), lv: bits(W.levers), tr: bits(W.traps), rg: bits(W.rings), sl: W.slabs, wk: Math.round(W.wake * 100) / 100, w0: W.wT0, cp: W.cp, d: W.deaths, m: this.mon.map(packMonster) });
    }
  }

  // ------------------------------------------------------------------ what everyone sees happen
  onEvent(e) {
    const W = this.W, L = this.L, sfx = this.sfx, fx = this.fx;
    switch (e.t) {
      case 'plate': W.plates[e.k] = e.on; sfx.play(e.on ? 'plate' : 'plateUp', { x: L.plates[e.k].x }); break;
      case 'lever': W.levers[e.k] = e.on; sfx.play('lever', { x: L.levers[e.k].x }); break;
      case 'gate': { W.open[e.id] = true; const g = L.gates.find((q) => q.id === e.id); if (g) { sfx.play('gate', { x: g.x }); fx.burst('dust', g.x + 0.35, g.y + 0.2, 0.5, 10, { spread: 1.2 }); fx.shake(0.35); } break; }
      case 'cp': W.cp = Math.max(W.cp, e.k); { const c = L.cps[e.k]; sfx.play('chime', { x: c.x }); fx.burst('ember', c.x - 0.54, c.y + 1.5, -1.2, 10); this.hud.card(c.name, ''); } this.saveNow(); break;
      case 'flood': W.wT0[e.id] = W.wT0[e.id] ?? this.T(); sfx.play('water'); fx.shake(0.3); break;
      case 'crack': W.slabs[e.k] = 1; sfx.play('crackle', { x: L.slabs[e.k].x0 + 1.3 }); break;
      case 'shatter': { W.slabs[e.k] = 2; const s = L.slabs[e.k]; sfx.play('glass', { x: s.x0 + 1.3 }); for (let x = s.x0 + 0.3; x < s.x1; x += 0.6) fx.burst('glass', x, s.y - 0.1, 0, 5, { spread: 0.7 }); break; }
      case 'bell': { this.bellAt[e.k] = this.T(); const b = L.bells[e.k]; sfx.play(b.kind === 'hang' ? 'bell' : 'tinybell', { x: b.x }); W.wake = Math.max(W.wake, 0.6); break; }
      case 'stab': { const m = this.mon[e.mi]; sfx.play('stab', { x: e.x }); fx.shake(0.4); fx.burst('dust', e.x, m.y - 4.1, 0.3, 8, { spread: 1 }); const b = this.me?.b; if (b && !b.dead && !this.dying && W.phase === 'play' && Math.abs(b.x - e.x) < 0.8 && b.y < m.y - 1 && b.y > m.y - 5.2) this.die('crawler'); break; }
      case 'hear': { // it heard you: the scare
        const m = this.mon[e.mi];
        sfx.play(m.kind === 'crawler' ? 'skitter' : 'groan', { x: m.x });
        if (!this.attract && Math.abs(m.x - this.cam.x) < 20) {
          if (m.kind === 'crawler') { sfx.play('shriek', { x: m.x }); fx.shake(0.75); this.hud.flash('#fff', 0.32, 70); this.blackT = 0.9; }
          else { sfx.play('roar', { x: m.x }); fx.shake(0.65); this.hud.flash('#3a0000', 0.45, 160); this.blackT = 0.5; }
        }
        break;
      }
      case 'possess': {
        const p = this.players[e.who];
        if (!p) break;
        p.wormed = e.on; p.lungeT = 0;
        const [hx, hy] = [p.b.x, p.b.y + 1.0];
        if (e.on) { sfx.play('burrow', { x: hx }); fx.burst('ink', hx, hy, 0.3, 14, { power: 0.9 }); if (p.me) { fx.shake(0.8); this.hud.flash('#5a0000', 0.6, 220); } }
        else {
          sfx.play('rip', { x: hx }); fx.burst('ink', hx, hy + 0.2, 0.3, 18, { power: 1.2, dir: [0, 1.2, 0] });
          if (p.me) { this.wormT = 0; this.shakeOut = 0; this.lungeT = 0; this.wormSafe = 1.6; this.hud.flash('#fff', 0.25, 60); }
          if (e.how === 'ripped') { const by = this.players[e.by]; this.hud.toast(`${by ? by.name : 'Someone'} tore the worm out of ${p.name}.`); }
        }
        break;
      }
      case 'latch': { const p = this.players[e.who]; if (!p) break; p.latched = e.mi; sfx.play('slurp', { x: p.b.x }); fx.burst('dye', p.b.x, p.b.y + 0.9, 0.3, 6, { power: 0.6 }); if (p.me) { this.latchT = 0.001; this.shakeOut = 0; fx.shake(0.6); this.hud.flash('#5a0000', 0.5, 160); } break; }
      case 'unlatch': { const p = this.players[e.who]; if (!p) break; p.latched = null; sfx.play('rip', { x: p.b.x }); if (p.me) { this.latchT = 0; this.shakeOut = 0; this.wormSafe = 1.2; } if (e.by >= 0) { const by = this.players[e.by]; this.hud.toast(`${by ? by.name : 'Someone'} tore the Drinker off ${p.name}.`); } break; }
      case 'burn': sfx.play('burst', { x: e.x }); sfx.play('flame', { x: e.x }); fx.burst('ember', e.x, e.y, 0.3, 24, { power: 1.4 }); fx.burst('ink', e.x, e.y, 0.3, 14, { power: 1.2 }); if (this.mon[e.mi]?.full > 0.2) fx.burst('dye', e.x, e.y, 0.3, 12); fx.shake(0.35); break;
      case 'ash': fx.burst('dust', e.x, e.y, 0.3, 8, { spread: 1 }); break;
      case 'lunge': { const p = this.players[e.who]; if (p) { p.lungeT = 0.01; sfx.play('lunge', { x: p.b.x }); } break; }
      case 'trip': sfx.play('groan', { x: e.x }); sfx.play('twang', { x: e.x, vol: 2 }); break;
      case 'crash': W.tripped = true; { const g = L.monsters[e.mi]?.gate; if (g) W.open[g] = true; } sfx.play('crash', { x: e.x }); fx.shake(1); for (let i = 0; i < 6; i++) fx.burst('dust', e.x - 3 + i * 1.2, this.mon[e.mi].y + 0.3, 0.6, 6, { spread: 1.4 }); break;
      case 'die': this.onDie(e); break;
      case 'respawn': this.onRespawn(e); break;
      case 'win': W.phase = 'won'; this.wonT = 0; this.result = e; sfx.play('win'); break;
      case 'chapter': this.onChapter(e); break;
      case 'regroup': if (!this.isHost || e.order.length !== this.players.length) this.start({ order: e.order, meId: this.net.id, startedAt: this.startedAt, chapter: e.chapter, cp: e.cp, open: e.open, tripped: e.tripped, deaths: e.deaths, cut: e.cut, runT0: e.runT0, found: e.found }); this.hud.toast(e.order.length === 1 ? 'You go on alone, with a spool.' : 'One of you is gone. The thread is retied.'); break;
      default: break;
    }
  }
  /** everyone walked through the arch: the card between chapters, then the next chapter, built for us */
  onChapter(e) {
    if (this.leaving) return;
    this.leaving = true;
    this.W.phase = 'leaving';
    const next = e.ci, C = CHAPTERS[next];
    this.sfx.play('chime');
    this.hud.fade(1, 1.2);
    this.hud.hint(null); this.hud.use(null);
    if (!C) return;
    const keep = { order: this.order, meId: this.net.online ? this.net.id : this.order[this.meIdx].id, startedAt: this.startedAt, chapter: next, deaths: e.d ?? this.W.deaths, cut: e.cut ?? this.W.cut, runT0: this.runT0, found: e.found || this.W.found };
    this.onSave?.({ chapter: C.id, ci: next, lantern: 0, deaths: keep.deaths, cuts: keep.cut, time: Math.round(this.T() - (this.runT0 ?? 0) + (this.timeBefore || 0)), players: this.n, found: keep.found });
    const was = this.L.card || CHAPTERS[this.ci].card;
    this.hud.between({ num: C.num, name: C.name, lines: was }, () => { if (this.running && this.leaving) { this.leaving = false; this.start(keep); } });
  }
  die(why, k) { if (this.dying || this.W.phase !== 'play' || this.attract) return; this.dying = true; this.intent({ t: 'die', why, k }); }
  onDie(e) {
    const W = this.W, sfx = this.sfx, fx = this.fx, L = this.L;
    if (W.phase !== 'play') return;
    W.phase = 'dead'; W.deaths = e.d; this.deadT = 0; this.dying = true; this.lastWhy = e.why;
    const victims = e.who < 0 ? this.players : [this.players[e.who]].filter(Boolean);
    for (const p of victims) {
      const b = p.b;
      b.dead = true; b.braced = false; b.hang = false; b.mantle = null;
      const x = b.x, y = b.y;
      switch (e.why) {
        case 'worm': sfx.play('crunch', { x }); break;
        case 'trap': if (e.k != null) W.traps[e.k] = true; sfx.play('trap', { x }); fx.burst('spark', x, y + 0.2, 0, 6); break;
        case 'caged': b.dead = false; b.caged = true; this.caught = p.i; this.caughtBy = e.k ?? 0; sfx.play('grunt', { x }); break;
        case 'water': sfx.play('splash', { x }); break;
        case 'shears': sfx.play('snip', { x }); break;
        case 'possessed': sfx.play('stab', { x }); sfx.play('crunch', { x }); break;
        case 'taken': sfx.play('taken', { x }); break;
        default: break;
      }
      // the doll stops being a doll: a body, where it fell, for the rest of the chapter
      if (e.why !== 'caged' && e.why !== 'retry' && !p.hid) {
        const wi = L.waters.findIndex((w) => x > w.x0 && x < w.x1 && W.wl[w.i] > y);
        this.gore.spawn({ x, y, facing: b.facing, vx: b.vx, vy: b.vy, variant: p.slot, why: e.why === 'worm' ? 'taken' : e.why, solids: L.solids, open: (s) => this.space.open(s), fx, level: wi >= 0 ? W.wl[wi] : null });
        p.hid = true;
        if (e.why === 'fell' || e.why === 'water') { /* the body goes on, the camera stays */ }
      }
      b.vx = 0; if (!p.fall) b.vy = 0;
    }
    if (e.why === 'possessed') { const k = this.players[e.k], v = victims[0]; if (k && v) this.hud.toast(`The worm in ${k.name} killed ${v.name}.`); }
    for (const p of this.players) { p.wormed = false; p.lungeT = 0; p.latched = null; }
    this.wormT = 0; this.shakeOut = 0; this.lungeT = 0; this.latchT = 0;
    this.hud.flash('#4a0000', 0.55, 180);
    sfx.play('sting', { x: victims[0]?.b.x });
    if (e.why === 'cut') { sfx.play('snip', { x: e.x }); fx.burst('ember', e.x, e.y, 0.3, 26, { power: 1.6 }); this.cutT = 0.01; }
    if (e.why === 'choir') { W.scream = true; sfx.play('scream'); fx.shake(0.8); }
    sfx.play('die', { x: victims[0]?.b.x });
    fx.shake(0.5);
    this.hud.fade(1, 0.9, e.why === 'caged' ? 1.6 : 1.0);
    this.hud.hint(null);
  }
  onRespawn(e) {
    const W = this.W;
    W.epoch = e.ep; W.cp = e.cp; W.phase = 'play'; W.traps = []; W.slabs = []; W.wake = 0; W.scream = false; W.wT0 = {}; W.plates = []; W.levers = []; W.rings = [];
    this.bellAt = {}; this.bellMine = {}; this.dying = false; this.cutT = 0;
    for (const p of this.players) { p.wormed = false; p.lungeT = 0; p.latched = null; p.b.dark = 0; }
    this.wormT = 0; this.shakeOut = 0; this.lungeT = 0; this.wormSafe = 1; this.latchT = 0;
    if (this.spool) this.spool.dark = 0;
    if (!this.isHost) this.mon = this.L.monsters.map((m, i) => (m.kind === 'collector' && W.tripped ? this.mon[i] : newMonster(m)));
    this.place(e.cp);
    const c = this.L.cps[e.cp];
    this.cam.x = c.x + 1.5; this.cam.y = c.y + 2.7;
    this.fx.clear();
    this.hud.fade(0, 0.7);
  }

  // ------------------------------------------------------------------ a frame
  frame(dt) {
    if (!this.running) return;
    const { input, W, L, space } = this;
    input.poll();
    const live = !(this.paused && !this.net.online);
    if (live) this.Tlocal += dt;
    this.time += dt;
    const T = this.T();
    const me = this.me, b = me.b;
    if (live) {
      for (const s of L.slabs) s.broken = (W.slabs[s.i] || 0) === 2;
      L.waters.forEach((w, i) => { W.wl[i] = waterLevel(w, W.wT0[w.id], T); });
      space.begin(T, W.open, this.bridges());
      // ---- me
      const can = W.phase === 'play' && !this.attract && !this.paused && (this.startedAt == null || T > 0);
      const hanging = b.hang;
      let inp = can ? { x: input.dirX, y: input.dirY, jump: input.tap('jump') || (!hanging && input.tap('up') && !this.input.touch.y), jumpHeld: input.held('jump') || input.held('up'), brace: input.held('brace'), sneak: input.dirY < 0 } : NONE;
      this.wormSafe = Math.max(0, this.wormSafe - dt);
      if (can && this.wormT > 0 && !b.dead) inp = this.ridden(dt, T) || inp;
      if (can && this.latchT > 0 && !b.dead) inp = this.drunk(dt);
      // close to a friend with a worm in them: USE tears it out
      if (can && this.wormT <= 0 && !b.dead && input.tap('use')) { const f = this.players.find((p) => !p.me && p.wormed && !p.b.dead && Math.abs(p.b.x - b.x) < 1.3 && Math.abs(p.b.y - b.y) < 1.4); if (f) this.intent({ t: 'rip', k: f.i }); else { const g = this.players.find((p) => !p.me && p.latched != null && !p.b.dead && Math.abs(p.b.x - b.x) < 1.4 && Math.abs(p.b.y - b.y) < 1.5); if (g) this.intent({ t: 'pull', k: g.i }); } }
      const links = W.phase === 'play' ? this.linksFor(this.meIdx) : [];
      if (b.dead || b.caged) this.deadBody(me, dt);
      else stepPlayer(b, inp, dt, space, links);
      this.mud(b, dt);
      if (this.spool) this.stepSpoolAll(dt, can);
      me.use = can && input.held('use') && this.nearLever(b) >= 0;
      // ---- the others, eased toward where they say they are
      const now = performance.now();
      for (const p of this.players) {
        if (p.me) continue;
        const q = p.b;
        if (q.dead || q.caged) { this.deadBody(p, dt); continue; }
        if (!p.net) continue;
        const age = Math.min(0.2, (now - p.net.t) / 1000);
        const tx = p.net.x + p.net.vx * age, ty = p.net.y + (q.ground ? 0 : p.net.vy * age);
        const k = Math.min(1, dt * 16);
        q.x += (tx - q.x) * k; q.y += (ty - q.y) * k;
      }
      if (can) this.dangers(T);
      if (this.isHost && !this.attract) this.hostTick(dt, T);
      if (!this.attract) this.sendMe(dt);
      this.prompts(can);
    }
    this.draw(dt, T, live);
    input.endFrame();
  }

  /** what my thread is tied to */
  linksFor(i) {
    if (this.spool) { const s = this.spool; return s.mode === 'return' ? [] : [{ id: 'spool', x: s.x, y: s.y, waist: s.waist, reel: 0, fixed: s.mode !== 'follow', light: s.mode === 'follow', ground: s.ground, braced: false }]; }
    const out = [];
    for (const j of [i - 1, i + 1]) { const p = this.players[j]; if (p && !p.b.dead) out.push(p.b); }
    return out;
  }
  /** a thread pulled tight between two who are braced is a rope the rest can walk */
  bridges() {
    const out = [];
    if (this.n < 3) return out;
    for (let i = 0; i < this.n - 1; i++) {
      if (i === this.meIdx || i + 1 === this.meIdx) continue;
      const a = this.players[i].b, c = this.players[i + 1].b;
      if (!(a.braced && a.ground && c.braced && c.ground) || Math.abs(a.x - c.x) < 3) continue;
      const [l, r] = a.x < c.x ? [a, c] : [c, a];
      out.push({ id: `t${i}`, x0: l.x, x1: r.x, y0: l.y + WAIST, y1: r.y + WAIST, vx: 0, vy: 0 });
    }
    return out;
  }
  nearLever(b) { return this.L.levers.findIndex((l) => !this.W.open[l.id] && Math.abs(b.x - l.x) < 0.95 && Math.abs(b.y - l.y) < 1.2); }
  nearHook(b) { return this.L.hooks.find((h) => Math.hypot(b.x - h.x, b.y + 0.6 - h.y) < 2.9); }

  stepSpoolAll(dt, can) {
    const s = this.spool, b = this.me.b, sfx = this.sfx;
    if (can && this.input.tap('use') && this.nearLever(b) < 0 && !b.dead) {
      if (s.mode === 'follow') {
        const h = this.nearHook(b);
        if (h) { s.mode = 'hooked'; s.x = h.x; s.y = h.y; s.waist = 0; s.vx = s.vy = 0; sfx.play('hook', { x: h.x }); }
        else if (b.ground && !b.braced) { s.mode = 'planted'; s.x = b.x; s.y = b.y; s.waist = 0.2; s.vx = s.vy = 0; s.ground = true; sfx.play('plate', { x: b.x }); }
      } else if (s.mode !== 'return') { s.mode = 'return'; s.x0 = s.x; s.y0 = s.y; s.t = 0; s.waist = 0.2; sfx.play('reel', { x: s.x }); }
    }
    stepSpool(s, dt, this.space, b);
  }

  deadBody(p, dt) {
    const b = p.b;
    if (b.caged) { const v = this.monViews[this.caughtBy]; if (v && v.hand) { const [hx, hy] = v.hand(); b.x += (hx - b.x) * Math.min(1, dt * 12); b.y += (hy - b.y) * Math.min(1, dt * 12); } return; }
    if (p.fall) { b.vy = Math.max(-30, b.vy - GRAV * dt); b.y += b.vy * dt; }
  }

  /** a worm has got into my head */
  possessMe() {
    if (this.wormT > 0 || this.wormSafe > 0 || this.dying) return;
    this.wormT = 0.001; this.shakeOut = 0; this.lungeT = 0; this.lungeCd = 1.0; this.jerkT = 0;
    this.me.wormed = true;
    this.intent({ t: 'possess', on: true });
  }
  /**
   * While it rides me: it walks me (at the nearest friend, or alone, about), I fight it by hammering
   * jump. Returns the input it gives in place of mine, or null once it is out.
   */
  ridden(dt, T) {
    const b = this.me.b, input = this.input, sfx = this.sfx;
    this.wormT += dt;
    if (input.tap('jump') || (this.input.touch && input.tap('up'))) { this.shakeOut += 0.13; sfx.play('squirm', { x: b.x, vol: 1 }); this.fx.shake(0.18); this.fx.burst('ink', b.x, b.y + 1.0, 0.3, 2, { power: 0.4 }); }
    this.shakeOut = Math.max(0, this.shakeOut - 0.16 * dt);
    if (this.shakeOut >= 1) { this.wormT = 0; this.wormSafe = 1.6; this.intent({ t: 'possess', on: false }); return null; }
    if ((this.squirmT -= dt) <= 0) { this.squirmT = 0.5 + R01() * 0.7; sfx.play('squirm', { x: b.x, vol: 0.6 }); }
    if (this.wormT > (this.n > 1 ? TAKES_TOGETHER : TAKES_ALONE)) { this.wormT = 0; this.die('taken'); return null; }
    // whom it wants
    let prey = null, pd = Infinity;
    for (const p of this.players) { if (p.me || p.hid || p.b.dead) continue; const d = Math.abs(p.b.x - b.x) + Math.abs(p.b.y - b.y) * 0.5; if (d < pd) { pd = d; prey = p; } }
    let x = 0;
    if (prey) x = Math.abs(prey.b.x - b.x) > 0.45 ? Math.sign(prey.b.x - b.x) : 0;
    else { if ((this.jerkT -= dt) <= 0) { this.jerkT = 0.2 + R01() * 0.45; this.jerkDir = [-1, 0, 1, 1, -1][Math.floor(R01() * 5)]; } x = this.jerkDir; }
    // close enough: it winds up and strikes through me
    this.lungeCd = Math.max(0, this.lungeCd - dt);
    if (prey && this.lungeT <= 0 && this.lungeCd <= 0 && Math.abs(prey.b.x - b.x) < 0.9 && Math.abs(prey.b.y - b.y) < 1.2) { this.lungeT = 0.001; this.intent({ t: 'lunge' }); }
    if (this.lungeT > 0) {
      this.lungeT += dt; x = 0;
      if (this.lungeT > 0.55) {
        this.lungeT = 0; this.lungeCd = 1.1;
        if (prey && !prey.b.dead && Math.abs(prey.b.x - b.x) < 1.05 && Math.abs(prey.b.y - b.y) < 1.3) this.intent({ t: 'die', why: 'possessed', victim: prey.i });
      }
    }
    return { x, y: 0, jump: false, jumpHeld: false, brace: false, sneak: false };
  }

  /** a Drinker is on me: I can't move; I hammer JUMP to shake it (a friend can tear it off) */
  drunk(dt) {
    const b = this.me.b, input = this.input;
    this.latchT += dt;
    if (input.tap('jump') || (input.touch && input.tap('up'))) { this.shakeOut += 0.14; this.sfx.play('squirm', { x: b.x, vol: 1 }); this.fx.shake(0.2); this.fx.burst('dye', b.x, b.y + 0.8, 0.3, 2, { power: 0.5 }); }
    this.shakeOut = Math.max(0, this.shakeOut - 0.15 * dt);
    if (this.shakeOut >= 1 && !this.shookT) { this.shookT = 0.5; this.intent({ t: 'shake' }); }
    this.shookT = Math.max(0, (this.shookT || 0) - dt);
    if ((this.slurpT = (this.slurpT || 0) - dt) <= 0) { this.slurpT = 0.9; this.sfx.play('slurp', { x: b.x, vol: 0.7 }); }
    return NONE;
  }
  /** creeping through mud smothers the thread's glow (and the spool's, if it is with you) for a while */
  mud(b, dt) {
    const inMud = b.sneak && b.ground && !b.dead && this.L.mud.some((m) => b.x > m.x0 && b.x < m.x1 && Math.abs(b.y - m.y) < 0.35);
    if (inMud) { if (!(b.dark > 1)) { this.sfx.play('squelch', { x: b.x }); this.fx.burst('dust', b.x, b.y + 0.2, 0.3, 4, { power: 0.5 }); } b.dark = 6; }
    else b.dark = Math.max(0, (b.dark || 0) - dt);
    if (this.spool) { if (inMud && this.spool.mode === 'follow') this.spool.dark = 6; else this.spool.dark = Math.max(0, (this.spool.dark || 0) - dt); }
  }
  /** the things that can end me */
  dangers(T) {
    const { L, W } = this, b = this.me.b;
    if (b.dead || this.dying) return;
    const h = b.sneak ? HT_LOW : HT;
    for (const k of L.kill) if (b.x > k.x0 && b.x < k.x1 && b.y < k.y1 && b.y > k.y0) return this.die(k.why);
    for (let i = 0; i < L.traps.length; i++) { const t = L.traps[i]; if (!W.traps[i] && b.ground && Math.abs(b.x - t.x) < 0.4 && Math.abs(b.y - t.y) < 0.15) return this.die('trap', i); }
    for (const w of L.worms) {
      if (Math.abs(b.x - w.x) > 0.44) continue;
      const out = wormOut(w, T);
      if (out < 0.3) continue;
      // it doesn't kill you: it gets in
      if (w.dir > 0 ? b.y < w.y + w.len * out - 0.1 && b.y + h > w.y : b.y + h > w.y - w.len * out + 0.1 && b.y < w.y) { this.possessMe(); break; }
    }
    for (let i = 0; i < L.waters.length; i++) { const w = L.waters[i]; if (w.kind === 'race' && b.x > w.x0 && b.x < w.x1 && W.wl[i] > b.y + 0.95 && b.y < w.y1) return this.die('water'); if (w.kind === 'bog' && b.x > w.x0 && b.x < w.x1 && b.y < W.wl[i] - 0.25) return this.die('water'); }
    for (let i = 0; i < L.shears.length; i++) {
      const s = L.shears[i], beat = shearsBeat(s, T);
      if (this.beats[i] !== null && beat !== this.beats[i]) { this.sfx.play('snip', { x: s.x }); if (Math.abs(b.x - s.x) < 0.5 && b.y < s.y + 3.4 && b.y > s.y - 1) { this.beats[i] = beat; return this.die('shears'); } }
      this.beats[i] = beat;
    }
    for (let i = 0; i < L.bells.length; i++) {
      const bl = L.bells[i];
      const hit = bl.kind === 'hang' ? Math.abs(b.x - bl.x) < 0.36 && b.y + h > bl.y + 0.92 && b.y < bl.y + 1.6 : Math.abs(b.x - bl.x) < 0.5 && b.y < bl.y + 0.28 && b.y > bl.y - 0.5;
      if (hit && T - (this.bellMine[i] ?? -9) > 1.3) { this.bellMine[i] = T; this.intent({ t: 'bell', k: i }); }
    }
    return null;
  }

  /** the one line of help at the bottom, and what USE would do */
  prompts(can) {
    const { L, hud } = this, b = this.me.b;
    let key = null, use = null, vars = {};
    if (can && !b.dead) {
      for (const hnt of L.hints) if (b.x >= hnt.x0 && b.x <= hnt.x1) key = hnt.text;
      // tied on both sides (the middle of three or four), you climb toward whichever side you push
      if (b.hang && (key === 'chasm' || key === 'chasm1' || !key)) key = this.meIdx > 0 && this.meIdx < this.n - 1 ? 'hangMid' : 'hang';
      key = this.collectorHint(b) || key;
      if (this.latchT > 0) key = 'latched';
      else if (this.wormT > 0) key = 'wormed';
      else { const f = this.players.find((p) => !p.me && p.wormed && Math.abs(p.b.x - b.x) < 9); if (f) { key = 'friendWormed'; vars = { name: f.name }; } const g = this.players.find((p) => !p.me && p.latched != null && Math.abs(p.b.x - b.x) < 9); if (g) { key = 'friendLatched'; vars = { name: g.name }; } }
      if (this.nearLever(b) >= 0) use = 'HOLD';
      else if (this.spool) use = this.spool.mode === 'follow' ? (this.nearHook(b) ? 'HANG' : b.ground ? 'SET' : null) : this.spool.mode === 'return' ? null : 'CALL';
    }
    const hk = key ? `${key}:${vars.name || ''}` : null;
    if (hk !== this.hintKey) { this.hintKey = hk; hud.hint(key, vars); }
    if (use !== this.useLabel) { this.useLabel = use; hud.use(use); }
  }
  /** at the Collector, say what is wrong with the line you are making, and what to do next */
  collectorHint(b) {
    const { L, W } = this, k = L.monsters.find((m) => m.kind === 'collector');
    if (!k || W.tripped || b.x < k.x0 - 6 || b.x > k.x1 + 8) return null;
    const m = this.mon.find((q) => q.kind === 'collector');
    // its hands are near: that comes before anything (loose: hold fast; holding: keep holding till it is past)
    const near = m && (m.mode === 'pace' || m.mode === 'hunt') && Math.abs(m.x - b.x) < 3.2;
    if (near && !b.braced) return 'kNear';
    if (b.x > k.x1 + 1.5) return near ? 'kStill' : this.spool ? 'kShut' : 'kShutAll'; // walked past it: the way out is shut
    if (b.x < k.x0 - 1) return near ? 'kStill' : null; // the area's own hint, on the way in
    const still = (h) => (near && h !== 'kHold' && h !== 'kHoldAll' ? 'kStill' : h);
    return still(this.lineHint(b, k));
  }
  lineHint(b, k) {
    let lo, hi;
    if (this.spool) {
      const s = this.spool;
      if (s.mode === 'follow') return 'kSet';
      if (s.mode !== 'planted') return null;
      if (Math.abs(b.x - s.x) < 2.6) return 'kShort';
      lo = Math.min(b.x, s.x); hi = Math.max(b.x, s.x);
    } else {
      const xs = this.players.filter((p) => !p.b.dead).map((p) => p.b.x);
      lo = Math.min(...xs); hi = Math.max(...xs);
      if (hi - lo < 2.6) return 'kShortAll';
    }
    if (hi < k.x0 + 1 || lo > k.x1 - 1) return 'kOut'; // stretched where it never walks
    if (this.spool) return b.braced ? 'kHold' : 'kBrace';
    return b.braced ? 'kHoldAll' : 'kBraceAll';
  }

  // ------------------------------------------------------------------ drawing
  draw(dt, T, live) {
    const { W, L, R, fx, sfx, scene } = this;
    const me = this.me, time = this.time;
    // ---- world state for the scene
    W.won = W.phase === 'won' ? Math.min(1, (this.wonT += dt) / 3.5) : 0;
    const bell = {};
    for (const k in this.bellAt) bell[k] = T - this.bellAt[k];
    W.bell = bell;
    W.meX = this.attract ? null : me.b.x;
    scene.update(dt, T, W);
    // lanterns gutter when the dread is high, and all but go out when something hears you
    this.blackT = Math.max(0, this.blackT - dt);
    const gut = (this.blackT > 0 ? 0.12 + 0.88 * (1 - Math.min(1, this.blackT / 0.5)) ** 2 : 1);
    const lights = this.attract ? scene.lit.slice() : scene.lit.map((l, i) => ({ ...l, k: l.k * gut * (this.dreadK > 0.45 ? 0.7 + 0.3 * Math.abs(Math.sin(time * (11 + i * 3.7)) * Math.sin(time * 4.1 + i)) : 1) }));
    // ---- the wanderers
    for (const p of this.players) {
      const b = p.b;
      let anim = 'walk';
      if (p.lungeT > 0) { p.lungeT += dt; if (p.lungeT > 0.6) p.lungeT = 0; }
      const lunging = p.lungeT > 0 || (p.me && this.lungeT > 0);
      if (b.dead) anim = 'dead'; else if (b.caged) anim = 'fear'; else if (lunging) anim = 'lunge'; else if (p.wormed && b.ground && !b.hang) anim = 'possessed'; else if (b.mantle || b.mantling) anim = 'haul'; else if (b.braced) anim = 'brace'; else if (b.hang) anim = b.climbing ? 'ropeclimb' : 'hang'; else if (!b.ground) anim = 'air';
      p.rig.setVisible(!p.hid);
      let rx = b.x, ry = b.y, tilt = 0;
      if (b.hang && !b.dead) { const o = this.anchorOf(p); if (o) { tilt = clamp(Math.atan2(-(o[0] - b.x), o[1] - (b.y + WAIST)) * 0.75, -0.9, 0.9); rx = b.x + Math.sin(tilt) * WAIST; ry = b.y + WAIST - Math.cos(tilt) * WAIST; } }
      p.tilt = (p.tilt || 0) + (tilt - (p.tilt || 0)) * Math.min(1, dt * 10);
      p.rig.pose(dt, { x: rx, y: ry, z: 0, facing: b.facing, speed: Math.abs(b.vx) / SCALE, vx: b.vx, vy: b.vy, crouch: b.sneak, anim, t: time + p.i * 1.7, noShadow: true });
      if (Math.abs(p.tilt) > 0.01) p.rig.root.rotate(0, 0, p.tilt * 57.3);
      const kx = b.x, ky = b.y + (b.sneak ? 0.36 : WAIST);
      const dark = p.me ? b.dark > 0 : !!p.dark;
      p.halo.enabled = !p.hid && !dark;
      p.halo.setLocalPosition(kx, ky, 0.3);
      const hs = 0.27 + Math.sin(time * 6 + p.i * 2) * 0.02 + (b.braced ? 0.25 : 0);
      p.halo.setLocalScale(hs, hs, hs);
      // a worm in the head: its tail thrashes out of the top, the eye goes red, the glow sours
      const ridden = p.wormed && !b.dead && !p.hid;
      if (p.worm.enabled !== ridden) p.worm.enabled = ridden;
      if (p.eye.enabled !== ridden) p.eye.enabled = ridden;
      if (ridden) {
        p.worm.setLocalEulerAngles(Math.sin(time * 13 + p.i) * 38, 0, Math.sin(time * 9.3) * 46 + Math.sin(time * 27) * 10);
        const sy = 1 + Math.sin(time * 17) * 0.25; p.worm.setLocalScale(1, sy, 1);
        const es = 0.075 + Math.sin(time * 31) * 0.015 + (lunging ? 0.06 : 0);
        p.eye.setLocalPosition(b.x + b.facing * 0.13, b.y + (b.sneak ? 0.62 : 0.98), 0.36); p.eye.setLocalScale(es, es, es);
        p.halo.enabled = false;
        lights.push({ x: kx, y: ky + 0.3, z: 0.9, r: 2.4 + Math.sin(time * 23) * 0.5, col: RED, k: 1.4, pri: p.me ? 3 : 1 });
      } else if (!p.hid && !dark) lights.push({ x: kx, y: ky + 0.1, z: 0.9, r: 3.0 + (b.braced ? 1 : 0), col: AMBER, k: 1.0, pri: p.me ? 3 : 1 });
      else if (!p.hid && p.me) lights.push({ x: kx, y: ky + 0.4, z: 1.2, r: 1.6, col: [0.5, 0.55, 0.52], k: 0.35, pri: 3 }); // smothered: just enough to see yourself by
      // sounds of moving
      if (live && !b.dead) {
        if (b.ground && Math.abs(b.vx) > 0.4) { p.stepD += Math.abs(b.vx) * dt; if (p.stepD > (b.sneak ? 0.5 : 0.7)) { p.stepD = 0; sfx.play('step', { x: b.x, crouch: b.sneak, vol: b.sneak ? 0.15 : p.me ? 0.6 : 0.4 }); if (!b.sneak && !this.low) fx.burst('dust', b.x, b.y + 0.05, 0.4, 1, { spread: 0.3, power: 0.5 }); } }
        if (p.me && b.landed > 0.2) { sfx.play('land', { x: b.x, vol: b.landed }); fx.burst('dust', b.x, b.y + 0.05, 0.4, 3 + Math.round(b.landed * 5), { spread: 0.8, power: 0.7 }); }
        if (p.me && b.jumped) sfx.play('cloth', { x: b.x, vol: 1 });
        if (b.taut && !p.wasTaut && (p.tautT || 0) <= 0) { sfx.play('twang', { x: b.x, vol: p.me ? 1 : 0.6 }); p.tautT = 0.5; }
        p.wasTaut = b.taut; p.tautT = Math.max(0, (p.tautT || 0) - dt);
      }
    }
    // ---- the thread (and the spool)
    const ends = [];
    const knot = (p) => [p.b.x, p.b.y + (p.b.sneak ? 0.36 : WAIST) + 0.02];
    if (this.spool) {
      this.spoolView.update(dt, this.spool, T);
      const [sx, sy] = this.spoolView.knot(this.spool), [ax, ay] = knot(me);
      if (!me.hid) { const d = Math.hypot(sx - ax, sy - ay); ends.push({ ax, ay, bx: sx, by: sy, len: this.spool.mode === 'return' ? d + 0.2 : clamp(d * 1.12 + 0.3, d, Math.max(d, LINK - me.b.reel)) }); }
      const lx = this.spoolView.x + 0.16, ly = this.spoolView.y + (this.spool.mode === 'hooked' ? 0 : 0.63);
      if (!(this.spool.dark > 0)) lights.push({ x: lx, y: ly, z: 0.9, r: 6.5, col: AMBER, k: 2.0 + Math.sin(time * 9) * 0.12, pri: 2 });
    } else if (!(this.cutT > 0)) {
      for (let i = 0; i < this.n - 1; i++) {
        const p = this.players[i], q = this.players[i + 1];
        if (p.hid || q.hid) { ends.push(null); continue; }
        const [ax, ay] = knot(p), [bx, by] = knot(q);
        { const d = Math.hypot(bx - ax, by - ay); ends.push({ ax, ay, bx, by, len: clamp(d * 1.12 + 0.3, d, Math.max(d, linkLen(p.b, q.b))) }); }
      }
    }
    this.threads.update(dt, ends, L.solids, (s) => this.space.open(s));
    // ---- the hunters
    this.mon.forEach((m, i) => {
      const v = this.monViews[i];
      if (!this.isHost && live) { if (m.kind === 'crawler') { if (m.mode === 'roam') m.x = clamp(m.x + m.dir * 1.5 * dt, m.x0, m.x1); m.t += dt; } else m.t += dt; }
      if (m.kind !== 'crawler' && m.kind !== 'collector') {
        if (!this.isHost && live) m.t += dt;
        const vic = m.who >= 0 ? this.players[m.who] : null;
        v.update(dt, m, T, vic);
        // the hum: rising as it comes, a whine when it hunts
        if (live && m.kind === 'drinker' && m.mode !== 'dead' && m.mode !== 'perch' && Math.abs(m.x - this.cam.x) < 16 && ((v.humT = (v.humT || 0) - dt) <= 0)) { v.humT = 0.38; sfx.play('hum', { x: m.x, f: m.mode === 'hunt' ? 235 : m.mode === 'drink' ? 150 : 190, vol: m.mode === 'hunt' ? 1.1 : 0.6 }); }
      } else if (m.kind === 'crawler') { v.update(dt, m, T, m.y - 4.2); if (live && m.mode === 'hunt' && (this.skitT = (this.skitT || 0) - dt) <= 0) { this.skitT = 0.22; sfx.play('skitter', { x: m.x, vol: 0.8 }); } }
      else { const c = this.caught >= 0 ? this.players[this.caught] : null; v.update(dt, m, T, c && m.mode === 'grab' ? { x: c.b.x, y: c.b.y } : null); const st = v.takeStomp(); if (st !== undefined && live && m.mode !== 'down') { sfx.play('stomp', { x: st, vol: 1 }); if (Math.abs(st - this.cam.x) < 16) fx.shake(0.22); fx.burst('dust', st, m.y + 0.1, 0.5, 4, { spread: 1, power: 0.6 }); } }
    });
    // ---- worms announce themselves
    L.worms.forEach((w, i) => {
      if (Math.abs(w.x - this.cam.x) > 22) return;
      const out = wormOut(w, T), warn = wormWarn(w, T);
      if (out > 0.05 && this.wormWas[i] <= 0.05) { sfx.play('worm', { x: w.x, vol: w.silent ? 1.2 : 0.8 }); fx.burst('dust', w.x, w.y, 0.3, 5, { dir: [0, w.dir * 0.6, 0], spread: 0.8 }); }
      // the warning trickle of dust; a silent one gives none
      if (!w.silent && warn > 0 && warn < 0.5 && live && Math.random() < dt * 14) fx.burst('dust', w.x + (Math.random() - 0.5) * 0.5, w.y, 0.3, 1, { spread: 0.3, power: 0.4 });
      this.wormWas[i] = out;
    });
    if (W.phase === 'dead') this.deadT += dt;
    if (!this.attract) this.dread(dt, T, live);
    fx.update(dt);
    this.gore.update(dt);
    // ---- camera: keep everyone in the picture
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of this.players) {
      if (p.fall && p.b.dead) continue;
      // the camera keeps to the height you stand at, not the top of every hop; it drops with a fall
      const b = p.b;
      if (p.camY == null || b.ground || b.hang || b.mantle || b.dead || b.y < p.camY || b.y > p.camY + 2.6) p.camY = b.y;
      x0 = Math.min(x0, b.x); x1 = Math.max(x1, b.x); y0 = Math.min(y0, p.camY); y1 = Math.max(y1, p.camY);
    }
    if (this.spool && this.spool.mode !== 'return') { // a spool that has been set somewhere matters; one trailing behind only a little
      const s = this.spool, k = s.mode === 'follow' ? 2 : 99;
      const sx = clamp(s.x, me.b.x - k, me.b.x + k), sy = clamp(s.y, me.b.y - k, me.b.y + k);
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    if (x0 === Infinity) { x0 = x1 = this.cam.x; y0 = y1 = this.cam.y - 2.7; }
    const cam = R.cam, aspect = Math.max(0.3, this.app.graphicsDevice.width / Math.max(1, this.app.graphicsDevice.height));
    // wide screens see far to the sides; tall ones (a phone held upright) see less to the sides and
    // more above, with the ground lifted clear of the thumbs
    const tall = aspect < 1;
    const lead = this.n === 1 && !this.attract ? me.b.facing * (tall ? 1.6 : 1.2) : 0;
    let th = Math.max(this.attract ? 7.4 : 8.6, (x1 - x0 + (tall ? 6 : 9)) / aspect, y1 - y0 + 6.5, (tall ? 8.6 : 12) / aspect);
    if (W.phase === 'won') th += W.won * (tall ? 4 : 9);
    th = Math.min(th, tall ? 40 : 34);
    th *= 1 - 0.12 * this.dreadK; // fear narrows the view
    const groundAt = this.attract ? (tall ? 0.14 : 0.2) : tall ? 0.36 : this.input.usedTouch ? 0.24 : 0.19; // how far up the screen the ground sits
    const tx = (x0 + x1) / 2 + lead + (this.attract && !tall ? 3.6 : 0);
    let ty = (y0 + y1) / 2 + th * (0.5 - groundAt);
    if (W.phase === 'won') ty += W.won * 4;
    const ck = 1 - Math.exp(-dt * 3.2), cky = 1 - Math.exp(-dt * (ty < this.cam.y - 1.5 ? 4 : 1.9));
    this.cam.x += (tx - this.cam.x) * ck; this.cam.y += (ty - this.cam.y) * cky; this.cam.h += (th - this.cam.h) * (1 - Math.exp(-dt * 1.8));
    const dist = this.cam.h / (2 * Math.tan((cam.camera.fov * Math.PI) / 360));
    const [shx, shy] = fx.shakeOffset(time);
    cam.setPosition(this.cam.x + shx, this.cam.y + shy, dist);
    cam.setEulerAngles(0, 0, 0);
    cam.camera.farClip = dist + 140; cam.camera.nearClip = Math.max(1, dist - 14);
    sfx.listenerX = this.cam.x;
    R.setLights(lights, this.cam.x, this.cam.y - 1.5);
    R.frame(time, { amb: [0.2, 0.215, 0.21], moon: [0, 0, 0], fogStart: -1.2, fogMul: 1, dawn: 0, moonUv: [0, 0, 0.01, 0], expo: this.hud.expo ?? 1 });
    // ---- names over the others
    if (this.n > 1 && !this.attract) {
      const tags = [];
      for (const p of this.players) { if (p.me || p.hid) continue; const s = this.project(p.b.x, p.b.y + 1.45); if (s) tags.push({ id: p.id, name: p.name, x: s[0], y: s[1] }); }
      this.hud.tags(tags);
    }
    // ---- the end
    if (W.phase === 'won' && this.wonT > 5 && !this.ended) { this.ended = true; this.hud.end({ n: this.n, time: this.result?.time ?? 0, deaths: this.result?.d ?? W.deaths, cut: this.result?.cut ?? W.cut }); }
    if (W.phase !== 'won') this.ended = false;
  }
  /** how afraid to be, and everything that follows from it: the edges, the heart, the drone, the dark */
  dread(dt, T, live) {
    const { L, W, sfx, hud } = this, b = this.me.b;
    let d = 0;
    if (W.phase === 'play' && !b.dead) {
      for (const m of this.mon) {
        const dx = Math.abs(m.x - b.x);
        if (m.kind === 'crawler') {
          const Z = m.zone || L.monsters.find((q) => q.id === m.id).zone;
          if (b.x > Z.x0 - 4 && b.x < Z.x1 + 2) d = Math.max(d, 0.35 + 0.3 * Math.max(0, 1 - dx / 9) + (m.mode === 'roam' ? 0 : 0.45));
        } else if (m.kind === 'drinker') { if (m.mode !== 'dead' && dx < 12) d = Math.max(d, 0.25 + 0.35 * (1 - dx / 12) + (m.mode === 'hunt' || m.mode === 'drink' ? 0.4 : 0)); } else if (m.mode !== 'down' && dx < 18) d = Math.max(d, 0.25 + 0.4 * (1 - dx / 18) + (m.mode === 'hunt' || m.mode === 'grab' ? 0.4 : 0));
      }
      for (const w of L.worms) if (Math.abs(w.x - b.x) < 2.2) d = Math.max(d, 0.3 + 0.35 * wormOut(w, T));
      if (L.bells.length && b.x > L.bells[0].x - 6 && b.x < L.bells[L.bells.length - 1].x + 3) d = Math.max(d, 0.3 + W.wake * 0.7);
      L.waters.forEach((w, i) => { if (W.wT0[w.id] != null && b.x > w.x0 && b.x < w.x1) d = Math.max(d, 0.35 + Math.max(0, 1 - (b.y - W.wl[i]) / 4) * 0.5); });
      if (this.players.some((p) => !p.me && p.wormed)) d = Math.max(d, 0.75);
      if (this.wormT > 0 || this.latchT > 0) d = 1;
    } else if (W.phase === 'dead') d = 0.6;
    d = Math.min(1, d);
    this.dreadK += (d - this.dreadK) * Math.min(1, dt * (d > this.dreadK ? 2.5 : 0.8));
    const k = this.dreadK;
    const red = this.wormT > 0 ? 0.45 + 0.55 * Math.min(1, this.wormT / (this.n > 1 ? TAKES_TOGETHER : TAKES_ALONE)) - this.shakeOut * 0.3 : 0;
    const bpm = 62 + 110 * k + (this.wormT > 0 ? 30 : 0);
    hud.dread(Math.min(1, 0.15 + k * 0.85), Math.max(0, red), bpm);
    sfx.drone(k); sfx.duck(1 - 0.75 * k);
    if (!live) return;
    // the heart
    if (k > 0.3 && (this.beatT -= dt) <= 0) { this.beatT = 60 / bpm; sfx.play('heart', { vol: Math.min(1, (k - 0.2) * 1.4) }); }
    // the dark keeps you company: a whisper, knocking, a creak, very rarely a scream far off
    if ((this.ambT -= dt) <= 0) {
      this.ambT = 7 + R01() * 13 - k * 4;
      const r = R01(), x = this.cam.x + (R01() < 0.5 ? -1 : 1) * (6 + R01() * 9);
      sfx.play(r < 0.38 ? 'whisper' : r < 0.6 ? 'knock' : r < 0.9 ? 'creak' : 'farscream', { x, vol: 0.9 });
    }
    // things watching from the fog: a pair of eyes that is gone when you come near
    if ((this.eyesT -= dt) <= 0 && this.watchers.length < 2 && W.phase === 'play' && !this.low) {
      this.eyesT = 9 + R01() * 14 - k * 5;
      const side = R01() < 0.7 ? b.facing : -b.facing;
      const x = b.x + side * (5 + R01() * 7), y = b.y + 0.8 + R01() * 3.2, z = -2.5 - R01() * 4;
      const e = ent(this.app.root, null, null, x, y, z);
      for (const sx of [-1, 1]) ent(e, halo(this.app.graphicsDevice), redGlow(), sx * 0.13, 0, 0, 92).setLocalScale(0.075, 0.075, 0.075);
      e.setLocalScale(0.001, 0.001, 0.001);
      this.watchers.push({ e, x, t: 0, life: 3 + R01() * 4, gone: 0 });
    }
    for (let i = this.watchers.length - 1; i >= 0; i--) {
      const w = this.watchers[i];
      w.t += dt;
      if (!w.gone && (Math.abs(w.x - b.x) < 2.8 || w.t > w.life)) { w.gone = 0.001; if (Math.abs(w.x - b.x) < 2.8) sfx.play('whisper', { x: w.x, vol: 0.7 }); }
      if (w.gone) w.gone += dt;
      const open = w.gone ? Math.max(0, 1 - w.gone / 0.15) : Math.min(1, w.t / 0.8);
      const blink = (w.t % 2.9) < 0.12 ? 0.1 : 1;
      w.e.setLocalScale(1, Math.max(0.001, open * blink), 1);
      if (w.gone > 0.2) { w.e.destroy(); this.watchers.splice(i, 1); }
    }
  }
  anchorOf(p) {
    if (this.spool) { const s = this.spool; return s.mode === 'return' ? null : [s.x, s.y + s.waist]; }
    let best = null, bd = -1;
    for (const j of [p.i - 1, p.i + 1]) { const q = this.players[j]; if (!q) continue; const d = Math.hypot(q.b.x - p.b.x, q.b.y - p.b.y); if (d > bd) { bd = d; best = [q.b.x, q.b.y + WAIST]; } }
    return best;
  }
  project(x, y) {
    const cam = this.R.cam.camera;
    if (!this._v) { this._v = this.R.cam.getPosition().clone(); this._o = this._v.clone(); }
    this._v.set(x, y, 0);
    cam.worldToScreen(this._v, this._o);
    return [this._o.x, this._o.y];
  }
}
