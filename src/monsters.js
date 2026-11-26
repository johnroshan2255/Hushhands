// The two that hunt. Both are blind and both are run by the host; everyone else is sent where they
// are and what they are doing, and draws them.
//
// The Needle-Crawler hangs from the den's roof and listens: a footstep or a landing brings it over,
// and it stabs straight down where the sound was. Sneaking makes no sound.
//
// The Collector paces its yard. It hears the same way and picks up whoever made the noise. It can be
// brought down: stretch the thread across its path, everyone holding it braced, and it trips.
import * as pc from 'playcanvas';
import { addSphere, addLathe, addCylinder } from './meshes.js';
import { mats, ent, sharedMesh, stickMesh, setStick, addBeam, ink } from './scene.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R2D = 180 / Math.PI;

// ------------------------------------------------------------------ minds (host only)
export function newMonster(m) {
  return m.kind === 'crawler'
    ? { kind: 'crawler', id: m.id, x: m.x, x0: m.x0, x1: m.x1, y: m.y, mode: 'roam', dir: 1, tx: m.x, t: 0, home: m.x }
    : { kind: 'collector', id: m.id, x: m.x, x0: m.x0, x1: m.x1, y: m.y, mode: 'pace', dir: -1, tx: m.x, t: 0, home: m.x, heard: 0, who: -1 };
}

/**
 * bodies: [{ i, x, y, noise, sneak, braced, ground, dead, anchor }] (anchor: holds the thread fast)
 * returns events: [{ t: 'stab', x } | { t: 'grab', i } | { t: 'trip' } | { t: 'hear', id }]
 */
