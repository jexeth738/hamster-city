// ===== City scene =====
const VEH = {
  rccar: { tex: 'rccar', scale: 0.52, max: 560, accel: 680, turn: 3.4, grip: 7, hp: 140, r: 27, label: 'RC Racer', engine: true },
  car:   { tex: 'car0', scale: 0.5, max: 480, accel: 540, turn: 2.9, grip: 6, hp: 170, r: 29, label: 'Toy Car', engine: true },
  skate: { tex: 'skate', scale: 0.55, max: 370, accel: 560, turn: 4.6, grip: 10, hp: 9999, r: 18, label: 'Skateboard', rider: true, ram: false },
  ball:  { tex: 'ball', scale: 0.56, max: 330, accel: 560, turn: 0, grip: 1.4, hp: 9999, r: 40, label: 'Hamster Ball', rider: true, shield: true, omni: true },
  van:   { tex: 'van', scale: 0.5, max: 340, accel: 500, turn: 2.6, grip: 6, hp: 9999, r: 40, label: 'Pest Control' },
  police:{ tex: 'car5', scale: 0.5, max: 400, accel: 560, turn: 3.0, grip: 6, hp: 9999, r: 30, label: 'Cat Patrol' },
};
const wrapA = a => Phaser.Math.Angle.Wrap(a);

