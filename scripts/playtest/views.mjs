// Every shape of screen: phones upright and sideways, a small old phone, tablets, a desktop, a square
// window. For each: the title, the first steps (with the touch controls where there is touch), the
// pause panel and the together panel must fit with nothing cut off or overlapping.
import { launch, page, sleep, BASE, SHOTS } from './lib.mjs';

const VIEWS = [
  ['phone-tall', 390, 844, true], ['phone-wide', 844, 390, true], ['phone-small-wide', 568, 320, true], ['phone-small-tall', 320, 568, true],
  ['tablet-tall', 768, 1024, true], ['tablet-wide', 1024, 768, true], ['desktop', 1920, 1080, false], ['square', 800, 800, false], ['ultrawide', 1720, 720, false],
];
const only = process.argv[2];
const browser = await launch();
let bad = 0;
for (const [name, width, height, touch] of VIEWS) {
  if (only && !name.includes(only)) continue;
  const p = await page(browser, `${BASE}/`, { viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
  await p.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
  await sleep(2600);
  await p.screenshot({ path: `${SHOTS}view-${name}-1title.png` });
  // nothing on the title may leave the screen or overlap
  const fit = async (sel) => p.evaluate(({ sel, W, H }) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null).map((e) => { const r = e.getBoundingClientRect(); return r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1 ? `${e.id || e.className} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.right)},${Math.round(r.bottom)}` : null; }).filter(Boolean), { sel, W: width, H: height });
  const out = [];
  out.push(...(await fit('#menu h1, #menu .btn, #menu .title p')));
  if (touch) await p.tap('#mTogether'); else await p.click('#mTogether');
  await sleep(700);
  await p.screenshot({ path: `${SHOTS}view-${name}-2together.png` });
  out.push(...(await fit('#together .panel')));
  if (touch) await p.tap('#cBack'); else await p.click('#cBack');
  if (touch) await p.tap('#mSolo'); else await p.click('#mSolo');
  await sleep(600);
  // walk a little so the camera settles where it plays
  await p.keyboard.down('KeyD'); await sleep(2200); await p.keyboard.up('KeyD');
  await sleep(900);
  await p.screenshot({ path: `${SHOTS}view-${name}-3play.png` });
  out.push(...(await fit('#bPause, #bInfo, #bFull, #hint, #touch .tb:not([hidden]), #stick')));
  const doll = await p.evaluate(() => { const g = window.__tb.game, a = g.project(g.me.b.x, g.me.b.y), b = g.project(g.me.b.x, g.me.b.y + 1.15); return { x: Math.round(a[0]), y: Math.round(a[1]), h: Math.round(a[1] - b[1]) }; });
  if (touch) await p.tap('#bPause'); else await p.click('#bPause');
  await sleep(500);
  await p.screenshot({ path: `${SHOTS}view-${name}-4pause.png` });
  out.push(...(await fit('#pause .panel')));
  const ok = !out.length && !p.errors.length && doll.h >= 26;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${width}x${height}: doll ${doll.h}px tall at ${doll.x},${doll.y}`, out, p.errors.slice(0, 3));
  await p.context().close();
}
await browser.close();
process.exit(bad ? 1 : 0);
