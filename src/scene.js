// The Loom, drawn. Everything you can touch is a black silhouette on the play plane (z = 0); behind
// it, layer after layer of the same black sinks into bright fog. Nothing here decides anything: it
// draws the level's boxes and whatever the world's state says (gates, plates, traps, worms, cogs...).
import * as pc from 'playcanvas';
import { MeshBuilder, rgba, addBox, addSphere, addCylinder, addLathe } from './meshes.js';
import { worldMaterial, glowMaterial, fogMaterial, tintMaterial, setTint } from './render.js';
import { mulberry32 } from './noise.js';
import { wormOut, cogPad, shearsShut, shearsWarn, eelAt, pressDown, pressWarn } from './level.js';

const INK = [0.04, 0.043, 0.042];
export const ink = (k = 1, g = 0) => rgba(INK[0] * k, INK[1] * k, INK[2] * k, g);
export const amber = (k = 1, g = 1) => rgba(k, 0.62 * k, 0.22 * k, g);
export const AMBER = [1, 0.62, 0.22];
const TAU = Math.PI * 2, D2R = Math.PI / 180, R2D = 180 / Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const bx = (mb, x0, x1, y0, y1, z0, z1, col) => addBox(mb, { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, sx: x1 - x0, sy: y1 - y0, sz: z1 - z0, col });
/**
 * A solid as a soft silhouette instead of a box: rounded corners, sides that wander a little like
 * earth and old timber, the top kept true (within a hair) because feet stand on it. Extruded along z.
 */
function rounded(mb, x0, x1, y0, y1, z0, z1, colFn, rng) {
  const w = x1 - x0, h = y1 - y0;
  const rt = Math.min(0.32, w * 0.22, h * 0.3), rb = Math.min(0.7, w * 0.3, h * 0.3);
  const out = [];
  const arc = (cx, cy, r, a0, a1, n) => { for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  const side = (xa, ya, xb, yb, n, amp, nx) => { for (let i = 1; i < n; i++) { const k = i / n; out.push([xa + (xb - xa) * k + nx * (rng() - 0.5) * amp, ya + (yb - ya) * k]); } };
  const top = (xa, xb, n) => { for (let i = 1; i < n; i++) { const k = i / n; out.push([xa + (xb - xa) * k, y1 - rng() * 0.025]); } };
  const ns = Math.max(2, Math.min(12, Math.round(h / 0.9)));
  // counter-clockwise from the bottom left
  arc(x0 + rb, y0 + rb, rb, Math.PI, Math.PI * 1.5, 4);
  arc(x1 - rb, y0 + rb, rb, Math.PI * 1.5, Math.PI * 2, 4);
  side(x1, y0 + rb, x1, y1 - rt, ns, 0.12, 1);
  arc(x1 - rt, y1 - rt, rt, 0, Math.PI / 2, 5);
  top(x1 - rt, x0 + rt, Math.max(2, Math.round(w / 1.2)));
  arc(x0 + rt, y1 - rt, rt, Math.PI / 2, Math.PI, 5);
  side(x0, y1 - rt, x0, y0 + rb, ns, 0.12, -1);
  const n = out.length, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const col = (y) => colFn(Math.max(0, Math.min(1, (y - y0) / Math.max(0.01, h))));
  // the face toward us, fanned from the middle (the outline is near enough convex)
  const c = mb.vert(cx, cy, z1, 0, 0, 1, col(cy));
  const f0 = mb.count;
  for (const [x, y] of out) mb.vert(x, y, z1, 0, 0, 1, col(y));
  for (let i = 0; i < n; i++) mb.tri(c, f0 + i, f0 + ((i + 1) % n));
  // the rim, back into the dark
  for (let i = 0; i < n; i++) {
    const [ax, ay] = out[i], [bx2, by] = out[(i + 1) % n];
    let nx = by - ay, ny = -(bx2 - ax); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const k = mb.count;
    mb.vert(ax, ay, z1, nx, ny, 0, col(ay)); mb.vert(bx2, by, z1, nx, ny, 0, col(by)); mb.vert(bx2, by, z0, nx, ny, 0, col(by)); mb.vert(ax, ay, z0, nx, ny, 0, col(ay));
    mb.tri(k, k + 2, k + 1); mb.tri(k, k + 3, k + 2);
  }
}

/** a bar between two points in the x-y plane: width w (w1 at the far end), depth dz */
export function addBeam(mb, ax, ay, bx2, by, z, w, dz, col, w1 = w) {
  const dx = bx2 - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
  const h0 = w / 2, h1 = w1 / 2, zf = z + dz / 2, zb = z - dz / 2;
  const P = [[ax - nx * h0, ay - ny * h0], [ax + nx * h0, ay + ny * h0], [bx2 + nx * h1, by + ny * h1], [bx2 - nx * h1, by - ny * h1]];
  const quad = (a, b, c, d, n) => { const k = mb.count; for (const p of [a, b, c, d]) mb.vert(p[0], p[1], p[2], n[0], n[1], n[2], col); mb.tri(k, k + 1, k + 2); mb.tri(k, k + 2, k + 3); };
  const F = (i, zz) => [P[i][0], P[i][1], zz];
  quad(F(0, zf), F(3, zf), F(2, zf), F(1, zf), [0, 0, 1]);
  quad(F(0, zb), F(1, zb), F(2, zb), F(3, zb), [0, 0, -1]);
  for (const [i, j, n] of [[0, 3, [-nx, -ny, 0]], [3, 2, [ux, uy, 0]], [2, 1, [nx, ny, 0]], [1, 0, [-ux, -uy, 0]]]) quad(F(i, zb), F(j, zb), F(j, zf), F(i, zf), n);
}
/** a flat ring (or a disc when r0 = 0) facing the camera, dz thick */
export function addAnnulus(mb, x, y, z, r0, r1, seg, dz, col) {
  for (const [zz, nz] of [[z + dz / 2, 1], [z - dz / 2, -1]]) {
    const b = mb.count;
    for (let i = 0; i <= seg; i++) { const a = (i / seg) * TAU, c = Math.cos(a), s = Math.sin(a); mb.vert(x + c * r0, y + s * r0, zz, 0, 0, nz, col); mb.vert(x + c * r1, y + s * r1, zz, 0, 0, nz, col); }
    for (let i = 0; i < seg; i++) { const k = b + i * 2; if (nz > 0) { mb.tri(k, k + 1, k + 3); mb.tri(k, k + 3, k + 2); } else { mb.tri(k, k + 3, k + 1); mb.tri(k, k + 2, k + 3); } }
  }
  for (const [r, sgn] of r0 > 0.001 ? [[r1, 1], [r0, -1]] : [[r1, 1]]) {
    const b = mb.count;
    for (let i = 0; i <= seg; i++) { const a = (i / seg) * TAU, c = Math.cos(a), s = Math.sin(a); mb.vert(x + c * r, y + s * r, z + dz / 2, c * sgn, s * sgn, 0, col); mb.vert(x + c * r, y + s * r, z - dz / 2, c * sgn, s * sgn, 0, col); }
    for (let i = 0; i < seg; i++) { const k = b + i * 2; mb.tri(k, k + 1, k + 3); mb.tri(k, k + 3, k + 2); }
  }
}
export function addGear(mb, { x = 0, y = 0, z = 0, r, teeth = 12, dz = 0.4, col, spokes = 5, rim = 0.24 }) {
  addAnnulus(mb, x, y, z, r * (1 - rim), r, Math.max(16, teeth * 2), dz, col);
  const tw = ((TAU * r) / teeth) * 0.5;
  for (let i = 0; i < teeth; i++) { const a = (i / teeth) * TAU, c = Math.cos(a), s = Math.sin(a); addBeam(mb, x + c * r * 0.97, y + s * r * 0.97, x + c * r * 1.15, y + s * r * 1.15, z, tw, dz, col, tw * 0.7); }
  for (let i = 0; i < spokes; i++) { const a = (i / spokes) * TAU + 0.3, c = Math.cos(a), s = Math.sin(a); addBeam(mb, x, y, x + c * r * 0.8, y + s * r * 0.8, z, r * 0.13, dz * 0.7, col, r * 0.09); }
  addAnnulus(mb, x, y, z, 0, r * 0.2, 12, dz * 1.2, col);
}
function addTree(mb, x, y, z, s, rng, col) {
  const grow = (ax, ay, ang, len, w, d) => {
    const ex = ax + Math.sin(ang) * len, ey = ay + Math.cos(ang) * len;
    addBeam(mb, ax, ay, ex, ey, z, w, Math.min(w, 0.3), col, w * 0.7);
    if (d <= 0) return;
    const kids = d > 2 ? 2 : rng() < 0.8 ? 2 : 1;
    for (let i = 0; i < kids; i++) grow(ex, ey, ang + (i ? 1 : -1) * (0.28 + rng() * 0.5) + (rng() - 0.5) * 0.25, len * (0.6 + rng() * 0.22), w * 0.64, d - 1);
  };
  grow(x, y - 0.3, (rng() - 0.5) * 0.24, 2.3 * s, 0.36 * s, 4);
}
/** a soft round glow: bright in the middle, nothing at the edge (for the additive material) */
function haloMesh(device) {
  const mb = new MeshBuilder();
  const c = mb.vert(0, 0, 0, 0, 0, 1, rgba(1, 0.62, 0.22, 1));
  const m = mb.count;
  for (let i = 0; i <= 20; i++) { const a = (i / 20) * TAU; mb.vert(Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0, 0, 0, 1, rgba(1, 0.62, 0.22, 0.32)); }
  const o = mb.count;
  for (let i = 0; i <= 20; i++) { const a = (i / 20) * TAU; mb.vert(Math.cos(a), Math.sin(a), 0, 0, 0, 1, rgba(1, 0.62, 0.22, 0)); }
  for (let i = 0; i < 20; i++) { mb.tri(c, m + i, m + i + 1); mb.tri(m + i, o + i, o + i + 1); mb.tri(m + i, o + i + 1, m + i + 1); }
  return mb.build(device);
}

const shared = new Map();
let MATS = null;
export function mats() {
  if (!MATS) MATS = { world: worldMaterial(), glow: glowMaterial(1), fog: fogMaterial(1), glass: tintMaterial(), water: tintMaterial(), beam: glowMaterial(0.55) };
  return MATS;
}
/** meshes every level shares (built once, kept) */
export function sharedMesh(device, key, fn) {
  if (!shared.has(key)) { const mb = new MeshBuilder(); fn(mb); shared.set(key, mb.build(device)); }
  return shared.get(key);
}
export const halo = (device) => { if (!shared.has('halo')) shared.set('halo', haloMesh(device)); return shared.get('halo'); };
export const stickMesh = (device) => sharedMesh(device, 'stick', (mb) => bx(mb, -0.5, 0.5, 0, 1, -0.5, 0.5, ink()));
/** point a unit stick from a to b */
export function setStick(e, ax, ay, bx2, by, z, w, w2 = w) {
  const dx = bx2 - ax, dy = by - ay;
  e.setLocalPosition(ax, ay, z);
  e.setLocalEulerAngles(0, 0, Math.atan2(-dx, dy) * R2D);
  e.setLocalScale(w, Math.max(0.001, Math.hypot(dx, dy)), w2);
}
export function ent(parent, mesh, mat, x = 0, y = 0, z = 0, order) {
  const e = new pc.Entity();
  if (mesh) { e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)], castShadows: false }); if (order !== undefined) e.render.meshInstances[0].drawOrder = order; }
  e.setLocalPosition(x, y, z);
  parent.addChild(e);
  return e;
}

