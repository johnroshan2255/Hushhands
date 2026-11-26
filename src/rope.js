// The thread you can see. The pull between two wanderers is worked out in phys.js as a plain length
// limit; this is only its picture: a short chain of points per link that sags, swings and lies on the
// ground, drawn as a glowing amber ribbon. Also here: the Spool-Lantern's body.
import * as pc from 'playcanvas';
import { MeshBuilder, rgba, addSphere } from './meshes.js';
import { mats, ent, halo, sharedMesh, addAnnulus, addBeam, ink, amber } from './scene.js';

const N = 14; // points per link
const CORE = 0.03, HALO = 0.2;

export class Threads {
  constructor(app, maxLinks = 3) {
    this.app = app;
    this.max = maxLinks;
    const device = app.graphicsDevice;
    const M = mats();
    this.links = [];
    for (let i = 0; i < maxLinks; i++) this.links.push({ x: new Float32Array(N), y: new Float32Array(N), ox: new Float32Array(N), oy: new Float32Array(N), live: false });
    // core: 2 verts a point; halo: 3 verts a point
    const mk = (per, colFn) => {
      const mesh = new pc.Mesh(device);
      mesh.clear(true, false);
      const nv = maxLinks * N * per;
      const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), col = new Uint8Array(nv * 4), idx = [];
      for (let v = 0; v < nv; v++) { nrm[v * 3 + 2] = 1; const c = colFn(v % per); col.set(c, v * 4); }
      for (let l = 0; l < maxLinks; l++) for (let i = 0; i < N - 1; i++) for (let k = 0; k < per - 1; k++) { const a = (l * N + i) * per + k, b = a + per; idx.push(a, a + 1, b + 1, a, b + 1, b); }
      mesh.setPositions(pos); mesh.setNormals(nrm); mesh.setColors32(col); mesh.setIndices(idx);
      mesh.update(pc.PRIMITIVE_TRIANGLES, false);
      return { mesh, pos, per };
    };
    this.core = mk(2, () => rgba(1, 0.66, 0.26, 1));
    this.halo = mk(3, (k) => rgba(1, 0.6, 0.2, k === 1 ? 0.22 : 0));
    this.root = new pc.Entity('threads');
    app.root.addChild(this.root);
    this.eCore = ent(this.root, this.core.mesh, M.world);
    this.eHalo = ent(this.root, this.halo.mesh, M.glow, 0, 0, 0, 91);
    for (const e of [this.eCore, this.eHalo]) e.render.meshInstances[0].cull = false;
  }
  destroy() { this.root.destroy(); this.core.mesh.destroy(); this.halo.mesh.destroy(); }
  reset() { for (const l of this.links) l.live = false; }

  /** ends: [{ ax, ay, bx, by, len }] (waist to waist); solids: boxes the thread lies on */
  update(dt, ends, solids, isOpen) {
    const h = Math.min(dt, 1 / 30);
    for (let li = 0; li < this.max; li++) {
      const L = this.links[li], e = ends[li];
      if (!e) { if (L.live) { L.live = false; this.write(li, null); } continue; }
      const jump = L.live ? Math.hypot(L.x[0] - e.ax, L.y[0] - e.ay) + Math.hypot(L.x[N - 1] - e.bx, L.y[N - 1] - e.by) : 99;
      if (jump > 5) { for (let i = 0; i < N; i++) { const k = i / (N - 1); L.x[i] = L.ox[i] = e.ax + (e.bx - e.ax) * k; L.y[i] = L.oy[i] = e.ay + (e.by - e.ay) * k; } L.live = true; }
      for (let i = 1; i < N - 1; i++) {
        const vx = (L.x[i] - L.ox[i]) * 0.985, vy = (L.y[i] - L.oy[i]) * 0.985;
        L.ox[i] = L.x[i]; L.oy[i] = L.y[i];
        L.x[i] += vx; L.y[i] += vy - 22 * h * h;
      }
      L.x[0] = e.ax; L.y[0] = e.ay; L.x[N - 1] = e.bx; L.y[N - 1] = e.by;
      const rest = Math.max(0.05, e.len / (N - 1));
      for (let it = 0; it < 7; it++) {
        for (let i = 0; i < N - 1; i++) {
          const dx = L.x[i + 1] - L.x[i], dy = L.y[i + 1] - L.y[i], d = Math.hypot(dx, dy) || 1e-4;
          const k = (d - rest) / d * 0.5;
          const a = i === 0 ? 0 : i === N - 2 ? 2 : 1; // pinned ends take none of it
          if (i > 0) { L.x[i] += dx * k * (a === 2 ? 2 : 1); L.y[i] += dy * k * (a === 2 ? 2 : 1); }
          if (i < N - 2) { L.x[i + 1] -= dx * k * (a === 0 ? 2 : 1); L.y[i + 1] -= dy * k * (a === 0 ? 2 : 1); }
        }
      }
      // lie on the ground rather than through it
      for (let i = 1; i < N - 1; i++) {
        const x = L.x[i], y = L.y[i];
        for (const s of solids) { if (x <= s.x0 || x >= s.x1 || y >= s.y1 + 0.03 || y < s.y1 - 1.4) continue; if (isOpen(s)) continue; L.y[i] = s.y1 + 0.03; L.ox[i] += (L.x[i] - L.ox[i]) * 0.3; break; }
      }
      this.write(li, L);
    }
    for (const m of [this.core, this.halo]) { m.mesh.setPositions(m.pos); m.mesh.update(pc.PRIMITIVE_TRIANGLES, false); }
  }
  write(li, L) {
    for (const [m, w] of [[this.core, CORE], [this.halo, HALO]]) {
      const per = m.per, base = li * N * per * 3;
      if (!L) { m.pos.fill(0, base, base + N * per * 3); continue; }
      for (let i = 0; i < N; i++) {
        const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
        let tx = L.x[b] - L.x[a], ty = L.y[b] - L.y[a];
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const nx = -ty * w, ny = tx * w;
        for (let k = 0; k < per; k++) {
          const o = base + (i * per + k) * 3, s = per === 2 ? (k ? 1 : -1) : k - 1;
          m.pos[o] = L.x[i] + nx * s; m.pos[o + 1] = L.y[i] + ny * s; m.pos[o + 2] = per === 2 ? 0.26 : 0.24;
        }
      }
    }
  }
}

