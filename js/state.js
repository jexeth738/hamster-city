// ===== Global state, save, live Squeekchain feed =====
const BUS = new Phaser.Events.EventEmitter();
const SAVE_KEYS = { live: 'squeekcity.save.live.v2', practice: 'squeekcity.save.practice.v2' };
const URLP = new URLSearchParams(location.search);
const DEFAULT_SAVE = () => ({ rulesVersion: 2, mode: 'live', wheelHeists: 0, seeds: 25, total: 0, missions: 0, up: { speed: 0, sack: 0, dash: 0, armor: 0 }, skins: ['classic'], skin: 'classic', golden: 0, stats: { busted: 0, blocks: 0, stolen: 0 }, sound: true, seenHelp: false });
const G = {
  playMode: 'live', save: DEFAULT_SAVE(), hp: 100, stars: 0, area: 'city', mission: null, frozen: false, inVehicle: null,
  key() { return SAVE_KEYS[this.playMode]; },
  selectMode(mode) {
    if (!['live', 'practice'].includes(mode)) return false;
    this.persist(); this.playMode = mode; this.save = DEFAULT_SAVE(); this.save.mode = mode; this.lastBody = ''; this.lootCd = {};
    this.load(); Live.selectMode(mode); Sound.on = this.save.sound !== false; BUS.emit('mode', mode); return true;
  },
  hasSave() { try { return !!localStorage.getItem(this.key()); } catch (e) { return false; } },
  load() { try { const s = JSON.parse(localStorage.getItem(this.key())); if (s) this.use(s); } catch (e) { } },
  // adopt a save object (local or cloud) without counting it as new progress
  use(s) { if (!s || s.rulesVersion !== 2 || s.mode !== this.playMode) return false; this.save = Object.assign(DEFAULT_SAVE(), s, { up: Object.assign(DEFAULT_SAVE().up, s.up || {}), stats: Object.assign(DEFAULT_SAVE().stats, s.stats || {}) }); this.lastBody = this.body(); },
  body() { const { at, ...rest } = this.save; return JSON.stringify(rest); },
  // save.at only moves when something actually changed, so local vs cloud can pick the newer save
  persist() { const b = this.body(); if (b !== this.lastBody) { this.lastBody = b; this.save.at = Date.now(); BUS.emit('saved'); } try { localStorage.setItem(this.key(), JSON.stringify(this.save)); } catch (e) { } },
  reset() { this.save = DEFAULT_SAVE(); this.save.mode = this.playMode; this.persist(); },
  cap() { return SACK_CAPS[this.save.up.sack] || 250; },
  addSeeds(n, raw) {
    if (!Live.canReward()) return 0;
    const v = raw ? Math.round(n) : Math.max(1, Math.round(n * Live.mult()));
    const before = this.save.seeds; this.save.seeds = Math.min(this.cap(), this.save.seeds + v);
    const got = this.save.seeds - before; this.save.total += got; this.save.stats.stolen += got;
    BUS.emit('seeds', got, v - got); return got;
  },
  spend(n) { if (this.save.seeds < n) return false; this.save.seeds -= n; this.persist(); BUS.emit('seeds', -n, 0); return true; },
  speedMul() { return 1 + 0.12 * this.save.up.speed; },
  armorMul() { return 1 - 0.2 * this.save.up.armor; },
  setStars(n, why) { n = Phaser.Math.Clamp(n, 0, 5); if (n === this.stars) return; const up = n > this.stars; if (!this.stars) this.wantedT = 0; this.stars = n; BUS.emit('stars', n, up, why); if (up) Sound.sfx('star'); },
  // stars cooled all the way down: that's an escape (getting squashed doesn't count)
  escaped() { const t = Math.round(this.wantedT || 0); this.wantedT = 0; const rec = Live.canReward() && t > (this.save.bestWanted || 0); if (rec) { this.save.bestWanted = t; this.persist(); } return { t, rec }; },
  crime(n = 1, why) { this.setStars(Math.max(this.stars, Math.min(5, this.stars + n)), why); },
};
const Controls = { mx: 0, my: 0, kx: 0, ky: 0, tx: 0, ty: 0, touch: false, action: false, dash: false, brake: false, dashHeld: false,
  take(k) { const v = this[k]; this[k] = false; return v; },
  move() { let x = this.kx + this.tx, y = this.ky + this.ty; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } return { x, y, mag: Math.min(1, l), touch: (this.tx || this.ty) !== 0 }; } };

