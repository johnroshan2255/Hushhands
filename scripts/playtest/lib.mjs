// Headless playtests: the system Chrome through playwright-core, on the real GPU.
// Start the game first (npm run play), then e.g.  node scripts/playtest/solo.mjs
import os from 'os';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';
export { chromium };
export const BASE = process.env.TB_URL || 'http://localhost:5173';
export const SHOTS = (process.env.TB_SHOTS || path.join(os.tmpdir(), 'tb-shots')) + path.sep;
fs.mkdirSync(SHOTS, { recursive: true });
export async function launch() {
  // TB_SHOW=1: a real window you can watch (with sound)
  const show = !!process.env.TB_SHOW;
  return chromium.launch({ channel: 'chrome', headless: !show, args: [...(show ? ['--start-maximized'] : ['--mute-audio']),'--enable-gpu', `--use-angle=${process.platform === 'darwin' ? 'metal' : 'd3d11'}`, '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function page(browser, url, { viewport = { width: 1280, height: 720 }, ...more } = {}) {
  const ctx = await browser.newContext({ viewport, ...more });
  // a returning player: the story has been told and the trial done (TB_FRESH=1 to be a new one)
  if (!process.env.TB_FRESH) await ctx.addInitScript(() => { try { localStorage.setItem('tb.story', '1'); localStorage.setItem('tb.trial', 'done'); } catch { /* */ } });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') p.errors.push(`${m.type()}: ${m.text()}`); });
  await p.goto(url);
  return p;
}
