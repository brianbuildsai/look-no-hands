/* Wayfinding — room 11.

   The Physarum model (Jeff Jones, 2010). Tens of thousands of agents wander a
   grid. Each leaves a little scent where it walks, and each step it smells
   three points ahead of itself (left, centre, right) and turns toward the
   strongest. The scent spreads to neighbouring cells and fades. That is
   everything. Networks that look designed, with main roads, junctions and
   shortcuts between the food, condense out of it within seconds.

   Headings are kept as unit vectors and turned by multiplying with a fixed
   rotation, so the inner loop needs no sines or cosines at all. */
(function () {
  'use strict';

  // smell angle and turn angle in degrees; how far ahead it smells, in cells
  var HABITS = {
    roads: { smell: 28, turn: 40, reach: 11, fade: 0.1 },
    lace: { smell: 50, turn: 30, reach: 7, fade: 0.17 },
    rivers: { smell: 16, turn: 12, reach: 20, fade: 0.06 }
  };
  var DEPOSIT = 5;
  var FLAKE_RADIUS = 6;          // cells
  var MAX_FLAKES = 14;

  // scent strength to colour: black, ultramarine, rose, amber, bone
  function makeRamp() {
    var stops = [[0, 0, 0, 0], [0.18, 16, 26, 110], [0.42, 61, 91, 255], [0.62, 255, 79, 123], [0.82, 255, 179, 71], [1, 244, 240, 230]];
    var ramp = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var t = i / 255, k = 1;
      while (k < stops.length - 1 && stops[k][0] < t) k++;
      var a = stops[k - 1], b = stops[k], f = (t - a[0]) / (b[0] - a[0]);
      var r = Math.round(a[1] + (b[1] - a[1]) * f), g = Math.round(a[2] + (b[2] - a[2]) * f), bl = Math.round(a[3] + (b[3] - a[3]) * f);
      ramp[i] = (255 << 24) | (bl << 16) | (g << 8) | r;      // little-endian RGBA
    }
    return ramp;
  }

  Gallery.register('wayfinding', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pointer = env.pointer;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var ramp = makeRamp();
    var grid = document.createElement('canvas');
    var gridPen = grid.getContext('2d');
    var image = null, pixels = null;
    var W = 0, H = 0, cell = 2;
    var scent = null, spare = null, walls = null;
    var count = 0;
    var ax = null, ay = null, hx = null, hy = null;       // where each agent is, and which way it faces
    var habit = HABITS.roads;
    var flakes = [];
    var seed = 12345;
    var warmed = false;
    var scaring = null;

    var lut = new Uint32Array(256);
    (function () {               // scent is squeezed through a curve so faint trails still show
      for (var j = 0; j < 256; j++) lut[j] = ramp[Math.round(255 * (1 - Math.exp(-(j / 255 * 42) * 0.075)))];
    })();

    /* ---- the dish ---- */

    function random() {          // xorshift: quicker than Math.random in a loop this hot
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    }

    function freeCentre() {
      return size.w >= 900 ? { x: 0.63, y: 0.49, r: Math.min(size.w * 0.3, size.h * 0.4) }
                           : { x: 0.5, y: 0.5, r: Math.min(size.w, size.h) * 0.4 };
    }

    function scatter() {
      for (var i = 0; i < count; i++) {
        do { ax[i] = 1 + random() * (W - 2); ay[i] = 1 + random() * (H - 2); } while (walls[(ay[i] | 0) * W + (ax[i] | 0)]);
        var a = random() * 6.2832;
        hx[i] = Math.cos(a); hy[i] = Math.sin(a);
      }
      scent.fill(0);
    }

    function layout() {
      cell = size.w >= 900 ? 2.2 : 1.7;
      W = Math.max(64, Math.min(720, Math.round(size.w / cell)));
      cell = size.w / W;
      H = Math.max(64, Math.round(size.h / cell));
      grid.width = W; grid.height = H;
      image = gridPen.createImageData(W, H);
      pixels = new Uint32Array(image.data.buffer);
      scent = new Float32Array(W * H);
      spare = new Float32Array(W * H);
      walls = new Uint8Array(W * H);
      var x, y;
      for (x = 0; x < W; x++) { walls[x] = walls[(H - 1) * W + x] = 1; }
      for (y = 0; y < H; y++) { walls[y * W] = walls[y * W + W - 1] = 1; }
      // on wide screens the wall label is a wall to the slime too
      var label = env.room.querySelector('.label');
      if (label && size.w >= 900) {
        var stage = canvas.getBoundingClientRect(), rect = label.getBoundingClientRect();
        var x0 = Math.max(0, Math.floor((rect.left - stage.left - 28) / cell)), x1 = Math.min(W - 1, Math.ceil((rect.right - stage.left + 28) / cell));
        var y0 = Math.max(0, Math.floor((rect.top - stage.top - 28) / cell)), y1 = Math.min(H - 1, Math.ceil((rect.bottom - stage.top + 28) / cell));
        for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) walls[y * W + x] = 1;
      }
      count = Math.min(80000, Math.round(W * H * 0.2));
      ax = new Float32Array(count); ay = new Float32Array(count);
      hx = new Float32Array(count); hy = new Float32Array(count);
      scatter();
      // a ring of oat flakes and one in the middle, to have something to connect
      var c = freeCentre();
      flakes = [{ x: c.x * size.w, y: c.y * size.h }];
      for (var k = 0; k < 6; k++) {
        var a = k / 6 * 6.2832 + 0.4;
        flakes.push({ x: c.x * size.w + Math.cos(a) * c.r * (0.85 + 0.3 * random()), y: c.y * size.h + Math.sin(a) * c.r * (0.8 + 0.3 * random()) });
      }
      warmed = false;
      env.live('agents', Gallery.formatCount(count));
      env.live('flakes', flakes.length);
    }

    /* ---- one step of everything ---- */

    function smellAt(x, y) {
      var cx = x | 0, cy = y | 0;
      if (cx < 0 || cy < 0 || cx >= W || cy >= H) return -1;
      return walls[cy * W + cx] ? -1 : scent[cy * W + cx];
    }

    function step() {
      var cs = Math.cos(habit.smell * Math.PI / 180), ss = Math.sin(habit.smell * Math.PI / 180);
      var ct = Math.cos(habit.turn * Math.PI / 180), st = Math.sin(habit.turn * Math.PI / 180);
      var reach = habit.reach, i;
      var home = freeCentre(), homeX = home.x * W, homeY = home.y * H;

      for (i = 0; i < count; i++) {
        var x = ax[i], y = ay[i], dx = hx[i], dy = hy[i];
        var ahead = smellAt(x + dx * reach, y + dy * reach);
        var left = smellAt(x + (dx * cs - dy * ss) * reach, y + (dx * ss + dy * cs) * reach);
        var right = smellAt(x + (dx * cs + dy * ss) * reach, y + (-dx * ss + dy * cs) * reach);
        var way = 0;
        if (ahead < left && ahead < right) way = random() < 0.5 ? 1 : -1;
        else if (left > ahead && left > right) way = 1;
        else if (right > ahead && right > left) way = -1;
        if (way) {
          var ndx = dx * ct - way * dy * st;
          dy = way * dx * st + dy * ct;
          dx = ndx;
        }
        var nx = x + dx, ny = y + dy;
        if (random() < 0.0012) {
          // now and then one gives up and starts again somewhere new: these are the
          // scouts that find shorter ways and stop the network setting solid
          do { x = 1 + random() * (W - 2); y = 1 + random() * (H - 2); } while (walls[(y | 0) * W + (x | 0)]);
        } else if (walls[(ny | 0) * W + (nx | 0)]) {
          // bumped into a wall: turn back toward open ground, more or less
          var a = Math.atan2(homeY - y, homeX - x) + (random() - 0.5) * 2.4;
          dx = Math.cos(a); dy = Math.sin(a);
        } else {
          x = nx; y = ny;
          scent[(y | 0) * W + (x | 0)] += DEPOSIT;
        }
        ax[i] = x; ay[i] = y; hx[i] = dx; hy[i] = dy;
      }

      // food gives off scent of its own
      for (var f = 0; f < flakes.length; f++) {
        var fx = flakes[f].x / cell, fy = flakes[f].y / cell;
        for (var oy = -FLAKE_RADIUS; oy <= FLAKE_RADIUS; oy++) {
          for (var ox = -FLAKE_RADIUS; ox <= FLAKE_RADIUS; ox++) {
            var px = (fx + ox) | 0, py = (fy + oy) | 0;
            if (ox * ox + oy * oy <= FLAKE_RADIUS * FLAKE_RADIUS && px > 0 && py > 0 && px < W - 1 && py < H - 1 && !walls[py * W + px]) scent[py * W + px] += 60;
          }
        }
      }

      // scent spreads to its neighbours (a 3 by 3 average, done as two passes of 3) and fades
      var keep = (1 - habit.fade) / 3, row, c;
      for (row = 0; row < H; row++) {
        for (c = 1; c < W - 1; c++) { i = row * W + c; spare[i] = scent[i - 1] + scent[i] + scent[i + 1]; }
      }
      for (row = 1; row < H - 1; row++) {
        for (c = 1; c < W - 1; c++) {
          i = row * W + c;
          scent[i] = walls[i] ? 0 : (spare[i - W] + spare[i] + spare[i + W]) * keep / 3;
        }
      }
    }

    function scare(px, py) {
      var cx = px / cell, cy = py / cell, R = 34;
      for (var i = 0; i < count; i++) {
        var dx = ax[i] - cx, dy = ay[i] - cy, d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 0.01) { var d = Math.sqrt(d2); hx[i] = dx / d; hy[i] = dy / d; }
      }
      for (var y = Math.max(1, (cy - R) | 0); y < Math.min(H - 1, cy + R); y++) {
        for (var x = Math.max(1, (cx - R) | 0); x < Math.min(W - 1, cx + R); x++) {
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < R * R) scent[y * W + x] *= 0.2;
        }
      }
    }

    function render() {
      for (var i = 0, n = W * H; i < n; i++) {
        var v = scent[i] * 1.7;
        pixels[i] = lut[v > 255 ? 255 : v | 0];
      }
      gridPen.putImageData(image, 0, 0);
      var ratio = canvas.width / size.w;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.imageSmoothingEnabled = true;
      pen.imageSmoothingQuality = 'high';
      pen.drawImage(grid, 0, 0, size.w, size.h);
      pen.lineWidth = 1.5;
      for (var f = 0; f < flakes.length; f++) {
        pen.beginPath();
        pen.arc(flakes[f].x, flakes[f].y, 8, 0, 6.2832);
        pen.strokeStyle = 'rgba(244,240,230,0.9)';
        pen.stroke();
        pen.beginPath();
        pen.arc(flakes[f].x, flakes[f].y, 2.5, 0, 6.2832);
        pen.fillStyle = 'rgba(244,240,230,0.95)';
        pen.fill();
      }
    }

    /* ---- wiring ---- */

    var press = null;
    function spot(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var p = spot(e);
      press = { x: p.x, y: p.y, moved: 0 };
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!press) return;
      var p = spot(e);
      press.moved += Math.abs(p.x - press.x) + Math.abs(p.y - press.y);
      press.x = p.x; press.y = p.y;
      if (press.moved > 10) { scaring = p; env.redraw(); }
    });
    function lift() {
      if (!press) return;
      if (press.moved <= 10) {
        // a click: take away the flake that is here, or put one down
        var near = -1;
        for (var f = 0; f < flakes.length; f++) {
          if (Math.abs(flakes[f].x - press.x) < 16 && Math.abs(flakes[f].y - press.y) < 16) near = f;
        }
        if (near >= 0) flakes.splice(near, 1);
        else if (!walls[((press.y / cell) | 0) * W + ((press.x / cell) | 0)]) {
          if (flakes.length >= MAX_FLAKES) flakes.shift();
          flakes.push({ x: press.x, y: press.y });
        }
        env.live('flakes', flakes.length);
        warmed = false;
        env.redraw();
      }
      press = null;
      scaring = null;
    }
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', function () { press = null; scaring = null; });
    canvas.style.cursor = 'crosshair';

    var habitButtons = Array.prototype.slice.call(env.room.querySelectorAll('[data-wayfinding-habit]'));
    habitButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        habit = HABITS[button.getAttribute('data-wayfinding-habit')] || HABITS.roads;
        habitButtons.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
        warmed = false;
        env.redraw();
      });
    });
    function on(selector, handler) {
      var button = env.room.querySelector(selector);
      if (button) button.addEventListener('click', function () { handler(); warmed = false; env.redraw(); });
    }
    on('[data-wayfinding-scatter]', function () { if (scent) scatter(); });
    on('[data-wayfinding-clear]', function () { flakes = []; env.live('flakes', 0); });

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        layout();
      },
      frame: function (time, dt) {
        if (scaring) scare(scaring.x, scaring.y);
        var steps = dt > 0.024 ? 2 : 1;          // keep pace on slow displays
        for (var i = 0; i < steps; i++) step();
        render();
      },
      // With motion paused: let the network form out of sight, then show it.
      still: function () {
        if (!warmed) { for (var i = 0; i < 260; i++) step(); warmed = true; }
        render();
      }
    };
  });
})();
