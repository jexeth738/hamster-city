// ===== Online overlays (DOM, so text input and scrolling work on phones): name prompt + leaderboard =====
const Board = {
  el: null, onClose: null, tab: 0,
  isOpen() { return !!this.el; },
  mount(html, cls) {
    this.close(true);
    const el = document.createElement('div'); el.className = 'ol ' + (cls || ''); el.innerHTML = `<div class="ol-panel">${html}</div>`;
    // keep keys away from Phaser while an overlay is up
    for (const t of ['keydown', 'keyup']) el.addEventListener(t, e => { e.stopPropagation(); if (t === 'keydown') this.key(e); });
    el.addEventListener('pointerdown', e => { if (e.target === el) this.close(); });
    document.body.appendChild(el); this.el = el; this.keyFn = e => { if (this.el && !this.el.contains(e.target)) { e.stopPropagation(); this.key(e); } };
    window.addEventListener('keydown', this.keyFn, true);
    return el;
  },
  key(e) {
    const k = e.key.toLowerCase(); const typing = e.target && e.target.tagName === 'INPUT';
    if (k === 'escape' || (k === 'l' && !typing && this.el.classList.contains('lb'))) { e.preventDefault(); this.close(); }
    else if (!typing && this.el.classList.contains('lb') && (k === 'arrowright' || k === 'arrowleft' || k === 'd' || k === 'a')) this.show((this.tab + (k === 'arrowright' || k === 'd' ? 1 : BOARDS.length - 1)) % BOARDS.length);
  },
  close(silent) {
    if (!this.el) return; this.el.remove(); this.el = null; window.removeEventListener('keydown', this.keyFn, true);
    const cb = this.onClose; this.onClose = null; if (!silent && cb) cb();
  },
  // ---------- name prompt ----------
  promptName(onClose, rename) {
    const el = this.mount(`
      <h2>${rename ? 'CHANGE NAME' : 'NAME YOUR HAMSTER'}</h2>
      <p class="sub">Your thief name on the online leaderboard. Progress also syncs to the cloud from this browser.</p>
      <label>NAME <input id="olName" maxlength="16" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="3-16 letters, numbers, _"></label>
      <label>WALLET <span>(optional, kept private)</span> <input id="olWallet" maxlength="64" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="0x... or any address"></label>
      <p class="err" id="olErr"></p>
      <div class="row"><button class="main" id="olOk">${rename ? 'SAVE' : 'JOIN LEADERBOARD'}</button><button id="olSkip">${rename ? 'CANCEL' : 'PLAY OFFLINE'}</button></div>`, 'np');
    this.onClose = onClose;
    const name = el.querySelector('#olName'), wal = el.querySelector('#olWallet'), err = el.querySelector('#olErr'), ok = el.querySelector('#olOk');
    name.value = Cloud.name() || ''; wal.value = Cloud.local.wallet || '';
    name.addEventListener('input', () => { name.value = name.value.replace(/[^A-Za-z0-9_]/g, ''); });
    const submit = async () => {
      if (ok.disabled) return; ok.disabled = true; err.textContent = 'Connecting...'; err.className = 'err wait';
      const msg = await Cloud.register(name.value.trim(), wal.value.trim());
      ok.disabled = false; if (!msg) { Sound.sfx('select'); this.close(); return; }
      err.className = 'err'; err.textContent = msg; Sound.sfx('hurt');
    };
    ok.onclick = submit; el.querySelector('#olSkip').onclick = () => { if (!rename) Cloud.remember({ skipped: true }); this.close(); };
    el.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    if (!VIEW.touch) setTimeout(() => name.focus(), 50);
  },
  // ---------- leaderboard ----------
  open(onClose) {
    const el = this.mount(`
      <button class="x" id="olX" aria-label="Close">X</button>
      <h2>TOP THIEVES</h2>
      <div class="tabs">${BOARDS.map((b, i) => `<button data-i="${i}">${b.tab}</button>`).join('')}</div>
      <ol class="list" id="olList"></ol>
      <div class="foot"><span id="olMe"></span><button id="olName2"></button></div>`, 'lb');
    this.onClose = onClose;
    el.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { Sound.sfx('blip'); this.show(+b.dataset.i); });
    el.querySelector('#olX').onclick = () => this.close();
    const nb = el.querySelector('#olName2'); nb.textContent = Cloud.name() ? 'CHANGE NAME' : 'SET NAME'; nb.hidden = !Cloud.canJoin();
    nb.onclick = () => { const cb = this.onClose; this.onClose = null; this.promptName(() => this.open(cb), !!Cloud.name()); };
    this.show(this.tab);
    if (Cloud.name()) Promise.resolve(Cloud.retry()).then(() => this.el && this.el.classList.contains('lb') && this.show(this.tab, true));
  },
  async show(i, quiet) {
    this.tab = i; const el = this.el; if (!el) return; const b = BOARDS[i];
    el.querySelectorAll('.tabs button').forEach((t, j) => t.classList.toggle('on', j === i));
    const list = el.querySelector('#olList'), me = el.querySelector('#olMe');
    if (!quiet) { list.innerHTML = '<li class="msg">Loading...</li>'; me.textContent = ''; }
    const token = this.req = {};
    try {
      const r = await Cloud.board(b.id); if (this.req !== token || !this.el) return;
      list.innerHTML = '';
      if (!r.rows.length) list.innerHTML = '<li class="msg">No scores yet. Be the first!</li>';
      r.rows.forEach((p, n) => {
        const li = document.createElement('li'); if (p.id === Cloud.uid) li.className = 'me';
        const rk = document.createElement('b'); rk.textContent = n + 1; const nm = document.createElement('span'); nm.textContent = p.name; const v = document.createElement('i'); v.textContent = b.fmt(p[b.id]);
        li.append(rk, nm, v); list.appendChild(li);
      });
      me.textContent = !Cloud.name() ? (Cloud.canJoin() ? 'Set a name to join the leaderboard' : 'Joining the leaderboard opens soon') : r.rank ? `YOU: #${r.rank} · ${Cloud.name()} · ${b.fmt(r.mine)}` : `YOU: ${Cloud.name()} · not ranked yet`;
    } catch (e) {
      if (this.req !== token || !this.el) return;
      list.innerHTML = '<li class="msg">Leaderboard is offline.<br>Your progress is still saved on this device.</li>';
      me.textContent = Cloud.name() ? `YOU: ${Cloud.name()} · will sync when back online` : '';
    }
  },
};
