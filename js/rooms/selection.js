/* Selection — room 33.

   Richard Dawkins's biomorphs, from The Blind Watchmaker (1986). Nine
   genes, each a small whole number, make a creature: eight of them set the
   directions a branch may grow in, the ninth how many times it branches. A
   creature is drawn by a tree that forks at every step, each fork turning
   one notch to the left and one to the right through the eight directions,
   and the genes are what those directions are.

   The parent sits in the middle, its eight children around it, each
   differing from the parent by a single gene nudged one notch. There is no
   fitness function. The visitor chooses which child will be the parent of
   the next generation, and that choice, repeated, is the whole of the
   selection pressure. Dawkins expected trees and got insects, bats,
   spiders, a lamp and an aeroplane. */
(function () {
  'use strict';

  var GENES = 9, CELLS = 9;

  // the eight directions a branch may take, as vectors made from the first eight genes (Dawkins's own encoding)
  function vectors(g) {
    return {
      dx: [-g[1], -g[0], 0, g[0], g[1], g[2], 0, -g[2]],
      dy: [g[5], g[4], g[3], g[4], g[5], g[6], g[7], g[6]]
    };
  }

  // walk the tree of a creature and hand every segment to a function, as (x1, y1, x2, y2, depth from the root)
  function walk(g, each) {
    var v = vectors(g), depth = g[8], count = 0;
    function tree(x, y, len, dir, left) {
      if (left <= 0) return;
      dir = ((dir % 8) + 8) % 8;
      var x2 = x + len * v.dx[dir], y2 = y + len * v.dy[dir];
      each(x, y, x2, y2, depth - left);
      count++;
      tree(x2, y2, len - 1, dir - 1, left - 1);
      tree(x2, y2, len - 1, dir + 1, left - 1);
    }
    tree(0, 0, depth, 2, depth);
    return count;
  }

  function bounds(g) {
    var b = { x0: 0, y0: 0, x1: 0, y1: 0 };
    walk(g, function (x1, y1, x2, y2) {
      if (x2 < b.x0) b.x0 = x2; if (x2 > b.x1) b.x1 = x2; if (y2 < b.y0) b.y0 = y2; if (y2 > b.y1) b.y1 = y2;
    });
    return b;
  }

  Gallery.register('selection', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var parent, children = [], generation = 0, history = [], born = 0, clock = 0, seed = 33;
    var grid = { x: 0, y: 0, cell: 100 }, hovered = -1, nudge = 1, auto = false, autoClock = 0;
    function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

    /* ---- breeding ---- */

    function firstGenes() {
      var g = [];
      for (var k = 0; k < 8; k++) g.push(Math.floor(random() * 7) - 3);
      g.push(5 + Math.floor(random() * 2));
      return g;
    }

    // a child differs from its parent by one gene, nudged a notch or so
    function mutate(g, which) {
      var child = g.slice();
      var step = (random() < 0.5 ? -1 : 1) * (1 + Math.floor(random() * nudge));
      if (which === 8) child[8] = Math.max(1, Math.min(9, child[8] + (step > 0 ? 1 : -1)));
      else child[which] = Math.max(-9, Math.min(9, child[which] + step));
      if (child.join() === g.join()) return mutate(g, (which + 1) % GENES);
      return child;
    }

    function breed() {
      children = [];
      // the eight children each carry a different mutated gene, so every gene is on offer
      var order = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      for (var k = order.length - 1; k > 0; k--) { var j = Math.floor(random() * (k + 1)); var t = order[k]; order[k] = order[j]; order[j] = t; }
      for (k = 0; k < 8; k++) children.push({ genes: mutate(parent.genes, order[k]), age: 0 });
      born = clock;
      report();
    }

    function creature(genes) { return { genes: genes, age: 0 }; }

    function choose(k) {
      history.push(parent.genes);
      if (history.length > 200) history.shift();
      parent = creature(children[k].genes);
      generation++;
      breed();
    }

    function report() {
      var segments = walk(parent.genes, function () {});
      env.live('generation', generation);
      env.live('genes', parent.genes.map(function (v) { return v < 0 ? '−' + (-v) : String(v); }).join(' '));
      env.live('segments', segments);
    }

    /* ---- drawing ---- */

    var dirty = true;
    function cellOf(k) { return { x: grid.x + (k % 3) * grid.cell, y: grid.y + Math.floor(k / 3) * grid.cell }; }

    // one creature, fitted to its cell, grown from the root outward according to its age
    function drawCreature(c, cell, colour, alpha) {
      var g = c.genes, b = bounds(g), pad = grid.cell * 0.12;
      var w = Math.max(1, b.x1 - b.x0), h = Math.max(1, b.y1 - b.y0);
      var scale = Math.min((grid.cell - pad * 2) / w, (grid.cell - pad * 2) / h, grid.cell / 14);
      // the root is at the bottom and the creature grows upward, as Dawkins drew them
      var cx = cell.x + grid.cell / 2 - (b.x0 + b.x1) / 2 * scale, cy = cell.y + grid.cell / 2 + (b.y0 + b.y1) / 2 * scale;
      var grown = Math.min(g[8], c.age / 0.9 * g[8]);
      pen.strokeStyle = colour;
      pen.globalAlpha = alpha;
      pen.lineWidth = Math.max(1, Math.min(2, scale * 0.35));
      pen.beginPath();
      walk(g, function (x1, y1, x2, y2, d) {
        if (d >= grown) return;
        var f = Math.min(1, grown - d);
        pen.moveTo(cx + x1 * scale, cy - y1 * scale);
        pen.lineTo(cx + (x1 + (x2 - x1) * f) * scale, cy - (y1 + (y2 - y1) * f) * scale);
      });
      pen.stroke();
      pen.globalAlpha = 1;
    }

    function draw() {
      var ratio = canvas.width / size.w;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);
      pen.lineCap = 'round';
      pen.lineJoin = 'round';
      var k, cell;
      // faint frames, so the nine cells read as a litter
      pen.lineWidth = 1;
      pen.strokeStyle = 'rgba(233,230,223,0.1)';
      for (k = 0; k < CELLS; k++) { cell = cellOf(k); pen.strokeRect(cell.x + 0.5, cell.y + 0.5, grid.cell - 1, grid.cell - 1); }
      // the parent, in amber, in the middle
      cell = cellOf(4);
      pen.strokeStyle = 'rgba(255,179,71,0.45)';
      pen.strokeRect(cell.x + 0.5, cell.y + 0.5, grid.cell - 1, grid.cell - 1);
      drawCreature(parent, cell, '#ffb347', 1);
      // the children
      for (k = 0; k < 8; k++) {
        var slot = k < 4 ? k : k + 1;
        cell = cellOf(slot);
        if (hovered === slot) { pen.strokeStyle = 'rgba(233,230,223,0.6)'; pen.strokeRect(cell.x + 0.5, cell.y + 0.5, grid.cell - 1, grid.cell - 1); }
        drawCreature(children[k], cell, '#e9e6df', hovered === slot ? 1 : 0.82);
      }
      dirty = false;
    }

    /* ---- wiring ---- */

    function slotAt(e) {
      var rect = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX - rect.left - grid.x) / grid.cell), y = Math.floor((e.clientY - rect.top - grid.y) / grid.cell);
      if (x < 0 || y < 0 || x > 2 || y > 2) return -1;
      return y * 3 + x;
    }
    canvas.addEventListener('pointermove', function (e) {
      var s = slotAt(e);
      if (s === 4) s = -1;
      if (s !== hovered) { hovered = s; dirty = true; canvas.style.cursor = s >= 0 ? 'pointer' : 'default'; }
    });
    canvas.addEventListener('pointerleave', function () { if (hovered !== -1) { hovered = -1; dirty = true; } });
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var s = slotAt(e);
      if (s < 0 || s === 4) return;
      choose(s < 4 ? s : s - 1);
      dirty = true;
    });
    canvas.style.touchAction = 'pan-y';

    var nudgeDial = env.room.querySelector('[data-selection-nudge]');
    var nudgeReadout = env.room.querySelector('[data-selection-nudge-value]');
    function readNudge() {
      nudge = Number(nudgeDial.value);
      if (nudgeReadout) nudgeReadout.textContent = nudge === 1 ? 'one notch' : nudge === 2 ? 'a notch or two' : nudge === 3 ? 'up to three notches' : 'up to four notches';
    }
    if (nudgeDial) { nudgeDial.addEventListener('input', readNudge); readNudge(); }
    var autoButton = env.room.querySelector('[data-selection-auto]');
    if (autoButton) autoButton.addEventListener('click', function () {
      auto = !auto; autoClock = 0;
      autoButton.setAttribute('aria-pressed', String(auto));
    });
    var backButton = env.room.querySelector('[data-selection-back]');
    if (backButton) backButton.addEventListener('click', function () {
      if (!history.length) return;
      parent = creature(history.pop());
      generation = Math.max(0, generation - 1);
      breed(); dirty = true;
    });
    var againButton = env.room.querySelector('[data-selection-again]');
    if (againButton) againButton.addEventListener('click', function () {
      seed = (Math.random() * 1e9) >>> 0;
      history = []; generation = 0;
      parent = creature(firstGenes());
      breed(); dirty = true;
    });

    // with nobody choosing, the biggest child wins: selection for size alone, which is what a garden does
    function autoChoose() {
      var best = 0, most = -1;
      for (var k = 0; k < 8; k++) {
        var b = bounds(children[k].genes), area = (b.x1 - b.x0) * (b.y1 - b.y0);
        if (area > most) { most = area; best = k; }
      }
      choose(best); dirty = true;
    }

    parent = creature(firstGenes());
    breed();

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wide = size.w >= 900;
        var side = wide ? Math.min(size.w * 0.58, size.h * 0.84) : Math.min(size.w * 0.94, size.h * 0.86);
        grid.cell = side / 3;
        grid.x = (wide ? size.w * 0.645 : size.w * 0.5) - side / 2;
        grid.y = (wide ? size.h * 0.52 : size.h * 0.5) - side / 2;
        dirty = true;
      },
      frame: function (time, dt) {
        dt = Math.min(dt, 0.1);
        clock += dt;
        var growing = false, k;
        parent.age += dt;
        for (k = 0; k < 8; k++) { children[k].age += dt; if (children[k].age < 1) growing = true; }
        if (parent.age < 1) growing = true;
        if (auto) { autoClock += dt; if (autoClock > 1.6) { autoClock = 0; autoChoose(); } }
        if (growing || dirty) draw();
      },
      // With motion paused: the litter fully grown, held
      still: function () {
        parent.age = 5;
        for (var k = 0; k < 8; k++) children[k].age = 5;
        draw();
      },
      litter: function () { return { generation: generation, parent: parent.genes.slice(), children: children.map(function (c) { return c.genes.slice(); }), history: history.length }; }
    };
  });
})();
