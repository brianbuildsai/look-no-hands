/* The Hand It Doesn't Have — room 13.

   String art, solved live. There is a ring of nails, one continuous thread,
   and a small picture of what is wanted (a hand, light on dark). From the
   nail the thread is at, every straight run to every other nail is tried in
   the imagination: how much of the still-missing picture would this line
   lie across, on average? The best one is wound, the picture is marked down
   along it so the same ground is not covered twice, and the question is
   asked again from the new nail. A few thousand times.

   The solver knows nothing about hands. The picture it works from is drawn
   in code (js/hand.js), not loaded. */
(function () {
  'use strict';

  var NAILS = 240;
  var GRID = 240;                 // the solver's picture is GRID x GRID cells
  var MAX_RUNS = 3400;
  var TAKE = 0.09;                // how much of the picture one run of thread accounts for
  var BOARD_METRES = 0.6;

  Gallery.register('hand', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var need = new Float32Array(GRID * GRID);      // what is still missing from the picture
    var nailX = new Float32Array(NAILS), nailY = new Float32Array(NAILS);   // in grid cells
    var runs = [];                                  // the nails visited, in order
    var at = 0, before = -1;
    var finished = false;
    var length = 0;                                 // thread wound so far, in board diameters
    var board = { x: 0, y: 0, r: 100 };
    var perFrame = 1;
    var subject = { letters: '' };
    var drawnUpTo = 0;
    var debt = 0;

    var layer = document.createElement('canvas');   // the thread wound so far, kept apart from the board
    var layerPen = layer.getContext('2d');

    /* ---- the picture to be wound ---- */

    function makePicture() {
      var c = document.createElement('canvas');
      c.width = c.height = GRID;
      var g = c.getContext('2d');
      g.fillStyle = '#000';
      g.fillRect(0, 0, GRID, GRID);
      g.translate(GRID / 2, GRID / 2);
      if (subject.letters) {
        g.font = '600 100px Fraunces, "Iowan Old Style", Georgia, serif';
        var wide = g.measureText(subject.letters).width || 1;
        var px = Math.min(GRID * 0.78 / wide * 100, GRID * 0.82);
        g.font = '600 ' + px + 'px Fraunces, "Iowan Old Style", Georgia, serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#fff';
        g.fillText(subject.letters, 0, px * 0.05);
      } else {
        // the hand, lit a little from the palm so the thread gathers there first
        var glow = g.createRadialGradient(0, GRID * 0.1, GRID * 0.04, 0, 0, GRID * 0.46);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(1, '#a6a6a6');
        g.fillStyle = glow;
        g.beginPath();
        Gallery.hand(GRID * 0.76, 10).forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
        g.closePath();
        g.fill();
      }
      var data = g.getImageData(0, 0, GRID, GRID).data;
      var raw = new Float32Array(GRID * GRID), x, y;
      for (var i = 0; i < GRID * GRID; i++) raw[i] = data[i * 4] / 255;
      // soften the edges a little, and ignore anything outside the ring of nails
      var half = GRID / 2, reach = (half - 3) * (half - 3);
      for (y = 1; y < GRID - 1; y++) {
        for (x = 1; x < GRID - 1; x++) {
          var inside = (x - half) * (x - half) + (y - half) * (y - half) < reach;
          var sum = 0;
          for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) sum += raw[(y + oy) * GRID + x + ox];
          need[y * GRID + x] = inside ? sum / 9 : 0;
        }
      }
    }

    function restart() {
      for (var k = 0; k < NAILS; k++) {
        var a = k / NAILS * Math.PI * 2 - Math.PI / 2;
        nailX[k] = GRID / 2 + Math.cos(a) * (GRID / 2 - 1.5);
        nailY[k] = GRID / 2 + Math.sin(a) * (GRID / 2 - 1.5);
      }
      makePicture();
      at = 0; before = -1;
      runs = [0];
      length = 0;
      finished = false;
      drawnUpTo = 0;
      debt = 0;
      layerPen.setTransform(1, 0, 0, 1, 0, 0);
      layerPen.clearRect(0, 0, layer.width, layer.height);
      report();
      env.redraw();
    }

    /* ---- the solver ---- */

    // Walk the straight line between two nails, one cell at a time. With
    // `take` it marks the picture down along the way; without, it only looks.
    function along(a, b, take) {
      var x = nailX[a], y = nailY[a];
      var dx = nailX[b] - x, dy = nailY[b] - y;
      var n = Math.max(Math.abs(dx), Math.abs(dy)) | 0;
      if (n < 1) return 0;
      dx /= n; dy /= n;
      var sum = 0;
      for (var k = 0; k <= n; k++) {
        var cell = ((y + 0.5) | 0) * GRID + ((x + 0.5) | 0);
        if (take) need[cell] = Math.max(-0.12, need[cell] - take);
        else sum += need[cell];
        x += dx; y += dy;
      }
      return sum / (n + 1);
    }

    function wind() {
      var best = -Infinity, choice = -1;
      for (var j = 0; j < NAILS; j++) {
        var gap = Math.abs(j - at);
        if (gap > NAILS / 2) gap = NAILS - gap;
        if (gap < 12 || j === before) continue;         // no point running to a neighbour, or straight back
        var score = along(at, j, 0);
        if (score > best) { best = score; choice = j; }
      }
      // stop when the thread runs out, or when no run would add more than it spoils
      if (choice < 0 || best < 0.002 || runs.length > MAX_RUNS) { finished = true; return; }
      along(at, choice, TAKE);
      var cx = nailX[choice] - nailX[at], cy = nailY[choice] - nailY[at];
      length += Math.sqrt(cx * cx + cy * cy) / GRID;
      before = at;
      at = choice;
      runs.push(choice);
    }

    function report() {
      env.live('runs', Gallery.formatCount(runs.length - 1));
      env.live('nails', NAILS);
      env.live('metres', Gallery.formatCount(length * BOARD_METRES));
    }

    /* ---- drawing ---- */

    function spotX(n) { return board.x + (nailX[n] / GRID - 0.5) * 2 * board.r; }
    function spotY(n) { return board.y + (nailY[n] / GRID - 0.5) * 2 * board.r; }

    function render() {
      var ratio = canvas.width / size.w, k;
      // add whatever has been wound since last time to the thread layer
      if (drawnUpTo < runs.length - 1) {
        layerPen.setTransform(ratio, 0, 0, ratio, 0, 0);
        layerPen.globalCompositeOperation = 'lighter';
        layerPen.strokeStyle = 'rgba(233,230,223,0.15)';
        layerPen.lineWidth = Math.max(0.55, board.r / 520);
        for (k = drawnUpTo; k < runs.length - 1; k++) {
          layerPen.beginPath();
          layerPen.moveTo(spotX(runs[k]), spotY(runs[k]));
          layerPen.lineTo(spotX(runs[k + 1]), spotY(runs[k + 1]));
          layerPen.stroke();
        }
        drawnUpTo = runs.length - 1;
      }

      pen.setTransform(1, 0, 0, 1, 0, 0);
      pen.clearRect(0, 0, canvas.width, canvas.height);
      pen.drawImage(layer, 0, 0);
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.strokeStyle = 'rgba(233,230,223,0.22)';
      pen.lineWidth = 1;
      pen.beginPath();
      pen.arc(board.x, board.y, board.r + 7, 0, 6.2832);
      pen.stroke();
      pen.fillStyle = 'rgba(233,230,223,0.55)';
      for (k = 0; k < NAILS; k++) pen.fillRect(spotX(k) - 0.75, spotY(k) - 0.75, 1.5, 1.5);

      // the run being wound now, and the nail the thread is at
      if (!finished && runs.length > 1) {
        pen.strokeStyle = 'rgba(255,179,71,0.9)';
        pen.lineWidth = 1.2;
        pen.beginPath();
        pen.moveTo(spotX(runs[runs.length - 2]), spotY(runs[runs.length - 2]));
        pen.lineTo(spotX(at), spotY(at));
        pen.stroke();
      }
      if (!finished) {
        pen.fillStyle = '#ffb347';
        pen.beginPath();
        pen.arc(spotX(at), spotY(at), 3.5, 0, 6.2832);
        pen.fill();
      }
    }

    /* ---- wiring ---- */

    function resize() {
      var ratio = Math.min(size.dpr, 2);
      canvas.width = Math.max(1, Math.round(size.w * ratio));
      canvas.height = Math.max(1, Math.round(size.h * ratio));
      layer.width = canvas.width;
      layer.height = canvas.height;
      var wide = size.w >= 900;
      board.x = size.w * (wide ? 0.64 : 0.5);
      board.y = size.h * (wide ? 0.51 : 0.5);
      board.r = wide ? Math.min(size.w * 0.27, size.h * 0.4) : Math.min(size.w * 0.46, size.h * 0.46) - 8;
      drawnUpTo = 0;               // the layer was wiped by the resize: wind it all on again
    }

    var input = env.room.querySelector('[data-hand-letters]');
    var form = env.room.querySelector('[data-hand-form]');
    var typing = 0;
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });
    if (input) {
      input.addEventListener('input', function () {
        clearTimeout(typing);
        typing = setTimeout(function () {
          subject.letters = input.value.replace(/\s+/g, '').slice(0, 3);
          restart();
        }, 450);
      });
    }
    var handButton = env.room.querySelector('[data-hand-hand]');
    if (handButton) handButton.addEventListener('click', function () { subject.letters = ''; if (input) input.value = ''; restart(); });
    var againButton = env.room.querySelector('[data-hand-again]');
    if (againButton) againButton.addEventListener('click', restart);

    var paceDial = env.room.querySelector('[data-hand-pace]');
    var paceReadout = env.room.querySelector('[data-hand-pace-value]');
    function readPace() {
      perFrame = Number(paceDial.value);
      if (paceReadout) paceReadout.textContent = Math.round(perFrame * 60) + ' runs a second';
    }
    if (paceDial) { paceDial.addEventListener('input', readPace); readPace(); }

    // letters are wound in the show's typeface, so wait for it before the first picture is made
    if (document.fonts && document.fonts.load) {
      document.fonts.load('600 100px Fraunces').then(function () { if (subject.letters) restart(); }).catch(function () {});
    }

    restart();

    return {
      resize: resize,
      frame: function (time, dt) {
        if (!finished) {
          debt += perFrame * Math.min(2, dt * 60);
          while (debt >= 1 && !finished) { wind(); debt -= 1; }
          report();
        }
        render();
      },
      // With motion paused: wind the whole thing at once and show it finished.
      still: function () {
        while (!finished) wind();
        report();
        render();
      }
    };
  });
})();
