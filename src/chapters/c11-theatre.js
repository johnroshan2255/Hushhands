// 11. THE MARIONETTE THEATRE: an old puppet stage. The Puppeteer lives in the rafters and its light
// sweeps the boards; whoever it catches gets a grub, and a grubbed doll's controls are swapped. A
// flame burns a grub off. Some doors only open for a puppet. Cut its strings, and the whole theatre,
// which it was holding up, swings over.
export default {
  id: 'theatre', num: 11, act: 4, name: 'THE MARIONETTE THEATRE',
  card: ['It held the house up by its strings.', 'It let go.'],
  build(k) {
    const { L, n, solo, solid, ground, cp, gate, deco, hint, zone, begin, exit, deadDoll } = k;
    const y = 0;
    const trap = (x0, x1) => { L.solids.push({ x0, y0: y - 30, x1, y1: y - 6, ground: true }); L.kill.push({ x0, x1, y0: y - 30, y1: y - 3, why: 'fell' }); deco('spikes', x0, y - 6, { w: x1 - x0 }); return [x0, x1]; };
    const pup = (x, o) => L.monsters.push({ kind: 'puppeteer', id: `p${L.monsters.length}`, x, y: y + 5.9, floor: y, gate: 'strings', ...o });
    begin('THE MARIONETTE THEATRE', 0, 30);
    solid(-2, 9.2, 110, 30); // the rafters' roof
    // the stage, with trapdoors in it
    const holes = [[16, 17.5], [27, 28.5], [47.6, 48.9]];
    let x = 0;
    for (const [a, c] of holes) { ground(x, a, y); trap(a, c); x = c; }
    ground(x, 100, y);
    deco('curtains', 6, y, { w: 32 }); deco('curtains', 41, y, { w: 18 }); deco('curtains', 62, y, { w: 18 });
    // 1. the eye and its light, sweeping the stage; candles at each end to burn a grub off
    pup(22, { x0: 8.5, x1: 35.5, period: 7.5 });
    L.candles.push({ x: 7, y }, { x: 37, y });
    hint(3, 10, 'eye');
    deadDoll(24, y, { strings: true });
    cp(39.5, y, 'THE PUPPET DOOR');
    // 2. the puppet door: only a puppet opens it. Stand in the spotlight; walk onto the plate swapped
    pup(46, { fixed: 45.2, x0: 45.2, x1: 45.2, w: 0.8 });
    L.plates.push({ id: 'pd', x: 51, y, w: 1.5, grub: true });
    gate(53.4, y, 'pd', 6);
    solid(53.4, 6, 54.1, 9.2);
    L.candles.push({ x: 56.5, y });
    hint(40, 46, 'puppet');
    cp(59.5, y, 'THE STRINGS');
    // 3. the strings: every lever at once, under its light
    pup(69, { x0: 61, x1: 77, period: 6.2 });
    if (solo) { L.plates.push({ id: 'strings', x: 66, y, w: 1.5 }); L.levers.push({ id: 'strings', x: 71.5, y }); }
    else for (let i = 0; i < n; i++) L.levers.push({ id: 'strings', x: 65 + (i * 8) / Math.max(1, n - 1), y });
    L.candles.push({ x: 61.5, y });
    hint(60, 64, solo ? 'strings1' : 'strings');
    gate(79, y, 'strings', 7);
    solid(79, 7, 79.7, 9.2);
    exit(84, y);
    zone('theatre', -14, L.x1);
  },
};
