// Bodies and the thread. A wanderer is a small box that walks, sneaks, jumps and braces. The thread is
// a length limit between neighbours: when it runs out, both are pulled toward each other in proportion
// to how firmly each stands (braced = immovable, on the ground = heavy, in the air = light). From that
// one rule come hanging, swinging like a pendulum, being dragged off a ledge, and climbing the thread.
//
// Each browser moves only its own wanderer (and, alone, its spool) against where it believes the
// others are; the others do the same, so the pull is felt on both ends.
import { LINK, cogPad } from './level.js';

export const GRAV = 26, WALK = 3.6, SNEAK = 1.5, JUMP = 8.9;
export const HW = 0.2, HT = 1.1, HT_LOW = 0.68, WAIST = 0.5;
export const PUMP = 6.5; // how hard you can kick a swing along
export const REACH = 1.45; // how far above your feet a ledge can be and still be grabbed
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function newBody(x, y) {
  return { x, y, vx: 0, vy: 0, ground: false, facing: 1, braced: false, sneak: false, reel: 0, coyote: 0, jbuf: 0, stun: 0, dead: false, onId: null, taut: false, hang: false, noise: 0, landed: 0, caged: false, t: 0, mantle: null, climbing: 0, reelTo: null };
}

/** What is solid right now: the level's boxes (minus open gates), plus thin things you can stand on
 *  from above: glass slabs, cog pads, and a taut thread between two braced wanderers. */
export class Space {
  constructor(L) { this.L = L; this.walk = []; }
  solids() { return this.L.solids; }
  open(s) { return s.gate !== undefined && this.gateOpen[s.gate]; }
  /** refresh the stand-on-from-above pieces for this frame */
  begin(T, gateOpen, bridges) {
    const L = this.L;
    this.gateOpen = gateOpen;
    const w = this.walk;
    w.length = 0;
    for (const s of L.slabs) if (!s.broken) w.push({ id: `s${s.i}`, x0: s.x0, x1: s.x1, y0: s.y, y1: s.y, vx: 0, vy: 0 });
    L.cogs.forEach((c, ci) => { for (let k = 0; k < c.pads; k++) { const p = cogPad(c, k, T); w.push({ id: `c${ci}_${k}`, x0: p.x - 0.75, x1: p.x + 0.75, y0: p.y, y1: p.y, vx: p.vx, vy: p.vy }); } });
    for (const b of bridges) w.push(b);
  }
}

