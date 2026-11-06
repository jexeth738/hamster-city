// ===== HUD / menus / dialogs / touch controls =====
const P2 = '"Press Start 2P"', VT = 'VT323';
// share link follows wherever the game is hosted (GitHub Pages now, custom domain later)
const GAME_URL = /^https?:$/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname) ? location.origin + location.pathname.replace(/index\.html$/, '') : 'https://squeekcity.space/';
function shareX() {
  const txt = `I'm pulling hamster heists in SQUEEK CITY - a wheel-controlled heist game in ${G.playMode === 'practice' ? 'SIMULATED PRACTICE' : 'LIVE mode'}, powered by @squeekchain's real hamster Squeektoshi (block #${Live.height || '?'}). ${G.save.missions}/${MISSIONS.length} missions, ${G.save.total} seeds stolen. Can you beat me?`;
  window.open('https://x.com/intent/post?text=' + encodeURIComponent(txt) + '&url=' + encodeURIComponent(GAME_URL), '_blank', 'noopener');
}
function toggleFull(scene) {
  const sc = scene.scale; if (sc.isFullscreen) { sc.stopFullscreen(); return; }
  try { sc.startFullscreen({ navigationUI: 'hide' }); } catch (e) { }
  setTimeout(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }, 300);
}
function panel(scene, x, y, w, h, a = 0.78, stroke = 0x6ad7ff) {
  const g = scene.add.graphics(); g.fillStyle(0x0a0f22, a); g.fillRoundedRect(x, y, w, h, 12); g.lineStyle(3, stroke, 0.9); g.strokeRoundedRect(x, y, w, h, 12);
  g.lineStyle(1, 0xffffff, 0.12); g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 9); return g;
}
function fitText(t, maxW, minSize) { let fs = parseInt(t.style.fontSize, 10); while (t.width > maxW && fs > (minSize || 8)) { fs--; t.setFontSize(fs); } if (t.width > maxW && t.text.length > 4) { let s = t.text; while (t.width > maxW && s.length > 4) { s = s.slice(0, -2); t.setText(s + '…'); } } return t; }
// Fit the complete wrapped line before typewriter animation; portrait gets a taller panel.
function fitParagraph(t, text, maxH) { let fs = 32; t.setFontSize(fs).setText(text); while (t.height > maxH && fs > 18) t.setFontSize(--fs); return t; }
function touchify(t) { return String(t).replace(/\bpress E\b/g, 'tap A').replace(/\bPress E\b/g, 'Tap A').replace(/\bpress E\/A\b/gi, 'tap A').replace(/\b[Pp]ress H\b/g, 'tap ?').replace(/\bTap H\b/g, 'Tap ?').replace(/\bPress M\b/g, 'Tap the minimap').replace(/\bpress M\b/g, 'tap the minimap').replace(/SHIFT\/SPACE/g, 'B').replace(/\(E \/ A\)/g, '(A)'); }
function uiCam(scene) { scene.cameras.main.setOrigin(0, 0).setZoom(U); }
class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }
  create() {
    this.touch = VIEW.touch || this.sys.game.device.input.touch; Controls.isTouch = this.touch; uiCam(this);
    this.input.addPointer(3);
    // ---- stats ----
    panel(this, 14, 12, 316, 112);
    this.add.image(42, 40, 'seed').setScale(0.6);
    this.seedTxt = this.add.text(62, 28, '0', { fontFamily: P2, fontSize: '20px', color: '#ffe066', stroke: '#2a1a00', strokeThickness: 4 });
    this.capTxt = this.add.text(62, 52, '', { fontFamily: VT, fontSize: '18px', color: '#c8b98a' });
    this.multTxt = this.add.text(316, 30, '', { fontFamily: P2, fontSize: '12px', color: '#7dff9a' }).setOrigin(1, 0);
    this.add.image(36, 82, `ham_classic_front`).setScale(0.22);
    this.hpBg = this.add.rectangle(56, 76, 180, 14, 0x3a0d14).setOrigin(0, 0.5).setStrokeStyle(2, 0x000000);
    this.hpBar = this.add.rectangle(56, 76, 180, 14, 0xff4d6d).setOrigin(0, 0.5);
    this.armTxt = this.add.text(246, 69, '', { fontFamily: VT, fontSize: '18px', color: '#d9c39a' });
    this.stars = []; for (let i = 0; i < 5; i++) this.stars.push(this.add.star(66 + i * 36, 104, 5, 7, 15, 0x333a55).setStrokeStyle(2, 0x000000));
    this.evadeBar = this.add.rectangle(48, 120, 0, 4, 0x7dff9a).setOrigin(0, 0.5);
    this.hiddenTxt = this.add.text(250, 96, 'HIDDEN', { fontFamily: P2, fontSize: '10px', color: '#06300f', backgroundColor: '#7dff9a', padding: { x: 6, y: 4 } }).setVisible(false);
    // ---- objective ----
    this.objBg = this.add.graphics(); this.objCX = UW < 1050 ? (UW - 220) / 2 : Math.round((330 + UW - 354) / 2); this.objW = UW < 1050 ? UW - 240 : Math.min(580, UW - 704); this.objTitle = this.add.text(this.objCX, 20, '', { fontFamily: P2, fontSize: '11px', color: '#ffd166' }).setOrigin(0.5, 0);
    this.objTxt = this.add.text(this.objCX, 40, '', { fontFamily: VT, fontSize: this.objW < 500 ? '23px' : '26px', color: '#ffffff', stroke: '#000', strokeThickness: 3, align: 'center', wordWrap: { width: this.objW - 40 } }).setOrigin(0.5, 0);
    this.timerTxt = this.add.text(this.objCX, 76, '', { fontFamily: P2, fontSize: '16px', color: '#ff8a8a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0);
    // ---- live panel ----
    this.buildLive();
    // ---- minimap ----
    this.mmS = VIEW.portrait ? 124 : this.touch && UH < 640 ? (UH < 520 ? 124 : 140) : 200; this.mmX = UW - 14 - this.mmS; this.mmY = VIEW.portrait ? 260 : 212;
    panel(this, this.mmX - 6, this.mmY - 6, this.mmS + 12, this.mmS + 12, 0.85);
    this.mmImg = this.add.image(this.mmX, this.mmY, 'city').setOrigin(0).setDisplaySize(this.mmS, this.mmS).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (!this.menu && !this.dlg && !this.helpOpen) this.toggleBigMap(); });
    this.mmG = this.add.graphics(); this.mmLabel = this.add.text(this.mmX + this.mmS / 2, this.mmY + this.mmS + 10, 'SQUEEK CITY', { fontFamily: P2, fontSize: '9px', color: '#9ff0ff' }).setOrigin(0.5, 0).setVisible(!(this.touch && UH < 520));
    // ---- prompt / banner / bigtext ----
    this.promptBg = this.add.graphics(); this.promptTxt = this.add.text(UW / 2, UH - 72, '', { fontFamily: P2, fontSize: UW < 1050 ? '12px' : '14px', color: '#ffffff', align: 'center', wordWrap: { width: UW - 260 } }).setOrigin(0.5);
    this.bannerC = this.add.container(UW / 2, 150).setAlpha(0).setDepth(65);
    this.bannerBg = this.add.graphics(); this.bannerT = this.add.text(0, -12, '', { fontFamily: P2, fontSize: '22px', color: '#ffd166', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    this.bannerS = this.add.text(0, 20, '', { fontFamily: VT, fontSize: '24px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    this.bannerC.add([this.bannerBg, this.bannerT, this.bannerS]); this.bannerQ = [];
    this.bigT = this.add.text(UW / 2, UH / 2 - 40, '', { fontFamily: P2, fontSize: '46px', color: '#ffd166', stroke: '#1a0f00', strokeThickness: 10 }).setOrigin(0.5).setAlpha(0).setDepth(50);
    this.bigS = this.add.text(UW / 2, UH / 2 + 20, '', { fontFamily: P2, fontSize: '18px', color: '#ffffff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setAlpha(0).setDepth(50);
    this.edgeArrow = this.add.triangle(0, 0, 0, 0, 30, 12, 0, 24, 0xffd166).setStrokeStyle(3, 0x3a2400).setVisible(false);
    this.zoomFx = this.add.text(UW / 2, UH - 64, 'ZOOMIES! x2', { fontFamily: P2, fontSize: '18px', color: '#ff7bd5', stroke: '#2a0020', strokeThickness: 6 }).setOrigin(0.5).setVisible(false);
    // ---- touch controls ----
    if (this.touch) this.buildTouch();
    this.pauseBtn = this.add.text(14, this.touch ? 134 : 140, this.touch ? 'II' : 'ESC: menu', { fontFamily: P2, fontSize: this.touch ? '20px' : '9px', color: '#ffffff', backgroundColor: '#0a0f22cc', padding: { x: 10, y: 8 } }).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.togglePause());
    // ---- keyboard ----
    const K = Phaser.Input.Keyboard.KeyCodes; this.keys = this.input.keyboard.addKeys({ up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D, shift: K.SHIFT, space: K.SPACE });
    this.input.keyboard.on('keydown', e => this.onKey(e));
    this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');
    // ---- events ----
    this.ev = [['seeds', (g, lost) => this.onSeeds(g)], ['stars', (n, up) => this.onStars(n, up)], ['hp', () => { }], ['banner', b => this.banner(b)], ['bigText', b => this.bigText(b)],
      ['dialog', (lines, cb) => this.dialog(lines, cb)], ['openShop', () => this.openShop()], ['blockBanner', d => this.blockBanner(d)], ['credits', () => this.credits()], ['live', () => this.refreshLive()], ['checkpoint', () => this.flashObj()], ['helper', h => this.helperBubble(h)]];
    for (const [k, f] of this.ev) BUS.on(k, f, this);
    this.events.on('shutdown', () => { for (const [k, f] of this.ev) BUS.off(k, f, this); });
    this.helpBtn = this.add.text(this.touch ? 80 : 140, this.touch ? 134 : 140, this.touch ? '?' : 'H: help', { fontFamily: P2, fontSize: this.touch ? '20px' : '9px', color: '#f0dfb8', backgroundColor: '#0a0f22cc', padding: { x: 10, y: 8 } }).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.openHelp());
    if (this.touch && this.sys.game.device.fullscreen.available) {
      this.fsBtn = this.add.text(146, 134, '[ ]', { fontFamily: P2, fontSize: '16px', color: '#9ff0ff', backgroundColor: '#0a0f22cc', padding: { x: 10, y: 10 } }).setInteractive({ useHandCursor: true }).on('pointerup', () => toggleFull(this));
    }
    this.topBtn = this.add.text(this.touch ? (this.fsBtn ? 222 : 146) : 232, this.touch ? 134 : 140, this.touch ? 'TOP' : 'L: top 20', { fontFamily: P2, fontSize: this.touch ? '16px' : '9px', color: '#ffd166', backgroundColor: '#0a0f22cc', padding: { x: 10, y: this.touch ? 10 : 8 } }).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.openBoard());
    this.events.on('shutdown', () => Board.close(true));
    this.buildHelper();
    this.menu = null; this.dlg = null; this.lastStatus = Live.status; this.lastZoom = false;
    this.refreshLive();
  }
  worldKey() { return this.scene.isActive('Interior') || this.scene.isPaused('Interior') ? 'Interior' : 'City'; }
  // ---------- live panel ----------
  buildLive() {
    const w = 340, h = 188, x = UW - 14 - w, y = 12; this.liveX = x; this.liveY = y; this.liveW = w;
    this.liveBg = panel(this, x, y, w, h, 0.85);
    this.liveDot = this.add.circle(x + 20, y + 20, 7, 0xff3b3b);
    this.liveTitle = this.add.text(x + 34, y + 13, 'LIVE · SQUEEKCHAIN', { fontFamily: P2, fontSize: '11px', color: '#ffffff' });
    this.miniWheel = this.add.graphics(); this.mwA = 0;
    this.liveStatus = this.add.text(x + 76, y + 40, '', { fontFamily: P2, fontSize: '10px', color: '#7dff9a' });
    this.liveRpm = this.add.text(x + 76, y + 58, '', { fontFamily: VT, fontSize: '22px', color: '#cfe6ff' });
    this.liveBlock = this.add.text(x + 14, y + 92, '', { fontFamily: P2, fontSize: '11px', color: '#ffd166' });
    this.liveProgBg = this.add.rectangle(x + 14, y + 114, w - 28, 10, 0x1d2747).setOrigin(0, 0.5).setStrokeStyle(1, 0x6ad7ff, 0.6);
    this.liveProg = this.add.rectangle(x + 14, y + 114, 0, 10, 0x6ad7ff).setOrigin(0, 0.5);
    this.liveProgTxt = this.add.text(x + w - 14, y + 90, '', { fontFamily: VT, fontSize: '18px', color: '#9fb6d9' }).setOrigin(1, 0);
    this.liveMode = this.add.text(x + 14, y + 124, '', { fontFamily: VT, fontSize: '19px', color: '#ffffff' });
    this.liveEvent = this.add.text(x + 14, y + 148, '', { fontFamily: VT, fontSize: '20px', color: '#ffd166', wordWrap: { width: w - 28 } });
    this.miniHam = this.add.image(x + 40, y + 62, 'ham_classic_run').setScale(0.2);
  }
  refreshLive() {
    if (!this.liveStatus) return; const L = Live;
    const live = L.isFresh(); const practice = G.playMode === 'practice';
    this.liveTitle.setText(practice ? 'PRACTICE · SIMULATED' : live ? 'LIVE · SQUEEKTOSHI' : 'LIVE · SIGNAL LOST').setColor(live ? '#ffffff' : '#ffb35c');
    this.liveDot.setFillStyle(live ? 0x7dff9a : 0xffb35c);
    this.liveStatus.setText(!L.canReward() ? 'STATE UNKNOWN · HOLD' : L.isDay() ? 'SQUEEKTOSHI: RUNNING' : 'SQUEEKTOSHI: ASLEEP').setColor(L.isDay() ? '#7dff9a' : '#b9a3ff');
    this.liveRpm.setText(`${L.rpm.toFixed(1)} RPM · ${L.canReward() ? (L.speed / 10).toFixed(1) + ' cm/s' : 'last reading'}`);
    this.liveBlock.setText(`${practice ? 'SIM' : 'PROJECTED'} #${fmtBlock(L.height)}`);
    this.liveProgTxt.setText(practice ? 'local only' : `settled #${fmtBlock(L.settledHeight)}`);
    this.liveProg.width = (this.liveW - 28) * L.progress;
    this.liveMode.setText(!L.canReward() ? 'PAYOUTS HELD · NO SIMULATION' : L.zoomies ? 'ZOOMIES · x2 loot / x1.35 chase' : L.isDay() ? 'WHEEL OPEN · loot x1 / day patrols' : 'WHEEL CLOSED · loot x0.5 / stealth');
    this.liveEvent.setText(Heists.label());
    this.multTxt.setText(L.canReward() ? `x${L.mult()}` : 'HOLD').setColor(L.mult() >= 1 ? '#7dff9a' : '#ff9a9a');
    if (L.zoomies && !this.lastZoom) { this.banner({ text: 'ZOOMIES!!!', sub: `Squeektoshi hit ${L.rpm.toFixed(0)} RPM — DOUBLE LOOT`, color: '#ff7bd5' }); Sound.sfx('zoomies'); }
    this.lastZoom = L.zoomies;
  }
  // ---------- touch ----------
  buildTouch() {
    const jx = 140, jy = UH - 130; this.joyHome = { x: jx, y: jy };
    this.joyBase = this.add.circle(jx, jy, 84, 0xffffff, 0.12).setStrokeStyle(4, 0xffffff, 0.35);
    this.joyKnob = this.add.circle(jx, jy, 38, 0xffffff, 0.35);
    const btn = (x, y, r, label, col, down, up) => { const c = this.add.circle(x, y, r, col, 0.45).setStrokeStyle(4, 0xffffff, 0.6).setInteractive(); const t = this.add.text(x, y, label, { fontFamily: P2, fontSize: r > 45 ? '22px' : '15px', color: '#fff' }).setOrigin(0.5); c.on('pointerdown', () => { c.setAlpha(1.4); down(); }); c.on('pointerup', () => { c.setAlpha(1); up && up(); }); c.on('pointerout', () => { c.setAlpha(1); up && up(); }); return c; };
    btn(UW - 90, UH - (UH < 520 ? 110 : 124), UH < 520 ? 52 : 56, 'A', 0x2f9e44, () => { Controls.action = true; Sound.resume(); this.menuSelect(); });
    btn(UW - 205, UH - 84, 40, 'B', 0xc92a2a, () => { Controls.dash = true; Controls.dashHeld = true; }, () => { Controls.dashHeld = false; });
    this.joyId = null;
    this.input.on('pointerdown', p => { const x = p.x / U, y = p.y / U; if (x < UW * 0.42 && y > UH * 0.4 && this.joyId === null && !this.menu && !this.helpOpen) { this.joyId = p.id; this.joyBase.setPosition(Math.max(90, x), Math.min(UH - 90, y)); this.joyKnob.setPosition(x, y); } if (this.dlg) this.advanceDialog(); });
    this.input.on('pointermove', p => { if (p.id !== this.joyId) return; const dx = p.x / U - this.joyBase.x, dy = p.y / U - this.joyBase.y; const l = Math.hypot(dx, dy); const m = Math.min(l, 84); const a = Math.atan2(dy, dx); this.joyKnob.setPosition(this.joyBase.x + Math.cos(a) * m, this.joyBase.y + Math.sin(a) * m); const n = l < 12 ? 0 : m / 84; Controls.tx = Math.cos(a) * n; Controls.ty = Math.sin(a) * n; });
    const rel = p => { if (p.id !== this.joyId) return; this.joyId = null; Controls.tx = 0; Controls.ty = 0; this.joyBase.setPosition(this.joyHome.x, this.joyHome.y); this.joyKnob.setPosition(this.joyHome.x, this.joyHome.y); };
    this.input.on('pointerup', rel); this.input.on('pointerupoutside', rel);
  }
  // ---------- keyboard ----------
  onKey(e) {
    Sound.resume(); const k = e.key.toLowerCase();
    if (this.helpOpen) return;
    if (this.dlg) { if (['e', 'enter', ' ', 'escape'].includes(k)) this.advanceDialog(k === 'escape'); return; }
    if (this.menu) {
      if (k === 'arrowup' || k === 'w') this.menuMove(-1); else if (k === 'arrowdown' || k === 's') this.menuMove(1);
      else if (k === 'enter' || k === 'e' || k === ' ') this.menuSelect(); else if (k === 'escape' || k === 'p') this.closeMenu();
      return;
    }
    if (k === 'e' || k === 'enter') Controls.action = true;
    if (k === 'shift' || k === ' ') Controls.dash = true;
    if (k === 'escape' && this.dlg) this.advanceDialog(true); else if (k === 'escape' || k === 'p') this.togglePause();
    if (k === 'm') this.toggleBigMap();
    if (k === 'h') this.openHelp();
    if (k === 'l') this.openBoard();
    if (k === 't') Helper.skip();
  }
  // ---------- per-frame ----------
  update(time, delta) {
    const kk = this.keys; Controls.kx = (kk.right.isDown || kk.d.isDown ? 1 : 0) - (kk.left.isDown || kk.a.isDown ? 1 : 0); Controls.ky = (kk.down.isDown || kk.s.isDown ? 1 : 0) - (kk.up.isDown || kk.w.isDown ? 1 : 0);
    if (!this.touch || !Controls.dashHeld) Controls.dashHeld = kk.shift.isDown || kk.space.isDown || Controls.dashHeld && this.touch;
    if (this.menu || this.dlg) { Controls.kx = 0; Controls.ky = 0; }
    // stats
    this.seedTxt.setText(G.save.seeds.toLocaleString('en-US')); this.capTxt.setText(`sack ${G.cap().toLocaleString('en-US')}`);
    this.hpBar.width = 180 * Phaser.Math.Clamp(G.hp / 100, 0, 1); this.armTxt.setText(G.save.up.armor ? `ARMOR ${G.save.up.armor}` : '');
    const flash = G.evading && Math.floor(time / 250) % 2;
    this.stars.forEach((s, i) => s.setFillStyle(i < G.stars ? (flash ? 0x8a6d1a : 0xffd166) : 0x333a55));
    this.evadeBar.width = G.stars > 0 && G.evading ? 180 * Phaser.Math.Clamp(G.coolPct || 0, 0, 1) : 0;
    this.hiddenTxt.setVisible(!!G.hidden);
    // objective
    if (!this.liveRefreshAt || time >= this.liveRefreshAt) { this.liveRefreshAt = time + 500; this.refreshLive(); }
    const a = MissionSys.a; this.objBg.clear();
    if (a) {
      const st = this.touch ? touchify(MissionSys.text()) : MissionSys.text(); this.objTitle.setText(a.def.title.toUpperCase()); this.objTxt.setText(st);
      const h = 34 + this.objTxt.height + (a.timer !== null ? 30 : 0); this.objBg.fillStyle(0x0a0f22, 0.75); const ow = this.objW; this.objBg.fillRoundedRect(this.objCX - ow / 2, 12, ow, h, 10); this.objBg.lineStyle(2, 0xffd166, 0.8); this.objBg.strokeRoundedRect(this.objCX - ow / 2, 12, ow, h, 10);
      this.timerTxt.setY(40 + this.objTxt.height + 4).setText(a.timer !== null ? `${Math.ceil(a.timer)}s` : '').setColor(a.timer !== null && a.timer < 10 && Math.floor(time / 250) % 2 ? '#ffffff' : '#ff8a8a');
    } else {
      this.objTitle.setText(''); this.timerTxt.setText('');
      const nm = MissionSys.next(); this.objTxt.setText(G.area === 'city' ? (nm ? 'W = Wheel Heist. Run the route, escape, then a new wheel block unlocks your pay.' : 'All story missions done! Free roam & side jobs') : '');
      if (this.objTxt.text) { this.objBg.fillStyle(0x0a0f22, 0.55); this.objBg.fillRoundedRect(this.objCX - this.objW / 2, 12, this.objW, 34 + this.objTxt.height - 16, 10); this.objTxt.setY(24); }
    }
    if (a) this.objTxt.setY(40);
    if (UW < 1050) { this.objTitle.setY(206); this.objTxt.setY(226); this.timerTxt.setY(226 + this.objTxt.height + 4); this.objBg.clear(); }
    // prompt
    this.promptBg.clear(); const pr = this.dlg || this.menu ? null : G.prompt;
    if (pr) { this.promptTxt.setText(this.touch ? '[A] ' + touchify(pr).replace(/^Tap A \/ A /, 'Tap A ') : '[E] ' + pr); const w = this.promptTxt.width + 40, h = this.promptTxt.height + 20; this.promptBg.fillStyle(0x0a0f22, 0.8); const py = UH - 72 - h / 2; this.promptBg.fillRoundedRect(UW / 2 - w / 2, py, w, h, 20); this.promptBg.lineStyle(2, 0x7dff9a, 0.9); this.promptBg.strokeRoundedRect(UW / 2 - w / 2, py, w, h, 20); this.promptTxt.setVisible(true); }
    else this.promptTxt.setVisible(false);
    if (pr && pr.startsWith('HACKING')) this.promptTxt.setText(pr);
    // live anim
    const L = Live; this.liveDot.setAlpha(L.mode === 'live' ? (Math.floor(time / 500) % 2 ? 1 : 0.25) : 1);
    this.mwA += (L.isDay() ? Math.max(L.rpm, 5) : 0) * Math.PI * 2 / 60 * delta / 1000;
    const g = this.miniWheel; g.clear(); const cx = this.liveX + 40, cy = this.liveY + 60; g.lineStyle(3, 0x6ad7ff, 1); g.strokeCircle(cx, cy, 24);
    for (let i = 0; i < 8; i++) { const an = this.mwA + i * Math.PI / 4; g.lineStyle(2, 0x6ad7ff, 0.7); g.lineBetween(cx, cy, cx + Math.cos(an) * 22, cy + Math.sin(an) * 22); }
    this.miniHam.setTexture(L.isDay() ? (Math.floor(time / Math.max(70, 300 - L.rpm * 3)) % 2 ? 'ham_classic_run' : 'ham_classic_side') : 'ham_classic_crouch').setFlipX(L.isDay() && Math.floor(time / Math.max(70, 300 - L.rpm * 3)) % 2 === 0).setY(cy + 6);
    this.zoomFx.setVisible(L.zoomies).setScale(1 + Math.sin(time / 120) * 0.08);
    // banners
    if (!this.bannerBusy && this.bannerQ.length) this.showBanner(this.bannerQ.shift());
    this.drawMinimap(time);
    this.drawEdgeArrow();
    if (this.bigMap) this.drawBigMap(time);
  }
  drawMinimap(time) {
    const m = G.mm; const g = this.mmG; g.clear(); if (!m) return;
    const isCity = m.area === 'city'; const key = isCity ? 'city' : m.area;
    if (this.mmImg.texture.key !== key) { this.mmImg.setTexture(key).setDisplaySize(this.mmS, this.mmS); this.mmLabel.setText(isCity ? 'SQUEEK CITY' : (INTERIORS[Object.keys(INTERIORS).find(k => INTERIORS[k].tex === key)] || {}).name.toUpperCase()); }
    this.mmImg.setFlipX(!!m.flip);
    const sc = this.mmS / 1024; const X = v => this.mmX + Phaser.Math.Clamp(v, 0, 1024) * sc, Y = v => this.mmY + Phaser.Math.Clamp(v, 0, 1024) * sc;
    const pulse = Math.floor(time / 300) % 2;
    if (isCity) {
      if (!MissionSys.a && MissionSys.next()) { g.fillStyle(0xffd166, 1); g.fillCircle(X(CITY.hideout.x), Y(CITY.hideout.y), 6); g.lineStyle(2, 0x000, 1); g.strokeCircle(X(CITY.hideout.x), Y(CITY.hideout.y), 6); }
      g.fillStyle(0x7dff9a, 1); g.fillCircle(X(CITY.shop.x), Y(CITY.shop.y), 4);
      for (const p of m.golden) { g.fillStyle(0xffd84a, pulse ? 1 : 0.6); g.fillCircle(X(p[0]), Y(p[1]), 4); }
      if (m.target) { g.lineStyle(3, 0xffd166, 1); g.strokeCircle(X(m.target.x), Y(m.target.y), 7 + pulse * 2); }
    } else for (const p of m.items || []) { g.lineStyle(3, 0xffd166, 1); g.strokeCircle(X(p[0]), Y(p[1]), 6 + pulse * 2); }
    for (const p of m.guards || []) { g.fillStyle(0xff9a3a, 0.9); g.fillCircle(X(p[0]), Y(p[1]), 3); }
    for (const e of m.enemies) { g.fillStyle(0xff3b3b, 1); g.fillCircle(X(e[0]), Y(e[1]), e[2] ? 5 : 3.5); }
    const px = X(m.px), py = Y(m.py), an = m.ang || 0;
    g.fillStyle(0xffffff, 1); g.lineStyle(2, 0x000000, 1); g.beginPath(); g.moveTo(px + Math.cos(an) * 9, py + Math.sin(an) * 9); g.lineTo(px + Math.cos(an + 2.5) * 7, py + Math.sin(an + 2.5) * 7); g.lineTo(px + Math.cos(an - 2.5) * 7, py + Math.sin(an - 2.5) * 7); g.closePath(); g.fillPath(); g.strokePath();
  }
  drawEdgeArrow() {
    const m = G.mm; const ws = this.scene.get(this.worldKey()); const t = m && m.wx; if (!t || !ws || !ws.cameras || this.dlg) { this.edgeArrow.setVisible(false); return; }
    const cam = ws.cameras.main; const sx = (t.x - cam.scrollX) / U, sy = (t.y - cam.scrollY) / U;
    if (sx > 40 && sx < UW - 40 && sy > 40 && sy < UH - 40) { this.edgeArrow.setVisible(false); return; }
    const cx = UW / 2, cy = UH / 2 + 20; const a = Math.atan2(sy - cy, sx - cx); const r = Math.min((UW / 2 - 90) / Math.abs(Math.cos(a) || 1e-3), (UH / 2 - 120) / Math.abs(Math.sin(a) || 1e-3));
    this.edgeArrow.setVisible(true).setPosition(cx + Math.cos(a) * r, cy + Math.sin(a) * r).setRotation(a).setScale(1 + 0.15 * Math.sin(this.time.now / 150));
  }
  toggleBigMap() {
    if (this.bigMap) { this.bigMap.destroy(); this.bigMap = null; return; }
    if (!G.mm || G.mm.area !== 'city') return;
    const c = this.add.container(0, 0).setDepth(80); const bg = this.add.rectangle(0, 0, UW, UH, 0x000000, 0.75).setOrigin(0).setInteractive().on('pointerdown', () => this.toggleBigMap());
    const sz = Math.min(UH - 70, UW - 80, 640), k = sz / 1024, ox = UW / 2 - sz / 2, oy = UH - sz - 16; this.bmX = v => ox + v * k; this.bmY = v => oy + v * k;
    const img = this.add.image(UW / 2, oy + sz / 2, 'city').setDisplaySize(sz, sz); const g = this.add.graphics(); const t = this.add.text(UW / 2, Math.max(6, oy - 30), this.touch ? 'MAP  (tap to close)' : 'MAP  (M to close)', { fontFamily: P2, fontSize: '14px', color: '#fff' }).setOrigin(0.5, 0);
    const labels = CITY.doors.map(d => this.add.text(this.bmX(d.x), this.bmY(d.y) - 16, d.name, { fontFamily: VT, fontSize: '16px', color: '#fff', backgroundColor: '#000a', padding: { x: 3, y: 1 } }).setOrigin(0.5));
    labels.push(this.add.text(this.bmX(CITY.hideout.x), this.bmY(CITY.hideout.y) + 12, 'HIDEOUT', { fontFamily: P2, fontSize: '9px', color: '#ffd166', backgroundColor: '#000a', padding: { x: 3, y: 2 } }).setOrigin(0.5));
    c.add([bg, img, g, t, ...labels]); this.bigMap = c; this.bigMapG = g;
  }
  drawBigMap(time) {
    const g = this.bigMapG, m = G.mm; g.clear(); if (!m) return; const X = this.bmX, Y = this.bmY;
    for (const p of m.golden) { g.fillStyle(0xffd84a, 1); g.fillCircle(X(p[0]), Y(p[1]), 6); }
    for (const e of m.enemies) { g.fillStyle(0xff3b3b, 1); g.fillCircle(X(e[0]), Y(e[1]), 5); }
    if (m.target) { g.lineStyle(4, 0xffd166, 1); g.strokeCircle(X(m.target.x), Y(m.target.y), 12); }
    g.fillStyle(0xffffff, 1); g.fillCircle(X(m.px), Y(m.py), 7); g.lineStyle(2, 0, 1); g.strokeCircle(X(m.px), Y(m.py), 7);
  }
  // ---------- helper bubble ----------
  buildHelper() {
    const c = this.add.container(14, VIEW.portrait ? 350 : 190).setDepth(60).setAlpha(0); this.hb = c;
    this.hbBg = this.add.graphics(); this.hbPor = this.add.image(46, 46, 'portrait4').setDisplaySize(76, 76);
    this.hbName = this.add.text(92, 10, 'GRANDPA NIBBLES', { fontFamily: P2, fontSize: '10px', color: '#f0dfb8' });
    this.hbStep = this.add.text(470, 10, '', { fontFamily: P2, fontSize: '9px', color: '#9fb6d9' }).setOrigin(1, 0);
    this.hbTxt = this.add.text(92, 28, '', { fontFamily: VT, fontSize: '22px', color: '#ffffff', wordWrap: { width: 376 }, lineSpacing: 0 });
    this.hbSkip = this.add.text(470, 0, '', { fontFamily: P2, fontSize: '8px', color: '#ffb35c' }).setOrigin(1, 1).setInteractive({ useHandCursor: true }).on('pointerdown', () => Helper.skip());
    c.add([this.hbBg, this.hbPor, this.hbName, this.hbStep, this.hbTxt, this.hbSkip]);
  }
  helperBubble(h) {
    this.hbTxt.setText(this.touch ? touchify(h.text) : h.text); this.hbStep.setText(h.tutorial ? `TUTORIAL ${h.step}/${h.of}` : 'TIP');
    const H = Math.max(92, this.hbTxt.height + 40); this.hbBg.clear(); this.hbBg.fillStyle(0x1a1408, 0.9); this.hbBg.fillRoundedRect(0, 0, 484, H, 12); this.hbBg.lineStyle(3, 0xf0dfb8, 0.9); this.hbBg.strokeRoundedRect(0, 0, 484, H, 12);
    this.hbSkip.setText(h.tutorial ? (this.touch ? 'tap here to skip tutorial' : 'T = skip tutorial') : '').setPosition(470, H - 6);
    this.hbPor.setY(Math.min(46, H / 2));
    this.tweens.killTweensOf(this.hb); this.hb.setAlpha(0).setX(-40); this.tweens.add({ targets: this.hb, alpha: 1, x: 14, duration: 280, ease: 'Back.out' });
    Sound.sfx('blip'); if (this.hbTimer) this.hbTimer.remove();
    if (!h.tutorial) this.hbTimer = this.time.delayedCall(h.dur || 6000, () => this.tweens.add({ targets: this.hb, alpha: 0, duration: 400 }));
  }
  openBoard() {
    if (this.dlg || this.helpOpen || Board.isOpen()) return; if (this.menu) this.closeMenu(true);
    const wk = this.worldKey(); if (this.scene.isActive(wk)) this.scene.pause(wk); G.frozen = true; Controls.tx = Controls.ty = 0; Sound.sfx('select');
    Board.open(() => { G.frozen = false; Controls.action = false; const k = this.worldKey(); if (this.scene.isPaused(k) && !this.menu && !this.dlg) this.scene.resume(k); });
  }
  openHelp() {
    if (this.dlg || this.helpOpen) return; if (this.menu) this.closeMenu(true);
    const wk = this.worldKey(); if (this.scene.isActive(wk)) this.scene.pause(wk); G.frozen = true;
    this.helpOpen = showHelp(this, () => { this.helpOpen = null; G.frozen = false; Controls.action = false; const k = this.worldKey(); if (this.scene.isPaused(k) && !this.menu && !this.dlg) this.scene.resume(k); });
  }
  // ---------- notifications ----------
  onSeeds(g) { if (g > 0) this.tweens.add({ targets: this.seedTxt, scale: 1.25, yoyo: true, duration: 90 }); }
  onStars(n, up) { if (up) { const s = this.stars[n - 1]; if (s) this.tweens.add({ targets: s, scale: 1.8, yoyo: true, duration: 180, repeat: 1 }); } }
  flashObj() { this.tweens.add({ targets: this.objTxt, scale: 1.15, yoyo: true, duration: 120 }); }
  banner(b) { this.bannerQ.push(b); }
  showBanner(b) {
    this.bannerBusy = true; this.bannerT.setText(b.text).setColor(b.color || '#ffd166').setFontSize(b.small ? 16 : 22); this.bannerS.setText(b.sub || '').setFontSize(24); fitText(this.bannerT, UW - 80, 14); fitText(this.bannerS, UW - 80, 16);
    const w = Math.max(this.bannerT.width, this.bannerS.width) + 60; this.bannerBg.clear(); this.bannerBg.fillStyle(0x0a0f22, 0.85); this.bannerBg.fillRoundedRect(-w / 2, -36, w, b.sub ? 76 : 50, 12);
    this.bannerBg.lineStyle(3, Phaser.Display.Color.HexStringToColor(b.color || '#ffd166').color, 1); this.bannerBg.strokeRoundedRect(-w / 2, -36, w, b.sub ? 76 : 50, 12);
    this.bannerC.setY(this.touch ? UH - 165 : (MissionSys.a ? 160 : 130)).setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: this.bannerC, alpha: 1, scale: 1, duration: 260, ease: 'Back.out' });
    this.time.delayedCall(b.dur || 2600, () => this.tweens.add({ targets: this.bannerC, alpha: 0, duration: 300, onComplete: () => { this.bannerBusy = false; } }));
  }
  blockBanner(d) {
    this.banner({ text: `GOLDEN HEIST #${fmtBlock(d.to)}`, sub: `${d.simulated ? 'SIMULATED' : 'OBSERVED / PROJECTED'} block · steal the gold cache, lose heat, extract at W`, color: '#ffd84a', dur: 3600 });
    const fl = this.add.rectangle(0, 0, UW, UH, 0xffd84a, 0.25).setOrigin(0); this.tweens.add({ targets: fl, alpha: 0, duration: 700, onComplete: () => fl.destroy() });
  }
  bigText(b) {
    this.bigT.setText(b.text).setColor(b.color || '#ffd166'); this.bigS.setText(b.sub || ''); this.tweens.killTweensOf([this.bigT, this.bigS]);
    this.bigT.setAlpha(0).setScale(2); this.bigS.setAlpha(0);
    this.tweens.add({ targets: this.bigT, alpha: 1, scale: 1, duration: 350, ease: 'Back.out' }); this.tweens.add({ targets: this.bigS, alpha: 1, duration: 300, delay: 250 });
    this.tweens.add({ targets: [this.bigT, this.bigS], alpha: 0, duration: 400, delay: 2400 });
  }
  // ---------- dialog ----------
  dialog(lines, cb) {
    if (this.dlg) { this.dlgQueue = (this.dlgQueue || []).concat([[lines, cb]]); return; }
    const wk = this.worldKey(); if (this.scene.isActive(wk)) this.scene.pause(wk);
    G.frozen = true; Controls.tx = Controls.ty = 0;
    const c = this.add.container(0, 0).setDepth(70);
    const dim = this.add.rectangle(0, 0, UW, UH, 0x000000, 0.35).setOrigin(0);
    const dh = Math.min(VIEW.portrait ? 400 : 200, Math.round(UH * 0.4)), dy = UH - dh - 14, dx = this.touch ? 24 : 60, ps = VIEW.portrait ? 110 : dh - 50;
    const bg = panel(this, dx, dy, UW - dx * 2, dh, 0.92, 0xffd166);
    const por = this.add.image(dx + 20 + ps / 2, dy + dh / 2, 'portrait0').setDisplaySize(ps, ps); this.dlgPS = ps;
    const name = this.add.text(dx + ps + 50, dy + 18, '', { fontFamily: P2, fontSize: '16px', color: '#ffd166' });
    const txt = this.add.text(dx + ps + 50, dy + 48, '', { fontFamily: VT, fontSize: '32px', color: '#ffffff', wordWrap: { width: UW - dx * 2 - ps - 90 }, lineSpacing: 2 });
    const hint = this.add.text(UW - dx - 20, dy + dh - 16, this.touch ? 'tap >' : 'E / ENTER >', { fontFamily: P2, fontSize: '10px', color: '#9fb6d9' }).setOrigin(1, 1);
    this.tweens.add({ targets: hint, alpha: 0.3, yoyo: true, repeat: -1, duration: 400 });
    c.add([dim, bg, por, name, txt, hint]);
    this.dlg = { c, lines, i: -1, cb, por, name, txt, maxTextH: dh - 84, typing: null, full: '' };
    this.advanceDialog();
  }
  advanceDialog(skipAll) {
    const d = this.dlg; if (!d) return; Sound.resume();
    if (d.typing && !skipAll) { d.typing.remove(); d.typing = null; d.txt.setText(d.full); return; }
    d.i++; if (skipAll) d.i = d.lines.length;
    if (d.i >= d.lines.length) {
      if (d.typing) d.typing.remove(); d.c.destroy(); this.dlg = null; G.frozen = !!(this.menu || this.helpOpen); Controls.action = false;
      const wk = this.worldKey(); if (this.scene.isPaused(wk) && !this.menu) this.scene.resume(wk);
      if (d.cb) d.cb();
      if (this.dlgQueue && this.dlgQueue.length) { const [l, cb] = this.dlgQueue.shift(); this.dialog(l, cb); }
      return;
    }
    let [who, text] = d.lines[d.i]; const P = PORTRAITS[who]; d.por.setTexture(P.key);
    if (who === 'squeak') d.por.setTexture(`ham_${G.save.skin}_front`).setDisplaySize(this.dlgPS * 0.79, this.dlgPS); else d.por.setDisplaySize(this.dlgPS, this.dlgPS);
    d.name.setText(P.name).setColor(P.color); if (this.touch) text = touchify(text); d.full = text; fitParagraph(d.txt, text, d.maxTextH).setText(''); let n = 0;
    Sound.sfx('blip');
    d.typing = this.time.addEvent({ delay: 18, repeat: text.length - 1, callback: () => { n++; d.txt.setText(text.slice(0, n)); if (n % 4 === 0) Sound.sfx('scan'); if (n >= text.length) d.typing = null; } });
  }
  // ---------- menus ----------
  openMenu(title, items, opts = {}) {
    this.closeMenu(true);
    const wk = this.worldKey(); if (this.scene.isActive(wk)) this.scene.pause(wk); G.frozen = true;
    const c = this.add.container(0, 0).setDepth(90); const top = opts.subtitle ? 92 : 80; const foot = opts.footer ? 40 : 0; const n = items.length;
    let rh = opts.rowH || 52, cols = 1; const avail = UH - 16 - top - 20 - foot;
    if (n * rh > avail) { const r2 = Math.floor(avail / n); if (r2 >= 40) rh = r2; else { cols = 2; rh = Math.min(rh, Math.floor(avail / Math.ceil(n / 2))); } }
    const nr = Math.ceil(n / cols); const w = Math.min(UW - 24, cols === 2 ? Math.max((opts.w || 640) * 1.5, 1000) : (opts.w || 640)); const h = top + 20 + nr * rh + foot;
    const y0 = Math.max(8, (UH - h) / 2); const x0 = (UW - w) / 2; const colW = (w - 40) / cols;
    c.add(this.add.rectangle(0, 0, UW, UH, 0x000000, 0.55).setOrigin(0).setInteractive());
    c.add(panel(this, x0, y0, w, h, 0.95, opts.color || 0x6ad7ff));
    c.add(fitText(this.add.text(UW / 2, y0 + 24, title, { fontFamily: P2, fontSize: '20px', color: '#ffd166' }).setOrigin(0.5, 0), w - 120));
    if (opts.subtitle) c.add(this.add.text(UW / 2, y0 + 54, opts.subtitle, { fontFamily: VT, fontSize: '22px', color: '#9fb6d9' }).setOrigin(0.5, 0));
    if (this.touch) c.add(this.add.text(x0 + w - 18, y0 + 14, 'X', { fontFamily: P2, fontSize: '18px', color: '#ff7b7b', padding: { x: 8, y: 6 } }).setOrigin(1, 0).setInteractive().on('pointerdown', () => { if (opts.title === 'MISSIONS') return this.togglePause(); this.closeMenu(); }));
    const rows = items.map((it, i) => {
      const col = Math.floor(i / nr), ri = i % nr; const y = y0 + top + ri * rh; const xl = x0 + 20 + col * colW; const small = rh < 48;
      const bg = this.add.rectangle(xl + colW / 2, y + rh / 2 - 3, colW - 12, rh - 6, 0xffffff, 0.06).setInteractive({ useHandCursor: true });
      const r = this.add.text(xl + colW - 22, y + (small ? 8 : 10), it.right || '', { fontFamily: P2, fontSize: '12px', color: it.rightColor || '#ffe066' }).setOrigin(1, 0);
      const maxW = colW - 50 - r.width - 16;
      const t = fitText(this.add.text(xl + 26, y + (small ? 3 : 4), it.label, { fontFamily: P2, fontSize: small ? '11px' : '13px', color: it.disabled ? '#5c6680' : '#ffffff' }), maxW, 9);
      const s = fitText(this.add.text(xl + 26, y + (small ? 17 : 22), it.sub || '', { fontFamily: VT, fontSize: small ? '17px' : '19px', color: '#9fb6d9' }), colW - 50, 15);
      bg.on('pointerover', () => { this.menu.sel = i; this.menuDraw(); }); bg.on('pointerdown', () => { this.menu.sel = i; this.menuSelect(); });
      c.add([bg, t, s, r]); return { bg, t, it };
    });
    if (opts.footer) c.add(fitText(this.add.text(UW / 2, y0 + h - 30, opts.footer, { fontFamily: VT, fontSize: '20px', color: '#7f8bb0' }).setOrigin(0.5), w - 60, 15));
    this.menu = { c, rows, sel: 0, items, onClose: opts.onClose, reopen: opts.reopen }; this.menuDraw(); Sound.sfx('blip');
  }
  menuDraw() { const m = this.menu; if (!m) return; m.rows.forEach((r, i) => { r.bg.setFillStyle(i === m.sel ? 0x6ad7ff : 0xffffff, i === m.sel ? 0.25 : 0.06); r.t.setColor(r.it.disabled ? '#5c6680' : i === m.sel ? '#ffd166' : '#ffffff'); }); }
  menuMove(d) { const m = this.menu; m.sel = (m.sel + d + m.items.length) % m.items.length; this.menuDraw(); Sound.sfx('blip'); }
  menuSelect() { const m = this.menu; if (!m) return; const it = m.items[m.sel]; if (!it || it.disabled && !it.fn) return; Sound.sfx('select'); it.fn && it.fn(); }
  closeMenu(silent) {
    if (!this.menu) return; const m = this.menu; m.c.destroy(); this.menu = null; G.frozen = false; Controls.action = false;
    if (!silent) { const wk = this.worldKey(); if (this.scene.isPaused(wk) && !this.dlg) this.scene.resume(wk); m.onClose && m.onClose(); }
  }
  togglePause() {
    if (this.dlg) return; if (this.menu) return this.closeMenu();
    const items = [
      { label: 'RESUME', sub: 'Back to the streets', fn: () => this.closeMenu() },
      { label: 'MISSIONS', sub: `${G.save.missions}/${MISSIONS.length} story missions done`, fn: () => this.missionList() },
      { label: G.playMode === 'practice' ? 'LEADERBOARD (READ ONLY)' : 'LEADERBOARD', sub: Cloud.name() ? `Top 20 thieves · you are ${Cloud.name()}` : 'Top 20 thieves · set a name to join', fn: () => this.openBoard() },
      { label: "GRANDPA'S GUIDE (HELP)", sub: 'Controls, wanted level, vehicles, Squeekchain live', fn: () => { this.closeMenu(true); this.openHelp(); } },
      { label: `HINTS: ${G.save.hintsOff ? 'OFF' : 'ON'}`, sub: 'Grandpa Nibbles pops up with tips', fn: () => { G.save.hintsOff = !G.save.hintsOff; G.persist(); this.closeMenu(true); this.togglePause(); } },
      { label: 'REPLAY TUTORIAL', sub: Helper.active() ? 'Tutorial in progress (T to skip)' : 'Learn the basics again with Grandpa Nibbles', fn: () => { G.save.tut = 0; G.save.hints = {}; G.save.hintsOff = false; G.persist(); this.closeMenu(); if (G.area === 'city') Helper.begin(); } },
      { label: `SOUND: ${Sound.on ? 'ON' : 'OFF'}`, sub: 'Music + sound effects', fn: () => { Sound.setOn(!Sound.on); G.save.sound = Sound.on; G.persist(); this.togglePause(); this.togglePause(); } },
      { label: 'SHARE ON X', sub: 'Opens a post draft (nothing is posted automatically)', fn: () => shareX() },
      { label: 'QUIT TO TITLE', sub: 'Progress is saved automatically', fn: () => { G.persist(); this.closeMenu(true); this.scene.stop('Interior'); this.scene.stop('City'); Sound.setEngine(0); Sound.setSiren(0); this.scene.start('Title'); } },
    ];
    this.openMenu(G.playMode === 'practice' ? 'PRACTICE · LOCAL ONLY' : 'LIVE · PAUSED', items, { footer: `Seeds stolen all-time: ${G.save.total.toLocaleString('en-US')} · Golden seeds: ${G.save.golden} · Squashed: ${G.save.stats.busted}` });
  }
  missionList() {
    const items = MISSIONS.map((m, i) => ({ label: `${i + 1}. ${m.title}`, sub: i < G.save.missions ? 'Completed' : i === G.save.missions ? 'NEXT — go to the hideout (!)' : 'Locked', right: i < G.save.missions ? 'DONE' : `+${m.reward}`, rightColor: i < G.save.missions ? '#7dff9a' : '#ffe066', disabled: i > G.save.missions, fn: () => this.togglePause() }));
    this.closeMenu(true); this.openMenu('MISSIONS', items, { title: 'MISSIONS', w: 760, rowH: 40, footer: 'Side jobs: blue star markers (Seed Courier, Vacuum Bash)' });
  }
  howTo() {
    this.closeMenu(true);
    this.openMenu('HOW TO PLAY', [
      { label: 'MOVE / DRIVE', sub: 'WASD or Arrows · joystick on mobile', fn: () => this.togglePause() },
      { label: 'E / ENTER / A', sub: 'Interact: enter buildings, ride vehicles, steal, start jobs', fn: () => this.togglePause() },
      { label: 'SHIFT / SPACE / B', sub: 'Dash (buy it at the $ shop) · handbrake drift in cars', fn: () => this.togglePause() },
      { label: 'WANTED STARS', sub: 'Break line of sight & hide in hedges/bushes to cool down', fn: () => this.togglePause() },
      { label: 'SQUEEKTOSHI RUNNING', sub: 'Wheel Heist opens. Finish route, escape, wait for a new block.', fn: () => this.togglePause() },
      { label: 'SQUEEKTOSHI SLEEPING', sub: 'Night city, guards see less, loot x0.5', fn: () => this.togglePause() },
      { label: 'NEW OBSERVED BLOCK', sub: 'One golden cache, 90s. Lose heat, bank at W. 70 RPM = x2 + faster chase.', fn: () => this.togglePause() },
      { label: 'M = MAP · P/ESC = PAUSE', sub: 'Progress saves automatically in this browser', fn: () => this.togglePause() },
    ], { w: 820 });
  }
  openShop() {
    const items = SHOP.map(s => { const lv = G.save.up[s.id]; const max = lv >= s.costs.length; const cost = s.costs[lv]; return { label: `${s.name}  Lv ${lv}/${s.costs.length}`, sub: s.id === 'sack' ? `Sack holds ${SACK_CAPS[Math.min(lv + 1, SACK_CAPS.length - 1)].toLocaleString('en-US')} seeds` : s.desc, right: max ? 'MAX' : `${cost}`, rightColor: max ? '#7dff9a' : G.save.seeds >= cost ? '#ffe066' : '#ff7b7b', disabled: max, fn: () => { if (max) return; if (G.spend(cost)) { G.save.up[s.id]++; G.persist(); Sound.sfx('buy'); this.openShop(); } else { Sound.sfx('hurt'); } } }; });
    for (const sk of SKINS) { const own = G.save.skins.includes(sk.id); const eq = G.save.skin === sk.id; items.push({ label: `Skin: ${sk.name}`, sub: own ? (eq ? 'Equipped' : 'Owned — select to wear') : sk.id === 'golden' ? 'Unlock: finish the Genesis Heist or buy' : 'Fresh new fur', right: eq ? 'ON' : own ? 'WEAR' : `${sk.cost}`, rightColor: own ? '#7dff9a' : G.save.seeds >= sk.cost ? '#ffe066' : '#ff7b7b', fn: () => { if (own) { G.save.skin = sk.id; G.persist(); Sound.sfx('select'); this.openShop(); } else if (G.spend(sk.cost)) { G.save.skins.push(sk.id); G.save.skin = sk.id; G.persist(); Sound.sfx('buy'); this.openShop(); } else Sound.sfx('hurt'); } }); }
    items.push({ label: 'CLOSE', sub: '', fn: () => this.closeMenu() });
    const sel = this.menu ? this.menu.sel : 0;
    this.openMenu('SEED SHOP', items, { w: 760, rowH: 50, subtitle: `You have ${G.save.seeds.toLocaleString('en-US')} seeds`, color: 0x7dff9a });
    this.menu.sel = Math.min(sel, items.length - 1); this.menuDraw();
  }
  credits() {
    this.openMenu('SQUEEK CITY IS YOURS', [
      { label: 'GENESIS HEIST COMPLETE', sub: `Seeds stolen: ${G.save.total.toLocaleString('en-US')} · Golden seeds: ${G.save.golden}`, fn: () => this.closeMenu() },
      { label: 'POWERED BY SQUEEKTOSHI', sub: 'A real hamster on a real wheel mining Squeekchain blocks', fn: () => this.closeMenu() },
      { label: 'SHARE ON X', sub: 'Brag about it (opens a draft)', fn: () => shareX() },
      { label: 'KEEP PLAYING', sub: 'Free roam, side jobs & golden seeds', fn: () => this.closeMenu() },
    ], { color: 0xffd166 });
  }
}
