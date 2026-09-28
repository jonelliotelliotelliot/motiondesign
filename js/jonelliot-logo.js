// jonelliot-logo.js — the animated JON / ELL / IOT header logo.
// Ported from grid-type/jonelliot.html: the stacked layout only, no control
// panel, always solid. The scenes and pointer push are the same code; the
// loop plays in a fresh random order on every visit, and modules near the
// cursor take on the palette colours.
// Needs grid-type.js loaded first. Exposes window.jonelliotLogo.
(function () {
  "use strict";

  const svg = document.getElementById("jonelliot-logo");
  if (!svg || !window.GridType) return;

  const { CONFIG, glyphSVG, S } = window.GridType;
  const SVGNS = "http://www.w3.org/2000/svg";
  const host = svg.closest(".header") || svg.parentNode;

  const LINES = ["JON", "ELL", "IOT"];

  const state = {
    spacing: 14,           // gap between letters and lines, svg units (a cell is 100)
    playing: true,
    mode: "loop",
    speed: 1,
    gap: 2,             // seconds the name rests between scenes
    pointer: true,
    reach: 230,            // svg units
    tint: 420,             // svg units — how far the hover palette reaches
    puzzle: "forward",
  };

  let modules = [];
  let L = null;   // current layout: { cols, rows, width, height, pitch, line, gap }

  // The "gooey" filter — see jonelliot.html
  let inkGroup = null, gooBlur = null, gooOn = false;
  function gooFilter() {
    const defs = document.createElementNS(SVGNS, "defs");
    defs.innerHTML =
      '<filter id="goo" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB" ' +
      'x="' + -S + '" y="' + -S + '" width="' + (L.width + 2 * S) + '" height="' + (L.height + 2 * S) + '">' +
        '<feGaussianBlur in="SourceGraphic" stdDeviation="0"/>' +
        '<feColorMatrix mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 36 -14"/>' +
      '</filter>';
    gooBlur = defs.querySelector("feGaussianBlur");
    return defs;
  }

  function setGoo(blur) {
    if (blur < 0.3) {
      if (gooOn) { inkGroup.removeAttribute("filter"); gooOn = false; }
      return;
    }
    gooBlur.setAttribute("stdDeviation", blur.toFixed(2));
    if (!gooOn) { inkGroup.setAttribute("filter", "url(#goo)"); gooOn = true; }
  }

  // The accents are the palette in grid-type.js (CONFIG.paletteColor2 / 3):
  // the hover colours, and the flashes in a couple of scenes. The ink comes
  // from --ink on .header in style.css, since it flips with dark mode.
  function colour(name) {
    if (name === "--accent1") return CONFIG.paletteColor2;
    if (name === "--accent2") return CONFIG.paletteColor3;
    return getComputedStyle(host).getPropertyValue(name).trim();
  }

  function build() {
    const perLine = LINES[0].length;
    const gap = state.spacing;
    L = {
      name: "stack", gap,
      cols: perLine * 3,
      rows: LINES.length * 3,
      pitch: 3 * S + gap,
      line: 3 * S + gap,
    };
    L.width = perLine * L.pitch - gap;
    L.height = LINES.length * L.line - gap;
    svg.setAttribute("viewBox", "0 0 " + L.width + " " + L.height);
    svg.innerHTML = "";
    const keepPush = new Map(modules.map(m => [m.key, m.push]));
    modules = [];

    svg.appendChild(gooFilter());
    inkGroup = document.createElementNS(SVGNS, "g");
    svg.appendChild(inkGroup);
    gooOn = false;

    CONFIG.colourMode = "solid";
    CONFIG.glyphColor = colour("--ink");

    LINES.forEach((word, line) => {
      [...word].forEach((ch, i) => {
        const letter = line * perLine + i;
        const glyph = glyphSVG(ch, { showGrid: false });
        const wrap = document.createElementNS(SVGNS, "g");
        const ox = i * L.pitch, oy = line * L.line;
        wrap.setAttribute("transform", "translate(" + ox + " " + oy + ")");
        while (glyph.firstChild) wrap.appendChild(glyph.firstChild);
        inkGroup.appendChild(wrap);

        wrap.querySelectorAll("[data-index]").forEach(el => {
          const col = +el.dataset.col, row = +el.dataset.row;
          const gx = i * 3 + col, gy = line * 3 + row;
          const key = letter + ":" + el.dataset.index;
          const rnd = seeded(letter * 97 + +el.dataset.index * 13 + 5);
          modules.push({
            el, key, col, row, gx, gy, letter, id: modules.length,
            cx: (col + 0.5) * S, cy: (row + 0.5) * S,
            wx: ox + (col + 0.5) * S, wy: oy + (row + 0.5) * S,
            r1: rnd(), r2: rnd(), r3: rnd(), r4: rnd(), r5: rnd(),
            push: keepPush.get(key) || { x: 0, y: 0, rot: 0, s: 0 },
            base: el.getAttribute("fill"),
            fill: null,
          });
        });
      });
    });
    // a paused logo still needs one frame to show the new colours at rest
    if (!running) draw();
  }

  // Seeded PRNG (mulberry32).
  function seeded(n) {
    let t = (n * 2654435761) >>> 0;
    return () => {
      t = (t + 0x6D2B79F5) >>> 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  // one stateless random number from a few integers — for effects that need
  // a fresh roll every tick but the same roll for the same tick
  function roll(a, b, c) {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // ---------- easing ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutBack = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;

  // Position of a module sitting at grid column u / grid row v (fractional
  // mid-slide). Inside a letter the cells are a cell apart; stepping into the
  // next letter (or line) also crosses the gap, eased in over the last cell so
  // a slide stays continuous.
  function slot(u, gap) {
    const letter = Math.floor(u / 3);
    const inLetter = u - letter * 3;
    return u * S + letter * gap + Math.max(0, inLetter - 2) * gap;
  }

  // A conveyor along one axis: shift the module by `shift` slots through a
  // loop one slot longer than the grid (so the wrap has somewhere to hide),
  // shrinking out at the far end and growing back in at the near one.
  function conveyor(pos, count, shift) {
    const LOOP = count + 1;
    let u = pos + shift;
    u = ((u + 0.5) % LOOP + LOOP) % LOOP - 0.5;               // wrap into [-0.5, LOOP - 0.5)
    const s = u > count - 1 ? clamp(1 - (u - (count - 1)) / 1.5) : u < 0 ? clamp((u + 0.5) / 0.5) : 1;
    return { d: slot(u, L.gap) - slot(pos, L.gap), s };
  }

  // ============================================================
  // SCENES — each is a duration plus a function from (local time, module) to
  // that module's pose: an offset, a rotation, a scale on each axis (scaling
  // through zero is a flip), an opacity and optionally a colour. A scene may
  // also have start(), called each time it begins, and goo(t), the blur for
  // the gooey filter over the whole name. Every scene starts and ends on the
  // name at rest, except drop (starts faded) and fall (ends
  // faded). `loop: false` parks a scene: it stays in the list but out of the loop.
  // ============================================================
  const REST = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, o: 1 };
  const PUZZLE_TICK = 0.3;                     // puzzle: seconds per move
  const GOO_LENGTH = 5.2;                      // goo: seconds

  const SCENES = [
    {
      name: "breathe",
      // a travelling wave: modules shrink toward dots and lift as it passes, so
      // the name dissolves into a dotted grid and swells back
      duration: 4.2,
      pose(t, m) {
        const env = Math.sin(Math.PI * clamp(t / 4.2));
        const phase = t * Math.PI * 2 * 0.75 - m.gx * 0.38 - m.gy * 0.55;
        const k = 0.5 + 0.5 * Math.sin(phase);
        const s = 1 - env * 0.62 * k;
        return { dx: 0, dy: -env * 26 * Math.sin(phase + 0.9), rot: 0, sx: s, sy: s, o: 1 };
      },
    },
    {
      name: "ripple",
      // breathe, radially: rings spread out from the centre of the name, and
      // each module shrinks and turns a quarter as a ring passes through it
      duration: 4.0,
      pose(t, m) {
        const env = Math.sin(Math.PI * clamp(t / 4.0));
        const dx = m.wx - L.width / 2, dy = m.wy - L.height / 2;
        const d = Math.hypot(dx, dy) / Math.hypot(L.width / 2, L.height / 2);   // 0 centre .. 1 corner
        let k = 0;
        for (let ring = 0; ring < 3; ring++) {
          const pos = (t - ring * 0.9) * 0.55;              // where this ring has reached
          k = Math.max(k, Math.exp(-Math.pow((d - pos) / 0.09, 2)));
        }
        k *= env;
        const s = 1 - 0.7 * k;
        return { dx: 0, dy: 0, rot: k * 90, sx: s, sy: s, o: 1 };
      },
    },
    {
      name: "goo",
      // metaballs: the name melts into round dots joined by liquid necks. The
      // gooey filter (see gooFilter) fades in as every module shrinks toward a
      // dot, then a wave runs through — where it swells the dots, they fuse
      // with their neighbours into molecule-like chains; where it shrinks them,
      // the necks pinch and they part into single dots. Then it all firms back
      // up into the crisp letters.
      duration: GOO_LENGTH,
      goo(t) { return 18 * gooEnv(t); },
      pose(t, m) {
        const env = gooEnv(t);
        const phase = t * 3.4 - m.gx * 0.55 - m.gy * 0.8;
        const size = 0.52 + 0.38 * (0.5 + 0.5 * Math.sin(phase));   // 0.52 apart .. 0.9 fused
        const s = 1 - env * (1 - size);
        return { dx: 0, dy: 0, rot: 0, sx: s, sy: s, o: 1 };
      },
    },
    {
      name: "flip",
      // every module is a card: one sweep turns them over sideways to show a
      // coral back, a second sweep turns them over top to bottom to show teal
      duration: 4.4,
      pose(t, m) {
        const fx = m.gx / L.cols, fy = m.gy / L.rows;
        const d1 = fx * 1.45 + fy * 0.35;
        const d2 = 1.7 + (1 - fx) * 1.45 + (1 - fy) * 0.35;
        const a1 = easeInOutSine(clamp((t - d1) / 1.1)) * Math.PI * 2;
        const a2 = easeInOutSine(clamp((t - d2) / 1.1)) * Math.PI * 2;
        const sx = Math.cos(a1), sy = Math.cos(a2);
        const fill = sx < 0 ? "--accent1" : sy < 0 ? "--accent2" : null;
        return { dx: 0, dy: 0, rot: 0, sx, sy, o: 1, fill };
      },
    },
    {
      name: "puzzle",
      // a sliding-tile puzzle. Small rings of cells — 2x2 up to 4x3, each
      // holding at least one empty cell — are marked out across the name, and
      // the modules on each ring shuffle forward into its gaps, a step at a
      // time. Solve "forward" keeps every ring turning the same way until a
      // full lap brings each module home; "reverse" turns halfway, then plays
      // the same moves backwards. Either way the scene lasts as long as the
      // moves take at a steady pace, rather than squeezing them into a set time.
      get duration() { return puzzlePlan().ticks * PUZZLE_TICK; },
      start() { puzzleSeed = Math.floor(Math.random() * 1e9); puzzleFor = null; },
      pose(t, m) {
        const plan = puzzlePlan();
        const path = plan.paths.get(m.id);
        if (!path) return REST;                              // not on a ring — sits still
        let p = clamp(t / (plan.ticks * PUZZLE_TICK));
        if (state.puzzle === "reverse") p = p < 0.5 ? p : 1 - p;
        const q = p * (path.length - 1);
        const k = Math.min(Math.floor(q), path.length - 2);
        const f = easeInOutCubic(clamp((q - k) / 0.7));
        const x = path[k][0] + (path[k + 1][0] - path[k][0]) * f;
        const y = path[k][1] + (path[k + 1][1] - path[k][1]) * f;
        return {
          dx: slot(x, L.gap) - slot(m.gx, L.gap),
          dy: slot(y, L.gap) - slot(m.gy, L.gap),
          rot: 0, sx: 1, sy: 1, o: 1,
        };
      },
    },
    {
      name: "glitch",
      // a corrupted signal, in three bursts: whole rows of modules tear
      // sideways, letters jolt, single modules drop out, mirror or flash colour.
      // Everything is re-rolled on a fixed tick, so it stutters rather than glides.
      duration: 3.2,
      pose(t, m) {
        const burst = b => Math.max(0, 1 - Math.abs(t - b) / 0.32);
        const I = Math.max(burst(0.45), burst(1.35) * 0.7, burst(2.4));
        if (I <= 0) return REST;
        const tick = Math.floor(t * 16);
        let dx = 0, dy = 0, sx = 1, o = 1, fill = null;
        // row tear: every module in the row takes the same shove
        if (roll(tick, m.gy, 1) < 0.4 * I) dx = Math.round((roll(tick, m.gy, 2) - 0.5) * 6) * 40 * I;
        // letter jolt
        if (roll(tick, m.letter, 3) < 0.18 * I) dy = (roll(tick, m.letter, 4) < 0.5 ? -1 : 1) * 22;
        // single-module damage
        const r = roll(tick, m.id, 5);
        if (r < 0.07 * I) o = 0;
        else if (r < 0.16 * I) fill = roll(tick, m.id, 6) < 0.5 ? "--accent1" : "--accent2";
        else if (r < 0.22 * I) sx = -1;
        return { dx, dy, rot: 0, sx, sy: 1, o, fill };
      },
    },
    {
      name: "conveyor",
      // each row of the grid slides the full length of its line — rows in
      // opposite directions — so the letters shear apart into bands and click
      // back together
      duration: 4.0,
      pose(t, m) {
        const dir = m.gy % 2 ? -1 : 1;
        const p = easeInOutCubic(clamp((t - (m.gy % 3) * 0.18) / 3.5));
        const c = conveyor(m.gx, L.cols, dir * (L.cols + 1) * p);
        return { dx: c.d, dy: 0, rot: 0, sx: c.s, sy: c.s, o: 1 };
      },
    },
    {
      name: "conveyor ↕",
      // the conveyor on its side: each column slides the full height of the
      // layout, neighbours in opposite directions — in the stacked layout a
      // column runs through all three lines
      duration: 4.0,
      pose(t, m) {
        const dir = m.gx % 2 ? -1 : 1;
        const p = easeInOutCubic(clamp((t - (m.gx % 3) * 0.14) / 3.5));
        const c = conveyor(m.gy, L.rows, dir * (L.rows + 1) * p);
        return { dx: 0, dy: c.d, rot: 0, sx: c.s, sy: c.s, o: 1 };
      },
    },
    {
      name: "organise",
      // random to organised: the name bursts into a loose heap of turned
      // modules, idles there, then each module files back to its cell — across
      // first, then down — and straightens up as it lands. Modules keep their
      // size throughout.
      duration: 5.0,
      pose(t, m) {
        // its spot in the heap: within a letter and a half of home, and never
        // outside the type block
        const hx = clamp(m.wx + (m.r2 - 0.5) * 2 * 4.5 * S, S / 2, L.width - S / 2);
        const hy = clamp(m.wy + (m.r3 - 0.5) * 2 * 1.4 * S, S / 2, L.height - S / 2);
        const tx = hx - m.wx, ty = hy - m.wy;
        const turn = [-180, -90, 90, 180][Math.floor(m.r4 * 4)];
        const out = easeOutCubic(clamp((t - m.r5 * 0.2) / 0.6));
        const drift = Math.sin(t * 2.2 + m.r1 * 6.28) * 6;
        const start = 1.5 + m.r1 * 1.6;
        const px = easeInOutCubic(clamp((t - start) / 0.55));
        const py = easeInOutCubic(clamp((t - start - 0.45) / 0.55));
        const pr = easeInOutCubic(clamp((t - start - 0.7) / 0.4));
        return {
          dx: tx * out * (1 - px),
          dy: (ty + drift) * out * (1 - py),
          rot: turn * out * (1 - pr),
          sx: 1, sy: 1, o: 1,
        };
      },
    },

    // ---------- parked ----------
    {
      name: "raindrops", loop: false,
      // ripple, rained on: drops land on random modules one after another, and
      // square rings — the grid's own idea of a circle — spread from each.
      // Where a ring passes, modules shrink and turn a quarter, as in ripple.
      // Three drops, well spaced, with slow rings.
      duration: 7.0,
      pose(t, m) {
        const drops = raindrops();
        let k = 0;
        drops.forEach(d => {
          if (t < d.t) return;
          const age = t - d.t;
          const dist = Math.max(Math.abs(m.gx - d.gx), Math.abs(m.gy - d.gy));
          const front = age * 5.5;                             // modules per second
          k = Math.max(k, Math.exp(-Math.pow((dist - front) / 0.9, 2)) * Math.exp(-age * 0.3));
        });
        k *= clamp((7.0 - t) / 0.8);                           // settle before the end
        const s = 1 - 0.7 * k;
        return { dx: 0, dy: 0, rot: k * 90, sx: s, sy: s, o: 1 };
      },
    },
    {
      name: "tumble", loop: false,
      // scrambled to unscrambled, in the plane: every module spins — some one
      // way, some the other — and lands a quarter, half or three-quarter turn
      // out, so the name scrambles into a jumble of its own parts. Then, one
      // by one from the left, each spins on round to upright and the name
      // resolves.
      duration: 5.6,
      pose(t, m) {
        const dir = m.r3 < 0.5 ? -1 : 1;
        const off = 90 * (1 + Math.floor(m.r4 * 3));             // 90, 180 or 270 out
        // scramble: a full turn plus the offset, staggered over 0 .. 1.4s
        const a = easeInOutCubic(clamp((t - m.r1 * 0.45) / 1.0));
        // unscramble: sweeps across the name from 2.4s, the rest of the way to two full turns
        const start = 2.4 + (m.gx / L.cols) * 1.5 + (m.gy / L.rows) * 0.35 + m.r2 * 0.2;
        const b = easeInOutCubic(clamp((t - start) / 0.85));
        const rot = dir * ((360 + off) * a + (360 - off) * b);
        return { dx: 0, dy: 0, rot, sx: 1, sy: 1, o: 1 };
      },
    },
    {
      name: "gears", loop: false,
      // every letter turns like a gear: the eight cells round its edge step
      // round the ring one place at a time — tick, tick — for a full turn,
      // while the middle cell spins on the spot. Neighbouring letters turn
      // opposite ways, like meshed gears. Mid-turn the name is scrambled; after
      // eight ticks every cell is home.
      duration: 3.8,
      pose(t, m) {
        const lineLen = L.cols / 3;
        const col = m.letter % lineLen, line = Math.floor(m.letter / lineLen);
        const dir = (col + line) % 2 ? -1 : 1;                  // checkerboard, so neighbours mesh
        const STEPS = 8, TICK = 3.6 / STEPS;
        const k = Math.min(STEPS, Math.floor(t / TICK));
        const pos = k >= STEPS ? STEPS : k + easeInOutCubic(clamp((t - k * TICK) / (TICK * 0.7)));
        const home = RING.findIndex(([c, r]) => c === m.col && r === m.row);
        if (home < 0) return { dx: 0, dy: 0, rot: dir * 45 * pos, sx: 1, sy: 1, o: 1 };   // the hub
        const u = ((home + dir * pos) % STEPS + STEPS) % STEPS;
        const i0 = Math.floor(u), f = u - i0;
        const [c0, r0] = RING[i0], [c1, r1] = RING[(i0 + 1) % STEPS];
        const c = c0 + (c1 - c0) * f, r = r0 + (r1 - r0) * f;
        return { dx: (c - m.col) * S, dy: (r - m.row) * S, rot: 0, sx: 1, sy: 1, o: 1 };
      },
    },
    {
      name: "drop", loop: false,
      // modules drop in from a couple of letter-heights up, left to right,
      // appearing quickly at the top of their fall and landing with a small bounce
      duration: 2.4,
      pose(t, m) {
        const delay = (m.gx / L.cols) * 1.0 + (m.gy / L.rows) * 0.3 + m.r1 * 0.25;
        const p = clamp((t - delay) / 0.75);
        const e = easeOutBack(p);
        return {
          dx: 0, dy: -(220 + m.r2 * 260) * (1 - e),
          rot: (1 - p) * (m.r3 - 0.5) * 200,
          sx: 1, sy: 1, o: clamp(p * 7),                     // in within the first moments
        };
      },
    },
    {
      name: "fall", loop: false,
      // gravity: each module is knocked loose, pops up and tumbles a short way
      // down at full strength, then fades out quickly at the end of its fall
      duration: 2.2,
      pose(t, m) {
        const tt = Math.max(0, t - m.r1 * 1.0);
        return {
          dx: (m.r2 - 0.5) * 260 * tt,
          dy: -140 * tt + 0.5 * 1500 * tt * tt,
          rot: (m.r3 - 0.5) * 420 * tt,
          sx: 1, sy: 1,
          o: clamp((0.95 - tt) / 0.2),                       // solid until the last 0.2s
        };
      },
    },
  ];
  SCENES.forEach(s => { if (s.loop === undefined) s.loop = true; });

  // goo: how far into the effect we are — eases in over the first 0.7s and
  // out over the last
  const gooEnv = t => easeInOutSine(clamp(t / 0.7)) * easeInOutSine(clamp((GOO_LENGTH - t) / 0.7));

  // The eight edge cells of a 3x3 letter, clockwise from the top-left, as
  // [col, row] — the track the gears scene moves them round.
  const RING = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1]];

  // The puzzle, worked out afresh each time the scene starts (new seed). Rings are placed at random
  // without overlapping; a ring only counts if it holds at least one module
  // and at least one gap, and no more than two modules per gap — a crowded
  // ring needs many more moves to get round, which drags the scene out. Each ring then
  // runs forward one tick at a time — every module with a gap in front of it
  // steps into it — until each of its modules has gone exactly once round, at
  // which point they are all home. Short rings go round more than once (an
  // odd number of laps, so they're mid-lap, scrambled, at the halfway pause)
  // to keep roughly the tempo of the long ones. Returns { paths: module id ->
  // the cells it visits, one per tick; ticks: the longest ring's lap }.
  let puzzleFor = null, puzzleCache = null, puzzleSeed = 1;
  function puzzlePlan() {
    if (puzzleFor === L) return puzzleCache;
    const rnd = seeded(puzzleSeed);
    const occ = Array.from({ length: L.rows }, () => Array(L.cols).fill(-1));
    modules.forEach(m => { occ[m.gy][m.gx] = m.id; });
    const used = Array.from({ length: L.rows }, () => Array(L.cols).fill(false));

    const rings = [];
    for (let tries = 0; tries < 4000; tries++) {
      const w = 2 + Math.floor(rnd() * 3), h = 2 + Math.floor(rnd() * 2);
      const x = Math.floor(rnd() * (L.cols - w + 1)), y = Math.floor(rnd() * (L.rows - h + 1));
      if (x < 0 || y < 0) continue;
      const cells = ringCells(x, y, w, h);
      if (cells.some(([a, b]) => used[b][a])) continue;
      const mods = cells.filter(([a, b]) => occ[b][a] >= 0).length;
      const gaps = cells.length - mods;
      if (!gaps || !mods || mods / gaps > 2) continue;
      cells.forEach(([a, b]) => { used[b][a] = true; });
      if (rnd() < 0.5) cells.reverse();                    // half the rings run anticlockwise
      rings.push(cells);
    }

    // one lap of each ring, as a list of states (which module is in each cell)
    const laps = rings.map(cells => {
      const n = cells.length;
      let state = cells.map(([a, b]) => occ[b][a]);
      const moved = new Map(state.filter(id => id >= 0).map(id => [id, 0]));
      const states = [state];
      while ([...moved.values()].some(v => v < n)) {
        const next = state.slice();
        for (let i = 0; i < n; i++) {
          const id = state[i], j = (i + 1) % n;
          if (id >= 0 && state[j] < 0 && moved.get(id) < n) {
            next[j] = id; next[i] = -1;
            moved.set(id, moved.get(id) + 1);
          }
        }
        state = next;
        states.push(state);
      }
      return states;
    });
    const longest = Math.max(1, ...laps.map(st => st.length - 1));

    const paths = new Map();
    rings.forEach((cells, r) => {
      const lap = laps[r], ticks = lap.length - 1;
      let count = Math.max(1, Math.round(longest / ticks));
      if (count % 2 === 0) count += 1;
      const states = [lap[0]];
      for (let c = 0; c < count; c++) states.push(...lap.slice(1));
      lap[0].forEach(id => {
        if (id < 0) return;
        paths.set(id, states.map(st => cells[st.indexOf(id)]));
      });
    });
    puzzleFor = L; puzzleCache = { paths, ticks: longest };
    return puzzleCache;
  }

  // The cells round the edge of a w x h rectangle, clockwise from its top-left
  // — consecutive cells are always neighbours, and so are the last and first.
  function ringCells(x, y, w, h) {
    const c = [];
    for (let i = 0; i < w; i++) c.push([x + i, y]);
    for (let j = 1; j < h; j++) c.push([x + w - 1, y + j]);
    for (let i = w - 2; i >= 0; i--) c.push([x + i, y + h - 1]);
    for (let j = h - 2; j >= 1; j--) c.push([x, y + j]);
    return c;
  }

  // Where and when the raindrops land — fixed for a given layout, so the
  // scene plays the same every time.
  let dropsFor = null, dropsCache = null;
  function raindrops() {
    if (dropsFor === L) return dropsCache;
    const rnd = seeded(L.cols * 31 + L.rows);
    dropsCache = [0.2, 1.9, 3.6].map(t => ({
      t, gx: Math.floor(rnd() * L.cols), gy: Math.floor(rnd() * L.rows),
    }));
    dropsFor = L;
    return dropsCache;
  }

  // ============================================================
  // TIMELINE — the scenes in the loop, each followed by a rest of state.gap
  // ============================================================
  // The loop plays in a shuffled order, reshuffled each time round, so no two
  // visits run the same sequence (and a scene never plays twice in a row).
  let order = [];
  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function nextScene() {
    if (!order.length) {
      order = shuffled(looped());
      if (order.length > 1 && order[0] === current) order.push(order.shift());
    }
    return order.shift() || SCENES[0];
  }

  let current = SCENES[0];      // the scene playing
  let local = 0;                // seconds into it (its rest included)

  const looped = () => SCENES.filter(s => s.loop);
  const span = s => s.duration + state.gap;

  function advance(dt) {
    local += dt;
    if (local < span(current)) return;
    local -= span(current);
    if (state.mode === "repeat") { if (current.start) current.start(); return; }
    if (!looped().length) return;
    current = nextScene();
    if (current.start) current.start();
  }




  // ============================================================
  // POINTER — modules near the cursor (or finger) are shoved away, shrink
  // and twist a little, then spring back. Tracked over the whole header so
  // the push starts before the cursor reaches the letters.
  // ============================================================
  const pointer = { x: -1e6, y: -1e6, active: false };

  function toSvg(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  host.addEventListener("pointermove", e => {
    const p = toSvg(e);
    pointer.x = p.x; pointer.y = p.y; pointer.active = true;
    wake();
  });
  window.addEventListener("pointerup", e => { if (e.pointerType !== "mouse") pointer.active = false; });
  window.addEventListener("pointercancel", () => { pointer.active = false; });
  host.addEventListener("pointerleave", () => { pointer.active = false; });

  function pointerPush(m, pose) {
    let tx = 0, ty = 0, tr = 0, ts = 0;
    if (state.pointer && pointer.active) {
      const vx = m.wx + pose.dx - pointer.x, vy = m.wy + pose.dy - pointer.y;
      const d = Math.hypot(vx, vy);
      if (d < state.reach) {
        const f = Math.pow(1 - d / state.reach, 2);
        const n = d || 1;
        tx = vx / n * f * 140;
        ty = vy / n * f * 140;
        tr = (m.r4 - 0.5) * 2 * f * 90;
        ts = f * 0.45;
      }
    }
    const k = 0.16;
    m.push.x += (tx - m.push.x) * k;
    m.push.y += (ty - m.push.y) * k;
    m.push.rot += (tr - m.push.rot) * k;
    m.push.s += (ts - m.push.s) * k;
    return m.push;
  }

  // ============================================================
  // FRAME — runs only while there's something to animate: the loop is
  // playing, or the pointer push is still springing back. Stops when the
  // header is scrolled out of view.
  // ============================================================
  let last = performance.now();
  let running = false, visible = true;
  const n = v => Math.round(v * 100) / 100;

  // one frame; returns whether anything is still moving
  function draw() {
    const t = Math.min(local, current.duration);
    const inRest = local >= current.duration;
    let moving = false;
    modules.forEach(m => {
      const pose = inRest && current.name !== "fall" ? REST : current.pose(t, m);
      const push = pointerPush(m, pose);
      if (Math.abs(push.x) + Math.abs(push.y) + Math.abs(push.rot) + push.s > 0.01) moving = true;
      const dx = pose.dx + push.x, dy = pose.dy + push.y;
      const sx = pose.sx * (1 - push.s), sy = pose.sy * (1 - push.s);
      m.el.setAttribute("transform",
        "translate(" + n(dx + m.cx) + " " + n(dy + m.cy) + ") rotate(" + n(pose.rot + push.rot) + ") " +
        "scale(" + n(sx) + " " + n(sy) + ") translate(" + -m.cx + " " + -m.cy + ")");
      m.el.setAttribute("opacity", n(pose.o));
      const hover = hoverFill(m, pose);
      if (m.heat > 0.01) moving = true;
      const fill = pose.fill || hover || null;
      if (fill !== m.fill) {
        m.el.setAttribute("fill", fill ? colour(fill) : m.base);
        m.fill = fill;
      }
    });
    setGoo(!inRest && current.goo ? current.goo(t) : 0);
    return moving || pointer.active;
  }

  // Palette on hover: the closer a module is to the cursor, the further it
  // runs through the palette — accent1 nearest, then accent2, ink beyond.
  // Eased like the push, so the colours follow the cursor and fade back.
  function hoverFill(m, pose) {
    let target = 0;
    if (state.pointer && pointer.active) {
      const d = Math.hypot(m.wx + pose.dx - pointer.x, m.wy + pose.dy - pointer.y);
      target = clamp(1 - d / state.tint);   // 1 right under the cursor … 0 at the edge
    }
    m.heat = (m.heat || 0) + (target - (m.heat || 0)) * 0.16;
    return m.heat > 0.6 ? "--accent1" : m.heat > 0.3 ? "--accent2" : null;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.playing) advance(dt * state.speed);
    const moving = draw();
    if (visible && (state.playing || moving)) requestAnimationFrame(frame);
    else running = false;
  }

  function wake() {
    if (running || !visible) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); })
      .observe(svg);
  }

  // dark mode is a class on <body> — rebuild with the new ink when it flips
  new MutationObserver(build).observe(document.body, { attributes: true, attributeFilter: ["class"] });

  // ============================================================
  // START
  // ============================================================
  function setPlaying(v) {
    state.playing = v;
    if (!v) { local = current.duration; draw(); }   // settle on the name at rest
    else wake();
  }

  build();
  current = nextScene();
  if (current.start) current.start();
  // honour reduced motion: start on the name at rest, paused
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  else wake();

  window.jonelliotLogo = { setPlaying, rebuild: build };
})();
