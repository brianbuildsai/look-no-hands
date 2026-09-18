/* Undercroft — room 36.

   A rogue-like platformer, and the last room. The building has an undercroft
   and it draws itself again every time you go down: five floors, one for each
   element, stitched from a seeded grammar of chunks; a Warden with a sword, a
   lantern and one power; enemies, guardians, relics; and nothing carried back
   up except what was learned.

   The engine here is small and plain: a fixed step of one sixtieth of a
   second, tiles of sixteen pixels, axis-by-axis collision, a camera with a
   little lookahead, and a 384 by 216 frame drawn with pixel sprites that
   pixels.js compiles from text when the page opens, then scaled without
   smoothing into the stage. Game art lives in js/game/, the run's rules in
   this file. Sound is synthesised in js/game/sound.js and is off until asked. */
(function () {
  'use strict';

  var W = 384, H = 216, TILE = 16, STEP = 1 / 60;
  var GRAVITY = 0.32, MAX_FALL = 5.5, RUN_MAX = 1.55, ACCEL = 0.22, AIR_ACCEL = 0.14, FRICTION = 0.78, AIR_FRICTION = 0.94;
  var JUMP_V = -5.4, JUMP_CUT = -1.6, COYOTE = 6, BUFFER = 6;

  Gallery.register('undercroft', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }
    var P = window.Pixels;
    if (!P) {
      env.fail('The undercroft’s sprites did not load. The other rooms still run.');
      return null;
    }
    var frame = P.blank(W, H), fpen = frame.getContext('2d');
    fpen.imageSmoothingEnabled = false;
    var sprites = { warden: P.warden.build() };
    var flipped = {};
    function facing(set, name, k, dir) {
      var img = sprites[set][name][k];
      if (dir >= 0) return img;
      var key = set + '/' + name + '/' + k;
      return flipped[key] || (flipped[key] = P.flipH(img));
    }

    var seed = 36, rng = seed;
    function random() { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; }

    var view = { x: 0, y: 0, w: W, h: H, scale: 1 };
    var state = 'title', tick = 0, accumulator = 0, cost = 0, sheetMode = false;

    /* ---- input ----
       The stage takes keyboard focus (it has a tabindex), so that the arrow
       keys steer the Warden and not the rooms. Keys are read as held and as
       just-pressed, once a step. */

    var KEYS = {
      ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
      ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
      x: 'jump', X: 'jump', k: 'jump', K: 'jump', ' ': 'jump',
      z: 'attack', Z: 'attack', j: 'attack', J: 'attack',
      c: 'dash', C: 'dash', l: 'dash', L: 'dash', Shift: 'dash',
      v: 'cast', V: 'cast', i: 'cast', I: 'cast',
      Enter: 'start', Escape: 'pause', p: 'pause', P: 'pause'
    };
    var held = {}, queued = {}, pressed = {}, touches = {};

    function focused() { return document.activeElement === env.stage; }
    document.addEventListener('keydown', function (e) {
      var name = KEYS[e.key];
      if (!name || !focused() || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      if (!held[name]) queued[name] = true;
      held[name] = true;
    });
    document.addEventListener('keyup', function (e) {
      var name = KEYS[e.key];
      if (!name) return;
      held[name] = false;
    });
    window.addEventListener('blur', function () { held = {}; });

    // touch: zones drawn in the frame on phones; a pointer over one holds its button
    var ZONES = [];
    function zoneAt(px, py) {
      for (var k = 0; k < ZONES.length; k++) { var z = ZONES[k]; if (px >= z.x && px < z.x + z.w && py >= z.y && py < z.y + z.h) return z.name; }
      return null;
    }
    function framePoint(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: (e.clientX - rect.left - view.x) / view.scale, y: (e.clientY - rect.top - view.y) / view.scale };
    }
    canvas.addEventListener('pointerdown', function (e) {
      try { env.stage.focus({ preventScroll: true }); } catch (err) { /* not fatal */ }
      if (e.pointerType === 'mouse') { if (state === 'title') queued.start = true; return; }
      e.preventDefault();
      var p = framePoint(e), name = zoneAt(p.x, p.y);
      if (state === 'title') { queued.start = true; return; }
      if (name) { touches[e.pointerId] = name; if (!held[name]) queued[name] = true; held[name] = true; }
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse' || touches[e.pointerId] === undefined) return;
      var p = framePoint(e), name = zoneAt(p.x, p.y), was = touches[e.pointerId];
      if (name === was) return;
      if (was) held[was] = false;
      touches[e.pointerId] = name;
      if (name) { if (!held[name]) queued[name] = true; held[name] = true; }
    });
    function lift(e) {
      var was = touches[e.pointerId];
      if (was) held[was] = false;
      delete touches[e.pointerId];
    }
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
    canvas.style.touchAction = 'none';

    // once a step: what was pressed since the last one
    function poll() {
      pressed = queued; queued = {};
    }
    function down(name) { return !!held[name]; }
    function hit(name) { return !!pressed[name]; }

    /* ---- the world (a test floor, until the generator arrives) ----
       Tiles: 0 air, 1 stone, 2 a ledge you can stand on and jump up through. */

    var level = { cols: 0, rows: 0, tiles: null, spawn: { x: 40, y: 0 } };
    var TEST = [
      '........................................................................',
      '........................................................................',
      '........................................................................',
      '..........................................#####.........................',
      '.............................................................###........',
      '..................................###...................................',
      '........................==============..................................',
      '.....................................................#####..............',
      '..............###.......................................................',
      '......................................#####.............................',
      '..........####.....................................................#####',
      '###########......########.......########........###########.....########',
      '###########......########.......########........###########.....########',
      '########################################################################'
    ];
    function loadTest() {
      level.rows = TEST.length; level.cols = TEST[0].length;
      level.tiles = new Uint8Array(level.cols * level.rows);
      for (var y = 0; y < level.rows; y++) for (var x = 0; x < level.cols; x++) {
        var ch = TEST[y][x];
        level.tiles[y * level.cols + x] = ch === '#' ? 1 : ch === '=' ? 2 : 0;
      }
      level.spawn = { x: 40, y: 11 * TILE };
    }
    function tileAt(tx, ty) {
      if (tx < 0 || tx >= level.cols) return 1;
      if (ty < 0) return 0;
      if (ty >= level.rows) return 1;
      return level.tiles[ty * level.cols + tx];
    }
    function solidAt(tx, ty) { return tileAt(tx, ty) === 1; }

    // stone tiles, drawn once: a brick course with a lit top edge, in three variants
    var TILES = (function () {
      var out = [], v;
      for (v = 0; v < 3; v++) {
        var c = P.blank(TILE, TILE), g = c.getContext('2d');
        g.fillStyle = '#3a3936'; g.fillRect(0, 0, TILE, TILE);
        g.fillStyle = '#5c5a56';
        g.fillRect(1, 1, 6, 6); g.fillRect(9, 1, 6, 6); g.fillRect(1, 9, 3 + v, 6); g.fillRect(6 + v, 9, 9 - v, 6);
        g.fillStyle = '#8f8d88';
        g.fillRect(1, 1, 6, 1); g.fillRect(9, 1, 6, 1); g.fillRect(1, 9, 3 + v, 1); g.fillRect(6 + v, 9, 9 - v, 1);
        g.fillStyle = '#2a2927';
        g.fillRect(v * 3, 4, 1, 1); g.fillRect(12 - v, 12, 1, 1);
        out.push(c);
      }
      // the top of a course: a bone-lit edge
      var top = P.blank(TILE, 2), t = top.getContext('2d');
      t.fillStyle = '#c4c1ba'; t.fillRect(0, 0, TILE, 1);
      t.fillStyle = '#8f8d88'; t.fillRect(0, 1, TILE, 1);
      // a ledge: a thin slab
      var ledge = P.blank(TILE, TILE), l = ledge.getContext('2d');
      l.fillStyle = '#c4c1ba'; l.fillRect(0, 0, TILE, 1);
      l.fillStyle = '#5c5a56'; l.fillRect(0, 1, TILE, 3);
      l.fillStyle = '#3a3936'; l.fillRect(0, 4, TILE, 1);
      return { stone: out, top: top, ledge: ledge };
    })();

    /* ---- the Warden ----
       Position is the feet's middle. The body is a box 10 wide and 22 tall
       above it. Collision is axis by axis against the tiles. */

    var hero = {
      x: 40, y: 0, vx: 0, vy: 0, w: 10, h: 22, dir: 1,
      onGround: false, coyote: 0, buffer: 0, drop: 0, jumping: false,
      anim: 'idle', frame: 0, clock: 0, landed: 0
    };

    function spawnHero() {
      hero.x = level.spawn.x; hero.y = level.spawn.y; hero.vx = 0; hero.vy = 0; hero.dir = 1;
      hero.onGround = false; hero.coyote = 0; hero.buffer = 0; hero.drop = 0; hero.jumping = false;
      hero.anim = 'idle'; hero.frame = 0; hero.clock = 0; hero.landed = 0;
    }

    // does the box [x0, x1) by [y0, y1) overlap a solid tile, or (when asked) a ledge?
    function blocked(x0, y0, x1, y1, ledges, feetBefore) {
      var tx0 = Math.floor(x0 / TILE), tx1 = Math.floor((x1 - 0.001) / TILE);
      var ty0 = Math.floor(y0 / TILE), ty1 = Math.floor((y1 - 0.001) / TILE);
      for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
        var t = tileAt(tx, ty);
        if (t === 1) return { tx: tx, ty: ty, kind: 1 };
        if (t === 2 && ledges && feetBefore <= ty * TILE + 0.001) return { tx: tx, ty: ty, kind: 2 };
      }
      return null;
    }

    // move a body by its velocity, stopping at walls, floors and ceilings
    function moveBody(b) {
      var half = b.w / 2, hitWall = false, hitFloor = false, hitCeiling = false;
      // sideways
      var nx = b.x + b.vx;
      if (b.vx !== 0) {
        var wall = blocked(nx - half, b.y - b.h, nx + half, b.y, false);
        if (wall) {
          nx = b.vx > 0 ? wall.tx * TILE - half - 0.001 : (wall.tx + 1) * TILE + half + 0.001;
          b.vx = 0; hitWall = true;
        }
      }
      b.x = nx;
      // up and down
      var ny = b.y + b.vy;
      if (b.vy > 0) {
        var floor = blocked(b.x - half, ny - b.h, b.x + half, ny, b.drop <= 0, b.y);
        if (floor) { ny = floor.ty * TILE - 0.001; b.vy = 0; hitFloor = true; }
      } else if (b.vy < 0) {
        var ceiling = blocked(b.x - half, ny - b.h, b.x + half, ny, false);
        if (ceiling) { ny = (ceiling.ty + 1) * TILE + b.h + 0.001; b.vy = 0; hitCeiling = true; }
      }
      b.y = ny;
      return { wall: hitWall, floor: hitFloor, ceiling: hitCeiling };
    }

    function stepHero() {
      var move = (down('right') ? 1 : 0) - (down('left') ? 1 : 0);
      var accel = hero.onGround ? ACCEL : AIR_ACCEL;
      if (move !== 0) {
        hero.vx += move * accel;
        if (Math.abs(hero.vx) > RUN_MAX) hero.vx = move * RUN_MAX;
        hero.dir = move;
      } else {
        hero.vx *= hero.onGround ? FRICTION : AIR_FRICTION;
        if (Math.abs(hero.vx) < 0.05) hero.vx = 0;
      }
      // jumping, with a little forgiveness either side of the edge
      if (hit('jump')) hero.buffer = BUFFER;
      if (hero.buffer > 0 && (hero.onGround || hero.coyote > 0)) {
        if (down('down') && hero.onGround && standingOnLedge()) { hero.drop = 8; }
        else { hero.vy = JUMP_V; hero.jumping = true; hero.onGround = false; hero.coyote = 0; }
        hero.buffer = 0;
      }
      if (hero.jumping && !down('jump') && hero.vy < JUMP_CUT) hero.vy = JUMP_CUT;
      if (hero.vy >= 0) hero.jumping = false;
      hero.vy = Math.min(MAX_FALL, hero.vy + GRAVITY);
      if (hero.buffer > 0) hero.buffer--;
      if (hero.drop > 0) hero.drop--;
      var wasGround = hero.onGround;
      var touched = moveBody(hero);
      hero.onGround = touched.floor;
      if (hero.onGround) hero.coyote = COYOTE; else if (hero.coyote > 0) hero.coyote--;
      if (hero.onGround && !wasGround) hero.landed = 8;
      if (hero.landed > 0) hero.landed--;
      // the ground gives way at the bottom of the floor: back to the start for now
      if (hero.y > level.rows * TILE + 40) spawnHero();
      animateHero();
    }

    function standingOnLedge() {
      var ty = Math.floor((hero.y + 1) / TILE);
      return tileAt(Math.floor((hero.x - hero.w / 2) / TILE), ty) === 2 || tileAt(Math.floor((hero.x + hero.w / 2 - 0.001) / TILE), ty) === 2;
    }

    // which animation, and how fast it runs
    function animateHero() {
      var next, rate;
      if (!hero.onGround) { next = hero.vy < 0 ? 'jump' : 'fall'; rate = 8; }
      else if (hero.landed > 4) { next = 'land'; rate = 4; }
      else if (Math.abs(hero.vx) > 0.2) { next = 'run'; rate = Math.max(3, Math.round(7 - Math.abs(hero.vx) * 3)); }
      else { next = 'idle'; rate = 14; }
      if (next !== hero.anim) { hero.anim = next; hero.frame = 0; hero.clock = 0; }
      var frames = sprites.warden[hero.anim];
      hero.clock++;
      if (hero.clock >= rate) {
        hero.clock = 0;
        hero.frame = hero.anim === 'jump' || hero.anim === 'fall' || hero.anim === 'land' ? Math.min(frames.length - 1, hero.frame + 1) : (hero.frame + 1) % frames.length;
      }
    }

    /* ---- the camera and the picture ---- */

    var cam = { x: 0, y: 0, shake: 0 };
    function stepCamera(snap) {
      var tx = hero.x + hero.dir * 28 - W / 2, ty = hero.y - H * 0.62;
      tx = Math.max(0, Math.min(level.cols * TILE - W, tx));
      ty = Math.max(0, Math.min(level.rows * TILE - H, ty));
      if (snap) { cam.x = tx; cam.y = ty; return; }
      cam.x += (tx - cam.x) * 0.1;
      cam.y += (ty - cam.y) * 0.08;
    }

    // a three-by-five pixel font for the frame, capitals and figures
    var GLYPHS = {
      A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
      E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
      I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
      M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
      Q: ['.#.', '#.#', '#.#', '.#.', '..#'], R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
      U: ['#.#', '#.#', '#.#', '#.#', '.#.'], V: ['#.#', '#.#', '#.#', '.#.', '.#.'], W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
      Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
      0: ['.#.', '#.#', '#.#', '#.#', '.#.'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
      4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'], 6: ['.##', '#..', '##.', '#.#', '.#.'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
      8: ['.#.', '#.#', '.#.', '#.#', '.#.'], 9: ['.#.', '#.#', '.##', '..#', '##.'],
      '.': ['...', '...', '...', '...', '.#.'], ',': ['...', '...', '...', '.#.', '#..'], ':': ['...', '.#.', '...', '.#.', '...'], '-': ['...', '...', '###', '...', '...'],
      '/': ['..#', '..#', '.#.', '#..', '#..'], '!': ['.#.', '.#.', '.#.', '...', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'], "'": ['.#.', '.#.', '...', '...', '...'],
      '(': ['.#.', '#..', '#..', '#..', '.#.'], ')': ['.#.', '..#', '..#', '..#', '.#.'], '+': ['...', '.#.', '###', '.#.', '...'], '—': ['...', '...', '###', '...', '...']
    };
    var glyphCache = {};
    function glyph(ch, colour) {
      var key = ch + colour;
      if (glyphCache[key]) return glyphCache[key];
      var rows = GLYPHS[ch] || GLYPHS['?'];
      var c = P.blank(3, 5), g = c.getContext('2d');
      g.fillStyle = colour;
      for (var y = 0; y < 5; y++) for (var x = 0; x < 3; x++) if (rows[y][x] === '#') g.fillRect(x, y, 1, 1);
      glyphCache[key] = c;
      return c;
    }
    function textWidth(s, scale) { return s.length * 4 * (scale || 1) - (scale || 1); }
    function text(s, x, y, colour, scale, align) {
      scale = scale || 1;
      s = String(s).toUpperCase();
      var w = textWidth(s, scale);
      if (align === 'center') x -= Math.floor(w / 2); else if (align === 'right') x -= w;
      for (var k = 0; k < s.length; k++) {
        var ch = s[k];
        if (ch !== ' ') fpen.drawImage(glyph(ch, colour), x, y, 3 * scale, 5 * scale);
        x += 4 * scale;
      }
    }

    // the backdrop: a dark vault with arches that slide slower than the floor
    function drawBackdrop() {
      var grad = fpen.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#07070c'); grad.addColorStop(1, '#101018');
      fpen.fillStyle = grad; fpen.fillRect(0, 0, W, H);
      var ox = Math.round(cam.x * 0.35) % 96, k;
      fpen.fillStyle = '#15151f';
      for (k = -1; k < W / 96 + 1; k++) {
        var ax = k * 96 - ox;
        fpen.fillRect(ax, 40, 10, H);
        fpen.beginPath(); fpen.arc(ax + 48, 64, 43, Math.PI, 0); fpen.fill();
      }
      fpen.fillStyle = '#0b0b12';
      for (k = -1; k < W / 96 + 1; k++) { var bx = k * 96 - ox; fpen.beginPath(); fpen.arc(bx + 48, 64, 38, Math.PI, 0); fpen.fill(); }
      var oy = Math.round(cam.x * 0.6) % 48;
      fpen.fillStyle = '#1c1c27';
      for (k = -1; k < W / 48 + 1; k++) fpen.fillRect(k * 48 - oy, 120, 6, H);
    }

    function drawTiles() {
      var x0 = Math.floor(cam.x / TILE), x1 = Math.ceil((cam.x + W) / TILE), y0 = Math.floor(cam.y / TILE), y1 = Math.ceil((cam.y + H) / TILE);
      for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
        var t = tileAt(tx, ty);
        if (!t) continue;
        var px = tx * TILE - Math.round(cam.x), py = ty * TILE - Math.round(cam.y);
        if (t === 1) {
          fpen.drawImage(TILES.stone[(tx * 7 + ty * 13) % 3], px, py);
          if (tileAt(tx, ty - 1) !== 1) fpen.drawImage(TILES.top, px, py);
        } else if (t === 2) fpen.drawImage(TILES.ledge, px, py);
      }
    }

    function drawHero() {
      var img = facing('warden', hero.anim, hero.frame, hero.dir);
      fpen.drawImage(img, Math.round(hero.x) - 16 - Math.round(cam.x), Math.round(hero.y) - 31 - Math.round(cam.y));
    }

    function drawHud() {
      text('UNDERCROFT', 4, 4, '#8f8d88');
      if (state === 'title') {
        fpen.fillStyle = 'rgba(0,0,0,0.55)'; fpen.fillRect(0, 0, W, H);
        text('UNDERCROFT', W / 2, 70, '#e9e6df', 3, 'center');
        text('GO DOWN', W / 2, 104, '#ffb347', 1, 'center');
        text('ARROWS OR WASD MOVE   X OR K JUMP   Z OR J ATTACK', W / 2, 130, '#8f8d88', 1, 'center');
        text('C OR L DASH   V OR I CAST   ENTER TO BEGIN', W / 2, 140, '#8f8d88', 1, 'center');
      } else if (state === 'paused') {
        fpen.fillStyle = 'rgba(0,0,0,0.5)'; fpen.fillRect(0, 0, W, H);
        text('PAUSED', W / 2, 100, '#e9e6df', 2, 'center');
      }
    }

    function render() {
      if (sheetMode) return;
      drawBackdrop();
      drawTiles();
      drawHero();
      drawHud();
      // into the stage, scaled without smoothing, letterboxed in the dark
      var ratio = canvas.width / size.w;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.fillStyle = '#000';
      pen.fillRect(0, 0, size.w, size.h);
      pen.imageSmoothingEnabled = false;
      pen.drawImage(frame, view.x, view.y, view.w, view.h);
    }

    /* ---- the loop and the room's wiring ---- */

    function begin() {
      state = 'run';
      spawnHero();
      stepCamera(true);
    }

    function step() {
      poll();
      tick++;
      if (state === 'title') { if (hit('start') || hit('jump') || hit('attack')) begin(); return; }
      if (hit('pause')) state = state === 'paused' ? 'run' : 'paused';
      if (state !== 'run') return;
      stepHero();
      stepCamera(false);
    }

    var startButton = env.room.querySelector('[data-undercroft-start]');
    if (startButton) startButton.addEventListener('click', function () {
      try { env.stage.focus({ preventScroll: true }); } catch (err) { /* not fatal */ }
      begin(); env.redraw();
    });
    var fullButton = env.room.querySelector('[data-undercroft-full]');
    if (fullButton) {
      if (!env.stage.requestFullscreen) fullButton.hidden = true;
      else fullButton.addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen();
        else env.stage.requestFullscreen().catch(function () { /* declined */ });
        try { env.stage.focus({ preventScroll: true }); } catch (err) { /* not fatal */ }
      });
    }

    loadTest();
    spawnHero();
    stepCamera(true);

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wide = size.w >= 900 && !document.fullscreenElement;
        var x0 = wide ? Math.round(size.w * 0.34) : 0, vw = size.w - x0, vh = size.h;
        view.scale = Math.max(0.5, Math.min(vw / W, vh / H));
        view.w = Math.round(W * view.scale); view.h = Math.round(H * view.scale);
        view.x = x0 + Math.round((vw - view.w) / 2); view.y = Math.round((vh - view.h) / 2);
      },
      frame: function (time, dt) {
        var t0 = performance.now();
        accumulator = Math.min(accumulator + Math.min(dt, 0.1), 0.25);
        while (accumulator >= STEP) { step(); accumulator -= STEP; }
        render();
        cost = cost * 0.9 + (performance.now() - t0) * 0.1;
      },
      // With motion paused: the game pauses and the frame is held
      still: function () { if (state === 'run') state = 'paused'; render(); },
      motion: function (on) { if (!on && state === 'run') state = 'paused'; },
      state: function () {
        return { state: state, tick: tick, hero: { x: hero.x, y: hero.y, vx: hero.vx, vy: hero.vy, dir: hero.dir, onGround: hero.onGround, anim: hero.anim, frame: hero.frame }, cam: { x: cam.x, y: cam.y }, level: { cols: level.cols, rows: level.rows }, view: view, cost: cost };
      },
      // drive the game from a test: hold these keys for so many steps
      press: function (names, frames) {
        var list = String(names).split(/[\s,]+/).filter(Boolean), k;
        for (k = 0; k < list.length; k++) { if (!held[list[k]]) queued[list[k]] = true; held[list[k]] = true; }
        for (var n = 0; n < (frames || 1); n++) step();
        for (k = 0; k < list.length; k++) held[list[k]] = false;
        render();
      },
      sprites: function () {
        var out = {};
        Object.keys(sprites.warden).forEach(function (name) { out[name] = sprites.warden[name].map(function (img) { return P.count(img); }); });
        return out;
      },
      // draw every frame of the Warden large on the stage, for looking at the art; sheet(false) puts the game back
      sheet: function (on, scale, only, set) {
        sheetMode = on !== false;
        if (!sheetMode) return;
        var ratio = canvas.width / size.w, S = scale || 5, group = sprites[set || 'warden'];
        pen.setTransform(ratio, 0, 0, ratio, 0, 0);
        pen.fillStyle = '#101018'; pen.fillRect(0, 0, size.w, size.h);
        pen.imageSmoothingEnabled = false;
        var y = view.y + 4, x = view.x + 4;
        Object.keys(group).forEach(function (name) {
          if (only && name !== only) return;
          group[name].forEach(function (img) {
            if (x + img.width * S > size.w) { x = view.x + 4; y += (img.height + 1) * S; }
            pen.drawImage(img, x, y, img.width * S, img.height * S); x += (img.width + 1) * S;
          });
          x = view.x + 4; y += (group[name][0].height + 1) * S;
        });
      }
    };
  });
})();