/** move a body by its velocity for dt, stopping at solids and landing on walkables */
export function moveBody(b, dt, space, hw = HW, ht = null) {
  const h = ht ?? (b.sneak ? HT_LOW : HT);
  const solids = space.solids();
  // carried by what we stand on
  let carry = null;
  if (b.onId) carry = space.walk.find((s) => s.id === b.onId) || null;
  if (carry && b.vy <= 0.01) b.x += carry.vx * dt;
  // ---- sideways
  let nx = b.x + b.vx * dt;
  for (const s of solids) {
    if (space.open(s)) continue;
    if (b.y + h <= s.y0 + 0.002 || b.y >= s.y1 - 0.002) continue;
    if (nx + hw > s.x0 && nx - hw < s.x1) {
      if (b.x <= (s.x0 + s.x1) / 2) nx = Math.min(nx, s.x0 - hw); else nx = Math.max(nx, s.x1 + hw);
      b.vx = 0;
    }
  }
  b.x = nx;
  // ---- up and down
  const py = b.y;
  let ny = b.y + b.vy * dt;
  const wasGround = b.ground, fallV = b.vy;
  b.ground = false;
  let on = null;
  for (const s of solids) {
    if (space.open(s)) continue;
    if (b.x + hw <= s.x0 + 0.002 || b.x - hw >= s.x1 - 0.002) continue;
    if (b.vy <= 0 && py >= s.y1 - 0.02 && ny <= s.y1) { ny = s.y1; b.vy = 0; b.ground = true; }
    else if (b.vy > 0 && py + h <= s.y0 + 0.02 && ny + h > s.y0) { ny = s.y0 - h; b.vy = 0; }
  }
  if (b.vy <= 0.01 || carry) {
    for (const s of space.walk) {
      if (b.x < s.x0 - hw * 0.5 || b.x > s.x1 + hw * 0.5) continue;
      const k = clamp((b.x - s.x0) / Math.max(0.01, s.x1 - s.x0), 0, 1);
      const sy = s.y0 + (s.y1 - s.y0) * k;
      const stuck = b.onId === s.id && b.vy <= 0.01;
      if (stuck || (py >= sy - 0.12 - Math.abs(s.vy) * dt * 2 && ny <= sy)) { if (!b.ground || sy > ny) { ny = sy; b.vy = Math.min(0, s.vy); b.ground = true; on = s.id; } }
    }
  }
  b.y = ny;
  b.onId = on;
  if (b.ground && !wasGround && fallV < -6) b.landed = Math.min(1, -fallV / 16);
}
/** push a body out of any solid it has been pulled into (the thread drags you; walls don't give) */
export function depen(b, space, hw = HW, ht = null) {
  const h = ht ?? (b.sneak ? HT_LOW : HT);
  for (const s of space.solids()) {
    if (space.open(s)) continue;
    if (b.x + hw <= s.x0 || b.x - hw >= s.x1 || b.y + h <= s.y0 || b.y >= s.y1) continue;
    const l = b.x + hw - s.x0, r = s.x1 - (b.x - hw), d = b.y + h - s.y0, u = s.y1 - b.y;
    const m = Math.min(l, r, d, u);
    if (m === u) { b.y = s.y1; if (b.vy < 0) b.vy = 0; b.ground = true; } else if (m === l) { b.x = s.x0 - hw; if (b.vx > 0) b.vx = 0; } else if (m === r) { b.x = s.x1 + hw; if (b.vx < 0) b.vx = 0; } else { b.y = s.y0 - h; if (b.vy > 0) b.vy = 0; }
  }
}

/** the thread left between two neighbours: what each has climbed is taken up, but only on the side they climbed toward */
export function linkLen(b, o) {
  const rb = b.reel && (b.reelTo == null || b.reelTo === o.id) ? b.reel : 0;
  const ro = o.reel && (o.reelTo == null || o.reelTo === b.id) ? o.reel : 0;
  return Math.max(1.1, LINK - rb - ro);
}
/** how firmly something stands against the thread's pull */
export const weight = (o) => (o.fixed || (o.braced && o.ground) ? Infinity : o.caged ? Infinity : o.light ? 0.15 : o.ground ? 3 : 1);

/**
 * The thread between body b and a neighbour o ({ x, y (feet), reel, braced, ground, fixed }).
 * If it is over length, b takes its share of the pull. Returns how far over it was.
 */
export function tether(b, o, wb, wo) {
  const len = linkLen(b, o);
  const ax = o.x, ay = o.y + (o.waist ?? WAIST);
  let dx = ax - b.x, dy = ay - (b.y + WAIST);
  const d = Math.hypot(dx, dy);
  if (d <= len) return 0;
  dx /= d; dy /= d;
  // (a spool that is only trailing behind weighs nothing: it comes along, or is reeled in if it sticks)
  const share = wb === Infinity || o.light ? 0 : wo === Infinity ? 1 : wo / (wb + wo);
  if (share <= 0) return 0;
  const over = (d - len) * share;
  b.x += dx * over; b.y += dy * over;
  const vn = (b.vx - (o.vx || 0)) * dx + (b.vy - (o.vy || 0)) * dy; // how fast we are parting along the thread (negative = parting)
  if (vn < 0 && share > 0) { b.vx -= dx * vn * share; b.vy -= dy * vn * share; } // you lose as much of your pace as you carry of the pull
  return d - len;
}

