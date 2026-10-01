// type.js — the "about the type" page (type/index.html). Builds the page's
// words and figures, and the control panel for the big name. The letters,
// numbers and colours all come from js/grid-type.js and the scenes from
// js/grid-motion.js — the same files the header logo runs on — so nothing
// about the typeface is defined here.
// The panel drives every word on the page: the big name, the alphabet and
// numerals (each plays the name's current scene when hovered) and "try it".
// The type is always solid ink; the palette in grid-type.js only supplies
// the accents (the hover colours, and the flashes in flip and glitch).
(function () {
  "use strict";

  if (!window.GridType || !window.GridMotion) return;
  const { CONFIG, GLYPHS, glyphSVG } = window.GridType;
  const SVGNS = "http://www.w3.org/2000/svg";
  const $ = sel => document.querySelector(sel);

  // ============================================================
  // THE NAME
  // ============================================================
  const hero = window.GridMotion.create($("#type-word"), {
    host: $(".type-hero"),
    onFrame: () => updatePanel(),
  });
  const state = hero.state;   // what the panel changes; every other word falls back on it

  // Fit a word to the page grid: k page cells to each cell of the type, as
  // big as fits in the main column (and no bigger than the name).
  const cssCells = name => parseInt(getComputedStyle($(".type")).getPropertyValue(name), 10);
  function fit(svg, perLine) {
    const most = Math.floor((cssCells("--hero") || 36) / 9);
    const k = Math.max(1, Math.min(most, Math.floor((cssCells("--main") || 45) / (3 * perLine))));
    svg.style.width = "calc(" + (3 * perLine * k) + " * var(--cell))";
  }

  // ============================================================
  // TRY IT — the visitor's own word, playing the same loop
  // ============================================================
  const input = $("#type-input");
  const trySvg = $("#type-try-word");
  const tryWord = window.GridMotion.create(trySvg, {
    host: $("#type-try"),
    lines: [" "],
    shared: state,
  });

  // as big as it fits in the column
  function setTryWord() {
    const text = input.value.toUpperCase();
    const word = [...text].map(ch => GLYPHS[ch] ? ch : " ").join("").replace(/\s+$/, "") || " ";
    fit(trySvg, word.length);
    tryWord.setLines([word]);
    trySvg.setAttribute("aria-label", word.trim().toLowerCase());
  }
  input.addEventListener("input", setTryWord);
  setTryWord();

  // ============================================================
  // ALPHABET AND NUMERALS — each character is its own word, at rest until
  // hovered (or tapped), when it plays whatever scene the name is on
  // ============================================================
  const glyphs = [];
  document.querySelectorAll(".type-glyphs").forEach(host => {
    [...host.dataset.set].forEach(ch => {
      const svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("class", "type-glyph");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", ch);
      host.appendChild(svg);
      const glyph = window.GridMotion.create(svg, {
        lines: [ch],
        shared: state,
        state: { mode: "once", gap: 0, pointer: false },
        autoplay: false,
      });
      svg.addEventListener("pointerenter", () => glyph.play(hero.current.name));
      glyphs.push(glyph);
    });
  });

  const words = [hero, tryWord, ...glyphs];

  // ============================================================
  // FIGURES (how it's built) — still, with the 3x3 guides showing. Drawn in
  // currentColor, so they follow --ink into dark mode on their own.
  // ============================================================
  function drawFigures() {
    document.querySelectorAll(".type-figure-glyphs").forEach(host => {
      // how big a figure is drawn (set in type.css), for the seam
      host.innerHTML = "<svg></svg>";
      const cellPx = host.firstChild.getBoundingClientRect().width / 3 || undefined;
      host.innerHTML = "";
      const saved = { seam: CONFIG.cellSeam, mode: CONFIG.colourMode, ink: CONFIG.glyphColor };
      // pull the diagonals' pieces apart a little, to show where they're cut
      if (host.hasAttribute("data-explode") && cellPx) CONFIG.cellSeam = saved.seam + 0.05 * cellPx;
      CONFIG.colourMode = "solid";
      CONFIG.glyphColor = "currentColor";
      [...host.dataset.glyphs].forEach(ch => {
        const svg = glyphSVG(ch, { showGrid: true, cellPx });
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", ch);
        host.appendChild(svg);
      });
      CONFIG.cellSeam = saved.seam;
      CONFIG.colourMode = saved.mode;
      CONFIG.glyphColor = saved.ink;
    });
  }
  drawFigures();

  // ============================================================
  // ON THE GRID — each block of text is rounded up to a whole number of
  // cells, so everything after it starts on a grid line
  // ============================================================
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:var(--cell);height:0";
  document.body.appendChild(probe);
  const phone = window.matchMedia("(max-width: 768px)");

  function snapText() {
    const cell = probe.getBoundingClientRect().width;
    document.querySelectorAll(".type .type-text").forEach(el => el.style.minHeight = "");
    if (phone.matches || !cell) return;
    document.querySelectorAll(".type .type-text").forEach(el => {
      const h = el.getBoundingClientRect().height;
      el.style.minHeight = Math.ceil(h / cell - 0.01) * cell + "px";
    });
  }
  snapText();
  window.addEventListener("load", snapText);
  // Poppins arrives after the page does, and changes how tall the text is
  if (document.fonts) document.fonts.addEventListener("loadingdone", snapText);
  window.addEventListener("resize", () => { snapText(); setTryWord(); drawFigures(); });

  // ============================================================
  // CONTROL PANEL
  //
  // Built from PANEL below: a list of sections, each a list of controls.
  // To add a control, add an entry — the kinds are
  //   seg     { label, key, options: [[value, text], ...], after }  segmented buttons
  //   range   { label, key, min, max, step, after, format }          slider
  //   toggle  { label, key, after }                                  checkbox
  //   color   { label, key, after }                                  colour picker
  //   button  { text, action }                                       one button
  //   custom  { render(host) }                                       anything else
  // `key` is a setting in `obj` — the name's state (see DEFAULTS in
  // grid-motion.js) unless the control says otherwise; `after` runs when the
  // value changes.
  // ============================================================
  const rebuildAll = () => words.forEach(w => w.rebuild());
  const redraw = () => { rebuildAll(); drawFigures(); };
  const setPlaying = v => { hero.setPlaying(v); tryWord.setPlaying(v); syncPanel(); };
  const playScene = name => { hero.play(name); tryWord.play(name); syncPanel(); };
  const isDark = () => document.body.classList.contains("dark-mode");

  // the shape of the type, from grid-type.js — kept to put back on reset
  const GEOMETRY = ["cornerRadius", "accentRadius", "gapWidth", "counterWidth", "counterRadius", "cellSeam", "cutStyle"];
  const geometryDefaults = Object.fromEntries(GEOMETRY.map(k => [k, CONFIG[k]]));
  const accentDefaults = { paletteColor2: CONFIG.paletteColor2, paletteColor3: CONFIG.paletteColor3 };
  const two = v => v.toFixed(2);

  const PANEL = [
    { title: "Scenes", controls: [
      { kind: "custom", render: renderSceneList },
      { kind: "seg", label: "mode", key: "mode", options: [["loop", "loop"], ["repeat", "repeat"]] },
      { kind: "range", label: "speed", key: "speed", min: 0.25, max: 2, step: 0.05, format: v => two(v) + "\u00d7" },
      { kind: "range", label: "gap", key: "gap", min: 0, max: 4, step: 0.05, format: v => two(v) + "s" },
    ]},
    // what changes here redraws every word on the page; values in cells of the
    // type, except the seam, which is in screen pixels
    { title: "Geometry", closed: true, controls: [
      { kind: "range", label: "corners", obj: CONFIG, key: "cornerRadius", min: 0, max: 1, step: 0.02, format: two, after: redraw },
      { kind: "range", label: "accent", obj: CONFIG, key: "accentRadius", min: 0, max: 1, step: 0.05, format: v => two(v) + "\u00d7", after: redraw },
      { kind: "range", label: "hairline", obj: CONFIG, key: "gapWidth", min: 0, max: 0.3, step: 0.005, format: v => v.toFixed(3), after: redraw },
      { kind: "range", label: "counter", obj: CONFIG, key: "counterWidth", min: 0.02, max: 0.6, step: 0.02, format: two, after: redraw },
      { kind: "range", label: "counter radius", obj: CONFIG, key: "counterRadius", min: 0, max: 1, step: 0.02, format: two, after: redraw },
      { kind: "range", label: "seam", obj: CONFIG, key: "cellSeam", min: 0, max: 3, step: 0.1, format: v => v.toFixed(1) + "px", after: redraw },
      { kind: "seg", label: "gap ends", obj: CONFIG, key: "cutStyle", options: [["auto", "auto"], ["hard", "hard"], ["soft", "soft"]], after: redraw },
      { kind: "button", text: "reset", action: () => {
        Object.assign(CONFIG, geometryDefaults);
        redraw();
        syncPanel();
      }},
    ]},
    { title: "Pointer", closed: true, controls: [
      { kind: "toggle", label: "push", key: "pointer" },
      { kind: "range", label: "reach", key: "reach", min: 80, max: 500, step: 10 },
    ]},
    // The accents, paletteColor2 / 3 in grid-type.js: the hover colours and
    // the flashes in flip and glitch. Read live, so no redraw. The type itself
    // is always solid ink.
    { title: "Colour", controls: [
      { kind: "color", label: "accent 1", obj: CONFIG, key: "paletteColor2" },
      { kind: "color", label: "accent 2", obj: CONFIG, key: "paletteColor3" },
      { kind: "button", text: "reset", action: () => {
        Object.assign(CONFIG, accentDefaults);
        syncPanel();
      }},
      // the site's own light / dark switch, the moon in the navbar
      { kind: "custom", render: renderTheme },
    ]},
  ];

  const panel = $("#type-panel");
  const chevron = '<svg class="chev" width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 8 10 13 15 8"/></svg>';
  const ICON_PAUSE = '<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="3" width="4" height="14" rx="1.2"/><rect x="12" y="3" width="4" height="14" rx="1.2"/></svg>';
  const ICON_PLAY = '<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 5 3.5z"/></svg>';

  panel.innerHTML =
    '<div class="panel-head">' +
      '<span class="panel-title">jonelliot</span>' +
      '<span class="panel-now"></span>' +
      '<button class="icon-btn" data-act="play" type="button" title="Play / pause"></button>' +
      '<button class="icon-btn" data-act="collapse" type="button" title="Collapse">' +
        chevron.replace('width="10" height="10"', 'width="12" height="12"') + '</button>' +
    '</div>' +
    '<div class="panel-body"></div>';
  const body = panel.querySelector(".panel-body");
  const playBtn = panel.querySelector('[data-act="play"]');
  const nowPlaying = panel.querySelector(".panel-now");
  const syncers = [];
  const sceneRows = new Map();   // scene -> its row in the list
  let shownScene = null;

  playBtn.addEventListener("click", () => setPlaying(!state.playing));
  const setCollapsed = v => panel.classList.toggle("collapsed", v);
  panel.querySelector('[data-act="collapse"]').addEventListener("click", () =>
    setCollapsed(!panel.classList.contains("collapsed")));

  PANEL.forEach(sec => {
    const el = document.createElement("div");
    el.className = "sec" + (sec.closed ? " closed" : "");
    const head = document.createElement("button");
    head.type = "button";
    head.className = "sec-head";
    head.innerHTML = "<span>" + sec.title + "</span>" + chevron;
    head.addEventListener("click", () => el.classList.toggle("closed"));
    const inner = document.createElement("div");
    inner.className = "sec-body";
    sec.controls.forEach(c => inner.appendChild(control(c)));
    el.append(head, inner);
    body.appendChild(el);
  });

  function control(c) {
    const row = document.createElement("div");
    row.className = "row";
    const obj = c.obj || state;
    const changed = () => { if (c.after) c.after(); syncPanel(); };
    if (c.label) {
      const lab = document.createElement("label");
      lab.textContent = c.label;
      row.appendChild(lab);
    }
    if (c.kind === "seg") {
      const seg = document.createElement("div");
      seg.className = "seg";
      const btns = c.options.map(([value, text]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = text;
        b.addEventListener("click", () => { obj[c.key] = value; changed(); });
        seg.appendChild(b);
        return [value, b];
      });
      syncers.push(() => btns.forEach(([v, b]) => b.classList.toggle("on", obj[c.key] === v)));
      row.appendChild(seg);
    } else if (c.kind === "range") {
      const range = document.createElement("input");
      range.type = "range";
      range.min = c.min; range.max = c.max; range.step = c.step;
      range.setAttribute("aria-label", c.label);
      const val = document.createElement("span");
      val.className = "val";
      const fmt = c.format || (v => String(v));
      range.addEventListener("input", () => { obj[c.key] = parseFloat(range.value); changed(); });
      syncers.push(() => { range.value = obj[c.key]; val.textContent = fmt(obj[c.key]); });
      row.append(range, val);
    } else if (c.kind === "color") {
      const pick = document.createElement("input");
      pick.type = "color";
      pick.setAttribute("aria-label", c.label);
      const val = document.createElement("span");
      val.className = "val";
      pick.addEventListener("input", () => { obj[c.key] = pick.value; changed(); });
      syncers.push(() => { pick.value = obj[c.key]; val.textContent = obj[c.key]; });
      row.append(pick, val);
    } else if (c.kind === "toggle") {
      const box = document.createElement("input");
      box.type = "checkbox";
      box.setAttribute("aria-label", c.label);
      box.addEventListener("change", () => { obj[c.key] = box.checked; changed(); });
      syncers.push(() => { box.checked = !!obj[c.key]; });
      row.appendChild(box);
    } else if (c.kind === "button") {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = c.text;
      b.addEventListener("click", c.action);
      row.appendChild(b);
    } else if (c.kind === "custom") {
      c.render(row);
    }
    return row;
  }

  // The scene list: click a name to play it, tick it to keep it in the loop.
  // Parked scenes are listed too, unticked, until they're ticked.
  function renderSceneList(host) {
    host.style.display = "block";
    hero.scenes.forEach(s => {
      const row = document.createElement("div");
      row.className = "scene";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.title = "In the loop";
      box.setAttribute("aria-label", s.name + " in the loop");
      box.addEventListener("change", () => { state.loop[s.name] = box.checked; syncPanel(); });
      const name = document.createElement("button");
      name.type = "button";
      name.className = "name";
      name.textContent = s.name;
      name.addEventListener("click", () => playScene(s.name));
      const tag = document.createElement("span");
      tag.className = "tag";
      const bar = document.createElement("span");
      bar.className = "bar";
      row.append(box, name, tag, bar);
      host.appendChild(row);
      sceneRows.set(s, { row, box, tag, bar });
    });
    syncers.push(() => sceneRows.forEach(({ row, box, tag }, s) => {
      box.checked = !!state.loop[s.name];
      row.classList.toggle("parked", !state.loop[s.name]);
      tag.textContent = state.loop[s.name] ? "" : "parked";
    }));
  }

  function renderTheme(host) {
    const lab = document.createElement("label");
    lab.textContent = "theme";
    const seg = document.createElement("div");
    seg.className = "seg";
    const btns = [["light", false], ["dark", true]].map(([text, dark]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.addEventListener("click", () => {
        if (isDark() !== dark) document.getElementById("dark-mode-toggle")?.click();
      });
      seg.appendChild(b);
      return [dark, b];
    });
    syncers.push(() => btns.forEach(([dark, b]) => b.classList.toggle("on", isDark() === dark)));
    host.append(lab, seg);
  }
  new MutationObserver(() => syncPanel()).observe(document.body, { attributes: true, attributeFilter: ["class"] });

  function syncPanel() {
    syncers.forEach(f => f());
    playBtn.innerHTML = state.playing ? ICON_PAUSE : ICON_PLAY;
    updatePanel();
  }

  // every frame: which scene is on, and how far through it is
  function updatePanel() {
    if (!sceneRows.size) return;
    const current = hero.current;
    if (shownScene !== current) {
      sceneRows.forEach(({ row }, s) => row.classList.toggle("on", s === current));
      nowPlaying.textContent = current.name;
      shownScene = current;
    }
    const r = sceneRows.get(current);
    if (r) r.bar.style.transform = "scaleX(" + hero.progress().toFixed(3) + ")";
  }

  // ============================================================
  // START
  // ============================================================
  // collapsed to start with on phones, where it sits between the name and the rest
  setCollapsed(phone.matches);
  phone.addEventListener("change", e => setCollapsed(e.matches));
  syncPanel();
})();
