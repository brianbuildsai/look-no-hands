/* Knotwork — room 31.

   An endless Celtic knot, woven as it scrolls, by "wave-function collapse"
   (Maxim Gumin, 2016), which despite the name is only this:

     - a strand that reaches the edge of a tile must be met by a strand on
       the tile next door, and the regions between strands must agree;
     - every square of the cloth begins able to be any of sixteen tiles.
       Over and over, the square with the fewest choices left is settled by
       lot, and the consequences are pushed out to its neighbours, whose
       choices narrow, and so on until nothing more follows;
     - if a square is ever left with no choice at all, the tiles around it
       are unpicked and tried again.

   The law of a Celtic knot, over then under then over along every strand,
   is not enforced from above. The regions between the strands are shaded
   like a chessboard, and at every crossing the strand on top is the one with
   a shaded region counterclockwise of it. A diagram is alternating exactly
   when every crossing keeps that one habit, so a cloth that agrees at every
   seam alternates in every loop, without anyone counting. Nothing is
   designed: the knot is what is left when the rules have been obeyed
   everywhere. */
(function () {
  'use strict';

  // Every tile is a picture of strands and of the regions between them, and the
  // regions are painted like a chessboard: no two regions that share a strand
  // may be the same colour. An edge's label says whether a strand crosses it
  // and what colour its first half is (west half for the top and bottom edges,
  // north half for the sides), so tiles next door must simply show the same label.
  var N = 0, E = 1, S = 2, W = 3;
  var STEP = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  var SHAPES = [
    { name: 'empty', ends: null, weight: 1 },
    { name: 'ns', ends: [N, S], weight: 1.3 },
    { name: 'ew', ends: [E, W], weight: 1.3 },
    { name: 'ne', ends: [N, E], weight: 1.1 },
    { name: 'es', ends: [E, S], weight: 1.1 },
    { name: 'sw', ends: [S, W], weight: 1.1 },
    { name: 'wn', ends: [W, N], weight: 1.1 },
    { name: 'cross', ends: null, weight: 1.6 }
  ];
  var TILES = [];
  (function makeTiles() {
    // corner colours (NE, NW, SW, SE) of each shape when its first region is 0
    var CORNERS = { empty: [0, 0, 0, 0], ns: [1, 0, 0, 1], ew: [0, 0, 1, 1], ne: [0, 1, 1, 1], es: [1, 1, 1, 0], sw: [1, 1, 0, 1], wn: [1, 0, 1, 1], cross: [0, 1, 0, 1] };
    for (var sh = 0; sh < SHAPES.length; sh++) {
      for (var flip = 0; flip < 2; flip++) {
        var c = CORNERS[SHAPES[sh].name].map(function (v) { return v ^ flip; });
        var has = [0, 0, 0, 0];
        if (sh === 7) has = [1, 1, 1, 1]; else if (sh) { has[SHAPES[sh].ends[0]] = 1; has[SHAPES[sh].ends[1]] = 1; }
        // label = 2 * colour of the first half + whether a strand crosses
        var edges = [c[1] * 2 + has[N], c[0] * 2 + has[E], c[2] * 2 + has[S], c[1] * 2 + has[W]];
        // at a crossing, the strand on top is the one with a shaded region counterclockwise of it, at every crossing alike;
        // that one habit, kept everywhere, is what makes over and under alternate along every strand
        TILES.push({ shape: sh, edges: edges, has: has, over: sh === 7 ? (c[1] === 0 ? 'ns' : 'ew') : '' });
      }
    }
  })();
  var NT = TILES.length;                                          // sixteen
  var PER_SHAPE = [2, 2, 2, 2, 2, 2, 2, 2];
  var SELVEDGE = (1 << 0) | (1 << 2);                             // the labels with no strand: the cloth's top and bottom

  Gallery.register('knotwork', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var T = 60, COLS = 0, ROWS = 0, CELLS = 0;
    var poss, options, chosen, age, mark;         // per cell: which tiles are still possible, how many, which was settled on, how long ago, whether the visitor fixed it
    var ox = 0, oy = 0, slide = 0;                // where the cloth sits on the stage, and how far it has scrolled
    var settled = 0, unpicked = 0, seed = 31, clock = 0, owed = 0, hurry = 0, reported = -1;
    var blankWeight = 0.6, crossWeight = 2.4;
    var figures = { loops: 0, crossings: 0, strands: 0 };
    function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    function weightOf(t) { var s = TILES[t].shape; return (s === 0 ? blankWeight : s === 7 ? crossWeight : SHAPES[s].weight) / PER_SHAPE[s]; }

    /* ---- the rules ---- */

    function open(i) { poss.fill(1, i * NT, i * NT + NT); options[i] = NT; }

    // strike out every tile of cell (x, y) that no neighbour could meet; true if anything changed
    function narrow(x, y) {
      var i = y * COLS + x, base = i * NT, changed = false, d, t;
      for (d = 0; d < 4; d++) {
        var nx = x + STEP[d][0], ny = y + STEP[d][1], allowed = 0;
        if (ny < 0 || ny >= ROWS) allowed = SELVEDGE;               // top and bottom are the selvedge: no strand leaves
        else if (nx < 0 || nx >= COLS) continue;                    // left and right run on out of sight
        else {
          var nb = (ny * COLS + nx) * NT, back = (d + 2) % 4;
          for (t = 0; t < NT; t++) if (poss[nb + t]) allowed |= 1 << TILES[t].edges[back];
        }
        for (t = 0; t < NT; t++) {
          if (poss[base + t] && !(allowed & (1 << TILES[t].edges[d]))) { poss[base + t] = 0; options[i]--; changed = true; }
        }
      }
      return changed;
    }

    // push the consequences of a change outward until nothing more follows; false on a contradiction
    function propagate(x, y) {
      var queue = [x, y];
      while (queue.length) {
        var cy = queue.pop(), cx = queue.pop();
        for (var d = 0; d < 4; d++) {
          var nx = cx + STEP[d][0], ny = cy + STEP[d][1];
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || chosen[ny * COLS + nx] >= 0) continue;
          if (narrow(nx, ny)) {
            if (!options[ny * COLS + nx]) return false;
            queue.push(nx, ny);
          }
        }
      }
      return true;
    }

    // choose among a cell's remaining tiles by weight, avoiding one shape if it can
    function pickTile(i, avoid) {
      var base = i * NT, total = 0, t, pass;
      for (pass = 0; pass < 2; pass++) {
        total = 0;
        for (t = 0; t < NT; t++) if (poss[base + t] && (pass || TILES[t].shape !== avoid)) total += weightOf(t);
        if (total > 0) break;
      }
      var r = random() * total;
      for (t = 0; t < NT; t++) {
        if (!poss[base + t] || (!pass && TILES[t].shape === avoid)) continue;
        r -= weightOf(t);
        if (r <= 0) return t;
      }
      for (t = NT - 1; t >= 0; t--) if (poss[base + t]) return t;
      return 0;
    }

    function settle(i, t) {
      chosen[i] = t; poss.fill(0, i * NT, i * NT + NT); poss[i * NT + t] = 1; options[i] = 1; age[i] = 0;
      settled++;
      var x = i % COLS, y = (i - x) / COLS;
      if (!propagate(x, y)) unpick(x, y, 2);
    }

    // settle the cell with the fewest choices left
    function collapse() {
      var best = -1, fewest = 99, ties = 0;
      for (var i = 0; i < CELLS; i++) {
        if (chosen[i] >= 0) continue;
        var n = options[i];
        if (n < fewest) { fewest = n; best = i; ties = 1; }
        else if (n === fewest) { ties++; if (random() * ties < 1) best = i; }
      }
      if (best < 0) return false;
      settle(best, pickTile(best, -1));
      return true;
    }

    // undo a patch of the weave and let it be tried again
    function unpick(x, y, radius, byHand) {
      if (radius > Math.max(COLS, ROWS)) { begin(); return; }    // woven into a corner it cannot leave: start the cloth over
      if (!byHand) unpicked++;
      var x0 = Math.max(0, x - radius), x1 = Math.min(COLS - 1, x + radius);
      var y0 = Math.max(0, y - radius), y1 = Math.min(ROWS - 1, y + radius), xx, yy, i;
      for (yy = y0; yy <= y1; yy++) for (xx = x0; xx <= x1; xx++) {
        i = yy * COLS + xx;
        if (chosen[i] >= 0) settled--;
        chosen[i] = -1; mark[i] = 0; open(i);
      }
      // the loosened patch must agree with everything standing around it
      for (yy = y0; yy <= y1; yy++) for (xx = x0; xx <= x1; xx++) {
        narrow(xx, yy);
        if (!options[yy * COLS + xx] || !propagate(xx, yy)) { unpick(x, y, radius + 1); return; }
      }
    }

    function begin() {
      var wide = size.w >= 900;
      T = wide ? Math.round(Math.min(size.w * 0.037, size.h * 0.075)) : Math.round(size.w * 0.115);
      COLS = Math.ceil((wide ? size.w * 0.66 : size.w) / T) + 2;
      ROWS = Math.max(3, Math.floor(size.h * (wide ? 0.82 : 0.84) / T));
      CELLS = COLS * ROWS;
      ox = wide ? size.w * 0.345 : 0; oy = (size.h - ROWS * T) / 2;
      poss = new Uint8Array(CELLS * NT); options = new Uint8Array(CELLS); chosen = new Int8Array(CELLS);
      age = new Float32Array(CELLS); mark = new Uint8Array(CELLS);
      chosen.fill(-1);
      var i, x, y;
      for (i = 0; i < CELLS; i++) open(i);
      for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) narrow(x, y);
      for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) propagate(x, y);
      settled = 0; unpicked = 0; slide = 0; owed = 0; hurry = 90; reported = -1;
      env.redraw();
    }

    // the cloth moves left: the first column goes, a new open column arrives on the right
    function shift() {
      var y, first, last;
      for (y = 0; y < ROWS; y++) {
        first = y * COLS; last = first + COLS - 1;
        if (chosen[first] >= 0) settled--;
        poss.copyWithin(first * NT, (first + 1) * NT, (last + 1) * NT);
        options.copyWithin(first, first + 1, last + 1);
        chosen.copyWithin(first, first + 1, last + 1);
        age.copyWithin(first, first + 1, last + 1);
        mark.copyWithin(first, first + 1, last + 1);
        chosen[last] = -1; mark[last] = 0; age[last] = 0; open(last);
      }
      for (y = 0; y < ROWS; y++) {
        narrow(COLS - 1, y);
        if (!options[y * COLS + COLS - 1] || !propagate(COLS - 1, y)) unpick(COLS - 1, y, 1);
      }
    }

    // the visitor fixes a tile: the patch around it is loosened, the tile is made something else, and the rest must follow
    function fix(x, y) {
      var i = y * COLS + x, was = chosen[i] >= 0 ? TILES[chosen[i]].shape : -1;
      unpick(x, y, 2, true);
      if (chosen[i] >= 0) return;                                   // the patch had to be re-woven wholesale
      // a crossing if one will fit and it was not one already; otherwise anything but what it was
      var t = -1, base = i * NT, k;
      if (was !== 7) { for (k = 0; k < 2; k++) { var c = NT - 1 - Math.floor(random() * 2); if (poss[base + c]) { t = c; break; } } }
      if (t < 0) t = pickTile(i, was);
      settle(i, t);
      if (chosen[i] === t) mark[i] = 1;
      hurry += 30;
    }

    /* ---- drawing ---- */

    var BONE = [233, 230, 223], AMBER = [255, 179, 71];
    var INTERIOR = 'rgb(16,16,18)', VOID = '#000';
    var EPS = 0.7;                                                 // strands overrun their tile by a hair so seams do not show

    // the path of one strand of a tile: straights and quarter arcs between edge midpoints
    function strand(px, py, shape, which) {
      var h = T / 2, e = EPS / h;
      pen.beginPath();
      if (shape === 1 || (shape === 7 && which === 'ns')) { pen.moveTo(px + h, py - EPS); pen.lineTo(px + h, py + T + EPS); }
      else if (shape === 2 || (shape === 7 && which === 'ew')) { pen.moveTo(px - EPS, py + h); pen.lineTo(px + T + EPS, py + h); }
      else if (shape === 3) pen.arc(px + T, py, h, Math.PI / 2 - e, Math.PI + e);
      else if (shape === 4) pen.arc(px + T, py + T, h, Math.PI - e, Math.PI * 1.5 + e);
      else if (shape === 5) pen.arc(px, py + T, h, Math.PI * 1.5 - e, Math.PI * 2 + e);
      else if (shape === 6) pen.arc(px, py, h, -e, Math.PI / 2 + e);
    }

    function colourOf(i) {
      if (mark[i]) return 'rgb(255,179,71)';
      var young = Math.max(0, 1 - age[i] / 1.6);                    // a newly settled tile arrives amber and cools to bone
      young *= young;
      var r = Math.round(BONE[0] + (AMBER[0] - BONE[0]) * young), g = Math.round(BONE[1] + (AMBER[1] - BONE[1]) * young), b = Math.round(BONE[2] + (AMBER[2] - BONE[2]) * young);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function draw() {
      var ratio = canvas.width / size.w;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);
      pen.lineCap = 'butt';
      var w = Math.max(3, T * 0.3), inner = Math.max(1, w - 2), cut = w + T * 0.13;
      var left = ox - slide, x, y, i, t, px, py, shape, base;
      // ghosts: every shape a square could still become, fainter the more there are
      pen.lineWidth = 1;
      for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
        i = y * COLS + x;
        if (chosen[i] >= 0) continue;
        base = i * NT;
        var shapes = 0, count = 0;
        for (t = 0; t < NT; t++) if (poss[base + t] && !(shapes & (1 << TILES[t].shape))) { shapes |= 1 << TILES[t].shape; count++; }
        if (!(shapes & ~1)) continue;
        pen.strokeStyle = 'rgba(143,141,136,' + (0.05 + 0.42 / count).toFixed(3) + ')';
        px = left + x * T; py = oy + y * T;
        for (shape = 1; shape <= 7; shape++) {
          if (!(shapes & (1 << shape))) continue;
          if (shape === 7) { strand(px, py, 7, 'ns'); pen.stroke(); strand(px, py, 7, 'ew'); pen.stroke(); }
          else { strand(px, py, shape, ''); pen.stroke(); }
        }
      }
      // the settled weave: every strand as a ribbon of two hairlines, then the crossings' upper strands cut through
      var pass, crossings = [];
      for (pass = 0; pass < 2; pass++) {
        pen.lineWidth = pass ? inner : w;
        if (pass) pen.strokeStyle = INTERIOR;
        for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
          i = y * COLS + x;
          if (chosen[i] < 0) continue;
          shape = TILES[chosen[i]].shape;
          if (!shape) continue;
          if (!pass) pen.strokeStyle = colourOf(i);
          px = left + x * T; py = oy + y * T;
          if (shape === 7) {
            strand(px, py, 7, 'ns'); pen.stroke(); strand(px, py, 7, 'ew'); pen.stroke();
            if (!pass) crossings.push(i);
          } else { strand(px, py, shape, ''); pen.stroke(); }
        }
      }
      for (var k = 0; k < crossings.length; k++) {
        i = crossings[k]; x = i % COLS; y = (i - x) / COLS;
        px = left + x * T; py = oy + y * T;
        var over = TILES[chosen[i]].over;
        strand(px, py, 7, over);
        pen.lineWidth = cut; pen.strokeStyle = VOID; pen.stroke();
        pen.lineWidth = w; pen.strokeStyle = colourOf(i); pen.stroke();
        pen.lineWidth = inner; pen.strokeStyle = INTERIOR; pen.stroke();
      }
      // the cloth runs off into the dark at the left
      var fade = pen.createLinearGradient(ox - T * 0.6, 0, ox + T * 2.2, 0);
      fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
      pen.fillStyle = fade;
      pen.fillRect(ox - T, 0, T * 3.2, size.h);
    }

    /* ---- the figures ---- */

    // union-find over strand ends: how many closed loops and loose strands the weave holds right now
    function report() {
      var parent = new Int32Array(CELLS * 4), loose = new Uint8Array(CELLS * 4), used = new Uint8Array(CELLS * 4);
      var i, d, t, x, y, k;
      for (i = 0; i < CELLS * 4; i++) parent[i] = i;
      function find(a) { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; }
      function union(a, b) { a = find(a); b = find(b); if (a !== b) parent[a] = b; }
      var crossings = 0;
      for (i = 0; i < CELLS; i++) {
        if (chosen[i] < 0) continue;
        t = TILES[chosen[i]];
        if (!t.shape) continue;
        if (t.shape === 7) { crossings++; union(i * 4 + N, i * 4 + S); union(i * 4 + E, i * 4 + W); }
        else union(i * 4 + SHAPES[t.shape].ends[0], i * 4 + SHAPES[t.shape].ends[1]);
        x = i % COLS; y = (i - x) / COLS;
        for (d = 0; d < 4; d++) {
          if (!t.has[d]) continue;
          used[i * 4 + d] = 1;
          var nx = x + STEP[d][0], ny = y + STEP[d][1];
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || chosen[ny * COLS + nx] < 0) loose[i * 4 + d] = 1;
          else union(i * 4 + d, (ny * COLS + nx) * 4 + (d + 2) % 4);
        }
      }
      var open = new Uint8Array(CELLS * 4), roots = new Uint8Array(CELLS * 4);
      for (k = 0; k < CELLS * 4; k++) if (used[k] && loose[k]) open[find(k)] = 1;
      var loops = 0, strands = 0;
      for (k = 0; k < CELLS * 4; k++) {
        if (!used[k]) continue;
        var r = find(k);
        if (roots[r]) continue;
        roots[r] = 1;
        if (open[r]) strands++; else loops++;
      }
      figures.loops = loops; figures.strands = strands; figures.crossings = crossings;
      env.live('tiles', settled);
      env.live('loops', loops);
      env.live('crossings', crossings);
      env.live('unpicked', unpicked);
    }

    // a check on the rules: every seam must agree, and over and under must alternate along every strand
    function weave() {
      var seams = 0, alternation = 0, contradictions = 0, undecided = 0, i, x, y, d;
      for (i = 0; i < CELLS; i++) {
        x = i % COLS; y = (i - x) / COLS;
        if (chosen[i] < 0) { undecided++; if (!options[i]) contradictions++; continue; }
        var t = TILES[chosen[i]];
        for (d = 0; d < 4; d++) {
          var nx = x + STEP[d][0], ny = y + STEP[d][1];
          if (nx < 0 || nx >= COLS) continue;
          if (ny < 0 || ny >= ROWS) { if (t.has[d]) seams++; continue; }
          var j = ny * COLS + nx;
          if (chosen[j] < 0) continue;
          if (TILES[chosen[j]].edges[(d + 2) % 4] !== t.edges[d]) seams++;
        }
        if (t.shape !== 7) continue;
        // follow each strand out of this crossing, both ways, to the next crossing it meets; it must be the other way up there
        for (var out0 = 0; out0 < 4; out0++) {
          var overHere = t.over === (out0 % 2 === 0 ? 'ns' : 'ew'), out = out0;
          var cx = x, cy = y, steps = 0;
          while (out >= 0 && steps++ < CELLS) {
            cx += STEP[out][0]; cy += STEP[out][1];
            if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS || chosen[cy * COLS + cx] < 0) break;
            var u = TILES[chosen[cy * COLS + cx]], inAt = (out + 2) % 4;
            if (u.shape === 7) { if ((u.over === (inAt % 2 === 0 ? 'ns' : 'ew')) === overHere) alternation++; break; }
            out = -1;
            for (d = 0; d < 4; d++) if (d !== inAt && u.has[d]) out = d;
          }
        }
      }
      return { settled: settled, undecided: undecided, contradictions: contradictions, seams: seams, alternation: alternation, loops: figures.loops, strands: figures.strands, crossings: figures.crossings, unpicked: unpicked, cols: COLS, rows: ROWS };
    }

    /* ---- wiring ---- */

    var lastCell = -1;
    function cellAt(e) {
      var rect = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX - rect.left - (ox - slide)) / T), y = Math.floor((e.clientY - rect.top - oy) / T);
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return -1;
      return y * COLS + x;
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var i = cellAt(e);
      if (i < 0) return;
      lastCell = i;
      fix(i % COLS, Math.floor(i / COLS));
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      env.redraw();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!(e.buttons & 1)) return;
      var i = cellAt(e);
      if (i < 0 || i === lastCell) return;
      lastCell = i;
      // a finger drawn along the weave unties it, and it ties itself again behind
      unpick(i % COLS, Math.floor(i / COLS), 1, true);
      hurry += 12;
      env.redraw();
    });
    canvas.style.cursor = 'pointer';
    canvas.style.touchAction = 'pan-y';

    var crossDial = env.room.querySelector('[data-knotwork-cross]');
    var crossReadout = env.room.querySelector('[data-knotwork-cross-value]');
    function readCross() {
      crossWeight = Number(crossDial.value) / 10;
      if (crossReadout) crossReadout.textContent = crossWeight === 0 ? 'never' : crossWeight < 1 ? 'now and then' : crossWeight < 2.5 ? 'often' : 'a plait';
    }
    if (crossDial) { crossDial.addEventListener('input', readCross); readCross(); }
    var openDial = env.room.querySelector('[data-knotwork-open]');
    var openReadout = env.room.querySelector('[data-knotwork-open-value]');
    function readOpen() {
      blankWeight = Number(openDial.value) / 10;
      if (openReadout) openReadout.textContent = blankWeight === 0 ? 'solid' : blankWeight < 0.8 ? 'close' : blankWeight < 2 ? 'airy' : 'sparse';
    }
    if (openDial) { openDial.addEventListener('input', readOpen); readOpen(); }
    var again = env.room.querySelector('[data-knotwork-again]');
    if (again) again.addEventListener('click', function () { seed = (Math.random() * 1e9) >>> 0; begin(); });

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        begin();
      },
      frame: function (time, dt) {
        dt = Math.min(dt, 0.05);
        clock += dt;
        var pace = T * 0.26;                                        // the cloth crawls a tile every few seconds
        slide += pace * dt;
        while (slide >= T) { slide -= T; shift(); }
        owed += dt * (ROWS * pace / T * 1.2 + hurry);
        hurry *= Math.exp(-dt * 0.7);
        var budget = 40;
        while (owed >= 1 && budget-- > 0) { owed--; if (!collapse()) { owed = 0; break; } }
        for (var i = 0; i < CELLS; i++) age[i] += dt;
        if (clock - reported > 0.4) { reported = clock; report(); }
        draw();
      },
      // With motion paused: the whole cloth settled at once, and held
      still: function () {
        var guard = CELLS * 4;
        while (guard-- > 0 && collapse()) { /* settle everything */ }
        for (var i = 0; i < CELLS; i++) age[i] = 5;
        report();
        draw();
      },
      weave: weave
    };
  });
})();
