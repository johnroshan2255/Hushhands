// Boot, the title, the lobby, and everything on screen that isn't the world: the page's own HTML is
// the loading screen; behind the title the game is already running, the first wanderer waiting.
import { createApp, Renderer, setLightCount } from './render.js';
import { Sfx } from './audio.js';
import { Input } from './input.js';
import { Net } from './net.js';
import { Game } from './game.js';
import * as portal from './portal.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const isTouch = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const store = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };
const stage = (msg, k) => { $('loadMsg').textContent = msg; $('loadFill').style.width = `${Math.round(k * 100)}%`; };

// ---------------------------------------------------------------- the words of help
const K = (s) => `<kbd>${s}</kbd>`;
const HINTS = {
  move: [`${K('A')} ${K('D')} walk`, 'Push the stick to walk'],
  jump: [`${K('SPACE')} jump`, `${K('JUMP')} to jump`],
  climb: ['Jump at a ledge and keep pushing toward it to pull yourself up', 'Jump at a ledge and keep pushing toward it to pull yourself up'],
  plates: ['Every plate, at the same time', 'Every plate, at the same time'],
  plates1: [`Stand on one plate. Set your spool down on the other: ${K('E')}`, `Stand on a plate and press ${K('USE')} to set your spool down. Then stand on the other`],
  chasm: [`One of you holds: stand at the end and keep ${K('SHIFT')} down. The other steps off and hangs`, `One of you holds: stand at the end and keep ${K('HOLD')} down. The other steps off and hangs`],
  chasm1: [`Hang your spool on the hook: ${K('E')}. Then step off the end`, `Press ${K('USE')} to hang your spool on the hook. Then step off the end`],
  hang: [`${K('W')} ${K('S')} climb the thread &nbsp;·&nbsp; ${K('A')} ${K('D')} swing &nbsp;·&nbsp; ${K('SPACE')} let go`, `Stick up and down to climb the thread, left and right to swing &nbsp;·&nbsp; ${K('JUMP')} lets go`],
  sneak: [`It is blind. It listens. Hold ${K('S')} to creep, and keep still when it is over you`, 'It is blind. It listens. Pull the stick down to creep, and keep still when it is over you'],
  levers: [`Every lever held at once: ${K('E')}`, `Every lever held at once: ${K('USE')}`],
  levers1: [`Set your spool on the plate, then hold the lever: ${K('E')}`, `Set your spool on the plate, then hold the lever: ${K('USE')}`],
  water: ['The water is coming. Climb', 'The water is coming. Climb'],
  glass: ['The glass carries one at a time', 'The glass carries one at a time'],
  glass2: ['The glass carries two at a time', 'The glass carries two at a time'],
  bells: [`Do not wake them. Creep under the bells (${K('S')}), jump the wires`, 'Do not wake them. Creep under the bells, jump the wires'],
  shears: ['All of you through together, between one snip and the next', 'All of you through together, between one snip and the next'],
  shears1: [`Run through, then call your spool across before the next snip: ${K('E')}`, `Run through, then call your spool across before the next snip: ${K('USE')}`],
  collector: [`It hears every step. Creep past it, stretch the thread across its path, and all hold ${K('SHIFT')}`, `It hears every step. Creep past it, stretch the thread across its path, and all press ${K('HOLD')}`],
  collector1: [`It hears every step. Set your spool down, creep past, and hold ${K('SHIFT')} with the thread across its path`, `It hears every step. Set your spool down, creep past, and press ${K('HOLD')} with the thread across its path`],
  rings: ['Every ring. Together', 'Every ring. Together'],
  rings1: ['One ring for you, one for your spool', 'One ring for you, one for your spool'],
};
const USES = { HOLD: 'hold the lever', HANG: 'hang the spool on the hook', SET: 'set the spool down here', CALL: 'call the spool back' };

