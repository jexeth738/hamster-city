// ===== Helper system: Grandpa Nibbles, tutorial, contextual hints, help screen =====
PORTRAITS.nibbles = { key: 'portrait4', name: 'GRANDPA NIBBLES', color: '#f0dfb8' };
const HELP_PAGES = [
  { title: 'CONTROLS', lines: [
    'MOVE ............ WASD / Arrow keys  (mobile: left joystick)',
    'INTERACT ........ E or Enter  (mobile: A)',
    '                  enter buildings, ride vehicles, steal, talk, start jobs',
    'DASH ............ Shift / Space  (mobile: B)  - buy it in the $ shop',
    'DRIFT ........... hold Shift / Space while driving',
    'BIG MAP ......... M        HELP ........ H',
    'PAUSE ........... P / Esc  (mobile: II button)',
    'SKIP TUTORIAL ... T',
  ] },
  { title: 'MISSIONS & SEEDS', lines: [
    'Seeds are money. Pick them up on the street and steal them indoors.',
    'Yellow ! at the park gazebo = the gang hideout. Press E there to',
    'start the next STORY MISSION (13 in total, ending with the',
    'Genesis Heist at the Squeekchain Lab).',
    'Blue star markers = SIDE JOBS (Seed Courier, Vacuum Bash).',
    'Green $ = SEED SHOP: speed, bigger sack, dash, armor and skins.',
    'Follow the yellow arrow and the ring on the minimap.',
    'Your progress saves automatically in this browser.',
  ] },
  { title: 'WANTED LEVEL', lines: [
    'Crimes give you STARS (1-5). More stars = more trouble:',
    '  1 star: alley cats      2 stars: + robot vacuums',
    '  3 stars: + angry house owners with brooms',
    '  4 stars: + the PEST CONTROL van     5 stars: + Cat Patrol car',
    'To lose stars: break line of sight. When the stars blink, you are',
    'cooling down. Hide in HEDGES / BUSHES (you crouch and turn',
    'see-through) to cool down much faster.',
    'At 0 HP you get SQUASHED: you lose 20% of your seeds.',
  ] },
  { title: 'VEHICLES', lines: [
    'Walk up to a vehicle and press E to ride, E again to hop off.',
    'RC RACER ...... fastest, drifts like crazy',
    'TOY CARS ...... steal them right off the road (someone may see!)',
    'SKATEBOARD .... light and nimble',
    'HAMSTER BALL .. rolls in any direction, cats cannot hurt you inside',
    'Ram robot vacuums and cats at speed to knock them out.',
    'Cars break if you crash too hard. Mobile: point the joystick',
    'where you want to go and the car steers there.',
  ] },
  { title: 'SQUEEKCHAIN LIVE', lines: [
    'Squeektoshi is a REAL hamster running on a REAL wheel. His',
    'running mines blocks on Squeekchain, and this city follows him',
    'LIVE (top-right panel, updated every 5 seconds):',
    '  RUNNING  = DAY city: faster vehicles, more patrols, loot bonus',
    '  SLEEPING = NIGHT city: darker, guards see less, loot x0.5',
    '  RPM      = higher RPM, bigger loot multiplier and car speed',
    '  NEW BLOCK = GOLDEN SEEDS drop around the city (+25 each)',
    '  ZOOMIES  = very high RPM: DOUBLE loot!',
  ] },
];
function showHelp(scene, onClose, startPage = 0) {
  const c = scene.add.container(0, 0).setDepth(95); let page = startPage;
  c.add(scene.add.rectangle(0, 0, GW, GH, 0x000000, 0.7).setOrigin(0).setInteractive());
  c.add(panel(scene, 110, 60, GW - 220, GH - 120, 0.96, 0xffd166));
  c.add(scene.add.image(200, 150, 'portrait4').setDisplaySize(130, 130));
  c.add(scene.add.text(280, 92, 'GRANDPA NIBBLES\' GUIDE', { fontFamily: '"Press Start 2P"', fontSize: '13px', color: '#f0dfb8' }));
  const title = scene.add.text(280, 120, '', { fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#ffd166' });
  const body = scene.add.text(160, 236, '', { fontFamily: 'VT323', fontSize: '27px', color: '#e6efff', lineSpacing: 3 });
  const tabs = HELP_PAGES.map((p, i) => { const t = scene.add.text(280 + i * 150, 168, `${i + 1}`, { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#fff', backgroundColor: '#1d2747', padding: { x: 10, y: 6 } }).setInteractive({ useHandCursor: true }).on('pointerdown', () => { page = i; draw(); }); return t; });
  const nav = scene.add.text(GW / 2, GH - 92, '< A / LEFT     page     RIGHT / D >        Esc / tap X to close', { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#9fb6d9' }).setOrigin(0.5);
  const prev = scene.add.text(140, GH - 104, '<', { fontFamily: '"Press Start 2P"', fontSize: '26px', color: '#ffd166' }).setInteractive({ useHandCursor: true }).on('pointerdown', () => { page = (page + HELP_PAGES.length - 1) % HELP_PAGES.length; draw(); });
  const next = scene.add.text(GW - 165, GH - 104, '>', { fontFamily: '"Press Start 2P"', fontSize: '26px', color: '#ffd166' }).setInteractive({ useHandCursor: true }).on('pointerdown', () => { page = (page + 1) % HELP_PAGES.length; draw(); });
  const close = scene.add.text(GW - 150, 80, 'X', { fontFamily: '"Press Start 2P"', fontSize: '22px', color: '#ff7b7b' }).setInteractive({ useHandCursor: true }).on('pointerdown', () => done());
  c.add([title, body, ...tabs, nav, prev, next, close]);
  function draw() { title.setText(HELP_PAGES[page].title); body.setText(HELP_PAGES[page].lines.join('\n')); tabs.forEach((t, i) => t.setText(`${i + 1} ${HELP_PAGES[i].title.split(' ')[0]}`).setPosition(280 + tabs.slice(0, i).reduce((s, o) => s + o.width + 8, 0), 168).setBackgroundColor(i === page ? '#6a4f12' : '#1d2747')); Sound.sfx('blip'); }
  const key = e => { const k = e.key.toLowerCase(); if (k === 'arrowleft' || k === 'a') { page = (page + HELP_PAGES.length - 1) % HELP_PAGES.length; draw(); } else if (k === 'arrowright' || k === 'd' || k === 'enter' || k === 'e' || k === ' ') { if (page === HELP_PAGES.length - 1 && (k === 'enter' || k === 'e')) return done(); page = (page + 1) % HELP_PAGES.length; draw(); } else if (k === 'escape' || k === 'h' || k === 'p') done(); };
  scene.input.keyboard.on('keydown', key);
  let closed = false;
  function done() { if (closed) return; closed = true; scene.input.keyboard.off('keydown', key); c.destroy(); onClose && onClose(); }
  draw(); c.close = done; return c;
}
const Helper = {
  steps: [
    { say: "Hey kid! I'm Grandpa Nibbles, retired gang legend. I'll show you the ropes. Move with WASD / Arrow keys (or the joystick on mobile).", touchSay: "Hey kid! I'm Grandpa Nibbles, retired gang legend. I'll show you the ropes. Drag the joystick on the left side of the screen to move.", done: c => c.moved > 260 },
    { say: 'Nice paws! Those little striped things on the ground are SEEDS, our money. Grab 3 of them.', done: c => c.seedsGot >= 3 },
    { say: 'See that skateboard I left you? Walk up to it and press E to ride it.', touchSay: 'See that skateboard I left you? Walk up to it and tap A to ride it.', done: c => c.inVeh, spawnSkate: true },
    { say: 'Wheee! Steer around a bit, then press E again to hop off. (In cars, hold SHIFT/SPACE to drift.)', touchSay: 'Wheee! Steer with the joystick, then tap A again to hop off. (In cars, hold B to drift.)', done: c => c.t > 3 && !c.inVeh },
    { say: 'Look top-right: the LIVE panel. Squeektoshi is a REAL hamster on a REAL wheel. When he runs, our city is in DAY mode. When he sleeps, it is NIGHT.', done: c => c.t > 9 },
    { say: 'Every real block he mines drops GOLDEN SEEDS around town (gold dots on the minimap). Press M for the big map and H for my full guide any time.', done: c => c.t > 9 },
    { say: 'Last thing: walk to the yellow ! at the park gazebo (follow the arrow) and press E. Don Cheeks has your first job. Good luck, kid!', done: c => !!MissionSys.a || G.save.missions > 0, target: 'hideout' },
  ],
  active() { return G.save.tut !== undefined && G.save.tut >= 0 && G.save.tut < this.steps.length; },
  begin() { if (G.save.tut === undefined) G.save.tut = 0; if (this.active()) this.show(); },
  show() { const s = this.steps[G.save.tut]; this.ctx = { moved: 0, seedsGot: 0, inVeh: false, t: 0 }; BUS.emit('helper', { text: (Controls.isTouch && s.touchSay) || s.say, step: G.save.tut + 1, of: this.steps.length, tutorial: true }); if (s.spawnSkate) BUS.emit('tutSkate'); },
  skip() { if (!this.active()) return; G.save.tut = this.steps.length; G.persist(); BUS.emit('helper', { text: 'Alright, you know your way around. Press H if you ever need my guide!', dur: 4500 }); },
  tick(dt, info) {
    if (!this.active() || G.frozen) return; const c = this.ctx; if (!c) return;
    c.t += dt; c.moved += info.moved || 0; c.inVeh = info.inVeh;
    const s = this.steps[G.save.tut];
    if (s.done(c)) { G.save.tut++; G.persist(); Sound.sfx('select'); if (this.active()) this.time = setTimeout(() => this.show(), 400); else BUS.emit('helper', { text: "That's the basics! Tap H any time for my full guide. Now go make Squeek City yours.", dur: 5000 }); this.ctx = null; this.ctx = { moved: 0, seedsGot: 0, inVeh: false, t: -999 }; }
  },
  onSeed(n) { if (this.ctx) this.ctx.seedsGot += n; },
  target() { if (!this.active()) return null; const s = this.steps[G.save.tut]; return s.target || null; },
  // one-time contextual hint
  hint(id, text, dur) { if (G.save.hintsOff) return; G.save.hints = G.save.hints || {}; if (G.save.hints[id]) return; if (this.active() && id !== 'wanted') return; G.save.hints[id] = 1; G.persist(); BUS.emit('helper', { text, dur: dur || 7000 }); },
  tip(text, dur) { if (G.save.hintsOff) return; BUS.emit('helper', { text, dur: dur || 6000 }); },
};
const STEP_TIPS = {
  enter: 'Follow the yellow arrow to the door, then press E to go inside.',
  loot: 'Mission loot glows gold. Walk up to it and press E. Guards that see you will raise the alarm!',
  exit: 'Head for the green arrow at the bottom of the room to get back outside.',
  lose: 'Lose the heat! Break line of sight and hide in hedges or bushes. Blinking stars = cooling down.',
  vehicle: 'The yellow arrow points at the nearest ride. Press E next to it.',
  checkpoints: 'Hit each glowing ring in order. The arrow always points to the next one.',
  survive: 'Just stay alive! Keep moving, use your dash, and grab a vehicle if you can.',
  scan: 'Stand still inside the blue circle until the bar fills. Stay out of the robo-vacuums\' sight.',
  golden: 'Golden seeds are the gold dots on your minimap. Real Squeekchain blocks drop more!',
  smash: 'Drive fast into the red robo-vacuums to smash them.',
};
BUS.on('objective', () => { const s = MissionSys.step(); if (!s || !MissionSys.a) return; const key = MissionSys.a.def.id + ':' + MissionSys.a.i; if (Helper._last === key) return; Helper._last = key; const t = STEP_TIPS[s.t]; if (t && G.save.missions < 6) Helper.tip(t); });
BUS.on('stars', (n, up) => { if (up && n >= 1) Helper.hint('wanted', 'Uh oh, you are WANTED! Run, break line of sight and hide in hedges to make the stars go away.'); if (up && n >= 4) Helper.hint('pest', 'Four stars means the PEST CONTROL van! It sticks to roads, so cut through parks and yards.'); });
BUS.on('block', () => Helper.hint('golden', 'A real Squeekchain block was just mined! Golden seeds dropped around the city. Check the gold dots on your minimap.'));
BUS.on('phase', s => { if (s === 'IDLE') Helper.hint('night', 'Squeektoshi went to sleep, so it is NIGHT. Guards see less, but loot only pays half. Great time for sneaky jobs.'); else Helper.hint('day', 'Squeektoshi is running! DAY mode: faster rides, more patrols, and an RPM loot bonus.'); });
BUS.on('seeds', (got, lost) => { if (got > 0) Helper.onSeed(1); if (lost > 0 && got === 0) Helper.hint('sack', 'Your sack is full! Buy BIGGER CHEEKS at the green $ shop next to the hideout.'); if (G.save.seeds >= 80 && !G.save.up.speed && !G.save.up.dash) Helper.hint('shop', 'You have enough seeds to shop! The green $ next to the hideout sells speed, dash, armor and skins.'); });
