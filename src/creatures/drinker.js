// The Drinkers: mosquitoes the size of dogs. They hunt by warmth and light, and the thread is both:
// a doll whose glow is smothered (creep through mud) is invisible to them. One that reaches a lit doll
// lands on it and drinks: the abdomen fills red, the doll goes grey and flat in six seconds unless it
// hammers JUMP or a friend pulls it off (USE). They are stupid: one chasing you flies straight through
// whatever lies between, flames too, and a Drinker in a flame bursts.
//
// Mind (host only): perch | hover | hunt | circle (a light that is not a doll: the spool) | drink | flee | burn | dead
import * as pc from 'playcanvas';
import { model } from '../models.js';
import { mats, ent, halo, sharedMesh } from '../scene.js';
import { addSphere } from '../meshes.js';
import { tintMaterial, glowMaterial } from '../render.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const DRAIN = 6; // seconds to drink a doll dry
const SPEED = 3.05, R2D = 180 / Math.PI;

export function newDrinker(m) {
  return { kind: 'drinker', id: m.id, x: m.x, y: m.y, hx: m.x, hy: m.y, x0: m.x0 ?? m.x - 6, x1: m.x1 ?? m.x + 6, wake: m.wake ?? 4.2, sight: m.sight ?? 7.5, perch: !!m.perch, mode: m.perch ? 'perch' : 'hover', t: Math.random() * 6, who: -1, vx: 0, vy: 0, dir: m.dir ?? -1, full: m.feeding ? 0.6 : 0, feeding: !!m.feeding, lost: 0 };
}

/** bodies: [{ i, x, y, dead, lit, real }]; L.candles: [{ x, y }] (the flame is at y + 0.95) */
export function thinkDrinker(m, dt, bodies, L) {
  const ev = [];
  m.t += dt;
  if (m.mode === 'dead') return ev;
  if (m.mode === 'burn') { m.vy -= 9 * dt; m.y += m.vy * dt; m.x += m.vx * dt; if (m.t > 1.2) { m.mode = 'dead'; ev.push({ t: 'ash', id: m.id, x: m.x, y: m.y }); } return ev; }
  const waist = (b) => [b.x, b.y + 0.55];
  const lit = bodies.filter((b) => !b.dead && b.lit);
  const near = (r) => { let best = null, bd = r; for (const b of lit) { const d = Math.hypot(b.x - m.x, b.y + 0.55 - m.y); if (d < bd) { bd = d; best = b; } } return best; };
  // flames: anything flying into one burns
  for (const c of L.candles) if (!c.out && Math.abs(c.x - m.x) < 0.6 && Math.abs(c.y + 0.95 - m.y) < 0.75 && m.mode !== 'drink') { m.mode = 'burn'; m.t = 0; m.vy = 1.5; m.vx *= 0.3; ev.push({ t: 'burn', id: m.id, x: m.x, y: m.y }); return ev; }
  const fly = (tx, ty, sp) => {
    const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, dt * 2.2);
    m.vx += ((dx / d) * Math.min(sp, d * 2.5) - m.vx) * k; m.vy += ((dy / d) * Math.min(sp, d * 2.5) - m.vy) * k;
    m.x += m.vx * dt; m.y += m.vy * dt;
    if (Math.abs(m.vx) > 0.3) m.dir = Math.sign(m.vx);
  };
  switch (m.mode) {
    case 'perch': { // still, legs on the reeds; it wakes when light comes close
      const b = near(m.wake);
      if (b) { m.mode = 'hunt'; m.who = b.i; m.t = 0; m.feeding = false; ev.push({ t: 'hear', id: m.id }); }
      break;
    }
    case 'hover': { // drifting about its home, looking
      fly(m.hx + Math.sin(m.t * 0.45) * 2.4, m.hy + Math.sin(m.t * 1.1) * 0.5, 1.4);
      const b = near(m.sight);
      if (b) { m.mode = 'hunt'; m.who = b.i; m.t = 0; ev.push({ t: 'hear', id: m.id }); }
      break;
    }
    case 'hunt': {
      let b = lit.find((q) => q.i === m.who && Math.hypot(q.x - m.x, q.y - m.y) < m.sight + 3);
      if (!b) b = near(m.sight);
      if (!b || m.x < m.x0 - 8 || m.x > m.x1 + 8) { m.lost += dt; if (m.lost > 1.6) { m.mode = 'hover'; m.lost = 0; m.who = -1; } fly(m.hx, m.hy, 2); break; }
      m.lost = 0; m.who = b.i;
      const [wx, wy] = waist(b);
      fly(wx, wy + 0.25, SPEED);
      if (Math.hypot(wx - m.x, wy + 0.2 - m.y) < 0.55) {
        if (b.real) { m.mode = 'drink'; m.t = 0; ev.push({ t: 'latch', id: m.id, i: b.i }); }
        else { m.mode = 'circle'; m.t = 0; } // the spool: a light with nothing in it
      }
      break;
    }
    case 'circle': fly(m.x + Math.cos(m.t * 3) * 0.6, m.y + Math.sin(m.t * 3) * 0.4, 1.6); if (m.t > 3.5) { m.mode = 'hover'; m.t = 0; } break;
    case 'drink': {
      const b = bodies.find((q) => q.i === m.who);
      if (!b || b.dead) { m.mode = 'flee'; m.t = 0; break; }
      m.x = b.x - m.dir * 0.5; m.y = b.y + 1.15; m.vx = m.vy = 0;
      m.full = Math.min(1, m.t / DRAIN);
      if (m.t > DRAIN) { ev.push({ t: 'drained', id: m.id, i: b.i }); m.mode = 'flee'; m.t = 0; m.full = 1; }
      break;
    }
    case 'flee': fly(m.x - m.dir * 2, m.y + 3, 3); if (m.t > 1.4) { m.mode = 'hover'; m.t = 0; m.hy = Math.max(m.hy, m.y - 1); } break;
    default: break;
  }
  return ev;
}
/** shaken off or pulled off: it flies up and away */
export function unlatch(m) { if (m.mode === 'drink') { m.mode = 'flee'; m.t = 0; m.who = -1; } }
export const packDrinker = (m) => [Math.round(m.x * 100) / 100, Math.round(m.y * 100) / 100, m.mode, m.who, Math.round(m.full * 100) / 100, m.dir];
export function unpackDrinker(m, a) { m.x = a[0]; m.y = a[1]; if (m.mode !== a[2]) { m.mode = a[2]; m.t = 0; } m.who = a[3]; m.full = a[4]; m.dir = a[5]; }

