// The Loom, as data. One long walk from the scrap pit to the Great Spindle, built for the number of
// wanderers who set out: n = 1..4. Everything that needs "all of you" (pressure plates, levers, the
// spindle's rings, the line that trips the Collector) is made n wide; alone, the Spool-Lantern you
// drag behind you is your second body.
//
// Coordinates: x right, y up, metres. Solids are axis-aligned boxes. Hazards that move on a clock
// (worms, cogs, shears) are pure functions of the shared time, so every browser agrees for free.
export const LINK = 7; // metres of thread between two neighbours

export function buildLevel(n) {
  const nb = Math.max(2, n); // bodies that can weigh a plate down: the players, or you and your spool
  const L = { n, nb, solids: [], plates: [], gates: [], levers: [], traps: [], worms: [], hooks: [], cps: [], bells: [], slabs: [], cogs: [], rings: [], kill: [], shears: [], monsters: [], deco: [], hints: [], zones: [], water: null, crawlZone: null };
  const solid = (x0, y0, x1, y1, o = {}) => { const s = { x0, y0, x1, y1, ...o }; L.solids.push(s); return s; };
  const ground = (x0, x1, top, o = {}) => solid(x0, top - 30, x1, top, { ground: true, ...o });
  const cp = (x, y, name) => L.cps.push({ i: L.cps.length, x, y, name });
  const gate = (x, y, id, h = 5) => { const g = solid(x, y, x + 0.7, y + h, { gate: id }); L.gates.push({ id, x, y, h }); return g; };
  const platesAt = (x, y, id, count = nb, gap = 2.8) => { for (let i = 0; i < count; i++) L.plates.push({ id, x: x + i * gap, y, w: 1.5 }); return x + (count - 1) * gap; };
  const deco = (kind, x, y, o = {}) => L.deco.push({ kind, x, y, ...o });
  const hint = (x0, x1, text) => L.hints.push({ x0, x1, text });
  const zone = (name, x0, x1) => L.zones.push({ name, x0, x1 });
  const solo = n === 1;

  // ---------------------------------------------------------------- 0. the scrap pit: wake, walk, jump, weigh the plates
  let y = 0;
  solid(-14, -30, 0, 16); // the pit's wall behind you
  ground(0, 46 + (nb - 2) * 2.8, y);
  cp(3, y, 'THE SCRAP PIT');
  hint(1, 8, 'move');
  solid(9, y, 11.2, y + 0.8);
  hint(6.5, 14, 'jump');
  solid(15, y, 17, y + 1.0); solid(17, y, 19.5, y + 2.4);
  hint(14.2, 19, 'climb');
  deco('heap', 5, y); deco('heap', 13, y, { s: 1.4 }); deco('cage', 21.4, y);
  const p0 = platesAt(24, y, 'g0');
  hint(21, p0 + 2, solo ? 'plates1' : 'plates');
  const g0x = p0 + 3.4;
  gate(g0x, y, 'g0');
  deco('arch', g0x + 0.35, y);
  let x = g0x + 3;
  cp(x, y, 'THE MEADOW');
  zone('pit', -14, g0x);

  // ---------------------------------------------------------------- 1. the bear-trap meadow, then the worm bed
  const m0 = x + 3;
  ground(x - 3 + 0.001, m0 + 60, y);
  for (const dx of [5, 10.4, 14, 20.5, 25, 28.6]) L.traps.push({ x: m0 + dx, y });
  deco('grass', m0 - 2, y, { w: 36 });
  for (const [i, dx] of [36, 40.2, 44.4].entries()) L.worms.push({ x: m0 + dx, y, dir: 1, period: 3.4, up: 1.1, off: i * 1.1, len: 2.6 });
  deco('bones', m0 + 33, y); deco('tree', m0 + 31, y); deco('tree', m0 + 48.5, y, { s: 1.3 }); deco('tree', m0 + 8, y, { s: 1.6, far: true }); deco('tree', m0 + 19, y, { s: 1.1, far: true });
  cp(m0 + 52, y, 'THE CHASM');
  zone('meadow', g0x, m0 + 50);

  // ---------------------------------------------------------------- 2. the chasm: one holds, one hangs and swings
  const xe = m0 + 60; // the ground ends; a jetty runs on over the drop
  const tip = xe + 3.6;
  solid(xe, y - 0.35, tip, y, { thin: true });
  const yB = y - 2;
  const xf = tip + 4.2; // the far wall
  solid(xe, -60, xf, y - 16); // the pit's floor, far below
  L.kill.push({ x0: xe - 0.2, x1: xf + 0.2, y0: -60, y1: y - 12.5, why: 'fell' });
  deco('spikes', xe, y - 16, { w: xf - xe });
  L.hooks.push({ id: 'h0', x: tip - 0.3, y: y + 2.3, solo: true });
  deco('gibbet', xe + 0.5, y, { reach: tip - 0.3 - (xe + 0.5), h: 3.1 });
  hint(m0 + 54, tip + 1, solo ? 'chasm1' : 'chasm');
  ground(xf, xf + 24, yB);
  cp(xf + 5, yB, 'THE WORM TUNNEL');
  zone('chasm', m0 + 50, xf + 3);
  y = yB;

  // ---------------------------------------------------------------- 3. the tunnel of ceiling worms, then the blind crawler's den
  const xt = xf + 12;
  ground(xf + 24 - 0.001, xt + 80, y);
  solid(xt, y + 2.9, xt + 24, y + 18);
  for (const [i, dx] of [5, 9.5, 14, 18.5].entries()) L.worms.push({ x: xt + dx, y: y + 2.9, dir: -1, period: 3.0, up: 1.0, off: i * 0.75, len: 2.5 });
  deco('pipes', xt, y + 2.9, { w: 24 });
  const xa = xt + 30; // the den
  cp(xa - 4, y, 'THE DEN');
  hint(xa - 5.5, xa + 3, 'sneak');
  solid(xa, y, xa + 1.3, y + 1.15); // a stump: landing off it is the first sound you make
  L.monsters.push({ kind: 'crawler', id: 'c0', x: xa + 11, y: y + 4.2, x0: xa + 2.2, x1: xa + 15.4 });
  L.crawlZone = { x0: xa - 1, x1: xa + 16.4, y0: y - 1, y1: y + 4.2 };
  solid(xa + 16.8, y, xa + 18.2, y + 0.95);
  const yL = y + 1.9;
  const xg = xa + 34; // (the gear room begins here)
  solid(xa + 18.2, y - 30, xg + 21.6, yL, { ground: true }); // the ledge, and on to the gear room's floor
  if (solo) { L.plates.push({ id: 'g3', x: xa + 20, y: yL, w: 1.5 }); L.levers.push({ id: 'g3', x: xa + 24.4, y: yL }); }
  else for (let i = 0; i < n; i++) L.levers.push({ id: 'g3', x: xa + 19.6 + (i * 5) / (n - 1), y: yL });
  hint(xa + 18.4, xa + 25.6, solo ? 'levers1' : 'levers');
  gate(xa + 26, yL, 'g3');
  solid(xa + 26, yL + 5, xa + 26.7, yL + 18);
  deco('arch', xa + 26.35, yL); deco('web', xa + 8, y + 4.2, { w: 12 }); deco('bones', xa + 12, y); deco('bones', xa + 5.5, y);
  solid(xa - 2, y + 4.2, xa + 26, y + 18); // the den's roof
  cp(xa + 29.5, yL, 'THE GEAR ROOM');
  zone('tunnel', xf + 3, xa - 4); zone('den', xa - 4, xa + 26);
  y = yL;

  // ---------------------------------------------------------------- 4. the flooded gear room: up the cogs, ahead of the water
  L.water = { x0: xa + 26.7, x1: xg + 21.6, y0: y - 3.4, y1: y + 6.4, rate: 0.3, trigger: xg + 1.5, floor: y };
  solid(xg + 3, y, xg + 6, y + 1.0);
  L.cogs.push({ x: xg + 9.3, y: y + 2.5, r: 1.75, pads: 3, period: 8, dir: 1 });
  solid(xg + 12.2, y + 3.55, xg + 15.4, y + 3.95, { thin: true });
  L.cogs.push({ x: xg + 18.6, y: y + 5.3, r: 1.75, pads: 3, period: 8, dir: -1 });
  const yT = y + 7.3;
  solid(xg + 21.6, y - 30, xg + 200, yT, { ground: true }); // the top, and on from here
  solid(xg - 0.8, y + 3.2, xg, y + 30); // the room's near wall (you come in under it)
  deco('bigcog', xg + 9.3, y + 2.5, { r: 2.5, period: 8, dir: 1 }); deco('bigcog', xg + 18.6, y + 5.3, { r: 2.5, period: 8, dir: -1 }); deco('bigcog', xg + 14, y + 9, { r: 5, far: true, period: 20, dir: 1 }); deco('bigcog', xg + 3, y + 6.5, { r: 3.2, far: true, period: 12.8, dir: -1 });
  hint(xg - 3, xg + 8, 'water');
  y = yT;
  const p4 = platesAt(xg + 24.4, y, 'g4');
  gate(p4 + 3.2, y, 'g4');
  deco('arch', p4 + 3.55, y);
  x = p4 + 6.4;
  cp(x, y, 'THE GLASS BRIDGE');
  zone('gears', xa + 26, p4 + 3.2);

  // ---------------------------------------------------------------- 5. the glass bridge: it carries only so many at once
  const xs = x + 4;
  const SL = 2.7, NS = 8;
  // (the top floor's ground runs under the whole rest; cut the bridge's gap out of it)
  const top = L.solids.find((s) => s.x1 === xg + 200);
  top.x1 = xs;
  const cap = n >= 3 ? 2 : 1;
  for (let i = 0; i < NS; i++) L.slabs.push({ i, x0: xs + i * SL + 0.06, x1: xs + (i + 1) * SL - 0.06, y, cap });
  L.kill.push({ x0: xs, x1: xs + NS * SL, y0: -90, y1: y - 10, why: 'fell' });
  hint(x - 1, xs + 4, cap === 1 ? 'glass' : 'glass2');
  const xb = xs + NS * SL;
  ground(xb, xb + 160, y);
  deco('chains', xs, y + 11, { w: NS * SL });
  cp(xb + 3, y, 'THE BLIND CATHEDRAL');
  zone('bridge', p4 + 3.2, xb + 1);

  // ---------------------------------------------------------------- 6. the blind cathedral: bells, then the shears
  const xc = xb + 9;
  for (const [dx, kind] of [[0, 'hang'], [4.6, 'hang'], [9, 'wire'], [13.6, 'hang'], [18, 'wire'], [22, 'hang'], [24.2, 'hang']]) L.bells.push({ x: xc + dx, y, kind });
  deco('columns', xc - 4, y, { w: 34, h: 9 });
  deco('choir', xc - 1, y + 9, { w: 28 });
  solid(xc - 5, y + 9, xc + 34, y + 30);
  hint(xb + 1.5, xc + 3, 'bells');
  const xh = xc + 31;
  L.shears.push({ x: xh, y, period: 2.8, shut: 0.5, off: 0 });
  hint(xh - 6, xh - 0.8, solo ? 'shears1' : 'shears');
  cp(xh + 4.5, y, 'THE COLLECTOR');
  zone('cathedral', xb + 1, xh + 3);

  // ---------------------------------------------------------------- 7. the collector: a giant to be tripped with the thread
  const xk = xh + 9;
  L.monsters.push({ kind: 'collector', id: 'k0', x: xk + 16, y, x0: xk + 4, x1: xk + 23 });
  hint(xk - 4, xk + 4, solo ? 'collector1' : 'collector');
  gate(xk + 28, y, 'g7', 7);
  solid(xk + 28, y + 7, xk + 28.7, y + 30);
  deco('arch', xk + 28.35, y, { s: 1.4 }); deco('cages', xk + 2, y + 12, { w: 24 });
  cp(xk + 31.5, y, 'THE GREAT SPINDLE');
  zone('collector', xh + 3, xk + 28);

  // ---------------------------------------------------------------- 8. the great spindle: all of you, at once
  const xz = xk + 40;
  for (let i = 0; i < nb; i++) L.rings.push({ x: xz + i * 2.6, y });
  deco('spindle', xz + (nb - 1) * 1.3, y);
  hint(xz - 5, xz + nb * 2.6, solo ? 'rings1' : 'rings');
  solid(xz + nb * 2.6 + 8, y, xz + nb * 2.6 + 22, y + 30);
  L.endX = xz + nb * 2.6 + 8;
  zone('spindle', xk + 28, L.endX + 20);
  L.x0 = -14; L.x1 = L.endX + 14;
  return L;
}

// ---------------------------------------------------------------- things that move on the shared clock
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
/** the water's level at time T, given when it was let in (null = not yet) */
export function waterLevel(W, t0, T) { return !W ? -999 : t0 == null ? W.y0 : Math.min(W.y1, W.y0 + Math.max(0, T - t0 - 1.5) * W.rate); }
