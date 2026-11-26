// 10. THE LARDER: a cold kitchen with something underneath it. The Glutton is a mouth under the
// floor that rises toward anything that makes the boards shake. Creep; freeze when they creak; hide
// in the sacks; knock meat off the hooks and pass while it chews; and at the end, feed it a sack from
// the Dye-Works.
export default {
  id: 'larder', num: 10, act: 3, name: 'THE LARDER',
  card: ['It was always hungry.', 'It was fed on what the Collector could not use.'],
  build(k) {
    const { L, n, solid, ground, cp, gate, deco, hint, zone, begin, exit, deadDoll } = k;
    const y = 0;
    const boards = (x0, x1) => solid(x0, y - 0.25, x1, y, { thin: true, boards: true });
    const island = (x0, x1) => solid(x0, y - 30, x1, y, { ground: true });
    const sack = (x) => L.sacks.push({ x, y, w: 1.05 });
    begin('THE LARDER', 0, 30);
    ground(0, 10.2, y);
    solid(10, -30, 80, -3.6, { ground: true }); // the pit under the floor, where it lives
    solid(-2, 7.5, 90, 30); // the kitchen's ceiling
    // the floor: boards, with stone islands where you can stand and breathe
    boards(10.2, 26); island(26, 28.5); boards(28.5, 46); island(46, 48.5); boards(48.5, 62); island(62, 64.5); boards(64.5, 80);
    L.monsters.push({ kind: 'glutton', id: 'g0', x: 38, y, x0: 11, x1: 79, gate: 'gl', safe: [[26, 28.5], [46, 48.5], [62, 64.5]] });
    // 1. the boards: creep; freeze when it comes
    hint(4, 13, 'boards');
    deco('sacks', 16, y, { s: 0.9 }); deadDoll(21, y, { half: true });
    cp(27.2, y, 'THE SACKS');
    // 2. old boards that creak whatever you do: sack to sack
    L.creaky.push({ x0: 28.5, x1: 46 });
    for (const x of [31.6, 35.2, 38.8, 42.4]) sack(x);
    hint(28, 32, 'sacks');
    cp(47.2, y, 'THE HOOKS');
    // 3. the hooks: knock the meat down behind you, go while it chews
    L.creaky.push({ x0: 48.5, x1: 62 });
    L.meat.push({ x: 49.8, y, hy: y + 3.3 });
    if (n >= 3) L.meat.push({ x: 55, y, hy: y + 3.3 });
    hint(47.5, 51, 'hooks');
    deco('hooks', 52, y + 6.5, { w: 9 });
    cp(63.2, y, 'THE POISON');
    // 4. the poison: a sack from the Dye-Works; the way out stays shut while it lives
    L.creaky.push({ x0: 64.5, x1: 80 });
    sack(68.6);
    L.meat.push({ x: 71.4, y, hy: y + 3.3, poison: true });
    hint(63.5, 68, 'poison');
    gate(76.2, y, 'gl', 7.5);
    ground(80, 100, y);
    exit(86, y);
    zone('larder', -14, L.x1);
  },
};
