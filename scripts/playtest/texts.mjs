// The words on the screen, on touch: the trial's card and the hint must never lie on the ground you
// are reading (the Meadow's traps were hidden under the trial's card), nor on the controls, the corner
// buttons or each other, on any shape of phone; and HINTS in the settings switches them off (a
// warning still shows).      node scripts/playtest/texts.mjs
import { launch, sleep, BASE, SHOTS } from './lib.mjs';

const VIEWS = [['phone-wide', 844, 390], ['phone-tall', 390, 844], ['phone-small-wide', 568, 320], ['phone-small-tall', 320, 568], ['tablet-wide', 1024, 768]];
const LONG = 'pull the stick down while you walk. Creeping makes no sound'; // the trial's longest line
const LONG_HINT = 'Moth-dust: it lifts you toward their nest. Someone holds fast below, on the thread, while you rise to the ledge'; // the longest hint
const browser = await launch();
let failed = 0; const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${what}`); if (!ok) failed++; };
const read = (p) => p.evaluate(() => {
  const g = window.__tb.game;
  const box = (e) => { if (!e || e.hidden || !e.getClientRects().length) return null; const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; };
  const id = (i) => box(document.getElementById(i));
  const t = g.L.traps[0], feet = g.project(g.me.b.x, g.me.b.y), head = g.project(g.me.b.x, g.me.b.y + 1.15);
  return { W: innerWidth, H: innerHeight, trial: id('trial'), hint: id('hint'), hintText: document.getElementById('hint').textContent, full: id('bFull'), pause: id('bPause'), info: id('bInfo'), controls: [...document.querySelectorAll('#touch .tb:not([hidden]), #stick')].map(box).filter(Boolean), feetY: feet[1], headY: head[1], trapX: g.project(t.x, t.y)[0], dollX: feet[0] };
});
const apart = (a, b) => !a || !b || a.r <= b.l + 0.5 || b.r <= a.l + 0.5 || a.b <= b.t + 0.5 || b.b <= a.t + 0.5;

for (const [name, w, h] of VIEWS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('tb.story', '1'); } catch { /* */ } }); // the story seen, the trial not yet done
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${BASE}/`); await p.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 }); await sleep(900);
  await p.tap('#mSolo'); await p.waitForFunction(() => window.__tb.game.coldT == null, null, { timeout: 12000 }); await sleep(500);
  // the Meadow, a step short of its first trap, the trial's card still up (and its longest line in it)
  await p.evaluate(() => { const { game } = window.__tb; game.skipCold = true; game.start({ order: [{ id: 'me', name: 'Me', slot: 0 }], meId: 'me', chapter: 1, cp: 0, runT0: 0 }); });
  await sleep(4300);
  // (and the longest hint beside it: put up by hand, as none is due on this spot)
  await p.evaluate(() => { const g = window.__tb.game; g.me.b.x = g.L.traps[0].x - 2.2; });
  await sleep(500); // (the step to here ends the trial's "Walk", which writes the card afresh: the long line goes in after)
  await p.evaluate(([long, hint]) => { document.getElementById('trK').textContent = long; const e = document.getElementById('hint'); e.textContent = hint; e.classList.remove('urgent'); e.hidden = false; }, [LONG, LONG_HINT]);
  await sleep(1000);
  const s = await read(p);
  await p.screenshot({ path: `${SHOTS}texts-${name}.png` });
  const words = [s.trial, s.hint].filter(Boolean), buttons = [s.full, s.pause, s.info].filter(Boolean);
  const bad = [];
  if (!s.trial) bad.push('no trial card'); if (!s.hint) bad.push('no hint');
  for (const q of words) {
    if (q.l < -0.5 || q.t < -0.5 || q.r > s.W + 0.5 || q.b > s.H + 0.5) bad.push('off the screen');
    if (q.b > s.headY - 8) bad.push(`down to ${Math.round(q.b)}px, the doll's head at ${Math.round(s.headY)}px`); // (well above the doll: the ground and what is on it stay in sight)
    if (buttons.some((b) => !apart(q, b))) bad.push('over a corner button');
    if (s.controls.some((c) => !apart(q, c))) bad.push('over the controls');
  }
  if (!apart(s.trial, s.hint)) bad.push('the card over the hint');
  check(!bad.length, `${name} ${w}x${h}: the card and the hint ("${s.hintText.slice(0, 28)}…") clear of the ground, the controls, the buttons and each other${bad.length ? `: ${[...new Set(bad)].join('; ')}` : ` (lowest ${Math.round(Math.max(...words.map((q) => q.b)))}px, head ${Math.round(s.headY)}px, ground ${Math.round(s.feetY)}px)`}`);
  if (name === 'phone-wide') {
    // HINTS off, in the settings: both go; a warning still shows
    await p.tap('#bPause'); await sleep(300); await p.tap('#sHints'); await sleep(200);
    const off = await p.evaluate(() => ({ btn: document.getElementById('sHints').textContent, stored: localStorage.getItem('tb.hints') }));
    await p.tap('#pResume'); await sleep(400);
    let t = await read(p);
    check(off.btn === 'OFF' && off.stored === 'off' && !t.trial && !t.hint, 'HINTS off (settings): the card and the hint are gone');
    await p.screenshot({ path: `${SHOTS}texts-${name}-off.png` });
    await p.evaluate(() => window.__tb.game.possessMe()); await sleep(500); t = await read(p);
    check(!!t.hint && /HEAD/.test(t.hintText) && t.hint.b < t.headY, `a warning still shows, and at the top ("${t.hintText.slice(0, 40)}…")`);
    await p.reload(); await p.waitForFunction(() => window.__tb && window.__tb.ready, null, { timeout: 30000 });
    check(await p.evaluate(() => document.body.classList.contains('nohints') && document.getElementById('sHints').textContent === 'OFF'), 'and the choice is kept when the game is opened again');
  }
  check(!errors.length, `${name}: no errors ${errors.slice(0, 2).join(' | ')}`);
  await ctx.close();
}
await browser.close();
console.log(failed ? `FAIL: ${failed}` : 'PASS: the words on the screen');
process.exit(failed ? 1 : 0);
