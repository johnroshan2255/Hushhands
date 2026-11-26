// Proximity voice, for those who want it (off unless switched on, and only with the microphone allowed).
// Peer to peer: WebRTC between every two browsers in a room, the rooms server only passing the
// handshake ('v' messages, sent to one other). Each voice comes out louder the closer its doll is to
// yours along the thread, muffled under water, and a dead doll can only whisper (heard close to it).
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }];

export class Voice {
  constructor(net) {
    this.net = net;
    this.on = false;
    this.peers = new Map(); // id -> { pc, gain, filt, el }
    this.mic = null;
    this.ctx = null;
    net.on('v', (m) => this.onSignal(m));
  }
  /** switch voice on (asks for the microphone) or off */
  async enable(on) {
    if (on === this.on) return true;
    if (!on) { this.stop(); return true; }
    try {
      this.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    } catch { return false; }
    this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
    this.on = true;
    // whoever has the lower id calls the other
    for (const p of this.net.players) if (p.id !== this.net.id && this.net.id < p.id) this.call(p.id);
    this.net.send('v', { kind: 'hello' });
    return true;
  }
  stop() {
    this.on = false;
    for (const [id] of this.peers) this.drop(id);
    if (this.mic) for (const t of this.mic.getTracks()) t.stop();
    this.mic = null;
  }
  peer(id) {
    let p = this.peers.get(id);
    if (p) return p;
    const pc = new RTCPeerConnection({ iceServers: ICE });
    if (this.mic) for (const t of this.mic.getTracks()) pc.addTrack(t, this.mic);
    pc.onicecandidate = (e) => { if (e.candidate) this.net.send('v', { to: id, kind: 'ice', c: e.candidate }); };
    const gain = this.ctx.createGain(), filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 12000; gain.gain.value = 0;
    filt.connect(gain); gain.connect(this.ctx.destination);
    pc.ontrack = (e) => {
      // (Chrome needs the stream on an element before WebAudio hears it)
      const el = new Audio(); el.srcObject = e.streams[0]; el.muted = true; el.play().catch(() => {});
      const src = this.ctx.createMediaStreamSource(e.streams[0]); src.connect(filt);
      p.el = el;
    };
    p = { pc, gain, filt, el: null };
    this.peers.set(id, p);
    return p;
  }
  drop(id) { const p = this.peers.get(id); if (!p) return; try { p.pc.close(); } catch { /* */ } try { p.gain.disconnect(); } catch { /* */ } this.peers.delete(id); }
  async call(id) { const p = this.peer(id); const offer = await p.pc.createOffer(); await p.pc.setLocalDescription(offer); this.net.send('v', { to: id, kind: 'offer', sdp: offer }); }
  async onSignal(m) {
    if (!this.on || (m.to && m.to !== this.net.id)) return;
    const from = m.from;
    if (m.kind === 'hello') { if (this.net.id < from) { this.drop(from); this.call(from); } return; }
    const p = this.peer(from);
    try {
      if (m.kind === 'offer') { await p.pc.setRemoteDescription(m.sdp); const ans = await p.pc.createAnswer(); await p.pc.setLocalDescription(ans); this.net.send('v', { to: from, kind: 'answer', sdp: ans }); }
      else if (m.kind === 'answer') await p.pc.setRemoteDescription(m.sdp);
      else if (m.kind === 'ice') await p.pc.addIceCandidate(m.c);
    } catch { /* a stale handshake: the next one will do */ }
  }
  /** every frame: how loud each voice is. game: the Game (players with ids, bodies, water) */
  update(game) {
    if (!this.on || !game.running || !game.players.length) return;
    const me = game.me;
    for (const p of game.players) {
      if (p.me) continue;
      const v = this.peers.get(p.id);
      if (!v) continue;
      const d = Math.hypot(p.b.x - me.b.x, (p.b.y - me.b.y) * 1.4);
      const dead = p.b.dead;
      // near: full; past 14 m: gone; the dead whisper only within 3 m
      let k = dead ? Math.max(0, 1 - d / 3) * 0.6 : Math.max(0, Math.min(1, 1.15 - d / 14));
      if (me.b.dead) k = Math.max(k, 0.15); // the dead still hear the living, faintly
      const under = p.b.under || me.b.under;
      v.gain.gain.setTargetAtTime(k, this.ctx.currentTime, 0.1);
      v.filt.frequency.setTargetAtTime(under ? 500 : dead ? 2200 : 12000, this.ctx.currentTime, 0.1);
    }
  }
}
