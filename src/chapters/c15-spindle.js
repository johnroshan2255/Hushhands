// 15. THE GREAT SPINDLE: all of you, at once. (The Moth Tower that climbs to it comes before this.)
export default {
  id: 'spindle', num: 15, act: 5, name: 'THE GREAT SPINDLE',
  card: ['The Spindle.', 'And a crack of something pale above it.'],
  build(k) {
    const { L, nb, solo, solid, ground, deco, hint, zone, begin } = k;
    const y = 0;
    begin('THE GREAT SPINDLE');
    const xz = 11.5;
    for (let i = 0; i < nb; i++) L.rings.push({ x: xz + i * 2.6, y });
    deco('spindle', xz + (nb - 1) * 1.3, y);
    hint(xz - 5, xz + nb * 2.6, solo ? 'rings1' : 'rings');
    ground(0, xz + nb * 2.6 + 8, y);
    solid(xz + nb * 2.6 + 8, y - 30, xz + nb * 2.6 + 22, y + 30);
    L.endX = xz + nb * 2.6 + 8;
    zone('spindle', -14, L.endX + 20);
    L.x1 = L.endX + 14;
  },
};
