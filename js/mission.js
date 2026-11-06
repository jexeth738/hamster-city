// ===== Mission engine =====
const MissionSys = {
  a: null, // active {def, i, t, timer, data}
  next() { return MISSIONS[G.save.missions] || null; },
  start(def, scene) {
    if (this.a || !Live.canReward() || (def.wheel && !Live.wheelOpen())) return;
    Sound.sfx('select');
    BUS.emit('dialog', def.intro, () => {
      if (!Live.canReward() || (def.wheel && !Live.wheelOpen())) return;
      this.a = { def, identity: Live.identity, i: -1, data: {}, timer: null, side: def.side || false };
      BUS.emit('banner', { text: def.title.toUpperCase(), sub: def.side ? 'SIDE JOB' : `MISSION ${MISSIONS.indexOf(def) + 1} / ${MISSIONS.length}`, color: '#ffd166' });
      this.advance();
    });
  },
  step() { return this.a && this.a.def.steps[this.a.i]; },
  advance() {
    const a = this.a; if (!a) return; a.i++; a.data = {}; a.timer = null;
    const s = this.step();
    if (!s) return this.complete();
    if (s.time) a.timer = s.time;
    switch (s.t) {
      case 'stars': G.setStars(Math.max(G.stars, s.n), 'mission'); G.cool = 0; return this.advance();
      case 'vehicle': if (s.spawn) BUS.emit('spawnVehicle', s.spawn); break;
      case 'checkpoints': a.data.cp = 0; if (s.bags) BUS.emit('missionBags', s.pts); break;
      case 'golden': a.data.got = 0; if (G.playMode === 'practice') BUS.emit('missionGolden', s.n); break;
      case 'block': a.data.serial = Live.blockSerial; break;
      case 'loot': a.data.got = []; break;
      case 'scan': a.data.done = []; a.data.prog = 0; break;
      case 'smash': a.data.got = 0; BUS.emit('sideSmash', s.n); break;
    }
    Sound.sfx('blip'); BUS.emit('objective');
  },
  // called by scenes each frame
  tick(dt, ctx) {
    const a = this.a; if (!a || G.frozen || !Live.canReward()) return;
    if (a.def.wheel && G.playMode === 'live' && a.identity && a.identity !== Live.identity) return this.fail('Wheel counter changed — start a new contract');
    if (a.def.wheel && !Live.wheelOpen()) return this.fail('Squeektoshi is asleep — wheel window closed'); const s = this.step(); if (!s) return;
    if (a.timer !== null) { a.timer -= dt; if (a.timer <= 0) { a.timer = 0; if (s.t === 'survive') return this.advance(); return this.fail("Time's up!"); } }
    switch (s.t) {
      case 'block': if (Live.blockSerial > a.data.serial) this.advance(); break;
      case 'enter': if (ctx.area !== 'city' && ctx.door === s.door) { a.door = ctx.door; this.advance(); } break;
      case 'exit': if (ctx.area === 'city') this.advance(); break;
      case 'goto': if (ctx.area === 'city' && Math.hypot(ctx.mx - s.x, ctx.my - s.y) < s.r + (ctx.veh ? 14 : 0)) { if (s.kind === 'any' && !ctx.veh && s.time) break; this.advance(); } break;
      case 'vehicle': if (ctx.veh && (s.kind === 'any' || ctx.veh === s.kind)) this.advance(); break;
      case 'checkpoints': {
        if (ctx.area !== 'city') break;
        if (s.kind && ctx.veh !== s.kind) { a.data.needVeh = true; break; } a.data.needVeh = false;
        const p = s.pts[a.data.cp]; if (Math.hypot(ctx.mx - p[0], ctx.my - p[1]) < 30) { a.data.cp++; Sound.sfx(s.bags ? 'loot' : 'select'); if (s.bags) G.addSeeds(8); BUS.emit('checkpoint', a.data.cp); BUS.emit('objective'); if (a.data.cp >= s.pts.length) this.advance(); }
        break;
      }
      case 'survive': if (G.stars < 2) G.setStars(3); break;
      case 'lose': if (G.stars === 0) this.advance(); break;
    }
  },
  lootItems(area, door) { const s = this.step(); if (!s || s.t !== 'loot' || s.area !== area) return []; if (this.a.door && door && this.a.door !== door) return []; return s.items.map((p, i) => ({ x: p[0], y: p[1], i, label: s.label, done: this.a.data.got.includes(i) })); },
  lootGot(i) { const s = this.step(); if (!s || s.t !== 'loot') return; if (!this.a.data.got.includes(i)) this.a.data.got.push(i); BUS.emit('objective'); if (this.a.data.got.length >= s.items.length) this.advance(); },
  scanPoints(area) { const s = this.step(); if (!s || s.t !== 'scan' || s.area !== area) return []; return s.pts.map((p, i) => ({ x: p[0], y: p[1], i, done: this.a.data.done.includes(i) })); },
  scanDone(i) { const s = this.step(); if (!s || s.t !== 'scan') return; if (!this.a.data.done.includes(i)) this.a.data.done.push(i); BUS.emit('objective'); if (this.a.data.done.length >= s.pts.length) this.advance(); },
  golden() { const s = this.step(); if (s && s.t === 'golden') { this.a.data.got++; BUS.emit('objective'); if (this.a.data.got >= s.n) this.advance(); } },
  smashed() { const s = this.step(); if (s && s.t === 'smash') { this.a.data.got++; BUS.emit('objective'); if (this.a.data.got >= s.n) this.advance(); } },
  // what to point at
  target(area) {
    const s = this.step(); if (!s) return null; const a = this.a;
    const doorOf = id => CITY.doors.find(d => d.id === id);
    if (area === 'city') {
      if (s.t === 'enter') { const d = doorOf(s.door); return { x: d.x, y: d.y, kind: 'door' }; }
      if (s.t === 'loot' || s.t === 'scan') { const d = doorOf(a.door || CITY.doors.find(d => d.interior === s.area).id); return { x: d.x, y: d.y, kind: 'door' }; }
      if (s.t === 'goto') return { x: s.x, y: s.y, kind: 'goto', r: s.r };
      if (s.t === 'checkpoints') { const p = s.pts[a.data.cp]; return p ? { x: p[0], y: p[1], kind: s.bags ? 'bag' : 'cp' } : null; }
      if (s.t === 'vehicle') return { kind: 'vehicle', veh: s.kind };
      if (s.t === 'golden') return { kind: 'golden' };
    } else {
      if (s.t === 'exit' || s.t === 'goto' || s.t === 'enter' || s.t === 'vehicle' || s.t === 'checkpoints') return { kind: 'exit' };
      if (s.t === 'loot') return { kind: 'loot' };
      if (s.t === 'scan') return { kind: 'scan' };
    }
    return null;
  },
  text() {
    const s = this.step(); if (!s) return ''; const a = this.a; let t = s.text || '';
    if (s.t === 'loot') t += `  ${a.data.got.length}/${s.items.length}`;
    if (s.t === 'scan') t += `  ${a.data.done.length}/${s.pts.length}`;
    if (s.t === 'checkpoints') t += `  ${a.data.cp}/${s.pts.length}` + (a.data.needVeh ? `  (need ${s.kind === 'ball' ? 'HAMSTER BALL' : 'SKATEBOARD'})` : '');
    if (s.t === 'block') t += G.playMode === 'practice' ? ' (SIMULATED)' : ' (LIVE, no timer shortcut)';
    if (s.t === 'golden') t += `  ${a.data.got}/${s.n}`;
    if (s.t === 'smash') t += `  ${a.data.got}/${s.n}`;
    return t;
  },
  complete() {
    const a = this.a; if (!a || !Live.canReward()) return;
    if (a.def.wheel && !Live.wheelOpen()) return this.fail('Wheel window closed');
    this.a = null; const def = a.def;
    const got = G.addSeeds(def.reward);
    if (def.wheel) G.save.wheelHeists++;
    if (!def.side) { G.save.missions = Math.max(G.save.missions, MISSIONS.indexOf(def) + 1); if (def.id === 'm13' && !G.save.skins.includes('golden')) G.save.skins.push('golden'); }
    G.persist(); Sound.sfx('mission');
    BUS.emit('bigText', { text: def.side ? 'JOB DONE!' : 'MISSION PASSED!', sub: `+${got} SEEDS`, color: '#ffd166' });
    BUS.emit('objective'); BUS.emit('missionDone', def);
    if (def.outro) setTimeout(() => BUS.emit('dialog', def.outro, () => { if (def.id === 'm13') BUS.emit('credits'); }), 1800);
  },
  fail(reason) {
    if (!this.a) return; const def = this.a.def; this.a = null; Sound.sfx('fail');
    BUS.emit('bigText', { text: 'MISSION FAILED', sub: reason || '', color: '#ff5a5a' }); BUS.emit('objective'); BUS.emit('missionFail', def);
  },
};

// Sleep closes a wheel contract even while a menu/dialog pauses the world scene.
BUS.on('phase', status => { if (status === 'IDLE' && MissionSys.a && MissionSys.a.def.wheel) MissionSys.fail('Squeektoshi is asleep — wheel window closed'); });
