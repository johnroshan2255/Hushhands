// Photo mode (O), through real key presses: alone the moment is held and the camera is free; ESC
// leaves it; it cannot be opened under a panel (or the game would run on behind the panel); ENTER
// keeps a picture. Together the Loom goes on, but the arrows move the camera and not your doll.
//   (start the rooms first)  node scripts/playtest/photo.mjs
import { launch, page, sleep, BASE, SHOTS } from './lib.mjs';

const SERVER = process.env.TB_SERVER || 'ws://localhost:2567';
const sv = BASE.includes(':5173') ? `server=${encodeURIComponent(SERVER)}&` : '';
const browser = await launch();
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${what}`); if (!ok) failed++; };
const read = (p) => p.evaluate(() => { const g = window.__tb.game, v = (id) => !document.getElementById(id).hidden; return { photo: g.photo && { ...g.photo }, paused: g.paused, T: g.T(), x: g.me.b.x, bare: document.body.classList.contains('photo'), hudShown: getComputedStyle(document.getElementById('hud')).display !== 'none', pause: v('pause'), info: v('info'), input: window.__tb.game.input.enabled }; });
const press = async (p, code, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(code); await sleep(60); } };

// ---- alone
const p = await page(browser, `${BASE}/?q=${process.env.Q || 2}`);
await p.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
await p.click('#mSolo');
await p.waitForFunction(() => window.__tb.game.coldT == null, null, { timeout: 10000 }); // (the cold open: nobody can move yet)
await p.keyboard.down('KeyD'); await sleep(1500); await p.keyboard.up('KeyD'); await sleep(400);
const s0 = await read(p);
await press(p, 'KeyO');
let s = await read(p);
check(s.photo && s.paused && s.bare && !s.hudShown && !s.input, 'O holds the moment: paused, the screen bare');
await press(p, 'ArrowRight', 3); await press(p, 'ArrowUp', 2); await press(p, 'Equal', 2); await sleep(300);
const s1 = await read(p);
check(Math.abs(s1.photo.dx - 1.8) < 1e-6 && Math.abs(s1.photo.dy - 1.2) < 1e-6 && Math.abs(s1.photo.zoom - 0.81) < 1e-6, `the arrows and + move the camera (dx ${s1.photo.dx.toFixed(1)}, dy ${s1.photo.dy.toFixed(1)}, zoom ${s1.photo.zoom.toFixed(2)})`);
check(Math.abs(s1.x - s.x) < 0.01 && Math.abs(s1.T - s.T) < 0.05, 'the doll and the clock stand still meanwhile');
await p.screenshot({ path: `${SHOTS}photo-solo.png` });
const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null);
await press(p, 'Enter');
const file = await dl;
check(!!file && /^thread-bearers-\d+\.png$/.test(file.suggestedFilename()), `ENTER keeps a picture (${file ? file.suggestedFilename() : 'nothing came'})`);
await press(p, 'KeyI'); s = await read(p);
check(!s.info && s.photo && s.paused, 'I does nothing while the moment is held');
await press(p, 'Escape'); s = await read(p);
check(!s.photo && !s.bare && !s.pause && !s.paused && s.input && s.hudShown, 'ESC leaves photo mode (and does not open the pause panel)');
await sleep(500);
check((await read(p)).T > s.T + 0.3, 'the clock runs again');
await press(p, 'KeyO'); await press(p, 'KeyO'); s = await read(p);
check(!s.photo && !s.paused && s.input, 'O again leaves it too');
// under the pause panel: O must not open it (leaving it used to set the game running behind the panel)
await press(p, 'Escape'); await press(p, 'KeyO'); await press(p, 'KeyO'); s = await read(p);
check(s.pause && s.paused && !s.photo && !s.input, 'O under the pause panel: nothing; still paused');
await press(p, 'Escape');
await press(p, 'KeyI'); await press(p, 'KeyO'); await press(p, 'KeyO'); s = await read(p);
check(s.info && s.paused && !s.photo, 'O under the i panel: nothing; still paused');
await press(p, 'KeyI'); s = await read(p);
check(!s.info && !s.paused && s.input, 'and the game goes on after');
// back to the menu and out again: nothing of photo mode is left behind
await press(p, 'KeyO'); await p.evaluate(() => window.__tb.game.photo && document.getElementById('pLeave').click()); await sleep(600);
s = await read(p);
check(!s.photo && !s.bare, 'leaving the journey ends photo mode');
check(!p.errors.length, `no errors alone ${p.errors.slice(0, 3).join(' | ')}`);
await p.context().close();

// ---- together: the Loom does not stop
const a = await page(browser, `${BASE}/?${sv}q=0`);
await a.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
await a.click('#mTogether'); await a.fill('#cName', 'Ada'); await a.click('#cCreate');
await a.waitForFunction(() => window.__tb.state() === 'lobby', null, { timeout: 15000 });
const code = await a.evaluate(() => window.__tb.net.code);
const g = await page(browser, `${BASE}/?${sv}q=0&room=${code}`, { viewport: { width: 800, height: 450 } });
await g.waitForFunction(() => window.__tb && window.__tb.ready && window.__tb.state() === 'lobby', null, { timeout: 30000 });
await a.waitForFunction(() => window.__tb.net.players.length === 2, null, { timeout: 10000 });
await a.click('#lStart');
for (const q of [a, g]) await q.waitForFunction(() => window.__tb.state() === 'play' && window.__tb.game.n === 2, null, { timeout: 10000 });
await a.waitForFunction(() => window.__tb.game.coldT == null && window.__tb.game.T() > 0, null, { timeout: 15000 });
await sleep(300);
await a.bringToFront();
await press(a, 'KeyO');
const t0 = await read(a);
await a.keyboard.down('ArrowRight'); await sleep(700); await a.keyboard.up('ArrowRight'); await sleep(200);
const t1 = await read(a);
check(t0.photo && !t0.paused && t1.T > t0.T + 0.5, 'together: the Loom goes on in photo mode');
check(Math.abs(t1.x - t0.x) < 0.05 && t1.photo.dx > 0, `together: the arrows move the camera, not the doll (doll moved ${(t1.x - t0.x).toFixed(2)} m, camera ${t1.photo.dx.toFixed(1)} m)`);
await press(a, 'KeyO');
await a.keyboard.down('ArrowRight'); await sleep(700); await a.keyboard.up('ArrowRight');
const t2 = await read(a);
check(!t2.photo && t2.input && t2.x > t1.x + 0.5, `together: out of photo mode the arrows walk again (photo ${JSON.stringify(t2.photo)}, input ${t2.input}, walked ${(t2.x - t1.x).toFixed(2)} m)`);
check(!a.errors.length && !g.errors.length, `no errors together ${[...a.errors, ...g.errors].slice(0, 3).join(' | ')}`);
await browser.close();
console.log(failed ? `FAIL: ${failed} check(s)` : 'PASS: photo mode');
process.exit(failed ? 1 : 0);
