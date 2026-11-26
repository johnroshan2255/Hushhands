// (From Hushhands, with a new look added: the sackcloth dolls of The Thread-Bearers.)
// People and animals. Cartoon proportions (big heads, chunky limbs) so they read from across the
// street and from above. Each person is a small skeleton: pelvis, spine, head, two-bone arms and
// two-bone legs. Legs are placed by where the feet should be (a tiny IK solve), so walking, the
// tiptoe sneak, running, kneeling at a lock and climbing all come from foot paths, not canned poses.
//
// The burglar: striped jumper, eye mask, gloves, a hat in the crew's colour and a swag sack on his
// back that fills up. Residents wear nightgowns and caps; constables wear tunics and tall helmets.
import * as pc from 'playcanvas';
import { MeshBuilder, rgba, addBox, addSphere, addCylinder, addLathe } from './meshes.js';
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

// ---------------------------------------------------------------- looks
const CREAM = [0.9, 0.87, 0.78], INK = [0.1, 0.1, 0.13], SKIN = [0.86, 0.64, 0.5], SKIN2 = [0.74, 0.52, 0.4];
const LOOKS = {
  thief: { hip: 0.74, L1: 0.36, L2: 0.34, legs: [0.13, 0.14, 0.19], shoe: [0.06, 0.06, 0.07] },
  resident: { hip: 0.7, L1: 0.34, L2: 0.32, legs: SKIN, shoe: [0.45, 0.25, 0.2] },
  cop: { hip: 0.78, L1: 0.38, L2: 0.36, legs: [0.1, 0.12, 0.24], shoe: [0.05, 0.05, 0.06] },
  doll: { hip: 0.74, L1: 0.36, L2: 0.34, legs: [0.03, 0.03, 0.032], shoe: [0.02, 0.02, 0.022] },
};
const GOWNS = [[0.92, 0.9, 0.84], [0.74, 0.84, 0.92], [0.94, 0.8, 0.82], [0.8, 0.9, 0.78], [0.9, 0.86, 0.66]];
const ROBE = [0.5, 0.16, 0.18];
const SACK = [0.045, 0.043, 0.04], SEAM = [0.1, 0.095, 0.085]; // the dolls: all but black, the stitching a shade lighter

