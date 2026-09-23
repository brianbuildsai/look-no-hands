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
      L.push([o.armR || 'arm', (o.armR === 'armUp' ? 24 : o.armR === 'armDown' ? 24 : 24) + bx + (o.arx || 0), (o.armR === 'armUp' ? 2 : o.armR === 'armDown' ? 20 : 13) + by + (o.ary || 0)]);
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
  KINDS.rootwalker = { element: 'mire', flying: false, body: { w: 16, h: 24 }, hurt: { w: 22, h: 28 }, hp: 14, speed: 0.3, sight: 160, move: 'walk', keep: 56, rig: rootwalkerRig,
    attacks: [{ name: 'rootline', range: [22, 150], above: 30, below: 30, windup: 50, active: 36, recover: 48, cooldown: 110, grounded: true,
      start: function (e, ctx) { e.vars.len = rootLine(e, ctx, 150); },
      telling: function (e, ctx, t, w) { if (t === 1) ctx.telegraphCrack(e.x + e.dir * (14 + e.vars.len / 2), e.y, e.vars.len / 2, w + 24, TELL); e.vx = 0; },
      fire: function (e, ctx) {
        ctx.sfx('roots'); ctx.shake(2);
        ctx.projectile({ x: e.x + e.dir * 14, y: e.y - 6, gy: e.y, vx: e.dir * 3.2, vy: 0, gravity: 0, life: Math.ceil(e.vars.len / 3.2) + 2, colour: '#5e4430', size: 12, damage: 1, element: 'mire', cause: 'roots', wave: true, quiet: true, trail: [], steer: rootsSteer, draw: rootsDraw });
      },
      resting: function (e) { e.vx *= 0.6; } }] };

  /* ---- the Bog Mound ---- */
  // (plan 15, task 6)

  /* ---- the Rusalka ---- */
  // (plan 15, task 7)

  BY_ELEMENT.mire = ['rootwalker', 'puff'];
})();