/** one step of the local wanderer. inp: { x, y, jump (tap), jumpHeld, brace, sneak } ; links: neighbours */
export function stepPlayer(b, inp, dt, space, links) {
  b.t += dt;
  b.noise = 0; b.landed = 0; b.jumped = false;
  if (b.dead || b.caged) { b.vx = 0; b.vy = 0; return; }
  if (b.stun > 0) { b.stun -= dt; inp = { x: 0, y: 0, jump: false, jumpHeld: false, brace: false, sneak: false }; }
  if (b.mantle) { // pulling yourself up over a ledge: up first, then over
    const m = b.mantle;
    m.t += dt / 0.36;
    const k = Math.min(1, m.t), ky = Math.min(1, k / 0.72), kx = Math.max(0, (k - 0.45) / 0.55);
    b.x = m.x0 + (m.x1 - m.x0) * kx * kx * (3 - 2 * kx); b.y = m.y0 + (m.y1 - m.y0) * ky * (2 - ky);
    b.vx = 0; b.vy = 0; b.hang = false; b.taut = false; b.braced = false; b.sneak = false; b.facing = m.dir;
    if (k >= 1) { b.mantle = null; b.ground = true; b.coyote = 0.1; }
    return;
  }
  b.braced = !!inp.brace && b.ground;
  b.sneak = !!inp.sneak && b.ground && !b.braced;
  const sp = b.braced ? 0 : b.sneak ? SNEAK : WALK;
  b.swung = b.hang ? 0.9 : Math.max(0, (b.swung || 0) - dt);
  if (b.hang) b.vx += inp.x * PUMP * dt; // pump the swing
  else if (b.ground) b.vx += clamp(inp.x * sp - b.vx, -46 * dt, 46 * dt);
  else if (!(inp.x && Math.sign(inp.x) === Math.sign(b.vx) && Math.abs(b.vx) > sp)) { // in the air: steer, but keep what a swing gave you
    const acc = b.swung > 0 && !inp.x ? 2.5 : 20;
    b.vx += clamp(inp.x * sp - b.vx, -acc * dt, acc * dt);
  }
  if (inp.x && !b.braced) b.facing = Math.sign(inp.x);
  b.coyote = b.ground ? 0.1 : b.coyote - dt;
  b.jbuf = inp.jump ? 0.13 : b.jbuf - dt;
  if (b.jbuf > 0 && b.coyote > 0 && !b.braced) { b.vy = JUMP; b.coyote = 0; b.jbuf = 0; b.ground = false; b.onId = null; b.jumped = true; b.rising = true; }
  else if (inp.jump && b.hang && b.reel > 0.3) { b.reel = 0; b.vy = Math.max(b.vy, 0) + 3.5; b.jbuf = 0; b.jumped = true; } // let go of what you climbed: a hop off the thread
  if (b.vy <= 0 || b.hang) b.rising = false;
  if (b.rising && !inp.jumpHeld && b.vy > 3.5) b.vy -= 34 * dt; // a tap is a hop
  b.vy = Math.max(-28, b.vy - GRAV * dt);
  const wasGround = b.ground;
  moveBody(b, dt, space);
  // the thread
  let taut = false;
  const wb = weight(b);
  for (let it = 0; it < 2; it++) for (const o of links) { if (tether(b, o, wb, weight(o)) > 0.001) taut = true; }
  if (taut) depen(b, space);
  b.taut = taut;
  b.hang = taut && !b.ground;
  // climb the thread while hanging; let it out again on the ground
  b.climbing = 0;
  if (b.hang) {
    if (b.reel <= 0 && inp.y > 0) { // you climb toward whoever is holding you up: the neighbour highest above
      // (the one on the side you are pushing toward, if you are pushing; else the highest)
      let top = null;
      const want = Math.sign(inp.x), hi = (o) => o.y + (o.waist ?? WAIST);
      for (const o of links) if (want && Math.sign(o.x - b.x) === want && (!top || hi(o) > hi(top))) top = o;
      if (!top) for (const o of links) if (!top || hi(o) > hi(top)) top = o;
      b.reelTo = top && top.id !== undefined ? top.id : null;
    }
    const r0 = b.reel; b.reel = clamp(b.reel + inp.y * 2.6 * dt, 0, LINK - 1.2); b.climbing = Math.sign(b.reel - r0);
  }
  else if (b.ground) b.reel = Math.max(0, b.reel - 5 * dt);
  if (b.reel <= 0) b.reelTo = null;
  // the ground feels you: walking shakes it, sneaking doesn't, landing does
  if (b.ground && Math.abs(b.vx) > SNEAK + 0.4) b.noise = 0.6;
  if (b.landed > 0) b.noise = Math.max(b.noise, inp.sneak ? (b.landed > 0.7 ? 0.3 : 0) : 0.5 + b.landed * 0.5); // creeping, you land softly
  if (!wasGround && b.ground && b.landed === 0) b.landed = 0.15;
  // grab a ledge: in the air, against a wall whose top is within reach, pushing toward it (or climbing)
  if (!b.ground && b.vy < 4) {
    let dir = Math.sign(inp.x);
    if (!dir && b.hang && inp.y > 0 && links.length) dir = Math.sign(links[0].x - b.x) || 0;
    if (dir) {
      const s = wallAt(b, space, dir);
      if (s) {
        const rise = s.y1 - b.y, tx = (dir > 0 ? s.x0 : s.x1) + dir * (HW + 0.14);
        if (rise > 0.18 && rise <= REACH && isFree(space, tx, s.y1 + 0.01, HW, HT_LOW)) b.mantle = { x0: b.x, y0: b.y, x1: tx, y1: s.y1, t: 0, dir };
      }
    }
  }
}
/** the solid we are pressed against on that side, if any */
function wallAt(b, space, dir) {
  const h = b.sneak ? HT_LOW : HT;
  let best = null;
  for (const s of space.solids()) {
    if (space.open(s)) continue;
    if (b.y + h <= s.y0 || b.y >= s.y1) continue;
    const gap = dir > 0 ? s.x0 - (b.x + HW) : b.x - HW - s.x1;
    if (gap < -0.06 || gap > 0.09) continue;
    if (!best || s.y1 > best.y1) best = s;
  }
  return best;
}
/** is there room for a body with its feet at (x, y)? */
export function isFree(space, x, y, hw = HW, h = HT) {
  for (const s of space.solids()) {
    if (space.open(s)) continue;
    if (x + hw > s.x0 && x - hw < s.x1 && y + h > s.y0 && y < s.y1) return false;
  }
  return true;
}

