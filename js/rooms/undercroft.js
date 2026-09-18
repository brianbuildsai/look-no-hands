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

    /* ---- the world ----
       Floors come from world.js: a grid of tiles (0 air, 1 stone, 2 a ledge
       you can jump up through, 3 spikes, 4 the element's hazard) with a
       spawn, a door, and places for enemies, relics and lamps. */

    var WD = window.World;
    if (!WD) { env.fail('The undercroft’s floors did not load. The other rooms still run.'); return null; }
    var level = null, run = { seed: 36, floor: 1, section: 0 };
    var element = WD.ELEMENTS[0];

    function loadSection() {
      level = WD.generate(run.seed, run.floor, run.section);
      element = level.element;
      makeTiles(element);
      env.live('floor', run.floor);
      env.live('seed', run.seed);
    }
    function tileAt(tx, ty) { return level.get(tx, ty); }
    function solidAt(tx, ty) { return tileAt(tx, ty) === 1; }

    // the element's stone, drawn once per floor: a brick course in the floor's colours, with a lit top edge
    var TILES = null;
    function makeTiles(el) {
      var out = [], v;
      for (v = 0; v < 3; v++) {
        var c = P.blank(TILE, TILE), g = c.getContext('2d');
        g.fillStyle = el.stone[0]; g.fillRect(0, 0, TILE, TILE);
        g.fillStyle = el.stone[1];
        g.fillRect(1, 1, 6, 6); g.fillRect(9, 1, 6, 6); g.fillRect(1, 9, 3 + v, 6); g.fillRect(6 + v, 9, 9 - v, 6);
        g.fillStyle = el.stone[2];
        g.fillRect(1, 1, 6, 1); g.fillRect(9, 1, 6, 1); g.fillRect(1, 9, 3 + v, 1); g.fillRect(6 + v, 9, 9 - v, 1);
        g.fillStyle = el.stone[3];
        g.fillRect(v * 3, 4, 1, 1); g.fillRect(12 - v, 12, 1, 1); g.fillRect(3 + v * 2, 13, 2, 1);
        out.push(c);
      }
      var top = P.blank(TILE, 2), t = top.getContext('2d');
      t.fillStyle = el.top; t.fillRect(0, 0, TILE, 1);
      t.fillStyle = el.stone[2]; t.fillRect(0, 1, TILE, 1);
      var ledge = P.blank(TILE, TILE), l = ledge.getContext('2d');
      l.fillStyle = el.top; l.fillRect(0, 0, TILE, 1);
      l.fillStyle = el.stone[1]; l.fillRect(0, 1, TILE, 3);
      l.fillStyle = el.stone[3]; l.fillRect(0, 4, TILE, 1); l.fillRect(2, 2, 1, 1); l.fillRect(11, 2, 1, 1);
      var spikes = P.blank(TILE, TILE), sp = spikes.getContext('2d');
      sp.fillStyle = el.stone[0]; sp.fillRect(0, 10, TILE, 6);
      sp.fillStyle = '#c4c1ba';
      for (var k = 0; k < 4; k++) { sp.fillRect(k * 4 + 1, 4, 2, 6); sp.fillRect(k * 4 + 1, 3, 1, 1); sp.fillRect(k * 4 + 1, 2, 1, 1); }
      sp.fillStyle = '#e9e6df';
      for (k = 0; k < 4; k++) sp.fillRect(k * 4 + 1, 2, 1, 1);
      // the element's hazard, in three frames: lava boils, ice glints, rails pulse, spores drift, the void breathes
      var hz = [];
      for (v = 0; v < 3; v++) {
        var h = P.blank(TILE, TILE), hp = h.getContext('2d');
        hp.fillStyle = el.hazardColours[0]; hp.fillRect(0, 4, TILE, 12);
        hp.fillStyle = el.hazardColours[1];
        for (k = 0; k < 4; k++) hp.fillRect((k * 4 + v * 2) % 16, 4 + ((k + v) % 3), 3, 1);
        hp.fillStyle = el.hazardColours[2];
        hp.fillRect((3 + v * 5) % 16, 6 + v, 1, 1); hp.fillRect((11 + v * 3) % 16, 9 - v, 1, 1);
        if (el.hazard === 'ice') { hp.fillStyle = el.hazardColours[1]; hp.fillRect(0, 4, TILE, 12); hp.fillStyle = el.hazardColours[2]; hp.fillRect(2 + v * 4, 5, 3, 1); hp.fillRect(9 - v * 2, 8, 2, 1); hp.fillStyle = el.hazardColours[0]; hp.fillRect(0, 14, TILE, 2); }
        if (el.hazard === 'rail') { hp.clearRect(0, 0, TILE, TILE); hp.fillStyle = el.stone[1]; hp.fillRect(0, 10, TILE, 6); hp.fillStyle = v === 1 ? el.hazardColours[2] : el.hazardColours[0]; hp.fillRect(0, 8, TILE, 2); hp.fillStyle = el.hazardColours[1]; hp.fillRect(v * 5, 6, 2, 2); hp.fillRect(12 - v * 3, 5, 1, 3); }
        hz.push(h);
      }
      TILES = { stone: out, top: top, ledge: ledge, spikes: spikes, hazard: hz };
    }

    /* ---- the Warden ----
       Position is the feet's middle. The body is a box 10 wide and 22 tall
       above it. Collision is axis by axis against the tiles. What the Warden
       is doing is `act`: null when free, else an attack, dash, cast, hurt or
       death that runs for so many steps and says when it may be cut short. */

    var ATTACKS = [
      { anim: 'attack1', frames: [3, 3, 3, 4], active: [1, 2], reach: 24, damage: 2, lunge: 0.6, next: 8 },
      { anim: 'attack2', frames: [3, 3, 3, 4], active: [1, 2], reach: 22, damage: 2, lunge: 0.5, next: 8, lift: true },
      { anim: 'attack3', frames: [4, 2, 3, 3, 5], active: [1, 2, 3], reach: 34, damage: 4, lunge: 2.2, next: 0 }
    ];
    var DASH_FRAMES = 12, DASH_SPEED = 4.2, DASH_COOLDOWN = 22;

    var hero = {
      x: 40, y: 0, vx: 0, vy: 0, w: 10, h: 22, dir: 1,
      onGround: false, coyote: 0, buffer: 0, drop: 0, jumping: false,
      anim: 'idle', frame: 0, clock: 0, landed: 0,
      hp: 5, maxHp: 5, energy: 3, maxEnergy: 3,
      act: null, combo: 0, queued: false, dashCd: 0, airDash: true, invuln: 0, flash: 0, alive: true, deadFor: 0, hits: 0
    };

    function spawnHero() {
      hero.x = level.spawn.x; hero.y = level.spawn.y; hero.vx = 0; hero.vy = 0; hero.dir = 1;
      hero.onGround = false; hero.coyote = 0; hero.buffer = 0; hero.drop = 0; hero.jumping = false;
      hero.anim = 'idle'; hero.frame = 0; hero.clock = 0; hero.landed = 0;
      hero.hp = hero.maxHp; hero.energy = hero.maxEnergy;
      hero.act = null; hero.combo = 0; hero.queued = false; hero.dashCd = 0; hero.airDash = true; hero.invuln = 0; hero.flash = 0; hero.alive = true; hero.deadFor = 0;
      afflictions.burn = 0; afflictions.chill = 0; afflictions.poison = 0;
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
      var nx = b.x + b.vx;
      if (b.vx !== 0) {
        var wall = blocked(nx - half, b.y - b.h, nx + half, b.y, false);
        if (wall) { nx = b.vx > 0 ? wall.tx * TILE - half - 0.001 : (wall.tx + 1) * TILE + half + 0.001; b.vx = 0; hitWall = true; }
      }
      b.x = nx;
      var ny = b.y + b.vy;
      if (b.vy > 0) {
        var floor = blocked(b.x - half, ny - b.h, b.x + half, ny, (b.drop || 0) <= 0, b.y);
        if (floor) { ny = floor.ty * TILE - 0.001; b.vy = 0; hitFloor = true; }
      } else if (b.vy < 0) {
        var ceiling = blocked(b.x - half, ny - b.h, b.x + half, ny, false);
        if (ceiling) { ny = (ceiling.ty + 1) * TILE + b.h + 0.001; b.vy = 0; hitCeiling = true; }
      }
      b.y = ny;
      return { wall: hitWall, floor: hitFloor, ceiling: hitCeiling };
    }

    function standingOnLedge() {
      var ty = Math.floor((hero.y + 1) / TILE);
      return tileAt(Math.floor((hero.x - hero.w / 2) / TILE), ty) === 2 || tileAt(Math.floor((hero.x + hero.w / 2 - 0.001) / TILE), ty) === 2;
    }

    // start an act: an attack of the combo, a dash, a cast
    function startAttack() {
      var n = hero.combo % 3, spec = ATTACKS[n];
      hero.act = { kind: 'attack', n: n, spec: spec, frame: 0, clock: 0, ticks: 0, hitDone: false };
      hero.combo = n + 1; hero.queued = false;
      hero.anim = spec.anim; hero.frame = 0; hero.clock = 0;
      hero.vx = hero.dir * spec.lunge + hero.vx * 0.3;
      if (spec.lift && !hero.onGround) hero.vy = Math.min(hero.vy, -1.5);
    }
    function startDash() {
      hero.act = { kind: 'dash', ticks: 0 };
      hero.anim = 'dash'; hero.frame = 0; hero.clock = 0;
      hero.vx = hero.dir * DASH_SPEED; hero.vy = 0;
      hero.dashCd = DASH_COOLDOWN; hero.invuln = Math.max(hero.invuln, DASH_FRAMES + 2);
      if (!hero.onGround) hero.airDash = false;
      dust(hero.x, hero.y, -hero.dir, 6);
    }
    function startCast() {
      hero.act = { kind: 'cast', ticks: 0, done: false };
      hero.anim = 'cast'; hero.frame = 0; hero.clock = 0;
      hero.energy--;
    }
    function hurtHero(fromX, damage) {
      if (!hero.alive || hero.invuln > 0) return false;
      hero.hp -= damage;
      hero.invuln = 60; hero.flash = 6;
      hero.vx = (hero.x < fromX ? -1 : 1) * 2.2; hero.vy = -2.6;
      hero.act = { kind: 'hurt', ticks: 0 };
      hero.anim = 'hurt'; hero.frame = 0; hero.clock = 0; hero.combo = 0; hero.queued = false;
      hitstop(5); shake(3);
      spark(hero.x, hero.y - 12, '#ff4f7b', 10, 1.4, 20, 0.05);
      if (hero.hp <= 0) { hero.hp = 0; hero.alive = false; hero.act = { kind: 'death', ticks: 0 }; hero.anim = 'death'; hero.frame = 0; hero.clock = 0; hero.invuln = 9999; }
      return true;
    }

    // the sweep of a swing: a box in front of the Warden that strikes what it meets
    function swingBox(spec) {
      return { x0: hero.dir > 0 ? hero.x + 2 : hero.x - 2 - spec.reach, x1: hero.dir > 0 ? hero.x + 2 + spec.reach : hero.x - 2, y0: hero.y - 26, y1: hero.y - 2 };
    }

    function stepAct() {
      var a = hero.act;
      a.ticks++;
      if (a.kind === 'attack') {
        var spec = a.spec, frames = spec.frames;
        hero.vx *= hero.onGround ? 0.86 : 0.96;
        a.clock++;
        if (a.clock >= frames[a.frame]) { a.clock = 0; a.frame++; }
        if (a.frame >= frames.length) { hero.act = null; hero.anim = 'idle'; hero.frame = 0; if (hero.combo >= 3) hero.combo = 0; return; }
        hero.frame = a.frame;
        if (!a.hitDone && spec.active.indexOf(a.frame) >= 0) { if (strike(swingBox(spec), spec.damage, a.n, null)) a.hitDone = true; }
        if (hit('attack') && a.frame >= 1 && hero.combo < 3) hero.queued = true;
        if (hero.queued && a.frame >= frames.length - 1) startAttack();
        if (hit('dash') && hero.dashCd <= 0 && (hero.onGround || hero.airDash)) startDash();
        return;
      }
      if (a.kind === 'dash') {
        hero.vx = hero.dir * DASH_SPEED; hero.vy = 0;
        hero.frame = a.ticks % 6 < 3 ? 0 : 1;
        if (a.ticks % 2 === 0) afterimage(sprites.warden.dash[hero.frame], hero.x, hero.y, hero.dir);
        if (a.ticks >= DASH_FRAMES) { hero.act = null; hero.vx = hero.dir * RUN_MAX; hero.anim = 'idle'; }
        if (hit('attack')) { hero.act = null; hero.combo = 0; startAttack(); }
        return;
      }
      if (a.kind === 'cast') {
        hero.vx *= 0.8;
        hero.frame = Math.min(4, Math.floor(a.ticks / 4));
        if (a.ticks === 10 && !a.done) { a.done = true; castPower(); }
        if (a.ticks >= 24) { hero.act = null; hero.anim = 'idle'; }
        return;
      }
      if (a.kind === 'hurt') {
        hero.frame = a.ticks < 8 ? 0 : 1;
        if (a.ticks >= 18) { hero.act = null; hero.anim = 'idle'; }
        return;
      }
      if (a.kind === 'death') {
        hero.vx *= 0.8;
        hero.frame = Math.min(5, Math.floor(a.ticks / 9));
        hero.deadFor = a.ticks;
        return;
      }
    }

    // the placeholder power until the relics arrive: a burst of lantern light
    function castPower() {
      spark(hero.x + hero.dir * 4, hero.y - 26, '#ffb347', 40, 2.4, 30, 0.02);
      shake(2);
      strike({ x0: hero.x - 40, x1: hero.x + 40, y0: hero.y - 44, y1: hero.y + 4 }, 3, 3, null);
    }

    function stepHero() {
      var free = !hero.act;
      var move = free || hero.act.kind === 'attack' && !hero.onGround ? (down('right') ? 1 : 0) - (down('left') ? 1 : 0) : 0;
      if (hero.dashCd > 0) hero.dashCd--;
      if (hero.invuln > 0 && hero.alive) hero.invuln--;
      if (hero.flash > 0) hero.flash--;
      if (free) {
        var accel = (hero.onGround ? ACCEL : AIR_ACCEL) * (afflictions.chill > 0 ? 0.55 : 1);
        if (move !== 0) {
          hero.vx += move * (onIce ? accel * 0.35 : accel);
          var top = RUN_MAX * (afflictions.chill > 0 ? 0.6 : 1);
          if (Math.abs(hero.vx) > top) hero.vx = move * top;
          hero.dir = move;
        } else {
          hero.vx *= hero.onGround ? (onIce ? 0.975 : FRICTION) : AIR_FRICTION;
          if (Math.abs(hero.vx) < 0.05) hero.vx = 0;
        }
        if (hit('attack')) { if (hero.combo >= 3) hero.combo = 0; startAttack(); }
        else if (hit('dash') && hero.dashCd <= 0 && (hero.onGround || hero.airDash)) startDash();
        else if (hit('cast') && hero.energy > 0) startCast();
      } else stepAct();
      // jumping, with a little forgiveness either side of the edge
      var mayJump = !hero.act || hero.act.kind === 'attack';
      if (hit('jump')) hero.buffer = BUFFER;
      if (mayJump && hero.buffer > 0 && (hero.onGround || hero.coyote > 0)) {
        if (down('down') && hero.onGround && standingOnLedge()) hero.drop = 8;
        else { hero.vy = JUMP_V; hero.jumping = true; hero.onGround = false; hero.coyote = 0; dust(hero.x, hero.y, -hero.dir, 3); }
        hero.buffer = 0;
      }
      if (hero.jumping && !down('jump') && hero.vy < JUMP_CUT) hero.vy = JUMP_CUT;
      if (hero.vy >= 0) hero.jumping = false;
      if (!hero.act || hero.act.kind !== 'dash') hero.vy = Math.min(MAX_FALL, hero.vy + GRAVITY);
      if (hero.buffer > 0) hero.buffer--;
      if (hero.drop > 0) hero.drop--;
      var wasGround = hero.onGround;
      var touched = moveBody(hero);
      hero.onGround = touched.floor;
      if (hero.onGround) { hero.coyote = COYOTE; hero.airDash = true; } else if (hero.coyote > 0) hero.coyote--;
      if (hero.onGround && !wasGround) { hero.landed = 8; dust(hero.x, hero.y, 1, 2); dust(hero.x, hero.y, -1, 2); }
      if (hero.landed > 0) hero.landed--;
      if (hero.alive) touchHazards();
      for (var rk = 0; rk < level.relics.length; rk++) { var rl = level.relics[rk]; if (!rl.taken && Math.abs(hero.x - (rl.x * TILE + 8)) < 10 && Math.abs(hero.y - rl.y * TILE) < 20) { rl.taken = true; hero.energy = hero.maxEnergy; spark(hero.x, hero.y - 14, '#ffdc9a', 24, 1.8, 30, -0.01); number(hero.x, hero.y - 30, 'RELIC', '#ffdc9a'); } }
      if (hero.y > level.rows * TILE + 40) { hero.hp = 0; hero.alive = false; hero.act = { kind: 'death', ticks: 80 }; hero.deadFor = 80; }
      if (hero.alive && hero.onGround && Math.abs(hero.x - level.door.x) < 7 && Math.abs(hero.y - level.door.y) < 4 && transition === 0) transition = 1;
      if (hero.act && hero.act.kind === 'death' && hero.deadFor > 110) begin();
      if (!hero.act) animateHero();
      if (tick % 3 === 0 && hero.alive) ember(hero.x - hero.dir * 8, hero.y - 8);
    }

    // spikes and the element's hazard, where the body touches them
    var onIce = false;
    function touchHazards() {
      var half = hero.w / 2, tx0 = Math.floor((hero.x - half) / TILE), tx1 = Math.floor((hero.x + half - 0.001) / TILE);
      var ty0 = Math.floor((hero.y - hero.h) / TILE), ty1 = Math.floor((hero.y - 0.001) / TILE), under = Math.floor((hero.y + 1) / TILE);
      onIce = false;
      for (var ty = ty0; ty <= ty1 + 1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
        var t = tileAt(tx, ty), inBody = ty <= ty1, underfoot = ty === under;
        if (t === 3 && (inBody || underfoot && hero.onGround)) { if (hurtHero(tx * TILE + 8, 1)) { hero.vy = -3.2; } return; }
        if (t === 4 && (inBody || underfoot)) {
          if (element.hazard === 'ice') { onIce = true; continue; }
          if (element.hazard === 'rail' && tick % 150 >= 75) continue;
          if (hurtHero(tx * TILE + 8, element.hazard === 'void' ? 2 : 1)) { hero.vy = -3.2; status(element.name); }
          return;
        }
      }
    }
    // an elemental touch: burning, poison and the rest arrive with the enemies; for now, sparks in the element's colour
    function status(name) { spark(hero.x, hero.y - 12, element.glow, 12, 1.6, 24, 0.03); }

    // which animation, and how fast it runs, when the Warden is free
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

    /* ---- the creatures, and what flies between them and the Warden ---- */

    var AC = window.Actors;
    if (!AC) { env.fail('The undercroft’s creatures did not load. The other rooms still run.'); return null; }
    var creatures = [], projectiles = [], zaps = [], kills = 0, actorSprites = AC.build();
    var ctx = {
      hero: hero, tileAt: tileAt, moveBody: moveBody, spark: spark, random: random,
      hurtHero: function (fromX, damage) { return hurtHero(fromX, damage); },
      afflict: function (elementName) { afflict(elementName); },
      projectile: function (p) { p.from = 'enemy'; projectiles.push(p); },
      zap: function (x0, y0, x1, y1, colour) { zaps.push({ x0: x0, y0: y0, x1: x1, y1: y1, colour: colour, life: 8 }); }
    };
    function placeCreatures() {
      creatures = []; projectiles = []; zaps = [];
      var rnd = WD.makeRandom(run.seed * 31 + run.floor * 7 + run.section);
      for (var k = 0; k < level.enemies.length; k++) creatures.push(AC.spawn(level.enemies[k], element.name, run.floor, rnd));
    }
    function stepCreatures() {
      var k, e;
      for (k = creatures.length - 1; k >= 0; k--) {
        e = creatures[k];
        if (Math.abs(e.x - hero.x) > W * 1.2 && !e.seen) continue;   // asleep until the Warden is near
        AC.step(e, ctx);
        if (e.dying === 2) { kills++; spark(e.x, e.y - e.h / 2, WD.ELEMENTS.filter(function (el) { return el.name === e.element; })[0].glow, 18, 2, 30, 0.02); spark(e.x, e.y - e.h / 2, '#ffffff', 6, 1.2, 12, 0); hitstop(4); shake(2); if (e.elder) number(e.x, e.y - e.h - 8, 'ELDER', '#e9e6df'); if (hero.energy < hero.maxEnergy && kills % 3 === 0) { hero.energy++; number(hero.x, hero.y - 32, '+', '#ffb347'); } }
        if (e.dying > 22) creatures.splice(k, 1);
        if (e.y > level.rows * TILE + 40) creatures.splice(k, 1);
      }
      for (k = projectiles.length - 1; k >= 0; k--) {
        var p = projectiles[k];
        if (p.seek) { var dx = hero.x - p.x, dy = hero.y - 11 - p.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy)); p.vx += dx / len * p.seek; p.vy += dy / len * p.seek; }
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity || 0;
        if (tick % 2 === 0) particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 8, max: 8, colour: p.colour, size: 1, gravity: 0 });
        var gone = --p.life <= 0 || tileAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE)) === 1;
        if (p.from === 'enemy' && hero.alive && Math.abs(p.x - hero.x) < hero.w / 2 + p.size && p.y > hero.y - hero.h - p.size && p.y < hero.y + p.size) {
          if (hurtHero(p.x, p.damage)) afflict(p.element);
          gone = true;
        }
        if (p.from === 'hero') { for (var j = 0; j < creatures.length; j++) { var c = creatures[j]; if (!c.dying && Math.abs(p.x - c.x) < c.w / 2 + p.size && p.y > c.y - c.h - p.size && p.y < c.y + p.size) { wound(c, p.damage, p.x, p.element); if (!p.pierce) gone = true; break; } } }
        if (gone) { spark(p.x, p.y, p.colour, 5, 1, 12, 0); projectiles.splice(k, 1); }
      }
      for (k = zaps.length - 1; k >= 0; k--) if (--zaps[k].life <= 0) zaps.splice(k, 1);
    }
    // a wound on a creature, with the Warden's element laid on it
    function wound(e, damage, fromX, elementName) {
      if (!AC.hurt(e, damage, fromX, ctx)) return false;
      hero.hits++;
      if (hero.energy < hero.maxEnergy && hero.hits % 4 === 0) hero.energy++;
      spark(e.x, e.y - e.h / 2, '#ffffff', 8, 1.6, 16, 0.06);
      number(e.x, e.y - e.h - 6, damage, elementName ? AC.STATUS[elementName].colour : '#e9e6df');
      if (elementName === 'ember') e.status.burn = 180;
      else if (elementName === 'frost') e.status.freeze = 90;
      else if (elementName === 'storm') e.status.shock = 60;
      else if (elementName === 'bloom') e.status.poison = 250;
      return true;
    }
    // a box strikes whatever stands in it; returns whether anything was hit
    function strike(box, damage, kind, elementName) {
      var any = false;
      for (var k = 0; k < creatures.length; k++) {
        var e = creatures[k];
        if (e.dying) continue;
        if (e.x + e.w / 2 < box.x0 || e.x - e.w / 2 > box.x1 || e.y < box.y0 || e.y - e.h > box.y1) continue;
        if (wound(e, damage, hero.x, elementName)) any = true;
      }
      if (any) { hitstop(kind === 2 ? 5 : 3); shake(kind === 2 ? 3 : 1.5); }
      return any;
    }
    function drawCreatures() {
      var cx = Math.round(cam.x), cy = Math.round(cam.y), k, e;
      for (k = 0; k < creatures.length; k++) {
        e = creatures[k];
        if (e.x < cam.x - 40 || e.x > cam.x + W + 40) continue;
        var set = actorSprites[e.kind], frames = (e.dir >= 0 ? set : set.flipped)[e.anim], img = frames[Math.min(e.frame, frames.length - 1)];
        var scale = e.elder ? 1.5 : 1, w = img.width * scale, h = img.height * scale;
        var x = Math.round(e.x) - w / 2 - cx, y = Math.round(e.y) - h - cy + (e.spec.flying ? h / 2 : 0);
        var glow = WD.ELEMENTS.filter(function (el) { return el.name === e.element; })[0].glow;
        if (e.dying) { var t = e.dying / 22; fpen.globalAlpha = 1 - t; fpen.drawImage(P.silhouette(img, '#ffffff'), x + w * t / 2, y + h * t / 2, w * (1 - t), h * (1 - t)); fpen.globalAlpha = 1; continue; }
        if (e.flash > 0) fpen.drawImage(P.silhouette(img, '#ffffff'), x, y, w, h);
        else fpen.drawImage(img, x, y, w, h);
        if (e.status.freeze > 0) { fpen.globalAlpha = 0.5; fpen.drawImage(P.silhouette(img, '#d8f1ff'), x, y, w, h); fpen.globalAlpha = 1; }
        if (e.status.burn > 0 && tick % 3 === 0) ember(e.x + (random() - 0.5) * w, e.y - h / 2);
        if (e.status.poison > 0 && tick % 6 === 0) particles.push({ x: e.x + (random() - 0.5) * w, y: e.y - h / 2, vx: 0, vy: -0.3, life: 20, max: 20, colour: '#9ae66e', size: 1, gravity: 0 });
        if (e.hp < e.maxHp) { fpen.fillStyle = '#0b0b12'; fpen.fillRect(x, y - 4, w, 2); fpen.fillStyle = glow; fpen.fillRect(x, y - 4, Math.round(w * e.hp / e.maxHp), 2); }
        light(e.x, e.y - h / 2, e.elder ? 30 : 18, 0.55);
      }
      for (k = 0; k < projectiles.length; k++) { var p = projectiles[k]; fpen.fillStyle = p.colour; fpen.fillRect(Math.round(p.x) - p.size / 2 - cx, Math.round(p.y) - p.size / 2 - cy, p.size, p.size); light(p.x, p.y, 14, 0.6); }
      for (k = 0; k < zaps.length; k++) { var z = zaps[k]; fpen.strokeStyle = z.colour; fpen.lineWidth = 1; fpen.beginPath(); fpen.moveTo(z.x0 - cx, z.y0 - cy); var mx = (z.x0 + z.x1) / 2 + (random() - 0.5) * 12, my = (z.y0 + z.y1) / 2 + (random() - 0.5) * 12; fpen.lineTo(mx - cx, my - cy); fpen.lineTo(z.x1 - cx, z.y1 - cy); fpen.stroke(); light(mx, my, 20, 0.7); }
    }

    /* ---- what the elements do to the Warden ---- */

    var afflictions = { burn: 0, chill: 0, poison: 0 };
    function afflict(elementName) {
      var st = AC.STATUS[elementName];
      if (!st) return;
      if (st.name === 'drain') { if (hero.energy > 0) { hero.energy--; number(hero.x, hero.y - 32, '-', '#a48cff'); } return; }
      if (st.name === 'shock') { hero.vx *= 0.2; return; }
      afflictions[st.name] = st.time;
    }
    function stepAfflictions() {
      if (afflictions.burn > 0) { afflictions.burn--; if (afflictions.burn % 60 === 30) { hero.invuln = 0; hurtHero(hero.x + 1, 1); hero.invuln = Math.max(hero.invuln, 20); } if (tick % 3 === 0) ember(hero.x + (random() - 0.5) * 8, hero.y - 14); }
      if (afflictions.poison > 0) { afflictions.poison--; if (afflictions.poison % 120 === 60) { hero.invuln = 0; hurtHero(hero.x + 1, 1); hero.invuln = Math.max(hero.invuln, 20); } if (tick % 5 === 0) particles.push({ x: hero.x + (random() - 0.5) * 8, y: hero.y - 16, vx: 0, vy: -0.3, life: 20, max: 20, colour: '#9ae66e', size: 1, gravity: 0 }); }
      if (afflictions.chill > 0) afflictions.chill--;
      if (element.hazard === 'ice' && onIce && tick % 6 === 0) particles.push({ x: hero.x + (random() - 0.5) * 8, y: hero.y, vx: -hero.vx * 0.3, vy: -0.4, life: 14, max: 14, colour: '#d8f1ff', size: 1, gravity: 0.02 });
    }

    /* ---- effects: particles, hit-stop, shaking, light ---- */

    var particles = [], numbers = [], afterimages = [], freeze = 0;

    function spark(x, y, colour, n, speed, life, gravity) {
      for (var k = 0; k < n; k++) {
        var a = random() * Math.PI * 2, v = speed * (0.4 + random() * 0.8);
        particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + random() * 0.6), max: life, colour: colour, size: random() < 0.3 ? 2 : 1, gravity: gravity || 0 });
      }
    }
    function dust(x, y, dir, n) {
      for (var k = 0; k < n; k++) particles.push({ x: x + (random() - 0.5) * 6, y: y - random() * 3, vx: dir * (0.3 + random() * 0.8) + (random() - 0.5) * 0.4, vy: -random() * 0.6, life: 14 + random() * 12, max: 24, colour: '#8f8d88', size: 1, gravity: -0.01 });
    }
    function ember(x, y) {
      particles.push({ x: x + (random() - 0.5) * 4, y: y, vx: (random() - 0.5) * 0.2, vy: -0.2 - random() * 0.3, life: 30 + random() * 30, max: 60, colour: random() < 0.5 ? '#ffb347' : '#ffdc9a', size: 1, gravity: -0.003 });
    }
    function number(x, y, value, colour) {
      numbers.push({ x: x, y: y, vy: -0.6, life: 36, text: String(value), colour: colour || '#e9e6df' });
    }
    function afterimage(img, x, y, dir) {
      afterimages.push({ img: P.silhouette(img, '#6b84ff'), x: x, y: y, dir: dir, life: 12 });
    }
    function shake(amount) { cam.shake = Math.max(cam.shake, amount); }
    function hitstop(frames) { freeze = Math.max(freeze, frames); }

    function stepFx() {
      var k, p;
      for (k = particles.length - 1; k >= 0; k--) {
        p = particles[k];
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.vx *= 0.98;
        if (--p.life <= 0) particles.splice(k, 1);
      }
      for (k = numbers.length - 1; k >= 0; k--) { p = numbers[k]; p.y += p.vy; p.vy *= 0.94; if (--p.life <= 0) numbers.splice(k, 1); }
      for (k = afterimages.length - 1; k >= 0; k--) if (--afterimages[k].life <= 0) afterimages.splice(k, 1);
      if (particles.length > 600) particles.splice(0, particles.length - 600);
    }

    function drawFx() {
      var cx = Math.round(cam.x), cy = Math.round(cam.y), k, p;
      for (k = 0; k < afterimages.length; k++) {
        p = afterimages[k];
        fpen.globalAlpha = p.life / 12 * 0.5;
        var img = p.dir >= 0 ? p.img : P.flipH(p.img);
        fpen.drawImage(img, Math.round(p.x) - 16 - cx, Math.round(p.y) - 31 - cy);
      }
      fpen.globalAlpha = 1;
      for (k = 0; k < particles.length; k++) {
        p = particles[k];
        fpen.globalAlpha = Math.min(1, p.life / (p.max * 0.4));
        fpen.fillStyle = p.colour;
        fpen.fillRect(Math.round(p.x) - cx, Math.round(p.y) - cy, p.size, p.size);
      }
      fpen.globalAlpha = 1;
      for (k = 0; k < numbers.length; k++) {
        p = numbers[k];
        fpen.globalAlpha = Math.min(1, p.life / 12);
        text(p.text, Math.round(p.x) - cx, Math.round(p.y) - cy, p.colour, 1, 'center');
      }
      fpen.globalAlpha = 1;
    }

    // the dark, and the lantern's light cut out of it in steps, as a lamp lights a vault
    var dark = P.blank(W, H), dpen = dark.getContext('2d');
    var lights = [];
    function light(x, y, radius, strength) { lights.push({ x: x, y: y, r: radius, s: strength || 1 }); }
    function drawDark(flicker) {
      dpen.globalCompositeOperation = 'source-over';
      dpen.fillStyle = 'rgba(2,2,8,0.74)';
      dpen.fillRect(0, 0, W, H);
      dpen.globalCompositeOperation = 'destination-out';
      var cx = Math.round(cam.x), cy = Math.round(cam.y), k, r;
      for (k = 0; k < lights.length; k++) {
        var L = lights[k], x = Math.round(L.x) - cx, y = Math.round(L.y) - cy;
        var rings = [[1.0, 0.95], [0.78, 0.6], [0.56, 0.35], [0.36, 0.2]];
        for (r = 3; r >= 0; r--) {
          dpen.fillStyle = 'rgba(0,0,0,' + (rings[r][1] * L.s).toFixed(2) + ')';
          dpen.beginPath(); dpen.arc(x, y, L.r * rings[r][0] * flicker, 0, 6.2832); dpen.fill();
        }
      }
      lights.length = 0;
      fpen.drawImage(dark, 0, 0);
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
      if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - 0.25);
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

    // the backdrop: the vault in the floor's colours, its arches sliding slower than the floor, and the element's own furniture behind
    function drawBackdrop() {
      var grad = fpen.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, element.sky[0]); grad.addColorStop(1, element.sky[1]);
      fpen.fillStyle = grad; fpen.fillRect(0, 0, W, H);
      var ox = Math.round(cam.x * 0.35) % 96, oy = Math.round(cam.y * 0.2), k, ax;
      fpen.fillStyle = element.stone[3];
      for (k = -1; k < W / 96 + 1; k++) {
        ax = k * 96 - ox;
        fpen.fillRect(ax, 40 - oy, 10, H);
        fpen.beginPath(); fpen.arc(ax + 48, 64 - oy, 43, Math.PI, 0); fpen.fill();
      }
      fpen.fillStyle = element.sky[0];
      for (k = -1; k < W / 96 + 1; k++) { ax = k * 96 - ox; fpen.beginPath(); fpen.arc(ax + 48, 64 - oy, 38, Math.PI, 0); fpen.fill(); }
      // what hangs, glows or grows in the arches
      var name = element.hazard;
      for (k = -1; k < W / 96 + 1; k++) {
        ax = k * 96 - ox + 48;
        var seed = ((k + Math.floor(cam.x * 0.35 / 96)) * 31 + 7) % 5;
        if (name === 'lava') {
          fpen.fillStyle = element.hazardColours[0]; fpen.fillRect(ax - 14, 118 - oy, 28, 5);
          fpen.fillStyle = element.hazardColours[1]; fpen.fillRect(ax - 10 + ((tick >> 3) + seed) % 6, 119 - oy, 4, 2);
          fpen.fillStyle = 'rgba(255,106,43,0.08)'; fpen.fillRect(ax - 30, 70 - oy, 60, 50);
        } else if (name === 'ice') {
          fpen.fillStyle = element.hazardColours[1];
          for (var i = 0; i < 4; i++) { var ih = 6 + ((seed + i * 3) % 4) * 4; fpen.fillRect(ax - 20 + i * 12, 26 - oy, 2, ih); fpen.fillRect(ax - 20 + i * 12, 26 - oy + ih, 1, 2); }
        } else if (name === 'rail') {
          fpen.fillStyle = (tick + k * 17) % 90 < 4 ? element.hazardColours[2] : element.hazardColours[0];
          fpen.fillRect(ax - 40, 100 - oy, 80, 1);
          fpen.fillStyle = element.hazardColours[1]; fpen.fillRect(ax - 1, 100 - oy, 2, 12); fpen.fillRect(ax - 3, 111 - oy, 6, 2);
        } else if (name === 'spores') {
          fpen.fillStyle = element.hazardColours[0];
          for (var v = 0; v < 3; v++) { var vh = 20 + ((seed + v * 5) % 5) * 8, vx = ax - 24 + v * 20; fpen.fillRect(vx, 30 - oy, 1, vh); fpen.fillRect(vx - 1, 30 - oy + vh - 4, 3, 2); if (v === 1) fpen.fillRect(vx + 1, 30 - oy + (vh >> 1), 2, 1); }
        } else {
          fpen.fillStyle = element.hazardColours[1];
          for (var st = 0; st < 5; st++) { var sx = ax - 40 + ((seed * 7 + st * 19) % 80), sy = 20 + ((seed * 13 + st * 23) % 90) - oy; if ((tick + st * 11 + seed) % 120 < 90) fpen.fillRect(sx, sy, 1, 1); }
        }
      }
      var oy2 = Math.round(cam.x * 0.6) % 48;
      fpen.fillStyle = element.stone[3];
      for (k = -1; k < W / 48 + 1; k++) fpen.fillRect(k * 48 - oy2, 120 - oy, 6, H);
    }

    function drawTiles() {
      var x0 = Math.floor(cam.x / TILE), x1 = Math.ceil((cam.x + W) / TILE), y0 = Math.floor(cam.y / TILE), y1 = Math.ceil((cam.y + H) / TILE);
      for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
        var t = tileAt(tx, ty);
        if (!t) continue;
        var px = tx * TILE - Math.round(cam.x), py = ty * TILE - Math.round(cam.y);
        if (t === 1) {
          fpen.drawImage(TILES.stone[((tx * 7 + ty * 13) % 3 + 3) % 3], px, py);
          if (tileAt(tx, ty - 1) !== 1) fpen.drawImage(TILES.top, px, py);
        } else if (t === 2) fpen.drawImage(TILES.ledge, px, py);
        else if (t === 3) fpen.drawImage(TILES.spikes, px, py);
        else if (t === 4) {
          var hf = element.hazard === 'rail' ? (tick % 150 < 75 ? 1 : 0) : (Math.floor(tick / 12) + tx) % 3;
          fpen.drawImage(TILES.hazard[hf], px, py);
          if (element.hazard !== 'ice') light(tx * TILE + 8, ty * TILE + 8, 22, 0.5);
        }
      }
      drawFurniture();
    }

    // lamps on the walls, the door down, and the relics waiting in their alcoves
    function drawFurniture() {
      var cx = Math.round(cam.x), cy = Math.round(cam.y), k;
      for (k = 0; k < level.lights.length; k++) {
        var lamp = level.lights[k], lx = lamp.x * TILE + 8, ly = lamp.y * TILE + 8;
        if (lx < cam.x - 40 || lx > cam.x + W + 40) continue;
        fpen.fillStyle = '#4a3b2a'; fpen.fillRect(lx - 2 - cx, ly - 4 - cy, 4, 7);
        fpen.fillStyle = '#ffb347'; fpen.fillRect(lx - 1 - cx, ly - 3 - cy, 2, 4);
        fpen.fillStyle = '#ffdc9a'; fpen.fillRect(lx - 1 - cx, ly - 3 - cy, 1, 2);
        light(lx, ly, 46, 0.7);
        if (tick % 4 === 0 && random() < 0.5) ember(lx, ly - 4);
      }
      var dx = Math.round(level.door.x) - cx, dy = Math.round(level.door.y) - cy;
      fpen.fillStyle = element.stone[3]; fpen.fillRect(dx - 9, dy - 26, 18, 26);
      fpen.fillStyle = '#030306'; fpen.fillRect(dx - 7, dy - 24, 14, 24);
      fpen.fillStyle = element.top; fpen.fillRect(dx - 9, dy - 27, 18, 1); fpen.fillRect(dx - 9, dy - 26, 1, 26); fpen.fillRect(dx + 8, dy - 26, 1, 26);
      for (k = 0; k < 4; k++) { fpen.fillStyle = k % 2 ? element.stone[1] : element.stone[2]; fpen.fillRect(dx - 7, dy - 6 + k * 1.5, 14, 1); }
      light(level.door.x, level.door.y - 12, 34, 0.6);
      for (k = 0; k < level.relics.length; k++) {
        var r = level.relics[k];
        if (r.taken) continue;
        var rx = r.x * TILE + 8 - cx, ry = r.y * TILE - 6 - cy + Math.round(Math.sin(tick * 0.08 + k) * 2);
        fpen.fillStyle = '#ffdc9a'; fpen.fillRect(rx - 1, ry - 3, 2, 6); fpen.fillRect(rx - 3, ry - 1, 6, 2);
        fpen.fillStyle = '#ffffff'; fpen.fillRect(rx - 1, ry - 1, 1, 1);
        light(r.x * TILE + 8, r.y * TILE - 6, 28, 0.8);
      }
    }

    function drawHero() {
      var frames = sprites.warden[hero.anim] || sprites.warden.idle, k = Math.min(hero.frame, frames.length - 1);
      var img = facing('warden', hero.anim in sprites.warden ? hero.anim : 'idle', k, hero.dir);
      if (hero.invuln > 0 && hero.alive && !(hero.act && hero.act.kind === 'dash') && (tick >> 2) % 2 === 0) fpen.globalAlpha = 0.45;
      if (!hero.alive && hero.deadFor > 70) fpen.globalAlpha = Math.max(0, 1 - (hero.deadFor - 70) / 40);
      var x = Math.round(hero.x) - 16 - Math.round(cam.x), y = Math.round(hero.y) - 31 - Math.round(cam.y);
      fpen.drawImage(hero.flash > 0 ? P.silhouette(img, '#ffffff') : img, x, y);
      if (afflictions.chill > 0) { fpen.globalAlpha = 0.45; fpen.drawImage(P.silhouette(img, '#9fd8ff'), x, y); fpen.globalAlpha = 1; }
      fpen.globalAlpha = 1;
      // the lantern's light travels with the hand
      if (hero.alive) light(hero.x - hero.dir * 7, hero.y - 12, 78 + (hero.act && hero.act.kind === 'cast' ? 40 : 0), 1);
    }

    function drawHud() {
      var k;
      for (k = 0; k < hero.maxHp; k++) {
        fpen.fillStyle = k < hero.hp ? '#ff4f7b' : '#3a3936';
        fpen.fillRect(4 + k * 9, 4, 7, 6); fpen.fillRect(5 + k * 9, 10, 5, 1); fpen.fillRect(6 + k * 9, 11, 3, 1); fpen.fillRect(7 + k * 9, 12, 1, 1);
        fpen.fillStyle = '#0b0b12'; fpen.fillRect(4 + k * 9, 4, 1, 1); fpen.fillRect(7 + k * 9, 4, 1, 1); fpen.fillRect(10 + k * 9, 4, 1, 1);
      }
      for (k = 0; k < hero.maxEnergy; k++) { fpen.fillStyle = k < hero.energy ? '#ffb347' : '#3a3936'; fpen.fillRect(4 + k * 6, 16, 4, 4); }
      text(element.title + '  ' + run.floor + '-' + (run.section + 1), W - 4, 4, '#8f8d88', 1, 'right');
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

    var transition = 0;
    function stepTransition() {
      if (transition === 0) return false;
      transition++;
      if (transition === 24) {
        run.section++;
        if (run.section >= 3) { run.section = 0; run.floor++; }
        if (run.floor > 5) { run.floor = 1; state = 'title'; }
        loadSection(); placeCreatures(); spawnHero(); stepCamera(true);
        particles.length = 0; afterimages.length = 0; numbers.length = 0;
      }
      if (transition >= 48) transition = 0;
      return true;
    }
    function drawTransition() {
      if (transition === 0) return;
      var a = transition < 24 ? transition / 24 : (48 - transition) / 24;
      fpen.fillStyle = 'rgba(0,0,0,' + a.toFixed(2) + ')'; fpen.fillRect(0, 0, W, H);
    }
    function render() {
      if (sheetMode) return;
      var sx = cam.shake > 0 ? (random() - 0.5) * cam.shake * 2 : 0, sy = cam.shake > 0 ? (random() - 0.5) * cam.shake * 2 : 0;
      cam.x += sx; cam.y += sy;
      drawBackdrop();
      drawTiles();
      drawCreatures();
      drawHero();
      drawFx();
      drawDark(0.97 + 0.03 * Math.sin(tick * 0.4) + (hero.act && hero.act.kind === 'cast' ? 0.15 : 0));
      drawTransition();
      drawHud();
      // into the stage, scaled without smoothing, letterboxed in the dark
      var ratio = canvas.width / size.w;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.fillStyle = '#000';
      pen.fillRect(0, 0, size.w, size.h);
      pen.imageSmoothingEnabled = false;
      pen.drawImage(frame, view.x, view.y, view.w, view.h);
      cam.x -= sx; cam.y -= sy;
    }

    /* ---- the loop and the room's wiring ---- */

    function begin() {
      state = 'run';
      run.floor = 1; run.section = 0; transition = 0;
      loadSection(); placeCreatures(); spawnHero(); stepCamera(true);
      particles.length = 0; afterimages.length = 0; numbers.length = 0;
    }

    function step() {
      poll();
      tick++;
      if (state === 'title') { if (hit('start') || hit('jump') || hit('attack')) begin(); return; }
      if (hit('pause')) state = state === 'paused' ? 'run' : 'paused';
      if (state !== 'run') return;
      if (stepTransition()) { stepFx(); return; }
      if (freeze > 0) { freeze--; return; }
      stepHero();
      stepAfflictions();
      stepCreatures();
      stepFx();
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

    loadSection();
    placeCreatures();
    spawnHero();
    stepCamera(true);

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wide = size.w >= 900 && !document.fullscreenElement;
        // beside the wall label on wide screens: never under it
        var label = env.room.querySelector('.label'), labelRight = label ? label.getBoundingClientRect().right - canvas.getBoundingClientRect().left : 0;
        var x0 = wide ? Math.max(Math.round(size.w * 0.34), Math.round(labelRight) + 12) : 0, vw = size.w - x0, vh = size.h;
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
        return { state: state, tick: tick, hero: { x: hero.x, y: hero.y, vx: hero.vx, vy: hero.vy, dir: hero.dir, onGround: hero.onGround, anim: hero.anim, frame: hero.frame, hp: hero.hp, energy: hero.energy, act: hero.act ? hero.act.kind : null, combo: hero.combo, alive: hero.alive }, creatures: creatures.map(function (e) { return { kind: e.kind, hp: e.hp, x: Math.round(e.x), y: Math.round(e.y), state: e.state, dying: e.dying, elder: e.elder }; }), kills: kills, projectiles: projectiles.length, afflictions: afflictions, particles: particles.length, freeze: freeze, cam: { x: cam.x, y: cam.y }, level: { cols: level.cols, rows: level.rows, element: element.name, door: level.door, relics: level.relics.length, lights: level.lights.length }, run: { seed: run.seed, floor: run.floor, section: run.section }, transition: transition, view: view, cost: cost };
      },
      // drive the game from a test: hold these keys for so many steps
      press: function (names, frames) {
        var list = String(names).split(/[\s,]+/).filter(Boolean), k;
        for (k = 0; k < list.length; k++) { if (!held[list[k]]) queued[list[k]] = true; held[list[k]] = true; }
        for (var n = 0; n < (frames || 1); n++) step();
        for (k = 0; k < list.length; k++) held[list[k]] = false;
        render();
      },
      generate: function (seed, floor, section) { var L = WD.generate(seed, floor, section); return { cols: L.cols, reachable: WD.reachable(L), enemies: L.enemies.length, relics: L.relics.length, tries: L.tries }; },
      warp: function (x, y) { hero.x = x; hero.y = y === undefined ? level.door.y : y; hero.vy = 0; hero.vx = 0; stepCamera(true); },
      find: function (kind) { for (var ty = 0; ty < level.rows; ty++) for (var tx = 0; tx < level.cols; tx++) if (tileAt(tx, ty) === kind) return { x: tx * TILE + 8, y: ty * TILE, tx: tx, ty: ty }; return null; },
      begin: function (seed) { if (seed !== undefined) run.seed = seed; begin(); kills = 0; return run; },
      hurt: function (damage) { hero.invuln = 0; return hurtHero(hero.x + 10, damage || 1); },
      sprites: function () {
        var out = {};
        Object.keys(sprites.warden).forEach(function (name) { out[name] = sprites.warden[name].map(function (img) { return P.count(img); }); });
        Object.keys(actorSprites).forEach(function (name) { out[name] = actorSprites[name].walk.concat(actorSprites[name].attack).map(function (img) { return P.count(img); }); });
        return out;
      },
      summon: function (kind, dx) { var e = AC.spawn({ x: Math.floor((hero.x + (dx || 40)) / TILE), y: Math.floor(hero.y / TILE), kind: AC.KINDS[kind].flying ? 'flyer' : 'walker' }, AC.KINDS[kind].element, run.floor, random); e.kind = kind; e.spec = AC.KINDS[kind]; e.element = AC.KINDS[kind].element; creatures.push(e); return creatures.length; },
      // draw every frame of the Warden large on the stage, for looking at the art; sheet(false) puts the game back
      sheet: function (on, scale, only, set) {
        sheetMode = on !== false;
        if (!sheetMode) return;
        var ratio = canvas.width / size.w, S = scale || 5, group = set === 'creatures' ? (function () { var g = {}; Object.keys(actorSprites).forEach(function (n) { g[n] = actorSprites[n].walk.concat(actorSprites[n].attack); }); return g; })() : sprites[set || 'warden'];
        pen.setTransform(ratio, 0, 0, ratio, 0, 0);
        pen.fillStyle = '#101018'; pen.fillRect(0, 0, size.w, size.h);
        pen.imageSmoothingEnabled = false;
        var y = view.y + 4, x = view.x + 4;
        var wanted = only ? String(only).split(',') : null;
        Object.keys(group).forEach(function (name) {
          if (wanted && wanted.indexOf(name) < 0) return;
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
