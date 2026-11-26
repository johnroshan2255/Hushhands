// Creatures modelled in Blender (art/blender/*.py) arrive as public/models/<name>.json: named parts,
// each a mesh in the game's own vertex layout (position, normal, colour with glow in alpha). Loaded
// once, kept; while a model is still on its way, whoever asked gets null and draws a stand-in.
import * as pc from 'playcanvas';

const cache = new Map(); // name -> { parts: { name: pc.Mesh }, meta } | Promise
const BASE = (import.meta.env && import.meta.env.BASE_URL) || './';

const dec = (b64, Type) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Type(u.buffer); };

function build(device, data) {
  const parts = {}, raw = {};
  for (const [k, p] of Object.entries(data.parts)) {
    const P = dec(p.p, Float32Array), N8 = dec(p.nn, Int8Array), C = dec(p.c, Uint8Array), I = dec(p.i, Uint16Array);
    const N = new Float32Array(N8.length);
    for (let i = 0; i < N8.length; i++) N[i] = N8[i] / 127;
    const m = new pc.Mesh(device);
    m.setPositions(P); m.setNormals(N); m.setColors32(C); m.setIndices(I);
    m.update(pc.PRIMITIVE_TRIANGLES);
    m.incRefCount();
    parts[k] = m;
    raw[k] = { n: P.length / 3, P, N, C, I }; // (kept for whoever builds meshes from it on the CPU: the rats)
  }
  return { parts, raw, meta: data.meta || {} };
}

/** start loading (returns a promise of the model) */
export function loadModel(device, name) {
  if (cache.has(name)) return Promise.resolve(cache.get(name));
  const pr = fetch(`${BASE}models/${name}.json`).then((r) => { if (!r.ok) throw new Error(`${name}: ${r.status}`); return r.json(); }).then((d) => { const m = build(device, d); cache.set(name, m); return m; });
  cache.set(name, pr);
  pr.catch((e) => { console.warn('[models]', e.message); cache.delete(name); });
  return pr;
}
/** the model if it has arrived, else null (and it is asked for) */
export function model(device, name) {
  const m = cache.get(name);
  if (m && !(m instanceof Promise)) return m;
  if (!m) loadModel(device, name);
  return null;
}
