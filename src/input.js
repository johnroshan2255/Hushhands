// Keyboard and touch, as one set of controls. Held keys are read every frame; taps are latched until
// the frame reads them.
//   move  A/D or arrows        jump   Space (or W / Up when you are not on the thread)
//   climb W/S or Up/Down while hanging;  sneak  S / Down on the ground
//   brace Shift (or K / J): dig in and hold the thread fast     use  E (or F / Enter)
// Touch: a stick on the left (down = sneak, up = climb), JUMP / BRACE / USE on the right.
export class Input {
  constructor() {
    this.keys = new Set();
    this.taps = new Set();
    this.dirX = 0;
    this.dirY = 0;
    this.touch = { x: 0, y: 0, held: new Set() };
    this.enabled = true;
    this.usedTouch = false;
    const map = (e) => {
      const k = e.code;
      if (k === 'KeyA' || k === 'ArrowLeft') return 'left';
      if (k === 'KeyD' || k === 'ArrowRight') return 'right';
      if (k === 'KeyW' || k === 'ArrowUp') return 'up';
      if (k === 'KeyS' || k === 'ArrowDown') return 'down';
      if (k === 'KeyE' || k === 'Enter' || k === 'KeyF') return 'use';
      if (k === 'ShiftLeft' || k === 'ShiftRight' || k === 'KeyK' || k === 'KeyJ') return 'brace';
      if (k === 'Space') return 'jump';
      if (k === 'Escape' || k === 'KeyP') return 'pause';
      if (k === 'Digit1') return 'emote1';
      if (k === 'Digit2') return 'emote2';
      if (k === 'Digit3') return 'emote3';
      if (k === 'Digit4') return 'emote4';
      return null;
    };
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      const a = map(e);
      if (!a) return;
      if (a === 'jump' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!this.keys.has(a)) this.taps.add(a);
      this.keys.add(a);
    });
    addEventListener('keyup', (e) => { const a = map(e); if (a) this.keys.delete(a); });
    addEventListener('blur', () => { this.keys.clear(); this.touch.held.clear(); });
  }

  /** wire the on-screen controls (index.html) */
  bindTouch() {
    const stick = document.getElementById('stick'), knob = document.getElementById('stickKnob');
    let sid = null, cx = 0, cy = 0, R = 46;
    const move = (t) => {
      let dx = t.clientX - cx, dy = t.clientY - cy;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const nx = dx / R, ny = -dy / R;
      this.touch.x = Math.abs(nx) > 0.25 ? Math.sign(nx) : 0;
      this.touch.y = Math.abs(ny) > 0.5 ? Math.sign(ny) : 0;
    };
    const start = (e) => { e.preventDefault(); this.usedTouch = true; const t = e.changedTouches[0]; sid = t.identifier; const r = stick.getBoundingClientRect(); R = r.width * 0.36; cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(t); };
    stick.addEventListener('touchstart', start, { passive: false });
    stick.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === sid) move(t); }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; this.touch.x = 0; this.touch.y = 0; knob.style.transform = ''; } };
    stick.addEventListener('touchend', end); stick.addEventListener('touchcancel', end);
    for (const b of document.querySelectorAll('[data-act]')) {
      const a = b.dataset.act;
      const down = (e) => { e.preventDefault(); this.usedTouch = this.usedTouch || e.type === 'touchstart'; b.classList.add('on'); if (!this.touch.held.has(a)) this.taps.add(a); this.touch.held.add(a); };
      const up = (e) => { e.preventDefault(); b.classList.remove('on'); this.touch.held.delete(a); };
      b.addEventListener('touchstart', down, { passive: false });
      b.addEventListener('touchend', up, { passive: false });
      b.addEventListener('touchcancel', up, { passive: false });
      b.addEventListener('mousedown', down);
      b.addEventListener('mouseup', up);
      b.addEventListener('mouseleave', (e) => { if (this.touch.held.has(a)) up(e); });
    }
  }

  held(a) { return this.enabled && (this.keys.has(a) || this.touch.held.has(a)); }
  tap(a) { return this.enabled && this.taps.has(a); }

  /** call once a frame before reading */
  poll() {
    const kx = (this.keys.has('right') ? 1 : 0) - (this.keys.has('left') ? 1 : 0);
    const ky = (this.keys.has('up') ? 1 : 0) - (this.keys.has('down') ? 1 : 0);
    this.dirX = this.enabled ? (kx || this.touch.x) : 0;
    this.dirY = this.enabled ? (ky || this.touch.y) : 0;
  }
  /** call at the end of a frame */
  endFrame() { this.taps.clear(); }
}
