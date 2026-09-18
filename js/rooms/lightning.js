/* Lightning — room 34.

   The dielectric breakdown model of Niemeyer, Pietronero and Wiesmann
   (1984). The cloud is at the top and the ground at the bottom, and between
   them the electric potential obeys Laplace's equation: every cell is the
   average of its neighbours. The discharge is a set of cells held at the
   cloud's potential. At each step one cell touching the discharge is added
   to it, chosen at random with probability proportional to the potential
   there raised to a power eta, so the strongest field ahead is the likeliest
   way forward. Eta near 1 gives a fluffy bush; near 3 or 4, lightning.

   The field is re-solved as the leader grows, a few sweeps of successive
   over-relaxation a frame, and when the leader touches the ground the
   channel that connects them lights, the sky flashes, and a new bolt
   gathers. A tap raises a lightning rod, a grounded spike the field bends
   toward. */
(function () {
  'use strict';

  Gallery.register('lightning', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var W = 96, H = 128, sky = { x: 0, y: 0, w: 1, h: 1 };
    var phi, state, parent, when, kids;             // potential; 0 free, 1 candidate, 2 discharge, 3 grounded; who each cell grew from; the step it grew; children per cell
    var candidates = [], steps = 0, branches = 0, strikes = 0, hit = -1, origin = -1, main = [];
    var eta = 2.5, flash = 0, pause = 0, showField = true, rods = [], perFrame = 5, seed = 34, fieldPixels = null, field = null, fieldPen = null;
    var FLASH_TIME = 1.1, PAUSE_TIME = 0.7;
    function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

    /* ---- the field ---- */

    // the potential falls back to a straight gradient from cloud to ground, with the rods held at ground
    function resetField() {
      for (var j = 0; j < H; j++) for (var i = 0; i < W; i++) {
        var k = j * W + i;
        if (state[k] === 3) phi[k] = 1;
        else if (j === 0) phi[k] = 0;
        else phi[k] = j / (H - 1);
      }
    }

    // a few sweeps of successive over-relaxation: every free cell moves toward the mean of its four neighbours
    function relax(sweeps) {
      var omega = 1.85, i, j, k, s;
      for (s = 0; s < sweeps; s++) {
        for (j = 1; j < H - 1; j++) {
          for (i = 0; i < W; i++) {
            k = j * W + i;
            if (state[k] >= 2) continue;
            var left = phi[i > 0 ? k - 1 : k + 1], right = phi[i < W - 1 ? k + 1 : k - 1];
            var mean = 0.25 * (left + right + phi[k - W] + phi[k + W]);
            phi[k] += omega * (mean - phi[k]);
          }
        }
      }
    }

    /* ---- the discharge ---- */

    function offer(k, from) {
      if (state[k] !== 0) return;
      state[k] = 1; parent[k] = from;
      candidates.push(k);
    }

    // a cell joins the discharge: its potential drops to the cloud's, its neighbours become candidates
    function join(k, from) {
      state[k] = 2; phi[k] = 0; parent[k] = from; when[k] = steps++;
      if (from >= 0) { kids[from]++; if (kids[from] === 2) branches++; }
      var i = k % W, j = (k - i) / W;
      var around = [i > 0 ? k - 1 : -1, i < W - 1 ? k + 1 : -1, j > 0 ? k - W : -1, j < H - 1 ? k + W : -1];
      for (var n = 0; n < 4; n++) {
        var m = around[n];
        if (m < 0) continue;
        if (state[m] === 3) { strike(k, m); return; }
        offer(m, k);
      }
    }

    // one step: choose among the candidates by potential to the power eta
    function grow() {
      if (!candidates.length) return false;
      var total = 0, n, k, w = new Float64Array(candidates.length);
      for (n = 0; n < candidates.length; n++) { k = candidates[n]; w[n] = Math.pow(Math.max(0, phi[k]), eta); total += w[n]; }
      if (total <= 0) return false;
      var r = random() * total, pick = candidates.length - 1;
      for (n = 0; n < candidates.length; n++) { r -= w[n]; if (r <= 0) { pick = n; break; } }
      k = candidates[pick];
      candidates[pick] = candidates[candidates.length - 1]; candidates.pop();
      join(k, parent[k]);
      return true;
    }

    // the leader has reached the ground: light the channel that connects them
    function strike(last, ground) {
      hit = ground; flash = FLASH_TIME; strikes++;
      main = [ground];
      for (var k = last, guard = 0; k >= 0 && guard++ < W * H; k = parent[k]) main.push(k);
      candidates = [];
      env.live('strikes', strikes);
    }

    function begin() {
      var k;
      for (k = 0; k < W * H; k++) if (state[k] !== 3) { state[k] = 0; kids[k] = 0; parent[k] = -1; }
      candidates = []; steps = 0; branches = 0; hit = -1; main = []; flash = 0;
      resetField();
      relax(30);
      origin = Math.floor(W * (0.2 + random() * 0.6));
      join(origin, -1);
    }

    // a lightning rod: a grounded spike from the ground up to where the visitor touched
    function raiseRod(i, j) {
      i = Math.max(0, Math.min(W - 1, i)); j = Math.max(2, Math.min(H - 2, j));
      rods.push({ i: i, j: j });
      if (rods.length > 3) {
        var old = rods.shift();
        for (var y = old.j; y < H - 1; y++) { var k = y * W + old.i; if (state[k] === 3) { state[k] = 0; phi[k] = y / (H - 1); } }
      }
      for (var y2 = j; y2 < H - 1; y2++) { var m = y2 * W + i; if (state[m] === 2) continue; if (state[m] === 1) { candidates.splice(candidates.indexOf(m), 1); } state[m] = 3; phi[m] = 1; }
    }

    /* ---- drawing ---- */

    function point(k) { var i = k % W, j = (k - i) / W; return { x: sky.x + (i + 0.5) * sky.w / W, y: sky.y + (j + 0.5) * sky.h / H }; }

    function drawField() {
      var i, j, k, band, other;
      for (j = 0; j < H; j++) {
        for (i = 0; i < W; i++) {
          k = j * W + i;
          band = Math.floor(phi[k] * 12);
          other = (i < W - 1 && Math.floor(phi[k + 1] * 12) !== band) || (j < H - 1 && Math.floor(phi[k + W] * 12) !== band);
          fieldPixels[k] = other ? (88 << 24) | (136 << 16) | (141 << 8) | 143 : 0;
        }
      }
      fieldPen.putImageData(fieldImage, 0, 0);
      pen.imageSmoothingEnabled = true;
      pen.drawImage(field, sky.x, sky.y, sky.w, sky.h);
    }

    function drawChannel(list, width, colour) {
      pen.lineWidth = width; pen.strokeStyle = colour;
      // the grid's staircase softened: the channel passes through the midpoints between cells
      pen.beginPath();
      var p, q;
      for (var n = 0; n < list.length; n++) {
        p = point(list[n]);
        if (!n) { pen.moveTo(p.x, p.y); continue; }
        q = point(list[n - 1]);
        pen.quadraticCurveTo(q.x, q.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
      }
      if (p) pen.lineTo(p.x, p.y);
      pen.stroke();
    }

    function draw() {
      var ratio = canvas.width / size.w;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);
      if (showField) drawField();
      // the ground, and the rods standing on it
      pen.lineCap = 'round';
      pen.lineWidth = 1;
      pen.strokeStyle = 'rgba(233,230,223,0.35)';
      pen.beginPath(); pen.moveTo(sky.x, sky.y + sky.h + 0.5); pen.lineTo(sky.x + sky.w, sky.y + sky.h + 0.5); pen.stroke();
      pen.strokeStyle = 'rgba(61,91,255,0.9)';
      pen.lineWidth = 1.5;
      for (var r = 0; r < rods.length; r++) {
        var top = point(rods[r].j * W + rods[r].i);
        pen.beginPath(); pen.moveTo(top.x, sky.y + sky.h); pen.lineTo(top.x, top.y); pen.stroke();
      }
      // the leader: every cell joined to the cell it grew from, the newest steps brightest
      var k, p, q, lit = flash > 0;
      pen.lineWidth = 1;
      for (var pass = 0; pass < 2; pass++) {
        pen.strokeStyle = pass ? (lit ? 'rgba(170,185,255,0.55)' : 'rgba(200,210,255,0.95)') : 'rgba(130,145,220,0.45)';
        pen.beginPath();
        for (k = 0; k < W * H; k++) {
          if (state[k] !== 2 || parent[k] < 0) continue;
          var fresh = !lit && steps - when[k] < 45;
          if ((pass === 1) !== fresh) continue;
          p = point(k); q = point(parent[k]);
          pen.moveTo(q.x, q.y); pen.lineTo(p.x, p.y);
        }
        pen.stroke();
      }
      // the strike: the channel from cloud to ground lights up, and the sky with it
      if (lit) {
        var a = flash / FLASH_TIME;
        drawChannel(main, 9, 'rgba(233,230,223,' + (0.14 * a).toFixed(3) + ')');
        drawChannel(main, 3.5, 'rgba(233,230,223,' + (0.55 * a).toFixed(3) + ')');
        drawChannel(main, 1.5, 'rgba(255,255,255,' + Math.min(1, 1.3 * a).toFixed(3) + ')');
        pen.fillStyle = 'rgba(233,230,223,' + (0.09 * a * a).toFixed(3) + ')';
        pen.fillRect(sky.x, sky.y, sky.w, sky.h);
      }
    }

    function report() {
      env.live('steps', steps);
      env.live('branches', branches);
      env.live('eta', eta.toFixed(1));
    }

    /* ---- wiring ---- */

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var rect = canvas.getBoundingClientRect();
      var i = Math.floor((e.clientX - rect.left - sky.x) / sky.w * W), j = Math.floor((e.clientY - rect.top - sky.y) / sky.h * H);
      if (i < 0 || i >= W || j < 0 || j >= H) return;
      raiseRod(i, j);
      env.redraw();
    });
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'pan-y';

    var etaDial = env.room.querySelector('[data-lightning-eta]');
    var etaReadout = env.room.querySelector('[data-lightning-eta-value]');
    function readEta() {
      eta = Number(etaDial.value) / 10;
      if (etaReadout) etaReadout.textContent = eta < 1.5 ? 'a fluffy discharge' : eta < 2.2 ? 'a bushy one' : eta < 3.6 ? 'lightning' : 'a straight strike';
      report();
    }
    if (etaDial) { etaDial.addEventListener('input', readEta); readEta(); }
    var strikeButton = env.room.querySelector('[data-lightning-strike]');
    if (strikeButton) strikeButton.addEventListener('click', function () { pause = 0; begin(); env.redraw(); });
    var fieldButton = env.room.querySelector('[data-lightning-field]');
    if (fieldButton) fieldButton.addEventListener('click', function () {
      showField = !showField;
      fieldButton.setAttribute('aria-pressed', String(showField));
      env.redraw();
    });

    var clock = 0, reported = 0;
    var fieldImage = null;

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wide = size.w >= 900;
        sky.x = wide ? size.w * 0.36 : size.w * 0.04; sky.w = wide ? size.w * 0.6 : size.w * 0.92;
        sky.y = wide ? size.h * 0.08 : size.h * 0.07; sky.h = wide ? size.h * 0.84 : size.h * 0.86;
        var h = wide ? 160 : 120, w = Math.max(48, Math.min(240, Math.round(h * sky.w / sky.h)));
        perFrame = wide ? 6 : 4;
        if (w !== W || h !== H || !phi) {
          W = w; H = h;
          phi = new Float32Array(W * H); state = new Uint8Array(W * H); parent = new Int32Array(W * H); when = new Int32Array(W * H); kids = new Uint8Array(W * H);
          field = document.createElement('canvas'); field.width = W; field.height = H;
          fieldPen = field.getContext('2d'); fieldImage = fieldPen.createImageData(W, H); fieldPixels = new Uint32Array(fieldImage.data.buffer);
          rods = [];
          for (var i = 0; i < W; i++) state[(H - 1) * W + i] = 3;
          begin();
        }
      },
      frame: function (time, dt) {
        dt = Math.min(dt, 0.05);
        clock += dt;
        if (flash > 0) { flash -= dt; if (flash <= 0) { flash = 0; pause = PAUSE_TIME; } }
        else if (pause > 0) { pause -= dt; if (pause <= 0) begin(); }
        else {
          relax(4);
          for (var n = 0; n < perFrame && hit < 0; n++) if (!grow()) { begin(); break; }
        }
        if (clock - reported > 0.3) { reported = clock; report(); }
        draw();
      },
      // With motion paused: a bolt at the instant of the strike, held
      still: function () {
        if (hit < 0) { var guard = W * H; while (hit < 0 && guard-- > 0) { relax(1); if (!grow()) { begin(); } } }
        flash = FLASH_TIME * 0.8;
        report();
        draw();
      },
      bolt: function () {
        var residual = 0, free = 0;
        for (var j = 1; j < H - 1; j++) for (var i = 1; i < W - 1; i++) { var k = j * W + i; if (state[k] >= 2) continue; residual += Math.abs(0.25 * (phi[k - 1] + phi[k + 1] + phi[k - W] + phi[k + W]) - phi[k]); free++; }
        return { steps: steps, branches: branches, strikes: strikes, candidates: candidates.length, flash: flash, channel: main.length, eta: eta, cols: W, rows: H, residual: free ? residual / free : 0, rods: rods.length };
      }
    };
  });
})();
