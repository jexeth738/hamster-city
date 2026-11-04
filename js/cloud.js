// ===== Online: anonymous player, cloud save, leaderboard (Supabase) =====
// Only the publishable key lives here. Row Level Security on `players` lets anyone read the
// leaderboard columns and lets each anonymous browser write only its own row.
const CLOUD = { url: 'https://gasoybospdaizewzqchs.supabase.co', key: 'sb_publishable_CA1DPUDtzfWcNiaIk-mOOw_W8JCZFZD' };
const PLAYER_KEY = 'squeekcity.player.v1';
const BOARDS = [
  { id: 'seeds', tab: 'GOLDEN SEEDS', fmt: v => v.toLocaleString('en-US') },
  { id: 'missions', tab: 'MISSIONS', fmt: v => `${v}/${MISSIONS.length}` },
  { id: 'best_wanted_secs', tab: 'LONGEST ESCAPE', fmt: v => fmtSecs(v) },
];
const Cloud = {
  sb: null, uid: null, anonOK: null, auth: Promise.resolve(), me: null, state: 'off', lastSync: 0, sentBody: '', busy: false, local: {},
  init() {
    try { this.local = JSON.parse(localStorage.getItem(PLAYER_KEY)) || {}; } catch (e) { this.local = {}; }
    try {
      this.sb = supabase.createClient(CLOUD.url, CLOUD.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'squeekcity.auth' } });
    } catch (e) { this.state = 'offline'; return; }
    this.ready = this.connect(false).catch(() => { this.state = 'offline'; });
    // only ask for a name if the project accepts anonymous sign-ins (otherwise the board stays read-only)
    this.auth = this.timed(fetch(CLOUD.url + '/auth/v1/settings', { headers: { apikey: CLOUD.key } }).then(r => r.json()))
      .then(j => { this.anonOK = !!(j.external && j.external.anonymous_users); }).catch(() => { this.anonOK = false; });
    BUS.on('saved', () => { if (Date.now() - this.lastSync > 10000) this.sync(); });
    setInterval(() => this.retry(), 30000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.sync(); });
  },
  // periodic push; if we never reached the server (offline at launch), try to reconnect instead
  retry() { if (this.uid) return this.sync(); if (this.sb && this.name() && this.state !== 'connecting') return this.connect(false).catch(() => { this.state = 'offline'; }); },
  name() { return (this.me && this.me.name) || this.local.name || null; },
  needsName() { return !this.name() && !this.local.skipped && this.anonOK === true; },
  canJoin() { return !!this.uid || this.anonOK !== false; },
  remember(o) { Object.assign(this.local, o); try { localStorage.setItem(PLAYER_KEY, JSON.stringify(this.local)); } catch (e) { } },
  // network calls never hang the game: everything races an 8s timeout
  timed(p, ms = 8000) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); },
  async connect(create) {
    if (!this.sb) throw new Error('no client');
    this.state = 'connecting';
    try { await this.link(create); } catch (e) { this.state = 'offline'; throw e; }
  },
  async link(create) {
    let { data: { session } } = await this.timed(this.sb.auth.getSession());
    if (!session) {
      if (!create) { this.state = 'off'; return; }
      const r = await this.timed(this.sb.auth.signInAnonymously()); if (r.error) throw r.error; session = r.data.session;
    }
    this.uid = session.user.id;
    const { data, error } = await this.timed(this.sb.rpc('my_player')); if (error) throw error;
    const row = data && data[0];
    if (row) {
      this.me = row; this.remember({ name: row.name, skipped: false });
      // newer of local vs cloud wins; only swap saves before a run starts
      const cs = row.save, ls = G.save;
      if (cs && (cs.at || 0) > (ls.at || 0) && !(window.__game && __game.scene.isActive('City'))) { G.use(cs); G.persist(); BUS.emit('cloudLoaded'); }
    }
    this.state = 'online';
    if (this.name()) await this.sync(true);
  },
  scores() { const s = G.save; return { seeds: Math.min(1e6, s.golden | 0), missions: Math.min(13, s.missions | 0), best_wanted_secs: Math.min(7200, s.bestWanted | 0) }; },
  // push the save + scores; update first, insert if this browser has no row yet
  async sync(force) {
    if (!this.sb || !this.uid || !this.name() || this.busy) return false;
    const body = JSON.stringify(G.save); if (!force && body === this.sentBody) return true;
    this.busy = true;
    try {
      const row = Object.assign({ name: this.name(), save: G.save }, this.scores());
      if (this.local.wallet !== undefined) row.wallet = this.local.wallet || null;
      let r = await this.timed(this.sb.from('players').update(row).eq('id', this.uid).select('seeds,missions,best_wanted_secs'));
      if (!r.error && (!r.data || !r.data.length)) r = await this.timed(this.sb.from('players').insert(row).select('seeds,missions,best_wanted_secs'));
      if (r.error) throw r.error;
      this.me = Object.assign(this.me || {}, row, r.data[0]); this.sentBody = body; this.lastSync = Date.now(); this.state = 'online';
      return true;
    } catch (e) { if (!(e && e.code)) this.state = 'offline'; this.err = e; return false; } finally { this.busy = false; }
  },
  // first launch: pick a name (and optional wallet), sign in anonymously, create the row
  async register(name, wallet) {
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return 'Use 3-16 letters, numbers or _';
    if (wallet && !/^[A-Za-z0-9_.:-]{1,64}$/.test(wallet)) return 'Wallet looks wrong (letters, numbers, . _ : - only)';
    const prev = { name: this.local.name, wallet: this.local.wallet, me: this.me };
    try {
      if (!this.uid) await this.connect(true);
      for (let i = 0; this.busy && i < 40; i++) await new Promise(r => setTimeout(r, 200));
      this.remember({ name, wallet: wallet || '', skipped: false }); if (this.me) this.me.name = name;
      if (await this.sync(true)) return null;
      throw this.err || new Error('sync');
    } catch (e) {
      this.remember({ name: prev.name, wallet: prev.wallet }); this.me = prev.me;
      if (e && e.code === '23505') return 'That name is taken, try another';
      if (e && e.code === '23514') return 'Use 3-16 letters, numbers or _';
      if (e && e.code === 'anonymous_provider_disabled') return 'Online sign-in is switched off right now. Play offline for now';
      return 'Leaderboard is offline right now. Try again later';
    }
  },
  async board(col) {
    if (!this.sb) throw new Error('offline');
    const { data, error } = await this.timed(this.sb.from('players').select('id,name,seeds,missions,best_wanted_secs').gt(col, 0).order(col, { ascending: false }).order('name').limit(20));
    if (error) throw error;
    let rank = null; const mine = this.me && this.me[col];
    if (this.uid && mine > 0) {
      const r = await this.timed(this.sb.from('players').select('id', { count: 'exact', head: true }).gt(col, mine));
      if (!r.error) rank = (r.count || 0) + 1;
    }
    return { rows: data, rank, mine };
  },
};
