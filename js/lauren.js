// Logo colour picker — a temporary tool for choosing the header logo's two
// accent colours (CONFIG.paletteColor2 / 3 in js/grid-type.js), the colours
// that appear near the cursor and in some of the logo's scenes. Type
// "lauren" on any page, or open one with ?lauren, to show it. Picks are kept
// in this browser only, so they stay while browsing; "copy" puts them on the
// clipboard to send over. To remove it, delete this file and the line in
// main.js that loads it.
(() => {
  const KEY = 'laurenColours';
  const DEFAULTS = { a1: '#2eb7a2', a2: '#5078fd' };
  const PRESETS = [
    { name: 'current', a1: '#2eb7a2', a2: '#5078fd' },
    { name: 'alternate', a1: '#ff5a5f', a2: '#1c4b56' },
    { name: 'site orange', a1: '#ffa800', a2: '#5078fd' },
  ];

  const load = () => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { ...DEFAULTS }; }
  };
  let picks = load();
  const hex = (v) => /^#?[0-9a-f]{6}$/i.test(v.trim()) ? '#' + v.trim().replace('#', '').toLowerCase() : null;

  // the logo reads these every frame, so setting them recolours it live
  const apply = () => {
    const config = window.GridType?.CONFIG;
    if (!config) return false;
    config.paletteColor2 = picks.a1;
    config.paletteColor3 = picks.a2;
    return true;
  };
  const save = (patch) => {
    picks = { ...picks, ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(picks)); } catch {}
    apply();
    if (panel) sync();
  };
  // the logo's scripts load after this one; apply once they're in
  let tries = 0;
  const waitForLogo = () => { if (!apply() && tries++ < 300) requestAnimationFrame(waitForLogo); };
  if (localStorage.getItem(KEY)) waitForLogo();

  // --- the panel ---
  let panel = null;
  const build = () => {
    const style = document.createElement('style');
    style.textContent = `
      .lauren-panel { position: fixed; right: 16px; top: 56px;   /* opposite the logo, so it stays in view */ z-index: 4000; width: 250px; padding: 14px 16px 16px;
        background: var(--bg-color); color: var(--text-color); border: 1px solid rgba(128,128,128,.35);
        box-shadow: 0 6px 24px rgba(0,0,0,.12); font: 400 11px/1.4 Poppins, sans-serif; }
      .lauren-panel h2 { margin: 0 0 2px; font-size: 12px; font-weight: 600; }
      .lauren-panel .intro { margin: 0 0 12px; opacity: .6; }
      .lauren-panel .pick { display: grid; grid-template-columns: 36px 1fr; gap: 4px 10px; align-items: center; margin-bottom: 10px; }
      .lauren-panel .pick input[type=color] { grid-row: span 2; width: 36px; height: 36px; padding: 0; border: 1px solid rgba(128,128,128,.4); background: none; }
      .lauren-panel .pick input[type=text] { width: 100%; box-sizing: border-box; padding: 3px 6px; border: 1px solid rgba(128,128,128,.45); background: none; color: inherit; font: inherit; text-transform: lowercase; }
      .lauren-panel .presets { display: flex; flex-direction: column; gap: 4px; margin: 4px 0 12px; }
      .lauren-panel .presets button { display: flex; align-items: center; gap: 6px; padding: 3px 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; }
      .lauren-panel .presets i { display: inline-block; width: 12px; height: 12px; border: 1px solid rgba(128,128,128,.4); }
      .lauren-panel .presets button:hover { color: var(--link-hover-color); }
      .lauren-panel .row { display: flex; gap: 6px; }
      .lauren-panel .row button { flex: 1; padding: 5px 0; border: 1px solid rgba(128,128,128,.45); background: none; color: inherit; font: inherit; }
      .lauren-panel .row button:hover { color: var(--link-hover-color); }
      @media (max-width: 768px) {   /* phones: the logo is centred up top, so dock along the bottom */
        .lauren-panel { top: auto; bottom: 16px; left: 16px; right: 16px; width: auto; }
      }
      .has-crosshair .lauren-panel, .has-crosshair .lauren-panel * { cursor: default !important; }
      .has-crosshair .lauren-panel input[type=text] { cursor: text !important; }`;
    document.head.appendChild(style);

    panel = document.createElement('div');
    panel.className = 'lauren-panel';
    panel.innerHTML = `
      <h2>hi Lauren \u{1F44B} logo colours</h2>
      <p class="intro">Two accents for the grid logo. Hover over the logo to see them near the cursor; they also flash through some of its animations.</p>
      <label class="pick"><input type="color" data-k="a1"><span>accent 1 — nearest the cursor</span><input type="text" data-hex="a1" maxlength="7" spellcheck="false"></label>
      <label class="pick"><input type="color" data-k="a2"><span>accent 2 — the ring around it</span><input type="text" data-hex="a2" maxlength="7" spellcheck="false"></label>
      <div class="presets">${PRESETS.map((p, i) => `<button type="button" data-preset="${i}"><i style="background:${p.a1}"></i><i style="background:${p.a2}"></i>${p.name}</button>`).join('')}</div>
      <div class="row">
        <button type="button" data-act="copy">copy</button>
        <button type="button" data-act="reset">reset</button>
        <button type="button" data-act="close">close</button>
      </div>`;
    document.body.appendChild(panel);

    panel.addEventListener('input', (e) => {
      if (e.target.dataset.k) save({ [e.target.dataset.k]: e.target.value });
      if (e.target.dataset.hex) {
        const v = hex(e.target.value);
        if (v) save({ [e.target.dataset.hex]: v });
      }
    });
    panel.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.preset) {
        const p = PRESETS[b.dataset.preset];
        save({ a1: p.a1, a2: p.a2 });
      }
      if (b.dataset.act === 'reset') {
        try { localStorage.removeItem(KEY); } catch {}
        picks = { ...DEFAULTS };
        apply();
        sync();
      }
      if (b.dataset.act === 'close') panel.hidden = true;
      if (b.dataset.act === 'copy') {
        navigator.clipboard?.writeText(`logo accents: ${picks.a1}, ${picks.a2}`).then(() => {
          b.textContent = 'copied';
          setTimeout(() => { b.textContent = 'copy'; }, 1200);
        });
      }
    });
    sync();
  };
  const sync = () => {
    panel.querySelectorAll('[data-k]').forEach(el => { el.value = picks[el.dataset.k]; });
    panel.querySelectorAll('[data-hex]').forEach(el => {
      if (document.activeElement !== el) el.value = picks[el.dataset.hex];
    });
  };
  const open = () => {
    if (!panel) build();
    panel.hidden = false;
    waitForLogo();
  };

  // typing "lauren" anywhere (outside a text box) opens it
  let typed = '';
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    typed = (typed + e.key.toLowerCase()).slice(-6);
    if (typed === 'lauren') { typed = ''; open(); }
  });
  if (new URLSearchParams(window.location.search).has('lauren')) open();
})();