// ------------------------------------------------------------------ its body (everyone)
const S = 0.85; // the model is about 2.6 m nose to tail at 1: a big dog
let WING = null, RED = null;
export class DrinkerView {
  constructor(app, m) {
    this.app = app; this.dev = app.graphicsDevice;
    this.root = new pc.Entity('drinker'); app.root.addChild(this.root);
    this.x = m.x; this.y = m.y; this.face = m.dir; this.flap = 0; this.ok = false;
    if (!WING) { WING = tintMaterial(); WING.setParameter('uTint', new Float32Array([1, 1, 1, 1])); RED = glowMaterial(1.6); RED.setParameter('uTint', new Float32Array([1, 0.08, 0.05, 1])); }
    // a soft red glow in the abdomen as it fills
    this.glow = ent(this.root, halo(this.dev), RED, 0, 0, 0.45, 92); this.glow.enabled = false;
    // stand-in until the model arrives
    this.stand = ent(this.root, sharedMesh(this.dev, 'drinkstand', (mb) => { addSphere(mb, { r: 0.25, sy: 0.7, segW: 8, segH: 6, colFn: () => [10, 11, 11, 0] }); }), mats().world);
    this.build();
  }
  build() {
    const M = model(this.dev, 'drinker');
    if (!M) return;
    this.ok = true; this.stand.enabled = false;
    const P = M.parts, W = mats().world;
    this.piv = ent(this.root, null, null); this.piv.setLocalScale(S, S, S);
    this.body = ent(this.piv, P.body, W);
    const ws = M.meta.waist || [-0.12, 0, 0], mo = M.meta.mouth || [0.5, -0.16, 0];
    this.abdP = ent(this.piv, null, null, ws[0], ws[1], 0); this.abd = ent(this.abdP, P.abdomen, W);
    this.ndlP = ent(this.piv, null, null, mo[0], mo[1], 0.02); this.ndl = ent(this.ndlP, P.needle, W);
    this.wings = [0.12, -0.12].map((z) => { const e = ent(this.piv, null, null, 0, 0.18, z); const w = ent(e, P.wing, WING, 0, 0, 0, 85); w.setLocalEulerAngles(0, 0, 0); return e; });
    this.legs = (M.meta.hips || [[0.12, -0.12], [0, -0.14], [-0.12, -0.12]]).flatMap(([hx, hy], k) => [0.09, -0.09].map((z) => ({ hx, hy, z, k, a: ent(this.piv, P.leg, W), b: ent(this.piv, P.leg, W) })));
  }
  destroy() { this.root.destroy(); }
  update(dt, m, T, victim) {
    if (!this.ok) this.build();
    const k = Math.min(1, dt * 10);
    this.x += (m.x - this.x) * k; this.y += (m.y - this.y) * k;
    this.face += (m.dir - this.face) * Math.min(1, dt * 6);
    const dead = m.mode === 'dead', burn = m.mode === 'burn';
    this.root.enabled = !dead;
    if (dead) return;
    const f = this.face >= 0 ? 1 : -1;
    const bob = m.mode === 'perch' ? 0 : Math.sin(T * 7.3 + m.x) * 0.05;
    this.root.setLocalPosition(this.x, this.y + bob, 0.15);
    // full: the abdomen swells and glows red
    this.glow.enabled = m.full > 0.05;
    if (this.glow.enabled) { const g = 0.25 + m.full * 0.45; this.glow.setLocalPosition(-f * 0.42, -0.06, 0.5); this.glow.setLocalScale(g, g * 0.7, g); }
    if (!this.ok) return;
    this.piv.setLocalScale(S * f, S, S);
    const tilt = burn ? Math.sin(T * 20) * 40 + m.t * 70 : clamp(-m.vy * 6, -25, 25) + (m.mode === 'drink' ? -28 : m.mode === 'hunt' ? 8 : 0);
    this.piv.setLocalEulerAngles(0, 0, tilt * f);
    const sw = 1 + m.full * 0.8;
    this.abd.setLocalScale(1, sw, sw);
    this.abdP.setLocalEulerAngles(0, 0, (m.mode === 'drink' ? 18 : 6) + Math.sin(T * 2.1) * 4 - m.full * 10);
    // the needle: forward and down; stabbed into the victim while it drinks
    this.ndlP.setLocalEulerAngles(0, 0, m.mode === 'drink' ? -40 + Math.sin(T * 9) * 3 : m.mode === 'hunt' ? -6 : -14);
    // wings: a blur when flying, folded back when perched or drinking
    const flying = m.mode !== 'perch' && m.mode !== 'drink';
    this.flap += dt * (flying ? 55 : 0);
    this.wings.forEach((w, i) => { const a = flying ? 25 + Math.sin(this.flap + i * 0.6) * 55 : 12; w.setLocalEulerAngles(flying ? Math.sin(this.flap) * 25 : 0, i ? -18 : 18, a); });
    // legs: hanging and trailing in flight; reaching to the perch; clasping when drinking
    for (const l of this.legs) {
      const hx = l.hx, hy = l.hy;
      let fx, fy;
      if (m.mode === 'perch') { fx = hx + (l.k - 1) * 0.6 + 0.2; fy = -1.1; }
      else if (m.mode === 'drink') { fx = hx + 0.35 - l.k * 0.25; fy = -0.9 + l.k * 0.15; }
      else { const sway = Math.sin(T * 3 + l.k + l.z * 10) * 0.08; fx = hx - 0.35 - l.k * 0.15 + sway; fy = -0.85 + l.k * 0.05; }
      // knee up and out, a long thin bend
      const mx = (hx + fx) / 2 + 0.12 * (l.k - 1), my = Math.max(hy, fy) + 0.32;
      stick(l.a, hx, hy, mx, my, l.z); stick(l.b, mx, my, fx, fy, l.z * 1.3);
    }
  }
}
/** a leg piece (modelled along +x, 1.1 long) from (ax, ay) to (bx, by), in the creature's frame */
function stick(e, ax, ay, bx, by, z) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
  e.setLocalPosition(ax, ay, z);
  e.setLocalEulerAngles(0, 0, Math.atan2(dy, dx) * R2D);
  e.setLocalScale(d / 1.1, 1, 1);
}