export function thinkMonster(m, dt, bodies, L, ctx) {
  const ev = [];
  m.t += dt;
  if (m.kind === 'crawler') {
    const Z = L.crawlZone;
    let loud = null;
    for (const b of bodies) {
      if (b.dead || !b.real || b.x < Z.x0 || b.x > Z.x1 || b.y < Z.y0 || b.y > Z.y1) continue;
      // a footstep or a landing anywhere in the den; or the faintest movement right under it
      const n = Math.max(b.noise, Math.abs(b.x - m.x) < 1.45 && Math.abs(b.vx || 0) > 0.25 ? 0.3 : 0);
      if (n >= 0.25 && (!loud || n > loud.n)) loud = { x: b.x, n };
    }
    if (loud && (m.mode === 'roam' || m.mode === 'hunt')) { if (m.mode === 'roam') ev.push({ t: 'hear', id: m.id }); m.mode = 'hunt'; m.tx = clamp(loud.x, m.x0, m.x1 + 0.5); m.t = 0; }
    switch (m.mode) {
      case 'roam': m.x += m.dir * 1.5 * dt; if (m.x > m.x1) { m.x = m.x1; m.dir = -1; } if (m.x < m.x0) { m.x = m.x0; m.dir = 1; } break;
      case 'hunt': { const d = m.tx - m.x; m.dir = Math.sign(d) || m.dir; m.x += clamp(d, -5.6 * dt, 5.6 * dt); if (Math.abs(d) < 0.12) { m.mode = 'wind'; m.t = 0; } break; }
      case 'wind': if (m.t > 0.55) { m.mode = 'stab'; m.t = 0; ev.push({ t: 'stab', x: m.x, id: m.id }); } break;
      case 'stab': if (m.t > 0.55) { m.mode = 'rest'; m.t = 0; } break;
      case 'rest': if (m.t > 0.8) { m.mode = 'roam'; m.t = 0; } break;
      default: break;
    }
    return ev;
  }
  // ---- the Collector
  if (m.mode === 'down') return ev;
  if (m.mode === 'fall') { if (m.t > 1.25) { m.mode = 'down'; ev.push({ t: 'crash', id: m.id, x: m.x + m.dir * 3 }); } return ev; }
  if (m.mode === 'grab') { if (m.t > 1.0) { m.mode = 'pace'; m.t = 0; } return ev; }
  // tripped? every holder braced, the line running under it
  const anchors = bodies.filter((b) => b.anchor && !b.dead);
  if (anchors.length >= L.nb) {
    let lo = Infinity, hi = -Infinity;
    for (const a of anchors) { lo = Math.min(lo, a.x); hi = Math.max(hi, a.x); }
    if (hi - lo >= 2.4 && m.x > lo + 0.35 && m.x < hi - 0.35) { m.mode = 'fall'; m.t = 0; ev.push({ t: 'trip', id: m.id, x: m.x }); return ev; }
  }
  let loud = null;
  for (const b of bodies) if (!b.dead && b.noise >= 0.45 && b.x > m.x0 - 5 && b.x < m.x1 + 3 && Math.abs(b.x - m.x) < 13 && (!loud || b.noise > loud.noise)) loud = b;
  if (loud) { if (m.mode === 'pace') ev.push({ t: 'hear', id: m.id }); m.mode = 'hunt'; m.tx = clamp(loud.x, m.x0 - 3, m.x1 + 2); m.heard = 2.6; }
  if (m.mode === 'hunt') {
    m.heard -= dt;
    const d = m.tx - m.x;
    if (Math.abs(d) > 0.2) { m.dir = Math.sign(d); m.x += clamp(d, -3.1 * dt, 3.1 * dt); }
    // whoever is under its hands and not perfectly still
    for (const b of bodies) if (!b.dead && Math.abs(b.x - m.x) < 1.25 && b.y < m.y + 2 && !(b.braced || (b.sneak && b.noise < 0.1 && Math.abs(b.x - m.tx) > 1.6))) { m.mode = 'grab'; m.t = 0; m.who = b.i; ev.push({ t: 'grab', i: b.i, id: m.id }); return ev; }
    if (m.heard <= 0) { m.mode = 'pace'; m.t = 0; }
  } else {
    m.x += m.dir * 1.45 * dt;
    if (m.x > m.x1) { m.x = m.x1; m.dir = -1; } if (m.x < m.x0) { m.x = m.x0; m.dir = 1; }
    for (const b of bodies) if (!b.dead && b.noise >= 0.3 && Math.abs(b.x - m.x) < 1.25 && b.y < m.y + 2) { m.mode = 'grab'; m.t = 0; m.who = b.i; ev.push({ t: 'grab', i: b.i, id: m.id }); return ev; }
  }
  return ev;
}
export const packMonster = (m) => [Math.round(m.x * 100) / 100, m.mode, m.dir, Math.round(m.tx * 100) / 100, Math.round(m.t * 100) / 100];
export function unpackMonster(m, a) { m.x = a[0]; if (m.mode !== a[1]) { m.mode = a[1]; m.t = a[4]; } m.dir = a[2]; m.tx = a[3]; }

