// 1. THE SCRAP PIT: wake, walk, jump, climb, weigh the plates. The cold open: another doll is taken.
export default {
  id: 'pit', num: 1, act: 1, name: 'THE SCRAP PIT',
  card: ['The Spindle has stopped.', 'Carry the thread to it.'],
  build(k) {
    const { L, solo, solid, ground, platesAt, gate, deco, hint, zone, begin, exit, other } = k;
    const y = 0;
    begin('THE SCRAP PIT');
    hint(1, 8, 'move');
    solid(9, y, 11.2, y + 0.8);
    hint(6.5, 14, 'jump');
    solid(15, y, 17, y + 1.0); solid(17, y, 19.5, y + 2.4);
    hint(14.2, 19, 'climb');
    deco('heap', 5, y); deco('heap', 13, y, { s: 1.4 }); deco('cage', 21.4, y);
    const p0 = platesAt(24, y, 'g0');
    hint(21, p0 + 2, solo ? 'plates1' : 'plates');
    const g0x = p0 + 3.4;
    gate(g0x, y, 'g0');
    deco('arch', g0x + 0.35, y);
    ground(0, g0x + 22, y);
    deco('heap', g0x + 9, y, { s: 0.9 });
    exit(g0x + 12, y);
    zone('pit', -14, L.x1);
    // the cold open: before you can move, one who woke before you runs past in the fog, and is taken
    L.coldOpen = { x: 9.5, y };
    other([{ x: g0x - 1.5, y, t: 0 }, { x: g0x + 10, y, t: 2 }], { after: 'g0' });
  },
};
