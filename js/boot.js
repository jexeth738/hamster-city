// ===== Boot / Title =====
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const w = GW, h = GH; const bar = this.add.rectangle(w / 2 - 200, h / 2 + 40, 0, 16, 0xffd166).setOrigin(0, 0.5);
    this.add.rectangle(w / 2, h / 2 + 40, 404, 20).setStrokeStyle(2, 0xffd166);
    this.add.text(w / 2, h / 2 - 10, 'LOADING SQUEEK CITY...', { fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#ffd166' }).setOrigin(0.5);
    this.load.on('progress', p => bar.width = 400 * p);
    const A = 'assets/';
    this.load.image('city', A + 'city.png'); this.load.image('title', A + 'title.jpg');
    for (const k of ['int_house', 'int_petshop', 'int_grocery', 'int_bank', 'int_garage', 'int_lab']) this.load.image(k, A + k + '.png');
    for (const sk of ['classic', 'golden', 'midnight', 'strawberry', 'squeek']) for (const f of ['front', 'side', 'back', 'run', 'hold', 'crouch']) this.load.image(`ham_${sk}_${f}`, `${A}ham_${sk}_${f}.png`);
    for (const k of ['cat', 'vacuum', 'van', 'owner', 'skate', 'ball', 'goldseed', 'rccar', 'seed', 'light', 'glow', 'portrait0', 'portrait1', 'portrait2', 'portrait3', 'portrait4', 'helper_npc']) this.load.image(k, A + k + '.png');
    for (let i = 0; i < 6; i++) this.load.image('car' + i, `${A}car${i}.png`);
    this.load.text('road', A + 'road.txt');
  }
  create() { G.load(); Cloud.init(); Sound.on = G.save.sound !== false; Live.start(); this.scene.start('Title'); }
}
class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    uiCam(this); const W = UW, H = UH, sm = H < 640;
    const bg = this.add.image(W / 2, H / 2, 'title'); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.tweens.add({ targets: bg, scale: bg.scale * 1.06, duration: 14000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.rectangle(0, 0, W, H, 0x050816, 0.2).setOrigin(0);
    const grad = this.add.graphics(); grad.fillGradientStyle(0x050816, 0x050816, 0x050816, 0x050816, 0.9, 0.9, 0, 0); grad.fillRect(0, 0, W, sm ? 200 : 240);
    const t1 = this.add.text(W / 2, sm ? 30 : 64, 'SQUEEK CITY', { fontFamily: P2, fontSize: sm ? '38px' : '64px', color: '#ffd166', stroke: '#3a1d00', strokeThickness: 12 }).setOrigin(0.5);
    t1.setShadow(6, 6, '#000000', 0, true, true);
    this.add.text(W / 2, sm ? 70 : 128, 'THE WHEEL RUNS THIS CITY', { fontFamily: P2, fontSize: sm ? '14px' : '22px', color: '#ff7b5a', stroke: '#1a0500', strokeThickness: 8 }).setOrigin(0.5);
    fitText(this.add.text(W / 2, sm ? 98 : 164, 'Run = heists open. Sleep = doors close. New blocks = extraction pay.', { fontFamily: VT, fontSize: '26px', color: '#cfe6ff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5), W - 40);
    this.tweens.add({ targets: t1, scale: 1.04, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
    this.chipMax = W - 30; this.chip = this.add.text(W / 2, sm ? 145 : 234, '', { fontFamily: VT, fontSize: '23px', align: 'center', wordWrap: { width: W - 80 }, color: '#fff', backgroundColor: '#0a0f22dd', padding: { x: 12, y: 8 } }).setOrigin(0.5);
    this.items = [];
    const add = (label, fn) => this.items.push({ label, fn });
    add('PLAY LIVE · REAL WHEEL', () => this.go('live'));
    add('PRACTICE · SIMULATED', () => this.go('practice'));
    add('HOW TO PLAY', () => this.help());
    add(() => `SOUND: ${Sound.on ? 'ON' : 'OFF'}`, () => { Sound.setOn(!Sound.on); G.save.sound = Sound.on; G.persist(); this.drawMenu(); });
    add('SHARE ON X', () => shareX());
    this.sel = 0; this.rows = this.items.map((it, i) => {
      const rh = VIEW.portrait ? 72 : sm ? 50 : 48; const y = (VIEW.portrait ? H * 0.46 : sm ? H - 34 - this.items.length * rh + rh / 2 : 452) + i * rh; const bg = this.add.rectangle(W / 2, y, VIEW.portrait ? W - 90 : sm ? 460 : 440, VIEW.portrait ? 60 : sm ? 44 : 40, 0x0a0f22, 0.85).setStrokeStyle(2, 0x6ad7ff, 0.6).setInteractive({ useHandCursor: true });
      const t = this.add.text(W / 2, y, '', { fontFamily: P2, fontSize: sm ? '16px' : '15px', color: '#fff' }).setOrigin(0.5);
      bg.on('pointerover', () => { this.sel = i; this.drawMenu(); }); bg.on('pointerdown', () => { Sound.resume(); this.sel = i; this.pick(); });
      return { bg, t };
    });
    this.drawMenu();
    this.add.text(W / 2, H - 6, VIEW.touch ? 'Left thumb: joystick  ·  A = interact  ·  B = dash  ·  II = pause  ·  ? = help' : 'WASD/Arrows move · E interact · Shift dash · H help · P pause · touch controls on mobile', { fontFamily: VT, fontSize: sm ? '18px' : '20px', color: '#cfd8ee', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 1);
    if (VIEW.touch && this.sys.game.device.fullscreen.available) this.add.text(W - 14, 14, '[ ] FULLSCREEN', { fontFamily: P2, fontSize: '11px', color: '#9ff0ff', backgroundColor: '#0a0f22cc', padding: { x: 10, y: 10 } }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).on('pointerup', () => toggleFull(this));
    this.input.keyboard.on('keydown', e => { Sound.resume(); Sound.play('title'); if (this.helpBox) return; const k = e.key.toLowerCase(); if (k === 'arrowup' || k === 'w') { this.sel = (this.sel + this.items.length - 1) % this.items.length; this.drawMenu(); Sound.sfx('blip'); } if (k === 'arrowdown' || k === 's') { this.sel = (this.sel + 1) % this.items.length; this.drawMenu(); Sound.sfx('blip'); } if (k === 'enter' || k === 'e' || k === ' ') this.pick(); if (k === 'h') this.help(); if (k === 'l') this.board(); });
    this.input.on('pointerdown', () => { Sound.resume(); Sound.play('title'); });
    Sound.play('title');
    this.runner = this.add.image(-80, sm ? H * 0.42 : 410, 'ham_classic_run').setScale(0.5);
    this.time.addEvent({ delay: 140, loop: true, callback: () => { const r = this.runner.texture.key === 'ham_classic_run'; this.runner.setTexture(r ? 'ham_classic_side' : 'ham_classic_run').setFlipX(r); } });
    this.tweens.add({ targets: this.runner, x: W + 80, duration: 6000, repeat: -1, delay: 500 });
    this.add.text(14, 14, VIEW.touch ? 'TOP 20' : '[L] LEADERBOARD', { fontFamily: P2, fontSize: '11px', color: '#ffd166', backgroundColor: '#0a0f22cc', padding: { x: 10, y: 10 } }).setInteractive({ useHandCursor: true }).on('pointerup', () => this.board());
    this.liveEv = () => this.updChip(); BUS.on('live', this.liveEv); this.events.on('shutdown', () => BUS.off('live', this.liveEv));
    this.cloudEv = () => { if (!Board.isOpen()) this.scene.restart(); }; BUS.on('cloudLoaded', this.cloudEv); this.events.on('shutdown', () => { BUS.off('cloudLoaded', this.cloudEv); Board.close(true); });
    // No name/auth prompt before the player explicitly chooses LIVE.
    this.updChip(); this.time.addEvent({ delay: 1000, loop: true, callback: () => this.updChip() });
  }
  updChip() {
    const L = Live, live = L.isFresh(), practice = G.playMode === 'practice';
    const state = !live && !practice ? 'SIGNAL LOST / UNKNOWN' : L.isDay() ? 'RUNNING' : 'SLEEPING';
    this.chip.setText(`${practice ? 'PRACTICE · SIMULATED / LOCAL ONLY' : live ? 'LIVE · HARDWARE WHEEL' : 'LIVE · WAITING FOR FRESH HARDWARE'}\nSQUEEKTOSHI: ${state} · ${L.rpm.toFixed(1)} RPM\nPROJECTED #${fmtBlock(L.height)} · SETTLED #${fmtBlock(L.settledHeight)}\n${L.eventText()}`)
      .setColor(live ? '#7dff9a' : '#ffcf82').setFontFamily(VT).setFontSize(VIEW.portrait ? 26 : UH < 640 ? 18 : 22);
    if (this.startError && !live && !practice) this.chip.setText(this.chip.text + '\nLIVE is locked. Wait for the signal or choose PRACTICE.');
    if (this.chip.height > (VIEW.portrait ? 300 : 124)) this.chip.setFontSize(18);
  }
  drawMenu() { this.rows.forEach((r, i) => { const it = this.items[i]; r.t.setText((i === this.sel ? '> ' : '') + (typeof it.label === 'function' ? it.label() : it.label)).setColor(i === this.sel ? '#ffd166' : '#ffffff'); r.bg.setStrokeStyle(2, i === this.sel ? 0xffd166 : 0x6ad7ff, i === this.sel ? 1 : 0.5); }); }
  pick() { Sound.resume(); Sound.sfx('select'); this.items[this.sel].fn(); }
  board() { if (this.helpBox || Board.isOpen()) return; Sound.resume(); Sound.sfx('select'); Board.open(); }
  help() { if (this.helpBox) return; this.helpBox = showHelp(this, () => { this.helpBox = null; }); }
  go(mode = 'live') {
    G.selectMode(mode);
    if (mode === 'live' && !Live.isFresh()) { this.startError = true; this.updChip(); return; }
    document.body.classList.add('portrait-ok');
    Heists.reset(); G.prompt = null; G.mm = null; G.inVehicle = null;
    Sound.resume(); G.hp = 100; G.stars = 0; MissionSys.a = null; G.frozen = false;
    this.cameras.main.fadeOut(400); this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.stop('UI'); this.scene.start('City'); });
  }
}
