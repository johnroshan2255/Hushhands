// The full-screen button: in the top right corner, on the title and in play alike (pause and i move
// one place in, and nothing overlaps). A tap takes the whole screen, another gives it back; the choice
// is kept, and taken up again at the first tap after the game is opened again (a browser allows it no
// sooner); leaving with ESC is a choice too. Where a browser has no full screen for a page (an
// iPhone's), the button says how to get it.      (start the rooms first)  node scripts/playtest/fullscreen.mjs
import { launch, page, sleep, BASE, SHOTS } from './lib.mjs';

const SERVER = process.env.TB_SERVER || 'ws://localhost:2567';
const sv = BASE.includes(':5173') ? `server=${encodeURIComponent(SERVER)}&` : '';
const browser = await launch();
let failed = 0; const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${what}`); if (!ok) failed++; };
const ready = (p) => p.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
const read = (p) => p.evaluate(() => {
  const box = (id) => { const e = document.getElementById(id); if (!e || e.hidden || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  const b = document.getElementById('bFull');
  return { shown: !b.hidden, on: b.classList.contains('on'), fs: !!document.fullscreenElement, stored: localStorage.getItem('tb.full') || '', state: window.__tb.state(), paused: window.__tb.game.paused, W: innerWidth, full: box('bFull'), pause: box('bPause'), info: box('bInfo'), chip: box('roomChip'), note: document.getElementById('fullNote').hidden ? '' : document.getElementById('fullNote').textContent, inSettings: !!document.querySelector('#pause #sFull, #pause #bFull') };
});
const corner = (s) => s.full && s.W - s.full.r < 24 && s.full.t < 24 && s.full.r <= s.W;
const apart = (a, b) => !a || !b || a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t;
const fsIs = (p, on) => p.waitForFunction((on) => !!document.fullscreenElement === on, on, { timeout: 5000 }).catch(() => {});

// ---- a phone, sideways
const p = await page(browser, `${BASE}/`, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
await ready(p); await sleep(1200);
let s = await read(p);
check(s.shown && corner(s) && !s.on && !s.inSettings, `on the title: the button is in the top right corner (${s.full ? `${Math.round(s.W - s.full.r)}px from the right, ${Math.round(s.full.t)}px from the top` : 'not there'}), and not in the settings`);
await p.screenshot({ path: `${SHOTS}full-phone-title.png` });
await p.tap('#bFull'); await fsIs(p, true); await sleep(200); s = await read(p);
check(s.fs && s.on && s.stored === '1', 'a tap: the whole screen, and the choice kept');
await p.tap('#bFull'); await fsIs(p, false); await sleep(200); s = await read(p);
check(!s.fs && !s.on && s.stored === '', 'another tap: given back');
// chosen, then the game opened again: back into it at the first tap
await p.tap('#bFull'); await fsIs(p, true);
await p.reload(); await ready(p); await sleep(1200); s = await read(p);
check(!s.fs && s.stored === '1', 'opened again: not yet full screen (no tap yet), the choice still kept');
await p.tap('#mSolo'); await fsIs(p, true); s = await read(p);
check(s.fs && s.state === 'play', 'the first tap (SET OUT ALONE) takes the screen again, and sets out');
// left without the button (ESC, the back gesture): a choice too
await p.evaluate(() => document.exitFullscreen()); await fsIs(p, false); await sleep(200); s = await read(p);
check(!s.fs && !s.on && s.stored === '' && s.state === 'play', 'left by ESC: off from now on, and the journey goes on');
// in play: the same corner; pause and i beside it, none over another
await p.waitForFunction(() => window.__tb.game.coldT == null, null, { timeout: 10000 }); s = await read(p);
check(corner(s) && s.pause && s.info && apart(s.full, s.pause) && apart(s.pause, s.info) && apart(s.full, s.info) && s.info.r <= s.pause.l && s.pause.r <= s.full.l, 'in play: the same corner; i, pause, full screen side by side, none over another');
await p.screenshot({ path: `${SHOTS}full-phone-play.png` });
await p.tap('#bFull'); await fsIs(p, true); await sleep(200); s = await read(p);
check(s.fs && s.state === 'play' && !s.paused, 'a tap in play: full screen, and the journey goes on');
await p.tap('#bPause'); await sleep(300); s = await read(p);
check(s.paused && s.fs, 'pause still pauses');
check(!p.errors.length, `no errors ${p.errors.slice(0, 3).join(' | ')}`);
await p.context().close();

// ---- a small upright phone, together: the room's code clear of all three buttons
const a = await page(browser, `${BASE}/?${sv}q=0`, { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
await ready(a);
await a.tap('#mTogether'); await a.fill('#cName', 'Ada'); await a.tap('#cCreate');
await a.waitForFunction(() => window.__tb.state() === 'lobby', null, { timeout: 15000 });
const code = await a.evaluate(() => window.__tb.net.code);
const g = await page(browser, `${BASE}/?${sv}q=0&room=${code}`, { viewport: { width: 800, height: 450 } });
await g.waitForFunction(() => window.__tb && window.__tb.ready && window.__tb.state() === 'lobby', null, { timeout: 30000 });
await a.waitForFunction(() => window.__tb.net.players.length === 2, null, { timeout: 10000 });
await a.tap('#lStart');
await a.waitForFunction(() => window.__tb.state() === 'play' && window.__tb.game.n === 2, null, { timeout: 10000 });
await sleep(800); s = await read(a);
check(s.chip && s.chip.l >= 0 && apart(s.chip, s.info) && apart(s.chip, s.pause) && apart(s.chip, s.full), `together, 360 px wide: the room's code is clear of the buttons and on the screen (${s.chip ? `${Math.round(s.chip.l)}..${Math.round(s.chip.r)} px` : 'no chip'})`);
await a.screenshot({ path: `${SHOTS}full-phone-room.png` });
check(!a.errors.length && !g.errors.length, `no errors together ${[...a.errors, ...g.errors].slice(0, 3).join(' | ')}`);
await a.context().close(); await g.context().close();

// ---- a browser with no full screen for a page (an iPhone's Safari)
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
await ctx.addInitScript(() => { try { localStorage.setItem('tb.story', '1'); localStorage.setItem('tb.trial', 'done'); } catch { /* */ } delete Element.prototype.requestFullscreen; delete Element.prototype.webkitRequestFullscreen; Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false }); });
const i = await ctx.newPage(); i.errors = []; i.on('pageerror', (e) => i.errors.push(e.message));
await i.goto(`${BASE}/`); await ready(i); await sleep(1200);
let t = await read(i);
check(t.shown && corner(t) && !t.note, 'an iPhone: the button is in the corner all the same');
await i.tap('#bFull'); await sleep(300); t = await read(i);
check(/Home Screen/.test(t.note) && !t.fs, `tapped, it says how ("${t.note}")`);
await i.screenshot({ path: `${SHOTS}full-iphone-note.png` });
check(!i.errors.length, `no errors there ${i.errors.slice(0, 3).join(' | ')}`);
await browser.close();
console.log(failed ? `FAIL: ${failed}` : 'PASS: full screen');
process.exit(failed ? 1 : 0);