// ------------------------------------------------------------------ bodies (everyone)
export class CrawlerView {
  constructor(app, m) {
    const dev = app.graphicsDevice, M = mats();
    this.root = new pc.Entity('crawler');
    app.root.addChild(this.root);
    this.x = m.x; this.roof = m.y;
    const body = sharedMesh(dev, 'crawlbody', (mb) => {
      addSphere(mb, { x: 0, y: 0, r: 0.42, sy: 0.7, segW: 10, segH: 7, colFn: () => ink() });
      addSphere(mb, { x: -0.62, y: 0.02, r: 0.6, sy: 0.72, segW: 10, segH: 7, colFn: () => ink() });
      for (const sx of [-1, 1]) addBeam(mb, 0.36, -0.08, 0.62, -0.3, sx * 0.1, 0.07, 0.07, ink(), 0.015);
    });
    this.body = ent(this.root, body, M.world);
    this.legs = [];
    const stick = stickMesh(dev);
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? 1 : -1, k = i % 4;
      this.legs.push({ a: ent(this.root, stick, M.world), b: ent(this.root, stick, M.world), off: (k - 1.5) * 0.62 + (side > 0 ? 0.12 : -0.12), z: side * (0.25 + k * 0.06), fx: m.x + (k - 1.5) * 0.62, ph: (k % 2 ? 0 : 0.5) + (side > 0 ? 0 : 0.25), step: 0, sx: 0 });
    }
    this.needle = ent(this.root, sharedMesh(dev, 'needle', (mb) => addCylinder(mb, { r0: 0.07, r1: 0.004, h: 1, seg: 5, colFn: (t) => ink(1 + t * 2) })), M.world);
    this.needle.setLocalEulerAngles(0, 0, 180);
    this.len = 0; this.bob = 0; this.face = 1;
  }
  destroy() { this.root.destroy(); }
  update(dt, m, T, floorY) {
    this.x += (m.x - this.x) * Math.min(1, dt * 16);
    this.face += (m.dir - this.face) * Math.min(1, dt * 8);
    const x = this.x, roof = this.roof;
    const hunt = m.mode === 'hunt';
    const drop = m.mode === 'wind' ? 0.25 : m.mode === 'stab' ? 0.5 : 0;
    this.bob += ((0.62 + drop) - this.bob) * Math.min(1, dt * 12);
    const by = roof - this.bob + Math.sin(T * (hunt ? 19 : 3)) * 0.03;
    this.body.setLocalPosition(x, by, 0);
    this.body.setLocalEulerAngles(0, this.face < 0 ? 180 : 0, Math.sin(T * 2.1) * 3);
    for (const l of this.legs) {
      const want = x + l.off * 1.5;
      if (l.step <= 0 && Math.abs(want - l.fx) > 0.55) { l.step = 1; l.sx = l.fx; }
      if (l.step > 0) { l.step = Math.max(0, l.step - dt * (hunt ? 16 : 7)); const k = 1 - l.step; l.fx = l.sx + (want + Math.sign(want - l.sx) * 0.3 - l.sx) * k; }
      const lift = l.step > 0 ? Math.sin(Math.PI * (1 - l.step)) * 0.22 : 0;
      const hx = x + l.off * 0.45, hy = by + 0.08, fx = l.fx, fy = roof - lift;
      // the knee sticks out below the line from hip to foot
      const mx = (hx + fx) / 2 + (fx - hx) * 0.25, my = Math.min(hy, fy) - 0.42 - Math.abs(l.off) * 0.14;
      setStick(l.a, hx, hy, mx, my, l.z, 0.055);
      setStick(l.b, mx, my, fx, fy, l.z, 0.04);
    }
    const reach = roof - floorY - this.bob;
    const want = m.mode === 'stab' ? (m.t < 0.3 ? reach : reach * Math.max(0, 1 - (m.t - 0.3) / 0.25)) : m.mode === 'wind' ? 0.35 + Math.sin(T * 60) * 0.04 : 0.28;
    this.len += (want - this.len) * Math.min(1, dt * (m.mode === 'stab' && m.t < 0.3 ? 60 : 14));
    this.needle.setLocalPosition(x, by - 0.1, 0);
    this.needle.setLocalScale(1 + (m.mode === 'stab' ? 0.5 : 0), this.len, 1);
  }
}