// ===== Live Squeekchain data =====
const Live = {
  API: 'https://api.squeekchain.com/v1/status',
  mode: 'connecting', requestedMode: 'live', status: 'UNKNOWN', rpm: 0, speed: 0, height: '0', settledHeight: '0', progress: 0,
  fresh: 'unknown', updated: 0, validUntil: 0, fails: 0, zoomies: false, simT: 0, raw: null, session: 0, identity: '', highWater: '0', blockSerial: 0,
  selectMode(mode) {
    if (this.requestedMode === mode) return;
    this.requestedMode = mode; this.session++; this.identity = ''; this.highWater = '0'; this.validUntil = 0; this.blockSerial = 0;
    this.status = 'UNKNOWN'; this.rpm = this.speed = this.progress = 0; this.height = this.settledHeight = '0'; this.zoomies = false;
    if (mode === 'practice') {
      this.mode = 'practice'; this.simT = 0;
      this.apply({ status: 'ACTIVE', rpm: 35, speed: 525, height: '100', progress: 0.2 });
    } else { this.mode = 'connecting'; if (this.started) this.poll(); }
    BUS.emit('live');
  },
  start() {
    if (this.started) return; this.started = true;
    this.poll(); setInterval(() => this.poll(), 5000);
    setInterval(() => { if (this.requestedMode === 'practice') this.simTick(); else if (this.mode === 'live' && !this.isFresh()) this.hold('Telemetry expired'); }, 1000);
    document.addEventListener('visibilitychange', () => {
      if (this.requestedMode !== 'live') return;
      // A hidden tab cannot observe the intervening blocks; always reconnect from a baseline.
      this.session++; this.hold('Reconnecting after tab switch');
      if (!document.hidden) this.poll();
    });
  },
  isFresh(now = Date.now()) { return !document.hidden && this.mode === 'live' && now < this.validUntil && now - this.updated < 15000; },
  canReward() { return G.playMode === 'practice' ? this.mode === 'practice' : G.playMode === 'live' && this.isFresh(); },
  wheelOpen() { return this.canReward() && this.status === 'ACTIVE'; },
  hold(reason) {
    this.mode = 'hold'; this.fresh = 'unknown'; this.validUntil = 0; this.zoomies = false; this.reason = reason || 'Feed unavailable'; BUS.emit('live');
  },
  async poll() {
    if (document.hidden || this.requestedMode !== 'live' || Date.now() < (this.retryAt || 0)) return;
    const session = this.session; const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 4500);
    try {
      const r = await fetch(this.API, { signal: ctl.signal, cache: 'no-store' });
      if (!r.ok) { const retry = Number(r.headers.get('Retry-After')); if (retry > 0) this.retryAt = Date.now() + retry * 1000; throw new Error('HTTP ' + r.status); }
      const j = await r.json();
      if (session === this.session && this.requestedMode === 'live') this.accept(j);
    } catch (e) { if (session === this.session && this.requestedMode === 'live') { this.fails++; this.hold('Feed disconnected — payouts held'); } }
    finally { clearTimeout(to); }
  },
  accept(j, now = Date.now()) {
    if (this.requestedMode !== 'live') return false;
    if (document.hidden) { this.hold('Tab hidden — reconnect from baseline'); return false; }
    const m = j && j.measurement, b = j && j.builder, projection = b && b.projected, anchor = b && b.anchor;
    const uint = v => typeof v === 'string' && /^(0|[1-9][0-9]*)$/.test(v);
    const received = Date.parse(m && m.receivedAt), observed = Date.parse(m && m.observedAt);
    const ttl = m && Number.isFinite(m.staleAfterSeconds) ? Math.min(120, m.staleAfterSeconds) * 1000 : 0;
    const healthy = j && j.schemaVersion === 1 && typeof j.installationId === 'string' && m && m.freshness === 'online' && m.provenance === 'hardware' &&
      ['ACTIVE', 'IDLE'].includes(m.coreStatus) && Number.isFinite(m.rpmMilli) && m.rpmMilli >= 0 && Number.isFinite(m.speedMmPerSecond) && m.speedMmPerSecond >= 0 &&
      typeof m.counterEpoch === 'string' && ttl > 0 && Number.isFinite(received) && Number.isFinite(observed) && received <= now + 5000 && observed <= now + 5000 &&
      now - received < ttl && now - observed < ttl && b && b.status === 'available' && projection && projection.lifecycle === 'optimistic' &&
      uint(projection.blockHeight) && uint(projection.blockProgress) && BigInt(projection.blockProgress) < 1000000000n && anchor && uint(anchor.blockHeight) &&
      j.oracle && j.oracle.state === 'accepted';
    if (!healthy) { this.hold('Hardware telemetry stale or unavailable'); return false; }
    const identity = j.installationId + ':' + m.counterEpoch;
    const continuous = this.isFresh(now) && identity === this.identity;
    const previous = this.height, prevStatus = this.status;
    if (identity !== this.identity) {
      this.identity = identity;
      try { this.highWater = localStorage.getItem('squeekcity.blocks.' + identity) || '0'; } catch (e) { this.highWater = '0'; }
      if (!uint(this.highWater)) this.highWater = '0';
    }
    const height = projection.blockHeight, newHeight = BigInt(height) > BigInt(this.highWater);
    this.raw = j; this.mode = 'live'; this.reason = ''; this.fresh = 'online'; this.fails = 0; this.updated = now;
    this.validUntil = Math.min(received + ttl, observed + ttl); this.settledHeight = anchor.blockHeight;
    this.status = m.coreStatus === 'ACTIVE' || m.rpmMilli > 2000 || m.speedMmPerSecond > 30 ? 'ACTIVE' : 'IDLE';
    this.rpm = m.rpmMilli / 1000; this.speed = m.speedMmPerSecond; this.height = height; this.progress = Number(projection.blockProgress) / 1e9;
    this.zoomies = this.status === 'ACTIVE' && this.rpm >= ZOOMIES_RPM;
    if (newHeight) {
      this.highWater = height;
      try { localStorage.setItem('squeekcity.blocks.' + identity, height); } catch (e) { }
      // Only the newest height observed during uninterrupted fresh polling opens an event. No backfill.
      if (continuous) { this.blockSerial++; BUS.emit('block', { from: previous, to: height, count: 1, simulated: false, source: 'projected', serial: this.blockSerial }); }
    }
    if (prevStatus !== this.status) BUS.emit('phase', this.status);
    BUS.emit('live'); return true;
  },
  // Used ONLY by explicit PRACTICE; ?sim cannot change LIVE data or saves.
  apply(d) {
    if (this.requestedMode !== 'practice') return;
    const prevStatus = this.status, prevHeight = this.height;
    Object.assign(this, d); this.zoomies = this.status === 'ACTIVE' && this.rpm >= ZOOMIES_RPM;
    if (BigInt(d.height) > BigInt(prevHeight)) { this.blockSerial++; BUS.emit('block', { from: prevHeight, to: d.height, count: 1, simulated: true, source: 'simulated', serial: this.blockSerial }); }
    if (prevStatus !== this.status) BUS.emit('phase', this.status);
    BUS.emit('live');
  },
  simTick() {
    if (this.requestedMode !== 'practice') return;
    this.simT++; const cycle = this.simT % 90, active = cycle < 65;
    const debug = URLP.get('sim'); const running = debug ? debug !== 'idle' : active;
    const rpm = running ? (debug === 'zoomies' || cycle > 45 ? 80 : 35) : 0;
    let progress = this.progress + (running ? 0.07 : 0), height = BigInt(this.height);
    if (progress >= 1) { progress -= 1; height++; }
    this.apply({ status: running ? 'ACTIVE' : 'IDLE', rpm, speed: rpm * 15, height: height.toString(), progress });
  },
  isDay() { return this.status === 'ACTIVE'; },
  rpmBonus() { return 1 + Math.min(this.rpm, 100) / 250; },
  mult() { return this.canReward() ? (this.isDay() ? (this.zoomies ? 2 : 1) : 0.5) : 0; },
  chaseMul() { return this.canReward() && this.zoomies ? 1.35 : 1; },
  vehMul() { return this.canReward() && this.isDay() ? 1.12 * this.rpmBonus() : 1; },
  sight() { return this.isDay() ? (this.zoomies ? 1.15 : 1) : 0.6; },
  eventText() {
    if (!this.canReward()) return 'SIGNAL LOST · PAYOUTS HELD';
    return this.wheelOpen() ? (this.zoomies ? 'ZOOMIES · x2 LOOT / FASTER CHASE' : 'WHEEL HEIST OPEN · RUN BEFORE HE SLEEPS') : 'SLEEP · WHEEL HEIST CLOSED / x0.5 LOOT';
  },
};
function fmtBlock(h) { try { return BigInt(h || 0).toLocaleString('en-US'); } catch (e) { return '?'; } }
function fmtSecs(t) { t = Math.max(0, Math.round(t)); const m = Math.floor(t / 60), s = t % 60; return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`; }
