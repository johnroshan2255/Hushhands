// A whole thread of players (2, 3 or 4 browsers): make a room through the real menus, set out, and
// let the code-players take their parts of every puzzle, start to end.
//   (start the rooms first: PORT=2567 node server/index.js)      node scripts/playtest/party.mjs [players=2] [fromLantern=0]
import fs from 'fs';
import { launch, page, sleep, BASE, SHOTS } from './lib.mjs';

const N = +(process.argv[2] || 2), from = +(process.argv[3] || 0);
const SERVER = process.env.TB_SERVER || 'ws://localhost:2567';
const sv = BASE.includes(':5173') ? `server=${encodeURIComponent(SERVER)}&` : '';
const Q = process.env.Q || (N > 2 ? 0 : 2);
const browser = await launch();
const pages = [await page(browser, `${BASE}/?${sv}q=${Q}`, { viewport: { width: 1280, height: 720 } })];
const a = pages[0];
await a.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
await a.click('#mTogether');
await a.fill('#cName', 'Ada');
await a.click('#cCreate');
await a.waitForFunction(() => window.__tb.state() === 'lobby', null, { timeout: 15000 });
const code = await a.evaluate(() => window.__tb.net.code);
for (let i = 1; i < N; i++) {
  const p = await page(browser, `${BASE}/?${sv}q=${Q}&room=${code}`, { viewport: { width: 800, height: 450 } });
  await p.waitForFunction(() => window.__tb && window.__tb.ready && window.__tb.state() === 'lobby', null, { timeout: 30000 });
  pages.push(p);
}
await a.waitForFunction((n) => window.__tb.net.players.length === n, N, { timeout: 10000 });
await sleep(500);
await a.screenshot({ path: `${SHOTS}party${N}-lobby.png` });
console.log('lobby:', await a.evaluate(() => document.getElementById('lStart').textContent), '| a guest sees:', await pages[1].evaluate(() => document.getElementById('lNote').textContent));
if (process.env.CH) await a.evaluate((ci) => { const sel = document.getElementById('lFrom'); const o = document.createElement('option'); o.value = ci; o.textContent = ci; sel.appendChild(o); sel.value = ci; }, process.env.CH); // CH=chapter index to start from
await a.click('#lStart');
for (const p of pages) await p.waitForFunction((n) => window.__tb.state() === 'play' && window.__tb.game.n === n, N, { timeout: 10000 });
await sleep(1600);
const built = await a.evaluate(() => { const L = window.__tb.game.L; return `plates ${L.plates.filter((q) => q.id === 'g0').length}, levers ${L.levers.length}, rings ${L.rings.length}, chapter ${L.num} ${L.name}`; });
console.log(`the Loom for ${N}: ${built}`);
if (from) {
  await a.evaluate((cp) => { const { game } = window.__tb; for (const g of game.L.gates) if (game.L.cps[cp].x > g.x) game.W.open[g.id] = true; game.W.cp = cp; game.kill(-1, 'retry', 0, 0); }, from);
  await sleep(3500);
}
const botSrc = fs.readFileSync(new URL('./bot.js', import.meta.url), 'utf8');
for (const p of pages) await p.addScriptTag({ content: botSrc });
const seen = pages.map(() => 0);
let lastCp = -1, t0 = Date.now(), shots = 0;
const limit = +(process.env.LIMIT || 480) * 1000;
const read = (p) => p.evaluate(() => ({ log: window.__bot.log, done: window.__bot.done, failed: window.__bot.failed, cp: window.__tb.game.W.cp, deaths: window.__tb.game.W.deaths, phase: window.__tb.game.W.phase, x: window.__tb.game.me.b.x, y: window.__tb.game.me.b.y, fps: window.__tb.fps, state: window.__tb.state() }));
for (;;) {
  await sleep(500);
  const s = [];
  for (const p of pages) s.push(await read(p));
  s.forEach((q, i) => { for (; seen[i] < q.log.length; seen[i]++) console.log(`  ${'ABCD'[i]}`, q.log[seen[i]]); });
  pages.forEach((p, i) => { for (p.told = p.told || 0; p.told < p.errors.length; p.told++) console.log(`  ${'ABCD'[i]} !! ${p.errors[p.told]}`); }); // (said when it happens, so the log shows where)
  if (s[0].cp !== lastCp) { lastCp = s[0].cp; await sleep(600); await a.screenshot({ path: `${SHOTS}party${N}-cp${s[0].cp}.png` }); }
  if (process.env.EVERY && Date.now() - t0 > shots * +process.env.EVERY * 1000) await a.screenshot({ path: `${SHOTS}party${N}-t${String(shots++).padStart(3, '0')}.png` });
  const failed = s.map((q, i) => (q.failed ? `${'ABCD'[i]}: ${q.failed}` : '')).filter(Boolean).join('; ');
  if (failed || Date.now() - t0 > limit) {
    for (let i = 0; i < N; i++) await pages[i].screenshot({ path: `${SHOTS}party${N}-fail${'ABCD'[i]}.png` });
    if (process.env.PROBE) for (const p of pages) console.log(await p.evaluate(process.env.PROBE));
    console.log(`FAIL: ${failed || 'out of time'} at lantern ${s[0].cp}; ${s.map((q, i) => `${'ABCD'[i]} x=${q.x.toFixed(1)} y=${q.y.toFixed(1)}`).join(', ')}; ${s[0].deaths} deaths`, pages.flatMap((p) => p.errors).slice(0, 5));
    await browser.close(); process.exit(1);
  }
  if (s.every((q) => q.phase === 'won')) {
    await sleep(6500);
    await a.screenshot({ path: `${SHOTS}party${N}-end.png` });
    const end = await a.evaluate(() => ({ state: window.__tb.state(), title: document.getElementById('eTitle').textContent, stats: document.getElementById('eStats').textContent }));
    const errs = pages.flatMap((p) => p.errors);
    console.log(`PASS: ${N} reached the Spindle in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${s[0].deaths} deaths, fps ${s.map((q) => Math.round(q.fps)).join('/')}; end: ${end.state} "${end.title}" ${end.stats}`, errs.slice(0, 5));
    await a.click('#eAgain');
    await pages[N - 1].waitForFunction(() => window.__tb.state() === 'lobby', null, { timeout: 8000 }).then(() => console.log('PASS: everyone back at the thread (lobby)'), () => console.log('FAIL: a guest did not return to the lobby'));
    await browser.close();
    process.exit(end.state === 'end' && !errs.length ? 0 : 1);
  }
}
