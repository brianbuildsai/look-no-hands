/* Undercroft — room 36.

   A rogue-like platformer, and the last room. The building has an undercroft
   and it draws itself again every time you go down: three floors and a vault,
   stitched from a seeded grammar of chunks in five elements; a Warden with a
   weapon, a lantern of three flames and one power; creatures that wind up
   before they strike; weapons and items in four rarities; a guardian in a
   hall of its own at the foot of each floor and a last one under them; and
   nothing carried back up except what was learned.

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
    var CL = window.Classes;
    if (!CL) { env.fail('The undercroft\u2019s four did not load. The other rooms still run.'); return null; }
    // who goes down: numbers and switches from classes.js, frames from pixels.js for that skin and the weapon held
    var classId = 'warden', klass = CL.CLASSES.warden;
    var sprites = { warden: P.hero.build(classId) };
    var flipped = {};
    function facing(set, name, k, dir) {
      var img = sprites[set][name][k];
      if (dir >= 0) return img;
      var key = classId + '/' + weaponId + '/' + set + '/' + name + '/' + k;
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
    var ZONES = [], touchy = false;
    function layoutZones() {
      ZONES = [];
      if (!touchy) return;
      var below = size.h - (view.y + view.h), pad = 10, b = below >= 130 ? 58 : 46, y0, x, gap = 8;
      if (below >= 130) y0 = view.y + view.h + Math.round((below - b * 2 - gap) / 2);
      else y0 = size.h - b * 2 - gap - pad;
      // left hand: left and right; right hand: jump, attack, dash, cast
      ZONES.push({ name: 'left', x: pad, y: y0 + b + gap, w: b, h: b, label: '\u2190' }, { name: 'right', x: pad + b + gap, y: y0 + b + gap, w: b, h: b, label: '\u2192' });
      ZONES.push({ name: 'down', x: pad, y: y0, w: b, h: b, label: '\u2193' }, { name: 'up', x: pad + b + gap, y: y0, w: b, h: b, label: 'TAKE' });
      var rx = size.w - pad - b;
      ZONES.push({ name: 'jump', x: rx, y: y0 + b + gap, w: b, h: b, label: 'JUMP' }, { name: 'attack', x: rx - b - gap, y: y0 + b + gap, w: b, h: b, label: 'HIT' });
      ZONES.push({ name: 'dash', x: rx, y: y0, w: b, h: b, label: 'DASH' }, { name: 'cast', x: rx - b - gap, y: y0, w: b, h: b, label: 'CAST' });
      ZONES.push({ name: 'pause', x: Math.round(size.w / 2) - 20, y: y0 + b + gap + b - 22, w: 40, h: 22, label: 'II' });
    }
    function zoneAt(px, py) {
      for (var k = 0; k < ZONES.length; k++) { var z = ZONES[k]; if (px >= z.x - 6 && px < z.x + z.w + 6 && py >= z.y - 6 && py < z.y + z.h + 6) return z.name; }
      return null;
    }
    function framePoint(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function drawZones() {
      if (!touchy || !ZONES.length) return;
      var ratio = canvas.width / size.w;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.font = '600 12px "Hanken Grotesk", system-ui, sans-serif';
      pen.textAlign = 'center'; pen.textBaseline = 'middle';
      for (var k = 0; k < ZONES.length; k++) {
        var z = ZONES[k], isHeld = !!held[z.name];
        pen.fillStyle = isHeld ? 'rgba(255,179,71,0.35)' : 'rgba(233,230,223,0.08)';
        pen.strokeStyle = isHeld ? 'rgba(255,179,71,0.9)' : 'rgba(233,230,223,0.3)';
        pen.lineWidth = 1;
        pen.beginPath(); pen.roundRect ? pen.roundRect(z.x + 0.5, z.y + 0.5, z.w - 1, z.h - 1, 8) : pen.rect(z.x + 0.5, z.y + 0.5, z.w - 1, z.h - 1); pen.fill(); pen.stroke();
        pen.fillStyle = isHeld ? '#ffdc9a' : '#c4c1ba';
        pen.fillText(z.label, z.x + z.w / 2, z.y + z.h / 2);
      }
    }
    canvas.addEventListener('pointerdown', function (e) {
      try { env.stage.focus({ preventScroll: true }); } catch (err) { /* not fatal */ }
      if (e.pointerType === 'mouse') { if (state === 'title') queued.start = true; return; }
      if (!touchy) { touchy = true; layoutZones(); }
      e.preventDefault();
      var p = framePoint(e), name = zoneAt(p.x, p.y);
      if (state === 'title' && !name) { queued.start = true; return; }
      if (state === 'summary' && !name) { queued.start = true; return; }
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
    var level = null, run = { seed: 36, floor: 1, section: 0, stage: 0 }, flames = 3;
    // the way down: two sections and a guardian on each of three floors, then the vault
    var STAGES = [
      { floor: 1, section: 0, element: 'ember' }, { floor: 1, section: 1, element: 'ember', fountain: true }, { floor: 1, boss: true },
      { floor: 2, section: 0, element: 'frost' }, { floor: 2, section: 1, element: 'bloom', fountain: true }, { floor: 2, boss: true },
      { floor: 3, section: 0, element: 'storm' }, { floor: 3, section: 1, element: 'void', fountain: true }, { floor: 3, boss: true },
      { floor: 4, section: 0, element: 'void', fountain: true }, { floor: 4, boss: true }
    ];
    function syncStage() { var st = STAGES[run.stage]; run.floor = st.floor; run.section = st.boss ? 3 : st.section; }
    var element = WD.ELEMENTS[0];

    function loadSection() {
      syncStage();
      var st = STAGES[run.stage];
      level = st.boss ? WD.arena(run.seed, st.floor) : WD.generate(run.seed, st.floor, st.section, st.element, st.fountain);
      element = level.element;
      if (SND && SND.isOn()) { SND.music(element.name); SND.tension(run.section >= 3 ? 0.4 : 0); }
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

    var DASH_FRAMES = 12, DASH_SPEED = 4.2, DASH_COOLDOWN = 22, airJumped = 0;

    var hero = {
      x: 40, y: 0, vx: 0, vy: 0, w: 10, h: 22, dir: 1,
      onGround: false, coyote: 0, buffer: 0, drop: 0, jumping: false,
      anim: 'idle', frame: 0, clock: 0, landed: 0,
      hp: 6, maxHp: 6, energy: 3, maxEnergy: 3,
      act: null, combo: 0, queued: false, dashCd: 0, airDash: true, invuln: 0, flash: 0, alive: true, deadFor: 0, hits: 0
    };

    function spawnHero() {
      hero.x = level.spawn.x; hero.y = level.spawn.y; hero.vx = 0; hero.vy = 0; hero.dir = 1;
      hero.onGround = false; hero.coyote = 0; hero.buffer = 0; hero.drop = 0; hero.jumping = false;
      hero.anim = 'idle'; hero.frame = 0; hero.clock = 0; hero.landed = 0;
      hero.hp = hero.maxHp; hero.energy = hero.maxEnergy;
      hero.act = null; hero.combo = 0; hero.queued = false; hero.dashCd = 0; hero.airDash = true; hero.invuln = 0; hero.flash = 0; hero.alive = true; hero.deadFor = 0; hero.wall = 0; pounding = false;
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
      var n = hero.combo % swings.length, spec = swings[n];
      hero.act = { kind: 'attack', n: n, spec: spec, frame: 0, clock: 0, ticks: 0, hitDone: false, fxDone: false };
      hero.combo = n + 1; hero.queued = false;
      hero.anim = spec.anim; hero.frame = spec.seq[0]; hero.clock = 0;
      hero.vx = hero.dir * spec.lunge + hero.vx * 0.3;
      sfx('swing');
      if (spec.lift && !hero.onGround) hero.vy = Math.min(hero.vy, -1.5);
    }
    function startDash() {
      hero.act = { kind: 'dash', ticks: 0 };
      hero.anim = 'dash'; hero.frame = 0; hero.clock = 0;
      hero.act.speed = klass.dash === 'charge' ? 3.5 : DASH_SPEED; hero.act.frames = Math.round((klass.dash === 'charge' ? 17 : DASH_FRAMES) * mods.dashLength); hero.act.struck = [];
      hero.vx = hero.dir * hero.act.speed; hero.vy = 0;
      hero.dashCd = Math.round(DASH_COOLDOWN * (klass.dash === 'charge' ? 1.5 : 1) * mods.dashCooldown); hero.invuln = Math.max(hero.invuln, hero.act.frames + 2);
      if (!hero.onGround) hero.airDash = false;
      dust(hero.x, hero.y, -hero.dir, 6);
      sfx('dash');
      if (mods.snowflake) leaveFlake(hero.x, hero.y);
    }
    function startCast() {
      hero.act = { kind: 'cast', ticks: 0, done: false };
      hero.anim = 'cast'; hero.frame = 0; hero.clock = 0;
      if (!(mods.freeCast && (casts + 1) % mods.freeCast === 0)) hero.energy--;
      sfx('cast' + RL.POWERS[power].element);
    }
    function hurtHero(fromX, damage, cause, attacker) {
      if (!hero.alive || hero.invuln > 0) return false;
      if (mods.parry && attacker && hero.act && hero.act.kind === 'attack' && hero.act.ticks <= 12) {
        hero.invuln = 30; attacker.status.shock = 140; if (attacker.attack) { attacker.attack = null; attacker.boxes = []; attacker.cooldown = 90; }
        spark(hero.x + hero.dir * 10, hero.y - 14, '#ffffff', 20, 2.4, 16, 0); number(hero.x, hero.y - 34, 'PARRY', '#ffffff'); hitstop(8); shake(3); sfx('select');
        return false;
      }
      if (cause) lastHurtBy = cause;
      if (mods.shield && shieldUp <= 0) { shieldUp = mods.shield; hero.invuln = 30; spark(hero.x, hero.y - 12, '#ffdc9a', 16, 1.6, 20, 0); number(hero.x, hero.y - 32, 'BUBBLE', '#ffdc9a'); return false; }
      hero.hp -= damage;
      hero.invuln = 60; hero.flash = 6;
      hero.vx = (hero.x < fromX ? -1 : 1) * 2.2; hero.vy = -2.6;
      hero.act = { kind: 'hurt', ticks: 0 };
      hero.anim = 'hurt'; hero.frame = 0; hero.clock = 0; hero.combo = 0; hero.queued = false;
      hitstop(5); shake(3); sfx('hurt');
      spark(hero.x, hero.y - 12, '#ff4f7b', 10, 1.4, 20, 0.05);
      if (hero.hp <= 0 && mods.phoenix > 0) {
        mods.phoenix--; held = held.filter(function (id) { return id !== 'phoenix'; }); hero.hp = hero.maxHp; hero.invuln = 150;
        strike({ x0: hero.x - 70, x1: hero.x + 70, y0: hero.y - 70, y1: hero.y + 10 }, 10, 2, 'ember');
        for (var ph = 0; ph < 90; ph++) { var wing = (ph % 2 ? 1 : -1), pa = -0.3 - random() * 1.2; particles.push({ x: hero.x, y: hero.y - 14, vx: wing * Math.cos(pa) * (1 + random() * 3.4), vy: Math.sin(pa) * (1 + random() * 3.4), life: 30 + random() * 30, max: 60, colour: random() < 0.3 ? '#ffffff' : random() < 0.6 ? '#ffdc9a' : '#ff6a2b', size: random() < 0.4 ? 2 : 1, gravity: 0.03 }); }
        flash = { colour: '#ff8c42', life: 14 }; shake(7); hitstop(10); sfx('boom'); banner = { t: 0, text: 'Phoenix Feather', sub: 'YOU RISE', colour: '#ffd24d' };
      }
      if (hero.hp <= 0 && mods.secondWind > 0) { mods.secondWind--; held = held.filter(function (id) { return id !== 'secondwind'; }); hero.hp = 3; hero.invuln = 120; spark(hero.x, hero.y - 12, '#ffdc9a', 40, 2.4, 40, -0.02); number(hero.x, hero.y - 34, 'SECOND WIND', '#ffdc9a'); }
      if (hero.hp <= 0) { hero.hp = 0; hero.alive = false; hero.act = { kind: 'death', ticks: 0 }; hero.anim = 'death'; hero.frame = 0; hero.clock = 0; hero.invuln = 9999; sfx('death'); if (SND) SND.tension(0); }
      return true;
    }

    // the sweep of a swing: a box in front of the Warden that strikes what it meets
    function stepAct() {
      var a = hero.act;
      a.ticks++;
      if (a.kind === 'attack') {
        var sw = a.spec;
        hero.vx *= hero.onGround ? 0.86 : 0.96;
        a.clock++;
        if (a.clock >= Math.max(1, Math.round(sw.ticks[a.frame] * mods.comboSpeed))) { a.clock = 0; a.frame++; }
        if (a.frame >= sw.seq.length) { hero.act = null; hero.anim = 'idle'; hero.frame = 0; if (hero.combo >= swings.length) hero.combo = 0; return; }
        hero.frame = sw.seq[a.frame];
        if (sw.active.indexOf(a.frame) >= 0) {
          if (!a.fxDone) { a.fxDone = true; swingFx(sw, a.n); if (sw.finisher && weapon.finisher) finisher(weapon.finisher); }
          if (!a.hitDone) { var box = swingBox(sw); if (box && strike(box, weapon.damage[a.n] + mods.damage, sw.finisher || sw.shape === 'slam' ? 2 : a.n, weapon.element || null)) a.hitDone = true; }
        }
        if (hit('attack') && a.frame >= 1 && hero.combo < swings.length) hero.queued = true;
        if (hero.queued && a.frame >= sw.seq.length - 1) startAttack();
        if (hit('dash') && hero.dashCd <= 0 && (hero.onGround || hero.airDash)) startDash();
        return;
      }
      if (a.kind === 'dash') {
        hero.vx = hero.dir * a.speed; hero.vy = 0;
        hero.frame = a.ticks % 6 < 3 ? 0 : 1;
        // the Smith's charge: shoulder first, and whatever it meets is struck once and thrown
        if (klass.dash === 'charge') {
          var cb = { x0: hero.dir > 0 ? hero.x : hero.x - 16, x1: hero.dir > 0 ? hero.x + 16 : hero.x, y0: hero.y - 24, y1: hero.y - 2 };
          for (var ck = 0; ck < creatures.length; ck++) { var ce = creatures[ck]; if (ce.dying || a.struck.indexOf(ce) >= 0) continue; var cbx = boxesOf(ce); for (var cj = 0; cj < cbx.length; cj++) if (!cbx[cj].onHit && overlaps(cb, cbx[cj])) { a.struck.push(ce); if (wound(ce, Math.max(1, Math.round((4 + mods.damage) * (cbx[cj].mult || 1))), hero.x - hero.dir * 8, null)) { if (!ce.boss) { ce.vx = hero.dir * 3.2; ce.vy = -2.2; } hitstop(5); shake(3); sfx('heavy'); spark(hero.x + hero.dir * 12, hero.y - 14, '#ffdc9a', 12, 2.2, 14, 0.04); } break; } }
          if (a.ticks % 2 === 0) particles.push({ x: hero.x - hero.dir * 4, y: hero.y - 1, vx: -hero.dir * (0.5 + random()), vy: -0.6 - random() * 0.8, life: 12, max: 12, colour: random() < 0.5 ? '#ff8c42' : '#8a6a5c', size: 1, gravity: 0.05 });
        }
        if (a.ticks % 2 === 0) afterimage(sprites.warden.dash[hero.frame], hero.x, hero.y, hero.dir);
        if (a.ticks >= a.frames) { hero.act = null; hero.vx = hero.dir * RUN_MAX; hero.anim = 'idle'; }
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

    function stepHero() {
      var free = !hero.act;
      var move = free || hero.act.kind === 'attack' && !hero.onGround ? (down('right') ? 1 : 0) - (down('left') ? 1 : 0) : 0;
      if (hero.dashCd > 0) hero.dashCd--;
      if (hero.invuln > 0 && hero.alive) hero.invuln--;
      if (hero.flash > 0) hero.flash--;
      if (free) {
        var accel = (hero.onGround ? ACCEL : AIR_ACCEL) * (afflictions.chill > 0 ? 0.55 : 1);
        if (move !== 0) {
          hero.vx += move * (onIce ? accel * 0.35 : slick ? accel * 0.55 : accel);
          var top = RUN_MAX * klass.run * mods.speed * (afflictions.chill > 0 ? 0.6 : 1);
          if (Math.abs(hero.vx) > top) hero.vx = move * top;
          hero.dir = move;
        } else {
          hero.vx *= hero.onGround ? (onIce ? 0.975 : slick ? 0.93 : FRICTION) : AIR_FRICTION;
          if (Math.abs(hero.vx) < 0.05) hero.vx = 0;
        }
        if (hit('attack')) { if (hero.combo >= swings.length) hero.combo = 0; startAttack(); }
        else if (hit('dash') && hero.dashCd <= 0 && (hero.onGround || hero.airDash)) startDash();
        else if (hit('cast') && hero.energy > 0) startCast();
      } else stepAct();
      // jumping, with a little forgiveness either side of the edge
      var mayJump = !hero.act || hero.act.kind === 'attack';
      if (hit('jump')) hero.buffer = BUFFER;
      if (mods.pound && !hero.onGround && hero.coyote <= 0 && down('down') && hit('jump') && !pounding && !hero.act) { pounding = true; hero.vy = 6.5; hero.vx = 0; hero.buffer = 0; hero.invuln = Math.max(hero.invuln, 20); }
      if (pounding) { hero.vy = Math.max(hero.vy, 6); hero.vx = 0; }
      if (mayJump && hero.buffer > 0 && hero.wall && !hero.onGround) { hero.vy = JUMP_V * 0.95; hero.vx = -hero.wall * 2.6; hero.dir = -hero.wall; hero.jumping = true; hero.buffer = 0; hero.wall = 0; sfx('jump'); dust(hero.x, hero.y - 8, hero.dir, 4); }
      // everyone has a second jump, from the air; the Boots give a third
      if (mayJump && hero.buffer > 0 && !hero.onGround && hero.coyote <= 0 && !hero.wall && airJumped < mods.airJumps && hero.vy > -2) {
        hero.vy = JUMP_V * 0.9; hero.jumping = true; airJumped++; hero.buffer = 0; sfx('jump');
        spark(hero.x, hero.y, '#9fd8ff', 8, 1.2, 14, 0.02); rings.push({ x: hero.x, y: hero.y, r: 2, grow: 1.4, life: 8, max: 8, colour: '#9fd8ff' });
      }
      if (mayJump && hero.buffer > 0 && (hero.onGround || hero.coyote > 0)) {
        if (down('down') && hero.onGround && standingOnLedge()) hero.drop = 8;
        else { hero.vy = JUMP_V; hero.jumping = true; hero.onGround = false; hero.coyote = 0; dust(hero.x, hero.y, -hero.dir, 3); sfx('jump'); }
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
      if (hero.onGround) { hero.coyote = COYOTE; hero.airDash = true; airJumped = 0; } else if (hero.coyote > 0) hero.coyote--;
      // the gauntlets: a wall she leans on lets her down slowly, and she may jump away from it
      hero.wall = 0;
      if (mods.wallgrip && !hero.onGround && touched.wall && move !== 0 && hero.vy > 0 && !hero.act) { hero.wall = move; hero.vy = Math.min(hero.vy, 0.7); hero.airDash = true; airJumped = 0; if (tick % 5 === 0) dust(hero.x + move * 5, hero.y - 10, -move, 1); }
      // the cape: jump held in the air, and the fall is slow
      if (mods.glider && !hero.onGround && down('jump') && hero.vy > 0.7 && !hero.act) { hero.vy = 0.7; if (tick % 4 === 0) particles.push({ x: hero.x - hero.dir * 6, y: hero.y - 18, vx: -hero.vx * 0.3, vy: -0.2, life: 16, max: 16, colour: '#6b84ff', size: 1, gravity: 0 }); }
      // the greaves: coming down like a hammer
      if (pounding && hero.onGround) { pounding = false; strike({ x0: hero.x - 32, x1: hero.x + 32, y0: hero.y - 22, y1: hero.y + 4 }, 5 + mods.damage, 2, null); rings.push({ x: hero.x, y: hero.y, r: 4, grow: 2.6, life: 14, max: 14, colour: '#e9e6df' }); dust(hero.x, hero.y, 1, 8); dust(hero.x, hero.y, -1, 8); shake(5); sfx('heavy'); hero.invuln = Math.max(hero.invuln, 12); }
      if (hero.onGround && !wasGround) { hero.landed = 8; dust(hero.x, hero.y, 1, 2); dust(hero.x, hero.y, -1, 2); sfx('land'); }
      if (hero.landed > 0) hero.landed--;
      if (hero.alive) touchHazards();
      if (shieldUp > 0) shieldUp--;
      if (level.fountain && !level.fountain.used && Math.abs(hero.x - level.fountain.x) < 12 && Math.abs(hero.y - level.fountain.y) < 8 && hero.hp < hero.maxHp) { level.fountain.used = true; hero.hp = hero.maxHp; afflictions.burn = 0; afflictions.poison = 0; afflictions.chill = 0; spark(hero.x, hero.y - 14, '#ffdc9a', 30, 1.8, 40, -0.02); number(hero.x, hero.y - 34, 'WHOLE', '#ffdc9a'); sfx('pickup'); }
      if (hero.y > level.rows * TILE + 40) { hero.hp = 0; hero.alive = false; hero.act = { kind: 'death', ticks: 80 }; hero.deadFor = 80; lastHurtBy = 'fall'; }
      if (hero.alive && hero.onGround && !level.locked && Math.abs(hero.x - level.door.x) < 7 && Math.abs(hero.y - level.door.y) < 4 && transition === 0) { transition = 1; sfx('door'); }
      if (hero.act && hero.act.kind === 'death' && hero.deadFor > 110) {
        if (flames > 1) {
          flames--;
          while (run.stage > 0 && STAGES[run.stage - 1].floor === STAGES[run.stage].floor) run.stage--;
          loadSection(); placeCreatures(); spawnHero(); stepCamera(true);
          particles.length = 0; afterimages.length = 0; numbers.length = 0; hero.invuln = 120;
          banner = { t: 0, text: flames === 1 ? 'The last flame' : 'A flame goes out', sub: 'YOU RISE AT THE HEAD OF THE FLOOR', colour: '#ffb347' };
        } else endRun(false);
      }
      if (!hero.act) animateHero();
      if (tick % 3 === 0 && hero.alive) ember(hero.x - hero.dir * 8, hero.y - 8);
    }

    // spikes and the element's hazard, where the body touches them
    var onIce = false, slick = false;
    function touchHazards() {
      var half = hero.w / 2, tx0 = Math.floor((hero.x - half) / TILE), tx1 = Math.floor((hero.x + half - 0.001) / TILE);
      var ty0 = Math.floor((hero.y - hero.h) / TILE), ty1 = Math.floor((hero.y - 0.001) / TILE), under = Math.floor((hero.y + 1) / TILE);
      onIce = false; slick = !!(level.slick && hero.onGround && level.arena && Math.abs(hero.y - level.arena.groundY) < 2);
      for (var ty = ty0; ty <= ty1 + 1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
        var t = tileAt(tx, ty), inBody = ty <= ty1, underfoot = ty === under;
        if (t === 3 && (inBody || underfoot && hero.onGround)) { if (hurtHero(tx * TILE + 8, 1, 'spikes')) { hero.vy = -3.2; } return; }
        if (t === 4 && (inBody || underfoot)) {
          if (element.hazard === 'ice') { onIce = true; continue; }
          if (element.hazard === 'rail' && tick % 150 >= 75) continue;
          if (hurtHero(tx * TILE + 8, element.hazard === 'void' ? 2 : 1, element.hazard === 'void' ? 'voidpool' : element.hazard)) { hero.vy = -3.2; status(element.name); }
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
    var GD = window.Guardians;
    if (!GD) { env.fail('The undercroft\u2019s guardians did not load. The other rooms still run.'); return null; }
    var stepLit = { lights: [], glows: [] };
    var creatures = [], projectiles = [], zaps = [], kills = 0, actorSprites = AC.build(), guardianSprites = GD.build(), hazards = [], telegraphs = [], won = false, boss = null, afterChoice = null;
    var ctx = {
      hero: hero, tileAt: tileAt, moveBody: moveBody, spark: spark, random: random,
      particle: function (q) { particles.push(q); },
      // what a guardian lights while it is stepped is held until it is stepped again, however many pictures are drawn between
      light: function (x, y, r, str) { stepLit.lights.push({ x: x, y: y, r: r, s: str || 1 }); },
      hurtHero: function (fromX, damage, e) { var took = hurtHero(fromX, damage, e ? e.kind : ''); if (took && mods.thorns && e) wound(e, mods.thorns, hero.x, null); return took; },
      afflict: function (elementName) { afflict(elementName); },
      projectile: function (p) { p.from = 'enemy'; projectiles.push(p); if (Math.abs(p.x - hero.x) < W) sfx('shot'); },
      zap: function (x0, y0, x1, y1, colour) { zaps.push({ x0: x0, y0: y0, x1: x1, y1: y1, colour: colour, life: 8 }); },
      hazard: function (h) { hazards.push(h); },
      telegraph: function (x, y, w, h, life, colour) { telegraphs.push({ x: x, y: y, w: w, h: h, life: life, max: life, colour: colour }); },
      telegraphLine: function (x0, y0, x1, y1, life, colour) { telegraphs.push({ line: true, x: x0, y: y0, x1: x1, y1: y1, life: life, max: life, colour: colour }); },
      telegraphCrack: function (x, y, w, life, colour) { telegraphs.push({ crack: true, x: x, y: y, w: w, life: life, max: life, colour: colour, seed: Math.floor(x * 7 + y) }); },
      telegraphCircle: function (x, y, r, life, colour) { telegraphs.push({ circle: true, x: x, y: y, r: r, life: life, max: life, colour: colour }); },
      beam: function (x0, y0, x1, y1, colour) { zaps.push({ beam: true, x0: x0, y0: y0, x1: x1, y1: y1, colour: colour, life: 2 }); },
      crescent: function (x, y, dir, r, colour, life) { crescents.push({ x: x, y: y, dir: dir, r: r, colour: colour, life: life, max: life }); },
      shake: shake,
      count: function () { return creatures.length; },
      summon: function (kind, x, y) { var e = AC.make(kind, x, y + 36, false, run.floor, random); e.x = x; e.y = y; e.seen = true; creatures.push(e); spark(x, y, '#8fa3ff', 10, 1.5, 18, 0); },
      weaponId: function () { return weaponId; }, powerName: function () { return power; }, classId: function () { return classId; },
      blackout: function (on) { blackout = !!on; },
      glow: function (x, y, r, colour, alpha) { stepLit.glows.push({ x: x, y: y, r: r, colour: colour, alpha: alpha }); },
      // a guardian has fallen: whatever it had in the air is gone with it
      calm: function () { telegraphs.length = 0; hazards.length = 0; projectiles = projectiles.filter(function (p) { return p.from !== 'enemy'; }); },
      sfx: function (name) { sfx(name); },
      flash: function (colour, life) { flash = { colour: colour, life: life || 8 }; },
      number: function (x, y, value, colour) { number(x, y, value, colour); },
      // the floor itself can change under a guardian; if stone closes on the Warden she is lifted out of it
      setTile: function (tx, ty, t) {
        level.set(tx, ty, t);
        if (t === 1 && hero.x + hero.w / 2 > tx * TILE && hero.x - hero.w / 2 < (tx + 1) * TILE && hero.y > ty * TILE && hero.y - hero.h < (ty + 1) * TILE) { hero.y = ty * TILE - 0.001; hero.vy = 0; }
      }
    };
    function placeCreatures() {
      creatures = []; projectiles = []; zaps = [];
      var rnd = WD.makeRandom(run.seed * 31 + run.floor * 7 + run.section);
      for (var k = 0; k < level.enemies.length; k++) creatures.push(AC.spawn(level.enemies[k], element.name, run.floor, rnd));
      boss = null; hazards = []; telegraphs = []; blackout = false; stepLit.lights.length = 0; stepLit.glows.length = 0;
      placeChests();
      if (level.boss) { boss = GD.spawn(run.floor, level.arena, rnd); creatures.push(boss); sfx('roar'); }
    }
    function stepHazards() {
      var k, h;
      for (k = hazards.length - 1; k >= 0; k--) {
        h = hazards[k];
        if (hero.alive && overlaps(heroHurtBox(), h)) { if (hurtHero((h.x0 + h.x1) / 2, h.damage, boss ? boss.kind : h.element)) afflict(h.element); }
        if (h.life % (h.fire ? 5 : 3) === 0) particles.push({ x: h.x0 + random() * (h.x1 - h.x0), y: h.y0 + random() * (h.y1 - h.y0), vx: 0, vy: -0.4 - random() * 0.6, life: 14, max: 14, colour: h.colour, size: random() < 0.4 ? 2 : 1, gravity: 0 });
        if (--h.life <= 0) hazards.splice(k, 1);
      }
      for (k = telegraphs.length - 1; k >= 0; k--) if (--telegraphs[k].life <= 0) telegraphs.splice(k, 1);
      // the guardian falls: the way opens, and there is choosing to do
      if (boss && !boss.dying && SND) SND.tension(0.4 + 0.6 * (1 - boss.hp / boss.maxHp));
      if (boss && boss.dying === 60) {
        level.locked = false; kills++; sfx('boom'); if (SND) SND.tension(0);
        hero.hp = hero.maxHp;
        spark(boss.x, boss.y - boss.h / 2, '#ffffff', 60, 3, 50, 0.02); spark(boss.x, boss.y - boss.h / 2, element.glow, 40, 2.4, 60, -0.01); shake(6);
        if (run.stage >= STAGES.length - 1) banner = { t: 0, text: 'The way up is open', sub: 'THERE IS NOTHING LEFT BELOW YOU', colour: '#ffdc9a' };   // the last of them: nothing to choose, only the door
        else {
          dropPickup({ kind: 'weapon', id: WP.roll(random, run.floor + 1, true, weaponId) }, boss.x, level.arena.groundY - 20);
          for (var hk = 0; hk < 3; hk++) dropPickup({ kind: 'heart', id: 'heart' }, boss.x + (hk - 1) * 14, level.arena.groundY - 24);
          afterChoice = 'altar';
          openChoice(3, true);
        }
      }
    }
    // what is about to happen is drawn over the dark, so that it can be read
    function drawTelegraphs() {
      var cx = Math.round(cam.x), cy = Math.round(cam.y), k, h;
      for (k = 0; k < telegraphs.length; k++) {
        h = telegraphs[k];
        if (h.line) { fpen.globalAlpha = 0.6 + 0.3 * Math.sin(tick * 0.6); fpen.strokeStyle = h.colour; fpen.lineWidth = 1; fpen.setLineDash([4, 3]); fpen.lineDashOffset = -(tick >> 1); fpen.beginPath(); fpen.moveTo(Math.round(h.x) - cx + 0.5, Math.round(h.y) - cy + 0.5); fpen.lineTo(Math.round(h.x1) - cx + 0.5, Math.round(h.y1) - cy + 0.5); fpen.stroke(); fpen.setLineDash([]); fpen.fillStyle = h.colour; fpen.fillRect(Math.round(h.x1) - 3 - cx, Math.round(h.y1) - 2 - cy, 7, 2); fpen.globalAlpha = 1; continue; }
        if (h.crack) {
          var grown = Math.min(1, (h.max - h.life) / Math.min(40, h.max * 0.6)), half = h.w * (0.3 + 0.7 * grown), seed = h.seed, px = h.x - half, zig = 0;
          fpen.globalAlpha = 0.65 + 0.35 * Math.sin(tick * 0.5); fpen.strokeStyle = h.colour; fpen.lineWidth = 1; fpen.beginPath(); fpen.moveTo(Math.round(px) - cx + 0.5, Math.round(h.y) - cy - 0.5);
          while (px < h.x + half) { px += 4; zig++; seed = (seed * 9301 + 49297) % 233280; var jy = (seed / 233280 - 0.5) * 5; fpen.lineTo(Math.round(px) - cx + 0.5, Math.round(h.y + jy) - cy - 0.5); if (zig % 3 === 0) { fpen.lineTo(Math.round(px + 2) - cx + 0.5, Math.round(h.y + jy - 4 * grown) - cy - 0.5); fpen.moveTo(Math.round(px) - cx + 0.5, Math.round(h.y + jy) - cy - 0.5); } }
          fpen.stroke(); fpen.globalAlpha = 0.18 * grown; fpen.fillStyle = h.colour; fpen.fillRect(Math.round(h.x - half) - cx, Math.round(h.y) - 3 - cy, Math.round(half * 2), 3); fpen.globalAlpha = 1; continue;
        }
        if (h.circle) { fpen.globalAlpha = 0.3 + 0.25 * Math.sin(tick * 0.5); fpen.strokeStyle = h.colour; fpen.lineWidth = 1; fpen.beginPath(); fpen.arc(h.x - cx, h.y - cy, h.r * (1 - 0.5 * h.life / h.max), 0, 6.2832); fpen.stroke(); fpen.globalAlpha = 0.12; fpen.fillStyle = h.colour; fpen.beginPath(); fpen.arc(h.x - cx, h.y - cy, h.r, 0, 6.2832); fpen.fill(); fpen.globalAlpha = 1; continue; }
      }
      for (k = 0; k < telegraphs.length; k++) { h = telegraphs[k]; if (h.line || h.circle || h.crack) continue; var a = 0.25 + 0.25 * Math.sin(tick * 0.5); fpen.globalAlpha = a; fpen.fillStyle = h.colour; fpen.fillRect(Math.round(h.x) - cx, Math.round(h.y) - cy, h.w, h.h); fpen.globalAlpha = 1; fpen.strokeStyle = h.colour; fpen.lineWidth = 1; fpen.strokeRect(Math.round(h.x) - cx + 0.5, Math.round(h.y) - cy + 0.5, h.w - 1, h.h - 1); }
    }
    function drawHazards() {
      var cx = Math.round(cam.x), cy = Math.round(cam.y), k, h;
      for (k = 0; k < hazards.length; k++) {
        h = hazards[k];
        if (!h.fire) continue;
        var fade = Math.min(1, h.life / 30), fw = Math.round(h.x1 - h.x0);
        for (var fi = 0; fi < fw; fi += 2) {
          var fh = Math.round((4 + 7 * Math.abs(Math.sin(fi * 0.9 + tick * 0.21 + h.x0)) * (1 - Math.abs(fi - fw / 2) / fw)) * fade);
          fpen.fillStyle = '#ff6a2b'; fpen.fillRect(Math.round(h.x0) + fi - cx, Math.round(h.y1) - fh - cy, 2, fh);
          fpen.fillStyle = '#ffb347'; fpen.fillRect(Math.round(h.x0) + fi - cx, Math.round(h.y1) - Math.round(fh * 0.6) - cy, 2, Math.round(fh * 0.6));
          if (fi % 4 === 0) { fpen.fillStyle = '#ffdc9a'; fpen.fillRect(Math.round(h.x0) + fi - cx, Math.round(h.y1) - Math.round(fh * 0.3) - cy, 1, Math.round(fh * 0.3)); }
        }
        light((h.x0 + h.x1) / 2, h.y1 - 4, 34, 0.7); glow((h.x0 + h.x1) / 2, h.y1 - 4, 20, '#ff6a2b', 0.18 * fade);
      }
      for (k = 0; k < hazards.length; k++) { h = hazards[k]; if (h.fire) continue; fpen.globalAlpha = 0.45; fpen.fillStyle = h.colour; fpen.fillRect(Math.round(h.x0) - cx, Math.round(h.y0) - cy, Math.round(h.x1 - h.x0), Math.round(h.y1 - h.y0)); fpen.globalAlpha = 1; light((h.x0 + h.x1) / 2, (h.y0 + h.y1) / 2, 30, 0.6); }
    }
    function drawBossBar() {
      if (!boss || boss.dying > 60) return;
      var w = 140, x = Math.round(W / 2 - w / 2), y = H - 16;
      text(boss.name, W / 2, y - 8, '#e9e6df', 1, 'center');
      fpen.fillStyle = '#0b0b12'; fpen.fillRect(x - 1, y - 1, w + 2, 5);
      fpen.fillStyle = '#3a3936'; fpen.fillRect(x, y, w, 3);
      fpen.fillStyle = boss.phase ? '#ff4f7b' : element.glow; fpen.fillRect(x, y, Math.round(w * boss.hp / boss.maxHp), 3);
      if (boss.spec.phases) for (var pk = 0; pk < boss.spec.phases.length; pk++) { fpen.fillStyle = '#0b0b12'; fpen.fillRect(x + Math.round(w * boss.spec.phases[pk]), y - 1, 1, 5); }
      if (boss.state === 'wake') {
        var shown = Math.min(1, (boss.clock || 0) / 30);
        text(boss.name.toUpperCase(), W / 2, 62, element.glow, 2, 'center');
        if (boss.title) text(boss.title, W / 2, 80, '#e9e6df', 1, 'center');
        fpen.fillStyle = element.glow; fpen.fillRect(Math.round(W / 2 - 60 * shown), 76, Math.round(120 * shown), 1);
      }
    }
    function stepCreatures() {
      var k, e;
      for (k = creatures.length - 1; k >= 0; k--) {
        e = creatures[k];
        if (Math.abs(e.x - hero.x) > W * 1.2 && !e.seen) continue;   // asleep until the Warden is near
        if (e.boss) GD.step(e, ctx); else AC.step(e, ctx);
        if (e.boxes && e.boxes.length && hero.alive && !e.hitHero) {
          var hb = heroHurtBox();
          for (var bi = 0; bi < e.boxes.length; bi++) {
            if (!overlaps(hb, e.boxes[bi])) continue;
            if (hurtHero(e.x, e.boxes[bi].damage || 1, e.kind, e)) { e.hitHero = true; afflict(e.boxes[bi].element || e.element); if (mods.thorns) wound(e, mods.thorns, hero.x, null); }
            break;
          }
        }
        if (e.dying === 2 && !e.boss) { kills++; if (e.elder) dropPickup(rollLoot(random, true), e.x, e.y - 10); else if (random() < 0.14) dropPickup({ kind: 'heart', id: 'heart' }, e.x, e.y - 8); if (weapon.ability === 'reap') { reaped++; if (reaped % 3 === 0 && hero.hp < hero.maxHp) { hero.hp++; number(hero.x, hero.y - 34, '+1', '#ff3b4e'); } } spark(e.x, e.y - e.h / 2, WD.ELEMENTS.filter(function (el) { return el.name === e.element; })[0].glow, 18, 2, 30, 0.02); spark(e.x, e.y - e.h / 2, '#ffffff', 6, 1.2, 12, 0); hitstop(4); shake(2); if (e.elder) number(e.x, e.y - e.h - 8, 'ELDER', '#e9e6df'); if (hero.energy < hero.maxEnergy && kills % 3 === 0) { hero.energy++; number(hero.x, hero.y - 32, '+', '#ffb347'); } }
        if (e.dying > (e.boss ? 90 : 22)) creatures.splice(k, 1);
        if (e.y > level.rows * TILE + 40) creatures.splice(k, 1);
      }
      for (k = projectiles.length - 1; k >= 0; k--) {
        var p = projectiles[k];
        if (p.seek) { var dx = hero.x - p.x, dy = hero.y - 11 - p.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy)); p.vx += dx / len * p.seek; p.vy += dy / len * p.seek; }
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity || 0;
        if (tick % 2 === 0) particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 8, max: 8, colour: p.colour, size: 1, gravity: 0 });
        var gone = --p.life <= 0 || (!p.wave && tileAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE)) === 1) || (p.wave && tileAt(Math.floor((p.x + p.vx * 3) / TILE), Math.floor(p.y / TILE)) === 1);
        var struckStone = gone && p.life > 0;
        var pbox = { x0: p.x - p.size / 2, x1: p.x + p.size / 2, y0: p.y - p.size / 2, y1: p.y + p.size / 2 };
        if (p.from === 'enemy' && hero.alive && overlaps(heroHurtBox(), pbox)) {
          if (hurtHero(p.x, p.damage, p.cause ? p.cause : p.wave ? 'wave' : p.seek ? 'beam' : p.cloud ? 'spore' : 'shard')) afflict(p.element);
          gone = true;
        }
        if (p.from === 'hero') {
          for (var j = 0; j < creatures.length; j++) {
            var c = creatures[j];
            if (c.dying || (p.struck && p.struck.indexOf(c) >= 0)) continue;
            var cb = boxesOf(c), touched = false;
            for (var q = 0; q < cb.length; q++) if (overlaps(pbox, cb[q])) { if (cb[q].onHit) { touched = cb[q].onHit(c, ctx, p.damage, p.x - p.vx * 4); break; } if (c.boss && cb.length > 1) c.struckAt = { x: (cb[q].x0 + cb[q].x1) / 2, y: (cb[q].y0 + cb[q].y1) / 2 }; wound(c, Math.max(1, Math.round(p.damage * (cb[q].mult || 1))), p.x, p.element); touched = true; break; }
            if (touched) { (p.struck || (p.struck = [])).push(c); if (!p.pierce) { gone = true; break; } }
          }
        }
        if (gone) { if (p.land && struckStone) p.land(p); spark(p.x, p.y, p.colour, 5, 1, 12, 0); projectiles.splice(k, 1); }
      }
      for (k = zaps.length - 1; k >= 0; k--) if (--zaps[k].life <= 0) zaps.splice(k, 1);
    }
    // a wound on a creature, with the Warden's element laid on it
    function wound(e, damage, fromX, elementName) {
      if (e.status.freeze > 0) damage += mods.frozenBonus;
      if (!AC.hurt(e, damage, fromX, ctx)) return false;
      if (e.boss) { e.vx = 0; e.vy = Math.min(e.vy, 0); } else e.vx *= mods.knockback;
      if (mods.breaker && !e.boss && e.attack && e.attack.phase === 'windup') { if (e.attack.def.end) e.attack.def.end(e, ctx); e.attack = null; e.boxes = []; e.cooldown = 50; number(e.x, e.y - e.h - 14, 'BROKEN', '#ffb347'); }
      if (mods.slowOnHit) e.status.shock = Math.max(e.status.shock || 0, mods.slowOnHit);
      hero.hits++; countHit();
      if (hero.energy < hero.maxEnergy && hero.hits % mods.hitsPerEnergy === 0) hero.energy++;
      sfx(e.boss || e.elder ? 'heavy' : 'hit'); if (elementName === 'frost') sfx('freeze');
      var at = e.struckAt || { x: e.x, y: e.y - e.h / 2 }; e.struckAt = null;
      spark(at.x, at.y, '#ffffff', 8, 1.6, 16, 0.06);
      number(at.x, at.y - e.h / 2 - 6, damage, elementName ? AC.STATUS[elementName].colour : '#e9e6df');
      if (elementName === 'ember') { e.status.burn = 180; e.status.burnDamage = mods.burnDamage; if (mods.burnSpread) for (var n = 0; n < creatures.length; n++) { var o = creatures[n]; if (o !== e && !o.dying && Math.abs(o.x - e.x) < 40 && Math.abs(o.y - e.y) < 30) { o.status.burn = 120; o.status.burnDamage = mods.burnDamage; } } }
      else if (elementName === 'frost') e.status.freeze = Math.round(90 * mods.freezeTime);
      else if (elementName === 'storm') e.status.shock = Math.round(60 * mods.shockTime);
      else if (elementName === 'bloom') e.status.poison = 250;
      return true;
    }
    // a box strikes whatever stands in it; returns whether anything was hit
    function overlaps(a, b) { return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0; }
    // where the Warden can be struck: a little inside her body, to be fair to her
    function heroHurtBox() { return { x0: hero.x - 4, x1: hero.x + 4, y0: hero.y - 20, y1: hero.y - 1 }; }
    function boxesOf(e) {
      if (!e.boss) return AC.hurtBoxes(e);
      if (GD.hurtBoxes) return GD.hurtBoxes(e);
      return [{ x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y - e.h, y1: e.y, mult: 1 }];
    }
    var lastStrike = null, debugBoxes = false, crescents = [];
    // the sweep of a blade, drawn as a crescent that opens and fades
    function drawCrescents() {
      var cx = Math.round(cam.x), cy = Math.round(cam.y);
      for (var k = crescents.length - 1; k >= 0; k--) {
        var c = crescents[k], t = 1 - c.life / c.max, a0 = -1.9 + t * 1.2, a1 = a0 + 1.6 + t * 0.8;
        fpen.save(); fpen.translate(Math.round(c.x) - cx, Math.round(c.y) - cy); if (c.dir < 0) fpen.scale(-1, 1);
        fpen.globalAlpha = Math.min(1, c.life / c.max * 1.6);
        if (c.big) { fpen.strokeStyle = c.colour; fpen.globalAlpha *= 0.4; fpen.lineWidth = 12 * (1 - t) + 2; fpen.beginPath(); fpen.arc(-4, 0, c.r - 2, a0 - 0.2, a1 + 0.2); fpen.stroke(); fpen.globalAlpha = Math.min(1, c.life / c.max * 1.6); }
        fpen.strokeStyle = c.colour; fpen.lineWidth = (c.big ? 7 : 5) * (1 - t) + 1; fpen.beginPath(); fpen.arc(-4, 0, c.r, a0, a1); fpen.stroke();
        fpen.strokeStyle = '#ffffff'; fpen.lineWidth = 1.5; fpen.beginPath(); fpen.arc(-4, 0, c.r + 1, a0 + 0.2, a1 - 0.1); fpen.stroke();
        fpen.restore(); fpen.globalAlpha = 1;
        if (--c.life <= 0) crescents.splice(k, 1);
      }
    }
    // a box strikes whatever can be struck inside it; returns whether anything was hit
    function strike(box, damage, kind, elementName) {
      var any = false;
      lastStrike = { box: box, life: 8 };
      for (var ci = 0; ci < chests.length; ci++) if (!chests[ci].open && overlaps(box, { x0: chests[ci].x - 8, x1: chests[ci].x + 8, y0: chests[ci].y - 14, y1: chests[ci].y })) openChest(chests[ci]);
      for (var k = 0; k < creatures.length; k++) {
        var e = creatures[k];
        if (e.dying) continue;
        var boxes = boxesOf(e);
        if (!boxes.length && e.vars && e.vars.shelled && overlaps(box, { x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y - e.h, y1: e.y })) { spark(e.x, e.y - e.h, '#ffffff', 5, 1.6, 10, 0.04); sfx('select'); }
        for (var j = 0; j < boxes.length; j++) {
          if (!overlaps(box, boxes[j])) continue;
          if (boxes[j].onHit) { if (boxes[j].onHit(e, ctx, damage, hero.x)) any = true; break; }
          if (e.boss && e.vars) e.vars.struckHand = boxes[j].hand;
          if (e.boss && boxes.length > 1) e.struckAt = { x: (boxes[j].x0 + boxes[j].x1) / 2, y: (boxes[j].y0 + boxes[j].y1) / 2 };
          if (wound(e, Math.max(1, Math.round(damage * (boxes[j].mult || 1))), hero.x, elementName)) { any = true; if (boxes[j].mult > 1) { spark((boxes[j].x0 + boxes[j].x1) / 2, (boxes[j].y0 + boxes[j].y1) / 2, '#ffdc9a', 10, 2.2, 18, 0.02); number(e.x, e.y - e.h - 16, 'SOFT', '#ffdc9a'); } }
          break;
        }
      }
      if (any) { hitstop(Math.round((kind === 2 ? 5 : 3) * mods.hitstop)); shake(kind === 2 ? 3 : 1.5); }
      return any;
    }
    // every box, drawn over the game, for tuning them against the art
    function drawBoxes() {
      if (!debugBoxes) return;
      var cx = Math.round(cam.x), cy = Math.round(cam.y), k, j;
      function rect(b, colour, fill) { fpen.strokeStyle = colour; fpen.lineWidth = 1; fpen.strokeRect(Math.round(b.x0) - cx + 0.5, Math.round(b.y0) - cy + 0.5, Math.round(b.x1 - b.x0) - 1, Math.round(b.y1 - b.y0) - 1); if (fill) { fpen.globalAlpha = 0.25; fpen.fillStyle = colour; fpen.fillRect(Math.round(b.x0) - cx, Math.round(b.y0) - cy, Math.round(b.x1 - b.x0), Math.round(b.y1 - b.y0)); fpen.globalAlpha = 1; } }
      rect(heroHurtBox(), '#5dff8a');
      if (lastStrike) { rect(lastStrike.box, '#ffe14d', true); if (--lastStrike.life <= 0) lastStrike = null; }
      for (k = 0; k < creatures.length; k++) {
        var e = creatures[k];
        if (e.dying) continue;
        var hb = boxesOf(e);
        for (j = 0; j < hb.length; j++) rect(hb[j], hb[j].mult > 1 ? '#ff9df0' : '#4dd2ff');
        if (e.boxes) for (j = 0; j < e.boxes.length; j++) rect(e.boxes[j], '#ff4040', true);
      }
      for (k = 0; k < projectiles.length; k++) { var p = projectiles[k]; rect({ x0: p.x - p.size / 2, x1: p.x + p.size / 2, y0: p.y - p.size / 2, y1: p.y + p.size / 2 }, p.from === 'hero' ? '#ffe14d' : '#ff9040'); }
      for (k = 0; k < hazards.length; k++) rect({ x0: hazards[k].x0, x1: hazards[k].x1, y0: hazards[k].y0, y1: hazards[k].y1 }, '#ff4040');
    }
    function drawCreatures() {
      var cx = Math.round(cam.x), cy = Math.round(cam.y), k, e;
      for (k = 0; k < creatures.length; k++) {
        e = creatures[k];
        if (e.boss && e.spec.scenery) e.spec.scenery(e, { pen: fpen, cx: cx, cy: cy, tick: tick });
        if ((e.x < cam.x - 40 || e.x > cam.x + W + 40) && !(e.boss && e.spec.draw)) continue;
        var set, frames, img, scale, w, h, x, y;
        if (e.boss && e.spec.draw) {
          e.spec.draw(e, { pen: fpen, cx: cx, cy: cy, tick: tick });
          if (e.status.burn > 0 && tick % 3 === 0) ember(e.x + (random() - 0.5) * 16, e.y);
          continue;
        }
        if (e.boss && e.spec.modern) {
          set = guardianSprites[e.kind]; if (set.byPhase) set = set.byPhase[Math.min(e.phase, set.byPhase.length - 1)];
          frames = (e.dir >= 0 ? set.frames : set.flipped)[e.anim] || (e.dir >= 0 ? set.frames : set.flipped).idle; img = frames[Math.min(e.frame, frames.length - 1)];
          scale = 1; w = img.width; h = img.height;
          x = Math.round(e.x) - (e.dir >= 0 ? set.anchor.x : img.width - set.anchor.x) - cx; y = Math.round(e.y) - set.anchor.y - cy;
          if (e.dying) {
            fpen.globalAlpha = e.dying > 60 ? Math.max(0, 1 - (e.dying - 60) / 30) : 1;
            fpen.drawImage(e.dying < 60 && e.dying % 10 < 2 ? P.silhouette(img, '#ffffff') : img, x, y);
            fpen.globalAlpha = 1; continue;
          }
        } else {
          set = actorSprites[e.kind]; frames = (e.dir >= 0 ? set.frames : set.flipped)[e.anim] || set.frames.walk; img = frames[Math.min(e.frame, frames.length - 1)];
          scale = e.size; w = img.width * scale; h = img.height * scale;
          x = Math.round(e.x) - (e.dir >= 0 ? set.anchor.x : img.width - set.anchor.x) * scale - cx; y = Math.round(e.y) - set.anchor.y * scale - cy;
        }
        var glow = WD.ELEMENTS.filter(function (el) { return el.name === e.element; })[0].glow;
        if (e.dying) { var t = Math.min(1, e.dying / (e.boss ? 60 : 22)); fpen.globalAlpha = 1 - t; fpen.drawImage(P.silhouette(img, '#ffffff'), x + w * t / 2, y + h * t / 2, w * (1 - t), h * (1 - t)); fpen.globalAlpha = 1; continue; }
        if (e.flash > 0) fpen.drawImage(P.silhouette(img, '#ffffff'), x, y, w, h);
        else fpen.drawImage(img, x, y, w, h);
        if (e.status.freeze > 0) { fpen.globalAlpha = 0.5; fpen.drawImage(P.silhouette(img, '#d8f1ff'), x, y, w, h); fpen.globalAlpha = 1; }
        if (e.status.burn > 0 && tick % 3 === 0) ember(e.x + (random() - 0.5) * w, e.y - h / 2);
        if (e.status.poison > 0 && tick % 6 === 0) particles.push({ x: e.x + (random() - 0.5) * w, y: e.y - h / 2, vx: 0, vy: -0.3, life: 20, max: 20, colour: '#9ae66e', size: 1, gravity: 0 });
        if (e.hp < e.maxHp && !e.boss) { fpen.fillStyle = '#0b0b12'; fpen.fillRect(x, y - 4, w, 2); fpen.fillStyle = glow; fpen.fillRect(x, y - 4, Math.round(w * e.hp / e.maxHp), 2); }
        light(e.x, e.spec.flying && !e.boss ? e.y : e.y - (e.boss ? e.h : h) / 2, (e.boss ? 56 : e.elder ? 30 : 18) * (mods.glowFar && !e.boss ? 2 : 1), mods.glowFar ? 0.8 : 0.55);
      }
      for (k = 0; k < projectiles.length; k++) { var p = projectiles[k]; fpen.fillStyle = p.colour; if (p.flame) { var fx = Math.round(p.x) - cx, fy = Math.round(p.y) - cy; fpen.fillStyle = '#ff6a2b'; fpen.beginPath(); fpen.arc(fx, fy, 7, 0, 6.2832); fpen.fill(); fpen.fillStyle = '#ffb347'; fpen.beginPath(); fpen.arc(fx + (p.vx > 0 ? 2 : -2), fy, 5, 0, 6.2832); fpen.fill(); fpen.fillStyle = '#ffdc9a'; fpen.beginPath(); fpen.arc(fx + (p.vx > 0 ? 3 : -3), fy, 2, 0, 6.2832); fpen.fill(); for (var fl = 0; fl < 2; fl++) particles.push({ x: p.x - p.vx * 2, y: p.y + (random() - 0.5) * 10, vx: -p.vx * 0.2, vy: -0.4 - random() * 0.6, life: 12 + random() * 8, max: 20, colour: random() < 0.5 ? '#ff8c42' : '#ffdc9a', size: random() < 0.4 ? 2 : 1, gravity: -0.02 }); } else if (p.shard) { var sx = Math.round(p.x) - cx, sy = Math.round(p.y) - cy; fpen.fillRect(sx - 1, sy - 3, 3, 7); fpen.fillRect(sx - 3, sy - 1, 7, 3); fpen.fillStyle = '#ffffff'; fpen.fillRect(sx - 1, sy - 1, 3, 3); fpen.fillStyle = '#0a1220'; fpen.fillRect(sx, sy, 1, 1); } else if (p.icicle && p.big) { var ix = Math.round(p.x) - cx, iy = Math.round(p.y) - cy; fpen.fillStyle = '#0a1220'; fpen.fillRect(ix - 3, iy - 8, 7, 3); fpen.fillRect(ix - 2, iy - 5, 5, 6); fpen.fillRect(ix - 1, iy + 1, 3, 5); fpen.fillStyle = p.colour; fpen.fillRect(ix - 2, iy - 7, 5, 2); fpen.fillRect(ix - 1, iy - 5, 3, 6); fpen.fillRect(ix, iy + 1, 1, 4); fpen.fillStyle = '#ffffff'; fpen.fillRect(ix - 1, iy - 7, 1, 8); } else if (p.icicle) { fpen.fillRect(Math.round(p.x) - 1 - cx, Math.round(p.y) - 5 - cy, 3, 7); fpen.fillStyle = '#ffffff'; fpen.fillRect(Math.round(p.x) - cx, Math.round(p.y) - 4 - cy, 1, 4); fpen.fillStyle = p.colour; fpen.fillRect(Math.round(p.x) - cx, Math.round(p.y) + 2 - cy, 1, 2); } else if (p.ember) { fpen.fillRect(Math.round(p.x) - 2 - cx, Math.round(p.y) - 2 - cy, 4, 4); fpen.fillStyle = '#ffdc9a'; fpen.fillRect(Math.round(p.x) - 1 - cx, Math.round(p.y) - 1 - cy, 2, 2); } else if (p.wave) { var wx = Math.round(p.x) - cx, wy = Math.round(p.y) + 5 - cy, wd = p.vx > 0 ? 1 : -1; for (var wi = 0; wi < 5; wi++) { var wh = [11, 9, 7, 5, 3][wi] + ((tick >> 2) + wi) % 2 * 2; fpen.fillStyle = p.colour; fpen.fillRect(wx - wd * wi * 3 - 1, wy - wh, 3, wh); fpen.fillStyle = p.core || '#ffdc9a'; fpen.fillRect(wx - wd * wi * 3 - 1, wy - Math.round(wh * 0.45), 3, Math.round(wh * 0.45)); } if (tick % 2 === 0) particles.push({ x: p.x - wd * 6, y: p.y - 2 - random() * 6, vx: -wd * 0.4, vy: -0.5 - random() * 0.5, life: 14, max: 14, colour: p.colour, size: 1, gravity: -0.01 }); } else if (p.coal) { var qx = Math.round(p.x) - cx, qy = Math.round(p.y) - cy; fpen.fillStyle = '#1a0806'; fpen.fillRect(qx - 3, qy - 3, 6, 6); fpen.fillStyle = '#ff6a2b'; fpen.fillRect(qx - 2, qy - 2, 4, 4); fpen.fillStyle = (tick >> 2) % 2 ? '#ffdc9a' : '#ffb347'; fpen.fillRect(qx - 1, qy - 1, 2, 2); glows.push({ x: p.x, y: p.y, r: 9, colour: '#ff6a2b', alpha: 0.3 }); } else if (p.lance) { var dir = p.vx > 0 ? 1 : -1; fpen.fillRect(Math.round(p.x) - (dir > 0 ? 10 : 2) - cx, Math.round(p.y) - 1 - cy, 12, 3); fpen.fillStyle = '#ffffff'; fpen.fillRect(Math.round(p.x) + (dir > 0 ? 1 : -3) - cx, Math.round(p.y) - cy, 2, 1); } else fpen.fillRect(Math.round(p.x) - p.size / 2 - cx, Math.round(p.y) - p.size / 2 - cy, p.size, p.size); light(p.x, p.y, 14, 0.6); }
      for (k = 0; k < zaps.length; k++) { var z = zaps[k]; if (z.beam) { fpen.strokeStyle = z.colour; fpen.globalAlpha = 0.5; fpen.lineWidth = 6; fpen.beginPath(); fpen.moveTo(z.x0 - cx, z.y0 - cy); fpen.lineTo(z.x1 - cx, z.y1 - cy); fpen.stroke(); fpen.globalAlpha = 1; fpen.strokeStyle = '#ffffff'; fpen.lineWidth = 2; fpen.beginPath(); fpen.moveTo(z.x0 - cx, z.y0 - cy); fpen.lineTo(z.x1 - cx, z.y1 - cy); fpen.stroke(); light((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2, 40, 0.7); light(z.x1, z.y1, 24, 0.8); continue; } fpen.strokeStyle = z.colour; fpen.lineWidth = 1; fpen.beginPath(); fpen.moveTo(z.x0 - cx, z.y0 - cy); var mx = (z.x0 + z.x1) / 2 + (random() - 0.5) * 12, my = (z.y0 + z.y1) / 2 + (random() - 0.5) * 12; fpen.lineTo(mx - cx, my - cy); fpen.lineTo(z.x1 - cx, z.y1 - cy); fpen.stroke(); light(mx, my, 20, 0.7); }
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
      if (afflictions.burn > 0) { afflictions.burn--; if (afflictions.burn % 60 === 30) { hero.invuln = 0; hurtHero(hero.x + 1, 1, 'burn'); hero.invuln = Math.max(hero.invuln, 20); } if (tick % 3 === 0) ember(hero.x + (random() - 0.5) * 8, hero.y - 14); }
      if (afflictions.poison > 0) { afflictions.poison--; if (afflictions.poison % 120 === 60) { hero.invuln = 0; hurtHero(hero.x + 1, 1, 'poison'); hero.invuln = Math.max(hero.invuln, 20); } if (tick % 5 === 0) particles.push({ x: hero.x + (random() - 0.5) * 8, y: hero.y - 16, vx: 0, vy: -0.3, life: 20, max: 20, colour: '#9ae66e', size: 1, gravity: 0 }); }
      if (afflictions.chill > 0) afflictions.chill--;
      if (element.hazard === 'ice' && onIce && tick % 6 === 0) particles.push({ x: hero.x + (random() - 0.5) * 8, y: hero.y, vx: -hero.vx * 0.3, vy: -0.4, life: 14, max: 14, colour: '#d8f1ff', size: 1, gravity: 0.02 });
    }

    /* ---- the powers, the relics, and the choosing of them ---- */

    var RL = window.Relics;
    if (!RL) { env.fail('The undercroft’s relics did not load. The other rooms still run.'); return null; }
    var power = 'emberwave', held = [], mods = RL.baseMods(), casts = 0, shieldUp = 0, choice = null, choosing = 0;

    function applyRelics() {
      var wasMax = hero.maxHp, wasEnergy = hero.maxEnergy;
      mods = RL.mods(held); klass.apply(mods);
      hero.maxHp = klass.hp + mods.maxHp; hero.maxEnergy = klass.energy + mods.maxEnergy;
      if (hero.maxHp > wasMax) hero.hp += hero.maxHp - wasMax;
      if (hero.maxEnergy > wasEnergy) hero.energy += hero.maxEnergy - wasEnergy;
      hero.hp = Math.min(hero.hp, hero.maxHp); hero.energy = Math.min(hero.energy, hero.maxEnergy);
    }
    function takeRelic(id) {
      if (held.indexOf(id) < 0) held.push(id);
      applyRelics();
      number(hero.x, hero.y - 34, RL.BY_ID[id].name.toUpperCase(), '#ffdc9a');
      spark(hero.x, hero.y - 14, '#ffdc9a', 30, 2, 36, -0.01);
      sfx('pickup');
    }
    // three relics laid out to choose from; arrows to look, attack or jump to take
    function openChoice(count, boost) {
      var rnd = WD.makeRandom(run.seed * 977 + run.floor * 31 + run.section * 7 + held.length * 3 + tick);
      var offered = RL.offer(held, element.name, RL.POWERS[power].element, rnd, count || 3, run.floor, boost);
      if (!offered.length) return false;
      choice = { relics: offered, index: 0 };
      state = 'relic'; choosing = 0;
      return true;
    }
    function openAltar() {
      choice = { powers: RL.POWER_ORDER.slice(), index: RL.POWER_ORDER.indexOf(power), relics: RL.POWER_ORDER.map(function (id) { var pw = RL.POWERS[id]; return { id: id, name: pw.name, line: pw.line, element: pw.element }; }) };
      state = 'relic'; choosing = 0;
    }
    function stepChoice() {
      choosing++;
      if (choosing < 12) return;
      if (hit('left')) { choice.index = (choice.index + choice.relics.length - 1) % choice.relics.length; sfx('select'); }
      if (hit('right')) { choice.index = (choice.index + 1) % choice.relics.length; sfx('select'); }
      if (hit('attack') || hit('jump') || hit('start') || hit('cast')) {
        if (choice.powers) { power = choice.powers[choice.index]; number(hero.x, hero.y - 34, RL.POWERS[power].name.toUpperCase(), RL.POWERS[power].colour); choice = null; state = 'run'; return; }
        takeRelic(choice.relics[choice.index].id); choice = null; state = 'run';
        if (afterChoice === 'altar') { afterChoice = null; openAltar(); }
      }
    }
    function drawChoice() {
      if (!choice) return;
      fpen.fillStyle = 'rgba(0,0,0,0.72)'; fpen.fillRect(0, 0, W, H);
      text(choice.powers ? 'THE ALTAR: A POWER' : 'A RELIC', W / 2, 26, '#e9e6df', 2, 'center');
      var n = choice.relics.length, cw = n > 3 ? 86 : 104, gap = 8, x0 = Math.round(W / 2 - (n * cw + (n - 1) * gap) / 2), k;
      for (k = 0; k < n; k++) {
        var r = choice.relics[k], x = x0 + k * (cw + gap), y = 54, chosen = k === choice.index;
        fpen.fillStyle = chosen ? '#1c1c27' : '#0e0e16'; fpen.fillRect(x, y, cw, 118);
        var rcol = r.rarity ? rarity(r.rarity).colour : '#ffb347';
        if (r.rarity && rarity(r.rarity).rank >= 2) { fpen.globalAlpha = (chosen ? 0.22 : 0.1) + 0.06 * Math.sin(tick * 0.12 + k); fpen.fillStyle = rcol; fpen.fillRect(x - 2, y - 2, cw + 4, 122); fpen.globalAlpha = 1; fpen.fillStyle = chosen ? '#1c1c27' : '#0e0e16'; fpen.fillRect(x, y, cw, 118); }
        if (r.rarity === 'legendary') { var sh = (tick * 2 + k * 40) % (cw + 60) - 30; fpen.globalAlpha = 0.18; fpen.fillStyle = '#fff3b0'; fpen.fillRect(x + Math.max(0, sh), y + 1, Math.max(0, Math.min(10, cw - sh)), 116); fpen.globalAlpha = 1; }
        fpen.fillStyle = chosen ? rcol : '#3a3936'; fpen.fillRect(x, y, cw, 1); fpen.fillRect(x, y + 117, cw, 1); fpen.fillRect(x, y, 1, 118); fpen.fillRect(x + cw - 1, y, 1, 118);
        var glow = r.rarity ? rarity(r.rarity).colour : r.element ? WD.ELEMENTS.filter(function (el) { return el.name === r.element; })[0].glow : '#e9e6df';
        fpen.fillStyle = glow; fpen.fillRect(x + cw / 2 - 5, y + 10, 10, 10); fpen.fillStyle = '#ffffff'; fpen.fillRect(x + cw / 2 - 2, y + 13, 3, 3);
        text(r.name, x + cw / 2, y + 28, chosen ? '#ffdc9a' : '#e9e6df', 1, 'center');
        // the line, wrapped to the card
        var words = r.line.toUpperCase().split(' '), line = '', ly = y + 44;
        for (var w = 0; w < words.length; w++) {
          var test = line ? line + ' ' + words[w] : words[w];
          if (textWidth(test, 1) > cw - 10) { text(line, x + cw / 2, ly, '#8f8d88', 1, 'center'); line = words[w]; ly += 8; } else line = test;
        }
        if (line) text(line, x + cw / 2, ly, '#8f8d88', 1, 'center');
        if (r.rarity) text(rarity(r.rarity).name, x + cw / 2, y + 104, rcol, 1, 'center'); else if (r.element) text(r.element, x + cw / 2, y + 104, glow, 1, 'center');
      }
      text('LEFT AND RIGHT TO LOOK   Z OR X TO TAKE', W / 2, 186, '#8f8d88', 1, 'center');
    }

    // the cast: each power has its own shape, sound and colour
    function castPower() {
      var spec = RL.POWERS[power], el = spec.element;
      casts++;
      if (power === 'emberwave') {
        var box = { x0: hero.dir > 0 ? hero.x : hero.x - 58, x1: hero.dir > 0 ? hero.x + 58 : hero.x, y0: hero.y - 46, y1: hero.y + 4 };
        strike(box, 3 + mods.damage, 3, 'ember');
        for (var k = 0; k < 40; k++) { var a = (random() - 0.5) * 0.9, v = 2 + random() * 2.5; particles.push({ x: hero.x + hero.dir * 6, y: hero.y - 14, vx: Math.cos(a) * v * hero.dir, vy: Math.sin(a) * v - 0.4, life: 18 + random() * 16, max: 30, colour: random() < 0.5 ? '#ff8c42' : random() < 0.5 ? '#ffb347' : '#ffdc9a', size: random() < 0.4 ? 2 : 1, gravity: -0.02 }); }
        flash = { colour: '#ff8c42', life: 8 };
        shake(3);
      } else if (power === 'frostlance') {
        projectiles.push({ x: hero.x + hero.dir * 8, y: hero.y - 9, vx: hero.dir * 5, vy: 0, life: 60, colour: '#d8f1ff', size: 6, damage: 4 + mods.damage, element: 'frost', gravity: 0, from: 'hero', pierce: true, lance: true });
        spark(hero.x + hero.dir * 8, hero.y - 14, '#9fd8ff', 12, 1.5, 16, 0);
        flash = { colour: '#9fd8ff', life: 6 };
      } else if (power === 'stormchain') {
        var hits = 0, from = { x: hero.x, y: hero.y - 14 }, done = [], k2;
        for (k2 = 0; k2 < 3 + mods.chainMore; k2++) {
          var best = null, bestD = k2 === 0 ? 130 : 80;
          for (var j = 0; j < creatures.length; j++) { var c = creatures[j]; if (c.dying || done.indexOf(c) >= 0) continue; var dx = c.x - from.x, dy = (c.y - c.h / 2) - from.y, d = Math.sqrt(dx * dx + dy * dy); if (d < bestD) { bestD = d; best = c; } }
          if (!best) break;
          zaps.push({ x0: from.x, y0: from.y, x1: best.x, y1: best.y - best.h / 2, colour: '#ffffff', life: 10 });
          wound(best, 3 + mods.damage, from.x, 'storm'); done.push(best); hits++;
          from = { x: best.x, y: best.y - best.h / 2 };
        }
        if (!hits) zaps.push({ x0: hero.x, y0: hero.y - 14, x1: hero.x + hero.dir * 60, y1: hero.y - 20, colour: '#8fa3ff', life: 8 });
        else { hitstop(4); shake(2); }
        flash = { colour: '#8fa3ff', life: 6 };
      } else if (power === 'bloomburst') {
        var any = strike({ x0: hero.x - 44, x1: hero.x + 44, y0: hero.y - 40, y1: hero.y + 6 }, 2 + mods.damage, 3, 'bloom');
        for (var k3 = 0; k3 < 36; k3++) { var a3 = k3 / 36 * Math.PI * 2; particles.push({ x: hero.x, y: hero.y - 12, vx: Math.cos(a3) * 2.4, vy: Math.sin(a3) * 2.4, life: 22, max: 22, colour: k3 % 3 ? '#9ae66e' : '#c5ff9a', size: 2, gravity: 0 }); }
        if (any && hero.hp < hero.maxHp) { hero.hp++; number(hero.x, hero.y - 34, '+1', '#9ae66e'); }
        flash = { colour: '#9ae66e', life: 6 };
      }
    }
    var flash = null;
    function drawFlash() {
      if (!flash) return;
      fpen.fillStyle = flash.colour; fpen.globalAlpha = 0.12 * flash.life / 8; fpen.fillRect(0, 0, W, H); fpen.globalAlpha = 1;
      if (--flash.life <= 0) flash = null;
    }

    /* ---- the weapon in her hand: its swings, what they leave in the air, and what it does at the end ---- */

    var WP = window.Weapons;
    if (!WP) { env.fail('The undercroft’s weapons did not load. The other rooms still run.'); return null; }
    var weaponId = 'shortsword', weapon = WP.WEAPONS.shortsword, swings = WP.MOVESETS.sword;
    var ribbon = [], droplets = [], flock = [], pillars = [], rings = [], spikes = [], lash = null, delayed = [], reaped = 0;

    function equip(id) {
      if (!WP.WEAPONS[id]) return false;
      weaponId = id; weapon = WP.WEAPONS[id]; swings = WP.MOVESETS[weapon.moveset];
      sprites.warden = P.hero.build(classId, id, WP.views(id));
      hero.combo = 0; hero.queued = false; ribbon = [];
      return true;
    }
    function rarityOf(w) { return WP.RARITY[w.rarity]; }

    // where a swing strikes, by its shape
    function swingBox(sw) {
      var r = weapon.reach * sw.reach, d = hero.dir, x = hero.x, y = hero.y;
      function ahead(near, far, up, down) { return { x0: d > 0 ? x + near : x - far, x1: d > 0 ? x + far : x - near, y0: y - up, y1: y - down }; }
      if (sw.shape === 'arc') return ahead(2, 2 + r, 28, 2);
      if (sw.shape === 'rise') return ahead(2, 2 + r, 38, 4);
      if (sw.shape === 'thrust') return ahead(4, 4 + r, 21, 7);
      if (sw.shape === 'slam') return ahead(-2, 6 + r, 42, -2);
      if (sw.shape === 'wide') return { x0: x - (d > 0 ? r * 0.7 : r), x1: x + (d > 0 ? r : r * 0.7), y0: y - 32, y1: y - 2 };
      if (sw.shape === 'lash') return ahead(6, r, 23, 7);
      return null;
    }

    // what a swing leaves in the air
    function swingFx(sw, n) {
      var r = weapon.reach * sw.reach, c = weapon.trail, d = hero.dir, legendary = weapon.rarity === 'legendary';
      if (sw.shape === 'arc' || sw.shape === 'rise' || sw.shape === 'wide') {
        crescents.push({ x: hero.x + d * 4, y: hero.y - (sw.shape === 'rise' ? 20 : 15), dir: d, r: r * 0.8, colour: c, life: legendary ? 16 : 10, max: legendary ? 16 : 10, big: legendary });
        if (sw.shape === 'wide') crescents.push({ x: hero.x - d * 4, y: hero.y - 15, dir: -d, r: r * 0.6, colour: c, life: 10, max: 10 });
      } else if (sw.shape === 'thrust') {
        for (var k = 0; k < 10; k++) particles.push({ x: hero.x + d * (8 + random() * r), y: hero.y - 14 + (random() - 0.5) * 4, vx: d * (1 + random() * 2), vy: 0, life: 8 + random() * 6, max: 14, colour: k % 3 ? c : '#ffffff', size: 1, gravity: 0 });
      } else if (sw.shape === 'slam') {
        var ix = hero.x + d * (r * 0.7);
        shake(n ? 5 : 3); dust(ix, hero.y, 1, 6); dust(ix, hero.y, -1, 6);
        rings.push({ x: ix, y: hero.y, r: 4, grow: 2.4, life: 14, max: 14, colour: c });
        spark(ix, hero.y - 2, c, 14, 2.2, 18, 0.06);
        sfx('heavy');
      } else if (sw.shape === 'lash') {
        lash = { life: 12, max: 12, reach: r, dir: d, n: n };
      } else if (sw.shape === 'shot') {
        loose(sw.finisher ? 16 : 5);
      }
      if (legendary) for (var m = 0; m < 8; m++) particles.push({ x: hero.x + d * random() * r, y: hero.y - 8 - random() * 22, vx: (random() - 0.5) * 0.6, vy: -0.3 - random() * 0.5, life: 24 + random() * 20, max: 44, colour: random() < 0.5 ? '#ffd24d' : '#fff3b0', size: 1, gravity: -0.004 });
    }

    // the Murmuration's flock: lights that wheel together and fall on what she faces
    function loose(count) {
      sfx('shot');
      for (var k = 0; k < count; k++) flock.push({ x: hero.x + hero.dir * 14, y: hero.y - 16, vx: hero.dir * (2.2 + random() * 1.4), vy: (random() - 0.5) * 2.4, life: 130 + random() * 30, phase: random() * 6.28, damage: weapon.damage[0] + mods.damage > 2 ? 2 : 1, trail: [] });
    }
    function nearestCreature(x, y, range, ahead) {
      var best = null, bd = range;
      for (var j = 0; j < creatures.length; j++) { var c = creatures[j]; if (c.dying) continue; if (ahead && (c.x - hero.x) * ahead < -20) continue; var dx = c.x - x, dy = (c.y - c.h / 2) - y, dd = Math.sqrt(dx * dx + dy * dy); if (dd < bd) { bd = dd; best = c; } }
      return best;
    }

    // what a weapon does at the end of its combo
    function finisher(name) {
      var d = hero.dir, k;
      if (name === 'quake') { for (k = -1; k <= 1; k += 2) projectiles.push({ x: hero.x + d * 20 + k * 6, y: hero.y - 4, vx: k * 3, vy: 0, life: 36, colour: '#c4c1ba', size: 8, damage: 4 + mods.damage, element: null, gravity: 0, from: 'hero', pierce: true, wave: true }); shake(6); }
      else if (name === 'flamewave') { projectiles.push({ x: hero.x + d * 16, y: hero.y - 8, vx: d * 3.4, vy: 0, life: 46, colour: '#ff8c42', size: 12, damage: 4 + mods.damage, element: 'ember', gravity: 0, from: 'hero', pierce: true, flame: true }); sfx('castember'); flash = { colour: '#ff8c42', life: 5 }; }
      else if (name === 'icespikes') { for (k = 0; k < 5; k++) delayed.push({ t: k * 5, x: hero.x + d * (26 + k * 16), y: hero.y, fn: 'spike' }); sfx('castfrost'); }
      else if (name === 'arc') { var from = { x: hero.x + d * 30, y: hero.y - 14 }, done = []; for (k = 0; k < 3; k++) { var best = nearestCreature(from.x, from.y, k ? 80 : 110, 0); if (!best || done.indexOf(best) >= 0) break; zaps.push({ x0: from.x, y0: from.y, x1: best.x, y1: best.y - best.h / 2, colour: '#ffffff', life: 10 }); wound(best, 3 + mods.damage, from.x, 'storm'); done.push(best); from = { x: best.x, y: best.y - best.h / 2 }; } sfx('caststorm'); }
      else if (name === 'whirl') { strike({ x0: hero.x - 42, x1: hero.x + 42, y0: hero.y - 36, y1: hero.y }, 5 + mods.damage, 2, null); crescents.push({ x: hero.x, y: hero.y - 15, dir: d, r: 38, colour: '#ff3b4e', life: 16, max: 16, big: true }, { x: hero.x, y: hero.y - 15, dir: -d, r: 38, colour: '#ff3b4e', life: 16, max: 16, big: true }); flash = { colour: '#ff3b4e', life: 5 }; }
      else if (name === 'drag') { for (k = 0; k < creatures.length; k++) { var c = creatures[k]; if (c.dying || c.boss || c.elder) continue; if ((c.x - hero.x) * d > 0 && Math.abs(c.x - hero.x) < 100 && Math.abs(c.y - hero.y) < 50) { c.vx = -d * 3.4; c.vy = -2; c.status.poison = 250; if (c.attack) { c.attack = null; c.boxes = []; c.cooldown = 50; } } } }
      else if (name === 'sunpillar') {
        var px = hero.x + d * 30;
        pillars.push({ x: px, life: 46, max: 46 });
        delayed.push({ t: 4, x: px, y: hero.y, fn: 'sun' });
        for (k = -1; k <= 1; k += 2) projectiles.push({ x: px, y: hero.y - 5, vx: k * 3.2, vy: 0, life: 44, colour: '#ffd24d', size: 10, damage: 5 + mods.damage, element: null, gravity: 0, from: 'hero', pierce: true, wave: true, gold: true });
        flash = { colour: '#ffd24d', life: 12 }; shake(8); hitstop(6); sfx('boom');
        for (k = 0; k < 70; k++) particles.push({ x: px + (random() - 0.5) * 40, y: hero.y - random() * 120, vx: (random() - 0.5) * 0.8, vy: -0.4 - random() * 1.4, life: 40 + random() * 50, max: 90, colour: random() < 0.4 ? '#ffffff' : random() < 0.6 ? '#fff3b0' : '#ffd24d', size: random() < 0.3 ? 2 : 1, gravity: -0.006 });
      }
      else if (name === 'droplets') { for (k = 0; k < 8; k++) droplets.push({ a: k / 8 * 6.2832, r: 6, life: 150, x: hero.x, y: hero.y - 14, vx: 0, vy: 0, seeking: false }); sfx('pickup'); }
    }
    function runDelayed() {
      for (var k = delayed.length - 1; k >= 0; k--) {
        var q = delayed[k];
        if (--q.t > 0) continue;
        if (q.fn === 'spike') { spikes.push({ x: q.x, y: q.y, life: 34, max: 34 }); strike({ x0: q.x - 8, x1: q.x + 8, y0: q.y - 34, y1: q.y }, 3 + mods.damage, 1, 'frost'); spark(q.x, q.y - 6, '#d8f1ff', 8, 1.8, 16, 0.05); }
        else if (q.fn === 'sun') strike({ x0: q.x - 24, x1: q.x + 24, y0: q.y - 220, y1: q.y + 4 }, 12 + mods.damage, 2, null);
        delayed.splice(k, 1);
      }
    }

    function stepWeapons() {
      var k, b, t;
      runDelayed();
      for (k = pillars.length - 1; k >= 0; k--) if (--pillars[k].life <= 0) pillars.splice(k, 1);
      for (k = rings.length - 1; k >= 0; k--) { rings[k].r += rings[k].grow; if (--rings[k].life <= 0) rings.splice(k, 1); }
      for (k = spikes.length - 1; k >= 0; k--) if (--spikes[k].life <= 0) spikes.splice(k, 1);
      if (lash && --lash.life <= 0) lash = null;
      // the flock: each light keeps with the others, wheels, and turns toward what she faces
      for (k = flock.length - 1; k >= 0; k--) {
        b = flock[k]; t = nearestCreature(b.x, b.y, 170, 0);
        var tx = t ? t.x : b.x + b.vx * 30, ty = t ? t.y - t.h / 2 : b.y + Math.sin(b.phase + tick * 0.1) * 20;
        var dx = tx - b.x, dy = ty - b.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        b.vx += dx / len * 0.22 + Math.cos(b.phase + tick * 0.13) * 0.12; b.vy += dy / len * 0.22 + Math.sin(b.phase + tick * 0.17) * 0.14;
        var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy); if (sp > 3.4) { b.vx *= 3.4 / sp; b.vy *= 3.4 / sp; }
        b.trail.push(b.x, b.y); if (b.trail.length > 10) b.trail.splice(0, 2);
        b.x += b.vx; b.y += b.vy;
        var gone = --b.life <= 0 || tileAt(Math.floor(b.x / TILE), Math.floor(b.y / TILE)) === 1;
        if (t && !gone) { var hb = boxesOf(t); for (var q = 0; q < hb.length; q++) if (b.x > hb[q].x0 && b.x < hb[q].x1 && b.y > hb[q].y0 && b.y < hb[q].y1) { wound(t, b.damage, b.x, null); gone = true; break; } }
        if (gone) { spark(b.x, b.y, '#ffd24d', 3, 1, 10, 0); flock.splice(k, 1); }
      }
      // quicksilver's drops: they orbit her, then each goes looking
      for (k = droplets.length - 1; k >= 0; k--) {
        b = droplets[k]; b.life--;
        if (!b.seeking) { b.a += 0.16; b.r = Math.min(24, b.r + 0.8); b.x = hero.x + Math.cos(b.a) * b.r; b.y = hero.y - 14 + Math.sin(b.a) * b.r * 0.6; if (b.life < 114) { b.seeking = true; b.vx = Math.cos(b.a) * 2; b.vy = Math.sin(b.a) * 2; } }
        else { t = nearestCreature(b.x, b.y, 200, 0); if (t) { var ddx = t.x - b.x, ddy = t.y - t.h / 2 - b.y, l2 = Math.max(1, Math.sqrt(ddx * ddx + ddy * ddy)); b.vx += ddx / l2 * 0.35; b.vy += ddy / l2 * 0.35; } b.vx *= 0.95; b.vy *= 0.95; b.x += b.vx; b.y += b.vy;
          if (t) { var tb = boxesOf(t); for (var w = 0; w < tb.length; w++) if (b.x > tb[w].x0 - 2 && b.x < tb[w].x1 + 2 && b.y > tb[w].y0 - 2 && b.y < tb[w].y1 + 2) { wound(t, 3 + mods.damage, b.x, null); b.life = 0; break; } } }
        if (b.life <= 0) { spark(b.x, b.y, '#f4f8ff', 5, 1.4, 12, 0.04); droplets.splice(k, 1); }
      }
      // a flowing blade leaves a ribbon where its tip has been
      if (weapon.flowing && hero.act && hero.act.kind === 'attack') {
        var a = hero.act, prog = (a.frame + a.clock / 4) / a.spec.seq.length, ang = -2.2 + prog * 3.2, rr = weapon.reach * a.spec.reach;
        ribbon.push(hero.x + hero.dir * (6 + Math.cos(ang) * rr * (a.spec.shape === 'thrust' ? 0.2 : 1) + (a.spec.shape === 'thrust' ? prog * rr : 0)), hero.y - 15 + Math.sin(ang) * rr * (a.spec.shape === 'thrust' ? 0.15 : 0.7));
      }
      if (ribbon.length > 28 || (!(hero.act && hero.act.kind === 'attack') && ribbon.length)) ribbon.splice(0, 2);
      // the daggers' dash cuts through what it passes
      if ((weapon.ability === 'dashslash' || mods.ghost) && hero.act && hero.act.kind === 'dash' && hero.act.ticks % 3 === 1) { if (strike({ x0: hero.x - 12, x1: hero.x + 12, y0: hero.y - 24, y1: hero.y - 2 }, 2 + mods.damage, 0, null)) crescents.push({ x: hero.x, y: hero.y - 14, dir: hero.dir, r: 16, colour: weapon.trail, life: 8, max: 8 }); }
      // the rarer the weapon, the more it gives off
      var rank = rarityOf(weapon).rank;
      if (rank >= 2 && tick % (9 - rank * 2) === 0 && hero.alive) particles.push({ x: hero.x + hero.dir * (6 + random() * 6), y: hero.y - 10 - random() * 14, vx: (random() - 0.5) * 0.3, vy: -0.25 - random() * 0.3, life: 20 + random() * 16, max: 36, colour: rarityOf(weapon).colour, size: 1, gravity: -0.003 });
    }

    function drawWeaponFx() {
      var cx = Math.round(cam.x), cy = Math.round(cam.y), k, b;
      // the sun's pillar: a column of light from the vault to the floor, with rays either side
      for (k = 0; k < pillars.length; k++) {
        b = pillars[k]; var t = b.life / b.max, wdt = 8 + 30 * Math.sin(t * Math.PI), x = Math.round(b.x) - cx;
        var g = fpen.createLinearGradient(x - wdt, 0, x + wdt, 0);
        g.addColorStop(0, 'rgba(255,210,77,0)'); g.addColorStop(0.35, 'rgba(255,210,77,' + (0.55 * t).toFixed(2) + ')'); g.addColorStop(0.5, 'rgba(255,255,255,' + Math.min(1, t * 1.4).toFixed(2) + ')'); g.addColorStop(0.65, 'rgba(255,210,77,' + (0.55 * t).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,210,77,0)');
        fpen.fillStyle = g; fpen.fillRect(x - wdt, 0, wdt * 2, H);
        fpen.globalAlpha = 0.18 * t; fpen.fillStyle = '#fff3b0';
        for (var ray = -3; ray <= 3; ray++) { if (!ray) continue; fpen.beginPath(); fpen.moveTo(x, Math.round(hero.y) - cy); fpen.lineTo(x + ray * 60 - 14, 0); fpen.lineTo(x + ray * 60 + 14, 0); fpen.fill(); }
        fpen.globalAlpha = 1;
        light(b.x, hero.y - 40, 150, 1);
      }
      for (k = 0; k < rings.length; k++) { b = rings[k]; fpen.globalAlpha = b.life / b.max; fpen.strokeStyle = b.colour; fpen.lineWidth = 2; fpen.beginPath(); fpen.ellipse(Math.round(b.x) - cx, Math.round(b.y) - cy, b.r, b.r * 0.3, 0, 0, 6.2832); fpen.stroke(); fpen.globalAlpha = 1; }
      for (k = 0; k < spikes.length; k++) { b = spikes[k]; var up = Math.sin(Math.min(1, (b.max - b.life) / 6) * Math.PI / 2) * (b.life < 8 ? b.life / 8 : 1), hh = Math.round(30 * up), sx = Math.round(b.x) - cx, sy = Math.round(b.y) - cy; fpen.fillStyle = '#9fd8ff'; fpen.beginPath(); fpen.moveTo(sx - 6, sy); fpen.lineTo(sx, sy - hh); fpen.lineTo(sx + 6, sy); fpen.fill(); fpen.fillStyle = '#e6f6ff'; fpen.beginPath(); fpen.moveTo(sx - 2, sy); fpen.lineTo(sx, sy - hh); fpen.lineTo(sx + 1, sy); fpen.fill(); light(b.x, b.y - 12, 22, 0.6); }
      // the whip: a living curve from the hand, cracking at its end
      if (lash) { var p = 1 - lash.life / lash.max, ext = Math.sin(Math.min(1, p * 1.6) * Math.PI / 2) * lash.reach, hx = Math.round(hero.x) + lash.dir * 8 - cx, hy = Math.round(hero.y) - 16 - cy; fpen.strokeStyle = '#4e9a52'; fpen.lineWidth = 2; fpen.beginPath(); fpen.moveTo(hx, hy); for (var s2 = 1; s2 <= 12; s2++) { var f = s2 / 12; fpen.lineTo(hx + lash.dir * ext * f, hy + Math.sin(f * 7 - p * 12) * 6 * (1 - f) * (1 - p) - f * 4 + f * f * 8); } fpen.stroke(); fpen.fillStyle = '#c5ff9a'; fpen.fillRect(hx + lash.dir * ext - 1, hy + 3, 3, 3); if (lash.life === lash.max - 5) spark(hero.x + lash.dir * (8 + ext), hero.y - 12, '#c5ff9a', 8, 1.8, 12, 0); }
      // the flowing blade's ribbon, chrome with a blue edge
      if (ribbon.length >= 4) { for (var pass = 0; pass < 2; pass++) { fpen.strokeStyle = pass ? '#f4f8ff' : '#3d5bff'; fpen.lineWidth = pass ? 2 : 4; fpen.globalAlpha = pass ? 1 : 0.5; fpen.beginPath(); fpen.moveTo(ribbon[0] - cx, ribbon[1] - cy); for (k = 2; k < ribbon.length; k += 2) fpen.lineTo(ribbon[k] - cx, ribbon[k + 1] - cy); fpen.stroke(); } fpen.globalAlpha = 1; }
      for (k = 0; k < droplets.length; k++) { b = droplets[k]; fpen.fillStyle = '#aab4c8'; fpen.beginPath(); fpen.arc(Math.round(b.x) - cx, Math.round(b.y) - cy, 3, 0, 6.2832); fpen.fill(); fpen.fillStyle = '#ffffff'; fpen.fillRect(Math.round(b.x) - 1 - cx, Math.round(b.y) - 2 - cy, 1, 1); light(b.x, b.y, 12, 0.5); }
      for (k = 0; k < flock.length; k++) { b = flock[k]; fpen.strokeStyle = 'rgba(255,210,77,0.5)'; fpen.lineWidth = 1; fpen.beginPath(); for (var q = 0; q < b.trail.length; q += 2) { if (q) fpen.lineTo(b.trail[q] - cx, b.trail[q + 1] - cy); else fpen.moveTo(b.trail[q] - cx, b.trail[q + 1] - cy); } fpen.stroke(); fpen.fillStyle = '#fff3b0'; fpen.fillRect(Math.round(b.x) - 1 - cx, Math.round(b.y) - 1 - cy, 2, 2); light(b.x, b.y, 10, 0.5); }
    }

    /* ---- things found: chests, what falls out of them, rarity's glow, and the ceremony of a legendary ---- */

    var pickups = [], chests = [], glows = [], flakes = [], ceremony = null, bell = null, banner = null, hitCount = 0, slowmo = false, prompt = null, pounding = false;
    function rarity(name) { return WP.RARITY[name] || WP.RARITY.common; }
    function glow(x, y, r, colour, alpha) { glows.push({ x: x, y: y, r: r, colour: colour, alpha: alpha }); }

    // what a chest or an elder gives: a weapon or an item she does not have, rarer with depth
    function rollLoot(rnd, boost) {
      if (rnd() < 0.45) return { kind: 'weapon', id: WP.roll(rnd, run.floor, boost, weaponId) };
      var offered = RL.offer(held.concat(pickups.filter(function (p) { return p.kind === 'relic'; }).map(function (p) { return p.id; })), element.name, RL.POWERS[power].element, rnd, 1, run.floor, boost);
      return offered.length ? { kind: 'relic', id: offered[0].id } : { kind: 'weapon', id: WP.roll(rnd, run.floor, boost, weaponId) };
    }
    function lootRarity(loot) { return loot.kind === 'weapon' ? WP.WEAPONS[loot.id].rarity : loot.kind === 'relic' ? RL.BY_ID[loot.id].rarity : 'common'; }
    function lootName(loot) { return loot.kind === 'weapon' ? WP.WEAPONS[loot.id].name : loot.kind === 'relic' ? RL.BY_ID[loot.id].name : 'Heart'; }
    function lootLine(loot) { return loot.kind === 'weapon' ? WP.WEAPONS[loot.id].line : loot.kind === 'relic' ? RL.BY_ID[loot.id].line : ''; }
    function dropPickup(loot, x, y) { pickups.push({ kind: loot.kind, id: loot.id, x: x, y: y, vx: (random() - 0.5) * 1.4, vy: -2.6, rarity: lootRarity(loot), age: 0, ground: false }); }
    function placeChests() {
      pickups = []; flakes = [];
      var rnd = WD.makeRandom(run.seed * 131 + run.floor * 17 + run.section * 5 + 3);
      chests = (level.chests || []).map(function (c) { var loot = rollLoot(rnd, false); return { x: c.x * TILE + 8, y: c.y * TILE, open: 0, loot: loot, rarity: lootRarity(loot) }; });
      (level.relics || []).forEach(function (c) { var loot = rollLoot(rnd, true); chests.push({ x: c.x * TILE + 8, y: c.y * TILE, open: 0, loot: loot, rarity: lootRarity(loot) }); });
    }
    function openChest(c) {
      if (c.open) return;
      c.open = 1; sfx('chest'); shake(2);
      var col = rarity(c.rarity).colour;
      spark(c.x, c.y - 8, col, 24, 2.2, 30, -0.01); spark(c.x, c.y - 8, '#ffffff', 8, 1.4, 16, 0);
      dropPickup(c.loot, c.x, c.y - 10);
    }

    // taking a thing: a weapon changes hands (the old one falls), an item joins the others; the rarer, the more is made of it
    function takePickup(p) {
      var r = rarity(p.rarity), loot = { kind: p.kind, id: p.id };
      if (p.kind === 'weapon') { if (weaponId !== 'shortsword') dropPickup({ kind: 'weapon', id: weaponId }, hero.x - hero.dir * 10, hero.y - 8); equip(p.id); sfx('pickup'); }
      else if (p.kind === 'relic') takeRelic(p.id);
      if (r.rank >= 4) { ceremony = { t: 0, loot: loot, colour: r.colour }; state = 'ceremony'; sfx('legend'); }
      else if (r.rank >= 2) { banner = { t: 0, text: lootName(loot), sub: r.name, colour: r.colour }; flash = { colour: r.colour, life: 8 }; spark(hero.x, hero.y - 14, r.colour, 40, 2.4, 36, -0.01); }
    }

    function stepItems() {
      var k, p;
      prompt = null;
      for (k = pickups.length - 1; k >= 0; k--) {
        p = pickups[k]; p.age++;
        if (!p.ground) { p.vy = Math.min(4, p.vy + 0.2); p.x += p.vx; p.y += p.vy; if (p.vy > 0 && tileAt(Math.floor(p.x / TILE), Math.floor((p.y + 2) / TILE)) === 1 || tileAt(Math.floor(p.x / TILE), Math.floor((p.y + 2) / TILE)) === 2 && p.vy > 0) { p.y = Math.floor((p.y + 2) / TILE) * TILE - 1; p.ground = true; p.vx = 0; } if (p.y > level.rows * TILE) { pickups.splice(k, 1); continue; } }
        var dx = hero.x - p.x, dy = (hero.y - 10) - p.y, d = Math.sqrt(dx * dx + dy * dy);
        if (p.kind === 'heart') {
          if (mods.magnet && d < 90 || d < 40) { p.x += dx / Math.max(1, d) * 2.4; p.y += dy / Math.max(1, d) * 2.4; p.ground = false; p.vy = 0; }
          if (d < 10 && hero.alive && p.age > 10) { if (hero.hp < hero.maxHp) { hero.hp++; number(hero.x, hero.y - 32, '+1', '#ff4f7b'); } sfx('pickup'); pickups.splice(k, 1); }
          continue;
        }
        if (mods.magnet && d < 90 && d > 14 && p.ground) p.x += dx / d * 1.2;
        if (d < 16 && hero.alive && p.age > 20 && !prompt) prompt = p;
      }
      if (prompt && hit('up')) { takePickup(prompt); pickups.splice(pickups.indexOf(prompt), 1); prompt = null; }
      for (k = 0; k < chests.length; k++) if (chests[k].open && chests[k].open < 20) chests[k].open++;
      for (k = flakes.length - 1; k >= 0; k--) if (--flakes[k].life <= 0) flakes.splice(k, 1);
      if (banner && ++banner.t > 110) banner = null;
      if (bell && --bell.life <= 0) bell = null;
      slowmo = mods.sandglass && hero.alive && hero.hp <= 2;
    }
    function stepCeremony() { ceremony.t++; if (ceremony.t > 170 || ceremony.t > 60 && (hit('attack') || hit('jump') || hit('start'))) { ceremony = null; state = 'run'; } }

    // Chladni's bell: every fifth hit rings, and the plate's still lines cut across the room
    function countHit() {
      hitCount++;
      if (mods.bell && hitCount % 5 === 0) {
        bell = { life: 50, max: 50, m: 2 + Math.floor(random() * 4), n: 1 + Math.floor(random() * 3) };
        if (bell.m === bell.n) bell.m++;
        sfx('bell'); shake(3); flash = { colour: '#ffb347', life: 6 };
        for (var k = 0; k < creatures.length; k++) { var c = creatures[k]; if (!c.dying && c.x > cam.x - 20 && c.x < cam.x + W + 20) { AC.hurt(c, 3, hero.x, ctx); if (c.boss) c.hp -= 0; number(c.x, c.y - c.h - 8, 3, '#ffb347'); } }
      }
    }
    // Reiter's snowflake: a six-fold flake where the dash began, and frost on what is near
    function leaveFlake(x, y) {
      flakes.push({ x: x, y: y - 12, life: 90, max: 90, seed: random() * 10 }); sfx('freeze');
      for (var k = 0; k < creatures.length; k++) { var c = creatures[k]; if (!c.dying && Math.abs(c.x - x) < 46 && Math.abs(c.y - y) < 46) c.status.freeze = Math.max(c.status.freeze || 0, c.boss ? 30 : Math.round(120 * mods.freezeTime)); }
    }

    function drawChestsAndPickups() {
      var cx = Math.round(cam.x), cy = Math.round(cam.y), k;
      for (k = 0; k < chests.length; k++) {
        var c = chests[k], x = Math.round(c.x) - cx, y = Math.round(c.y) - cy, col = rarity(c.rarity).colour, lid = Math.min(6, Math.floor(c.open / 2));
        if (x < -20 || x > W + 20) continue;
        fpen.fillStyle = '#0b0b12'; fpen.fillRect(x - 8, y - 10, 16, 10);
        fpen.fillStyle = '#5a4036'; fpen.fillRect(x - 7, y - 9, 14, 8);
        fpen.fillStyle = '#3b2a24'; fpen.fillRect(x - 7, y - 4, 14, 1);
        fpen.fillStyle = col; fpen.fillRect(x - 7, y - 9, 1, 8); fpen.fillRect(x + 6, y - 9, 1, 8); fpen.fillRect(x - 1, y - 6, 2, 3);
        // the lid, lifting when it is struck
        fpen.fillStyle = '#0b0b12'; fpen.fillRect(x - 8, y - 14 - lid, 16, 5);
        fpen.fillStyle = '#6b4f3a'; fpen.fillRect(x - 7, y - 13 - lid, 14, 3);
        fpen.fillStyle = col; fpen.fillRect(x - 7, y - 13 - lid, 14, 1);
        if (!c.open) { light(c.x, c.y - 8, 22 + rarity(c.rarity).rank * 5, 0.6); glow(c.x, c.y - 8, 14 + rarity(c.rarity).rank * 4, col, 0.25 + 0.1 * Math.sin(tick * 0.1)); }
        else if (c.open < 20) { fpen.fillStyle = '#fff3b0'; fpen.globalAlpha = 1 - c.open / 20; fpen.fillRect(x - 6, y - 10 - lid, 12, lid + 1); fpen.globalAlpha = 1; }
      }
      for (k = 0; k < pickups.length; k++) {
        var p = pickups[k], r = rarity(p.rarity), px = Math.round(p.x) - cx, py = Math.round(p.y) - cy - 8 + Math.round(Math.sin(p.age * 0.08) * 2);
        if (px < -30 || px > W + 30) continue;
        if (p.kind === 'heart') { fpen.fillStyle = '#ff4f7b'; fpen.fillRect(px - 3, py + 2, 7, 3); fpen.fillRect(px - 2, py + 5, 5, 1); fpen.fillRect(px - 1, py + 6, 3, 1); fpen.fillRect(px, py + 7, 1, 1); fpen.fillStyle = '#0b0b12'; fpen.fillRect(px, py + 2, 1, 1); light(p.x, p.y - 6, 14, 0.5); glow(p.x, p.y - 4, 10, '#ff4f7b', 0.25); continue; }
        // the aura: a pool of colour on the floor, a column above it for the rarer, motes in orbit for the legendary
        var pulse = 0.5 + 0.5 * Math.sin(p.age * 0.09);
        glow(p.x, p.y - 8, 16 + r.rank * 5 + pulse * 4, r.colour, 0.28 + r.rank * 0.05);
        light(p.x, p.y - 8, 24 + r.rank * 8, 0.75);
        if (r.rank >= 2) { var g = fpen.createLinearGradient(0, py - 60, 0, py + 8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, r.glow); fpen.fillStyle = g; fpen.globalAlpha = 0.5 + 0.3 * pulse; fpen.fillRect(px - 4 - r.rank, py - 60, 8 + r.rank * 2, 68); fpen.globalAlpha = 1; }
        if (r.rank >= 3 && p.age % 5 === 0) particles.push({ x: p.x + (random() - 0.5) * 12, y: p.y - 2, vx: 0, vy: -0.5 - random() * 0.5, life: 30, max: 30, colour: r.colour, size: 1, gravity: -0.004 });
        if (r.rank >= 4) for (var m = 0; m < 5; m++) { var a = p.age * 0.06 + m * 1.2566; fpen.fillStyle = m % 2 ? '#fff3b0' : '#ffd24d'; fpen.fillRect(px + Math.round(Math.cos(a) * 12), py + Math.round(Math.sin(a) * 5) - 2, 1 + (Math.sin(a) > 0 ? 1 : 0), 1 + (Math.sin(a) > 0 ? 1 : 0)); }
        drawLootIcon(p, px, py, 1);
      }
      for (k = 0; k < flakes.length; k++) drawFlake(flakes[k], cx, cy);
      if (prompt) { var pr = rarity(prompt.rarity); text('UP: ' + lootName(prompt), Math.round(prompt.x) - cx, Math.round(prompt.y) - cy - 34, pr.colour, 1, 'center'); text(pr.name, Math.round(prompt.x) - cx, Math.round(prompt.y) - cy - 27, '#8f8d88', 1, 'center'); }
    }
    function drawLootIcon(loot, px, py, scale) {
      if (loot.kind === 'weapon') { var v = WP.views(loot.id).up.img; fpen.drawImage(v, px - Math.round(v.width * scale / 2), py - Math.round(v.height * scale / 2), v.width * scale, v.height * scale); }
      else { var col = rarity(lootRarity(loot)).colour, s = scale; fpen.fillStyle = '#0b0b12'; fpen.fillRect(px - 4 * s, py - 5 * s, 9 * s, 10 * s); fpen.fillStyle = col; fpen.fillRect(px - 3 * s, py - 2 * s, 7 * s, 4 * s); fpen.fillRect(px - 2 * s, py - 4 * s, 5 * s, 8 * s); fpen.fillStyle = '#ffffff'; fpen.fillRect(px - 1 * s, py - 3 * s, 2 * s, 2 * s); }
    }
    function drawFlake(f, cx, cy) {
      var grow = Math.min(1, (f.max - f.life) / 16), fade = Math.min(1, f.life / 20), x = Math.round(f.x) - cx, y = Math.round(f.y) - cy, arm = 20 * grow;
      fpen.globalAlpha = fade; fpen.strokeStyle = '#e6f6ff'; fpen.lineWidth = 1;
      for (var k = 0; k < 6; k++) {
        var a = k * Math.PI / 3 + f.seed, c = Math.cos(a), s = Math.sin(a);
        fpen.beginPath(); fpen.moveTo(x, y); fpen.lineTo(x + c * arm, y + s * arm);
        for (var b = 1; b <= 3; b++) { var bx = x + c * arm * b / 4, by = y + s * arm * b / 4, bl = arm * 0.3 * (1 - b / 5); fpen.moveTo(bx, by); fpen.lineTo(bx + Math.cos(a + 1.05) * bl, by + Math.sin(a + 1.05) * bl); fpen.moveTo(bx, by); fpen.lineTo(bx + Math.cos(a - 1.05) * bl, by + Math.sin(a - 1.05) * bl); }
        fpen.stroke();
      }
      fpen.globalAlpha = 1; light(f.x, f.y, 30, 0.6 * fade); glow(f.x, f.y, 24, '#9fd8ff', 0.2 * fade);
    }

    // coloured light, laid over the dark: what makes an aura an aura
    function drawGlows() {
      for (var hg = 0; hg < stepLit.glows.length; hg++) glows.push(stepLit.glows[hg]);
      var cx = Math.round(cam.x), cy = Math.round(cam.y);
      fpen.globalCompositeOperation = 'lighter';
      for (var k = 0; k < glows.length; k++) {
        var g = glows[k], x = Math.round(g.x) - cx, y = Math.round(g.y) - cy, grad = fpen.createRadialGradient(x, y, 0, x, y, g.r);
        grad.addColorStop(0, g.colour); grad.addColorStop(1, 'rgba(0,0,0,0)');
        fpen.globalAlpha = g.alpha; fpen.fillStyle = grad; fpen.fillRect(x - g.r, y - g.r, g.r * 2, g.r * 2);
      }
      fpen.globalAlpha = 1; fpen.globalCompositeOperation = 'source-over';
      glows.length = 0;
      // the bell's still lines: where the plate does not move, drawn across the room
      if (bell) {
        var t = bell.life / bell.max; fpen.fillStyle = '#ffdc9a'; fpen.globalAlpha = 0.8 * t;
        for (var py = 0; py < H; py += 3) for (var px = 0; px < W; px += 3) { var u = px / W * Math.PI, v = py / H * Math.PI, f = Math.cos(bell.m * u) * Math.cos(bell.n * v) - Math.cos(bell.n * u) * Math.cos(bell.m * v); if (Math.abs(f) < 0.06) fpen.fillRect(px, py, 2, 2); }
        fpen.globalAlpha = 1;
      }
      if (slowmo) { var vg = fpen.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); vg.addColorStop(0, 'rgba(255,210,77,0)'); vg.addColorStop(1, 'rgba(255,190,90,0.22)'); fpen.fillStyle = vg; fpen.fillRect(0, 0, W, H); if (tick % 2 === 0) particles.push({ x: cam.x + random() * W, y: cam.y, vx: 0, vy: 1.2 + random(), life: 60, max: 60, colour: '#ffd24d', size: 1, gravity: 0.01 }); }
    }

    function drawBanner() {
      if (!banner) return;
      var a = banner.t < 10 ? banner.t / 10 : banner.t > 90 ? (110 - banner.t) / 20 : 1;
      fpen.globalAlpha = a; fpen.fillStyle = 'rgba(0,0,0,0.55)'; fpen.fillRect(0, 50, W, 30);
      fpen.fillStyle = banner.colour; fpen.fillRect(0, 50, W, 1); fpen.fillRect(0, 79, W, 1);
      text(banner.sub, W / 2, 54, banner.colour, 1, 'center'); text(banner.text, W / 2, 63, '#ffffff', 2, 'center');
      fpen.globalAlpha = 1;
    }
    // a legendary found: the game holds its breath, a pillar of gold, rays turning, motes spiralling in, the name written large
    function drawCeremony() {
      if (!ceremony) return;
      var t = ceremony.t, a = Math.min(1, t / 20), x = Math.round(hero.x - cam.x), y = Math.round(hero.y - cam.y) - 40, k;
      fpen.fillStyle = 'rgba(0,0,0,' + (0.7 * a).toFixed(2) + ')'; fpen.fillRect(0, 0, W, H);
      var g = fpen.createLinearGradient(x - 30, 0, x + 30, 0); g.addColorStop(0, 'rgba(255,210,77,0)'); g.addColorStop(0.5, 'rgba(255,243,176,' + (0.55 * a).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,210,77,0)');
      fpen.fillStyle = g; fpen.fillRect(x - 30, 0, 60, H);
      fpen.save(); fpen.translate(x, y); fpen.globalAlpha = 0.22 * a; fpen.fillStyle = '#ffd24d';
      for (k = 0; k < 10; k++) { var ang = k * Math.PI / 5 + t * 0.012; fpen.beginPath(); fpen.moveTo(0, 0); fpen.lineTo(Math.cos(ang - 0.09) * 150, Math.sin(ang - 0.09) * 150); fpen.lineTo(Math.cos(ang + 0.09) * 150, Math.sin(ang + 0.09) * 150); fpen.fill(); }
      fpen.restore(); fpen.globalAlpha = 1;
      for (k = 0; k < 36; k++) { var ph = k * 0.61 + t * 0.05, rad = Math.max(6, 110 - ((t * 1.6 + k * 9) % 110)); fpen.fillStyle = k % 3 ? '#ffd24d' : '#ffffff'; fpen.fillRect(x + Math.round(Math.cos(ph) * rad), y + Math.round(Math.sin(ph) * rad * 0.6), 1 + (k % 4 === 0 ? 1 : 0), 1 + (k % 4 === 0 ? 1 : 0)); }
      drawLootIcon(ceremony.loot, x, y + Math.round(Math.sin(t * 0.06) * 2), 2);
      if (t > 24) { text('LEGENDARY', W / 2, 26, '#ffd24d', 1, 'center'); text(lootName(ceremony.loot), W / 2, 36, '#fff3b0', 3, 'center'); }
      if (t > 44) { var words = lootLine(ceremony.loot).toUpperCase().split(' '), line = '', ly = H - 50; for (k = 0; k < words.length; k++) { var test = line ? line + ' ' + words[k] : words[k]; if (textWidth(test, 1) > W - 80) { text(line, W / 2, ly, '#e9e6df', 1, 'center'); line = words[k]; ly += 9; } else line = test; } if (line) text(line, W / 2, ly, '#e9e6df', 1, 'center'); }
      if (t > 60 && (tick >> 4) % 2 === 0) text('PRESS TO GO ON', W / 2, H - 16, '#8f8d88', 1, 'center');
    }
    // Standish's almanac: the whole floor, small, at the top of your sight
    function drawMap() {
      if (!mods.map || state !== 'run') return;
      var mw = Math.min(180, level.cols), scale = mw / level.cols, x0 = Math.round(W / 2 - mw / 2), y0 = 22, x, y;
      fpen.fillStyle = 'rgba(0,0,0,0.5)'; fpen.fillRect(x0 - 1, y0 - 1, mw + 2, level.rows + 2);
      fpen.fillStyle = '#5c5a56';
      for (x = 0; x < mw; x++) { var tx = Math.floor(x / scale); for (y = 1; y < level.rows; y++) { var tt = tileAt(tx, y); if (tt === 1 || tt === 2) fpen.fillRect(x0 + x, y0 + y, 1, 1); } }
      fpen.fillStyle = '#ffb347'; fpen.fillRect(x0 + Math.round(hero.x / TILE * scale), y0 + Math.round(hero.y / TILE) - 2, 1, 2);
      fpen.fillStyle = '#e9e6df'; fpen.fillRect(x0 + Math.round(level.door.x / TILE * scale), y0 + Math.round(level.door.y / TILE) - 2, 1, 2);
      for (var k = 0; k < chests.length; k++) if (!chests[k].open) { fpen.fillStyle = rarity(chests[k].rarity).colour; fpen.fillRect(x0 + Math.round(chests[k].x / TILE * scale), y0 + Math.round(chests[k].y / TILE) - 1, 1, 1); }
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
        fpen.drawImage(img, Math.round(p.x) - P.warden.anchor.x - cx, Math.round(p.y) - P.warden.anchor.y - cy);
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
    var lights = [], blackout = false;
    // when the lights are put out only what is kept still shines: her lantern, and what a guardian allows
    function light(x, y, radius, strength, keep) { if (blackout && !keep) return; lights.push({ x: x, y: y, r: radius, s: strength || 1 }); }
    function drawDark(flicker) {
      for (var hk = 0; hk < stepLit.lights.length; hk++) lights.push(stepLit.lights[hk]);
      dpen.globalCompositeOperation = 'source-over';
      dpen.fillStyle = blackout ? 'rgba(0,0,4,0.95)' : level.boss ? 'rgba(2,2,8,0.5)' : 'rgba(2,2,8,0.74)';   // a guardian's hall is lit by the guardian
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
          // a slick hall: a skin of ice over the floor, with the light sliding on it
          if (level.slick && level.arena && ty === level.arena.row && tileAt(tx, ty - 1) !== 1) { fpen.fillStyle = '#9fd8ff'; fpen.fillRect(px, py, TILE, 2); fpen.fillStyle = '#d8f1ff'; fpen.fillRect(px, py, TILE, 1); fpen.fillStyle = '#ffffff'; var gl = ((tx * 5 + (tick >> 3)) % 16 + 16) % 16; fpen.fillRect(px + gl, py, 3, 1); fpen.fillStyle = 'rgba(159,216,255,0.25)'; fpen.fillRect(px, py + 2, TILE, 3); }
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

    // lamps on the walls, the fountain, and the door down
    function drawFurniture() {
      var cx = Math.round(cam.x), cy = Math.round(cam.y), k;
      if (level.fountain) {
        var fx = Math.round(level.fountain.x) - cx, fy = Math.round(level.fountain.y) - cy, full = !level.fountain.used;
        fpen.fillStyle = element.stone[3]; fpen.fillRect(fx - 11, fy - 6, 22, 6);
        fpen.fillStyle = element.stone[2]; fpen.fillRect(fx - 12, fy - 8, 24, 2); fpen.fillRect(fx - 2, fy - 16, 4, 8);
        fpen.fillStyle = full ? '#ffdc9a' : element.stone[1]; fpen.fillRect(fx - 10, fy - 7, 20, 1);
        if (full) { fpen.fillStyle = '#ffb347'; fpen.fillRect(fx - 1, fy - 19 - ((tick >> 3) % 2), 2, 3); light(level.fountain.x, level.fountain.y - 10, 40, 0.8); glow(level.fountain.x, level.fountain.y - 8, 26, '#ffb347', 0.22); if (tick % 6 === 0) particles.push({ x: level.fountain.x + (random() - 0.5) * 16, y: level.fountain.y - 8, vx: 0, vy: -0.4, life: 26, max: 26, colour: '#ffdc9a', size: 1, gravity: -0.004 }); }
      }
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
      if (level.locked) { fpen.fillStyle = element.stone[2]; for (k = 0; k < 3; k++) fpen.fillRect(dx - 6 + k * 5, dy - 24, 2, 24); } else light(level.door.x, level.door.y - 12, 34, 0.6);
    }

    function drawHero() {
      var frames = sprites.warden[hero.anim] || sprites.warden.idle, k = Math.min(hero.frame, frames.length - 1);
      var img = facing('warden', hero.anim in sprites.warden ? hero.anim : 'idle', k, hero.dir);
      if (hero.invuln > 0 && hero.alive && !(hero.act && hero.act.kind === 'dash') && (tick >> 2) % 2 === 0) fpen.globalAlpha = 0.45;
      if (!hero.alive && hero.deadFor > 70) fpen.globalAlpha = Math.max(0, 1 - (hero.deadFor - 70) / 40);
      var x = Math.round(hero.x) - P.warden.anchor.x - Math.round(cam.x), y = Math.round(hero.y) - P.warden.anchor.y - Math.round(cam.y);
      fpen.drawImage(hero.flash > 0 ? P.silhouette(img, '#ffffff') : img, x, y);
      if (afflictions.chill > 0) { fpen.globalAlpha = 0.45; fpen.drawImage(P.silhouette(img, '#9fd8ff'), x, y); fpen.globalAlpha = 1; }
      fpen.globalAlpha = 1;
      // the lantern's light travels with the hand
      if (hero.alive) light(hero.x - hero.dir * 7, hero.y - 12, Math.round((78 + (hero.act && hero.act.kind === 'cast' ? 40 : 0)) * mods.lantern), 1, true);
    }

    function drawHud() {
      var k;
      for (k = 0; k < hero.maxHp; k++) {
        fpen.fillStyle = k < hero.hp ? '#ff4f7b' : '#3a3936';
        fpen.fillRect(4 + k * 9, 4, 7, 6); fpen.fillRect(5 + k * 9, 10, 5, 1); fpen.fillRect(6 + k * 9, 11, 3, 1); fpen.fillRect(7 + k * 9, 12, 1, 1);
        fpen.fillStyle = '#0b0b12'; fpen.fillRect(4 + k * 9, 4, 1, 1); fpen.fillRect(7 + k * 9, 4, 1, 1); fpen.fillRect(10 + k * 9, 4, 1, 1);
      }
      for (k = 0; k < 3; k++) { var flx = 8 + hero.maxHp * 9 + k * 7; fpen.fillStyle = k < flames ? '#ffb347' : '#3a3936'; fpen.fillRect(flx, 7, 3, 5); fpen.fillRect(flx + 1, 5, 1, 2); if (k < flames) { fpen.fillStyle = '#ffdc9a'; fpen.fillRect(flx + 1, 9, 1, 2); } }
      for (k = 0; k < hero.maxEnergy; k++) { fpen.fillStyle = k < hero.energy ? '#ffb347' : '#3a3936'; fpen.fillRect(4 + k * 6, 16, 4, 4); }
      text(element.title + '  ' + run.floor + '-' + (run.section >= 3 ? 'GUARDIAN' : (run.section + 1)), W - 4, 4, '#8f8d88', 1, 'right');
      text(timeText(Math.floor(clockSeconds)) + '  SEED ' + run.seed, W - 4, 12, '#5c5a56', 1, 'right');
      var pw = RL.POWERS[power];
      fpen.fillStyle = pw.colour; fpen.fillRect(4 + hero.maxEnergy * 6 + 4, 16, 4, 4);
      text(pw.name, 4 + hero.maxEnergy * 6 + 11, 16, pw.colour);
      text(weapon.name, 4, 24, rarityOf(weapon).colour);
      if (mods.shield) { fpen.fillStyle = shieldUp > 0 ? '#3a3936' : '#ffdc9a'; fpen.fillRect(4, 32, 8, 2); }
      for (k = 0; k < held.length; k++) { var rel = RL.BY_ID[held[k]]; var rc = rel && rel.element ? WD.ELEMENTS.filter(function (el) { return el.name === rel.element; })[0].glow : '#c4c1ba'; fpen.fillStyle = rc; fpen.fillRect(W - 8 - k * 6, 14, 4, 4); }
      if (state === 'title') drawTitle();
      else if (state === 'summary') drawSummary();
      else if (state === 'paused') {
        fpen.fillStyle = 'rgba(0,0,0,0.5)'; fpen.fillRect(0, 0, W, H);
        text('PAUSED', W / 2, 100, '#e9e6df', 2, 'center');
      }
    }

    var transition = 0;
    function stepTransition() {
      if (transition === 0) return false;
      transition++;
      if (transition === 24) {
        run.stage++;
        if (run.stage >= STAGES.length) { run.stage = STAGES.length - 1; won = true; endRun(true); return true; }
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
      drawChestsAndPickups();
      drawHazards();
      drawCreatures();
      drawHero();
      drawWeaponFx();
      drawCrescents();
      drawFx();
      drawDark(0.97 + 0.03 * Math.sin(tick * 0.4) + (hero.act && hero.act.kind === 'cast' ? 0.15 : 0));
      drawTelegraphs();
      drawGlows();
      drawBoxes();
      drawFlash();
      drawTransition();
      drawHud();
      drawMap();
      drawBossBar();
      drawBanner();
      drawChoice();
      drawCeremony();
      // into the stage, scaled without smoothing, letterboxed in the dark
      var ratio = canvas.width / size.w;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.fillStyle = '#000';
      pen.fillRect(0, 0, size.w, size.h);
      pen.imageSmoothingEnabled = false;
      pen.drawImage(frame, view.x, view.y, view.w, view.h);
      drawZones();
      cam.x -= sx; cam.y -= sy;
    }

    /* ---- the run: its seed, its clock, its end, and what is kept between runs ---- */

    var SND = window.Sound;
    function sfx(name) { if (SND) SND.play(name); }
    var STORE = 'undercroft';
    var kept = { best: 0, wins: 0, runs: 0, fastest: 0, unlocked: ['emberwave'], sound: false };
    function load() {
      try { var raw = window.localStorage.getItem(STORE); if (raw) { var got = JSON.parse(raw); Object.keys(kept).forEach(function (k) { if (got[k] !== undefined) kept[k] = got[k]; }); } } catch (e) { /* a private window, or no storage: nothing is kept */ }
    }
    function save() { try { window.localStorage.setItem(STORE, JSON.stringify(kept)); } catch (e) { /* not fatal */ } }
    load();
    if (kept.sound && soundButton) soundButton.textContent = 'Let it sound again';

    // today's seed: the same for everyone who comes down today
    function dailySeed() { var d = new Date(); return (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) % 100000; }
    var seedField = env.room.querySelector('[data-undercroft-seed]');
    var seedNote = env.room.querySelector('[data-undercroft-seed-note]');
    function chosenSeed() {
      var typed = seedField ? String(seedField.value).trim() : '';
      if (!typed) return { seed: dailySeed(), daily: true };
      var n = 0;
      if (/^\d+$/.test(typed)) n = parseInt(typed, 10) % 1000000;
      else { for (var k = 0; k < typed.length; k++) n = (n * 31 + typed.charCodeAt(k)) >>> 0; n = n % 1000000; }
      return { seed: n, daily: false };
    }
    function noteSeed() { if (seedNote) seedNote.textContent = chosenSeed().daily ? 'today’s, ' + dailySeed() : 'yours, ' + chosenSeed().seed; }
    if (seedField) { seedField.addEventListener('input', noteSeed); noteSeed(); }

    var clockSeconds = 0, lastHurtBy = '', summary = null, startPower = 0;
    var soundButton = env.room.querySelector('[data-undercroft-sound]');
    function showSound() { if (!soundButton) return; var isOn = SND && SND.isOn(); soundButton.setAttribute('aria-pressed', String(!!isOn)); soundButton.textContent = isOn ? 'Silence it' : 'Let it sound'; }
    if (soundButton) {
      if (!SND || !(window.AudioContext || window.webkitAudioContext)) { soundButton.disabled = true; soundButton.textContent = 'No sound in this browser'; }
      else soundButton.addEventListener('click', function () {
        var isOn = SND.setOn(!SND.isOn());
        kept.sound = isOn; save(); showSound();
        if (isOn && state !== 'title') SND.music(element.name);
        try { env.stage.focus({ preventScroll: true }); } catch (err) { /* not fatal */ }
      });
      showSound();
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden && SND && SND.isOn()) SND.stop(); else if (!document.hidden && SND && SND.isOn() && state === 'run') SND.music(element.name); });
    window.addEventListener('pagehide', function () { if (SND) SND.stop(); });
    var LESSONS = {
      spikes: 'Spikes are not a floor.', lava: 'The kilns are lit.', ice: 'Ice keeps its own counsel.', rail: 'The rails carry more than trains.', spores: 'Do not breathe in the cisterns.', voidpool: 'The vault does not give back.',
      fall: 'The floor is optional. So is the bottom.', imp: 'When the bellows swell, be elsewhere.', lantern: 'Embers fall in arcs. Walk under them.', crab: 'Do not stand by a shut shell.', owl: 'The owl shows you its line first.', hound: 'The hound crouches before it leaps.', jelly: 'Never stand under a jelly whose arms have gone stiff.', puff: 'Pop it while it swells, or stand well back.', watcher: 'The line it draws is the line it burns.', toad: 'The toad\u2019s tongue is longer than you think.', shade: 'When the shade vanishes, turn round.', 
      golem: 'The golem strikes where it looked.', wyrm: 'The wyrm tells you where it will fly.', herald: 'The herald is never where the bolt is.', lightless: 'It was you, and then it was not.', coal: 'Where a coal lands, the floor burns.', icicle: 'What hangs will fall.',
      burn: 'Burning does not stop when the flame does.', poison: 'Poison keeps count.', wave: 'The ground can come at you.', beam: 'The beam bends.', shard: 'Hail falls straight.'
    };
    function endRun(wonRun) {
      var floorsDown = wonRun ? 4 : run.floor;
      kept.runs++;
      var unlocked = [];
      if (floorsDown >= 2 && kept.unlocked.indexOf('frostlance') < 0) { kept.unlocked.push('frostlance'); unlocked.push('Frostlance'); }
      if (floorsDown >= 3 && kept.unlocked.indexOf('stormchain') < 0) { kept.unlocked.push('stormchain'); unlocked.push('Stormchain'); }
      if (floorsDown >= 4 && kept.unlocked.indexOf('bloomburst') < 0) { kept.unlocked.push('bloomburst'); unlocked.push('Bloomburst'); }
      if (floorsDown > kept.best) kept.best = floorsDown;
      if (wonRun) { kept.wins++; if (!kept.fastest || clockSeconds < kept.fastest) kept.fastest = Math.round(clockSeconds); }
      save();
      summary = { won: wonRun, floor: run.floor, section: run.section, kills: kills, seconds: Math.round(clockSeconds), relics: held.slice(), seed: run.seed, lesson: wonRun ? 'Nothing carried back up but what you learned.' : (LESSONS[lastHurtBy] || 'The undercroft draws itself again.'), unlocked: unlocked, ticks: 0 };
      state = 'summary';
    }
    function stepSummary() {
      summary.ticks++;
      if (summary.ticks > 40 && (hit('start') || hit('jump') || hit('attack'))) { summary = null; state = 'title'; noteSeed(); }
    }
    function timeText(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
    function drawSummary() {
      if (!summary) return;
      fpen.fillStyle = 'rgba(0,0,0,0.8)'; fpen.fillRect(0, 0, W, H);
      var y = 34;
      text(summary.won ? 'YOU CAME BACK UP' : summary.floor === 4 ? 'YOU FELL IN THE VAULT' : 'YOU FELL ON FLOOR ' + summary.floor, W / 2, y, summary.won ? '#ffdc9a' : '#ff4f7b', 2, 'center'); y += 22;
      text(summary.lesson, W / 2, y, '#e9e6df', 1, 'center'); y += 18;
      text((summary.won ? 'THREE FLOORS AND THE VAULT' : (summary.floor === 4 ? 'THE VAULT' : 'FLOOR ' + summary.floor) + (summary.section >= 3 ? ', AT THE GUARDIAN' : ', SECTION ' + (summary.section + 1))) + '   ' + summary.kills + ' SLAIN   ' + timeText(summary.seconds), W / 2, y, '#8f8d88', 1, 'center'); y += 12;
      text('SEED ' + summary.seed, W / 2, y, '#8f8d88', 1, 'center'); y += 16;
      if (summary.relics.length) { text('CARRIED: ' + summary.relics.map(function (id) { return RL.BY_ID[id].name; }).join(', ').toUpperCase(), W / 2, y, '#c4c1ba', 1, 'center'); y += 12; }
      if (summary.unlocked.length) { text(summary.unlocked.join(' AND ').toUpperCase() + ' UNLOCKED', W / 2, y, '#ffb347', 1, 'center'); y += 12; }
      text('BEST: FLOOR ' + kept.best + (kept.wins ? '   WON ' + kept.wins + (kept.fastest ? ' (BEST ' + timeText(kept.fastest) + ')' : '') : '') + '   RUNS ' + kept.runs, W / 2, y + 6, '#8f8d88', 1, 'center');
      if (summary.ticks > 40 && (tick >> 4) % 2 === 0) text('PRESS TO GO ON', W / 2, H - 22, '#e9e6df', 1, 'center');
    }
    // the title: the seed, the best, and the starting power to choose among what is unlocked
    function stepTitle() {
      var options = kept.unlocked;
      if (hit('left')) { startPower = (startPower + options.length - 1) % options.length; sfx('select'); }
      if (hit('right')) { startPower = (startPower + 1) % options.length; sfx('select'); }
      power = options[Math.min(startPower, options.length - 1)];
      if (hit('start') || hit('jump') || hit('attack')) { var c = chosenSeed(); run.seed = c.seed; begin(); }
    }
    function drawTitle() {
      fpen.fillStyle = 'rgba(0,0,0,0.6)'; fpen.fillRect(0, 0, W, H);
      text('UNDERCROFT', W / 2, 44, '#e9e6df', 3, 'center');
      text('GO DOWN', W / 2, 74, '#ffb347', 1, 'center');
      var c = chosenSeed();
      text((c.daily ? 'TODAY’S SEED ' : 'SEED ') + c.seed + (kept.best ? '   BEST: FLOOR ' + kept.best : '') + (kept.wins ? '   WON ' + kept.wins : ''), W / 2, 90, '#8f8d88', 1, 'center');
      // the powers unlocked, the chosen one lit
      var options = kept.unlocked, n = options.length, x0 = W / 2 - (n * 70) / 2 + 35, k;
      for (k = 0; k < n; k++) {
        var pw = RL.POWERS[options[k]], chosen = k === Math.min(startPower, n - 1), x = x0 + k * 70;
        fpen.fillStyle = pw.colour; fpen.fillRect(x - 3, 106, 6, 6);
        text(pw.name, x, 116, chosen ? '#ffdc9a' : '#8f8d88', 1, 'center');
        if (chosen) { fpen.fillStyle = '#ffdc9a'; fpen.fillRect(x - 12, 125, 24, 1); }
      }
      if (n > 1) text('LEFT AND RIGHT TO CHOOSE A POWER', W / 2, 134, '#8f8d88', 1, 'center');
      else text('MORE POWERS UNLOCK AS YOU GO DEEPER', W / 2, 134, '#8f8d88', 1, 'center');
      text('ARROWS OR WASD MOVE   X OR K JUMP   Z OR J ATTACK', W / 2, 160, '#8f8d88', 1, 'center');
      text('C OR L DASH   V OR I CAST   ENTER TO BEGIN', W / 2, 170, '#8f8d88', 1, 'center');
    }

    /* ---- the loop and the room's wiring ---- */

    function pickClass(who) { if (CL.CLASSES[who]) { classId = who; klass = CL.CLASSES[who]; } return classId; }
    function begin() {
      state = 'run';
      run.stage = 0; run.floor = 1; run.section = 0; flames = 3; transition = 0; clockSeconds = 0; kills = 0; lastHurtBy = '';
      held = []; casts = 0; shieldUp = 0; choice = null; afterChoice = null; won = false; applyRelics();
      equip(klass.weapon); reaped = 0; hitCount = 0; ceremony = null; banner = null; bell = null; flock = []; droplets = []; pillars = []; rings = []; spikes = []; delayed = []; lash = null;
      loadSection(); placeCreatures(); spawnHero(); stepCamera(true);
      particles.length = 0; afterimages.length = 0; numbers.length = 0;
    }

    function step() {
      poll();
      tick++;
      if (state === 'title') { stepTitle(); return; }
      if (state === 'summary') { stepSummary(); return; }
      if (state === 'relic') { stepChoice(); return; }
      if (state === 'ceremony') { stepCeremony(); return; }
      if (hit('pause')) state = state === 'paused' ? 'run' : 'paused';
      if (state !== 'run') return;
      clockSeconds += STEP;
      if (stepTransition()) { stepFx(); return; }
      if (freeze > 0) { freeze--; return; }
      stepHero();
      stepWeapons();
      stepItems();
      stepAfflictions();
      if (!slowmo || tick % 2 === 0) { stepLit.lights.length = 0; stepLit.glows.length = 0; stepCreatures(); stepHazards(); }
      stepFx();
      stepCamera(false);
    }

    var startButton = env.room.querySelector('[data-undercroft-start]');
    if (startButton) startButton.addEventListener('click', function () {
      try { env.stage.focus({ preventScroll: true }); } catch (err) { /* not fatal */ }
      var c = chosenSeed(); run.seed = c.seed; power = kept.unlocked[Math.min(startPower, kept.unlocked.length - 1)]; begin(); env.redraw();
    });
    var dailyButton = env.room.querySelector('[data-undercroft-daily]');
    if (dailyButton) dailyButton.addEventListener('click', function () { if (seedField) { seedField.value = ''; noteSeed(); } });
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
        var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        if (coarse) touchy = true;
        // below the masthead, which sits over the top of the stage on phones, with the thumbs' room beneath
        if (!wide && touchy && vh - view.h >= 200) view.y = Math.min(view.y, 72);
        layoutZones();
      },
      frame: function (time, dt) {
        var t0 = performance.now();
        accumulator = Math.min(accumulator + Math.min(dt, 0.1), 0.25);
        while (accumulator >= STEP) { step(); accumulator -= STEP; }
        render();
        cost = cost * 0.9 + (performance.now() - t0) * 0.1;
        if (tick % 30 === 0) env.live('cost', cost.toFixed(1));
      },
      // With motion paused: the game pauses and the frame is held
      still: function () { if (state === 'run') state = 'paused'; if (SND) SND.stop(); render(); },
      motion: function (on) { if (!on && state === 'run') state = 'paused'; if (!on && SND) SND.stop(); else if (on && SND && SND.isOn() && state !== 'title') SND.music(element.name); },
      zones: function (force) { if (force) { touchy = true; layoutZones(); } return ZONES.map(function (z) { return { name: z.name, x: z.x, y: z.y, w: z.w, h: z.h }; }); },
      sound: function () { return { on: !!(SND && SND.isOn()), effects: SND ? SND.effects : [] }; },
      state: function () {
        return { state: state, tick: tick, hero: { x: hero.x, y: hero.y, vx: hero.vx, vy: hero.vy, dir: hero.dir, onGround: hero.onGround, anim: hero.anim, frame: hero.frame, hp: hero.hp, energy: hero.energy, act: hero.act ? hero.act.kind : null, combo: hero.combo, alive: hero.alive }, weapon: weaponId, fx: { flock: flock.length, droplets: droplets.length, pillars: pillars.length, spikes: spikes.length, crescents: crescents.length }, creatures: creatures.map(function (e) { return { kind: e.kind, hp: e.hp, x: Math.round(e.x), y: Math.round(e.y), state: e.state, dying: e.dying, elder: e.elder, status: e.status, anim: e.anim, frame: e.frame, attack: e.attack ? e.attack.def.name + ':' + e.attack.phase : null, boxes: e.boxes ? e.boxes.length : 0 }; }), kills: kills, projectiles: projectiles.length, afflictions: afflictions, particles: particles.length, freeze: freeze, cam: { x: cam.x, y: cam.y }, level: { cols: level.cols, rows: level.rows, element: element.name, door: level.door, relics: level.relics.length, lights: level.lights.length }, run: { seed: run.seed, floor: run.floor, section: run.section, seconds: Math.round(clockSeconds) }, transition: transition, locked: !!level.locked, hazards: hazards.length, telegraphs: telegraphs.length, won: won, view: view, cost: cost };
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
      summary: function () { return summary; },
      kept: function (reset) { if (reset) { kept = { best: 0, wins: 0, runs: 0, fastest: 0, unlocked: ['emberwave'], sound: false }; save(); } return kept; },
      lastHurtBy: function () { return lastHurtBy; },
      guardian: function (set) { if (boss && set) for (var gk in set) boss[gk] = set[gk]; return boss ? { kind: boss.kind, hp: boss.hp, maxHp: boss.maxHp, state: boss.state, phase: boss.phase, dying: boss.dying, x: Math.round(boss.x), y: Math.round(boss.y), dir: boss.dir, anim: boss.anim, frame: boss.frame, attack: boss.attack ? boss.attack.def.name + ':' + boss.attack.phase + ':' + boss.attack.t : null, boxes: boss.boxes ? boss.boxes.length : 0, stun: boss.stun, cooldown: boss.cooldown, hurtBoxes: boxesOf(boss).length, targets: boxesOf(boss).map(function (b) { return { x: Math.round((b.x0 + b.x1) / 2), y: Math.round((b.y0 + b.y1) / 2), mult: b.onHit ? 3 : b.mult }; }), balls: boss.vars && boss.vars.balls ? boss.vars.balls.map(function (b) { return { x: Math.round(b.x), y: Math.round(b.y), struck: b.struck }; }) : undefined } : null; },
      stage: function (n) { if (n !== undefined) { run.stage = Math.max(0, Math.min(STAGES.length - 1, n)); transition = 0; loadSection(); placeCreatures(); spawnHero(); stepCamera(true); } return { stage: run.stage, of: STAGES.length, flames: flames, floor: run.floor, section: run.section, element: element.name, fountain: level.fountain || null }; },
      arena: function (floor) { for (var si = 0; si < STAGES.length; si++) if (STAGES[si].boss && STAGES[si].floor === (floor || run.floor)) run.stage = si; transition = 0; loadSection(); placeCreatures(); spawnHero(); stepCamera(true); return run; },
      slay: function () { if (boss) { boss.hp = 0; } },
      command: function (stateName, wait) { if (boss && !boss.dying) return GD.command(boss, stateName, ctx); return null; },
      drop: function (kind, id, dx) { dropPickup({ kind: kind, id: id }, hero.x + (dx === undefined ? 0 : dx), hero.y - 12); return pickups.length; },
      finds: function () { return { chests: chests.map(function (c) { return { x: c.x, y: c.y, open: c.open, rarity: c.rarity, loot: c.loot }; }), pickups: pickups.map(function (q) { return { kind: q.kind, id: q.id, rarity: q.rarity, x: Math.round(q.x), y: Math.round(q.y), ground: q.ground }; }), prompt: prompt ? prompt.id : null, ceremony: ceremony ? ceremony.loot.id : null, banner: banner ? banner.text : null, slowmo: slowmo, bell: !!bell, flakes: flakes.length }; },
      equip: function (id) { return equip(id) ? { id: weaponId, name: weapon.name, rarity: weapon.rarity, swings: swings.length } : null; },
      weapons: function () { return WP.ORDER.slice(); },
      setPower: function (name) { if (RL.POWERS[name]) power = name; return power; },
      relics: function () { return { power: power, held: held.slice(), mods: mods, choice: choice ? { index: choice.index, offered: choice.relics.map(function (r) { return r.id; }) } : null, casts: casts, shieldUp: shieldUp }; },
      take: function (id) { takeRelic(id); return held.slice(); },
      offer: function (n) { return openChoice(n || 3); },
      begin: function (seed, who) { if (seed !== undefined) run.seed = seed; if (who) pickClass(who); begin(); kills = 0; return run; },
      pick: function (who) { return pickClass(who); },
      classes: function () { return CL.ORDER.slice(); },
      hurt: function (damage) { hero.invuln = 0; return hurtHero(hero.x + 10, damage || 1); },
      sprites: function () {
        var out = {};
        Object.keys(sprites.warden).forEach(function (name) { out[name] = sprites.warden[name].map(function (img) { return P.count(img); }); });
        Object.keys(actorSprites).forEach(function (name) { var f = actorSprites[name].frames; out[name] = f.walk.concat(f.windup, f.attack, f.hurt).map(function (img) { return P.count(img); }); });
        return out;
      },
      summon: function (kind, dx, elder) { var e = AC.make(kind, hero.x + (dx === undefined ? 40 : dx), Math.floor(hero.y / TILE) * TILE, !!elder, run.floor, random); e.seen = true; creatures.push(e); return creatures.length; },
      boxes: function (on) { debugBoxes = on !== false; return debugBoxes; },
      // draw every frame of the Warden large on the stage, for looking at the art; sheet(false) puts the game back
      sheet: function (on, scale, only, set) {
        sheetMode = on !== false;
        if (!sheetMode) return;
        var ratio = canvas.width / size.w, S = scale || 5, group = guardianSprites[String(set).split(':')[0]] && guardianSprites[String(set).split(':')[0]].anchor ? (function () { var gs = guardianSprites[String(set).split(':')[0]], ph = +String(set).split(':')[1] || 0; return (gs.byPhase ? gs.byPhase[ph] : gs).frames; })() : set === 'creatures' ? (function () { var g = {}; Object.keys(actorSprites).forEach(function (n) { var f = actorSprites[n].frames; g[n] = f.walk.concat(f.windup, f.attack, f.hurt); }); return g; })() : sprites[set || 'warden'];
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
