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
  const chk = () => { if (bot.Lsec && G.L !== bot.Lsec) throw new Error('moved'); if (W().phase === 'dead' || b().dead || b().caged) throw new Error('dead'); };
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
    let i = 0, jumpT = 0, hopping = false, hopDir = 0;
    for (;;) {
      // a hop once begun is seen through, still pushing the same way: letting go of jump and the
      // stick at the target, mid-air, would cut it short (over a trip-wire, onto the wire)
      // (and landing past the target is arriving: walking back would be back onto what was hopped)
      if (hopping && jumpT <= 0 && b().ground) { hopping = false; if ((x - b().x) * hopDir < (o.tol || 0.15)) break; }
      if (Math.abs(b().x - x) <= (o.tol || 0.15) && !hopping) break;
      if (o.done && o.done()) break;
      chk();
      if (++i > 60 * 50) throw new Error(`stuck walking to ${x.toFixed(1)}`);
      const dir = hopping ? hopDir : Math.sign(x - b().x);
      let go = true;
      if (o.stop && o.stop() && !hopping) go = false;
      if (o.brace) { if (!go && o.stop && o.stop()) hold('ShiftLeft'); else release('ShiftLeft'); } // stopped for danger: hold fast
      const m = dir > 0 ? behind() : body(G.meIdx - 1);
      if (go && m && o.wait !== false && !hopping && (b().x - m.x) * dir > 5.4) go = false; // don't drag the one behind
      if (o.sneak) hold('KeyS'); else release('KeyS');
      if (go) { hold(dir > 0 ? 'KeyD' : 'KeyA'); release(dir > 0 ? 'KeyA' : 'KeyD'); } else { release('KeyD'); release('KeyA'); }
      if (go && b().ground && wallAhead(dir) && jumpT <= 0) jumpT = 14;
      if (go && o.hop && b().ground && o.hop(dir) && jumpT <= 0) { jumpT = 10; hopping = true; hopDir = dir; }
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
      yield* until(() => (b().ground && !b().mantle) || b().y < L().waters[0].floor - 1, 200, 'jumping off the cog');
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
  const S = {};
  /** through the arch at the chapter's end, everyone side by side */
  function* toExit() { const e = L().exit; if (!e) return; const Lnow = L(); yield* walkTo(e.x + 3.3 - role() * 0.75, { wait: false, tol: 0.25, done: () => L() !== Lnow || W().phase === 'leaving' }); }
  S['pit:0'] = function* () { // the scrap pit: the plates
    const P = L().plates.filter((p) => p.id === 'g0');
    if (solo()) { yield* walkTo(P[0].x); yield* setSpool(); yield* walkTo(P[1].x); }
    else yield* walkTo(P[N() - 1 - role()].x, { wait: false });
    yield* until(() => W().open.g0, 60 * 40, 'the first gate');
    if (solo()) yield* callSpool();
    yield* frames(40);
    yield* toExit();
  };
  S['meadow:0'] = function* () { // the meadow: traps, then the worm bed
    const traps = L().traps, lastTrap = traps[traps.length - 1].x;
    yield* walkTo(lastTrap + 2, { hop: (dir) => traps.some((t, i) => !W().traps[i] && (t.x - b().x) * dir > 0.75 && (t.x - b().x) * dir < 1.2) });
    yield* passWorms(L().worms.filter((w) => w.dir > 0));
    yield* toExit();
  };
  S['chasm:0'] = function* () { // the chasm
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
    yield* walkTo(L().cps[1].x + 0.8 - role() * 1.0);
  };
  S['chasm:1'] = function* () { // the worm tunnel
    yield* passWorms(L().worms.filter((w) => w.dir < 0));
    yield* toExit();
  };
  S['den:0'] = function* () { // the den, then the levers
    const Z = L().monsters[0].zone, m = () => G.mon[0];
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
    yield* toExit();
  };
  S['gears:0'] = function* () { // the gear room
    const c0 = L().cogs[0], c1 = L().cogs[1], fl = L().waters[0].floor;
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
    yield* toExit();
  };
  S['cathedral:0'] = function* () { // the glass
    const sl = L().slabs, at = (x) => sl.findIndex((s) => x > s.x0 - 0.15 && x < s.x1 + 0.15), on = (k, x) => k >= 0 && x > sl[k].x0 - 0.45 && x < sl[k].x1 + 0.45;
    const cap = sl[0].cap;
    yield* walkTo(L().cps[1].x + 0.6 - role() * 1.0, { stop: () => { const next = at(b().x + 0.5); if (next < 0 || next === at(b().x - 0.25)) return false; return others().filter((m) => on(next, m.x)).length >= cap; } });
  };
  S['cathedral:1'] = function* () { // the cathedral, then the shears
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
    yield* toExit();
  };
  S['collector:0'] = function* () { // the collector
    const ki = L().monsters.findIndex((q) => q.kind === 'collector'), k = () => G.mon[ki], x0 = L().monsters[ki].x0;
    const A = x0 + 5, B = x0 + 10;
    // its hands lift anything loose: whenever they come near, stop and hold fast
    const near = () => Math.abs(k().x - b().x) < 3 && (k().mode === 'pace' || k().mode === 'hunt');
    const safe = { sneak: true, wait: false, stop: near, brace: true };
    function* letItPass() { if (!near()) return; release('KeyS'); hold('ShiftLeft'); yield* until(() => !near(), 60 * 30, 'its hands passing'); release('ShiftLeft'); }
    if (!W().tripped) {
      yield* walkTo(x0 - 6.5);
      if (solo()) { yield* walkTo(A, safe); release('KeyS'); yield* letItPass(); yield* setSpool(); yield* walkTo(B, safe); }
      else yield* walkTo(B - (role() * (B - A)) / (N() - 1), safe);
      release('KeyS');
      hold('ShiftLeft'); // and keep holding until it walks into the thread
      yield* until(() => W().tripped || k().mode === 'fall', 60 * 120, 'it tripping');
      say('it trips');
      yield* until(() => W().open.g7, 300, 'the crash');
      release('ShiftLeft');
      if (solo()) yield* callSpool();
    }
    yield* toExit();
  };
  // ---- the Fen: mud, candles, the bog
  const dk = () => G.mon.filter((m) => m.kind === 'drinker');
  const gone = (m) => m.mode === 'dead' || m.mode === 'burn';
  function* creep(m) { yield* walkTo(m.x0 - 0.25, { wait: false }); yield* walkTo(m.x1 - 0.3, { sneak: true, wait: false }); release('KeyS'); }
  const mudAt = (x0) => L().mud.find((m) => m.x0 >= x0);
  /** show yourself to the Drinkers of this stretch, then run back past the candles; until none is left */
  function* lure(back, inBeat) {
    for (let k = 0; k < 10; k++) {
      const alive = dk().filter(inBeat).filter((m) => !gone(m));
      if (!alive.length) return;
      const busy = () => alive.some((m) => m.mode === 'hunt' || m.mode === 'drink');
      yield* walkTo(alive[0].x - 6.6, { wait: false, done: busy });
      yield* until(busy, 240, 'a Drinker seeing me');
      say('lured');
      yield* walkTo(back, { wait: false });
      yield* until(() => !busy(), 60 * 15, 'it burning');
    }
    throw new Error('the Drinkers would not burn');
  }
  const groundAt = (x) => L().solids.some((s) => (s.ground || s.stone) && x > s.x0 + 0.05 && x < s.x1 - 0.05 && Math.abs(s.y1 - b().y) < 0.12);
  S['fen:0'] = function* () { yield* walkTo(25.5); yield* creep(mudAt(25)); yield* walkTo(L().cps[1].x + 0.8 - role() * 0.9); };
  S['fen:1'] = function* () { yield* lure(52.3 - role() * 0.8, (m) => m.x0 === 52); yield* walkTo(L().cps[2].x + 0.8 - role() * 0.9); };
  S['fen:2'] = function* () { yield* lure(71.2 - role() * 0.8, (m) => m.x0 === 72); yield* creep(mudAt(91)); yield* walkTo(L().cps[3].x + 0.6 - role() * 0.7, { wait: false }); };
  S['fen:3'] = function* () {
    const hop = (dir) => !groundAt(b().x + dir * 0.45) && b().ground;
    yield* creep(mudAt(96.5));
    yield* walkTo(110.6, { hop, wait: false });
    yield* creep(mudAt(110));
    yield* walkTo(127.5 - role() * 0.6, { hop, wait: false });
    yield* walkTo(L().cps[4].x + 0.6 - role() * 0.9);
  };
  S['fen:4'] = function* () { for (const x of [131, 143, 153]) { yield* creep(mudAt(x - 0.5)); } yield* toExit(); };
  // ---- the Drowned Mill: swim, dive, the crate, the eels, the Cistern, the sluice
  /** swim (or walk) to x, keeping the feet at about depth (null: at the top), climbing out at the end */
  function* swimTo(x, depth = null, o = {}) {
    for (let i = 0; ; i++) {
      chk();
      if (i > 60 * 30) throw new Error(`stuck swimming to ${x.toFixed(1)}`);
      const B = b(), dir = Math.sign(x - B.x);
      if (Math.abs(x - B.x) < 0.25 && (B.ground || !o.out)) break;
      if (o.done && o.done()) break;
      hold(dir > 0 ? 'KeyD' : 'KeyA'); release(dir > 0 ? 'KeyA' : 'KeyD');
      if (B.ground && !B.swim && !B.under) { if (wallAhead(dir) && !B.mantle) { hold('Space'); } else release('Space'); release('KeyS'); }
      else if (depth != null && B.y > depth + 0.15) { hold('KeyS'); release('Space'); }
      else if (depth != null && B.y < depth - 0.4) { release('KeyS'); hold('Space'); }
      else if (depth == null) { release('KeyS'); hold('Space'); }
      else { release('KeyS'); release('Space'); }
      yield;
    }
    release('KeyD'); release('KeyA'); release('KeyS'); release('Space');
  }
  const crate = () => L().crates[0];
  /** wait at this lantern until everyone still standing is here */
  function* gather() { const c = L().cps[W().cp]; yield* until(() => G.players.every((p) => p.b.dead || (Math.abs(p.b.x - c.x) < 3.5 && Math.abs(p.b.y - c.y) < 1)), 60 * 60, 'the others at the lantern'); }
  S['mill:0'] = function* () {
    yield* walkTo(9.6, { wait: false });
    yield* swimTo(14.3, null);
    yield* swimTo(17.6, -3.4);
    yield* swimTo(23.2, null, { out: true });
    say('through the stair');
    // the crate: push it in, then across to the ledge's wall
    yield* walkTo(35.6, { wait: false });
    hold('KeyD'); yield* until(() => b().swim, 120, 'into the water'); release('KeyD');
    hold('Space'); yield* until(() => b().y > L().waters[1].y1 - 1.05, 300, 'coming up'); release('Space');
    for (let k = 0; k < 6 && crate().x < 47.0; k++) {
      if (b().x > crate().x - crate().w / 2 - 0.2) { yield* swimTo(crate().x - crate().w / 2 - 0.6, null); }
      hold('Space'); hold('KeyD'); yield* until(() => b().x > crate().x - crate().w / 2 - 0.35 || b().x > crate().x, 300, 'to the crate'); release('KeyD'); yield* until(() => b().y > L().waters[1].y1 - 1.05, 240, 'surfacing'); release('Space');
      hold('KeyD'); yield* until(() => crate().x > 46.95 || b().x > crate().x || b().y < L().waters[1].y1 - 1.3, 60 * 12, 'pushing the crate'); release('KeyD');
    }
    say(`the crate at ${crate().x.toFixed(1)}`);
    // onto it, then up to the ledge
    const top = L().cps[1].y - 0.1;
    for (let k = 0; k < 8 && !(b().ground && b().y > top); k++) {
      const onCrate = b().ground && !b().swim && b().y < top - 0.5 && b().x > 44;
      if (!onCrate) { yield* swimTo(crate().x - crate().w / 2 - 0.3, null); hold('KeyD'); hold('Space'); yield* frames(30); release('KeyD'); release('Space'); continue; }
      yield* walkTo(crate().x + 0.35, { wait: false, tol: 0.1 });
      hold('KeyD'); hold('Space'); yield* frames(16); release('Space'); yield* frames(30); release('KeyD');
    }
    if (!(b().y > top)) throw new Error('never got up off the crate');
    yield* walkTo(L().cps[1].x + 0.6 - role() * 0.8);
  };
  const eel = (i) => L().eels[i];
  const justFlashed = (e) => { const T = G.T(), ph = (((T + e.off) % e.period) + e.period) % e.period; return ph > 0.32 && ph < 0.9; };
  S['mill:1'] = function* () {
    yield* gather();
    yield* walkTo(53.7, { wait: false });
    yield* until(() => justFlashed(eel(0)), 60 * 8, 'the first eel flashing');
    yield* swimTo(62.3, null, { out: true });
    yield* walkTo(63.6, { wait: false });
    yield* until(() => justFlashed(eel(1)), 60 * 8, 'the second eel flashing');
    yield* swimTo(72.4, null, { out: true });
    yield* walkTo(L().cps[2].x + 0.6 - role() * 0.8);
  };
  S['mill:2'] = function* () {
    yield* gather();
    const V = L().levers.filter((l) => l.id === 'cis');
    if (solo()) { const P = L().plates.find((p) => p.id === 'cis'); yield* walkTo(P.x, { wait: false }); yield* setSpool(); }
    const v = solo() ? V[0] : V[role() % V.length];
    // to the wheel: walk there, or climb to it
    if (v.y > 1) {
      const sh = L().solids.find((q) => Math.abs(q.y1 - v.y) < 0.05 && v.x > q.x0 && v.x < q.x1);
      for (let k = 0; k < 6 && !(b().ground && b().y > v.y - 0.1); k++) {
        yield* walkTo(sh.x0 - 0.32, { wait: false, tol: 0.06 });
        hold('Space'); yield* until(() => b().vy < 2.5 && !b().ground, 60, 'rising'); hold('KeyD');
        yield* until(() => (b().ground && !b().mantle) || b().swim, 120, 'landing'); release('Space'); release('KeyD');
      }
    }
    yield* walkTo(v.x, { wait: false, tol: 0.3 });
    hold('KeyE');
    yield* until(() => { const B = b(); if (W().open.cis) return true; if (Math.abs(B.x - v.x) > 0.6) { hold(B.x < v.x ? 'KeyD' : 'KeyA'); release(B.x < v.x ? 'KeyA' : 'KeyD'); } else { release('KeyD'); release('KeyA'); } if (B.swim && B.y > v.y + 0.6) hold('KeyS'); else release('KeyS'); return false; }, 60 * 40, 'every wheel turned');
    releaseAll();
    if (solo()) yield* callSpool();
    yield* toExit();
  };
  // ---- the Granary: the lamp, the gap, the silo
  const lamp = (k = 0) => L().lamps[k];
  const holding = () => L().lamps.some((l) => l.by === G.meIdx);
  /** the one with the lamp walks to x; the rest keep close behind, inside its light */
  function* carryTo(x, o = {}) {
    if (role() === 0) {
      if (!holding()) { yield* walkTo(lamp().x - 0.3, { wait: false }); yield* tap('KeyE', 4); yield* until(holding, 120, 'the lamp in hand'); }
      yield* walkTo(x, { wait: false, stop: () => others().some((m) => Math.abs(m.x - b().x) > 1.9), ...o });
    } else {
      for (let i = 0; ; i++) {
        chk();
        if (i > 60 * 60) throw new Error('stuck following the lamp');
        const l = lamp(), tx = l.x - 0.55 * role();
        if (l.by >= 0 && l.x >= x - 0.3) break;
        if (Math.abs(tx - b().x) > 0.25) { const d = Math.sign(tx - b().x); hold(d > 0 ? 'KeyD' : 'KeyA'); release(d > 0 ? 'KeyA' : 'KeyD'); } else { release('KeyD'); release('KeyA'); }
        yield;
      }
      release('KeyD'); release('KeyA');
      yield* walkTo(lamp().x - 0.55 * role(), { wait: false, tol: 0.2 });
    }
  }
  S['granary:0'] = function* () {
    yield* carryTo(46.3);
    if (role() === 0) { yield* tap('KeyE', 4); yield* until(() => !holding(), 120, 'the lamp down'); }
    yield* walkTo(L().cps[1].x + 0.6 - role() * 0.6, { wait: false });
  };
  S['granary:1'] = function* () {
    yield* gather();
    if (role() === 0) {
      yield* walkTo(lamp().x - 0.3, { wait: false }); yield* tap('KeyE', 4); yield* until(holding, 120, 'the lamp in hand');
      yield* walkTo(49.4, { wait: false });
      // run at the gap and toss it over while walking
      hold('KeyD'); yield* until(() => b().x > 50.9, 120, 'the run-up'); key('keydown', 'KeyE'); yield* frames(3); key('keyup', 'KeyE');
      yield* until(() => !holding(), 60, 'the toss'); release('KeyD');
      say(`tossed to ${lamp().x.toFixed(1)}`);
    } else yield* until(() => lamp().by < 0 && lamp().x > 54, 60 * 30, 'the lamp over the gap');
    const hop = (dir) => b().x > 51.2 && b().x < 52 && dir > 0;
    yield* walkTo(lamp().x - 0.4 - role() * 0.5, { wait: false, hop });
    yield* carryTo(80.6);
    if (role() === 0) { yield* tap('KeyE', 4); }
    yield* walkTo(L().cps[2].x + 0.6 - role() * 0.6, { wait: false });
  };
  S['granary:2'] = function* () { yield* toExit(); };
  // ---- the Dye-Works: fumes, blooms, the rot, the vats
  S['dyeworks:0'] = function* () {
    const bl = L().blooms.filter((q) => q.x < 40);
    const hop = (dir) => dir > 0 && bl.some((q, i) => !W().blooms[i] && q.x - b().x > 1.15 && q.x - b().x < 1.35);
    yield* walkTo(L().cps[1].x + 0.6 - role() * 0.8, { hop });
  };
  S['dyeworks:1'] = function* () {
    yield* gather();
    yield* walkTo(44.4, { wait: false });
    yield* walkTo(53, { sneak: true, wait: false });
    release('KeyS');
    say(G.me.rot != null ? 'the rot is in me' : 'no rot?');
    // to the clean water, in, and stand in it till it is gone
    yield* walkTo(60.3, { wait: false });
    hold('KeyD'); yield* until(() => b().swim || b().under, 120, 'into the basin'); release('KeyD');
    yield* until(() => G.me.rot == null, 60 * 6, 'the rot washing off');
    say('washed');
    yield* swimTo(67.2, null, { out: true });
    yield* walkTo(L().cps[2].x + 0.6 - role() * 0.8);
  };
  const pressPh = (p) => { const T = G.T(); return (((T + p.off) % p.period) + p.period) % p.period; };
  S['dyeworks:2'] = function* () {
    yield* gather();
    const hop = (dir) => dir > 0 && b().x > 87.6 && b().x < 88.3;
    for (const p of L().presses) {
      yield* walkTo(p.x - 1.75 - role() * 0.3, { wait: false, hop });
      yield* until(() => { const ph = pressPh(p); return ph > 0.12 + p.hold + 0.55 && ph < 0.12 + p.hold + 0.8; }, 60 * 8, 'the press rising');
      yield* walkTo(p.x + 1.3, { wait: false, hop });
    }
    yield* toExit();
  };
  // ---- the Larder: creep and freeze, sack to sack, meat, poison
  const glut = () => G.mon.find((m) => m.kind === 'glutton');
  const busy = (m) => m.mode === 'hunt' || m.mode === 'rise' || m.mode === 'bite';
  /** creep, freezing whenever it is near */
  function* creepPast(x) { yield* walkTo(x, { sneak: true, wait: false, stop: () => Math.abs(glut().x - b().x) < 3.6 && glut().mode !== 'chew' && glut().mode !== 'dead' }); release('KeyS'); }
  /** stand in a sack, still and low, until it is quiet near me */
  function* hide() { hold('KeyS'); yield* frames(10); yield* until(() => !busy(glut()) || Math.abs(glut().x - b().x) > 6, 60 * 20, 'it going quiet'); yield* frames(20); release('KeyS'); }
  S['larder:0'] = function* () { yield* creepPast(L().cps[1].x + 0.4 - role() * 0.5); };
  S['larder:1'] = function* () {
    yield* gather();
    for (const s of L().sacks.filter((q) => q.x < 46)) {
      // go when it is far, or busy somewhere else
      yield* until(() => Math.abs(glut().x - b().x) > 7 || (busy(glut()) && Math.abs(glut().tx - b().x) > 3), 60 * 30, 'a moment to move');
      yield* walkTo(s.x - role() * 0.3, { wait: false, tol: 0.12 });
      yield* hide();
    }
    yield* until(() => Math.abs(glut().x - b().x) > 6, 60 * 30, 'a moment to move');
    yield* walkTo(L().cps[2].x + 0.4 - role() * 0.5, { wait: false });
  };
  S['larder:2'] = function* () {
    yield* gather();
    const q = L().meat[0];
    if (role() === 0) { yield* walkTo(q.x, { wait: false, tol: 0.2 }); yield* tap('KeyE', 4); yield* until(() => W().meat[0] >= 1, 120, 'the meat falling'); }
    else yield* until(() => W().meat[0] >= 1, 60 * 20, 'the meat falling');
    yield* walkTo(53.5 - role() * 0.5, { wait: false });
    yield* until(() => glut().mode === 'chew', 60 * 20, 'it chewing');
    yield* walkTo(L().cps[3].x + 0.4 - role() * 0.5, { wait: false });
  };
  S['larder:3'] = function* () {
    yield* gather();
    const s = L().sacks[L().sacks.length - 1], q = L().meat[L().meat.length - 1];
    yield* until(() => Math.abs(glut().x - b().x) > 7 || glut().mode === 'chew', 60 * 30, 'a moment to move');
    if (role() === 0) { yield* walkTo(q.x, { wait: false, tol: 0.2 }); yield* tap('KeyE', 4); }
    yield* walkTo(s.x - role() * 0.3, { wait: false, tol: 0.12 });
    hold('KeyS');
    yield* until(() => W().open.gl, 60 * 30, 'it eating the poison');
    release('KeyS');
    say('the Glutton is dead');
    yield* toExit();
  };
  S['spindle:0'] = function* () { // the spindle
    const R = L().rings;
    if (solo()) { yield* walkTo(R[0].x); yield* setSpool(); yield* walkTo(R[1].x); }
    else yield* walkTo(R[N() - 1 - role()].x, { wait: false });
    yield* until(() => W().phase === 'won', 60 * 40, 'the spindle');
  };

  function* journey() {
    for (;;) {
      if (W().phase === 'won') return;
      if (W().phase !== 'play') { yield; continue; }
      const cp = W().cp, Lnow = L(), sk = `${Lnow.id}:${cp}`;
      bot.sec = `${Lnow.name} / ${Lnow.cps[cp].name}`;
      say(`> ${bot.sec}`);
      if (!S[sk]) { bot.failed = `no route for ${sk}`; return; }
      bot.Lsec = Lnow;
      try {
        yield* S[sk]();
        bot.Lsec = null;
        if (cp < Lnow.cps.length - 1) yield* until(() => W().cp > cp, 60 * 30, 'the next lantern');
        else if (Lnow.exit) { yield* until(() => G.L !== Lnow || W().phase === 'leaving', 60 * 30, 'the chapter ending'); yield* until(() => G.L !== Lnow && W().phase === 'play', 60 * 30, 'the next chapter'); }
        yield;
      } catch (e) {
        releaseAll();
        if (e.message === 'moved') { say('the chapter moved on without me'); continue; }
        if (e.message !== 'dead') { bot.stack = e.stack; bot.failed = `${bot.sec}: ${e.message}`; say(`FAILED ${e.message}`); return; }
        bot.deaths++;
        say(`died (${G.lastWhy}) in ${bot.sec}: ${document.getElementById("toast")?.textContent || ""} (k at ${G.mon.find((m) => m.kind === "collector")?.x.toFixed(1)} ${G.mon.find((m) => m.kind === "collector")?.mode}; ${G.players.map((p) => `${p.b.x.toFixed(1)}${p.b.braced ? "B" : ""}${p.b.caged ? "C" : ""}`).join(" ")})`);
        if (bot.deaths > (window.__botLives || 12)) { bot.failed = `${bot.sec}: died too often`; return; }
        while (W().phase !== 'play') yield;
        for (let i = 0; i < 50; i++) yield;
      }
    }
  }
  const run = journey();
  // Every count above is in steps of 1/60 s (a 14-step jump, a 60 * 50 step limit), so think at 60 Hz
  // of game time whatever the screen's refresh: at 144 Hz a frame-counting bot jumps short and gives up early.
  const STEP = 1 / 60;
  let acc = 0;
  G.app.on('update', (dt) => {
    if (bot.done || bot.failed) return;
    acc += dt;
    if (acc < STEP - 1e-4) return;
    acc = Math.min(acc - STEP, STEP);
    bot.frames++;
    // a worm in my head: drop everything and hammer jump until it is out (a friend may rip it out too)
    if (G.wormT > 0) {
      if (!bot.ridden) { bot.ridden = true; releaseAll(); say('a worm got in'); }
      if (bot.frames % 6 === 0) key('keydown', 'Space'); else if (bot.frames % 6 === 3) key('keyup', 'Space');
      return;
    }
    if (bot.ridden) { bot.ridden = false; key('keyup', 'Space'); say('tore it out'); }
    if (G.latchT > 0) {
      if (!bot.drunk) { bot.drunk = true; releaseAll(); say('a Drinker is on me'); }
      if (bot.frames % 6 === 0) key('keydown', 'Space'); else if (bot.frames % 6 === 3) key('keyup', 'Space');
      return;
    }
    if (bot.drunk) { bot.drunk = false; key('keyup', 'Space'); say('shook it off'); }
    try { const r = run.next(); if (r.done) { bot.done = !bot.failed; releaseAll(); } } catch (e) { bot.failed = `${bot.sec}: ${e.message}`; releaseAll(); }
  });
})();
