/* Undercroft — room 36.

   A rogue-like platformer, and the last room. The building has an undercroft
   and it draws itself again every time you go down: three floors and a vault,
   stitched from a seeded grammar of chunks in five elements; a Warden with a
   weapon, a lantern of three flames and one power, or one of three others
   who move and fight differently; stages of chambers to look around in, a
   portal hidden in each and a still place beyond it; creatures that wind up
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

    /* Two streams of chance. Everything the simulation decides draws on `rng`, which is seeded when a run begins, so
       that two machines given the same seed and the same buttons play the same game. Anything asked for while the
       picture is being drawn comes from `fuzz` instead, which is nobody's business: a machine that draws twice as
       often must not get a different game. The switch is made by render() itself, so drawing code cannot get it wrong. */
    var seed = 36, rng = seed, fuzz = 0x9e3779b9, drawing = false;
    function random() {
      if (drawing) { fuzz = (fuzz * 1664525 + 1013904223) >>> 0; return fuzz / 4294967296; }
      if (rngTrace) rngTrace.push(String((new Error()).stack).split('\n').slice(2, 5).map(function (l) { return l.trim().replace(/^at /, '').replace(/ ?[(]?https?:.*[/]/, ' ').replace(/[)]$/, ''); }).join(' < '));
      rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296;
    }
    var rngTrace = null;   // a harness may ask who drew on the simulation's stream during a step

    var view = { x: 0, y: 0, w: W, h: H, scale: 1 };
    var state = 'title', tick = 0, accumulator = 0, cost = 0, sheetMode = false;

    /* ---- input ----
       The stage takes keyboard focus (it has a tabindex), so that the arrow
       keys steer the Warden and not the rooms. Keys are read as held and as
       just-pressed, once a step. */

    var KEYS = {
      ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
      ArrowUp: 'up', w: 'up', W: 'up', e: 'up', E: 'up', ArrowDown: 'down', s: 'down', S: 'down',
      x: 'jump', X: 'jump', k: 'jump', K: 'jump', ' ': 'jump',
      z: 'attack', Z: 'attack', j: 'attack', J: 'attack',
      c: 'dash', C: 'dash', l: 'dash', L: 'dash', Shift: 'dash',
      v: 'cast', V: 'cast', i: 'cast', I: 'cast', q: 'swap', Q: 'swap',
      Enter: 'start', Escape: 'pause', p: 'pause', P: 'pause'
    };
    var keysDown = {}, queued = {}, touches = {};
    /* Buttons as data. The keyboard and the touch zones fill `keysDown` and `queued` whenever they like; once a step
       they are sampled into two small numbers, what is held and what was pressed since the last step, and the
       simulation reads only those (`pad`). One player's pad comes from here; another's can come down a wire. */
    var BUTTONS = ['left', 'right', 'up', 'down', 'jump', 'attack', 'dash', 'cast', 'swap', 'start', 'pause'], BIT = {};
    BUTTONS.forEach(function (name, k) { BIT[name] = 1 << k; });
    var pad = { held: 0, pressed: 0 };
    function sample() {
      var h = 0, pr = 0, k;
      for (k = 0; k < BUTTONS.length; k++) { if (keysDown[BUTTONS[k]]) h |= 1 << k; if (queued[BUTTONS[k]]) pr |= 1 << k; }
      queued = {};
      return { held: h, pressed: pr };
    }

    function focused() { return document.activeElement === env.stage; }
    document.addEventListener('keydown', function (e) {
      var name = KEYS[e.key];
      if (!name || !focused() || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      if (!keysDown[name]) queued[name] = true;
      keysDown[name] = true;
    });
    document.addEventListener('keyup', function (e) {
      var name = KEYS[e.key];
      if (!name) return;
      keysDown[name] = false;
    });
    window.addEventListener('blur', function () { keysDown = {}; });

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
      ZONES.push({ name: 'swap', x: Math.round(size.w / 2) - 24, y: y0, w: 48, h: 30, label: 'SWAP' });
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
        var z = ZONES[k], isHeld = !!keysDown[z.name];
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
      if (e.pointerType === 'mouse') { if (state === 'title' || state === 'choose') queued.start = true; return; }
      if (!touchy) { touchy = true; layoutZones(); }
      e.preventDefault();
      var p = framePoint(e), name = zoneAt(p.x, p.y);
      if ((state === 'title' || state === 'choose') && !name) { queued.start = true; return; }
      if (state === 'summary' && !name) { queued.start = true; return; }
      if (name) { touches[e.pointerId] = name; if (!keysDown[name]) queued[name] = true; keysDown[name] = true; }
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse' || touches[e.pointerId] === undefined) return;
      var p = framePoint(e), name = zoneAt(p.x, p.y), was = touches[e.pointerId];
      if (name === was) return;
      if (was) keysDown[was] = false;
      touches[e.pointerId] = name;
      if (name) { if (!keysDown[name]) queued[name] = true; keysDown[name] = true; }
    });
    function lift(e) {
      var was = touches[e.pointerId];
      if (was) keysDown[was] = false;
      delete touches[e.pointerId];
    }
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
    canvas.style.touchAction = 'none';

    // once a step: what was pressed since the last one
    function poll() {
      pad = sample(); if (cur) cur.pad = pad;
    }
    function down(name) { return (pad.held & BIT[name]) !== 0; }
    function hit(name) { return (pad.pressed & BIT[name]) !== 0; }

    /* ---- the world ----
       Floors come from world.js: a grid of tiles (0 air, 1 stone, 2 a ledge
       you can jump up through, 3 spikes, 4 the element's hazard) with a
       spawn, a door, and places for enemies, relics and lamps. */

    var WD = window.World;
    if (!WD) { env.fail('The undercroft’s floors did not load. The other rooms still run.'); return null; }
    var level = null, run = { seed: 36, floor: 1, section: 0, stage: 0 }, flames = 3;
    // the way down: two sections and a guardian on each of three floors, then the vault
    // eight floors, one to an element and each with its guardian, and under them the Vault; stages grow as they go down
    var FLOORS = [
      { element: 'ember', boss: 'golem', grid: [4, 3] }, { element: 'frost', boss: 'wyrm', grid: [4, 3] }, { element: 'bloom', boss: 'thornmother', grid: [5, 3] },
      { element: 'tide', boss: 'bellkeeper', grid: [5, 3] }, { element: 'storm', boss: 'herald', grid: [5, 3] }, { element: 'gear', boss: 'regulator', grid: [5, 4] },
      { element: 'glass', boss: 'reflected', grid: [5, 4] }, { element: 'void', boss: 'orrery', grid: [5, 4] }, { element: 'void', boss: 'lightless', grid: null }
    ];
    var STAGES = [];
    FLOORS.forEach(function (F, n) {
      var floor = n + 1;
      if (n > 0) STAGES.push({ floor: floor, sanctuary: true, element: F.element });
      if (F.grid) { STAGES.push({ floor: floor, section: 0, element: F.element, grid: F.grid }); STAGES.push({ floor: floor, sanctuary: true, element: F.element }); }
      STAGES.push({ floor: floor, boss: F.boss, element: F.element });
    });
    // until a guardian's own file is written, another stands in for it
    function guardianFor(st) { var GR = window.Guardians.REG; return GR[st.boss] ? st.boss : { thornmother: 'wyrm', orrery: 'herald', bellkeeper: 'wyrm', regulator: 'herald', reflected: 'orrery' }[st.boss] || 'golem'; }


    function syncStage() { var st = STAGES[run.stage]; run.floor = st.floor; run.section = st.boss ? 3 : st.section || 0; }
    var element = WD.ELEMENTS[0];

    function loadSection() {
      syncStage();
      var st = STAGES[run.stage];
      level = st.boss ? WD.arena(run.seed, st.floor, guardianFor(st)) : st.sanctuary ? WD.sanctuary(run.seed, st.floor, st.element) : WD.explore(run.seed, st.floor, st.section, st.element, st.grid[0], st.grid[1]);
      seenCells = {};
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
        // cogs: two toothed wheels half sunk in the floor, turning; shards: a row of glass teeth that glint
        if (el.hazard === 'cogs') { hp.clearRect(0, 0, TILE, TILE); hp.fillStyle = el.stone[3]; hp.fillRect(0, 12, TILE, 4); for (k = 0; k < 2; k++) { var gx = 4 + k * 8, ga = v * 0.35 * (k ? -1 : 1); hp.fillStyle = el.hazardColours[k ? 0 : 1]; hp.beginPath(); for (var gt = 0; gt < 12; gt++) { var gr = gt % 2 ? 3.4 : 5.4, gan = ga + gt / 12 * 6.2832; if (gt) hp.lineTo(gx + Math.cos(gan) * gr, 10 + Math.sin(gan) * gr); else hp.moveTo(gx + Math.cos(gan) * gr, 10 + Math.sin(gan) * gr); } hp.fill(); hp.fillStyle = el.hazardColours[2]; hp.fillRect(gx - 1, 9, 2, 2); } }
        if (el.hazard === 'shards') { hp.clearRect(0, 0, TILE, TILE); var sh = [[1, 9], [5, 5], [9, 8], [13, 4]]; for (k = 0; k < 4; k++) { hp.fillStyle = el.hazardColours[k % 2]; hp.beginPath(); hp.moveTo(sh[k][0] - 2, 16); hp.lineTo(sh[k][0] + 1, sh[k][1]); hp.lineTo(sh[k][0] + 3, 16); hp.fill(); hp.fillStyle = el.hazardColours[2]; hp.fillRect(sh[k][0] + 1, sh[k][1] + ((v + k) % 3) * 2, 1, 2); } }
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

    function freshHero() {
      return {
        x: 40, y: 0, vx: 0, vy: 0, w: 10, h: 22, dir: 1,
        onGround: false, coyote: 0, buffer: 0, drop: 0, jumping: false,
        anim: 'idle', frame: 0, clock: 0, landed: 0,
        hp: 6, maxHp: 6, energy: 3, maxEnergy: 3,
        act: null, combo: 0, queued: false, dashCd: 0, airDash: true, invuln: 0, flash: 0, alive: true, deadFor: 0, hits: 0
      };
    }
    var hero = freshHero();

    function spawnHero() {
      hero.x = level.spawn.x; hero.y = level.spawn.y; hero.vx = 0; hero.vy = 0; hero.dir = 1;
      hero.onGround = false; hero.coyote = 0; hero.buffer = 0; hero.drop = 0; hero.jumping = false;
      hero.anim = 'idle'; hero.frame = 0; hero.clock = 0; hero.landed = 0;
      hero.hp = hero.maxHp; hero.energy = hero.maxEnergy;
      hero.act = null; hero.combo = 0; hero.queued = false; hero.dashCd = 0; hero.airDash = true; hero.invuln = 0; hero.flash = 0; hero.alive = true; hero.deadFor = 0; hero.wall = 0; pounding = false;
      afflictions.burn = 0; afflictions.chill = 0; afflictions.poison = 0; afflictions.soak = 0; afflictions.jam = 0; afflictions.cut = 0;
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
      var ms = weapon.moveset; if (ms !== 'bow' && ms !== 'pole') sfx(ms === 'heavy' ? 'swingheavy' : ms === 'quick' || ms === 'thrown' ? 'swingquick' : ms === 'whip' ? 'whip' : 'swing');
      if (spec.lift && !hero.onGround) hero.vy = Math.min(hero.vy, -1.5);
    }
    // the Kite's dash: as far ahead as there is room for, at once, leaving himself behind in ribbons
    function blink() {
      var from = hero.x, reach = Math.round(64 * mods.dashLength), step, half = hero.w / 2, to = hero.x;
      for (step = 4; step <= reach; step += 4) { var nx = from + hero.dir * step; if (blocked(nx - half, hero.y - hero.h, nx + half, hero.y, false)) break; to = nx; }
      var frames = sprites.warden.dash, n = Math.max(2, Math.round(Math.abs(to - from) / 12));
      for (step = 0; step < n; step++) afterimages.push({ img: P.silhouette(frames[step % 2], step % 2 ? '#ff3b4e' : '#ffffff'), x: from + (to - from) * step / n, y: hero.y, dir: hero.dir, life: 6 + step * 2 });
      for (step = 0; step < 14; step++) particles.push({ x: from + (to - from) * random(), y: hero.y - 4 - random() * 18, vx: -hero.dir * random(), vy: (random() - 0.5) * 0.6, life: 10 + random() * 12, max: 22, colour: random() < 0.5 ? '#ff3b4e' : '#ffffff', size: 1, gravity: 0 });
      rings.push({ x: from, y: hero.y - 12, r: 3, grow: 1.6, life: 8, max: 8, colour: '#ff3b4e' }); rings.push({ x: to, y: hero.y - 12, r: 8, grow: -0.6, life: 8, max: 8, colour: '#ffffff' });
      // an edge on it, if he carries one: everything between is cut once
      if (weapon.ability === 'dashslash' || mods.ghost) { if (strike({ x0: Math.min(from, to) - 6, x1: Math.max(from, to) + 6, y0: hero.y - 24, y1: hero.y - 2 }, 3 + mods.damage, 0, null)) zaps.push({ x0: from, y0: hero.y - 12, x1: to, y1: hero.y - 12, colour: '#ffffff', life: 6 }); }
      hero.x = to;
    }
    function startDash() {
      hero.act = { kind: 'dash', ticks: 0 };
      hero.anim = 'dash'; hero.frame = 0; hero.clock = 0;
      hero.act.speed = klass.dash === 'charge' ? 3.5 : klass.dash === 'flicker' ? -3.8 : klass.dash === 'blink' ? 1.4 : DASH_SPEED; hero.act.frames = klass.dash === 'blink' ? 7 : Math.round((klass.dash === 'charge' ? 17 : klass.dash === 'flicker' ? 10 : DASH_FRAMES) * mods.dashLength); hero.act.struck = [];
      if (afflictions.soak > 0) hero.act.frames = Math.max(4, Math.round(hero.act.frames * 0.65));
      if (klass.dash === 'blink') blink();
      if (klass.dash === 'flicker') { delayed.push({ t: 26, x: hero.x, y: hero.y - 12, fn: 'flare' }); flares.push({ x: hero.x, y: hero.y - 12, t: 26 }); }
      hero.vx = hero.dir * hero.act.speed; hero.vy = 0;
      hero.dashCd = Math.round(DASH_COOLDOWN * (klass.dash === 'charge' ? 1.5 : klass.dash === 'blink' ? 0.7 : 1) * mods.dashCooldown); hero.invuln = Math.max(hero.invuln, klass.dash === 'blink' ? 16 : hero.act.frames + 2);
      if (!hero.onGround) hero.airDash = false;
      dust(hero.x, hero.y, -hero.dir, 6);
      sfx(klass.dash === 'blink' ? 'blink' : klass.dash === 'charge' ? 'charge' : 'dash');
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
      if (afflictions.cut > 0 && cause !== 'burn' && cause !== 'poison') { damage += 1; afflictions.cut = 0; number(hero.x, hero.y - 40, 'DEEPER', '#ff9ecb'); }
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
        if (a.ticks % 2 === 0 && klass.dash !== 'blink') afterimage(sprites.warden.dash[hero.frame], hero.x, hero.y, hero.dir);
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
        else if (hit('cast') && hero.energy > 0) { if (afflictions.jam > 0) { number(hero.x, hero.y - 32, 'JAMMED', '#e0b04a'); sfx('clink'); } else startCast(); }
        else if (hit('swap')) changeHands();
      } else stepAct();
      // jumping, with a little forgiveness either side of the edge
      var mayJump = !hero.act || hero.act.kind === 'attack';
      if (hit('jump')) hero.buffer = BUFFER;
      if (mods.pound && !hero.onGround && hero.coyote <= 0 && down('down') && hit('jump') && !pounding && !hero.act) { pounding = true; hero.vy = 6.5; hero.vx = 0; hero.buffer = 0; hero.invuln = Math.max(hero.invuln, 20); }
      if (pounding) { hero.vy = Math.max(hero.vy, 6); hero.vx = 0; }
      if (mayJump && hero.buffer > 0 && hero.wall && !hero.onGround) { hero.vy = JUMP_V * 0.95; hero.vx = -hero.wall * 2.6; hero.dir = -hero.wall; hero.jumping = true; hero.buffer = 0; hero.wall = 0; if (klass.flips) hero.flip = 18; sfx('jump'); dust(hero.x, hero.y - 8, hero.dir, 4); }
      // everyone has a second jump, from the air; the Boots give a third
      if (mayJump && hero.buffer > 0 && !hero.onGround && hero.coyote <= 0 && !hero.wall && airJumped < mods.airJumps && hero.vy > -2) {
        hero.vy = JUMP_V * 0.9 * (afflictions.soak > 0 ? 0.84 : 1); hero.jumping = true; airJumped++; hero.buffer = 0; sfx(klass.flips ? 'flip' : 'jump'); if (klass.flips) hero.flip = 18;
        spark(hero.x, hero.y, '#9fd8ff', 8, 1.2, 14, 0.02); rings.push({ x: hero.x, y: hero.y, r: 2, grow: 1.4, life: 8, max: 8, colour: '#9fd8ff' });
      }
      if (mayJump && hero.buffer > 0 && (hero.onGround || hero.coyote > 0)) {
        if (down('down') && hero.onGround && standingOnLedge()) hero.drop = 8;
        else { hero.vy = JUMP_V * (afflictions.soak > 0 ? 0.84 : 1); hero.jumping = true; hero.onGround = false; hero.coyote = 0; dust(hero.x, hero.y, -hero.dir, 3); sfx('jump'); }
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
      if (level.fountain && !(level.fountain.drank && level.fountain.drank[cur.index]) && Math.abs(hero.x - level.fountain.x) < 12 && Math.abs(hero.y - level.fountain.y) < 8 && hero.hp < hero.maxHp) { (level.fountain.drank || (level.fountain.drank = {}))[cur.index] = true; level.fountain.used = players.every(function (Q) { return Q.gone || level.fountain.drank[Q.index]; }); hero.hp = hero.maxHp; afflictions.burn = 0; afflictions.poison = 0; afflictions.chill = 0; afflictions.soak = 0; afflictions.jam = 0; afflictions.cut = 0; spark(hero.x, hero.y - 14, '#ffdc9a', 30, 1.8, 40, -0.02); number(hero.x, hero.y - 34, 'WHOLE', '#ffdc9a'); sfx('font'); }
      if (hero.y > level.rows * TILE + 40) { hero.hp = 0; hero.alive = false; hero.act = { kind: 'death', ticks: 80 }; hero.deadFor = 80; lastHurtBy = 'fall'; }
      if (!level.portal && hero.alive && hero.onGround && !level.locked && Math.abs(hero.x - level.door.x) < 7 && Math.abs(hero.y - level.door.y) < 4 && transition === 0) { transition = 1; sfx('door'); }
      stepPortal(); stepPerks();
      if (!hero.act) animateHero();
      if (tick % 3 === 0 && hero.alive) ember(hero.x - hero.dir * 8, hero.y - 8);
    }

    // when everyone who is playing has fallen: a flame is spent and the floor begins again, or the run is over
    function stepFallen() {
      var all = players.filter(function (Q) { return !Q.gone; });
      if (!all.length || !all.every(function (Q) { return Q.hero.act && Q.hero.act.kind === 'death' && Q.hero.deadFor > 110; })) return;
      if (flames > 1) {
        flames--;
        while (run.stage > 0 && STAGES[run.stage - 1].floor === STAGES[run.stage].floor) run.stage--;
        loadSection(); placeCreatures(); spawnAll();
        particles.length = 0; afterimages.length = 0; numbers.length = 0; players.forEach(function (Q) { Q.hero.invuln = 120; });
        sfx('flamelost');
        banner = { t: 0, text: flames === 1 ? 'The last flame' : 'A flame goes out', sub: players.length > 1 ? 'YOU RISE TOGETHER AT THE HEAD OF THE FLOOR' : 'YOU RISE AT THE HEAD OF THE FLOOR', colour: '#ffb347' };
      } else endRun(false);
    }
    // everyone to the stage's beginning, side by side; whoever was down is up again
    function spawnAll() {
      var was = cur;
      players.forEach(function (Q) { if (Q.gone) return; use(Q); var wasDown = !hero.alive; spawnHero(); if (wasDown && company() > 1) { hero.hp = Math.max(1, Math.ceil(hero.maxHp / 2)); number(hero.x, hero.y - 34, 'UP AGAIN', '#ffdc9a'); } hero.x += Q.index * 14; Q.took = false; });
      use(players[me] && !players[me].gone ? players[me] : was); stepCamera(true); use(was);
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
          // brine does not wound: it soaks, and wading is slow
          if (element.hazard === 'brine') { if (!(afflictions.soak > 120)) { if (!(afflictions.soak > 0)) { number(hero.x, hero.y - 32, 'SOAKED', '#5fd4c4'); sfx('land'); } afflictions.soak = 170; } hero.vx *= 0.86; if (tick % 4 === 0) particles.push({ x: hero.x + (random() - 0.5) * 8, y: hero.y - 1, vx: (random() - 0.5) * 0.8, vy: -0.8 - random(), life: 12, max: 12, colour: '#9ff5e6', size: 1, gravity: 0.1 }); continue; }
          if (element.hazard === 'rail' && tick % 150 >= 75) continue;
          if (hurtHero(tx * TILE + 8, element.hazard === 'void' ? 2 : 1, element.hazard === 'void' ? 'voidpool' : element.hazard)) { hero.vy = -3.2; status(element.name); if (element.hazard === 'cogs') hero.vx = (tx % 2 ? -1 : 1) * 3.4; if (element.hazard === 'shards') afflict('glass'); }
          return;
        }
      }
    }
    // an elemental touch: burning, poison and the rest arrive with the enemies; for now, sparks in the element's colour
    function status(name) { spark(hero.x, hero.y - 12, element.glow, 12, 1.6, 24, 0.03); }

    // which animation, and how fast it runs, when the Warden is free
    function animateHero() {
      var next, rate;
      if (hero.flip > 0) hero.flip--;
      if (hero.onGround) hero.flip = 0;
      if (hero.flip > 0 && sprites.warden.flip) { hero.anim = 'flip'; hero.frame = Math.floor((18 - hero.flip) / 18 * 8) % 8; hero.clock = 0; if (hero.flip % 3 === 0) particles.push({ x: hero.x - hero.dir * 4, y: hero.y - 12, vx: 0, vy: 0, life: 10, max: 10, colour: '#ff3b4e', size: 1, gravity: 0 }); return; }
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
    var ROARS = { golem: 'roargolem', wyrm: 'roarwyrm', herald: 'roarherald', thornmother: 'roarthorn', orrery: 'roarorrery', lightless: 'roarlightless', bellkeeper: 'roarbell', regulator: 'roarclock', reflected: 'roarglass' };
    var creatures = [], projectiles = [], zaps = [], kills = 0, actorSprites = AC.build(), guardianSprites = GD.build(), hazards = [], telegraphs = [], won = false, boss = null;
    var ctx = {
      tileAt: tileAt, moveBody: moveBody, spark: spark, random: random,
      particle: function (q) { particles.push(q); },
      // what a guardian lights while it is stepped is held until it is stepped again, however many pictures are drawn between
      light: function (x, y, r, str) { stepLit.lights.push({ x: x, y: y, r: r, s: str || 1 }); },
      hurtHero: function (fromX, damage, e) { var took = hurtHero(fromX, damage, e ? e.kind : ''); if (took && mods.thorns && e) wound(e, mods.thorns, hero.x, null); return took; },
      afflict: function (elementName) { afflict(elementName); },
      // a box that wounds whoever stands in it (every hero is tried); true if anybody was in it, hurt or not
      touch: function (box, damage, elementName, e, fromX) {
        var was = cur, any = false;
        for (var k = 0; k < players.length; k++) {
          var Q = players[k]; if (Q.gone || !Q.hero.alive) continue;
          use(Q);
          if (!overlaps(heroHurtBox(), box)) continue;
          any = true;
          if (hurtHero(fromX === undefined ? (box.x0 + box.x1) / 2 : fromX, damage || 1, e ? e.kind : '', null)) { if (elementName) afflict(elementName); if (mods.thorns && e) wound(e, mods.thorns, hero.x, null); }
        }
        use(was);
        return any;
      },
      // everybody who is up, for what needs to look at all of them (read, do not keep)
      heroes: function () { return players.filter(function (Q) { return !Q.gone && Q.hero.alive; }).map(function (Q) { return Q.hero; }); },
      projectile: function (p) { p.from = 'enemy'; projectiles.push(p); if (Math.abs(p.x - hero.x) < W) sfx('shot'); },
      zap: function (x0, y0, x1, y1, colour) { zaps.push({ x0: x0, y0: y0, x1: x1, y1: y1, colour: colour, life: 8 }); },
      hazard: function (h) { hazards.push(h); },
      telegraph: function (x, y, w, h, life, colour) { telegraphs.push({ x: x, y: y, w: w, h: h, life: life, max: life, colour: colour }); },
      telegraphLine: function (x0, y0, x1, y1, life, colour) { telegraphs.push({ line: true, x: x0, y: y0, x1: x1, y1: y1, life: life, max: life, colour: colour }); },
      telegraphCrack: function (x, y, w, life, colour) { telegraphs.push({ crack: true, x: x, y: y, w: w, life: life, max: life, colour: colour, seed: Math.floor(x * 7 + y) }); },
      telegraphCircle: function (x, y, r, life, colour) { telegraphs.push({ circle: true, x: x, y: y, r: r, life: life, max: life, colour: colour }); },
      chain: function (x0, y0, x1, y1, colour) { zaps.push({ chain: true, x0: x0, y0: y0, x1: x1, y1: y1, colour: colour, life: 2 }); },
      beam: function (x0, y0, x1, y1, colour) { zaps.push({ beam: true, x0: x0, y0: y0, x1: x1, y1: y1, colour: colour, life: 2 }); },
      crescent: function (x, y, dir, r, colour, life) { crescents.push({ x: x, y: y, dir: dir, r: r, colour: colour, life: life, max: life }); },
      shake: shake,
      count: function () { return creatures.length; },
      summon: function (kind, x, y) { var e = sterner(AC.make(kind, x, y + 36, false, run.floor, random)); e.x = x; e.y = y; e.seen = true; creatures.push(e); spark(x, y, '#8fa3ff', 10, 1.5, 18, 0); },
      weaponId: function () { return weaponId; }, powerName: function () { return power; }, classId: function () { return classId; },
      blackout: function (on) { blackout = !!on; },
      glow: function (x, y, r, colour, alpha) { stepLit.glows.push({ x: x, y: y, r: r, colour: colour, alpha: alpha }); },
      // a guardian has fallen: whatever it had in the air is gone with it
      calm: function () { telegraphs.length = 0; hazards.length = 0; projectiles = projectiles.filter(function (p) { return p.from !== 'enemy'; }); },
      // a guardian's roar is its own
      sfx: function (name) { sfx(name === 'roar' && boss && ROARS[boss.kind] ? ROARS[boss.kind] : name); },
      flash: function (colour, life) { flash = { colour: colour, life: life || 8 }; },
      number: function (x, y, value, colour) { number(x, y, value, colour); },
      wound: function (e, damage, fromX, elementName) { return wound(e, damage, fromX, elementName || null); },
      // the floor itself can change under a guardian; if stone closes on the Warden she is lifted out of it
      setTile: function (tx, ty, t) {
        level.set(tx, ty, t);
        if (t === 1 && hero.x + hero.w / 2 > tx * TILE && hero.x - hero.w / 2 < (tx + 1) * TILE && hero.y > ty * TILE && hero.y - hero.h < (ty + 1) * TILE) { hero.y = ty * TILE - 0.001; hero.vy = 0; }
      }
    };
    function sterner(e) { if (company() > 1 && e && !e.sterner) { e.sterner = true; e.hp = e.maxHp = Math.round(e.maxHp * (e.boss ? 1.6 : 1.5)); } return e; }
    function placeCreatures() {
      creatures = []; projectiles = []; zaps = [];
      var rnd = WD.makeRandom(run.seed * 31 + run.floor * 7 + run.section);
      for (var k = 0; k < level.enemies.length; k++) creatures.push(AC.spawn(level.enemies[k], element.name, run.floor, rnd));
      boss = null; hazards = []; telegraphs = []; blackout = false; stepLit.lights.length = 0; stepLit.glows.length = 0;
      placeChests(); placePerks();
      if (level.boss) { boss = GD.spawn(run.floor, level.arena, rnd, guardianFor(STAGES[run.stage])); creatures.push(boss); }
      creatures.forEach(sterner);
    }
    function stepHazards() {
      var k, h;
      for (k = hazards.length - 1; k >= 0; k--) {
        h = hazards[k];
        for (var hq = 0; hq < players.length; hq++) { if (players[hq].gone || !players[hq].hero.alive) continue; use(players[hq]); if (overlaps(heroHurtBox(), h)) { if (hurtHero((h.x0 + h.x1) / 2, h.damage, boss ? boss.kind : h.element)) afflict(h.element); } }
        if (h.life % (h.fire ? 5 : 3) === 0) particles.push({ x: h.x0 + random() * (h.x1 - h.x0), y: h.y0 + random() * (h.y1 - h.y0), vx: 0, vy: -0.4 - random() * 0.6, life: 14, max: 14, colour: h.colour, size: random() < 0.4 ? 2 : 1, gravity: 0 });
        if (--h.life <= 0) hazards.splice(k, 1);
      }
      for (k = telegraphs.length - 1; k >= 0; k--) if (--telegraphs[k].life <= 0) telegraphs.splice(k, 1);
      // the guardian falls: the way opens, and there is choosing to do
      if (boss && !boss.dying && SND) SND.tension(0.4 + 0.6 * (1 - boss.hp / boss.maxHp));
      if (boss && boss.dying === 60) {
        kills++; sfx('boom'); if (SND) SND.tension(0);
        players.forEach(function (Q) { if (Q.hero.alive) Q.hero.hp = Q.hero.maxHp; });
        spark(boss.x, boss.y - boss.h / 2, '#ffffff', 60, 3, 50, 0.02); spark(boss.x, boss.y - boss.h / 2, element.glow, 40, 2.4, 60, -0.01); shake(6);
        if (run.stage >= STAGES.length - 1) { level.locked = false; banner = { t: 0, text: 'The way up is open', sub: 'THERE IS NOTHING LEFT BELOW YOU', colour: '#ffdc9a' }; }   // the last of them: nothing to choose, only the door
        else offerRewards(boss.x);
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
        var aim = targetFor(e);
        if ((Math.abs(e.x - aim.hero.x) > W * 1.2 || Math.abs(e.y - aim.hero.y) > H * 0.9) && !e.seen) continue;   // asleep until somebody is near
        use(aim);
        if (e.boss) GD.step(e, ctx); else AC.step(e, ctx);
        // `hitHero` is the creature's own word for "this blow has landed"; with company it is kept for each hero apart
        if (!e.hitHero) e.hitWho = 0;
        if (e.boxes && e.boxes.length) {
          for (var pk = 0; pk < players.length; pk++) {
            var Q = players[pk];
            if (Q.gone || !Q.hero.alive || (e.hitWho & (1 << pk))) continue;
            use(Q);
            var hb = heroHurtBox();
            for (var bi = 0; bi < e.boxes.length; bi++) {
              if (!overlaps(hb, e.boxes[bi])) continue;
              if (hurtHero(e.x, e.boxes[bi].damage || 1, e.kind, e)) { e.hitWho |= 1 << pk; e.hitHero = true; afflict(e.boxes[bi].element || e.element); if (mods.thorns) wound(e, mods.thorns, hero.x, null); }
              break;
            }
          }
        }
        if (e.dying === 2 && !e.boss) { kills++; players.forEach(function (Q) { if (Q.klass.dash === 'blink') { Q.hero.airDash = true; Q.hero.dashCd = 0; } }); if (e.elder) dropPickup(rollLoot(random, true), e.x, e.y - 10); else if (random() < 0.14) dropPickup({ kind: 'heart', id: 'heart' }, e.x, e.y - 8); if (weapon.ability === 'reap') { reaped++; if (reaped % 3 === 0 && hero.hp < hero.maxHp) { hero.hp++; number(hero.x, hero.y - 34, '+1', '#ff3b4e'); } } spark(e.x, e.y - e.h / 2, WD.ELEMENTS.filter(function (el) { return el.name === e.element; })[0].glow, 18, 2, 30, 0.02); spark(e.x, e.y - e.h / 2, '#ffffff', 6, 1.2, 12, 0); hitstop(4); shake(2); if (e.elder) number(e.x, e.y - e.h - 8, 'ELDER', '#e9e6df'); if (hero.energy < hero.maxEnergy && kills % 3 === 0) { hero.energy++; number(hero.x, hero.y - 32, '+', '#ffb347'); } }
        if (e.dying > (e.boss ? 90 : 22)) creatures.splice(k, 1);
        if (e.y > level.rows * TILE + 40) creatures.splice(k, 1);
      }
      for (k = projectiles.length - 1; k >= 0; k--) {
        var p = projectiles[k];
        if (p.steer) p.steer(p, ctx);
        if (p.seek) { var sk = nearestPlayer(p.x, p.y).hero, dx = sk.x - p.x, dy = sk.y - 11 - p.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy)); p.vx += dx / len * p.seek; p.vy += dy / len * p.seek; }
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity || 0;
        if (tick % 2 === 0) particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 8, max: 8, colour: p.colour, size: 1, gravity: 0 });
        var gone = --p.life <= 0 || (!p.wave && tileAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE)) === 1) || (p.wave && tileAt(Math.floor((p.x + p.vx * 3) / TILE), Math.floor(p.y / TILE)) === 1);
        var struckStone = gone && p.life > 0;
        var pbox = { x0: p.x - p.size / 2, x1: p.x + p.size / 2, y0: p.y - p.size / 2, y1: p.y + p.size / 2 };
        if (p.from === 'enemy') for (var hk = 0; hk < players.length; hk++) {
          var HQ = players[hk]; if (HQ.gone || !HQ.hero.alive) continue;
          use(HQ);
          if (!overlaps(heroHurtBox(), pbox)) continue;
          if (hurtHero(p.x, p.damage, p.cause ? p.cause : p.wave ? 'wave' : p.seek ? 'beam' : p.cloud ? 'spore' : 'shard')) afflict(p.element);
          gone = true; break;
        }
        if (p.from === 'hero') use(players[p.owner || 0]);
        if (p.from === 'hero' && touchCreatures(pbox, p.damage, p.element, p.x - p.vx * 4, p.struck || (p.struck = []), !p.pierce) && !p.pierce) gone = true;
        if (gone) { if (p.land && struckStone) p.land(p); spark(p.x, p.y, p.colour, 5, 1, 12, 0); projectiles.splice(k, 1); }
      }
      for (k = zaps.length - 1; k >= 0; k--) if (--zaps[k].life <= 0) zaps.splice(k, 1);
    }
    // who a creature goes for: whoever is nearer, and it does not change its mind for a few pixels
    function company() { var n = 0; for (var k = 0; k < players.length; k++) if (!players[k].gone) n++; return n; }
    function firstPlayer() { for (var k = 0; k < players.length; k++) if (!players[k].gone) return players[k]; return players[0]; }
    function nearestPlayer(x, y, keep) {
      var best = null, bd = 1e9;
      for (var k = 0; k < players.length; k++) { var Q = players[k]; if (Q.gone || !Q.hero.alive) continue; var dx = Q.hero.x - x, dy = Q.hero.y - y, d = Math.sqrt(dx * dx + dy * dy) - (Q === keep ? 32 : 0); if (d < bd) { bd = d; best = Q; } }
      return best || firstPlayer();
    }
    function targetFor(e) { var Q = nearestPlayer(e.x, e.y, e.aimed); e.aimed = Q; return Q; }
    // whatever a hero has just let fly is hers: it is she who is credited when it lands
    function claim(index) { for (var k = projectiles.length - 1; k >= 0 && projectiles[k].owner === undefined; k--) if (projectiles[k].from === 'hero') projectiles[k].owner = index; else projectiles[k].owner = -1; }
    // something thrown touches whatever it has not touched before; returns how many it touched
    function touchCreatures(pbox, damage, elementName, fromX, seen, one) {
      var n = 0;
      for (var j = 0; j < creatures.length; j++) {
        var c = creatures[j];
        if (c.dying || seen.indexOf(c) >= 0) continue;
        var cb = boxesOf(c), touched = false;
        for (var q = 0; q < cb.length; q++) if (overlaps(pbox, cb[q])) { if (cb[q].onHit) { touched = cb[q].onHit(c, ctx, damage, fromX, true); break; } if (c.boss && cb.length > 1) c.struckAt = { x: (cb[q].x0 + cb[q].x1) / 2, y: (cb[q].y0 + cb[q].y1) / 2 }; wound(c, Math.max(1, Math.round(damage * (cb[q].mult || 1))), fromX, elementName); touched = true; break; }
        if (touched) { seen.push(c); n++; if (one) break; }
      }
      return n;
    }
    // a wound on a creature, with the Warden's element laid on it
    function wound(e, damage, fromX, elementName) {
      if (e.status.freeze > 0) damage += mods.frozenBonus;
      if (e.status.cut > 0) damage += 1;
      if (!AC.hurt(e, damage, fromX, ctx)) return false;
      if (e.boss) { e.vx = 0; e.vy = Math.min(e.vy, 0); } else e.vx *= mods.knockback;
      if (mods.breaker && !e.boss && e.attack && e.attack.phase === 'windup') { if (e.attack.def.end) e.attack.def.end(e, ctx); e.attack = null; e.boxes = []; e.cooldown = 50; number(e.x, e.y - e.h - 14, 'BROKEN', '#ffb347'); }
      if (mods.slowOnHit) e.status.shock = Math.max(e.status.shock || 0, mods.slowOnHit);
      hero.hits++; countHit();
      if (hero.energy < hero.maxEnergy && hero.hits % mods.hitsPerEnergy === 0 && !(afflictions.jam > 0)) hero.energy++;
      sfx(e.boss || e.elder ? 'heavy' : 'hit'); if (elementName === 'frost') sfx('freeze');
      var at = e.struckAt || { x: e.x, y: e.y - e.h / 2 }; e.struckAt = null;
      spark(at.x, at.y, '#ffffff', 8, 1.6, 16, 0.06);
      number(at.x, at.y - e.h / 2 - 6, damage, elementName ? AC.STATUS[elementName].colour : '#e9e6df');
      if (elementName === 'ember') { e.status.burn = 180; e.status.burnDamage = mods.burnDamage; if (mods.burnSpread) for (var n = 0; n < creatures.length; n++) { var o = creatures[n]; if (o !== e && !o.dying && Math.abs(o.x - e.x) < 40 && Math.abs(o.y - e.y) < 30) { o.status.burn = 120; o.status.burnDamage = mods.burnDamage; } } }
      else if (elementName === 'frost') e.status.freeze = Math.round(90 * mods.freezeTime);
      else if (elementName === 'storm') e.status.shock = Math.round(60 * mods.shockTime);
      else if (elementName === 'bloom') e.status.poison = 250;
      else if (elementName === 'tide') e.status.soak = 240;
      else if (elementName === 'gear') { if (!e.boss) e.cooldown = Math.max(e.cooldown, 70); }
      else if (elementName === 'glass') e.status.cut = 240;
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
        if (!boxes.length && e.vars && e.vars.shelled && overlaps(box, { x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y - e.h, y1: e.y })) { spark(e.x, e.y - e.h, '#ffffff', 5, 1.6, 10, 0.04); sfx('clink'); }
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
        if ((e.x < cam.x - 40 || e.x > cam.x + W + 40 || e.y < cam.y - 50 || e.y > cam.y + H + 60) && !(e.boss && e.spec.draw)) continue;
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
      for (k = 0; k < projectiles.length; k++) { var p = projectiles[k]; fpen.fillStyle = p.colour; if (p.draw) p.draw(p, fpen, cx, cy, tick); else if (p.flame) { var fx = Math.round(p.x) - cx, fy = Math.round(p.y) - cy; fpen.fillStyle = '#ff6a2b'; fpen.beginPath(); fpen.arc(fx, fy, 7, 0, 6.2832); fpen.fill(); fpen.fillStyle = '#ffb347'; fpen.beginPath(); fpen.arc(fx + (p.vx > 0 ? 2 : -2), fy, 5, 0, 6.2832); fpen.fill(); fpen.fillStyle = '#ffdc9a'; fpen.beginPath(); fpen.arc(fx + (p.vx > 0 ? 3 : -3), fy, 2, 0, 6.2832); fpen.fill(); for (var fl = 0; fl < 2; fl++) particles.push({ x: p.x - p.vx * 2, y: p.y + (random() - 0.5) * 10, vx: -p.vx * 0.2, vy: -0.4 - random() * 0.6, life: 12 + random() * 8, max: 20, colour: random() < 0.5 ? '#ff8c42' : '#ffdc9a', size: random() < 0.4 ? 2 : 1, gravity: -0.02 }); } else if (p.pod) { var ox2 = Math.round(p.x) - cx, oy2 = Math.round(p.y) - cy; fpen.fillStyle = '#06120a'; fpen.fillRect(ox2 - 3, oy2 - 4, 7, 8); fpen.fillStyle = '#5e8a66'; fpen.fillRect(ox2 - 2, oy2 - 3, 5, 6); fpen.fillStyle = '#9ae66e'; fpen.fillRect(ox2 - 2, oy2 - 3, 2, 3); fpen.fillStyle = '#ff9ab5'; fpen.fillRect(ox2, oy2 - 5, 1, 2); } else if (p.cloud) { var qx2 = Math.round(p.x) - cx, qy2 = Math.round(p.y) - cy; fpen.globalAlpha = 0.35 + 0.1 * Math.sin(tick * 0.2 + p.x); fpen.fillStyle = p.colour; fpen.beginPath(); fpen.arc(qx2, qy2, 8, 0, 6.2832); fpen.fill(); fpen.globalAlpha = 1; for (var pd = 0; pd < 7; pd++) { var pa = tick * 0.05 + pd * 0.9; fpen.fillStyle = pd % 2 ? '#fff3b0' : p.colour; fpen.fillRect(qx2 + Math.round(Math.cos(pa) * (3 + pd % 3 * 2)), qy2 + Math.round(Math.sin(pa * 1.3) * (3 + pd % 2 * 3)), 1, 1); } } else if (p.bolt) { var bx = Math.round(p.x) - cx, by = Math.round(p.y) - cy, bd = p.vx > 0 ? 1 : -1, bl = p.big ? 12 : 7; fpen.globalAlpha = 0.5; fpen.fillRect(bx - bd * bl - (bd > 0 ? 0 : -1) * 0, by - (p.big ? 2 : 1), bd * bl, p.big ? 4 : 2); fpen.globalAlpha = 1; fpen.fillRect(bx - (p.big ? 3 : 2), by - (p.big ? 3 : 2), p.big ? 7 : 4, p.big ? 6 : 4); fpen.fillStyle = '#ffffff'; fpen.fillRect(bx - 1, by - 1, p.big ? 3 : 2, 2); glows.push({ x: p.x, y: p.y, r: p.big ? 16 : 10, colour: p.colour, alpha: 0.35 }); } else if (p.shard) { var sx = Math.round(p.x) - cx, sy = Math.round(p.y) - cy; fpen.fillRect(sx - 1, sy - 3, 3, 7); fpen.fillRect(sx - 3, sy - 1, 7, 3); fpen.fillStyle = '#ffffff'; fpen.fillRect(sx - 1, sy - 1, 3, 3); fpen.fillStyle = '#0a1220'; fpen.fillRect(sx, sy, 1, 1); } else if (p.icicle && p.big) { var ix = Math.round(p.x) - cx, iy = Math.round(p.y) - cy; fpen.fillStyle = '#0a1220'; fpen.fillRect(ix - 3, iy - 8, 7, 3); fpen.fillRect(ix - 2, iy - 5, 5, 6); fpen.fillRect(ix - 1, iy + 1, 3, 5); fpen.fillStyle = p.colour; fpen.fillRect(ix - 2, iy - 7, 5, 2); fpen.fillRect(ix - 1, iy - 5, 3, 6); fpen.fillRect(ix, iy + 1, 1, 4); fpen.fillStyle = '#ffffff'; fpen.fillRect(ix - 1, iy - 7, 1, 8); } else if (p.icicle) { fpen.fillRect(Math.round(p.x) - 1 - cx, Math.round(p.y) - 5 - cy, 3, 7); fpen.fillStyle = '#ffffff'; fpen.fillRect(Math.round(p.x) - cx, Math.round(p.y) - 4 - cy, 1, 4); fpen.fillStyle = p.colour; fpen.fillRect(Math.round(p.x) - cx, Math.round(p.y) + 2 - cy, 1, 2); } else if (p.ember) { fpen.fillRect(Math.round(p.x) - 2 - cx, Math.round(p.y) - 2 - cy, 4, 4); fpen.fillStyle = '#ffdc9a'; fpen.fillRect(Math.round(p.x) - 1 - cx, Math.round(p.y) - 1 - cy, 2, 2); } else if (p.wave) { var wx = Math.round(p.x) - cx, wy = Math.round(p.y) + 5 - cy, wd = p.vx > 0 ? 1 : -1; for (var wi = 0; wi < 5; wi++) { var wh = [11, 9, 7, 5, 3][wi] + ((tick >> 2) + wi) % 2 * 2; fpen.fillStyle = p.colour; fpen.fillRect(wx - wd * wi * 3 - 1, wy - wh, 3, wh); fpen.fillStyle = p.core || '#ffdc9a'; fpen.fillRect(wx - wd * wi * 3 - 1, wy - Math.round(wh * 0.45), 3, Math.round(wh * 0.45)); } if (tick % 2 === 0) particles.push({ x: p.x - wd * 6, y: p.y - 2 - random() * 6, vx: -wd * 0.4, vy: -0.5 - random() * 0.5, life: 14, max: 14, colour: p.colour, size: 1, gravity: -0.01 }); } else if (p.coal) { var qx = Math.round(p.x) - cx, qy = Math.round(p.y) - cy; fpen.fillStyle = '#1a0806'; fpen.fillRect(qx - 3, qy - 3, 6, 6); fpen.fillStyle = '#ff6a2b'; fpen.fillRect(qx - 2, qy - 2, 4, 4); fpen.fillStyle = (tick >> 2) % 2 ? '#ffdc9a' : '#ffb347'; fpen.fillRect(qx - 1, qy - 1, 2, 2); glows.push({ x: p.x, y: p.y, r: 9, colour: '#ff6a2b', alpha: 0.3 }); } else if (p.lance) { var dir = p.vx > 0 ? 1 : -1; fpen.fillRect(Math.round(p.x) - (dir > 0 ? 10 : 2) - cx, Math.round(p.y) - 1 - cy, 12, 3); fpen.fillStyle = '#ffffff'; fpen.fillRect(Math.round(p.x) + (dir > 0 ? 1 : -3) - cx, Math.round(p.y) - cy, 2, 1); } else fpen.fillRect(Math.round(p.x) - p.size / 2 - cx, Math.round(p.y) - p.size / 2 - cy, p.size, p.size); light(p.x, p.y, 14, 0.6); }
      for (k = 0; k < zaps.length; k++) { var z = zaps[k]; if (z.chain) { var cl = Math.max(1, Math.sqrt((z.x1 - z.x0) * (z.x1 - z.x0) + (z.y1 - z.y0) * (z.y1 - z.y0))), cn = Math.floor(cl / 3); for (var ci2 = 0; ci2 <= cn; ci2++) { fpen.fillStyle = ci2 % 2 ? z.colour : '#0b0b12'; fpen.fillRect(Math.round(z.x0 + (z.x1 - z.x0) * ci2 / cn) - cx, Math.round(z.y0 + (z.y1 - z.y0) * ci2 / cn) - cy, 2, 2); } continue; } if (z.beam) { fpen.strokeStyle = z.colour; fpen.globalAlpha = 0.5; fpen.lineWidth = 6; fpen.beginPath(); fpen.moveTo(z.x0 - cx, z.y0 - cy); fpen.lineTo(z.x1 - cx, z.y1 - cy); fpen.stroke(); fpen.globalAlpha = 1; fpen.strokeStyle = '#ffffff'; fpen.lineWidth = 2; fpen.beginPath(); fpen.moveTo(z.x0 - cx, z.y0 - cy); fpen.lineTo(z.x1 - cx, z.y1 - cy); fpen.stroke(); light((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2, 40, 0.7); light(z.x1, z.y1, 24, 0.8); continue; } fpen.strokeStyle = z.colour; fpen.lineWidth = 1; fpen.beginPath(); fpen.moveTo(z.x0 - cx, z.y0 - cy); var mx = (z.x0 + z.x1) / 2 + (random() - 0.5) * 12, my = (z.y0 + z.y1) / 2 + (random() - 0.5) * 12; fpen.lineTo(mx - cx, my - cy); fpen.lineTo(z.x1 - cx, z.y1 - cy); fpen.stroke(); light(mx, my, 20, 0.7); }
    }

    /* ---- what the elements do to the Warden ---- */

    var afflictions = { burn: 0, chill: 0, poison: 0, soak: 0, jam: 0, cut: 0 };
    function afflict(elementName) {
      var st = AC.STATUS[elementName];
      if (!st) return;
      if (st.name === 'drain') { if (hero.energy > 0) { hero.energy--; number(hero.x, hero.y - 32, '-', '#a48cff'); } return; }
      if (st.name === 'shock') { hero.vx *= 0.2; return; }
      if (!(afflictions[st.name] > 0) && (st.name === 'soak' || st.name === 'jam' || st.name === 'cut')) number(hero.x, hero.y - 32, st.name === 'soak' ? 'SOAKED' : st.name === 'jam' ? 'JAMMED' : 'CUT', st.colour);
      afflictions[st.name] = st.time;
    }
    function stepAfflictions() {
      if (afflictions.burn > 0) { afflictions.burn--; if (afflictions.burn % 60 === 30) { hero.invuln = 0; hurtHero(hero.x + 1, 1, 'burn'); hero.invuln = Math.max(hero.invuln, 20); } if (tick % 3 === 0) ember(hero.x + (random() - 0.5) * 8, hero.y - 14); }
      if (afflictions.poison > 0) { afflictions.poison--; if (afflictions.poison % 120 === 60) { hero.invuln = 0; hurtHero(hero.x + 1, 1, 'poison'); hero.invuln = Math.max(hero.invuln, 20); } if (tick % 5 === 0) particles.push({ x: hero.x + (random() - 0.5) * 8, y: hero.y - 16, vx: 0, vy: -0.3, life: 20, max: 20, colour: '#9ae66e', size: 1, gravity: 0 }); }
      if (afflictions.chill > 0) afflictions.chill--;
      // soaked: jumps and dashes fall short. Jammed: the power will not fire, and blows give no energy. Cut: the next wound is one deeper
      if (afflictions.soak > 0) { afflictions.soak--; if (tick % 7 === 0) particles.push({ x: hero.x + (random() - 0.5) * 8, y: hero.y - 8 - random() * 10, vx: 0, vy: 0.5, life: 14, max: 14, colour: '#5fd4c4', size: 1, gravity: 0.06 }); }
      if (afflictions.jam > 0) { afflictions.jam--; if (tick % 9 === 0) particles.push({ x: hero.x + (random() - 0.5) * 10, y: hero.y - 20, vx: (random() - 0.5) * 0.6, vy: -0.4, life: 14, max: 14, colour: '#e0b04a', size: 1, gravity: 0 }); }
      if (afflictions.cut > 0) { afflictions.cut--; if (tick % 8 === 0) particles.push({ x: hero.x + (random() - 0.5) * 8, y: hero.y - 6 - random() * 14, vx: 0, vy: 0.3, life: 12, max: 12, colour: '#ff9ecb', size: 1, gravity: 0.03 }); }
      if (element.hazard === 'ice' && onIce && tick % 6 === 0) particles.push({ x: hero.x + (random() - 0.5) * 8, y: hero.y, vx: -hero.vx * 0.3, vy: -0.4, life: 14, max: 14, colour: '#d8f1ff', size: 1, gravity: 0.02 });
    }

    /* ---- the powers, the relics, and the choosing of them ---- */

    var RL = window.Relics;
    if (!RL) { env.fail('The undercroft’s relics did not load. The other rooms still run.'); return null; }
    var power = 'emberwave', held = [], mods = RL.baseMods(), casts = 0, shieldUp = 0;

    function applyRelics() {
      var wasMax = hero.maxHp, wasEnergy = hero.maxEnergy;
      mods = RL.mods(held); klass.apply(mods);
      hero.maxHp = klass.hp + mods.maxHp; hero.maxEnergy = klass.energy + mods.maxEnergy;
      if (hero.maxHp > wasMax) hero.hp += hero.maxHp - wasMax;
      if (hero.maxEnergy > wasEnergy) hero.energy += hero.maxEnergy - wasEnergy;
      hero.hp = Math.min(hero.hp, hero.maxHp); hero.energy = Math.min(hero.energy, hero.maxEnergy);
    }
    function takeRelic(id) {
      if (RL.BY_ID[id].stack || held.indexOf(id) < 0) held.push(id);
      if (RL.BY_ID[id].flame) flames = Math.min(5, flames + 1);
      applyRelics();
      number(hero.x, hero.y - 34, RL.BY_ID[id].name.toUpperCase(), '#ffdc9a');
      spark(hero.x, hero.y - 14, '#ffdc9a', 30, 2, 36, -0.01);
      sfx('pickup');
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
    // two hands: what each holds, which is in use, and how long ago they changed (for the flourish in the corner)
    var hands = ['shortsword', null], handIn = 0, swapT = 0;
    var AR = window.Arms || null, armsKit = null;
    var flares = [], ribbon = [], droplets = [], flock = [], pillars = [], rings = [], spikes = [], lash = null, delayed = [], reaped = 0;

    function equip(id) {
      if (!WP.WEAPONS[id]) return false;
      weaponId = id; weapon = WP.WEAPONS[id]; swings = WP.MOVESETS[weapon.moveset]; hands[handIn] = id;
      sprites.warden = P.hero.build(classId, id, WP.views(id));
      hero.combo = 0; hero.queued = false; ribbon = [];
      return true;
    }
    function rarityOf(w) { return WP.RARITY[w.rarity]; }
    function freeHand() { return hands[0] === null ? 0 : hands[1] === null ? 1 : -1; }
    // the other weapon comes to hand: nothing is lost but the combo
    function changeHands() {
      var other = 1 - handIn;
      if (!hands[other]) { number(hero.x, hero.y - 32, 'ONE WEAPON', '#8f8d88'); sfx('select'); return false; }
      handIn = other; equip(hands[other]); swapT = 12; sfx('swap');
      var col = rarityOf(weapon).colour; spark(hero.x + hero.dir * 6, hero.y - 14, col, 8, 1.4, 14, 0);
      return true;
    }
    // a weapon found: into the free hand if there is one, else in place of the one in use, which falls (a common one is simply left)
    function takeWeapon(id) {
      var free = freeHand();
      if (hands[0] === id || hands[1] === id) { if (weaponId !== id) changeHands(); return; }
      if (free >= 0) handIn = free;
      else if (WP.WEAPONS[weaponId].rarity !== 'common') dropPickup({ kind: 'weapon', id: weaponId }, hero.x - hero.dir * 10, hero.y - 8);
      equip(id); swapT = 12;
    }

    // where a swing strikes, by its shape
    function swingBox(sw) {
      var r = weapon.reach * sw.reach * mods.reach, d = hero.dir, x = hero.x, y = hero.y;
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
      } else if (sw.shape === 'bolt') {
        var big = !!sw.finisher;
        projectiles.push({ from: 'hero', x: hero.x + d * 16, y: hero.y - 24, vx: d * (big ? 5.2 : 4.4), vy: 0, gravity: 0, life: big ? 90 : 60, colour: weapon.trail, size: big ? 8 : 5, damage: weapon.damage[n] + mods.damage, element: weapon.element || null, bolt: true, big: big, pierce: big });
        spark(hero.x + d * 16, hero.y - 24, '#ffffff', big ? 10 : 5, 1.6, 10, 0); sfx('bolt'); if (big) shake(1.5);
      } else if (sw.shape === 'shot') {
        loose(sw.finisher ? 16 : 5);
      }
      if (AR) AR.swing(sw, n, kit());
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
      if (AR && AR.fire(name, kit())) return;
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
        else if (q.fn === 'flare') { strike({ x0: q.x - 30, x1: q.x + 30, y0: q.y - 30, y1: q.y + 22 }, 3 + mods.damage, 1, null); rings.push({ x: q.x, y: q.y, r: 4, grow: 2.6, life: 12, max: 12, colour: '#ffdc9a' }); spark(q.x, q.y, '#ffdc9a', 20, 2.6, 18, 0); flash = { colour: '#ffdc9a', life: 3 }; sfx('flare'); }
        else if (q.fn === 'sun') strike({ x0: q.x - 24, x1: q.x + 24, y0: q.y - 220, y1: q.y + 4 }, 12 + mods.damage, 2, null);
        delayed.splice(k, 1);
      }
    }

    // what arms.js is given to work with
    function kit() {
      return armsKit || (armsKit = liveHero({ cam: cam, pen: fpen, W: W, H: H, ctx: ctx, tileAt: tileAt, strike: strike, touch: touchCreatures, wound: wound, boxesOf: boxesOf, nearest: nearestCreature, swingBox: swingBox,
        creatures: function () { return creatures; }, projectiles: function () { return projectiles; }, mods: function () { return mods; }, weapon: function () { return weapon; }, tick: function () { return tick; }, random: random,
        spark: spark, particle: function (p) { particles.push(p); }, projectile: function (p) { p.owner = cur ? cur.index : 0; projectiles.push(p); },
        owner: function () { return cur ? cur.index : 0; }, use: function (k) { if (players[k] && !players[k].gone) use(players[k]); }, owners: function () { return players.filter(function (Q) { return !Q.gone; }).map(function (Q) { return Q.index; }); }, me: function () { return me; }, ring: function (o) { rings.push(o); }, crescent: function (o) { crescents.push(o); }, zap: function (o) { zaps.push(o); },
        blocked: blocked, heroShape: function (colour, alpha) { var nm = hero.anim in sprites.warden ? hero.anim : 'idle', img = facing('warden', nm, Math.min(hero.frame, sprites.warden[nm].length - 1), hero.dir); fpen.globalAlpha = alpha; fpen.drawImage(P.silhouette(img, colour), Math.round(hero.x) - P.warden.anchor.x - Math.round(cam.x), Math.round(hero.y) - P.warden.anchor.y - Math.round(cam.y)); fpen.globalAlpha = 1; },
        light: light, glow: glow, shake: shake, hitstop: hitstop, flash: function (colour, life) { flash = { colour: colour, life: life }; }, sfx: sfx, number: number, text: text }));
    }
    // once a step, for the room: the lights and rings anybody's weapon has left, and everything in arms.js (each effect stepped as its owner)
    function stepSharedFx() {
      var k;
      if (AR) AR.step(kit());
      for (k = pillars.length - 1; k >= 0; k--) if (--pillars[k].life <= 0) pillars.splice(k, 1);
      for (k = rings.length - 1; k >= 0; k--) { rings[k].r += rings[k].grow; if (--rings[k].life <= 0) rings.splice(k, 1); }
      for (k = spikes.length - 1; k >= 0; k--) if (--spikes[k].life <= 0) spikes.splice(k, 1);
    }
    function stepWeapons() {
      var k, b, t;
      runDelayed();
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
      if ((weapon.ability === 'dashslash' || mods.ghost) && klass.dash !== 'blink' && hero.act && hero.act.kind === 'dash' && hero.act.ticks % 3 === 1) { if (strike({ x0: hero.x - 12, x1: hero.x + 12, y0: hero.y - 24, y1: hero.y - 2 }, 2 + mods.damage, 0, null)) crescents.push({ x: hero.x, y: hero.y - 14, dir: hero.dir, r: 16, colour: weapon.trail, life: 8, max: 8 }); }
      // the rarer the weapon, the more it gives off
      var rank = rarityOf(weapon).rank;
      if (rank >= 2 && tick % (9 - rank * 2) === 0 && hero.alive) particles.push({ x: hero.x + hero.dir * (6 + random() * 6), y: hero.y - 10 - random() * 14, vx: (random() - 0.5) * 0.3, vy: -0.25 - random() * 0.3, life: 20 + random() * 16, max: 36, colour: rarityOf(weapon).colour, size: 1, gravity: -0.003 });
    }

    function drawWeaponFx() {
      // a flare left where the Lamplighter stood, brightening until it bursts
      for (var fk = flares.length - 1; fk >= 0; fk--) { var fl = flares[fk], fg = 1 - fl.t / 26; if (state === 'run' && freeze <= 0) fl.t--; fpen.fillStyle = fl.t % 4 < 2 ? '#ffffff' : '#ffdc9a'; fpen.fillRect(Math.round(fl.x) - 1 - Math.round(cam.x), Math.round(fl.y) - 3 - Math.round(cam.y), 3, 7); fpen.fillRect(Math.round(fl.x) - 3 - Math.round(cam.x), Math.round(fl.y) - 1 - Math.round(cam.y), 7, 3); light(fl.x, fl.y, 30 + fg * 40, 1); glow(fl.x, fl.y, 8 + fg * 22, '#ffdc9a', 0.3 + fg * 0.4); if (fl.t <= 0) flares.splice(fk, 1); }
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
      if (AR) AR.draw(kit());
    }
    // what follows one hero: her lash, her ribbon, her drops, her flock
    function drawOwnFx() {
      var cx = Math.round(cam.x), cy = Math.round(cam.y), k, b;
      // the whip: a living curve from the hand, cracking at its end
      if (lash) { var lc = weapon.lash || ['#4e9a52', '#c5ff9a'], p = 1 - lash.life / lash.max, ext = Math.sin(Math.min(1, p * 1.6) * Math.PI / 2) * lash.reach, hx = Math.round(hero.x) + lash.dir * 8 - cx, hy = Math.round(hero.y) - 16 - cy; fpen.strokeStyle = lc[0]; fpen.lineWidth = 2; fpen.beginPath(); fpen.moveTo(hx, hy); for (var s2 = 1; s2 <= 12; s2++) { var f = s2 / 12; fpen.lineTo(hx + lash.dir * ext * f, hy + Math.sin(f * 7 - p * 12) * 6 * (1 - f) * (1 - p) - f * 4 + f * f * 8); } fpen.stroke(); fpen.fillStyle = lc[1]; fpen.fillRect(hx + lash.dir * ext - 1, hy + 3, 3, 3); if (lash.life === lash.max - 5) spark(hero.x + lash.dir * (8 + ext), hero.y - 12, lc[1], 8, 1.8, 12, 0); }
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
      if (rnd() < 0.45) return { kind: 'weapon', id: WP.roll(rnd, run.floor, boost, hands) };
      var offered = RL.offer(held.concat(pickups.filter(function (p) { return p.kind === 'relic'; }).map(function (p) { return p.id; })), element.name, RL.POWERS[power].element, rnd, 1, run.floor, boost);
      return offered.length ? { kind: 'relic', id: offered[0].id } : { kind: 'weapon', id: WP.roll(rnd, run.floor, boost, hands) };
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
      if (p.kind === 'weapon') { takeWeapon(p.id); sfx('pickup'); }
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
      if (mods.sandglass && hero.alive && hero.hp <= 2) slowmo = true;
    }
    function stepCeremony() { ceremony.t++; if (ceremony.t > 170 || ceremony.t > 60 && (hit('attack') || hit('jump') || hit('start'))) { ceremony = null; state = 'run'; } }

    // Chladni's bell: every fifth hit rings, and the plate's still lines cut across the room
    function countHit() {
      hitCount++;
      if (mods.bell && hitCount % 5 === 0) {
        bell = { life: 50, max: 50, m: 2 + Math.floor(random() * 4), n: 1 + Math.floor(random() * 3) };
        if (bell.m === bell.n) bell.m++;
        sfx('bell'); shake(3); flash = { colour: '#ffb347', life: 6 };
        for (var k = 0; k < creatures.length; k++) { var c = creatures[k]; if (!c.dying && Math.abs(c.x - hero.x) < W / 2 + 20 && Math.abs(c.y - hero.y) < H) { AC.hurt(c, 3, hero.x, ctx); if (c.boss) c.hp -= 0; number(c.x, c.y - c.h - 8, 3, '#ffb347'); } }
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
// what the near pickup is, the infobox says, over the dark
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
    /* ---- the portal: a turning ring of the element's colour, somewhere in the stage ---- */

    var seenCells = {}, nearPortal = false;
    function portalOpen() { return !level.locked && !(level.sanctuary && !level.taken); }
    function stepPortal() {
      nearPortal = false;
      if (SND && cur === players[me]) { var hd = level.portal && portalOpen() && state === 'run' ? Math.sqrt(Math.pow(hero.x - level.door.x, 2) + Math.pow(hero.y - level.door.y, 2)) : 9999; SND.hum('portalhum', Math.max(0, 1 - hd / 260)); }
      if (!level.portal || !hero.alive || transition !== 0) return;
      var px = level.door.x, py = level.door.y - 16, open = portalOpen();
      if (open && tick % 2 === 0 && cur === firstPlayer()) { var a = random() * 6.2832, r = 22 + random() * 10; particles.push({ x: px + Math.cos(a) * r, y: py + Math.sin(a) * r * 1.3, vx: -Math.cos(a) * r / 18 - Math.sin(a) * 0.8, vy: -Math.sin(a) * r * 1.3 / 18 + Math.cos(a) * 0.8, life: 18, max: 18, colour: random() < 0.4 ? '#ffffff' : element.glow, size: 1, gravity: 0 }); }
      if (open && Math.abs(hero.x - px) < 12 && Math.abs(hero.y - level.door.y) < 26) { nearPortal = true; if (hit('up') && !prompt) { transition = 1; sfx('portal'); flash = { colour: element.glow, life: 10 }; } }
      // the chambers she has stood in are drawn on her map
      if (level.grid) { var G = level.grid, ccx = Math.floor((hero.x / TILE - 1) / G.cw), ccy = Math.floor(((hero.y - 4) / TILE - 1) / G.ch); if (ccx >= 0 && ccy >= 0 && ccx < G.gw && ccy < G.gh) seenCells[ccy * G.gw + ccx] = true; }
    }
    function drawPortal() {
      if (!level.portal) return;
      var cx = Math.round(cam.x), cy = Math.round(cam.y), px = Math.round(level.door.x) - cx, py = Math.round(level.door.y) - 16 - cy, open = portalOpen(), k, a;
      // a low plinth of the floor's own stone
      fpen.fillStyle = element.stone[2]; fpen.fillRect(px - 12, py + 14, 24, 2); fpen.fillStyle = element.stone[3]; fpen.fillRect(px - 10, py + 12, 20, 2);
      if (!open) { fpen.strokeStyle = element.stone[1]; fpen.lineWidth = 1; fpen.beginPath(); fpen.ellipse(px, py, 9, 14, 0, 0, 6.2832); fpen.stroke(); return; }
      // the dark inside it, then three rings of broken arcs turning against each other
      fpen.fillStyle = '#05040a'; fpen.beginPath(); fpen.ellipse(px, py, 8, 13, 0, 0, 6.2832); fpen.fill();
      for (k = 0; k < 3; k++) {
        var rx = 9 + k * 2.5, ry = 14 + k * 3, spin = tick * (0.05 + k * 0.02) * (k % 2 ? -1 : 1);
        fpen.strokeStyle = k === 0 ? '#ffffff' : element.glow; fpen.globalAlpha = k === 2 ? 0.5 : 1; fpen.lineWidth = k === 0 ? 1 : 1.5;
        for (a = 0; a < 3; a++) { fpen.beginPath(); fpen.ellipse(px, py, rx, ry, 0, spin + a * 2.094, spin + a * 2.094 + 1.3); fpen.stroke(); }
      }
      fpen.globalAlpha = 1;
      fpen.fillStyle = '#ffffff'; for (k = 0; k < 3; k++) { a = tick * 0.09 + k * 2.1; fpen.fillRect(px + Math.round(Math.cos(a) * 4), py + Math.round(Math.sin(a) * 8), 1, 1); }
      light(level.door.x, level.door.y - 16, 52 + 4 * Math.sin(tick * 0.1), 0.95); glow(level.door.x, level.door.y - 16, 30, element.glow, 0.3 + 0.08 * Math.sin(tick * 0.1));
    }
    // when it is near but not in sight, a glimmer at the edge of the picture, on the side it lies
    function drawPortalHint() {
      if (!level.portal || !level.grid || !portalOpen() || state !== 'run') return;
      var dx = level.door.x - (cam.x + W / 2), dy = level.door.y - 16 - (cam.y + H / 2), far = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(dx) < W / 2 - 8 && Math.abs(dy) < H / 2 - 8) return;
      if (far > 460) return;
      var s = Math.min((W / 2 - 7) / Math.max(1, Math.abs(dx)), (H / 2 - 7) / Math.max(1, Math.abs(dy))), ex = Math.round(W / 2 + dx * s), ey = Math.round(H / 2 + dy * s), strength = (1 - far / 460) * (0.5 + 0.5 * Math.sin(tick * 0.12));
      fpen.globalAlpha = Math.max(0, strength); fpen.fillStyle = element.glow; fpen.fillRect(ex - 2, ey - 2, 5, 5); fpen.fillStyle = '#ffffff'; fpen.fillRect(ex - 1, ey - 1, 3, 3); fpen.globalAlpha = 1;
    }
    // the chambers she has seen, small, under the clock; the Almanac shows them all, and the portal
    function drawChambers() {
      if (!level.grid || state !== 'run') return;
      var G = level.grid, cw = 9, ch = 6, x0 = W - 8 - G.gw * cw, y0 = 24, k;
      var here = { cx: Math.floor((hero.x / TILE - 1) / G.cw), cy: Math.floor(((hero.y - 4) / TILE - 1) / G.ch) };
      for (k = 0; k < G.cells.length; k++) {
        var c = G.cells[k], known = mods.map || seenCells[c.cy * G.gw + c.cx];
        if (c.solid || !known) continue;
        var x = x0 + c.cx * cw, y = y0 + c.cy * ch, mine = c.cx === here.cx && c.cy === here.cy;
        fpen.fillStyle = mine ? '#ffdc9a' : '#5c5a56'; fpen.fillRect(x, y, cw - 1, ch - 1);
        fpen.fillStyle = '#0b0b12'; fpen.fillRect(x + 1, y + 1, cw - 3, ch - 3);
        fpen.fillStyle = mine ? '#ffdc9a' : '#5c5a56';
        if (c.r) fpen.fillRect(x + cw - 2, y + 2, 2, 1); if (c.l) fpen.fillRect(x - 1, y + 2, 2, 1); if (c.d) fpen.fillRect(x + 3, y + ch - 2, 2, 2); if (c.u) fpen.fillRect(x + 3, y - 1, 2, 2);
        if (c.cx === G.portal.cx && c.cy === G.portal.cy) { fpen.fillStyle = (tick >> 3) % 2 ? '#ffffff' : element.glow; fpen.fillRect(x + 3, y + 1, 2, 3); }
        if (mine) { fpen.fillStyle = '#ffb347'; fpen.fillRect(x + 2 + Math.round((hero.x / TILE - 1 - c.cx * G.cw) / G.cw * 4), y + 2, 1, 1); }
      }
      if (mods.map) for (k = 0; k < chests.length; k++) if (!chests[k].open) { var qx = Math.floor((chests[k].x / TILE - 1) / G.cw), qy = Math.floor((chests[k].y / TILE - 2) / G.ch); fpen.fillStyle = rarity(chests[k].rarity).colour; fpen.fillRect(x0 + qx * cw + 6, y0 + qy * ch + 1, 1, 1); }
    }

    /* ---- the sanctuary between: a font, and three perks turning in their auras over their plinths ---- */

    var perks = [], nearPerk = null, visited = {}, rewarded = {};
    // what a fallen guardian leaves: three at random from powers not held, boons, a weapon and an item of the higher rarities
    function offerRewards(cx) {
      var rnd = WD.makeRandom(run.seed * 613 + run.stage * 97 + held.length * 5 + 11), A = level.arena, pool = [], k;
      function fresh(list) { var unseen = list.filter(function (q) { return !rewarded[q.id]; }); return unseen.length ? unseen : list; }
      function pick(list) { return list.length ? list[Math.floor(rnd() * list.length)] : null; }
      function shuffled(list) { var a = list.slice(), i2, j2, t2; for (i2 = a.length - 1; i2 > 0; i2--) { j2 = Math.floor(rnd() * (i2 + 1)); t2 = a[i2]; a[i2] = a[j2]; a[j2] = t2; } return a; }
      for (k = 0; k < 5; k++) rnd();
      var pw = pick(fresh(RL.POWER_ORDER.filter(function (id) { return id !== power; }).map(function (id) { var q = RL.POWERS[id]; return { kind: 'power', id: id, name: q.name, rarity: 'epic', line: q.line }; })));
      var boons = shuffled(fresh(RL.BOONS.filter(function (q) { return !(q.flame && flames >= 5); })));
      var wid = null; for (k = 0; k < 8 && !wid; k++) { var cand = WP.roll(rnd, run.floor + 2, true, hands); if (WP.RARITY[WP.WEAPONS[cand].rarity].rank >= 3 && !rewarded[cand]) wid = cand; }
      var high = RL.offer(held, element.name, RL.POWERS[power].element, rnd, 8, run.floor + 2, true).filter(function (q) { return rarity(q.rarity).rank >= 3; })[0];
      if (boons[0]) pool.push({ kind: 'boon', id: boons[0].id, name: boons[0].name, rarity: boons[0].rarity, line: boons[0].line });
      var others = [pw, wid ? { kind: 'weapon', id: wid, name: WP.WEAPONS[wid].name, rarity: WP.WEAPONS[wid].rarity, line: WP.WEAPONS[wid].line } : null, high ? { kind: 'relic', id: high.id, name: high.name, rarity: high.rarity, line: high.line } : null, boons[1] ? { kind: 'boon', id: boons[1].id, name: boons[1].name, rarity: boons[1].rarity, line: boons[1].line } : null].filter(Boolean);
      pool = shuffled(pool.concat(shuffled(others).slice(0, 2)));
      var mid = Math.max(A.left + 70, Math.min(A.right - 70, cx));
      level.plinths = pool.map(function (q, n) { return { x: mid + (n - (pool.length - 1) / 2) * 46, y: A.groundY }; });
      perks = pool.map(function (q, n) { rewarded[q.id] = true; return { relic: q, x: level.plinths[n].x, y: level.plinths[n].y, phase: n * 2.1, gone: 0, rise: 40 }; });
      players.forEach(function (Q) { Q.took = false; });
      banner = { t: 0, text: 'It leaves three things', sub: company() > 1 ? 'ONE EACH, AND THE DOOR WILL OPEN' : 'ONE MAY BE TAKEN, AND THE DOOR WILL OPEN', colour: element.glow };
    }
    function placePerks() {
      perks = []; nearPerk = null;
      if (!level.sanctuary) return;
      var st = STAGES[run.stage];
      if (visited[run.stage]) { level.taken = true; return; }     // risen here again after a death: the font still runs, the plinths are bare
      var rnd = WD.makeRandom(run.seed * 977 + run.stage * 131 + held.length * 7 + 5);
      var offered = RL.offer(held, element.name, RL.POWERS[power].element, rnd, 3, run.floor, !!st.boost);
      if (!offered.length) { level.taken = true; return; }
      offered.forEach(function (r, k) { var pl = level.plinths[k]; perks.push({ relic: r, x: pl.x, y: pl.y, phase: k * 2.1, gone: 0 }); });
    }
    function stepPerks() {
      nearPerk = null;
      if (!level.sanctuary && !perks.length) return;
      var k, p;
      for (k = perks.length - 1; k >= 0; k--) {
        p = perks[k];
        if (p.gone) { if (cur === firstPlayer()) { p.gone++; if (p.gone > 30) perks.splice(k, 1); } continue; }
        if (p.rise > 0 && cur === firstPlayer()) p.rise--;
        var r = rarity(p.relic.rarity), by = p.y - 30 + Math.sin(tick * 0.05 + p.phase) * 3;
        if (tick % (r.rank >= 4 ? 2 : 4) === 0 && cur === firstPlayer()) { var a = random() * 6.2832; particles.push({ x: p.x + Math.cos(a) * 12, y: by + Math.sin(a) * 12, vx: -Math.cos(a) * 0.3, vy: -0.35 - random() * 0.3, life: 26, max: 26, colour: random() < 0.3 ? '#ffffff' : r.colour, size: 1, gravity: -0.004 }); }
        if (!level.taken && !cur.took && hero.alive && Math.abs(hero.x - p.x) < 13 && Math.abs(hero.y - p.y) < 30 && (!nearPerk || Math.abs(hero.x - p.x) < Math.abs(hero.x - nearPerk.x))) nearPerk = p;
      }
      if (nearPerk && hit('up')) {
        var took = nearPerk; cur.took = true; perks.splice(perks.indexOf(took), 1);
        // one each: what is left stays until everybody who is up has chosen
        var waiting = players.some(function (Q) { return !Q.gone && Q.hero.alive && !Q.took; }) && perks.some(function (q) { return !q.gone; });
        if (!waiting) { level.taken = true; visited[run.stage] = true; perks.forEach(function (q) { q.gone = 1; spark(q.x, q.y - 30, '#5c5a56', 14, 1.4, 24, 0.02); }); }
        if (took.relic.kind === 'power') { power = took.relic.id; number(hero.x, hero.y - 34, RL.POWERS[power].name.toUpperCase(), RL.POWERS[power].colour); spark(hero.x, hero.y - 14, RL.POWERS[power].colour, 40, 2.4, 36, -0.01); flash = { colour: RL.POWERS[power].colour, life: 8 }; sfx('cast' + RL.POWERS[power].element); }
        else takePickup({ kind: took.relic.kind === 'weapon' ? 'weapon' : 'relic', id: took.relic.id, rarity: took.relic.rarity });
        if (level.boss && !waiting) { level.locked = false; sfx('door'); }
        rings.push({ x: took.x, y: took.y - 30, r: 4, grow: 3, life: 16, max: 16, colour: rarity(took.relic.rarity).colour });
        banner = { t: 0, text: took.relic.name, sub: waiting ? 'ONE IS LEFT FOR THE OTHER OF YOU' : level.boss ? 'THE DOOR IS OPEN' : 'THE WAY ON IS OPEN', colour: rarity(took.relic.rarity).colour };
        sfx('perk'); nearPerk = null;
      }
    }
    function drawPerks() {
      if (!level.sanctuary && !perks.length && !level.plinths) return;
      var cx = Math.round(cam.x), cy = Math.round(cam.y), k, j;
      // the plinths stand whether or not anything is on them
      (level.plinths || []).forEach(function (pl) { var x = Math.round(pl.x) - cx, y = Math.round(pl.y) - cy; fpen.fillStyle = element.stone[3]; fpen.fillRect(x - 6, y - 8, 12, 8); fpen.fillStyle = element.stone[2]; fpen.fillRect(x - 8, y - 10, 16, 2); fpen.fillStyle = element.top; fpen.fillRect(x - 8, y - 10, 16, 1); });
      for (k = 0; k < perks.length; k++) {
        var p = perks[k], r = rarity(p.relic.rarity), bob = Math.sin(tick * 0.05 + p.phase) * 3 + (p.rise ? p.rise * 0.7 : 0), x = Math.round(p.x) - cx, y = Math.round(p.y - 30 + bob) - cy, near = p === nearPerk, fade = p.gone ? Math.max(0, 1 - p.gone / 30) : 1;
        fpen.globalAlpha = fade;
        // rays turning behind it, more of them the rarer it is
        var rays = 4 + r.rank * 2;
        fpen.strokeStyle = r.colour; fpen.lineWidth = 1;
        for (j = 0; j < rays; j++) { var a = tick * 0.02 * (k % 2 ? -1 : 1) + j / rays * 6.2832, r0 = 8, r1 = 13 + r.rank * 2 + (j % 2) * 3 + (near ? 3 : 0); fpen.globalAlpha = fade * (0.25 + 0.2 * Math.sin(tick * 0.1 + j)); fpen.beginPath(); fpen.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); fpen.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); fpen.stroke(); }
        fpen.globalAlpha = fade;
        // the thing itself: a cut stone in its rarity's colour, turning, so it narrows and widens
        var wide = Math.abs(Math.cos(tick * 0.04 + p.phase)), hw = Math.max(1, Math.round(5 * wide));
        fpen.fillStyle = '#0b0b12'; fpen.fillRect(x - hw - 1, y - 7, hw * 2 + 2, 14);
        fpen.fillStyle = r.colour; fpen.fillRect(x - hw, y - 6, hw * 2, 12);
        fpen.fillStyle = '#0b0b12'; fpen.fillRect(x - hw - 1, y - 7, 2, 3); fpen.fillRect(x + hw - 1, y - 7, 2, 3); fpen.fillRect(x - hw - 1, y + 4, 2, 3); fpen.fillRect(x + hw - 1, y + 4, 2, 3);
        fpen.fillStyle = '#ffffff'; fpen.fillRect(x - Math.max(0, hw - 2), y - 4, Math.max(1, hw - 1), 3); fpen.fillRect(x, y + 1, 1, 2);
        if (r.rank >= 4) { var sh = (tick * 0.6 + k * 7) % 16 - 2; fpen.fillStyle = '#fff3b0'; if (sh > -6 && sh < 6) fpen.fillRect(x - hw, y + Math.round(sh), hw * 2, 1); }
        fpen.globalAlpha = 1;
        if (!p.gone) { light(p.x, p.y - 30 + bob, 34 + r.rank * 4, 0.9); glow(p.x, p.y - 30 + bob, 16 + r.rank * 4 + (near ? 6 : 0), r.colour, 0.3 + r.rank * 0.05 + 0.06 * Math.sin(tick * 0.12 + k)); }
      }
    }
    // when nothing is near enough to read, a word about what is on offer
    function drawPerkLabel() {
      if ((!level.sanctuary && !perks.length) || state !== 'run') return;
      if (!nearPerk && !level.taken && perks.length && !perks[0].gone && !banner) text(cur && cur.took ? 'YOU HAVE CHOSEN. THE OTHER OF YOU HAS NOT' : company() > 1 ? 'THREE ARE OFFERED. ONE EACH MAY BE TAKEN' : 'THREE ARE OFFERED. ONE MAY BE TAKEN', W / 2, 40, '#8f8d88', 1, 'center');
    }
    // a line of the small type broken at spaces, two lines at most
    function wrapText(s, x, y, width) {
      if (s.length <= width) { text(s, x, y, '#c4c1ba', 1, 'center'); return; }
      var cut = s.lastIndexOf(' ', width); if (cut < 0) cut = width;
      text(s.slice(0, cut), x, y, '#c4c1ba', 1, 'center'); text(s.slice(cut + 1, cut + 1 + width + 8), x, y + 8, '#c4c1ba', 1, 'center');
    }

    /* ---- the infobox: what the thing in front of her is and exactly what it does ---- */

    // everything that can be taken, described the same way: a name, a rarity, a kind, and lines that say what it does
    function describe(kind, id) {
      if (kind === 'weapon') {
        var w = WP.WEAPONS[id], reach = w.reach ? 'REACH ' + Math.round(w.reach * mods.reach) : 'RANGED';
        return { name: w.name, rarity: w.rarity, tag: 'WEAPON', icon: { kind: 'weapon', id: id }, stats: ['DAMAGE ' + w.damage.map(function (d) { return d + mods.damage; }).join(' / ') + '   ' + reach, w.strokes], lines: w.detail, foot: hands.indexOf(id) >= 0 ? 'ALREADY CARRIED' : freeHand() >= 0 ? 'GOES TO YOUR FREE HAND' : 'REPLACES ' + WP.WEAPONS[weaponId].name };
      }
      if (kind === 'power') { var pw = RL.POWERS[id]; return { name: pw.name, rarity: 'epic', tag: 'POWER', colour: pw.colour, icon: { kind: 'power', colour: pw.colour }, lines: pw.detail, foot: 'REPLACES ' + RL.POWERS[power].name }; }
      if (kind === 'heart') return { name: 'A heart', rarity: 'common', tag: 'PICKUP', icon: { kind: 'heart' }, lines: ['+Heals 1 heart'] };
      var r = RL.BY_ID[id];
      return { name: r.name, rarity: r.rarity, tag: r.boon ? 'BOON' : r.ability ? 'ITEM / ABILITY' : 'ITEM', icon: { kind: 'relic', id: id }, lines: r.detail, foot: !r.stack && held.indexOf(id) >= 0 ? 'ALREADY CARRIED' : null };
    }
    function wrapLines(s, width) {
      var words = String(s).split(' '), out = [], line = '';
      words.forEach(function (wd) { if ((line + ' ' + wd).trim().length > width) { out.push(line); line = wd; } else line = (line + ' ' + wd).trim(); });
      if (line) out.push(line);
      // no orphans: a last line of a letter or two takes the word before it for company
      if (out.length > 1 && out[out.length - 1].length <= 3) { var prev = out[out.length - 2].split(' '); if (prev.length > 1) { out[out.length - 1] = prev.pop() + ' ' + out[out.length - 1]; out[out.length - 2] = prev.join(' '); } }
      return out;
    }
    // drawn over the dark, above the thing if there is room and beside it if not, never off the picture
    function drawInfobox(info, ax, ay, verb) {
      var r = rarity(info.rarity), col = info.colour || r.colour, bw = 168, pad = 6, chars = Math.floor((bw - pad * 2 - 6) / 4), rows = [], k;
      (info.stats || []).forEach(function (st) { if (st) rows.push({ t: st, c: '#e9e6df', stat: true }); });
      info.lines.forEach(function (ln) { var good = ln[0] === '+', bad = ln[0] === '-', body = good || bad ? ln.slice(1) : ln; wrapLines(body, chars).forEach(function (piece, n) { rows.push({ t: piece, c: good ? '#9ae66e' : bad ? '#ff4f7b' : '#c4c1ba', mark: n === 0 ? (good ? '+' : bad ? '-' : null) : null }); }); });
      if (info.foot) rows.push({ t: info.foot, c: '#8f8d88', foot: true });
      var bh = 19 + rows.length * 8 + (info.stats && info.stats.length ? 3 : 0) + 13;
      var x = Math.round(Math.max(3, Math.min(W - bw - 3, ax - bw / 2))), y = Math.round(ay - 44 - bh);
      if (y < 14) { y = Math.max(14, Math.min(H - bh - 3, Math.round(ay - bh / 2))); x = ax < W / 2 ? Math.min(W - bw - 3, Math.round(ax + 22)) : Math.max(3, Math.round(ax - 22 - bw)); }
      // the panel: a dark plate, a rim in the rarity's colour, a lit band for the name
      fpen.globalAlpha = 0.94; fpen.fillStyle = '#07060b'; fpen.fillRect(x, y, bw, bh); fpen.globalAlpha = 1;
      fpen.globalAlpha = 0.22 + (r.rank >= 2 ? 0.05 * Math.sin(tick * 0.1) : 0); fpen.fillStyle = col; fpen.fillRect(x + 1, y + 1, bw - 2, 15); fpen.globalAlpha = 1;
      fpen.fillStyle = col; fpen.fillRect(x, y, bw, 1); fpen.fillRect(x, y + bh - 1, bw, 1); fpen.fillRect(x, y, 1, bh); fpen.fillRect(x + bw - 1, y, 1, bh); fpen.fillRect(x + 1, y + 16, bw - 2, 1);
      fpen.fillStyle = '#07060b'; fpen.fillRect(x, y, 1, 1); fpen.fillRect(x + bw - 1, y, 1, 1); fpen.fillRect(x, y + bh - 1, 1, 1); fpen.fillRect(x + bw - 1, y + bh - 1, 1, 1);
      if (r.rank >= 4) { var sh = (tick * 2) % (bw + 40) - 20; fpen.globalAlpha = 0.25; fpen.fillStyle = '#fff3b0'; fpen.fillRect(x + Math.max(1, sh), y + 1, Math.max(0, Math.min(8, bw - 1 - sh)), 15); fpen.globalAlpha = 1; }
      // the thing, small, in a socket; its name; its rarity on a chip
      fpen.fillStyle = '#07060b'; fpen.fillRect(x + 3, y + 3, 11, 11); fpen.fillStyle = col; fpen.fillRect(x + 3, y + 3, 11, 1); fpen.fillRect(x + 3, y + 13, 11, 1); fpen.fillRect(x + 3, y + 3, 1, 11); fpen.fillRect(x + 13, y + 3, 1, 11);
      if (info.icon.kind === 'weapon') { var v = WP.views(info.icon.id).diag.img, sc = Math.min(1, 9 / Math.max(v.width, v.height)); fpen.drawImage(v, x + 8 - Math.round(v.width * sc / 2), y + 8 - Math.round(v.height * sc / 2), Math.round(v.width * sc), Math.round(v.height * sc)); }
      else if (info.icon.kind === 'heart') { fpen.fillStyle = '#ff4f7b'; fpen.fillRect(x + 5, y + 6, 3, 3); fpen.fillRect(x + 9, y + 6, 3, 3); fpen.fillRect(x + 6, y + 9, 5, 2); fpen.fillRect(x + 8, y + 11, 1, 1); }
      else { fpen.fillStyle = col; fpen.fillRect(x + 6, y + 5, 5, 7); fpen.fillStyle = '#ffffff'; fpen.fillRect(x + 7, y + 6, 2, 2); fpen.fillStyle = '#07060b'; fpen.fillRect(x + 6, y + 5, 1, 1); fpen.fillRect(x + 10, y + 5, 1, 1); fpen.fillRect(x + 6, y + 11, 1, 1); fpen.fillRect(x + 10, y + 11, 1, 1); }
      var chip = r.name, cw = chip.length * 4 + 5, maxName = Math.floor((bw - 22 - cw - 6) / 4), nm = info.name.toUpperCase();
      text(nm.length > maxName ? nm.slice(0, maxName - 1) + '.' : nm, x + 18, y + 4, '#ffffff', 1, 'left');
      text(info.tag, x + 18, y + 10, col, 1, 'left');
      fpen.fillStyle = col; fpen.fillRect(x + bw - cw - 4, y + 4, cw, 9); text(chip, x + bw - cw - 1, y + 6, '#07060b', 1, 'left');
      // what it does, line by line
      var ty = y + 20;
      for (k = 0; k < rows.length; k++) {
        var row = rows[k];
        if (row.foot) { fpen.fillStyle = '#2b2836'; fpen.fillRect(x + pad, ty - 1, bw - pad * 2, 1); ty += 2; }
        if (row.stat) { text(row.t, x + pad, ty, row.c, 1, 'left'); ty += 8; if (!rows[k + 1] || !rows[k + 1].stat) { fpen.fillStyle = '#2b2836'; fpen.fillRect(x + pad, ty - 1, bw - pad * 2, 1); ty += 3; } continue; }
        if (row.mark) { fpen.fillStyle = row.c; fpen.fillRect(x + pad, ty + 2, 3, 1); if (row.mark === '+') fpen.fillRect(x + pad + 1, ty + 1, 1, 3); }
        text(row.t, x + pad + (row.foot ? 0 : 6), ty, row.c, 1, 'left'); ty += 8;
      }
      // the key, on a cap
      var label = verb || 'TAKE', kx = x + bw - pad - (label.length * 4 + 14), ky = y + bh - 11;
      fpen.fillStyle = '#e9e6df'; fpen.fillRect(kx, ky, 9, 9); fpen.fillStyle = '#8f8d88'; fpen.fillRect(kx, ky + 8, 9, 1); text('E', kx + 3, ky + 2, '#07060b', 1, 'left'); text(label, kx + 13, ky + 2, '#ffffff', 1, 'left');
      // a tick from the box toward the thing
      if (y + bh < ay - 30) { fpen.fillStyle = col; var px = Math.max(x + 6, Math.min(x + bw - 7, Math.round(ax))); fpen.fillRect(px - 2, y + bh, 5, 1); fpen.fillRect(px - 1, y + bh + 1, 3, 1); fpen.fillRect(px, y + bh + 2, 1, 1); }
    }
    function drawInfoboxes() {
      if (state !== 'run') return;
      var cx = Math.round(cam.x), cy = Math.round(cam.y);
      if (prompt) drawInfobox(describe(prompt.kind, prompt.id), Math.round(prompt.x) - cx, Math.round(prompt.y) - cy + 16, prompt.kind === 'weapon' && freeHand() < 0 ? 'SWAP' : 'TAKE');
      else if (nearPerk) drawInfobox(describe(nearPerk.relic.kind === 'power' ? 'power' : nearPerk.relic.kind === 'weapon' ? 'weapon' : 'relic', nearPerk.relic.id), Math.round(nearPerk.x) - cx, Math.round(nearPerk.y) - cy - 8, nearPerk.relic.kind === 'power' || nearPerk.relic.kind === 'weapon' ? 'SWAP' : 'TAKE');
    }

    function drawMap() {
      if (!mods.map || state !== 'run' || level.grid) return;
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
    function hitstop(frames) { freeze = Math.max(freeze, players.length > 1 ? Math.min(2, frames) : frames); }

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
      var tx = hero.x + hero.dir * 28 - W / 2, ty = hero.y - H * 0.62 + Math.max(0, Math.min(46, (hero.vy - 2.5) * 16));
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
      Q: ['###', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
      U: ['#.#', '#.#', '#.#', '#.#', '.#.'], V: ['#.#', '#.#', '#.#', '.#.', '.#.'], W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
      Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
      0: ['.#.', '#.#', '#.#', '#.#', '.#.'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
      4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'], 6: ['.##', '#..', '##.', '#.#', '.#.'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
      8: ['.#.', '#.#', '.#.', '#.#', '.#.'], 9: ['.#.', '#.#', '.##', '..#', '##.'],
      '.': ['...', '...', '...', '...', '.#.'], ',': ['...', '...', '...', '.#.', '#..'], ':': ['...', '.#.', '...', '.#.', '...'], '-': ['...', '...', '###', '...', '...'],
      '/': ['..#', '..#', '.#.', '#..', '#..'], '!': ['.#.', '.#.', '.#.', '...', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'], "'": ['.#.', '.#.', '...', '...', '...'],
      '%': ['#..', '..#', '.#.', '#..', '..#'], '(': ['.#.', '#..', '#..', '#..', '.#.'], ')': ['.#.', '..#', '..#', '..#', '.#.'], '+': ['...', '.#.', '###', '.#.', '...'], '—': ['...', '...', '###', '...', '...']
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
      var ox = Math.round(cam.x * 0.35) % 96, band = 184, oyAll = Math.round(cam.y * 0.2), k, ax;
      for (var oy = oyAll; 40 - oy < H; oy -= band) {
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
          } else if (name === 'brine') {
            // the stacks: shelves of drowned books in every arch, and a drip
            for (var sh = 0; sh < 3; sh++) { var shy = 44 + sh * 22 - oy; fpen.fillStyle = element.stone[3]; fpen.fillRect(ax - 30, shy + 12, 60, 2); for (var bk = 0; bk < 11; bk++) { var bh = 7 + ((seed + bk * 3 + sh * 5) % 5); if ((seed + bk + sh) % 7 === 0) continue; fpen.fillStyle = ['#1f4a46', '#2a3f52', '#3f3a2a', '#24504a'][(seed + bk * 2 + sh) % 4]; fpen.fillRect(ax - 28 + bk * 5, shy + 12 - bh, 4, bh); } }
            var dr = (tick + seed * 23) % 110; if (dr < 40) { fpen.fillStyle = element.hazardColours[1]; fpen.fillRect(ax + 12 - seed * 5, 30 + dr * 2 - oy, 1, 2); }
          } else if (name === 'cogs') {
            // the works: a great wheel in every arch, turning one way and then the next
            var ca = tick * 0.006 * (k % 2 ? 1 : -1) + seed, cr = 26 + seed * 2; fpen.fillStyle = element.stone[3]; fpen.beginPath();
            for (var ct = 0; ct < 24; ct++) { var crr = ct % 2 ? cr : cr - 5, can = ca + ct / 24 * 6.2832; if (ct) fpen.lineTo(ax + Math.cos(can) * crr, 84 - oy + Math.sin(can) * crr); else fpen.moveTo(ax + Math.cos(can) * crr, 84 - oy + Math.sin(can) * crr); }
            fpen.fill(); fpen.fillStyle = element.sky[0]; fpen.beginPath(); fpen.arc(ax, 84 - oy, cr - 12, 0, 6.2832); fpen.fill();
            fpen.fillStyle = element.stone[3]; for (var cs = 0; cs < 3; cs++) { fpen.save(); fpen.translate(ax, 84 - oy); fpen.rotate(ca + cs * 2.0944); fpen.fillRect(-2, -cr + 6, 4, cr * 2 - 12); fpen.restore(); }
          } else if (name === 'shards') {
            // the hall of glass: a tall pane in every arch, and a glint that crosses it now and then
            fpen.fillStyle = '#2a1f2c'; fpen.fillRect(ax - 13, 40 - oy, 26, 76); fpen.fillStyle = '#3d2c40'; fpen.fillRect(ax - 11, 42 - oy, 22, 72);
            fpen.fillStyle = '#4f3a52'; fpen.fillRect(ax - 11, 42 - oy, 22, 1); fpen.fillRect(ax - 11, 42 - oy, 1, 72);
            var gl = (tick + seed * 41 + k * 29) % 200; if (gl < 30) { fpen.globalAlpha = 0.5; fpen.fillStyle = element.hazardColours[2]; fpen.beginPath(); fpen.moveTo(ax - 1 + gl * 0.3, 42 - oy); fpen.lineTo(ax + 2 + gl * 0.3, 42 - oy); fpen.lineTo(ax - 8 + gl * 0.3, 114 - oy); fpen.lineTo(ax - 11 + gl * 0.3, 114 - oy); fpen.fill(); fpen.globalAlpha = 1; }
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
        if (level.rows <= 20) break;
      }
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
          if (element.hazard !== 'ice') light(tx * TILE + 8, ty * TILE + 8, 22, element.hazard === 'brine' ? 0.3 : 0.5);
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
      if (level.portal) { drawPortal(); drawPerks(); return; }
      var dx = Math.round(level.door.x) - cx, dy = Math.round(level.door.y) - cy;
      fpen.fillStyle = element.stone[3]; fpen.fillRect(dx - 9, dy - 26, 18, 26);
      fpen.fillStyle = '#030306'; fpen.fillRect(dx - 7, dy - 24, 14, 24);
      fpen.fillStyle = element.top; fpen.fillRect(dx - 9, dy - 27, 18, 1); fpen.fillRect(dx - 9, dy - 26, 1, 26); fpen.fillRect(dx + 8, dy - 26, 1, 26);
      for (k = 0; k < 4; k++) { fpen.fillStyle = k % 2 ? element.stone[1] : element.stone[2]; fpen.fillRect(dx - 7, dy - 6 + k * 1.5, 14, 1); }
      if (level.locked) { fpen.fillStyle = element.stone[2]; for (k = 0; k < 3; k++) fpen.fillRect(dx - 6 + k * 5, dy - 24, 2, 24); } else light(level.door.x, level.door.y - 12, 34, 0.6);
      drawPerks();
    }

    function drawHero() {
      var frames = sprites.warden[hero.anim] || sprites.warden.idle, k = Math.min(hero.frame, frames.length - 1);
      var img = facing('warden', hero.anim in sprites.warden ? hero.anim : 'idle', k, hero.dir);
      if (hero.invuln > 0 && hero.alive && !(hero.act && hero.act.kind === 'dash') && (tick >> 2) % 2 === 0) fpen.globalAlpha = 0.45;
      if (!hero.alive && hero.deadFor > 70) fpen.globalAlpha = Math.max(0, 1 - (hero.deadFor - 70) / 40);
      var x = Math.round(hero.x) - P.warden.anchor.x - Math.round(cam.x), y = Math.round(hero.y) - P.warden.anchor.y - Math.round(cam.y);
      fpen.drawImage(hero.flash > 0 ? P.silhouette(img, '#ffffff') : img, x, y);
      if (afflictions.chill > 0) { fpen.globalAlpha = 0.45; fpen.drawImage(P.silhouette(img, '#9fd8ff'), x, y); fpen.globalAlpha = 1; }
      if (afflictions.soak > 0) { fpen.globalAlpha = 0.3; fpen.drawImage(P.silhouette(img, '#2fae9e'), x, y); fpen.globalAlpha = 1; }
      fpen.globalAlpha = 1;
      // the lantern's light travels with the hand
      if (hero.alive) light(hero.x - hero.dir * 7, hero.y - 12, Math.round((78 + (hero.act && hero.act.kind === 'cast' ? 40 : 0)) * mods.lantern), 1, true);
    }

    /* the two hands, bottom left: the weapon in use in the larger frame, the other beside it, each in its rarity's colour.
       When they change, the frames trade places over a few steps. */
    var SLOT_A = { x: 4, y: H - 31, s: 27 }, SLOT_B = { x: 34, y: H - 22, s: 18 };
    function drawSlot(id, x, y, s, lit) {
      var w = id ? WP.WEAPONS[id] : null, r = w ? rarityOf(w) : null, col = w ? r.colour : '#3a3936', k;
      fpen.fillStyle = 'rgba(8,8,14,0.78)'; fpen.fillRect(x, y, s, s);
      if (w && r.rank > 0) { fpen.globalAlpha = (lit ? 0.16 : 0.07) + (lit ? 0.06 * Math.sin(tick * 0.08) : 0); fpen.fillStyle = col; fpen.fillRect(x + 1, y + 1, s - 2, s - 2); fpen.globalAlpha = 1; }
      fpen.globalAlpha = lit ? 1 : 0.55; fpen.fillStyle = col;
      fpen.fillRect(x, y, s, 1); fpen.fillRect(x, y + s - 1, s, 1); fpen.fillRect(x, y, 1, s); fpen.fillRect(x + s - 1, y, 1, s);
      fpen.fillStyle = '#0b0b12'; fpen.fillRect(x, y, 1, 1); fpen.fillRect(x + s - 1, y, 1, 1); fpen.fillRect(x, y + s - 1, 1, 1); fpen.fillRect(x + s - 1, y + s - 1, 1, 1);
      if (w) {
        var v = WP.views(id).diag.img, room = s - 4, sc = Math.min(1, room / Math.max(v.width, v.height)), vw = Math.max(1, Math.round(v.width * sc)), vh = Math.max(1, Math.round(v.height * sc));
        fpen.drawImage(v, x + Math.round((s - vw) / 2), y + Math.round((s - vh) / 2), vw, vh);
        // a legendary thing does not sit still in its frame: a mote runs round the edge
        if (r.rank >= 4 && lit) { var per = (s - 1) * 4, at = (tick * 0.6) % per; for (k = 0; k < 3; k++) { var a = (at - k * 2 + per) % per, mx = a < s - 1 ? a : a < 2 * (s - 1) ? s - 1 : a < 3 * (s - 1) ? 3 * (s - 1) - a : 0, my = a < s - 1 ? 0 : a < 2 * (s - 1) ? a - (s - 1) : a < 3 * (s - 1) ? s - 1 : per - a; fpen.globalAlpha = 1 - k * 0.3; fpen.fillStyle = '#ffffff'; fpen.fillRect(x + Math.round(mx), y + Math.round(my), 1, 1); } }
      }
      fpen.globalAlpha = 1;
    }
    function drawHands() {
      if (swapT > 0 && state === 'run') swapT--;
      var f = swapT / 12, e = f * f, other = 1 - handIn;
      function between(a, b) { return { x: Math.round(a.x + (b.x - a.x) * e), y: Math.round(a.y + (b.y - a.y) * e), s: Math.round(a.s + (b.s - a.s) * e) }; }
      var back = between(SLOT_B, SLOT_A), fore = between(SLOT_A, SLOT_B);
      drawSlot(hands[other], back.x, back.y, back.s, false);
      drawSlot(hands[handIn], fore.x, fore.y, fore.s, true);
      text(weapon.name, 4, H - 40, rarityOf(weapon).colour);
      if (hands[other]) text(touchy ? 'SWAP' : 'Q', SLOT_B.x + SLOT_B.s + 3, H - 10, '#8f8d88');
    }
    function drawHud() {
      var k;
      for (k = 0; k < hero.maxHp; k++) {
        fpen.fillStyle = k < hero.hp ? '#ff4f7b' : '#3a3936';
        fpen.fillRect(4 + k * 9, 4, 7, 6); fpen.fillRect(5 + k * 9, 10, 5, 1); fpen.fillRect(6 + k * 9, 11, 3, 1); fpen.fillRect(7 + k * 9, 12, 1, 1);
        fpen.fillStyle = '#0b0b12'; fpen.fillRect(4 + k * 9, 4, 1, 1); fpen.fillRect(7 + k * 9, 4, 1, 1); fpen.fillRect(10 + k * 9, 4, 1, 1);
      }
      for (k = 0; k < Math.max(3, flames); k++) { var flx = 8 + hero.maxHp * 9 + k * 7; fpen.fillStyle = k < flames ? '#ffb347' : '#3a3936'; fpen.fillRect(flx, 7, 3, 5); fpen.fillRect(flx + 1, 5, 1, 2); if (k < flames) { fpen.fillStyle = '#ffdc9a'; fpen.fillRect(flx + 1, 9, 1, 2); } }
      for (k = 0; k < hero.maxEnergy; k++) { fpen.fillStyle = k < hero.energy ? (afflictions.jam > 0 ? '#7a5a1e' : '#ffb347') : '#3a3936'; fpen.fillRect(4 + k * 6, 16, 4, 4); }
      if (afflictions.cut > 0 && (tick >> 3) % 2 === 0 && hero.hp > 0) { fpen.fillStyle = '#ff9ecb'; fpen.fillRect(4 + (hero.hp - 1) * 9, 13, 7, 1); }
      text(level.sanctuary ? 'A STILL PLACE' : element.title + '  ' + run.floor + '-' + (run.section >= 3 ? 'GUARDIAN' : (run.section + 1)), W - 4, 4, '#8f8d88', 1, 'right');
      text(timeText(Math.floor(clockSeconds)) + '  SEED ' + run.seed, W - 4, 12, '#5c5a56', 1, 'right');
      var pw = RL.POWERS[power];
      fpen.fillStyle = pw.colour; fpen.fillRect(4 + hero.maxEnergy * 6 + 4, 16, 4, 4);
      text(pw.name, 4 + hero.maxEnergy * 6 + 11, 16, pw.colour);
      if (mods.shield) { fpen.fillStyle = shieldUp > 0 ? '#3a3936' : '#ffdc9a'; fpen.fillRect(4, 24, 8, 2); }
      if (state === 'run' || state === 'paused') drawHands();
      if (state === 'run' || state === 'paused') for (k = 0; k < players.length; k++) {
        var OQ = players[k]; if (OQ === cur || OQ.gone) continue;
        var oh = OQ.hero, ox = Math.round(oh.x - cam.x), oy = Math.round(oh.y - cam.y) - 34, inside = ox > 8 && ox < W - 8 && oy > 18 && oy < H - 8, tag = 'P' + (k + 1), oc = oh.alive ? '#9fd8ff' : '#5c5a56', pip;
        if (!inside) { ox = Math.max(14, Math.min(W - 14, ox)); oy = Math.max(30, Math.min(H - 44, oy)); }
        text(tag, ox, oy - 8, oc, 1, 'center');
        for (pip = 0; pip < oh.maxHp; pip++) { fpen.fillStyle = pip < oh.hp ? '#ff4f7b' : '#3a3936'; fpen.fillRect(ox - oh.maxHp * 2 + pip * 4, oy, 3, 2); }
        if (!inside) { var ang = Math.atan2(oh.y - 34 - cam.y - oy, oh.x - cam.x - ox); fpen.fillStyle = oc; fpen.fillRect(Math.round(ox + Math.cos(ang) * 9) - 1, Math.round(oy - 3 + Math.sin(ang) * 9) - 1, 3, 3); fpen.fillRect(Math.round(ox + Math.cos(ang) * 6), Math.round(oy - 3 + Math.sin(ang) * 6), 1, 1); }
        if (!oh.alive) text('DOWN', ox, oy + 5, '#ff4f7b', 1, 'center');
      }
      for (k = 0; k < held.length; k++) { var rel = RL.BY_ID[held[k]]; var rc = rel && rel.element ? WD.ELEMENTS.filter(function (el) { return el.name === rel.element; })[0].glow : '#c4c1ba'; fpen.fillStyle = rc; fpen.fillRect(W - 8 - k * 6, 14, 4, 4); }
      if (state === 'title') drawTitle();
      if (state === 'choose') drawChoose();
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
        loadSection(); placeCreatures(); spawnAll();
        particles.length = 0; afterimages.length = 0; numbers.length = 0; if (AR) AR.clear();
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
      drawing = true;
      var sx = cam.shake > 0 ? (random() - 0.5) * cam.shake * 2 : 0, sy = cam.shake > 0 ? (random() - 0.5) * cam.shake * 2 : 0;
      cam.x += sx; cam.y += sy;
      drawBackdrop();
      drawTiles();
      drawChestsAndPickups();
      drawHazards();
      drawCreatures();
      var mine = cur, dk;
      for (dk = 0; dk < players.length; dk++) if (players[dk] !== mine && !players[dk].gone) { use(players[dk]); drawHero(); drawOwnFx(); }
      use(mine); drawHero(); drawOwnFx();
      drawWeaponFx(); use(mine);
      drawCrescents();
      drawFx();
      drawDark(0.97 + 0.03 * Math.sin(tick * 0.4) + (hero.act && hero.act.kind === 'cast' ? 0.15 : 0));
      drawTelegraphs();
      drawGlows();
      drawBoxes();
      drawFlash();
      if (AR) { var overFor = cur; AR.over(kit()); use(overFor); }
      drawTransition();
      drawHud();
      drawMap(); drawChambers(); drawPortalHint(); drawPerkLabel();
      if (nearPortal && !prompt && state === 'run') text('E: STEP THROUGH', Math.round(level.door.x - cam.x), Math.round(level.door.y - cam.y) - 46, '#ffffff', 1, 'center');
      drawBossBar();
      if (!(prompt || nearPerk)) drawBanner();   // a banner never covers what she is reading
      if (notice) { notice.t++; var nw = textWidth(notice.text, 1) + 12; fpen.fillStyle = 'rgba(8,8,14,0.82)'; fpen.fillRect(Math.round(W / 2 - nw / 2), 58, nw, 13); text(notice.text, W / 2, 62, (notice.t >> 4) % 2 ? '#9fd8ff' : '#e9e6df', 1, 'center'); if (notice.t > 360 && !(session && session.waiting())) notice = null; }
      drawInfoboxes();
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
      drawing = false;
    }

    /* ---- the run: its seed, its clock, its end, and what is kept between runs ---- */

    var SND = window.Sound;
    function sfx(name) { if (SND) SND.play(name); }
    var STORE = 'undercroft';
    var kept = { best: 0, wins: 0, runs: 0, fastest: 0, unlocked: ['emberwave'], sound: false, klass: 'warden' };
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
      reflected: 'The true mirror carries your lantern.',
      regulator: 'The other half of the hall is safe.', weight: 'It strikes the hour. Count, and do not stand on the mark.',
      bellkeeper: 'A bell can be rung from outside.', toll: 'Low rings are jumped. High rings are stood under.', diver: 'The harpoon goes where the line was drawn.', angler: 'When the lure goes out, move.', winder: 'It runs down. Wait for it.', governor: 'What it throws comes back.', cog: 'What it throws comes back.', reflection: 'Its back is not a mirror.', prism: 'One beam becomes three at the mark.',
      cogs: 'The works do not stop for you.', shards: 'Glass remembers being sharp.', spikes: 'Spikes are not a floor.', lava: 'The kilns are lit.', ice: 'Ice keeps its own counsel.', rail: 'The rails carry more than trains.', spores: 'Do not breathe in the cisterns.', voidpool: 'The vault does not give back.',
      fall: 'The floor is optional. So is the bottom.', imp: 'When the bellows swell, be elsewhere.', lantern: 'Embers fall in arcs. Walk under them.', crab: 'Do not stand by a shut shell.', owl: 'The owl shows you its line first.', hound: 'The hound crouches before it leaps.', jelly: 'Never stand under a jelly whose arms have gone stiff.', puff: 'Pop it while it swells, or stand well back.', watcher: 'The line it draws is the line it burns.', toad: 'The toad\u2019s tongue is longer than you think.', shade: 'When the shade vanishes, turn round.', 
      thornmother: 'She cannot come to you. Everything she has must.', orrery: 'What orbits can be walked between.', pod: 'A pod is a bramble that has not landed yet.', pollen: 'Pollen is slow. So is forgetting it is there.',
      golem: 'The golem strikes where it looked.', wyrm: 'The wyrm tells you where it will fly.', herald: 'The herald is never where the bolt is.', lightless: 'It was you, and then it was not.', coal: 'Where a coal lands, the floor burns.', icicle: 'What hangs will fall.',
      burn: 'Burning does not stop when the flame does.', poison: 'Poison keeps count.', wave: 'The ground can come at you.', beam: 'The beam bends.', shard: 'Hail falls straight.'
    };
    function endRun(wonRun) {
      var floorsDown = wonRun ? FLOORS.length : run.floor;
      kept.runs++;
      var unlocked = [];
      if (floorsDown >= 2 && kept.unlocked.indexOf('frostlance') < 0) { kept.unlocked.push('frostlance'); unlocked.push('Frostlance'); }
      if (floorsDown >= 3 && kept.unlocked.indexOf('stormchain') < 0) { kept.unlocked.push('stormchain'); unlocked.push('Stormchain'); }
      if (floorsDown >= 4 && kept.unlocked.indexOf('bloomburst') < 0) { kept.unlocked.push('bloomburst'); unlocked.push('Bloomburst'); }
      if (floorsDown > kept.best) kept.best = floorsDown;
      if (wonRun) { kept.wins++; if (!kept.fastest || clockSeconds < kept.fastest) kept.fastest = Math.round(clockSeconds); }
      save();
      if (SND) SND.hum('portalhum', 0);
      if (wonRun) sfx('victory');
      var mineAtEnd = players[me] || cur; store();
      summary = { who: mineAtEnd.klass.name, company: company(), won: wonRun, floor: run.floor, section: run.section, kills: kills, seconds: Math.round(clockSeconds), relics: mineAtEnd.held.slice(), seed: run.seed, lesson: wonRun ? 'Nothing carried back up but what you learned.' : (LESSONS[mineAtEnd.lastHurtBy] || 'The undercroft draws itself again.'), unlocked: unlocked, ticks: 0 };
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
      text(summary.won ? 'YOU CAME BACK UP' : summary.floor === FLOORS.length ? 'YOU FELL IN THE VAULT' : 'YOU FELL ON FLOOR ' + summary.floor, W / 2, y, summary.won ? '#ffdc9a' : '#ff4f7b', 2, 'center'); y += 22;
      text(summary.lesson, W / 2, y, '#e9e6df', 1, 'center'); y += 18;
      text((summary.won ? 'EIGHT FLOORS AND THE VAULT' : (summary.floor === FLOORS.length ? 'THE VAULT' : 'FLOOR ' + summary.floor) + (summary.section >= 3 ? ', AT THE GUARDIAN' : ', SECTION ' + (summary.section + 1))) + '   ' + (summary.who ? summary.who.toUpperCase() + '   ' : '') + summary.kills + ' SLAIN   ' + timeText(summary.seconds), W / 2, y, '#8f8d88', 1, 'center'); y += 12;
      text('SEED ' + summary.seed, W / 2, y, '#8f8d88', 1, 'center'); y += 16;
      if (summary.relics.length) { text('CARRIED: ' + summary.relics.map(function (id) { return RL.BY_ID[id].name; }).join(', ').toUpperCase(), W / 2, y, '#c4c1ba', 1, 'center'); y += 12; }
      if (summary.unlocked.length) { text(summary.unlocked.join(' AND ').toUpperCase() + ' UNLOCKED', W / 2, y, '#ffb347', 1, 'center'); y += 12; }
      text('BEST: FLOOR ' + kept.best + (kept.wins ? '   WON ' + kept.wins + (kept.fastest ? ' (BEST ' + timeText(kept.fastest) + ')' : '') : '') + '   RUNS ' + kept.runs, W / 2, y + 6, '#8f8d88', 1, 'center');
      if (summary.ticks > 40 && (tick >> 4) % 2 === 0) text('PRESS TO GO ON', W / 2, H - 22, '#e9e6df', 1, 'center');
    }
    // the title: the seed, the best, and the starting power to choose among what is unlocked
    /* ---- who goes down: four on plinths, the chosen one showing what is theirs ---- */

    var choose = { index: 0, t: 0 };
    function enterChoose() { state = 'choose'; choose.index = Math.max(0, CL.ORDER.indexOf(kept.klass || classId)); choose.t = 0; sfx('select'); }
    function stepChoose() {
      var n = CL.ORDER.length;
      choose.t++;
      if (hit('left')) { choose.index = (choose.index + n - 1) % n; choose.t = 0; sfx('select'); }
      if (hit('right')) { choose.index = (choose.index + 1) % n; choose.t = 0; sfx('select'); }
      if (hit('dash') || hit('pause')) { state = 'title'; return; }
      if (choose.t > 8 && (hit('start') || hit('jump') || hit('attack') || hit('up'))) { sfx('confirm'); pickClass(CL.ORDER[choose.index]); kept.klass = classId; save(); var c = chosenSeed(); run.seed = c.seed; begin(); }
    }
    // what the chosen one does while you look: stands, runs, strikes, dashes, and whatever else is theirs
    function showcase(K, F, t) {
      var swing = WP.MOVESETS[WP.WEAPONS[K.weapon].moveset][0], reel = [['idle', 40, 10], ['run', 48, 5], [swing.anim, 28, 6], ['dash', 16, 6]];
      if (F.flip) reel.push(['flip', 32, 2]); else reel.push(['cast', 25, 5]);
      var total = 0, k; for (k = 0; k < reel.length; k++) total += reel[k][1];
      var at = t % total;
      for (k = 0; k < reel.length; k++) { if (at < reel[k][1]) { var frames = F[reel[k][0]] || F.idle; return frames[Math.floor(at / reel[k][2]) % frames.length]; } at -= reel[k][1]; }
      return F.idle[0];
    }
    function drawChoose() {
      var n = CL.ORDER.length, gap = 84, x0 = W / 2 - gap * (n - 1) / 2, k, j;
      fpen.fillStyle = '#07060b'; fpen.fillRect(0, 0, W, H);
      for (var sk = 0; sk < 40; sk++) { fpen.fillStyle = sk % 3 ? '#2b2836' : '#4a4560'; fpen.fillRect((sk * 97 + (tick >> 3)) % W, (sk * 53) % 84 + 24, 1, 1); }
      text('WHO GOES DOWN', W / 2, 12, '#e9e6df', 2, 'center');
      for (k = 0; k < n; k++) {
        var K = CL.CLASSES[CL.ORDER[k]], chosen = k === choose.index, x = Math.round(x0 + k * gap), base = 92;
        var F = P.hero.build(K.id, K.weapon, WP.views(K.weapon)), img = chosen ? showcase(K, F, choose.t) : F.idle[Math.floor(tick / 14) % F.idle.length];
        // the plinth, and the light on it
        fpen.fillStyle = '#1c1a24'; fpen.fillRect(x - 17, base, 34, 5); fpen.fillStyle = '#2b2836'; fpen.fillRect(x - 15, base + 5, 30, 7); fpen.fillStyle = chosen ? K.colour : '#4a4560'; fpen.fillRect(x - 17, base, 34, 1);
        if (chosen) { var lg = fpen.createRadialGradient(x, base - 14, 2, x, base - 14, 44); lg.addColorStop(0, K.colour); lg.addColorStop(1, 'rgba(0,0,0,0)'); fpen.globalAlpha = 0.22 + 0.05 * Math.sin(tick * 0.08); fpen.fillStyle = lg; fpen.fillRect(x - 44, base - 58, 88, 88); fpen.globalAlpha = 1; }
        fpen.globalAlpha = chosen ? 1 : 0.4;
        fpen.drawImage(img, x - P.hero.anchor.x, base - P.hero.anchor.y);
        fpen.globalAlpha = 1;
        text(K.name.replace('The ', '').toUpperCase(), x, base + 16, chosen ? '#ffdc9a' : '#5c5a56', 1, 'center');
        if (chosen) { fpen.fillStyle = '#ffdc9a'; fpen.fillRect(x - 14, base + 24, 28, 1); fpen.fillStyle = '#8f8d88'; for (j = 0; j < 4; j++) { fpen.fillRect(x - 28 - j, base - 22 + j, 1, 7 - j * 2); fpen.fillRect(x + 28 + j, base - 22 + j, 1, 7 - j * 2); } }
      }
      var C = CL.CLASSES[CL.ORDER[choose.index]], wp = WP.WEAPONS[C.weapon], y = 126;
      text(C.name.toUpperCase(), W / 2, y, C.colour, 2, 'center'); y += 15;
      text(C.line.toUpperCase(), W / 2, y, '#e9e6df', 1, 'center'); y += 10;
      // hearts, energy, and what is in the hand
      var wide = C.hp * 8 + 8 + C.energy * 6 + 10 + wp.name.length * 4, hx = Math.round(W / 2 - wide / 2);
      for (j = 0; j < C.hp; j++) { fpen.fillStyle = '#ff4f7b'; fpen.fillRect(hx + j * 8, y, 3, 3); fpen.fillRect(hx + j * 8 + 3, y, 3, 3); fpen.fillRect(hx + j * 8 + 1, y + 3, 4, 2); fpen.fillRect(hx + j * 8 + 2, y + 5, 2, 1); }
      hx += C.hp * 8 + 8;
      for (j = 0; j < C.energy; j++) { fpen.fillStyle = '#ffb347'; fpen.fillRect(hx + j * 6, y + 1, 4, 4); }
      hx += C.energy * 6 + 10;
      text(wp.name.toUpperCase(), hx, y, WP.RARITY[wp.rarity].colour, 1, 'left'); y += 11;
      for (j = 0; j < C.traits.length; j++) { text(C.traits[j].toUpperCase(), W / 2, y, '#8f8d88', 1, 'center'); y += 8; }
      text('LEFT AND RIGHT TO CHOOSE   JUMP OR ATTACK TO GO DOWN   DASH TO GO BACK', W / 2, H - 9, '#5c5a56', 1, 'center');
    }

    function stepTitle() {
      var options = kept.unlocked;
      if (hit('left')) { startPower = (startPower + options.length - 1) % options.length; sfx('select'); }
      if (hit('right')) { startPower = (startPower + 1) % options.length; sfx('select'); }
      power = options[Math.min(startPower, options.length - 1)];
      if (hit('start') || hit('jump') || hit('attack')) enterChoose();
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
      text('C OR L DASH   V OR I CAST   E OR UP TAKES   Q CHANGES WEAPON', W / 2, 170, '#8f8d88', 1, 'center');
      text('ENTER TO CHOOSE WHO GOES', W / 2, 180, '#8f8d88', 1, 'center');
    }

    /* ---- the loop and the room's wiring ---- */

    /* ---- who is playing ----
       Everything that belongs to one hero (the body, the class and its frames, hands, items, power, afflictions, the
       weapon effects that follow her, what she stands next to, her buttons) lives in loose variables above, because
       that is how a one-hero game was written. A player is a record of all of them. `use(P)` puts the loaded
       player's away and takes P's out, so every function above works on whoever is loaded, unchanged. One player
       is simply a list of one. Outside step() the local player (`me`) is always the one loaded. */
    var players = [], me = 0, cur = null, roster = null, rosterMe = 0;
    function store() {
      var Q = cur; if (!Q) return;
      Q.hero = hero; Q.classId = classId; Q.klass = klass; Q.sprites = sprites; Q.afflictions = afflictions;
      Q.power = power; Q.held = held; Q.mods = mods; Q.casts = casts; Q.shieldUp = shieldUp;
      Q.weaponId = weaponId; Q.weapon = weapon; Q.swings = swings; Q.hands = hands; Q.handIn = handIn; Q.swapT = swapT;
      Q.ribbon = ribbon; Q.droplets = droplets; Q.flock = flock; Q.lash = lash; Q.delayed = delayed; Q.reaped = reaped; Q.hitCount = hitCount;
      Q.airJumped = airJumped; Q.pounding = pounding; Q.onIce = onIce; Q.slick = slick;
      Q.prompt = prompt; Q.nearPerk = nearPerk; Q.nearPortal = nearPortal; Q.lastHurtBy = lastHurtBy; Q.pad = pad;
    }
    function use(Q) {
      if (Q === cur) return Q;
      store(); cur = Q;
      hero = Q.hero; classId = Q.classId; klass = Q.klass; sprites = Q.sprites; afflictions = Q.afflictions;
      power = Q.power; held = Q.held; mods = Q.mods; casts = Q.casts; shieldUp = Q.shieldUp;
      weaponId = Q.weaponId; weapon = Q.weapon; swings = Q.swings; hands = Q.hands; handIn = Q.handIn; swapT = Q.swapT;
      ribbon = Q.ribbon; droplets = Q.droplets; flock = Q.flock; lash = Q.lash; delayed = Q.delayed; reaped = Q.reaped; hitCount = Q.hitCount;
      airJumped = Q.airJumped; pounding = Q.pounding; onIce = Q.onIce; slick = Q.slick;
      prompt = Q.prompt; nearPerk = Q.nearPerk; nearPortal = Q.nearPortal; lastHurtBy = Q.lastHurtBy; pad = Q.pad;
      return Q;
    }
    // a new player: their own everything, at its beginnings
    function makePlayer(index, who, powerId) {
      var K = CL.CLASSES[who] ? who : 'warden';
      return { index: index, hero: freshHero(), classId: K, klass: CL.CLASSES[K], sprites: { warden: P.hero.build(K) }, afflictions: { burn: 0, chill: 0, poison: 0, soak: 0, jam: 0, cut: 0 },
        power: powerId || 'emberwave', held: [], mods: RL.baseMods(), casts: 0, shieldUp: 0,
        weaponId: 'shortsword', weapon: WP.WEAPONS.shortsword, swings: WP.MOVESETS.sword, hands: ['shortsword', null], handIn: 0, swapT: 0,
        ribbon: [], droplets: [], flock: [], lash: null, delayed: [], reaped: 0, hitCount: 0, airJumped: 0, pounding: false, onIce: false, slick: false,
        prompt: null, nearPerk: null, nearPortal: false, lastHurtBy: '', pad: { held: 0, pressed: 0 } };
    }
    function liveHero(table) { Object.defineProperty(table, 'hero', { get: function () { return hero; }, enumerable: true }); return table; }
    liveHero(ctx);

    function pickClass(who) { if (CL.CLASSES[who]) { classId = who; klass = CL.CLASSES[who]; } return classId; }
    function begin() {
      state = 'run'; tick = 0; freeze = 0;
      rng = (Math.imul(run.seed | 0, 2654435761) ^ 0x5bd1e995) >>> 0;
      run.stage = 0; run.floor = 1; run.section = 0; flames = 3; transition = 0; clockSeconds = 0; kills = 0; slowmo = false;
      won = false; visited = {}; rewarded = {}; ceremony = null; banner = null; bell = null; pillars = []; rings = []; spikes = []; if (AR) AR.clear(true);
      // one player unless a session has said otherwise: a fresh record each, in their class, with its weapon in hand
      var list = roster || [{ who: classId, power: power }];
      me = roster ? Math.max(0, Math.min(list.length - 1, rosterMe)) : 0;
      cur = null; players = list.map(function (r, k) { return makePlayer(k, r.who, r.power); });
      players.forEach(function (Q) { use(Q); applyRelics(); hands = [null, null]; equip(klass.weapon); hero.hp = hero.maxHp; hero.energy = hero.maxEnergy; });
      use(players[0]);
      loadSection(); placeCreatures(); spawnAll();
      use(players[me]);
      particles.length = 0; afterimages.length = 0; numbers.length = 0;
    }

    var hashF = new Float64Array(1), hashU = new Uint32Array(hashF.buffer);
    var hashTrace = null;   // when a harness asks, every value that goes into the hash is kept, so that two copies can be compared value by value
    function checksum() {
      var h = 2166136261 >>> 0, k;
      function mix(v) { if (hashTrace) hashTrace.push(+v || 0); hashF[0] = +v || 0; h = Math.imul(h ^ hashU[0], 16777619); h = Math.imul(h ^ hashU[1], 16777619); }
      mix(tick); mix(rng); mix(run.stage); mix(flames); mix(freeze); mix(transition); mix(kills); mix(state === 'run' ? 1 : state === 'paused' ? 2 : state === 'ceremony' ? 3 : state === 'summary' ? 4 : 0);
      store();
      for (k = 0; k < players.length; k++) { var Q = players[k], hh = Q.hero; mix(hh.x); mix(hh.y); mix(hh.vx); mix(hh.vy); mix(hh.hp); mix(hh.energy); mix(hh.invuln); mix(hh.alive ? 1 : 0); mix(hh.act ? hh.act.ticks : -1); mix(Q.held.length); mix(Q.handIn); mix(Q.gone ? 1 : 0); }
      for (k = 0; k < creatures.length; k++) { var e = creatures[k]; mix(e.x); mix(e.y); mix(e.hp); mix(e.dying); mix(e.attack ? e.attack.t : -1); mix(e.cooldown); }
      for (k = 0; k < projectiles.length; k++) { mix(projectiles[k].x); mix(projectiles[k].y); }
      for (k = 0; k < pickups.length; k++) { mix(pickups[k].x); mix(pickups[k].y); }
      mix(creatures.length); mix(projectiles.length); mix(pickups.length); mix(hazards.length); mix(AR ? AR.count() : 0);
      return h >>> 0;
    }
    /* ---- company over a wire (net.js) ----
       net.js is told how to read the local buttons, begin a run with a roster, step with everybody's buttons, hash,
       and what to do when the other side must be caught up or has gone. It is never told anything about the game. */
    var NET = window.UndercroftNet || null, session = null, notice = null, scriptPad = null;
    function record() {
      store();
      return { seed: run.seed, stage: run.stage, flames: flames, clock: clockSeconds, kills: kills, visited: JSON.parse(JSON.stringify(visited)), rewarded: JSON.parse(JSON.stringify(rewarded)),
        players: players.map(function (Q) { return { who: Q.classId, power: Q.power, held: Q.held.slice(), hands: Q.hands.slice(), handIn: Q.handIn, gone: !!Q.gone }; }) };
    }
    // begin this stage again from a record: everybody whole at its head, the room as its seed makes it, chance seeded from where and when
    function restore(rec, stepNo) {
      run.seed = rec.seed; run.stage = rec.stage; flames = rec.flames; clockSeconds = rec.clock; kills = rec.kills; visited = rec.visited || {}; rewarded = rec.rewarded || {};
      state = 'run'; tick = stepNo; freeze = 0; transition = 0; ceremony = null; banner = null; bell = null; slowmo = false; pillars = []; rings = []; spikes = []; if (AR) AR.clear(true);
      rng = (Math.imul(run.seed | 0, 2654435761) ^ Math.imul(run.stage + 1, 40503) ^ Math.imul(stepNo | 0, 69069)) >>> 0;
      cur = null; players = rec.players.map(function (r, k) { return makePlayer(k, r.who, r.power); });
      players.forEach(function (Q, k) { var r = rec.players[k]; use(Q); held = r.held.slice(); applyRelics(); hands = r.hands.slice(); handIn = r.handIn; equip(hands[handIn] || klass.weapon); hero.hp = hero.maxHp; hero.energy = hero.maxEnergy; Q.gone = !!r.gone; });
      use(firstPlayer()); loadSection(); placeCreatures(); spawnAll();
      particles.length = 0; afterimages.length = 0; numbers.length = 0;
      use(players[me] || firstPlayer());
    }
    var netGame = {
      sample: function () { if (scriptPad) { var sp = scriptPad; scriptPad = { held: sp.held, pressed: 0 }; return sp; } return sample(); },
      begin: function (config) { run.seed = config.seed; roster = config.roster; rosterMe = config.me; begin(); roster = null; },
      step: function (pads) { step(pads); },
      checksum: function () { return checksum(); },
      record: record, restore: restore,
      leave: function (index) { if (players[index]) { players[index].gone = true; store(); if (cur === players[index]) use(firstPlayer()); } },
      notice: function (words) { notice = words ? { text: words, t: 0 } : null; },
      ended: function () { return state === 'summary' || state === 'title' || state === 'choose'; }
    };
    function openSession(wire, opts) { if (!NET) return null; if (session) session.leave(); session = NET.create(netGame, wire, opts || {}); return session; }
    var manual = false, probeHeld = [];   // a harness is stepping the game itself: the frame loop only draws

    /* One step. `pads` is every player's buttons for this step when a session supplies them; otherwise there is one
       player and the buttons are the local ones. Inside, the order never depends on who is sitting at this machine:
       players are stepped first to last, the room is stepped as the first player, and only at the very end is the
       local player loaded again, for the camera and for whatever is drawn. */
    function anyHit(name) { for (var k = 0; k < players.length; k++) if (!players[k].gone && (players[k].pad.pressed & BIT[name])) return true; return false; }
    function step(pads) {
      if (!pads) poll();
      tick++;
      if (state === 'title') { stepTitle(); return; }
      if (state === 'choose') { stepChoose(); return; }
      if (state === 'summary') { stepSummary(); return; }
      var k;
      for (k = 0; k < players.length; k++) players[k].pad = pads ? (pads[k] || { held: 0, pressed: 0 }) : (k === me ? pad : { held: 0, pressed: 0 });
      pad = cur.pad;   // the loaded player's register must agree with their record before anybody is put away
      use(firstPlayer()); pad = cur.pad;
      if (state === 'ceremony') { if (anyHit('attack') || anyHit('jump') || anyHit('start')) pad = { held: 0, pressed: BIT.attack }; stepCeremony(); use(players[me]); return; }
      if (anyHit('pause')) state = state === 'paused' ? 'run' : 'paused';
      if (state !== 'run') { use(players[me]); return; }
      clockSeconds += STEP;
      if (stepTransition()) { stepFx(); use(players[me]); return; }
      if (freeze > 0) { freeze--; use(players[me]); return; }
      slowmo = false;
      for (k = 0; k < players.length; k++) {
        if (players[k].gone) continue;
        use(players[k]); pad = cur.pad;
        stepHero(); stepWeapons(); stepItems(); stepAfflictions();
        claim(k);
      }
      use(firstPlayer());
      stepFallen();
      if (state === 'run') {
        stepSharedFx();
        if (AR && AR.stopped()) { /* a weapon is holding the world still: only the heroes move */ }
        else if (!slowmo || tick % 2 === 0) { stepLit.lights.length = 0; stepLit.glows.length = 0; stepCreatures(); stepHazards(); }
        stepFx();
      }
      use(players[me] || firstPlayer());
      stepCamera(false);
    }

    var startButton = env.room.querySelector('[data-undercroft-start]');
    if (startButton) startButton.addEventListener('click', function () {
      try { env.stage.focus({ preventScroll: true }); } catch (err) { /* not fatal */ }
      power = kept.unlocked[Math.min(startPower, kept.unlocked.length - 1)]; if (state === 'choose') { queued.start = true; } else enterChoose(); env.redraw();
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

    cur = { index: 0 }; store(); players = [cur];
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
        if (session && session.waiting() && session.S.stalled > 600) { var lp = sample(); if (lp.pressed & BIT.pause) session.leave(); else if (notice) notice.text = 'STILL WAITING. P OR ESC TO PLAY ON ALONE'; }
        if (!manual) {
          accumulator = Math.min(accumulator + Math.min(dt, 0.1), 0.25);
          while (accumulator >= STEP) {
            if (session && session.active()) { if (!session.advance()) { accumulator = Math.min(accumulator, STEP * 0.99); break; } }
            else step();
            accumulator -= STEP;
          }
          // fallen behind the other machine (a slow frame, a hidden tab): hurry, a step at a time
          if (session && session.active() && session.ahead() > session.S.delay + 3) session.advance();
        }
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
      // for the lockstep harness: take the stepping away from the frame loop; step once with exactly these buttons held; hash the state
      manual: function (on) { manual = on !== false; accumulator = 0; return manual; },
      advance: function (names, draw) {
        var list = String(names || '').split(/[\s,]+/).filter(Boolean), want = {}, k;
        for (k = 0; k < list.length; k++) want[list[k]] = true;
        for (k in keysDown) if (keysDown[k] && !want[k]) keysDown[k] = false;
        for (k in want) { if (!keysDown[k]) queued[k] = true; keysDown[k] = true; }
        step(); if (draw) render();
        return checksum();
      },
      checksum: function () { return checksum(); },
      traced: function (names) { rngTrace = []; this.together(names, false); var out = rngTrace; rngTrace = null; return out; },
      // a session over any wire, for the harness: open it as host or guest, start it, give it one chance to step with these buttons
      netOpen: function (wire, role, who, power, opts) { var sess = openSession(wire, opts); if (!sess) return null; if (role === 'host') sess.host(); else sess.join(who || 'warden', power || 'emberwave'); return sess.S; },
      netStart: function (seedValue, who, power) { return session ? session.start({ seed: seedValue, who: who || 'warden', power: power || 'emberwave' }) : false; },
      netTick: function (names, draw) {
        if (!session) return null;
        var list = String(names || '').split(/[\s,]+/).filter(Boolean), held = 0, j; for (j = 0; j < list.length; j++) held |= BIT[list[j]] || 0;
        scriptPad = { held: held, pressed: held & ~(probeHeld[9] || 0) }; probeHeld[9] = held;
        var did = session ? session.advance() : false; if (draw) render();
        return { did: did, step: session ? session.S.step : -1, state: session ? session.S.state : 'none', stalled: session ? session.S.stalled : 0, resyncs: session ? session.S.resyncs : 0 };
      },
      netBeat: function () { if (session) session.beat(); return true; },
      netInfo: function () { return session ? JSON.parse(JSON.stringify(session.S)) : null; },
      netLeave: function () { if (session) session.leave(); return true; },
      record: function () { return record(); },
      hashed: function () { hashTrace = []; checksum(); var out = hashTrace; hashTrace = null; return out; },
      // company, for tests: a roster of { who, power } and which of them sits here; then begin() as usual. party(null) is one player again
      party: function (list, mine) { roster = list || null; rosterMe = mine || 0; return roster ? roster.length : 1; },
      // step once with these buttons for each player in turn ('right attack', 'left'); returns the hash
      together: function (names, draw) {
        var pads = [], k;
        for (k = 0; k < players.length; k++) { var list = String((names && names[k]) || '').split(/[\s,]+/).filter(Boolean), held = 0, j; for (j = 0; j < list.length; j++) held |= BIT[list[j]] || 0; var was = probeHeld[k] || 0; pads.push({ held: held, pressed: held & ~was }); probeHeld[k] = held; }
        step(pads); if (draw) render();
        return checksum();
      },
      players: function () { store(); return players.map(function (Q) { return { index: Q.index, who: Q.classId, x: Q.hero.x, y: Q.hero.y, hp: Q.hero.hp, maxHp: Q.hero.maxHp, alive: Q.hero.alive, energy: Q.hero.energy, weapon: Q.weaponId, hands: Q.hands.slice(), held: Q.held.slice(), power: Q.power, hits: Q.hero.hits, gone: !!Q.gone, me: Q.index === me }; }); },
      place: function (index, x, y) { var Q = players[index]; if (!Q) return null; Q.hero.x = x; if (y !== undefined) Q.hero.y = y; Q.hero.vx = 0; Q.hero.vy = 0; return { x: Q.hero.x, y: Q.hero.y }; },
      // drive the game from a test: hold these keys for so many steps
      press: function (names, frames) {
        var list = String(names).split(/[\s,]+/).filter(Boolean), k;
        for (k = 0; k < list.length; k++) { if (!keysDown[list[k]]) queued[list[k]] = true; keysDown[list[k]] = true; }
        for (var n = 0; n < (frames || 1); n++) step();
        for (k = 0; k < list.length; k++) keysDown[list[k]] = false;
        render();
      },
      generate: function (seed, floor, section) { var L = WD.generate(seed, floor, section); return { cols: L.cols, reachable: WD.reachable(L), enemies: L.enemies.length, relics: L.relics.length, tries: L.tries }; },
      warp: function (x, y) { hero.x = x; hero.y = y === undefined ? level.door.y : y; hero.vy = 0; hero.vx = 0; stepCamera(true); },
      find: function (kind) { for (var ty = 0; ty < level.rows; ty++) for (var tx = 0; tx < level.cols; tx++) if (tileAt(tx, ty) === kind) return { x: tx * TILE + 8, y: ty * TILE, tx: tx, ty: ty }; return null; },
      summary: function () { return summary; },
      kept: function (reset) { if (reset) { kept = { best: 0, wins: 0, runs: 0, fastest: 0, unlocked: ['emberwave'], sound: false }; save(); } return kept; },
      lastHurtBy: function () { return lastHurtBy; },
      guardian: function (set) { if (boss && set) for (var gk in set) boss[gk] = set[gk]; return boss ? { kind: boss.kind, hp: boss.hp, maxHp: boss.maxHp, state: boss.state, phase: boss.phase, dying: boss.dying, x: Math.round(boss.x), y: Math.round(boss.y), dir: boss.dir, anim: boss.anim, frame: boss.frame, attack: boss.attack ? boss.attack.def.name + ':' + boss.attack.phase + ':' + boss.attack.t : null, boxes: boss.boxes ? boss.boxes.length : 0, stun: boss.stun, cooldown: boss.cooldown, hurtBoxes: boxesOf(boss).length, targets: boxesOf(boss).map(function (b) { return { x: Math.round((b.x0 + b.x1) / 2), y: Math.round((b.y0 + b.y1) / 2), mult: b.onHit ? 3 : b.mult }; }), balls: boss.vars && boss.vars.balls ? boss.vars.balls.map(function (b) { return { x: Math.round(b.x), y: Math.round(b.y), struck: b.struck }; }) : undefined } : null; },
      stage: function (n) { if (n !== undefined) { run.stage = Math.max(0, Math.min(STAGES.length - 1, n)); transition = 0; use(firstPlayer()); loadSection(); placeCreatures(); spawnAll(); use(players[me]); } return { stage: run.stage, of: STAGES.length, flames: flames, floor: run.floor, section: run.section, element: element.name, fountain: level.fountain || null }; },
      perks: function () { return { near: nearPerk ? nearPerk.relic.id : null, taken: !!level.taken, offered: perks.map(function (p) { return { id: p.relic.id, rarity: p.relic.rarity, x: p.x, y: p.y }; }) }; },
      portal: function () { return { x: level.door.x, y: level.door.y, portal: !!level.portal, open: portalOpen(), grid: level.grid || null, seen: Object.keys(seenCells).length, rows: level.rows, cols: level.cols, chests: chests.length, creatures: creatures.length }; },
      arena: function (floor) { for (var si = 0; si < STAGES.length; si++) if (STAGES[si].boss && STAGES[si].floor === (floor || run.floor)) run.stage = si; transition = 0; use(firstPlayer()); loadSection(); placeCreatures(); spawnAll(); use(players[me]); return run; },
      slay: function () { if (boss) { boss.hp = 0; } },
      command: function (stateName, wait) { if (boss && !boss.dying) return GD.command(boss, stateName, ctx); return null; },
      drop: function (kind, id, dx) { dropPickup({ kind: kind, id: id }, hero.x + (dx === undefined ? 0 : dx), hero.y - 12); return pickups.length; },
      finds: function () { return { chests: chests.map(function (c) { return { x: c.x, y: c.y, open: c.open, rarity: c.rarity, loot: c.loot }; }), pickups: pickups.map(function (q) { return { kind: q.kind, id: q.id, rarity: q.rarity, x: Math.round(q.x), y: Math.round(q.y), ground: q.ground }; }), prompt: prompt ? prompt.id : null, ceremony: ceremony ? ceremony.loot.id : null, banner: banner ? banner.text : null, slowmo: slowmo, bell: !!bell, flakes: flakes.length }; },
      hands: function () { return { hands: hands.slice(), inUse: handIn, weapon: weaponId }; },
      arms: function (kind) { return AR ? AR.count(kind) : -1; },
      swap: function () { return changeHands(); },
      wield: function (id, index) { var was = cur; use(players[index === undefined ? me : index]); takeWeapon(id); var out = { hands: hands.slice(), inUse: handIn }; use(was); return out; },
      equip: function (id) { return equip(id) ? { id: weaponId, name: weapon.name, rarity: weapon.rarity, swings: swings.length } : null; },
      weapons: function () { return WP.ORDER.slice(); },
      setPower: function (name) { if (RL.POWERS[name]) power = name; return power; },
      relics: function () { return { power: power, held: held.slice(), mods: mods }; },
      take: function (id) { takeRelic(id); return held.slice(); },
      reward: function () { if (boss) offerRewards(boss.x); return perks.map(function (q) { return q.relic.kind + ':' + q.relic.id; }); },
      begin: function (seed, who) { if (seed !== undefined) run.seed = seed; if (who) pickClass(who); begin(); kills = 0; return run; },
      pick: function (who) { return pickClass(who); },
      classes: function () { return CL.ORDER.slice(); },
      choose: function (index) { if (state !== 'choose') enterChoose(); if (index !== undefined) { choose.index = index; choose.t = 0; } return { state: state, index: choose.index, id: CL.ORDER[choose.index] }; },
      hurt: function (damage, index) { var was = cur; use(players[index === undefined ? me : index]); hero.invuln = 0; var out = hurtHero(hero.x + 10, damage || 1); use(was); return out; },
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
