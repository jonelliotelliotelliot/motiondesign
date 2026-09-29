// Grid controls — a design tool for trying out the page grid, not part of
// the site. Press G (or open a page with ?grid) to show the panel. Settings
// are kept in this browser only (localStorage), separately for light and
// dark mode, and apply on every page until you press reset. To remove it
// all, delete this file and the line in main.js that loads it.
(() => {
  const KEY = 'gridControls';
  const DEFAULTS = {
    pattern: 'lines',     // lines | crosses | dots | off
    colour: null,         // null = the theme's own (#8fb3ff, or white in dark mode)
    opacity: 16,          // %
    weight: 1,            // px
    size: 4,              // px — cross arm length / dot diameter
    major: 0,             // every n cells a stronger mark (0 = off)
    majorBoost: 2.5,      // how much stronger
    page: null,           // page colour, null = the theme's own
    onTop: false,         // draw the grid over the page
    snap: false,          // homepage crosshair snaps to the grid
  };
  const SWATCHES = ['#000000', '#3a6df0', '#8fb3ff', '#ffa800', '#ff3b30', '#16a34a', '#ffffff'];

  const theme = () => document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  };
  let store = load();          // { light: {...}, dark: {...} }
  const settings = () => ({ ...DEFAULTS, ...(store[theme()] || {}) });
  const save = (patch) => {
    store[theme()] = { ...settings(), ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {}
    apply();
  };

  // the cell size in px, as the stylesheet works it out for this window
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:var(--cell);height:0';
  document.body.appendChild(probe);
  const cellPx = () => probe.getBoundingClientRect().width;

  // One tile of the pattern, n cells square, as an SVG. Marks sit where the
  // CSS lines do: a line covers the pixels just right of / below its
  // intersection, and a cross or dot is centred on that line.
  const tile = (s, cell) => {
    const n = s.major > 1 ? s.major : 1;
    const T = n * cell, w = s.weight, c = s.colour || (theme() === 'dark' ? '#ffffff' : '#8fb3ff');
    const a = s.opacity / 100, strong = Math.min(1, a * s.majorBoost);
    let body = '';
    if (s.pattern === 'lines') {
      for (let i = 0; i < n; i++) {
        const o = n > 1 && i === 0 ? strong : a;
        body += `<rect x="${i * cell}" y="0" width="${w}" height="${T}" fill-opacity="${o}"/>`;
        body += `<rect x="0" y="${i * cell}" width="${T}" height="${w}" fill-opacity="${o}"/>`;
      }
    } else {
      // intersections 0..n inclusive, so marks on the tile's edges wrap whole
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
        const x = i * cell + w / 2, y = j * cell + w / 2;
        const major = n > 1 && i % n === 0 && j % n === 0;
        const o = major ? strong : a;
        const r = (major ? s.size * 1.6 : s.size);
        if (s.pattern === 'crosses') {
          body += `<rect x="${x - r}" y="${y - w / 2}" width="${2 * r}" height="${w}" fill-opacity="${o}"/>`;
          body += `<rect x="${x - w / 2}" y="${y - r}" width="${w}" height="${2 * r}" fill-opacity="${o}"/>`;
        } else {
          body += `<circle cx="${x}" cy="${y}" r="${r / 2}" fill-opacity="${o}"/>`;
        }
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" fill="${c}" shape-rendering="crispEdges">${body}</svg>`;
    return { url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, size: `${T}px ${T}px` };
  };

  const apply = () => {
    const s = settings(), b = document.body.style;
    const touched = !!store[theme()];
    b.removeProperty('--grid-image');
    b.removeProperty('--grid-size');
    b.removeProperty('background-color');
    if (touched) {
      if (s.pattern === 'off') b.setProperty('--grid-image', 'none');
      else {
        const t = tile(s, cellPx());
        b.setProperty('--grid-image', t.url);
        b.setProperty('--grid-size', t.size);
      }
      if (s.page) b.setProperty('background-color', s.page);
    }
    document.body.classList.toggle('grid-on-top', touched && s.onTop);
    if (touched && s.snap) document.body.dataset.crosshair = 'snap';
    else delete document.body.dataset.crosshair;
    if (panel) sync();
  };

  // --- the panel ---
  let panel = null;
  const css = `
    .grid-panel { position: fixed; right: 16px; bottom: 16px; z-index: 4000; width: 232px;
      padding: 12px 14px 14px; background: var(--bg-color); color: var(--text-color);
      border: 1px solid rgba(128,128,128,.35); box-shadow: 0 6px 24px rgba(0,0,0,.12);
      font: 400 11px/1.3 Poppins, sans-serif; }
    .grid-panel h2 { display: flex; justify-content: space-between; margin: 0 0 10px; font-size: 11px; font-weight: 600; }
    .grid-panel h2 span { font-weight: 400; opacity: .55; }
    .grid-panel label { display: grid; grid-template-columns: 74px 1fr 30px; align-items: center; gap: 6px; margin: 7px 0; }
    .grid-panel label output { text-align: right; opacity: .7; }
    .grid-panel input[type=range] { width: 100%; margin: 0; accent-color: #ffa800; }
    .grid-panel input[type=color] { width: 100%; height: 20px; padding: 0; border: 1px solid rgba(128,128,128,.35); background: none; }
    .grid-panel .seg { display: flex; margin: 0 0 10px; border: 1px solid rgba(128,128,128,.35); }
    .grid-panel .seg button { flex: 1; padding: 4px 0; border: 0; background: none; color: inherit; font: inherit; }
    .grid-panel .seg button.on { background: var(--text-color); color: var(--bg-color); }
    .grid-panel .swatches { display: flex; gap: 5px; margin: 2px 0 6px 80px; }
    .grid-panel .swatches button { width: 16px; height: 16px; padding: 0; border: 1px solid rgba(128,128,128,.5); }
    .grid-panel .checks { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
    .grid-panel .checks label { display: flex; gap: 6px; margin: 0; }
    .grid-panel .row { display: flex; gap: 6px; margin-top: 12px; }
    .grid-panel .row button { flex: 1; padding: 5px 0; border: 1px solid rgba(128,128,128,.45); background: none; color: inherit; font: inherit; }
    .grid-panel .row button:hover, .grid-panel .seg button:hover { color: var(--link-hover-color); }
    .grid-panel .seg button.on:hover { color: var(--bg-color); }
    .has-crosshair .grid-panel, .has-crosshair .grid-panel * { cursor: default !important; }`;

  const build = () => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    panel = document.createElement('div');
    panel.className = 'grid-panel';
    panel.innerHTML = `
      <h2>grid <span class="theme"></span></h2>
      <div class="seg">${['lines', 'crosses', 'dots', 'off'].map(p => `<button type="button" data-pattern="${p}">${p}</button>`).join('')}</div>
      <label>colour <input type="color" data-k="colour"><span></span></label>
      <div class="swatches">${SWATCHES.map(c => `<button type="button" data-swatch="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>
      <label>opacity <input type="range" data-k="opacity" min="1" max="40" step=".5"><output></output></label>
      <label>weight <input type="range" data-k="weight" min="1" max="3" step="1"><output></output></label>
      <label>mark size <input type="range" data-k="size" min="1" max="12" step="1"><output></output></label>
      <label>major every <input type="range" data-k="major" min="0" max="9" step="1"><output></output></label>
      <label>major boost <input type="range" data-k="majorBoost" min="1" max="6" step=".5"><output></output></label>
      <label>page colour <input type="color" data-k="page"><span></span></label>
      <div class="checks">
        <label><input type="checkbox" data-k="onTop"> grid over the page</label>
        <label><input type="checkbox" data-k="snap"> crosshair snaps (homepage)</label>
      </div>
      <div class="row">
        <button type="button" data-act="copy">copy</button>
        <button type="button" data-act="reset">reset</button>
        <button type="button" data-act="close">close</button>
      </div>`;
    document.body.appendChild(panel);

    panel.addEventListener('input', (e) => {
      const k = e.target.dataset.k;
      if (!k) return;
      const v = e.target.type === 'checkbox' ? e.target.checked
              : e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
      save({ [k]: v });
    });
    panel.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.pattern) save({ pattern: b.dataset.pattern });
      if (b.dataset.swatch) save({ colour: b.dataset.swatch });
      if (b.dataset.act === 'close') toggle(false);
      if (b.dataset.act === 'reset') {
        delete store[theme()];
        try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {}
        apply();
      }
      if (b.dataset.act === 'copy') {
        const text = JSON.stringify({ [theme()]: settings() }, null, 2);
        navigator.clipboard?.writeText(text).then(() => {
          b.textContent = 'copied';
          setTimeout(() => { b.textContent = 'copy'; }, 1200);
        });
      }
    });
    sync();
  };

  // show the current settings in the panel
  const sync = () => {
    const s = settings();
    panel.querySelector('.theme').textContent = theme() + ' mode';
    panel.querySelectorAll('[data-pattern]').forEach(b => b.classList.toggle('on', b.dataset.pattern === s.pattern));
    const defaultInk = theme() === 'dark' ? '#ffffff' : '#8fb3ff';
    const pageColour = getComputedStyle(document.body).backgroundColor;
    panel.querySelectorAll('[data-k]').forEach(el => {
      const k = el.dataset.k;
      if (el.type === 'checkbox') el.checked = !!s[k];
      else if (k === 'colour') el.value = s.colour || defaultInk;
      else if (k === 'page') el.value = s.page || rgbToHex(pageColour);
      else el.value = s[k];
      const out = el.parentNode.querySelector('output');
      if (out) out.textContent = k === 'major' && !s[k] ? 'off' : s[k] + (k === 'opacity' ? '%' : k === 'weight' || k === 'size' ? 'px' : '');
    });
  };
  const rgbToHex = (rgb) => {
    const m = rgb.match(/\d+/g);
    return m ? '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('') : '#ffffff';
  };

  const toggle = (show) => {
    if (!panel) build();
    panel.hidden = !(show ?? panel.hidden);
  };

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    toggle();
  });
  // light / dark each keep their own settings
  let lastTheme = theme();
  new MutationObserver(() => {
    if (theme() !== lastTheme) { lastTheme = theme(); apply(); }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', apply);

  apply();
  if (new URLSearchParams(window.location.search).has('grid')) toggle(true);
})();