export class Scene {
  constructor(app, L, { low = false } = {}) {
    this.app = app; this.L = L; this.low = low;
    const device = app.graphicsDevice;
    this.device = device;
    this.M = mats();
    this.M.glass.setParameter('uTint', new Float32Array([1, 1, 1, 1]));
    this.M.water.setParameter('uTint', new Float32Array([1, 1, 1, 1]));
    this.root = new pc.Entity('scene');
    app.root.addChild(this.root);
    this.own = []; // meshes that belong to this level only
    this.rng = mulberry32(7717 + L.n * 13);
    this.lit = []; // amber lights from props, refreshed each frame
    this.buildStatic();
    this.buildRooms();
    this.buildProps();
    this.buildShafts();
  }
  /**
   * Light from somewhere above, falling through the gloom onto the ground in pale shafts: a slanted
   * column, a pool where it lands, and a little real light there, so a doll walking through is lit.
   * Where they fall is the same every time for a level; the den gets one, right where it hunts.
   */
  buildShafts() {
    const L = this.L, rng = mulberry32(991 + L.n);
    if (!this.M.shaft) { this.M.shaft = glowMaterial(0.42); this.M.shaft.setParameter('uTint', new Float32Array([0.78, 0.86, 0.84, 1])); }
    const per = { meadow: 3, chasm: 1, den: 1, gears: 1, bridge: 2, cathedral: 1, collector: 2, spindle: 2, fen: 6, pit: 1 };
    const spots = [];
    for (const z of L.zones) {
      const n = per[z.name] || 0;
      for (let i = 0; i < n; i++) {
        const x = z.x0 + ((i + 0.3 + rng() * 0.4) / n) * (z.x1 - z.x0), y = this.groundY(x);
        if (y !== null) spots.push({ x, y, w: 0.9 + rng() * 1.1, slant: 1.2 + rng() * 2.2, k: z.name === 'den' ? 1.3 : 0.8 + rng() * 0.4 });
      }
    }
    this.shafts = spots;
    if (!spots.length) return;
    this.add((mb) => {
      for (const s of spots) {
        const top = 14, k = mb.count, a = 0.5 * s.k;
        // the column: narrow and faint above, wide and brighter at the ground (cols are light, not paint)
        mb.vert(s.x - s.w * 0.35 - s.slant, s.y + top, -1.2, 0, 0, 1, rgba(1, 1, 1, 0));
        mb.vert(s.x + s.w * 0.35 - s.slant, s.y + top, -1.2, 0, 0, 1, rgba(1, 1, 1, 0));
        mb.vert(s.x + s.w, s.y, -1.2, 0, 0, 1, rgba(1, 1, 1, a * 0.55));
        mb.vert(s.x - s.w, s.y, -1.2, 0, 0, 1, rgba(1, 1, 1, a * 0.55));
        mb.tri(k, k + 1, k + 2); mb.tri(k, k + 2, k + 3);
        // the pool on the ground: a flat bright oval, soft at the rim
        const c = mb.vert(s.x, s.y + 0.02, 0.4, 0, 0, 1, rgba(1, 1, 1, a));
        const r0 = mb.count;
        for (let i = 0; i <= 20; i++) { const t = (i / 20) * Math.PI * 2; mb.vert(s.x + Math.cos(t) * s.w * 1.5, s.y + 0.02 + Math.sin(t) * 0.16, 0.4, 0, 0, 1, rgba(1, 1, 1, 0)); }
        for (let i = 0; i < 20; i++) mb.tri(c, r0 + i, r0 + i + 1);
      }
    }, this.M.shaft, 89);
  }
  mesh(fn) { const mb = new MeshBuilder(); fn(mb); if (!mb.count) return null; const m = mb.build(this.device); this.own.push(m); return m; }
  add(fn, mat = this.M.world, order) { const m = this.mesh(fn); return m ? ent(this.root, m, mat, 0, 0, 0, order) : null; }
  destroy() { this.root.destroy(); for (const m of this.own) { m.decRefCount(); if (m.refCount < 1) m.destroy(); } this.own.length = 0; }

