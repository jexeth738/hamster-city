// ===== Interior scene =====
G.lootCd = {};
class InteriorScene extends WorldScene {
  constructor() { super('Interior'); }
  init(data) { this.door = data.door; this.def = INTERIORS[this.door.interior]; }
  create() {
    const def = this.def, door = this.door; G.area = door.id; this.vehicle = null; this.leaving = false; this.alarm = false;
    this.flip = door.interior === 'house' && door.variant % 2 === 1;
    this.fx = x => this.flip ? 1024 - x : x;
    const rects = def.walls.concat(def.solids);
    this.setupWorld({ tex: def.tex, scale: IS, srcW: 1024, srcH: 1024, rects, cell: 16, flipX: this.flip });
    const tints = [0xffffff, 0xffe4ef, 0xfff3d6, 0xece4ff, 0xe4ffe8]; if (door.interior === 'house') this.bg.setTint(tints[door.variant || 0]);
    this.nightAlpha = door.interior === 'lab' ? 0.35 : 0.5;
    const sp = def.spawn; this.createPlayer(this.w(this.fx(sp[0])), this.w(sp[1])); this.P.dir = 'up';
    this.cameras.main.fadeIn(300);
    if (this.W < GW) this.cameras.main.setBounds((this.W - GW) / 2, 0, GW, this.H);
    // loot (ambient)
    this.loot = def.loot.map((l, i) => { const key = door.id + ':' + i; const ready = !G.lootCd[key] || G.lootCd[key] < Date.now(); const x = this.w(this.fx(l[0])), y = this.w(l[1]); const spr = this.add.image(x, y, 'seed').setScale(0.55).setDepth(y).setVisible(ready); const sp = this.add.star(x + 14, y - 16, 4, 3, 9, 0xfff3a0).setDepth(y + 1).setVisible(ready); this.tweens.add({ targets: sp, angle: 180, scale: 0.5, yoyo: true, repeat: -1, duration: 600 }); return { x, y, v: l[2], name: l[3], key, ready, spr, sp }; });
    // mission items
    this.mItems = []; this.scans = [];
    this.gfx = this.add.graphics().setDepth(4);
    // decor: pet shop cousins, lab wheel, genesis seed
    if (door.interior === 'lab') {
      const [wx, wy] = def.wheel; this.wheelPos = { x: this.w(wx), y: this.w(wy) };
      this.squeek = this.add.image(this.wheelPos.x, this.wheelPos.y + 40, 'ham_classic_run').setScale(1).setDepth(this.wheelPos.y + 200);
      this.wheelG = this.add.graphics().setDepth(this.wheelPos.y + 150); this.wheelA = 0;
      this.liveTag = this.add.text(this.wheelPos.x, this.wheelPos.y - 230, '', { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#9ff0ff', stroke: '#001833', strokeThickness: 6, align: 'center' }).setOrigin(0.5).setDepth(6000);
      const pd = def.pedestal; const genesisHere = !G.save.skins.includes('golden') || G.save.missions < 13;
      if (genesisHere && !this.mItems.some(m => m.label === 'genesis')) { this.caseSeed = this.add.image(this.w(pd[0]), this.w(pd[1]) - 20, 'goldseed').setScale(0.9).setDepth(this.w(pd[1]) + 10).setAlpha(0.9); this.add.rectangle(this.w(pd[0]), this.w(pd[1]) - 20, 70, 90, 0x9ff0ff, 0.18).setStrokeStyle(3, 0x9ff0ff, 0.8).setDepth(this.w(pd[1]) + 11); }
    }
    // guards
    for (const gd of def.guards) { const path = gd.path.map(p => [this.w(this.fx(p[0])), this.w(p[1])]); const e = this.spawnEnemy(gd.kind, path[0][0], path[0][1], { path, state: 'patrol', sightMul: door.interior === 'lab' || door.interior === 'bank' ? 0.75 : 0.7 }); e.speedMul = 0.85; }
    this.seenT = 0; this.chaseT = G.stars > 0 ? 3.5 : -1;
    const ex = def.exit; this.exitZone = { x: this.w(this.fx(ex[0])), y: this.w(ex[1]), w: this.w(ex[2]) };
    this.exitArrow = this.add.triangle(this.exitZone.x, this.exitZone.y + 4, 0, 0, 36, 0, 18, 28, 0x7dff9a).setStrokeStyle(4, 0x06300f).setDepth(5600);
    this.tweens.add({ targets: this.exitArrow, y: '+=14', yoyo: true, repeat: -1, duration: 400 });
    BUS.emit('banner', { text: door.name.toUpperCase(), sub: this.areaHint(), color: '#ffffff', small: true });
    MissionSys.tick(0, { area: door.interior, door: door.id });
    this.dead = false; this.syncKey = undefined; this.syncMission(); const so = () => this.syncMission(); BUS.on('objective', so); this.events.once('shutdown', () => { this.dead = true; BUS.off('objective', so); });
    this.time.delayedCall(Controls.isTouch ? 3000 : 900, () => { Helper.hint('interior', 'You are inside! Sparkling seeds can be stolen with E. If a guard sees you steal, you get a star. Walk out through the green arrow.'); if (def.restricted) Helper.hint('restricted_' + door.interior, 'Careful: this is a restricted area. If security spots you hanging around here, the alarm goes off.'); });
  }
  areaHint() { const k = this.door.interior; return { house: 'Snacks inside. Mind the owner.', petshop: 'Cages, cash register, treats.', grocery: 'Seeds galore. The store cat is watching.', bank: 'Vault behind the counters. Robo-vacs on patrol.', garage: 'Tools, cash and car keys.', lab: 'Home of Squeektoshi. Security everywhere.' }[k]; }
  syncMission() {
    if (this.dead) return;
    const key = MissionSys.a ? MissionSys.a.def.id + ':' + MissionSys.a.i : null; if (key === this.syncKey) return; this.syncKey = key;
    for (const m of this.mItems) { this.tweens.killTweensOf(m.spr); this.tweens.killTweensOf(m.glow); m.spr.destroy(); m.glow.destroy(); }
    this.mItems = MissionSys.lootItems(this.door.interior, this.door.id).filter(m => !m.done).map(m => this.makeMissionItem(m));
    this.scans = MissionSys.scanPoints(this.door.interior).filter(s => !s.done).map(s => ({ x: this.w(this.fx(s.x)), y: this.w(s.y), i: s.i, prog: 0 }));
  }
  makeMissionItem(m) {
    const x = this.w(this.fx(m.x)), y = this.w(m.y);
    const glow = this.add.image(x, y, 'glow').setTint(0xffd84a).setBlendMode(Phaser.BlendModes.ADD).setScale(m.label === 'genesis' ? 1.8 : 1).setDepth(y - 1).setAlpha(0.8);
    this.tweens.add({ targets: glow, alpha: 0.35, scale: glow.scale * 1.25, yoyo: true, repeat: -1, duration: 700 });
    let spr;
    if (m.label === 'cage') spr = this.add.image(x, y - 10, 'ham_strawberry_front').setScale(0.4).setDepth(y + 5);
    else spr = this.add.image(x, y - 10, 'goldseed').setScale(m.label === 'genesis' ? 1.1 : 0.7).setDepth(y + 5).setTint(m.label === 'genesis' ? 0xffffff : 0xffe2a0);
    this.tweens.add({ targets: spr, y: y - 22, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.inOut' });
    return Object.assign({}, m, { wx: x, wy: y, spr, glow });
  }
  restricted(x, y) { const r = this.def.restricted; if (!r) return false; const mx = this.fx(x / IS), my = y / IS; return mx > r[0] && mx < r[2] && my > r[1] && my < r[3]; }
  seenByGuard() { return this.enemies.some(e => e.sees); }
  interact() {
    const P = this.P, px = P.mover.x, py = P.mover.y; let best = null, bd = 80;
    for (const m of this.mItems) { const d = Math.hypot(m.wx - px, m.wy - py); if (d < bd + 20) { bd = d; best = { label: m.label === 'cage' ? 'Open the cage' : m.label === 'genesis' ? 'TAKE THE GENESIS SEED' : 'Grab the loot', fn: () => this.takeMission(m) }; } }
    if (!best) for (const l of this.loot) { if (!l.ready) continue; const d = Math.hypot(l.x - px, l.y - py); if (d < bd) { bd = d; best = { label: `Steal ${l.name} (+${Math.max(0, Math.round(l.v * Live.mult()))})`, fn: () => this.steal(l) }; } }
    return best;
  }
  steal(l) {
    if (!Live.canReward()) return;
    l.ready = false; l.spr.setVisible(false); l.sp.setVisible(false); G.lootCd[l.key] = Date.now() + 120000;
    const got = G.addSeeds(l.v); Sound.sfx('loot'); this.sparkle(l.x, l.y); this.floatText(l.x, l.y - 30, got > 0 ? `+${got}` : 'SACK FULL', got > 0 ? '#ffe066' : '#ff9a9a', 16);
    if (this.seenByGuard()) { G.crime(1, 'theft'); BUS.emit('banner', { text: 'SPOTTED!', sub: 'They saw you steal', color: '#ff7b7b', small: true }); }
    G.persist();
  }
  takeMission(m) {
    if (!Live.canReward()) return;
    this.mItems = this.mItems.filter(o => o !== m); this.tweens.killTweensOf(m.spr); this.tweens.killTweensOf(m.glow); m.glow.destroy();
    Sound.sfx(m.label === 'genesis' ? 'gold' : 'loot'); this.sparkle(m.wx, m.wy, 0xffd84a, 18);
    if (m.label === 'cage') { m.spr.setTexture('ham_strawberry_run'); this.tweens.add({ targets: m.spr, x: this.exitZone.x, y: this.exitZone.y + 60, duration: 1600, onComplete: () => m.spr.destroy() }); this.floatText(m.wx, m.wy - 40, 'FREE!', '#ffb3d1', 18); }
    else { this.tweens.add({ targets: m.spr, y: m.wy - 80, alpha: 0, scale: 1.6, duration: 500, onComplete: () => m.spr.destroy() }); this.floatText(m.wx, m.wy - 40, m.label === 'genesis' ? 'GENESIS SEED!' : 'GOT IT!', '#ffd84a', 18); }
    const bonus = m.label === 'genesis' ? 100 : m.label === 'cage' ? 5 : 20; const got = G.addSeeds(bonus); if (got > 0) this.floatText(m.wx, m.wy - 75, `+${got}`, '#ffe066', 14);
    if (m.label === 'genesis') { this.cameras.main.flash(400, 255, 230, 120); this.cameras.main.shake(400, 0.01); }
    MissionSys.lootGot(m.i);
  }
  updateScans(dt) {
    if (!Live.canReward()) return;
    const P = this.P; const g = this.gfx; g.clear(); const t = this.time.now;
    for (const s of this.scans) {
      if (s.done) continue; const d = Math.hypot(P.mover.x - s.x, P.mover.y - s.y);
      g.lineStyle(5, 0x6ad7ff, 0.9); g.strokeCircle(s.x, s.y, 46 + Math.sin(t / 200) * 5); g.fillStyle(0x6ad7ff, 0.15); g.fillCircle(s.x, s.y, 46);
      if (d < 55) {
        s.prog += dt / 2.6; if (Math.random() < 0.3) Sound.sfx('scan'); G.prompt = `HACKING... ${Math.floor(s.prog * 100)}%`;
        if (this.seenByGuard() && !s.alarmed) { s.alarmed = true; G.crime(1, 'hack'); s.prog *= 0.5; BUS.emit('banner', { text: 'SPOTTED HACKING!', sub: '', color: '#ff7b7b', small: true }); }
        if (s.prog >= 1) { s.done = true; Sound.sfx('select'); this.floatText(s.x, s.y - 50, 'UPLOADED!', '#6ad7ff', 16); MissionSys.scanDone(s.i); }
      } else s.prog = Math.max(0, s.prog - dt * 0.1);
      if (s.prog > 0) { g.lineStyle(8, 0x7dff9a, 1); g.beginPath(); g.arc(s.x, s.y, 60, -Math.PI / 2, -Math.PI / 2 + s.prog * Math.PI * 2); g.strokePath(); }
    }
    this.scans = this.scans.filter(s => !s.done);
  }
  squashed() {
    if (G.frozen) return; G.frozen = true; this.P.mover.body.setVelocity(0, 0);
    BUS.emit('bigText', { text: 'SQUASHED!', sub: 'You lost some seeds...', color: '#ff5a5a' }); Sound.sfx('fail');
    this.tweens.add({ targets: this.P.spr, scaleY: 0.12, scaleX: 0.75, duration: 300 });
    this.time.delayedCall(2200, () => { G.frozen = false; this.clearAlerts(); this.scene.stop(); this.scene.wake('City', { respawn: true }); });
  }
  leave() {
    if (this.leaving) return; this.leaving = true; Sound.sfx('door'); this.clearAlerts();
    this.cameras.main.fadeOut(250); this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.stop(); this.scene.wake('City'); });
  }
  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000); const P = this.P; if (P.invuln > 0) P.invuln -= dt;
    G.prompt = null;
    if (!G.frozen && !this.leaving) {
      this.updatePlayerFoot(dt);
      const it = this.interact(); if (it) G.prompt = it.label; if (Controls.take('action') && it) it.fn();
      if (P.mover.y > this.exitZone.y - 30 && Math.abs(P.mover.x - this.exitZone.x) < this.exitZone.w / 2 + 20) this.leave();
    } else P.mover.body.setVelocity(0, 0);
    Controls.take('dash');
    this.updateScans(dt);
    const es = this.updateEnemies(dt); this.updateWanted(dt, es.anySees);
    // restricted area detection
    if (G.stars === 0 && this.restricted(P.mover.x, P.mover.y) && es.anySees === false && this.enemies.some(e => e.sees)) { this.seenT += dt; if (this.seenT > 1.2) { this.seenT = 0; G.crime(1, 'trespass'); BUS.emit('banner', { text: 'INTRUDER!', sub: 'Security spotted you', color: '#ff7b7b', small: true }); } } else if (!this.enemies.some(e => e.sees)) this.seenT = Math.max(0, this.seenT - dt);
    // pursuers follow you in
    if (G.stars > 0) { if (this.chaseT < 0) this.chaseT = 4; this.chaseT -= dt; if (this.chaseT <= 0 && this.enemies.filter(e => !e.path).length < Math.min(3, G.stars)) { this.chaseT = 5; this.spawnEnemy(G.stars >= 3 ? 'owner' : 'cat', this.exitZone.x, this.exitZone.y - 10, { state: 'chase', lastSeen: this.time.now }); } }
    else { this.chaseT = -1; for (const e of this.enemies) if (!e.path && !e.leaving) { e.leaving = true; this.time.delayedCall(1500, () => e.alive && this.removeEnemy(e)); } }
    MissionSys.tick(dt, { area: this.door.interior, door: this.door.id });
    const mvd = this.lastPos ? Math.hypot(P.mover.x - this.lastPos.x, P.mover.y - this.lastPos.y) : 0; this.lastPos = { x: P.mover.x, y: P.mover.y };
    Helper.tick(dt, { moved: mvd < 200 ? mvd : 0, inVeh: false });
    // lab wheel
    if (this.squeek) {
      const day = Live.isDay(); const g = this.wheelG; g.clear(); this.wheelA += (day ? Math.max(Live.rpm, 8) : 0) * Math.PI * 2 / 60 * dt * 0.5;
      const { x, y } = this.wheelPos; for (let i = 0; i < 12; i++) { const a = this.wheelA + i * Math.PI / 6; g.lineStyle(5, 0x9ff0ff, day ? 0.7 : 0.25); g.lineBetween(x, y, x + Math.cos(a) * 200, y + Math.sin(a) * 160); }
      if (day) { const ph = Math.floor(time / Math.max(60, 400 - Live.rpm * 5)) % 2; this.squeek.setTexture(ph ? 'ham_classic_run' : 'ham_classic_side').setFlipX(!ph).setY(y + 50 - Math.abs(Math.sin(time / 90)) * 12); }
      else this.squeek.setTexture('ham_classic_crouch').setFlipX(false).setY(y + 60);
      this.liveTag.setText(`SQUEEKTOSHI\n${day ? 'RUNNING · ' + Live.rpm.toFixed(1) + ' RPM' : 'SLEEPING... zzz'}`);
    }
    this.renderPlayer();
    const lights = [[P.mover.x - this.cameras.main.scrollX + this.cameras.main.scrollX, P.mover.y, 1.3, 1]];
    for (const l of this.loot) if (l.ready) lights.push([l.x, l.y, 0.4, 0.7]);
    for (const m of this.mItems) lights.push([m.wx, m.wy, 0.9, 1]);
    for (const s of this.scans) lights.push([s.x, s.y, 0.7, 1]);
    lights.push([this.exitZone.x, this.exitZone.y, 1.2, 1]);
    if (this.wheelPos) lights.push([this.wheelPos.x, this.wheelPos.y, 3.2, 1]);
    lights.push([this.W / 2, this.H / 2, 2.5, 0.5]);
    this.renderDark(dt, lights);
    G.mm = { area: this.def.tex, flip: this.flip, px: P.mover.x / IS, py: P.mover.y / IS, ang: ({ up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 })[P.dir], target: null, golden: [], enemies: this.enemies.filter(e => e.state === 'chase').map(e => [e.mover.x / IS, e.mover.y / IS]), guards: this.enemies.map(e => [e.mover.x / IS, e.mover.y / IS]),
      items: this.mItems.map(m => [m.wx / IS, m.wy / IS]).concat(this.scans.map(s => [s.x / IS, s.y / IS])) };
    const tgt = this.mItems[0] || this.scans[0]; const st = MissionSys.step();
    G.mm.wx = tgt ? { x: tgt.wx || tgt.x, y: tgt.wy || tgt.y } : (st && MissionSys.target('in') && MissionSys.target('in').kind === 'exit' ? { x: this.exitZone.x, y: this.exitZone.y } : null);
    G.hidden = false;
  }
}
