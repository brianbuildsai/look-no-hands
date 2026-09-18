/* Weathering — room 29.

   A mountain range worn down by rain. The ground is a grid of heights, made
   at random. A drop of rain lands, runs downhill (with a little momentum, so
   it does not turn on a sixpence), and as it goes it picks up soil where it
   is fast and steep and drops soil where it slows, until it dries up. That is
   all a drop knows how to do. Hundreds of thousands of drops later there are
   valleys, ridges, a network of streams that join, and the fan of silt
   where each one leaves the hills, none of it drawn.

   The map is lit from the north-west and contoured, as a survey map is; the
   blue is where water has run lately. */
(function () {
  'use strict';

  Gallery.register('weathering', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var N = size.w >= 900 ? 256 : 176;
    var height = new Float32Array(N * N), wet = new Float32Array(N * N);
    var map = document.createElement('canvas'), mapPen = map.getContext('2d'), image, pixels;
    var frame = { x: 0, y: 0, side: 100 };
    var drops = 0, moved = 0, rainfall = 5, raining = true, pour = null, seed = 29;
    var brush = [];                   // the cells a drop erodes around itself, and their weights
    function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

    /* ---- the ground ---- */

    // smooth random noise: a lattice of random values, blended between
    function noise(lattice, x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var w = lattice.w, g = lattice.v;
      function at(i, j) { return g[((j % w) + w) % w * w + ((i % w) + w) % w]; }
      return (at(xi, yi) * (1 - fx) + at(xi + 1, yi) * fx) * (1 - fy) + (at(xi, yi + 1) * (1 - fx) + at(xi + 1, yi + 1) * fx) * fy;
    }

    function raise() {
      var lattice = { w: 64, v: new Float32Array(64 * 64) }, i, x, y;
      for (i = 0; i < lattice.v.length; i++) lattice.v[i] = random();
      var offset = random() * 40;
      for (y = 0; y < N; y++) {
        for (x = 0; x < N; x++) {
          var h = 0, amp = 1, freq = 2.2 / N, ridge = 0;
          for (var o = 0; o < 5; o++) {
            var n = noise(lattice, x * freq + offset, y * freq + offset * 1.7);
            h += n * amp;
            if (o < 2) ridge += (1 - Math.abs(n * 2 - 1)) * amp;      // sharp crests from the big waves only
            amp *= 0.45; freq *= 2;
          }
          h = h / 1.85 * 0.5 + ridge / 1.45 * 0.5;
          // the range stands in the middle of the map, falling to a plain at the edges
          var cx = x / N - 0.5, cy = y / N - 0.5, rim = Math.max(0, 1 - Math.pow((cx * cx + cy * cy) * 2.6, 1.5));
          height[y * N + x] = Math.pow(h, 1.35) * rim;
        }
      }
      wet.fill(0);
      drops = 0; moved = 0;
      report();
      env.redraw();
    }

    function makeBrush() {
      brush = [];
      var r = 3, total = 0;
      for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) {
        var w = Math.max(0, r + 0.5 - Math.sqrt(x * x + y * y));
        if (w > 0) { brush.push([x, y, w]); total += w; }
      }
      brush.forEach(function (b) { b[2] /= total; });
    }

    // the height and slope under a point between cells
    function ground(x, y) {
      var xi = Math.min(N - 2, Math.floor(x)), yi = Math.min(N - 2, Math.floor(y)), fx = x - xi, fy = y - yi, i = yi * N + xi;
      var a = height[i], b = height[i + 1], c = height[i + N], d = height[i + N + 1];
      return { h: a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy,
        gx: (b - a) * (1 - fy) + (d - c) * fy, gy: (c - a) * (1 - fx) + (d - b) * fx };
    }

    // one drop of rain, from where it lands until it dries up
    function rain(x, y) {
      var dx = 0, dy = 0, speed = 1, water = 1, sediment = 0;
      drops++;
      for (var life = 0; life < 64; life++) {
        var xi = Math.floor(x), yi = Math.floor(y);
        if (xi < 1 || yi < 1 || xi >= N - 2 || yi >= N - 2) return;
        var here = ground(x, y);
        // downhill, with some memory of the way it was going
        dx = dx * 0.05 - here.gx * 0.95; dy = dy * 0.05 - here.gy * 0.95;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1e-6) { var a = random() * 6.2832; dx = Math.cos(a); dy = Math.sin(a); } else { dx /= len; dy /= len; }
        var nx = x + dx, ny = y + dy;
        if (nx < 1 || ny < 1 || nx >= N - 2 || ny >= N - 2) return;
        var there = ground(nx, ny), drop = there.h - here.h;
        var capacity = Math.max(-drop, 0.01) * speed * water * 8;
        var i = yi * N + xi, fx = x - xi, fy = y - yi;
        if (sediment > capacity || drop > 0) {
          // going uphill, or carrying too much: leave some soil behind, spread over the cell it is in
          var leave = drop > 0 ? Math.min(drop, sediment) : (sediment - capacity) * 0.3;
          sediment -= leave;
          height[i] += leave * (1 - fx) * (1 - fy); height[i + 1] += leave * fx * (1 - fy);
          height[i + N] += leave * (1 - fx) * fy; height[i + N + 1] += leave * fx * fy;
        } else {
          // going downhill with room to spare: pick soil up from round about
          var take = Math.min((capacity - sediment) * 0.5, -drop);
          for (var k = 0; k < brush.length; k++) {
            var b = brush[k], cx = xi + b[0], cy = yi + b[1];
            if (cx < 0 || cy < 0 || cx >= N || cy >= N) continue;
            var bit = Math.min(height[cy * N + cx], take * b[2]);
            height[cy * N + cx] -= bit; sediment += bit;
          }
          moved += take;
        }
        wet[i] = Math.min(1, wet[i] + 0.035 * water);
        speed = Math.sqrt(Math.max(0, speed * speed + drop * -4));
        water *= 0.985;
        x = nx; y = ny;
      }
    }

    function report() {
      env.live('drops', Gallery.formatCount(drops));
      env.live('cells', Gallery.formatCount(N * N));
    }

    /* ---- drawing ---- */

    function render() {
      var x, y, i;
      // lit from the north-west, coloured by height, contoured every so often, blue where water has run
      for (y = 0; y < N; y++) {
        for (x = 0; x < N; x++) {
          i = y * N + x;
          var h = height[i];
          var l = height[i - (x > 0 ? 1 : 0)], r = height[i + (x < N - 1 ? 1 : 0)], u = height[i - (y > 0 ? N : 0)], d = height[i + (y < N - 1 ? N : 0)];
          var slopeX = (r - l) * N * 0.3, slopeY = (d - u) * N * 0.3;
          var shade = (0.62 - slopeX * 0.55 - slopeY * 0.5) / Math.sqrt(1 + slopeX * slopeX * 0.4 + slopeY * slopeY * 0.4);
          shade = Math.max(0.04, Math.min(1.25, shade));
          // the plain is dark bone, the heights pale, the tops nearly white
          var tone = 0.22 + 0.62 * Math.pow(h, 0.9);
          var red = 233 * tone * shade, green = 228 * tone * shade, blue = 218 * tone * shade;
          // contours: a hairline wherever the height crosses a step
          var step = 0.045, band = Math.floor(h / step);
          if (band !== Math.floor(r / step) || band !== Math.floor(d / step)) { red *= 0.55; green *= 0.55; blue *= 0.55; }
          // recent water
          var w = wet[i];
          if (w > 0.03) { var k = Math.min(1, (w - 0.03) * 1.6); red = red * (1 - k) + 70 * k; green = green * (1 - k) + 110 * k; blue = blue * (1 - k) + 255 * k; }
          pixels[i] = (255 << 24) | (Math.min(255, blue) << 16) | (Math.min(255, green) << 8) | Math.min(255, red);
          wet[i] *= 0.975;
        }
      }
      mapPen.putImageData(image, 0, 0);
      var ratio = canvas.width / size.w;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);
      pen.imageSmoothingEnabled = true;
      pen.drawImage(map, frame.x, frame.y, frame.side, frame.side);
      pen.strokeStyle = 'rgba(233,230,223,0.28)';
      pen.lineWidth = 1;
      pen.strokeRect(frame.x + 0.5, frame.y + 0.5, frame.side - 1, frame.side - 1);
    }

    /* ---- wiring ---- */

    function place(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: (e.clientX - rect.left - frame.x) / frame.side * N, y: (e.clientY - rect.top - frame.y) / frame.side * N };
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      pour = place(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    });
    canvas.addEventListener('pointermove', function (e) { if (pour) pour = place(e); });
    function lift() { pour = null; }
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'pan-y';

    var rainDial = env.room.querySelector('[data-weathering-rain]');
    var rainReadout = env.room.querySelector('[data-weathering-rain-value]');
    function readRain() {
      rainfall = Number(rainDial.value);
      if (rainReadout) rainReadout.textContent = rainfall === 0 ? 'dry' : rainfall < 4 ? 'a drizzle' : rainfall < 9 ? 'steady rain' : 'a monsoon';
    }
    if (rainDial) { rainDial.addEventListener('input', readRain); readRain(); }
    var everywhere = env.room.querySelector('[data-weathering-everywhere]');
    if (everywhere) everywhere.addEventListener('click', function () { raining = !raining; everywhere.setAttribute('aria-pressed', String(raining)); });
    var again = env.room.querySelector('[data-weathering-again]');
    if (again) again.addEventListener('click', function () { seed = (Math.random() * 1e9) >>> 0; raise(); });

    map.width = map.height = N;
    image = mapPen.createImageData(N, N);
    pixels = new Uint32Array(image.data.buffer);
    makeBrush();
    raise();

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wide = size.w >= 900;
        frame.side = wide ? Math.min(size.w * 0.55, size.h * 0.84) : Math.min(size.w * 0.9, size.h * 0.86);
        frame.x = (wide ? size.w * 0.645 : size.w * 0.5) - frame.side / 2;
        frame.y = (wide ? size.h * 0.52 : size.h * 0.5) - frame.side / 2;
      },
      frame: function (time, dt) {
        var k, n = Math.round(rainfall * 720 * Math.min(dt, 0.05));
        if (raining) for (k = 0; k < n; k++) rain(1 + random() * (N - 2), 1 + random() * (N - 2));
        if (pour) for (k = 0; k < 40 + rainfall * 6; k++) { var a = random() * 6.2832, r = random() * N * 0.05; rain(Math.max(1, Math.min(N - 2, pour.x + Math.cos(a) * r)), Math.max(1, Math.min(N - 2, pour.y + Math.sin(a) * r))); }
        if (drops % 7 === 0) report();
        render();
      },
      // With motion paused: a hundred thousand drops at once, then the map at rest
      still: function () {
        if (drops < 60000) { for (var k = 0; k < 90000; k++) rain(1 + random() * (N - 2), 1 + random() * (N - 2)); report(); }
        for (var i = 0; i < N * N; i++) wet[i] *= 0.1;        // all that rain fell at once; let it drain before the picture
        render();
      },
      relief: function () { var lo = 1, hi = 0; for (var i = 0; i < N * N; i++) { lo = Math.min(lo, height[i]); hi = Math.max(hi, height[i]); } return { drops: drops, moved: moved, lo: lo, hi: hi }; }
    };
  });
})();
