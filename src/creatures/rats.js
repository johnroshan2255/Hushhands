// The Gnawers: a living floor of rats. Not a hundred minds, one rule: wherever the floor of a swarm
// is dark, they are; a light makes a circle they will not cross, and they press against its edge. A
// doll standing on a dark swarm floor for a moment is stripped to its thread. Every browser runs the
// same rule from the same lights, so nothing about them goes over the wire but "they are out".
//
// Drawn as one mesh rebuilt every frame from the Blender rat (public/models/rat.json): a few hundred
// small bodies, each scurrying toward where the light lets it be.
import * as pc from 'playcanvas';
import { model } from '../models.js';
import { worldMaterial } from '../render.js';

const R2D = 180 / Math.PI;
/** is (x, y) inside any light? lights: [{ x, y, r }] */
export const litAt = (lights, x, y) => lights.some((l) => Math.abs(l.x - x) < l.r && Math.abs(l.y - y) < 2.2);

export class RatsView {
  /** swarms: L.swarms ([{ x0, x1, y }]); tides: the rising rat-tides ([{ x0, x1 }]); q: quality 0..2 */
  constructor(app, L, q = 2) {
    this.app = app; this.dev = app.graphicsDevice; this.L = L;
    this.density = q === 0 ? 2.2 : q === 1 ? 3.8 : 5.5;
    this.rats = [];
    for (const [si, s] of L.swarms.entries()) {
      const n = Math.round((s.x1 - s.x0) * this.density);
      for (let i = 0; i < n; i++) this.rats.push({ s: si, tide: false, home: s.x0 + ((i + Math.random()) / n) * (s.x1 - s.x0), x: s.x0 - 1 - Math.random() * 2, z: -1.3 + Math.random() * 3.1, ph: Math.random() * 7, sz: 0.75 + Math.random() * 0.5, dir: 1, out: 0, delay: Math.random() * 1.4, pile: 0, wag: Math.random() * 6 });
    }
    for (const [ti, w] of L.waters.entries()) {
      if (w.look !== 'rats') continue;
      const n = Math.round((w.x1 - w.x0) * this.density * 1.6);
      for (let i = 0; i < n; i++) this.rats.push({ s: ti, tide: true, home: w.x0 + Math.random() * (w.x1 - w.x0), x: 0, z: -1.2 + Math.random() * 3, ph: Math.random() * 7, sz: 0.8 + Math.random() * 0.5, dir: Math.random() < 0.5 ? -1 : 1, out: 1, delay: 0, pile: Math.random(), wag: Math.random() * 6 });
    }
    this.mat = worldMaterial();
    this.ok = false; this.e = null;
  }
  build() {
    const M = model(this.dev, 'rat');
    if (!M || !this.rats.length) return;
    // one mesh: each rat a copy of the body and tail; positions rewritten every frame
    const src = [M.raw.body, M.raw.tail];
    const per = src.reduce((a, s) => a + s.n, 0), cnt = this.rats.length;
    this.per = per; this.src = src;
    this.pos = new Float32Array(cnt * per * 3); this.nrm = new Float32Array(cnt * per * 3);
    const col = new Uint8Array(cnt * per * 4), idx = [];
    for (let r = 0; r < cnt; r++) {
      let base = r * per;
      for (const s of src) { col.set(s.C, base * 4); for (const i of s.I) idx.push(base + i); base += s.n; }
    }
    const mesh = new pc.Mesh(this.dev);
    mesh.clear(true, false);
    mesh.setPositions(this.pos); mesh.setNormals(this.nrm); mesh.setColors32(col); mesh.setIndices(idx.length > 65535 ? new Uint32Array(idx) : idx);
    mesh.update(pc.PRIMITIVE_TRIANGLES, false);
    this.mesh = mesh;
    this.e = new pc.Entity('rats');
    this.e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, this.mat)], castShadows: false });
    this.e.render.meshInstances[0].cull = false;
    this.app.root.addChild(this.e);
    this.ok = true;
  }
  destroy() { if (this.e) this.e.destroy(); if (this.mesh) this.mesh.destroy(); }
  /**
   * on: which swarms are out ([bool]); lights: [{ x, y, r }]; tideAt(i): the level of rat-tide water i
   * (or null when it is not rising); returns how loud they are near x (for the squeal)
   */
  update(dt, T, on, lights, tideAt, camX) {
    if (!this.ok) { this.build(); if (!this.ok) return; }
    const L = this.L, P = this.pos, N = this.nrm;
    let k = 0;
    for (const r of this.rats) {
      let x = r.x, y, vis = true, run = 0;
      if (r.tide) {
        const lv = tideAt(r.s);
        if (lv == null) vis = false;
        else { const w = L.waters[r.s]; r.home += r.dir * dt * (0.4 + r.sz * 0.6); if (r.home > w.x1) { r.home = w.x1; r.dir = -1; } if (r.home < w.x0) { r.home = w.x0; r.dir = 1; } x = r.home; y = lv - 0.25 + Math.sin(T * 3 + r.ph) * 0.12 + r.pile * 0.35; run = 1; }
      } else {
        const s = L.swarms[r.s];
        if (!on[r.s]) { r.out = Math.max(0, r.out - dt * 2); if (r.out <= 0) { r.x = r.home < (s.x0 + s.x1) / 2 ? s.x0 - 0.8 : s.x1 + 0.8; vis = false; } }
        else if (r.out < 1) { r.delay -= dt; if (r.delay < 0) r.out = Math.min(1, r.out + dt * 1.2); }
        // where it wants to be: home, wandering; pressed out to the edge of any light it would be inside
        let tx = r.home + Math.sin(T * 0.6 + r.ph) * 0.9;
        let pile = 0;
        for (const l of lights) {
          if (Math.abs(l.y - s.y) > 2.2) continue;
          const d = tx - l.x, edge = l.r + 0.15 + (r.ph % 1) * 0.5;
          if (Math.abs(d) < edge) { tx = l.x + Math.sign(d || 1) * edge; pile = 1 - Math.abs(Math.abs(d) - edge) / edge; }
        }
        for (const [g0, g1] of s.gaps || []) if (tx > g0 - 0.1 && tx < g1 + 0.1) tx = tx - g0 < g1 - tx ? g0 - 0.15 : g1 + 0.15;
        if (on[r.s] && r.out > 0) { const dx = tx - r.x, sp = Math.min(Math.abs(dx) * 3, 5.5); r.x += Math.sign(dx) * sp * dt; if (Math.abs(dx) > 0.05) r.dir = Math.sign(dx); run = Math.min(1, sp / 2); }
        r.pile += (pile - r.pile) * Math.min(1, dt * 4);
        x = r.x; y = s.y + r.pile * 0.25 * ((r.ph * 3.7) % 1);
        if (r.out <= 0) vis = false;
      }
      // write it
      const sc = vis ? r.sz : 0, f = r.dir, bob = Math.abs(Math.sin(T * 18 * (0.4 + run) + r.ph)) * 0.03 * run;
      const tail = Math.sin(T * 9 + r.wag) * 0.6;
      let o = k * this.per * 3;
      for (let pi = 0; pi < this.src.length; pi++) {
        const s = this.src[pi], Sp = s.P, Sn = s.N;
        const ca = pi === 1 ? Math.cos(tail) : 1, sa = pi === 1 ? Math.sin(tail) : 0;
        for (let v = 0; v < s.n; v++) {
          let px = Sp[v * 3], py = Sp[v * 3 + 1], pz = Sp[v * 3 + 2];
          if (pi === 1) { const qx = px * ca - pz * sa; pz = px * sa + pz * ca; px = qx - 0.17; py += 0.1; } // the tail swings from the rump
          P[o] = x + px * sc * f; P[o + 1] = y + py * sc + bob; P[o + 2] = r.z + pz * sc;
          N[o] = Sn[v * 3] * f; N[o + 1] = Sn[v * 3 + 1]; N[o + 2] = Sn[v * 3 + 2];
          o += 3;
        }
      }
      k++;
    }
    this.mesh.setPositions(P); this.mesh.setNormals(N);
    this.mesh.update(pc.PRIMITIVE_TRIANGLES, false);
    void camX; void R2D;
  }
}
