/* explore.js: stages you look around in.

   A stage is a grid of chambers, four across and three down, each about a
   screen. A maze walk joins them all into one tree (so there are branches
   and dead ends by construction), a loop or two is added, a leaf or two is
   filled back in with rock so the outline is never the same, and the portal
   goes in the chamber furthest from the start. Chambers side by side are
   joined by a doorway; chambers one over another by a hole in the floor with
   a ladder of one-way ledges under it, so it can be climbed and dropped
   through. Then each chamber is furnished (terraces, pillars, a pool of the
   element's hazard with a way over, a high shelf with a chest) and
   peopled, more thickly the further from the start.

   Nothing is trusted: every stage is flood-filled by the same conservative
   model of the Warden as before (single jumps only, so the second jump is
   slack), the portal must be reached, and a chest that cannot be is removed. */
(function () {
  'use strict';
  var WD = window.World;
  if (!WD) return;
  var AIR = WD.AIR, STONE = WD.STONE, LEDGE = WD.LEDGE, SPIKES = WD.SPIKES, HAZARD = WD.HAZARD, TILE = WD.TILE;

  var CW = 20, CH = 14;                          // a chamber's size with its wall (2) and its floor (2); how many across and down is asked for
  var IW = CW - 2, IH = CH - 2;                  // the air inside one

  function explore(seed, floor, section, elementName, across, down) {
    var element = WD.byName(elementName) || WD.ELEMENTS[0], tries = 0, L = null;
    do { L = build(WD.hashSeed(seed, floor, section) + tries * 7919 + 13, element, floor, section, tries >= 8, across || 4, down || 3); } while (!L && ++tries < 14);
    L.tries = tries;
    return L;
  }

  function build(seedValue, element, floor, section, plain, GW, GH) {
    var rnd = WD.makeRandom(seedValue), cols = GW * CW + 2, rows = GH * CH + 2;
    var L = new WD.Level(cols, element, floor, section, rows), x, y, k, c;
    for (k = 0; k < L.tiles.length; k++) L.tiles[k] = STONE;
    var difficulty = floor - 1 + section * 0.4;

    /* the chambers and how they join */
    var cells = [];
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) cells.push({ cx: x, cy: y, i: y * GW + x, links: {}, solid: false, depth: -1, hole: -1 });
    function at(cx, cy) { return cx < 0 || cy < 0 || cx >= GW || cy >= GH ? null : cells[cy * GW + cx]; }
    var DIRS = [['l', -1, 0, 'r'], ['r', 1, 0, 'l'], ['u', 0, -1, 'd'], ['d', 0, 1, 'u']];
    function join(a, b, d) { a.links[d[0]] = b; b.links[d[3]] = a; }
    // a maze walk from the start
    var start = at(Math.floor(rnd() * GW), rnd() < 0.6 ? 0 : Math.floor(rnd() * GH)), stack = [start], seen = {};
    seen[start.i] = true;
    while (stack.length) {
      c = stack[stack.length - 1];
      var open = DIRS.filter(function (d) { var n = at(c.cx + d[1], c.cy + d[2]); return n && !seen[n.i]; });
      if (!open.length) { stack.pop(); continue; }
      // it would rather go sideways than up or down, so floors read as floors
      var d = open[Math.floor(rnd() * open.length)]; if (d[2] !== 0 && rnd() < 0.35) d = open[Math.floor(rnd() * open.length)];
      var n = at(c.cx + d[1], c.cy + d[2]); join(c, n, d); seen[n.i] = true; stack.push(n);
    }
    // a loop or two, so there is more than one way round
    for (k = 0; k < 2; k++) { c = cells[Math.floor(rnd() * cells.length)]; var dd = DIRS[Math.floor(rnd() * 4)], m = at(c.cx + dd[1], c.cy + dd[2]); if (m && !c.links[dd[0]]) join(c, m, dd); }
    // a leaf or two filled back in
    var leaves = cells.filter(function (q) { return q !== start && Object.keys(q.links).length === 1; });
    for (k = 0; k < Math.min(leaves.length - 2, rnd() < 0.5 ? 1 : 2); k++) {
      var gone = leaves.splice(Math.floor(rnd() * leaves.length), 1)[0]; gone.solid = true;
      DIRS.forEach(function (q) { var o = gone.links[q[0]]; if (o) { delete o.links[q[3]]; delete gone.links[q[0]]; } });
    }
    // how far each is from the start; the portal goes furthest
    var queue = [start], far = start; start.depth = 0;
    while (queue.length) { c = queue.shift(); if (c.depth > far.depth) far = c; DIRS.forEach(function (q) { var o = c.links[q[0]]; if (o && o.depth < 0) { o.depth = c.depth + 1; queue.push(o); } }); }

    /* carve: the air of each chamber, its doorways, the holes in its floor and the ladders under them */
    function ox(q) { return 1 + q.cx * CW; } function oy(q) { return 1 + q.cy * CH; }
    cells.forEach(function (q) {
      if (q.solid) return;
      var X = ox(q), Y = oy(q), i, j;
      for (j = 0; j < IH; j++) for (i = 0; i < IW; i++) L.set(X + i, Y + j, AIR);
      q.floorRow = Y + IH; q.reserved = [];
      if (q.links.r) { for (j = IH - 3; j < IH; j++) for (i = IW; i < CW; i++) L.set(X + i, Y + j, AIR); q.reserved.push([IW - 3, IW]); }
      if (q.links.l) q.reserved.push([0, 3]);
      if (q.links.d) {
        q.hole = 3 + Math.floor(rnd() * (IW - 10));
        for (j = IH; j < CH; j++) for (i = 0; i < 4; i++) L.set(X + q.hole + i, Y + j, AIR);
        q.reserved.push([q.hole - 1, q.hole + 5]);
        q.links.d.reservedUp = [q.hole - 1, q.hole + 5];
      }
    });
    // once every chamber is air: a ladder of one-way ledges under each hole, alternating sides, from the floor below up into it
    cells.forEach(function (q) {
      if (q.solid) return;
      if (q.reservedUp) q.reserved.push(q.reservedUp);
      if (!q.links.d) return;
      var X = ox(q), BY = oy(q.links.d), j;
      for (j = 0; j < 7; j++) { var r = IH - 2 - j * 2, side = j % 2 ? 2 : 0; if (r < -1) break; L.set(X + q.hole + side, BY + r, LEDGE); L.set(X + q.hole + side + 1, BY + r, LEDGE); }
    });

    /* furnish and people */
    function free(q, a, b) { for (var r = 0; r < q.reserved.length; r++) if (b > q.reserved[r][0] && a < q.reserved[r][1]) return false; return a >= 1 && b <= IW - 1; }
    function span(q, w) { for (var t = 0; t < 12; t++) { var a = 1 + Math.floor(rnd() * (IW - w - 1)); if (free(q, a, a + w)) return a; } return -1; }
    cells.forEach(function (q) {
      if (q.solid) return;
      var X = ox(q), Y = oy(q), g = q.floorRow, a, w, i, j, leaf = Object.keys(q.links).length === 1 && q !== start, isPortal = q === far;
      L.lights.push({ x: X + 4 + Math.floor(rnd() * (IW - 8)), y: Y + 2 });
      if (q === start) { L.spawn = { x: (X + (q.links.l ? 5 : 2)) * TILE + 8, y: g * TILE }; q.reserved.push([0, 7]); }
      if (isPortal) { a = span(q, 5); if (a < 0) a = 6; q.portalAt = a + 2; q.reserved.push([a - 1, a + 6]); L.door = { x: (X + a + 2) * TILE + 8, y: g * TILE }; }
      if (plain) return;
      var did = 0, order = ['loft', 'terraces', 'pool', 'pillars', 'shelf', 'spikes', 'teeth'].sort(function () { return rnd() - 0.5; });
      order.forEach(function (what) {
        if (did >= 3) return;
        if (what === 'loft') {
          // a second storey over part of the room: a slab from one wall, and two ledges to climb at its open end
          var fromRight = rnd() < 0.5, lw = 7 + Math.floor(rnd() * 3), la, ea, fits = false;
          for (k = 0; k < 2 && !fits; k++) { la = fromRight ? IW - lw : 0; ea = fromRight ? la - 3 : lw; fits = free(q, Math.max(1, fromRight ? ea : 1), Math.min(IW - 1, fromRight ? IW - 1 : lw + 3)); if (!fits) fromRight = !fromRight; }
          if (!fits) return;
          for (i = 0; i < lw; i++) L.set(X + la + i, Y + 5, STONE);
          for (i = 0; i < 2; i++) { L.set(X + ea + i + (fromRight ? 1 : 0), Y + 9, LEDGE); L.set(X + ea + i + (fromRight ? 1 : 0), Y + 7, LEDGE); }
          L.spots.push({ x: X + la + (fromRight ? lw - 2 : 1), y: Y + 5, high: true, shelf: rnd() < 0.6 });
          if (rnd() < 0.7) L.enemies.push({ x: X + la + Math.floor(lw / 2), y: Y + 5, kind: 'walker' });
          q.reserved.push(fromRight ? [ea - 1, IW] : [0, lw + 4]); did++;
          return;
        }
        if (what === 'teeth') {
          // stone hanging from the vault, for the look of it and to make a jump think
          for (k = 0; k < 3; k++) { a = 2 + Math.floor(rnd() * (IW - 4)); if (!free(q, a - 1, a + 2)) continue; var deep = 1 + Math.floor(rnd() * 3); for (j = 0; j < deep; j++) { L.set(X + a, Y + j, STONE); if (j < deep - 1) L.set(X + a + 1, Y + j, STONE); } }
          return;
        }
        if (what === 'terraces') {
          // one-way platforms stepping up the room; whatever is up there is reachable by them
          w = 4 + Math.floor(rnd() * 3); a = span(q, w + 3); if (a < 0) return;
          for (i = 0; i < w; i++) L.set(X + a + i, Y + IH - 3, LEDGE);
          for (i = 0; i < w; i++) L.set(X + a + 2 + i, Y + IH - 6, LEDGE);
          if (rnd() < 0.6) { for (i = 0; i < w - 1; i++) L.set(X + a + i, Y + IH - 9, LEDGE); if (rnd() < 0.5) L.spots.push({ x: X + a + 1, y: Y + IH - 9, high: true }); }
          L.enemies.push({ x: X + a + 3, y: Y + IH - 6, kind: 'perch' }); q.reserved.push([a - 1, a + w + 3]); did++;
        } else if (what === 'pool' && difficulty > 0.3) {
          // the element's hazard sunk in the floor, three wide, with a ledge over it
          a = span(q, 5); if (a < 0) return;
          for (i = 1; i < 4; i++) L.set(X + a + i, g, HAZARD);
          for (i = 1; i < 4; i++) L.set(X + a + i, g - 3, LEDGE);
          q.reserved.push([a, a + 5]); did++;
        } else if (what === 'pillars') {
          a = span(q, 6); if (a < 0) return;
          for (j = 1; j <= 2; j++) { L.set(X + a + 1, g - j, STONE); L.set(X + a + 2, g - j, STONE); }
          for (j = 1; j <= 4; j++) { L.set(X + a + 3, g - j, STONE); L.set(X + a + 4, g - j, STONE); }
          L.spots.push({ x: X + a + 3, y: g - 4, high: true }); q.reserved.push([a, a + 6]); did++;
        } else if (what === 'shelf' && (q.links.l ? !q.links.r : true)) {
          // a shelf of stone on the closed wall, and steps of ledge up to it
          var right = !q.links.r, sx = right ? IW - 5 : 0;
          if (!free(q, right ? IW - 9 : 1, right ? IW - 1 : 9)) return;
          for (i = 0; i < 5; i++) { L.set(X + sx + i, Y + IH - 7, STONE); }
          for (i = 0; i < 2; i++) { L.set(X + (right ? sx - 2 - i : sx + 6 + i), Y + IH - 3, LEDGE); L.set(X + (right ? sx - 1 - i : sx + 5 + i), Y + IH - 5, LEDGE); }
          L.spots.push({ x: X + sx + 2, y: Y + IH - 7, high: true, shelf: true }); q.reserved.push(right ? [IW - 9, IW] : [0, 9]); did++;
        } else if (what === 'spikes' && difficulty > 0.8) {
          a = span(q, 4); if (a < 0) return;
          L.set(X + a + 1, g - 1, SPIKES); L.set(X + a + 2, g - 1, SPIKES); q.reserved.push([a, a + 4]); did++;
        }
      });
      // who lives here: nobody at the start, more the further in, an elder in a dead end
      if (q !== start) {
        var count = Math.min(3, 1 + Math.floor(q.depth / 2 + difficulty * 0.5 + rnd() * 0.8));
        for (k = 0; k < count; k++) { a = 2 + Math.floor(rnd() * (IW - 4)); if (L.get(X + a, g) !== STONE || L.get(X + a, g - 1) !== AIR) continue; L.enemies.push({ x: X + a, y: g, kind: rnd() < 0.3 ? 'flyer' : 'walker' }); }
        if (leaf && !isPortal && rnd() < 0.6) { a = Math.floor(IW / 2); if (L.get(X + a, g) === STONE && L.get(X + a, g - 1) === AIR) L.enemies.push({ x: X + a, y: g, kind: 'brute' }); }
      }
      // what is worth finding: always something in a dead end, sometimes elsewhere
      if ((leaf && !isPortal) || rnd() < 0.22) { a = span(q, 3); if (a >= 0) L.spots.push({ x: X + a + 1, y: g, floor: true, leaf: leaf }); }
    });

    /* is it all true? */
    var reached = WD.reachable(L, true);
    if (!reached) return null;
    function got(tx, ty) { return reached[(ty - 1) * cols + tx]; }
    var good = L.spots.filter(function (s) { return L.get(s.x, s.y) === STONE && L.get(s.x, s.y - 1) === AIR && got(s.x, s.y); });
    // chests: every dead end's, every shelf's, and the rest by chance; never fewer than two
    L.chests = good.filter(function (s) { return s.leaf || s.shelf || rnd() < 0.5; }).map(function (s) { return { x: s.x, y: s.y }; });
    for (k = 0; L.chests.length < 2 && k < good.length; k++) if (!L.chests.some(function (ch) { return ch.x === good[k].x && ch.y === good[k].y; })) L.chests.push({ x: good[k].x, y: good[k].y });
    L.enemies = L.enemies.filter(function (e) { return e.kind === 'flyer' || got(e.x, e.y); });
    // not a crowd: a dozen or so on the first floor, a few more with each
    var cap = Math.round((7 + floor * 2) * (GW * GH) / 12), brutes = L.enemies.filter(function (e) { return e.kind === 'brute'; }), rest = L.enemies.filter(function (e) { return e.kind !== 'brute'; });
    if (rest.length > cap) { var stride = rest.length / cap, kept = []; for (k = 0; k < cap; k++) kept.push(rest[Math.floor(k * stride)]); rest = kept; }
    L.enemies = rest.concat(brutes.slice(0, 2));
    L.portal = true;
    L.grid = { gw: GW, gh: GH, cw: CW, ch: CH, cells: cells.map(function (q) { return { cx: q.cx, cy: q.cy, solid: q.solid, l: !!q.links.l, r: !!q.links.r, u: !!q.links.u, d: !!q.links.d, depth: q.depth }; }), start: { cx: start.cx, cy: start.cy }, portal: { cx: far.cx, cy: far.cy } };
    return L;
  }

  /* The sanctuary between: one still hall, a font in the middle, three plinths and the way on. */
  function sanctuary(seed, floor, elementName) {
    var element = WD.byName(elementName) || WD.ELEMENTS[4], L = new WD.Level(30, element, floor, 0, 16), x, y, g = 11;
    for (x = 0; x < 30; x++) for (y = 0; y < 16; y++) L.set(x, y, x < 2 || x > 27 || y < 3 || y >= g ? STONE : AIR);
    for (x = 12; x < 18; x++) L.set(x, g - 1, STONE);                       // a dais for the three
    L.spawn = { x: 4 * TILE + 8, y: g * TILE };
    L.door = { x: 25 * TILE + 8, y: g * TILE };
    L.fountain = { x: 8 * TILE + 8, y: g * TILE };
    L.plinths = [{ x: 12 * TILE + 8, y: (g - 1) * TILE }, { x: 15 * TILE, y: (g - 1) * TILE }, { x: 17 * TILE + 8, y: (g - 1) * TILE }];
    L.lights.push({ x: 5, y: g - 5 }, { x: 15, y: g - 6 }, { x: 24, y: g - 5 });
    L.portal = true; L.sanctuary = true; L.title = 'A still place';
    return L;
  }

  WD.explore = explore; WD.sanctuary = sanctuary; WD.CHAMBER = { cw: CW, ch: CH };
})();