/** The Spool-Lantern: a drum of thread on a little frame, with a lamp that lights the dark for one */
export class SpoolView {
  constructor(app) {
    const device = app.graphicsDevice, M = mats();
    this.root = new pc.Entity('spool');
    app.root.addChild(this.root);
    const drum = sharedMesh(device, 'spooldrum', (mb) => {
      addAnnulus(mb, 0, 0, 0.16, 0, 0.21, 12, 0.04, ink(1.2)); addAnnulus(mb, 0, 0, -0.16, 0, 0.21, 12, 0.04, ink(1.2));
      addAnnulus(mb, 0, 0, 0, 0, 0.14, 12, 0.28, rgba(0.75, 0.45, 0.15, 0.35));
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; addBeam(mb, 0, 0, Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.185, 0.03, 0.01, ink(2)); }
    });
    const frame = sharedMesh(device, 'spoolframe', (mb) => {
      addBeam(mb, 0, 0, 0, 0.52, -0.2, 0.035, 0.035, ink()); addBeam(mb, 0, 0.52, 0.16, 0.6, -0.2, 0.03, 0.03, ink()); addBeam(mb, 0.16, 0.6, 0.16, 0.5, -0.2, 0.012, 0.012, ink());
      for (const sx of [-1, 1]) addBeam(mb, 0.16 + sx * 0.06, 0.5, 0.16 + sx * 0.06, 0.34, -0.2, 0.012, 0.012, ink());
      addBeam(mb, 0.08, 0.5, 0.24, 0.5, -0.2, 0.02, 0.1, ink()); addBeam(mb, 0.08, 0.34, 0.24, 0.34, -0.2, 0.02, 0.1, ink());
      addSphere(mb, { x: 0.16, y: 0.42, z: -0.2, r: 0.05, sy: 1.3, segW: 6, segH: 5, colFn: () => amber(1, 1) });
    });
    this.drum = ent(this.root, drum, M.world, 0, 0.21, 0);
    this.frame = ent(this.root, frame, M.world, 0, 0.21, 0);
    this.halo = ent(this.root, halo(device), M.glow, 0.16, 0.63, 0.1, 90);
    this.halo.setLocalScale(1.0, 1.0, 1.0);
    this.x = null; this.y = 0; this.roll = 0;
  }
  destroy() { this.root.destroy(); }
  update(dt, s, T) {
    if (this.x === null) { this.x = s.x; this.y = s.y; }
    const k = Math.min(1, dt * 22);
    const px = this.x;
    this.x += (s.x - this.x) * k; this.y += (s.y - this.y) * k;
    const hung = s.mode === 'hooked';
    if (!hung) this.roll -= ((this.x - px) / 0.21) * (180 / Math.PI);
    this.root.setLocalPosition(this.x, this.y - (hung ? 0.63 : 0), 0);
    this.root.setLocalEulerAngles(0, 0, hung ? Math.sin(T * 1.3) * 3 : 0);
    this.drum.setLocalEulerAngles(0, 0, this.roll);
    const f = 1.0 + Math.sin(T * 11) * 0.04 + Math.sin(T * 5.3) * 0.04;
    this.halo.setLocalScale(f, f, f);
  }
  /** where the thread ties on, and where the lamp is */
  knot(s) { return s.mode === 'hooked' ? [this.x, this.y - 0.4] : [this.x, this.y + 0.21]; }
}
