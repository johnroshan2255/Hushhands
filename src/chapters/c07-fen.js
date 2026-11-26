// 7. THE FEN OF DRINKERS: a marsh where the dye runoff collects. Drinkers, mosquitoes the size of dogs,
// hunt by warmth and light, and the thread is both. Smother your glow in the mud; lure them into
// flames; cross the bog stone to stone while you are dark.
export default {
  id: 'fen', num: 7, act: 2, name: 'THE FEN OF DRINKERS',
  card: ['They are drawn to the thread.', 'To what keeps you alive.'],
  build(k) {
    const { L, n, solo, solid, ground, cp, deco, hint, zone, begin, exit, deadDoll } = k;
    const y = 0;
    // more lit threads draw more of them: one more for each past two
    const extra = Math.max(0, n - 2);
    const drinker = (x, yy, o = {}) => L.monsters.push({ kind: 'drinker', id: `d${L.monsters.length}`, x, y: yy, ...o });
    const mud = (x0, x1) => { L.mud.push({ x0, x1, y }); deco('mud', x0, y, { w: x1 - x0 }); };
    const candle = (x, yy = y) => L.candles.push({ x, y: yy });
    begin('THE FEN OF DRINKERS');
    ground(0, 98, y);
    // 1. from afar: one feeds on a bird in the light, high in a dead tree; it pays you no mind
    hint(3, 15, 'fen');
    deco('tree', 19, y, { s: 1.5 }); deco('bird', 19.4, y + 4.55);
    drinker(19.6, y + 5.25, { perch: true, feeding: true, wake: 3.2, x0: 10, x1: 30 });
    deco('reeds', 8, y, { w: 10 });
    // 2. the mud: smother the glow; one sleeps in the reeds ahead
    mud(26, 31);
    hint(23.5, 32, 'mud');
    deco('reeds', 34, y, { w: 14 });
    drinker(40, y + 1.4, { perch: true, wake: 4.3, x0: 30, x1: 50 });
    deadDoll(36.5, y, { drained: true });
    cp(48, y, 'THE CANDLES');
    // 3. the candle: let it chase you through the flame
    candle(56);
    drinker(61, y + 2.5, { x0: 52, x1: 68 });
    hint(49, 57, 'candle');
    deco('reeds', 62, y, { w: 6 });
    cp(68, y, 'THE TWO');
    // 4. two at once (and more, for more of you)
    candle(74); candle(77.5);
    drinker(83, y + 2.4, { x0: 72, x1: 92 });
    drinker(88.5, y + 3.0, { x0: 72, x1: 94 });
    for (let i = 0; i < extra; i++) drinker(91 + i * 1.5, y + 3.6, { x0: 72, x1: 94 });
    mud(91.5, 94.5);
    cp(96, y, 'THE BOG');
    mud(96.6, 97.9);
    // 5. the bog: stone to stone, dark, under one that hovers; a muddy island halfway
    const b0 = 98, b1 = 126;
    solid(b0, y - 30, b1, y - 3.2, { ground: true }); // the bog's bed
    L.waters.push({ id: 'bog', kind: 'bog', x0: b0, x1: b1, y0: y - 0.45, y1: y - 0.45, floor: y - 3.2 });
    const stones = [[99.6, 100.8], [102.1, 103.3], [104.6, 105.8], [107.1, 108.2], [109.5, 113], [114.3, 115.5], [116.8, 118], [119.3, 120.5], [121.8, 123], [124.3, 125.2]];
    for (const [a, c] of stones) solid(a, y - 3.2, c, y - 0.02, { ground: true, stone: true });
    mud(110.2, 112.6);
    drinker(106, y + 3.1, { x0: 98, x1: 126, sight: 7 });
    drinker(118, y + 3.3, { x0: 98, x1: 126, sight: 7 });
    hint(96.5, 101, 'bog');
    deco('reeds', 100, y - 0.4, { w: 24, far: true });
    ground(b1, 200, y);
    cp(129, y, 'THE SWARM');
    // 6. the swarm: everyone dark, crossing in turns
    mud(131, 134.5); mud(143, 145.5); mud(153, 155.5);
    hint(129.5, 136, solo ? 'dark1' : 'dark');
    for (const [x, yy] of [[140, 2.8], [148.5, 2.4], [157, 3.1]]) drinker(x, y + yy, { x0: 132, x1: 166, sight: 6.5 });
    for (let i = 0; i < extra; i++) drinker(151 + i * 3, y + 3.8, { x0: 132, x1: 166, sight: 6.5 });
    deco('reeds', 136, y, { w: 26 });
    deco('tree', 162, y, { s: 1.2 });
    exit(168, y);
    zone('fen', -14, L.x1);
  },
};
