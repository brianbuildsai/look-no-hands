/* plan.js — the small drawings on the floor plan.

   Each room on the plan gets a line drawing of what is inside it. They are
   not pictures either: each is a few lines of geometry drawn onto a canvas
   when the page loads, in the same hairline as the walls. */
(function () {
  'use strict';

  var BONE = 'rgba(233,230,223,';
  var glyphs = {};

  // room 6: two eddies turning against each other
  glyphs.weather = function (pen, s) {
    [[-0.36, 0.03, 1], [0.37, -0.04, -1]].forEach(function (eddy) {
      pen.beginPath();
      for (var i = 0; i <= 160; i++) {
        var t = i / 160;
        var a = eddy[2] * t * 13 + 0.6;
        var r = s * (0.03 + 0.33 * t);
        var x = eddy[0] * s + Math.cos(a) * r, y = eddy[1] * s + Math.sin(a) * r * 0.86;
        if (i) pen.lineTo(x, y); else pen.moveTo(x, y);
      }
      pen.stroke();
    });
  };

  // room 7: a dark disc, its ring, and the ring's far side arched over it
  glyphs.horizon = function (pen, s) {
    var r = s * 0.17;
    pen.beginPath(); pen.arc(0, 0, r, 0, 6.2832); pen.fill();
    pen.beginPath(); pen.ellipse(0, 0, s * 0.62, s * 0.085, 0, 0, 6.2832); pen.stroke();
    pen.beginPath(); pen.ellipse(0, 0, r * 1.75, r * 1.6, 0, Math.PI, 0); pen.stroke();
    pen.beginPath(); pen.ellipse(0, 0, r * 1.45, r * 1.3, 0, 0.35, Math.PI - 0.35); pen.stroke();
  };

  // room 8: one pendulum at the top, several by the bottom
  glyphs.alike = function (pen, s) {
    var top = -s * 0.42, arm = s * 0.4;
    var elbowX = Math.sin(0.5) * arm, elbowY = top + Math.cos(0.5) * arm;
    pen.beginPath(); pen.moveTo(0, top); pen.lineTo(elbowX, elbowY); pen.stroke();
    [-0.9, -0.55, -0.2, 0.15, 0.5].forEach(function (a, i) {
      pen.globalAlpha = 0.35 + i * 0.16;
      pen.beginPath(); pen.moveTo(elbowX, elbowY); pen.lineTo(elbowX + Math.sin(a) * arm, elbowY + Math.cos(a) * arm); pen.stroke();
    });
    pen.globalAlpha = 1;
    pen.beginPath(); pen.arc(0, top, 2, 0, 6.2832); pen.fill();
    pen.beginPath(); pen.arc(elbowX, elbowY, 2.5, 0, 6.2832); pen.fill();
  };

  // room 9: circles riding on circles
  glyphs.pencil = function (pen, s) {
    var x = -s * 0.22, y = s * 0.08;
    [[0.34, -0.5], [0.17, 0.9], [0.085, -2.0], [0.04, 0.4]].forEach(function (c) {
      var r = c[0] * s;
      pen.beginPath(); pen.arc(x, y, r, 0, 6.2832); pen.stroke();
      var nx = x + Math.cos(c[1]) * r, ny = y + Math.sin(c[1]) * r;
      pen.beginPath(); pen.moveTo(x, y); pen.lineTo(nx, ny); pen.stroke();
      x = nx; y = ny;
    });
    pen.beginPath(); pen.arc(x, y, 2.5, 0, 6.2832); pen.fill();
  };

  // room 10: lines of ink pulled into feathers by a comb
  glyphs.endpapers = function (pen, s) {
    for (var row = -3; row <= 3; row++) {
      pen.beginPath();
      for (var i = 0; i <= 60; i++) {
        var x = (i / 60 - 0.5) * s * 1.5;
        var tooth = Math.abs(((x / (s * 0.25)) % 1 + 1.5) % 1 - 0.5);
        var y = row * s * 0.12 + Math.pow(2, -tooth * 9) * s * 0.17 * (row % 2 ? -1 : 1);
        if (i) pen.lineTo(x, y); else pen.moveTo(x, y);
      }
      pen.stroke();
    }
  };

  // room 11: food, and the roads between it
  glyphs.wayfinding = function (pen, s) {
    var towns = [[-0.62, -0.1], [-0.2, -0.36], [-0.12, 0.3], [0.28, -0.08], [0.66, -0.32], [0.6, 0.3]];
    [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [1, 2]].forEach(function (road) {
      var a = towns[road[0]], b = towns[road[1]];
      var mx = (a[0] + b[0]) / 2 + (a[1] - b[1]) * 0.18, my = (a[1] + b[1]) / 2 + (b[0] - a[0]) * 0.18;
      pen.beginPath(); pen.moveTo(a[0] * s, a[1] * s); pen.quadraticCurveTo(mx * s, my * s, b[0] * s, b[1] * s); pen.stroke();
    });
    towns.forEach(function (t) {
      pen.save(); pen.fillStyle = '#000';
      pen.beginPath(); pen.arc(t[0] * s, t[1] * s, 4, 0, 6.2832); pen.fill(); pen.stroke();
      pen.restore();
    });
  };

  // room 12: two spirals, each with a tail pulled out toward the other
  glyphs.introduction = function (pen, s) {
    [[-0.34, 0.06, 1, 0.3], [0.36, -0.08, -1, 0.24]].forEach(function (g) {
      for (var arm = 0; arm < 2; arm++) {
        pen.beginPath();
        for (var i = 0; i <= 50; i++) {
          var t = i / 50, a = g[2] * (t * 4.2) + arm * Math.PI, r = g[3] * s * t * (arm === 0 ? 1.45 : 1);
          var x = g[0] * s + Math.cos(a) * r, y = g[1] * s + Math.sin(a) * r * 0.62;
          if (i) pen.lineTo(x, y); else pen.moveTo(x, y);
        }
        pen.stroke();
      }
      pen.beginPath(); pen.arc(g[0] * s, g[1] * s, 2.5, 0, 6.2832); pen.fill();
    });
  };

  // room 13: a ring of nails and the chords between them
  glyphs.hand = function (pen, s) {
    var r = s * 0.46, n = 28;
    pen.save();
    pen.globalAlpha = 0.5;
    for (var i = 0; i < n; i++) {
      var a = i / n * 6.2832, b = ((i * 11) % n) / n * 6.2832;
      pen.beginPath(); pen.moveTo(Math.cos(a) * r, Math.sin(a) * r); pen.lineTo(Math.cos(b) * r, Math.sin(b) * r); pen.stroke();
    }
    pen.restore();
    for (i = 0; i < n; i++) { pen.beginPath(); pen.arc(Math.cos(i / n * 6.2832) * r, Math.sin(i / n * 6.2832) * r, 1.2, 0, 6.2832); pen.fill(); }
  };

  // room 14: three necklaces, some beads sounded
  glyphs.necklaces = function (pen, s) {
    [[0.46, 16, 5], [0.31, 8, 3], [0.16, 4, 1]].forEach(function (ring) {
      var r = ring[0] * s, n = ring[1], k = ring[2];
      pen.save(); pen.globalAlpha = 0.4; pen.beginPath(); pen.arc(0, 0, r, 0, 6.2832); pen.stroke(); pen.restore();
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + i / n * 6.2832, on = (i * k) % n < k;
        pen.beginPath(); pen.arc(Math.cos(a) * r, Math.sin(a) * r, on ? 3 : 1, 0, 6.2832); pen.fill();
      }
    });
    pen.beginPath(); pen.moveTo(0, 0); pen.lineTo(s * 0.34, -s * 0.34); pen.stroke();
  };

  // room 15: an hourglass, half run
  glyphs.hourglass = function (pen, s) {
    var w = s * 0.3, h = s * 0.44;
    pen.beginPath();
    pen.moveTo(-w, -h); pen.lineTo(w, -h); pen.lineTo(1.5, 0); pen.lineTo(w, h); pen.lineTo(-w, h); pen.lineTo(-1.5, 0);
    pen.closePath(); pen.stroke();
    pen.beginPath(); pen.moveTo(-w * 0.55, -h * 0.5); pen.lineTo(w * 0.55, -h * 0.5); pen.lineTo(0, -2); pen.closePath(); pen.fill();
    pen.beginPath(); pen.moveTo(-w * 0.8, h - 1); pen.lineTo(w * 0.8, h - 1); pen.lineTo(0, h * 0.5); pen.closePath(); pen.fill();
    pen.beginPath(); pen.moveTo(0, 0); pen.lineTo(0, h * 0.5); pen.stroke();
  };

  // room 16: the cardioid and its bulb, and the same again, smaller, on the needle
  glyphs.bottom = function (pen, s) {
    function set(cx, k) {
      pen.beginPath();
      for (var i = 0; i <= 60; i++) {
        var t = i / 60 * 6.2832;
        var x = (2 * Math.cos(t) - Math.cos(2 * t)) / 4, y = (2 * Math.sin(t) - Math.sin(2 * t)) / 4;
        if (i) pen.lineTo(cx + x * k, -y * k); else pen.moveTo(cx + x * k, -y * k);
      }
      pen.stroke();
      pen.beginPath(); pen.arc(cx - k, 0, k * 0.25, 0, 6.2832); pen.stroke();
    }
    set(s * 0.2, s * 0.42);
    set(-s * 0.4, s * 0.07);
    pen.beginPath(); pen.moveTo(-s * 0.335, 0); pen.lineTo(-s * 0.49, 0); pen.stroke();
  };

  // room 17: cloth swagged between three pegs, with its folds
  glyphs.drapery = function (pen, s) {
    var top = -s * 0.36, w = s * 0.46, k;
    pen.beginPath();
    pen.moveTo(-w, top);
    pen.quadraticCurveTo(-w * 0.5, top + s * 0.14, 0, top);
    pen.quadraticCurveTo(w * 0.5, top + s * 0.14, w, top);
    pen.stroke();
    for (k = -2; k <= 2; k++) {
      var x = k * w / 2, lean = k * s * 0.03;
      pen.beginPath();
      pen.moveTo(x, top + (k % 2 ? s * 0.07 : 0));
      pen.quadraticCurveTo(x + lean * 2, 0, x + lean, s * 0.4 - Math.abs(k) * s * 0.03);
      pen.stroke();
    }
    [-w, 0, w].forEach(function (x) { pen.beginPath(); pen.arc(x, top, 2, 0, 6.2832); pen.fill(); });
  };

  // room 18: a wall with two gaps, plane waves going in, rings coming out
  glyphs.slits = function (pen, s) {
    var x = -s * 0.08, gap = s * 0.05, apart = s * 0.13, k;
    pen.beginPath();
    pen.moveTo(x, -s * 0.46); pen.lineTo(x, -apart - gap);
    pen.moveTo(x, -apart + gap); pen.lineTo(x, apart - gap);
    pen.moveTo(x, apart + gap); pen.lineTo(x, s * 0.46);
    pen.stroke();
    pen.save(); pen.globalAlpha = 0.55;
    for (k = 1; k <= 3; k++) { pen.beginPath(); pen.moveTo(x - k * s * 0.11, -s * 0.4); pen.lineTo(x - k * s * 0.11, s * 0.4); pen.stroke(); }
    for (k = 1; k <= 4; k++) {
      pen.beginPath(); pen.arc(x, -apart, k * s * 0.11, -1.25, 1.25); pen.stroke();
      pen.beginPath(); pen.arc(x, apart, k * s * 0.11, -1.25, 1.25); pen.stroke();
    }
    pen.restore();
  };

  // room 19: a few hundred steps of the recipe itself
  glyphs.numbers = function (pen, s) {
    var a = -1.4, b = 1.6, c = 1.0, d = 0.7, x = 0.1, y = 0.1, k = s * 0.22;
    for (var i = 0; i < 900; i++) {
      var nx = Math.sin(a * y) + c * Math.cos(a * x), ny = Math.sin(b * x) + d * Math.cos(b * y);
      x = nx; y = ny;
      if (i > 20) pen.fillRect(x * k - 0.5, -y * k - 0.5, 1, 1);
    }
  };

  // room 20: a tree that forks three times, and a few specks still out of reach
  glyphs.reaching = function (pen, s) {
    function limb(x, y, angle, length, level) {
      var ex = x + Math.sin(angle) * length, ey = y - Math.cos(angle) * length;
      pen.beginPath(); pen.moveTo(x, y); pen.lineTo(ex, ey); pen.stroke();
      if (level < 3) { limb(ex, ey, angle - 0.5, length * 0.68, level + 1); limb(ex, ey, angle + 0.42, length * 0.72, level + 1); }
    }
    limb(0, s * 0.46, 0.04, s * 0.3, 0);
    [[-0.38, -0.34], [0.4, -0.3], [0.05, -0.46], [-0.2, -0.44], [0.3, -0.42]].forEach(function (p) {
      pen.beginPath(); pen.arc(p[0] * s, p[1] * s, 1.3, 0, 6.2832); pen.fill();
    });
  };

  // room 21: a disc, a seven-sided tile in the middle, and arcs crowding toward the rim
  glyphs.limit = function (pen, s) {
    var R = s * 0.46, k, n = 7;
    pen.beginPath(); pen.arc(0, 0, R, 0, 6.2832); pen.stroke();
    // each edge of the middle tile is an arc of a circle that meets the rim at right angles
    var far = 2.0108 * R, radius = 1.7446 * R;
    for (k = 0; k < n; k++) {
      var a = k / n * 6.2832 + 0.2, cx = Math.cos(a) * far, cy = Math.sin(a) * far, half = Math.atan2(R, radius);
      pen.beginPath(); pen.arc(cx, cy, radius, a + Math.PI - half, a + Math.PI + half); pen.stroke();
    }
    pen.save(); pen.globalAlpha = 0.5;
    for (k = 0; k < n * 2; k++) {
      var b = k / (n * 2) * 6.2832 + 0.2 + 3.1416 / n / 2 * 0, far2 = 1.18 * R, r2 = 0.63 * R, h2 = Math.atan2(R, r2);
      if (k % 2) { pen.beginPath(); pen.arc(Math.cos(b) * far2, Math.sin(b) * far2, r2, b + Math.PI - h2, b + Math.PI + h2); pen.stroke(); }
    }
    pen.restore();
  };

  // room 22: a spine on a curve, with legs
  glyphs.follower = function (pen, s) {
    var pts = [], i;
    for (i = 0; i <= 12; i++) { var t = i / 12; pts.push([(-0.42 + t * 0.84) * s, Math.sin(t * 4.4) * s * 0.13]); }
    pen.beginPath();
    pts.forEach(function (p, k) { if (k) pen.lineTo(p[0], p[1]); else pen.moveTo(p[0], p[1]); });
    pen.stroke();
    for (i = 2; i <= 10; i += 2) {
      var a = pts[i - 1], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.sqrt(dx * dx + dy * dy), nx = -dy / d, ny = dx / d;
      for (var side = -1; side <= 1; side += 2) {
        pen.beginPath();
        pen.moveTo(pts[i][0], pts[i][1]);
        pen.lineTo(pts[i][0] + nx * side * s * 0.1 + dx / d * s * 0.06, pts[i][1] + ny * side * s * 0.1 + dy / d * s * 0.06);
        pen.lineTo(pts[i][0] + nx * side * s * 0.2, pts[i][1] + ny * side * s * 0.2);
        pen.stroke();
      }
    }
    pen.beginPath(); pen.arc(pts[12][0], pts[12][1], 2.4, 0, 6.2832); pen.fill();
  };

  // room 23: four mouths, more and more open
  glyphs.choir = function (pen, s) {
    for (var k = 0; k < 4; k++) {
      var x = (k - 1.5) * s * 0.24, w = s * 0.085, h = s * (0.015 + k * 0.035);
      pen.save(); pen.globalAlpha = 0.45; pen.beginPath(); pen.arc(x, 0, s * 0.105, 0, 6.2832); pen.stroke(); pen.restore();
      pen.beginPath();
      pen.moveTo(x - w * 0.7, s * 0.02);
      pen.quadraticCurveTo(x, s * 0.02 - h, x + w * 0.7, s * 0.02);
      pen.quadraticCurveTo(x, s * 0.02 + h * 1.3, x - w * 0.7, s * 0.02);
      pen.stroke();
    }
  };

  // room 24: a cube inside a cube, corner joined to corner: the tesseract's shadow
  glyphs.shadow = function (pen, s) {
    var big = s * 0.4, small = s * 0.19, lean = s * 0.07, k;
    function square(r, ox, oy) { pen.beginPath(); pen.rect(-r + ox, -r + oy, r * 2, r * 2); pen.stroke(); }
    square(big, 0, 0); square(small, lean, -lean);
    pen.beginPath();
    for (k = 0; k < 4; k++) {
      var sx = k % 2 ? 1 : -1, sy = k < 2 ? 1 : -1;
      pen.moveTo(sx * big, sy * big); pen.lineTo(sx * small + lean, sy * small - lean);
    }
    pen.stroke();
  };

  // room 25: a ball on a plinth under a lamp, and the path of one guess
  glyphs.guesses = function (pen, s) {
    pen.beginPath(); pen.rect(-s * 0.13, s * 0.18, s * 0.26, s * 0.26); pen.stroke();
    pen.beginPath(); pen.arc(0, s * 0.04, s * 0.14, 0, 6.2832); pen.stroke();
    pen.beginPath(); pen.moveTo(-s * 0.16, -s * 0.44); pen.lineTo(s * 0.16, -s * 0.44); pen.stroke();
    pen.save(); pen.globalAlpha = 0.6; pen.setLineDash([2, 3]);
    pen.beginPath(); pen.moveTo(-s * 0.46, s * 0.3); pen.lineTo(-s * 0.1, -s * 0.06); pen.lineTo(-s * 0.36, -s * 0.3); pen.lineTo(0, -s * 0.44); pen.stroke();
    pen.restore();
  };

  // room 26: a crystal of six branches, each with side branches
  glyphs.six = function (pen, s) {
    for (var k = 0; k < 6; k++) {
      var a = k * Math.PI / 3, c = Math.cos(a), sn = Math.sin(a), L = s * 0.45;
      pen.beginPath(); pen.moveTo(0, 0); pen.lineTo(c * L, sn * L); pen.stroke();
      for (var j = 1; j <= 3; j++) {
        var t = j / 4 * L, side = L * (0.28 - j * 0.06);
        for (var d = -1; d <= 1; d += 2) {
          var b = a + d * Math.PI / 3;
          pen.beginPath(); pen.moveTo(c * t, sn * t); pen.lineTo(c * t + Math.cos(b) * side, sn * t + Math.sin(b) * side); pen.stroke();
        }
      }
    }
  };

  // room 27: a square plate with the sand in one of its figures
  glyphs.chladni = function (pen, s) {
    var h = s * 0.42;
    pen.beginPath(); pen.rect(-h, -h, h * 2, h * 2); pen.stroke();
    pen.save(); pen.globalAlpha = 0.8;
    for (var k = 0; k < 4; k++) {
      var a = k * Math.PI / 2;
      pen.beginPath();
      for (var t = 0; t <= 1.001; t += 0.05) {
        var x = t * h * 0.95, y = h * 0.95 * (1 - t) * (1 - t) * 0.25 + h * 0.18 * Math.sin(t * 6.283) ;
        var px = Math.cos(a) * x - Math.sin(a) * y, py = Math.sin(a) * x + Math.cos(a) * y;
        if (t === 0) pen.moveTo(px, py); else pen.lineTo(px, py);
      }
      pen.stroke();
    }
    pen.restore();
    pen.beginPath(); pen.arc(0, 0, 1.6, 0, 6.2832); pen.fill();
  };

  // room 28: a scatter of specks, some of them lit
  glyphs.fireflies = function (pen, s) {
    var seed = 5;
    function r() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    for (var k = 0; k < 42; k++) {
      var x = (r() - 0.5) * s * 0.92, y = (r() - 0.5) * s * 0.92, lit = k % 4 === 0;
      pen.beginPath(); pen.arc(x, y, lit ? 2.6 : 1, 0, 6.2832); pen.fill();
      if (lit) { pen.save(); pen.globalAlpha = 0.35; pen.beginPath(); pen.arc(x, y, 6, 0, 6.2832); pen.stroke(); pen.restore(); }
    }
  };

  // room 29: contour lines of a hill, and a stream running off it
  glyphs.weathering = function (pen, s) {
    for (var k = 1; k <= 4; k++) {
      var r = s * 0.11 * k;
      pen.beginPath();
      for (var t = 0; t <= 1.001; t += 0.04) {
        var a = t * 6.2832, rr = r * (1 + 0.22 * Math.sin(a * 3 + k) + 0.1 * Math.cos(a * 5));
        var x = Math.cos(a) * rr * 1.15, y = Math.sin(a) * rr * 0.85;
        if (t === 0) pen.moveTo(x, y); else pen.lineTo(x, y);
      }
      pen.closePath(); pen.stroke();
    }
    pen.beginPath(); pen.moveTo(s * 0.05, -s * 0.02); pen.quadraticCurveTo(s * 0.2, s * 0.2, s * 0.14, s * 0.46); pen.stroke();
  };

  /* [glyphs] */

  function draw(canvas) {
    var make = glyphs[canvas.getAttribute('data-glyph')];
    if (!make) return;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    var pen = canvas.getContext('2d');
    if (!pen) return;
    pen.setTransform(ratio, 0, 0, ratio, 0, 0);
    pen.lineWidth = 1;
    pen.lineCap = 'round';
    pen.lineJoin = 'round';
    pen.strokeStyle = BONE + '0.8)';
    pen.fillStyle = BONE + '0.8)';
    // every glyph draws inside a box `s` high, centred in the canvas
    var s = Math.min(rect.height, rect.width) - 8;
    pen.translate(rect.width / 2, rect.height / 2);
    make(pen, s);
  }

  function drawAll() {
    document.querySelectorAll('canvas[data-glyph]').forEach(draw);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', drawAll);
  else drawAll();
  var pending = 0;
  window.addEventListener('resize', function () {
    clearTimeout(pending);
    pending = setTimeout(drawAll, 150);
  });
})();
