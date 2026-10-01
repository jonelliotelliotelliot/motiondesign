// jonelliot-logo.js — the animated JON / ELL / IOT header logo. The scenes,
// timeline and pointer push are the motion engine in grid-motion.js; this
// only sets the header's own options. The loop plays in a fresh random order
// on every visit, and modules near the cursor take on the palette colours.
// Needs grid-type.js and grid-motion.js loaded first. Exposes window.jonelliotLogo.
(function () {
  "use strict";

  const svg = document.getElementById("jonelliot-logo");
  if (!svg || !window.GridMotion) return;

  window.jonelliotLogo = window.GridMotion.create(svg, {
    host: svg.closest(".header") || svg.parentNode,
    shuffle: true,
  });
})();
