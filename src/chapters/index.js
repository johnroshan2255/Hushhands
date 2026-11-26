// The journey, chapter by chapter. Only the chapter you are in is built (for however many set out).
import { kit, finish, LINK } from './kit.js';
import pit from './c01-pit.js';
import meadow from './c02-meadow.js';
import chasm from './c03-chasm.js';
import den from './c04-den.js';
import mill from './c05-mill.js';
import gears from './c06-gears.js';
import fen from './c07-fen.js';
import granary from './c08-granary.js';
import dyeworks from './c09-dyeworks.js';
import larder from './c10-larder.js';
import cathedral from './c13-cathedral.js';
import collector from './c14-collector.js';
import spindle from './c15-spindle.js';

export { LINK };
/** in the order they are walked */
export const CHAPTERS = [pit, meadow, chasm, den, mill, gears, fen, granary, dyeworks, larder, cathedral, collector, spindle];
export const chapterIndex = (id) => Math.max(0, CHAPTERS.findIndex((c) => c.id === id));

export function buildChapter(ci, n) {
  const i = Math.max(0, Math.min(CHAPTERS.length - 1, ci | 0));
  const C = CHAPTERS[i];
  const k = kit(n, { id: C.id, ci: i, num: C.num, act: C.act, name: C.name, last: i === CHAPTERS.length - 1 });
  C.build(k);
  return finish(k.L);
}
