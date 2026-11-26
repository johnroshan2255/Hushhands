// Saves, like Limbo's: silent, at every lantern. Three journeys (slots), each remembering where it
// woke last, what it found and how it went; and the chapters any journey has reached, to start from.
// localStorage, mirrored to the portal's data store when there is one.
import { CHAPTERS } from './chapters/index.js';

export const SLOTS = 3;
const V = 1;
let backing = null; // { get, set, remove } from the portal, or null
const ls = {
  get(k) { try { const v = backing?.get?.(k); if (v != null) return v; } catch { /* */ } try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* */ } try { backing?.set?.(k, v); } catch { /* */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* */ } try { backing?.remove?.(k); } catch { /* */ } },
};
export function useStorage(s) { backing = s || null; }

const key = (slot) => `tb.save.${slot}`;
export function read(slot) {
  try { const s = JSON.parse(ls.get(key(slot)) || 'null'); return s && s.v === V ? s : null; } catch { return null; }
}
export function write(slot, data) {
  const was = read(slot) || {};
  const s = { ...was, ...data, v: V, updated: Date.now() };
  ls.set(key(slot), JSON.stringify(s));
  reach(s.ci ?? 0);
  return s;
}
export function erase(slot) { ls.del(key(slot)); if (current() === slot) ls.del('tb.slot.cur'); }
export function all() { return Array.from({ length: SLOTS }, (_, i) => read(i)); }
/** the journey being played (and continued from the title) */
export function current() { const c = ls.get('tb.slot.cur'); return c == null ? -1 : +c; }
export function setCurrent(slot) { ls.set('tb.slot.cur', String(slot)); }
/** the slot a new journey goes into: an empty one, or else the one played longest ago */
export function freeSlot() {
  const s = all();
  const e = s.findIndex((x) => !x);
  if (e >= 0) return e;
  let best = 0;
  s.forEach((x, i) => { if (x.updated < s[best].updated) best = i; });
  return best;
}
/** the furthest chapter any journey has reached */
export function reached() { return Math.min(CHAPTERS.length - 1, +(ls.get('tb.reached') || 0)); }
export function reach(ci) { if (ci > reached()) ls.set('tb.reached', String(ci)); }
/** "chapter 4 · THE DEN" */
export function describe(s) {
  if (!s) return '';
  const C = CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, s.ci ?? 0))];
  return `chapter ${C.num}  ·  ${C.name}`;
}
export function stats(s) {
  if (!s) return '';
  const t = s.time || 0, mm = Math.floor(t / 60), hh = Math.floor(mm / 60);
  const time = hh ? `${hh}h ${String(mm % 60).padStart(2, '0')}m` : `${mm}m`;
  return `${time}  ·  ${s.deaths || 0} ${s.deaths === 1 ? 'fall' : 'falls'}  ·  ${(s.found || []).length ? `${s.found.length} found  ·  ` : ''}${s.players > 1 ? `${s.players} together` : 'alone'}`;
}