function torsoMesh(device, look, v) {
  return part(device, `torso:${look}:${v}`, (mb) => {
    const prof = [[0.02, 0.165], [0.12, 0.158], [0.22, 0.178], [0.32, 0.19], [0.39, 0.175], [0.44, 0.12], [0.47, 0.075]];
    const pts = [];
    for (let i = 0; i < prof.length - 1; i++) for (let s = 0; s < 2; s++) { const t = s / 2; pts.push([prof[i][0] + (prof[i + 1][0] - prof[i][0]) * t, prof[i][1] + (prof[i + 1][1] - prof[i][1]) * t]); }
    pts.push(prof[prof.length - 1]);
    if (look === 'doll') {
      // a sack with a hole for the head, belted with the thread, its hem in tatters
      tube(mb, [[-0.24, 0.24], [-0.12, 0.225], [0.02, 0.2], [0.07, 0.19], [0.18, 0.2], [0.3, 0.19], [0.39, 0.155], [0.45, 0.11], [0.48, 0.08]], () => K(SACK), { sz: 0.82, seg: 10 });
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, x = Math.cos(a) * 0.22, z = Math.sin(a) * 0.18, l = 0.05 + ((k * 7) % 4) * 0.035; box(mb, x - 0.04, x + 0.04, -0.24 - l, -0.23, z - 0.035, z + 0.035, K(SACK)); }
      band(mb, 0.03, 0.208, 0.085, 0.2, K(SEAM, 1.3), { sz: 0.82, seg: 10 });
      for (const sx of [-1, 1]) addSphere(mb, { x: sx * 0.2, y: 0.06, z: 0.04, r: 0.062, segW: 7, segH: 5, colFn: () => rgba(1, 0.66, 0.26, 1) }); // the thread's knot, glowing, on the hip
      box(mb, -0.012, 0.012, 0.1, 0.44, 0.15, 0.165, K(SEAM)); // a seam down the front
    } else if (look === 'thief') tube(mb, pts, (i) => (i % 2 ? K(INK) : K(CREAM, 1, 0.07)), { sz: 0.74, seg: 12 }); // the striped jumper
    else if (look === 'cop') {
      tube(mb, pts, () => K([0.12, 0.15, 0.3]), { sz: 0.74, seg: 12 });
      band(mb, 0.08, 0.172, 0.13, 0.17, K([0.05, 0.05, 0.06]), { sz: 0.76, seg: 12 }); // belt
      box(mb, -0.035, 0.035, 0.085, 0.125, 0.125, 0.14, rgba(0.85, 0.7, 0.3, 0.5));
      for (let i = 0; i < 4; i++) addSphere(mb, { y: 0.18 + i * 0.065, z: 0.135, r: 0.016, segW: 5, segH: 3, colFn: () => rgba(0.9, 0.75, 0.3, 0.6) });
    } else {
      const c = v === 9 ? ROBE : GOWNS[v % GOWNS.length];
      tube(mb, pts, (i) => K(c, 0.95 + (i % 2) * 0.05), { sz: 0.76, seg: 12 });
      if (v === 9) band(mb, 0.1, 0.172, 0.14, 0.17, K([0.8, 0.65, 0.3]), { sz: 0.78, seg: 12 }); // the dressing gown's cord
    }
  });
}
function pelvisMesh(device, look, v) {
  return part(device, `pelvis:${look}:${v}`, (mb) => {
    const L = LOOKS[look];
    if (look === 'resident') {
      // the nightgown's skirt, down to the shins
      const c = v === 9 ? ROBE : GOWNS[v % GOWNS.length];
      tube(mb, [[-0.5, 0.25], [-0.3, 0.22], [-0.1, 0.19], [0.06, 0.168]], (i) => K(c, 0.88 + i * 0.04), { sz: 0.8, seg: 12 });
      band(mb, -0.5, 0.25, -0.47, 0.255, K(c, 0.75), { sz: 0.8, seg: 12 });
    } else {
      tube(mb, [[-0.1, 0.13], [0, 0.165], [0.06, 0.165]], () => K(L.legs), { sz: 0.76, seg: 12 });
      addSphere(mb, { y: -0.06, r: 0.14, sy: 0.6, segW: 10, segH: 5, colFn: () => K(L.legs) });
      if (look === 'cop') tube(mb, [[-0.2, 0.2], [0.02, 0.17]], () => K([0.12, 0.15, 0.3], 0.95), { sz: 0.76, seg: 12 }); // the tunic's skirt
    }
  });
}
function armMesh(device, look, v, lower) {
  return part(device, `arm:${look}:${v}:${lower}`, (mb) => {
    const len = lower ? 0.23 : 0.25;
    if (look === 'doll') { limb(mb, len, lower ? 0.052 : 0.06, lower ? 0.048 : 0.052, () => K(SACK), 2); if (lower) addSphere(mb, { y: -len - 0.03, r: 0.075, segW: 6, segH: 4, colFn: () => K(SACK, 0.9) }); }
    else if (look === 'thief') {
      limb(mb, len, lower ? 0.056 : 0.064, lower ? 0.05 : 0.056, (i) => ((i + (lower ? 1 : 0)) % 2 ? K(INK) : K(CREAM, 1, 0.07)), 4);
      if (lower) addSphere(mb, { y: -len - 0.03, r: 0.068, segW: 8, segH: 6, colFn: () => K([0.07, 0.07, 0.08]) }); // gloves
    } else {
      const c = look === 'cop' ? [0.12, 0.15, 0.3] : v === 9 ? ROBE : GOWNS[v % GOWNS.length];
      limb(mb, len, lower ? 0.058 : 0.066, lower ? 0.056 : 0.058, () => K(c, 0.93), 3);
      if (lower) { if (look === 'cop') band(mb, -len + 0.05, 0.06, -len + 0.01, 0.06, K([0.85, 0.85, 0.85])); addSphere(mb, { y: -len - 0.03, r: 0.062, segW: 8, segH: 6, colFn: () => (look === 'cop' ? K([0.9, 0.9, 0.88]) : K(SKIN)) }); }
    }
  });
}
function legMesh(device, look, lower) {
  return part(device, `leg:${look}:${lower}`, (mb) => {
    const L = LOOKS[look];
    const len = lower ? L.L2 : L.L1;
    if (look === 'doll') limb(mb, len, lower ? 0.062 : 0.075, lower ? 0.055 : 0.062, () => K(L.legs), 2);
    else limb(mb, len, lower ? 0.075 : 0.092, lower ? 0.058 : 0.075, () => K(L.legs, lower ? 0.95 : 1), 3);
  });
}
function footMesh(device, look) {
  return part(device, `foot:${look}`, (mb) => {
    const L = LOOKS[look];
    addSphere(mb, { y: 0.0, z: 0.05, r: 0.075, sy: 0.75, segW: 8, segH: 5, colFn: () => K(L.shoe) });
    mb.p.forEach((val, i) => { if (i % 3 === 2) mb.p[i] = (val - 0.05) * 1.7 + 0.05; }); // stretch into a shoe
    box(mb, -0.07, 0.07, -0.065, -0.045, -0.08, 0.19, K(L.shoe, 0.6));
    if (look === 'resident') addSphere(mb, { y: 0.03, z: 0.15, r: 0.035, segW: 6, segH: 4, colFn: () => K([0.9, 0.85, 0.8]) }); // a pompom on the slipper
  });
}

