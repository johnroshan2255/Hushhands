// Look at the game: boot it, take pictures of the title and of chosen places along the Loom.
//   node scripts/playtest/look.mjs [n=1] [cp,cp,...] [WxH]
import { launch, page, sleep, BASE, SHOTS } from './lib.mjs';

const n = +(process.argv[2] || 1);
const cps = (process.argv[3] || '0').split(',').map(Number);
const [w, h] = (process.argv[4] || '1280x720').split('x').map(Number);
const browser = await launch();
const p = await page(browser, `${BASE}/?q=${process.env.Q || 2}`, { viewport: { width: w, height: h } });
await p.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
await sleep(2500);
await p.screenshot({ path: `${SHOTS}title-${w}.png` });
console.log('title', p.errors.slice(0, 6));
await p.evaluate((n) => {
  const { game } = window.__tb;
  const order = Array.from({ length: n }, (_, i) => ({ id: i ? `bot${i}` : 'me', name: i ? `Bot ${i}` : 'Me', slot: i }));
  game.start({ order, meId: 'me', runT0: 0 });
  document.getElementById('menu').hidden = true; document.getElementById('hud').hidden = false;
}, n);
for (const cp of cps) {
  await p.evaluate((cp) => { const { game } = window.__tb; game.W.cp = cp; game.place(cp); const c = game.L.cps[cp]; game.cam.x = c.x + (window.__dx || 0); game.cam.y = c.y + 2.7; }, cp);
  await sleep(1800);
  await p.screenshot({ path: `${SHOTS}n${n}-cp${cp}-${w}.png` });
  if (process.env.ZOOM) { const s = await p.evaluate(() => window.__tb.game.project(window.__tb.game.me.b.x, window.__tb.game.me.b.y + 0.6)); await p.screenshot({ path: `${SHOTS}n${n}-cp${cp}-zoom.png`, clip: { x: Math.max(0, s[0] - 220), y: Math.max(0, s[1] - 150), width: 440, height: 300 } }); }
}
const info = await p.evaluate(() => ({ fps: window.__tb.fps, T: window.__tb.game.T(), me: [window.__tb.game.me.b.x, window.__tb.game.me.b.y] }));
console.log(JSON.stringify(info), p.errors.slice(0, 8));
await browser.close();
