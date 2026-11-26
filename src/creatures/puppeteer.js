// The Puppeteer: an eye in the rafters of the Marionette Theatre, its light sweeping the stage. A doll
// caught in the light long enough gets a grub dropped on its head, and a grubbed doll's controls are
// swapped (left is right, jump is creep) while the Puppeteer tugs it on strings. A candle's flame burns
// a grub off. Some doors open only for a puppet on the stage. Cut its strings and it falls.
//
// Mind (host only): watch | fallen. Its aim (where the light falls) is a clock, so all agree.
import * as pc from 'playcanvas';
import { mats, ent, halo, sharedMesh, addBeam, ink } from '../scene.js';
import { addSphere, rgba } from '../meshes.js';
import { tintMaterial, glowMaterial } from '../render.js';

export const GRUB = 12; // seconds a grub stays unless burned off
const SEEN = 0.35;
export const aimOf = (m, T) => m.x0 + (m.x1 - m.x0) * (0.5 - 0.5 * Math.cos((Math.PI * 2 * (T + (m.off || 0))) / m.period));

export function newPuppeteer(m) {
  return { kind: 'puppeteer', id: m.id, x: m.x, y: m.y, x0: m.x0, x1: m.x1, period: m.period || 7, off: m.off || 0, w: m.w || 0.95, floor: m.floor ?? 0, mode: 'watch', t: 0, seen: {}, fixed: m.fixed ?? null };
}
/** bodies: [{ i, x, y, dead, real, grub }]; ctx.T: the shared clock */
export function thinkPuppeteer(m, dt, bodies, L, ctx) {
  const ev = [];
  m.t += dt;
  if (m.mode !== 'watch') return ev;
  const aim = m.fixed ?? aimOf(m, ctx.T);
  for (const b of bodies) {
    if (!b.real || b.dead || b.grub) { m.seen[b.i] = 0; continue; }
    const inLight = Math.abs(b.x - aim) < m.w && Math.abs(b.y - m.floor) < 2.5;
    m.seen[b.i] = inLight ? (m.seen[b.i] || 0) + dt : 0;
    if (m.seen[b.i] > SEEN) { m.seen[b.i] = 0; ev.push({ t: 'grub', id: m.id, i: b.i }); }
  }
  return ev;
}
export const packPuppeteer = (m) => [m.mode];
export function unpackPuppeteer(m, a) { m.mode = a[0]; }

let CONE = null, EYE = null;
export class PuppeteerView {
  constructor(app, m) {
    const dev = app.graphicsDevice, W = mats().world;
    this.root = new pc.Entity('puppeteer'); app.root.addChild(this.root);
    if (!CONE) { CONE = tintMaterial(); CONE.setParameter('uTint', new Float32Array([0.95, 0.97, 0.88, 0.42])); EYE = glowMaterial(1.3); EYE.setParameter('uTint', new Float32Array([0.92, 0.95, 0.85, 1])); }
    // the cone of light: a long triangle from the eye to the floor, drawn over the world
    const coneM = sharedMesh(dev, 'pupcone', (mb) => { const k = mb.count; mb.vert(-0.06, 0, 0, 0, 0, 1, rgba(1, 1, 1, 0.9)); mb.vert(0.06, 0, 0, 0, 0, 1, rgba(1, 1, 1, 0.9)); mb.vert(1, -1, 0, 0, 0, 1, rgba(1, 1, 1, 0.35)); mb.vert(-1, -1, 0, 0, 0, 1, rgba(1, 1, 1, 0.35)); mb.tri(k, k + 1, k + 2); mb.tri(k, k + 2, k + 3); });
    this.cone = ent(app.root, coneM, CONE, 0, 0, 0.5, 86);
    // the eye: a pale ball, a slot of a pupil, a lid
    this.eye = ent(this.root, sharedMesh(dev, 'pupeye', (mb) => { addSphere(mb, { r: 0.42, segW: 14, segH: 10, colFn: () => rgba(0.75, 0.78, 0.7, 0.45) }); }), W);
    this.pupil = ent(this.eye, sharedMesh(dev, 'puppupil', (mb) => { addSphere(mb, { r: 0.13, sy: 2.2, segW: 8, segH: 6, colFn: () => ink(0.4) }); }), W, 0, 0, 0.36);
    this.glow = ent(this.root, halo(dev), EYE, 0, 0, 0.5, 92); this.glow.setLocalScale(1.2, 1.2, 1.2);
    // its body: long limbs folded in the rafters, a cross-bar in its hands
    this.body = ent(this.root, sharedMesh(dev, 'pupbody', (mb) => {
      addSphere(mb, { x: -0.9, y: 0.6, r: 0.6, sy: 0.7, segW: 10, segH: 7, colFn: () => ink() });
      for (const [ax, ay, bx2, by2, cx, cy] of [[-1.2, 0.8, -2.6, 2.2, -3.4, 0.4], [-0.6, 0.9, 0.6, 2.6, 1.8, 1.4], [-1.3, 0.3, -2.8, -0.6, -3.6, 0.6], [-0.4, 0.2, 1.2, -0.5, 2.2, 0.3]]) { addBeam(mb, ax, ay, bx2, by2, -0.3, 0.12, 0.12, ink(), 0.08); addBeam(mb, bx2, by2, cx, cy, -0.3, 0.08, 0.08, ink(), 0.04); }
      addBeam(mb, -2.6, -0.2, 2.6, -0.2, 0.1, 0.1, 0.1, ink()); // the bar the strings hang from
    }), W, 0, 0.55, -0.4);
    this.x = m.x; this.y = m.y; this.fall = 0;
  }
  destroy() { this.root.destroy(); this.cone.destroy(); }
  /** where the strings come from (the bar), for drawing them to the grubbed */
  barAt() { return [this.x, this.y + 0.35 - this.fall]; }
  update(dt, m, T) {
    const down = m.mode !== 'watch';
    this.fall += ((down ? Math.max(0, this.y - m.floor - 0.4) : 0) - this.fall) * Math.min(1, dt * (down ? 4 : 10));
    this.root.setLocalPosition(this.x, this.y - this.fall, -0.6);
    this.root.setLocalEulerAngles(0, 0, down ? Math.min(80, this.fall * 20) : Math.sin(T * 0.7) * 3);
    const aim = m.fixed ?? aimOf(m, T);
    this.cone.enabled = !down;
    if (!down) {
      const dx = aim - this.x, dy = m.floor - (this.y - 0.1);
      // a triangle from the eye spreading to w each side of the aim on the floor
      this.cone.setLocalPosition(this.x, this.y - 0.1, 0.5);
      const ang = Math.atan2(dx, -dy);
      this.cone.setLocalEulerAngles(0, 0, ang * 57.3);
      this.cone.setLocalScale(m.w, Math.hypot(dx, dy), 1);
      this.pupil.setLocalPosition(Math.max(-0.2, Math.min(0.2, dx * 0.03)), -0.12, 0.36);
    }
    this.glow.enabled = !down;
  }
}
