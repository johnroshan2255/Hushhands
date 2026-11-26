// 6. THE GEAR ROOM: the Loom's clockwork, flooded and still turning. Up the cogs, ahead of the water.
export default {
  id: 'gears', num: 6, act: 2, name: 'THE GEAR ROOM',
  card: ['The Loom still turns.', 'It does not need you to.'],
  build(k) {
    const { L, solid, ground, platesAt, gate, deco, hint, zone, begin, exit } = k;
    let y = 0;
    begin('THE GEAR ROOM', 0, 30);
    const xg = 7.5;
    ground(0, xg + 21.6, y);
    L.waters.push({ id: 'race', kind: 'race', x0: 0, x1: xg + 21.6, y0: y - 3.4, y1: y + 6.4, rate: 0.3, trigger: xg + 1.5, floor: y });
    solid(xg + 3, y, xg + 6, y + 1.0);
    L.cogs.push({ x: xg + 9.3, y: y + 2.5, r: 1.75, pads: 3, period: 8, dir: 1 });
    solid(xg + 12.2, y + 3.55, xg + 15.4, y + 3.95, { thin: true });
    L.cogs.push({ x: xg + 18.6, y: y + 5.3, r: 1.75, pads: 3, period: 8, dir: -1 });
    const yT = y + 7.3;
    solid(xg - 0.8, y + 3.2, xg, y + 30); // the room's near wall (you come in under it)
    deco('bigcog', xg + 9.3, y + 2.5, { r: 2.5, period: 8, dir: 1 }); deco('bigcog', xg + 18.6, y + 5.3, { r: 2.5, period: 8, dir: -1 }); deco('bigcog', xg + 14, y + 9, { r: 5, far: true, period: 20, dir: 1 }); deco('bigcog', xg + 3, y + 6.5, { r: 3.2, far: true, period: 12.8, dir: -1 });
    hint(xg - 3, xg + 8, 'water');
    y = yT;
    const p4 = platesAt(xg + 24.4, y, 'g4');
    ground(xg + 21.6, p4 + 20, y);
    gate(p4 + 3.2, y, 'g4');
    deco('arch', p4 + 3.55, y);
    exit(p4 + 8, y);
    zone('gears', -14, L.x1);
  },
};
