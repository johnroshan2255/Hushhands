// 5. THE DROWNED MILL: the mill has flooded and it is still filling. Swim, and hold your breath under
// it; push a crate into the water and it floats; eels light up before they strike, and a wet thread
// carries the shock to everyone tied; the Cistern locks behind you and fills to the roof.
export default {
  id: 'mill', num: 5, act: 2, name: 'THE DROWNED MILL',
  card: ['The mill is still filling.', 'It has been filling for a long time.'],
  build(k) {
    const { button, other, L, n, solo, solid, ground, cp, gate, deco, hint, zone, begin, exit, deadDoll } = k;
    const pool = (id, x0, x1, floor, surface) => { solid(x0, floor - 30, x1, floor, { ground: true }); L.waters.push({ id, kind: 'pool', x0, x1, y0: surface, y1: surface, floor }); };
    begin('THE DROWNED MILL', 0, 30);
    // 1. the flooded stair: swim, and dive under the wall that comes down into the water
    ground(0, 10, 0);
    pool('stair', 10, 22, -3.5, -0.4);
    solid(15, -2.2, 16.2, 6); // the wall you dive under
    solid(8, 4.5, 24, 30); // the roof over it
    hint(6, 13, 'swim'); hint(13, 16, 'dive');
    deco('pipes', 8, 4.5, { w: 16 });
    deadDoll(20.2, -3.5, { drowned: true });
    // 2. the crate: push it into the water; it floats; from its top the high ledge is in reach
    ground(22, 36, 0);
    L.crates.push({ x: 40.6, y: -1.6, w: 1.4, h: 1.2, floats: true }); // afloat, caught against the weed
    pool('crate', 36, 48, -3, -0.6);
    hint(31, 40, 'crate');
    const yH = 1.4;
    solid(48, -30, 54, yH, { ground: true });
    deco('bigcog', 42, 5, { r: 4.5, far: true, period: 30, dir: -1 });
    cp(51, yH, 'THE EELS');
    // 3. the eels: swim between their flashes; a rock to breathe on halfway
    pool('eels', 54, 72, -2.5, 1.2);
    solid(62, -30, 64, 2.0, { ground: true }); // the rock
    L.eels.push({ x: 58, y: -1.6, r: 3.6, period: 4.6, off: 0 });
    L.eels.push({ x: 68, y: -1.6, r: 3.6, period: 4.6, off: 2.3 });
    hint(51.5, 56, 'eel');
    button(2, 57.2, -2.5); // at the bottom, by the first eel
    other([{ x: 76.5, y: 2.0 }, { x: 79, y: 0 }, { x: 84, y: 0 }]);
    solid(72, -30, 78, 2.0, { ground: true });
    cp(75, 2.0, 'THE CISTERN');
    // 4. the Cistern: the door shuts behind you and the water comes in; every wheel at once
    ground(78, 98, 0);
    gate(79.3, 0, 'cin', 6, { startOpen: true });
    solid(78.5, 6, 98, 30); // its roof
    gate(95.3, 0, 'cis', 6);
    L.waters.push({ id: 'cistern', kind: 'cistern', x0: 80, x1: 95.3, y0: -0.2, y1: 5.9, floor: 0, rate: 0.24, accel: 0.012, delay: 0.4, trigger: 81.5, lock: 'cin', drain: 'cis' });
    if (solo) { L.plates.push({ id: 'cis', x: 85, y: 0, w: 1.5 }); L.levers.push({ id: 'cis', x: 92, y: 0, valve: true }); }
    else {
      // wheels at different heights: some will be under water by the time the last is reached
      const spots = [[83, 0], [89.5, 2.6], [93, 0], [86, 4.0]].slice(0, n);
      solid(88.3, 2.2, 90.7, 2.6); if (n >= 4) solid(84.8, 3.6, 87.2, 4.0);
      for (const [x, y] of spots) L.levers.push({ id: 'cis', x, y, valve: true });
    }
    hint(80, 95, solo ? 'cistern1' : 'cistern');
    // 5. the sluice: the water rises behind you as you climb
    ground(95.3, 104, 0);
    for (let i = 0; i < 6; i++) solid(104 + i * 2, -30, 106 + i * 2, 1.4 * (i + 1), { ground: true });
    solid(103, 13, 120, 30);
    const yT = 9.8;
    ground(116, 140, yT);
    L.waters.push({ id: 'sluice', kind: 'race', x0: 96, x1: 116, y0: -1.2, y1: yT + 0.6, rate: 0.55, trigger: 99.5, floor: -1.2 });
    hint(96, 104, 'sluice');
    exit(126, yT);
    zone('mill', -14, L.x1);
    void deco;
  },
};
