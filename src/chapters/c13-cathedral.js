// 13. THE GLASS BRIDGE AND THE BLIND CATHEDRAL: glass that carries only so many; bells that must not
// ring; the blind Choir sleeping under them; the shears.
export default {
  id: 'cathedral', num: 13, act: 5, name: 'THE GLASS BRIDGE',
  card: ['The light is thinning.', 'Something sleeps under every bell.'],
  build(k) {
    const { L, n, solo, solid, ground, cp, deco, hint, zone, begin, exit } = k;
    const y = 0;
    begin('THE GLASS BRIDGE');
    const xs = 7;
    ground(0, xs, y);
    const SL = 2.7, NS = 8;
    const cap = n >= 3 ? 2 : 1;
    for (let i = 0; i < NS; i++) L.slabs.push({ i, x0: xs + i * SL + 0.06, x1: xs + (i + 1) * SL - 0.06, y, cap });
    L.kill.push({ x0: xs, x1: xs + NS * SL, y0: -90, y1: y - 10, why: 'fell' });
    hint(2, xs + 4, cap === 1 ? 'glass' : 'glass2');
    const xb = xs + NS * SL;
    deco('chains', xs, y + 11, { w: NS * SL });
    cp(xb + 3, y, 'THE BLIND CATHEDRAL');
    zone('bridge', -14, xb + 1);
    // the blind cathedral: bells, then the shears
    const xc = xb + 9;
    for (const [dx, kind] of [[0, 'hang'], [4.6, 'hang'], [9, 'wire'], [13.6, 'hang'], [18, 'wire'], [22, 'hang'], [24.2, 'hang']]) L.bells.push({ x: xc + dx, y, kind });
    deco('columns', xc - 4, y, { w: 34, h: 9 });
    deco('choir', xc - 1, y + 9, { w: 28 });
    solid(xc - 5, y + 9, xc + 34, y + 30);
    hint(xb + 1.5, xc + 3, 'bells');
    const xh = xc + 31;
    L.shears.push({ x: xh, y, period: 2.8, shut: 0.5, off: 0 });
    hint(xh - 6, xh - 0.8, solo ? 'shears1' : 'shears');
    ground(xb, xh + 20, y);
    exit(xh + 6, y);
    zone('cathedral', xb + 1, L.x1);
  },
};
