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
  return chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', `--use-angle=${process.platform === 'darwin' ? 'metal' : 'd3d11'}`, '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function page(browser, url, { viewport = { width: 1280, height: 720 }, ...more } = {}) {
  const ctx = await browser.newContext({ viewport, ...more });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') p.errors.push(`${m.type()}: ${m.text()}`); });
  await p.goto(url);
  return p;
}
