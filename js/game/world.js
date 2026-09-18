/* world.js: the floors of the undercroft, and how they draw themselves.

   A floor belongs to an element and is stitched from chunks by a seeded
   grammar: flats, gaps, steps, ledges, pillars, shafts, arenas and alcoves,
   each chosen from what the last one allows and sized by the floor's
   difficulty. The result is a grid of tiles: air, stone, a ledge you can
   jump up through, spikes, and the element's own hazard. Before a floor is
   used it is checked for reachability by a flood fill over the cells the
   Warden could stand on, joined by the jumps, drops and dashes the engine
   allows, so that no descent is ever impossible. */
(function () {
  'use strict';

  var TILE = 16, ROWS = 16;
  var AIR = 0, STONE = 1, LEDGE = 2, SPIKES = 3, HAZARD = 4;

  var ELEMENTS = [
    { name: 'ember', title: 'The Kilns', stone: ['#3a2a28', '#5a3e38', '#8a6a5c', '#2a1b19'], top: '#d9a074', hazard: 'lava', hazardColours: ['#ff6a2b', '#ffb347', '#ffdc9a'], sky: ['#120806', '#2a120c'], glow: '#ff6a2b', accent: '#ff8c42' },
    { name: 'frost', title: 'The Cellars', stone: ['#2c3644', '#3f4d60', '#6f83a0', '#1d242e'], top: '#dfe9f5', hazard: 'ice', hazardColours: ['#9fd8ff', '#d8f1ff', '#ffffff'], sky: ['#070a12', '#101a2c'], glow: '#9fd8ff', accent: '#6ec6ff' },
    { name: 'storm', title: 'The Galleries', stone: ['#2e2a3c', '#443e58', '#7a7099', '#1e1a28'], top: '#cfc6ee', hazard: 'rail', hazardColours: ['#3d5bff', '#8fa3ff', '#ffffff'], sky: ['#0a0812', '#1a1430'], glow: '#8fa3ff', accent: '#a48cff' },
    { name: 'bloom', title: 'The Cisterns', stone: ['#243328', '#365040', '#5e8a66', '#182219'], top: '#bfe3b0', hazard: 'spores', hazardColours: ['#7cd66a', '#c5ff9a', '#f0ffd8'], sky: ['#050d08', '#0d1f12'], glow: '#7cd66a', accent: '#9ae66e' },
    { name: 'void', title: 'The Vault', stone: ['#1c1a24', '#2b2836', '#4a4560', '#100e16'], top: '#8f8d88', hazard: 'void', hazardColours: ['#5b3fa0', '#a48cff', '#ffffff'], sky: ['#020204', '#0a0812'], glow: '#a48cff', accent: '#ff4f7b' }
  ];

  function makeRandom(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function hashSeed(seed, floor, section) { return ((seed * 2654435761) ^ (floor * 40503) ^ (section * 97)) >>> 0; }

  /* ---- the grammar ----
     A floor is written column by column. `ground` is the row the Warden
     stands on (counted from the top); rows below it are stone, the top row
     is the vault's ceiling. Each chunk writes its columns and hands on the
     ground height it ends at. */

  function Level(cols, element, floor, section, rows) {
    this.cols = cols; this.rows = rows || ROWS; this.tiles = new Uint8Array(cols * this.rows);
    this.element = element; this.floor = floor; this.section = section;
    this.spawn = { x: 24, y: 0 }; this.door = { x: 0, y: 0 };
    this.enemies = []; this.relics = []; this.lights = []; this.chests = []; this.spots = [];
  }
  Level.prototype.get = function (x, y) {
    if (x < 0 || x >= this.cols) return STONE;
    if (y < 0) return STONE;
    if (y >= this.rows) return STONE;
    return this.tiles[y * this.cols + x];
  };
  Level.prototype.set = function (x, y, t) { if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) this.tiles[y * this.cols + x] = t; };
  // cut the grid down to the columns actually written
  Level.prototype.trim = function (cols) {
    var tiles = new Uint8Array(cols * ROWS);
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < cols; x++) tiles[y * cols + x] = this.tiles[y * this.cols + x];
    this.tiles = tiles; this.cols = cols;
  };
  // a column of stone from `ground` down, air above, the ceiling at the top
  Level.prototype.column = function (x, ground, fill) {
    for (var y = 0; y < ROWS; y++) this.set(x, y, y === 0 ? STONE : y >= ground ? (fill === undefined ? STONE : fill) : AIR);
  };

  var CHUNKS = {
    flat: function (L, x, g, rnd, d) {
      var w = 4 + Math.floor(rnd() * 5), k;
      for (k = 0; k < w; k++) L.column(x + k, g);
      // a patch of hazard sunk in the floor, now and then, past the first floor
      if (d > 1 && w >= 6 && rnd() < 0.45) { var hw = 2 + Math.floor(rnd() * 2), hx = x + 2 + Math.floor(rnd() * (w - hw - 3)); for (k = 0; k < hw; k++) { L.set(hx + k, g, HAZARD); } }
      if (w >= 5 && rnd() < 0.7) L.enemies.push({ x: x + Math.floor(w / 2), y: g, kind: 'walker' });
      if (w >= 5) L.spots.push({ x: x + 1, y: g });
      return { x: x + w, g: g };
    },
    gap: function (L, x, g, rnd, d) {
      var w = 2 + Math.floor(rnd() * Math.min(2, 1 + d * 0.5)), k, rise = rnd() < 0.5 ? 0 : rnd() < 0.5 ? -1 : 1;
      if (w >= 3 && rise < 0) rise = 0;
      for (k = 0; k < w; k++) L.column(x + k, ROWS - 1, rnd() < 0.5 && d > 0 ? SPIKES : AIR);
      var g2 = Math.max(4, Math.min(ROWS - 3, g + rise));
      for (k = 0; k < 2; k++) L.column(x + w + k, g2);
      return { x: x + w + 2, g: g2 };
    },
    steps: function (L, x, g, rnd, d) {
      var n = 2 + Math.floor(rnd() * 3), up = rnd() < 0.5 ? -1 : 1, k, j;
      if (g < 6) up = 1; if (g > ROWS - 5) up = -1;
      var gg = g;
      for (k = 0; k < n; k++) {
        var w = 2 + Math.floor(rnd() * 2);
        gg = Math.max(4, Math.min(ROWS - 3, gg + up * (1 + (rnd() < 0.3 ? 1 : 0))));
        for (j = 0; j < w; j++) L.column(x, gg), x++;
      }
      if (rnd() < 0.5) L.enemies.push({ x: x - 1, y: gg, kind: 'walker' });
      return { x: x, g: gg };
    },
    ledges: function (L, x, g, rnd, d) {
      var w = 7 + Math.floor(rnd() * 5), k;
      for (k = 0; k < w; k++) L.column(x + k, g);
      // two or three floating ledges above, each within a jump of the last
      var n = 2 + Math.floor(rnd() * 2), lx = x + 1, ly = g - 3;
      for (k = 0; k < n; k++) {
        var lw = 2 + Math.floor(rnd() * 3);
        ly = Math.max(3, ly - (rnd() < 0.5 ? 0 : 2));
        for (var j = 0; j < lw && lx + j < x + w; j++) L.set(lx + j, ly, LEDGE);
        if (rnd() < 0.55) L.enemies.push({ x: lx + Math.floor(lw / 2), y: ly, kind: rnd() < 0.5 ? 'perch' : 'walker' });
        lx += lw + 1 + Math.floor(rnd() * 2);
      }
      if (rnd() < 0.5) L.enemies.push({ x: x + Math.floor(w / 2), y: g, kind: 'flyer' });
      return { x: x + w, g: g };
    },
    pillar: function (L, x, g, rnd, d) {
      var k, h = 1 + Math.floor(rnd() * 2);
      for (k = 0; k < 2; k++) L.column(x + k, g);
      L.column(x + 2, g - h);
      if (rnd() < 0.5) L.column(x + 3, g - h); else L.column(x + 3, g);
      for (k = 4; k < 6; k++) L.column(x + k, g);
      return { x: x + 6, g: g };
    },
    shaft: function (L, x, g, rnd, d) {
      // the floor falls away: a drop with ledges to catch, landing lower
      var w = 4 + Math.floor(rnd() * 2), k, g2 = Math.min(ROWS - 3, g + 3 + Math.floor(rnd() * 3));
      for (k = 0; k < w; k++) L.column(x + k, g2);
      L.set(x + 1, g + 1, LEDGE); L.set(x + 2, g + 1, LEDGE);
      if (g2 - g > 4) { L.set(x + w - 3, g2 - 3, LEDGE); L.set(x + w - 2, g2 - 3, LEDGE); }
      if (rnd() < 0.4) L.chests.push({ x: x + w - 1, y: g2 });
      return { x: x + w, g: g2 };
    },
    arena: function (L, x, g, rnd, d) {
      var w = 12 + Math.floor(rnd() * 5), k;
      for (k = 0; k < w; k++) L.column(x + k, g);
      L.set(x + 2, g - 3, LEDGE); L.set(x + 3, g - 3, LEDGE); L.set(x + w - 4, g - 3, LEDGE); L.set(x + w - 3, g - 3, LEDGE);
      var n = 2 + Math.floor(rnd() * Math.min(3, 1 + d));
      for (k = 0; k < n; k++) L.enemies.push({ x: x + 3 + Math.floor(rnd() * (w - 6)), y: g, kind: rnd() < 0.3 ? 'flyer' : rnd() < 0.5 ? 'brute' : 'walker' });
      if (rnd() < 0.5) L.lights.push({ x: x + Math.floor(w / 2), y: g - 4 });
      if (rnd() < 0.6) L.chests.push({ x: x + w - 3, y: g - 3 });
      return { x: x + w, g: g };
    },
    alcove: function (L, x, g, rnd, d) {
      // a raised nook with a relic in it, guarded by spikes below
      var w = 8, k;
      for (k = 0; k < w; k++) L.column(x + k, g);
      var ny = Math.max(3, g - 5);
      for (k = 2; k < 6; k++) L.set(x + k, ny, LEDGE);
      L.set(x + 1, g - 2, LEDGE); L.set(x + 6, g - 2, LEDGE);
      for (k = 2; k < 6; k++) L.set(x + k, g, SPIKES);
      L.relics.push({ x: x + 4, y: ny });
      L.lights.push({ x: x + 4, y: ny - 1 });
      return { x: x + w, g: g };
    }
  };
  var FOLLOWS = {
    start: ['flat', 'ledges', 'steps'],
    flat: ['gap', 'steps', 'ledges', 'pillar', 'arena', 'shaft', 'alcove'],
    gap: ['flat', 'steps', 'ledges', 'pillar'],
    steps: ['flat', 'gap', 'ledges', 'arena'],
    ledges: ['flat', 'gap', 'pillar', 'shaft'],
    pillar: ['flat', 'gap', 'ledges'],
    shaft: ['flat', 'ledges', 'arena'],
    arena: ['flat', 'gap', 'steps', 'alcove'],
    alcove: ['flat', 'gap', 'steps']
  };

  function byName(name) { for (var k = 0; k < ELEMENTS.length; k++) if (ELEMENTS[k].name === name) return ELEMENTS[k]; return null; }
  function generate(seed, floor, section, elementName, fountain) {
    var element = byName(elementName) || ELEMENTS[Math.max(0, Math.min(4, floor - 1))];
    var rnd = makeRandom(hashSeed(seed, floor, section));
    var difficulty = floor - 1 + section * 0.34;
    var target = 90 + floor * 10 + section * 8, tries = 0, L;
    do {
      rnd = makeRandom(hashSeed(seed, floor, section) + tries * 7919);
      L = new Level(target + 40, element, floor, section);
      var x = 0, g = 10, k, last = 'start';
      for (k = 0; k < 7; k++) L.column(x + k, g);
      L.spawn = { x: 3 * TILE + 8, y: g * TILE };
      x = 7;
      var alcoves = 0;
      while (x < target) {
        var options = FOLLOWS[last].filter(function (name) { return !(name === 'alcove' && (alcoves >= 1 || floor === 1 && section === 0)) && !(name === 'arena' && x < 20); });
        var name = options[Math.floor(rnd() * options.length)];
        if (name === 'alcove') alcoves++;
        var out = CHUNKS[name](L, x, g, rnd, difficulty);
        x = out.x; g = out.g; last = name;
      }
      // the end: a landing and the door down
      for (k = 0; k < 9; k++) L.column(x + k, g);
      L.door = { x: (x + 6) * TILE + 8, y: g * TILE };
      L.lights.push({ x: x + 6, y: g - 2 });
      L.trim(x + 9);
      for (var y = 0; y < ROWS; y++) L.set(L.cols - 1, y, STONE);
      L.enemies = L.enemies.filter(function (e) { return e.x < x - 2 && e.x > 10; });
      // not a crowd: a handful on the first floor, a few more with each
      var cap = 5 + Math.min(floor, 3) * 2 - (floor > 3 ? 1 : 0);
      if (L.enemies.length > cap) { var stride = L.enemies.length / cap, kept = []; for (k = 0; k < cap; k++) kept.push(L.enemies[Math.floor(k * stride)]); L.enemies = kept; }
      if (fountain) { L.fountain = { x: (x + 2) * TILE + 8, y: g * TILE }; L.lights.push({ x: x + 2, y: g - 3 }); }
      // every section holds at least one chest
      var free = L.spots.filter(function (sp) { return sp.x > 16 && L.get(sp.x, sp.y) === STONE && L.get(sp.x, sp.y - 1) === AIR; });
      if (!L.chests.length && free.length) L.chests.push(free[Math.floor(rnd() * free.length)]);
    } while (!reachable(L) && ++tries < 12);
    L.tries = tries;
    return L;
  }

  /* ---- reachability ----
     Can the Warden get from the start to the door? A cell is standable when
     it is air with something to stand on beneath. From a standable cell the
     Warden can walk to a neighbour, jump up to two rows and across up to
     three columns (less when rising), drop any distance, and dash across up
     to six columns at the same height or lower. A conservative model of the
     engine: if this says yes, the engine agrees. */

  function reachable(L, wantSeen) {
    var cols = L.cols, ROWS = L.rows, k;
    function solid(x, y) { var t = L.get(x, y); return t === STONE; }
    function standing(x, y) { var t = L.get(x, y), below = L.get(x, y + 1); return t === AIR && (below === STONE || below === LEDGE) && !solid(x, y - 1); }
    function open(x, y) { var t = L.get(x, y); return t !== STONE; }
    var seen = new Uint8Array(cols * ROWS), queue = [];
    var sx = Math.floor(L.spawn.x / TILE), sy = Math.floor(L.spawn.y / TILE) - 1;
    var dx = Math.floor(L.door.x / TILE), dy = Math.floor(L.door.y / TILE) - 1;
    if (!standing(sx, sy)) return false;
    seen[sy * cols + sx] = 1; queue.push(sx, sy);
    var found = false;
    function land(x, y) {
      // where a fall from (x, y) ends
      var yy = y;
      while (yy < ROWS - 1 && !standing(x, yy) && open(x, yy)) yy++;
      return standing(x, yy) ? yy : -1;
    }
    function visit(x, y) {
      if (x < 0 || x >= cols || y < 0 || y >= ROWS) return;
      var i = y * cols + x;
      if (seen[i] || !standing(x, y)) return;
      seen[i] = 1; queue.push(x, y);
    }
    function clearPath(x0, y0, x1, y1) {
      // the air between two cells along a straight step, roughly: every cell on the row of the higher one between them must be open
      var top = Math.min(y0, y1), a = Math.min(x0, x1), b = Math.max(x0, x1);
      for (var x = a; x <= b; x++) if (!open(x, top) || !open(x, top - 1)) return false;
      return true;
    }
    while (queue.length) {
      var y = queue.pop(), x = queue.pop();
      if (x === dx && y === dy) { found = true; if (!wantSeen) return true; }
      var dir, reach, rise, tx, ty;
      for (dir = -1; dir <= 1; dir += 2) {
        // walking, and stepping off an edge
        tx = x + dir;
        if (open(tx, y) && open(tx, y - 1)) {
          if (standing(tx, y)) visit(tx, y);
          else { ty = land(tx, y); if (ty >= 0) visit(tx, ty); }
        }
        // jumping: up to two rows up, up to three columns across; higher means shorter
        for (reach = 1; reach <= 3; reach++) {
          for (rise = 0; rise <= 2; rise++) {
            if (reach === 3 && rise > 1) continue;
            tx = x + dir * reach; ty = y - rise;
            if (tx < 0 || tx >= cols || ty < 1) continue;
            if (!clearPath(x, y - rise - 1 < 1 ? 1 : y - rise - 1, tx, ty - 1)) continue;
            if (standing(tx, ty)) visit(tx, ty);
            else if (open(tx, ty)) { var ly = land(tx, ty); if (ly >= 0) visit(tx, ly); }
          }
        }
        // dashing: six columns at the same height or lower, through open air
        var ok = true;
        for (reach = 1; reach <= 6 && ok; reach++) {
          tx = x + dir * reach;
          if (!open(tx, y) || !open(tx, y - 1)) { ok = false; break; }
          if (reach >= 4) { if (standing(tx, y)) visit(tx, y); else { var fy = land(tx, y); if (fy >= 0) visit(tx, fy); } }
        }
      }
      // jumping straight up through a ledge
      for (rise = 1; rise <= 2; rise++) { ty = y - rise; if (L.get(x, ty) === LEDGE && open(x, ty - 1) && standing(x, ty - 1)) visit(x, ty - 1); if (standing(x, ty) && open(x, ty - 1)) visit(x, ty); }
    }
    return wantSeen ? (found ? seen : null) : found;
  }

  // the guardian's arena: a hall with walls at both ends, two ledges, and a door that opens when it is over
  var ARENA_ELEMENT = ['ember', 'frost', 'storm', 'void'];
  // The Great Kiln: one screen of floor with a pit of lava at either end and two ledges over it
  function greatKiln(element, floor) {
    var L = new Level(38, element, floor, 3), g = 11, x, k;
    for (x = 0; x < 38; x++) L.column(x, g);
    for (k = 0; k < ROWS; k++) { L.set(0, k, STONE); L.set(1, k, STONE); L.set(36, k, STONE); L.set(37, k, STONE); }
    [5, 6, 31, 32].forEach(function (px) { L.set(px, g, HAZARD); });
    for (x = 11; x < 14; x++) L.set(x, g - 2, LEDGE);
    for (x = 24; x < 27; x++) L.set(x, g - 2, LEDGE);
    L.spawn = { x: 3 * TILE + 8, y: g * TILE };
    L.door = { x: 34 * TILE + 8, y: g * TILE };
    L.lights.push({ x: 3, y: g - 4 }, { x: 12, y: g - 6 }, { x: 25, y: g - 6 }, { x: 34, y: g - 4 });
    L.boss = true; L.locked = true; L.title = 'The Great Kiln';
    L.arena = { left: 7 * TILE, right: 31 * TILE, groundY: g * TILE, bossX: 24 * TILE, row: g, pits: [5, 6, 31, 32], edges: [7, 8, 9, 28, 29, 30] };
    return L;
  }
  // The Frozen Cistern: a roofed hall of slick ice, three ledges and a high perch
  function frozenCistern(element, floor) {
    var L = new Level(34, element, floor, 3), g = 11, x, k;
    for (x = 0; x < 34; x++) { L.column(x, g); for (k = 0; k < 4; k++) L.set(x, k, STONE); }
    for (k = 0; k < ROWS; k++) { L.set(0, k, STONE); L.set(1, k, STONE); L.set(32, k, STONE); L.set(33, k, STONE); }
    for (x = 6; x < 9; x++) L.set(x, g - 2, LEDGE);
    for (x = 13; x < 16; x++) L.set(x, g - 2, LEDGE);
    for (x = 17; x < 20; x++) L.set(x, g - 4, LEDGE);
    for (x = 25; x < 28; x++) L.set(x, g - 2, LEDGE);
    L.spawn = { x: 3 * TILE + 8, y: g * TILE };
    L.door = { x: 30 * TILE + 8, y: g * TILE };
    L.lights.push({ x: 4, y: g - 4 }, { x: 11, y: g - 6 }, { x: 22, y: g - 6 }, { x: 29, y: g - 4 });
    L.boss = true; L.locked = true; L.slick = true; L.title = 'The Frozen Cistern';
    L.arena = { left: 2 * TILE, right: 32 * TILE, groundY: g * TILE, ceilY: 4 * TILE, bossX: 22 * TILE, row: g };
    return L;
  }
  // The Gallery of Rails: a roofed hall, two rails along its floor, a pylon in each corner, three ledges
  function galleryOfRails(element, floor) {
    var L = new Level(32, element, floor, 3), g = 11, x, k;
    for (x = 0; x < 32; x++) { L.column(x, g); for (k = 0; k < 3; k++) L.set(x, k, STONE); }
    for (k = 0; k < ROWS; k++) { L.set(0, k, STONE); L.set(1, k, STONE); L.set(30, k, STONE); L.set(31, k, STONE); }
    for (x = 5; x < 8; x++) L.set(x, g - 2, LEDGE);
    for (x = 14; x < 18; x++) L.set(x, g - 2, LEDGE);
    for (x = 24; x < 27; x++) L.set(x, g - 2, LEDGE);
    L.spawn = { x: 4 * TILE + 8, y: g * TILE };
    L.door = { x: 28 * TILE + 8, y: g * TILE };
    L.lights.push({ x: 9, y: g - 5 }, { x: 16, y: g - 6 }, { x: 22, y: g - 5 });
    L.boss = true; L.locked = true; L.title = 'The Gallery of Rails';
    L.arena = { left: 2 * TILE, right: 30 * TILE, groundY: g * TILE, ceilY: 3 * TILE, bossX: 21 * TILE, row: g };
    return L;
  }
  // The Vault: a roofed hall with a ledge at either end and a small one in the middle for the third brazier
  function theVault(element, floor) {
    var L = new Level(34, element, floor, 3), g = 11, x, k;
    for (x = 0; x < 34; x++) { L.column(x, g); for (k = 0; k < 3; k++) L.set(x, k, STONE); }
    for (k = 0; k < ROWS; k++) { L.set(0, k, STONE); L.set(1, k, STONE); L.set(32, k, STONE); L.set(33, k, STONE); }
    for (x = 6; x < 9; x++) L.set(x, g - 2, LEDGE);
    for (x = 16; x < 18; x++) L.set(x, g - 2, LEDGE);
    for (x = 25; x < 28; x++) L.set(x, g - 2, LEDGE);
    L.spawn = { x: 4 * TILE + 8, y: g * TILE };
    L.door = { x: 30 * TILE + 8, y: g * TILE };
    L.lights.push({ x: 4, y: g - 4 }, { x: 11, y: g - 6 }, { x: 22, y: g - 6 }, { x: 29, y: g - 4 });
    L.boss = true; L.locked = true; L.title = 'The Vault';
    L.arena = { left: 2 * TILE, right: 32 * TILE, groundY: g * TILE, ceilY: 3 * TILE, bossX: 22 * TILE, row: g };
    return L;
  }
  // The Overgrown Cistern: a roofed hall with her in the middle of it, a ledge at either end and a higher one beyond each
  function overgrownCistern(element, floor) {
    var L = new Level(34, element, floor, 3), g = 11, x, k;
    for (x = 0; x < 34; x++) { L.column(x, g); for (k = 0; k < 3; k++) L.set(x, k, STONE); }
    for (k = 0; k < ROWS; k++) { L.set(0, k, STONE); L.set(1, k, STONE); L.set(32, k, STONE); L.set(33, k, STONE); }
    for (x = 3; x < 6; x++) { L.set(x, g - 4, LEDGE); L.set(33 - x, g - 4, LEDGE); }
    for (x = 7; x < 10; x++) { L.set(x, g - 2, LEDGE); L.set(33 - x, g - 2, LEDGE); }
    L.spawn = { x: 4 * TILE + 8, y: g * TILE };
    L.door = { x: 30 * TILE + 8, y: g * TILE };
    L.lights.push({ x: 5, y: g - 6 }, { x: 12, y: g - 5 }, { x: 21, y: g - 5 }, { x: 28, y: g - 6 });
    L.boss = true; L.locked = true; L.title = 'The Overgrown Cistern';
    L.arena = { left: 2 * TILE, right: 32 * TILE, groundY: g * TILE, ceilY: 3 * TILE, bossX: 17 * TILE, row: g };
    return L;
  }
  // The Dark Observatory: a roofed hall left open in the middle for what turns there, a ledge at either end
  function darkObservatory(element, floor) {
    var L = new Level(34, element, floor, 3), g = 11, x, k;
    for (x = 0; x < 34; x++) { L.column(x, g); for (k = 0; k < 3; k++) L.set(x, k, STONE); }
    for (k = 0; k < ROWS; k++) { L.set(0, k, STONE); L.set(1, k, STONE); L.set(32, k, STONE); L.set(33, k, STONE); }
    for (x = 3; x < 6; x++) { L.set(x, g - 2, LEDGE); L.set(33 - x, g - 2, LEDGE); }
    L.spawn = { x: 4 * TILE + 8, y: g * TILE };
    L.door = { x: 30 * TILE + 8, y: g * TILE };
    L.lights.push({ x: 4, y: g - 5 }, { x: 29, y: g - 5 });
    L.boss = true; L.locked = true; L.title = 'The Dark Observatory';
    L.arena = { left: 2 * TILE, right: 32 * TILE, groundY: g * TILE, ceilY: 3 * TILE, bossX: 17 * TILE, row: g };
    return L;
  }
  var HALLS = { orrery: ['void', darkObservatory], thornmother: ['bloom', overgrownCistern], golem: ['ember', greatKiln], wyrm: ['frost', frozenCistern], herald: ['storm', galleryOfRails], lightless: ['void', theVault] };
  function arena(seed, floor, kind) {
    var hall = HALLS[kind] || HALLS[['golem', 'wyrm', 'herald', 'lightless'][Math.max(0, Math.min(3, floor - 1))]];
    if (hall) return hall[1](byName(hall[0]), floor);
    var element = byName(ARENA_ELEMENT[Math.max(0, Math.min(3, floor - 1))]);
    var L = new Level(46, element, floor, 3), g = 11, x, k;
    for (x = 0; x < 46; x++) L.column(x, g);
    for (k = 0; k < ROWS; k++) { L.set(0, k, STONE); L.set(1, k, STONE); L.set(44, k, STONE); L.set(45, k, STONE); }
    for (x = 9; x < 12; x++) L.set(x, g - 3, LEDGE);
    for (x = 34; x < 37; x++) L.set(x, g - 3, LEDGE);
    L.spawn = { x: 4 * TILE + 8, y: g * TILE };
    L.door = { x: 42 * TILE + 8, y: g * TILE };
    L.lights.push({ x: 6, y: g - 4 }, { x: 22, y: g - 5 }, { x: 39, y: g - 4 });
    L.boss = true; L.locked = true;
    L.arena = { left: 2 * TILE, right: 44 * TILE, groundY: g * TILE, bossX: 30 * TILE + 8 };
    return L;
  }

  window.World = { HALLS: HALLS, Level: Level, hashSeed: hashSeed, byName: byName, arena: arena, TILE: TILE, ROWS: ROWS, AIR: AIR, STONE: STONE, LEDGE: LEDGE, SPIKES: SPIKES, HAZARD: HAZARD, ELEMENTS: ELEMENTS, generate: generate, reachable: reachable, makeRandom: makeRandom };
})();
