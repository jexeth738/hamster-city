// Wheel contracts and block-tagged cargo. Seeds are game points, never SQK.
const Heists = {
  cache: null, cargo: null, seen: new Set(),
  reset() { this.cache = this.cargo = null; this.seen.clear(); },
  openBlock(d) {
    if (!Live.canReward() || !!d.simulated !== (G.playMode === 'practice') || !/^[0-9]+$/.test(d.to)) return null;
    const id = (d.simulated ? 'practice' : Live.identity) + ':' + d.to;
    if (this.seen.has(id)) return null;
    this.seen.add(id); if (this.seen.size > 256) this.seen.delete(this.seen.values().next().value);
    this.cache = { id, block: d.to, source: d.source, simulated: !!d.simulated, expires: Date.now() + 90000, collected: false };
    return this.cache;
  },
  take(cache) {
    if (!Live.canReward() || this.cargo || cache !== this.cache || cache.collected || Date.now() >= cache.expires) return false;
    cache.collected = true;
    this.cargo = { block: cache.block, source: cache.source, simulated: cache.simulated, amount: Math.round(25 * Live.mult()), observedAt: Date.now() };
    G.crime(3, 'golden heist');
    BUS.emit('banner', { text: 'GOLDEN CARGO · NOT BANKED', sub: 'Lose every star. Return to the W at the hideout to extract.', color: '#ffd84a', dur: 4500 });
    BUS.emit('live'); return true;
  },
  bank() {
    if (!this.cargo || !Live.canReward() || G.stars > 0) return false;
    const cargo = this.cargo; this.cargo = null;
    const got = G.addSeeds(cargo.amount, true); G.save.golden++;
    G.save.receipts = [...(G.save.receipts || []), { ...cargo, bankedAt: Date.now(), paid: got }].slice(-10);
    G.persist(); MissionSys.golden();
    BUS.emit('banner', { text: 'GOLDEN HEIST EXTRACTED', sub: `${cargo.simulated ? 'SIMULATED' : 'OBSERVED WHEEL'} BLOCK #${fmtBlock(cargo.block)} · +${got} seeds`, color: '#7dff9a' });
    BUS.emit('live'); return true;
  },
  contract() {
    if (!Live.wheelOpen()) return null;
    const routes = [ [[860, 257], [670, 257]], [[368, 257], [258, 512]], [[937, 540], [630, 648]], [[520, 285], [900, 330]] ];
    const pts = routes[Number(BigInt(Live.height) % BigInt(routes.length))];
    return { id: 'wheel', side: true, wheel: true, title: 'Wheel Heist', reward: 80,
      intro: [['pixel', `Squeektoshi is running. His block #${fmtBlock(Live.height)} sets this route. Grab the two relay caches, shake the patrols, then get home.`],
        ['pixel', 'Your payout unlocks only when we observe another wheel block after you get home. If he sleeps before extraction, the contract closes. No fake blocks.']],
      steps: [ { t: 'stars', n: 2 }, { t: 'checkpoints', pts, text: 'Collect the WHEEL RELAY caches' },
        { t: 'lose', text: 'Lose the patrols before Squeektoshi sleeps' },
        { t: 'goto', area: 'city', x: CITY.hideout.x, y: CITY.hideout.y, r: 26, text: 'Extract to the W at the HIDEOUT' },
        { t: 'block', text: 'Cargo secured. Squeektoshi must produce the next block' } ] };
  },
  label() {
    if (!Live.canReward()) return 'SIGNAL LOST · rewards held, no simulation';
    if (this.cargo) return `CARGO #${fmtBlock(this.cargo.block)} · lose heat + extract at W`;
    if (this.cache && !this.cache.collected && Date.now() < this.cache.expires) return `GOLDEN HEIST #${fmtBlock(this.cache.block)} · ${Math.ceil((this.cache.expires - Date.now()) / 1000)}s`;
    return Live.eventText();
  },
};
BUS.on('mode', () => Heists.reset());
