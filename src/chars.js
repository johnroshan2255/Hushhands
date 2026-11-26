// The sackcloth dolls. Cartoon proportions (a big head, chunky limbs) so they read as silhouettes from
// across the Loom. Each doll is a small skeleton: pelvis, spine, head, two-bone arms and two-bone legs.
// Legs are placed by where the feet should be (a tiny IK solve), so walking, the tiptoe creep and
// running all come from foot paths, not canned poses. (The rig began in Hushhands.)
import * as pc from 'playcanvas';
import { MeshBuilder, rgba, addBox, addSphere, addLathe } from './meshes.js';
import { worldMaterial, tintMaterial } from './render.js';

const box = (mb, x0, x1, y0, y1, z0, z1, c) => addBox(mb, { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, sx: x1 - x0, sy: y1 - y0, sz: z1 - z0, col: c });
const K = (c, k = 1, g = 0) => rgba(c[0] * k, c[1] * k, c[2] * k, g);
const meshCache = new Map();
let MAT = null, SHADOW = null;
const R2D = 180 / Math.PI;
const frac = (v) => v - Math.floor(v);
const ss = (v) => v * v * (3 - 2 * v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function part(device, key, fn) {
  if (!meshCache.has(key)) { const mb = new MeshBuilder(); fn(mb); meshCache.set(key, mb.build(device)); }
  return meshCache.get(key);
}
/** one flat-coloured ring of a tube (crisp stripes: bands don't share vertices) */
function band(mb, yA, rA, yB, rB, col, { seg = 10, sx = 1, sz = 1, x = 0, z = 0 } = {}) {
  const b = mb.count;
  const sl = (rA - rB) / Math.max(1e-4, Math.abs(yB - yA));
  for (let k = 0; k <= seg; k++) {
    const th = (k / seg) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    mb.vert(x + c * rA * sx, yA, z + s * rA * sz, c, sl * 0.5, s, col);
    mb.vert(x + c * rB * sx, yB, z + s * rB * sz, c, sl * 0.5, s, col);
  }
  for (let k = 0; k < seg; k++) { const i = b + k * 2; mb.tri(i, i + 1, i + 2); mb.tri(i + 1, i + 3, i + 2); }
}
/** a tube through [y, r] points, one colour per band: colFn(i, n) */
function tube(mb, pts, colFn, o = {}) { for (let i = 0; i < pts.length - 1; i++) band(mb, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], colFn(i, pts.length - 1), o); }
/** a limb hanging down from its pivot: bands from (0, r0) to (-len, r1), rounded at both ends */
function limb(mb, len, r0, r1, colFn, n = 4, o = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([-(len * i) / n, r0 + ((r1 - r0) * i) / n]);
  tube(mb, pts, colFn, o);
  addSphere(mb, { y: 0, r: r0, segW: 8, segH: 5, colFn: () => colFn(0, n) });
  addSphere(mb, { y: -len, r: r1, segW: 8, segH: 5, colFn: () => colFn(n - 1, n) });
}

// ---------------------------------------------------------------- the doll
const DOLL = { hip: 0.74, L1: 0.36, L2: 0.34, legs: [0.03, 0.03, 0.032], shoe: [0.02, 0.02, 0.022] };
const SACK = [0.045, 0.043, 0.04], SEAM = [0.1, 0.095, 0.085]; // all but black, the stitching a shade lighter

