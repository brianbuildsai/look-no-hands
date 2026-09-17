/* plan.js — the small drawings on the floor plan.

   Each room on the plan gets a line drawing of what is inside it. They are
   not pictures either: each is a few lines of geometry drawn onto a canvas
   when the page loads, in the same hairline as the walls. */
(function () {
  'use strict';

  var BONE = 'rgba(233,230,223,';
  var glyphs = {};

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
