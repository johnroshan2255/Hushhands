// The GRAPHICS setting (settings panel), on a phone: AUTO picks LOW there; a tap changes it; the
// picture is sharper or softer at once; at the title, going back opens the game again with the rest
// (lights, smooth edges, detail); in a journey nothing reloads.   node scripts/playtest/graphics.mjs

import { launch, page, sleep, BASE, SHOTS } from './lib.mjs';
const browser = await launch();
let failed = 0; const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${what}`); if (!ok) failed++; };
// a phone, sideways
const p = await page(browser, `${BASE}/`, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
const ready = () => p.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
const read = () => p.evaluate(() => ({ btn: document.getElementById('sGfx').textContent, sub: document.getElementById('sGfxS').textContent, stored: localStorage.getItem('tb.quality'), dpr: window.__tb.game.app.graphicsDevice.maxPixelRatio, w: document.getElementById('app').width, shown: !document.getElementById('pause').hidden, low: window.__tb.game.low, state: window.__tb.state() }));
await ready(); await sleep(1500);
await p.tap('#mSettings'); await sleep(400);
let s = await read();
check(s.shown && s.btn === 'AUTO' && /low/.test(s.sub) && s.low && s.dpr === 1.25, `a phone starts on AUTO = low (${s.btn}: "${s.sub}", pixel ratio ${s.dpr}, canvas ${s.w}px wide)`);
const fits = await p.evaluate(() => { const r = document.getElementById('sGfx').closest('.toggle').getBoundingClientRect(), pr = document.querySelector('#pause .panel').getBoundingClientRect(); return r.left >= pr.left && r.right <= pr.right + 1; });
check(fits, 'the row fits the panel');
await p.screenshot({ path: `${SHOTS}gfx-phone-settings.png` });
const w0 = s.w;
await p.tap('#sGfx'); await sleep(200); s = await read();
check(s.btn === 'LOW' && s.stored === '0', `one tap: LOW ("${s.sub}")`);
await p.tap('#sGfx'); await sleep(200); await p.tap('#sGfx'); await sleep(400); s = await read();
check(s.btn === 'HIGH' && s.stored === '2' && s.dpr === 2 && s.w > w0 && /when you go back/.test(s.sub), `two more: HIGH; the picture is sharper at once (pixel ratio ${s.dpr}, canvas ${w0} -> ${s.w}px); "${s.sub}"`);
await p.screenshot({ path: `${SHOTS}gfx-phone-high.png` });
await Promise.all([p.waitForNavigation({ timeout: 15000 }).catch(() => null), p.tap('#pResume')]);
await ready(); await sleep(1200);
await p.tap('#mSettings'); await sleep(300); s = await read();
check(s.btn === 'HIGH' && !s.low && s.dpr === 2 && !/go back|next opened/.test(s.sub), `BACK at the title opened the game again on HIGH (low=${s.low}, pixel ratio ${s.dpr}, "${s.sub}")`);
await p.tap('#pResume'); await sleep(500); s = await read();
check(!s.shown && s.state === 'menu', 'BACK again: nothing to change, no reload');
// in a journey: sharpness now, the rest later, and the journey goes on
await p.tap('#mSolo'); await p.waitForFunction(() => window.__tb.game.coldT == null, null, { timeout: 10000 });
await p.tap('#bPause'); await sleep(300); await p.tap('#sGfx'); await sleep(200); await p.tap('#sGfx'); await sleep(300); s = await read();
check(s.btn === 'LOW' && s.dpr === 1.25 && /next opened/.test(s.sub), `in a journey: LOW, sharpness at once (pixel ratio ${s.dpr}); "${s.sub}"`);
await p.tap('#pResume'); await sleep(500); s = await read();
check(s.state === 'play' && !s.shown, 'and the journey goes on (no reload in the middle of it)');
check(!p.errors.length, `no errors ${p.errors.slice(0, 3).join(' | ')}`);
await browser.close();
console.log(failed ? `FAIL: ${failed}` : 'PASS: graphics setting');
process.exit(failed ? 1 : 0);