class CityScene extends WorldScene {
  constructor() { super('City'); }
  create() {
    G.area = 'city';
    this.setupWorld({ tex: 'city', scale: S, srcW: 1024, srcH: 1024, rects: CITY.solids, cell: CELL, bounds: CITY.bounds, nearest: true });
    // road grid
    const rs = this.cache.text.get('road') || ''; this.road = new Uint8Array(this.gw * this.gh);
    for (let i = 0; i < this.road.length; i++) this.road[i] = rs.charCodeAt(i) === 49 && this.walk[i] ? 1 : 0;
    this.roadDist = new Int16Array(this.gw * this.gh); this.roadT = 0;
    this.vehicles = []; this.vehicle = null; this.traffic = [];
    this.graph = {}; for (const [a, b] of CITY.roadEdges) { (this.graph[a] = this.graph[a] || []).push(b); (this.graph[b] = this.graph[b] || []).push(a); }
    const st = CITY.start; this.createPlayer(this.w(st.x), this.w(st.y));
    // markers
    this.markerG = this.add.graphics().setDepth(4);
    this.hideoutIcon = this.add.text(this.w(CITY.hideout.x), this.w(CITY.hideout.y) - 70, '!', { fontFamily: '"Press Start 2P"', fontSize: '34px', color: '#ffd166', stroke: '#3a2400', strokeThickness: 8 }).setOrigin(0.5).setDepth(5500);
    this.shopIcon = this.add.text(this.w(CITY.shop.x), this.w(CITY.shop.y) - 64, '$', { fontFamily: '"Press Start 2P"', fontSize: '28px', color: '#7dff9a', stroke: '#06300f', strokeThickness: 8 }).setOrigin(0.5).setDepth(5500);
    this.tweens.add({ targets: [this.hideoutIcon, this.shopIcon], y: '-=12', yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' });
    this.sideIcons = SIDEJOBS.map(j => { const t = this.add.star(this.w(j.x), this.w(j.y) - 60, 5, 9, 20, 0x6ad7ff).setStrokeStyle(4, 0x002033).setDepth(5500); this.tweens.add({ targets: t, y: '-=10', angle: 20, yoyo: true, repeat: -1, duration: 700 }); return t; });
    this.targetArrow = this.add.triangle(0, 0, 0, 0, 36, 0, 18, 28, 0xffd166).setStrokeStyle(4, 0x3a2400).setDepth(5600).setVisible(false);
    // lab wheel + Squeektoshi
    this.wheelG = this.add.graphics().setDepth(2); this.wheelA = 0;
    this.squeek = this.add.image(this.w(CITY.wheel.x), this.w(CITY.wheel.y) + 20, 'ham_classic_run').setScale(0.75).setDepth(3);
    this.zzz = [];
    // glows
    this.glows = [];
    for (const wv of CITY.windows) this.glows.push(this.add.image(this.w(wv[0]), this.w(wv[1]), 'glow').setScale(1.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(5001).setAlpha(0));
    this.labGlow = this.add.image(this.w(CITY.wheel.x), this.w(CITY.wheel.y), 'glow').setScale(5).setTint(0x3aa0ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(5001).setAlpha(0);
    this.lights = CITY.lights.map(l => [this.w(l[0]), this.w(l[1]), 1.9, 1]);
    for (const l of CITY.lights) this.glows.push(this.add.image(this.w(l[0]), this.w(l[1]), 'glow').setScale(1.1).setTint(0xfff0b0).setBlendMode(Phaser.BlendModes.ADD).setDepth(5001).setAlpha(0));
    // vehicles
    for (const v of CITY.vehicleSpawns) this.makeVehicle(v.kind, this.w(v.x), this.w(v.y), v.a, v.skin).home = v;
    for (let i = 0; i < 8; i++) this.spawnTraffic(true);
    // pickups
    for (let i = 0; i < 55; i++) this.spawnSeed();
    this.seedT = 6; this.spawnT = 0; this.ambT = 0; this.trafficT = 3;
    this.spawnAmbient();
    // events
    this.ev = [
      ['block', d => this.onBlock(d)], ['phase', s => this.onPhase(s)], ['spawnVehicle', s => this.missionVehicle(s)],
      ['missionGolden', n => this.missionGolden(n)], ['missionBags', pts => this.missionBags(pts)], ['sideSmash', n => this.sideSmash(n)],
      ['stunned', e => this.onStunned(e)], ['missionFail', () => this.clearMissionStuff()], ['missionDone', () => this.clearMissionStuff()], ['respawn', () => this.respawn()],
    ];
    for (const [k, f] of this.ev) BUS.on(k, f, this);
    this.events.on('shutdown', () => { for (const [k, f] of this.ev) BUS.off(k, f, this); });
    this.events.on('wake', (sys, data) => this.onWake(data));
    this.cameras.main.fadeIn(600);
    Sound.play(Live.isDay() ? 'day' : 'night');
    this.lastDay = Live.isDay();
    this.scene.launch('UI'); this.scene.bringToTop('UI');
    this.nibbles = this.add.image(this.w(838), this.w(400), 'helper_npc').setScale(0.5).setOrigin(0.5, 0.9).setDepth(this.w(400));
    this.add.ellipse(this.w(838), this.w(400) + 2, 46, 14, 0, 0.28).setDepth(this.w(400) - 1);
    this.nibblesTag = this.add.text(this.w(838), this.w(400) - 74, '?', { fontFamily: '"Press Start 2P"', fontSize: '22px', color: '#f0dfb8', stroke: '#2a1a00', strokeThickness: 7 }).setOrigin(0.5).setDepth(5500);
    this.tweens.add({ targets: this.nibblesTag, y: '-=8', yoyo: true, repeat: -1, duration: 500 });
    this.tweens.add({ targets: this.nibbles, scaleY: 0.52, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
    BUS.on('tutSkate', this.tutSkate, this); this.events.on('shutdown', () => BUS.off('tutSkate', this.tutSkate, this));
    this.lastPos = { x: this.P.mover.x, y: this.P.mover.y };
    if (!G.save.seenHelp) { G.save.seenHelp = true; G.save.tut = 0; G.persist(); this.time.delayedCall(800, () => BUS.emit('dialog', [['nibbles', "Well hello there, young cheeks! Welcome to SQUEEK CITY. I'm Grandpa Nibbles. Back in my day I robbed every seed bin in this town."], ['nibbles', "Now I'm retired, so I help new thieves like you. I'll walk you through the basics. Watch the bubble on the left for my tips!"]], () => Helper.begin())); }
    else if (Helper.active()) this.time.delayedCall(800, () => Helper.begin());
    else if (!Live.isDay()) this.time.delayedCall(1500, () => Helper.hint('night', 'Squeektoshi is asleep right now, so it is NIGHT in the city. Guards see less, but loot only pays half.'));
  }
  // ---------- vehicles ----------
  makeVehicle(kind, x, y, heading = 0, skin) {
    const def = VEH[kind]; const mover = this.add.zone(x, y, def.r * 2, def.r * 2); this.physics.add.existing(mover); mover.body.setCircle(def.r).setCollideWorldBounds(true);
    const v = { kind, def, mover, heading, vel: { x: 0, y: 0 }, speed: 0, hp: def.hp, parked: true, traffic: null, t: 0 };
    mover.veh = v;
    v.shadow = this.add.ellipse(x, y, def.r * 2.2, def.r * 2.2, 0, 0.25);
    v.spr = this.add.image(x, y, skin || def.tex).setScale(def.scale).setRotation(heading + Math.PI / 2);
    if (kind === 'van') { v.sign = this.add.text(x, y, 'PEST\nCTRL', { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#c00', align: 'center' }).setOrigin(0.5); }
    if (kind === 'van' || kind === 'police') { v.l1 = this.add.circle(x, y, 7, 0xff2020).setDepth(6000); v.l2 = this.add.circle(x, y, 7, 0x2060ff).setDepth(6000); }
    this.physics.add.collider(mover, this.walls, null, () => !v.traffic && !v.chaser, this);
    this.vehicles.push(v); return v;
  }
  destroyVehicle(v) { v.dead = true; v.mover.destroy(); v.spr.destroy(); v.shadow.destroy(); if (v.sign) v.sign.destroy(); if (v.l1) { v.l1.destroy(); v.l2.destroy(); } if (v.riderSpr) v.riderSpr.destroy(); this.vehicles = this.vehicles.filter(o => o !== v); }
  spawnTraffic(anywhere) {
    const keys = CITY.roadEdges; const pp = this.playerPos();
    for (let tries = 0; tries < 20; tries++) {
      const e = Phaser.Utils.Array.GetRandom(keys); const dirFlip = Math.random() < 0.5; const a = dirFlip ? e[1] : e[0], b = dirFlip ? e[0] : e[1];
      const A = CITY.roadNodes[a], B = CITY.roadNodes[b]; const t = Math.random();
      const x = this.w(A[0] + (B[0] - A[0]) * t), y = this.w(A[1] + (B[1] - A[1]) * t);
      if (!anywhere && Math.hypot(x - pp.x, y - pp.y) < 900) continue;
      const skin = 'car' + Phaser.Math.Between(0, 4); const h = Math.atan2(B[1] - A[1], B[0] - A[0]);
      const v = this.makeVehicle('car', x, y, h, skin); v.parked = false; v.traffic = { a, b, t: t * Phaser.Math.Distance.Between(A[0], A[1], B[0], B[1]) * S, cruise: Phaser.Math.Between(170, 230) };
      v.mover.body.setImmovable(true); this.traffic.push(v); return v;
    }
  }
  lanePoint(a, b, dist) {
    const A = CITY.roadNodes[a], B = CITY.roadNodes[b]; const L = Math.hypot(B[0] - A[0], B[1] - A[1]) * S; const ux = (B[0] - A[0]) * S / L, uy = (B[1] - A[1]) * S / L;
    const off = 12 * S; const d = Phaser.Math.Clamp(dist, 0, L);
    return { x: A[0] * S + ux * d - uy * off, y: A[1] * S + uy * d + ux * off, L };
  }
  updateTraffic(dt) {
    const pp = this.playerPos();
    for (const v of this.traffic) {
      if (v.dead || !v.traffic) continue; const T = v.traffic; const b = v.mover.body;
      let cruise = T.cruise * (Live.isDay() ? 1.15 : 0.85);
      // obstacle check
      const fx = Math.cos(v.heading), fy = Math.sin(v.heading); let block = false;
      const obs = [pp].concat(this.vehicles.filter(o => o !== v && !o.dead).map(o => ({ x: o.mover.x, y: o.mover.y })));
      for (const o of obs) { const rx = o.x - v.mover.x, ry = o.y - v.mover.y; const al = rx * fx + ry * fy, lat = Math.abs(-rx * fy + ry * fx); if (al > 0 && al < 150 && lat < 46) { block = true; break; } }
      if (block) { v.speed = Math.max(0, v.speed - 700 * dt); T.blockT = (T.blockT || 0) + dt; if (T.blockT > 1.6 && Math.hypot(pp.x - v.mover.x, pp.y - v.mover.y) < 170) { T.blockT = -2; Sound.sfx('horn'); this.floatText(v.mover.x, v.mover.y - 50, 'HONK!', '#ffffff', 14); } }
      else { T.blockT = 0; v.speed += (cruise - v.speed) * Math.min(1, dt * 1.5); }
      T.t += v.speed * dt;
      let lp = this.lanePoint(T.a, T.b, T.t + 70);
      if (T.t > lp.L) {
        const nb = this.graph[T.b].filter(n => n !== T.a); const nx = nb.length ? Phaser.Utils.Array.GetRandom(nb) : T.a;
        T.t -= lp.L; T.a = T.b; T.b = nx; lp = this.lanePoint(T.a, T.b, T.t + 70);
      }
      const want = Math.atan2(lp.y - v.mover.y, lp.x - v.mover.x);
      v.heading = Phaser.Math.Angle.RotateTo(v.heading, want, 4.5 * dt);
      b.setVelocity(Math.cos(v.heading) * v.speed, Math.sin(v.heading) * v.speed);
      // hit pedestrian player
      if (!this.vehicle && v.speed > 90 && Math.hypot(pp.x - v.mover.x, pp.y - v.mover.y) < 46) this.hurtPlayer(18, v.mover, 420);
      if (Math.hypot(pp.x - v.mover.x, pp.y - v.mover.y) > 2600) { this.destroyVehicle(v); v.dead = true; }
    }
    this.traffic = this.traffic.filter(v => !v.dead && v.traffic);
    this.trafficT -= dt; if (this.trafficT <= 0) { this.trafficT = 2; if (this.traffic.length < (Live.isDay() ? 9 : 5)) this.spawnTraffic(false); }
  }
  enterVehicle(v) {
    if (v.traffic) {
      if (this.patrolNear(650)) { G.crime(1, 'carjack'); BUS.emit('banner', { text: 'CARJACKED!', sub: 'Someone saw that...', color: '#ff7b7b' }); }
      v.traffic = null; v.mover.body.setImmovable(false); this.traffic = this.traffic.filter(o => o !== v);
    }
    this.vehicle = v; v.parked = false; G.inVehicle = v.kind;
    this.P.mover.body.enable = false; this.P.mover.setPosition(v.mover.x, v.mover.y);
    this.P.spr.setVisible(!!v.def.rider || v.kind === 'rccar'); this.P.shadow.setVisible(false);
    this.cameras.main.startFollow(v.mover, true, 0.1, 0.1);
    Sound.sfx('enter'); v.vel = { x: 0, y: 0 };
    const vh = { rccar: 'RC RACER! Up/W = gas, Down/S = brake & reverse, Left/Right = steer. Hold SHIFT/SPACE to drift. Press E to hop out.', car: 'You stole a toy car! Up = gas, Down = brake, Left/Right = steer, SHIFT = drift. Crash too hard and it breaks.', skate: 'Skateboard: light and nimble. Up = push, Left/Right = steer. Press E to hop off.', ball: 'Hamster ball! It rolls in any direction you push, and cats can not hurt you inside.' };
    if (Controls.isTouch) Helper.hint('veh_' + v.kind, `${v.def.label}! Point the joystick where you want to go and it steers there. Hold B to drift, tap A to hop off.`); else Helper.hint('veh_' + v.kind, vh[v.kind]);
  }
  exitVehicle(force) {
    const v = this.vehicle; if (!v) return; this.vehicle = null; G.inVehicle = null; v.parked = true;
    v.mover.body.setVelocity(0, 0); v.vel = { x: 0, y: 0 }; v.speed = 0;
    const P = this.P; const side = v.heading + Math.PI / 2; let px = v.mover.x, py = v.mover.y;
    for (const off of [side, side + Math.PI, v.heading + Math.PI, v.heading]) { const x = v.mover.x + Math.cos(off) * (v.def.r + 30), y = v.mover.y + Math.sin(off) * (v.def.r + 30); if (this.walkableAt(x, y)) { px = x; py = y; break; } }
    P.mover.body.enable = true; P.mover.body.reset(px, py); P.spr.setVisible(true).setAngle(0); P.shadow.setVisible(true);
    this.cameras.main.startFollow(P.mover, true, 0.12, 0.12); Sound.setEngine(0); Sound.sfx('door');
  }
  updateDriving(dt) {
    const v = this.vehicle, d = v.def, b = v.mover.body, mv = Controls.move();
    const prevSpeed = Math.hypot(v.vel.x, v.vel.y);
    v.vel.x = b.velocity.x; v.vel.y = b.velocity.y;
    const curSpeed = Math.hypot(v.vel.x, v.vel.y);
    if (prevSpeed - curSpeed > 230 && v.lastFree) { const dmg = (prevSpeed - curSpeed) * 0.07; if (d.hp < 9999) v.hp -= dmg; Sound.sfx('crash'); this.cameras.main.shake(160, 0.008); this.puff(v.mover.x, v.mover.y, 5, 0x999999); }
    v.lastFree = true;
    const maxS = d.max * Live.vehMul() * (Live.zoomies ? 1.12 : 1);
    if (d.omni) {
      v.vel.x += mv.x * d.accel * dt; v.vel.y += mv.y * d.accel * dt; const f = Math.max(0, 1 - d.grip * dt * (mv.mag > 0.1 ? 0.5 : 1));
      v.vel.x *= f; v.vel.y *= f; const sp = Math.hypot(v.vel.x, v.vel.y); if (sp > maxS) { v.vel.x *= maxS / sp; v.vel.y *= maxS / sp; }
      if (sp > 5) v.heading = Math.atan2(v.vel.y, v.vel.x); v.roll = (v.roll || 0) + sp * dt / 40;
    } else {
      let throttle = 0, steer = 0;
      if (mv.touch) { if (mv.mag > 0.15) { const tg = Math.atan2(mv.y, mv.x); const diff = wrapA(tg - v.heading); if (Math.abs(diff) > 2.5) { throttle = -mv.mag * 0.8; steer = -Math.sign(diff); } else { throttle = mv.mag * Math.max(0.35, 1 - Math.abs(diff) / 3); steer = Phaser.Math.Clamp(diff * 2.2, -1, 1); } } }
      else { throttle = -Controls.ky; steer = Controls.kx; }
      const fx = Math.cos(v.heading), fy = Math.sin(v.heading); let vF = v.vel.x * fx + v.vel.y * fy, vL = -v.vel.x * fy + v.vel.y * fx;
      if (throttle > 0) vF += throttle * d.accel * dt * (vF < 0 ? 2.2 : 1);
      else if (throttle < 0) vF += throttle * d.accel * dt * (vF > 0 ? 1.8 : 0.6);
      else vF *= Math.max(0, 1 - 0.9 * dt);
      const hb = Controls.dashHeld || Controls.brake;
      if (hb) vF *= Math.max(0, 1 - 1.6 * dt);
      vF = Phaser.Math.Clamp(vF, -maxS * 0.4, maxS);
      v.heading += steer * d.turn * dt * Phaser.Math.Clamp(vF / 170, -1, 1) * (hb ? 1.35 : 1);
      vL *= Math.max(0, 1 - (hb ? d.grip * 0.18 : d.grip) * dt);
      const nx = Math.cos(v.heading), ny = Math.sin(v.heading);
      v.vel.x = nx * vF - ny * vL; v.vel.y = ny * vF + nx * vL;
      if (hb && Math.abs(vL) > 120 && Math.random() < 0.5) this.skid(v);
    }
    b.setVelocity(v.vel.x, v.vel.y); v.speed = Math.hypot(v.vel.x, v.vel.y);
    if (d.engine) Sound.setEngine(Math.min(1, v.speed / maxS) * 0.9 + 0.1);
    if (v.hp <= 0) { this.wreck(v); }
    this.P.mover.setPosition(v.mover.x, v.mover.y);
  }
  skid(v) { const m = this.add.circle(v.mover.x - Math.cos(v.heading) * 30, v.mover.y - Math.sin(v.heading) * 30, 5, 0x111111, 0.35).setDepth(1); this.tweens.add({ targets: m, alpha: 0, duration: 2500, onComplete: () => m.destroy() }); }
  wreck(v) {
    Sound.sfx('crash'); this.puff(v.mover.x, v.mover.y, 12, 0x555555); v.spr.setTint(0x444444); v.wrecked = true;
    this.floatText(v.mover.x, v.mover.y - 40, 'WRECKED!', '#ff5a5a', 18); this.exitVehicle(); this.time.delayedCall(4000, () => { if (!v.dead && this.vehicle !== v) this.destroyVehicle(v); });
    if (v.home) this.time.delayedCall(30000, () => this.makeVehicle(v.home.kind, this.w(v.home.x), this.w(v.home.y), v.home.a, v.home.skin).home = v.home);
  }
  renderVehicles(time) {
    for (const v of this.vehicles) {
      if (v.dead) continue; const x = v.mover.x, y = v.mover.y;
      v.shadow.setPosition(x + 6, y + 8).setDepth(y - 2);
      if (v.def.omni) {
        v.spr.setPosition(x, y).setRotation((v.roll || 0) * 0.5).setDepth(y + 30).setAlpha(this.vehicle === v ? 0.5 : 0.85);
      } else v.spr.setPosition(x, y).setRotation(v.heading + Math.PI / 2).setDepth(y + (v.kind === 'skate' ? 0 : 20));
      if (v.sign) v.sign.setPosition(x, y).setRotation(v.heading + Math.PI / 2).setDepth(y + 21);
      if (v.l1) { const on = Math.floor(time / 180) % 2; const ox = Math.cos(v.heading + Math.PI / 2) * 14, oy = Math.sin(v.heading + Math.PI / 2) * 14; v.l1.setPosition(x + ox, y + oy).setAlpha(on ? 1 : 0.2); v.l2.setPosition(x - ox, y - oy).setAlpha(on ? 0.2 : 1); }
    }
    if (this.vehicle) {
      const v = this.vehicle, P = this.P, skin = G.save.skin;
      if (v.def.rider) {
        const a = wrapA(v.heading); let key = 'side', flip = false;
        if (Math.abs(a) < Math.PI / 4) { key = v.def.omni ? 'run' : 'side'; flip = !v.def.omni; } else if (Math.abs(a) > Math.PI * 3 / 4) { key = v.def.omni ? 'run' : 'side'; flip = !!v.def.omni; } else if (a > 0) key = 'front'; else key = 'back';
        const moving = v.speed > 30; if (v.def.omni && moving && Math.floor(time / 110) % 2) key = key === 'run' ? 'side' : key, flip = key === 'side' ? !flip : flip;
        P.spr.setTexture(`ham_${skin}_${key}`).setFlipX(flip).setScale(v.def.omni ? 0.42 : 0.5).setAngle(0).setAlpha(1);
        const lift = v.def.omni ? 8 : 26 + (moving ? Math.sin(time / 90) * 2 : 0);
        P.spr.setPosition(v.mover.x, v.mover.y + (v.def.omni ? 20 : 8) - (v.def.omni ? 0 : lift - 18)).setDepth(v.mover.y + (v.def.omni ? 25 : 10));
      } else if (v.kind === 'rccar') {
        P.spr.setTexture(`ham_${skin}_back`).setFlipX(false).setScale(0.26).setAlpha(1).setRotation(v.heading + Math.PI / 2).setPosition(v.mover.x + Math.cos(v.heading) * 4, v.mover.y + Math.sin(v.heading) * 4).setDepth(v.mover.y + 22);
      }
    }
  }
  // ---------- chasers (vans/police) ----------
  computeRoadFlow(x, y) {
    const d = this.roadDist; d.fill(-1); let [sx, sy] = this.cellOf(x, y); let s = sy * this.gw + sx;
    if (!this.road[s]) { let best = null, bd = 1e9; for (let oy = -12; oy <= 12; oy++) for (let ox = -12; ox <= 12; ox++) { const nx = sx + ox, ny = sy + oy; if (nx < 0 || ny < 0 || nx >= this.gw || ny >= this.gh) continue; const n = ny * this.gw + nx; if (this.road[n] && ox * ox + oy * oy < bd) { bd = ox * ox + oy * oy; best = n; } } if (best === null) return; s = best; }
    const q = new Int32Array(this.gw * this.gh); let h = 0, t = 0; d[s] = 0; q[t++] = s;
    while (h < t) { const c = q[h++]; const cx = c % this.gw, cy = (c / this.gw) | 0; for (let k = 0; k < 4; k++) { const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0); if (nx < 0 || ny < 0 || nx >= this.gw || ny >= this.gh) continue; const n = ny * this.gw + nx; if (d[n] !== -1 || !this.road[n]) continue; d[n] = d[c] + 1; q[t++] = n; } }
  }
  roadNext(x, y) {
    let [gx, gy] = this.cellOf(x, y); let cur = this.roadDist[gy * this.gw + gx];
    if (cur < 0) { // find nearest road cell
      let best = null, bd = 1e9; for (let oy = -6; oy <= 6; oy++) for (let ox = -6; ox <= 6; ox++) { const nx = gx + ox, ny = gy + oy; if (nx < 0 || ny < 0 || nx >= this.gw || ny >= this.gh) continue; const v = this.roadDist[ny * this.gw + nx]; if (v >= 0 && ox * ox + oy * oy < bd) { bd = ox * ox + oy * oy; best = [nx, ny]; } }
      if (!best) return null; return { x: (best[0] + 0.5) * CELL * S, y: (best[1] + 0.5) * CELL * S };
    }
    for (let k = 0; k < 4; k++) { let bx = gx, by = gy, bv = cur; for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const nx = gx + ox, ny = gy + oy; if (nx < 0 || ny < 0 || nx >= this.gw || ny >= this.gh) continue; const v = this.roadDist[ny * this.gw + nx]; if (v >= 0 && v < bv) { bv = v; bx = nx; by = ny; } } gx = bx; gy = by; cur = bv; }
    return { x: (gx + 0.5) * CELL * S, y: (gy + 0.5) * CELL * S };
  }
  updateChasers(dt) {
    const pp = this.playerPos(); const chasers = this.vehicles.filter(v => v.chaser && !v.dead);
    if (chasers.length) { this.roadT -= dt; if (this.roadT <= 0) { this.roadT = 0.5; this.computeRoadFlow(pp.x, pp.y); } }
    let sirenVol = 0;
    for (const v of chasers) {
      const b = v.mover.body; const dx = pp.x - v.mover.x, dy = pp.y - v.mover.y, dist = Math.hypot(dx, dy);
      sirenVol = Math.max(sirenVol, Phaser.Math.Clamp(1 - dist / 1600, 0, 1));
      let tgt;
      if (v.leaving) { tgt = { x: v.mover.x - dx, y: v.mover.y - dy }; if (dist > 1800) { this.destroyVehicle(v); continue; } }
      else if (dist < 420 && this.los(v.mover.x, v.mover.y, pp.x, pp.y)) tgt = pp; else tgt = this.roadNext(v.mover.x, v.mover.y) || pp;
      const want = Math.atan2(tgt.y - v.mover.y, tgt.x - v.mover.x); const diff = Math.abs(wrapA(want - v.heading));
      v.heading = Phaser.Math.Angle.RotateTo(v.heading, want, v.def.turn * dt);
      const maxS = v.def.max * (G.stars >= 5 ? 1.12 : 1) * (Live.isDay() ? 1.05 : 0.9) * (diff > 1.2 ? 0.5 : 1);
      v.speed += (maxS - v.speed) * Math.min(1, dt * 1.3);
      b.setVelocity(Math.cos(v.heading) * v.speed, Math.sin(v.heading) * v.speed);
      v.hitCd = (v.hitCd || 0) - dt;
      if (!v.leaving && dist < v.def.r + 34 && v.hitCd <= 0) {
        v.hitCd = 1.4; v.speed *= 0.3;
        if (this.vehicle) { const pv = this.vehicle; if (pv.def.hp < 9999) pv.hp -= 28; const a = Math.atan2(dy, dx); pv.mover.body.setVelocity(Math.cos(a) * 520, Math.sin(a) * 520); pv.vel = { x: Math.cos(a) * 520, y: Math.sin(a) * 520 }; pv.lastFree = false; Sound.sfx('crash'); this.cameras.main.shake(220, 0.012); if (pv.def.shield) this.hurtPlayer(6, v.mover); }
        else this.hurtPlayer(26, v.mover, 520);
      }
    }
    Sound.setSiren(sirenVol);
  }
  // ---------- wanted spawning ----------
  spawnAmbient() {
    const want = Live.isDay() ? { cat: 2, vacuum: 3 } : { cat: 1, vacuum: 1 }; const pp = this.playerPos();
    for (const k of Object.keys(want)) {
      const have = this.enemies.filter(e => e.ambient && e.kind === k).length;
      for (let i = have; i < want[k]; i++) { const p = this.randomWalkable(pp, 700, 2400); if (p) this.spawnEnemy(k, p.x, p.y, { ambient: true, state: 'wander' }); }
    }
  }
  patrolNear(r) { const pp = this.playerPos(); return this.enemies.some(e => Math.hypot(e.mover.x - pp.x, e.mover.y - pp.y) < r) || this.vehicles.some(v => v.chaser && Math.hypot(v.mover.x - pp.x, v.mover.y - pp.y) < r); }
  updateSpawns(dt) {
    const s = G.stars; const pp = this.playerPos();
    this.ambT -= dt; if (this.ambT <= 0) { this.ambT = 6; this.spawnAmbient(); }
    if (s === 0) {
      for (const e of this.enemies) if (!e.ambient && !e.leaving) { e.leaving = true; e.state = 'wander'; this.time.delayedCall(2500, () => e.alive && this.removeEnemy(e)); }
      for (const v of this.vehicles) if (v.chaser) v.leaving = true;
      return;
    }
    this.spawnT -= dt; if (this.spawnT > 0) return; this.spawnT = 0.75;
    const wantV = { van: [0, 0, 0, 0, 1, 2][s], police: [0, 0, 0, 0, 0, 1][s] };
    for (const k of Object.keys(wantV)) {
      const have = this.vehicles.filter(v => v.chaser && !v.leaving && v.kind === k).length;
      if (have < wantV[k]) {
        for (let i = 0; i < 40; i++) { const p = this.randomWalkable(pp, 1000, 1600); if (!p) continue; const [gx, gy] = this.cellOf(p.x, p.y); if (!this.road[gy * this.gw + gx]) continue; const v = this.makeVehicle(k, p.x, p.y, Math.atan2(pp.y - p.y, pp.x - p.x)); v.chaser = true; v.parked = false; v.speed = 100; if (k === 'van') BUS.emit('banner', { text: 'PEST CONTROL!', sub: 'The van is coming for you', color: '#ff5a5a' }); return; }
      }
    }
    const want = { cat: [0, 1, 2, 3, 3, 4][s], vacuum: [0, 0, 2, 2, 3, 3][s], owner: [0, 0, 0, 2, 2, 2][s] };
    for (const k of Object.keys(want)) {
      const have = this.enemies.filter(e => !e.ambient && !e.leaving && e.kind === k).length;
      if (have < want[k]) { const p = this.randomWalkable(pp, 650, 1100); if (p) { this.spawnEnemy(k, p.x, p.y, { state: 'chase', lastSeen: this.time.now }); return; } }
    }
  }
  // ---------- pickups / golden ----------
  spawnSeed() { const pp = this.playerPos(); const p = this.randomWalkable(pp, 500, 99999); if (p) this.addSeed(p.x + Phaser.Math.Between(-10, 10), p.y + Phaser.Math.Between(-10, 10), 'seed', 1); }
  onPickup(p) {
    if (p.kind === 'gold') { const got = G.addSeeds(25); Sound.sfx('gold'); this.sparkle(p.x, p.y, 0xffd84a, 16); this.floatText(p.x, p.y - 30, `+${got} GOLDEN`, '#ffd84a', 16); G.save.golden++; G.persist(); MissionSys.golden(); }
    else if (p.kind === 'bag') { }
    else { const got = G.addSeeds(p.value); Sound.sfx('seed'); if (got > 0) this.floatText(p.x, p.y - 20, `+${got}`, '#ffe9a8', 12); else this.floatText(p.x, p.y - 20, 'SACK FULL', '#ff9a9a', 11); }
  }
  goldenAround(n, label) {
    const pp = this.playerPos(); const pts = [];
    for (let i = 0; i < n; i++) { const p = this.randomWalkable(pp, 350, 1500) || this.randomWalkable(null); if (p) { pts.push(this.addSeed(p.x, p.y, 'gold', 25, { block: label })); this.sparkle(p.x, p.y, 0xffd84a, 12); } }
    return pts;
  }
  onBlock(d) {
    const n = Phaser.Math.Clamp(d.count, 1, 5); this.goldenAround(n, d.to);
    G.save.stats.blocks++; G.persist(); Sound.sfx('block');
    BUS.emit('blockBanner', d);
    // lab burst
    const c = this.add.circle(this.w(CITY.wheel.x), this.w(CITY.wheel.y), 40, 0x6ad7ff, 0.6).setDepth(5002).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: c, scale: 12, alpha: 0, duration: 1400, onComplete: () => c.destroy() });
  }
  missionGolden(n) { const have = this.pickups.filter(p => p.kind === 'gold').length; this.goldenAround(Math.max(n, n - have + 1), 'mission'); BUS.emit('banner', { text: 'GOLDEN SEEDS SPOTTED', sub: 'Check the minimap (gold dots)', color: '#ffd84a' }); }
  missionBags(pts) { this.bagSprites = pts.map(p => { const s = this.add.image(this.w(p[0]), this.w(p[1]), 'goldseed').setScale(0.5).setTint(0xc89a5a).setDepth(this.w(p[1])); return s; }); }
  clearMissionStuff() { if (this.bagSprites) { this.bagSprites.forEach(s => s.destroy()); this.bagSprites = null; } for (const e of this.enemies) if (e.smashTarget && e.alive) this.removeEnemy(e); }
  missionVehicle(s) {
    // make sure the requested vehicle exists near spawn
    const x = this.w(s.x), y = this.w(s.y);
    const ex = this.vehicles.find(v => v.kind === s.kind && !v.dead && !v.wrecked && Math.hypot(v.mover.x - x, v.mover.y - y) < 300);
    if (!ex) { const v = this.makeVehicle(s.kind, x, y, -Math.PI / 2); this.sparkle(x, y, 0xff5a5a, 12); }
  }
  sideSmash(n) { const pp = this.playerPos(); for (let i = 0; i < n; i++) { const p = this.randomWalkable(pp, 500, 1300); if (p) { const e = this.spawnEnemy('vacuum', p.x, p.y, { ambient: true, state: 'wander', smashTarget: true }); e.spr.setTint(0xff8080); } } }
  onStunned(e) { if (e.smashTarget && !e.smashed) { e.smashed = true; MissionSys.smashed(); this.floatText(e.mover.x, e.mover.y - 40, 'SMASHED!', '#ff7b7b', 16); this.time.delayedCall(1500, () => e.alive && this.removeEnemy(e)); } else if (G.stars === 0 && !e.smashTarget) G.crime(1, 'assault'); }
  // ---------- interaction ----------
  interactables() {
    const P = this.P, px = P.mover.x, py = P.mover.y; const list = [];
    const add = (x, y, r, label, fn, pri = 0) => { const d = Math.hypot(px - x, py - y); if (d < r) list.push({ d: d - pri, label, fn }); };
    if (!MissionSys.a) {
      const nm = MissionSys.next();
      add(this.w(CITY.hideout.x), this.w(CITY.hideout.y), 80, nm ? `Start mission: ${nm.title}` : 'All missions done!', () => nm && MissionSys.start(nm, this), 40);
      for (const j of SIDEJOBS) add(this.w(j.x), this.w(j.y), 80, `Side job: ${j.title}`, () => this.startSide(j), 30);
    }
    add(this.w(CITY.shop.x), this.w(CITY.shop.y), 80, 'Open the Seed Shop', () => BUS.emit('openShop'), 35);
    add(this.w(838), this.w(400), 80, 'Talk to Grandpa Nibbles', () => this.talkNibbles(), 36);
    for (const d of CITY.doors) add(this.w(d.x), this.w(d.y), 70, `Enter ${d.name}`, () => this.enterDoor(d), 10);
    for (const v of this.vehicles) if (!v.dead && !v.chaser && !v.wrecked) add(v.mover.x, v.mover.y, v.def.r + 50, `Ride ${v.traffic ? 'Car (steal!)' : v.def.label}`, () => this.enterVehicle(v));
    list.sort((a, b) => a.d - b.d); return list[0] || null;
  }
  talkNibbles() {
    const nm = MissionSys.next(); const tips = [
      'Hedges and bushes are your best friends. Hide in one and the heat cools off way faster.',
      'When Squeektoshi runs fast enough the whole city gets the ZOOMIES: double loot! Keep an eye on the RPM.',
      'Robot vacuums are slow but they never give up. A fast car or a dash will lose them.',
      'Inside a hamster ball, cats can not touch you. Cars still can, though!',
      'Every real block from the Squeekchain wheel drops golden seeds. Worth 25 each, more in the day.',
      'Spend your seeds at the green $ shop. A bigger sack and Turbo Paws make life much easier.',
      'Stealing a car off the street is quick, but if a patrol sees you, you get a star.' ];
    const lines = [['nibbles', nm ? `Your next job is "${nm.title}". Walk into the yellow ! right next to me and press E.` : 'You finished every job in town! Proud of you, kid. Side jobs and golden seeds are still out there.'], ['nibbles', Phaser.Utils.Array.GetRandom(tips)], ['nibbles', 'Need the full rundown? Press H (or the ? button) any time for my guide.']];
    BUS.emit('dialog', lines);
  }
  tutSkate() { const x = this.w(836), y = this.w(448); if (!this.vehicles.some(v => v.kind === 'skate' && Math.hypot(v.mover.x - x, v.mover.y - y) < 400)) { this.makeVehicle('skate', x, y, 0); this.sparkle(x, y, 0x7dff9a, 12); } this.tutSkatePos = { x, y }; }
  startSide(j) {
    if (j.id === 'courier') {
      const pp = this.playerPos(); const doors = CITY.doors.filter(d => Math.hypot(this.w(d.x) - pp.x, this.w(d.y) - pp.y) > 1200); const d = Phaser.Utils.Array.GetRandom(doors.length ? doors : CITY.doors);
      MissionSys.start({ id: 'courier', side: true, title: 'Seed Courier', reward: 45, intro: [['turbo', `Hot parcel for the ${d.name}. 50 seconds. Don't ask what's inside.`]], steps: [{ t: 'goto', area: 'city', x: d.x, y: d.y, r: 24, time: 50, text: `Deliver the parcel to the ${d.name.toUpperCase()}` }] }, this);
    } else {
      MissionSys.start({ id: 'smash', side: true, title: 'Vacuum Bash', reward: 70, intro: [['scar', "Three rogue robo-vacuums (the red ones) are hoovering up OUR seeds. Ram 'em with a vehicle!"]], steps: [{ t: 'vehicle', kind: 'any', text: 'Get a VEHICLE' }, { t: 'smash', n: 3, time: 80, text: 'RAM the red robo-vacuums' }] }, this);
    }
  }
  enterDoor(d) {
    if (G.frozen) return; Sound.sfx('door'); G.frozen = true; this.P.mover.body.setVelocity(0, 0);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => { G.frozen = false; this.returnDoor = d; this.clearAlerts(); Sound.setEngine(0); Sound.setSiren(0); this.scene.sleep(); this.scene.run('Interior', { door: d }); });
  }
  onWake(data) {
    G.area = 'city'; this.cameras.main.fadeIn(300);
    if (data && data.respawn) return this.respawn(true);
    const d = this.returnDoor; if (d) { this.P.mover.body.reset(this.w(d.x), this.w(d.y) + 30); this.P.dir = 'down'; }
    this.cameras.main.startFollow(this.P.mover, true, 0.12, 0.12);
    // pursuers wait outside
    if (G.stars > 0) for (let i = 0; i < Math.min(3, G.stars); i++) { const p = this.randomWalkable(this.playerPos(), 450, 800); if (p) this.spawnEnemy(['cat', 'vacuum', 'owner'][i], p.x, p.y, { state: 'chase', lastSeen: this.time.now }); }
    Sound.play(G.stars >= 3 ? 'chase' : (Live.isDay() ? 'day' : 'night'));
  }
  squashed() {
    if (G.frozen) return; G.frozen = true; this.P.mover.body && this.P.mover.body.setVelocity(0, 0);
    if (this.vehicle) this.exitVehicle(true);
    BUS.emit('bigText', { text: 'SQUASHED!', sub: 'You lost some seeds...', color: '#ff5a5a' }); Sound.sfx('fail');
    this.tweens.add({ targets: this.P.spr, scaleY: 0.12, scaleX: 0.75, duration: 300 });
    this.time.delayedCall(2300, () => this.respawn());
  }
  respawn(fromInterior) {
    const lost = Math.floor(G.save.seeds * 0.2); G.save.seeds -= lost; G.save.stats.busted++; G.persist(); BUS.emit('seeds', -lost, 0);
    G.hp = 100; G.wantedT = 0; G.setStars(0); G.cool = 0; BUS.emit('hp');
    if (MissionSys.a) MissionSys.fail('You got squashed');
    if (this.vehicle) this.exitVehicle(true);
    for (const e of this.enemies.slice()) if (!e.ambient) this.removeEnemy(e, false);
    for (const v of this.vehicles.slice()) if (v.chaser) this.destroyVehicle(v);
    this.P.mover.body.enable = true; this.P.mover.body.reset(this.w(CITY.start.x), this.w(CITY.start.y)); this.P.spr.setScale(0.5).setVisible(true); this.P.shadow.setVisible(true); this.P.invuln = 2;
    this.cameras.main.startFollow(this.P.mover, true, 0.12, 0.12); this.cameras.main.fadeIn(500);
    G.frozen = false;
  }
  onPhase(s) {
    const day = s === 'ACTIVE';
    BUS.emit('banner', day ? { text: 'SQUEEKTOSHI WOKE UP!', sub: 'Day mode: faster rides, more patrols, full pay', color: '#ffd166' } : { text: 'SQUEEKTOSHI FELL ASLEEP', sub: 'Night mode: stealthy, but loot x0.5', color: '#a98bff' });
    if (G.stars < 3) Sound.play(day ? 'day' : 'night');
  }
  isHidden(x, y) { const mx = x / S, my = y / S; return CITY.hides.some(r => mx > r[0] && mx < r[2] && my > r[1] && my < r[3]); }
  // ---------- draw ----------
  drawMarkers(time) {
    const g = this.markerG; g.clear(); const pulse = (Math.sin(time / 250) + 1) / 2;
    const ring = (x, y, r, col, a = 0.9) => { g.lineStyle(6, col, a); g.strokeCircle(x, y, r + pulse * 8); g.fillStyle(col, 0.18 + pulse * 0.1); g.fillCircle(x, y, r); };
    const showHide = !MissionSys.a;
    this.hideoutIcon.setVisible(showHide && !!MissionSys.next()); this.sideIcons.forEach(t => t.setVisible(showHide));
    if (showHide && MissionSys.next()) ring(this.w(CITY.hideout.x), this.w(CITY.hideout.y), 44, 0xffd166);
    ring(this.w(CITY.shop.x), this.w(CITY.shop.y), 34, 0x7dff9a, 0.7);
    if (showHide) for (const j of SIDEJOBS) ring(this.w(j.x), this.w(j.y), 34, 0x6ad7ff, 0.7);
    let t = MissionSys.target('city'); this.curTarget = null;
    if (!t && Helper.target() === 'hideout') t = { x: CITY.hideout.x, y: CITY.hideout.y, kind: 'door' };
    if (!t && Helper.active() && G.save.tut === 2 && this.tutSkatePos) t = { x: this.tutSkatePos.x / S, y: this.tutSkatePos.y / S, kind: 'door' };
    if (t) {
      let tx, ty;
      if (t.kind === 'vehicle') { const pp = this.playerPos(); let best = null, bd = 1e9; for (const v of this.vehicles) if (!v.dead && !v.chaser && !v.wrecked && (t.veh === 'any' ? true : v.kind === t.veh)) { const d = Math.hypot(v.mover.x - pp.x, v.mover.y - pp.y); if (d < bd) { bd = d; best = v; } } if (best) { tx = best.mover.x; ty = best.mover.y; } }
      else if (t.kind === 'golden') { const pp = this.playerPos(); let bd = 1e9; for (const p of this.pickups) if (p.kind === 'gold') { const d = Math.hypot(p.x - pp.x, p.y - pp.y); if (d < bd) { bd = d; tx = p.x; ty = p.y; } } }
      else { tx = this.w(t.x); ty = this.w(t.y); }
      if (MissionSys.step() && MissionSys.step().t === 'smash') { const pp = this.playerPos(); let bd = 1e9; for (const e of this.enemies) if (e.smashTarget && !e.smashed) { const d = Math.hypot(e.mover.x - pp.x, e.mover.y - pp.y); if (d < bd) { bd = d; tx = e.mover.x; ty = e.mover.y; } } }
      if (tx !== undefined) {
        this.curTarget = { x: tx, y: ty };
        if (t.kind === 'goto' || t.kind === 'cp' || t.kind === 'bag') { ring(tx, ty, t.kind === 'goto' ? 50 : 70, t.kind === 'cp' ? 0x6ad7ff : 0xffd166); g.fillStyle(0xffd166, 0.12); g.fillRect(tx - 20, ty - 400, 40, 400); }
        this.targetArrow.setVisible(true).setPosition(tx, ty - 90 - pulse * 14).setDepth(5600);
      } else this.targetArrow.setVisible(false);
    } else this.targetArrow.setVisible(false);
    // smash targets/side
  }
  drawWheel(dt, time) {
    const g = this.wheelG; g.clear(); const cx = this.w(CITY.wheel.x), cy = this.w(CITY.wheel.y), r = this.w(CITY.wheel.r);
    const day = Live.isDay(); const rpm = Live.rpm;
    this.wheelA += (day ? Math.max(rpm, 8) : 0) * Math.PI * 2 / 60 * dt * 0.5;
    const glowA = day ? 0.55 + Math.sin(time / 200) * 0.15 : 0.18;
    g.lineStyle(6, 0x7fe0ff, glowA); g.strokeEllipse(cx, cy, r * 1.9, r * 1.85);
    for (let i = 0; i < 12; i++) { const a = this.wheelA + i * Math.PI / 6; g.lineStyle(4, 0x9ff0ff, glowA * 0.9); g.lineBetween(cx, cy, cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.88); }
    if (day) { const ph = Math.floor(time / Math.max(60, 400 - rpm * 5)) % 2; this.squeek.setTexture(ph ? 'ham_classic_run' : 'ham_classic_side').setFlipX(!ph).setAngle(0).setY(cy + 30 - Math.abs(Math.sin(time / 90)) * 8); }
    else { this.squeek.setTexture('ham_classic_crouch').setFlipX(false).setY(cy + 30 + Math.sin(time / 600) * 2); }
    this.squeek.setDepth(3);
    if (!day && (!this.zT || time > this.zT)) { this.zT = time + 900; const z = this.add.text(cx + 30, cy - 10, 'z', { fontFamily: '"Press Start 2P"', fontSize: '22px', color: '#cfe6ff', stroke: '#001833', strokeThickness: 5 }).setDepth(5600); this.tweens.add({ targets: z, x: cx + 90, y: cy - 120, alpha: 0, scale: 1.8, duration: 2400, onComplete: () => z.destroy() }); }
  }
  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000); const P = this.P;
    if (P.invuln > 0) P.invuln -= dt;
    if (!G.frozen) {
      if (this.vehicle) { this.updateDriving(dt); if (Controls.take('action')) this.exitVehicle(); }
      else {
        this.updatePlayerFoot(dt);
        const it = this.interactables(); G.prompt = it ? it.label : null;
        if (Controls.take('action') && it) it.fn();
      }
      if (this.vehicle) G.prompt = 'Press E / A to get out';
    } else { P.mover.body.enable && P.mover.body.setVelocity(0, 0); if (this.vehicle) this.vehicle.mover.body.setVelocity(0, 0); G.prompt = null; }
    Controls.take('dash');
    this.updateTraffic(dt);
    const es = this.updateEnemies(dt); this.updateChasers(dt); this.updateSpawns(dt);
    this.updateWanted(dt, es.anySees || this.vehicles.some(v => v.chaser && !v.leaving && Math.hypot(v.mover.x - this.playerPos().x, v.mover.y - this.playerPos().y) < 700));
    // ram enemies with vehicle
    if (this.vehicle && this.vehicle.speed > 160 && this.vehicle.def.ram !== false) for (const e of this.enemies) if (e.alive && e.stunT <= 0 && Math.hypot(e.mover.x - this.vehicle.mover.x, e.mover.y - this.vehicle.mover.y) < e.def.r + this.vehicle.def.r) this.stunEnemy(e, this.vehicle.mover);
    this.collectPickups();
    this.seedT -= dt; if (this.seedT <= 0) { this.seedT = 4; if (this.pickups.filter(p => p.kind === 'seed').length < 55) this.spawnSeed(); }
    for (const p of this.pickups) if (p.kind === 'gold' && p.block !== 'mission' && time - p.born > 240000) { p.alive = false; p.spr.destroy(); p.glow && p.glow.destroy(); }
    // helper / tutorial
    const cp = this.playerPos(); const mvd = Math.hypot(cp.x - this.lastPos.x, cp.y - this.lastPos.y); this.lastPos = { x: cp.x, y: cp.y };
    Helper.tick(dt, { moved: mvd < 200 ? mvd : 0, inVeh: !!this.vehicle });
    if (P.hidden && !this.vehicle) Helper.hint('hidden', 'You are HIDDEN in the bushes. Enemies can barely see you here, and your wanted stars cool down much faster.');
    if (G.hp < 35) Helper.hint('lowhp', 'You are hurt! Get away from trouble. When you have no stars, your health slowly comes back.');
    // mission
    const pp = this.playerPos(); MissionSys.tick(dt, { area: 'city', mx: pp.x / S, my: pp.y / S, veh: this.vehicle ? (this.vehicle.kind === 'car' ? 'car' : this.vehicle.kind) : null });
    if (G.hp < 100 && G.stars === 0 && time - P.lastHurt > 4000) { G.hp = Math.min(100, G.hp + 6 * dt); BUS.emit('hp'); }
    // music by heat
    const day = Live.isDay(); if (G.stars >= 3) Sound.play('chase'); else if (Sound.songName === 'chase' || day !== this.lastDay) Sound.play(day ? 'day' : 'night'); this.lastDay = day;
    Sound.tempoMul = Live.zoomies ? 1.2 : 1;
    // render
    if (!this.vehicle) this.renderPlayer();
    this.renderVehicles(time);
    this.drawMarkers(time); this.drawWheel(dt, time);
    const nightA = this.darkA / 0.62;
    for (const g of this.glows) g.setAlpha(nightA * 0.55);
    this.labGlow.setAlpha(nightA * 0.35 + (day ? 0.12 : 0));
    const lights = this.lights.slice();
    lights.push([this.w(CITY.wheel.x), this.w(CITY.wheel.y), 4.5, 1]);
    if (this.vehicle) { const v = this.vehicle; lights.push([v.mover.x + Math.cos(v.heading) * 110, v.mover.y + Math.sin(v.heading) * 110, 1.4, 1]); lights.push([v.mover.x, v.mover.y, 1, 1]); }
    else lights.push([P.mover.x, P.mover.y, P.hidden ? 0.6 : 1.15, 1]);
    for (const p of this.pickups) if (p.kind === 'gold') lights.push([p.x, p.y, 0.7, 1]);
    for (const v of this.vehicles) if (v.chaser) lights.push([v.mover.x, v.mover.y, 1.3, 0.8]);
    for (const wv of CITY.windows) lights.push([this.w(wv[0]), this.w(wv[1]), 0.8, 0.6]);
    this.renderDark(dt, lights);
    // minimap data
    G.mm = { area: 'city', px: pp.x / S, py: pp.y / S, ang: this.vehicle ? this.vehicle.heading : ({ up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 })[P.dir],
      target: this.curTarget ? { x: this.curTarget.x / S, y: this.curTarget.y / S } : null, wx: this.curTarget,
      golden: this.pickups.filter(p => p.kind === 'gold').map(p => [p.x / S, p.y / S]),
      enemies: this.enemies.filter(e => e.state === 'chase' || e.smashTarget).map(e => [e.mover.x / S, e.mover.y / S]).concat(this.vehicles.filter(v => v.chaser).map(v => [v.mover.x / S, v.mover.y / S, 1])) };
    G.hidden = P.hidden && !this.vehicle;
  }
}
