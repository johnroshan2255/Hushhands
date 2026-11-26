// 12. THE UPTURNED LOOM: the halls that hang from the roof of the earth. In the first you walk on its
// ceiling, and the world turns over with you. In the drum, a lever turns the whole hall over: hold
// fast and you turn with it; let go and you fall its height. The gallery turns on its own, on a beat,
// while you cross it, and lets you out only when it is the right way up.
export default {
  id: 'upturned', num: 12, act: 4, name: 'THE UPTURNED LOOM',
  card: ['Up and down are only', 'what the Loom says they are.'],
  build(k) {
    const { button, other, L, n, solo, solid, ground, cp, deco, hint, zone, begin, exit, room } = k;
    begin('THE UPTURNED LOOM', 0, 30);
    // up to the walkway the first hall hangs from
    ground(0, 12, 0);
    solid(12, -30, 14, 1.5, { ground: true }); solid(14, -30, 16, 3, { ground: true }); solid(16, -30, 18, 4.5, { ground: true });
    solid(18, -30, 24, 6, { ground: true });
    hint(17, 24, 'upside');
    // 1. the hall hung from the roof: you walk on its underside (frame: floor at y 1; the world sees it at 6)
    const A = room({ id: 'hall', x0: 24, x1: 52, y0: 0, y1: 7, rot0: 1 });
    A.solid(24, 0, 36.4, 1); A.solid(38, 0, 52, 1); // its floor, broken once
    A.kill(36.4, -6, 38, 0.3);
    A.solid(24, 6.4, 52, 7); // its far side
    A.solid(24, 3.6, 24.6, 6.4); A.solid(51.4, 3.6, 52, 6.4); // its ends, with a way through at the floor
    A.solid(43, 1.75, 45, 6.4); // a beam to creep under
    solid(52, -30, 60, 6, { ground: true });
    solid(60, -30, 62, 4.5, { ground: true }); solid(62, -30, 64, 3, { ground: true }); solid(64, -30, 66, 1.5, { ground: true });
    ground(66, 72, 0);
    button(8, 56, 6); // on the walkway out of the hall
    cp(68, 0, 'THE DRUM');
    // 2. the drum: the lever turns it over; hold fast through the turn; the way you came in is now high
    const B = room({ id: 'drum', x0: 72, x1: 88, y0: -1, y1: 9, rot0: 0, lever: 'drum' });
    B.solid(72, -1, 88, 0); B.solid(72, 8.4, 88, 9); B.solid(72, 2.6, 72.6, 8.4); B.solid(87.4, 0, 88, 8.4);
    if (solo) L.levers.push({ id: 'drum', x: 82, y: 0 });
    else for (let i = 0; i < n; i++) L.levers.push({ id: 'drum', x: 79 + i * 1.8, y: 0 });
    hint(68.5, 74, 'drum');
    solid(88, -30, 102, 8, { ground: true }); // the way on, at the top
    cp(96, 8, 'THE TURNING GALLERY');
    // 3. the gallery turns on a beat: hold fast when it groans; it lets you out the right way up
    const C = room({ id: 'gallery', x0: 102, x1: 134, y0: 7, y1: 17, rot0: 0, period: 8.5, off: 2 });
    C.solid(102, 7, 110, 8); C.solid(111.6, 7, 122, 8); C.solid(123.6, 7, 134, 8);
    C.kill(110, 2, 111.6, 7.4); C.kill(122, 2, 123.6, 7.4);
    C.solid(102, 16.4, 134, 17); C.solid(102, 10.6, 102.6, 16.4); C.solid(133.4, 10.6, 134, 16.4);
    hint(96.5, 102, 'gallery');
    solid(134, -30, 160, 8, { ground: true });
    exit(146, 8);
    zone('upturned', -14, L.x1);
    void deco;
  },
};