function hat(mb, mask, c) {
  const D = [0.09, 0.09, 0.11];
  const crew = (k = 0.75, g = 0.25) => K(c, k, g);
  switch (mask) {
    case 'beanie':
      addSphere(mb, { y: 0.27, r: 0.205, sy: 0.8, segW: 12, segH: 7, colFn: (ny) => (ny > -0.1 ? crew() : crew(0.55, 0.15)) });
      band(mb, 0.25, 0.212, 0.31, 0.21, crew(0.55, 0.15), { seg: 12 });
      addSphere(mb, { y: 0.45, r: 0.05, segW: 6, segH: 4, colFn: () => crew(1, 0.3) });
      break;
    case 'bowler':
      addSphere(mb, { y: 0.31, r: 0.19, sy: 0.85, segW: 12, segH: 7, colFn: () => K(D) });
      addCylinder(mb, { y: 0.29, r0: 0.29, r1: 0.29, h: 0.025, seg: 16, colFn: () => K(D) });
      band(mb, 0.31, 0.193, 0.35, 0.19, crew(), { seg: 12 });
      break;
    case 'tophat':
      addCylinder(mb, { y: 0.3, r0: 0.3, r1: 0.3, h: 0.025, seg: 16, colFn: () => K(D) });
      addCylinder(mb, { y: 0.32, r0: 0.17, r1: 0.185, h: 0.4, seg: 14, colFn: () => K(D) });
      band(mb, 0.33, 0.175, 0.39, 0.176, crew(), { seg: 14 });
      break;
    case 'hood':
      addSphere(mb, { y: 0.2, z: -0.03, r: 0.245, sy: 1.1, segW: 12, segH: 8, colFn: (ny) => K([0.12, 0.12, 0.15], ny > 0 ? 1 : 0.8) });
      band(mb, 0.02, 0.2, 0.06, 0.21, crew(0.6, 0.15), { seg: 12 });
      break;
    case 'plague':
      addLathe(mb, [[0.085, 0], [0.0, 0.3]], { seg: 8, y: 0, z: 0, colFn: () => K([0.5, 0.45, 0.36]), warp: (x, y, z) => [x, 0.15 - y * 0.25, 0.18 + y] });
      addCylinder(mb, { y: 0.3, r0: 0.3, r1: 0.3, h: 0.025, seg: 16, colFn: () => K(D) });
      addSphere(mb, { y: 0.31, r: 0.19, sy: 0.8, segW: 12, segH: 6, colFn: () => K(D) });
      break;
    case 'crown':
      band(mb, 0.3, 0.175, 0.42, 0.2, rgba(0.95, 0.75, 0.25, 0.5), { seg: 10 });
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; addSphere(mb, { x: Math.cos(a) * 0.19, y: 0.45, z: Math.sin(a) * 0.19, r: 0.035, segW: 5, segH: 4, colFn: () => (i % 2 ? rgba(0.9, 0.2, 0.25, 0.6) : rgba(0.95, 0.8, 0.3, 0.6)) }); }
      break;
    default: // flat cap
      addSphere(mb, { y: 0.3, z: 0.02, r: 0.205, sy: 0.5, segW: 12, segH: 6, colFn: () => crew(0.7, 0.2) });
      addSphere(mb, { y: 0.28, z: 0.2, r: 0.11, sy: 0.25, segW: 8, segH: 4, colFn: () => crew(0.5, 0.12) }); // the peak
  }
}
function headMesh(device, look, v, mask, crew) {
  return part(device, `head:${look}:${v}:${mask}:${crew}`, (mb) => {
    if (look === 'doll') { dollHead(mb, v); return; }
    // the head: centre 0.19 above the neck, face toward +z
    addSphere(mb, { y: 0.19, r: 0.2, sy: 1.02, segW: 14, segH: 10, colFn: (ny) => K(look === 'thief' ? SKIN2 : SKIN, ny < -0.35 && look === 'thief' ? 0.8 : 1) });
    addSphere(mb, { y: 0.14, z: 0.2, r: 0.04, segW: 6, segH: 5, colFn: () => K(SKIN2, 0.95) }); // nose
    for (const sx of [-1, 1]) addSphere(mb, { x: sx * 0.2, y: 0.18, r: 0.04, segW: 5, segH: 4, colFn: () => K(SKIN2) }); // ears
    const eye = (y, r, white) => { for (const sx of [-1, 1]) { if (white) addSphere(mb, { x: sx * 0.075, y, z: 0.172, r, segW: 7, segH: 5, colFn: () => rgba(0.98, 0.97, 0.92, 0.55) }); addSphere(mb, { x: sx * 0.075, y, z: 0.172 + (white ? r * 0.7 : 0.02), r: white ? r * 0.45 : r, segW: 5, segH: 4, colFn: () => K([0.03, 0.03, 0.04]) }); } };
    if (look === 'thief') {
      band(mb, 0.17, 0.199, 0.26, 0.203, K([0.04, 0.04, 0.05]), { seg: 14 }); // the eye mask, tied round the head
      addSphere(mb, { y: 0.21, z: -0.21, r: 0.04, segW: 5, segH: 4, colFn: () => K([0.04, 0.04, 0.05]) }); // its knot
      eye(0.215, 0.042, true);
      hat(mb, mask, crew);
    } else if (look === 'cop') {
      eye(0.2, 0.022, false);
      box(mb, -0.09, 0.09, 0.085, 0.115, 0.16, 0.2, K([0.25, 0.16, 0.1])); // moustache
      // the tall helmet, its badge and spike
      addLathe(mb, [[0.215, 0.26], [0.2, 0.36], [0.15, 0.5], [0.06, 0.57], [0.0, 0.6]], { seg: 12, colFn: () => K([0.08, 0.1, 0.2]) });
      addCylinder(mb, { y: 0.25, r0: 0.25, r1: 0.22, h: 0.03, seg: 14, colFn: () => K([0.08, 0.1, 0.2]) });
      addSphere(mb, { y: 0.61, r: 0.03, segW: 5, segH: 4, colFn: () => rgba(0.9, 0.75, 0.3, 0.6) });
      box(mb, -0.035, 0.035, 0.36, 0.44, 0.185, 0.2, rgba(0.9, 0.78, 0.35, 0.7));
    } else {
      eye(0.2, 0.022, false);
      if (v % 2 === 0 || v === 9) {
        // a nightcap flopping to one side, with a pompom; a moustache
        addLathe(mb, [[0.205, 0.26], [0.17, 0.36], [0.07, 0.52], [0.0, 0.58]], { seg: 10, colFn: () => K(v === 9 ? ROBE : [0.9, 0.3, 0.28]), warp: (x, y, z) => [x - Math.max(0, y - 0.36) * 0.9, y - Math.max(0, y - 0.45) * 0.5, z] });
        band(mb, 0.24, 0.212, 0.3, 0.21, K([0.95, 0.93, 0.88]), { seg: 12 });
        addSphere(mb, { x: -0.21, y: 0.5, r: 0.05, segW: 6, segH: 4, colFn: () => K([0.95, 0.93, 0.88]) });
        box(mb, -0.08, 0.08, 0.085, 0.11, 0.165, 0.2, K([0.55, 0.52, 0.48]));
      } else {
        // hair in a bun, with curlers
        addSphere(mb, { y: 0.25, z: -0.02, r: 0.21, sy: 0.9, segW: 12, segH: 7, colFn: () => K([0.55, 0.5, 0.46]) });
        addSphere(mb, { y: 0.4, z: -0.1, r: 0.09, segW: 8, segH: 5, colFn: () => K([0.5, 0.45, 0.42]) });
        for (const sx of [-1, 1]) addCylinder(mb, { x: sx * 0.12, y: 0.36, z: 0.08, r0: 0.035, r1: 0.035, h: 0.07, seg: 6, colFn: () => K([0.9, 0.5, 0.6]) });
      }
    }
  });
}
/** four sack heads, told apart by their silhouettes from the side: tied, eared, hooded, square */
function dollHead(mb, v) {
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
}
function sackMesh(device) {
  return part(device, 'sack', (mb) => {
    addSphere(mb, { y: 0, r: 0.26, sy: 1.05, segW: 10, segH: 7, colFn: (ny) => K([0.7, 0.6, 0.42], 0.85 + ny * 0.12) });
    tube(mb, [[0.22, 0.09], [0.3, 0.06], [0.36, 0.1]], () => K([0.62, 0.52, 0.36]));
    band(mb, 0.27, 0.07, 0.3, 0.07, K([0.3, 0.2, 0.12]));
    // a "$" stitched on the back
    box(mb, -0.07, 0.07, 0.07, 0.1, -0.265, -0.25, K([0.25, 0.4, 0.22]));
    box(mb, -0.07, 0.07, -0.02, 0.01, -0.27, -0.255, K([0.25, 0.4, 0.22]));
    box(mb, -0.07, 0.07, -0.11, -0.08, -0.265, -0.25, K([0.25, 0.4, 0.22]));
    box(mb, -0.012, 0.012, -0.15, 0.14, -0.275, -0.26, K([0.25, 0.4, 0.22]));
  });
}

