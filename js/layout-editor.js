// Layout editor — a design tool for placing the homepage cards, not part of
// the site. Only on a local copy: run `python3 tools/layout-server.py`, open
// http://localhost:8765 and press E (or add ?edit).
//
// Any local server will do for viewing (VS Code's Live Server, say), as long
// as tools/layout-server.py is running too: Apply saves through it, at the
// page's own address or at localhost:8765.
//
// A card's autoplay switch (whether it plays by itself on desktop while on
// screen) applies to both layouts, and is saved as its data-autoplay mark.
//
// It edits whichever layout the window is showing — wide (68 columns) or,
// below 1100px, narrow (51) — so resize the window to switch. Drag a card to
// move it, drag its corner to resize; everything snaps to the grid. Apply
// writes every card's numbers into index.html (through the server).
(() => {
  const grid = document.querySelector('.grid-container');
  if (!grid) return;
  const items = [...grid.querySelectorAll('.grid-item')];
  const nameOf = (el) => (el.querySelector('.id-tab')?.textContent || el.dataset.projectId || 'card').trim();

  // --- placements: read / write a card's --x … --nz custom properties ---
  const ALL = ['x', 'y', 'w', 'h', 'z', 'nx', 'ny', 'nw', 'nh', 'nz'];
  const KEYS = {
    wide: { x: 'x', y: 'y', w: 'w', h: 'h', z: 'z' },
    narrow: { x: 'nx', y: 'ny', w: 'nw', h: 'nh', z: 'nz' },
  };
  const read = (el) => {
    const o = {};
    ALL.forEach(k => {
      const v = el.style.getPropertyValue('--' + k).trim();
      o[k] = v === '' ? null : Number(v);
    });
    o.autoplay = el.hasAttribute('data-autoplay');
    return o;
  };
  const write = (el, o) => {
    Object.entries(o).forEach(([k, v]) => {
      if (k === 'autoplay') return;
      if (v == null) el.style.removeProperty('--' + k);
      else el.style.setProperty('--' + k, v);
    });
    if ('autoplay' in o && o.autoplay !== el.hasAttribute('data-autoplay')) {
      el.toggleAttribute('data-autoplay', o.autoplay);
      document.dispatchEvent(new Event('autoplaychange'));   // main.js plays / pauses to match
    }
  };
  const snapshot = () => items.map(read);
  const restore = (snap) => items.forEach((el, i) => write(el, snap[i]));
  let saved = snapshot();
  const undoStack = [];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const dirty = () => !same(snapshot(), saved);
  const changed = () => snapshot().filter((o, i) => !same(o, saved[i])).length;
  const remember = (before) => { if (!same(before, snapshot())) undoStack.push(before); };

  // --- which layout is showing, and its measurements ---
  const layout = () => {
    if (getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length < 2) return null;   // phone stack
    return getComputedStyle(document.documentElement).getPropertyValue('--cols').trim() === '68' ? 'wide' : 'narrow';
  };
  const cols = () => getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length;
  const cell = () => parseFloat(getComputedStyle(grid).gridAutoRows);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // the card's image shape (width / height), or its current shape until the media loads
  const ratio = (el, p) => {
    const v = el.querySelector('video'), i = el.querySelector('img');
    if (v && v.videoWidth) return v.videoWidth / v.videoHeight;
    if (i && i.naturalWidth) return i.naturalWidth / i.naturalHeight;
    return p.w / p.h;
  };
  // this layout's placement of a card, as { x, y, w, h, z }
  const place = (el) => {
    const K = KEYS[layout()], o = read(el);
    return { x: o[K.x], y: o[K.y], w: o[K.w], h: o[K.h], z: o[K.z] };
  };
  const setPlace = (el, p) => {
    const K = KEYS[layout()], o = {};
    Object.entries(p).forEach(([k, v]) => { o[K[k]] = v; });
    write(el, o);
  };

  // --- styles ---
  const style = document.createElement('style');
  style.textContent = `
    /* while editing, the normal cursor comes back (the crosshair hides it everywhere) */
    .le-on.has-crosshair, .le-on.has-crosshair * { cursor: auto !important; }
    .le-on .grid-container .grid-item, .le-on .grid-container .grid-item * { cursor: move !important; }
    .le-on .grid-container .grid-item .le-handle { cursor: nwse-resize !important; }
    .le-on .grid-container .grid-item { outline: 1px dashed rgba(58,109,240,.55); outline-offset: -1px; opacity: 1; transform: none; transition: none; touch-action: none; }
    .le-on .grid-container .grid-item.le-sel { outline: 2px solid #3a6df0; outline-offset: 0; }
    .le-on .grid-container .grid-item:hover video, .le-on .grid-container .grid-item:hover img { transform: none; }
    .le-on .see-more-btn, .le-on .grid-container .id-tab, .le-on .crosshair { display: none !important; }
    .le-handle { display: none; position: absolute; right: -6px; bottom: -6px; width: 12px; height: 12px; background: #3a6df0; border: 2px solid #fff; border-radius: 2px; z-index: 5; }
    .le-on .le-handle { display: block; }
    .le-tag { display: none; position: absolute; left: 0; top: -18px; padding: 1px 5px; font: 500 10px/14px Poppins, sans-serif; background: #3a6df0; color: #fff; white-space: nowrap; z-index: 6; pointer-events: none; }
    .le-on .le-sel .le-tag { display: block; }
    .le-on .grid-container .grid-item[data-autoplay]::after { content: "autoplay"; position: absolute; bottom: 4px; left: 4px; padding: 0 4px; font: 500 9px/14px Poppins, sans-serif; background: rgba(58,109,240,.9); color: #fff; z-index: 6; pointer-events: none; }
    .le-panel { position: fixed; left: 16px; bottom: 16px; z-index: 4000; width: 250px; padding: 12px 14px 14px;
      background: var(--bg-color); color: var(--text-color); border: 1px solid rgba(128,128,128,.35);
      box-shadow: 0 6px 24px rgba(0,0,0,.12); font: 400 11px/1.35 Poppins, sans-serif; }
    .le-panel h2 { display: flex; justify-content: space-between; margin: 0 0 8px; font-size: 11px; font-weight: 600; }
    .le-panel h2 span { font-weight: 400; opacity: .6; }
    .le-panel .sel { min-height: 16px; margin-bottom: 6px; font-weight: 600; }
    .le-panel .nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .le-panel .nums label { display: flex; flex-direction: column; gap: 2px; opacity: .9; }
    .le-panel .nums input { width: 100%; box-sizing: border-box; padding: 3px 4px; border: 1px solid rgba(128,128,128,.45); background: none; color: inherit; font: inherit; }
    .le-panel .row { display: flex; gap: 6px; margin-top: 8px; }
    .le-panel button { flex: 1; padding: 5px 0; border: 1px solid rgba(128,128,128,.45); background: none; color: inherit; font: inherit; }
    .le-panel button:hover:not(:disabled) { color: var(--link-hover-color); }
    .le-panel button:disabled { opacity: .35; }
    .le-panel button.apply { background: #3a6df0; border-color: #3a6df0; color: #fff; }
    .le-panel button.apply:hover:not(:disabled) { color: #fff; background: #2b56cc; }
    .le-panel .check { display: flex; gap: 6px; align-items: center; margin-top: 8px; }
    .le-panel .status { min-height: 15px; margin-top: 8px; opacity: .75; }
    .le-panel .pending { color: #3a6df0; }
    .le-panel .hint { margin-top: 6px; opacity: .5; font-size: 10px; }`;
  document.head.appendChild(style);

  items.forEach(el => {
    const h = document.createElement('div');
    h.className = 'le-handle';
    const t = document.createElement('div');
    t.className = 'le-tag';
    el.append(h, t);
  });

  // --- panel ---
  const panel = document.createElement('div');
  panel.className = 'le-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <h2>layout editor <span class="lay"></span></h2>
    <div class="sel"></div>
    <div class="nums">
      ${['x', 'y', 'w', 'h'].map(k => `<label>${k}<input type="number" min="1" data-k="${k}"></label>`).join('')}
    </div>
    <div class="row">
      <button type="button" data-act="back">send back</button>
      <button type="button" data-act="forward">bring forward</button>
    </div>
    <label class="check"><input type="checkbox" class="autoplay"> autoplay while on screen (both layouts)</label>
    <label class="check"><input type="checkbox" class="lock" checked> keep image proportions (Shift: free)</label>
    <div class="row">
      <button type="button" data-act="undo">undo</button>
      <button type="button" data-act="reset">reset</button>
      <button type="button" data-act="apply" class="apply" title="save every card, in both layouts, to index.html">apply all</button>
    </div>
    <div class="status"></div>
    <div class="pending"></div>
    <div class="hint">drag: move \u00b7 corner: resize \u00b7 arrows: nudge \u00b7 Shift+arrows: resize \u00b7 \u2318Z: undo \u00b7 E: close</div>`;
  document.body.appendChild(panel);
  const $ = (s) => panel.querySelector(s);
  const status = (msg) => { $('.status').textContent = msg; };

  let selected = null;
  const select = (el) => {
    items.forEach(i => i.classList.toggle('le-sel', i === el));
    selected = el;
    refresh();
  };

  const refresh = () => {
    const lay = layout();
    $('.lay').textContent = lay ? `${lay} \u00b7 ${cols()} columns` : 'stacked (phone)';
    const ok = !!lay && !!selected;
    $('.sel').textContent = !lay ? 'widen the window to edit a layout'
      : selected ? nameOf(selected) : 'click a card';
    panel.querySelectorAll('.nums input, [data-act=back], [data-act=forward]').forEach(i => { i.disabled = !ok; });
    const auto = $('.autoplay');
    auto.disabled = !selected || !selected.querySelector('video');   // only video cards
    auto.checked = !!selected && selected.hasAttribute('data-autoplay');
    if (ok) {
      const p = place(selected);
      panel.querySelectorAll('.nums input').forEach(i => {
        if (document.activeElement !== i) i.value = p[i.dataset.k];
      });
      selected.querySelector('.le-tag').textContent = `${p.x}, ${p.y} \u00b7 ${p.w}\u00d7${p.h}`;
    }
    $('[data-act=undo]').disabled = !undoStack.length;
    $('[data-act=reset]').disabled = $('[data-act=apply]').disabled = !dirty();
    const n = changed();
    $('.pending').textContent = n ? `${n} card${n > 1 ? 's' : ''} changed, not applied yet` : '';
  };

  // the autoplay switch
  $('.autoplay').addEventListener('change', (e) => {
    if (!selected) return;
    const before = snapshot();
    write(selected, { autoplay: e.target.checked });
    remember(before);
    status(e.target.checked ? 'autoplays while on screen' : 'plays on hover only');
    refresh();
  });

  // typed numbers
  panel.addEventListener('change', (e) => {
    const k = e.target.dataset.k;
    if (!k || !selected || !layout()) return;
    const before = snapshot(), p = place(selected);
    let v = Math.max(1, Math.round(Number(e.target.value) || 1));
    if (k === 'x') v = clamp(v, 1, cols() - p.w + 1);
    if (k === 'w') v = clamp(v, 1, cols() - p.x + 1);
    setPlace(selected, { [k]: v });
    remember(before);
    refresh();
  });

  // --- layers: this layout's stacking order, bottom first ---
  const order = () => {
    const K = KEYS[layout()];
    return items.map((el, i) => ({ el, i, z: read(el)[K.z] || 0 }))
      .sort((a, b) => a.z - b.z || a.i - b.i).map(o => o.el);
  };
  const shift = (dir) => {
    if (!selected || !layout()) return;
    const before = snapshot(), o = order(), i = o.indexOf(selected), j = i + dir;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    o.forEach((el, n) => setPlace(el, { z: n + 1 }));
    remember(before);
    status(dir > 0 ? 'brought forward' : 'sent back');
    refresh();
  };

  panel.addEventListener('click', async (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'forward') shift(1);
    if (act === 'back') shift(-1);
    if (act === 'undo') undo();
    if (act === 'reset') {
      undoStack.push(snapshot());
      restore(saved);
      status('back to the last applied layout');
      refresh();
    }
    if (act === 'apply') apply();
  });

  const undo = () => {
    if (!undoStack.length) return;
    restore(undoStack.pop());
    status('undone');
    refresh();
  };

  // Where to save: tools/layout-server.py, at this page's own address if it
  // served the page, otherwise at its usual port. Found once, on first use.
  const SERVERS = [...new Set(['/__layout', 'http://localhost:8765/__layout'])];
  let server;
  const findServer = async () => {
    if (server !== undefined) return server;
    server = null;
    for (const url of SERVERS) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const info = res.ok && (await res.json().catch(() => null));
        if (info && info.server === 'layout-server') { server = url; break; }
      } catch {}
    }
    return server;
  };
  const NO_SERVER = 'can\u2019t save: run python3 tools/layout-server.py (it can stay running alongside Live Server)';

  const apply = async () => {
    const cards = items.map((el, i) => ({ name: nameOf(el), ...snapshot()[i] }));
    server = undefined;   // look again, in case it was started or stopped
    const url = await findServer();
    if (!url) {
      navigator.clipboard?.writeText(JSON.stringify(cards, null, 1)).catch(() => {});
      status(NO_SERVER + ' \u2014 numbers copied to the clipboard');
      return refresh();
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards }),
      });
      if (!res.ok) throw new Error((await res.text()).trim() || `the server answered ${res.status}`);
      saved = snapshot();
      status('saved to index.html');
    } catch (err) {
      status('not saved: ' + (err.message || 'the layout server didn\u2019t answer'));
    }
    refresh();
  };

  // --- dragging: move, or resize from the corner handle ---
  let drag = null;
  grid.addEventListener('pointerdown', (e) => {
    if (!on || e.button !== 0) return;
    const el = e.target.closest('.grid-item');
    if (!el || !layout()) return;
    e.preventDefault();
    select(el);
    const p = place(el);
    drag = {
      el, p, sx: e.clientX, sy: e.clientY, before: snapshot(),
      mode: e.target.closest('.le-handle') ? 'resize' : 'move', r: ratio(el, p),
    };
    try { el.setPointerCapture(e.pointerId); } catch {}
  });
  grid.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const c = cell(), dx = Math.round((e.clientX - drag.sx) / c), dy = Math.round((e.clientY - drag.sy) / c);
    const { p } = drag;
    if (drag.mode === 'move') {
      setPlace(drag.el, { x: clamp(p.x + dx, 1, cols() - p.w + 1), y: Math.max(1, p.y + dy) });
    } else {
      const w = clamp(p.w + dx, 2, cols() - p.x + 1);
      const lock = $('.lock').checked !== e.shiftKey;
      setPlace(drag.el, { w, h: lock ? Math.max(2, Math.round(w / drag.r)) : Math.max(2, p.h + dy) });
    }
    refresh();
  });
  const endDrag = () => {
    if (!drag) return;
    remember(drag.before);
    drag = null;
    refresh();
  };
  grid.addEventListener('pointerup', endDrag);
  grid.addEventListener('pointercancel', endDrag);
  // while editing, a click on a card doesn't open its project
  grid.addEventListener('click', (e) => {
    if (on) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // --- keys ---
  document.addEventListener('keydown', (e) => {
    const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
    if ((e.key === 'e' || e.key === 'E') && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
      return toggle();
    }
    if (!on || typing) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); return undo(); }
    if (e.key === 'Escape') return select(null);
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!arrows[e.key] || !selected || !layout()) return;
    e.preventDefault();
    const [dx, dy] = arrows[e.key], p = place(selected), before = snapshot();
    if (e.shiftKey) setPlace(selected, { w: clamp(p.w + dx, 2, cols() - p.x + 1), h: Math.max(2, p.h + dy) });
    else setPlace(selected, { x: clamp(p.x + dx, 1, cols() - p.w + 1), y: Math.max(1, p.y + dy) });
    remember(before);
    refresh();
  });

  let on = false;
  const toggle = (show = !on) => {
    on = show;
    panel.hidden = !on;
    document.body.classList.toggle('le-on', on);
    if (on) {
      items.forEach(el => el.classList.add('loaded'));
      findServer().then(url => { if (!url) status(NO_SERVER); });
    } else select(null);
    refresh();
  };

  window.addEventListener('resize', () => { if (on) refresh(); });
  window.addEventListener('beforeunload', (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
  if (new URLSearchParams(location.search).has('edit')) toggle(true);
})();
