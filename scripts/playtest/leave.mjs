// Someone lets go mid-journey. A guest leaving: those who remain are retied from the last lantern
// (alone, with a spool) and go on to the end. The host leaving: the room closes and everyone is
// sent back to the menu with a word of why.
//   (start the rooms first: PORT=2567 node server/index.js)
//   node scripts/playtest/leave.mjs [players=3] [atLantern=2] [who=guest|host]
import fs from 'fs';
import { launch, page, sleep, BASE, SHOTS } from './lib.mjs';

const N = +(process.argv[2] || 3), AT = +(process.argv[3] || 2), WHO = process.argv[4] || 'guest';
const SERVER = process.env.TB_SERVER || 'ws://localhost:2567';
const sv = BASE.includes(':5173') ? `server=${encodeURIComponent(SERVER)}&` : '';
const Q = process.env.Q || 0;
const tag = `leave${N}-${WHO}`;
const browser = await launch();
const fail = async (why, pages) => {
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${SHOTS}${tag}-fail${'ABCD'[i]}.png` }).catch(() => {});
  console.log(`FAIL: ${why}`, pages.flatMap((p) => p.errors).slice(0, 5));
  await browser.close(); process.exit(1);
};

// a room, through the real menus
const a = await page(browser, `${BASE}/?${sv}q=${Q}`);
await a.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
await a.click('#mTogether');
await a.fill('#cName', 'Ada');
await a.click('#cCreate');
await a.waitForFunction(() => window.__tb.state() === 'lobby', null, { timeout: 15000 });
const code = await a.evaluate(() => window.__tb.net.code);
let pages = [a];
for (let i = 1; i < N; i++) {
  const p = await page(browser, `${BASE}/?${sv}q=${Q}&room=${code}`, { viewport: { width: 800, height: 450 } });
  await p.waitForFunction(() => window.__tb && window.__tb.ready && window.__tb.state() === 'lobby', null, { timeout: 30000 });
  pages.push(p);
}
await a.waitForFunction((n) => window.__tb.net.players.length === n, N, { timeout: 10000 });
await a.click('#lStart');
for (const p of pages) await p.waitForFunction((n) => window.__tb.state() === 'play' && window.__tb.game.n === n, N, { timeout: 10000 });
await sleep(1600);

const botSrc = fs.readFileSync(new URL('./bot.js', import.meta.url), 'utf8');
const read = (p) => p.evaluate(() => ({ log: window.__bot.log, done: window.__bot.done, failed: window.__bot.failed, cp: window.__tb.game.W.cp, deaths: window.__tb.game.W.deaths, phase: window.__tb.game.W.phase, n: window.__tb.game.n, state: window.__tb.state() }));
let seen = pages.map(() => 0);
/** run the code-players until fn(states) is true */
async function play(until, limitS, what) {
  const t0 = Date.now();
  for (;;) {
    await sleep(500);
    const s = [];
    for (const p of pages) s.push(await read(p));
    s.forEach((q, i) => { for (; seen[i] < q.log.length; seen[i]++) console.log(`  ${'ABCD'[i]}`, q.log[seen[i]]); });
    const failed = s.map((q, i) => (q.failed ? `${'ABCD'[i]}: ${q.failed}` : '')).filter(Boolean).join('; ');
    if (failed) await fail(failed, pages);
    if (until(s)) return s;
    if (Date.now() - t0 > limitS * 1000) await fail(`out of time ${what} (lantern ${s[0].cp})`, pages);
  }
}
const stopBots = (p) => p.evaluate(() => { window.__bot.done = true; for (const c of ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'ShiftLeft', 'KeyE']) window.dispatchEvent(new KeyboardEvent('keyup', { code: c, key: c, bubbles: true })); });

for (const p of pages) await p.addScriptTag({ content: botSrc });
await play((s) => s[0].cp >= AT, 300, `reaching lantern ${AT}`);
await sleep(1500); // somewhere in the middle of it
for (const p of pages) await stopBots(p);

if (WHO === 'host') {
  const name = await a.evaluate(() => window.__tb.net.players.find((p) => p.id === window.__tb.net.hostId)?.name);
  console.log(`the host (${name}) lets go at lantern ${AT}`);
  await a.close();
  pages = pages.slice(1);
  for (const p of pages) {
    const ok = await p.waitForFunction(() => window.__tb.state() === 'menu', null, { timeout: 8000 }).then(() => true, () => false);
    if (!ok) await fail(`a guest was left in "${await p.evaluate(() => window.__tb.state())}" after the host left`, pages);
  }
  const toast = await pages[0].evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : ''; });
  await pages[0].screenshot({ path: `${SHOTS}${tag}-menu.png` });
  const errs = pages.flatMap((p) => p.errors);
  console.log(`PASS: ${pages.length} guest${pages.length > 1 ? 's' : ''} back at the menu; toast: "${toast}"`, errs.slice(0, 5));
  await browser.close();
  process.exit(errs.length || !toast ? 1 : 0);
}

// the last guest lets go
const gone = pages[N - 1];
const goneName = await gone.evaluate(() => window.__tb.game.players[window.__tb.game.meIdx].name);
console.log(`${goneName} lets go at lantern ${AT}`);
await gone.close();
pages = pages.slice(0, N - 1);
seen = seen.slice(0, N - 1);
for (const p of pages) {
  const ok = await p.waitForFunction((n) => window.__tb.state() === 'play' && window.__tb.game.n === n && window.__tb.game.W.phase === 'play', N - 1, { timeout: 10000 }).then(() => true, () => false);
  if (!ok) await fail(`not retied for ${N - 1}: ${JSON.stringify(await read(p))}`, pages);
}
await sleep(1200);
const after = await a.evaluate(() => { const g = window.__tb.game, L = g.L, t = document.getElementById('toast'); return { cp: g.W.cp, spool: !!g.spool, plates: L.plates.filter((q) => q.id === 'g0').length, levers: L.levers.length, rings: L.rings.length, toast: t && !t.hidden ? t.textContent : '' }; });
console.log(`retied for ${N - 1} at lantern ${after.cp}: plates ${after.plates}, levers ${after.levers}, rings ${after.rings}${after.spool ? ', with a spool' : ''}; toast: "${after.toast}"`);
await a.screenshot({ path: `${SHOTS}${tag}-retied.png` });
if (N - 1 === 1 && !after.spool) await fail('alone without a spool', pages);

seen = pages.map(() => 0);
for (const p of pages) await p.addScriptTag({ content: botSrc });
const t0 = Date.now();
const s = await play((q) => q.every((x) => x.phase === 'won'), +(process.env.LIMIT || 480), 'going on to the end');
await sleep(6500);
await a.screenshot({ path: `${SHOTS}${tag}-end.png` });
const end = await a.evaluate(() => ({ state: window.__tb.state(), title: document.getElementById('eTitle').textContent, stats: document.getElementById('eStats').textContent }));
const errs = pages.flatMap((p) => p.errors);
console.log(`PASS: ${N - 1} went on and reached the Spindle in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${s[0].deaths} deaths; end: ${end.state} "${end.title}" ${end.stats}`, errs.slice(0, 5));
await browser.close();
process.exit(end.state === 'end' && !errs.length ? 0 : 1);
