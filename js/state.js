// ===== Global state, save, live Squeekchain feed =====
const BUS = new Phaser.Events.EventEmitter();
const SAVE_KEY = 'squeekcity.save.v1';
const URLP = new URLSearchParams(location.search);
const DEFAULT_SAVE = () => ({ seeds: 25, total: 0, missions: 0, up: { speed: 0, sack: 0, dash: 0, armor: 0 }, skins: ['classic'], skin: 'classic', golden: 0, stats: { busted: 0, blocks: 0, stolen: 0 }, sound: true, seenHelp: false });
const G = {
  save: DEFAULT_SAVE(), hp: 100, stars: 0, area: 'city', mission: null, frozen: false, inVehicle: null,
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  load() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) this.save = Object.assign(DEFAULT_SAVE(), s, { up: Object.assign(DEFAULT_SAVE().up, s.up || {}), stats: Object.assign(DEFAULT_SAVE().stats, s.stats || {}) }); } catch (e) { } },
  persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (e) { } },
  reset() { this.save = DEFAULT_SAVE(); this.persist(); },
  cap() { return SACK_CAPS[this.save.up.sack] || 250; },
  addSeeds(n, raw) {
    const v = raw ? Math.round(n) : Math.max(1, Math.round(n * Live.mult()));
    const before = this.save.seeds; this.save.seeds = Math.min(this.cap(), this.save.seeds + v);
    const got = this.save.seeds - before; this.save.total += got; this.save.stats.stolen += got;
    BUS.emit('seeds', got, v - got); return got;
  },
  spend(n) { if (this.save.seeds < n) return false; this.save.seeds -= n; this.persist(); BUS.emit('seeds', -n, 0); return true; },
  speedMul() { return 1 + 0.12 * this.save.up.speed; },
  armorMul() { return 1 - 0.2 * this.save.up.armor; },
  setStars(n, why) { n = Phaser.Math.Clamp(n, 0, 5); if (n === this.stars) return; const up = n > this.stars; this.stars = n; BUS.emit('stars', n, up, why); if (up) Sound.sfx('star'); },
  crime(n = 1, why) { this.setStars(Math.max(this.stars, Math.min(5, this.stars + n)), why); },
};
const Controls = { mx: 0, my: 0, kx: 0, ky: 0, tx: 0, ty: 0, touch: false, action: false, dash: false, brake: false, dashHeld: false,
  take(k) { const v = this[k]; this[k] = false; return v; },
  move() { let x = this.kx + this.tx, y = this.ky + this.ty; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } return { x, y, mag: Math.min(1, l), touch: (this.tx || this.ty) !== 0 }; } };

// ===== Live Squeekchain data =====
const Live = {
  API: 'https://api.squeekchain.com/v1/status',
  mode: 'connecting', status: 'IDLE', rpm: 0, speed: 0, height: 0, progress: 0, fresh: 'unknown', updated: 0, fails: 0, lastHeight: 0,
  zoomies: false, debug: URLP.get('sim'), simPhase: 0, simT: 0, raw: null,
  start() {
    if (this.started) return; this.started = true;
    if (this.debug) { this.mode = 'sim'; this.height = 7700; this.progress = 0.3; this.status = this.debug === 'idle' ? 'IDLE' : 'ACTIVE'; this.rpm = this.debug === 'zoomies' ? 72 : (this.status === 'ACTIVE' ? 38 : 0); }
    this.poll(); setInterval(() => this.poll(), 5000); setInterval(() => this.simTick(), 1000);
  },
  async poll() {
    if (this.debug) return;
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 4500);
    try {
      const r = await fetch(this.API, { signal: ctl.signal, cache: 'no-store' }); clearTimeout(to);
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json(); this.raw = j;
      const m = j.measurement || {}; const b = (j.builder && (j.builder.projected || j.builder.anchor)) || {};
      const st = String(m.coreStatus || 'IDLE').toUpperCase();
      const h = parseInt(b.blockHeight, 10); const p = parseInt(b.blockProgress, 10);
      if (!isFinite(h)) throw new Error('shape');
      const rpm = (Number(m.rpmMilli) || 0) / 1000, spd = Number(m.speedMmPerSecond) || 0;
      this.coreStatus = st;
      // coreStatus can lag behind the wheel sensor, so treat a turning wheel as running too
      this.apply({ status: (st === 'ACTIVE' || rpm > 2 || spd > 30) ? 'ACTIVE' : 'IDLE', rpm, speed: spd, height: h, progress: isFinite(p) ? Phaser.Math.Clamp(p / 1e9, 0, 1) : 0 });
      this.fresh = m.freshness || 'online'; this.mode = 'live'; this.fails = 0; this.updated = Date.now();
    } catch (e) {
      clearTimeout(to); this.fails++;
      if (this.mode !== 'live' || this.fails >= 3) { if (this.mode !== 'sim') { this.mode = 'sim'; if (!this.height) { this.height = 7700; this.progress = 0.2; } BUS.emit('live'); } }
    }
  },
  apply(d) {
    const prevStatus = this.status;
    const prevH = this.height;
    Object.assign(this, d);
    this.zoomies = this.status === 'ACTIVE' && this.rpm >= ZOOMIES_RPM;
    if (prevH && d.height > prevH) BUS.emit('block', { from: prevH, to: d.height, count: d.height - prevH });
    if (prevStatus !== this.status) BUS.emit('phase', this.status);
    BUS.emit('live');
  },
  simTick() {
    if (this.mode !== 'sim') return;
    this.simT++;
    if (this.debug) {
      let pr = this.progress + (this.status === 'ACTIVE' ? 0.035 + this.rpm / 2000 : 0); let h = this.height;
      if (pr >= 1) { pr -= 1; h++; }
      this.apply({ status: this.status, rpm: this.status === 'ACTIVE' ? (this.debug === 'zoomies' ? 66 : 34) + Math.sin(this.simT / 3) * 6 : 0, speed: this.status === 'ACTIVE' ? 260 : 0, height: h, progress: pr });
      return;
    }
    // natural cycle: 90s running, 60s sleeping
    const cyc = this.simT % 150; const act = cyc < 90;
    const rpm = act ? 30 + 20 * Math.sin(this.simT / 7) + (cyc > 60 && cyc < 75 ? 25 : 0) : 0;
    let pr = this.progress + (act ? 0.02 + rpm / 3000 : 0); let h = this.height;
    if (pr >= 1) { pr -= 1; h++; }
    this.apply({ status: act ? 'ACTIVE' : 'IDLE', rpm, speed: rpm * 15, height: h, progress: pr });
  },
  isDay() { return this.status === 'ACTIVE'; },
  rpmBonus() { return 1 + Math.min(this.rpm, 100) / 250; },
  mult() { return Math.round(((this.isDay() ? 1 : 0.5) * (this.isDay() ? this.rpmBonus() : 1) * (this.zoomies ? 2 : 1)) * 10) / 10; },
  vehMul() { return this.isDay() ? 1.12 * this.rpmBonus() : 1; },
  sight() { return this.isDay() ? 1 : 0.6; },
};
