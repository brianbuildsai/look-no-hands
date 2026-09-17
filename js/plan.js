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
