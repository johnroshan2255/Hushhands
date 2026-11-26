// A dry run of the chasm with no browser: two bodies, one braces at the jetty's tip, the other
// drops, climbs the thread, swings and grabs the far ledge; then the first follows. (node only)
import { buildLevel } from '../../src/level.js';
import { Space, newBody, stepPlayer, stepSpool, newSpool } from '../../src/phys.js';

const DT = 1 / 60;
const none = { x: 0, y: 0, jump: false, jumpHeld: false, brace: false, sneak: false };
function run(n) {
  const L = buildLevel(n);
  const space = new Space(L);
  const tipSolid = L.solids.find((s) => s.thin && s.y1 === 0);
  const tip = tipSolid.x1, far = L.solids.find((s) => s.ground && Math.abs(s.x0 - (tip + 4.2)) < 0.01);
  const log = (...a) => console.log(`[n=${n}]`, ...a);
  let T = 0;
  const A = newBody(tip - 0.35, 0), B = newBody(tip - 1.2, 0);
  A.ground = B.ground = true;
  const spool = newSpool(tip - 0.3, 2.3);
  const hook = L.hooks[0];
  if (n === 1) { spool.mode = 'hooked'; spool.x = hook.x; spool.y = hook.y; spool.waist = 0; spool.fixed = true; }
  const step = (ia, ib) => {
    space.begin(T, {}, []);
    if (n === 1) { stepPlayer(B, ib, DT, space, [spool]); stepSpool(spool, DT, space, B); } else { stepPlayer(A, ia, DT, space, [B]); stepPlayer(B, ib, DT, space, [A]); }
    T += DT;
  };
  // B walks off the tip while A braces
  let phase = 'walk', t0 = 0, ok = false, pump = 1, maxX = -1e9;
  for (let i = 0; i < 60 * 40 && !ok; i++) {
    const ia = { ...none, brace: true };
    let ib = { ...none };
    if (phase === 'walk') { ib.x = 1; if (B.hang) { phase = 'climb'; log('hanging at', B.x.toFixed(2), B.y.toFixed(2), 't', T.toFixed(1)); } }
    else if (phase === 'climb') { ib.y = 1; if (B.reel >= 2.0) { phase = 'swing'; log('climbed, reel', B.reel.toFixed(2), 'y', B.y.toFixed(2)); } }
    else if (phase === 'swing') { if (Math.abs(B.vx) > 0.3) pump = Math.sign(B.vx); else if (Math.sign(B.vx) !== pump && Math.abs(B.vx) > 0.02) pump = Math.sign(B.vx); ib.x = pump; if (B.x > far.x0 - 0.15 && B.y > far.y1 + 0.05 && B.hang) { ib.jump = true; ib.x = 1; } maxX = Math.max(maxX, B.x); if (i % 30 === 0 && process.env.V) log(T.toFixed(1), 'x', B.x.toFixed(2), 'y', B.y.toFixed(2), 'vx', B.vx.toFixed(2), 'hang', B.hang, 'pump', pump); if (B.mantle) { phase = 'mantle'; log('grabbed the ledge at t', T.toFixed(1), 'y', B.y.toFixed(2)); } if (B.x > far.x0 + 0.2 && B.ground) phase = 'mantle'; }
    else if (phase === 'mantle') { ib.x = 1; if (B.ground && B.x > far.x0) { ok = true; log('B is across at', B.x.toFixed(2), B.y.toFixed(2), 't', T.toFixed(1)); } }
    step(ia, ib);
    if (B.y < -12) { log('B fell', B.x.toFixed(2)); return false; }
    if (A.y < -0.5 && n > 1) { log('A was dragged off', A.x.toFixed(2), A.y.toFixed(2)); return false; }
  }
  if (!ok) { log('B never made it; maxX', maxX.toFixed(2), 'far wall', far.x0.toFixed(2), 'phase', phase, B.x.toFixed(2), B.y.toFixed(2), 'reel', B.reel.toFixed(2)); return false; }
  if (n === 1) return true;
  // now A: B braces a little way in from the edge, A jumps, climbs the thread and grabs the ledge
  for (let i = 0; i < 60; i++) step({ ...none }, { ...none, x: B.x < far.x0 + 0.9 ? 1 : 0 });
  phase = 'jump'; ok = false; t0 = T;
  for (let i = 0; i < 60 * 30 && !ok; i++) {
    const ib = { ...none, brace: true };
    let ia = { ...none };
    if (phase === 'jump') { ia.x = 1; ia.jump = A.ground && A.x > tip - 0.3; ia.jumpHeld = true; if (A.hang) { phase = 'climb'; log('A hangs at', A.x.toFixed(2), A.y.toFixed(2)); } }
    else if (phase === 'climb') { ia.y = 1; ia.x = 1; if (A.ground && A.x > far.x0) { ok = true; log('A is across at', A.x.toFixed(2), A.y.toFixed(2), 'in', (T - t0).toFixed(1), 's'); } }
    step(ia, ib);
    if (A.y < -12) { log('A fell'); return false; }
  }
  if (!ok) log('A never made it; phase', phase, A.x.toFixed(2), A.y.toFixed(2), 'reel', A.reel.toFixed(2), 'B', B.x.toFixed(2), B.y.toFixed(2));
  return ok;
}
let all = true;
for (const n of [1, 2]) all = run(n) && all;
console.log(all ? 'PASS' : 'FAIL');
process.exit(all ? 0 : 1);
