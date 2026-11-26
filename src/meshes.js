// Procedural low-poly mesh building (from Fogbash). Everything is vertex-coloured: rgb = albedo,
// alpha = how much the vertex glows on its own (lit windows, flames), so a whole prop is one draw call.
import * as pc from 'playcanvas';

export function rgba(r, g, b, glow = 0) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return [c(r), c(g), c(b), c(glow)];
}

export class MeshBuilder {
  constructor() {
    this.p = [];
    this.n = [];
    this.c = [];
    this.i = [];
  }

  get count() { return this.p.length / 3; }

  vert(x, y, z, nx, ny, nz, col) {
    this.p.push(x, y, z);
    this.n.push(nx, ny, nz);
    this.c.push(col[0], col[1], col[2], col[3]);
    return this.count - 1;
  }

  tri(a, b, c) { this.i.push(a, b, c); }

  /** Bake another builder in: scale s, rotate ry about Y then rz about Z, then translate. */
  append(src, { x = 0, y = 0, z = 0, s = 1, sx = s, sy = s, sz = s, ry = 0, rz = 0, sway } = {}) {
    const base = this.count, cy = Math.cos(ry), sny = Math.sin(ry), cz = Math.cos(rz), snz = Math.sin(rz);
    for (let i = 0; i < src.p.length; i += 3) {
      let px = src.p[i] * sx, py = src.p[i + 1] * sy, pz = src.p[i + 2] * sz;
      const qx = cy * px + sny * pz, qz = -sny * px + cy * pz;
      px = cz * qx - snz * py; py = snz * qx + cz * py;
      this.p.push(px + x, py + y, qz + z);
      this.n.push(src.n[i], src.n[i + 1], src.n[i + 2]);
      const c = i / 3 * 4;
      this.c.push(src.c[c], src.c[c + 1], src.c[c + 2], sway === undefined ? src.c[c + 3] : sway);
    }
    for (const k of src.i) this.i.push(base + k);
    return this;
  }

  build(device) {
    if (!device) return this; // no device: hand back the builder (for baking into bigger meshes)
    const mesh = new pc.Mesh(device);
    mesh.setPositions(this.p);
    mesh.setNormals(this.n);
    mesh.setColors32(this.c);
    mesh.setIndices(this.i);
    mesh.update(pc.PRIMITIVE_TRIANGLES);
    // built meshes are shared (cars, hats, props come and go): a permanent reference keeps
    // PlayCanvas from freeing the GPU buffers when the last entity using one is destroyed
    mesh.incRefCount();
    return mesh;
  }
}

/**
 * Cylinder / cone / frustum along +Y with smooth sides.
 * colFn(t) -> rgba, t = 0 at base, 1 at top.
 */
export function addCylinder(mb, { x = 0, y = 0, z = 0, r0, r1, h, seg = 8, colFn, capTop = true, capBottom = false, jitter = 0, rng = Math.random }) {
  const base = mb.count;
  const slope = (r0 - r1) / h;
  const rows = 2;
  for (let row = 0; row < rows; row++) {
    const t = row / (rows - 1);
    const r = r0 + (r1 - r0) * t;
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const j = jitter ? 1 + (rng() - 0.5) * jitter : 1;
      const len = Math.hypot(1, slope);
      mb.vert(x + ca * r * j, y + t * h, z + sa * r * j, ca / len, slope / len, sa / len, colFn(t));
    }
  }
  for (let s = 0; s < seg; s++) {
    const a = base + s, b = a + 1, c = a + seg + 1, d = c + 1;
    mb.tri(a, c, b);
    mb.tri(b, c, d);
  }
  if (capTop && r1 > 0.001) {
    const centre = mb.vert(x, y + h, z, 0, 1, 0, colFn(1));
    const ring = mb.count;
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      mb.vert(x + Math.cos(a) * r1, y + h, z + Math.sin(a) * r1, 0, 1, 0, colFn(1));
    }
    for (let s = 0; s < seg; s++) mb.tri(centre, ring + s + 1, ring + s);
  }
  if (capBottom && r0 > 0.001) {
    const centre = mb.vert(x, y, z, 0, -1, 0, colFn(0));
    const ring = mb.count;
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      mb.vert(x + Math.cos(a) * r0, y, z + Math.sin(a) * r0, 0, -1, 0, colFn(0));
    }
    for (let s = 0; s < seg; s++) mb.tri(centre, ring + s, ring + s + 1);
  }
}

