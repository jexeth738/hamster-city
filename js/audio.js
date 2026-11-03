// ===== Chiptune synth: music + sfx (WebAudio, no files) =====
const Sound = {
  ctx: null, master: null, musicGain: null, sfxGain: null, on: true, song: null, tempoMul: 1,
  step: 0, nextTime: 0, timer: null, engine: null, siren: null,
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.8 : 0; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.32; this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.55; this.sfxGain.connect(this.master);
      const len = this.ctx.sampleRate * 0.5; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.timer = setInterval(() => this.schedule(), 40);
    } catch (e) { this.ctx = null; }
  },
  resume() { this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setOn(v) { this.on = v; if (this.master) this.master.gain.setTargetAtTime(v ? 0.8 : 0, this.ctx.currentTime, 0.05); },
  tone(f, t, dur, type = 'square', vol = 0.2, slide = 0, dest) {
    if (!this.ctx) return; const c = this.ctx;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(t, dur, vol = 0.2, hp = 1000, dest) {
    if (!this.ctx) return; const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxGain); s.start(t); s.stop(t + dur + 0.02);
  },
  sfx(name) {
    if (!this.ctx || !this.on) return; const t = this.ctx.currentTime;
    const T = (f, d, ty, v, sl, dt = 0) => this.tone(f, t + dt, d, ty, v, sl);
    switch (name) {
      case 'seed': T(1320, 0.06, 'square', 0.12); T(1760, 0.08, 'square', 0.1, 0, 0.05); break;
      case 'loot': [660, 880, 1100, 1320].forEach((f, i) => T(f, 0.09, 'square', 0.13, 0, i * 0.05)); break;
      case 'gold': [784, 988, 1175, 1568, 1976].forEach((f, i) => T(f, 0.14, 'triangle', 0.2, 0, i * 0.06)); T(2637, 0.4, 'sine', 0.1, 0, 0.3); break;
      case 'block': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => T(f, 0.16, 'square', 0.12, 0, i * 0.08)); this.noise(t, 0.3, 0.08, 4000); break;
      case 'hurt': T(220, 0.18, 'sawtooth', 0.22, 0.4); this.noise(t, 0.1, 0.12, 800); break;
      case 'dash': this.noise(t, 0.18, 0.12, 2500); T(400, 0.15, 'triangle', 0.12, 2.5); break;
      case 'door': T(300, 0.06, 'square', 0.12); T(200, 0.1, 'square', 0.1, 0, 0.07); break;
      case 'enter': T(500, 0.08, 'triangle', 0.15, 1.6); this.noise(t, 0.06, 0.06, 3000); break;
      case 'horn': T(415, 0.25, 'square', 0.14); T(523, 0.25, 'square', 0.1); break;
      case 'crash': this.noise(t, 0.35, 0.3, 300); T(120, 0.3, 'sawtooth', 0.2, 0.5); break;
      case 'star': T(880, 0.12, 'square', 0.15); T(660, 0.18, 'square', 0.15, 0, 0.12); break;
      case 'lose': T(660, 0.1, 'triangle', 0.15); T(880, 0.1, 'triangle', 0.15, 0, 0.1); T(1320, 0.2, 'triangle', 0.15, 0, 0.2); break;
      case 'mission': [523, 659, 784, 1046, 0, 988, 1046].forEach((f, i) => f && T(f, 0.2, 'square', 0.13, 0, i * 0.11)); break;
      case 'fail': [392, 370, 349, 262].forEach((f, i) => T(f, 0.28, 'sawtooth', 0.12, 0, i * 0.2)); break;
      case 'blip': T(990, 0.04, 'square', 0.08); break;
      case 'select': T(660, 0.05, 'square', 0.1); T(990, 0.07, 'square', 0.1, 0, 0.05); break;
      case 'buy': [784, 1046, 1318].forEach((f, i) => T(f, 0.1, 'square', 0.12, 0, i * 0.06)); break;
      case 'meow': T(700, 0.35, 'sawtooth', 0.08, 1.4); T(900, 0.2, 'triangle', 0.06, 0.6, 0.2); break;
      case 'zoomies': for (let i = 0; i < 10; i++) T(400 + i * 120, 0.06, 'square', 0.1, 0, i * 0.035); break;
      case 'scan': T(1200, 0.03, 'square', 0.05); break;
    }
  },
  // ---- music ----
  songs: {
    title: { bpm: 112, root: 57, scale: [0, 3, 5, 7, 10], bass: [0, 0, 7, 0, 5, 5, 3, 3], lead: [0, 2, 4, 3, 2, 0, -1, 0, 4, 3, 2, 4, 5, 4, 2, 0], drums: 'k.h.s.h.k.k.s.h.', vol: 1 },
    day: { bpm: 128, root: 60, scale: [0, 2, 4, 7, 9], bass: [0, 0, 5, 5, 3, 3, 4, 4], lead: [2, 4, 3, 4, 2, 1, 0, -1, 2, 3, 4, 6, 5, 4, 3, 1], drums: 'k.hsk.hsk.hsk.hs', vol: 1 },
    night: { bpm: 92, root: 57, scale: [0, 3, 5, 7, 10], bass: [0, 0, -2, -2, 3, 3, 2, 2], lead: [4, -1, 3, -1, 2, -1, 0, -1, 4, -1, 5, 4, 3, -1, 1, -1], drums: 'k...s...k.k.s...', vol: 0.7 },
    chase: { bpm: 150, root: 55, scale: [0, 1, 4, 5, 7, 8, 10], bass: [0, 0, 0, 1, 0, 0, 5, 4], lead: [0, 2, 3, 2, 4, 3, 2, 1, 0, 2, 3, 5, 6, 5, 3, 2], drums: 'khshkhshkhshkkss', vol: 1 },
  },
  play(name) { if (this.songName === name) return; this.songName = name; this.song = this.songs[name]; this.step = 0; if (this.ctx) this.nextTime = this.ctx.currentTime + 0.05; },
  note(deg) { const s = this.song.scale; const o = Math.floor(deg / s.length); const i = ((deg % s.length) + s.length) % s.length; return 440 * Math.pow(2, (this.song.root + s[i] + 12 * o - 69) / 12); },
  schedule() {
    if (!this.ctx || !this.song) return; const c = this.ctx; if (c.state !== 'running') return;
    const spb = 60 / (this.song.bpm * this.tempoMul) / 4;
    if (this.nextTime < c.currentTime - 0.5) this.nextTime = c.currentTime + 0.05;
    while (this.nextTime < c.currentTime + 0.15) {
      const t = this.nextTime, st = this.step, sg = this.song, v = sg.vol;
      if (st % 4 === 0) { const b = sg.bass[(st / 4 | 0) % sg.bass.length]; this.tone(this.note(b) / 4, t, spb * 3.6, 'triangle', 0.33 * v, 0, this.musicGain); }
      if (st % 2 === 0) { const l = sg.lead[(st / 2 | 0) % sg.lead.length]; if (l >= 0 && !((st / 32 | 0) % 4 === 3 && st % 8 > 3)) this.tone(this.note(l + 5), t, spb * 1.8, 'square', 0.07 * v, 0, this.musicGain); }
      if (st % 1 === 0 && this.songName !== 'night') { const a = [0, 2, 4][st % 3]; this.tone(this.note(a + 10), t, spb * 0.6, 'square', 0.022 * v, 0, this.musicGain); }
      const d = sg.drums[st % sg.drums.length];
      if (d === 'k') this.tone(140, t, 0.12, 'sine', 0.45 * v, 0.3, this.musicGain);
      if (d === 's') this.noise(t, 0.09, 0.14 * v, 1800, this.musicGain);
      if (d === 'h') this.noise(t, 0.03, 0.05 * v, 7000, this.musicGain);
      this.step++; this.nextTime += spb;
    }
  },
  // continuous engine / siren
  setEngine(level) {
    if (!this.ctx) return; const c = this.ctx;
    if (!this.engine) { const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0; o.connect(f); f.connect(g); g.connect(this.sfxGain); o.start(); this.engine = { o, g, f }; }
    const on = level > 0 && this.on; this.engine.g.gain.setTargetAtTime(on ? 0.05 + level * 0.05 : 0, c.currentTime, 0.08);
    this.engine.o.frequency.setTargetAtTime(55 + level * 140, c.currentTime, 0.08);
  },
  setSiren(vol) {
    if (!this.ctx) return; const c = this.ctx;
    if (!this.siren) { const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(); o.type = 'square'; o.frequency.value = 700; l.frequency.value = 1.6; lg.gain.value = 180; l.connect(lg); lg.connect(o.frequency); g.gain.value = 0; o.connect(g); g.connect(this.sfxGain); o.start(); l.start(); this.siren = { o, g }; }
    this.siren.g.gain.setTargetAtTime(this.on ? vol * 0.05 : 0, c.currentTime, 0.1);
  },
};
