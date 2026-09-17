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