/** UV-sphere; colFn(ny) where ny is -1..1 local height. */
export function addSphere(mb, { x = 0, y = 0, z = 0, r, sy = 1, segW = 8, segH = 6, colFn, jitter = 0, rng = Math.random }) {
  const base = mb.count;
  for (let iy = 0; iy <= segH; iy++) {
    const v = iy / segH;
    const phi = v * Math.PI;
    for (let ix = 0; ix <= segW; ix++) {
      const th = (ix / segW) * Math.PI * 2;
      let nx = Math.sin(phi) * Math.cos(th);
      const ny = Math.cos(phi);
      let nz = Math.sin(phi) * Math.sin(th);
      // keep the seam welded when jittering
      const j = jitter && ix < segW && iy > 0 && iy < segH ? 1 + (rng() - 0.5) * jitter : 1;
      mb.vert(x + nx * r * j, y + ny * r * sy * j, z + nz * r * j, nx, ny, nz, colFn(ny));
    }
  }
  if (jitter) {
    // weld seam: copy column 0 to column segW
    for (let iy = 0; iy <= segH; iy++) {
      const a = (base + iy * (segW + 1)) * 3, b = (base + iy * (segW + 1) + segW) * 3;
      mb.p[b] = mb.p[a]; mb.p[b + 1] = mb.p[a + 1]; mb.p[b + 2] = mb.p[a + 2];
    }
  }
  for (let iy = 0; iy < segH; iy++) {
    for (let ix = 0; ix < segW; ix++) {
      const a = base + iy * (segW + 1) + ix;
      const b = a + 1, c = a + segW + 1, d = c + 1;
      mb.tri(a, b, c);
      mb.tri(b, d, c);
    }
  }
}

/** Box with flat faces, rotated around Y then optionally tilted around its local X. */
export function addBox(mb, { x = 0, y = 0, z = 0, sx, sy, sz, rot = 0, tilt = 0, col }) {
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const xf = (px, py, pz) => {
    // tilt around X
    const ty = py * ct - pz * st, tz = py * st + pz * ct;
    // rotate around Y
    return [x + cr * px + sr * tz, y + ty, z - sr * px + cr * tz];
  };
  const nf = (nx, ny, nz) => {
    const ty = ny * ct - nz * st, tz = ny * st + nz * ct;
    return [cr * nx + sr * tz, ty, -sr * nx + cr * tz];
  };
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const faces = [
    [[1, 0, 0], [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]]],
    [[-1, 0, 0], [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]]],
    [[0, 1, 0], [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]]],
    [[0, -1, 0], [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]]],
    [[0, 0, 1], [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]]],
    [[0, 0, -1], [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]]],
  ];
  for (const [n, quad] of faces) {
    const [nx, ny, nz] = nf(...n);
    const b = mb.count;
    for (const q of quad) {
      const [px, py, pz] = xf(...q);
      mb.vert(px, py, pz, nx, ny, nz, typeof col === 'function' ? col(q[1] / sy + 0.5) : col);
    }
    mb.tri(b, b + 1, b + 2);
    mb.tri(b, b + 2, b + 3);
  }
}

// ---------------------------------------------------------------- organic primitives

/** Catmull-Rom resample of [[x,y,z,r], ...] control points. */
function spline(pts, subdiv) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, n - 1)];
    for (let s = 0; s < subdiv; s++) {
      const t = s / subdiv, t2 = t * t, t3 = t2 * t;
      const c = (k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([c(0), c(1), c(2), p1[3] + (p2[3] - p1[3]) * (t * t * (3 - 2 * t))]);
    }
  }
  out.push(pts[n - 1].slice());
  return out;
}

/**
 * Smooth tapered tube along a curve: limbs, tails, ribs, branches, moss strands, chains...
 * pts: [[x, y, z, radius], ...]; colFn(t) -> rgba, t = 0..1 along the tube.
 */
