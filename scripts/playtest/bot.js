// A player made of code, run inside the page by the playtests. It reads the game the way a person
// reads the screen (where am I, where is the worm, is the pad coming round) and answers with real
// key events, so everything goes through the same input, physics and rules a person meets.
// Alone it uses the spool; in a pair, the two bots take the two roles of each puzzle.
(() => {
  const TB = window.__tb, G = TB.game;
  const held = new Set();
  const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
  const hold = (c) => { if (!held.has(c)) { held.add(c); key('keydown', c); } };
  const release = (c) => { if (held.has(c)) { held.delete(c); key('keyup', c); } };
  const releaseAll = () => { for (const c of [...held]) release(c); };
  const bot = (window.__bot = { log: [], sec: '', done: false, failed: '', deaths: 0, frames: 0 });
  const say = (m) => { bot.log.push(`[${G.T().toFixed(1)}s x=${G.me.b.x.toFixed(1)}] ${m}`); };
  const b = () => G.me.b, L = () => G.L, W = () => G.W;
  const solo = () => G.n === 1;
  const role = () => G.meIdx;
  const N = () => G.n;
  const body = (i) => G.players[i]?.b;
  const behind = () => body(G.meIdx + 1); // the next one back along the thread
  const others = () => G.players.filter((p) => !p.me).map((p) => p.b);
  const chk = () => { if (W().phase === 'dead' || b().dead || b().caged) throw new Error('dead'); };
  function* frames(n) { for (let i = 0; i < n; i++) { chk(); yield; } }
  function* tap(c, n = 4) { hold(c); yield* frames(n); release(c); yield* frames(3); }
  function* until(fn, max = 60 * 40, what = '') { let i = 0; while (!fn()) { chk(); if (++i > max) throw new Error(`stuck waiting: ${what}`); yield; } }
  const wallAhead = (dir) => {
    const B = b();
    for (const s of L().solids) {
      if (s.gate !== undefined && W().open[s.gate]) continue;
      const edge = dir > 0 ? s.x0 - (B.x + 0.2) : B.x - 0.2 - s.x1;
      const rise = s.y1 - B.y;
      if (edge > -0.05 && edge < 0.45 && rise > 0.08 && rise < 2.9 && B.y + 1.0 > s.y0) return true;
    }
    return false;
  };
  /** walk (or creep) to x, hopping what is in the way; o: { sneak, tol, wait (for the other), stop() } */
  function* walkTo(x, o = {}) {
    let i = 0, jumpT = 0;
    while (Math.abs(b().x - x) > (o.tol || 0.15)) {
      chk();
      if (++i > 60 * 50) throw new Error(`stuck walking to ${x.toFixed(1)}`);
      const dir = Math.sign(x - b().x);
      let go = true;
      if (o.stop && o.stop()) go = false;
      const m = dir > 0 ? behind() : body(G.meIdx - 1);
      if (go && m && o.wait !== false && (b().x - m.x) * dir > 5.4) go = false; // don't drag the one behind
      if (o.sneak) hold('KeyS'); else release('KeyS');
      if (go) { hold(dir > 0 ? 'KeyD' : 'KeyA'); release(dir > 0 ? 'KeyA' : 'KeyD'); } else { release('KeyD'); release('KeyA'); }
      if (go && b().ground && wallAhead(dir) && jumpT <= 0) jumpT = 14;
      if (go && o.hop && b().ground && o.hop(dir) && jumpT <= 0) jumpT = 10;
      if (jumpT > 0) { hold('Space'); jumpT--; if (jumpT === 0) release('Space'); }
      yield;
    }
    release('KeyD'); release('KeyA'); release('Space'); if (!o.keep) release('KeyS');
  }
  const wormClear = (w, need) => { const T = G.T(), ph = (((T + w.off) % w.period) + w.period) % w.period; return ph > w.up + 0.05 && w.period - ph > need; };
  function* passWorms(list) {
    for (const w of list) {
      if (b().x > w.x + 0.6) continue;
      yield* walkTo(w.x - 1.15);
      yield* until(() => wormClear(w, 1.0), 600, 'worm');
      yield* walkTo(w.x + 1.2, { wait: false });
    }
  }
  const pad = (ci, k) => { const c = L().cogs[ci], w = (Math.PI * 2 * c.dir) / c.period, a = w * G.T() + (k / c.pads) * Math.PI * 2; return { x: c.x + Math.cos(a) * c.r, y: c.y + Math.sin(a) * c.r, a: ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) }; };
  function* jumpRight(n = 16) { hold('KeyD'); hold('Space'); yield* frames(n); release('Space'); }
  /** from standing at `from`, get onto cog ci when a pad comes by on the near side; then ride until ready(pad) and jump off */
  function* rideCog(ci, standX, board, ready, landed) {
    for (let tries = 0; tries < 6; tries++) {
      yield* walkTo(standX, { wait: false });
      let k = -1;
      yield* until(() => { for (let i = 0; i < L().cogs[ci].pads; i++) if (board(pad(ci, i))) { k = i; return true; } return false; }, 900, `pad of cog ${ci}`);
      yield* jumpRight(14);
      yield* until(() => b().ground, 120, 'landing on a pad');
      release('KeyD');
      if (!(b().onId || '').startsWith(`c${ci}_`)) { say(`missed cog ${ci}, again`); continue; }
      k = +b().onId.split('_')[1];
      // keep to the middle of the pad as it turns
      yield* until(() => { const p = pad(ci, k), dx = p.x - b().x; if (Math.abs(dx) > 0.2) { hold(dx > 0 ? 'KeyD' : 'KeyA'); release(dx > 0 ? 'KeyA' : 'KeyD'); } else { release('KeyD'); release('KeyA'); } return ready(p) || !b().ground; }, 900, 'riding');
      release('KeyA');
      yield* jumpRight(18);
      yield* until(() => (b().ground && !b().mantle) || b().y < L().water.floor - 1, 200, 'jumping off the cog');
      if (landed()) { release('KeyD'); return; }
      say(`fell off cog ${ci}, again (y=${b().y.toFixed(2)} ground=${b().ground} on=${b().onId} vy=${b().vy.toFixed(1)})`);
    }
    throw new Error(`never got up cog ${ci}`);
  }
  /** set the spool down here (or hang it, by a hook) */
  const setSpool = function* (mode = 'planted') { yield* until(() => G.spool.mode === 'follow' && b().ground, 300, 'the spool following'); yield* tap('KeyE', 5); if (G.spool.mode !== mode) throw new Error(`the spool is ${G.spool.mode}, not ${mode}`); };
  /** call it back to my side */
  const callSpool = function* () { if (G.spool.mode === 'follow') return; if (G.spool.mode !== 'return') yield* tap('KeyE', 5); yield* until(() => G.spool.mode === 'follow', 300, 'the spool coming back'); };

  // ------------------------------------------------------------------ the journey, lantern by lantern
  const S = [];
  S[0] = function* () { // the scrap pit: the plates
    const P = L().plates.filter((p) => p.id === 'g0');
    if (solo()) { yield* walkTo(P[0].x); yield* setSpool(); yield* walkTo(P[1].x); }
    else yield* walkTo(P[N() - 1 - role()].x, { wait: false });
    yield* until(() => W().open.g0, 60 * 40, 'the first gate');
    if (solo()) yield* callSpool();
    yield* frames(40);
    yield* walkTo(L().cps[1].x + 1.2 - role() * 1.0);
  };
  S[1] = function* () { // the meadow: traps, then the worm bed
    const traps = L().traps, lastTrap = traps[traps.length - 1].x;
    yield* walkTo(lastTrap + 2, { hop: (dir) => traps.some((t, i) => !W().traps[i] && (t.x - b().x) * dir > 0.75 && (t.x - b().x) * dir < 1.2) });
    yield* passWorms(L().worms.filter((w) => w.dir > 0));
    yield* walkTo(L().cps[2].x + 0.8 - role() * 1.0);
  };
  S[2] = function* () { // the chasm
    const jetty = L().solids.find((s) => s.thin && L().hooks[0] && Math.abs(s.x1 - 0.3 - L().hooks[0].x) < 0.01), tip = jetty.x1;
    const far = L().solids.find((s) => s.ground && Math.abs(s.x0 - (tip + 4.2)) < 0.01);
    const across = (q) => q.ground && q.x > far.x0 && Math.abs(q.y - far.y1) < 0.2;
    function* swingOver() {
      yield* until(() => b().hang, 300, 'hanging');
      release('KeyD');
      hold('KeyW'); yield* until(() => b().reel >= 1.9, 300, 'climbing'); release('KeyW');
      say('swinging');
      let pump = 1;
      yield* until(() => {
        const B = b();
        if (across(B)) return true;
        if (B.mantle) { hold('KeyD'); release('KeyA'); return false; }
        if (Math.abs(B.vx) > 0.3) pump = Math.sign(B.vx);
        if (B.hang && B.x > far.x0 - 0.15 && B.y > far.y1 + 0.05) { hold('Space'); pump = 1; } else release('Space');
        hold(pump > 0 ? 'KeyD' : 'KeyA'); release(pump > 0 ? 'KeyA' : 'KeyD');
        return false;
      }, 60 * 30, 'the swing');
      releaseAll();
    }
    if (solo()) {
      yield* walkTo(tip - 0.7);
      yield* setSpool('hooked');
      hold('KeyD');
      yield* swingOver();
      yield* callSpool();
    } else {
      // along the thread, front to back: the first swings over while the next holds; after that each
      // one jumps and climbs up to the one before, while the one behind holds the jetty
      const r = role(), n = N();
      const allAcross = (k) => { for (let j = 0; j < k; j++) if (!across(body(j))) return false; return true; };
      const farSpot = far.x0 + 0.9 + (n - 1 - r) * 0.25;
      if (r === 0) {
        yield* walkTo(tip - 1.7, { wait: false });
        yield* until(() => body(1).braced && body(1).x > tip - 0.8, 60 * 40, 'the next one bracing');
        hold('KeyD');
        yield* swingOver();
      } else {
        // hold a place on the jetty, moving up as those ahead get across (never while one of them hangs)
        const crossed = () => { let j = 0; while (j < n && across(body(j))) j++; return j; };
        for (let k = -1, i = 0; ; i++) {
          chk();
          if (i > 60 * 150) throw new Error('stuck waiting: those ahead crossing');
          const kk = crossed();
          if (kk >= r) break;
          if (kk !== k) { k = kk; release('ShiftLeft'); yield* walkTo(tip - 0.35 - (r - Math.max(kk, 1)) * 0.9, { wait: false, tol: 0.1 }); hold('ShiftLeft'); }
          yield;
        }
        yield* until(() => body(r - 1).braced, 60 * 30, 'the one ahead bracing');
        if (r < n - 1) yield* until(() => body(r + 1).braced, 60 * 30, 'the one behind bracing');
        release('ShiftLeft');
        say('my turn to jump');
        hold('KeyD'); yield* until(() => b().x > tip - 0.25 || !b().ground, 300, 'the edge'); hold('Space'); yield* frames(14); release('Space');
        yield* until(() => b().hang || across(b()), 400, 'the thread catching me');
        hold('KeyW');
        yield* until(() => across(b()), 60 * 25, 'climbing out');
        releaseAll();
      }
      yield* walkTo(farSpot, { wait: false });
      hold('ShiftLeft');
      yield* until(() => allAcross(n), 60 * 120, 'the rest following');
      release('ShiftLeft');
    }
    say('across the chasm');
    yield* walkTo(L().cps[3].x + 0.8 - role() * 1.0);
  };
  S[3] = function* () { // the worm tunnel
    yield* passWorms(L().worms.filter((w) => w.dir < 0));
    yield* walkTo(L().cps[4].x + 0.5 - role() * 1.0);
  };
  S[4] = function* () { // the den, then the levers
    const Z = L().crawlZone, m = () => G.mon[0];
    const ledge = L().levers[0].x - 1.2;
    yield* walkTo(Z.x1 + 1.0, { sneak: true, stop: () => b().x > Z.x0 - 0.5 && b().x < Z.x1 && Math.abs(m().x - b().x) < 3.0 });
    release('KeyS');
    if (solo()) {
      const plate = L().plates.find((p) => p.id === 'g3'), lever = L().levers[0];
      yield* walkTo(plate.x); yield* setSpool();
      yield* walkTo(lever.x);
    } else yield* walkTo(L().levers[N() - 1 - role()].x, { wait: false });
    void ledge;
    hold('KeyE');
    yield* until(() => W().open.g3, 60 * 40, 'the levers');
    release('KeyE');
    if (solo()) yield* callSpool();
    yield* walkTo(L().cps[5].x + 0.6 - role() * 1.0);
  };
  S[5] = function* () { // the gear room
    const c0 = L().cogs[0], c1 = L().cogs[1], fl = L().water.floor;
    const block = L().solids.find((s) => Math.abs(s.y1 - (fl + 1.0)) < 0.01 && s.x0 > c0.x - 8 && s.x1 < c0.x);
    const slab = L().solids.find((s) => s.thin && s.x0 > c0.x && s.x1 < c1.x);
    const topS = L().solids.find((s) => s.ground && Math.abs(s.x0 - (c1.x + 3)) < 0.01);
    yield* rideCog(0, block.x1 - 0.35, (p) => p.x < c0.x - 0.6 && p.x > c0.x - 1.5 && p.y < fl + 1.75 && p.y > fl + 0.95, (p) => p.x > c0.x + 1.2 && p.y > slab.y1 - 0.9, () => Math.abs(b().y - slab.y1) < 0.05 && b().x > slab.x0 - 0.25);
    say('on the slab');
    if (behind()) yield* until(() => behind().y > fl + 1.2 || behind().x > c0.x - 2.5, 60 * 30, 'the one behind starting up');
    yield* rideCog(1, slab.x1 - 0.35, (p) => p.x < c1.x - 0.6 && p.x > c1.x - 1.5 && p.y < slab.y1 + 0.75 && p.y > slab.y1 - 0.05, (p) => p.x > c1.x + 0.9 && p.y > c1.y + 1.2, () => Math.abs(b().y - topS.y1) < 0.05 && b().x > topS.x0 - 0.25);
    say('at the top');
    const P = L().plates.filter((p) => p.id === 'g4');
    if (solo()) { yield* walkTo(P[0].x); yield* setSpool(); yield* walkTo(P[1].x); }
    else yield* walkTo(P[N() - 1 - role()].x, { wait: false });
    yield* until(() => W().open.g4, 60 * 60, 'the gate at the top');
    if (solo()) yield* callSpool();
    yield* walkTo(L().cps[6].x + 0.6 - role() * 1.0);
  };
  S[6] = function* () { // the glass
    const sl = L().slabs, at = (x) => sl.findIndex((s) => x > s.x0 - 0.15 && x < s.x1 + 0.15);
    const cap = sl[0].cap;
    yield* walkTo(L().cps[7].x + 0.6 - role() * 1.0, { stop: () => { const next = at(b().x + 0.5); if (next < 0 || next === at(b().x - 0.25)) return false; return others().filter((m) => at(m.x) === next).length >= cap; } });
  };
  S[7] = function* () { // the cathedral, then the shears
    const bells = L().bells, sh = L().shears[0];
    const last = bells[bells.length - 1].x;
    while (b().x < last + 1.0) {
      yield;
      const near = bells.find((q) => q.kind === 'hang' && Math.abs(q.x - b().x) < 1.15);
      const nxt = Math.min(last + 1.3, b().x + 0.6);
      yield* walkTo(nxt, { sneak: !!near, tol: 0.2, hop: () => bells.some((q) => q.kind === 'wire' && q.x - b().x > 0.85 && q.x - b().x < 1.25), keep: true });
    }
    release('KeyS');
    yield* walkTo(sh.x - 1.7 - role() * 0.5, { wait: false });
    yield* until(() => others().every((m) => Math.abs(m.x - b().x) < 2.6), 60 * 60, 'the others at the shears');
    yield* until(() => { const ph = (((G.T() + sh.off) % sh.period) + sh.period) % sh.period; return ph > sh.shut + 0.05 && ph < sh.shut + 0.3; }, 600, 'the shears opening');
    yield* walkTo(sh.x + 2.6 - role() * 0.55, { wait: false });
    if (solo()) { yield* setSpool(); yield* callSpool(); }
    say('through the shears');
    yield* walkTo(L().cps[8].x + 0.5 - role() * 1.0);
  };
  S[8] = function* () { // the collector
    const k = () => G.mon[1], x0 = L().monsters[1].x0;
    const A = x0 + 5, B = x0 + 10;
    if (!W().tripped) {
      yield* walkTo(x0 - 6.5);
      if (solo()) { yield* walkTo(A, { sneak: true }); release('KeyS'); yield* setSpool(); yield* walkTo(B, { sneak: true }); }
      else yield* walkTo(B - (role() * (B - A)) / (N() - 1), { sneak: true, wait: false });
      hold('KeyS');
      yield* until(() => G.players.every((p, i) => p.me || Math.abs(p.b.x - (B - (i * (B - A)) / (N() - 1))) < 0.4) && k().x > A + 0.5 && k().x < B - 0.5, 60 * 120, 'it walking over the thread');
      release('KeyS');
      hold('ShiftLeft');
      yield* until(() => W().tripped || k().mode === 'fall', 60 * 20, 'it tripping');
      say('it trips');
      yield* until(() => W().open.g7, 300, 'the crash');
      release('ShiftLeft');
      if (solo()) yield* callSpool();
    }
    yield* walkTo(L().cps[9].x + 0.5 - role() * 1.0);
  };
  S[9] = function* () { // the spindle
    const R = L().rings;
    if (solo()) { yield* walkTo(R[0].x); yield* setSpool(); yield* walkTo(R[1].x); }
    else yield* walkTo(R[N() - 1 - role()].x, { wait: false });
    yield* until(() => W().phase === 'won', 60 * 40, 'the spindle');
  };

  function* journey() {
    for (;;) {
      if (W().phase === 'won') return;
      if (W().phase !== 'play') { yield; continue; }
      const cp = W().cp;
      bot.sec = L().cps[cp].name;
      say(`> ${bot.sec}`);
      try { yield* S[cp](); if (cp < 9) yield* until(() => W().cp > cp, 60 * 30, 'the next lantern'); yield; } catch (e) {
        releaseAll();
        if (e.message !== 'dead') { bot.failed = `${bot.sec}: ${e.message}`; say(`FAILED ${e.message}`); return; }
        bot.deaths++;
        say(`died in ${bot.sec}`);
        if (bot.deaths > (window.__botLives || 12)) { bot.failed = `${bot.sec}: died too often`; return; }
        while (W().phase !== 'play') yield;
        for (let i = 0; i < 50; i++) yield;
      }
    }
  }
  const run = journey();
  G.app.on('update', () => {
    if (bot.done || bot.failed) return;
    bot.frames++;
    try { const r = run.next(); if (r.done) { bot.done = !bot.failed; releaseAll(); } } catch (e) { bot.failed = `${bot.sec}: ${e.message}`; releaseAll(); }
  });
})();
