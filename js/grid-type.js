// grid-type.js — the grid typeface: glyph data, geometry and the SVG renderer.
// Shared by alphabet.html (the specimen) and jonelliot.html (the animation).
// Everything a page needs is on window.GridType; CONFIG is live, so a page can
// change a value and redraw.
(function () {
  "use strict";

  // ============================================================
  // CONFIG — tweak these to change how the numerals draw.
  // ============================================================
  const CONFIG = {
    // ---- geometry ----
    // Corner radius for a "lone" rounded corner, in cells. 1 = a full quarter-disc
    // spanning the whole cell. Two rounded corners sharing an edge automatically
    // clamp to half the edge, which is what turns a stroke end into a semicircle.
    cornerRadius: 1,
    // The tighter corner some letters use to tell themselves apart (D's back,
    // Q's tail), as a fraction of cornerRadius.
    accentRadius: 0.5,
    // Width of the hairline that separates two touching-but-unjoined cells, in cells.
    gapWidth: 0.02,
    // A cut walled in at both ends is a counter slot rather than a notch biting
    // in from outside (the 6, 8 and 9), so it gets its own weight and its own
    // corner radius instead of being a hairline.
    counterWidth: 0.2,    // thickness of a counter, in cells
    counterRadius: 0,     // roundness of a counter's corners, 0 = square, 1 = fully round
    // Override how every cut is drawn, ignoring what the glyph data asks for.
    //   auto — obey each cut's own hard/soft flag (see GLYPH DATA below)
    //   hard — every gap is a constant-width slit
    //   soft — every gap rounds the stroke ends it exposes
    cutStyle: "auto",

    // Hairline between every cell, not just where the letterform calls for one —
    // the whole grid shows through as tiling. At 0 the cells overlap by a hair
    // instead, so joined material reads as one solid mass.
    cellSeam: 0.02,          // in cells

    // How the diagonal strokes (K R V X) are cut into modules.
    //   steps — one capsule per step between two cell centres; a step crosses
    //           cell boundaries, so these letters sit loose on the grid
    //   cells — the same strokes sliced along the grid lines, so every module
    //           lives inside exactly one of the nine cells, like every other letter
    strokeModules: "cells",

    // ---- specimen layout ----
    glyphSize: 150,     // rendered height of one glyph, px
    tracking: 0,      // space between glyphs when setting a string, in cells
    showGrid: false,    // Figma-style 3x3 guides behind each glyph
    showDefs: false,    // print each glyph's cell map + cuts underneath

    // ---- colour ----
    colourMode: "solid",       // solid | palette | gradient
    pageBackgroundColor: "#ffffff",
    glyphColor: "#000000",
    paletteColor1: "#000000",
    paletteColor2: "#2eb7a2",
    paletteColor3: "#5078fd",
    paletteColor4: "#ffffff",

    // paletteColor2: "#ff5a5f",
    // paletteColor3: "#1c4b56",

    // ---- random gradients ----
    // Every cell gets its own gradient at its own angle. The colours come from a
    // seeded random walk through hue, so a given seed always paints the same
    // face — nudge the seed for a different set, and nothing else moves.
    gradientSeed: 7,
    gradientStops: 3,         // up to this many colours per cell (never fewer than 2)
    gradientSaturation: 88,   // %
    gradientLightness: 66,    // %
    gradientHueStep: 110,     // how far hue can travel between one stop and the next
  };

  // ============================================================
  // GLYPH DATA — the actual typeface.
  //
  // cells: three rows of three, "#" = filled, "." = empty.
  // cuts:  hairlines that sever two filled cells that would otherwise be one
  //        continuous piece of stroke.
  //          "h0:01" = horizontal cut between row 0 and row 1, at columns 0 and 1
  //          "v1:02" = vertical cut between col 1 and col 2, at rows 0 and 2
  //        ":" is a HARD cut — the two edges stay square, so the gap is a
  //        constant-width slit driven into the silhouette (the 4 does this).
  //        A hard cut walled in by joined material at both ends becomes a
  //        counter slot instead (the 6, 8, A, B, P).
  //        "~" is a SOFT cut — the exposed stroke ends round off, so the gap
  //        flares into a notch where it reaches open air (the 2, 3, E, M ...).
  //        A soft cut stays a hairline even when it is walled in, which is how
  //        the G's middle bar gets a rounded end inside the letter.
  // strokes: diagonals. Each is a path through cell centres, written as
  //        row+col pairs: "02-11-22" runs from row 0 col 2, through the middle,
  //        to row 2 col 2 (the K). The stroke is one cell wide with round ends,
  //        and every step between two centres is its own module, so where two
  //        steps meet they overlap into a round join. Steps of one cell each
  //        way give the 45-degree stroke; other steps are allowed too.
  // accent: corners drawn at CONFIG.accentRadius instead of the full radius —
  //        a tighter corner that defines a letter without breaking the family.
  //          "20bl" = row 2, col 0, bottom-left corner
  //        D and B take it on their backs (so they aren't O and 8), Q on its tail.
  //
  // The letters, and the logic behind the less obvious ones:
  //   E / F      the 3, mirrored — soft cuts entering from the right
  //   M / W      the same move turned on its side: soft cuts driven up (M) or
  //              down (W) between three stems
  //   A / P      a counter slot where the 8 and 9 have theirs
  //   B          the 8 with a tightened back, like D
  //   G          the 6, with its middle bar cut free of the stem and ending in
  //              a rounded cap; the bowl it hangs from curves down on the right
  //   D / Q      O with a tightened back / tail corner
  //   K X        built from 45-degree strokes; K's chevron just touches its stem
  //   R          P, with a 45-degree leg
  //   V          stems that turn 45 degrees into a round point
  //   Y          a cup on a stem — the rounded corners make the fork
  //   S / Z      share the 5 and 2 silhouettes
  // ============================================================
  const LETTERS = {
    "A": { cells: ["###", "###", "#.#"], cuts: ["h0:1"] },
    "B": { cells: ["###", "###", "###"], cuts: ["h0:1", "h1:1"], accent: ["00tl", "20bl"] },
    "C": { cells: ["###", "#..", "###"], cuts: [] },
    "D": { cells: ["###", "#.#", "###"], cuts: [], accent: ["00tl", "20bl"] },
    "E": { cells: ["###", "###", "###"], cuts: ["h0~12", "h1~12"] },
    "F": { cells: ["###", "###", "#.."], cuts: ["h0~12"] },
    "G": { cells: ["###", "###", "###"], cuts: ["h0~12", "h1~1", "v0~1"] },
    "H": { cells: ["#.#", "###", "#.#"], cuts: [] },
    "I": { cells: ["###", ".#.", "###"], cuts: [] },
    "J": { cells: ["..#", "#.#", "###"], cuts: [] },
    "K": { cells: ["#..", "#..", "#.."], cuts: [], strokes: ["02-11-22"] },
    "L": { cells: ["#..", "#..", "###"], cuts: [] },
    "M": { cells: ["###", "###", "###"], cuts: ["v0~12", "v1~12"] },
    "N": { cells: ["###", "#.#", "#.#"], cuts: [] },
    "O": { cells: ["###", "#.#", "###"], cuts: [] },
    "P": { cells: ["###", "###", "#.."], cuts: ["h0:1"] },
    "Q": { cells: ["###", "#.#", "###"], cuts: [], accent: ["22br"] },
    "R": { cells: ["###", "###", "#.."], cuts: ["h0:1"], strokes: ["11-22"] },
    "S": { cells: ["###", "###", "###"], cuts: ["h0~12", "h1~01"] },
    "T": { cells: ["###", ".#.", ".#."], cuts: [] },
    "U": { cells: ["#.#", "#.#", "###"], cuts: [] },
    "V": { cells: ["...", "...", "..."], cuts: [], strokes: ["00-10-21", "02-12-21"] },
    "W": { cells: ["###", "###", "###"], cuts: ["v0~01", "v1~01"] },
    "X": { cells: ["...", "...", "..."], cuts: [], strokes: ["00-11-22", "02-11-20"] },
    "Y": { cells: ["#.#", "###", ".#."], cuts: [] },
    "Z": { cells: ["###", "###", "###"], cuts: ["h0~01", "h1~12"] },
  };

  // The numerals, unchanged from numerals.html, so strings can mix the two.
  const DIGITS = {
    "0": { cells: ["###", "#.#", "###"], cuts: [] },
    "1": { cells: ["##.", ".#.", "###"], cuts: [] },
    "2": { cells: ["###", "###", "###"], cuts: ["h0~01", "h1~12"] },
    "3": { cells: ["###", "###", "###"], cuts: ["h0~01", "h1~01"] },
    "4": { cells: ["#.#", "###", "..#"], cuts: [] },
    "5": { cells: ["###", "###", "###"], cuts: ["h0~12", "h1~01"] },
    "6": { cells: ["###", "###", "###"], cuts: ["h0~12", "h1:1"] },
    "7": { cells: ["###", "..#", "..#"], cuts: [] },
    "8": { cells: ["###", "###", "###"], cuts: ["h0:1", "h1:1"] },
    "9": { cells: ["###", "###", "###"], cuts: ["h0:1", "h1~01"] },
  };

  const GLYPHS = Object.assign({}, LETTERS, DIGITS);

  const S = 100;        // internal cell size; a 3x3 glyph's viewBox is 300x300
  const SEAM = 1.5;     // cells are separate paths, so joined edges overlap by a
                        // hair — otherwise antialiasing leaves a seam down the
                        // middle of what should read as solid material. It is
                        // in cell units (a cell is 100), so it has to be big
                        // enough to cover a pixel when the type is set small.
                        // A joined edge is always square on both sides, so the
                        // overlap never shows in the silhouette.

  // ---------- glyph model ----------

  const grid = (rows, cols, v) => Array.from({ length: rows }, () => Array(cols).fill(v));

  // Expand a definition into filled[][], the two cut lattices and the list of
  // stroke steps.
  // cutH[b][c] — cut between row b and row b+1, in column c
  // cutV[b][r] — cut between col b and col b+1, in row r
  function parseGlyph(ch) {
    const def = GLYPHS[ch];
    const filled = def.cells.map(row => row.split("").map(c => c === "#"));
    const H = filled.length, W = filled[0].length;
    const cutH = grid(H - 1, W, false), softH = grid(H - 1, W, false);
    const cutV = grid(W - 1, H, false), softV = grid(W - 1, H, false);
    (def.cuts || []).forEach(spec => {
      const m = /^([hv])(\d)([:~])(\d+)$/.exec(spec.trim());
      if (!m) return;
      const horiz = m[1] === "h";
      const table = horiz ? cutH : cutV;
      const soft = horiz ? softH : softV;
      if (!table[+m[2]]) return;
      m[4].split("").forEach(i => {
        if (+i >= table[+m[2]].length) return;
        table[+m[2]][+i] = true;
        soft[+m[2]][+i] = (m[3] === "~");
      });
    });
    // "02-11-22" -> steps [{r0:0,c0:2,r1:1,c1:1}, {r0:1,c0:1,r1:2,c1:2}]
    const steps = [];
    (def.strokes || []).forEach(spec => {
      const pts = spec.trim().split("-").map(p => ({ r: +p[0], c: +p[1] }));
      for (let i = 1; i < pts.length; i++) {
        steps.push({ r0: pts[i - 1].r, c0: pts[i - 1].c, r1: pts[i].r, c1: pts[i].c });
      }
    });
    const accent = new Set((def.accent || []).map(s => s.trim()));
    return { filled, H, W, cutH, cutV, softH, softV, steps, accent, def };
  }

  // Does this particular cut round the stroke ends it exposes?
  function isSoft(flag) {
    if (CONFIG.cutStyle === "hard") return false;
    if (CONFIG.cutStyle === "soft") return true;
    return !!flag;
  }

  // Measure every cut, and decide which ones are counters.
  //
  // A hard cut walled in by joined material at both ends reads as an enclosed
  // counter; one that runs out to open air (or any soft cut) is a notch. Notches are made by
  // insetting the cells either side of them. Counters are not — they are
  // punched out of the finished glyph instead (see below), so the cells they
  // pass between stay joined and the counter carries its own radius.
  function cutMetrics(g) {
    const { H, W } = g;
    const F = (c, r) => (r >= 0 && r < H && c >= 0 && c < W) && g.filled[r][c];
    const gap = CONFIG.gapWidth * S;
    const cw = CONFIG.counterWidth * S;

    const gapH = grid(H - 1, W, 0);   // gapH[b][c] — notch between rows b and b+1
    const gapV = grid(W - 1, H, 0);   // gapV[b][r] — notch between cols b and b+1
    const counters = [];              // shapes to punch out of the glyph

    // horizontal cuts: walk each row boundary looking for runs of cut columns
    for (let b = 0; b < H - 1; b++) {
      let i = 0;
      while (i < W) {
        if (!(g.cutH[b][i] && F(i, b) && F(i, b + 1))) { i++; continue; }
        let last = i;
        while (last + 1 < W && g.cutH[b][last + 1] && F(last + 1, b) && F(last + 1, b + 1)) last++;
        const counter = !g.softH[b][i] &&
                        (i > 0 && F(i - 1, b) && F(i - 1, b + 1)) &&
                        (last < W - 1 && F(last + 1, b) && F(last + 1, b + 1));
        if (counter) {
          counters.push({ x: i * S, y: (b + 1) * S - cw / 2, w: (last - i + 1) * S, h: cw });
        } else {
          for (let j = i; j <= last; j++) gapH[b][j] = gap;
        }
        i = last + 1;
      }
    }

    // vertical cuts: the same walk with the axes swapped
    for (let b = 0; b < W - 1; b++) {
      let i = 0;
      while (i < H) {
        if (!(g.cutV[b][i] && F(b, i) && F(b + 1, i))) { i++; continue; }
        let last = i;
        while (last + 1 < H && g.cutV[b][last + 1] && F(b, last + 1) && F(b + 1, last + 1)) last++;
        const counter = !g.softV[b][i] &&
                        (i > 0 && F(b, i - 1) && F(b + 1, i - 1)) &&
                        (last < H - 1 && F(b, last + 1) && F(b + 1, last + 1));
        if (counter) {
          counters.push({ x: (b + 1) * S - cw / 2, y: i * S, w: cw, h: (last - i + 1) * S });
        } else {
          for (let j = i; j <= last; j++) gapV[b][j] = gap;
        }
        i = last + 1;
      }
    }

    return { gapH, gapV, counters };
  }

  // Build the drawable shape for every cell of a glyph, plus the counters to be
  // punched out of it.
  function glyphShapes(ch) {
    const g = parseGlyph(ch);
    const { H, W } = g;
    const m = cutMetrics(g);
    const F = (c, r) => (r >= 0 && r < H && c >= 0 && c < W) && g.filled[r][c];

    const cutTop    = (c, r) => r > 0 && F(c, r - 1) && m.gapH[r - 1][c] > 0;
    const cutBottom = (c, r) => r < H - 1 && F(c, r + 1) && m.gapH[r][c] > 0;
    const cutLeft   = (c, r) => c > 0 && F(c - 1, r) && m.gapV[c - 1][r] > 0;
    const cutRight  = (c, r) => c < W - 1 && F(c + 1, r) && m.gapV[c][r] > 0;

    // Which edges of a cell are open. A notched edge only counts as open when
    // the cut is soft; otherwise it stays square and the gap reads as a slit.
    const freeTop    = (c, r) => !F(c, r - 1) || (cutTop(c, r)    && isSoft(g.softH[r - 1][c]));
    const freeBottom = (c, r) => !F(c, r + 1) || (cutBottom(c, r) && isSoft(g.softH[r][c]));
    const freeLeft   = (c, r) => !F(c - 1, r) || (cutLeft(c, r)   && isSoft(g.softV[c - 1][r]));
    const freeRight  = (c, r) => !F(c + 1, r) || (cutRight(c, r)  && isSoft(g.softV[c][r]));

    // An empty cell walled in on all four sides is a counter too — the 0. It is
    // drawn as solid material and then punched, because rounding a hole's
    // corners means ADDING material at them, which no amount of corner radius
    // on the surrounding cells can do.
    const isCounterCell = (c, r) => !F(c, r) &&
      F(c - 1, r) && F(c + 1, r) && F(c, r - 1) && F(c, r + 1);

    const solid = (c, r) => F(c, r) || isCounterCell(c, r);
    const counters = m.counters.slice();
    const R = CONFIG.cornerRadius * S;
    const radius = (c, r, corner) =>
      g.accent.has("" + r + c + corner) ? CONFIG.accentRadius * R : R;
    const shapes = [];

    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        if (!solid(c, r)) continue;
        if (isCounterCell(c, r)) counters.push({ x: c * S, y: r * S, w: S, h: S });

        // Pull the cell back off any edge it shares with an unjoined neighbour,
        // and push it out over any edge it shares with a joined one. A joined
        // edge always has square corners, so the overlap can never alter the
        // silhouette.
        const join = CONFIG.cellSeam > 0 ? CONFIG.cellSeam * S / 2 : -SEAM;
        const iT = cutTop(c, r)    ? m.gapH[r - 1][c] / 2 : (solid(c, r - 1) ? join : 0);
        const iB = cutBottom(c, r) ? m.gapH[r][c] / 2     : (solid(c, r + 1) ? join : 0);
        const iL = cutLeft(c, r)   ? m.gapV[c - 1][r] / 2 : (solid(c - 1, r) ? join : 0);
        const iR = cutRight(c, r)  ? m.gapV[c][r] / 2     : (solid(c + 1, r) ? join : 0);

        const x = c * S + iL, y = r * S + iT;
        const w = S - iL - iR, h = S - iT - iB;

        // a corner rounds only where both of its edges are open
        let tl = (freeTop(c, r)    && freeLeft(c, r))  ? radius(c, r, "tl") : 0;
        let tr = (freeTop(c, r)    && freeRight(c, r)) ? radius(c, r, "tr") : 0;
        let br = (freeBottom(c, r) && freeRight(c, r)) ? radius(c, r, "br") : 0;
        let bl = (freeBottom(c, r) && freeLeft(c, r))  ? radius(c, r, "bl") : 0;

        // two radii sharing an edge cannot outrun it — this is what collapses a
        // full-cell radius down to a semicircular cap on a stroke end
        const fit = (a, b, len) => (a + b > len && a + b > 0) ? len / (a + b) : 1;
        for (let pass = 0; pass < 2; pass++) {
          let k;
          k = fit(tl, tr, w); tl *= k; tr *= k;
          k = fit(bl, br, w); bl *= k; br *= k;
          k = fit(tl, bl, h); tl *= k; bl *= k;
          k = fit(tr, br, h); tr *= k; br *= k;
        }

        shapes.push({ col: c, row: r, d: roundedPath(x, y, w, h, tl, tr, br, bl) });
      }
    }

    // Stroke steps: a one-cell-wide capsule between two cell centres. Where
    // steps meet, their round ends overlap exactly, which gives the round join.
    const steps = g.steps.map(st => {
      const x0 = (st.c0 + 0.5) * S, y0 = (st.r0 + 0.5) * S;
      const x1 = (st.c1 + 0.5) * S, y1 = (st.r1 + 0.5) * S;
      return { col: st.c0, row: st.r0, to: "" + st.r1 + st.c1,
               x0, y0, x1, y1, d: capsulePath(x0, y0, x1, y1, S / 2) };
    });

    // every counter gets the same roundness, from square to fully round
    const punches = counters.map(k => uniformPath(
      k.x, k.y, k.w, k.h, CONFIG.counterRadius * Math.min(k.w, k.h) / 2
    ));

    return { shapes, steps, punches, W, H };
  }

  // Does a capsule step cover any of cell (c, r)? Walk the centre line and
  // measure to the cell's square — a stroke that only grazes an edge (the K's
  // chevron tip against its stem) doesn't count.
  function stepTouches(st, c, r) {
    const x0 = c * S, y0 = r * S, x1 = x0 + S, y1 = y0 + S;
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const px = st.x0 + (st.x1 - st.x0) * t, py = st.y0 + (st.y1 - st.y0) * t;
      const dx = Math.max(x0 - px, 0, px - x1), dy = Math.max(y0 - py, 0, py - y1);
      if (Math.hypot(dx, dy) < S / 2 - 0.5) return true;
    }
    return false;
  }

  // A straight stroke from (x0,y0) to (x1,y1), radius r either side of the
  // line, with a semicircular cap on each end.
  function capsulePath(x0, y0, x1, y1, r) {
    const n = v => Math.round(v * 1000) / 1000;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = -(y1 - y0) / len * r, ny = (x1 - x0) / len * r;
    return [
      "M", n(x0 + nx), n(y0 + ny),
      "L", n(x1 + nx), n(y1 + ny),
      "A", n(r), n(r), 0, 0, 0, n(x1 - nx), n(y1 - ny),
      "L", n(x0 - nx), n(y0 - ny),
      "A", n(r), n(r), 0, 0, 0, n(x0 + nx), n(y0 + ny),
      "Z"
    ].join(" ");
  }

  // Rounded rectangle with four independent corner radii. A zero radius is a
  // plain corner — SVG draws a zero-radius arc as a line, so no special case.
  function roundedPath(x, y, w, h, tl, tr, br, bl) {
    const n = v => Math.round(v * 1000) / 1000;
    return [
      "M", n(x + tl), n(y),
      "L", n(x + w - tr), n(y),
      "A", n(tr), n(tr), 0, 0, 1, n(x + w), n(y + tr),
      "L", n(x + w), n(y + h - br),
      "A", n(br), n(br), 0, 0, 1, n(x + w - br), n(y + h),
      "L", n(x + bl), n(y + h),
      "A", n(bl), n(bl), 0, 0, 1, n(x), n(y + h - bl),
      "L", n(x), n(y + tl),
      "A", n(tl), n(tl), 0, 0, 1, n(x + tl), n(y),
      "Z"
    ].join(" ");
  }

  // Rounded rectangle with one radius on all four corners.
  function uniformPath(x, y, w, h, r) {
    const k = Math.min(r, w / 2, h / 2);
    return roundedPath(x, y, w, h, k, k, k, k);
  }

  // ---------- rendering ----------

  const SVGNS = "http://www.w3.org/2000/svg";
  let uid = 0;   // mask ids have to be unique across every glyph on the page

  // Small seeded PRNG (mulberry32). Randomness has to be reproducible: the same
  // digit must paint the same way wherever it appears, and a redraw after moving
  // an unrelated slider must not reshuffle the colours.
  function rng(seed) {
    let t = seed >>> 0;
    return () => {
      t = (t + 0x6D2B79F5) >>> 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  // One gradient per cell, keyed on the digit and the cell's place in its grid.
  function cellGradient(ch, c, r, defs, box) {
    const rand = rng((CONFIG.gradientSeed * 9176 + ch.charCodeAt(0) * 313 + c * 37 + r * 7) >>> 0);
    const id = "grad-" + (++uid);

    const grad = document.createElementNS(SVGNS, "linearGradient");
    grad.setAttribute("id", id);
    // any angle, expressed across the cell's own bounding box
    const a = rand() * Math.PI * 2;
    // a tile is a group of clipped pieces, so it can't use its own bounding
    // box — it's handed the cell's square instead
    const bx = box ? box.x : 0, by = box ? box.y : 0;
    const bw = box ? box.w : 1, bh = box ? box.h : 1;
    if (box) grad.setAttribute("gradientUnits", "userSpaceOnUse");
    grad.setAttribute("x1", (bx + bw * (0.5 - Math.cos(a) / 2)).toFixed(4));
    grad.setAttribute("y1", (by + bh * (0.5 - Math.sin(a) / 2)).toFixed(4));
    grad.setAttribute("x2", (bx + bw * (0.5 + Math.cos(a) / 2)).toFixed(4));
    grad.setAttribute("y2", (by + bh * (0.5 + Math.sin(a) / 2)).toFixed(4));

    // a random walk through hue, rather than independent colours — neighbouring
    // stops stay related enough to blend without turning to mud
    const n = 2 + Math.floor(rand() * Math.max(1, CONFIG.gradientStops - 1));
    let hue = rand() * 360;
    for (let i = 0; i < n; i++) {
      const stop = document.createElementNS(SVGNS, "stop");
      stop.setAttribute("offset", (i / (n - 1) * 100).toFixed(1) + "%");
      const light = CONFIG.gradientLightness + (rand() - 0.5) * 26;
      stop.setAttribute("stop-color",
        "hsl(" + hue.toFixed(1) + " " + CONFIG.gradientSaturation + "% " +
        Math.max(8, Math.min(92, light)).toFixed(1) + "%)");
      grad.appendChild(stop);
      hue = (hue + (rand() - 0.5) * 2 * CONFIG.gradientHueStep + 360) % 360;
    }

    defs.appendChild(grad);
    return "url(#" + id + ")";
  }

  function cellFill(ch, c, r, defs, box) {
    if (CONFIG.colourMode === "gradient") return cellGradient(ch, c, r, defs, box);
    if (CONFIG.colourMode === "palette") {
      const pal = [CONFIG.paletteColor1, CONFIG.paletteColor2, CONFIG.paletteColor3, CONFIG.paletteColor4];
      return pal[(c + r * 2 + ch.charCodeAt(0)) % pal.length];
    }
    return CONFIG.glyphColor;
  }

  function glyphSVG(ch, opts) {
    opts = opts || {};
    const modules = opts.modules || CONFIG.strokeModules;
    const showGrid = opts.showGrid !== undefined ? opts.showGrid : CONFIG.showGrid;
    const { shapes, steps, punches, W, H } = glyphShapes(ch);
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "glyph");
    svg.setAttribute("viewBox", "0 0 " + (W * S) + " " + (H * S));
    svg.setAttribute("height", CONFIG.glyphSize);
    svg.setAttribute("width", CONFIG.glyphSize * W / H);
    svg.dataset.glyph = ch;

    if (showGrid) {
      const guides = document.createElementNS(SVGNS, "g");
      guides.setAttribute("stroke", "#4A9EFF");
      guides.setAttribute("stroke-width", 1.5);
      guides.setAttribute("opacity", 0.7);
      for (let i = 0; i <= W; i++) {
        const v = document.createElementNS(SVGNS, "line");
        v.setAttribute("x1", i * S); v.setAttribute("y1", 0);
        v.setAttribute("x2", i * S); v.setAttribute("y2", H * S);
        guides.appendChild(v);
      }
      for (let i = 0; i <= H; i++) {
        const hLine = document.createElementNS(SVGNS, "line");
        hLine.setAttribute("x1", 0); hLine.setAttribute("y1", i * S);
        hLine.setAttribute("x2", W * S); hLine.setAttribute("y2", i * S);
        guides.appendChild(hLine);
      }
      svg.appendChild(guides);
    }

    const defs = document.createElementNS(SVGNS, "defs");
    svg.appendChild(defs);

    // Counters are punched out with a mask rather than being drawn into any one
    // cell — a counter can straddle two cells, and a hole cannot be rounded by
    // the shapes around it. The mask goes on every module rather than on the
    // glyph as a whole: a mask lives in the coordinates of the element using
    // it, so when a module is moved its share of the counter moves with it.
    const group = document.createElementNS(SVGNS, "g");
    let maskRef = null;
    if (punches.length) {
      const id = "counters-" + (++uid);
      const mask = document.createElementNS(SVGNS, "mask");
      mask.setAttribute("id", id);
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      mask.setAttribute("x", -S); mask.setAttribute("y", -S);
      mask.setAttribute("width", W * S + 2 * S);
      mask.setAttribute("height", H * S + 2 * S);
      const keep = document.createElementNS(SVGNS, "rect");
      keep.setAttribute("x", -S); keep.setAttribute("y", -S);
      keep.setAttribute("width", W * S + 2 * S);
      keep.setAttribute("height", H * S + 2 * S);
      keep.setAttribute("fill", "#fff");
      mask.appendChild(keep);
      punches.forEach(d => {
        const hole = document.createElementNS(SVGNS, "path");
        hole.setAttribute("d", d);
        hole.setAttribute("fill", "#000");
        mask.appendChild(hole);
      });
      defs.appendChild(mask);
      maskRef = "url(#" + id + ")";
    }

    // In "cells" mode every cell a stroke passes through becomes a tile: that
    // cell's own square (if it has one) plus every stroke that reaches into
    // it, clipped to the cell. Each tile is one element, confined to its cell.
    const tiles = new Map();          // "r,c" -> { col, row, steps: [], cell }
    if (modules === "cells") {
      steps.forEach(st => {
        for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
          if (!stepTouches(st, c, r)) continue;
          const key = r + "," + c;
          if (!tiles.has(key)) tiles.set(key, { col: c, row: r, steps: [] });
          tiles.get(key).steps.push(st);
        }
      });
    }

    let index = 0;
    // hooks for whatever comes next — per-cell colour, stagger, transforms
    const tag = (el, col, row) => {
      el.dataset.glyph = ch;
      el.dataset.col = col;
      el.dataset.row = row;
      el.dataset.index = index++;
      if (maskRef) el.setAttribute("mask", maskRef);
    };

    shapes.forEach(shape => {
      const tile = tiles.get(shape.row + "," + shape.col);
      if (tile) { tile.cell = shape; return; }   // drawn inside its tile instead
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("class", "cell");
      p.setAttribute("d", shape.d);
      p.setAttribute("fill", cellFill(ch, shape.col, shape.row, defs));
      tag(p, shape.col, shape.row);
      group.appendChild(p);
    });

    if (modules === "cells") {
      tiles.forEach(tile => {
        const { col: c, row: r } = tile;
        // interior edges are pushed out by a hair (or pulled in, to show the
        // seam) exactly as the square cells are; the glyph's outer edges stay put
        const join = CONFIG.cellSeam > 0 ? CONFIG.cellSeam * S / 2 : -SEAM;
        const iL = c > 0 ? join : 0, iR = c < W - 1 ? join : 0;
        const iT = r > 0 ? join : 0, iB = r < H - 1 ? join : 0;
        const box = { x: c * S + iL, y: r * S + iT, w: S - iL - iR, h: S - iT - iB };

        const clip = document.createElementNS(SVGNS, "clipPath");
        const clipId = "tile-" + (++uid);
        clip.setAttribute("id", clipId);
        const rect = document.createElementNS(SVGNS, "rect");
        rect.setAttribute("x", box.x); rect.setAttribute("y", box.y);
        rect.setAttribute("width", box.w); rect.setAttribute("height", box.h);
        clip.appendChild(rect);
        defs.appendChild(clip);

        const g = document.createElementNS(SVGNS, "g");
        g.setAttribute("class", "cell tile");
        g.setAttribute("clip-path", "url(#" + clipId + ")");
        g.setAttribute("fill", cellFill(ch, c, r, defs, box));
        if (tile.cell) {
          const p = document.createElementNS(SVGNS, "path");
          p.setAttribute("d", tile.cell.d);
          g.appendChild(p);
        }
        tile.steps.forEach(st => {
          const p = document.createElementNS(SVGNS, "path");
          p.setAttribute("d", st.d);
          g.appendChild(p);
        });
        tag(g, c, r);
        group.appendChild(g);
      });
    } else {
      steps.forEach(st => {
        const p = document.createElementNS(SVGNS, "path");
        p.setAttribute("class", "step");
        p.setAttribute("d", st.d);
        p.setAttribute("fill", cellFill(ch, st.col, st.row, defs));
        tag(p, st.col, st.row);
        p.dataset.to = st.to;     // a step runs from its row/col to this cell
        group.appendChild(p);
      });
    }
    svg.appendChild(group);

    return svg;
  }

  window.GridType = { CONFIG, LETTERS, DIGITS, GLYPHS, glyphSVG, S };
})();
