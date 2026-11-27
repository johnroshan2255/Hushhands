// 3. THE CHASM AND THE BURROWERS: swing on the thread over the drop; the tunnel of ceiling worms.
export default {
  id: 'chasm', num: 3, act: 1, name: 'THE CHASM',
  card: ['Something was in your head.', 'It wanted the others.'],
  build(k) {
    const { button, other, L, solo, solid, ground, cp, deco, hint, zone, begin, exit } = k;
    let y = 0;
    begin('THE CHASM');
    const xe = 11; // the ground ends; a jetty runs on over the drop
    ground(0, xe, y);
    const tip = xe + 3.6;
    solid(xe, y - 0.35, tip, y, { thin: true });
    const yB = y - 2;
    const xf = tip + 4.2; // the far wall
    solid(xe, -60, xf, y - 16); // the pit's floor, far below
    L.kill.push({ x0: xe - 0.2, x1: xf + 0.2, y0: -60, y1: y - 12.5, why: 'fell' });
    deco('spikes', xe, y - 16, { w: xf - xe });
    L.hooks.push({ id: 'h0', x: tip - 0.3, y: y + 2.3, solo: true });
    deco('gibbet', xe + 0.5, y, { reach: tip - 0.3 - (xe + 0.5), h: 3.1 });
    hint(5, tip + 1, solo ? 'chasm1' : 'chasm');
    ground(xf, xf + 24, yB);
    cp(xf + 5, yB, 'THE WORM TUNNEL');
    zone('chasm', -14, xf + 3);
    y = yB;
    // the tunnel of ceiling worms: six, quicker than before; two of them give no warning at all
    const xt = xf + 12;
    ground(xf + 24 - 0.001, xt + 40, y);
    solid(xt, y + 2.9, xt + 24, y + 18);
    const quiet = [1, 2, 3, 4].sort(() => k.rng() - 0.5).slice(0, 2);
    for (const [i, dx] of [3.4, 6.9, 10.4, 13.9, 17.4, 20.9].entries()) L.worms.push({ x: xt + dx, y: y + 2.9, dir: -1, period: 2.7, up: 0.95, off: i * 0.62, len: 2.5, silent: quiet.includes(i) });
    deco('pipes', xt, y + 2.9, { w: 24 });
    button(10, tip - 0.2, 0); // at the very end of the jetty
    other([{ x: xt + 26, y }, { x: xt + 34, y }]);
    exit(xt + 30, y);
    zone('tunnel', xf + 3, L.x1);
  },
};
