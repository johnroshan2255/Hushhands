// THE THREAD-BEARERS: rooms (Colyseus) + the built game's files.
//
//   npm run play     -> build, then serve the game and the rooms on :2567
//   npm run server   -> serve an existing dist/ build and the rooms
//
// Model: up to four to a room; its creator is the host. Their browser runs the monsters and decides
// what has happened ('e' events, 's' snapshots); everyone else sends intents ('i') to the host, and
// everyone sends their own wanderer ('p') to the others. The server keeps the roster, starts and ends
// journeys (a room is locked while one is under way), keeps the clock, and lists public rooms.
import http from 'http';
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server, Room, matchMaker } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT || 2567);
const MAX = 4;
const clean = (s, n = 14) => String(s || '').replace(/[^\w \-.']/g, '').slice(0, n);

class LoomRoom extends Room {
  onCreate(options) {
    this.maxClients = MAX;
    this.roster = new Map(); // sessionId -> { name, slot, joined }
    this.hostId = null;
    this.run = null; // { seq, order, startedAt }
    this.seq = 0;
    this.setMetadata({ code: clean(options.code, 6).toUpperCase(), private: !!options.private, host: '', phase: 'lobby' });
    this.onMessage('*', (client, type, msg) => this.relay(client, String(type), msg && typeof msg === 'object' ? msg : {}));
  }
  freeSlot() { const used = new Set([...this.roster.values()].map((p) => p.slot)); for (let i = 0; i < MAX; i++) if (!used.has(i)) return i; return 0; }
  list() { return [...this.roster.entries()].map(([id, p]) => ({ id, ...p })).sort((a, b) => a.slot - b.slot); }
  state() { return { hostId: this.hostId, players: this.list(), run: this.run, now: Date.now() }; }
  sendRoster() { this.broadcast('roster', this.state()); }

  onJoin(client, options = {}) {
    if (this.closing || this.run) { client.leave(4000); return; }
    const p = { name: clean(options.name) || 'Wanderer', slot: this.freeSlot(), joined: Date.now() };
    this.roster.set(client.sessionId, p);
    if (!this.hostId) { this.hostId = client.sessionId; this.setMetadata({ ...this.metadata, host: p.name }); }
    client.send('welcome', { id: client.sessionId, ...this.state() });
    this.sendRoster();
    if (this.roster.size >= MAX) this.lock();
  }
  onLeave(client) {
    const wasHost = client.sessionId === this.hostId;
    this.roster.delete(client.sessionId);
    if (wasHost) {
      this.broadcast('roomClosed', { reason: `${this.metadata.host || 'The host'} let go of the thread.` });
      this.closing = true;
      setTimeout(() => this.disconnect(), 150);
      return;
    }
    if (this.run) this.run = { ...this.run, order: this.run.order.filter((id) => id !== client.sessionId) };
    this.broadcast('left', { id: client.sessionId });
    this.sendRoster();
    if (!this.run && this.locked && this.roster.size < MAX) this.unlock();
  }

  relay(client, type, msg) {
    const p = this.roster.get(client.sessionId);
    if (!p) return;
    const isHost = client.sessionId === this.hostId;
    switch (type) {
      case 'start':
        if (!isHost || this.run) return;
        this.run = { seq: ++this.seq, order: this.list().map((q) => q.id), startedAt: Date.now() + 1200 };
        this.lock();
        this.setMetadata({ ...this.metadata, phase: 'run' });
        this.broadcast('run', this.state());
        return;
      case 'end':
        if (!isHost || !this.run) return;
        this.run = null;
        if (this.roster.size < MAX) this.unlock();
        this.setMetadata({ ...this.metadata, phase: 'lobby' });
        this.broadcast('run', this.state());
        return;
      case 'profile':
        if (msg.name) p.name = clean(msg.name) || p.name;
        if (isHost) this.setMetadata({ ...this.metadata, host: p.name });
        this.sendRoster();
        return;
      case 'private': if (isHost) this.setMetadata({ ...this.metadata, private: !!msg.on }); return;
      case 'i': { // an intent for the host
        msg.from = client.sessionId;
        const h = this.clients.find((c) => c.sessionId === this.hostId);
        if (h) h.send('i', msg);
        return;
      }
      case 'e': case 's': if (!isHost) return; break; // only the host says what happened
      case 'p': break;
      default: return;
    }
    msg.from = client.sessionId;
    this.broadcast(type, msg, { except: client });
  }
}

// ------------------------------------------------------------------ static files
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const PACKED = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.txt', '.svg']);
const zipped = new Map();
function serveStatic(req, res) {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return; }
  if (url === '/rooms') { listRooms(res); return; }
  let file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('THE THREAD-BEARERS server. Build the game (npm run build) to serve it here.'); return; }
  const ext = path.extname(file), st = fs.statSync(file);
  const headers = { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable', vary: 'accept-encoding' };
  const accept = String(req.headers['accept-encoding'] || '');
  const enc = PACKED.has(ext) && st.size > 1024 ? (/\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : null) : null;
  if (enc) {
    const key = `${file}|${enc}|${st.mtimeMs}`;
    if (!zipped.has(key)) { const raw = fs.readFileSync(file); zipped.set(key, enc === 'br' ? zlib.brotliCompressSync(raw) : zlib.gzipSync(raw, { level: 9 })); }
    const body = zipped.get(key);
    res.writeHead(200, { ...headers, 'content-encoding': enc, 'content-length': body.length });
    res.end(req.method === 'HEAD' ? undefined : body);
    return;
  }
  headers['accept-ranges'] = 'bytes';
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
  if (m) {
    let a = m[1] === '' ? st.size - Number(m[2]) : Number(m[1]);
    let b = m[1] !== '' && m[2] !== '' ? Number(m[2]) : st.size - 1;
    a = Math.max(0, a); b = Math.min(st.size - 1, b);
    if (a > b) { res.writeHead(416, { 'content-range': `bytes */${st.size}` }); res.end(); return; }
    res.writeHead(206, { ...headers, 'content-range': `bytes ${a}-${b}/${st.size}`, 'content-length': b - a + 1 });
    fs.createReadStream(file, { start: a, end: b }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, 'content-length': st.size });
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(file).pipe(res);
}
async function listRooms(res) {
  let rooms = [];
  try { rooms = await matchMaker.query({ name: 'loom' }); } catch { /* none */ }
  const list = rooms.filter((r) => r.metadata?.code && !r.metadata?.private && r.metadata?.host && r.metadata?.phase !== 'run' && r.clients < r.maxClients).map((r) => ({ code: r.metadata.code, host: r.metadata.host, players: r.clients, max: r.maxClients, phase: r.metadata.phase || 'lobby' }));
  res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(list));
}

const httpServer = http.createServer();
const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
gameServer.define('loom', LoomRoom).filterBy(['code']);
await gameServer.listen(PORT, '0.0.0.0');
const colyseusHandlers = httpServer.listeners('request');
httpServer.removeAllListeners('request');
const isColyseus = (url = '') => url.startsWith('/matchmake') || url.startsWith('/__');
const CORS = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
httpServer.on('request', (req, res) => {
  if (!isColyseus(req.url)) {
    const origin = req.headers.origin;
    if (origin && (!CORS.length || CORS.includes(origin))) { res.setHeader('access-control-allow-origin', CORS.length ? origin : '*'); res.setHeader('access-control-allow-headers', 'content-type'); }
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  }
  if (isColyseus(req.url)) for (const h of colyseusHandlers) h.call(httpServer, req, res);
  else serveStatic(req, res);
});
console.log(`\n  THE THREAD-BEARERS  ->  http://localhost:${PORT}  (rooms on the same port)\n`);