  /** rooms: their walls built in their own frame, about their centre, so the whole room can turn */
  buildRooms() {
    this.rooms = {};
    for (const r of this.L.rooms) {
      const piv = new pc.Entity(`room ${r.id}`); piv.setLocalPosition(r.cx, r.cy, 0); this.root.addChild(piv);
      const m = this.mesh((mb) => {
        for (const s of r.solids) rounded(mb, s.x0 - r.cx, s.x1 - r.cx, s.y0 - r.cy, s.y1 - r.cy, -3.2, 2.4, (t) => ink(0.75 + 0.5 * t), this.rng);
        // the drum's ribs, behind: so a turn is seen
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, R = Math.max(r.x1 - r.x0, r.y1 - r.y0) * 0.55; addBeam(mb, 0, 0, Math.cos(a) * R, Math.sin(a) * R, -4.5, 0.25, 0.3, ink()); }
        addAnnulus(mb, 0, 0, -4.6, Math.max(r.x1 - r.x0, r.y1 - r.y0) * 0.53, Math.max(r.x1 - r.x0, r.y1 - r.y0) * 0.56, 40, 0.4, ink());
      });
      if (m) ent(piv, m, this.M.world);
      this.rooms[r.id] = piv;
    }
  }
  setRoom(id, angle) { const p = this.rooms && this.rooms[id]; if (p) p.setLocalEulerAngles(0, 0, angle * 57.2958); }
  /** the ground's height under x (the top of the highest walkable ground there), or null over a drop */
  groundY(x) {
    let best = null;
    for (const s of this.L.solids) if (s.ground && x >= s.x0 && x <= s.x1 && (best === null || s.y1 > best)) best = s.y1;
    return best;
  }
  zoneAt(x) { for (const z of this.L.zones) if (x >= z.x0 && x < z.x1) return z.name; return 'spindle'; }

  // ------------------------------------------------------------------ the world that never moves
  buildStatic() {
    const L = this.L, rng = this.rng, low = this.low;
    const CH = 56;
    const chunks = new Map();
    const chunk = (x) => { const k = Math.floor(x / CH); if (!chunks.has(k)) chunks.set(k, new MeshBuilder()); return chunks.get(k); };
    const outdoors = (x) => ['pit', 'meadow', 'chasm', 'bridge', 'collector', 'spindle', 'fen'].includes(this.zoneAt(x));
    // ---- the solid boxes
    for (const s of L.solids) {
      if (s.gate !== undefined) continue;
      const mb = chunk((s.x0 + s.x1) / 2);
      const z0 = s.thin ? -1.1 : -3.2, z1 = s.thin ? 1.1 : 2.4;
      if (s.thin) bx(mb, s.x0, s.x1, s.y0, s.y1, z0, z1, (t) => ink(0.75 + 0.5 * t));
      else rounded(mb, s.x0, s.x1, s.y0, s.y1, z0, z1, (t) => ink(0.75 + 0.5 * t), rng);
      if (s.thin) { for (let x = s.x0 + 0.5; x < s.x1; x += 1.3) addBeam(mb, x, s.y0, x - 0.5, s.y0 - 1.1, -0.6, 0.12, 0.12, ink()); continue; }
      // a ragged top edge: stones and lumps, so the ground isn't a ruler line
      const w = s.x1 - s.x0;
      if (s.y1 - s.y0 > 0.6 && w > 1.6) {
        for (let x = s.x0 + 0.5; x < s.x1 - 0.5; x += 0.9 + rng() * 2.4) {
          const r = 0.1 + rng() * rng() * 0.3;
          addSphere(chunk(x), { x, y: s.y1 - r * 0.45, z: (rng() - 0.5) * 3, r, sy: 0.6, segW: 6, segH: 4, colFn: () => ink(0.9) });
        }
      }
    }
    // ---- grass and weeds on open ground (play plane and just in front of it)
    const blade = (mb, x, y, z, h, lean, w) => { const k = mb.count; mb.vert(x - w, y, z, 0, 0, 1, ink()); mb.vert(x + w, y, z, 0, 0, 1, ink()); mb.vert(x + lean, y + h, z, 0, 0, 1, ink(1.3)); mb.tri(k, k + 1, k + 2); };
    for (const s of L.solids) {
      if (!s.ground) continue;
      for (let x = s.x0 + 0.2; x < s.x1 - 0.2; x += 0.16 + rng() * 0.5) {
        const zn = this.zoneAt(x);
        if (this.groundY(x) !== s.y1) continue;
        const lush = zn === 'meadow' || zn === 'fen' ? 1 : zn === 'pit' || zn === 'chasm' || zn === 'collector' || zn === 'spindle' ? 0.35 : zn === 'bridge' ? 0.2 : 0.06;
        if (rng() > lush) continue;
        const tall = zn === 'meadow' ? 0.3 + rng() * 0.55 : 0.12 + rng() * 0.3;
        const n = low ? 1 : 2 + Math.floor(rng() * 2);
        for (let i = 0; i < n; i++) blade(chunk(x), x + (rng() - 0.5) * 0.3, s.y1 - 0.02, [-2.2, -1.2, 1.3, 2.2][Math.floor(rng() * 4)], tall * (0.6 + rng() * 0.6), (rng() - 0.5) * 0.3, 0.035);
      }
    }
    // ---- set dressing named by the level
    for (const d of L.deco) this.deco(chunk(d.x), d);
    // ---- markers that never move: plate frames, lever bases, worm holes, trap plates, hooks
    for (const p of L.plates) { const mb = chunk(p.x); bx(mb, p.x - p.w / 2 - 0.14, p.x - p.w / 2, p.y, p.y + 0.2, -0.8, 0.8, ink()); bx(mb, p.x + p.w / 2, p.x + p.w / 2 + 0.14, p.y, p.y + 0.2, -0.8, 0.8, ink()); }
    for (const l of L.levers) { const mb = chunk(l.x); bx(mb, l.x - 0.3, l.x + 0.3, l.y, l.y + 0.22, -0.3, 0.3, ink()); addAnnulus(mb, l.x, l.y + 0.25, 0, 0, 0.17, 10, 0.5, ink()); }
    for (const w of L.worms) { const mb = chunk(w.x); addLathe(mb, [[0.62, 0], [0.5, 0.1], [0.34, 0.2], [0.3, 0.16]], { seg: 10, x: w.x, y: w.dir > 0 ? w.y - 0.03 : w.y + 0.03, z: 0, colFn: () => ink(), warp: w.dir > 0 ? undefined : (x, y, z) => [x, -y, z] }); }
    for (const b of L.bells) {
      const mb = chunk(b.x);
      if (b.kind === 'hang') addBeam(mb, b.x, b.y + 9, b.x, b.y + 1.55, 0, 0.03, 0.03, ink());
      else { addBeam(mb, b.x - 0.5, b.y, b.x - 0.5, b.y + 0.5, 0, 0.05, 0.05, ink()); addBeam(mb, b.x + 0.5, b.y, b.x + 0.5, b.y + 0.34, 0, 0.05, 0.05, ink()); addBeam(mb, b.x - 0.5, b.y + 0.3, b.x + 0.5, b.y + 0.3, 0, 0.022, 0.022, ink(2.4)); }
    }
    for (const s of L.shears) { const mb = chunk(s.x); bx(mb, s.x - 0.9, s.x + 0.9, s.y + 7.4, s.y + 9.1, -0.7, 0.7, ink()); bx(mb, s.x - 0.75, s.x - 0.55, s.y - 0.02, s.y + 0.08, -0.6, 0.6, ink()); bx(mb, s.x + 0.55, s.x + 0.75, s.y - 0.02, s.y + 0.08, -0.6, 0.6, ink()); }
    for (const r of L.rings) { const mb = chunk(r.x); bx(mb, r.x - 0.85, r.x + 0.85, r.y, r.y + 0.07, -0.85, 0.85, ink(1.2)); bx(mb, r.x - 0.95, r.x - 0.8, r.y, r.y + 0.14, -0.95, 0.95, ink()); bx(mb, r.x + 0.8, r.x + 0.95, r.y, r.y + 0.14, -0.95, 0.95, ink()); }
    for (const c of L.cps) { const mb = chunk(c.x); addBeam(mb, c.x - 0.9, c.y - 0.1, c.x - 0.9, c.y + 1.75, -1.5, 0.09, 0.09, ink()); addBeam(mb, c.x - 0.9, c.y + 1.72, c.x - 0.52, c.y + 1.86, -1.5, 0.06, 0.06, ink()); addBeam(mb, c.x - 0.54, c.y + 1.86, c.x - 0.54, c.y + 1.62, -1.5, 0.02, 0.02, ink()); }
    // ---- the far world: three layers of loom-frames, towers and hulks, and the warp threads of the sky
    this.farLayers(chunk);
    for (const mb of chunks.values()) { if (mb.count) { const m = mb.build(this.device); this.own.push(m); ent(this.root, m, this.M.world); } }
    this.fogBanks();
  }

  deco(mb, d) {
    const rng = this.rng, s = d.s || 1, { x, y } = d;
    switch (d.kind) {
      case 'heap': // scrap: leaning beams and broken cogs
        for (let i = 0; i < 9; i++) { const a = (rng() - 0.5) * 2.4, l = (0.8 + rng() * 2.2) * s, ox = (rng() - 0.5) * 2.6 * s; addBeam(mb, x + ox, y - 0.2, x + ox + Math.sin(a) * l, y + Math.cos(a) * l * 0.8, -1.6 - rng() * 1.2, 0.1 + rng() * 0.16, 0.2, ink()); }
        addGear(mb, { x: x + 0.6 * s, y: y + 0.5 * s, z: -2.2, r: 1.0 * s, teeth: 9, col: ink(), dz: 0.3 });
        addSphere(mb, { x, y: y - 0.2, z: -2, r: 1.5 * s, sy: 0.5, segW: 9, segH: 5, colFn: () => ink() });
        break;
      case 'cage': { // an empty cage, door hanging open
        const z = -1.8;
        for (let i = 0; i <= 5; i++) addBeam(mb, x - 0.7 + i * 0.28, y, x - 0.7 + i * 0.28, y + 1.5, z, 0.04, 0.04, ink());
        bx(mb, x - 0.78, x + 0.78, y + 1.5, y + 1.6, z - 0.5, z + 0.5, ink()); bx(mb, x - 0.78, x + 0.78, y, y + 0.08, z - 0.5, z + 0.5, ink());
        addBeam(mb, x + 0.7, y + 1.5, x + 1.3, y + 0.3, z, 0.04, 0.04, ink());
        break;
      }
      case 'arch': { // a gate's frame, behind it
        const h = 5.2 * s, z = -1.5;
        bx(mb, x - 1.25, x - 0.75, y, y + h, z - 0.4, z + 0.4, ink()); bx(mb, x + 0.75, x + 1.25, y, y + h, z - 0.4, z + 0.4, ink());
        bx(mb, x - 1.6, x + 1.6, y + h, y + h + 0.7, z - 0.5, z + 0.5, ink());
        addBeam(mb, x - 1.6, y + h + 0.7, x, y + h + 1.7, z, 0.3, 0.6, ink()); addBeam(mb, x + 1.6, y + h + 0.7, x, y + h + 1.7, z, 0.3, 0.6, ink());
        break;
      }
      case 'exitarch': { // the way on: a tall pointed arch, deeper dark inside, a pale breath of light beyond
        const z = -1.2, h = 4.6;
        for (const sx of [-1, 1]) { bx(mb, x + sx * 1.25 - 0.3, x + sx * 1.25 + 0.3, y - 0.2, y + h, z - 0.5, z + 0.5, ink()); addBeam(mb, x + sx * 1.25, y + h, x, y + h + 1.9, z, 0.5, 0.9, ink(), 0.3); }
        bx(mb, x - 1.7, x + 1.7, y - 0.25, y + 0.1, z - 0.8, z + 0.8, ink(1.2));
        for (let i = 0; i < 3; i++) addBeam(mb, x - 1.0 + i, y + h + 0.3, x - 1.0 + i + (rng() - 0.5) * 0.2, y + h - 0.8 - rng(), z + 0.6, 0.03, 0.03, ink(1.4));
        break;
      }
      case 'grass': break; // (the meadow's grass is grown with the rest)
      case 'vatrim': // the lip of a dye vat, and its staves
        bx(mb, x - 0.2, x + d.w + 0.2, y - 0.25, y + 0.15, -2.2, 2.2, ink(1.2));
        for (let sx = x; sx < x + d.w; sx += 0.9) bx(mb, sx, sx + 0.06, y - 3, y, 2.25, 2.35, ink(0.8));
        break;
      case 'curtains': // heavy stage drapes, hanging in folds, torn at the hem
        for (let cx = x; cx < x + d.w; cx += 0.85 + rng() * 0.5) { const top = y + 9.1, len = 3.2 + Math.sin(cx * 1.7) * 0.8 + rng() * 1.2; addBeam(mb, cx, top, cx + Math.sin(cx * 3.1) * 0.15, top - len, -3.2 - (Math.floor(cx * 2) % 2) * 0.3, 0.42, 0.25, ink(0.9 + (Math.floor(cx * 2) % 2) * 0.3), 0.3); }
        bx(mb, x - 0.5, x + d.w + 0.5, y + 8.6, y + 9.2, -3.6, -2.8, ink());
        break;
      case 'hooks': // a rail of hooks under the ceiling; on some of them, what is left of dolls
        bx(mb, x - 0.5, x + d.w + 0.5, y - 0.1, y + 0.1, -2.6, -1.8, ink());
        for (let hx = x; hx < x + d.w; hx += 1.1 + rng() * 0.6) { const l = 1.4 + rng() * 1.6; addBeam(mb, hx, y, hx, y - l, -2.2, 0.025, 0.025, ink()); addAnnulus(mb, hx, y - l - 0.08, -2.2, 0.05, 0.09, 8, 0.03, ink()); if (rng() < 0.5) { addSphere(mb, { x: hx, y: y - l - 0.45, z: -2.2, r: 0.17, sy: 1.6, segW: 7, segH: 5, colFn: () => ink() }); addSphere(mb, { x: hx, y: y - l - 0.05, z: -2.2, r: 0.12, segW: 6, segH: 4, colFn: () => ink() }); } }
        break;
      case 'ratholes': // a ragged hole low in a wall, where they come out
        bx(mb, x - 0.9, x + 0.9, y, y + 3.4, -2.6, -1.6, ink());
        addSphere(mb, { x, y: y + 0.15, z: -1.55, r: 0.55, sy: 0.75, segW: 10, segH: 5, colFn: () => rgba(0, 0, 0, 0) });
        for (let i = 0; i < 5; i++) addBeam(mb, x - 0.7 + i * 0.35, y + 0.6 + rng() * 0.2, x - 0.75 + i * 0.35 + (rng() - 0.5) * 0.3, y + 1.4 + rng(), -1.5, 0.05, 0.05, ink(1.3));
        break;
      case 'sacks': // grain sacks, slumped, some torn open
        for (let i = 0; i < 4; i++) { const sx = x + (i - 1.5) * 0.55 * s, sy = y + (i % 2) * 0.35 * s; addSphere(mb, { x: sx, y: sy + 0.32 * s, z: -1.6 - (i % 2) * 0.5, r: 0.42 * s, sy: 0.85, segW: 9, segH: 6, colFn: () => ink(1.1), jitter: 0.12, rng }); addCylinder(mb, { x: sx, y: sy + 0.62 * s, z: -1.6 - (i % 2) * 0.5, r0: 0.08 * s, r1: 0.12 * s, h: 0.18 * s, seg: 6, colFn: () => ink() }); }
        break;
      case 'mud': // a black, wet mound you can creep into
        for (let mx = x + 0.3; mx < x + d.w; mx += 0.5 + rng() * 0.4) addSphere(mb, { x: mx, y: y - 0.05, z: -0.6 + rng() * 2.2, r: 0.35 + rng() * 0.3, sy: 0.32, segW: 8, segH: 4, colFn: () => ink(0.55) });
        for (let i = 0; i < 4; i++) addSphere(mb, { x: x + rng() * d.w, y: y + 0.05, z: 2.0, r: 0.06 + rng() * 0.05, segW: 5, segH: 4, colFn: () => ink(2.2) }); // bubbles on its skin
        break;
      case 'reeds': // cattails: stalks with a fat seed-head, bent every way
        for (let rx = x; rx < x + d.w; rx += 0.18 + rng() * 0.45) {
          const z = d.far ? -2.5 - rng() * 3 : [-1.8, -1.1, 1.4, 2.1][Math.floor(rng() * 4)], h = 1.2 + rng() * 1.6, lean = (rng() - 0.5) * 0.7;
          addBeam(mb, rx, y - 0.2, rx + lean, y + h, z, 0.035, 0.03, ink(), 0.015);
          if (rng() < 0.55) addSphere(mb, { x: rx + lean * 0.92, y: y + h * 0.9, z, r: 0.06, sy: 3, segW: 5, segH: 4, colFn: () => ink() });
        }
        break;
      case 'bird': // a dead bird on a branch, wings hanging
        addSphere(mb, { x, y, z: 0, r: 0.2, sy: 0.7, segW: 8, segH: 5, colFn: () => ink() });
        addSphere(mb, { x: x + 0.2, y: y + 0.08, z: 0, r: 0.09, segW: 6, segH: 4, colFn: () => ink() });
        addBeam(mb, x - 0.1, y, x - 0.5, y - 0.45, 0.05, 0.16, 0.02, ink(), 0.05); addBeam(mb, x + 0.05, y, x + 0.1, y - 0.55, -0.05, 0.14, 0.02, ink(), 0.04);
        addBeam(mb, x - 1.2, y - 0.2, x + 1.0, y - 0.1, -0.1, 0.1, 0.1, ink());
        break;
      case 'bones': // a ribcage, half sunk
        for (let i = 0; i < 6; i++) { const rx = x + i * 0.34; addBeam(mb, rx, y - 0.1, rx + 0.1, y + 0.75 - Math.abs(i - 2.5) * 0.12, -1.3, 0.05, 0.05, ink(), 0.03); addBeam(mb, rx + 0.1, y + 0.75 - Math.abs(i - 2.5) * 0.12, rx + 0.42, y + 0.95 - Math.abs(i - 2.5) * 0.12, -1.3, 0.04, 0.04, ink(), 0.02); }
        addBeam(mb, x - 0.4, y + 0.22, x + 2.2, y + 0.12, -1.3, 0.09, 0.09, ink());
        addSphere(mb, { x: x - 0.7, y: y + 0.2, z: -1.3, r: 0.3, sy: 0.85, segW: 8, segH: 6, colFn: () => ink() });
        break;
      case 'tree': addTree(mb, x, y, d.far ? -6.5 : -1.7, s, rng, ink()); break;
      case 'spikes': for (let sx = x + 0.4; sx < x + d.w; sx += 0.7 + rng() * 0.3) addCylinder(mb, { x: sx, y, z: (rng() - 0.5) * 2, r0: 0.16, r1: 0, h: 1.2 + rng() * 1.2, seg: 5, colFn: () => ink() }); break;
      case 'gibbet': { // the crane over the jetty, with its hook
        const z = -1.3;
        addBeam(mb, x, y - 0.2, x, y + d.h, z, 0.24, 0.24, ink());
        addBeam(mb, x - 0.5, y + d.h, x + d.reach + 0.25, y + d.h, z, 0.2, 0.2, ink());
        addBeam(mb, x, y + d.h - 1.3, x + 1.3, y + d.h, z, 0.12, 0.12, ink());
        addBeam(mb, x + d.reach, y + d.h, x + d.reach, y + 2.42, z, 0.03, 0.03, ink());
        addAnnulus(mb, x + d.reach, y + 2.3, z, 0.07, 0.12, 10, 0.05, ink());
        break;
      }
      case 'pipes': { // pipes along the tunnel's roof
        for (const [oy, r] of [[-0.22, 0.14], [-0.55, 0.09]]) { bx(mb, x, x + d.w, y + oy - r, y + oy + r, -1.4 - r, -1.4 + r, ink()); for (let px = x + 1; px < x + d.w; px += 3.1) bx(mb, px - 0.1, px + 0.1, y + oy - r - 0.06, y, -1.6, -1.2, ink()); }
        for (let px = x + 2; px < x + d.w; px += 5.3) addBeam(mb, px, y - 0.6, px, y - 0.6 - 0.2 - rng() * 0.5, -1.4, 0.03, 0.03, ink());
        break;
      }
      case 'web': // strands from the den's roof
        for (let i = 0; i < 26; i++) { const ax = x - 6 + rng() * (d.w + 8), l = 0.6 + rng() * rng() * 3.4; addBeam(mb, ax, y, ax + (rng() - 0.5) * 1.6, y - l, -0.8 - rng() * 2, 0.018, 0.018, ink(1.6)); }
        for (let i = 0; i < 5; i++) { const ax = x - 4 + rng() * (d.w + 4); addSphere(mb, { x: ax, y: y - 0.9 - rng() * 0.8, z: -1.6, r: 0.22 + rng() * 0.16, sy: 1.6, segW: 7, segH: 6, colFn: () => ink() }); addBeam(mb, ax, y, ax, y - 0.8, -1.6, 0.02, 0.02, ink()); }
        break;
      case 'chains': // the bridge hangs from these
        for (let cx = x; cx <= x + d.w + 0.01; cx += 2.7) for (const z of [-0.9, 0.9]) addBeam(mb, cx, y + 8, cx, y - 11, z, 0.045, 0.045, ink());
        break;
      case 'columns': { // the cathedral's nave
        for (let cx = x; cx <= x + d.w; cx += 6.4) {
          addCylinder(mb, { x: cx, y, z: -2.7, r0: 0.5, r1: 0.42, h: d.h, seg: 8, colFn: () => ink() });
          addCylinder(mb, { x: cx, y, z: -2.7, r0: 0.75, r1: 0.5, h: 0.6, seg: 8, colFn: () => ink() });
          for (let k = 0; k < 6; k++) { const a0 = (k / 6) * 1.2, a1 = ((k + 1) / 6) * 1.2; addBeam(mb, cx + Math.sin(a0) * 3.6, y + d.h - 4.2 + a0 * 3.4, cx + Math.sin(a1) * 3.6, y + d.h - 4.2 + a1 * 3.4, -2.7, 0.22, 0.3, ink()); addBeam(mb, cx - Math.sin(a0) * 3.6, y + d.h - 4.2 + a0 * 3.4, cx - Math.sin(a1) * 3.6, y + d.h - 4.2 + a1 * 3.4, -2.7, 0.22, 0.3, ink()); }
        }
        for (let cx = x + 3.2; cx <= x + d.w; cx += 6.4) addCylinder(mb, { x: cx, y: y - 1, z: -9, r0: 0.7, r1: 0.6, h: d.h + 6, seg: 7, colFn: () => ink() });
        break;
      }
      case 'cages': // the Collector's catch, hung up to keep
        for (let cx = x; cx < x + d.w; cx += 3.4 + rng() * 2.6) {
          const cy = y - 3.5 - rng() * 4.5, z = -3 - rng() * 3;
          addBeam(mb, cx, y + 12, cx, cy + 1.5, z, 0.04, 0.04, ink());
          for (let i = 0; i <= 4; i++) addBeam(mb, cx - 0.5 + i * 0.25, cy, cx - 0.5 + i * 0.25, cy + 1.4, z, 0.035, 0.035, ink());
          addCylinder(mb, { x: cx, y: cy + 1.4, z, r0: 0.6, r1: 0.05, h: 0.4, seg: 6, colFn: () => ink() }); bx(mb, cx - 0.6, cx + 0.6, cy - 0.06, cy + 0.02, z - 0.5, z + 0.5, ink());
          if (rng() < 0.6) { addSphere(mb, { x: cx + 0.05, y: cy + 0.75, z, r: 0.17, segW: 7, segH: 5, colFn: () => ink() }); addLathe(mb, [[0.2, 0], [0.16, 0.35], [0.08, 0.6]], { seg: 7, x: cx, y: cy, z, colFn: () => ink() }); }
        }
        break;
      case 'spindle': { // the Great Spindle, wound thick, and the threads of the whole Loom gathering to it
        const z = -5.5;
        addLathe(mb, [[2.6, -0.4], [2.7, 0.3], [0.5, 0.7], [0.42, 3], [1.5, 4.5], [2.5, 7.5], [2.7, 10], [2.2, 13], [1.0, 15.5], [0.34, 17], [0.26, 26], [0.5, 26.6], [0.05, 28]], { seg: 14, x, y, z, colFn: () => ink() });
        for (let i = 0; i < 26; i++) { const a = -1.25 + (i / 25) * 2.5; addBeam(mb, x, y + 25.5, x + Math.sin(a) * 70, y + 25.5 + Math.cos(a) * 26 - Math.abs(Math.sin(a)) * 30, z - 1 - (i % 3), 0.035, 0.035, ink(1.5)); }
        for (const sx of [-1, 1]) { addBeam(mb, x + sx * 5.5, y - 0.5, x + sx * 5.5, y + 12, z, 0.5, 0.5, ink(), 0.36); addBeam(mb, x + sx * 5.5, y + 12, x, y + 16.4, z, 0.3, 0.3, ink()); }
        break;
      }
      default: break;
    }
  }

  farLayers(chunk) {
    const L = this.L, rng = this.rng, low = this.low;
    let gy = 0;
    const ground = (x) => { const g = this.groundY(x); if (g !== null) gy = g; return gy; };
    // layer A (z -7): loom frames with hanging threads
    for (let x = L.x0 + 4; x < L.x1; x += 7 + rng() * 9) {
      const y = ground(x), z = -6.5 - rng() * 2.5, mb = chunk(x), h = 6 + rng() * 9, w = 2.5 + rng() * 4;
      addBeam(mb, x, y - 14, x + (rng() - 0.5), y + h, z, 0.3, 0.3, ink(), 0.22);
      addBeam(mb, x + w, y - 14, x + w + (rng() - 0.5), y + h * (0.8 + rng() * 0.3), z, 0.3, 0.3, ink(), 0.22);
      addBeam(mb, x - 0.6, y + h * 0.92, x + w + 0.6, y + h * (0.86 + rng() * 0.1), z, 0.24, 0.24, ink());
      if (rng() < 0.5) addBeam(mb, x, y + h * 0.5, x + w, y + h * 0.9, z, 0.12, 0.12, ink());
      const nt = low ? 3 : 7;
      for (let i = 0; i < nt; i++) { const tx = x + (w * (i + 0.5)) / nt; addBeam(mb, tx, y + h * 0.9, tx + (rng() - 0.5) * 0.2, y + h * 0.9 - (1 + rng() * (h * 0.8)), z, 0.025, 0.025, ink(1.4)); }
      if (rng() < 0.35) addGear(mb, { x: x + w * 0.5, y: y + h * 0.9 + 0.2, z: z - 0.4, r: 0.9 + rng() * 0.8, teeth: 10, col: ink(), dz: 0.2 });
    }
    // layer B (z -18): towers, wheels half buried
    for (let x = L.x0; x < L.x1 + 20; x += 13 + rng() * 16) {
      const y = ground(x), z = -16 - rng() * 6, mb = chunk(x);
      if (rng() < 0.45) addGear(mb, { x, y: y - 1 + rng() * 3, z, r: 4 + rng() * 5, teeth: 14, col: ink(), dz: 0.6, spokes: 6 });
      else { const w = 2.4 + rng() * 3.5, h = 10 + rng() * 16; bx(mb, x - w / 2, x + w / 2, y - 20, y + h, z - 1, z + 1, ink()); addBeam(mb, x - w / 2 - 0.4, y + h, x + w * 0.2, y + h + 1.5 + rng() * 2, z, 0.5, 1, ink()); addBeam(mb, x + w / 2 + 0.4, y + h, x + w * 0.2, y + h + 1.5, z, 0.5, 1, ink()); if (rng() < 0.6) addBeam(mb, x + w / 2, y + h * 0.7, x + w / 2 + 5 + rng() * 5, y + h * 0.7 + 1, z, 0.3, 0.3, ink()); }
    }
    // layer C (z -44): hulks on the horizon and spindles as tall as weather
    for (let x = L.x0 - 20; x < L.x1 + 40; x += 22 + rng() * 26) {
      const y = ground(x), z = -40 - rng() * 12, mb = chunk(x);
      addSphere(mb, { x, y: y - 6, z, r: 14 + rng() * 14, sy: 0.55 + rng() * 0.3, segW: 9, segH: 5, colFn: () => ink(), jitter: 0.25, rng });
      if (rng() < 0.6) { const sx = x + 8 + rng() * 10, h = 30 + rng() * 26; addLathe(mb, [[2.2, -10], [0.8, h * 0.2], [3.2, h * 0.45], [3.4, h * 0.6], [0.7, h * 0.85], [0.2, h]], { seg: 7, x: sx, y, z: z - 4, colFn: () => ink() }); }
    }
    // the warp: fine threads falling out of the sky
    for (let x = L.x0; x < L.x1 + 10; x += low ? 5 : 2.2 + rng() * 2.5) {
      const y = ground(x), z = -9 - rng() * 30, mb = chunk(x);
      const lean = (rng() - 0.5) * 3;
      addBeam(mb, x + lean, y + 46, x, y + 3 + rng() * 14, z, 0.03 + (-z - 9) * 0.0022, 0.03, ink(1.3));
    }
  }

  fogBanks() {
    const L = this.L;
    let gy = 0;
    const quad = (mb, x0, x1, y0, y1, z, a0, a1) => { const k = mb.count; mb.vert(x0, y0, z, 0, 0, 1, rgba(1, 1, 1, a0)); mb.vert(x1, y0, z, 0, 0, 1, rgba(1, 1, 1, a0)); mb.vert(x1, y1, z, 0, 0, 1, rgba(1, 1, 1, a1)); mb.vert(x0, y1, z, 0, 0, 1, rgba(1, 1, 1, a1)); mb.tri(k, k + 1, k + 2); mb.tri(k, k + 2, k + 3); };
    const W = 40;
    for (let x = L.x0 - 20; x < L.x1 + 20; x += W) {
      const g = this.groundY(x + W / 2); const pit = g === null; if (!pit) gy = g;
      const e = this.add((mb) => {
        quad(mb, x, x + W, gy - (pit ? 26 : 3), gy + 6.5, -4.6, pit ? 0.95 : 0.6, 0);
        if (!this.low) quad(mb, x, x + W, gy - (pit ? 30 : 8), gy + 15, -13, 0.8, 0);
      }, this.M.fog, 60);
      if (e) e.render.meshInstances[0].cull = false;
    }
  }

  // ------------------------------------------------------------------ the things that move
  buildProps() {
    const L = this.L, dev = this.device, M = this.M, root = this.root;
    const SM = (k, fn) => sharedMesh(dev, k, fn);
    const lampM = SM('lampbar', (mb) => bx(mb, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, amber(1, 1)));
    const lampS = SM('lampball', (mb) => addSphere(mb, { r: 1, segW: 8, segH: 6, colFn: () => amber(1, 1) }));
    const glow = (parent, r, x = 0, y = 0, z = 0.05) => { const h = ent(parent, halo(dev), M.glow, x, y, z, 90); h.setLocalScale(r, r, r); return h; };
    // gates: slabs that sink into the ground
    this.gates = L.gates.map((g) => {
      const m = SM(`gate${g.h}`, (mb) => { bx(mb, 0.1, 0.6, 0, g.h, -1.0, 1.0, ink()); for (let y = 0.5; y < g.h; y += 1.1) bx(mb, 0, 0.7, y, y + 0.22, -1.1, 1.1, ink(1.3)); for (let z = -0.9; z <= 0.91; z += 0.36) addCylinder(mb, { x: 0.35, y: g.h, z, r0: 0.1, r1: 0, h: 0.5, seg: 4, colFn: () => ink() }); });
      return { g, e: ent(root, m, M.world, g.x, g.y, 0), k: 0 };
    });
    // plates: they sink a little and their rune lights
    const plateM = SM('plate', (mb) => { bx(mb, -0.75, 0.75, 0, 0.16, -0.7, 0.7, ink(1.25)); });
    this.plates = L.plates.map((p) => { const e = ent(root, plateM, M.world, p.x, p.y, 0); const lamp = ent(e, lampM, M.world, 0, 0.08, 0.71); lamp.setLocalScale(1.1, 0.05, 0.03); const h = glow(e, 0.9, 0, 0.1, 0.75); lamp.enabled = h.enabled = false; return { p, e, lamp, h, k: 0 }; });
    // levers
    const armM = SM('leverarm', (mb) => { addBeam(mb, 0, 0, 0, 1.0, 0, 0.09, 0.09, ink()); addSphere(mb, { y: 1.02, r: 0.13, segW: 8, segH: 6, colFn: () => ink(1.3) }); });
    // a valve is a lever that is a wheel: it turns while held
    const wheelM = SM('valvewheel', (mb) => { addAnnulus(mb, 0, 0, 0, 0.28, 0.36, 18, 0.07, ink(1.2)); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; addBeam(mb, 0, 0, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0, 0.05, 0.05, ink()); } addAnnulus(mb, 0, 0, 0, 0, 0.07, 8, 0.12, ink()); });
    const postM = SM('valvepost', (mb) => { addBeam(mb, 0, 0, 0, 0.75, -0.2, 0.14, 0.14, ink()); addBeam(mb, -0.25, 0.02, 0.25, 0.02, -0.2, 0.08, 0.3, ink()); });
    this.levers = L.levers.map((l) => { if (l.valve) { ent(root, postM, M.world, l.x, l.y, 0); const e = ent(root, wheelM, M.world, l.x, l.y + 0.78, 0.05); const h = glow(root, 0.7, l.x, l.y + 0.78, 0.3); h.enabled = false; return { l, e, lamp: h, h, a: 0, valve: true }; } const e = ent(root, armM, M.world, l.x, l.y + 0.25, 0); const lamp = ent(e, lampS, M.world, 0, 1.02, 0); lamp.setLocalScale(0.15, 0.15, 0.15); const h = glow(e, 0.8, 0, 1.02, 0.2); lamp.enabled = h.enabled = false; return { l, e, lamp, h, a: 38 }; });
    // bear traps: two toothed jaws
    const jawM = SM('jaw', (mb) => { bx(mb, 0, 0.5, 0, 0.05, -0.28, 0.28, ink()); for (let i = 0; i < 4; i++) { const k = mb.count, x = 0.12 + i * 0.12; mb.vert(x - 0.05, 0.05, 0, 0, 0, 1, ink()); mb.vert(x + 0.05, 0.05, 0, 0, 0, 1, ink()); mb.vert(x, 0.24, 0, 0, 0, 1, ink(1.6)); mb.tri(k, k + 1, k + 2); const k2 = mb.count; mb.vert(x - 0.05, 0.05, 0.27, 0, 0, 1, ink()); mb.vert(x + 0.05, 0.05, 0.27, 0, 0, 1, ink()); mb.vert(x, 0.24, 0.27, 0, 0, 1, ink(1.6)); mb.tri(k2, k2 + 1, k2 + 2); } });
    this.traps = L.traps.map((t) => { const e = ent(root, null, null, t.x, t.y + 0.02, 0); const a = ent(e, jawM, M.world), b = ent(e, jawM, M.world); b.setLocalScale(-1, 1, 1); ent(e, SM('trapbase', (mb) => bx(mb, -0.14, 0.14, -0.02, 0.07, -0.2, 0.2, ink())), M.world); return { t, e, a, b, k: 0, v: 0 }; });
    // worms
    const wormM = SM('worm', (mb) => {
      addLathe(mb, [[0.2, 0], [0.24, 0.15], [0.19, 0.3], [0.23, 0.45], [0.18, 0.6], [0.21, 0.74], [0.16, 0.86], [0.2, 0.93], [0.12, 1.0]], { seg: 9, colFn: () => ink() });
      for (const sx of [-1, 1]) addBeam(mb, sx * 0.1, 0.97, sx * 0.04, 1.12, 0, 0.07, 0.07, ink(), 0.01);
    });
    this.worms = L.worms.map((w) => { const e = ent(root, wormM, M.world, w.x, w.y, 0); if (w.dir < 0) e.setLocalEulerAngles(0, 0, 180); e.enabled = false; return { w, e }; });
    // checkpoints: a lantern that takes light when you reach it
    this.cps = L.cps.map((c) => { const e = ent(root, SM('cpcage', (mb) => { bx(mb, -0.13, 0.13, -0.2, 0.16, -0.13, 0.13, ink(1.2)); addCylinder(mb, { y: 0.16, r0: 0.2, r1: 0.02, h: 0.14, seg: 6, colFn: () => ink() }); }), M.world, c.x - 0.54, c.y + 1.5, -1.5); const lamp = ent(e, lampS, M.world, 0, -0.02, 0.16); lamp.setLocalScale(0.1, 0.13, 0.05); const h = glow(e, 0.9, 0, 0, 0.3); lamp.enabled = h.enabled = false; return { c, e, lamp, h, on: false }; });
    // bells
    const bellM = SM('bell', (mb) => { addLathe(mb, [[0.3, -0.55], [0.27, -0.5], [0.2, -0.3], [0.15, -0.1], [0.06, 0]], { seg: 9, colFn: () => ink() }); addSphere(mb, { y: -0.56, r: 0.07, segW: 6, segH: 4, colFn: () => ink(1.4) }); });
    const tinyBell = SM('tinybell', (mb) => { addLathe(mb, [[0.11, -0.2], [0.09, -0.16], [0.05, 0]], { seg: 7, colFn: () => ink() }); });
    this.bells = L.bells.map((b) => (b.kind === 'hang' ? { b, e: ent(root, bellM, M.world, b.x, b.y + 1.55, 0), t: 9 } : { b, e: ent(root, tinyBell, M.world, b.x - 0.5, b.y + 0.52, 0), t: 9 }));
    // the choir: figures hung in the vault, who wake if the bells do
    this.choir = [];
    for (const d of L.deco) {
      if (d.kind !== 'choir') continue;
      const figM = SM('choirfig', (mb) => { addBeam(mb, 0, 0, 0, -1.3, 0, 0.03, 0.03, ink()); addLathe(mb, [[0.5, -4.2], [0.42, -3.2], [0.3, -2.3], [0.22, -1.75]], { seg: 8, colFn: () => ink() }); addSphere(mb, { y: -1.55, r: 0.24, segW: 8, segH: 6, colFn: () => ink() }); for (const sx of [-1, 1]) addBeam(mb, sx * 0.24, -1.9, sx * 0.34, -3.1, 0, 0.09, 0.09, ink(), 0.05); });
      const eyeM = SM('choireyes', (mb) => { for (const sx of [-1, 1]) addSphere(mb, { x: sx * 0.09, y: -1.53, z: 0.2, r: 0.035, segW: 5, segH: 4, colFn: () => rgba(0.9, 0.93, 0.9, 1) }); });
      for (let i = 0, x = d.x; x < d.x + d.w; x += 3.1 + (i % 3) * 0.7, i++) { const e = ent(root, figM, M.world, x, d.y, -2.2 - (i % 2) * 1.4); const eyes = ent(e, eyeM, M.world); eyes.enabled = false; this.choir.push({ e, eyes, i, x, y: d.y, drop: 0 }); }
    }
    // glass slabs
    const slabM = this.mesh((mb) => { const k = mb.count; for (const [x, y] of [[0, 0], [1, 0], [1, 1], [0, 1]]) mb.vert(x, y, 0, 0, 0, 1, rgba(0.8, 0.88, 0.86, y ? 0.5 : 0.16)); mb.tri(k, k + 1, k + 2); mb.tri(k, k + 2, k + 3); });
    const slabFrame = SM('slabframe', (mb) => { bx(mb, 0, 1, 0.96, 1, -0.5, 0.5, ink(1.1)); bx(mb, 0, 0.02, 0, 1, -0.5, 0.5, ink()); bx(mb, 0.98, 1, 0, 1, -0.5, 0.5, ink()); });
    this.slabs = L.slabs.map((s) => { const e = ent(root, null, null, s.x0, s.y - 0.16, 0); e.setLocalScale(s.x1 - s.x0, 0.16, 1.9); ent(e, slabFrame, M.world); const g = ent(e, slabM, M.glass, 0, 0, 0.5, 70); return { s, e, g, st: 0 }; });
    // the cogs: a wheel that turns on the clock, and the pads that ride it
    this.cogs = [];
    for (const d of L.deco) {
      if (d.kind !== 'bigcog') continue;
      const m = SM(`gear${d.r}`, (mb) => addGear(mb, { r: d.r, teeth: Math.round(d.r * 5), col: ink(), dz: 0.4 }));
      this.cogs.push({ d, e: ent(root, m, M.world, d.x, d.y, d.far ? -8.5 : -1.7) });
    }
    const padM = SM('pad', (mb) => { bx(mb, -0.75, 0.75, -0.14, 0, -0.65, 0.65, ink(1.25)); bx(mb, -0.1, 0.1, -0.17, 0.03, -1.7, -0.6, ink()); });
    this.pads = [];
    L.cogs.forEach((c) => { for (let k = 0; k < c.pads; k++) this.pads.push({ c, k, e: ent(root, padM, M.world) }); });
    // shears: one blade from above, one from below
    const bladeM = SM('blade', (mb) => { const z = 0.08; const P = [[-0.5, 3.6], [0.5, 3.6], [0.42, 1.0], [0, 0], [-0.42, 1.0]]; for (const zz of [z, -z]) { const k = mb.count; for (const p of P) mb.vert(p[0], p[1], zz, 0, 0, zz > 0 ? 1 : -1, ink(p[1] < 0.5 ? 2.2 : 1)); mb.tri(k, k + 1, k + 2); mb.tri(k, k + 2, k + 4); mb.tri(k + 2, k + 3, k + 4); } bx(mb, -0.6, 0.6, 3.5, 4.2, -0.2, 0.2, ink()); bx(mb, -0.11, 0.11, 4.2, 8.4, -0.11, 0.11, ink()); });
    this.shears = L.shears.map((s) => { const up = ent(root, bladeM, M.world, s.x, s.y + 3.4, 0); const dn = ent(root, bladeM, M.world, s.x, s.y - 0.2, 0); dn.setLocalEulerAngles(0, 0, 180); dn.setLocalScale(1, 0.45, 1); return { s, up, dn }; });
    // water
    this.waters = [];
    for (const W of L.waters) {
      if (W.look === 'rats') continue; // (a tide of rats is drawn by the rats)
      const m = this.mesh((mb) => { const q = (y0, y1, c0, c1) => { const k = mb.count; mb.vert(0, y0, 0, 0, 0, 1, c0); mb.vert(1, y0, 0, 0, 0, 1, c0); mb.vert(1, y1, 0, 0, 0, 1, c1); mb.vert(0, y1, 0, 0, 0, 1, c1); mb.tri(k, k + 1, k + 2); mb.tri(k, k + 2, k + 3); }; q(-1, 0, rgba(0.02, 0.035, 0.035, 0.86), rgba(0.05, 0.08, 0.08, 0.66)); });
      const top = this.mesh((mb) => { const k = mb.count; for (const [x, y] of [[0, -0.07], [1, -0.07], [1, 0], [0, 0]]) mb.vert(x, y, 0, 0, 0, 1, rgba(0.62, 0.7, 0.68, y ? 0.1 : 0.55)); mb.tri(k, k + 1, k + 2); mb.tri(k, k + 2, k + 3); });
      if (W.kind === 'vat' && !this.M.vat) { this.M.vat = tintMaterial(); this.M.vat.setParameter('uTint', new Float32Array([0.55, 0.04, 0.03, 1])); }
      const wm = W.kind === 'vat' ? this.M.vat : M.water;
      const o = { W, e: ent(root, m, wm, W.x0, W.floor, 1.3, 80), top: ent(root, top, wm, W.x0, W.floor, 1.31, 81) };
      o.e.enabled = o.top.enabled = false;
      this.waters.push(o);
    }
    // candles: a fat stub on a dish, a flame that flickers and lights the reeds
    const stubM = SM('candle', (mb) => { addCylinder(mb, { y: 0, r0: 0.09, r1: 0.08, h: 0.75, seg: 8, colFn: () => ink(1.4) }); addCylinder(mb, { y: -0.02, r0: 0.25, r1: 0.22, h: 0.06, seg: 10, colFn: () => ink() }); addCylinder(mb, { y: -0.3, r0: 0.04, r1: 0.04, h: 0.3, seg: 5, colFn: () => ink() }); addBeam(mb, -0.08, 0.6, -0.12, 0.42, 0.06, 0.03, 0.03, ink(1.8)); });
    const flameM = SM('flame', (mb) => addSphere(mb, { y: 0.1, r: 0.07, sy: 2.2, segW: 7, segH: 6, colFn: () => amber(1.3, 1) }));
    this.candles = L.candles.map((c) => { const e = ent(root, stubM, M.world, c.x, c.y + 0.3, -0.2); const f = ent(root, flameM, M.world, c.x, c.y + 1.08, -0.2); const h = glow(root, 0.9, c.x, c.y + 1.15, 0.1); return { c, e, f, h }; });
    // lamps: a cage of iron with a fat flame, carried by its ring
    const lampCage = SM('lampcage', (mb) => { for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; addBeam(mb, Math.cos(a) * 0.14, 0.05, Math.cos(a) * 0.14, 0.42, Math.sin(a) * 0.14, 0.025, 0.025, ink()); } bx(mb, -0.17, 0.17, 0, 0.06, -0.17, 0.17, ink()); addCylinder(mb, { y: 0.42, r0: 0.18, r1: 0.03, h: 0.14, seg: 8, colFn: () => ink() }); addAnnulus(mb, 0, 0.62, 0, 0.05, 0.08, 10, 0.03, ink()); });
    this.lamps = L.lamps.map((l) => { const e = ent(root, lampCage, M.world, l.x, l.y, 0.25); const f = ent(e, flameM, M.world, 0, 0.12, 0); const h = glow(e, 1.6, 0, 0.25, 0.2); return { l, e, f, h }; });
    // rot-blooms: pale glowing caps; burst, they are only stalks
    if (!this.M.bloom) { this.M.bloom = glowMaterial(1.1); this.M.bloom.setParameter('uTint', new Float32Array([0.78, 0.86, 0.66, 1])); }
    const capM = SM('bloomcap', (mb) => { for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; addCylinder(mb, { x: Math.cos(a) * 0.18, y: 0, z: Math.sin(a) * 0.18, r0: 0.03, r1: 0.025, h: 0.3 + (i % 2) * 0.15, seg: 5, colFn: () => ink(1.2) }); addSphere(mb, { x: Math.cos(a) * 0.18, y: 0.33 + (i % 2) * 0.15, z: Math.sin(a) * 0.18, r: 0.11, sy: 0.6, segW: 7, segH: 5, colFn: () => rgba(0.8, 0.86, 0.7, 0.55) }); } });
    const stalkM = SM('bloomstalk', (mb) => { for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; addCylinder(mb, { x: Math.cos(a) * 0.18, y: 0, z: Math.sin(a) * 0.18, r0: 0.03, r1: 0.01, h: 0.22, seg: 5, colFn: () => ink(1.4) }); } });
    this.blooms = L.blooms.map((bl) => { const cap = ent(root, capM, M.world, bl.x, bl.y, 0.4); const st = ent(root, stalkM, M.world, bl.x, bl.y, 0.4); st.enabled = false; const h = ent(root, halo(dev), this.M.bloom, bl.x, bl.y + 0.4, 0.6, 90); h.setLocalScale(0.7, 0.5, 0.7); return { bl, cap, st, h }; });
    // presses: a heavy iron block on a shaft, that drops on its beat
    this.presses = L.presses.map((p) => { const m = SM(`press${p.w}`, (mb) => { bx(mb, -p.w / 2, p.w / 2, 0, 0.9, -1.3, 1.3, ink(1.1)); bx(mb, -p.w / 2 - 0.1, p.w / 2 + 0.1, 0.75, 0.9, -1.4, 1.4, ink()); bx(mb, -0.15, 0.15, 0.9, 12, -0.3, 0.3, ink()); for (let i = 0; i < 4; i++) addCylinder(mb, { x: -p.w / 2 + 0.2 + i * (p.w - 0.4) / 3, y: -0.12, r0: 0.05, r1: 0.0, h: 0.12, seg: 4, colFn: () => ink(1.6) }); }); return { p, e: ent(root, m, M.world, p.x, p.top, 0) }; });
    // fumes: slow pale-green banks that drift
    if (!this.M.fume) { this.M.fume = tintMaterial(); this.M.fume.setParameter('uTint', new Float32Array([0.55, 0.62, 0.45, 0.5])); }
    this.fumes = L.fumes.map((f) => { const m = this.mesh((mb) => { for (let i = 0; i < 9; i++) addSphere(mb, { x: f.x0 + ((i + 0.5) / 9) * (f.x1 - f.x0), y: f.y0 + (f.y1 - f.y0) * (0.3 + (i % 3) * 0.2), z: -0.5 + (i % 2) * 1.6, r: (f.y1 - f.y0) * 0.55, sy: 0.6, segW: 10, segH: 6, colFn: () => rgba(1, 1, 1, 0.35 + (i % 2) * 0.15) }); }); const e = ent(root, m, this.M.fume, 0, 0, 0, 84); return { f, e }; });
    // the Larder's hooks, and what hangs from them
    const hookM = SM('meathook', (mb) => { addBeam(mb, 0, 0, 0, -0.9, 0, 0.03, 0.03, ink()); addAnnulus(mb, 0, -1.0, 0, 0.06, 0.1, 10, 0.04, ink()); });
    const meatM = SM('meat', (mb) => { addSphere(mb, { y: -0.35, r: 0.38, sy: 1.25, segW: 9, segH: 7, colFn: () => rgba(0.16, 0.03, 0.025, 0.1), jitter: 0.2, rng: this.rng }); addBeam(mb, -0.1, -0.7, 0.05, -0.95, 0.2, 0.08, 0.08, rgba(0.6, 0.55, 0.5, 0.2)); });
    const poisonM = SM('poisonsack', (mb) => { addSphere(mb, { y: -0.4, r: 0.36, sy: 1.3, segW: 9, segH: 7, colFn: () => ink(1.2), jitter: 0.15, rng: this.rng }); addSphere(mb, { x: 0.1, y: -0.3, z: 0.3, r: 0.12, segW: 6, segH: 4, colFn: () => rgba(0.7, 0.8, 0.55, 0.6) }); });
    this.meat = L.meat.map((q) => { ent(root, hookM, M.world, q.x, q.hy, 0); const e = ent(root, q.poison ? poisonM : meatM, M.world, q.x, q.hy - 0.95, 0.1); return { q, e }; });
    // sacks big enough to hide in, in front of you
    const hideM = SM('hidesack', (mb) => { addSphere(mb, { y: 0.55, r: 0.6, sy: 1.0, segW: 10, segH: 7, colFn: () => ink(1.05), jitter: 0.08, rng: this.rng }); addCylinder(mb, { y: 1.1, r0: 0.18, r1: 0.26, h: 0.25, seg: 7, colFn: () => ink() }); });
    for (const s of L.sacks) ent(root, hideM, M.world, s.x, s.y, 0.55);
    // crates: an old wooden box, planks and a cross-brace
    this.crates = L.crates.map((c) => { const m = SM(`crate${c.w}x${c.h}`, (mb) => { bx(mb, -c.w / 2, c.w / 2, 0, c.h, -0.55, 0.55, ink(1.15)); for (let y = 0.15; y < c.h; y += 0.3) bx(mb, -c.w / 2 - 0.02, c.w / 2 + 0.02, y, y + 0.04, -0.57, 0.57, ink(0.7)); addBeam(mb, -c.w / 2 + 0.05, 0.05, c.w / 2 - 0.05, c.h - 0.05, 0.58, 0.08, 0.02, ink(0.8)); }); return { c, e: ent(root, m, M.world, c.x, c.y, 0) }; });
    // eels: a long dark ribbon low in the water, with a pale glow that swells before it strikes
    if (!this.M.eel) { this.M.eel = glowMaterial(1.8); this.M.eel.setParameter('uTint', new Float32Array([0.72, 0.9, 1, 1])); }
    const eelM = SM('eel', (mb) => { for (let i = 0; i < 12; i++) { const x0 = -1.2 + i * 0.2, x1 = x0 + 0.2, w0 = 0.12 * Math.sin(((i + 0.5) / 12) * Math.PI), w1 = 0.12 * Math.sin(((i + 1.5) / 12) * Math.PI); addBeam(mb, x0, Math.sin(i * 0.9) * 0.1, x1, Math.sin((i + 1) * 0.9) * 0.1, 0, w0 + 0.02, 0.15, ink(), w1 + 0.02); } });
    this.eels = L.eels.map((e) => ({ e, body: ent(root, eelM, M.world, e.x, e.y, 0.6), glow: (() => { const h = ent(root, halo(dev), this.M.eel, e.x, e.y, 1.4, 93); h.enabled = false; return h; })() }));
    // the spindle's rings
    const beamM = SM('ringbeam', (mb) => { const k = mb.count; for (const [x, y, a] of [[-0.7, 0, 0.5], [0.7, 0, 0.5], [0.5, 7, 0], [-0.5, 7, 0]]) mb.vert(x, y, 0, 0, 0, 1, rgba(1, 0.62, 0.22, a)); mb.tri(k, k + 1, k + 2); mb.tri(k, k + 2, k + 3); });
    this.rings = L.rings.map((r) => { const lamp = ent(root, lampM, M.world, r.x, r.y + 0.09, 0.86); lamp.setLocalScale(1.6, 0.04, 0.03); const beam = ent(root, beamM, M.beam, r.x, r.y + 0.1, -0.3, 88); lamp.enabled = beam.enabled = false; return { r, lamp, beam, k: 0 }; });
    // the spindle's own light, for the end
    this.spin = null;
    for (const d of L.deco) {
      if (d.kind !== 'spindle') continue;
      const mat = worldMaterial({ tint: [1, 1, 1, 0] });
      const m = SM('spinglow', (mb) => addLathe(mb, [[0.5, 3], [1.56, 4.5], [2.58, 7.5], [2.78, 10], [2.28, 13], [1.06, 15.5], [0.4, 17]], { seg: 14, colFn: (t) => rgba(0.5 + 0.5 * t, 0.3 + 0.32 * t, 0.1 + 0.12 * t, 0) }));
      this.spin = { d, mat, e: ent(root, m, mat, d.x, d.y, -5.45), k: 0 };
      this.spin.e.enabled = false;
    }
  }

  /**
   * W: { open: {id: bool}, plates: [bool], levers: [bool], traps: [bool], slabs: [0 ok | 1 cracking | 2 gone],
   *      bell: {i: time since rung}, wake, scream, water (level), cp, rings: [bool], won (0..1) }
   */
  update(dt, T, W) {
    const lit = this.lit;
    lit.length = 0;
    for (const s of this.shafts || []) lit.push({ x: s.x, y: s.y + 0.6, z: 0.9, r: 2.2 + s.w, col: [0.72, 0.8, 0.78], k: 0.55 * s.k, pri: 0 });
    for (const o of this.crates || []) o.e.setLocalPosition(o.c.x, o.c.y, 0);
    (this.meat || []).forEach((o, k) => { const st = (W.meat && W.meat[k]) || 0; o.e.enabled = st < 2; if (st === 0) { o.e.setLocalPosition(o.q.x, o.q.hy - 0.95, 0.1); o.e.setLocalEulerAngles(0, 0, Math.sin(T * 0.8 + k) * 6); } else if (st === 1) { o.e.setLocalPosition(o.q.x, o.q.y + 0.75, 0.1); o.e.setLocalEulerAngles(0, 0, 80); } });
    (this.blooms || []).forEach((o, i) => { const gone = !!(W.blooms && W.blooms[i]); if (o.cap.enabled === gone) { o.cap.enabled = !gone; o.st.enabled = gone; o.h.enabled = !gone; } if (!gone) { const s = 1 + Math.sin(T * 2.3 + o.bl.x) * 0.06; o.cap.setLocalScale(s, s, s); lit.push({ x: o.bl.x, y: o.bl.y + 0.4, z: 0.6, r: 1.6, col: [0.7, 0.8, 0.6], k: 0.6, pri: 0 }); } });
    for (const o of this.presses || []) o.e.setLocalPosition(o.p.x + (pressWarn(o.p, T) ? Math.sin(T * 60) * 0.03 : 0), o.p.top - (o.p.top - o.p.y) * pressDown(o.p, T), 0);
    for (const o of this.fumes || []) o.e.setLocalPosition(Math.sin(T * 0.3 + o.f.x0) * 0.6, Math.sin(T * 0.5 + o.f.x0) * 0.15, 0);
    for (const o of this.lamps || []) { const l = o.l, held = l.by >= 0, fl = 0.9 + Math.sin(T * 11 + l.x0) * 0.07; o.e.setLocalPosition(l.x, l.y + (held ? 0.55 : 0), held ? 0.35 : 0.25); o.e.setLocalEulerAngles(0, 0, held ? Math.sin(T * 5) * 8 : 0); o.f.setLocalScale(1, fl, 1); lit.push({ x: l.x, y: l.y + 0.7, z: 0.6, r: (l.r || 2.6) + 1.4, col: [1, 0.62, 0.26], k: 2.1 * fl, pri: 4 }); }
    for (const o of this.eels || []) { const ph = eelAt(o.e, T); o.body.setLocalPosition(o.e.x + Math.sin(T * 0.7 + o.e.x) * 0.8, o.e.y + Math.sin(T * 1.3) * 0.15, 0.6); o.body.setLocalEulerAngles(0, 0, Math.sin(T * 2.2 + o.e.x) * 8); const g = ph.glow; o.glow.enabled = g > 0.02; if (g > 0.02) { const s = ph.flash ? o.e.r * 0.9 : 0.5 + g * 0.9; o.glow.setLocalPosition(o.body.getLocalPosition().x, o.e.y + (ph.flash ? 0.6 : 0), 1.4); o.glow.setLocalScale(s, s * (ph.flash ? 0.6 : 1), s); lit.push({ x: o.e.x, y: o.e.y + 0.8, z: 1, r: ph.flash ? o.e.r + 2 : 2.5, col: [0.72, 0.9, 1], k: ph.flash ? 3 : g * 0.9, pri: 2 }); } }
    for (const o of this.candles || []) { const fl = 0.85 + Math.sin(T * 13 + o.c.x) * 0.08 + Math.sin(T * 31 + o.c.x * 3) * 0.05; o.f.enabled = o.h.enabled = !o.c.out; if (o.c.out) continue; o.f.setLocalScale(1, fl, 1); o.h.setLocalScale(0.7 * fl, 0.9 * fl, 0.7); lit.push({ x: o.c.x, y: o.c.y + 1.2, z: 0.4, r: 4.8, col: [1, 0.6, 0.25], k: 1.7 * fl, pri: 1 }); }
    if (this.L.exit) { const e = this.L.exit; lit.push({ x: e.x + 0.6, y: e.y + 2, z: -0.4, r: 4.2, col: [0.78, 0.84, 0.8], k: 0.9 + Math.sin(T * 0.8) * 0.1, pri: 0 }); }
    const ease = (o, to, rate) => { o.k += (to - o.k) * Math.min(1, dt * rate); return o.k; };
    for (const o of this.gates) { const k = ease(o, W.open[o.g.id] ? 1 : 0, 3.2); o.e.setLocalPosition(o.g.x, o.g.y - k * (o.g.h + 0.7) + (k > 0.02 && k < 0.97 ? Math.sin(T * 60) * 0.015 : 0), 0); }
    this.plates.forEach((o, i) => { const on = !!W.plates[i] || !!W.open[o.p.id]; const k = ease(o, W.plates[i] ? 1 : 0, 14); o.e.setLocalPosition(o.p.x, o.p.y - k * 0.1, 0); if (o.lamp.enabled !== on) o.lamp.enabled = o.h.enabled = on; if (on) lit.push({ x: o.p.x, y: o.p.y + 0.5, z: 0.8, r: 3.2, col: AMBER, k: 1.5 }); });
    this.levers.forEach((o, i) => { if (o.valve) { const on = !!W.levers[i]; o.a += (on ? 220 : 0) * dt; o.e.setLocalEulerAngles(0, 0, -o.a); if (o.h.enabled !== (on || !!W.open[o.l.id])) o.h.enabled = on || !!W.open[o.l.id]; return; } const on = !!W.levers[i] || !!W.open[o.l.id]; o.a += ((on ? -38 : 38) - o.a) * Math.min(1, dt * 12); o.e.setLocalEulerAngles(0, 0, o.a); if (o.lamp.enabled !== on) o.lamp.enabled = o.h.enabled = on; if (on) lit.push({ x: o.l.x + 0.5, y: o.l.y + 1.1, z: 0.6, r: 3, col: AMBER, k: 1.5 }); });
    this.traps.forEach((o, i) => {
      // a hidden one lies sunk under the grass, and comes up only when someone is all but on it
      if (o.t.hidden) { const near = W.meX != null && Math.abs(W.meX - o.t.x) < 1.5; o.rv = (o.rv || 0) + ((near || W.traps[i] ? 1 : 0) - (o.rv || 0)) * Math.min(1, dt * (near ? 22 : 2)); o.e.setLocalPosition(o.t.x, o.t.y + 0.02 - (1 - o.rv) * 0.42, 0); }
      const to = W.traps[i] ? 1 : 0; o.v += ((to - o.k) * 420 - o.v * 26) * dt; o.k = clamp(o.k + o.v * dt, 0, 1.06); const a = o.k * 78; o.a.setLocalEulerAngles(0, 0, a); o.b.setLocalEulerAngles(0, 0, -a); });
    for (const o of this.worms) { const k = wormOut(o.w, T); const on = k > 0.01; if (o.e.enabled !== on) o.e.enabled = on; if (on) { o.e.setLocalScale(1 + (1 - k) * 0.3, o.w.len * k, 1 + (1 - k) * 0.3); o.e.setLocalEulerAngles(0, 0, (o.w.dir < 0 ? 180 : 0) + Math.sin(T * 9 + o.w.x) * 5 * k); } }
    this.cps.forEach((o, i) => { const on = i <= W.cp; if (o.on !== on) { o.on = on; o.lamp.enabled = o.h.enabled = on; } if (on) lit.push({ x: o.c.x - 0.54, y: o.c.y + 1.5, z: -0.9, r: 3.6, col: AMBER, k: 1.0 + Math.sin(T * 7 + i) * 0.08 }); });
    this.bells.forEach((o, i) => { const t = W.bell[i] ?? 9; const sw = t < 3 ? Math.sin(t * 9) * Math.exp(-t * 1.4) * 32 : Math.sin(T * 0.9 + i * 2) * 1.5; o.e.setLocalEulerAngles(0, 0, sw); });
    for (const o of this.choir) {
      const sway = Math.sin(T * 0.7 + o.i * 1.7) * 3 + (W.wake > 0.05 ? Math.sin(T * 13 + o.i) * W.wake * 3 : 0);
      o.drop += ((W.scream ? 1 : 0) - o.drop) * Math.min(1, dt * (W.scream ? 7 : 2));
      o.e.setLocalPosition(o.x, o.y - o.drop * 3.6, o.e.getLocalPosition().z);
      o.e.setLocalEulerAngles(0, 0, sway);
      const eyes = W.wake > 0.12 + (o.i % 3) * 0.2 || W.scream;
      if (o.eyes.enabled !== eyes) o.eyes.enabled = eyes;
    }
    this.slabs.forEach((o, i) => { const st = W.slabs[i] || 0; const on = st < 2; if (o.e.enabled !== on) o.e.enabled = on; if (on) o.e.setLocalPosition(o.s.x0 + (st === 1 ? Math.sin(T * 70) * 0.03 : 0), o.s.y - 0.16 - (st === 1 ? 0.04 : 0), 0); });
    for (const o of this.cogs) o.e.setLocalEulerAngles(0, 0, ((T * 360 * o.d.dir) / o.d.period) % 360);
    for (const o of this.pads) { const p = cogPad(o.c, o.k, T); o.e.setLocalPosition(p.x, p.y, 0); }
    for (const o of this.shears) { const k = shearsShut(o.s, T), sh = shearsWarn(o.s, T) ? Math.sin(T * 55) * 0.05 : 0; o.up.setLocalPosition(o.s.x + sh, o.s.y + 3.4 - k * 2.5, 0); o.dn.setLocalPosition(o.s.x - sh, o.s.y - 0.2 + k * 1.45, 0); }
    this.waters.forEach((w) => { const i = w.W.i, lv = W.wl[i], h = lv - w.W.floor; const on = h > 0.02; if (w.e.enabled !== on) w.e.enabled = w.top.enabled = on; if (on) { const wd = w.W.x1 - w.W.x0; w.e.setLocalPosition(w.W.x0, lv, 1.3); w.e.setLocalScale(wd, h, 1); w.top.setLocalPosition(w.W.x0, lv + Math.sin(T * 1.6 + i) * 0.02, 1.31); w.top.setLocalScale(wd, 1, 1); } });
    this.rings.forEach((o, i) => { const on = !!W.rings[i] || W.won > 0; if (o.lamp.enabled !== on) o.lamp.enabled = o.beam.enabled = on; if (on) lit.push({ x: o.r.x, y: o.r.y + 0.6, z: 0.9, r: 4, col: AMBER, k: 1.8 }); });
    if (this.spin) { const on = W.won > 0.001; if (this.spin.e.enabled !== on) this.spin.e.enabled = on; if (on) { setTint(this.spin.mat, 1, 1, 1, W.won * 0.42); lit.push({ x: this.spin.d.x, y: this.spin.d.y + 8, z: -2, r: 30, col: AMBER, k: 2.6 * W.won, pri: 5 }); } }
  }
}
