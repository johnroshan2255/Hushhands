// Frames per second on a slow machine: the CPU slowed 4x (Chrome's throttling), the lowest quality, a
// small phone screen; each chapter's busiest stretch, the bot playing it.
//   node scripts/playtest/perf.mjs [rate=4] [quality=0]
import fs from 'fs';
import { launch, page, sleep, BASE } from './lib.mjs';

const rate = +(process.argv[2] || 4), q = +(process.argv[3] ?? 0);
// [chapter index, lantern, what is busy there]
const SPOTS = [[0, 0, 'the scrap pit'], [6, 0, 'the fen (drinkers)'], [7, 0, 'the granary (rats)'], [8, 1, 'the dye-works (rot)'], [9, 1, 'the larder'], [11, 2, 'the turning gallery'], [14, 1, 'the moth tower'], [13, 0, 'the collector']];
const browser = await launch();
const out = [];
for (const [ci, cp, what] of SPOTS) {
  const p = await page(browser, `${BASE}/?q=${q}`, { viewport: { width: 800, height: 400 } });
  const cdp = await p.context().newCDPSession(p);
  await p.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 60000 });
  await p.click('#mSolo'); await sleep(500);
  await p.evaluate(([ci, cp]) => { const { game } = window.__tb; game.skipCold = true; game.start({ order: [{ id: 'me', name: 'Me', slot: 0 }], meId: 'me', chapter: ci, cp, runT0: 0 }); for (const g of game.L.gates) if (game.L.cps[cp].x > g.x) game.W.open[g.id] = true; }, [ci, cp]);
  await p.addScriptTag({ content: fs.readFileSync(new URL('./bot.js', import.meta.url), 'utf8') });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await sleep(4000);
  const fps = [];
  for (let i = 0; i < 4; i++) { await sleep(2100); fps.push(await p.evaluate(() => window.__tb.fps)); }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const avg = fps.reduce((a, v) => a + v, 0) / fps.length, min = Math.min(...fps);
  const line = `${what.padEnd(26)} avg ${avg.toFixed(0)} fps, min ${min.toFixed(0)}`;
  console.log(line, p.errors.slice(0, 2));
  out.push({ what, avg, min });
  await p.context().close();
}
await browser.close();
const worst = Math.min(...out.map((o) => o.min));
console.log(`worst ${worst.toFixed(0)} fps at ${rate}x slower, quality ${q}`);
process.exit(0);
