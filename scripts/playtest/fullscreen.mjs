// The FULL SCREEN setting (settings panel): a tap takes the whole screen, another gives it back; the
// choice is kept, and taken up again at the first tap after the game is opened again (a browser allows
// it no sooner); leaving with ESC is a choice too. Where a browser has no full screen for a page (an
// iPhone's), the row says how to get it.      node scripts/playtest/fullscreen.mjs
import { launch, page, sleep, BASE, SHOTS } from './lib.mjs';
const browser = await launch();
let failed = 0; const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${what}`); if (!ok) failed++; };
const ready = (p) => p.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
const read = (p) => p.evaluate(() => ({ btn: document.getElementById('sFull').textContent, sub: document.getElementById('sFullS').textContent, off: document.getElementById('sFull').disabled, fs: !!document.fullscreenElement, stored: localStorage.getItem('tb.full') || '', state: window.__tb.state(), paused: window.__tb.game.paused }));

// a phone, sideways
const p = await page(browser, `${BASE}/`, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
await ready(p); await sleep(1200);
await p.tap('#mSettings'); await sleep(300);
let s = await read(p);
check(s.btn === 'OFF' && !s.off && !s.fs, `the row is there, OFF ("${s.sub}")`);
await p.screenshot({ path: `${SHOTS}full-phone-settings.png` });
await p.tap('#sFull'); await p.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 5000 }).catch(() => {}); await sleep(200); s = await read(p);
check(s.fs && s.btn === 'ON' && s.stored === '1', 'a tap: the whole screen, ON, and the choice kept');
await p.tap('#sFull'); await p.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 }).catch(() => {}); await sleep(200); s = await read(p);
check(!s.fs && s.btn === 'OFF' && s.stored === '', 'another tap: given back, OFF');
// chosen, then the game opened again: back into it at the first tap
await p.tap('#sFull'); await p.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 5000 }).catch(() => {});
await p.reload(); await ready(p); await sleep(1200); s = await read(p);
check(!s.fs && s.stored === '1', 'opened again: not yet full screen (no tap yet), the choice still kept');
await p.tap('#mSolo'); await p.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 5000 }).catch(() => {}); s = await read(p);
check(s.fs && s.state === 'play', 'the first tap (SET OUT ALONE) takes the screen again, and sets out');
// left without the button (ESC, the back gesture): a choice too
await p.evaluate(() => document.exitFullscreen()); await p.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 }).catch(() => {}); await sleep(200); s = await read(p);
check(!s.fs && s.stored === '' && s.state === 'play', 'left by ESC: OFF from now on, and the journey goes on');
// and from the pause panel, in a journey
await p.waitForFunction(() => window.__tb.game.coldT == null, null, { timeout: 10000 });
await p.tap('#bPause'); await sleep(300); await p.tap('#sFull'); await p.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 5000 }).catch(() => {}); await sleep(200); s = await read(p);
check(s.fs && s.btn === 'ON' && s.paused, 'from the pause panel in a journey: ON, still paused');
await p.tap('#pResume'); await sleep(400); s = await read(p);
check(s.fs && s.state === 'play' && !s.paused, 'GO ON: playing, full screen');
check(!p.errors.length, `no errors ${p.errors.slice(0, 3).join(' | ')}`);
await p.context().close();

// a browser with no full screen for a page (an iPhone's Safari)
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
await ctx.addInitScript(() => { try { localStorage.setItem('tb.story', '1'); localStorage.setItem('tb.trial', 'done'); } catch { /* */ } delete Element.prototype.requestFullscreen; delete Element.prototype.webkitRequestFullscreen; Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false }); });
const i = await ctx.newPage(); i.errors = []; i.on('pageerror', (e) => i.errors.push(e.message));
await i.goto(`${BASE}/`); await ready(i); await sleep(1200);
await i.tap('#mSettings'); await sleep(300);
const t = await read(i);
check(t.off && /Home Screen/.test(t.sub), `an iPhone: the button is off, and the row says how ("${t.sub}")`);
await i.screenshot({ path: `${SHOTS}full-iphone-settings.png` });
check(!i.errors.length, `no errors there ${i.errors.slice(0, 3).join(' | ')}`);
await browser.close();
console.log(failed ? `FAIL: ${failed}` : 'PASS: full screen');
process.exit(failed ? 1 : 0);
