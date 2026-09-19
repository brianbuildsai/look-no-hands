/* boss-bellkeeper.js: the Bellkeeper, in the Sunken Belfry.

   A hermit crab the size of a cart that has made its home in the bell that
   fell when the belfry flooded. Out of the bell it scuttles toward you and
   sweeps with the great claw, or blows a stream of bubbles that drift after
   you and can be burst. Shut in the bell nothing reaches it, and from in
   there it tolls: rings of force run both ways along the floor, low ones to
   be jumped and high ones to be stood under, each marked before it goes. Or
   it calls the water: the whole floor is marked, a surge crosses the hall
   from one wall to the other, and only the ledges are dry. But a bell can be
   rung from outside. Strike it three times while the crab is shut in and it
   tolls on the crab, which falls out on its back, stunned and soft. Below
   half its life the tolls come in pairs, the bubbles carry spines, and the
   surge comes back the other way.

   The bell is worked out (a flared curve with bands and verdigris); the crab
   is drawn, in parts. */
(function () {
  'use strict';
  var ST = window.UndercroftSteady;   // sines that every browser agrees on (steady.js): two machines compute this game and must match to the bit
  var GD = window.Guardians;
  if (!GD) return;

  var PAL = { k: '#03100f', R: '#efd27a', r: '#c9a44c', G: '#7a5a1e', q: '#2fae9e', p: '#d9694a', P: '#f4a27c', d: '#8a3322', e: '#ffffff', x: '#0b0b12', l: '#9ff5e6' };

  /* ---- the parts ---- */

  function bellRows() {
    var w = 50, h = 40, rows = [], x, y;
    function half(y) { if (y < 3) return 4; var t = (y - 3) / (h - 4); return 7 + 15 * ST.pow(t, 0.55) + (t > 0.86 ? 3 : 0); }
    function inside(x, y) { return y >= 0 && y < h && Math.abs(x - 24.5) <= half(y) && !(y < 3 && Math.abs(x - 24.5) < 2 && y > 0); }
    for (y = 0; y < h; y++) {
      var s = '';
      for (x = 0; x < w; x++) {
        if (!inside(x, y)) { s += '.'; continue; }
        var edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1), nx = (x - 24.5) / half(y);
        s += edge ? 'k' : (y === 11 || y === 12 || y === 31 || y === 36) ? 'G' : (x * 7 + y * 13) % 19 === 0 ? 'q' : (y > 18 && y < 25 && Math.abs(nx) < 0.22 && (y + x) % 3) ? 'R' : nx < -0.45 ? 'R' : nx > 0.4 ? 'G' : 'r';
      }
      rows.push(s);
    }
    return rows;
  }
  var PARTS = {
    eyes: ['.kk...kk.', 'kexk.kexk', 'keek.keek', '.kk...kk.', '.kp...kp.', '.kp...kp.', '.kp...kp.'],
    eyesShut: ['.kk...kk.', 'kppk.kppk', 'kkkk.kkkk', '.kk...kk.', '.kp...kp.', '.kp...kp.', '.kp...kp.'],
    clawOpen: ['......kkkkkk....', '....kkpppppPkk..', '...kpppppkkkPPk.', '..kppppkk...kkPk', '.kppppk.......kk', 'kpppppk.........', 'kpppppk.......kk', '.kdpppkk....kkPk', '..kdppppkkkkPPk.', '...kddpppppPkk..', '.....kkkkkkk....'],
    clawShut: ['......kkkkkkk...', '....kkpppppPPkk.', '...kpppppppkkkPk', '..kpppppppkPPPPk', '.kpppppppkkkkkk.', 'kppppppppppPPk..', '.kdpppppppkkk...', '..kddppppkk.....', '...kkkkkkk......'],
    small: ['..kkkk..', '.kppPkk.', 'kpppk.kk', 'kdppk.kk', '.kdpPkk.', '..kkkk..'],
    face: ['..kkkkkkkk....', '.kPPppppppkk..', 'kPppppppppppk.', 'kppppppppppppk', 'kdppppkkkppppk', '.kdppppppppdk.', '..kkddddddkk..', '....kkkkkk....'],
    leg: ['kk....', 'kpkk..', '.kppk.', '..kdpk', '...kkk'],
    body: ['....kkkkkkkk......', '..kkPPppppppkk....', '.kPPpppppppppdk...', 'kPpppppppppppddkk.', 'kpppppppppppddddkk', 'kdppppppppdddddkk.', '.kddppppddddkkk...', '..kkddddkkkk......', '....kkkk..........']
  };

  function buildRig() {
    var parts = { bell: bellRows() }, k;
    for (k in PARTS) parts[k] = PARTS[k];
    function legs(n) { var a = n % 2; return [['leg', 60 + a, 64], ['leg', 52 - a, 65], ['leg', 30 + a, 65, { flip: true }], ['leg', 38 - a, 64, { flip: true }]]; }
    function out(n, claw, cx, cy, eyes) { return legs(n).concat([['face', 65, 54 + (n % 2)], ['bell', 25, 24 + (n % 2)], ['small', 72, 62], [eyes || 'eyes', 69, 45 + (n % 2)], [claw || 'clawOpen', cx === undefined ? 77 : cx, cy === undefined ? 50 : cy]]); }
    var shut = [['bell', 25, 30]];
    var fallen = [['bell', 17, 29], ['body', 66, 58], ['eyesShut', 82, 50], ['clawShut', 88, 61], ['leg', 70, 52], ['leg', 76, 51, { flip: true }]];
    var fallen2 = [['bell', 17, 29], ['body', 66, 58], ['eyesShut', 82, 51], ['clawShut', 88, 61], ['leg', 71, 51], ['leg', 75, 52, { flip: true }]];
    return GD.rig(PAL, parts, 110, 70, { x: 50, y: 70 }, {
      idle: [out(0), out(1)],
      walk: [out(0), out(1), out(2), out(3)],
      shut: [shut],
      ring: [[['bell', 24, 30]], [['bell', 26, 30]]],
      clawUp: [out(0, 'clawOpen', 76, 40), out(0, 'clawOpen', 72, 30)],
      clawDown: [out(0, 'clawShut', 86, 50), out(0, 'clawShut', 88, 56)],
      spit: [out(0, 'clawOpen', 78, 52, 'eyesShut'), out(1, 'clawOpen', 78, 52)],
      reel: [fallen, fallen2],
      wake: [shut, [['bell', 24, 30]], [['bell', 26, 30]], shut, out(0), out(1)],
      death: [fallen, fallen2, [['bell', 17, 30], ['body', 66, 60]], [['bell', 17, 30]], [['bell', 17, 30]]]
    });
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function spray(ctx, x, y, n, speed) { for (var k = 0; k < n; k++) { var a = -Math.PI * ctx.random(), s = speed * (0.4 + ctx.random()); ctx.particle({ x: x, y: y, vx: ST.cos(a) * s, vy: ST.sin(a) * s, life: 16 + ctx.random() * 20, max: 36, colour: k % 3 ? '#5fd4c4' : '#ffffff', size: ctx.random() < 0.3 ? 2 : 1, gravity: 0.1 }); } }

  /* ---- what is drawn behind it: the surge, and the bubbles ---- */

  function scenery(e, G) {
    var v = e.vars, A = e.arena, pen = G.pen, k;
    if (v.wave) {
      var wx = Math.round(v.wave.x) - G.cx, gy = A.groundY - G.cy, d = v.wave.dir;
      for (k = 0; k < 44; k += 2) { var t = k / 44, hgt = Math.round(24 * ST.sin(Math.min(1, t * 1.25) * Math.PI * 0.62) + ST.sin(k * 0.6 + G.tick * 0.4) * 1.5), px = wx - d * (k - 22); pen.fillStyle = '#1f7a70'; pen.fillRect(px, gy - hgt, 2, hgt); pen.fillStyle = '#5fd4c4'; pen.fillRect(px, gy - hgt, 2, Math.max(1, Math.round(hgt * 0.35))); if (t > 0.55) { pen.fillStyle = '#ffffff'; pen.fillRect(px, gy - hgt - 1, 2, 2); } }
    }
    (v.bubbles || []).forEach(function (b) {
      var x = Math.round(b.x) - G.cx, y = Math.round(b.y) - G.cy, r = b.r;
      pen.strokeStyle = b.spiked ? '#ff9ab5' : '#9ff5e6'; pen.lineWidth = 1; pen.beginPath(); pen.arc(x, y, r, 0, 6.2832); pen.stroke();
      pen.globalAlpha = 0.18; pen.fillStyle = '#5fd4c4'; pen.beginPath(); pen.arc(x, y, r, 0, 6.2832); pen.fill(); pen.globalAlpha = 1;
      pen.fillStyle = '#ffffff'; pen.fillRect(x - Math.round(r * 0.45), y - Math.round(r * 0.5), 2, 1); pen.fillRect(x - Math.round(r * 0.6), y - Math.round(r * 0.3), 1, 1);
      if (b.spiked) { pen.fillStyle = '#ff4f7b'; for (k = 0; k < 6; k++) { var a = k / 6 * 6.2832 + b.age * 0.03; pen.fillRect(x + Math.round(ST.cos(a) * (r + 1)), y + Math.round(ST.sin(a) * (r + 1)), 1, 1); } pen.fillRect(x - 1, y - 1, 2, 2); }
    });
  }

  /* ---- what it does ---- */

  function drawRing(high) {
    return function (p, g, cx, cy, tick) {
      var x = Math.round(p.x) - cx, y = Math.round(p.y) - cy, d = p.vx > 0 ? 1 : -1, r = high ? 10 : 8, k;
      for (k = 0; k < 3; k++) { g.globalAlpha = 1 - k * 0.3; g.strokeStyle = k ? '#c9a44c' : '#fff3b0'; g.lineWidth = 2 - k * 0.5; g.beginPath(); g.arc(x - d * (r + k * 5), y, r + k * 1.5, d > 0 ? -1.1 : Math.PI - 1.1, d > 0 ? 1.1 : Math.PI + 1.1); g.stroke(); }
      g.globalAlpha = 1;
    };
  }
  function toll(e, ctx, high) {
    var A = e.arena;
    for (var s = -1; s <= 1; s += 2) ctx.projectile({ x: e.x + s * 28, y: A.groundY - (high ? 36 : 7), vx: s * 2.5, vy: 0, gravity: 0, life: 220, colour: '#efd27a', size: high ? 18 : 14, damage: 1, element: 'tide', cause: 'toll', wave: true, draw: drawRing(high) });
    ctx.sfx('toll'); ctx.shake(3); e.vars.rung = 10;
    ctx.spark(e.x, e.y - 20, '#fff3b0', 14, 2.4, 16, 0);
  }
  function tellToll(e, ctx, high, life) { var A = e.arena; ctx.telegraph(A.left, A.groundY - (high ? 45 : 14), A.right - A.left, high ? 18 : 14, life, high ? '#ff9ab5' : '#efd27a'); }
  // into the bell, and out of it
  function shutIn(e, ctx) { var v = e.vars; if (!v.shut) { v.shut = true; v.knocks = 0; ctx.sfx('door'); ctx.spark(e.x + e.dir * 24, e.y - 8, '#5fd4c4', 8, 1.6, 14, 0.05); } }
  function comeOut(e) { e.vars.shut = false; e.vars.knocks = 0; }

  var ATTACKS = {
    // the great claw, swept down across what stands before it
    claw: {
      name: 'claw', windup: 42, active: 12, recover: 44, cooldown: 36, anims: { windup: 'clawUp', attack: 'clawDown', recover: 'clawDown' },
      telling: function (e, ctx, t, w) { e.vx = 0; if (t === 1) { ctx.telegraph(e.dir > 0 ? e.x + 16 : e.x - 80, e.y - 38, 64, 38, w, '#ff9ab5'); ctx.sfx('select'); } },
      fire: function (e, ctx) { ctx.sfx('clap'); ctx.shake(4); spray(ctx, e.x + e.dir * 50, e.y - 2, 16, 2.6); ctx.crescent(e.x + e.dir * 34, e.y - 22, e.dir, 34, '#f4a27c', 12); },
      box: function (e) { var b = GD.front(e, 16, 80, 38, 0); b.damage = 1; b.element = 'tide'; return [b]; }
    },

    // shut in, it tolls three times: rings along the floor both ways, low, high, low; below half, each toll is a pair
    toll: {
      name: 'toll', windup: 50, active: 120, recover: 70, cooldown: 40, keepFacing: true, anims: { windup: 'shut', attack: 'shut', recover: 'idle' },
      start: function (e, ctx) { e.vars.order = ctx.random() < 0.5 ? [false, true, false] : [true, false, true]; },
      telling: function (e, ctx, t, w) { e.vx = 0; if (t === 8) shutIn(e, ctx); if (t === w - 18) tellToll(e, ctx, e.vars.order[0], 18); },
      during: function (e, ctx, t) {
        var v = e.vars, n = Math.floor((t - 1) / 40), at = (t - 1) % 40;
        if (n > 2) return;
        if (at === 0) toll(e, ctx, v.order[n]);
        if (e.phase && at === 14) toll(e, ctx, !v.order[n]);
        if (e.phase && at === 0) tellToll(e, ctx, !v.order[n], 14);
        if (at === 22 && n < 2) tellToll(e, ctx, v.order[n + 1], 18);
      },
      // right beside the bell the ring is already there when it sounds
      box: function (e, t) { var v = e.vars, A = e.arena, n = Math.floor((t - 1) / 40), at = (t - 1) % 40; if (n > 2 || at > 4) return []; var high = v.order[n]; return [{ x0: e.x - 38, x1: e.x + 38, y0: A.groundY - (high ? 45 : 14), y1: A.groundY - (high ? 27 : 0), damage: 1, element: 'tide' }]; },
      resting: function (e, ctx, t) { if (t === 1) comeOut(e); },
      end: function (e) { comeOut(e); }
    },

    // a stream of bubbles that drift after her; they burst on a blade. Below half, every other one has spines and is quicker
    bubbles: {
      name: 'bubbles', windup: 40, active: 60, recover: 90, cooldown: 40, anims: { windup: 'spit', attack: 'spit', recover: 'idle' }, loop: 16,
      start: function (e) { e.vars.blown = 0; },
      telling: function (e, ctx, t) { e.vx = 0; if (t === 1) ctx.sfx('select'); if (t % 4 === 0) ctx.particle({ x: e.x + e.dir * 30, y: e.y - 26, vx: e.dir * 0.4, vy: -0.6, life: 14, max: 14, colour: '#9ff5e6', size: 1, gravity: -0.01 }); },
      during: function (e, ctx, t) {
        var v = e.vars, n = e.phase ? 7 : 5;
        if ((t - 1) % 8 !== 0 || v.blown >= n || v.bubbles.length >= 9) return;
        var k = v.blown++;
        v.bubbles.push({ x: e.x + e.dir * 32, y: e.y - 24, vx: e.dir * (1.6 + (k % 3) * 0.5), vy: -0.9 - (k % 2) * 0.6, age: 0, life: 460, r: 6 + (k % 3), spiked: !!e.phase && k % 2 === 1 });
        ctx.sfx('bubble');
      }
    },

    // the water is called: the floor is marked from wall to wall, and then it comes
    surge: {
      name: 'surge', windup: 84, active: 116, recover: 100, cooldown: 40, keepFacing: true, anims: { windup: 'shut', attack: 'shut', recover: 'idle' },
      start: function (e, ctx) { var A = e.arena, fromLeft = ctx.hero.x > (A.left + A.right) / 2; e.vars.surge = { dir: fromLeft ? 1 : -1, from: fromLeft ? A.left - 24 : A.right + 24, back: false }; },
      telling: function (e, ctx, t, w) {
        var A = e.arena, s = e.vars.surge; e.vx = 0;
        if (t === 8) shutIn(e, ctx);
        if (t === 1) { ctx.telegraph(A.left, A.groundY - 22, A.right - A.left, 22, w, '#5fd4c4'); ctx.sfx('surge'); }
        // the water draws back toward the wall it will come from
        if (t % 2 === 0) ctx.particle({ x: A.left + ctx.random() * (A.right - A.left), y: A.groundY - 1, vx: -s.dir * (1.5 + ctx.random() * 2), vy: -0.2, life: 16, max: 16, colour: ctx.random() < 0.3 ? '#ffffff' : '#5fd4c4', size: 1, gravity: 0 });
        if (t % 12 === 0) ctx.shake(1);
      },
      fire: function (e, ctx) { var s = e.vars.surge; e.vars.wave = { x: s.from, dir: s.dir }; ctx.sfx('boom'); ctx.shake(4); },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, wv = v.wave; if (!wv) return;
        wv.x += wv.dir * 4.8;
        if (t % 2 === 0) spray(ctx, wv.x + wv.dir * 14, A.groundY - 16, 2, 2.2);
        if ((wv.x - A.left + 30) * (wv.x - A.right - 30) > 0) {
          // below half it comes back the other way, once, after a breath
          if (e.phase && !v.surge.back) { v.surge.back = true; wv.dir = -wv.dir; wv.x += wv.dir * 8; ctx.telegraph(A.left, A.groundY - 22, A.right - A.left, 22, 20, '#5fd4c4'); v.hold = 22; }
          else v.wave = null;
        }
        if (v.hold > 0) { v.hold--; wv.x -= wv.dir * 4.8; }
      },
      box: function (e) { var wv = e.vars.wave, A = e.arena; return wv && !(e.vars.hold > 0) ? [{ x0: wv.x - 20, x1: wv.x + 20, y0: A.groundY - 22, y1: A.groundY, damage: 1, element: 'tide' }] : []; },
      resting: function (e, ctx, t) { if (t === 1) { comeOut(e); e.vars.wave = null; } },
      end: function (e) { comeOut(e); e.vars.wave = null; }
    }
  };

  // below half the surge goes across and comes back, so it is given the time
  ATTACKS.surgeBack = {}; Object.keys(ATTACKS.surge).forEach(function (k) { ATTACKS.surgeBack[k] = ATTACKS.surge[k]; }); ATTACKS.surgeBack.name = 'surgeBack'; ATTACKS.surgeBack.active = 256;

  var SCRIPTS = [['claw', 'toll', 'bubbles', 'claw', 'surge'], ['toll', 'claw', 'surgeBack', 'bubbles', 'claw', 'toll']];

  function think(e, ctx) {
    var hero = ctx.hero, dx = hero.x - e.x, A = e.arena;
    e.dir = dx > 0 ? 1 : -1;
    // out of the bell it scuttles after her, sideways, never quite to the walls
    if (Math.abs(dx) > 72 && e.x + e.dir * 40 > A.left && e.x + e.dir * 40 < A.right) { e.vx = e.dir * (e.phase ? 0.95 : 0.7); e.anim = 'walk'; e.frame = (e.clock >> 3) % 4; }
    else { e.vx = 0; e.anim = 'idle'; e.frame = (e.clock >> 4) % 2; }
    if (e.cooldown > 0 || !hero.alive) return null;
    var script = SCRIPTS[e.phase], want = script[e.script % script.length];
    if (want === 'claw' && Math.abs(dx) > 96) want = 'bubbles';
    e.script++; e.vx = 0;
    return ATTACKS[want];
  }

  function start(e, arena) { var v = e.vars; e.x = arena.bossX; e.y = arena.groundY; v.shut = true; v.knocks = 0; v.bubbles = []; v.wave = null; v.rung = 0; v.knockCd = 0; }
  function waking(e, ctx, t) { if (t === 34 || t === 52) { ctx.sfx('bell'); ctx.shake(3); ctx.spark(e.x, e.y - 20, '#fff3b0', 12, 2, 16, 0); } if (t === 76) { comeOut(e); ctx.sfx('roar'); ctx.shake(4); spray(ctx, e.x + e.dir * 26, e.y - 4, 24, 3); } }

  function always(e, ctx) {
    var v = e.vars, hero = ctx.hero, k;
    if (v.rung > 0) { v.rung--; if (e.anim === 'shut') { e.anim = 'ring'; e.frame = (v.rung >> 1) % 2; } }
    if (v.knockCd > 0) v.knockCd--;
    if (e.stun > 0 && e.state !== 'wake') { v.shut = false; if (e.clock % 9 === 0) ctx.particle({ x: e.x + e.dir * 34 + ST.cos(e.clock * 0.2) * 9, y: e.y - 26, vx: 0, vy: 0, life: 10, max: 10, colour: '#fff3b0', size: 1, gravity: 0 }); }
    ctx.light(e.x, e.y - 22, 74, 0.85);
    for (k = v.bubbles.length - 1; k >= 0; k--) {
      var b = v.bubbles[k], dx = hero.x - b.x, dy = hero.y - 12 - b.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy)), top = b.spiked ? 1.15 : 0.8;
      b.age++;
      b.vx += dx / len * 0.03; b.vy += dy / len * 0.03 + ST.sin(b.age * 0.09) * 0.012; b.vx *= 0.97; b.vy *= 0.97;
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy); if (sp > top && b.age > 24) { b.vx *= top / sp; b.vy *= top / sp; }
      b.x += b.vx; b.y += b.vy;
      if (b.age > 14 && ctx.touch({ x0: b.x - b.r - 1, x1: b.x + b.r + 1, y0: b.y - b.r - 1, y1: b.y + b.r + 1 }, 1, 'tide', e, b.x)) b.pop = true;
      if (b.pop || b.age > b.life) { ctx.spark(b.x, b.y, '#9ff5e6', 8, 1.6, 12, 0.04); v.bubbles.splice(k, 1); }
    }
  }
  function onPhase(e, ctx) { comeOut(e); e.vars.wave = null; spray(ctx, e.x, e.y - 10, 50, 3.6); ctx.flash('#5fd4c4', 8); }
  function fall(e) { e.vars.bubbles = []; e.vars.wave = null; e.vars.shut = false; }
  function dyingStep(e, ctx) { if (e.dying % 9 === 0 && e.dying < 60) { spray(ctx, e.x + (ctx.random() - 0.5) * 50, e.y - 4, 12, 2.6); ctx.shake(2); } if (e.dying === 58) { ctx.sfx('bell'); ctx.flash('#efd27a', 8); } }

  GD.register('bellkeeper', {
    name: 'The Bellkeeper', title: 'AT HOME IN THE SUNKEN BELFRY', element: 'tide', flying: false,
    hp: 300, body: { w: 44, h: 40 }, phases: [0.5], wake: 110, reel: 90,
    rig: buildRig, scenery: scenery, attacks: ATTACKS, think: think, always: always, onPhase: onPhase, fall: fall, waking: waking, start: start, dyingStep: dyingStep,
    tempo: function (e) { return e.phase ? 0.7 : 1; },
    hurtBoxes: function (e) {
      var v = e.vars, boxes = [];
      (v.bubbles || []).forEach(function (b) { if (b.age > 10) boxes.push({ x0: b.x - b.r - 2, x1: b.x + b.r + 2, y0: b.y - b.r - 2, y1: b.y + b.r + 2, mult: 1, onHit: function () { b.pop = true; return true; } }); });
      var bell = { x0: e.x - 24, x1: e.x + 24, y0: e.y - 42, y1: e.y, mult: 0.5 };
      if (v.shut) {
        // nothing reaches it in there. But a bell can be rung from outside: three times, and it tolls on the crab
        bell.onHit = function (g, ctx) {
          ctx.sfx('clink'); ctx.spark(g.x, g.y - 24, '#fff3b0', 6, 1.8, 10, 0.03);
          if (v.knockCd > 0) return false;
          v.knockCd = 24; v.knocks++; v.rung = 8;
          ctx.number(g.x, g.y - 52, v.knocks >= 3 ? 'DONG' : v.knocks + ' OF 3', '#efd27a');
          if (v.knocks >= 3) { if (g.attack && g.attack.def.end) g.attack.def.end(g, ctx); g.attack = null; g.boxes = []; g.state = 'reel'; g.stun = 130; g.cooldown = 30; comeOut(g); ctx.sfx('bell'); ctx.shake(6); ctx.flash('#efd27a', 5); ctx.calm(); ctx.spark(g.x, g.y - 20, '#ffffff', 30, 3, 24, 0); }
          return false;
        };
        boxes.push(bell);
        return boxes;
      }
      // out of the bell: the crab itself before it, soft when it lies stunned, and the bell behind it, which takes half
      if (e.stun > 0) boxes.push({ x0: e.x + (e.dir > 0 ? 12 : -58), x1: e.x + (e.dir > 0 ? 58 : -12), y0: e.y - 24, y1: e.y, mult: 1.5 });
      else boxes.push({ x0: e.x + (e.dir > 0 ? 16 : -48), x1: e.x + (e.dir > 0 ? 48 : -16), y0: e.y - 36, y1: e.y, mult: 1 });
      boxes.push(bell);
      return boxes;
    }
  });
})();
