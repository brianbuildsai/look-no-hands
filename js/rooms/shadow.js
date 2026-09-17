/* A Shadow of a Shadow — room 24.

   There are five perfectly regular solids in three dimensions and exactly six
   in four (Schlafli, about 1850). Nothing here is a model of one: the corners
   are generated from their symmetries (every arrangement of a few numbers and
   their signs), and the edges are found afterwards by joining every pair of
   corners that are as close together as corners get.

   The solid turns in four dimensions: a rotation there is about a plane, not
   an axis, and two of them can go on at once without interfering. Then it is
   flattened twice. From four dimensions to three, either as a shadow cast by
   a lamp (a perspective projection) or the way a globe is flattened to a map
   (stereographic: straight edges become arcs of circles, and whatever passes
   the pole swells up and sweeps through infinity). From three to two, by the
   ordinary perspective of a screen.

   Lines nearer to us in the fourth direction are drawn warmer. */
(function () {
  'use strict';

  var PHI = (1 + Math.sqrt(5)) / 2;

  /* ---- the six solids ---- */

  // every ordering of four things, and whether it takes an even number of swaps to get there
  var ORDERS = (function () {
    var out = [];
    (function walk(rest, taken, even) {
      if (!rest.length) { out.push({ order: taken, even: even }); return; }
      for (var i = 0; i < rest.length; i++) {
        walk(rest.slice(0, i).concat(rest.slice(i + 1)), taken.concat(rest[i]), (i % 2 === 0) === even);
      }
    })([0, 1, 2, 3], [], true);
    return out;
  })();

  // all arrangements of four numbers with every choice of sign (even arrangements only, if asked), without repeats
  function arrangements(numbers, evenOnly) {
    var seen = {}, out = [];
    ORDERS.forEach(function (o) {
      if (evenOnly && !o.even) return;
      for (var signs = 0; signs < 16; signs++) {
        var p = o.order.map(function (from, to) { return numbers[from] * ((signs >> to) & 1 ? -1 : 1); });
        var key = p.map(function (v) { return Math.round(v * 1e6) + 0; }).join(',');
        if (!seen[key]) { seen[key] = true; out.push(p); }
      }
    });
    return out;
  }

  var SOLIDS = [
    { name: 'The 5-cell', corners: function () { var r = 1 / Math.sqrt(5); return [[1, 1, 1, -r], [1, -1, -1, -r], [-1, 1, -1, -r], [-1, -1, 1, -r], [0, 0, 0, 4 * r]]; }, sides: '5 tetrahedra' },
    { name: 'The 16-cell', corners: function () { return arrangements([1, 0, 0, 0]); }, sides: '16 tetrahedra' },
    { name: 'The tesseract', corners: function () { return arrangements([1, 1, 1, 1]); }, sides: '8 cubes' },
    { name: 'The 24-cell', corners: function () { return arrangements([1, 1, 0, 0]); }, sides: '24 octahedra' },
    { name: 'The 600-cell', corners: function () {
      return arrangements([0.5, 0.5, 0.5, 0.5]).concat(arrangements([1, 0, 0, 0]), arrangements([PHI / 2, 0.5, 0.5 / PHI, 0], true));
    }, sides: '600 tetrahedra' },
    { name: 'The 120-cell', corners: function () {
      var a = 1 / PHI, b = a * a, c = PHI * PHI, r5 = Math.sqrt(5);
      return arrangements([0, 0, 2, 2]).concat(arrangements([1, 1, 1, r5]), arrangements([b, PHI, PHI, PHI]), arrangements([a, a, a, c]),
        arrangements([0, b, 1, c], true), arrangements([0, a, PHI, r5], true), arrangements([a, 1, PHI, 2], true));
    }, sides: '120 dodecahedra' }
  ];

  // Put the corners on a sphere of radius one, and join every pair that is as close as any pair gets.
  function construct(solid) {
    var corners = solid.corners(), n = corners.length, i, j, k;
    corners.forEach(function (p) {
      var r = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2] + p[3] * p[3]);
      for (k = 0; k < 4; k++) p[k] /= r;
    });
    var nearest = Infinity;
    for (j = 1; j < n; j++) {
      var d0 = 0;
      for (k = 0; k < 4; k++) d0 += (corners[0][k] - corners[j][k]) * (corners[0][k] - corners[j][k]);
      if (d0 < nearest) nearest = d0;
    }
    var edges = [];
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
      var d = 0;
      for (k = 0; k < 4; k++) d += (corners[i][k] - corners[j][k]) * (corners[i][k] - corners[j][k]);
      if (d < nearest * 1.02) edges.push(i, j);
    }
    return { name: solid.name, sides: solid.sides, corners: corners, edges: edges };
  }

  Gallery.register('shadow', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var built = [], which = 5, solid = null;
    var turn = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];      // the solid's attitude: a 4 by 4 rotation, row by row
    var bubble = true, through = true;                 // how it is flattened, and which way a drag turns it
    var drag = null, spin = [0, 0], idle = 99, clock = 0, frames = 0;
    var placed = null;                                  // each corner after turning, reused every frame
    var BUCKETS = 10, STEPS = 12;
    var paths = [];
    for (var b = 0; b < BUCKETS; b++) paths.push([]);

    function choose(index) {
      which = index;
      if (!built[which]) built[which] = construct(SOLIDS[which]);
      solid = built[which];
      placed = new Float64Array(solid.corners.length * 4);
      env.live('name', solid.name);
      env.live('corners', Gallery.formatCount(solid.corners.length));
      env.live('edges', Gallery.formatCount(solid.edges.length / 2));
      env.live('sides', solid.sides);
      env.redraw();
    }

    // turn by an angle in the plane of two of the four axes
    function rotate(i, j, angle) {
      var c = Math.cos(angle), s = Math.sin(angle);
      for (var col = 0; col < 4; col++) {
        var a = turn[i * 4 + col], bb = turn[j * 4 + col];
        turn[i * 4 + col] = a * c - bb * s;
        turn[j * 4 + col] = a * s + bb * c;
      }
    }
    // rounding creeps in over thousands of small turns: square the rows up again now and then
    function square() {
      for (var i = 0; i < 4; i++) {
        for (var j = 0; j < i; j++) {
          var dot = 0, k;
          for (k = 0; k < 4; k++) dot += turn[i * 4 + k] * turn[j * 4 + k];
          for (k = 0; k < 4; k++) turn[i * 4 + k] -= dot * turn[j * 4 + k];
        }
        var len = 0;
        for (k = 0; k < 4; k++) len += turn[i * 4 + k] * turn[i * 4 + k];
        len = Math.sqrt(len) || 1;
        for (k = 0; k < 4; k++) turn[i * 4 + k] /= len;
      }
    }

    function move(dt) {
      clock += dt; idle += dt;
      if (!drag) {
        var ease = Math.min(1, Math.max(0, (idle - 1.2) / 2));
        // left alone it turns in two planes at once, which only a thing with four dimensions can do
        rotate(0, 3, 0.19 * dt * ease);
        rotate(1, 2, 0.12 * dt * ease);
        rotate(0, 2, 0.05 * dt * ease);
        if (Math.abs(spin[0]) + Math.abs(spin[1]) > 1e-4) {
          rotate(0, through ? 3 : 2, spin[0] * dt);
          rotate(1, through ? 3 : 2, spin[1] * dt);
          var slow = Math.exp(-dt * 1.8);
          spin[0] *= slow; spin[1] *= slow;
        }
      }
      if (++frames % 240 === 0) square();
    }

    /* ---- drawing ---- */

    var centre = { x: 0, y: 0, scale: 100 };

    // from four dimensions to the screen. Returns false if the point is too near the pole to draw.
    var spot = { x: 0, y: 0, near: 0, size: 1 };
    function flatten(x, y, z, w) {
      var k;
      if (bubble) {
        if (w > 0.93) return false;                     // about to go through infinity
        k = 1 / (1 - w);
        spot.size = k;
      } else {
        k = 1.9 / (2.6 - w);
        spot.size = 1;
      }
      x *= k; y *= k; z *= k;
      var depth = (bubble ? 5.2 : 3.4) - z;
      if (depth < 0.4) return false;
      var f = (bubble ? 2.1 : 2.9) / depth;
      spot.x = centre.x + x * f * centre.scale;
      spot.y = centre.y - y * f * centre.scale;
      spot.near = w;
      return true;
    }

    function render() {
      var ratio = canvas.width / size.w, i, k, e, n = solid.corners.length;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);

      for (i = 0; i < n; i++) {
        var p = solid.corners[i];
        for (k = 0; k < 4; k++) placed[i * 4 + k] = turn[k * 4] * p[0] + turn[k * 4 + 1] * p[1] + turn[k * 4 + 2] * p[2] + turn[k * 4 + 3] * p[3];
      }
      for (k = 0; k < BUCKETS; k++) paths[k].length = 0;

      var pieces = bubble ? STEPS : 1;
      for (e = 0; e < solid.edges.length; e += 2) {
        var a = solid.edges[e] * 4, c = solid.edges[e + 1] * 4, lastX = 0, lastY = 0, lastOk = false;
        for (var s = 0; s <= pieces; s++) {
          var t = s / pieces, x = placed[a] + (placed[c] - placed[a]) * t, y = placed[a + 1] + (placed[c + 1] - placed[a + 1]) * t;
          var z = placed[a + 2] + (placed[c + 2] - placed[a + 2]) * t, w = placed[a + 3] + (placed[c + 3] - placed[a + 3]) * t;
          if (bubble) { var len = Math.sqrt(x * x + y * y + z * z + w * w); x /= len; y /= len; z /= len; w /= len; }   // edges are arcs on the sphere
          var ok = flatten(x, y, z, w);
          if (ok && lastOk && Math.abs(spot.x - lastX) + Math.abs(spot.y - lastY) < size.w) {
            var bucket = Math.max(0, Math.min(BUCKETS - 1, Math.floor((spot.near * 0.5 + 0.5) * BUCKETS)));
            paths[bucket].push(lastX, lastY, spot.x, spot.y);
          }
          lastX = spot.x; lastY = spot.y; lastOk = ok;
        }
      }

      pen.globalCompositeOperation = 'lighter';
      pen.lineCap = 'round';
      var many = solid.edges.length > 400;
      for (k = 0; k < BUCKETS; k++) {
        var list = paths[k];
        if (!list.length) continue;
        // far away in the fourth direction: blue and faint. Near: amber and bright. Bone between.
        var near = k / (BUCKETS - 1), red, green, blue;
        if (near < 0.5) { red = 61 + (233 - 61) * near * 2; green = 91 + (230 - 91) * near * 2; blue = 255 + (223 - 255) * near * 2; }
        else { red = 233 + (255 - 233) * (near - 0.5) * 2; green = 230 + (179 - 230) * (near - 0.5) * 2; blue = 223 + (71 - 223) * (near - 0.5) * 2; }
        var alpha = (many ? 0.3 : 0.5) + (many ? 0.5 : 0.45) * near;
        // in the bubble picture what is near the pole is drawn huge: thin it out so it does not swamp the rest
        pen.strokeStyle = 'rgba(' + Math.round(red) + ',' + Math.round(green) + ',' + Math.round(blue) + ',' + (bubble ? alpha * (1.15 - 0.75 * near) : alpha).toFixed(3) + ')';
        pen.lineWidth = many ? 1 : 1.4;
        pen.beginPath();
        for (i = 0; i < list.length; i += 4) { pen.moveTo(list[i], list[i + 1]); pen.lineTo(list[i + 2], list[i + 3]); }
        pen.stroke();
      }
      // the corners, when there are few enough to tell apart
      if (n <= 120) {
        for (i = 0; i < n; i++) {
          if (!flatten(placed[i * 4], placed[i * 4 + 1], placed[i * 4 + 2], placed[i * 4 + 3])) continue;
          var glow = spot.near * 0.5 + 0.5;
          pen.fillStyle = 'rgba(233,230,223,' + (0.35 + 0.6 * glow).toFixed(3) + ')';
          pen.beginPath(); pen.arc(spot.x, spot.y, (n > 30 ? 1.4 : 2.4) * (0.7 + 0.6 * glow), 0, 6.2832); pen.fill();
        }
      }
      pen.globalCompositeOperation = 'source-over';
    }

    /* ---- wiring ---- */

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, time: performance.now() };
      spin = [0, 0]; idle = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var now = performance.now(), dt = Math.max(0.004, (now - drag.time) / 1000);
      var ax = (e.clientX - drag.x) / centre.scale * 0.9, ay = (e.clientY - drag.y) / centre.scale * 0.9;
      rotate(0, through ? 3 : 2, ax);
      rotate(1, through ? 3 : 2, -ay);
      spin = [spin[0] * 0.5 + ax / dt * 0.5, spin[1] * 0.5 - ay / dt * 0.5];
      drag.x = e.clientX; drag.y = e.clientY; drag.time = now; idle = 0;
      env.redraw();
    });
    function release() {
      if (drag && performance.now() - drag.time > 120) spin = [0, 0];
      drag = null; idle = 0;
      canvas.style.cursor = 'grab';
    }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';

    var dial = env.room.querySelector('[data-shadow-solid]');
    var dialReadout = env.room.querySelector('[data-shadow-solid-value]');
    function readDial() {
      choose(Number(dial.value));
      if (dialReadout) dialReadout.textContent = solid.name.replace(/^The /, 'the ');
    }
    if (dial) dial.addEventListener('input', readDial);
    function group(attribute, choosing) {
      var buttons = Array.prototype.slice.call(env.room.querySelectorAll('[' + attribute + ']'));
      buttons.forEach(function (button) {
        button.addEventListener('click', function () {
          choosing(button.getAttribute(attribute));
          buttons.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
          env.redraw();
        });
      });
    }
    group('data-shadow-flat', function (value) { bubble = value === 'bubble'; });
    group('data-shadow-drag', function (value) { through = value === 'fourth'; });

    if (dial) readDial(); else choose(5);
    rotate(0, 3, 0.6); rotate(1, 2, 0.4); rotate(0, 1, 0.3);

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wide = size.w >= 900;
        centre.x = size.w * (wide ? 0.645 : 0.5);
        centre.y = size.h * (wide ? 0.51 : 0.5);
        centre.scale = wide ? Math.min(size.w * 0.3, size.h * 0.42) : Math.min(size.w * 0.46, size.h * 0.44);
      },
      frame: function (time, dt) { move(dt); render(); },
      still: function () { render(); },
      check: function () {
        var worst = 0;
        for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
          var dot = 0;
          for (var k = 0; k < 4; k++) dot += turn[i * 4 + k] * turn[j * 4 + k];
          worst = Math.max(worst, Math.abs(dot - (i === j ? 1 : 0)));
        }
        return { solid: solid.name, corners: solid.corners.length, edges: solid.edges.length / 2, skew: worst, segments: paths.reduce(function (sum, list) { return sum + list.length / 4; }, 0) };
      }
    };
  });
})();
