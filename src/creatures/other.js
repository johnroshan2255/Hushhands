// The Other Doll: always ahead. It stands in the fog where you will be in a moment, and when you come
// near it runs on and is gone. It wears your colour. (At the Collector's cages, you find out why.)
// Nothing about it goes over the wire: each browser sees its own, from the same script.
import { Rig } from '../chars.js';

const SCALE = 0.68;
export class OtherDoll {
  /** o: { pts: [{ x, y }], after (a gate that must be open first) }, variant: whose colour */
  constructor(app, o, variant = 0) {
    this.o = o; this.rig = new Rig(app, { variant: (variant + 2) % 4 });
    this.rig.root.setLocalScale(SCALE, SCALE, SCALE);
    this.rig.setVisible(false);
    this.state = 'wait'; this.x = o.pts[0].x; this.y = o.pts[0].y; this.k = 0; this.t = 0; this.fade = 0;
  }
  destroy() { this.rig.destroy(); }
  update(dt, meX, open, T) {
    const pts = this.o.pts;
    if (this.state === 'gone') return;
    if (this.state === 'wait') {
      // it shows itself when you are some way off, ahead of you
      if (meX > pts[0].x - 15 && (!this.o.after || open[this.o.after] || this.o.before)) { this.state = 'stand'; this.rig.setVisible(true); this.fade = 0; }
      return;
    }
    this.t += dt;
    if (this.state === 'stand') {
      this.fade = Math.min(1, this.fade + dt);
      if (meX > pts[0].x - 7.5 || this.t > 14) { this.state = 'run'; this.k = 1; }
    } else if (this.state === 'run') {
      const p = pts[Math.min(this.k, pts.length - 1)], d = p.x - this.x;
      this.x += Math.sign(d) * Math.min(Math.abs(d), 4.4 * dt); this.y += (p.y - this.y) * Math.min(1, dt * 6);
      if (Math.abs(d) < 0.05) { if (this.k < pts.length - 1) this.k++; else { this.state = 'gone'; this.rig.setVisible(false); return; } }
    }
    const running = this.state === 'run';
    this.rig.pose(dt, { x: this.x, y: this.y, z: -1.4, facing: running ? Math.sign(pts[Math.min(this.k, pts.length - 1)].x - this.x) || 1 : -1, speed: running ? 4.4 / SCALE : 0, vx: running ? 4.4 : 0, vy: 0, crouch: false, anim: 'walk', t: T, noShadow: true });
  }
}
