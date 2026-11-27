// The GRAPHICS setting (settings panel), on a phone: AUTO picks LOW there (LOWEST on the weakest); a tap changes it; the
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
check(s.btn === 'LOWEST' && s.stored === '-1' && s.dpr === 1 && s.w < w0, `one tap: LOWEST, softer at once (pixel ratio ${s.dpr}; "${s.sub}")`);
await p.tap('#sGfx'); await sleep(200); s = await read();
check(s.btn === 'LOW' && s.stored === '0', `another: LOW ("${s.sub}")`);
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
check(s.btn === 'LOWEST' && s.dpr === 1 && /next opened/.test(s.sub), `in a journey: LOWEST, sharpness at once (pixel ratio ${s.dpr}); "${s.sub}"`);
await p.tap('#pResume'); await sleep(500); s = await read();
check(s.state === 'play' && !s.shown, 'and the journey goes on (no reload in the middle of it)');
check(!p.errors.length, `no errors ${p.errors.slice(0, 3).join(' | ')}`);
await p.context().close();

// LOWEST, opened: the light picture (plain lights, nothing laid over the game), and it draws without a complaint
const lite = async (name, ctxOpts, init) => {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 }, hasTouch: true, isMobile: true, ...ctxOpts });
  await ctx.addInitScript(() => { try { localStorage.setItem('tb.story', '1'); localStorage.setItem('tb.trial', 'done'); } catch { /* */ } });
  if (init) await ctx.addInitScript(init);
  const q = await ctx.newPage(); const errs = [];
  q.on('pageerror', (e) => errs.push(e.message)); q.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await q.goto(`${BASE}/`); await q.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
  await q.tap('#mSolo'); await q.waitForFunction(() => window.__tb.game.coldT == null, null, { timeout: 12000 }); await sleep(1500);
  // (the picture is read at the end of a frame: a moment later the browser has cleared it)
  const r = await q.evaluate(() => new Promise((done) => window.__tb.game.app.once('frameend', () => { const c = document.getElementById('app'), gone = (sel) => getComputedStyle(document.querySelector(sel)).display === 'none'; const x = document.createElement('canvas'); x.width = 32; x.height = 18; const g = x.getContext('2d'); g.drawImage(c, 0, 0, 32, 18); const d = g.getImageData(0, 0, 32, 18).data; let lo = 255, hi = 0; for (let i = 0; i < d.length; i += 4) { lo = Math.min(lo, d[i + 1]); hi = Math.max(hi, d[i + 1]); } done({ lite: document.body.classList.contains('lite'), low: window.__tb.game.low, dpr: window.__tb.game.app.graphicsDevice.maxPixelRatio, grain: gone('#grain'), vig: gone('.vig'), btn: document.getElementById('sGfx').textContent, sub: document.getElementById('sGfxS').textContent, lo, hi }); })));
  await q.screenshot({ path: `${SHOTS}gfx-${name}.png` });
  await ctx.close();
  return { ...r, errs };
};
let L = await lite('lowest', {}, () => { try { localStorage.setItem('tb.quality', '-1'); } catch { /* */ } });
check(L.lite && L.low && L.dpr <= 1 && L.grain && L.vig && L.btn === 'LOWEST', `LOWEST, opened: the light picture, no grain or vignette over it (pixel ratio ${L.dpr})`);
check(L.hi - L.lo > 60 && !L.errs.length, `and it draws: dark shapes on bright fog (${L.lo}..${L.hi}), no shader complaints ${L.errs.slice(0, 2).join(' | ')}`);
// a phone with little memory: AUTO is LOWEST by itself
L = await lite('feeble', {}, () => { Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 }); Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 }); });
check(L.lite && L.btn === 'AUTO' && /lowest/.test(L.sub), `a phone with 2 GB and 4 cores: AUTO chooses LOWEST by itself ("${L.sub}")`);
// a device AUTO has seen struggle on LOW opens on LOWEST from then on
L = await lite('learned', {}, () => { try { localStorage.setItem('tb.weak', '1'); } catch { /* */ } });
check(L.lite && L.btn === 'AUTO', 'a device AUTO has seen struggle on LOW opens on LOWEST from then on');
await browser.close();
console.log(failed ? `FAIL: ${failed}` : 'PASS: graphics setting');
process.exit(failed ? 1 : 0);
