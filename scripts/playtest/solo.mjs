// Play the whole journey alone, start to end, with the code-player pressing real keys.
//   node scripts/playtest/solo.mjs [fromLantern=0] [WxH]      (TB_URL to point at a built game)
import fs from 'fs';
import { launch, page, sleep, BASE, SHOTS } from './lib.mjs';

const from = +(process.argv[2] || 0);
const [w, h] = (process.argv[3] || '1280x720').split('x').map(Number);
const browser = await launch();
const p = await page(browser, `${BASE}/?q=${process.env.Q || 2}`, { viewport: { width: w, height: h } });
await p.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
await p.click('#mSolo');
await sleep(600);
if (from) await p.evaluate((cp) => { const { game } = window.__tb; for (const g of game.L.gates) if (game.L.cps[cp].x > g.x) game.W.open[g.id] = true; game.W.cp = cp; game.place(cp); }, from);
await p.addScriptTag({ content: fs.readFileSync(new URL('./bot.js', import.meta.url), 'utf8') });
let seen = 0, lastCp = -1, t0 = Date.now(), shots = 0;
const limit = +(process.env.LIMIT || 420) * 1000;
for (;;) {
  await sleep(500);
  const s = await p.evaluate(() => ({ log: window.__bot.log, done: window.__bot.done, failed: window.__bot.failed, cp: window.__tb.game.W.cp, deaths: window.__tb.game.W.deaths, phase: window.__tb.game.W.phase, x: window.__tb.game.me.b.x, y: window.__tb.game.me.b.y, fps: window.__tb.fps, state: window.__tb.state() }));
  for (; seen < s.log.length; seen++) console.log('  ', s.log[seen]);
  for (p.told = p.told || 0; p.told < p.errors.length; p.told++) console.log(`   !! ${p.errors[p.told]}`);
  if (s.cp !== lastCp) { lastCp = s.cp; await sleep(700); await p.screenshot({ path: `${SHOTS}solo-cp${s.cp}.png` }); }
  if (process.env.EVERY && Date.now() - t0 > shots * +process.env.EVERY * 1000) { await p.screenshot({ path: `${SHOTS}solo-t${String(shots++).padStart(3, '0')}.png` }); }
  if (s.failed || Date.now() - t0 > limit) { await p.screenshot({ path: `${SHOTS}solo-fail.png` }); console.log(`FAIL: ${s.failed || 'out of time'} at lantern ${s.cp} (x=${s.x.toFixed(1)}, y=${s.y.toFixed(1)}, ${s.deaths} deaths)`, p.errors.slice(0, 5)); await browser.close(); process.exit(1); }
  if (s.done || s.phase === 'won') {
    await sleep(6500);
    await p.screenshot({ path: `${SHOTS}solo-end.png` });
    const end = await p.evaluate(() => ({ state: window.__tb.state(), title: document.getElementById('eTitle').textContent, stats: document.getElementById('eStats').textContent }));
    console.log(`PASS: reached the Spindle in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${s.deaths} deaths, ${Math.round(s.fps)} fps; end screen: ${end.state} "${end.title}" ${end.stats}`, p.errors.slice(0, 5));
    await browser.close();
    process.exit(end.state === 'end' && !p.errors.length ? 0 : 1);
  }
}
