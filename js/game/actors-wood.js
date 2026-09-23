/* actors-wood.js: what lives in the Sunken Wood (floor 2).

   Three creatures, each drawn from a still in the asset library and given
   the frames the still does not have: a walk, a wind-up that tells, the blow,
   the recovery, a flinch. Written against actors.js exactly as the others
   are: a rig of parts placed by poses, a box that stops at walls, a box that
   can be struck, and attacks that show where they will land before they do.

     the Rootwalker   a squat treant on root legs (Treants_and_Plant_Monsters/43): it drives its arms
                      into the ground and a line of roots comes along the floor at you
     the Bog Mound    a mound of bog moss with twigs growing out of it (Slimes/414): it sinks, travels
                      under the ground as a ripple, and bursts up where the bubbling is marked
     the Rusalka      a drowned spirit with long floating hair (Wraiths_and_Spirits/83): she gathers a
                      wisp in her hand and lets it drift after you, lighting the dark as it comes

   Every one of them carries the wood's touch: snared, no dash while the roots hold. */
(function () {
  'use strict';
  var ST = window.UndercroftSteady;   // sines that every browser agrees on (steady.js): two machines compute this game and must match to the bit
  var AC = window.Actors;
  if (!AC || !AC.kit) return;
  var KINDS = AC.KINDS, BY_ELEMENT = AC.BY_ELEMENT, rig = AC.kit.rig, edgeAhead = AC.kit.edgeAhead;
  var TELL = '#ffc96b';   // what they are about to do is marked in amber: green would be lost on the moss

  /* ---- the Rootwalker ----
     From the still: a crown of grass on a gnarled trunk, branch arms splayed wide and hanging, two root legs.
     The still has no face; two knots in the bark glow, so that you can tell where it is looking. */
  function rootwalkerRig() {
    var P = {
      crown: ['....8....8...8....', '.8..78..87..87..8.', '..8.678.767.76.87.', '.87.6776767677.76.', '..7667667666767678', '.8766576657665667.', '.76556655565556657', 'k6555565555655556k', '.k55k5555k5555k5k.', '..k..k55k.k55k....'],
      crownUp: ['..8..8..8..8..8...', '.87.78.878.87.78..', '..8.678.767.76.87.', '.87.6776767677.76.', '..7667667666767678', '.8766576657665667.', '.76556655565556657', 'k6555565555655556k', '.k55k5555k5555k5k.', '..k..k55k.k55k....'],
      trunk: ['.k22k222k2k.', 'k2334332342k', 'k2334433322k', 'k1w234432w1k', 'k12k3443k21k', 'k1123443211k', '.k1234321k1k', '.k1123621k..', '.k1223421k..', '.k12k3421k..', '.k1223321k..', 'k11233421k1k', 'k12123321211'],
      trunkShut: ['.k22k222k2k.', 'k2334332342k', 'k2334433322k', 'k1k234432k1k', 'k12k3443k21k', 'k1123443211k', '.k1234321k1k', '.k1123621k..', '.k1223421k..', '.k12k3421k..', '.k1223321k..', 'k11233421k1k', 'k12123321211'],
      arm: ['kk22k.........', 'k2334kkk......', 'k12233432kk...', '.k11122334k...', '..kkk11123kk..', '.....kk112k2k.', '.......k1kk21k', '......k2k..k2k', '.....k1k....k.', '......k.......'],
      armUp: ['.k2..k2k.', 'k21k.k1k.', '.k2k.k2k.', '..k2kk2k.', '..k12k2k.', '...k1122k', '...k1123k', '..k11233k', '..k1233k.', '.k12334k.', '.k1234k..', 'k12334k..', 'k2233k...', 'kk22k....'],
      armDown: ['kk22k.....', 'k2334k....', 'k12334k...', '.k12334k..', '..k1233k..', '..k1123k..', '...k1123k.', '...k1122k.', '....k112k.', '....k121k.', '...k2k1k2k', '..k2k.k.k2', '..k...k..k', '......k...'],
      armSweep: ['kk22kk..........', 'k2334332kkk.....', 'k1223344332kkk..', '.kk111222333k2k.', '...kkk111kk1k21k', '......kkk..k.kk.'],
      leg: ['k2233k..', 'k12233k.', '.k1223k.', '.k1123k.', '..k1223k', '..k1123k', '.k21k12k', 'k21k.k21', 'kk...kkk'],
      legLift: ['k2233k..', 'k12233k.', '.k1223k.', '..k1223k', '.k21k12k', 'k21k.k2k', 'kk...kk.'],
      leaf: ['.8', '76', '6.'],
      clod: ['.33.', '3223', '.22.']
    };
    // stood square, with an offset for the whole body, the crown and each arm and leg
    function stand(o) {
      o = o || {};
      var bx = o.bx || 0, by = (o.by || 0) + 2;   // two rows of headroom for the arms raised
      var L = [];
      L.push([o.liftL ? 'legLift' : 'leg', 11 + (o.lx || 0), o.liftL ? 28 : 27, { flip: true }]);
      L.push([o.liftR ? 'legLift' : 'leg', 21 + (o.rx || 0), o.liftR ? 28 : 27]);
      L.push([o.eyes === false ? 'trunkShut' : 'trunk', 14 + bx, 13 + by]);
      L.push([o.armL || 'arm', (o.armL === 'armUp' ? 7 : o.armL === 'armDown' ? 6 : 2) + bx + (o.alx || 0), (o.armL === 'armUp' ? 2 : o.armL === 'armDown' ? 20 : 13) + by + (o.aly || 0), { flip: true }]);
      L.push([o.armR || 'arm', 24 + bx + (o.arx || 0), (o.armR === 'armUp' ? 2 : o.armR === 'armDown' ? 20 : o.armR === 'armSweep' ? 16 : 13) + by + (o.ary || 0)]);
      L.push([o.up ? 'crownUp' : 'crown', 11 + bx + (o.cx || 0), 4 + by + (o.cy || 0)]);
      return L.concat((o.extra || []).map(function (X) { return [X[0], X[1], X[2] + 2]; }));
    }
    var walk = [], k;
    // six steps: a leg lifts, swings, plants; the body settles on the planted leg; the crown and arms lag behind
    for (k = 0; k < 6; k++) {
      var ph = k / 6 * 6.2832, lift = k === 1 || k === 2, liftR = k === 4 || k === 5;
      walk.push(stand({ liftL: lift, liftR: liftR, lx: lift ? 1 : k < 3 ? 0 : -1, rx: liftR ? 1 : k >= 3 ? 0 : -1, by: (k === 0 || k === 3) ? 1 : 0,
        cx: Math.round(ST.sin(ph) * 1), cy: (k === 0 || k === 3) ? 1 : 0, aly: Math.round(ST.sin(ph)), ary: Math.round(-ST.sin(ph)) }));
    }
    return rig('mire', P, 40, 38, { x: 20, y: 36 }, {
      walk: walk,
      // the wind-up: both arms go up, the crown bristles, it leans back on its roots
      windup: [
        stand({ armL: 'armUp', armR: 'armUp', bx: -1, by: 0, up: true, cy: -1 }),
        stand({ armL: 'armUp', armR: 'armUp', bx: -1, by: -1, up: true, cy: -2, aly: -1, ary: -1 }),
        stand({ armL: 'armUp', armR: 'armUp', bx: -1, by: -1, up: true, cy: -2, aly: -2, ary: -2 })
      ],
      // the blow: both arms driven into the ground before it, the body thrown after them, earth flying
      attack: [
        stand({ armL: 'armDown', armR: 'armDown', bx: 1, by: 2, cy: 1, extra: [['clod', 30, 26], ['clod', 4, 27]] }),
        stand({ armL: 'armDown', armR: 'armDown', bx: 1, by: 2, cy: 2, extra: [['clod', 32, 22], ['clod', 2, 24]] }),
        stand({ armL: 'armDown', armR: 'armDown', bx: 1, by: 2, cy: 2 })
      ],
      // close by: the near arm drawn back over its crown, then swept down and across in front of it
      reach: [stand({ armR: 'armUp', bx: -1, ary: 1, cx: -1 }), stand({ armR: 'armUp', bx: -2, ary: 0, cx: -2, up: true })],
      swipe: [stand({ armR: 'armSweep', bx: 1, cx: 1, extra: [['leaf', 37, 14]] }), stand({ armR: 'armSweep', bx: 2, ary: 2, cx: 2 })],
      // struck: thrown back on its heels, knots shut, leaves shaken out of the crown
      hurt: [stand({ bx: -2, cx: -2, cy: 1, eyes: false, aly: -2, ary: -2, extra: [['leaf', 8, 2], ['leaf', 30, 1], ['leaf', 22, 0]] })]
    });
  }
  // the roots: a front that runs along the floor at a steady pace, bursting up; what it passed sinks back behind it
  function rootsSteer(p, ctx) {
    var tx = Math.floor((p.x + p.vx * 3) / 16), gy = Math.floor((p.gy + 2) / 16), under = ctx.tileAt(tx, gy);
    if (ctx.tileAt(tx, gy - 1) === 1 || (under !== 1 && under !== 2)) { p.vx = 0; if (p.life > 3) p.life = 3; }
    p.trail.push(p.x); if (p.trail.length > 26) p.trail.shift();
    if (p.life % 3 === 0) ctx.particle({ x: p.x, y: p.gy - 1, vx: (ctx.random() - 0.5) * 1.2, vy: -1 - ctx.random() * 1.4, life: 18, max: 18, colour: ctx.random() < 0.5 ? '#3d2c1e' : '#5e4430', size: 1, gravity: 0.12 });
  }
  function rootsDraw(p, pen, cx, cy) {
    var n = p.trail.length, gy = Math.round(p.gy) - cy;
    for (var k = 0; k < n; k += 2) {
      var age = n - 1 - k, h = Math.round(21 - age * 0.8);
      if (h < 2) continue;
      var x = Math.round(p.trail[k]) - cx, lean = ((k * 37) % 5) - 2;
      for (var y = 0; y < h; y++) {
        var w = y < h * 0.3 ? 4 : y < h * 0.6 ? 3 : y < h * 0.85 ? 2 : 1, sx = x + Math.round(lean * y / h) - (w >> 1);
        pen.fillStyle = '#241a12'; pen.fillRect(sx - 1, gy - y, w + 1, 1);
        pen.fillStyle = y % 4 === 1 ? '#80603f' : '#5e4430'; pen.fillRect(sx, gy - y, Math.max(1, w - 1), 1);
      }
      if (h > 8 && k % 4 === 0) { pen.fillStyle = '#7fa332'; pen.fillRect(x + lean + 1, gy - h + 2, 2, 1); pen.fillStyle = '#a9c24a'; pen.fillRect(x + lean + 2, gy - h + 1, 1, 1); }
    }
    pen.fillStyle = '#15170f'; pen.fillRect(Math.round(p.x) - cx - 5, gy, 11, 1);
  }
  function rootLine(e, ctx, max) {
    var len = 8;
    for (; len < max; len += 8) {
      var tx = Math.floor((e.x + e.dir * (14 + len)) / 16), gy = Math.floor((e.y + 2) / 16), under = ctx.tileAt(tx, gy);
      if (ctx.tileAt(tx, gy - 1) === 1 || (under !== 1 && under !== 2)) break;
    }
    return len;
  }
  // stout: struck, it is barely moved and may still begin an attack, as a tree would
  KINDS.rootwalker = { element: 'mire', flying: false, stout: true, body: { w: 16, h: 24 }, hurt: { w: 22, h: 28 }, hp: 14, speed: 0.3, sight: 160, move: 'walk', keep: 56, rig: rootwalkerRig,
    attacks: [
      // too close for roots: a sweep of the near arm, low, in front. It is heavy: a blow does not break it, so step out when the arm goes back
      { name: 'sweep', range: [0, 30], above: 30, below: 20, windup: 26, active: 10, recover: 30, cooldown: 50, grounded: true, steady: true, anims: { windup: 'reach', attack: 'swipe' },
        telling: function (e, ctx, t, w) { e.vx = 0; e.frame = t < w / 2 ? 0 : 1; },
        fire: function (e, ctx) { ctx.sfx('swingheavy'); },
        box: function (e) { return [AC.kit.front(e, -12, 32, 26, 0)]; } },   // the arm comes through its own trunk: standing in it is no shelter
      { name: 'rootline', range: [30, 150], above: 30, below: 30, windup: 50, active: 36, recover: 48, cooldown: 70, grounded: true,
      start: function (e, ctx) { e.vars.len = rootLine(e, ctx, 150); },
      telling: function (e, ctx, t, w) { if (t === 1) ctx.telegraphCrack(e.x + e.dir * (14 + e.vars.len / 2), e.y, e.vars.len / 2, w + 24, TELL); e.vx = 0; },
      fire: function (e, ctx) {
        ctx.sfx('roots'); ctx.shake(2);
        ctx.projectile({ x: e.x + e.dir * 14, y: e.y - 6, gy: e.y, vx: e.dir * 3.2, vy: 0, gravity: 0, life: Math.ceil(e.vars.len / 3.2) + 2, colour: '#5e4430', size: 12, damage: 1, element: 'mire', cause: 'roots', wave: true, quiet: true, trail: [], steer: rootsSteer, draw: rootsDraw });
      },
      resting: function (e) { e.vx *= 0.6; } }
    ] };

  /* ---- the Bog Mound ----
     From the still: a lopsided mound of bog moss, darker in its folds, twigs growing out of it, two small eyes.
     It gets about in hops, squashing as it lands and stretching as it goes up; to strike it sinks into the
     ground, goes under it as a ripple of bubbles toward you, stops, bubbles where it will come up, and comes up. */
  function moundRig() {
    var P = {
      mound: ['......kkkkkk........', '....kknoooOnkk......', '...knoOOoooonnk.....', '..knooOoooonnnnk....', '..knoooonnnnnmnk....', '.knoooonnnnmnnmnk...', '.knnooonnnnnnmmnk...', 'knnnoonnnmnnnnmmnk..',
              'knnnnnnnnnnmnnnmnk..', 'knmnnnnmnnnnnmnmmnk.', 'kmnnmnnnnnmnnnmmnnk.', 'kmmnnmnnmnnnmnnmmmnk', '.kmmmmnmmmmmmmmmmmk.', '..kkkkkkkkkkkkkkkk..'],
      squash: ['.......kkkkkkk........', '....kkknoooOonnkk.....', '..kknooOOoooonnnnkk...', '.knnoooooonnnnnmnnnk..', 'knnnoooonnnnmnnnnmnnk.', 'knnnnnnnnnnnnnmnnnmmnk',
               'knmnnnnmnnnnmnnnnmnmnk', 'kmnnmnnnnnmnnnnmnnmmmk', 'kmmnnmnnmnnnmnnmmmmnnk', '.kmmmmmmmmmmmmmmmmmmk.', '..kkkkkkkkkkkkkkkkkk..'],
      tall: ['.....kkkkk......', '....knoOonk.....', '...knoOOoonk....', '...knooooonk....', '..knoooonnnnk...', '..knooonnnnnk...', '.knnoonnnnmnnk..', '.knnnnnnnnnmnk..', '.knnnnnmnnnnnk..',
             'knmnnnnnnnmnnnk.', 'knnnmnnnnnnmnnk.', 'knnnnnnmnnnnmnk.', 'kmnnnmnnnnmnnmk.', 'kmnnnnnnmnnnmmnk', 'kmmnnmnnnnmnnmmk', '.kmmmmmmmmmmmmk.', '..kkkkkkkkkkkk..'],
      puddle: ['......kkkkkkkk........', '...kkknnooonnnnkkk....', '.kknnnnnnnnmnnnnnnkk..', 'knmnnmnnnnnnnmnnmnnnk.', 'kmmmmmmmmmmmmmmmmmmmmk', '.kkkkkkkkkkkkkkkkkkkk.'],
      ripple: ['...O....o...O.....', '..kkkkkkkkkkkkkk..', '.kmmnmmmmnmmmmmmk.', '..kkkkkkkkkkkkkk..'],
      rippleB: ['.....o...O....o...', '..kkkkkkkkkkkkkk..', '.kmnmmmmmnmmmnmmk.', '..kkkkkkkkkkkkkk..'],
      splash: ['o....n....O....n....o.', '..n....o..k..o....n...', '....k..kn.k.nk..k.....', '..kknkknnknknnkknkk...', '.knnnnnnnnnnnnnnnnnk..', 'kmmmmmmmmmmmmmmmmmmmk.'],
      eyes: ['kEEk.kEEk', 'kEdk.kEdk'],
      eyesShut: ['.........', 'kkkk.kkkk'],
      eyesWide: ['kEEk.kEEk', 'kEdk.kEdk', 'kEEk.kEEk'],
      twig: ['7..7..', 'k2.k6.', '.k2k..', '..k2..', '..k2.7', '..k2k6', '..k1k.', '..k1..'],
      tip: ['.7', 'k2', 'k1']
    };
    // the body in one of its shapes, with its eyes and its two twigs where that shape puts them; `up` lifts all of it
    function body(shape, o) {
      o = o || {};
      var up = o.up || 0, eyes = o.eyes || 'eyes', sway = o.sway || 0;
      var S = { mound: [4, 14, 9, 20, 5, 9, 16, 11], squash: [3, 17, 9, 21, 5, 12, 17, 14], tall: [6, 11, 9, 16, 6, 5, 15, 7] }[shape];
      return [['twig', S[4] + sway, S[5] - up], ['twig', S[6] - sway, S[7] - up, { flip: true }], [shape, S[0], S[1] - up], [eyes, S[2], S[3] - up]].concat(o.extra || []);
    }
    return rig('mire', P, 28, 28, { x: 14, y: 28 }, {
      // on foot: sat, squashed, stretched, and sat blinking (`pose` picks among them from how it moves)
      walk: [body('mound'), body('squash'), body('tall'), body('mound', { eyes: 'eyesShut' })],
      // sinking: squashed, spread into a puddle that still looks out, then only a ripple
      sink: [body('squash', { eyes: 'eyesWide' }), [['puddle', 3, 22], ['eyes', 9, 22], ['tip', 6, 19], ['tip', 18, 20]], [['ripple', 5, 24], ['tip', 9, 22], ['tip', 15, 22]]],
      // under the ground: a ripple of bubbles with two twig tips going along in it
      under: [[['ripple', 5, 24], ['tip', 9, 22], ['tip', 15, 22]], [['rippleB', 5, 24], ['tip', 10, 22], ['tip', 14, 22]]],
      // up: out of the ground in a burst of peat, stretched; then falling back; then sat
      erupt: [body('tall', { up: 6, eyes: 'eyesWide', extra: [['splash', 3, 22]] }), body('tall', { up: 2, extra: [['splash', 3, 23]] }), body('squash')],
      hurt: [body('squash', { eyes: 'eyesShut', sway: 1 })]
    });
  }
  function bubble(ctx, e, big) { ctx.particle({ x: e.x + (ctx.random() - 0.5) * 16, y: e.y - 2, vx: 0, vy: -0.3 - ctx.random() * 0.4, life: big ? 22 : 14, max: big ? 22 : 14, colour: ctx.random() < 0.5 ? '#a4b46c' : '#7b8e4c', size: big && ctx.random() < 0.5 ? 2 : 1, gravity: -0.01 }); }
  KINDS.mound = { element: 'mire', flying: false, body: { w: 16, h: 12 }, hurt: { w: 20, h: 14 }, hp: 11, speed: 0.55, sight: 140, move: 'hop', rig: moundRig,
    // which of its four shapes it is in, from how it moves: up is stretched, a landing and the moment before a hop are squashed
    pose: function (e) {
      var v = e.vars;
      if (!e.onGround) e.frame = e.vy < -0.5 ? 2 : 0;
      else if (v.land > 0 || e.wait < 5) e.frame = 1;
      else e.frame = e.clock % 150 < 8 ? 3 : 0;
    },
    always: function (e) { var v = e.vars; if (!e.onGround) v.air = 1; else if (v.air) { v.air = 0; v.land = 7; } if (v.land > 0) v.land--; },
    attacks: [{ name: 'sink', range: [0, 120], above: 40, below: 40, windup: 30, active: 78, recover: 40, cooldown: 140, grounded: true, moves: true, anims: { windup: 'sink', attack: 'under' },
      telling: function (e, ctx, t, w) { e.vx = 0; e.frame = Math.min(2, Math.floor((t - 1) / w * 3)); if (t === w - 8) ctx.sfx('sink'); if (t >= w - 8) e.vars.shelled = true; },   // sunk once, not over and over
      fire: function (e) { e.vars.shelled = true; },
      during: function (e, ctx, t) {
        var v = e.vars;
        if (t <= 48) {
          // under, toward whoever it is after, only along floor it could stand on
          var dx = ctx.hero.x - e.x; if (Math.abs(dx) > 3) e.dir = dx > 0 ? 1 : -1;
          e.vx = Math.abs(dx) > 3 ? e.dir * 1.7 : 0;
          if (edgeAhead(e, ctx)) e.vx = 0;
          if (t % 4 === 0) bubble(ctx, e, false);
        } else {
          e.vx = 0;
          if (t === 49) ctx.telegraphCircle(e.x, e.y - 3, 15, 26, TELL);
          if (t % 2 === 0) bubble(ctx, e, true);
        }
        e.anim = 'under'; e.frame = (t >> 3) % 2;
        if (t === 74) { v.shelled = false; ctx.sfx('erupt'); ctx.shake(2); e.vy = -3.4; for (var k = 0; k < 14; k++) ctx.particle({ x: e.x + (ctx.random() - 0.5) * 20, y: e.y - 2, vx: (ctx.random() - 0.5) * 2.4, vy: -1.5 - ctx.random() * 2.5, life: 26, max: 26, colour: k % 3 ? '#39482a' : '#7b8e4c', size: k % 4 ? 1 : 2, gravity: 0.15 }); }
        if (t >= 74) { e.anim = 'erupt'; e.frame = 0; }
      },
      box: function (e, t) { return t >= 74 ? [{ x0: e.x - 15 * e.size, x1: e.x + 15 * e.size, y0: e.y - 28 * e.size, y1: e.y + 2 }] : []; },
      resting: function (e, ctx, t) { e.vars.shelled = false; e.anim = 'erupt'; e.frame = Math.min(2, 1 + (t >> 4)); e.vx *= 0.7; },
      end: function (e) { e.vars.shelled = false; } }] };

  /* ---- the Rusalka ----
     From the still: a slender teal figure, eyes alight, hair floating up and out as if under water, the body
     thinning below into wisps, a small light held in one hand. Her hair and her wisps are drawn as curves, so
     that from frame to frame they wave as hair does in water; the rest is text like everything else. */

  // strands as text: each from a root at an angle, curling as it goes, lighter at the root and darker at the tip,
  // two pixels thick for the first part of its length and with a dark underside, so that it reads as hair and not as a line
  function strands(w, h, list, phase, shades, thick) {
    var grid = [], y, x, k;
    for (y = 0; y < h; y++) { grid.push([]); for (x = 0; x < w; x++) grid[y].push('.'); }
    function put(px, py, c, soft) { if (px >= 0 && px < w && py >= 0 && py < h && (!soft || grid[py][px] === '.')) grid[py][px] = c; }
    for (k = 0; k < list.length; k++) {
      var S = list[k], sx = S[0], sy = S[1], a = S[2];
      for (var s = 0; s < S[3]; s += 0.5) {
        a += S[4] + ST.sin(s * 0.35 + phase + k * 1.3) * (S[5] || 0.05);
        sx += ST.cos(a) * 0.5; sy += ST.sin(a) * 0.5;
        var px = Math.round(sx), py = Math.round(sy), f = s / S[3], c = shades[Math.min(shades.length - 1, Math.floor(f * shades.length))];
        put(px, py + 1, 't', true);
        if (f < (thick || 0)) { put(px + 1, py, c); put(px, py + 1, c); put(px + 1, py + 1, 't', true); }
        put(px, py, c);
      }
    }
    return grid.map(function (r) { return r.join(''); });
  }
  // hair from a root on the crown: up, back, down behind the shoulders, one curling forward over the brow
  var HAIR = [[19, 11, -1.6, 16, -0.03], [19, 11, -1.95, 19, -0.03], [18, 11, -2.3, 20, -0.025], [18, 12, -2.65, 18, -0.02], [18, 12, -2.95, 15, 0.025], [20, 11, -1.3, 12, -0.07], [19, 12, 3.3, 12, 0.05], [17, 11, -2.1, 14, 0.02]];
  var FORWARD = [[11, 11, -0.9, 20, 0.02, 0.03], [11, 12, -0.4, 23, 0.02, 0.03], [11, 12, 0.05, 22, 0.015, 0.03], [11, 11, -1.3, 15, 0.03, 0.03], [11, 12, 0.4, 17, -0.01, 0.03]];
  var WISPS = [[8, 1, 1.75, 13, 0.025], [8, 1, 2.15, 10, 0.04]];
  function rusalkaRig() {
    var P = {
      head: ['.tTTTt.', 'tTuuuTt', 'tuGuGut', 'tuuuuut', '.tuUut.', '..tut..'],
      headShut: ['.tTTTt.', 'tTuuuTt', 'tututut', 'tuuuuut', '.tuUut.', '..tut..'],
      body: ['...tut...', '..tuUut..', '.tuUGUut.', '.tuUUuut.', '..tuUut..', '..tuuut..', '.tuuUuut.', '.tuUuuuut', 'tuuuuuuut', 'tuuUuuuTt', '.tuuuuTt.', '..tuuTt..', '...tuT...'],
      armDown: ['tu.', 'tu.', 'tu.', 'tu.', '.tu', '.tu', '.tU', '.tG'],
      armOut: ['.tttttt....', 'tuuuuuuuUGt', '.ttttttttt.'],
      armUp: ['..Gt', '..Ut', '.tut', '.tut', 'tut.', 'tut.', 'tut.', 'tu..', 'tu..', 't...'],
      wisp: ['.yYy.', 'yYYYy', 'YYYYY', 'yYYYy', '.yYy.'],
      wispSmall: ['.y.', 'yYy', '.y.']
    };
    var hair = [], f;
    for (f = 0; f < 4; f++) {
      P['hair' + f] = strands(24, 20, HAIR, f * 1.5708, ['U', 'u', 'u', 'T', 'T'], 0.45);
      P['wild' + f] = strands(24, 20, HAIR.map(function (S) { return [S[0], S[1], S[2] + 0.15, S[3] + 2, S[4], 0.13]; }), f * 1.5708, ['G', 'U', 'u', 'T', 'T'], 0.45);
      P['tail' + f] = strands(16, 16, WISPS, f * 1.5708, ['u', 'u', 'T', 'T', 't'], 0.5);
    }
    for (f = 0; f < 2; f++) P['lash' + f] = strands(36, 24, FORWARD.map(function (S) { return [S[0], S[1], S[2] + (f ? 0.35 : -0.1), S[3] + f * 3, S[4], S[5]]; }), f * 2, ['G', 'U', 'u', 'T', 'T'], 0.4);
    // floating: hair and wisps wave, the body bobs a pixel, the arms hang
    function float(f, o) {
      o = o || {};
      var bob = (o.bob === undefined ? (f % 2) : o.bob), L = [];
      L.push([o.lash !== undefined ? 'lash' + o.lash : (o.wild ? 'wild' : 'hair') + f, o.lash !== undefined ? 8 : 0, bob]);
      L.push(['tail' + f, 11, 26 + bob]);
      L.push(['armDown', 14, 16 + bob]);
      L.push(['body', 15, 15 + bob]);
      L.push([o.eyes === false ? 'headShut' : 'head', 16, 9 + bob]);
      if (o.arm === 'up') L.push(['armUp', 22, 7 + bob]);
      else if (o.arm === 'out') L.push(['armOut', 23, 17 + bob]);
      else L.push(['armDown', 22, 16 + bob, { flip: true }]);
      return L.concat(o.extra || []);
    }
    for (f = 0; f < 4; f++) hair.push(float(f));
    return rig('mire', P, 52, 42, { x: 19, y: 22 }, {
      walk: hair,
      // gathering: the hand goes up and a wisp grows in it; the hair lifts
      windup: [float(0, { arm: 'up', wild: true, extra: [['wispSmall', 23, 4]] }), float(1, { arm: 'up', wild: true, extra: [['wispSmall', 23, 3]] }), float(2, { arm: 'up', wild: true, bob: 0, extra: [['wisp', 22, 1]] })],
      // letting it go: the arm out after it
      attack: [float(3, { arm: 'out', bob: 0, extra: [['wisp', 33, 15]] }), float(0, { arm: 'out', bob: 0 })],
      // close by, she lashes with her hair: it lifts, then all of it comes forward
      lashing: [float(1, { wild: true, bob: 0 }), float(2, { wild: true, bob: 1 })],
      lash: [float(0, { lash: 0, arm: 'out', bob: 0 }), float(1, { lash: 1, arm: 'out', bob: 0 })],
      hurt: [float(2, { wild: true, eyes: false, bob: 1 })]
    });
  }
  // her wisp: a slow light that turns after you, never faster than a walk; it goes out against stone
  function wispSteer(p, ctx) {
    p.age++;
    var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy), top = 1.45;
    if (sp > top) { p.vx *= top / sp; p.vy *= top / sp; }
    ctx.light(p.x, p.y, 34, 0.9); ctx.glow(p.x, p.y, 12, '#f3e3a6', 0.45);
    if (p.age % 5 === 0) ctx.particle({ x: p.x, y: p.y, vx: -p.vx * 0.2, vy: -0.2, life: 16, max: 16, colour: '#fffbe0', size: 1, gravity: -0.01 });
  }
  function wispDraw(p, pen, cx, cy, tick) {
    var x = Math.round(p.x) - cx, y = Math.round(p.y) - cy, flick = (tick >> 2) % 2;
    pen.fillStyle = '#a6eed8'; pen.fillRect(x - Math.round(p.vx * 3) - 1, y - Math.round(p.vy * 3), 2, 1); pen.fillRect(x - Math.round(p.vx * 5), y - Math.round(p.vy * 5), 1, 1);
    pen.fillStyle = '#f3e3a6'; pen.fillRect(x - 2, y - 1, 5, 3); pen.fillRect(x - 1, y - 2, 3, 5);
    pen.fillStyle = '#fffbe0'; pen.fillRect(x - 1 + flick, y - 1, 2, 2);
  }
  KINDS.rusalka = { element: 'mire', flying: true, body: { w: 10, h: 16 }, hurt: { w: 14, h: 22 }, hp: 8, speed: 0.5, sight: 170, move: 'hover', stand: 64, height: 30, rig: rusalkaRig,
    attacks: [
      { name: 'lash', range: [0, 30], above: 24, below: 34, windup: 22, active: 12, recover: 32, cooldown: 80, anims: { windup: 'lashing', attack: 'lash' },
        telling: function (e) { e.vx *= 0.8; e.vy *= 0.8; },
        fire: function (e, ctx) { ctx.sfx('lash'); },
        box: function (e) { return [AC.kit.front(e, -4, 26, 16, 14)]; } },
      { name: 'lure', range: [30, 170], above: 90, below: 120, windup: 46, active: 8, recover: 40, cooldown: 150,
        telling: function (e, ctx, t, w) {
          e.vx *= 0.85; e.vy *= 0.85;
          if (t === 1) ctx.sfx('wisp');
          var hx = e.x + e.dir * 4, hy = e.y - 13 - Math.min(3, t / 12);
          ctx.light(hx, hy, 10 + t * 0.4, 0.8); ctx.glow(hx, hy, 4 + t * 0.2, '#f3e3a6', 0.5);
        },
        fire: function (e, ctx) {
          var hx = e.x + e.dir * 10, hy = e.y - 6, dx = ctx.hero.x - hx, dy = ctx.hero.y - 11 - hy, len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          ctx.sfx('release');
          ctx.projectile({ x: hx, y: hy, vx: dx / len * 0.9, vy: dy / len * 0.9, gravity: 0, life: 240, colour: '#f3e3a6', size: 7, damage: 1, element: 'mire', cause: 'wisp', seek: 0.034, quiet: true, age: 0, steer: wispSteer, draw: wispDraw });
        },
        resting: function (e) { e.vx *= 0.9; e.vy *= 0.9; } }
    ] };

  // the walker, the flyer, and a third that takes some of the walkers' places
  BY_ELEMENT.mire = ['rootwalker', 'rusalka', 'mound'];
})();