function torsoMesh(device) {
  return part(device, 'torso', (mb) => {
    // a sack with a hole for the head, belted with the thread, its hem in tatters
    tube(mb, [[-0.24, 0.24], [-0.12, 0.225], [0.02, 0.2], [0.07, 0.19], [0.18, 0.2], [0.3, 0.19], [0.39, 0.155], [0.45, 0.11], [0.48, 0.08]], () => K(SACK), { sz: 0.82, seg: 10 });
    for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, x = Math.cos(a) * 0.22, z = Math.sin(a) * 0.18, l = 0.05 + ((k * 7) % 4) * 0.035; box(mb, x - 0.04, x + 0.04, -0.24 - l, -0.23, z - 0.035, z + 0.035, K(SACK)); }
    band(mb, 0.03, 0.208, 0.085, 0.2, K(SEAM, 1.3), { sz: 0.82, seg: 10 });
    for (const sx of [-1, 1]) addSphere(mb, { x: sx * 0.2, y: 0.06, z: 0.04, r: 0.062, segW: 7, segH: 5, colFn: () => rgba(1, 0.66, 0.26, 1) }); // the thread's knot, glowing, on the hip
    box(mb, -0.012, 0.012, 0.1, 0.44, 0.15, 0.165, K(SEAM)); // a seam down the front
  });
}
function pelvisMesh(device) {
  return part(device, 'pelvis', (mb) => {
    tube(mb, [[-0.1, 0.13], [0, 0.165], [0.06, 0.165]], () => K(DOLL.legs), { sz: 0.76, seg: 12 });
    addSphere(mb, { y: -0.06, r: 0.14, sy: 0.6, segW: 10, segH: 5, colFn: () => K(DOLL.legs) });
  });
}
function armMesh(device, lower) {
  return part(device, `arm:${lower}`, (mb) => {
    const len = lower ? 0.23 : 0.25;
    limb(mb, len, lower ? 0.052 : 0.06, lower ? 0.048 : 0.052, () => K(SACK), 2);
    if (lower) addSphere(mb, { y: -len - 0.03, r: 0.075, segW: 6, segH: 4, colFn: () => K(SACK, 0.9) });
  });
}
function legMesh(device, lower) {
  return part(device, `leg:${lower}`, (mb) => limb(mb, lower ? DOLL.L2 : DOLL.L1, lower ? 0.062 : 0.075, lower ? 0.055 : 0.062, () => K(DOLL.legs), 2));
}
function footMesh(device) {
  return part(device, 'foot', (mb) => {
    addSphere(mb, { y: 0.0, z: 0.05, r: 0.075, sy: 0.75, segW: 8, segH: 5, colFn: () => K(DOLL.shoe) });
    mb.p.forEach((val, i) => { if (i % 3 === 2) mb.p[i] = (val - 0.05) * 1.7 + 0.05; }); // stretch into a shoe
    box(mb, -0.07, 0.07, -0.065, -0.045, -0.08, 0.19, K(DOLL.shoe, 0.6));
  });
}
/** four sack heads, told apart by their silhouettes from the side: tied, eared, hooded, square */
function headMesh(device, v) {
  return part(device, `head:${v % 4}`, (mb) => {
    const c = () => K(SACK);
    addSphere(mb, { y: 0.23, r: 0.275, sy: 0.92, segW: 12, segH: 9, colFn: c });
    for (let i = -2; i <= 2; i++) box(mb, i * 0.05 - 0.012, i * 0.05 + 0.012, 0.11, 0.15, 0.245, 0.26, K(SEAM)); // a stitched mouth
    switch (v % 4) {
      case 0: // tied off at the top: a tuft
        tube(mb, [[0.44, 0.1], [0.5, 0.05], [0.56, 0.06], [0.66, 0.15]], c); band(mb, 0.49, 0.062, 0.53, 0.062, K(SEAM, 1.4)); break;
      case 1: // two long corners, front and back, like ears
        for (const sz of [-1, 1]) addLathe(mb, [[0.12, 0], [0.085, 0.2], [0.04, 0.38], [0.0, 0.5]], { seg: 6, z: sz * 0.14, y: 0.36, colFn: c, warp: (x, y, z) => [x, y, z + sz * y * 0.55] }); break;
      case 2: // a tall hood, its point drooping behind
        addLathe(mb, [[0.26, 0.26], [0.2, 0.44], [0.11, 0.62], [0.05, 0.76], [0.0, 0.86]], { seg: 9, colFn: c, warp: (x, y, z) => [x, y - Math.max(0, y - 0.5) * Math.max(0, y - 0.5) * 1.6, z - Math.max(0, y - 0.42) * 1.0] }); break;
      default: // a square sack: flat on top, a knot at each corner
        box(mb, -0.22, 0.22, 0.3, 0.53, -0.25, 0.25, c()); for (const sz of [-1, 1]) addSphere(mb, { z: sz * 0.26, y: 0.56, r: 0.09, segW: 6, segH: 4, colFn: c });
    }
  });
}