export function addTube(mb, pts, { seg = 6, subdiv = 3, colFn, capEnd = true, capStart = false }) {
  const S = spline(pts, subdiv);
  const n = S.length;
  const base = mb.count;
  let N = null;
  let len = 0;
  const lens = [0];
  for (let i = 1; i < n; i++) { len += Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1], S[i][2] - S[i - 1][2]); lens.push(len); }
  for (let i = 0; i < n; i++) {
    const a = S[Math.max(i - 1, 0)], b = S[Math.min(i + 1, n - 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;
    if (!N) {
      // any vector perpendicular to the first tangent
      let ux = 0, uy = 1, uz = 0;
      if (Math.abs(ty) > 0.9) { ux = 1; uy = 0; }
      N = [uy * tz - uz * ty, uz * tx - ux * tz, ux * ty - uy * tx];
    }
    // parallel transport: remove the tangent component
    const d = N[0] * tx + N[1] * ty + N[2] * tz;
    N = [N[0] - tx * d, N[1] - ty * d, N[2] - tz * d];
    const nl = Math.hypot(N[0], N[1], N[2]) || 1;
    N = [N[0] / nl, N[1] / nl, N[2] / nl];
    const B = [ty * N[2] - tz * N[1], tz * N[0] - tx * N[2], tx * N[1] - ty * N[0]];
    const t = len > 0 ? lens[i] / len : 0;
    const col = colFn(t);
    const r = S[i][3];
    for (let k = 0; k < seg; k++) {
      const th = (k / seg) * Math.PI * 2;
      const c = Math.cos(th), s = Math.sin(th);
      const nx = N[0] * c + B[0] * s, ny = N[1] * c + B[1] * s, nz = N[2] * c + B[2] * s;
      mb.vert(S[i][0] + nx * r, S[i][1] + ny * r, S[i][2] + nz * r, nx, ny, nz, col);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < seg; k++) {
      const a = base + i * seg + k, b = base + i * seg + ((k + 1) % seg), c = a + seg, d = b + seg;
      mb.tri(a, b, c);
      mb.tri(b, d, c);
    }
  }
  const cap = (i, flip) => {
    if (S[i][3] < 0.004) return;
    const p = S[i];
    const q = S[flip ? 1 : n - 2];
    let tx = p[0] - q[0], ty = p[1] - q[1], tz = p[2] - q[2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    const c = mb.vert(p[0], p[1], p[2], tx / tl, ty / tl, tz / tl, colFn(flip ? 0 : 1));
    const r0 = base + i * seg;
    for (let k = 0; k < seg; k++) {
      const a = r0 + k, b = r0 + ((k + 1) % seg);
      if (flip) mb.tri(c, b, a); else mb.tri(c, a, b);
    }
  };
  if (capEnd) cap(n - 1, false);
  if (capStart) cap(0, true);
}

/**
 * Surface of revolution around +Y: bodies, robes, bells, skulls, hats.
 * profile: [[radius, y], ...] bottom -> top. sx/sz squash the cross-section.
 * warp(x, y, z) -> [x, y, z] optionally bends the result (hunches, leans).
 */
export function addLathe(mb, profile, { seg = 12, x = 0, y = 0, z = 0, sx = 1, sz = 1, colFn, jitter = 0, rng = Math.random, warp }) {
  const base = mb.count;
  const n = profile.length;
  for (let j = 0; j < n; j++) {
    const [r, py] = profile[j];
    const a = profile[Math.max(j - 1, 0)], b = profile[Math.min(j + 1, n - 1)];
    const dr = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dr, dy) || 1;
    const nr = dy / l, ny = -dr / l; // outward normal in the (radial, y) plane
    const t = (py - profile[0][1]) / ((profile[n - 1][1] - profile[0][1]) || 1);
    const col = colFn(t, py);
    for (let k = 0; k <= seg; k++) {
      const th = (k / seg) * Math.PI * 2;
      const c = Math.cos(th), s = Math.sin(th);
      const j2 = jitter && k < seg && r > 0.001 ? 1 + (rng() - 0.5) * jitter : 1;
      let px = c * r * sx * j2, pz = s * r * sz * j2, pyy = py;
      let nx = c * nr / sx, nyy = ny, nz = s * nr / sz;
      const nl = Math.hypot(nx, nyy, nz) || 1;
      if (warp) [px, pyy, pz] = warp(px, pyy, pz);
      mb.vert(x + px, y + pyy, z + pz, nx / nl, nyy / nl, nz / nl, col);
    }
    if (jitter) { // weld the seam
      const i0 = (base + j * (seg + 1)) * 3, i1 = (base + j * (seg + 1) + seg) * 3;
      mb.p[i1] = mb.p[i0]; mb.p[i1 + 1] = mb.p[i0 + 1]; mb.p[i1 + 2] = mb.p[i0 + 2];
    }
  }
  for (let j = 0; j < n - 1; j++) {
    for (let k = 0; k < seg; k++) {
      const a = base + j * (seg + 1) + k, b = a + 1, c = a + seg + 1, d = c + 1;
      mb.tri(a, c, b);
      mb.tri(b, c, d);
    }
  }
}

/** Flat membrane (wings, cloth): fan from a root point to an outline. Use a double-sided material. */
export function addFan(mb, root, outline, colFn) {
  // true plane normal from the outline (two-sided lighting flips it per view)
  const p0 = outline[0], p1 = outline[outline.length >> 1];
  const ux = p0[0] - root[0], uy = p0[1] - root[1], uz = p0[2] - root[2];
  const vx = p1[0] - root[0], vy = p1[1] - root[1], vz = p1[2] - root[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl; ny /= nl; nz /= nl;
  const c = mb.vert(root[0], root[1], root[2], nx, ny, nz, colFn(0));
  const b = mb.count;
  outline.forEach((p, i) => mb.vert(p[0], p[1], p[2], nx, ny, nz, colFn(i / (outline.length - 1))));
  for (let i = 0; i < outline.length - 1; i++) mb.tri(c, b + i, b + i + 1);
}

// ---------------------------------------------------------------- props
/** Full-screen quad in NDC. */
export function quadMesh(device) {
  const mesh = new pc.Mesh(device);
  mesh.setPositions([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
  mesh.setIndices([0, 1, 2, 0, 2, 3]);
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  return mesh;
}
