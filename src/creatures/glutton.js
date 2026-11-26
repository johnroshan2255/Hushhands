// The Glutton: a mouth under the Larder's floor. It feels the boards: a step or a landing anywhere
// over it, a creeping foot only right above it. It slides under to where the boards shook, the boards
// bulge and creak, and its jaws come up through them. Hidden in a sack, still, you are a sack. Meat
// knocked off the hooks is the loudest thing on the floor; it chews for a while, and it eats whatever
// it is given, the poisoned sack too.
//
// Mind (host only): roam | hunt | rise | bite | sink | chew | dying | dead
import * as pc from 'playcanvas';
import { model } from '../models.js';
import { mats, ent } from '../scene.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const RISE = 0.8, CHEW = 5.5;

export function newGlutton(m) {
  return { kind: 'glutton', id: m.id, x: m.x, x0: m.x0, x1: m.x1, y: m.y, mode: 'roam', t: 0, tx: m.x, dir: 1, lure: null, who: -1, gate: m.gate, safe: m.safe || [] };
}
/** bodies: [{ i, x, y, vx, noise, sneak, hidden, dead, real }]; meat: [{ x, state }] (state 1 = on the floor) */
export function thinkGlutton(m, dt, bodies, L, ctx) {
  const ev = [];
  m.t += dt;
  if (m.mode === 'dead') return ev;
  if (m.mode === 'dying') { if (m.t > 2.2) { m.mode = 'dead'; ev.push({ t: 'gdead', id: m.id, x: m.x }); } return ev; }
  const onBoards = (b) => !b.dead && b.real && !b.hidden && b.x > m.x0 - 0.5 && b.x < m.x1 + 0.5 && Math.abs(b.y - m.y) < 0.6 && !m.safe.some(([a, c]) => b.x > a && b.x < c);
  // what shook the boards: meat that fell, a step, a landing; a creeping foot only right above it
  let heard = null;
  const meat = (ctx && ctx.meat) || [];
  for (const q of meat) if (q.state === 1) heard = { x: q.x, n: 2 };
  if (!heard) for (const b of bodies) {
    if (!onBoards(b)) continue;
    const n = b.noise >= 0.25 ? b.noise : b.sneak && Math.abs(b.vx) > 0.3 && Math.abs(b.x - m.x) < 2.6 ? 0.3 : 0;
    if (n > 0 && (!heard || n > heard.n)) heard = { x: b.x, n };
  }
  if (heard && (m.mode === 'roam' || m.mode === 'hunt')) { if (m.mode === 'roam') ev.push({ t: 'hear', id: m.id }); m.mode = 'hunt'; m.tx = clamp(heard.x, m.x0, m.x1); }
  switch (m.mode) {
    case 'roam': m.x += m.dir * 1.3 * dt; if (m.x > m.x1) { m.x = m.x1; m.dir = -1; } if (m.x < m.x0) { m.x = m.x0; m.dir = 1; } break;
    case 'hunt': { const d = m.tx - m.x; if (Math.abs(d) > 0.08) { m.dir = Math.sign(d); m.x += clamp(d, -4.6 * dt, 4.6 * dt); } else { m.mode = 'rise'; m.t = 0; ev.push({ t: 'rise', id: m.id, x: m.x }); } break; }
    case 'rise': if (m.t > RISE) {
      m.mode = 'bite'; m.t = 0;
      ev.push({ t: 'bite', id: m.id, x: m.x });
      for (const b of bodies) if (onBoards(b) && Math.abs(b.x - m.x) < 1.15) ev.push({ t: 'eat', id: m.id, i: b.i });
      const k = meat.findIndex((q) => q.state === 1 && Math.abs(q.x - m.x) < 1.4);
      if (k >= 0) { ev.push({ t: 'meat', id: m.id, k }); m.mode = meat[k].poison ? 'dying' : 'chew'; m.t = 0; }
    } break;
    case 'bite': if (m.t > 0.45) { m.mode = 'sink'; m.t = 0; } break;
    case 'chew': if (m.t > CHEW) { m.mode = 'sink'; m.t = 0; } break;
    case 'sink': if (m.t > 0.9) { m.mode = 'roam'; m.t = 0; } break;
    default: break;
  }
  return ev;
}
export const packGlutton = (m) => [Math.round(m.x * 100) / 100, m.mode, m.dir, Math.round(m.t * 100) / 100];
export function unpackGlutton(m, a) { m.x = a[0]; if (m.mode !== a[1]) { m.mode = a[1]; m.t = a[3]; } m.dir = a[2]; }

// ------------------------------------------------------------------ the jaws (everyone)
export class GluttonView {
  constructor(app, m) {
    this.app = app; this.dev = app.graphicsDevice;
    this.root = new pc.Entity('glutton'); app.root.addChild(this.root);
    this.x = m.x; this.ok = false; this.h = 0;
    this.build();
  }
  build() {
    const M = model(this.dev, 'glutton');
    if (!M) return;
    const W = mats().world, P = M.parts;
    // two jaws standing up out of the floor, hinged at the bottom, teeth facing each other
    const jaw = (part, side) => { const hinge = ent(this.root, null, null, side * 0.3, 0, 0); const j = ent(hinge, part, W, 1.1, 0, 0); return hinge; };
    this.right = jaw(P.upper, 1);
    this.left = jaw(P.lower, -1);
    this.tongue = ent(this.root, P.tongue, W, 0, 0.6, 0.1); this.tongue.setLocalEulerAngles(0, 0, 90);
    this.ok = true;
  }
  destroy() { this.root.destroy(); }
  update(dt, m, T) {
    if (!this.ok) this.build();
    this.x += (m.x - this.x) * Math.min(1, dt * 10);
    // how far up through the boards: hidden under them, poking up as it rises, out to bite, down again
    const want = m.mode === 'rise' ? -1.9 + Math.min(1, m.t / RISE) * 0.6 : m.mode === 'bite' ? -0.5 : m.mode === 'chew' ? -0.9 + Math.sin(T * 6) * 0.12 : m.mode === 'dying' ? -0.6 - Math.min(1, m.t / 2) * 2.6 : -3.2;
    this.h += (want - this.h) * Math.min(1, dt * (m.mode === 'bite' ? 30 : 7));
    const shake = m.mode === 'rise' ? Math.sin(T * 50) * 0.05 : m.mode === 'dying' ? Math.sin(T * 30) * 0.12 : 0;
    this.root.setLocalPosition(this.x + shake, m.y + this.h, -0.1);
    this.root.enabled = this.h > -3.1 && m.mode !== 'dead';
    if (!this.ok) return;
    const open = m.mode === 'rise' ? 24 + Math.sin(T * 9) * 4 : m.mode === 'bite' ? 30 * Math.max(0, 1 - m.t / 0.12) : m.mode === 'chew' ? 8 + Math.abs(Math.sin(T * 6)) * 14 : m.mode === 'dying' ? 35 : 20;
    this.right.setLocalEulerAngles(0, 0, 90 - open);
    this.left.setLocalEulerAngles(0, 0, 90 + open);
  }
}
