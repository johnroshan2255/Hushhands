// 2. THE MEADOW OF PINS: grass full of jaw traps, some sunk out of sight; the first worm bed.
export default {
  id: 'meadow', num: 2, act: 1, name: 'THE MEADOW OF PINS',
  card: ['The grass remembers every foot.'],
  build(k) {
    const { L, ground, deco, zone, begin, exit, deadDoll } = k;
    const y = 0;
    begin('THE MEADOW OF PINS');
    const m0 = 6;
    ground(0, m0 + 70, y);
    // every other trap lies under the grass and only shows itself when you are all but on it
    for (const [i, dx] of [5, 10.4, 14, 20.5, 25, 28.6].entries()) L.traps.push({ x: m0 + dx, y, hidden: i % 2 === 1 });
    deco('grass', m0 - 2, y, { w: 36 });
    deadDoll(m0 + 17.2, y, { trap: true });
    for (const [i, dx] of [36, 40.2, 44.4].entries()) L.worms.push({ x: m0 + dx, y, dir: 1, period: 3.4, up: 1.1, off: i * 1.1, len: 2.6 });
    deco('bones', m0 + 33, y); deco('tree', m0 + 31, y); deco('tree', m0 + 48.5, y, { s: 1.3 }); deco('tree', m0 + 8, y, { s: 1.6, far: true }); deco('tree', m0 + 19, y, { s: 1.1, far: true });
    exit(m0 + 54, y);
    zone('meadow', -14, L.x1);
  },
};
