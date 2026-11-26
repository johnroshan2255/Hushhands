// Moths eat cloth, and a doll is cloth. A cloud of them hangs about a light; a lit doll that comes
// near is covered, and holes open in it until there is not enough left to stand (EAT seconds). A flame
// burns them off. Below, filling the tower and rising, the Moth Mother, whose wings put out candles.
//
// Mind (host only): hover | on (eating someone) | burnt | full
import * as pc from 'playcanvas';
import { model } from '../models.js';
import { mats, ent, halo, sharedMesh } from '../scene.js';
import { rgba } from '../meshes.js';
import { tintMaterial, glowMaterial } from '../render.js';

export const EAT = 7;
const N = 18;

export function newMoths(m) { return { kind: 'moths', id: m.id, x: m.x, y: m.y, hx: m.x, hy: m.y, mode: 'hover', t: Math.random() * 5, who: -1, eat: 0 }; }
export function thinkMoths(m, dt, bodies, L) {
  const ev = [];
  m.t += dt;
  if (m.mode === 'burnt' || m.mode === 'full') return ev;
  if (m.mode === 'hover') {
    m.x = m.hx + Math.sin(m.t * 0.9) * 0.6; m.y = m.hy + Math.sin(m.t * 1.3) * 0.3;
    for (const b of bodies) if (b.real && !b.dead && b.lit && Math.hypot(b.x - m.x, b.y + 0.6 - m.y) < 2.3) { m.mode = 'on'; m.who = b.i; m.eat = 0; ev.push({ t: 'moths', id: m.id, i: b.i }); break; }
    return ev;
  }
  // on someone: eating; a flame burns them off
  const b = bodies.find((q) => q.i === m.who);
  if (!b || b.dead) { m.mode = 'full'; return ev; }
  m.x += (b.x - m.x) * Math.min(1, dt * 8); m.y += (b.y + 0.7 - m.y) * Math.min(1, dt * 8);
  m.eat += dt;
  if (L.candles.some((c) => !c.out && Math.abs(c.x - b.x) < 1.1 && Math.abs(c.y - b.y) < 1.3)) { m.mode = 'burnt'; ev.push({ t: 'mburn', id: m.id, x: m.x, y: m.y, i: b.i }); return ev; }
  if (m.eat > EAT) { m.mode = 'full'; ev.push({ t: 'eaten', id: m.id, i: b.i }); }
  return ev;
}
export const packMoths = (m) => [Math.round(m.x * 100) / 100, Math.round(m.y * 100) / 100, m.mode, m.who, Math.round(m.eat * 10) / 10];
export function unpackMoths(m, a) { m.x = a[0]; m.y = a[1]; m.mode = a[2]; m.who = a[3]; m.eat = a[4]; }

let WING = null;
export class MothsView {
  constructor(app, m) {
    const dev = app.graphicsDevice;
    if (!WING) { WING = tintMaterial(); WING.setParameter('uTint', new Float32Array([0.82, 0.84, 0.76, 0.85])); }
    this.root = new pc.Entity('moths'); app.root.addChild(this.root);
    const mothM = sharedMesh(dev, 'moth', (mb) => { for (const s of [-1, 1]) { const k = mb.count; mb.vert(0, 0, 0, 0, 0, 1, rgba(1, 1, 1, 1)); mb.vert(s * 0.13, 0.05, 0, 0, 0, 1, rgba(1, 1, 1, 0.8)); mb.vert(s * 0.1, -0.07, 0, 0, 0, 1, rgba(1, 1, 1, 0.6)); mb.tri(k, k + 1, k + 2); } });
    this.m = Array.from({ length: N }, (_, i) => ({ e: ent(this.root, mothM, WING, 0, 0, 0.4 + (i % 3) * 0.2, 87), a: Math.random() * 6.3, r: 0.3 + Math.random() * 0.8, w: 1.5 + Math.random() * 2, ph: Math.random() * 6 }));
  }
  destroy() { this.root.destroy(); }
  update(dt, m, T) {
    const gone = m.mode === 'burnt' || m.mode === 'full';
    this.root.enabled = !gone;
    if (gone) return;
    const on = m.mode === 'on', tight = on ? 0.45 : 1;
    for (const q of this.m) {
      q.a += dt * q.w * (on ? 2.2 : 1);
      const x = m.x + Math.cos(q.a) * q.r * tight, y = m.y + Math.sin(q.a * 1.3 + q.ph) * q.r * 0.6 * tight;
      q.e.setLocalPosition(x, y, q.e.getLocalPosition().z);
      q.e.setLocalScale(1, Math.abs(Math.sin(T * 30 + q.ph)) * 0.9 + 0.1, 1);
    }
  }
}

/** the Moth Mother: rising under the tower with the tide (a race water with look 'mother') */
let EYE = null;
export class MotherView {
  constructor(app, w) {
    this.app = app; this.dev = app.graphicsDevice; this.w = w;
    this.root = new pc.Entity('mother'); app.root.addChild(this.root);
    this.ok = false;
    if (!EYE) { EYE = glowMaterial(0.9); EYE.setParameter('uTint', new Float32Array([0.85, 0.86, 0.74, 1])); }
    this.build();
  }
  build() {
    const M = model(this.dev, 'mothmother');
    if (!M) return;
    const W = mats().world, P = M.parts, S = 1.7;
    this.piv = ent(this.root, null, null); this.piv.setLocalScale(S, S, S);
    ent(this.piv, P.body, W);
    this.wings = [1, -1].map((s) => { const h = ent(this.piv, null, null, 0.4 * s, 0.2, -0.3); h.setLocalScale(s, 1, 1); ent(h, P.wing, W); ent(h, P.eye, W, 0, 0, 0.02); ent(h, P.pupil, W, 0, 0, 0.04); const g = ent(h, halo(this.dev), EYE, 3.0, 0.9, 0.3, 90); g.setLocalScale(1.2, 1.2, 1.2); return h; });
    this.ok = true;
  }
  destroy() { this.root.destroy(); }
  /** level: the tide's top (null: not risen) */
  update(dt, level, T) {
    if (!this.ok) this.build();
    this.root.enabled = level != null;
    if (level == null || !this.ok) return;
    const cx = (this.w.x0 + this.w.x1) / 2;
    this.root.setLocalPosition(cx + Math.sin(T * 0.4) * 1.2, level - 1.4 + Math.sin(T * 1.1) * 0.25, -1.2);
    const flap = Math.sin(T * 1.6) * 22;
    this.wings.forEach((h, i) => h.setLocalEulerAngles(flap * 0.5, 0, (i ? -1 : 1) * (8 + flap)));
  }
}
