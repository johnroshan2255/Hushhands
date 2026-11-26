// Rooms on Colyseus, up to four to a thread. The room's creator is the host: their browser runs the
// monsters and decides what has happened (clients send intents 'i', the host answers with events 'e'
// and snapshots 's'); everyone sends their own wanderer ('p'). Alone, this browser is its own host.
import { Client } from '@colyseus/sdk';

export class Net {
  constructor() {
    this.online = false;
    this.id = 'me';
    this.hostId = 'me';
    this.players = [];
    this.room = null;
    this.code = '';
    this.handlers = new Map();
    this.run = null; // { seq, order: [ids], startedAt } in server time, while a journey is under way
    this.clockOff = 0;
  }
  get isHost() { return this.hostId === this.id; }
  serverNow() { return Date.now() + this.clockOff; }
  on(type, fn) { if (!this.handlers.has(type)) this.handlers.set(type, []); this.handlers.get(type).push(fn); }
  emit(type, msg) { for (const fn of this.handlers.get(type) || []) fn(msg); }

  static httpBase(url) { return String(url).replace(/^ws/, 'http').replace(/\/$/, ''); }
  /** ?server=… > VITE_SERVER_URL > the page's own server (when it hosts the game) > none */
  static async findServer() {
    const q = new URLSearchParams(location.search).get('server');
    if (q) return q;
    const probe = async (base) => {
      try { const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 3000); const r = await fetch(`${base}/health`, { signal: ctl.signal, cache: 'no-store' }); clearTimeout(t); return r.ok && (await r.text()).trim() === 'ok'; } catch { return false; }
    };
    const env = import.meta.env.VITE_SERVER_URL;
    if (env) return (await probe(Net.httpBase(env))) ? env : null;
    if (await probe('')) return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
    return null;
  }

  async connect(url, { how = 'create', code = '', name, private: priv = false }) {
    const client = new Client(url);
    const opts = { code, name, private: priv };
    const join = how === 'create' ? client.create('loom', opts) : client.join('loom', opts);
    let gaveUp = false;
    const timeout = new Promise((_, rej) => setTimeout(() => { gaveUp = true; rej(new Error('timeout')); }, 8000));
    join.then((r) => { if (gaveUp) try { r.leave(); } catch { /* */ } }, () => {});
    this.room = await Promise.race([join, timeout]);
    this.code = code;
    this.id = this.room.sessionId;
    this.online = true;
    this.leaving = false;
    const welcome = new Promise((resolve) => this.room.onMessage('welcome', (m) => { this.hostId = m.hostId; this.players = m.players; this.setRun(m); resolve(m); }));
    this.room.onMessage('roster', (m) => { this.hostId = m.hostId; this.players = m.players; this.setRun(m); this.emit('roster', m); });
    this.room.onMessage('run', (m) => { this.setRun(m); this.emit('run', this.run); });
    this.room.onMessage('roomClosed', (m) => { this.closed = m.reason; });
    this.room.onMessage('*', (type, m) => { if (type === 'welcome' || type === 'roster' || type === 'run' || type === 'roomClosed') return; this.emit(type, m); });
    this.room.onLeave((code) => { this.online = false; if (!this.leaving) this.emit('disconnected', { code, reason: this.closed }); });
    await Promise.race([welcome, new Promise((r) => setTimeout(r, 3000))]);
    return this;
  }
  setRun(m) { if (!m) return; if (m.now) this.clockOff = m.now - Date.now(); this.run = m.run || null; }
  send(type, msg) { if (!this.online || !this.room) return; try { this.room.send(type, msg); } catch { /* closing */ } }
  leave() { this.leaving = true; try { this.room?.leave(); } catch { /* */ } this.online = false; this.room = null; this.id = 'me'; this.hostId = 'me'; this.players = []; this.run = null; }
}
