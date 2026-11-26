// 2. THE MEADOW OF PINS: grass full of jaw traps, some sunk out of sight; the first worm bed.
export default {
  id: 'meadow', num: 2, act: 1, name: 'THE MEADOW OF PINS',
  card: ['The grass remembers every foot.'],
  build(k) {
    const { button, other, L, solid, ground, deco, zone, begin, exit, deadDoll } = k;
    const y = 0;
    begin('THE MEADOW OF PINS');
    const m0 = 6;
    ground(0, m0 + 96, y);
    // every other trap lies under the grass and only shows itself when you are all but on it
    for (const [i, dx] of [5, 10.4, 14, 20.5, 25, 28.6].entries()) L.traps.push({ x: m0 + dx, y, hidden: i % 2 === 1 });
    deco('grass', m0 - 2, y, { w: 36 });
    deadDoll(m0 + 17.2, y, { trap: true });
    for (const [i, dx] of [36, 40.2, 44.4].entries()) L.worms.push({ x: m0 + dx, y, dir: 1, period: 3.4, up: 1.1, off: i * 1.1, len: 2.6 });
    deco('bones', m0 + 33, y); deco('tree', m0 + 31, y); deco('tree', m0 + 48.5, y, { s: 1.3 }); deco('tree', m0 + 8, y, { s: 1.6, far: true }); deco('tree', m0 + 19, y, { s: 1.1, far: true });
    solid(36.6, y + 2.0, 38.6, y + 2.4, { thin: true }); button(3, 37.6, y + 2.4); // up in the tree
    other([{ x: m0 + 30, y }, { x: m0 + 52, y }]);
    // the stumps: old posts standing in a bed of sunk traps; from one to the next, never between
    for (const [i, dx] of [58, 61.2, 64.4, 67.6, 70.8].entries()) { solid(m0 + dx, y, m0 + dx + 1.3, y + 0.6 + (i % 2) * 0.3); if (i < 4) L.traps.push({ x: m0 + dx + 2.25, y, hidden: true }); }
    L.traps.push({ x: m0 + 56.5, y, hidden: true });
    deco('grass', m0 + 54, y, { w: 22 }); deco('tree', m0 + 70, y, { s: 0.9, far: true });
    exit(m0 + 82, y);
    zone('meadow', -14, L.x1);
  },
};