async function boot() {
  stage('finding the thread', 0.08);
  await portal.initPortal();
  const mobile = isTouch() && Math.min(screen.width, screen.height) < 900;
  const weak = mobile || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const qual = q.get('q') || store.get('tb.quality', 'auto');
  const level = qual === 'auto' ? (weak ? 0 : 2) : +qual;
  setLightCount(level === 0 ? 8 : level === 1 ? 12 : 16);
  stage('lighting the lantern', 0.25);
  const app = await createApp($('app'), { antialias: level >= 1, dpr: level === 0 ? 1.25 : level === 1 ? 1.5 : 2 });
  const device = app.graphicsDevice;
  const R = new Renderer(app);
  const sfx = new Sfx();
  const input = new Input();
  input.bindTouch();
  const net = new Net();
  portal.onMute((m) => sfx.setMuted(m));

  // film grain: one small tile of noise, shifted about
  try {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), im = g.createImageData(128, 128);
    for (let i = 0; i < im.data.length; i += 4) { const v = 150 + Math.random() * 105; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0);
    $('grain').style.backgroundImage = `url(${c.toDataURL()})`;
    if (level === 0) $('grain').style.animation = 'none';
  } catch { /* no grain */ }

  // ---------------------------------------------------------------- what the game asks the page to show
  let state = 'menu', touchUI = isTouch(), hintKey = null, useLabel = null, cardTimer = 0, toastTimer = 0;
  const tagEls = new Map();
  const renderHint = () => {
    const el = $('hint'), ti = touchUI ? 1 : 0;
    let html = hintKey && HINTS[hintKey] ? HINTS[hintKey][ti] : '';
    if (!touchUI && useLabel && !(hintKey && /E<\/kbd>/.test(html))) html = html ? `${html} &nbsp;·&nbsp; ${K('E')} ${USES[useLabel]}` : `${K('E')} ${USES[useLabel]}`;
    el.hidden = !html || state !== 'play';
    if (html) el.innerHTML = html;
    const u = $('tUse');
    u.hidden = !useLabel;
    if (useLabel) u.textContent = useLabel;
  };
  const hud = {
    expo: +store.get('tb.bright', '100') / 100,
    card(title, sub) { $('cardT').textContent = title; $('cardS').textContent = sub || ''; $('card').classList.add('on'); clearTimeout(cardTimer); cardTimer = setTimeout(() => $('card').classList.remove('on'), 3600); },
    hint(key) { hintKey = key; renderHint(); },
    use(label) { useLabel = label; renderHint(); },
    fade(to, dur = 0.6, delay = 0) { const f = $('fade'); f.style.transition = dur ? `opacity ${dur}s ease ${delay}s` : 'none'; if (!dur) void f.offsetWidth; f.style.opacity = to; },
    tags(list) {
      const seen = new Set();
      for (const t of list) { seen.add(t.id); let el = tagEls.get(t.id); if (!el) { el = document.createElement('span'); el.textContent = t.name; $('tags').appendChild(el); tagEls.set(t.id, el); } el.style.left = `${t.x}px`; el.style.top = `${t.y}px`; }
      for (const [id, el] of tagEls) if (!seen.has(id)) { el.remove(); tagEls.delete(id); }
    },
    toast(text) { const t = $('toast'); t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4200); },
    end(s) { showEnd(s); },
  };
  const game = new Game({ app, R, sfx, input, net, hud, low: level === 0 });
  window.__tb = { game, net, input, hud, state: () => state };

  // ---------------------------------------------------------------- screens
  const myName = () => (store.get('tb.name', '') || '').trim() || 'Wanderer';
  const soloOrder = () => [{ id: 'me', name: myName(), slot: +store.get('tb.slot', '0') % 4 }];
  const show = (id, on) => { $(id).hidden = !on; };
  function setState(s) {
    state = s;
    show('menu', s === 'menu'); show('lobby', s === 'lobby'); show('end', s === 'end'); show('hud', s === 'play');
    show('touch', s === 'play' && touchUI);
    document.body.classList.toggle('touching', touchUI);
    show('roomChip', s === 'play' && net.online);
    if (net.online) $('roomChip').textContent = net.code;
    input.enabled = s === 'play';
    sfx.music(s === 'play' || s === 'end' ? 'play' : 'menu');
    portal.setPlaying(s === 'play');
    renderHint();
    if (s !== 'play') hud.tags([]);
  }
  function attract() { game.start({ order: soloOrder(), meId: 'me', attract: true }); }
  function toMenu() { show('pause', false); show('together', false); attract(); setState('menu'); }
  function playSolo(fresh) {
    sfx.init(); sfx.play('select');
    if (fresh || !game.running || !game.attract || game.n !== 1) game.start({ order: soloOrder(), meId: 'me', runT0: 0 }); else game.begin();
    game.Tlocal = game.Tlocal || 0;
    if (fresh || game.runT0 == null) game.runT0 = game.T();
    setState('play');
  }
  $('mSolo').addEventListener('click', () => playSolo(false));

  // ---- settings / pause
  const openPause = (title) => {
    $('pTitle').textContent = title;
    $('sSfx').value = Math.round(sfx.vol.sfx * 100); $('sMusic').value = Math.round(sfx.vol.music * 100); $('sBright').value = Math.round(hud.expo * 100);
    const playing = state === 'play';
    show('pRetry', playing); show('pLeave', playing);
    $('pResume').textContent = playing ? 'GO ON' : 'BACK';
    $('pKeys').innerHTML = touchUI ? '' : '<b>A D / ← →</b><span>walk, swing on the thread</span><b>SPACE</b><span>jump, let go of the thread</span><b>W S / ↑ ↓</b><span>climb the thread; S creeps on the ground</span><b>SHIFT</b><span>brace: hold the thread fast</span><b>E</b><span>levers; your spool, when alone</span>';
    $('pKeys').hidden = touchUI;
    show('pause', true);
    if (playing) { game.paused = true; input.enabled = false; portal.setPlaying(false); }
  };
  const closePause = () => { show('pause', false); if (state === 'play') { game.paused = false; input.enabled = true; portal.setPlaying(true); } };
  $('mSettings').addEventListener('click', () => { sfx.play('click'); openPause('SETTINGS'); });
  $('bPause').addEventListener('click', () => { sfx.play('click'); openPause('PAUSED'); });
  $('pResume').addEventListener('click', () => { sfx.play('click'); closePause(); });
  $('pRetry').addEventListener('click', () => { sfx.play('click'); closePause(); game.dying = false; game.intent({ t: 'die', why: 'retry' }); });
  $('pLeave').addEventListener('click', () => { sfx.play('click'); leaveAll(); });
  $('sSfx').addEventListener('input', (e) => sfx.setVolume('sfx', e.target.value / 100));
  $('sMusic').addEventListener('input', (e) => sfx.setVolume('music', e.target.value / 100));
  $('sBright').addEventListener('input', (e) => { hud.expo = e.target.value / 100; store.set('tb.bright', e.target.value); });
  addEventListener('keydown', (e) => { if (e.code !== 'Escape' && e.code !== 'KeyP') return; if (e.target && e.target.tagName === 'INPUT') return; if (!$('pause').hidden) closePause(); else if (state === 'play') openPause('PAUSED'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !net.online && $('pause').hidden) openPause('PAUSED'); });
  addEventListener('touchstart', () => { if (!touchUI) { touchUI = true; setState(state); } }, { passive: true });

  // ---- the end
  function showEnd(s) {
    const mm = Math.floor(s.time / 60), ss = Math.floor(s.time % 60);
    const whole = s.deaths === 0;
    $('eTitle').textContent = whole ? (s.n === 1 ? 'THE WHOLE DOLL' : 'UNBROKEN') : s.cut > 0 ? 'THE SEVERED CORD' : 'MENDED';
    $('eLine').textContent = whole ? (s.n === 1 ? 'You carried the thread home, and never once let it fall.' : 'Not one of you was lost. The thread came home as it left.') : s.cut > 0 ? 'The thread was cut on the way, and knotted, and carried on.' : (s.n === 1 ? 'You fell, and got up, and brought the thread home.' : 'You fell, and were pulled back, and brought the thread home.');
    $('eStats').textContent = `${mm}:${String(ss).padStart(2, '0')}  ·  ${s.deaths === 0 ? 'no falls' : s.deaths === 1 ? '1 fall' : `${s.deaths} falls`}  ·  ${s.n === 1 ? 'alone' : `${s.n} together`}`;
    const guest = net.online && !net.isHost;
    show('eAgain', !guest);
    $('eAgain').textContent = net.online ? 'BACK TO THE THREAD' : 'AGAIN';
    setState('end');
    portal.happytime();
    const best = +store.get(`tb.best${s.n}`, '0');
    if (!best || s.time < best) store.set(`tb.best${s.n}`, String(Math.round(s.time)));
  }
  $('eAgain').addEventListener('click', async () => { sfx.play('click'); await portal.midgameAd(); if (net.online) net.send('end', {}); else playSolo(true); });
  $('eMenu').addEventListener('click', async () => { sfx.play('click'); await portal.midgameAd(); leaveAll(); });
  function leaveAll() { if (net.online) { net.leave(); portal.leftRoom(); } toMenu(); }

  // ---------------------------------------------------------------- together
  let serverUrl = null, roomsTimer = 0;
  const say = (t) => { $('cMsg').textContent = t || ''; };
  async function refreshRooms() {
    if (!serverUrl || $('together').hidden) return;
    try {
      const list = await (await fetch(`${Net.httpBase(serverUrl)}/rooms`, { cache: 'no-store' })).json();
      const box = $('cRooms');
      box.innerHTML = '';
      for (const r of list.slice(0, 4)) { const b = document.createElement('button'); const n = document.createElement('span'); n.textContent = `${r.host}'s thread`; const s = document.createElement('small'); s.textContent = `${r.players}/${r.max}  ·  JOIN`; b.append(n, s); b.addEventListener('click', () => joinRoom('join', r.code)); box.appendChild(b); }
    } catch { /* the list is a nicety */ }
  }
  $('mTogether').addEventListener('click', async () => {
    sfx.init(); sfx.play('click');
    $('cName').value = store.get('tb.name', '') || (await portal.portalUser()) || '';
    say(serverUrl ? '' : 'Looking for the server…');
    show('together', true);
    if (!serverUrl) { serverUrl = await Net.findServer(); say(serverUrl ? '' : 'No server could be reached. You can still set out alone.'); }
    refreshRooms(); clearInterval(roomsTimer); roomsTimer = setInterval(refreshRooms, 4000);
  });
  $('cBack').addEventListener('click', () => { sfx.play('click'); show('together', false); clearInterval(roomsTimer); });
  $('cName').addEventListener('change', (e) => store.set('tb.name', e.target.value.trim().slice(0, 14)));
  const newCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  async function joinRoom(how, code = '') {
    if (!serverUrl) serverUrl = await Net.findServer();
    if (!serverUrl) { say('No server could be reached. You can still set out alone.'); return; }
    const name = ($('cName').value || '').trim().slice(0, 14) || myName();
    store.set('tb.name', name);
    say(how === 'create' ? 'Tying a new thread…' : 'Finding the thread…');
    try {
      if (net.online) net.leave();
      await net.connect(serverUrl, { how, code: how === 'create' ? newCode() : code, name });
      say('');
      show('together', false); clearInterval(roomsTimer);
      renderLobby();
      setState('lobby');
      if (net.run) startOnline(net.run);
    } catch (e) { say(how === 'join' ? 'That thread could not be found (or it has already set out).' : 'The server did not answer. Try again in a moment.'); }
  }
  $('cCreate').addEventListener('click', () => { sfx.play('click'); joinRoom('create'); });
  $('cJoin').addEventListener('click', () => { sfx.play('click'); const c = $('cCode').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c) joinRoom('join', c); else say('Type the code your friend sees.'); });
  $('cCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('cJoin').click(); });

  function renderLobby() {
    $('lCode').textContent = net.code || '·····';
    const list = $('lList');
    list.innerHTML = '';
    const ps = net.players.slice().sort((a, b) => a.slot - b.slot);
    for (let i = 0; i < 4; i++) {
      const li = document.createElement('li'), p = ps[i];
      if (p) { const n = document.createElement('span'); n.textContent = p.name; li.appendChild(n); const tag = document.createElement('small'); tag.textContent = p.id === net.hostId ? (p.id === net.id ? 'YOU · LEADS' : 'LEADS') : p.id === net.id ? 'YOU' : ''; li.appendChild(tag); }
      else { li.className = 'empty'; li.textContent = 'a place on the thread'; }
      list.appendChild(li);
    }
    const n = ps.length;
    $('lStart').hidden = !net.isHost;
    $('lStart').textContent = n > 1 ? `SET OUT, ${['', '', 'TWO', 'THREE', 'FOUR'][n]} TOGETHER` : 'SET OUT ALONE';
    $('lNote').textContent = net.isHost ? (n > 1 ? `The Loom will be built for ${n}: every one of you will be needed.` : 'Share the code. The Loom is built for however many set out.') : 'Waiting for the one who leads to set out.';
    portal.inRoom(net.code, n < 4 && !net.run);
  }
  $('lStart').addEventListener('click', () => { sfx.play('select'); net.send('start', {}); });
  $('lLeave').addEventListener('click', () => { sfx.play('click'); leaveAll(); });
  $('lCopy').addEventListener('click', async () => {
    const link = portal.inviteLink(net.code) || `${location.origin}${location.pathname}?room=${net.code}`;
    try { await navigator.clipboard.writeText(link); $('lCopy').textContent = 'COPIED'; } catch { $('lCopy').textContent = net.code; }
    setTimeout(() => { $('lCopy').textContent = 'COPY LINK'; }, 1600);
  });
  function startOnline(run) {
    const order = run.order.map((id) => net.players.find((p) => p.id === id)).filter(Boolean).map((p) => ({ id: p.id, name: p.name, slot: p.slot }));
    if (!order.length) return;
    show('pause', false);
    game.start({ order, meId: net.id, startedAt: run.startedAt, runT0: 0 });
    setState('play');
    portal.inRoom(net.code, false);
  }
  net.on('roster', () => { if (state === 'lobby') renderLobby(); });
  net.on('run', (run) => { if (run) startOnline(run); else if (net.online) { attract(); renderLobby(); setState('lobby'); } });
  net.on('left', (m) => game.onLeft(m.id));
  net.on('disconnected', (m) => { net.leave(); portal.leftRoom(); toMenu(); hud.toast(m.reason || 'The thread to the server broke.'); $('toast').hidden = false; });
  portal.onJoinInvite((code) => { if (state === 'play' && !game.attract) { portal.joinAfterReload(code); location.reload(); } else joinRoom('join', code); });

  // ---------------------------------------------------------------- go
  stage('raising the loom', 0.6);
  attract();
  let fpsT = 0, frames = 0, slow = 0;
  app.on('update', (rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    game.frame(dt);
    frames++; fpsT += rawDt;
    if (fpsT > 2) { const fps = frames / fpsT; frames = 0; fpsT = 0; window.__tb.fps = fps; if (qual === 'auto' && fps < 38 && device.maxPixelRatio > 0.8) { if (++slow >= 2) { device.maxPixelRatio = Math.max(0.75, device.maxPixelRatio - 0.25); app.resizeCanvas(); slow = 0; } } else slow = 0; }
  });
  app.start();
  stage('', 1);
  setState('menu');
  $('mFoot').textContent = +store.get('tb.best1', '0') ? `your best alone  ${Math.floor(+store.get('tb.best1', '0') / 60)}:${String(+store.get('tb.best1', '0') % 60).padStart(2, '0')}` : '';
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  $('boot').classList.add('done');
  setTimeout(() => { $('boot').hidden = true; }, 1000);
  portal.loadingDone();
  window.__tb.ready = true;

  const invite = portal.inviteRoom() || portal.takeJoinNext() || (q.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (invite) { serverUrl = await Net.findServer(); if (serverUrl) joinRoom('join', invite); }
  else if (portal.instantMultiplayer()) { serverUrl = await Net.findServer(); if (serverUrl) joinRoom('create'); }
  else if (q.get('solo')) playSolo(true);
}

boot().catch((err) => {
  console.error(err);
  $('loadMsg').textContent = /WebGL/i.test(String(err)) ? 'This browser can\'t run WebGL 2. Try Chrome, Edge, Firefox or Safari 15+.' : `Something went wrong: ${err.message || err}`;
});
