// Juice: little bursts of glass, black splinters, dust, embers and water, and a camera shake for the
// loud moments. A fixed pool of small meshes, no allocations in play.
import * as pc from 'playcanvas';
import { MeshBuilder, rgba, addBox, addSphere, addCylinder } from './meshes.js';
import { worldMaterial, glowMaterial, tintMaterial } from './render.js';

const KINDS = {
  glass: { mat: 'glow', col: [0.75, 0.9, 0.88, 0.5], size: [0.05, 0.16], grav: 16, life: [0.7, 1.3], spin: 14, speed: [1.5, 4.5], up: 1.5 },
  ink: { mat: 'world', col: [0.04, 0.043, 0.042, 0], size: [0.05, 0.15], grav: 16, life: [0.6, 1.1], spin: 12, speed: [1.5, 5], up: 3 },
  dust: { mat: 'tint', col: [0.16, 0.17, 0.17, 0.32], size: [0.06, 0.15], grav: -0.4, life: [0.45, 0.9], spin: 0, speed: [0.25, 0.9], up: 0.2, grow: 1.6, round: true }, // dark soft smoke, not pale blobs
  ember: { mat: 'glow', col: [1, 0.62, 0.22, 1], size: [0.03, 0.06], grav: -1.2, life: [0.5, 1.2], spin: 0, speed: [0.4, 1.8], up: 1.0, round: true },
  spark: { mat: 'glow', col: [1, 0.75, 0.4, 1], size: [0.03, 0.06], grav: 9, life: [0.25, 0.55], spin: 0, speed: [1.5, 4.5], up: 1.5 },
  // the dolls are stuffed with dye-soaked wadding: it sprays red, and the wadding spills out
  dye: { mat: 'world', col: [0.62, 0.035, 0.03, 0.42], size: [0.035, 0.11], grav: 17, life: [0.6, 1.3], spin: 10, speed: [1.5, 5.5], up: 2.6, round: true },
  mist: { mat: 'tint', col: [0.5, 0.02, 0.02, 0.55], size: [0.08, 0.2], grav: 1.5, life: [0.4, 0.9], spin: 0, speed: [0.4, 1.6], up: 0.5, grow: 2, round: true },
  stuff: { mat: 'world', col: [0.46, 0.13, 0.11, 0.06], size: [0.06, 0.13], grav: 6, life: [1.4, 2.6], spin: 3, speed: [0.6, 2.4], up: 1.8, round: true },
  wad: { mat: 'world', col: [0.42, 0.42, 0.39, 0.04], size: [0.06, 0.13], grav: 6, life: [1.4, 2.6], spin: 3, speed: [0.6, 2.4], up: 1.8, round: true },
  spore: { mat: 'glow', col: [0.75, 0.82, 0.62, 0.5], size: [0.03, 0.07], grav: -0.5, life: [1.2, 2.6], spin: 0, speed: [0.2, 1.2], up: 0.4, round: true },
  drop: { mat: 'tint', col: [0.7, 0.78, 0.76, 0.6], size: [0.04, 0.09], grav: 14, life: [0.4, 0.8], spin: 0, speed: [1, 3.5], up: 3, round: true },
};