/** the Spool-Lantern (alone): it trails behind on the thread, or stays where you set it */
export function stepSpool(s, dt, space, player) {
  if (s.mode === 'planted' || s.mode === 'hooked') { s.vx = 0; s.vy = 0; s.ground = s.mode === 'planted'; return; }
  if (s.mode === 'return') { // reeled back in a breath, through whatever is in the way
    s.t += dt * 3.2;
    const k = Math.min(1, s.t), e = k * k * (3 - 2 * k);
    s.x = s.x0 + (player.x - player.facing * 0.6 - s.x0) * e; s.y = s.y0 + (player.y + 0.1 - s.y0) * e + Math.sin(Math.PI * k) * 0.8;
    if (k >= 1) { s.mode = 'follow'; s.vx = 0; s.vy = 0; }
    return;
  }
  s.vy = Math.max(-26, s.vy - GRAV * dt);
  if (s.ground) s.vx *= Math.max(0, 1 - 9 * dt);
  moveBody(s, dt, space, 0.2, 0.4);
  const over = tether(s, { x: player.x, y: player.y, reel: 0 }, 0.15, weight(player));
  if (over > 0) depen(s, space, 0.2, 0.4);
  // caught behind something it can't climb: you reel it in over the top
  const left = Math.hypot(player.x - s.x, player.y + WAIST - (s.y + s.waist)) - LINK;
  s.stuck = left > 0.25 ? (s.stuck || 0) + dt : 0;
  if (s.stuck > 0.12) { s.mode = 'return'; s.x0 = s.x; s.y0 = s.y; s.t = 0; s.stuck = 0; }
}
export const newSpool = (x, y) => ({ x, y, vx: 0, vy: 0, ground: false, mode: 'follow', reel: 0, onId: null, waist: 0.2, sneak: false, t: 0, landed: 0 });
