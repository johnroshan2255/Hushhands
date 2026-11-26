// Things in the Loom that move on the shared clock (worms, cogs, shears, water) are pure functions of
// time, so every browser agrees for free. The chapters themselves are built in src/chapters/.
export { LINK } from './chapters/kit.js';

const sm = (v) => v * v * (3 - 2 * v);
/** a worm's reach right now, 0 (hidden) .. 1 (fully out); they strike on a rhythm */
export function wormOut(w, T) {
  const ph = (((T + w.off) % w.period) + w.period) % w.period;
  if (ph > w.up) return 0;
  const k = ph / w.up;
  return k < 0.25 ? sm(k / 0.25) : k > 0.7 ? sm((1 - k) / 0.3) : 1;
}
/** seconds until this worm next strikes (for the warning rumble) */
export function wormWarn(w, T) { const ph = (((T + w.off) % w.period) + w.period) % w.period; return ph > w.up ? w.period - ph : 0; }
/** where a cog's pad k is right now: { x, y, vx, vy } (pads stay level) */
export function cogPad(c, k, T) {
  const w = (Math.PI * 2 * c.dir) / c.period;
  const a = w * T + (k / c.pads) * Math.PI * 2;
  return { x: c.x + Math.cos(a) * c.r, y: c.y + Math.sin(a) * c.r, vx: -Math.sin(a) * c.r * w, vy: Math.cos(a) * c.r * w, a };
}
/** the shears: 0 open .. 1 shut; they snap shut for a moment on a rhythm, after a shiver */
export function shearsShut(s, T) {
  const ph = (((T + s.off) % s.period) + s.period) % s.period;
  if (ph < s.shut) return 1;
  const left = s.period - ph;
  return left < 0.12 ? 1 - left / 0.12 : 0;
}
export function shearsWarn(s, T) { const ph = (((T + s.off) % s.period) + s.period) % s.period; return s.period - ph < 0.8 && ph >= s.shut; }
/** which snap of the shears we are in (changes at the moment they shut) */
export function shearsBeat(s, T) { return Math.floor((T + s.off) / s.period); }
/** a press: 0 up .. 1 down; it falls hard on its beat and rises slowly (warn: the last 0.7 s before) */
export function pressDown(p, T) {
  const ph = (((T + p.off) % p.period) + p.period) % p.period;
  if (ph < 0.12) return sm(ph / 0.12);
  if (ph < 0.12 + p.hold) return 1;
  const r = (ph - 0.12 - p.hold) / Math.max(0.1, p.period * 0.45);
  return r < 1 ? 1 - sm(r) : 0;
}
export function pressWarn(p, T) { const ph = (((T + p.off) % p.period) + p.period) % p.period; return p.period - ph < 0.7; }
export function pressBeat(p, T) { return Math.floor((T + p.off) / p.period); }
/** a water's level at time T, given when it was let in (null = not yet); some speed up as they rise */
export function waterLevel(W, t0, T) {
  if (!W) return -999;
  if (W.kind === 'pool' || W.kind === 'bog') return W.y1;
  if (t0 == null) return W.y0;
  const t = Math.max(0, T - t0 - (W.delay ?? 1.5));
  return Math.min(W.y1, W.y0 + t * W.rate + (W.accel ? 0.5 * W.accel * t * t : 0));
}
/** an eel under the water: it glows for a second, then flashes; { warn, flash, beat } */
export function eelAt(e, T) {
  const ph = (((T + e.off) % e.period) + e.period) % e.period;
  return { warn: ph > e.period - 1.1, flash: ph < 0.3, beat: Math.floor((T + e.off) / e.period), glow: ph > e.period - 1.1 ? (ph - (e.period - 1.1)) / 1.1 : ph < 0.3 ? 1 : 0 };
}
