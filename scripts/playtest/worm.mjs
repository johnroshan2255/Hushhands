// The worm in the head, every way it can go, through real key presses where a player would press:
//   alone: hammer jump and tear it out; or don't, and it takes you
//   two: the ridden one is walked at the other and kills them; or the other rips it out with USE
// and the meadow's hidden traps: sunk out of sight, up when you come close.
//   (start the rooms first)  node scripts/playtest/worm.mjs
import { launch, page, sleep, BASE } from './lib.mjs';

const SERVER = process.env.TB_SERVER || 'ws://localhost:2567';
const sv = BASE.includes(':5173') ? `server=${encodeURIComponent(SERVER)}&` : '';
const browser = await launch();
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${what}`); if (!ok) failed++; };
const at = (p, cp) => p.evaluate((cp) => { const { game } = window.__tb; for (const g of game.L.gates) if (game.L.cps[cp].x > g.x) game.W.open[g.id] = true; game.W.cp = cp; game.place(cp); }, cp);
const st = (p) => p.evaluate(() => { const g = window.__tb.game; return { wormT: g.wormT, wormed: g.players.map((q) => q.wormed), phase: g.W.phase, deaths: g.W.deaths, hint: document.getElementById('hint').textContent, dread: +document.getElementById('dread').style.getPropertyValue('--rd') }; });

// ---- alone
{
  const p = await page(browser, `${BASE}/?q=2`);
  await p.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
  await p.click('#mSolo'); await sleep(800);
  // in the Meadow of Pins (chapter 2: no cold open to wait out, and its sunk traps are checked below)
  await p.evaluate(() => { const { game } = window.__tb; game.skipCold = true; game.start({ order: [{ id: 'me', name: 'Me', slot: 0 }], meId: 'me', chapter: 1, cp: 0, runT0: 0 }); });
  await sleep(1200);
  await p.evaluate(() => window.__tb.game.possessMe()); await sleep(300);
  let s = await st(p);
  check(s.wormT > 0 && s.wormed[0] && /IN YOUR HEAD/.test(s.hint), `alone: a worm gets in (hint "${s.hint.slice(0, 40)}…", red ${s.dread})`);
  for (let i = 0; i < 14; i++) { await p.keyboard.press('Space'); await sleep(90); }
  await sleep(300); s = await st(p);
  check(s.wormT === 0 && !s.wormed[0] && s.phase === 'play', 'alone: hammering jump tears it out');
  await sleep(2000);
  await p.evaluate(() => window.__tb.game.possessMe()); await sleep(6500); s = await st(p);
  check(s.deaths === 1, `alone: left in, it takes you after ~5.5 s (deaths ${s.deaths}, phase ${s.phase})`);
  // the hidden traps of the meadow
  await sleep(3000);
  await at(p, 0); await sleep(800);
  const trap = await p.evaluate(() => { const g = window.__tb.game, i = g.L.traps.findIndex((t) => t.hidden), t = g.L.traps[i], o = g.scene.traps[i]; return { i, x: t.x, far: o.e.getLocalPosition().y - t.y }; });
  await p.evaluate((x) => { const b = window.__tb.game.me.b; b.x = x - 1.0; }, trap.x); await sleep(500);
  const near = await p.evaluate((i) => { const g = window.__tb.game; return g.scene.traps[i].e.getLocalPosition().y - g.L.traps[i].y; }, trap.i);
  check(trap.far < -0.3 && near > -0.05, `a hidden trap lies sunk (${trap.far.toFixed(2)}) and rises when you are near (${near.toFixed(2)})`);
  if (p.errors.length) check(false, `alone: page errors ${p.errors.slice(0, 3)}`);
  await p.context().close();
}

// ---- two
async function pair() {
  const a = await page(browser, `${BASE}/?${sv}q=0`);
  await a.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
  await a.click('#mTogether'); await a.fill('#cName', 'Ada'); await a.click('#cCreate');
  await a.waitForFunction(() => window.__tb.state() === 'lobby', null, { timeout: 15000 });
  const code = await a.evaluate(() => window.__tb.net.code);
  const b = await page(browser, `${BASE}/?${sv}q=0&room=${code}`, { viewport: { width: 800, height: 450 } });
  await b.waitForFunction(() => window.__tb && window.__tb.ready && window.__tb.state() === 'lobby', null, { timeout: 30000 });
  await b.evaluate(() => 0);
  await a.waitForFunction(() => window.__tb.net.players.length === 2, null, { timeout: 10000 });
  await a.click('#lStart');
  for (const p of [a, b]) await p.waitForFunction(() => window.__tb.state() === 'play' && window.__tb.game.n === 2, null, { timeout: 10000 });
  for (const p of [a, b]) await p.waitForFunction(() => window.__tb.game.coldT == null && window.__tb.game.T() > 0, null, { timeout: 15000 }); // (the cold open: nothing can happen to anyone yet)
  await sleep(500);
  return [a, b];
}
{
  const [a, b] = await pair();
  await b.evaluate(() => window.__tb.game.possessMe()); await sleep(600);
  const sa = await st(a);
  check(sa.wormed[1] && /A worm has/.test(sa.hint), `two: the other sees the worm in B ("${sa.hint.slice(0, 34)}…")`);
  // A stands still; the worm walks B into A and strikes
  // (struck, A is down first: six seconds in which a friend could stitch them back; nobody does)
  await a.waitForFunction(() => window.__tb.game.W.down != null || window.__tb.game.W.phase === 'dead', null, { timeout: 9000 }).catch(() => {});
  const down = await a.evaluate(() => document.getElementById('toast').textContent);
  check(/six seconds/.test(down), `two: B's worm walks B over and strikes A down ("${down}")`);
  await a.waitForFunction(() => window.__tb.game.W.phase === 'dead', null, { timeout: 12000 }).catch(() => {});
  const s = await st(a);
  check(s.phase === 'dead' && s.deaths === 1, `two: nobody stitches A back: the thread goes cold, and it is one death, not two (deaths ${s.deaths}, phase ${s.phase})`);
  await sleep(3500);
  // again, and this time A rips it out
  await b.evaluate(() => window.__tb.game.possessMe());
  await a.waitForFunction(() => { const g = window.__tb.game; return Math.abs(g.players[1].b.x - g.me.b.x) < 1.2; }, null, { timeout: 8000 }).catch(() => {});
  await a.keyboard.press('KeyE'); await sleep(700);
  const s2 = await st(b), t2 = await a.evaluate(() => document.getElementById('toast').textContent);
  check(s2.wormT === 0 && !s2.wormed[1] && s2.phase === 'play', `two: A gets close and presses USE: the worm is torn out of B ("${t2}")`);
  const errs = [...a.errors, ...b.errors];
  if (errs.length) check(false, `two: page errors ${errs.slice(0, 3)}`);
}
await browser.close();
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
