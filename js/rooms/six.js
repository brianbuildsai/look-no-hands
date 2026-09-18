/* Six — room 26.

   A snow crystal grown by Clifford Reiter's model (2005). The air is a
   hexagonal grid of cells, each holding an amount of water. A cell with a
   whole unit or more is ice. Every step:

     - ice, and the cells touching ice, are "receptive": whatever water they
       hold stays put, and a little more arrives from the air around;
     - everywhere else the water spreads out to its neighbours, a fraction at
       a time (diffusion);
     - the two are added back together.

   That is enough. Branches, plates and needles all come out of how quickly
   water arrives (cold) against how much there is (humidity), and a crystal
   that meets changing conditions as it grows keeps a record of each one in
   its shape, which is why no two are alike. Six-fold symmetry is not
   imposed; it is the grid's. */
(function () {
  'use strict';

  var ALPHA = 1.0;                 // how readily water spreads

  Gallery.register('six', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var R = 150, SIDE = 0, COUNT = 0;      // cells within R of the middle, in axial coordinates
    var water, spread, frozen, age, inside, ring, cells, fade;     // ring: how far each cell is from the middle; cells: the ones inside, listed
    var beta = 0.4, gamma = 0.001, steps = 0, ice = 0, reach = 0;
    var window = { w: 0, h: 0, x: 0, y: 0, cell: 1 }, lookup = null, image = null, pixels = null;
    var drifting = true, clock = 0, owed = 0, grown = false, seed = 26;
    function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

    /* ---- the crystal ---- */

    function at(q, r) { return (r + R) * SIDE + (q + R); }

    function lay() {
      R = size.w >= 900 ? 150 : 105;
      SIDE = 2 * R + 1; COUNT = SIDE * SIDE;
      water = new Float32Array(COUNT); spread = new Float32Array(COUNT);
      frozen = new Uint8Array(COUNT); age = new Uint16Array(COUNT); inside = new Uint8Array(COUNT);
      ring = new Uint8Array(COUNT);
      var list = [];
      for (var r = -R; r <= R; r++) for (var q = -R; q <= R; q++) {
        var s = -q - r, i = at(q, r);
        ring[i] = Math.min(255, Math.max(Math.abs(q), Math.abs(r), Math.abs(s)));
        inside[i] = Math.abs(s) <= R - 1 && Math.abs(q) <= R - 1 && Math.abs(r) <= R - 1 ? 1 : 0;
        if (inside[i]) list.push(i);
      }
      cells = new Int32Array(list);
      fade = new Float32Array(R + 2);
      for (var k = 0; k <= R + 1; k++) fade[k] = Math.pow(Math.max(0, 1 - k / R), 1.6);
      begin();
    }

    function begin() {
      water.fill(beta); frozen.fill(0); age.fill(0);
      water[at(0, 0)] = 1;
      frozen[at(0, 0)] = 1;
      steps = 0; ice = 1; reach = 0; grown = false; owed = 0;
      report();
      env.redraw();
    }

    function step() {
      var i, k, n = cells.length, edge = reach + 26;      // far from the crystal the air is untouched: no need to visit it yet
      // 1. which cells are receptive: ice, and anything touching ice. Their water stays; the rest of it will spread.
      for (k = 0; k < n; k++) {
        i = cells[k];
        if (ring[i] > edge) { spread[i] = water[i]; continue; }
        var receptive = frozen[i] || frozen[i + 1] || frozen[i - 1] || frozen[i + SIDE] || frozen[i - SIDE] || frozen[i + 1 - SIDE] || frozen[i - 1 + SIDE];
        if (receptive) { spread[i] = 0; water[i] += gamma; }       // held, and a little more arrives from the air
        else { spread[i] = water[i]; water[i] = 0; }
      }
      // 2. the loose water spreads: each cell moves toward the average of its six neighbours
      for (k = 0; k < n; k++) {
        i = cells[k];
        if (ring[i] > edge) continue;
        var around = (spread[i + 1] + spread[i - 1] + spread[i + SIDE] + spread[i - SIDE] + spread[i + 1 - SIDE] + spread[i - 1 + SIDE]) / 6;
        water[i] += spread[i] + (around - spread[i]) * ALPHA / 2;
      }
      // 3. anything holding a whole unit is ice
      for (k = 0; k < n; k++) {
        i = cells[k];
        if (frozen[i]) { if (age[i] < 65000) age[i]++; continue; }
        if (water[i] >= 1) { frozen[i] = 1; ice++; if (ring[i] > reach) reach = ring[i]; }
      }
      steps++;
      if (reach >= R - 3) grown = true;
    }

    function report() {
      env.live('ice', Gallery.formatCount(ice));
      env.live('steps', Gallery.formatCount(steps));
      env.live('humidity', beta.toFixed(2));
      env.live('cold', (gamma * 1000).toFixed(1));
    }

    /* ---- drawing ---- */

    // Every pixel of the square the crystal can fill is matched once to the hexagonal cell under it.
    function measure() {
      var wide = size.w >= 900, ratio = canvas.width / size.w;
      var radius = (wide ? Math.min(size.w * 0.31, size.h * 0.44) : Math.min(size.w * 0.46, size.h * 0.42)) * ratio;
      window.cell = radius / (R * 0.866);              // the distance between cell centres, in device pixels
      window.w = window.h = Math.ceil(radius * 2.1);
      window.x = Math.round((wide ? size.w * 0.645 : size.w * 0.5) * ratio - window.w / 2);
      window.y = Math.round((wide ? size.h * 0.515 : size.h * 0.5) * ratio - window.h / 2);
      image = pen.createImageData(window.w, window.h);
      pixels = new Uint32Array(image.data.buffer);
      lookup = new Int32Array(window.w * window.h);
      var hex = window.cell / 1.7320508;                // a hexagon's size: centre to corner
      for (var y = 0; y < window.h; y++) {
        for (var x = 0; x < window.w; x++) {
          var px = x - window.w / 2, py = y - window.h / 2;
          // pixel to fractional axial coordinates, then to the nearest cell (rounding in cube coordinates)
          var fq = (px * 0.57735 - py / 3) / hex, fr = (py * 2 / 3) / hex, fs = -fq - fr;
          var rq = Math.round(fq), rr = Math.round(fr), rs = Math.round(fs);
          var dq = Math.abs(rq - fq), dr = Math.abs(rr - fr), ds = Math.abs(rs - fs);
          if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
          var ok = Math.abs(rq) <= R && Math.abs(rr) <= R && Math.abs(rq + rr) <= R;
          lookup[y * window.w + x] = ok ? at(rq, rr) : -1;
        }
      }
    }

    // the colours of ice by age and of air by how much has been drunk from it, worked out once
    var iceLut = new Uint32Array(64), airLut = new Uint32Array(64);
    (function () {
      for (var k = 0; k < 64; k++) {
        var t = k / 63, r = 205 + 20 * (1 - t) - 25 * t, g = 220 + 20 * (1 - t) - 20 * t, b = 235 + 20 * (1 - t) - 12 * t;
        iceLut[k] = (255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r);
        var a = 34 * t * t;
        airLut[k] = (255 << 24) | (Math.round(a * 1.8) << 16) | (Math.round(a * 0.7) << 8) | Math.round(a * 0.25);
      }
    })();

    function render() {
      if (!image) return;
      pen.setTransform(1, 0, 0, 1, 0, 0);
      pen.clearRect(0, 0, canvas.width, canvas.height);
      var n = lookup.length, k, i, edge = reach + 26, scale = 63 / beta;
      for (k = 0; k < n; k++) {
        i = lookup[k];
        if (i < 0 || ring[i] > edge) { pixels[k] = 0; continue; }
        if (frozen[i]) { pixels[k] = iceLut[age[i] > 504 ? 63 : age[i] >> 3]; continue; }
        var drunk = (beta - water[i]) * scale * fade[ring[i]];       // and the air fades to black toward the edge of the grid
        pixels[k] = drunk <= 0 ? 0 : airLut[drunk > 63 ? 63 : drunk | 0];
      }
      pen.putImageData(image, window.x, window.y);
    }

    /* ---- wiring ---- */

    var humidityDial = env.room.querySelector('[data-six-humidity]'), coldDial = env.room.querySelector('[data-six-cold]');
    var humidityReadout = env.room.querySelector('[data-six-humidity-value]'), coldReadout = env.room.querySelector('[data-six-cold-value]');
    function readDials() {
      if (humidityDial) beta = Number(humidityDial.value) / 100;
      if (coldDial) gamma = Number(coldDial.value) / 10000;
      if (humidityReadout) humidityReadout.textContent = beta < 0.45 ? 'dry: needles and ferns' : beta < 0.7 ? 'moist: stars' : 'damp: plates';
      if (coldReadout) coldReadout.textContent = gamma < 0.002 ? 'bitter: slow and sharp' : gamma < 0.006 ? 'cold' : 'mild: fast and blunt';
      report();
    }
    function touched() { drifting = false; if (driftButton) driftButton.setAttribute('aria-pressed', 'false'); readDials(); }
    if (humidityDial) humidityDial.addEventListener('input', touched);
    if (coldDial) coldDial.addEventListener('input', touched);
    var again = env.room.querySelector('[data-six-again]');
    if (again) again.addEventListener('click', function () { seed = (Math.random() * 1e9) >>> 0; begin(); });
    var driftButton = env.room.querySelector('[data-six-drift]');
    if (driftButton) {
      driftButton.addEventListener('click', function () {
        drifting = !drifting;
        driftButton.setAttribute('aria-pressed', String(drifting));
      });
    }

    // Left alone, the weather changes as it grows: a real crystal falls through many kinds of air.
    function drift(dt) {
      if (!drifting) return;
      clock += dt;
      var b = 0.48 + 0.2 * Math.sin(clock * 0.31 + seed % 7) * Math.cos(clock * 0.13), g = 0.0014 + 0.0011 * Math.sin(clock * 0.47 + seed % 5);
      beta = Math.max(0.3, Math.min(0.8, b)); gamma = Math.max(0.0003, Math.min(0.006, g));
      if (humidityDial) humidityDial.value = Math.round(beta * 100);
      if (coldDial) coldDial.value = Math.round(gamma * 10000);
      if (steps % 20 === 0) readDials();
    }

    lay();
    readDials();

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wanted = size.w >= 900 ? 150 : 105;
        if (wanted !== R) lay();
        measure();
      },
      frame: function (time, dt) {
        drift(dt);
        if (grown) { owed += dt; if (owed > 4) { seed = (Math.random() * 1e9) >>> 0; begin(); } }
        else {
          // about a hundred and eighty steps a second, whatever the display's own rate
          owed = Math.min(6, owed + dt * 180);
          while (owed >= 1 && !grown) { owed -= 1; step(); }
          if (steps % 10 === 0) report();
        }
        render();
      },
      // With motion paused: grow the whole crystal at once and show it
      still: function () {
        if (!grown) { for (var i = 0; i < 4000 && !grown; i++) step(); report(); }
        render();
      }
    };


  });
})();