// ---------------------------------------------------------------- hand props
export function propMesh(device, kind) {
  return part(device, `prop:${kind}`, (mb) => {
    switch (kind) {
      case 'candle':
        addCylinder(mb, { y: -0.02, r0: 0.09, r1: 0.09, h: 0.02, seg: 10, colFn: () => K([0.6, 0.48, 0.22]) });
        addCylinder(mb, { y: 0, r0: 0.03, r1: 0.03, h: 0.18, seg: 8, colFn: () => K([0.92, 0.9, 0.82], 1, 0.2) });
        addSphere(mb, { y: 0.23, r: 0.03, sy: 1.9, segW: 6, segH: 4, colFn: () => rgba(1, 0.78, 0.36, 1.4) });
        break;
      case 'lantern':
        box(mb, -0.08, 0.08, -0.25, 0.0, -0.08, 0.08, rgba(1, 0.74, 0.36, 1.1));
        box(mb, -0.1, 0.1, 0.0, 0.03, -0.1, 0.1, K([0.12, 0.12, 0.12]));
        box(mb, -0.1, 0.1, -0.28, -0.25, -0.1, 0.1, K([0.12, 0.12, 0.12]));
        break;
      case 'club': addCylinder(mb, { y: -0.05, r0: 0.03, r1: 0.04, h: 0.5, seg: 8, colFn: () => K([0.3, 0.2, 0.1]) }); break;
      case 'gun':
        addCylinder(mb, { y: -0.05, r0: 0.03, r1: 0.075, h: 0.85, seg: 8, colFn: () => K([0.25, 0.24, 0.22]) });
        box(mb, -0.04, 0.04, -0.4, -0.05, -0.05, 0.05, K([0.4, 0.26, 0.13]));
        break;
      case 'cloth': addSphere(mb, { r: 0.08, sy: 0.6, segW: 7, segH: 4, colFn: () => K([0.95, 0.95, 0.9]) }); break;
      case 'crowbar': box(mb, -0.02, 0.02, -0.1, 0.6, -0.02, 0.02, K([0.55, 0.16, 0.12])); box(mb, -0.02, 0.02, 0.56, 0.6, -0.02, 0.1, K([0.55, 0.16, 0.12])); break;
      case 'pick': box(mb, -0.008, 0.008, -0.02, 0.2, -0.008, 0.008, rgba(0.8, 0.8, 0.85, 0.4)); break;
      default: break;
    }
  });
}

// ---------------------------------------------------------------- how they move: foot paths per gait
// stride: half a step (m); lift: how high the foot comes up; duty: share of the cycle on the ground;
// toe: how far the toes point down in the air; drop: how low the hips sit; lean: the torso's lean (deg)
const GAITS = {
  walk: { stride: 0.2, lift: 0.1, duty: 0.58, sharp: 1, toe: 18, drop: 0.02, bob: 0.022, lean: 5 },
  sneak: { stride: 0.27, lift: 0.27, duty: 0.52, sharp: 0.6, toe: 48, drop: 0.2, bob: 0.045, lean: 28 },
  run: { stride: 0.36, lift: 0.22, duty: 0.4, sharp: 1, toe: 25, drop: 0.04, bob: 0.05, lean: 20 },
  carry: { stride: 0.16, lift: 0.07, duty: 0.62, sharp: 1, toe: 8, drop: 0.05, bob: 0.02, lean: -8 },
  heavy: { stride: 0.11, lift: 0.04, duty: 0.7, sharp: 1, toe: 4, drop: 0.13, bob: 0.03, lean: 16 },
  shuffle: { stride: 0.13, lift: 0.05, duty: 0.64, sharp: 1, toe: 6, drop: 0.02, bob: 0.012, lean: 4 }, // slippers
  beat: { stride: 0.22, lift: 0.1, duty: 0.6, sharp: 1, toe: 14, drop: 0.01, bob: 0.02, lean: 2 }, // a constable's walk
};
const ANK = 0.07; // the ankle's height above the sole

