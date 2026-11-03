// ===== Boot the game once fonts are ready =====
(async function () {
  try { await Promise.race([Promise.all([document.fonts.load('20px "Press Start 2P"'), document.fonts.load('20px VT323')]), new Promise(r => setTimeout(r, 4000))]); } catch (e) { }
  const game = new Phaser.Game({
    type: URLP.has('canvas') ? Phaser.CANVAS : Phaser.AUTO, parent: 'game', width: GW, height: GH, backgroundColor: '#050816',
    physics: { default: 'arcade', arcade: { debug: URLP.has('debug') } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    input: { activePointers: 4 },
    scene: [BootScene, TitleScene, CityScene, InteriorScene, UIScene],
  });
  window.__game = game;
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.persist(); });
  setInterval(() => G.persist(), 10000);
})();
