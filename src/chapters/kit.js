// The tools every chapter is built with. A chapter is one stretch of the Loom, built for n = 1..4
// wanderers, starting at x = 0 against a wall behind and ending at its exit (an arch you all walk
// through together). Coordinates: x right, y up, metres; solids are axis-aligned boxes.
//
// Everything that needs "all of you" (plates, levers, rings, the line that trips the Collector, the
// Cistern's valves) is made n wide; alone, the Spool-Lantern you drag behind you is your second body.
export const LINK = 7; // metres of thread between two neighbours

/** a small seeded random, so that every browser builds the same variations */
export const seeded = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export function kit(n, meta = {}) {
  const nb = Math.max(2, n); // bodies that can weigh a plate down: the players, or you and your spool
  const L = {
    n, nb, ...meta,
    solids: [], plates: [], gates: [], levers: [], traps: [], worms: [], hooks: [], cps: [], bells: [], slabs: [], cogs: [], rings: [], kill: [], shears: [], monsters: [], deco: [], hints: [], zones: [],
    waters: [], crates: [], valves: [], rooms: [], lamps: [], mud: [], blooms: [], fumes: [], sacks: [], meat: [], boards: [], candles: [], dust: [], buttons: [], others: [], tally: [], drawings: [], bodiesOf: [], presses: [], swarms: [], eels: [], creaky: [], ends: [], exit: null,
  };
  const solid = (x0, y0, x1, y1, o = {}) => { const s = { x0, y0, x1, y1, ...o }; L.solids.push(s); return s; };
  const ground = (x0, x1, top, o = {}) => solid(x0, top - 30, x1, top, { ground: true, ...o });
  const cp = (x, y, name) => { L.cps.push({ i: L.cps.length, x, y, name }); L.tally.push({ x: x - 1.6, y, n: 0 }); };
  const gate = (x, y, id, h = 5, o = {}) => { const g = solid(x, y, x + 0.7, y + h, { gate: id }); L.gates.push({ id, x, y, h, ...o }); return g; };
  const platesAt = (x, y, id, count = nb, gap = 2.8) => { for (let i = 0; i < count; i++) L.plates.push({ id, x: x + i * gap, y, w: 1.5 }); return x + (count - 1) * gap; };
  const deco = (kind, x, y, o = {}) => L.deco.push({ kind, x, y, ...o });
  const hint = (x0, x1, text) => L.hints.push({ x0, x1, text });
  const zone = (name, x0, x1, o = {}) => L.zones.push({ name, x0, x1, ...o });
  /** the wall at your back and the first lantern of the chapter */
  const begin = (name, y = 0, wall = 16) => { solid(-14, y - 30, 0, y + wall); cp(3, y, name); };
  /** the arch at the end: everyone through it, and the chapter is done */
  const exit = (x, y, o = {}) => { L.exit = { x, y, ...o }; deco('exitarch', x, y); solid(x + 4, y - 30, x + 18, y + 30); L.x1 = x + 18; };
  /** one of the twelve lost buttons, off the main path */
  const button = (k, x, y) => L.buttons.push({ k, x, y });
  /** the Other Doll: a run of places it is seen at, ahead of you ({ x, y, t: how long it lingers }) */
  const other = (pts, o = {}) => L.others.push({ pts, ...o });
  /** a body left by an earlier doll, its thread still faintly lit */
  const deadDoll = (x, y, o = {}) => L.bodiesOf.push({ x, y, ...o });
  /** a room with its own frame: build its walls with r.solid (frame coordinates = world ones when upright) */
  const room = (o) => {
    const r = { solids: [], kill: [], rot0: 0, ...o, cx: (o.x0 + o.x1) / 2, cy: (o.y0 + o.y1) / 2 };
    L.rooms.push(r);
    return { r, solid: (x0, y0, x1, y1, q = {}) => { r.solids.push({ x0, y0, x1, y1, ...q }); }, kill: (x0, y0, x1, y1, why = 'fell') => r.kill.push({ x0, y0, x1, y1, why }) };
  };
  const solo = n === 1;
  // the director: this journey's own small differences (which traps are sunk, which worms are silent)
  const rng = seeded((meta.seed || 1) * 7919 + (meta.ci || 0) * 104729);
  return { L, n, nb, solo, rng, room, solid, ground, cp, gate, platesAt, deco, hint, zone, begin, exit, button, other, deadDoll };
}

/** after building: the level's left and right ends, and the scene's drawing range */
export function finish(L) {
  if (L.x0 == null) L.x0 = -14;
  if (L.x1 == null) { let m = 0; for (const s of L.solids) if (s.x1 < 1e4) m = Math.max(m, s.x1); L.x1 = m; }
  L.waters.forEach((w, i) => { w.i = i; if (w.id == null) w.id = `w${i}`; });
  L.crates.forEach((c, i) => { c.i = i; c.x0 = c.x; c.y0 = c.y; c.vx = c.vx || 0; c.vy = 0; });
  return L;
}
