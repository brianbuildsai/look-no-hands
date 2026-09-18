/* guardians.js: the ground the four guardians stand on.

   Each guardian has a file of its own (the Kiln Golem, the Rime Wyrm, the
   Storm Herald, the Lightless) and writes itself into the registry here.
   This file gives them what they share: a rig that builds frames from
   parts, pieces turned through every heading, the clock of an attack (a
   wind-up that tells, the live steps, a recovery), the marks on a bar
   where a guardian reels and changes, and the boxes it is struck in.
   Like the creatures they know nothing of the canvas: they are stepped
   with the engine's helpers, and those that draw themselves are handed a
   pen. */
(function () {
  'use strict';

  var BY_FLOOR = ['golem', 'wyrm', 'herald', 'lightless'];

  /* ---- the guardians proper: a rig, boxes, and a clock for every blow ----

     A guardian registers itself from its own file. Like the creatures it
     is drawn from parts placed by poses, it is struck in its hurt boxes
     (some of them soft, and worth more), and nothing about it wounds but
     the boxes of an attack: a wind-up that tells for three quarters of a
     second or longer, the live steps, and a recovery in which it is open.
     Its life is cut into phases; crossing a mark breaks whatever it was
     doing, staggers it, and changes what it does next. */

  var REG = {};
  function register(kind, def) { def.modern = true; REG[kind] = def; }
  function paletteWith(over) { var pal = {}, base = window.Pixels.PALETTE, key; for (key in base) pal[key] = base[key]; for (key in over) pal[key] = over[key]; return pal; }
  // frames from parts: anims is { name: [frame, ...] } and a frame is a list of [part, x, y, options]
  function rig(pal, parts, w, h, anchor, anims) {
    var A = window.Pixels.art, C = window.Pixels.compose, full = paletteWith(pal), imgs = {}, frames = {}, flipped = {};
    Object.keys(parts).forEach(function (n) { imgs[n] = A(parts[n], full); });
    Object.keys(anims).forEach(function (name) {
      frames[name] = anims[name].map(function (layers) {
        return C(w, h, layers.filter(Boolean).map(function (L) { return { img: imgs[L[0]], x: L[1], y: L[2], flip: L[3] && L[3].flip, rot: L[3] && L[3].rot }; }));
      });
      flipped[name] = frames[name].map(window.Pixels.flipH);
    });
    return { frames: frames, flipped: flipped, anchor: anchor, parts: imgs };
  }
  // a sparse overlay: a few marks on an empty field
  function dots(w, h, marks) {
    var rows = [], y, x;
    for (y = 0; y < h; y++) { var s = ''; for (x = 0; x < w; x++) s += '.'; rows.push(s); }
    marks.forEach(function (m) { rows[m[1]] = rows[m[1]].slice(0, m[0]) + m[2] + rows[m[1]].slice(m[0] + 1); });
    return rows;
  }

  // a piece turned through `steps` headings about its middle, without smoothing
  function turned(img, steps) {
    var d = Math.ceil(Math.sqrt(img.width * img.width + img.height * img.height)) + 2, out = [];
    for (var k = 0; k < steps; k++) {
      var c = window.Pixels.blank(d, d), g = c.getContext('2d');
      g.imageSmoothingEnabled = false; g.translate(d / 2, d / 2); g.rotate(k / steps * Math.PI * 2); g.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2));
      out.push(c);
    }
    return out;
  }
  function flipV(img) { var c = window.Pixels.blank(img.width, img.height), g = c.getContext('2d'); g.translate(0, img.height); g.scale(1, -1); g.drawImage(img, 0, 0); return c; }

  function towardsHero(e, hero) { return hero.x > e.x ? 1 : -1; }
  // a box ahead of a guardian (negative distances are behind it), from `up` above its feet to `down` below
  function front(e, near, far, up, down) {
    var x0 = e.dir > 0 ? e.x + near : e.x - far, x1 = e.dir > 0 ? e.x + far : e.x - near;
    return { x0: x0, x1: x1, y0: e.y - up, y1: e.y + (down || 0) };
  }

  function spawn(floor, arena, rnd, which) {
    var kind = which && REG[which] ? which : BY_FLOOR[Math.max(0, Math.min(3, floor - 1))], D = REG[kind];
    if (!D) return null;
    var e = {
      boss: true, kind: kind, spec: D, element: D.element, name: D.name, title: D.title || '',
      x: arena.bossX, y: D.flying ? arena.groundY - 70 : arena.groundY, vx: 0, vy: 0, w: D.body.w, h: D.body.h, size: 1,
      hp: D.hp, maxHp: D.hp, dir: -1, onGround: false, clock: 0, frame: 0, anim: 'wake', state: 'wake', wait: D.wake || 110, cooldown: 30,
      hurt: 0, flash: 0, dying: 0, phase: 0, stun: 0, status: {}, seen: true, elder: true, attack: null, boxes: [], hitHero: false, vars: {}, script: 0,
      home: { x: arena.bossX, y: arena.groundY - 70 }, arena: arena, drop: 0
    };
    if (D.start) D.start(e, arena, rnd);
    return e;
  }

  function begin(e, A, ctx) {
    e.attack = { def: A, t: 0, phase: 'windup' }; e.state = A.name;
    if (!A.keepFacing) e.dir = towardsHero(e, ctx.hero);
    e.hitHero = false; e.boxes = [];
    if (A.start) A.start(e, ctx);
  }
  function frameOf(F, name, t, span, loop) {
    var n = (F[name] || F.idle).length;
    if (loop) return Math.floor(((t - 1) % loop) / loop * n);
    return Math.min(n - 1, Math.floor((t - 1) / Math.max(1, span) * n));
  }
  function clock(e, ctx) {
    var a = e.attack, A = a.def, F = e.spec.frames, w = A.windup, act = A.active, rec = A.recover;
    a.t++;
    if (a.t <= w) {
      a.phase = 'windup'; e.anim = A.anims.windup; e.frame = frameOf(F, e.anim, a.t, w);
      if (A.telling) A.telling(e, ctx, a.t, w);
    } else if (a.t <= w + act) {
      if (a.phase !== 'active') { a.phase = 'active'; if (A.fire) A.fire(e, ctx); }
      e.anim = A.anims.attack; e.frame = frameOf(F, e.anim, a.t - w, act, A.loop);
      e.boxes = A.box ? A.box(e, a.t - w, ctx) : [];
      if (A.during) A.during(e, ctx, a.t - w);
    } else if (a.t <= w + act + rec) {
      a.phase = 'recover'; e.boxes = [];
      if (A.anims.recover) { e.anim = A.anims.recover; e.frame = frameOf(F, e.anim, a.t - w - act, rec); }
      else { e.anim = A.anims.attack; e.frame = (F[e.anim] || F.idle).length - 1; }
      if (A.resting) A.resting(e, ctx, a.t - w - act);
    } else {
      e.attack = null; e.boxes = []; e.state = 'idle';
      e.cooldown = Math.round(A.cooldown * (e.spec.tempo ? e.spec.tempo(e) : 1));
      if (A.end) A.end(e, ctx);
    }
  }

  function stepModern(e, ctx) {
    var D = e.spec, F = D.frames;
    if (e.dying) {
      e.dying++; e.boxes = []; e.attack = null;
      if (e.dying === 2) { ctx.calm(); if (D.fall) D.fall(e, ctx); }
      if (D.dyingStep) D.dyingStep(e, ctx);
      if (e.dying < 80) ctx.light(e.x, e.y - e.h / 2, 60, 0.85);
      if (F.death) { e.anim = 'death'; e.frame = Math.min(F.death.length - 1, Math.floor(e.dying / 60 * F.death.length)); }
      if (e.dying % 6 === 0 && e.dying < 64) ctx.spark(e.x + (ctx.random() - 0.5) * e.w, e.y - ctx.random() * e.h, '#ffffff', 6, 1.5, 20, 0);
      if (!D.flying) { e.vx = 0; e.vy = Math.min(5.5, e.vy + 0.32); ctx.moveBody(e); }
      return;
    }
    if (e.hurt > 0) e.hurt--;
    if (e.flash > 0) e.flash--;
    if (e.cooldown > 0) e.cooldown--;
    e.clock++;
    if (e.status.burn > 0) { e.status.burn--; if (e.status.burn % 40 === 0) { e.hp -= (e.status.burnDamage || 1); ctx.spark(e.x, e.y - e.h / 2, '#ff8c42', 4, 1, 16, -0.02); } }
    if (e.status.poison > 0) { e.status.poison--; if (e.status.poison % 50 === 0) e.hp -= 1; }
    if (e.status.shock > 0) e.status.shock--;
    if (e.hp <= 0) { e.hp = 0; e.dying = 1; e.boxes = []; e.attack = null; return; }
    // a mark on the bar is crossed: whatever it was doing breaks, and it reels
    while (e.phase < D.phases.length && e.hp <= e.maxHp * D.phases[e.phase]) {
      e.phase++;
      if (e.attack && e.attack.def.end) e.attack.def.end(e, ctx);
      e.attack = null; e.boxes = []; e.stun = D.reel || 70; e.cooldown = 20; e.script = 0; e.state = 'reel';
      ctx.spark(e.x, e.y - e.h / 2, '#ffffff', 40, 2.5, 40, 0); ctx.shake(5); ctx.sfx('roar');
      if (D.onPhase) D.onPhase(e, ctx, e.phase);
    }
    // cold only slows a guardian for a moment
    if (e.status.freeze > 0) { e.status.freeze = Math.min(e.status.freeze - 1, 20); e.boxes = []; if (!D.flying) { e.vx = 0; e.vy = Math.min(5.5, e.vy + 0.32); ctx.moveBody(e); } return; }
    if (e.state === 'wake') {
      e.anim = 'wake'; e.frame = frameOf(F, 'wake', (D.wake || 110) - e.wait + 1, D.wake || 110);
      if (D.waking) D.waking(e, ctx, (D.wake || 110) - e.wait);
      if (--e.wait <= 0) e.state = 'idle';
    } else if (e.stun > 0) {
      e.stun--; e.vx = 0; e.anim = 'reel'; e.frame = Math.floor(e.clock / 12) % (F.reel || F.idle).length;
      if (e.stun === 0) e.state = 'idle';
    } else if (e.attack) clock(e, ctx);
    else {
      var A = D.think(e, ctx);
      if (A) begin(e, A, ctx);
    }
    if (!D.flying && !D.ownBody) {
      e.vy = Math.min(5.5, e.vy + 0.32);
      if (e.attack && !e.attack.def.moves) e.vx *= 0.8;
      var touched = ctx.moveBody(e); e.onGround = touched.floor;
    }
    if (D.always) D.always(e, ctx);
  }

  function step(e, ctx) { stepModern(e, ctx); }

  // where a guardian can be struck; soft places first, so that they are what a blade finds
  function hurtBoxes(e) {
    if (e.state === 'wake') return [];
    if (e.spec.hurtBoxes) return e.spec.hurtBoxes(e);
    return [{ x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y - e.h, y1: e.y, mult: 1 }];
  }
  // for the probes: make it begin an attack by name, now
  function command(e, name, ctx) {
    var A = e.spec.attacks[name];
    if (!A) return Object.keys(e.spec.attacks).join(',');
    e.state = 'idle'; e.wait = 0; e.stun = 0; begin(e, A, ctx);
    return name;
  }

  var SPRITES = null;
  function buildAll() {
    if (SPRITES) return SPRITES;
    var S = SPRITES = {};
    Object.keys(REG).forEach(function (kind) { if (!S[kind]) { S[kind] = REG[kind].rig(); REG[kind].frames = (S[kind].byPhase ? S[kind].byPhase[0] : S[kind]).frames; } });
    return S;
  }

  window.Guardians = { REG: REG, BY_FLOOR: BY_FLOOR, register: register, rig: rig, dots: dots, palette: paletteWith, turned: turned, flipV: flipV, front: front, towards: towardsHero, build: buildAll, spawn: spawn, step: step, hurtBoxes: hurtBoxes, command: command };
})();
