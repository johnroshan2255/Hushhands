// 9. THE DYE-WORKS: here the red was made. Fumes to hold your breath through; rot-blooms that burst
// when you come near and put the rot in you, and the rot goes down the thread into the others; clean
// water washes it; vats of red under walkways, and presses that come down on a beat.
export default {
  id: 'dyeworks', num: 9, act: 3, name: 'THE DYE-WORKS',
  card: ['The rot went down the thread.', 'Into the others.'],
  build(k) {
    const { L, n, solid, ground, cp, deco, hint, zone, begin, exit, deadDoll } = k;
    const y = 0;
    const bloom = (x, yy = y, r = 1.9) => L.blooms.push({ x, y: yy, r });
    begin('THE DYE-WORKS', 0, 30);
    ground(0, 60.5, y);
    solid(-2, 8, 70, 30); // the works' roof
    // 1. the fumes: hold your breath and keep going
    L.fumes.push({ x0: 8, x1: 22.5, y0: y, y1: y + 3.4 });
    solid(12, y, 13.2, y + 0.8); solid(17, y, 18, y + 1.1);
    hint(3.5, 9, 'fumes');
    // 2. the blooms: jump clear over them
    deadDoll(24.2, y, { rot: true });
    bloom(28.5); bloom(32.5); bloom(36.5);
    hint(24, 30, 'bloom');
    cp(42, y, 'THE ROT');
    // 3. the rot: a low passage grown over; you will breathe it. Then, quickly, clean water
    solid(45, y + 1.0, 52, 8); // the low roof: creep
    bloom(46.2, y, 1.4); bloom(48.2, y, 1.4); bloom(50.2, y, 1.4);
    solid(60.5, -30, 66.5, -2.6, { ground: true }); // the basin: clean water
    L.waters.push({ id: 'clean', kind: 'pool', clean: true, x0: 60.5, x1: 66.5, y0: -0.35, y1: -0.35, floor: -2.6 });
    ground(66.5, 70, y);
    deco('pipes', 58, 8, { w: 10 });
    cp(69, y, 'THE VATS');
    // 4. the vats: a walkway over the red, presses on their beat
    const v0 = 71, v1 = 104;
    solid(v0, -30, v1, -4.2, { ground: true }); // the vats' floor, deep under the red
    L.waters.push({ id: 'vats', kind: 'vat', x0: v0, x1: v1, y0: -1.1, y1: -1.1, floor: -4.2 });
    deco('vatrim', v0, -1.1, { w: v1 - v0 });
    // the walkway, broken once: a jump over the red
    solid(v0 - 1, y - 0.3, 88.4, y, { thin: true });
    solid(90.2, y - 0.3, v1 + 1, y, { thin: true });
    for (const [i, x] of [76, 83, 95, 100].entries()) L.presses.push({ x, y, w: 1.7, top: y + 6.2, period: 3.4 - (n > 2 ? 0.2 : 0), off: i * 0.85, hold: 0.35 });
    solid(70, 9, 120, 30);
    hint(69.5, 74, 'vats');
    ground(v1, 120, y);
    exit(110, y);
    zone('dyeworks', -14, L.x1);
  },
};
