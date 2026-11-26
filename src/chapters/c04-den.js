// 4. THE DEN OF THE NEEDLE-CRAWLER: a blind thing on the ceiling with a needle for a mouth. Then the levers.
export default {
  id: 'den', num: 4, act: 2, name: 'THE DEN',
  card: ['It cannot see you.', 'It does not need to.'],
  build(k) {
    const { L, n, solo, solid, ground, gate, deco, hint, zone, begin, exit } = k;
    const y = 0;
    begin('THE DEN');
    const xa = 7;
    ground(0, xa + 18.2, y);
    hint(xa - 5.5, xa + 3, 'sneak');
    solid(xa, y, xa + 1.3, y + 1.15); // a stump: landing off it is the first sound you make
    L.monsters.push({ kind: 'crawler', id: 'c0', x: xa + 11, y: y + 4.2, x0: xa + 2.2, x1: xa + 15.4, zone: { x0: xa - 1, x1: xa + 16.4, y0: y - 1, y1: y + 4.2 } });
    solid(xa + 16.8, y, xa + 18.2, y + 0.95);
    const yL = y + 1.9;
    solid(xa + 18.2, y - 30, xa + 46, yL, { ground: true }); // the ledge
    if (solo) { L.plates.push({ id: 'g3', x: xa + 20, y: yL, w: 1.5 }); L.levers.push({ id: 'g3', x: xa + 24.4, y: yL }); }
    else for (let i = 0; i < n; i++) L.levers.push({ id: 'g3', x: xa + 19.6 + (i * 5) / (n - 1), y: yL });
    hint(xa + 18.4, xa + 25.6, solo ? 'levers1' : 'levers');
    gate(xa + 26, yL, 'g3');
    solid(xa + 26, yL + 5, xa + 26.7, yL + 18);
    deco('arch', xa + 26.35, yL); deco('web', xa + 8, y + 4.2, { w: 12 }); deco('bones', xa + 12, y); deco('bones', xa + 5.5, y);
    solid(xa - 2, y + 4.2, xa + 26, y + 18); // the den's roof
    exit(xa + 31, yL);
    zone('den', -14, xa + 26); zone('levers', xa + 26, L.x1);
  },
};
