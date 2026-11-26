// 8. THE GRANARY OF GNAWERS: silos full of rats, a living flood that pours over anything dark. Light
// holds them back, and a lamp's light is small: carry it, all of you inside it; toss it over a gap you
// must jump (you cannot jump with it); then climb the silo ahead of the tide of them.
export default {
  id: 'granary', num: 8, act: 3, name: 'THE GRANARY OF GNAWERS',
  card: ['They ate the grain.', 'Then they ate what came for the grain.'],
  build(k) {
    const { L, n, solo, solid, ground, cp, deco, hint, zone, begin, exit, deadDoll } = k;
    const y = 0;
    begin('THE GRANARY OF GNAWERS', 0, 30);
    ground(0, 52, y);
    solid(-2, 7, 83, 30); // the granary's roof, low and dark
    // 1. the first lamp, and the floor that moves
    L.lamps.push({ x: 8, y, r: 2.7 });
    if (n >= 3) L.lamps.push({ x: 9.6, y, r: 2.7 });
    hint(4, 12, solo ? 'lamp' : 'lampAll');
    L.swarms.push({ x0: 12.5, x1: 44, y, trigger: 13.5 });
    deco('ratholes', 12.5, y); deco('ratholes', 44, y);
    deco('sacks', 20, y); deco('sacks', 33, y, { s: 1.3 });
    deadDoll(27, y, { stripped: true });
    cp(47.5, y, 'THE GAP');
    // 2. the gap: toss the lamp over, jump into its light, take it up again
    solid(52, -30, 53.8, -8, { ground: true });
    L.kill.push({ x0: 52, x1: 53.8, y0: -30, y1: -4, why: 'fell' });
    deco('spikes', 52, -8, { w: 1.8 });
    ground(53.8, 84, y);
    L.swarms.push({ x0: 49.5, x1: 79.5, y, trigger: 50.5, gaps: [[52, 53.8]] });
    deco('ratholes', 79.5, y);
    hint(49, 52.2, 'toss');
    deco('sacks', 62, y); deco('sacks', 71, y, { s: 0.8 });
    cp(82, y, 'THE SILO');
    // 3. the silo: up and up, ahead of the tide of them
    for (let i = 0; i < 6; i++) solid(84 + i * 2, -30, 86 + i * 2, 1.4 * (i + 1), { ground: true });
    const yT = 8.4;
    ground(96, 130, yT);
    solid(83, 12.5, 150, 40); // the silo's roof, high up
    L.waters.push({ id: 'tide', kind: 'race', look: 'rats', x0: 82.5, x1: 96, y0: -1.5, y1: yT + 0.4, rate: 0.62, trigger: 84.5, floor: -1.5 });
    hint(82.5, 88, 'tide');
    exit(110, yT);
    zone('granary', -14, L.x1);
  },
};