export class Rig {
  /** kind: thief | resident | armed | watch | cop ; color: crew colour ; mask: hat ; variant: a number */
  constructor(app, { kind = 'thief', color = [0.9, 0.6, 0.2], mask = 'cap', variant = 0 } = {}) {
    const device = app.graphicsDevice;
    if (!MAT) { MAT = worldMaterial(); SHADOW = tintMaterial(); SHADOW.setParameter('uTint', new Float32Array([0, 0, 0, 0.42])); }
    this.kind = kind;
    this.device = device;
    const look = kind === 'doll' ? 'doll' : kind === 'thief' ? 'thief' : kind === 'cop' || kind === 'watch' ? 'cop' : 'resident';
    this.look = look;
    const v = kind === 'armed' ? 9 : variant;
    const L = LOOKS[look];
    this.L = L;
    const ent = (name, mesh, parent, x = 0, y = 0, z = 0) => { const e = new pc.Entity(name); if (mesh) e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, MAT)], castShadows: false }); e.setLocalPosition(x, y, z); parent.addChild(e); return e; };
    this.root = new pc.Entity('rig');
    this.body = ent('body', null, this.root);
    this.pelvis = ent('pelvis', pelvisMesh(device, look, v), this.body);
    this.spine = ent('spine', torsoMesh(device, look, v), this.pelvis, 0, 0.02, 0);
    this.head = ent('head', headMesh(device, look, v, mask, color), this.spine, 0, 0.47, 0);
    this.arms = [-1, 1].map((s) => { const up = ent('arm', armMesh(device, look, v, false), this.spine, s * 0.215, 0.4, 0); const lo = ent('fore', armMesh(device, look, v, true), up, 0, -0.25, 0); return { up, lo, s }; });
    this.legs = [-1, 1].map((s) => { const th = ent('thigh', legMesh(device, look, false), this.pelvis, s * 0.085, 0, 0); const sh = ent('shin', legMesh(device, look, true), th, 0, -L.L1, 0); const ft = ent('foot', footMesh(device, look), sh, 0, -L.L2, 0); return { th, sh, ft, s }; });
    this.hand = ent('hand', null, this.arms[1].lo, 0, -0.27, 0.03);
    if (look === 'thief') { this.sack = ent('sack', sackMesh(device), this.spine, 0.02, 0.26, -0.22); this.sack.enabled = false; }
    // a soft shadow on the ground
    const sh = new pc.Entity('shadow');
    sh.addComponent('render', { meshInstances: [new pc.MeshInstance(part(device, 'blob', (mb) => { const c = mb.vert(0, 0, 0, 0, 1, 0, rgba(0, 0, 0, 1)); const b = mb.count; for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; mb.vert(Math.cos(a), 0, Math.sin(a), 0, 1, 0, rgba(0, 0, 0, 0)); } for (let i = 0; i < 16; i++) mb.tri(c, b + i, b + i + 1); }), SHADOW)], castShadows: false });
    sh.render.meshInstances[0].drawOrder = 20;
    this.root.addChild(sh);
    this.shadow = sh;
    this.prop = null;
    this.propKind = '';
    this.phase = Math.random();
    this.yaw = 90;
    this.visible = true;
    this.g = { ...GAITS.walk };
    this.c = null; // the smoothed pose
    this.moveK = 0; this.lieK = 0; this.sackK = 0; this.squash = 0; this.wasAir = false; this.idleT = Math.random() * 10;
    app.root.addChild(this.root);
  }

  setProp(kind) {
    if (kind === this.propKind) return;
    this.propKind = kind;
    if (this.prop) { this.prop.destroy(); this.prop = null; }
    if (!kind) return;
    const e = new pc.Entity(kind);
    e.addComponent('render', { meshInstances: [new pc.MeshInstance(propMesh(this.device, kind), MAT)], castShadows: false });
    this.hand.addChild(e);
    this.prop = e;
  }
  setVisible(v) { if (v !== this.visible) { this.visible = v; this.root.enabled = v; } }

  /**
   * s: { x, y, z, facing (-1|1), yaw (rad, optional), speed, crouch, carry ('' | big | heavy | body),
   *      anim, t, view (0 street .. 1 inside), sack (0..1) }
   * anim: walk (idle when still) | climb | air | dive | pick | pry | reach | grab | rummage | struggle |
   *       attack | aim | alarm | search | sit | cower | sleep | ko | dead | dragged
   */
  pose(dt, s) {
    const L = this.L, HIP = L.hip;
    const lie = s.anim === 'sleep' || s.anim === 'ko' || s.anim === 'dead' || s.anim === 'dragged';
    this.root.setPosition(s.x, s.y, s.z);
    // ---- heading
    const hasYaw = s.yaw !== undefined && s.yaw !== null;
    const side = s.facing >= 0 ? 90 - 24 * (s.view || 0) : -90 + 24 * (s.view || 0);
    let target = s.anim === 'climb' ? 180 : hasYaw ? s.yaw * R2D : side;
    if (lie && !hasYaw) target = s.facing >= 0 ? 90 : -90;
    let d = target - this.yaw;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    this.yaw += d * Math.min(1, dt * (lie ? 30 : 13));
    this.root.setLocalEulerAngles(0, this.yaw, 0);
    // ---- gait
    const t = s.t || 0;
    const moving = s.speed > 0.15 && !lie;
    const running = !s.crouch && s.speed > 3.3;
    let gait = 'walk';
    if (this.look === 'resident') gait = s.speed > 2.2 ? 'run' : 'shuffle';
    else if (this.look === 'cop') gait = s.speed > 2.6 ? 'run' : 'beat';
    else if (s.carry === 'heavy') gait = 'heavy';
    else if (s.carry === 'big' || s.carry === 'body') gait = 'carry';
    else if (s.crouch) gait = 'sneak';
    else if (running) gait = 'run';
    const G = GAITS[gait], g = this.g;
    const gk = Math.min(1, dt * 9);
    for (const k in G) g[k] += (G[k] - g[k]) * gk;
    this.moveK += ((moving ? 1 : 0) - this.moveK) * Math.min(1, dt * 10);
    this.lieK += ((lie ? 1 : 0) - this.lieK) * Math.min(1, dt * (s.anim === 'sleep' ? 40 : 7));
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
    if (!moving && !s.crouch && !lie) {
      // standing: breathing; the burglar can't help glancing about
      P.lean += Math.sin(this.idleT * 1.7) * 1.2;
      if (this.look === 'thief') P.hYaw = Math.sin(this.idleT * 0.9) * 22 * ss(clamp(Math.sin(this.idleT * 0.37) * 2, 0, 1));
    }
    if (s.carry === 'big' || s.carry === 'heavy') { P.shL = P.shR = s.carry === 'heavy' ? 48 : 72; P.elL = P.elR = s.carry === 'heavy' ? 35 : 58; P.abL = P.abR = -6; }
    else if (s.carry === 'body') { P.shR = 150; P.elR = 70; P.abR = 12; P.lean += 6; }
    if (s.prop === 'candle' || s.prop === 'lantern') { P.shR = Math.max(P.shR, 62); P.elR = 28; P.abR = 12; }
    switch (s.anim) {
      case 'climb': { const c = Math.sin(t * 7); P.shL = 150 + c * 28; P.shR = 150 - c * 28; P.elL = 45 - c * 25; P.elR = 45 + c * 25; P.fLz = 0.16; P.fRz = 0.16; P.fLy = 0.2 + c * 0.13; P.fRy = 0.2 - c * 0.13; P.pelY = HIP - 0.08; P.lean = 6; P.hPitch = -22; break; }
      case 'brace': P.lean = -16; P.pelY = HIP - 0.14; P.fLz = 0.24; P.fRz = -0.2; P.shL = P.shR = 48; P.elL = P.elR = 35; P.hPitch = 8; break; // heels dug in, both hands on the thread
      case 'hang': { const c2 = Math.sin(t * 2.2) * 6; P.shL = 168; P.shR = 172; P.elL = P.elR = 8; P.abL = P.abR = -6; P.fLz = 0.05 + c2 * 0.004; P.fRz = -0.06; P.fLy = 0.04; P.fRy = 0.0; P.fLp = P.fRp = 35; P.lean = c2 * 0.5; break; } // both hands on the thread overhead
      case 'ropeclimb': { const c2 = Math.sin(t * 9); P.shL = 162 + c2 * 16; P.shR = 162 - c2 * 16; P.elL = 28 - c2 * 24; P.elR = 28 + c2 * 24; P.fLz = 0.1; P.fRz = 0.06; P.fLy = 0.16 + c2 * 0.08; P.fRy = 0.16 - c2 * 0.08; P.fLp = P.fRp = 30; break; } // hand over hand up the thread
      case 'haul': P.shL = P.shR = 125; P.elL = P.elR = 70; P.lean = 26; P.fLz = 0.16; P.fRz = -0.1; P.fLy = 0.24; P.fRy = 0.05; P.hPitch = -14; break; // up and over a ledge
      case 'fear': P.shL = 150 + Math.sin(t * 16) * 10; P.shR = 150 - Math.sin(t * 16) * 10; P.elL = P.elR = 40; P.abL = P.abR = 20; P.fLy = 0.1; P.fRy = 0.16; P.fLz = 0.1; P.fRz = -0.08; break; // lifted off the ground
      case 'air': P.shL = P.shR = 145; P.elL = P.elR = 25; P.abL = P.abR = 28; P.fLz = 0.12; P.fRz = -0.1; P.fLy = 0.2; P.fRy = 0.1; P.lean = 8; break;
      case 'dive': P.bodyP = 78; P.bodyY = 0.5; P.shL = P.shR = 172; P.elL = P.elR = 8; P.fLz = P.fRz = -0.05; P.fLy = P.fRy = 0.02; break; // head first through a window
      case 'pick': { const j = Math.sin(t * 15) * 5; P.pelY = 0.4; P.fLz = 0.24; P.fRz = -0.2; P.fRy = 0.02; P.fRp = 55; P.lean = 12; P.shL = 68 + j; P.shR = 76 - j; P.elL = 55; P.elR = 42; P.hPitch = 12; P.hYaw = Math.sin(t * 2.2) * 30 * ss(clamp(Math.sin(t * 1.1) * 3 - 1.5, 0, 1)); break; } // on one knee, a glance over the shoulder
      case 'pry': { const k2 = Math.sin(t * 9); P.lean = 20 + k2 * 14; P.shL = P.shR = 70 + k2 * 25; P.elL = P.elR = 30; P.pelY = HIP - 0.12; P.fLz = 0.22; P.fRz = -0.18; break; }
      case 'reach': P.shL = 150; P.shR = 158; P.elL = 20; P.elR = 15; P.hPitch = -25; P.pelY = HIP + 0.02; break;
      case 'grab': P.shL = 78; P.shR = 84; P.elL = 25; P.elR = 20; P.lean += 14; break;
      case 'rummage': { const k2 = Math.sin(t * 13); P.shL = 70 + k2 * 22; P.shR = 70 - k2 * 22; P.elL = P.elR = 50; P.lean = 26; P.pelY = HIP - 0.14; P.hPitch = 18; break; }
      case 'struggle': { const th = this.look === 'thief'; P.lean = Math.sin(t * 22) * 12 + (th ? 12 : -8); P.shL = 75 + Math.sin(t * 19) * (th ? 12 : 55); P.shR = 82 + Math.cos(t * 17) * (th ? 12 : 55); P.elL = P.elR = th ? 75 : 30; P.abL = P.abR = th ? -10 : 30; break; }
      case 'attack': { const k2 = (t % 1.1) / 1.1; P.shR = k2 < 0.5 ? 20 + 150 * (k2 / 0.5) : 170 - 150 * ((k2 - 0.5) / 0.5); P.elR = 25; P.shL = 30; P.lean += k2 > 0.5 ? 18 : -6; break; }
      case 'aim': P.shR = 88; P.shL = 82; P.elL = 12; P.elR = 6; P.abL = -14; P.lean = 6; break;
      case 'alarm': P.shL = 160 + Math.sin(t * 14) * 14; P.shR = 160 - Math.sin(t * 14) * 14; P.elL = P.elR = 20; P.abL = P.abR = 26; P.pelY += Math.abs(Math.sin(t * 9)) * 0.06; break; // arms in the air
      case 'search': P.shR = 95; P.elR = 15; P.hYaw = Math.sin(t * 1.6) * 50; P.lean = 8; break; // a lantern held out, looking about
      case 'sit': P.pelY = 0.5; P.fLz = 0.36; P.fRz = 0.34; P.lean = -4; P.shL = 30; P.shR = 34; P.elL = P.elR = 70; P.hPitch = 14; break;
      case 'cower': P.pelY = 0.42; P.lean = 40; P.shL = P.shR = 120; P.elL = P.elR = 120; P.fLz = 0.1; P.fRz = -0.05; break;
      default: break;
    }
    if (lk > 0.01) {
      // on their back; a carried body droops over the shoulder
      const drape = s.anim === 'dragged' ? 1 : 0;
      P.bodyP = -90; P.bodyY = s.lieY ?? 0.17; P.bodyZ = 0.8;
      P.pelY = HIP; P.lean = drape * 55; P.roll = 0; P.twist = 0;
      P.fLz = drape * 0.4; P.fRz = drape * 0.36; P.fLy = P.fRy = 0.02; P.fLp = P.fRp = 30;
      P.shL = drape ? 150 : 8; P.shR = drape ? 155 : 10; P.elL = P.elR = 12; P.abL = P.abR = drape ? 8 : 22;
      P.hYaw = s.anim === 'dead' ? 35 : s.anim === 'ko' ? Math.sin(t * 1.3) * 8 : 0; P.hPitch = drape ? 30 : 0;
      if (s.anim === 'sleep') { P.shL = 14 + Math.sin(t * 1.5) * 2; P.lean = Math.sin(t * 1.5) * 1.5; }
    }
    // landing squash
    const air = s.anim === 'air' || s.anim === 'dive';
    if (this.wasAir && !air) this.squash = 1;
    this.wasAir = air;
    this.squash = Math.max(0, this.squash - dt * 5);
    // ---- ease toward it (feet follow fast, poses blend in); lying down or getting up snaps
    if (!this.c) this.c = { ...P };
    const c = this.c, kf = Math.min(1, dt * 26), ks = Math.min(1, dt * 11);
    const snap = (lk > 0.5) !== this.wasLie;
    this.wasLie = lk > 0.5;
    for (const k in P) c[k] = snap ? P[k] : c[k] + (P[k] - c[k]) * (k[0] === 'f' || k === 'pelY' ? kf : ks);
    // ---- apply
    const sq = this.squash * this.squash;
    this.body.setLocalPosition(0, c.bodyY, c.bodyZ * lk);
    this.body.setLocalEulerAngles(c.bodyP, 0, 0);
    this.body.setLocalScale(1 + sq * 0.16, 1 - sq * 0.22, 1 + sq * 0.16);
    const pelY = c.pelY - sq * 0.12;
    const pelZ = -c.lean * 0.0016;
    this.pelvis.setLocalPosition(0, pelY, pelZ);
    this.pelvis.setLocalEulerAngles(0, c.twist * 0.5, c.roll);
    this.spine.setLocalEulerAngles(c.lean, -c.twist, 0);
    this.head.setLocalEulerAngles(c.hPitch, c.hYaw, 0);
    this.armPose(this.arms[0], c.shL, c.elL, c.abL);
    this.armPose(this.arms[1], c.shR, c.elR, c.abR);
    this.legIK(this.legs[0], c.fLz - pelZ, c.fLy + ANK - pelY, c.fLp);
    this.legIK(this.legs[1], c.fRz - pelZ, c.fRy + ANK - pelY, c.fRp);
    if (this.sack) {
      this.sackK += ((s.sack || 0) - this.sackK) * Math.min(1, dt * 5);
      const on = this.sackK > 0.02;
      if (this.sack.enabled !== on) this.sack.enabled = on;
      if (on) { const sc = 0.5 + this.sackK * 0.75; this.sack.setLocalScale(sc, sc * (1 + Math.sin(p * 4 * Math.PI) * 0.05 * mk), sc); this.sack.setLocalPosition(0.02, 0.24 + sc * 0.06, -0.14 - sc * 0.17); this.sack.setLocalEulerAngles(-c.lean * 0.5 + Math.sin(p * 4 * Math.PI) * 6 * mk, 0, 8); }
    }
    const shS = lk > 0.5 ? 0.75 : air ? 0.28 : 0.36;
    this.shadow.setLocalPosition(0, 0.03, 0);
    this.shadow.setLocalScale(shS, 1, lk > 0.5 ? shS * 0.6 : shS);
    const showSh = !(s.noShadow || s.anim === 'climb' || s.anim === 'dragged');
    if (this.shadow.enabled !== showSh) this.shadow.enabled = showSh;
  }
  /** sh: raise forward (deg, 0 hanging, 90 straight ahead, 180 up); el: elbow bend; ab: out from the side */
  armPose(a, sh, el, ab) {
    a.up.setLocalEulerAngles(-sh, 0, a.s * ab);
    a.lo.setLocalEulerAngles(-el, 0, 0);
  }
  /** put the ankle at (tz forward, ty below the hip), knee forward; pitch tips the toes down */
  legIK(leg, tz, ty, pitch) {
    const L1 = this.L.L1, L2 = this.L.L2;
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

// ---------------------------------------------------------------- animals
export class Beast {
  constructor(app, kind) {
    const device = app.graphicsDevice;
    if (!MAT) { MAT = worldMaterial(); SHADOW = tintMaterial(); SHADOW.setParameter('uTint', new Float32Array([0, 0, 0, 0.42])); }
    this.kind = kind;
    const big = kind === 'dog';
    const s = big ? 1 : 0.55;
    const coat = big ? [0.42, 0.3, 0.2] : [0.16, 0.16, 0.18];
    this.root = new pc.Entity(kind);
    this.body = new pc.Entity('body');
    this.root.addChild(this.body);
    const ent = (name, mesh, parent, x, y, z) => { const e = new pc.Entity(name); e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, MAT)], castShadows: false }); e.setLocalPosition(x, y, z); parent.addChild(e); return e; };
    const torso = part(device, `beast:${kind}`, (mb) => {
      addSphere(mb, { r: 0.3 * s, sy: 0.55, segW: 10, segH: 6, colFn: (ny) => K(coat, ny < -0.3 ? 1.3 : 1) });
      mb.p.forEach((v, i) => { if (i % 3 === 2) mb.p[i] = v * 1.9; });
      addSphere(mb, { z: 0.62 * s, y: 0.16 * s, r: 0.19 * s, segW: 8, segH: 6, colFn: () => K(coat) });
      if (big) { addSphere(mb, { z: 0.82, y: 0.1, r: 0.09, sy: 0.8, segW: 7, segH: 5, colFn: () => K(coat, 1.25) }); addSphere(mb, { z: 0.9, y: 0.12, r: 0.03, segW: 5, segH: 4, colFn: () => K([0.05, 0.05, 0.05]) }); for (const sx of [-1, 1]) box(mb, sx * 0.12 - 0.04, sx * 0.12 + 0.04, 0.18, 0.4, 0.5, 0.58, K(coat, 0.7)); }
      else for (const sx of [-1, 1]) box(mb, sx * 0.05 - 0.03, sx * 0.05 + 0.03, 0.24 * s + 0.04, 0.24 * s + 0.12, 0.58 * s, 0.63 * s, K(coat));
      for (const sx of [-1, 1]) addSphere(mb, { x: sx * 0.07 * s, y: 0.21 * s, z: 0.78 * s, r: 0.03 * s + 0.008, segW: 5, segH: 4, colFn: () => rgba(0.95, 0.9, 0.4, 1) });
    });
    const leg = part(device, `beastleg:${kind}`, (mb) => limb(mb, 0.38 * s, 0.05 * s, 0.04 * s, () => K(coat, 0.9), 2));
    const tail = part(device, `tail:${kind}`, (mb) => { addCylinder(mb, { r0: 0.03 * s, r1: 0.012, h: 0.45 * s, seg: 6, colFn: () => K(coat) }); });
    ent('t', torso, this.body, 0, 0, 0);
    this.legs = [[-0.12, 0.35], [0.12, 0.35], [-0.12, -0.35], [0.12, -0.35]].map(([x, z]) => ent('l', leg, this.body, x * s, -0.05 * s, z * s));
    this.tail = ent('tail', tail, this.body, 0, 0.06 * s, -0.5 * s);
    this.h = 0.45 * s;
    this.phase = 0;
    this.yaw = 90;
    app.root.addChild(this.root);
  }
  pose(dt, { x, y, z, facing, speed, anim, t, view }) {
    this.root.setPosition(x, y, z);
    const want = facing >= 0 ? 90 - 25 * (view || 0) : -90 + 25 * (view || 0);
    let d = want - this.yaw; while (d > 180) d -= 360; while (d < -180) d += 360;
    this.yaw += d * Math.min(1, dt * 10);
    this.root.setLocalEulerAngles(0, this.yaw, 0);
    this.phase += dt * (speed > 0.1 ? 5 + speed * 3 : 0);
    const sw = speed > 0.1 ? Math.sin(this.phase) * 35 : 0;
    this.legs.forEach((l, i) => l.setLocalEulerAngles((i === 0 || i === 3 ? sw : -sw), 0, 0));
    const bark = anim === 'bark' ? Math.abs(Math.sin(t * 12)) * 12 : 0;
    const sleep = anim === 'sleep';
    this.body.setLocalPosition(0, sleep ? this.h * 0.45 : this.h + (speed > 0.1 ? Math.abs(Math.cos(this.phase)) * 0.03 : 0) + bark * 0.004, 0);
    this.body.setLocalEulerAngles(-bark, 0, sleep ? 70 : 0);
    this.tail.setLocalEulerAngles(-50 + Math.sin(t * (anim === 'happy' ? 16 : 3)) * (anim === 'happy' ? 30 : 8), 0, Math.sin(t * (anim === 'happy' ? 16 : 4)) * (anim === 'happy' ? 35 : 12));
  }
  destroy() { this.root.destroy(); }
}
