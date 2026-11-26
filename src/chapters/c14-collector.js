// 14. THE COLLECTOR'S YARD: the giant that gathers dolls for the Spindle. Trip it with the thread.
export default {
  id: 'collector', num: 14, act: 5, name: 'THE COLLECTOR’S YARD',
  card: ['Its cages are full.', 'Every doll in them is tied.'],
  build(k) {
    const { L, solo, solid, ground, gate, deco, hint, zone, begin, exit } = k;
    const y = 0;
    begin('THE COLLECTOR’S YARD');
    const xk = 10;
    L.monsters.push({ kind: 'collector', id: 'k0', x: xk + 16, y, x0: xk + 4, x1: xk + 23, gate: 'g7' });
    hint(xk - 4, xk + 4, solo ? 'collector1' : 'collector');
    gate(xk + 28, y, 'g7', 7);
    solid(xk + 28, y + 7, xk + 28.7, y + 30);
    ground(0, xk + 50, y);
    deco('arch', xk + 28.35, y, { s: 1.4 }); deco('cages', xk + 2, y + 12, { w: 24 });
    exit(xk + 33, y);
    zone('collector', -14, L.x1);
  },
};