// ---------------------------------------------------------------- how they move: foot paths per gait
// stride: half a step (m); lift: how high the foot comes up; duty: share of the cycle on the ground;
// toe: how far the toes point down in the air; drop: how low the hips sit; lean: the torso's lean (deg)
const GAITS = {
  walk: { stride: 0.21, lift: 0.09, duty: 0.6, sharp: 1.4, toe: 16, drop: 0.03, bob: 0.012, lean: 6 },
  sneak: { stride: 0.25, lift: 0.2, duty: 0.56, sharp: 0.9, toe: 38, drop: 0.2, bob: 0.02, lean: 26 },
  run: { stride: 0.34, lift: 0.18, duty: 0.45, sharp: 1.3, toe: 22, drop: 0.05, bob: 0.026, lean: 16 },
};
const ANK = 0.07; // the ankle's height above the sole

export class Rig {
  /** variant: which of the four heads */
  constructor(app, { variant = 0 } = {}) {
    const device = app.graphicsDevice;
    if (!MAT) { MAT = worldMaterial(); SHADOW = tintMaterial(); SHADOW.setParameter('uTint', new Float32Array([0, 0, 0, 0.42])); }
    this.L = DOLL;
    const ent = (name, mesh, parent, x = 0, y = 0, z = 0) => { const e = new pc.Entity(name); if (mesh) e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, MAT)], castShadows: false }); e.setLocalPosition(x, y, z); parent.addChild(e); return e; };
    this.root = new pc.Entity('rig');
    this.body = ent('body', null, this.root);
    this.pelvis = ent('pelvis', pelvisMesh(device), this.body);
    this.spine = ent('spine', torsoMesh(device), this.pelvis, 0, 0.02, 0);
    this.head = ent('head', headMesh(device, variant), this.spine, 0, 0.47, 0);
    this.arms = [-1, 1].map((s) => { const up = ent('arm', armMesh(device, false), this.spine, s * 0.215, 0.4, 0); const lo = ent('fore', armMesh(device, true), up, 0, -0.25, 0); return { up, lo, s }; });
    this.legs = [-1, 1].map((s) => { const th = ent('thigh', legMesh(device, false), this.pelvis, s * 0.085, 0, 0); const sh = ent('shin', legMesh(device, true), th, 0, -DOLL.L1, 0); const ft = ent('foot', footMesh(device), sh, 0, -DOLL.L2, 0); return { th, sh, ft, s }; });
    // a soft shadow on the ground
    const sh = new pc.Entity('shadow');
    sh.addComponent('render', { meshInstances: [new pc.MeshInstance(part(device, 'blob', (mb) => { const c = mb.vert(0, 0, 0, 0, 1, 0, rgba(0, 0, 0, 1)); const b = mb.count; for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; mb.vert(Math.cos(a), 0, Math.sin(a), 0, 1, 0, rgba(0, 0, 0, 0)); } for (let i = 0; i < 16; i++) mb.tri(c, b + i, b + i + 1); }), SHADOW)], castShadows: false });
    sh.render.meshInstances[0].drawOrder = 20;
    this.root.addChild(sh);
    this.shadow = sh;
    this.phase = Math.random();
    this.yaw = 90;
    this.visible = true;
    this.g = { ...GAITS.walk };
    this.c = null; // the smoothed pose
    this.moveK = 0; this.lieK = 0; this.dip = 0; this.dipV = 0; this.wasAir = false; this.idleT = Math.random() * 10;
    this.ry = null; this.spd = 0; this.accLean = 0; this.airVy = 0;
    app.root.addChild(this.root);
  }

  setVisible(v) { if (v !== this.visible) { this.visible = v; this.root.enabled = v; } }

  /**
   * s: { x, y, z, facing (-1|1), speed, vx, vy, crouch, anim, t, noShadow }
   * anim: walk (idle when still) | air | hang | ropeclimb | haul | brace | fear | dead | possessed | lunge
   */
  pose(dt, s) {
    const HIP = DOLL.hip;
    const lie = s.anim === 'dead';
    // the body follows the physics box, but a small step up or down is eased, not snapped
    const grounded = s.anim === 'walk' || s.anim === 'brace' || s.anim === 'possessed';
    if (this.ry === null || !grounded || Math.abs(s.y - this.ry) > 0.6) this.ry = s.y;
    else this.ry += (s.y - this.ry) * Math.min(1, dt * 18);
    this.root.setPosition(s.x, this.ry, s.z);
    // ---- heading
    const target = s.facing >= 0 ? 90 : -90;
    let d = target - this.yaw;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    this.yaw += d * Math.min(1, dt * (lie ? 30 : 13));
    this.root.setLocalEulerAngles(0, this.yaw, 0);
    // ---- gait
    const t = s.t || 0;
    const moving = s.speed > 0.15 && !lie;
    const gait = s.crouch ? 'sneak' : s.speed > 3.3 ? 'run' : 'walk';
    const G = GAITS[gait], g = this.g;
    const gk = Math.min(1, dt * 9);
    for (const k in G) g[k] += (G[k] - g[k]) * gk;
    this.moveK += ((moving ? 1 : 0) - this.moveK) * Math.min(1, dt * 10);
    this.lieK += ((lie ? 1 : 0) - this.lieK) * Math.min(1, dt * 7);
    if (moving) this.phase += (dt * s.speed * g.duty) / (2 * g.stride);
    this.idleT += dt;
    const p = this.phase, mk = this.moveK, lk = this.lieK;
    const foot = (u) => {
      if (u < g.duty) { const k = u / g.duty; return [g.stride * (1 - 2 * k), 0, 0]; }
      const v = (u - g.duty) / (1 - g.duty);
      return [g.stride * (-1 + 2 * ss(v)), g.lift * Math.pow(Math.sin(Math.PI * v), g.sharp), g.toe * Math.sin(Math.PI * v)];
    };
    const crouchStill = s.crouch && !lie ? 1 - mk : 0;
    // the target pose
    const P = {
      pelY: HIP - (g.drop * mk + 0.2 * crouchStill) - g.bob * (0.5 - 0.5 * Math.cos(p * 4 * Math.PI)) * mk,
      roll: Math.sin(p * 2 * Math.PI) * 2.5 * mk,
      lean: g.lean * mk + 22 * crouchStill, twist: Math.sin(p * 2 * Math.PI) * 7 * mk,
      hYaw: 0, hPitch: 0,
      shL: 0, elL: 10, abL: 4, shR: 0, elR: 10, abR: 4,
      fLz: 0, fLy: 0, fLp: 0, fRz: 0, fRy: 0, fRp: 0,
      bodyP: 0, bodyY: 0, bodyZ: 0,
    };
    const fl = foot(frac(p)), fr = foot(frac(p + 0.5));
    P.fLz = fl[0] * mk + 0.09 * crouchStill; P.fLy = fl[1] * mk; P.fLp = fl[2] * mk;
    P.fRz = fr[0] * mk - 0.09 * crouchStill; P.fRy = fr[1] * mk; P.fRp = fr[2] * mk;
    const sw = Math.sin(p * 2 * Math.PI);
    // arms by gait
    if (gait === 'sneak') {
      // the tiptoe: elbows in, hands dangling in front of the chest, bobbing with each step
      const hb = Math.sin(p * 4 * Math.PI) * 7 * mk;
      P.shL = 38 + hb; P.shR = 38 - hb; P.elL = 112; P.elR = 112; P.abL = 10; P.abR = 10;
      P.hPitch = -g.lean * 0.75 * mk - 14 * crouchStill;
      P.hYaw = Math.sin(this.idleT * 1.1) * 28 * (0.35 + 0.65 * crouchStill); // eyes everywhere
    } else if (gait === 'run') { P.shL = -sw * 55; P.shR = sw * 55; P.elL = 85; P.elR = 85; P.hPitch = -10; }
    else { P.shL = -sw * 22 * mk; P.shR = sw * 22 * mk; P.elL = 12 + 10 * mk; P.elR = 12 + 10 * mk; }
    if (!moving && !s.crouch && !lie) { P.lean += Math.sin(this.idleT * 1.7) * 1.2; P.hYaw += Math.sin(this.idleT * 0.43) * 10 * ss(clamp(Math.sin(this.idleT * 0.21) * 2, 0, 1)); } // standing: breathing, looking about
    // leaning into a start, rocking back at a stop: the change in speed, smoothed
    const acc = (s.speed - this.spd) / Math.max(dt, 1e-3); this.spd = s.speed;
    this.accLean += (clamp(acc * 1.6, -14, 14) - this.accLean) * Math.min(1, dt * 6);
    if (!lie) P.lean += this.accLean;
    // the head trails the body a touch as it bobs
    P.hPitch += Math.sin(p * 4 * Math.PI - 0.6) * 3 * mk;
    switch (s.anim) {
      case 'brace': P.lean = -16; P.pelY = HIP - 0.14; P.fLz = 0.24; P.fRz = -0.2; P.shL = P.shR = 48; P.elL = P.elR = 35; P.hPitch = 8; break; // heels dug in, both hands on the thread
      case 'hang': { const c2 = Math.sin(t * 2.2) * 6; P.shL = 168; P.shR = 172; P.elL = P.elR = 8; P.abL = P.abR = -6; P.fLz = 0.05 + c2 * 0.004; P.fRz = -0.06; P.fLy = 0.04; P.fRy = 0.0; P.fLp = P.fRp = 35; P.lean = c2 * 0.5; break; } // both hands on the thread overhead
      case 'ropeclimb': { const c2 = Math.sin(t * 9); P.shL = 162 + c2 * 16; P.shR = 162 - c2 * 16; P.elL = 28 - c2 * 24; P.elR = 28 + c2 * 24; P.fLz = 0.1; P.fRz = 0.06; P.fLy = 0.16 + c2 * 0.08; P.fRy = 0.16 - c2 * 0.08; P.fLp = P.fRp = 30; break; } // hand over hand up the thread
      case 'haul': P.shL = P.shR = 125; P.elL = P.elR = 70; P.lean = 26; P.fLz = 0.16; P.fRz = -0.1; P.fLy = 0.24; P.fRy = 0.05; P.hPitch = -14; break; // up and over a ledge
      case 'fear': P.shL = 150 + Math.sin(t * 16) * 10; P.shR = 150 - Math.sin(t * 16) * 10; P.elL = P.elR = 40; P.abL = P.abR = 20; P.fLy = 0.1; P.fRy = 0.16; P.fLz = 0.1; P.fRz = -0.08; break; // lifted off the ground
      // a worm in the head: it jerks the head about and walks the body, hands clawing at the skull
      case 'possessed': { const j = Math.sin(t * 23) * Math.sin(t * 7.3); P.hYaw = j * 55; P.hPitch = -25 + Math.sin(t * 17) * 30; P.shL = 150 + Math.sin(t * 11) * 18; P.shR = 95 + Math.sin(t * 13) * 30; P.elL = 120; P.elR = 40; P.abL = 30; P.abR = 10; P.lean += 14 + Math.sin(t * 9) * 8; P.roll += Math.sin(t * 19) * 6; break; }
      case 'lunge': P.shL = P.shR = 100; P.elL = P.elR = 4; P.abL = P.abR = -4; P.lean = 34; P.hPitch = -30; P.hYaw = Math.sin(t * 40) * 12; P.fLz = 0.28; P.fRz = -0.24; P.pelY = HIP - 0.1; break;
      case 'air': { // shaped by the arc: knees up as it rises, reaching down for the ground as it falls
        const vy = s.vy ?? 0, up = clamp(vy / 7, -1, 1), fall = clamp(-vy / 9, 0, 1), fwd = clamp(Math.abs(s.vx ?? 0) / 3.6, 0, 1);
        this.airVy = vy;
        const tuck = Math.max(0, up) * 0.24;
        P.fLz = 0.16 * fwd + 0.04 - fall * 0.06; P.fRz = -0.08 * fwd - fall * 0.02;
        P.fLy = 0.12 + tuck - fall * 0.1; P.fRy = 0.05 + tuck * 0.6 - fall * 0.05;
        P.fLp = 20 + fall * 25; P.fRp = 10 + fall * 30;
        P.shL = 60 + up * 50 + fall * 70; P.shR = 20 + up * 40 + fall * 90; P.elL = 40 - fall * 20; P.elR = 30; P.abL = 14 + fall * 30; P.abR = 10 + fall * 34;
        P.lean = 10 * fwd + up * 6 - fall * 8; P.hPitch = up > 0 ? -10 : fall * 12;
        P.pelY = HIP + tuck * 0.2;
        break;
      }
      default: break;
    }
    if (lk > 0.01) {
      // fallen on their back, head turned aside
      P.bodyP = -90; P.bodyY = 0.17; P.bodyZ = 0.8;
      P.pelY = HIP; P.lean = 0; P.roll = 0; P.twist = 0;
      P.fLz = 0; P.fRz = 0; P.fLy = P.fRy = 0.02; P.fLp = P.fRp = 30;
      P.shL = 8; P.shR = 10; P.elL = P.elR = 12; P.abL = P.abR = 22;
      P.hYaw = 35; P.hPitch = 0;
    }
    // landing: the knees take it, by how hard it came down, and spring back
    const air = s.anim === 'air';
    if (this.wasAir && !air && !lie) { const hard = clamp(-this.airVy / 12, 0.25, 1); this.dipV = -hard * 5.5; }
    this.wasAir = air;
    for (let n = Math.min(12, Math.ceil(dt * 240)), h = dt / Math.max(1, n), i = 0; i < n; i++) { this.dipV += (-this.dip * 140 - this.dipV * 16) * h; this.dip += this.dipV * h; } // a stiff, well-damped spring
    if (!air && !lie) { P.pelY += this.dip * 0.3; P.lean -= this.dip * 40; P.hPitch -= this.dip * 30; P.shL -= this.dip * 160; P.shR -= this.dip * 160; P.abL -= this.dip * 60; P.abR -= this.dip * 60; }
    // ---- ease toward it (feet follow fast, poses blend in); lying down or getting up snaps
    if (!this.c) this.c = { ...P };
    const c = this.c, kf = Math.min(1, dt * 22), ks = Math.min(1, dt * 9);
    const snap = (lk > 0.5) !== this.wasLie;
    this.wasLie = lk > 0.5;
    for (const k in P) c[k] = snap ? P[k] : c[k] + (P[k] - c[k]) * (k[0] === 'f' || k === 'pelY' ? kf : ks);
    // ---- apply
    this.body.setLocalPosition(0, c.bodyY, c.bodyZ * lk);
    this.body.setLocalEulerAngles(c.bodyP, 0, 0);
    const pelY = c.pelY;
    const pelZ = -c.lean * 0.0016;
    this.pelvis.setLocalPosition(0, pelY, pelZ);
    this.pelvis.setLocalEulerAngles(0, c.twist * 0.5, c.roll);
    this.spine.setLocalEulerAngles(c.lean, -c.twist, 0);
    this.head.setLocalEulerAngles(c.hPitch, c.hYaw, 0);
    this.armPose(this.arms[0], c.shL, c.elL, c.abL);
    this.armPose(this.arms[1], c.shR, c.elR, c.abR);
    this.legIK(this.legs[0], c.fLz - pelZ, c.fLy + ANK - pelY, c.fLp);
    this.legIK(this.legs[1], c.fRz - pelZ, c.fRy + ANK - pelY, c.fRp);
    const shS = lk > 0.5 ? 0.75 : air ? 0.28 : 0.36;
    this.shadow.setLocalPosition(0, 0.03, 0);
    this.shadow.setLocalScale(shS, 1, lk > 0.5 ? shS * 0.6 : shS);
    const showSh = !s.noShadow;
    if (this.shadow.enabled !== showSh) this.shadow.enabled = showSh;
  }
  /** sh: raise forward (deg, 0 hanging, 90 straight ahead, 180 up); el: elbow bend; ab: out from the side */
  armPose(a, sh, el, ab) {
    a.up.setLocalEulerAngles(-sh, 0, a.s * ab);
    a.lo.setLocalEulerAngles(-el, 0, 0);
  }
  /** put the ankle at (tz forward, ty below the hip), knee forward; pitch tips the toes down */
  legIK(leg, tz, ty, pitch) {
    const L1 = DOLL.L1, L2 = DOLL.L2;
    const dist = clamp(Math.hypot(tz, ty), 0.08, L1 + L2 - 0.004);
    const a = Math.atan2(tz, -ty);
    const k = Math.acos(clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
    const knee = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2), -1, 1));
    const th = (a + k) * R2D, kn = knee * R2D;
    leg.th.setLocalEulerAngles(-th, 0, 0);
    leg.sh.setLocalEulerAngles(kn, 0, 0);
    leg.ft.setLocalEulerAngles(th - kn + pitch, 0, 0);
  }

  destroy() { this.root.destroy(); }
}

/** the doll's pieces, for a body that has stopped being a doll (src/gore.js) */
export function dollMeshes(device, variant = 0) {
  if (!MAT) { MAT = worldMaterial(); SHADOW = tintMaterial(); SHADOW.setParameter('uTint', new Float32Array([0, 0, 0, 0.42])); }
  return { mat: MAT, torso: torsoMesh(device), pelvis: pelvisMesh(device), head: headMesh(device, variant), armU: armMesh(device, false), armL: armMesh(device, true), legU: legMesh(device, false), legL: legMesh(device, true), foot: footMesh(device), dims: DOLL };
}
