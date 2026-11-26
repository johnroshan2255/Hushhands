// 15. THE MOTH TOWER AND THE GREAT SPINDLE: the last climb, up the inside of the Spindle's tower, with
// moths at every light and the Moth Mother filling the shaft below and rising. At the top: the
// Weaver, half eaten, still stitching. The Spindle. The crack of daylight. The choice.
export default {
  id: 'spindle', num: 15, act: 5, name: 'THE MOTH TOWER',
  card: ['The Spindle.', 'And a crack of something pale above it.'],
  build(k) {
    const { button, other, L, nb, n, solo, solid, ground, cp, deco, hint, zone, begin } = k;
    const y = 0;
    const moths = (x, yy) => L.monsters.push({ kind: 'moths', id: `m${L.monsters.length}`, x, y: yy + 1.4 });
    begin('THE MOTH TOWER', 0, 60);
    ground(0, 28, y);
    hint(2, 9, 'tower');
    // up the shaft: ledges on alternating sides, each a jump and a grab above the last; a candle at
    // two of them, and moths at the lights
    const H = 2.4, P = 14;
    for (let i = 1; i <= P; i++) {
      const left = i % 2 === 1, yy = i * H;
      if (left) solid(13.6, yy - 0.5, 26, yy, { ground: true, ledge: true }); else solid(2, yy - 0.5, 12.4, yy, { ground: true, ledge: true });
      if (i === 5 || i === 10) { const cx = left ? 24.6 : 3.2; L.candles.push({ x: cx, y: yy }); moths(left ? 17.5 : 8.5, yy); if (n >= 3) moths(left ? 21 : 6, yy + 1); cp(left ? 23 : 5, yy, i === 5 ? 'THE FIRST LANDING' : 'THE SECOND LANDING'); }
    }
    const hy = (P + 1) * H;
    const top = hy;
    // the Mother: rising from the bottom of the shaft once you set foot on the stair, faster as she comes
    L.waters.push({ id: 'mother', kind: 'race', look: 'mother', x0: -0.5, x1: 28, y0: y - 6, y1: top - 0.6, rate: 0.5, accel: 0.006, delay: 3, trigger: 5, anyY: true, floor: y - 6 });
    // the top: the Spindle (wind it), the Weaver, the crack of daylight (cut the thread and go)
    solid(28, -30, 40, top - 0.5); // the tower's far wall
    solid(13.6, top - 0.5, 70, top, { ground: true }); // the top, reached from the last ledge
    solid(40, top - 30, 70, top - 0.5);
    solid(-14, top + 11, 70, top + 40);
    const tx = 24;
    cp(tx, top, 'THE GREAT SPINDLE');
    hint(tx - 2, tx + 30, solo ? 'choice1' : 'choice');
    const sx = tx + 10;
    deco('spindle', sx, top);
    L.ends.push({ kind: 'wind', x0: sx - 3.2, x1: sx + 3.2, y: top });
    deco('weaver', tx + 4, top);
    L.ends.push({ kind: 'unpick', x0: tx + 2.8, x1: tx + 5.2, y: top });
    deco('daylight', tx + 24, top);
    L.ends.push({ kind: 'cut', x0: tx + 21.5, x1: tx + 26.5, y: top });
    other([{ x: tx + 17, y: top }, { x: tx + 24, y: top }]);
    solid(tx + 27, top, tx + 40, top + 11);
    L.x1 = tx + 40;
    zone('tower', -14, L.x1);
    void nb; void deco;
  },
};
