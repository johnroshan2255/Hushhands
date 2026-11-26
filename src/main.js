// Boot, the title, the lobby, and everything on screen that isn't the world: the page's own HTML is
// the loading screen; behind the title the game is already running, the first wanderer waiting.
import { createApp, Renderer, setLightCount } from './render.js';
import { Sfx } from './audio.js';
import { Input } from './input.js';
import { Net } from './net.js';
import { Game } from './game.js';
import * as portal from './portal.js';
import * as saves from './save.js';
import { CHAPTERS } from './chapters/index.js';

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
  hangMid: [`${K('W')} with ${K('A')} or ${K('D')} climbs toward the one on that side &nbsp;·&nbsp; ${K('S')} lets thread out &nbsp;·&nbsp; ${K('SPACE')} let go`, `Stick up and toward a side to climb to the one there &nbsp;·&nbsp; ${K('JUMP')} lets go`],
  sneak: [`It is blind. It listens. Hold ${K('S')} to creep, and keep still when it is over you`, 'It is blind. It listens. Pull the stick down to creep, and keep still when it is over you'],
  levers: [`Every lever held at once: ${K('E')}`, `Every lever held at once: ${K('USE')}`],
  levers1: [`Set your spool on the plate, then hold the lever: ${K('E')}`, `Set your spool on the plate, then hold the lever: ${K('USE')}`],
  water: ['The water is coming. Climb', 'The water is coming. Climb'],
  glass: ['The glass carries one at a time', 'The glass carries one at a time'],
  glass2: ['The glass carries two at a time', 'The glass carries two at a time'],
  bells: [`Do not wake them. Creep under the bells (${K('S')}), jump the wires`, 'Do not wake them. Creep under the bells, jump the wires'],
  shears: ['All of you through together, between one snip and the next', 'All of you through together, between one snip and the next'],
  shears1: [`Run through, then call your spool across before the next snip: ${K('E')}`, `Run through, then call your spool across before the next snip: ${K('USE')}`],
  collector: [`Its hands lift anything loose, even creeping. Spread out across its path and all hold ${K('SHIFT')}: it walks into the thread and falls`, `Its hands lift anything loose, even creeping. Spread out across its path and all press ${K('HOLD')}: it walks into the thread and falls`],
  collector1: [`Its hands lift anything loose, even creeping. Set your spool down in its yard, creep away from it, hold ${K('SHIFT')}: it walks into the thread and falls`, `Its hands lift anything loose, even creeping. Set your spool down in its yard, creep away from it, press ${K('HOLD')}: it walks into the thread and falls`],
  // the Collector, said as you go: what is wrong, what to do now
  kNear: [`ITS HANDS ARE COMING. Hold ${K('SHIFT')}: it cannot lift one who holds fast`, `ITS HANDS ARE COMING. Press ${K('HOLD')}: it cannot lift one who holds fast`],
  kStill: [`Keep holding ${K('SHIFT')}. Let it step over you. Move only when it has gone by`, `Keep holding ${K('HOLD')}. Let it step over you. Move only when it has gone by`],
  kSet: [`Set your spool down here: ${K('E')}. Then creep on, away from it`, `Set your spool down here: ${K('USE')}. Then creep on, away from it`],
  kShort: ['Too close to your spool. Creep on, away from it: the giant has to walk between you and the spool', 'Too close to your spool. Creep on, away from it: the giant has to walk between you and the spool'],
  kOut: ['The thread lies where it never walks. Come back into its yard', 'The thread lies where it never walks. Come back into its yard'],
  kBrace: [`Good. Now hold ${K('SHIFT')} and keep holding. Let it walk into the thread`, `Good. Now press ${K('HOLD')} and keep holding. Let it walk into the thread`],
  kHold: ['Keep holding. Let it come. It trips when it walks between you and the spool', 'Keep holding. Let it come. It trips when it walks between you and the spool'],
  kShortAll: ['Spread out. The thread between you has to stretch across its path', 'Spread out. The thread between you has to stretch across its path'],
  kBraceAll: [`Now all hold ${K('SHIFT')} and keep holding. Let it walk into the thread`, `Now all press ${K('HOLD')} and keep holding. Let it walk into the thread`],
  kHoldAll: [`Keep holding ${K('SHIFT')}. Every one of you must hold, the thread across its path`, `Keep holding ${K('HOLD')}. Every one of you must hold, the thread across its path`],
  kShut: [`Shut. Only the giant's fall breaks it open. Go back: spool down, creep away, hold ${K('SHIFT')}`, `Shut. Only the giant's fall breaks it open. Go back: spool down, creep away, press ${K('HOLD')}`],
  kShutAll: [`Shut. Only the giant's fall breaks it open. Go back, spread across its path, all hold ${K('SHIFT')}`, `Shut. Only the giant's fall breaks it open. Go back, spread across its path, all press ${K('HOLD')}`],
  // the worm in the head
  wormed: [`SOMETHING IS IN YOUR HEAD. Hammer ${K('SPACE')} to tear it out`, `SOMETHING IS IN YOUR HEAD. Hammer ${K('JUMP')} to tear it out`],
  friendWormed: [`A worm has {name}. It will come for you. Get close and press ${K('E')} to rip it out`, `A worm has {name}. It will come for you. Get close and press ${K('USE')} to rip it out`],
  rings: ['Every ring. Together', 'Every ring. Together'],
  // the Dye-Works
  fumes: ['Fumes. Hold your breath, and do not stop', 'Fumes. Hold your breath, and do not stop'],
  bloom: ['The pale things burst if you come near on foot. Jump clear over them', 'The pale things burst if you come near on foot. Jump clear over them'],
  rotting: ['THE ROT IS IN YOU. Find clean water and stand in it. It is going down the thread', 'THE ROT IS IN YOU. Find clean water and stand in it. It is going down the thread'],
  vats: ['Red below. Wait for the press to rise, then go', 'Red below. Wait for the press to rise, then go'],
  // the Granary
  lamp: [`Take the lamp: ${K('E')}. They will not cross its light`, 'Take the lamp: USE. They will not cross its light'],
  lampAll: [`Take the lamp: ${K('E')}. Keep inside its light, all of you`, 'Take the lamp: USE. Keep inside its light, all of you'],
  toss: [`You cannot jump with it. Toss it over while walking: ${K('E')}, then follow`, 'You cannot jump with it. Toss it over while walking: USE, then follow'],
  tide: ['They are coming up the silo. Climb', 'They are coming up the silo. Climb'],
  // the Drowned Mill
  swim: [`In deep water you sink. Hold ${K('SPACE')} to swim up, ${K('S')} to dive. The ring over you is your breath`, 'In deep water you sink. Hold JUMP to swim up, pull down to dive. The ring over you is your breath'],
  dive: ['Dive under the wall. Come up on the other side before your breath runs out', 'Dive under the wall. Come up on the other side before your breath runs out'],
  crate: [`Walk into the crate to push it into the water. It floats: push it, swimming; climb it with ${K('SPACE')}`, 'Walk into the crate to push it into the water. It floats: push it, swimming; climb it with JUMP'],
  eel: ['Something lights up under the water before it strikes. Out of the water when it glows', 'Something lights up under the water before it strikes. Out of the water when it glows'],
  cistern: [`The door has shut. Every wheel turned at once: ${K('E')}, held, even under water`, 'The door has shut. Every wheel turned at once: USE, held, even under water'],
  cistern1: [`The door has shut. Spool on the plate, then turn the wheel: ${K('E')}, held`, 'The door has shut. Spool on the plate, then turn the wheel: USE, held'],
  sluice: ['The sluice is open. Climb', 'The sluice is open. Climb'],
  // the Fen
  latched: [`A DRINKER IS ON YOU. Hammer ${K('SPACE')} to shake it off`, `A DRINKER IS ON YOU. Hammer ${K('JUMP')} to shake it off`],
  friendLatched: [`A Drinker is drinking {name}. Get close and press ${K('E')} to tear it off`, `A Drinker is drinking {name}. Get close and press ${K('USE')} to tear it off`],
  fen: ['They hunt by light, and your thread is light', 'They hunt by light, and your thread is light'],
  mud: [`Creep through the mud (${K('S')}): it smothers your glow, and they cannot see you`, 'Creep through the mud (pull the stick down): it smothers your glow, and they cannot see you'],
  candle: ['Let it chase you past the flame', 'Let it chase you past the flame'],
  bog: ['The bog takes whatever falls in. Stone to stone', 'The bog takes whatever falls in. Stone to stone'],
  dark: ['Dark, all of you, and cross one at a time', 'Dark, all of you, and cross one at a time'],
  dark1: ['Dark, and cross. Leave the spool lit as bait if you must', 'Dark, and cross. Leave the spool lit as bait if you must'],
  rings1: ['One ring for you, one for your spool', 'One ring for you, one for your spool'],
};
const USES = { HOLD: 'hold the lever', HANG: 'hang the spool on the hook', SET: 'set the spool down here', CALL: 'call the spool back', LAMP: 'pick up the lamp', DROP: 'set the lamp down', TOSS: 'toss the lamp ahead' };

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
  let trialReady = false; // (the trial's state is declared further down; setState may run before it)
  let state = 'menu', touchUI = isTouch(), hintKey = null, hintVars = {}, useLabel = null, cardTimer = 0, toastTimer = 0, flashTimer = 0, lastBeat = '';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const tagEls = new Map();
  const renderHint = () => {
    const el = $('hint'), ti = touchUI ? 1 : 0;
    let html = hintKey && HINTS[hintKey] ? HINTS[hintKey][ti].replace('{name}', () => esc(hintVars.name || '')) : '';
    el.classList.toggle('urgent', hintKey === 'wormed' || hintKey === 'friendWormed' || hintKey === 'kNear' || hintKey === 'kStill' || hintKey === 'latched' || hintKey === 'friendLatched' || hintKey === 'rotting');
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
    hint(key, vars = {}) { hintKey = key; hintVars = vars; renderHint(); },
    /** dark: the edges closing in (0..1); red: the throb of something in your head (0..1); bpm: its beat */
    dread(dark, red, bpm) {
      const s = $('dread').style;
      s.setProperty('--dk', dark.toFixed(2)); s.setProperty('--rd', red.toFixed(2));
      const beat = `${(60 / Math.max(40, bpm)).toFixed(2)}s`;
      if (beat !== lastBeat) { lastBeat = beat; s.setProperty('--beat', beat); }
    },
    /** a flash of the whole screen: a colour, held for ms, then gone */
    flash(color = '#fff', strength = 0.5, ms = 80) {
      const f = $('dread').querySelector('.fl');
      f.style.setProperty('--flc', color); f.classList.add('now'); f.style.opacity = strength;
      clearTimeout(flashTimer); flashTimer = setTimeout(() => { f.classList.remove('now'); f.style.opacity = 0; }, ms);
    },
    use(label) { useLabel = label; renderHint(); },
    fade(to, dur = 0.6, delay = 0) { const f = $('fade'); f.style.transition = dur ? `opacity ${dur}s ease ${delay}s` : 'none'; if (!dur) void f.offsetWidth; f.style.opacity = to; },
    tags(list) {
      const seen = new Set();
      for (const t of list) { seen.add(t.id); let el = tagEls.get(t.id); if (!el) { el = document.createElement('span'); el.textContent = t.name; $('tags').appendChild(el); tagEls.set(t.id, el); } el.style.left = `${t.x}px`; el.style.top = `${t.y}px`; }
      for (const [id, el] of tagEls) if (!seen.has(id)) { el.remove(); tagEls.delete(id); }
    },
    toast(text) { const t = $('toast'); t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4200); },
    end(s) { showEnd(s); },
    /** how much of you is left to the rot (1 .. 0), a sick ring over the head */
    rot(k, at) { const el = $('rotring'); if (k == null || !at) { el.hidden = true; return; } el.hidden = false; el.style.left = `${at[0]}px`; el.style.top = `${at[1] - 30}px`; el.style.setProperty('--b', k.toFixed(3)); },
    /** the breath left (0..1) in a ring over the doll's head; null hides it */
    breath(k, at) { const el = $('breath'); if (k == null || !at) { el.hidden = true; return; } el.hidden = false; el.style.left = `${at[0]}px`; el.style.top = `${at[1]}px`; el.style.setProperty('--b', k.toFixed(3)); el.classList.toggle('low', k < 0.3); },
    /** the card between chapters: the last one's lines, then the next one's name; then() starts it */
    between({ num, name, lines }, then) {
      const el = $('between');
      $('bwWas').textContent = (lines || []).join('\n'); $('bwNum').textContent = `CHAPTER ${num}`; $('bwName').textContent = name;
      el.hidden = false; void el.offsetWidth; el.classList.add('on');
      sfx.play('whisper', { vol: 0.5 });
      setTimeout(() => { then(); setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.hidden = true; }, 1000); }, 400); }, 4600);
    },
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
    if (s !== 'play') { hud.tags([]); hud.dread(0, 0, 60); sfx.drone(0); sfx.duck(1); $('trial').hidden = true; } else if (typeof renderTrial === 'function' && trialReady) renderTrial();
  }
  // ---- journeys: every lantern saves to the journey being played (alone, or as host or guest)
  saves.useStorage(portal.portalStorage?.());
  game.onSave = (s) => { if (net.online && !net.isHost) { saves.write('g', s); return; } let slot = saves.current(); if (slot < 0) { slot = saves.freeSlot(); saves.setCurrent(slot); } saves.write(slot, s); refreshMenu(); };
  game.goreMode = store.get('tb.gore', portal.ON_CRAZY ? 'stitched' : 'full');
  function refreshMenu() {
    const s = saves.read(saves.current());
    show('mContinue', !!s && !s.done);
    if (s) $('mContinueS').textContent = saves.describe(s);
    $('mSolo').classList.toggle('primary', !s || !!s.done);
    $('mSolo').textContent = s ? 'NEW JOURNEY ALONE' : 'SET OUT ALONE';
  }
  function attract() { const s = saves.read(saves.current()); game.start({ order: soloOrder(), meId: 'me', attract: true, chapter: s && !s.done ? s.ci : 0 }); }
  function toMenu() { show('pause', false); show('together', false); show('journeys', false); attract(); setState('menu'); refreshMenu(); }
  /** alone: a new journey (fresh), or from a save ({ ci, lantern, deaths, cuts, time, found }) */
  function playSolo(fresh, from = null) {
    sfx.init(); sfx.play('select');
    if (fresh && !from) { const slot = saves.freeSlot(); saves.erase(slot); saves.setCurrent(slot); }
    const ci = from ? from.ci ?? 0 : 0;
    if (from || fresh || !game.running || !game.attract || game.n !== 1 || game.ci !== 0) game.start({ order: soloOrder(), meId: 'me', runT0: 0, chapter: ci, cp: from?.lantern ?? 0, deaths: from?.deaths ?? 0, cut: from?.cuts ?? 0, found: from?.found ?? [] }); else game.begin();
    game.timeBefore = from?.time ?? 0;
    game.Tlocal = game.Tlocal || 0;
    if (fresh || from || game.runT0 == null) game.runT0 = game.T();
    setState('play');
    game.saveNow();
  }
  $('mContinue').addEventListener('click', () => { const s = saves.read(saves.current()); if (s) playSolo(false, s); });
  // ---- the journeys panel: three slots, and every chapter reached
  function renderJourneys() {
    const ol = $('jSlots'); ol.innerHTML = '';
    saves.all().forEach((s, i) => {
      const li = document.createElement('li'); if (!s) li.className = 'empty';
      const w = document.createElement('div'); w.className = 'what';
      const b = document.createElement('b'); b.textContent = s ? `${i === saves.current() ? '▸ ' : ''}JOURNEY ${i + 1}  ·  ${saves.describe(s)}${s.done ? '  ·  ENDED' : ''}` : `JOURNEY ${i + 1}  ·  not begun`;
      const sm = document.createElement('small'); sm.textContent = s ? saves.stats(s) : '';
      w.append(b, sm); li.appendChild(w);
      const go = document.createElement('button'); go.className = 'btn small'; go.textContent = s ? (s.done ? 'AGAIN' : 'GO ON') : 'BEGIN';
      go.addEventListener('click', () => { saves.setCurrent(i); show('journeys', false); if (s && !s.done) playSolo(false, s); else { saves.erase(i); saves.setCurrent(i); firstStory(() => playSolo(false, { ci: 0 })); } });
      li.appendChild(go);
      if (s) { const x = document.createElement('button'); x.className = 'btn small ghost'; x.textContent = 'FORGET'; x.addEventListener('click', () => { if (x.dataset.sure) { saves.erase(i); renderJourneys(); refreshMenu(); } else { x.dataset.sure = '1'; x.textContent = 'SURE?'; } }); li.appendChild(x); }
      ol.appendChild(li);
    });
    const ch = $('jChapters'); ch.innerHTML = '';
    const top = saves.reached();
    CHAPTERS.forEach((C, i) => {
      const li = document.createElement('li'); if (i > top) li.className = 'locked';
      const w = document.createElement('div'); w.className = 'what';
      const b = document.createElement('b'); b.textContent = i > top ? `${C.num}  ·  ? ? ?` : `${C.num}  ·  ${C.name}`;
      const sm = document.createElement('small'); sm.textContent = `act ${['', 'I', 'II', 'III', 'IV', 'V'][C.act]}`;
      w.append(b, sm); li.appendChild(w);
      if (i <= top) { const go = document.createElement('button'); go.className = 'btn small'; go.textContent = 'PLAY'; go.addEventListener('click', () => { show('journeys', false); if (saves.current() < 0) saves.setCurrent(saves.freeSlot()); const s = saves.read(saves.current()) || {}; playSolo(false, { ci: i, lantern: 0, deaths: s.deaths || 0, cuts: s.cuts || 0, time: s.time || 0, found: s.found || [] }); }); li.appendChild(go); }
      ch.appendChild(li);
    });
  }
  $('mJourneys').addEventListener('click', () => { sfx.init(); sfx.play('click'); renderJourneys(); show('journeys', true); });
  $('jBack').addEventListener('click', () => { sfx.play('click'); show('journeys', false); });
  // ---- the story: told once, before the first journey (and again from i)
  let storyTimer = 0, afterStory = null;
  function showStory(then) {
    afterStory = then;
    const ps = [...$('taleLines').children];
    ps.forEach((p) => p.classList.remove('on'));
    show('story', true);
    let i = 0;
    clearInterval(storyTimer);
    const next = () => { if (i < ps.length) ps[i++].classList.add('on'); else clearInterval(storyTimer); };
    next(); storyTimer = setInterval(next, 2300);
    sfx.init(); sfx.play('whisper', { vol: 0.6 });
  }
  function endStory() { clearInterval(storyTimer); show('story', false); store.set('tb.story', '1'); const f = afterStory; afterStory = null; if (f) f(); }
  $('sBegin').addEventListener('click', () => { sfx.play('select'); endStory(); });
  $('sSkip').addEventListener('click', () => { sfx.play('click'); endStory(); });
  const firstStory = (then) => (store.get('tb.story', '') ? then() : showStory(then));

  // ---- the trial: the first journey alone teaches the six things you need, one at a time
  const TRIAL = [
    { t: 'Walk', k: ['A  D   or   ← →', 'push the stick'], done: (b, g, s) => Math.abs(b.x - s.x0) > 3 },
    { t: 'Jump', k: ['SPACE', 'JUMP'], done: (b, g, s) => s.jumped },
    { t: 'Climb', k: ['jump at a ledge and keep pushing toward it', 'jump at a ledge and keep pushing toward it'], done: (b, g, s) => s.mantled },
    { t: 'Creep', k: ['hold S while you walk. Creeping makes no sound', 'pull the stick down while you walk. Creeping makes no sound'], done: (b, g, s) => s.crept > 0.9 },
    { t: 'Hold fast', k: ['hold SHIFT: you brace, and the thread holds', 'hold HOLD: you brace, and the thread holds'], done: (b, g, s) => s.braced > 0.7 },
    { t: 'Your spool', k: ['E sets it down. E again calls it back', 'USE sets it down. USE again calls it back'], done: (b, g, s) => s.spoolBack },
  ];
  let trial = null;
  trialReady = true;
  function startTrial() { trial = { step: 0, x0: null, jumped: false, mantled: false, crept: 0, braced: 0, spoolSet: false, spoolBack: false, doneT: 0 }; renderTrial(); }
  function renderTrial() {
    const el = $('trial');
    if (!trial || state !== 'play') { el.hidden = true; return; }
    el.hidden = false;
    if (trial.step >= TRIAL.length) { el.classList.add('done'); $('trN').textContent = 'THE TRIAL IS DONE'; $('trT').textContent = 'Now find the Great Spindle'; $('trK').textContent = 'and do not let go'; return; }
    el.classList.remove('done');
    const s = TRIAL[trial.step];
    $('trN').textContent = `TRIAL ${trial.step + 1} / ${TRIAL.length}`; $('trT').textContent = s.t; $('trK').textContent = s.k[touchUI ? 1 : 0];
  }
  function tickTrial(dt) {
    if (!trial || state !== 'play' || game.attract || !game.running || game.n !== 1) return;
    const b = game.me.b, sp = game.spool;
    if (trial.x0 === null) trial.x0 = b.x;
    if (b.jumped || (!b.ground && b.vy > 3 && !b.hang)) trial.jumped = true;
    if (b.mantle) trial.mantled = true;
    if (b.sneak && Math.abs(b.vx) > 0.3) trial.crept += dt;
    if (b.braced) trial.braced += dt;
    if (sp && sp.mode === 'planted') trial.spoolSet = true;
    if (sp && trial.spoolSet && sp.mode === 'follow') trial.spoolBack = true;
    if (trial.step < TRIAL.length) {
      if (TRIAL[trial.step].done(b, game, trial)) { trial.step++; sfx.play('chime', { vol: 0.8 }); renderTrial(); if (trial.step >= TRIAL.length) store.set('tb.trial', 'done'); }
    } else if ((trial.doneT += dt) > 6) { trial = null; renderTrial(); }
  }

  $('mSolo').addEventListener('click', () => firstStory(() => { playSolo(false); if (store.get('tb.trial', '') !== 'done') startTrial(); }));

  // ---- i: the story, the goal, how to play, what hunts you
  let infoPaused = false;
  function openInfo() {
    $('iKeys').innerHTML = touchUI ? '<b>STICK</b><span>walk, swing on the thread; up and down to climb it; down creeps</span><b>JUMP</b><span>jump, let go of the thread; hammer it to tear out a worm</span><b>HOLD</b><span>brace: hold the thread fast</span><b>USE</b><span>levers; your spool; rip a worm out of a friend</span>'
      : '<b>A D / ← →</b><span>walk, swing on the thread</span><b>SPACE</b><span>jump, let go of the thread; hammer it to tear out a worm</span><b>W S / ↑ ↓</b><span>climb the thread; S creeps on the ground</span><b>SHIFT</b><span>brace: hold the thread fast</span><b>E</b><span>levers; your spool; rip a worm out of a friend</span><b>I</b><span>this page</span><b>ESC</b><span>pause</span>';
    show('info', true);
    infoPaused = state === 'play' && !net.online;
    if (infoPaused) { game.paused = true; input.enabled = false; }
  }
  function closeInfo() { show('info', false); if (infoPaused) { game.paused = false; input.enabled = true; infoPaused = false; } }
  $('mInfo').addEventListener('click', () => { sfx.init(); sfx.play('click'); openInfo(); });
  $('bInfo').addEventListener('click', () => { sfx.play('click'); openInfo(); });
  $('iClose').addEventListener('click', () => { sfx.play('click'); closeInfo(); });
  $('iStory').addEventListener('click', () => { sfx.play('click'); show('info', false); showStory(() => { if (infoPaused) show('info', true); else openInfo(); }); });
  $('iTrial').addEventListener('click', () => { sfx.play('select'); closeInfo(); if (net.online) return; playSolo(true); startTrial(); });
  addEventListener('keydown', (e) => { if (e.code !== 'KeyI' || (e.target && e.target.tagName === 'INPUT') || !$('story').hidden) return; if (!$('info').hidden) closeInfo(); else if ($('pause').hidden) openInfo(); });

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
  const goreUI = () => { const full = game.goreMode !== 'stitched'; $('sGore').textContent = full ? 'FULL' : 'STITCHED'; $('sGoreS').textContent = full ? 'red dye, torn limbs' : 'grey stuffing, nothing torn off'; };
  goreUI();
  $('sGore').addEventListener('click', () => { sfx.play('click'); game.goreMode = game.goreMode === 'stitched' ? 'full' : 'stitched'; store.set('tb.gore', game.goreMode); game.gore.setting = game.goreMode; goreUI(); });
  addEventListener('keydown', (e) => { if (e.code !== 'Escape' && e.code !== 'KeyP') return; if (e.target && e.target.tagName === 'INPUT') return; if (!$('info').hidden) { closeInfo(); return; } if (!$('pause').hidden) closePause(); else if (state === 'play') openPause('PAUSED'); });
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
    if (!store.get('tb.story', '')) { showStory(() => $('mTogether').click()); return; }
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
    $('lFromBox').hidden = !net.isHost;
    if (net.isHost && !$('lFrom').options.length) {
      const sel = $('lFrom'), cur = saves.read(saves.current());
      const add = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); };
      if (cur && !cur.done && (cur.ci || cur.lantern)) add('save', `where you left off: ${saves.describe(cur)}`);
      CHAPTERS.forEach((C, i) => { if (i <= saves.reached()) add(String(i), `chapter ${C.num}  ·  ${C.name}`); });
    }
    $('lStart').textContent = n > 1 ? `SET OUT, ${['', '', 'TWO', 'THREE', 'FOUR'][n]} TOGETHER` : 'SET OUT ALONE';
    $('lNote').textContent = net.isHost ? (n > 1 ? `The Loom will be built for ${n}: every one of you will be needed.` : 'Share the code. The Loom is built for however many set out.') : 'Waiting for the one who leads to set out.';
    portal.inRoom(net.code, n < 4 && !net.run);
  }
  $('lStart').addEventListener('click', () => {
    sfx.play('select');
    const v = $('lFrom').value || '0', cur = saves.read(saves.current());
    if (v === 'save' && cur) net.send('start', { chapter: cur.ci, cp: cur.lantern, deaths: cur.deaths, time: cur.time, found: cur.found });
    else { if (saves.current() < 0 || (cur && +v === 0)) { const slot = saves.freeSlot(); saves.erase(slot); saves.setCurrent(slot); } net.send('start', { chapter: +v, cp: 0, deaths: 0, time: 0 }); }
  });
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
    game.start({ order, meId: net.id, startedAt: run.startedAt, runT0: 0, chapter: run.chapter | 0, cp: run.cp | 0, deaths: run.deaths | 0, found: run.found || [] });
    game.timeBefore = run.time | 0;
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
    tickTrial(dt);
    frames++; fpsT += rawDt;
    if (fpsT > 2) { const fps = frames / fpsT; frames = 0; fpsT = 0; window.__tb.fps = fps; if (qual === 'auto' && fps < 38 && device.maxPixelRatio > 0.8) { if (++slow >= 2) { device.maxPixelRatio = Math.max(0.75, device.maxPixelRatio - 0.25); app.resizeCanvas(); slow = 0; } } else slow = 0; }
  });
  app.start();
  stage('', 1);
  refreshMenu();
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
