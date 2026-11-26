// What a death leaves. A doll that dies stops being driven by its rig and becomes a body: eleven
// points on sticks (verlet), the doll's own pieces hung on them, falling, folding, dragged by nothing.
// Bodies stay where they fell for the rest of the chapter, so a group sees where it keeps failing.
// The dolls are stuffed with dye-soaked wadding: in Full they bleed red and spill it, and some deaths
// tear a piece off; in Stitched they spill grey and stay whole. Creatures bleed black ink (fx 'ink').
import * as pc from 'playcanvas';
import { dollMeshes } from './chars.js';
import { MeshBuilder, rgba, addSphere } from './meshes.js';
import { worldMaterial } from './render.js';

const S = 0.68; // dolls are drawn at this scale (game.js SCALE)
const R2D = 180 / Math.PI;
// rest pose, standing, feet at 0 (scaled): head, chest, pelvis, elbow/hand A, elbow/hand B, knee/foot A, knee/foot B
const REST = [[0, 0.99], [0, 0.82], [0, 0.5], [0.05, 0.64], [0.09, 0.47], [-0.05, 0.64], [-0.09, 0.47], [0.03, 0.26], [0.03, 0.03], [-0.03, 0.26], [-0.03, 0.03]];
const STICKS = [[0, 1], [1, 2], [1, 3], [3, 4], [1, 5], [5, 6], [2, 7], [7, 8], [2, 9], [9, 10]];
const STIFF = [[0, 2, 0.5], [3, 2, 0.15], [5, 2, 0.15], [8, 1, 0.12], [10, 1, 0.12]]; // soft: a, b, how much
const G = 22;

export class Gore {
  constructor(app, { low = false } = {}) {
    this.app = app; this.low = low;
    this.root = new pc.Entity('gore'); app.root.addChild(this.root);
    this.bodies = [];
    this.decals = [];
    this.setting = 'full';
    this.maxBodies = low ? 10 : 30;
    this.maxDecals = low ? 30 : 120;
    const dev = app.graphicsDevice;
    // a splash: a flat irregular blot, red (or grey) in its own vertices
    const blot = (c) => { const mb = new MeshBuilder(); addSphere(mb, { r: 0.5, sy: 0.5, segW: 10, segH: 4, colFn: () => c, jitter: 0.25, rng: mulberry(3) }); return mb.build(dev); };
    this.redM = blot(rgba(0.55, 0.025, 0.02, 0.55)); this.greyM = blot(rgba(0.2, 0.2, 0.19, 0.04));
    this.mat = worldMaterial();
    this.greyMat = worldMaterial({ tint: [2.2, 2.2, 2.1, 0.03] });
  }
  get full() { return this.setting !== 'stitched'; }
  clear() { for (const b of this.bodies) b.e.destroy(); this.bodies.length = 0; for (const d of this.decals) d.destroy(); this.decals.length = 0; }
  destroy() { this.clear(); this.root.destroy(); }