export class FX {
  constructor(app) {
    this.app = app;
    const device = app.graphicsDevice;
    this.mats = { world: worldMaterial(), glow: glowMaterial(1), tint: tintMaterial() };
    // (the world shader's glow lights a vertex by its own colour: world bits carry theirs in the mesh)
    const shapes = (c) => ({ chip: (() => { const mb = new MeshBuilder(); addBox(mb, { sx: 1, sy: 0.25, sz: 0.7, col: c }); return mb.build(device); })(), puff: (() => { const mb = new MeshBuilder(); addSphere(mb, { r: 0.5, segW: 10, segH: 7, colFn: () => c }); return mb.build(device); })(), disc: (() => { const mb = new MeshBuilder(); addCylinder(mb, { r0: 0.5, r1: 0.5, h: 0.12, seg: 10, capBottom: true, colFn: () => c }); return mb.build(device); })() });
    this.meshes = shapes(rgba(1, 1, 1, 1));
    this.kindMeshes = {};
    for (const k in KINDS) if (KINDS[k].mat === 'world') { const C = KINDS[k].col; this.kindMeshes[k] = shapes(rgba(C[0], C[1], C[2], C[3])); }
    this.pool = [];
    this.live = [];
    this.root = new pc.Entity('fx');
    app.root.addChild(this.root);
    this.matCache = new Map();
    this.shakeK = 0;
    this.floats = []; // { text, x, y, z, t, life, cls }
  }
  matFor(kind) {
    if (this.matCache.has(kind)) return this.matCache.get(kind);
    const K = KINDS[kind];
    const m = K.mat === 'world' ? worldMaterial() : K.mat === 'glow' ? glowMaterial(1) : tintMaterial();
    if (K.mat !== 'world') m.setParameter('uTint', new Float32Array(K.col));
    this.matCache.set(kind, m);
    return m;
  }
  /** n bits of `kind` from (x, y, z); dir: [dx, dy, dz] bias; spread 0..1 */
  burst(kind, x, y, z, n = 8, { dir = [0, 0, 0], spread = 1, power = 1 } = {}) {
    const K = KINDS[kind];
    for (let i = 0; i < n; i++) {
      if (this.live.length >= (this.cap || 160)) break;
      let p = this.pool.pop();
      if (!p) { const e = new pc.Entity('p'); e.addComponent('render', { meshInstances: [new pc.MeshInstance(this.meshes.chip, this.mats.world)], castShadows: false }); this.root.addChild(e); p = { e }; }
      const mi = p.e.render.meshInstances[0];
      const ms = this.kindMeshes[kind] || this.meshes;
      mi.mesh = K.round ? ms.puff : K.coin ? ms.disc : ms.chip;
      mi.material = this.matFor(kind);
      mi.drawOrder = K.mat === 'world' ? 0 : 95;
      const a = Math.random() * Math.PI * 2, el = (Math.random() - 0.3) * Math.PI * 0.6;
      const sp = (K.speed[0] + Math.random() * (K.speed[1] - K.speed[0])) * power;
      p.vx = Math.cos(a) * Math.cos(el) * sp * spread + dir[0] * sp;
      p.vy = Math.sin(el) * sp * spread + K.up * (0.5 + Math.random() * 0.7) + dir[1] * sp;
      p.vz = Math.sin(a) * Math.cos(el) * sp * spread + dir[2] * sp;
      p.x = x + (Math.random() - 0.5) * 0.2; p.y = y + (Math.random() - 0.5) * 0.2; p.z = z + (Math.random() - 0.5) * 0.2;
      p.s = K.size[0] + Math.random() * (K.size[1] - K.size[0]);
      p.life = K.life[0] + Math.random() * (K.life[1] - K.life[0]);
      p.t = 0; p.K = K; p.rx = Math.random() * 360; p.ry = Math.random() * 360; p.floor = y - 2.5;
      p.e.enabled = true;
      this.live.push(p);
    }
  }
  /** a number that floats up from a spot in the world (drawn by the HUD's tags) */
  float(text, x, y, z, cls = 'gain') { this.floats.push({ text, x, y, z, t: 0, life: 1.1, cls, id: (this.fid = (this.fid || 0) + 1) }); if (this.floats.length > 14) this.floats.shift(); }
  shake(k) { this.shakeK = Math.min(1, Math.max(this.shakeK, k)); if (this.onShake && k > 0.3) this.onShake(k); }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i], K = p.K;
      p.t += dt;
      if (p.t >= p.life) { p.e.enabled = false; this.pool.push(p); this.live.splice(i, 1); continue; }
      p.vy -= K.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (K.grav > 2 && p.y < p.floor) { p.y = p.floor; p.vy *= -0.35; p.vx *= 0.6; p.vz *= 0.6; }
      const k = p.t / p.life;
      const s = p.s * (K.grow ? 1 + k * K.grow : 1) * (k > 0.7 ? (1 - k) / 0.3 : 1);
      p.e.setPosition(p.x, p.y, p.z);
      p.e.setLocalScale(s, s, s);
      if (K.spin) { p.rx += K.spin * 40 * dt; p.ry += K.spin * 25 * dt; p.e.setLocalEulerAngles(p.rx, p.ry, 0); }
    }
    for (let i = this.floats.length - 1; i >= 0; i--) { const f = this.floats[i]; f.t += dt; f.y += dt * 0.9; if (f.t >= f.life) this.floats.splice(i, 1); }
    this.shakeK = Math.max(0, this.shakeK - dt * 2.6);
  }
  /** camera offset for this frame */
  shakeOffset(time) { const k = this.shakeK * this.shakeK; return [Math.sin(time * 71) * 0.22 * k, Math.cos(time * 83) * 0.18 * k]; }
  clear() { for (const p of this.live) { p.e.enabled = false; this.pool.push(p); } this.live.length = 0; this.floats.length = 0; this.shakeK = 0; }
}
