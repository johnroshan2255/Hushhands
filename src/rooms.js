// The Upturned Loom: halls that hang upside down, and drums that turn over.
//
// A room is a box of the world with its own frame. Its walls and floors are built in that frame;
// the room is drawn turned about its centre by its angle (0 upright, PI upside down), and whoever is
// inside walks in the frame, where down is always the room's floor. So in a hall hung from the roof
// you walk on what is, to the world, its ceiling, and the camera turns over with you.
//
// A drum turns on a beat (shared clock) or once, from a lever. While it turns, whoever holds fast
// (SHIFT) turns with it and lands on their feet; whoever does not stays where they are in the world,
// and when the turn is done finds themself at the top of the room, and falls its whole height.
export const TURN = 1.7, WARN = 2.2;

/** the room whose box holds (x, y) (generously above and below), or null */
export function roomAt(L, x, y) {
  for (const r of L.rooms) if (x >= r.x0 && x <= r.x1 && y >= r.y0 - 2.5 && y <= r.y1 + 2.5) return r;
  return null;
}
/** a point between the frame and the world (the same both ways: turning by PI is its own undoing) */
export const flip = (r, rot, x, y) => (rot ? [2 * r.cx - x, 2 * r.cy - y] : [x, y]);
const ease = (k) => k * k * (3 - 2 * k);
/**
 * how the room stands at time T: { rot (0|1 once settled), from, angle (radians), turning, k (0..1),
 * warn (seconds to the next turn, or null), n (turns so far) }
 * turnAt: when a lever-turned room was set going (null: never)
 */
export function roomState(r, T, turnAt = null) {
  let n = 0, tn = null, next = null;
  if (r.period) {
    const k = (T + (r.off || 0)) / r.period;
    n = Math.max(0, Math.floor(k));
    tn = n * r.period - (r.off || 0);
    next = (n + 1) * r.period - (r.off || 0);
  } else if (turnAt != null) { n = T >= turnAt ? 1 : 0; tn = turnAt; next = T < turnAt ? turnAt : null; }
  const rot = (r.rot0 ^ (n & 1)) & 1;
  if (n > 0 && T - tn < TURN) {
    const from = rot ^ 1, k = (T - tn) / TURN;
    return { rot, from, k, turning: true, angle: (from + ease(k)) * Math.PI, warn: null, n };
  }
  return { rot, from: rot, k: 1, turning: false, angle: rot * Math.PI, warn: next != null && next - T < WARN ? next - T : null, n };
}
/** turn a point about the room's centre by angle a */
export function spin(r, a, x, y) { const c = Math.cos(a), s = Math.sin(a), dx = x - r.cx, dy = y - r.cy; return [r.cx + dx * c - dy * s, r.cy + dx * s + dy * c]; }
/** the room as a space to move in (its own boxes, in its frame) */
export function frameSpace(r) { return { walk: [], solids: () => r.solids, open: () => false, all: r.solids }; }