  /**
   * a doll dies here. o: { x, y, facing, vx, vy, variant, why, solids, open(s) }
   * returns the body (its points can be pinned: body.pin = { k, at: () => [x, y], until })
   */
  spawn(o) {
    const dev = this.app.graphicsDevice, D = dollMeshes(dev, o.variant || 0);
    const f = o.facing || 1;
    const P = REST.map(([x, y]) => ({ x: o.x + x * f, y: o.y + y, px: o.x + x * f - (o.vx || 0) / 60, py: o.y + y - (o.vy || 0) / 60 }));
    const body = { P, sticks: STICKS.map(([a, b]) => ({ a, b, l: Math.hypot(REST[a][0] - REST[b][0], REST[a][1] - REST[b][1]), on: true })), t: 0, sleep: 0, why: o.why, solids: o.solids, open: o.open, water: o.water || null, gone: false };
    // its pieces: each hangs from one point toward another
    const e = new pc.Entity('body'); this.root.addChild(e);
    const piece = (mesh, a, b, up = false, sc = 1) => {
      const holder = new pc.Entity(); e.addChild(holder);
      const m = new pc.Entity(); m.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, D.mat)], castShadows: false }); m.setLocalEulerAngles(0, 90 * f, 0); m.setLocalScale(S * sc, S * sc, S * sc); holder.addChild(m);
      return { holder, m, a, b, up, on: true };
    };
    body.pieces = [piece(D.torso, 2, 1, true), piece(D.pelvis, 2, 1, true), piece(D.head, 1, 0, true), piece(D.armU, 1, 3), piece(D.armL, 3, 4), piece(D.armU, 1, 5), piece(D.armL, 5, 6), piece(D.legU, 2, 7), piece(D.legL, 7, 8), piece(D.legU, 2, 9), piece(D.legL, 9, 10)];
    body.e = e;
    this.bodies.push(body);
    while (this.bodies.length > this.maxBodies) { const old = this.bodies.shift(); old.e.destroy(); }
    this.how(body, o);
    return body;
  }
  /** each killer its own death: the first push, what tears, what spills */
  how(body, o) {
    const P = body.P, full = this.full, f = o.facing || 1, fx = o.fx;
    const kick = (k, vx, vy) => { P[k].px -= vx / 60; P[k].py -= vy / 60; };
    const tear = (a, b) => { if (!full) return; const s = body.sticks.find((q) => (q.a === a && q.b === b) || (q.a === b && q.b === a)); if (s) s.on = false; };
    const spray = (k, n, dir = [0, 1, 0], power = 1) => { if (!fx) return; fx.burst(full ? 'dye' : 'wad', P[k].x, P[k].y, 0.3, n, { dir, power }); if (full && !this.low) fx.burst('mist', P[k].x, P[k].y, 0.3, Math.ceil(n / 3), { power: 0.6 }); };
    const stuff = (k, n) => { if (fx) fx.burst(full ? 'stuff' : 'wad', P[k].x, P[k].y, 0.4, n, { power: 0.8 }); };
    switch (o.why) {
      case 'trap': // snaps shut at the waist: the doll folds over it
        kick(0, -f * 2, -1); kick(1, -f * 1.5, -2); kick(7, f * 1, 2); kick(9, f * 1, 2);
        spray(2, 16, [0, 0.8, 0], 1.1); stuff(2, 5); tear(2, 9);
        this.splash(o.x, o.y, 1.1, body); break;
      case 'shears': // cut in two at the thread line; both halves fall
        tear(1, 2); kick(0, -f * 3, 3); kick(1, -f * 3, 2); kick(2, f * 2, 1);
        spray(1, 22, [0, 0.4, 0], 1.3); spray(2, 12, [0, 0.4, 0]); stuff(1, 7);
        this.splash(o.x, o.y, 1.4, body); break;
      case 'crawler': // the needle goes through and lifts it, kicking, into the dark
        body.pin = { k: 1, t0: 0, until: 1.3, at: (t) => [o.x, o.y + 0.6 + Math.min(1, t / 0.5) * 2.4] };
        spray(1, 18, [0, -0.6, 0], 1.1); stuff(1, 4);
        this.splash(o.x, o.y, 0.9, body); break;
      case 'taken': case 'possessed': // the head splits open
        if (o.why === 'taken') { tear(0, 1); kick(0, (Math.random() - 0.5) * 2, 5); spray(0, 24, [0, 1.2, 0], 1.3); }
        else { kick(1, -f * 4, 2); kick(0, -f * 5, 2); spray(1, 20, [-f * 0.6, 0.5, 0], 1.2); }
        stuff(1, 5); this.splash(o.x, o.y, 1.2, body); break;
      case 'water': // soaked heavy: sinks slowly, reaching up
        body.drown = { level: o.level ?? o.y + 1.5 }; kick(4, 0, 2); kick(6, 0, 2);
        if (fx) fx.burst('drop', o.x, o.y + 1, 0.5, 10); break;
      case 'fell': // dropped: it goes on falling, limp
        kick(0, (o.vx || 0) * 0.3, 0); spray(2, 4); break;
      case 'turn': case 'press': // flat, with a burst of red
        body.flat = 1; spray(2, 26, [0, 0.3, 0], 1.4); stuff(2, 8); this.splash(o.x, o.y, 1.6, body); break;
      case 'drained': // the abdomen above fills red as the doll goes grey and flat
        body.flat = 0.45; body.grey = true; break;
      case 'stripped': case 'swallowed': // nothing left but the thread on the floor
        body.gone = true; spray(2, 18, [0, 1, 0]); stuff(2, 12); this.splash(o.x, o.y, 1.2, body); break;
      case 'rot': // darkens, sags, comes apart at its seams
        tear(1, 3); tear(1, 5); tear(2, 7); stuff(2, 14); stuff(1, 10); break;
      case 'moths': // holes until there is not enough left to stand
        tear(1, 3); tear(2, 9); stuff(1, 10); stuff(2, 8); break;
      case 'dyed': // into the vat: it goes under, red
        body.drown = { level: o.level ?? o.y + 1.5 }; spray(1, 20, [0, 1.2, 0], 1.2); break;
      case 'fumes': // choked: it folds up where it stood
        kick(0, -f * 1.5, -0.5); kick(1, -f, -1); stuff(1, 3); break;
      case 'cut': // the thread is cut: everyone drops where they stand
        kick(0, -f, 0.5); break;
      default: kick(0, -f * 1.2, 0.5); spray(1, 8); break;
    }
    if (body.gone) body.e.enabled = false;
    if (body.flat) for (const q of body.pieces) q.m.setLocalScale(S, S * (q.up ? 1 : 1), S * Math.max(0.25, 1 - body.flat * 0.75));
    if (body.grey) for (const q of body.pieces) q.m.render.meshInstances[0].material = this.greyMat;
  }
  /** red on the front face of the ground (and the wall behind) where it happened */
  splash(x, y, size, body) {
    if (this.low && this.decals.length > this.maxDecals * 0.6) return;
    const mesh = this.full ? this.redM : this.greyM;
    const n = this.low ? 2 : 4;
    for (let i = 0; i < n; i++) {
      const d = new pc.Entity(); d.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, this.mat)], castShadows: false });
      const top = body ? groundUnder(body.solids, body.open, x + (Math.random() - 0.5) * size, y) : y;
      const w = size * (0.6 + Math.random() * 0.7), h = w * (0.22 + Math.random() * 0.2);
      // a smear along the ground's lit edge, or a drip running down its face
      const drip = i >= 2;
      d.setLocalPosition(x + (Math.random() - 0.5) * size * 1.2, (top ?? y) - (drip ? 0.15 + Math.random() * 0.5 : 0.03), drip ? 2.43 : 0.2 + Math.random() * 2.1);
      d.setLocalScale(drip ? w * 0.18 : w, drip ? h * 3 : h * 0.5, drip ? 0.05 : w * 0.7);
      this.root.addChild(d); this.decals.push(d);
    }
    while (this.decals.length > this.maxDecals) this.decals.shift().destroy();
  }

  update(dt) {
    const h = Math.min(dt, 1 / 30);
    for (const B of this.bodies) {
      if (B.gone) continue;
      B.t += dt;
      if (B.sleep > 1.2 && !B.pin && !B.drown) { continue; }
      let moved = 0;
      const P = B.P;
      for (const p of P) {
        const vx = (p.x - p.px) * 0.995, vy = (p.y - p.py) * 0.995;
        p.px = p.x; p.py = p.y;
        let g = G;
        if (B.drown) { g = B.t < 3 ? 3 : 1.5; if (p.y > B.drown.level - 0.2) g = 8; }
        p.x += B.drown ? vx * 0.9 : vx; p.y += (B.drown ? vy * 0.9 : vy) - g * h * h;
        moved += Math.abs(vx) + Math.abs(vy);
      }
      if (B.pin && B.t < B.pin.until) { const [tx, ty] = B.pin.at(B.t); const p = P[B.pin.k]; p.x = tx; p.y = ty; }
      for (let it = 0; it < 4; it++) {
        for (const s of B.sticks) {
          if (!s.on) continue;
          const a = P[s.a], b = P[s.b], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4, k = (d - s.l) / d * 0.5;
          a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k;
        }
        for (const [ai, bi, w] of STIFF) {
          if (!B.sticks[ai === 0 ? 0 : 1].on) continue;
          const a = P[ai], b = P[bi], l0 = Math.hypot(REST[ai][0] - REST[bi][0], REST[ai][1] - REST[bi][1]), dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
          if (d > l0 * 0.6) continue; // only keep it from folding all the way into itself
          const k = (d - l0 * 0.6) / d * 0.5 * w; a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k;
        }
        for (const p of P) collide(p, B.solids, B.open);
      }
      B.sleep = moved < 0.004 * P.length ? B.sleep + dt : 0;
      this.draw(B);
    }
  }
  draw(B) {
    const P = B.P;
    for (const q of B.pieces) {
      const a = P[q.a], b = P[q.b];
      // a piece whose stick was torn still hangs from its pivot, pointing where it last pointed
      const dx = b.x - a.x, dy = b.y - a.y;
      const ang = q.up ? Math.atan2(-dx, dy) : Math.atan2(dx, -dy);
      q.holder.setLocalPosition(q === B.pieces[2] ? a.x : a.x, a.y, q.a === 1 && !q.up ? (q.b === 3 ? 0.08 : -0.08) : q.a === 2 && !q.up ? (q.b === 7 ? 0.06 : -0.06) : 0);
      q.holder.setLocalEulerAngles(0, 0, ang * R2D);
    }
  }
}

function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function groundUnder(solids, open, x, y) {
  let best = null;
  for (const s of solids || []) { if (open && open(s)) continue; if (x >= s.x0 && x <= s.x1 && s.y1 <= y + 0.3 && (best === null || s.y1 > best)) best = s.y1; }
  return best;
}
/** a point of a body against the level's boxes: out by the shortest way, mostly up; it drags on floors */
function collide(p, solids, open) {
  const r = 0.05;
  for (const s of solids || []) {
    if (open && open(s)) continue;
    if (p.x < s.x0 - r || p.x > s.x1 + r || p.y < s.y0 - r || p.y > s.y1 + r) continue;
    const up = s.y1 + r - p.y, dn = p.y - (s.y0 - r), l = p.x - (s.x0 - r), rt = s.x1 + r - p.x;
    const m = Math.min(up, dn, l, rt);
    if (m === up) { p.y = s.y1 + r; p.px += (p.x - p.px) * 0.35; /* friction */ }
    else if (m === dn) p.y = s.y0 - r;
    else if (m === l) p.x = s.x0 - r;
    else p.x = s.x1 + r;
  }
}
