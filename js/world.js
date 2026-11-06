// ===== Shared world logic: grid, flow field, player, enemies =====
const ENEMY = {
  cat:    { tex: 'cat', scale: 0.55, speed: 205, r: 22, dmg: 12, sight: 520, hp: 2, sideView: true },
  vacuum: { tex: 'vacuum', scale: 0.48, speed: 135, r: 26, dmg: 7, sight: 380, hp: 2, spin: true },
  owner:  { tex: 'owner', scale: 0.62, speed: 165, r: 24, dmg: 16, sight: 460, hp: 3 },
};

class WorldScene extends Phaser.Scene {
  setupWorld(opt) {
    this.sc = opt.scale; this.srcW = opt.srcW; this.srcH = opt.srcH;
    this.W = this.srcW * this.sc; this.H = this.srcH * this.sc;
    const tex = this.textures.get(opt.tex); if (opt.nearest) tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.bg = this.add.image(0, 0, opt.tex).setOrigin(0).setScale(this.sc).setDepth(-10);
    if (opt.flipX) this.bg.setFlipX(true);
    this.physics.world.setBounds(0, 0, this.W, this.H);
    this.cameras.main.setBounds(0, 0, this.W, this.H).setBackgroundColor('#0b0f1c');
    this.walls = this.physics.add.staticGroup();
    this.rects = opt.rects.map(r => opt.flipX ? [this.srcW - r[2], r[1], this.srcW - r[0], r[3]] : r);
    for (const r of this.rects) {
      const z = this.add.zone(r[0] * this.sc, r[1] * this.sc, (r[2] - r[0]) * this.sc, (r[3] - r[1]) * this.sc).setOrigin(0);
      this.physics.add.existing(z, true); this.walls.add(z);
    }
    // walk grid
    this.cell = opt.cell; this.gw = Math.ceil(this.srcW / this.cell); this.gh = Math.ceil(this.srcH / this.cell);
    this.walk = new Uint8Array(this.gw * this.gh);
    const b = opt.bounds || [0, 0, this.srcW, this.srcH];
    for (let gy = 0; gy < this.gh; gy++) for (let gx = 0; gx < this.gw; gx++) {
      const cx = (gx + 0.5) * this.cell, cy = (gy + 0.5) * this.cell, m = this.cell * 0.45;
      let ok = cx > b[0] && cx < b[2] && cy > b[1] && cy < b[3];
      if (ok) for (const r of this.rects) { if (cx + m > r[0] && cx - m < r[2] && cy + m > r[1] && cy - m < r[3]) { ok = false; break; } }
      this.walk[gy * this.gw + gx] = ok ? 1 : 0;
    }
    this.dist = new Int16Array(this.gw * this.gh); this.flowT = 0;
    this.enemies = []; this.pickups = [];
    this.lightImg = this.make.image({ key: 'light', add: false }).setOrigin(0.5);
    this.dark = this.add.renderTexture(0, 0, GW, GH).setOrigin(0).setScrollFactor(0).setDepth(5000);
    this.darkA = Live.isDay() ? 0 : 0.62;
  }
  // coordinate helpers (src px <-> world px)
  w(v) { return v * this.sc; }
  cellOf(x, y) { const gx = Phaser.Math.Clamp(Math.floor(x / this.sc / this.cell), 0, this.gw - 1), gy = Phaser.Math.Clamp(Math.floor(y / this.sc / this.cell), 0, this.gh - 1); return [gx, gy]; }
  walkableAt(x, y) { const [gx, gy] = this.cellOf(x, y); return this.walk[gy * this.gw + gx] === 1; }
  computeFlow(x, y) {
    const d = this.dist; d.fill(-1); const [sx, sy] = this.cellOf(x, y); const q = new Int32Array(this.gw * this.gh); let h = 0, t = 0;
    const s = sy * this.gw + sx; d[s] = 0; q[t++] = s;
    while (h < t) {
      const c = q[h++]; const cx = c % this.gw, cy = (c / this.gw) | 0, dc = d[c];
      if (dc > 400) continue;
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= this.gw || ny >= this.gh) continue; const n = ny * this.gw + nx;
        if (d[n] !== -1 || !this.walk[n]) continue; d[n] = dc + 1; q[t++] = n;
      }
    }
  }
  flowDir(x, y) {
    const [gx, gy] = this.cellOf(x, y); let best = 1e9, bx = 0, by = 0;
    const cur = this.dist[gy * this.gw + gx];
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue; const nx = gx + ox, ny = gy + oy; if (nx < 0 || ny < 0 || nx >= this.gw || ny >= this.gh) continue;
      const v = this.dist[ny * this.gw + nx]; if (v < 0) continue;
      if (ox && oy && (this.dist[gy * this.gw + nx] < 0 || this.dist[ny * this.gw + gx] < 0)) continue;
      const sc = v + (ox && oy ? 0.4 : 0); if (sc < best) { best = sc; bx = ox; by = oy; }
    }
    if (best === 1e9 || (cur >= 0 && best > cur + 0.5)) return null;
    const tx = (gx + bx + 0.5) * this.cell * this.sc, ty = (gy + by + 0.5) * this.cell * this.sc;
    const a = Math.atan2(ty - y, tx - x); return { x: Math.cos(a), y: Math.sin(a) };
  }
  los(x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1); const st = this.cell * this.sc * 0.5; const n = Math.ceil(d / st);
    for (let i = 1; i < n; i++) { const t = i / n; if (!this.walkableAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false; }
    return true;
  }
  randomWalkable(near, minD, maxD, tries = 60) {
    for (let i = 0; i < tries; i++) {
      const gx = Phaser.Math.Between(0, this.gw - 1), gy = Phaser.Math.Between(0, this.gh - 1);
      if (!this.walk[gy * this.gw + gx]) continue;
      const x = (gx + 0.5) * this.cell * this.sc, y = (gy + 0.5) * this.cell * this.sc;
      if (near) { const dd = Math.hypot(x - near.x, y - near.y); if (dd < minD || dd > maxD) continue; }
      return { x, y };
    }
    return null;
  }
  // ---------- player ----------
  createPlayer(x, y) {
    const skin = G.save.skin;
    const mover = this.add.zone(x, y, 30, 30); this.physics.add.existing(mover); mover.body.setCircle(15).setCollideWorldBounds(true);
    this.physics.add.collider(mover, this.walls);
    const shadow = this.add.ellipse(x, y, 40, 14, 0x000000, 0.28);
    const spr = this.add.image(x, y, `ham_${skin}_front`).setOrigin(0.5, 0.9).setScale(0.5);
    this.P = { mover, spr, shadow, dir: 'down', animT: 0, moving: false, dashT: 0, dashCd: 0, invuln: 0, hidden: false, knock: null, lastHurt: 0 };
    this.cameras.main.startFollow(mover, true, 0.12, 0.12);
    return this.P;
  }
  playerPos() { const v = this.vehicle; return v ? { x: v.mover.x, y: v.mover.y } : { x: this.P.mover.x, y: this.P.mover.y }; }
  updatePlayerFoot(dt) {
    const P = this.P, b = P.mover.body, mv = Controls.move();
    let sp = 215 * G.speedMul() * (Live.zoomies ? 1.15 : 1);
    if (P.dashCd > 0) P.dashCd -= dt;
    if (Controls.take('dash') && G.save.up.dash > 0 && P.dashCd <= 0 && mv.mag > 0.1) { P.dashT = 0.22; P.dashCd = G.save.up.dash >= 2 ? 0.9 : 1.6; Sound.sfx('dash'); this.puff(P.mover.x, P.mover.y + 8, 5); }
    if (P.dashT > 0) { P.dashT -= dt; sp *= 2.8; }
    let vx = mv.x * sp, vy = mv.y * sp;
    if (P.knock) { vx += P.knock.x; vy += P.knock.y; P.knock.x *= 0.86; P.knock.y *= 0.86; if (Math.hypot(P.knock.x, P.knock.y) < 10) P.knock = null; }
    b.setVelocity(vx, vy);
    P.moving = mv.mag > 0.12;
    if (P.moving) {
      if (Math.abs(mv.x) > Math.abs(mv.y) * 0.9) P.dir = mv.x < 0 ? 'left' : 'right'; else P.dir = mv.y < 0 ? 'up' : 'down';
      P.animT += dt * (P.dashT > 0 ? 18 : 10) * Math.max(0.5, mv.mag);
    }
    P.hidden = this.isHidden ? this.isHidden(P.mover.x, P.mover.y) : false;
  }
  renderPlayer() {
    const P = this.P, skin = G.save.skin; const x = P.mover.x, y = P.mover.y;
    let key = 'front', flip = false; const ph = Math.floor(P.animT) % 2;
    if (P.hidden && !P.moving) key = 'crouch';
    else if (P.dir === 'left') { key = P.moving ? (ph ? 'run' : 'side') : 'side'; flip = key === 'run'; }
    else if (P.dir === 'right') { key = P.moving ? (ph ? 'run' : 'side') : 'side'; flip = key === 'side'; }
    else if (P.dir === 'up') key = 'back'; else key = P.moving ? (ph ? 'hold' : 'front') : 'front';
    if (P.hidden && P.moving) key = P.dir === 'right' ? 'crouch' : 'crouch', flip = P.dir === 'right';
    P.spr.setTexture(`ham_${skin}_${key}`).setFlipX(flip);
    const bob = P.moving ? Math.abs(Math.sin(P.animT * Math.PI)) * 5 : Math.sin(this.time.now / 300) * 1.2;
    const sq = P.moving ? 1 + Math.sin(P.animT * Math.PI * 2) * 0.04 : 1 + Math.sin(this.time.now / 400) * 0.015;
    P.spr.setPosition(x, y + 14 - bob).setScale(0.5 * sq, 0.5 / sq).setDepth(y + 14);
    P.spr.setAlpha(P.hidden ? 0.55 : (P.invuln > 0 && Math.floor(this.time.now / 80) % 2 ? 0.4 : 1));
    if (P.dir === 'up' && P.moving) P.spr.setAngle(Math.sin(P.animT * Math.PI) * 6); else if (P.dir === 'down' && P.moving) P.spr.setAngle(Math.sin(P.animT * Math.PI) * 5); else P.spr.setAngle(0);
    P.shadow.setPosition(x, y + 16).setDepth(y - 1).setScale(1 - bob * 0.03);
  }
  hurtPlayer(dmg, from, knock = 260) {
    const P = this.P; if (P.invuln > 0 || G.frozen) return;
    if (this.vehicle && this.vehicle.def.shield) { this.vehicle.vel.x += (this.vehicle.mover.x - from.x) * 3; this.vehicle.vel.y += (this.vehicle.mover.y - from.y) * 3; Sound.sfx('blip'); return; }
    G.hp -= dmg * G.armorMul(); P.invuln = 0.8; P.lastHurt = this.time.now; Sound.sfx('hurt');
    this.cameras.main.shake(140, 0.006); this.cameras.main.flash(90, 255, 60, 60, false);
    if (from && !this.vehicle) { const a = Math.atan2(P.mover.y - from.y, P.mover.x - from.x); P.knock = { x: Math.cos(a) * knock, y: Math.sin(a) * knock }; }
    BUS.emit('hp');
    if (G.hp <= 0) { G.hp = 0; this.squashed(); }
  }
  // ---------- enemies ----------
  spawnEnemy(kind, x, y, opts = {}) {
    const d = ENEMY[kind]; const mover = this.add.zone(x, y, d.r * 2, d.r * 2); this.physics.add.existing(mover); mover.body.setCircle(d.r);
    this.physics.add.collider(mover, this.walls);
    const shadow = this.add.ellipse(x, y, d.r * 2.4, d.r * 0.9, 0, 0.28);
    const spr = this.add.image(x, y, d.tex).setScale(d.scale).setOrigin(0.5, kind === 'vacuum' ? 0.5 : 0.85);
    const e = Object.assign({ kind, def: d, mover, spr, shadow, state: opts.state || 'chase', path: opts.path || null, pi: 0, hitCd: 0, stunT: 0, seeT: 0, lastSeen: 0, wanderA: Math.random() * 6.28, wanderT: 0, speedMul: 1, alive: true, t: Math.random() * 10 }, opts);
    if (opts.state === 'chase') { spr.setAlpha(0); this.tweens.add({ targets: spr, alpha: 1, duration: 400 }); }
    this.enemies.push(e); return e;
  }
  removeEnemy(e, fade = true) {
    e.alive = false; e.mover.destroy(); e.shadow.destroy();
    if (fade) this.tweens.add({ targets: e.spr, alpha: 0, duration: 500, onComplete: () => e.spr.destroy() }); else e.spr.destroy();
  }
  updateEnemies(dt) {
    const pp = this.playerPos(); const P = this.P; let anySees = false; let nearest = 1e9;
    this.flowT -= dt; if (this.flowT <= 0) { this.flowT = 0.3; this.computeFlow(pp.x, pp.y); }
    for (const e of this.enemies) {
      if (!e.alive) continue; e.t += dt; const b = e.mover.body; const d = e.def;
      const dx = pp.x - e.mover.x, dy = pp.y - e.mover.y, dist = Math.hypot(dx, dy); nearest = Math.min(nearest, dist);
      if (e.hitCd > 0) e.hitCd -= dt;
      if (e.stunT > 0) { e.stunT -= dt; b.setVelocity(b.velocity.x * 0.9, b.velocity.y * 0.9); e.spr.setAngle(e.spr.angle + 720 * dt); this.drawEnemy(e); continue; }
      const sightR = d.sight * Live.sight() * (P.hidden && !this.vehicle ? 0.3 : 1) * (e.sightMul || 1);
      const sees = dist < sightR && this.los(e.mover.x, e.mover.y, pp.x, pp.y);
      if (sees) { e.lastSeen = this.time.now; }
      const hostile = G.stars > 0 && !G.frozen;
      if (hostile && sees) anySees = true;
      if (hostile && (sees || (e.state === 'chase' && this.time.now - e.lastSeen < 6000))) e.state = 'chase';
      else if (!hostile || this.time.now - e.lastSeen > 6000) e.state = e.path ? 'patrol' : (e.ambient ? 'wander' : 'search');
      e.sees = sees;
      let vx = 0, vy = 0, sp = d.speed * (e.speedMul || 1) * (G.stars >= 4 ? 1.12 : 1) * (Live.isDay() ? 1 : 0.92) * Live.chaseMul();
      if (e.state === 'chase') {
        let dir = null;
        if (sees) dir = { x: dx / dist, y: dy / dist }; else dir = this.flowDir(e.mover.x, e.mover.y);
        if (dir) { vx = dir.x * sp; vy = dir.y * sp; }
        if (e.kind === 'cat' && sees && dist < 180 && !e.pounce && e.hitCd <= 0) { e.pounce = 0.35; Sound.sfx('meow'); }
        if (e.pounce) { e.pounce -= dt; vx *= 1.9; vy *= 1.9; if (e.pounce <= 0) e.pounce = 0; }
      } else if (e.state === 'patrol' && e.path) {
        const tg = e.path[e.pi % e.path.length]; const tx = tg[0], ty = tg[1]; const ddx = tx - e.mover.x, ddy = ty - e.mover.y, dd = Math.hypot(ddx, ddy);
        if (dd < 20) e.pi++; else { vx = ddx / dd * sp * 0.45; vy = ddy / dd * sp * 0.45; }
      } else if (e.state === 'search' && G.stars > 0) {
        const dir = this.flowDir(e.mover.x, e.mover.y); if (dir && dist < 1600) { vx = dir.x * sp * 0.55; vy = dir.y * sp * 0.55; }
      } else {
        e.wanderT -= dt; if (e.wanderT <= 0 || (b.blocked.left || b.blocked.right || b.blocked.up || b.blocked.down)) { e.wanderA = Math.random() * 6.28; e.wanderT = 2 + Math.random() * 3; }
        vx = Math.cos(e.wanderA) * sp * 0.3; vy = Math.sin(e.wanderA) * sp * 0.3;
        if (e.leaving) { vx = -dx / dist * sp; vy = -dy / dist * sp; }
      }
      b.setVelocity(vx, vy);
      // contact
      if (e.state === 'chase' && dist < d.r + 20 && e.hitCd <= 0) {
        e.hitCd = 1.1;
        if (this.vehicle && this.vehicle.speed > 160 && this.vehicle.def.ram !== false) { this.stunEnemy(e, pp); }
        else this.hurtPlayer(d.dmg, e.mover);
      }
      this.drawEnemy(e);
    }
    this.enemies = this.enemies.filter(e => e.alive);
    // keep enemies from stacking on top of each other
    const es = this.enemies; for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
      const a = es[i].mover, b = es[j].mover; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, min = es[i].def.r + es[j].def.r + 6;
      if (d < min) { const push = (min - d) * 4; a.body.velocity.x -= dx / d * push; a.body.velocity.y -= dy / d * push; b.body.velocity.x += dx / d * push; b.body.velocity.y += dy / d * push; }
    }
    return { anySees, nearest };
  }
  stunEnemy(e, from) {
    e.stunT = 2.2; const a = Math.atan2(e.mover.y - from.y, e.mover.x - from.x); e.mover.body.setVelocity(Math.cos(a) * 500, Math.sin(a) * 500);
    Sound.sfx('crash'); this.puff(e.mover.x, e.mover.y, 6); BUS.emit('stunned', e);
  }
  drawEnemy(e) {
    const x = e.mover.x, y = e.mover.y, b = e.mover.body;
    if (e.def.sideView) { if (Math.abs(b.velocity.x) > 5) e.spr.setFlipX(b.velocity.x > 0 ? false : true); }
    const mv = Math.hypot(b.velocity.x, b.velocity.y) > 10;
    if (e.def.spin) { if (e.stunT <= 0) e.spr.setRotation(e.spr.rotation + (mv ? 0.12 : 0.03)); e.spr.setPosition(x, y); }
    else { const bob = mv ? Math.abs(Math.sin(e.t * 12)) * 4 : 0; e.spr.setPosition(x, y + e.def.r * 0.6 - bob); if (e.stunT <= 0) e.spr.setAngle(mv && e.kind === 'owner' ? Math.sin(e.t * 10) * 6 : 0); }
    e.spr.setDepth(y + e.def.r); e.shadow.setPosition(x, y + e.def.r * 0.6).setDepth(y - 2);
    if (e.state === 'chase' && !e.alert) { e.alert = this.add.text(x, y - 60, '!', { fontFamily: '"Press Start 2P"', fontSize: '22px', color: '#ff3b3b', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(6000); }
    if (e.alert) { if (e.state !== 'chase') { e.alert.destroy(); e.alert = null; } else e.alert.setPosition(x, y - e.def.r * 2.6 - Math.abs(Math.sin(e.t * 6)) * 6).setVisible(e.alive); }
  }
  clearAlerts() { for (const e of this.enemies) if (e.alert) { e.alert.destroy(); e.alert = null; } }
  // ---------- pickups ----------
  addSeed(x, y, kind = 'seed', value = 1, extra = {}) {
    const golden = kind === 'gold';
    const spr = this.add.image(x, y, golden ? 'goldseed' : 'seed').setScale(golden ? 0.62 : 0.5).setDepth(y);
    let glow = null;
    if (golden) { glow = this.add.image(x, y, 'glow').setScale(0.8).setTint(0xffd84a).setBlendMode(Phaser.BlendModes.ADD).setDepth(y - 1).setAlpha(0.8); this.tweens.add({ targets: glow, scale: 1.1, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 }); }
    this.tweens.add({ targets: spr, y: y - (golden ? 10 : 4), yoyo: true, repeat: -1, duration: golden ? 600 : 900 + Math.random() * 300, ease: 'Sine.inOut' });
    const p = Object.assign({ x, y, kind, value, spr, glow, alive: true, born: this.time.now }, extra); this.pickups.push(p); return p;
  }
  collectPickups() {
    if (!Live.canReward() || G.frozen) return;
    const pp = this.playerPos(); const r = this.vehicle ? 60 : 44;
    for (const p of this.pickups) {
      if (!p.alive || (p.cache && (Heists.cargo || p.cache.collected || Date.now() >= p.cache.expires))) continue;
      if (Math.abs(p.x - pp.x) < r && Math.abs(p.y - pp.y) < r) {
        p.alive = false; this.tweens.killTweensOf(p.spr);
        this.tweens.add({ targets: p.spr, y: p.y - 50, alpha: 0, scale: p.spr.scale * 1.6, duration: 350, onComplete: () => p.spr.destroy() });
        if (p.glow) { this.tweens.killTweensOf(p.glow); p.glow.destroy(); }
        this.onPickup(p);
      }
    }
    this.pickups = this.pickups.filter(p => p.alive);
  }
  floatText(x, y, txt, color = '#ffe066', size = 18) {
    const t = this.add.text(x, y, txt, { fontFamily: '"Press Start 2P"', fontSize: size + 'px', color, stroke: '#1a0f00', strokeThickness: 5 }).setOrigin(0.5).setDepth(6001);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 1100, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }
  puff(x, y, n = 4, color = 0xdddddd) {
    for (let i = 0; i < n; i++) {
      const c = this.add.circle(x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-6, 6), Phaser.Math.Between(5, 10), color, 0.7).setDepth(y + 20);
      this.tweens.add({ targets: c, x: c.x + Phaser.Math.Between(-30, 30), y: c.y - Phaser.Math.Between(10, 40), alpha: 0, scale: 2, duration: 500, onComplete: () => c.destroy() });
    }
  }
  sparkle(x, y, color = 0xffe066, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, d = 30 + Math.random() * 50;
      const c = this.add.star(x, y, 4, 3, 8, color).setDepth(6000);
      this.tweens.add({ targets: c, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, angle: 180, duration: 600 + Math.random() * 300, onComplete: () => c.destroy() });
    }
  }
  // ---------- star decay ----------
  updateWanted(dt, anySees) {
    if (!Live.canReward()) return;
    if (G.stars <= 0) { G.cool = 0; return; }
    G.wantedT = (G.wantedT || 0) + dt;
    if (anySees) { G.cool = 0; G.evading = false; return; }
    G.evading = true; const need = 3 + G.stars * 1.6;
    G.cool = (G.cool || 0) + dt * (this.P.hidden && !this.vehicle ? 2.6 : 1);
    G.coolPct = G.cool / need;
    if (G.cool >= need) { G.cool = 0; G.setStars(G.stars - 1); Sound.sfx('lose'); if (G.stars === 0) { const e = G.escaped(); BUS.emit('banner', { text: 'HEAT LOST!', sub: `Escaped after ${fmtSecs(e.t)}` + (e.rec ? ' · NEW BEST!' : ''), color: '#7dff9a' }); } }
  }
  // ---------- night lighting ----------
  renderDark(dt, lights) {
    const target = Live.isDay() ? 0 : (this.nightAlpha || 0.62);
    this.darkA += (target - this.darkA) * Math.min(1, dt * 1.2);
    const rt = this.dark; rt.clear();
    if (this.darkA < 0.01) { rt.setVisible(false); return; }
    rt.setVisible(true); rt.fill(0x070b24, this.darkA);
    const cam = this.cameras.main; const sx = cam.scrollX, sy = cam.scrollY;
    for (const L of lights) {
      const x = L[0] - sx, y = L[1] - sy, s = L[2];
      if (x < -300 || y < -300 || x > GW + 300 || y > GH + 300) continue;
      this.lightImg.setScale(s).setAlpha(L[3] || 1); rt.erase(this.lightImg, x, y);
    }
  }
}