const UP = 2.1, LO = 2.1; // the Collector's leg bones
export class CollectorView {
  constructor(app, m) {
    const dev = app.graphicsDevice, M = mats();
    this.root = new pc.Entity('collector');
    app.root.addChild(this.root);
    this.piv = ent(this.root, null, null);
    const stick = stickMesh(dev);
    const body = sharedMesh(dev, 'collbody', (mb) => {
      addLathe(mb, [[0.5, -0.9], [0.95, -0.3], [1.1, 0.5], [0.95, 1.3], [0.6, 1.9], [0.3, 2.2]], { seg: 10, sz: 0.8, colFn: () => ink(), warp: (x, y, z) => [x + Math.max(0, y) * 0.42, y, z] });
      addSphere(mb, { x: 1.25, y: 1.75, r: 0.36, sy: 1.1, segW: 9, segH: 7, colFn: () => ink() }); // a small head, thrust forward
      addBeam(mb, 0.95, 2.02, 1.7, 2.12, 0, 0.07, 0.8, ink()); addLathe(mb, [[0.42, 0], [0.3, 0.5], [0.05, 0.62]], { seg: 8, x: 1.25, y: 2.08, colFn: () => ink() }); // a brimmed, pointed cap
      // the cages on its back
      for (const [cx, cy, s] of [[-1.25, 0.9, 1], [-1.05, -0.4, 0.8]]) {
        for (let i = 0; i <= 4; i++) addBeam(mb, cx - 0.4 * s + i * 0.2 * s, cy - 0.5 * s, cx - 0.4 * s + i * 0.2 * s, cy + 0.5 * s, 0, 0.035, 0.035, ink());
        addBeam(mb, cx - 0.46 * s, cy + 0.5 * s, cx + 0.46 * s, cy + 0.5 * s, 0, 0.06, 0.7 * s, ink()); addBeam(mb, cx - 0.46 * s, cy - 0.5 * s, cx + 0.46 * s, cy - 0.5 * s, 0, 0.06, 0.7 * s, ink());
        addBeam(mb, cx, cy + 0.5 * s, 0.1, 1.6, 0, 0.03, 0.03, ink());
      }
    });
    this.body = ent(this.piv, body, M.world);
    this.legs = [-1, 1].map((s) => ({ s, a: ent(this.piv, stick, M.world), b: ent(this.piv, stick, M.world), foot: ent(this.piv, sharedMesh(dev, 'collfoot', (mb) => { addBeam(mb, -0.2, 0.09, 0.62, 0.09, 0, 0.18, 0.34, ink(), 0.1); }), M.world), fx: m.x + s * 0.5, sx: 0, step: 0 }));
    this.arms = [-1, 1].map((s) => ({ s, a: ent(this.piv, stick, M.world), b: ent(this.piv, stick, M.world), hand: ent(this.piv, sharedMesh(dev, 'collhand', (mb) => { for (let i = -1; i <= 1; i++) addBeam(mb, 0, 0, i * 0.16, -0.42, 0, 0.06, 0.06, ink(), 0.012); }), M.world), hx: 0, hy: 0 }));
    this.x = m.x; this.y = m.y; this.face = m.dir; this.fall = 0; this.next = 0;
  }
  destroy() { this.root.destroy(); }
  /** grabAt: { x, y } the wanderer being taken, if any */
  update(dt, m, T, grabAt) {
    const moved = m.x - this.x;
    this.x += moved * Math.min(1, dt * 14);
    this.face += (m.dir - this.face) * Math.min(1, dt * 5);
    const f = this.face >= 0 ? 1 : -1, x = this.x, y = this.y;
    const down = m.mode === 'fall' || m.mode === 'down';
    const fk = m.mode === 'down' ? 1 : m.mode === 'fall' ? Math.min(1, (m.t / 1.2) ** 2.4) : 0;
    this.fall = fk;
    this.root.setLocalPosition(x, y, -0.2);
    this.piv.setLocalEulerAngles(0, 0, -f * fk * 86);
    const hunt = m.mode === 'hunt';
    // feet: plant, then step when the body has left them behind (in the root's frame, x relative)
    const hipY = 3.75 - (m.mode === 'grab' ? 0.7 * Math.sin(Math.min(1, m.t / 0.9) * Math.PI) : 0) + Math.sin(T * 1.4) * 0.04;
    let stepping = false;
    for (const l of this.legs) if (l.step > 0) stepping = true;
    this.legs.forEach((l, i) => {
      const want = x + f * 0.25 + l.s * 0.34;
      if (!down && !stepping && l.step <= 0 && Math.abs(want - l.fx) > (hunt ? 1.5 : 1.2) && this.next === i) { l.step = 1; l.sx = l.fx; stepping = true; this.next = 1 - i; }
      if (l.step > 0) { const was = l.step; l.step = Math.max(0, l.step - dt * (hunt ? 3.4 : 2.1)); const k = 1 - l.step, e = k * k * (3 - 2 * k); l.fx = l.sx + (want + Math.sign(want - l.sx) * (hunt ? 1.5 : 1.1) - l.sx) * e; if (was > 0 && l.step === 0) this.stomp = l.fx; }
      const lift = l.step > 0 ? Math.sin(Math.PI * (1 - l.step)) * 0.9 : 0;
      const fx = down ? l.s * 0.5 - f * 0.4 : l.fx - x, fy = lift;
      const hx = l.s * 0.3, hy = hipY;
      // two-bone IK, knee bending back
      const dx = fx - hx, dy = fy - hy, d = clamp(Math.hypot(dx, dy), 0.3, UP + LO - 0.01);
      const base = Math.atan2(dy, dx), ka = Math.acos(clamp((UP * UP + d * d - LO * LO) / (2 * UP * d), -1, 1));
      const kx = hx + Math.cos(base + ka * f) * UP, ky = hy + Math.sin(base + ka * f) * UP;
      setStick(l.a, hx, hy, kx, ky, l.s * 0.3, 0.3, 0.3);
      setStick(l.b, kx, ky, hx + (dx / (Math.hypot(dx, dy) || 1)) * d, hy + (dy / (Math.hypot(dx, dy) || 1)) * d, l.s * 0.3, 0.2, 0.2);
      l.foot.setLocalPosition(fx, fy, l.s * 0.3);
      l.foot.setLocalScale(f, 1, 1);
    });
    this.body.setLocalPosition(0, hipY + 0.85, 0);
    this.body.setLocalScale(f, 1, 1);
    this.body.setLocalEulerAngles(0, 0, -f * (8 + (hunt ? 10 : 0) + Math.sin(T * 1.4) * 2 + (m.mode === 'grab' ? 26 * Math.sin(Math.min(1, m.t / 0.9) * Math.PI) : 0)));
    // arms: long, hanging, the hands trailing near the ground; one reaches when it takes someone
    this.arms.forEach((a, i) => {
      const sx = f * 0.75, sy = hipY + 2.35;
      let tx = f * (1.5 + i * 0.5) + Math.sin(T * 1.3 + i * 2) * 0.3, ty = 1.5 + Math.sin(T * 1.7 + i) * 0.15 + (hunt ? -0.5 : 0);
      if (m.mode === 'grab' && i === 0 && grabAt) { const k = Math.min(1, m.t / 0.35); const up = Math.max(0, (m.t - 0.45) / 0.55); tx = tx + (grabAt.x - x - tx) * k; ty = ty + (grabAt.y + 0.6 - y - ty) * k + up * 3.2; }
      if (down) { tx = f * 2.6 + i * 0.4; ty = 3.4; }
      a.hx += (tx - a.hx) * Math.min(1, dt * 9); a.hy += (ty - a.hy) * Math.min(1, dt * 9);
      const dx = a.hx - sx, dy = a.hy - sy, AL = 1.95, d = clamp(Math.hypot(dx, dy), 0.3, AL * 2 - 0.01);
      const base = Math.atan2(dy, dx), ka = Math.acos(clamp(d / (2 * AL), -1, 1));
      const ex = sx + Math.cos(base - ka * f) * AL, ey = sy + Math.sin(base - ka * f) * AL;
      const z = (i ? -1 : 1) * 0.7;
      setStick(a.a, sx, sy, ex, ey, z, 0.2, 0.2);
      setStick(a.b, ex, ey, sx + Math.cos(base) * d, sy + Math.sin(base) * d, z, 0.13, 0.13);
      a.hand.setLocalPosition(sx + Math.cos(base) * d, sy + Math.sin(base) * d, z);
    });
  }
  /** the world position of its reaching hand (to carry whoever it took) */
  hand() { const a = this.arms[0]; return [this.x + a.hx, this.y + a.hy - 0.5]; }
  takeStomp() { const s = this.stomp; this.stomp = undefined; return s; }
}
export { R2D };
