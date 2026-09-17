/* Hourglass — room 15.

   A falling-sand world. The stage is a grid of cells and each cell is one
   number: empty, sand, water, stone, wood, fire. Sixty times a second every
   cell looks at the cells beside it and follows a rule or two. Sand: fall
   if there is room below, otherwise slide. Water: the same, otherwise run
   sideways. Fire: rise, fade, and set light to any wood it touches. There
   is no gravity constant and no heat equation; piles, levels, leaks and
   spreading fires are what the rules add up to.

   It opens as an hourglass, glass drawn in stone and a frame of wood.
   Nothing in the rules knows that. */
(function () {
  'use strict';

  // still things first, so the busy loop can skip them with one comparison
  var EMPTY = 0, WALL = 1, STONE = 2, WOOD = 3, SAND = 4, ASH = 5, WATER = 6, FIRE = 7, SMOKE = 8, STEAM = 9, BURNING = 10;
  var BLACK = 0xff000000;

  function rgb(r, g, b) { return (BLACK | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r)) >>> 0; }

  // sixteen shades for every material
  var palette = new Uint32Array(11 * 16);
  (function () {
    for (var k = 0; k < 16; k++) {
      var t = k / 15;
      var s = 0.62 + 0.38 * t;
      palette[SAND * 16 + k] = rgb(255 * s, (172 + 14 * Math.sin(k * 2.4)) * s, (66 + 30 * Math.cos(k * 1.7)) * s);
      palette[ASH * 16 + k] = rgb(82 + 30 * t, 80 + 29 * t, 78 + 27 * t);
      palette[WATER * 16 + k] = rgb(40 + 34 * t, 68 + 40 * t, 205 + 50 * t);
      palette[STONE * 16 + k] = rgb(104 + 58 * t, 102 + 57 * t, 98 + 54 * t);
      palette[WOOD * 16 + k] = rgb(88 + 50 * t, 56 + 30 * t, 32 + 16 * t);
      palette[SMOKE * 16 + k] = rgb(14 + 56 * t, 14 + 55 * t, 16 + 56 * t);
      palette[STEAM * 16 + k] = rgb(30 + 130 * t, 36 + 140 * t, 52 + 160 * t);
      // fire by how much life is left: ember red, rose, amber, then nearly white
      palette[FIRE * 16 + k] = t < 0.35 ? rgb(120 + 380 * t, 20 + 120 * t, 30 + 180 * t)
        : t < 0.7 ? rgb(255, 79 + (t - 0.35) * 290, 123 - (t - 0.35) * 150)
        : rgb(255, 179 + (t - 0.7) * 210, 71 + (t - 0.7) * 480);
      palette[BURNING * 16 + k] = rgb(150 + 105 * t, 30 + 150 * t * t, 18 + 50 * t * t);
    }
  })();

  Gallery.register('hourglass', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var W = 0, H = 0, cell = 3;
    var mat, shade, life, moved;                    // one entry per cell
    var parity = 1, ticks = 0, debt = 0;
    var sandMoves = 0, quiet = 0, grains = 0, turns = 0, poured = 0;
    var glass = null;                               // where the hourglass stands: { cx, cy, halfW, halfH }
    var turning = null;                             // { t, mat, shade, life } while it is being turned over
    var tool = 'sand', brush = 4;
    var press = null, hover = null, warmed = false;
    var shelf = null;                               // the corner of the shelf over the wall label, in stage pixels

    var grid = document.createElement('canvas'), gridPen = grid.getContext('2d');
    var glowSource = document.createElement('canvas'), glowSourcePen = glowSource.getContext('2d');
    var glowSmall = document.createElement('canvas'), glowSmallPen = glowSmall.getContext('2d');
    var box = document.createElement('canvas'), boxPen = box.getContext('2d');
    var image, pixels, glowImage, glowPixels;

    var seed = 0x2545f491;
    function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }

    /* ---- the scene ---- */

    function put(i, m, lifetime) {
      mat[i] = m;
      life[i] = lifetime || 0;
      if (m === WOOD) { var x = i % W, y = (i / W) | 0; shade[i] = ((x * 7) ^ (y >> 2)) & 15; }   // grain
      else shade[i] = (rnd() * 256) | 0;
    }

    // the glass's inside half-width, u = 0 at the neck to 1 at the plates
    function profile(u, widest) {
      return 1 + (widest - 1) * Math.pow(Math.sin(Math.pow(u, 0.85) * Math.PI * 0.62), 1.35);
    }

    function measure() {
      var across = Math.max(60, Math.round(size.w / (size.w >= 900 ? 3 : 2.5)));
      return { W: across, H: Math.max(60, Math.ceil(size.h / (size.w / across))) };
    }

    function layout() {
      var m = measure();
      W = m.W; H = m.H;
      cell = size.w / W;
      var n = W * H;
      mat = new Uint8Array(n); shade = new Uint8Array(n); life = new Uint8Array(n); moved = new Uint8Array(n);
      grid.width = glowSource.width = W; grid.height = glowSource.height = H;
      glowSmall.width = Math.ceil(W / 4); glowSmall.height = Math.ceil(H / 4);
      image = gridPen.createImageData(W, H);
      pixels = new Uint32Array(image.data.buffer);
      glowImage = glowSourcePen.createImageData(W, H);
      glowPixels = new Uint32Array(glowImage.data.buffer);
      env.live('cells', Gallery.formatCount(n));
      build();
    }

    // an empty stage: the edges, and the shelf over the wall label
    function clear() {
      var x, y;
      mat.fill(EMPTY); shade.fill(0); life.fill(0); moved.fill(0);
      turning = null; glass = null; quiet = 0; poured = 0; warmed = false;
      for (x = 0; x < W; x++) { mat[x] = mat[(H - 1) * W + x] = WALL; }
      for (y = 0; y < H; y++) { mat[y * W] = mat[y * W + W - 1] = WALL; }

      // on wide screens the wall label is a shelf: nothing falls behind the words
      var label = env.room.querySelector('.label');
      if (label && size.w >= 900) {
        var stage = canvas.getBoundingClientRect(), rect = label.getBoundingClientRect();
        var x0 = 1, x1 = Math.min(W - 2, Math.ceil((rect.right - stage.left + 30) / cell));
        var y0 = Math.max(1, Math.floor((rect.top - stage.top - 30) / cell)), y1 = H - 2;
        for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) mat[y * W + x] = WALL;
        shelf = { x: (x1 + 1) * cell, y: y0 * cell };
      } else shelf = null;
      env.redraw();
    }

    function build() {
      var x, y, i, v;
      clear();
      var wide = size.w >= 900;
      var halfH = Math.round(Math.min(H * (wide ? 0.41 : 0.38), W * (wide ? 0.3 : 0.64)));
      var widest = Math.round(halfH * 0.5);
      var plate = Math.max(3, Math.round(halfH * 0.05));
      glass = { cx: Math.round(W * (wide ? 0.64 : 0.5)), cy: Math.round(H * (wide ? 0.5 : 0.53)), halfW: widest + 8, halfH: halfH };
      var inner = halfH - plate, cx = glass.cx, cy = glass.cy;

      // the frame: two wooden plates and two posts
      for (v = 0; v < plate; v++) {
        for (x = cx - glass.halfW; x <= cx + glass.halfW; x++) {
          put((cy - halfH + v) * W + x, WOOD);
          put((cy + halfH - v) * W + x, WOOD);
        }
      }
      for (y = cy - inner; y <= cy + inner; y++) {
        for (v = 5; v <= 7; v++) { put(y * W + cx - widest - v, WOOD); put(y * W + cx + widest + v, WOOD); }
      }
      // the glass, two cells thick and with no diagonal gaps for sand to slip through
      for (v = -inner; v <= inner; v++) {
        var here = Math.round(profile(Math.abs(v) / inner, widest));
        var next = Math.round(profile(Math.min(1, (Math.abs(v) + 1) / inner), widest));
        var before = Math.round(profile(Math.max(0, (Math.abs(v) - 1)) / inner, widest));
        var out = Math.max(here, next, before) + 2;
        for (x = here + 1; x <= out; x++) { put((cy + v) * W + cx + x, STONE); put((cy + v) * W + cx - x, STONE); }
        // and sand in the upper bulb, with some air left above it
        if (v < -1 && v > -inner * 0.74) {
          for (x = -here; x <= here; x++) put((cy + v) * W + cx + x, SAND);
        }
      }
      poured = 0;
      for (i = 0; i < mat.length; i++) if (mat[i] === SAND) poured++;
      turns = 0;
      env.live('turns', 0);
      env.redraw();
    }

    /* ---- the rules ---- */

    function move(i, j) {
      var m = mat[i], s = shade[i], l = life[i];
      mat[i] = mat[j]; shade[i] = shade[j]; life[i] = life[j];
      mat[j] = m; shade[j] = s; life[j] = l;
      moved[i] = moved[j] = parity;
    }
    // room for a gas or a liquid to move into
    function airy(t) { return t === EMPTY || (t >= FIRE && t <= STEAM); }
    // room for a grain to fall into: air, or water some of the time
    function loose(t) { return t === EMPTY || (t >= FIRE && t <= STEAM) || (t === WATER && rnd() < 0.6); }

    function touching(i, what) {
      return mat[i - 1] === what ? i - 1 : mat[i + 1] === what ? i + 1 : mat[i - W] === what ? i - W : mat[i + W] === what ? i + W : -1;
    }

    function grain(i) {
      var below = i + W;
      if (loose(mat[below])) { move(i, below); sandMoves++; return; }
      var d = rnd() < 0.5 ? 1 : -1;
      for (var n = 0; n < 2; n++, d = -d) {
        // a grain slides diagonally unless that means squeezing past the corner of something fixed
        var side = mat[i + d];
        if ((side === EMPTY || (side >= SAND && side <= STEAM)) && loose(mat[below + d])) { move(i, below + d); sandMoves++; return; }
      }
    }

    function water(i) {
      var below = i + W;
      if (airy(mat[below])) { move(i, below); return; }
      var d = rnd() < 0.5 ? 1 : -1;
      for (var n = 0; n < 2; n++, d = -d) {
        if (airy(mat[i + d]) && airy(mat[below + d])) { move(i, below + d); return; }
      }
      // otherwise run sideways, the way it was already going, until something is in the way
      var dir = (shade[i] & 128) ? 1 : -1, j = i, run = 0;
      while (run < 8 && airy(mat[j + dir])) { j += dir; run++; if (airy(mat[j + W])) break; }
      if (j !== i) move(i, j); else shade[i] ^= 128;
    }

    function gas(i, m) {
      var left = life[i] - 1;
      if (left <= 0) {
        // steam turns back into a drop of water now and then; smoke just goes
        if (m === STEAM && rnd() < 0.4) put(i, WATER); else mat[i] = EMPTY;
        moved[i] = parity;
        return;
      }
      life[i] = left;
      var roll = rnd();
      if (roll > 0.62) return;
      var up = i - W, t = mat[up];
      if (t === EMPTY || (t === WATER && roll < 0.3)) { move(i, up); return; }
      var d = roll < 0.31 ? 1 : -1;
      if (mat[up + d] === EMPTY) move(i, up + d);
      else if (mat[i + d] === EMPTY) move(i, i + d);
      else if (mat[i - d] === EMPTY) move(i, i - d);
    }

    function flame(i) {
      var wet = touching(i, WATER);
      if (wet >= 0) { put(i, STEAM, 70); moved[i] = parity; return; }
      var wood = touching(i, WOOD);
      if (wood >= 0 && rnd() < 0.1) { put(wood, BURNING, 80 + rnd() * 90); moved[wood] = parity; }
      var left = life[i] - 1 - ((rnd() * 3) | 0);
      if (left <= 0) {
        if (rnd() < 0.22) put(i, SMOKE, 40 + rnd() * 60); else mat[i] = EMPTY;
        moved[i] = parity;
        return;
      }
      life[i] = left;
      var roll = rnd();
      if (roll > 0.8) return;
      var up = i - W, d = roll < 0.4 ? 1 : -1;
      if (mat[up] === EMPTY && roll < 0.62) move(i, up);
      else if (mat[up + d] === EMPTY) move(i, up + d);
      else if (mat[i + d] === EMPTY) move(i, i + d);
    }

    var AROUND = [0, 0, 0, 0, 0, 0, 0, 0];
    function burning(i) {
      var wet = touching(i, WATER);
      if (wet >= 0) {                                  // put out: charred wood and a puff of steam
        mat[i] = WOOD; shade[i] = 0; life[i] = 0;
        put(wet, STEAM, 90); moved[wet] = parity;
        return;
      }
      var left = life[i] - (rnd() < 0.5 ? 1 : 0);
      if (left <= 0) {
        if (rnd() < 0.3) put(i, ASH); else put(i, SMOKE, 50 + rnd() * 50);
        moved[i] = parity;
        return;
      }
      life[i] = left;
      var up = i - W;
      if (mat[up] === EMPTY && rnd() < 0.4) { put(up, FIRE, 12 + rnd() * 18); moved[up] = parity; }
      var side = i + (rnd() < 0.5 ? 1 : -1);
      if (mat[side] === EMPTY && rnd() < 0.1) { put(side, FIRE, 8 + rnd() * 10); moved[side] = parity; }
      // and the fire spreads to one neighbour at a time
      var next = i + AROUND[(rnd() * 8) | 0];
      if (mat[next] === WOOD && rnd() < 0.5) { put(next, BURNING, 80 + rnd() * 90); moved[next] = parity; }
    }

    function tick() {
      parity = parity === 1 ? 2 : 1;
      sandMoves = 0;
      AROUND[0] = -W - 1; AROUND[1] = -W; AROUND[2] = -W + 1; AROUND[3] = -1; AROUND[4] = 1; AROUND[5] = W - 1; AROUND[6] = W; AROUND[7] = W + 1;
      var leftToRight = (ticks++ & 1) === 0;
      // bottom row first, so that a falling grain is not moved twice; alternate the sweep so nothing drifts
      for (var y = H - 2; y >= 1; y--) {
        var row = y * W;
        for (var k = 1; k < W - 1; k++) {
          var i = row + (leftToRight ? k : W - 1 - k);
          var m = mat[i];
          if (m < SAND || moved[i] === parity) continue;
          if (m === SAND || m === ASH) grain(i);
          else if (m === WATER) water(i);
          else if (m === FIRE) flame(i);
          else if (m === BURNING) burning(i);
          else gas(i, m);
        }
      }
      // when the sand has run out and lain still for a few seconds, turn the glass over
      quiet = sandMoves === 0 ? quiet + 1 : 0;
      if (quiet > 200 && !press && !turning && glass && settledBelow()) turnOver();
    }

    function settledBelow() {
      var count = 0;
      for (var y = glass.cy + 1; y <= glass.cy + glass.halfH; y++) {
        for (var x = glass.cx - glass.halfW; x <= glass.cx + glass.halfW; x++) if (mat[y * W + x] === SAND) count++;
      }
      return poured > 0 && count > poured * 0.5;
    }

    /* ---- turning it over ---- */

    // Lift everything inside the frame out of the grid, turn it through half a
    // circle on screen, and set it back down upside down.
    function turnOver() {
      if (turning || !glass) return;
      var bw = glass.halfW * 2 + 1, bh = glass.halfH * 2 + 1;
      var x0 = glass.cx - glass.halfW, y0 = glass.cy - glass.halfH;
      var held = { t: 0, w: bw, h: bh, mat: new Uint8Array(bw * bh), shade: new Uint8Array(bw * bh), life: new Uint8Array(bw * bh) };
      box.width = bw; box.height = bh;
      var picture = boxPen.createImageData(bw, bh), out = new Uint32Array(picture.data.buffer);
      for (var y = 0; y < bh; y++) {
        for (var x = 0; x < bw; x++) {
          var i = (y0 + y) * W + x0 + x, k = y * bw + x;
          if (mat[i] === WALL) { held.mat[k] = WALL; continue; }
          held.mat[k] = mat[i]; held.shade[k] = shade[i]; held.life[k] = life[i];
          out[k] = mat[i] === EMPTY ? 0 : colourOf(i);      // air stays see-through while it turns
          mat[i] = EMPTY;
        }
      }
      boxPen.putImageData(picture, 0, 0);
      turning = held;
      quiet = 0;
    }

    function setDown() {
      var held = turning, x0 = glass.cx - glass.halfW, y0 = glass.cy - glass.halfH;
      for (var y = 0; y < held.h; y++) {
        for (var x = 0; x < held.w; x++) {
          var k = y * held.w + x;
          if (held.mat[k] === WALL || held.mat[k] === EMPTY) continue;
          var i = (y0 + held.h - 1 - y) * W + x0 + held.w - 1 - x;
          if (mat[i] === WALL) continue;
          mat[i] = held.mat[k]; shade[i] = held.shade[k]; life[i] = held.life[k];
        }
      }
      turning = null;
      turns++;
      env.live('turns', turns);
    }

    /* ---- drawing ---- */

    function colourOf(i) {
      var m = mat[i];
      if (m < STONE) return BLACK;
      if (m === FIRE) return palette[FIRE * 16 + Math.min(15, life[i] >> 1)];
      if (m === BURNING) return palette[BURNING * 16 + ((rnd() * 16) | 0)];
      if (m === SMOKE || m === STEAM) return palette[m * 16 + Math.min(15, life[i] >> 2)];
      return palette[m * 16 + (shade[i] & 15)];
    }

    function render() {
      var n = W * H, i, m, count = 0;
      glowPixels.fill(BLACK);
      for (i = 0; i < n; i++) {
        m = mat[i];
        if (m < STONE) { pixels[i] = BLACK; continue; }
        var c = colourOf(i);
        pixels[i] = c;
        if (m === SAND) count++;
        else if (m === FIRE || m === BURNING) glowPixels[i] = c;
      }
      if (count !== grains && !turning) { grains = count; env.live('grains', Gallery.formatCount(grains)); }
      gridPen.putImageData(image, 0, 0);
      glowSourcePen.putImageData(glowImage, 0, 0);
      glowSmallPen.globalCompositeOperation = 'copy';
      glowSmallPen.drawImage(glowSource, 0, 0, glowSmall.width, glowSmall.height);

      var ratio = canvas.width / size.w, px = cell * ratio;
      pen.setTransform(1, 0, 0, 1, 0, 0);
      pen.globalCompositeOperation = 'source-over';
      pen.imageSmoothingEnabled = false;
      pen.drawImage(grid, 0, 0, W * px, H * px);

      if (turning) {
        var e = turning.t < 0.5 ? 2 * turning.t * turning.t : 1 - Math.pow(-2 * turning.t + 2, 2) / 2;
        pen.save();
        pen.translate((glass.cx + 0.5) * px, (glass.cy + 0.5) * px);
        pen.rotate(e * Math.PI);
        pen.drawImage(box, -turning.w / 2 * px, -turning.h / 2 * px, turning.w * px, turning.h * px);
        pen.restore();
      }

      // firelight: the hot cells again, small and soft, added on top
      pen.globalCompositeOperation = 'lighter';
      pen.imageSmoothingEnabled = true;
      pen.globalAlpha = 0.85;
      pen.drawImage(glowSmall, 0, 0, W * px, H * px);
      pen.globalAlpha = 1;
      pen.globalCompositeOperation = 'source-over';

      if (shelf) {
        pen.beginPath();
        pen.moveTo(0, shelf.y * ratio);
        pen.lineTo(shelf.x * ratio, shelf.y * ratio);
        pen.lineTo(shelf.x * ratio, canvas.height);
        pen.strokeStyle = 'rgba(233,230,223,0.28)';
        pen.lineWidth = ratio;
        pen.stroke();
      }

      if (hover && !turning) {
        pen.beginPath();
        pen.arc(hover.x * ratio, hover.y * ratio, (brush + 0.5) * px, 0, 6.2832);
        pen.strokeStyle = 'rgba(233,230,223,0.5)';
        pen.lineWidth = ratio;
        pen.stroke();
      }
    }

    /* ---- wiring ---- */

    function stamp(cx, cy) {
      var r = brush;
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r + 1) continue;
          var x = cx + dx, y = cy + dy;
          if (x < 1 || y < 1 || x > W - 2 || y > H - 2) continue;
          var i = y * W + x, t = mat[i];
          if (t === WALL) continue;
          if (tool === 'sand') { if (airy(t) && rnd() < 0.3) put(i, SAND); }
          else if (tool === 'water') { if (airy(t) && rnd() < 0.45) put(i, WATER); }
          else if (tool === 'fire') {
            if (t === WOOD) put(i, BURNING, 80 + rnd() * 90);
            else if (t === EMPTY && rnd() < 0.4) put(i, FIRE, 16 + rnd() * 16);
          }
          else if (tool === 'wood') { if (t !== STONE && t !== WOOD) put(i, WOOD); }
          else if (tool === 'stone') { if (t !== STONE) put(i, STONE); }
          else if (t !== EMPTY) { mat[i] = EMPTY; life[i] = 0; }
        }
      }
    }

    // pour along the whole stroke, so a fast hand does not leave gaps
    function pourTo(x, y) {
      var fx = press.cx, fy = press.cy;
      var steps = Math.max(1, Math.ceil(Math.max(Math.abs(x - fx), Math.abs(y - fy)) / Math.max(1, brush * 0.5)));
      for (var k = 1; k <= steps; k++) stamp(Math.round(fx + (x - fx) * k / steps), Math.round(fy + (y - fy) * k / steps));
      press.cx = x; press.cy = y;
    }

    function place(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || turning) return;
      var p = place(e);
      press = { cx: Math.floor(p.x / cell), cy: Math.floor(p.y / cell) };
      stamp(press.cx, press.cy);
      quiet = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      env.redraw();
    });
    canvas.addEventListener('pointermove', function (e) {
      var p = place(e);
      hover = e.pointerType === 'mouse' ? p : null;
      if (press && !turning) pourTo(Math.floor(p.x / cell), Math.floor(p.y / cell));
      if (press || hover) env.redraw();
    });
    function lift() { press = null; }
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
    canvas.addEventListener('pointerleave', function () { hover = null; env.redraw(); });
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'none';

    var toolButtons = Array.prototype.slice.call(env.room.querySelectorAll('[data-hourglass-tool]'));
    toolButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        tool = button.getAttribute('data-hourglass-tool');
        toolButtons.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
      });
    });

    var brushDial = env.room.querySelector('[data-hourglass-brush]');
    var brushReadout = env.room.querySelector('[data-hourglass-brush-value]');
    function readBrush() {
      brush = Number(brushDial.value);
      if (brushReadout) brushReadout.textContent = (brush * 2 + 1) + ' grains across';
    }
    if (brushDial) { brushDial.addEventListener('input', readBrush); readBrush(); }

    function on(selector, handler) {
      var button = env.room.querySelector(selector);
      if (button) button.addEventListener('click', function () { handler(); env.redraw(); });
    }
    on('[data-hourglass-turn]', function () {
      if (!mat || !glass) return;
      turnOver();
      if (turning && !env.motion()) setDown();             // with motion paused there is no turn to watch
    });
    on('[data-hourglass-again]', function () { if (mat) build(); });
    on('[data-hourglass-empty]', function () { if (mat) clear(); });

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var m = measure();
        if (!mat || m.W !== W || m.H !== H) layout();      // a resize that changes nothing keeps the sand where it is
        else cell = size.w / W;
      },
      frame: function (time, dt) {
        if (turning) {
          turning.t += dt / 1.1;
          if (turning.t >= 1) setDown();
        }
        // the rest of the world carries on while the glass is in the air
        debt = Math.min(3, debt + dt * 60);
        while (debt >= 1) {
          if (press && !turning) stamp(press.cx, press.cy);
          tick();
          debt -= 1;
        }
        render();
      },
      // With motion paused: let the sand run for a while out of sight, then show it.
      still: function () {
        if (turning) setDown();
        if (!warmed) { for (var i = 0; i < 500 && !turning; i++) tick(); warmed = true; }
        if (turning) setDown();
        render();
      }
    };
  });
})();
