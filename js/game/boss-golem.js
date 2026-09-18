/* boss-golem.js: the Kiln Golem, keeper of the Great Kiln.

   A furnace that learned to walk: a riveted barrel on short legs, a grate
   in its belly with the fire showing through, a chimney on one shoulder
   and, on its back, a vent. Everything it does comes out of the fire. It
   lifts both fists and brings them down, and a wave of cinders runs along
   the floor; it reaches into its own grate for coals and lobs them, and
   where they land the floor burns for a while. Below six tenths of its
   life it draws breath and empties the furnace in front of it, and it
   leaps, and lands, and the wave goes both ways. Below three tenths the
   lava climbs over the ends of the floor. It turns slowly. The vent on
   its back is soft, and anyone who stands behind it for long is answered
   with steam. */
(function () {
  'use strict';
  var GD = window.Guardians;
  if (!GD) return;

  var PAL = { k: '#1a0806', p: '#5a3e38', q: '#3a2a28', m: '#8a6a5c', l: '#ff6a2b', w: '#ffb347', e: '#ffdc9a', x: '#ffffff', s: '#2a1b19', d: '#120806' };

  /* ---- the parts ---- */

  function grate(rows) { return rows.map(function (r) { return '.kqqppk' + r + 'kppk.'; }); }
  var FIRE = ['llkllkllkllkll', 'lwklwkwlkwlkwl', 'wwkwekewkwwkww', 'wekeekeekeekew', 'wwkwekewkwwkww', 'lwklwkwlkwlkwl', 'llkllkllkllkll'];
  var PARTS = {
    torso: [
      '......kkkkkkkkkkkkkk......', '....kkppppppppppppmpkk....', '...kpppmppppppppppppppk...', '..kqppppppppppppppppppmk..', '.kqqpppkkkkkkkkkkkkkkpppk.'
    ].concat(grate(FIRE)).concat([
      '.kqqpppkkkkkkkkkkkkkkpppk.', '.kqqppppppppppppppppppppk.', '.kqqpmppppppppmpppppppmpk.', '..kqqppppppppppppppppppk..', '...kqqqppppppppppppppqk...', '....kkqqqqppppppppqqkk....', '......kkkkkkkkkkkkkk......'
    ]),
    grateHot: ['wwkwwkwwkwwkww', 'wekewkwekewkew', 'eekeekeekeekee', 'exkeekexkeekxe', 'eekeekeekeekee', 'wekewkwekewkew', 'wwkwwkwwkwwkww'],
    grateOpen: ['wwwwwwwwwwwwww', 'weeeeeeeeeeeew', 'weexxxxxxxxeew', 'eexxxxxxxxxxee', 'weexxxxxxxxeew', 'weeeeeeeeeeeew', 'wwwwwwwwwwwwww'],
    grateDead: ['ddkddkddkddkdd', 'ddkddkddkddkdd', 'ddkddkddkddkdd', 'dskddkdskddkds', 'ddkddkddkddkdd', 'ddkddkddkddkdd', 'ddkddkddkddkdd'],
    cracks1: GD.dots(26, 19, [[3, 6, 'l'], [4, 7, 'l'], [4, 8, 'w'], [3, 9, 'l'], [22, 13, 'l'], [23, 14, 'w'], [22, 15, 'l'], [12, 14, 'l'], [13, 15, 'l'], [5, 2, 'l'], [6, 3, 'l']]),
    cracks2: GD.dots(26, 19, [[3, 6, 'w'], [4, 7, 'e'], [4, 8, 'w'], [3, 9, 'l'], [2, 10, 'l'], [22, 13, 'w'], [23, 14, 'e'], [22, 15, 'w'], [21, 16, 'l'], [12, 14, 'w'], [13, 15, 'e'], [14, 15, 'w'], [15, 16, 'l'], [5, 2, 'w'], [6, 3, 'e'], [7, 3, 'l'], [18, 1, 'l'], [19, 2, 'w'], [20, 3, 'l'], [23, 7, 'l'], [22, 8, 'w'], [23, 9, 'l'], [9, 13, 'l'], [8, 14, 'l']]),
    head: ['..kkkkkkkk..', '.kppppppppk.', 'kppmppppmppk', 'kppkkkkkkkpk', 'kpkkewkewkkk', 'kppkkkkkkkpk', 'kqppppppppqk', '.kqqppppqqk.', '..kkkkkkkk..'],
    headRoar: ['..kkkkkkkk..', '.kppppppppk.', 'kppmppppmppk', 'kppkkkkkkkpk', 'kpkxxekxxekk', 'kppkkkkkkkpk', 'kqpklwwwlkqk', '.kqklllllkk.', '..kkkkkkkk..'],
    headDim: ['..kkkkkkkk..', '.kppppppppk.', 'kppmppppmppk', 'kppkkkkkkkpk', 'kpkkqskqskkk', 'kppkkkkkkkpk', 'kqppppppppqk', '.kqqppppqqk.', '..kkkkkkkk..'],
    chimney: ['kkkkkkk', 'kmpppqk', 'kkkkkkk', '.kppqk.', '.kppqk.', '.kmpqk.', '.kppqk.', '.kppqk.', '.kppqk.', '.kppqk.'],
    vent: ['.kkkkk', 'kqqqqk', 'kllllk', 'kqqqqk', 'kllllk', 'kqqqqk', 'kllllk', 'kqqqqk', '.kkkkk'],
    ventHot: ['.kkkkk', 'kqwwqk', 'kxeewk', 'kqwwqk', 'kxeewk', 'kqwwqk', 'kxeewk', 'kqwwqk', '.kkkkk'],
    arm: ['..kkkkkk..', '.kpppmppk.', 'kqpppppppk', 'kqpppppppk', 'kqppppppk.', '.kqpppppk.', '.kqppppk..', '.kqppppk..', '.kkkkkkk..', '.kmmmmmk..', '.kkkkkkk..', '.kqppppk..', 'kqppppppk.', 'kqpppppppk', 'kqppmppppk', 'kkkkkkkkkk', 'kqpppppppk', 'kqplpplppk', 'kqpppppppk', 'kqqpppppqk', '.kkkkkkkk.'],
    armDiag: ['kkkkkk.............', 'kpppmpkk...........', 'kppppppkk..........', 'kqppppppkk.........', 'kqqppppppkk........', '.kqqppppppkk.......', '..kqqpppppmkk......', '...kkqqppppppkk....', '....kkmmmppppkk....', '.....kkqqpppppkk...', '......kqqppppppkk..', '.......kqqppppppkk.', '........kkkppppppkk', '.........kqqpppplpk', '..........kqppppppk', '...........kqpplppk', '............kqqpppk', '.............kkqqkk', '...............kkk.'],
    leg: ['.kkkkkkkk.', 'kqpppppppk', 'kqppppmppk', 'kqpppppppk', '.kqpppppk.', '.kkkkkkkk.', '.kmmmmmmk.', '.kkkkkkkk.', '.kqpppppk.', 'kqpppppppk', 'kqpppppppk', 'kqqppppppk', 'kkkkkkkkkk'],
    legBent: ['..kkkkkkkk..', '.kqppppppmk.', 'kqppppppppk.', 'kkkkkkkkkkk.', '.kmmmmmmmk..', '.kkkkkkkkk..', 'kqppppppppk.', 'kqqpppppppk.', 'kkkkkkkkkkk.'],
    coal: ['.kkk.', 'klwlk', 'kwewk', 'klwlk', '.kkk.'],
    rubble: ['...........kkkkkk.............', '.........kkqqppqqkk...........', '......kkkqqpppkkqqpkkk........', '....kkqqppkkkqqppkqqppkk......', '...kqqppkkqqppkkqqpppkqqkk....', '..kqqpkkqqlpkkqqpkkqqppkqqk...', '.kqqkkqqppkkqqppkkqlpkkqqppkk.', 'kqqpkqqpppkqqpppkqqppkqqpppqqk', 'kqqqqqqqqqqqqqqqqqqqqqqqqqqqqk', 'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk']
  };

  /* ---- the poses ----
     A frame is 96 by 72 with the feet at (48, 72); it faces right. The arms
     are one straight part and one drawn on the diagonal, turned by quarters
     about the shoulder, which gives eight directions. */

  var ARM = {
    down:     function (sx, sy) { return ['arm', sx - 5, sy - 3]; },
    fwd:      function (sx, sy) { return ['arm', sx - 3, sy - 5, { rot: 3 }]; },
    back:     function (sx, sy) { return ['arm', sx - 18, sy - 5, { rot: 1 }]; },
    up:       function (sx, sy) { return ['arm', sx - 5, sy - 18, { rot: 2 }]; },
    downfwd:  function (sx, sy) { return ['armDiag', sx - 3, sy - 3]; },
    upfwd:    function (sx, sy) { return ['armDiag', sx - 3, sy - 16, { rot: 3 }]; },
    downback: function (sx, sy) { return ['armDiag', sx - 16, sy - 3, { rot: 1 }]; },
    upback:   function (sx, sy) { return ['armDiag', sx - 16, sy - 16, { rot: 2 }]; }
  };
  var FIST = { down: [0, 15], fwd: [15, 0], back: [-15, 0], up: [0, -15], downfwd: [12, 12], upfwd: [12, -12], downback: [-12, 12], upback: [-12, -12] };

  function pose(o, cracks) {
    var lean = o.lean || 0, drop = (o.drop || 0) + (o.bob || 0), tx = 35 + lean, ty = 41 + drop;
    var near = o.near || 'down', far = o.far || near, bent = o.bent || drop >= 4, lifts = o.legs || [0, 0], tuck = o.tuck || 0;
    var nsx = tx + 5, fsx = tx + 21, sy = ty + 4, hd = o.headAt || [0, 0], layers = [];
    layers.push(ARM[far](fsx, sy + (o.farDy || 0)));
    if (bent) { layers.push(['legBent', 49, 63 - lifts[1] - tuck]); layers.push(['legBent', 36, 63 - lifts[0] - tuck]); }
    else { layers.push(['leg', 50, 59 - lifts[1]]); layers.push(['leg', 37, 59 - lifts[0]]); }
    if (!o.noChimney) layers.push(['chimney', tx + 1, ty - 8]);
    layers.push([o.vent ? 'ventHot' : 'vent', tx - 5, ty + 6]);
    layers.push(['torso', tx, ty]);
    if (o.grate) layers.push(['grate' + o.grate, tx + 7, ty + 5]);
    if (cracks) layers.push(['cracks' + cracks, tx, ty]);
    if (!o.noHead) layers.push([o.head || 'head', tx + 11 + hd[0], ty - 6 + hd[1]]);
    if (o.headOnFloor) layers.push(['headDim', 66, 63]);
    if (!o.noArm) layers.push(ARM[near](nsx, sy + (o.nearDy || 0)));
    if (o.coal) layers.push(['coal', nsx + FIST[near][0] - 2, sy + FIST[near][1] - 3]);
    return layers;
  }

  function anims(cracks) {
    function P(o) { return pose(o, cracks); }
    var walk = [], k;
    for (k = 0; k < 6; k++) walk.push(P({ lean: 1, bob: k === 2 || k === 5 ? 1 : 0, legs: [[3, 2, 0, 0, 0, 0][k], [0, 0, 0, 3, 2, 0][k]], near: k < 3 ? 'down' : 'downfwd', far: k < 3 ? 'downfwd' : 'down' }));
    return {
      idle: [P({}), P({}), P({ bob: 1 }), P({ bob: 1, nearDy: 1 })],
      walk: walk,
      wake: [P({ drop: 9, lean: 3, head: 'headDim', headAt: [1, 3], grate: 'Dead' }), P({ drop: 9, lean: 3, head: 'headDim', headAt: [1, 3], grate: 'Dead' }), P({ drop: 6, lean: 2, head: 'headDim' }), P({ drop: 2, grate: 'Hot' }), P({ lean: -2, near: 'upfwd', far: 'upback', head: 'headRoar', headAt: [0, -1], grate: 'Hot', vent: true }), P({ lean: -2, bob: 1, near: 'upfwd', far: 'upback', head: 'headRoar', headAt: [0, -1], grate: 'Hot', vent: true })],
      reel: [P({ drop: 8, lean: 3, head: 'headDim', headAt: [1, 2] }), P({ drop: 9, lean: 3, head: 'headDim', headAt: [1, 3] })],
      slamUp: [P({ lean: -1, near: 'upfwd', grate: 'Hot' }), P({ lean: -2, near: 'up', headAt: [0, -1], grate: 'Hot' }), P({ lean: -3, near: 'upback', head: 'headRoar', headAt: [-1, -1], grate: 'Hot' })],
      slamDown: [P({ lean: 2, near: 'upfwd', head: 'headRoar' }), P({ lean: 5, drop: 5, near: 'downfwd', head: 'headRoar' }), P({ lean: 7, drop: 9, near: 'down', head: 'headRoar', headAt: [1, 1] })],
      slamStuck: [P({ lean: 7, drop: 9, near: 'down', head: 'headDim', headAt: [1, 2] }), P({ lean: 7, drop: 9, near: 'down', head: 'headDim', headAt: [1, 2] }), P({ lean: 5, drop: 6, near: 'downfwd' })],
      reach: [P({ lean: 1, near: 'downfwd', far: 'down', grate: 'Open' }), P({ near: 'fwd', far: 'down', grate: 'Open', coal: true }), P({ lean: -2, near: 'upback', far: 'downfwd', coal: true, grate: 'Hot' })],
      toss: [P({ lean: -2, near: 'upback', far: 'downfwd', coal: true, grate: 'Hot' }), P({ lean: 1, near: 'up', far: 'down', coal: true, grate: 'Hot' }), P({ lean: 4, near: 'fwd', far: 'downback', head: 'headRoar' })],
      inhale: [P({ lean: -2, near: 'downback', headAt: [0, -1], grate: 'Hot', vent: true }), P({ lean: -3, drop: -1, near: 'downback', headAt: [0, -1], grate: 'Hot', vent: true }), P({ lean: -4, drop: -2, near: 'back', headAt: [-1, -2], grate: 'Open', vent: true })],
      breath: [P({ lean: 4, drop: 2, near: 'downback', head: 'headRoar', grate: 'Open', vent: true }), P({ lean: 4, drop: 3, near: 'downback', head: 'headRoar', headAt: [1, 0], grate: 'Open', vent: true })],
      cough: [P({ lean: 3, drop: 3, head: 'headDim', headAt: [1, 1] }), P({ lean: 2, drop: 4, head: 'headDim', headAt: [1, 2] }), P({ lean: 1, drop: 1 })],
      crouch: [P({ drop: 4, near: 'downback' }), P({ drop: 8, lean: -1, near: 'back', grate: 'Hot' })],
      air: [P({ bent: true, tuck: 4, near: 'up', head: 'headRoar', grate: 'Hot' }), P({ bent: true, tuck: 3, near: 'upfwd', head: 'headRoar', grate: 'Hot' })],
      land: [P({ drop: 9, lean: 2, near: 'down', head: 'headRoar' }), P({ drop: 9, lean: 2, near: 'down', head: 'headDim', headAt: [0, 1] }), P({ drop: 5, lean: 1, near: 'downfwd' })],
      ventWind: [P({ lean: 3, drop: 3, near: 'downfwd', head: 'headDim', vent: true }), P({ lean: 5, drop: 4, near: 'downfwd', head: 'headDim', vent: true })],
      ventBlow: [P({ lean: 7, drop: 5, near: 'downfwd', head: 'headRoar', vent: true }), P({ lean: 6, drop: 5, near: 'downfwd', head: 'headRoar', vent: true })],
      death: [P({ drop: 8, lean: 3, head: 'headDim', headAt: [1, 2] }), P({ drop: 9, lean: 5, head: 'headDim', headAt: [2, 4], grate: 'Dead' }), P({ drop: 9, lean: 5, head: 'headDim', headAt: [4, 7], grate: 'Dead', noChimney: true }), P({ drop: 11, lean: 5, noHead: true, headOnFloor: true, grate: 'Dead', noChimney: true }), P({ drop: 13, lean: 4, noHead: true, headOnFloor: true, grate: 'Dead', noChimney: true, noArm: true }), [['rubble', 33, 62], ['headDim', 66, 63]]]
    };
  }

  function buildRig() {
    var sets = [0, 1, 2].map(function (c) { return GD.rig(PAL, PARTS, 96, 72, { x: 48, y: 72 }, anims(c)); });
    return { frames: sets[0].frames, flipped: sets[0].flipped, anchor: sets[0].anchor, byPhase: sets };
  }

  /* ---- what it does ---- */

  var FLAME = ['#ff6a2b', '#ffb347', '#ffdc9a', '#ff8c42'];
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  // the floor it may stand on: narrower once the lava has climbed
  function floorOf(e) { var A = e.arena, inset = e.vars.lavaUp ? 48 : 0; return { left: A.left + inset, right: A.right - inset }; }
  function cinders(e, ctx, x, y, n, speed) {
    for (var k = 0; k < n; k++) { var a = -Math.PI * ctx.random(), v = speed * (0.4 + ctx.random()); ctx.particle({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 20 + ctx.random() * 24, max: 44, colour: FLAME[k % 4], size: ctx.random() < 0.3 ? 2 : 1, gravity: 0.06 }); }
  }
  // a wave of cinders that runs along the floor until it meets a wall; it is jumped
  function wave(e, ctx, dir, from) {
    ctx.projectile({ x: e.x + dir * (from || 24), y: e.arena.groundY - 5, vx: dir * (e.phase ? 2.7 : 2.2), vy: 0, life: 170, colour: '#ff6a2b', size: 9, damage: 1, element: 'plain', gravity: 0, wave: true });
  }

  var ATTACKS = {
    // both fists, overhead, then the floor
    slam: {
      name: 'slam', windup: 54, active: 8, recover: 58, cooldown: 70, anims: { windup: 'slamUp', attack: 'slamDown', recover: 'slamStuck' },
      telling: function (e, ctx, t, w) {
        var A = e.arena, b = GD.front(e, -6, 34, 30, 0);
        if (t === 1) { ctx.telegraph(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, w, '#ff6a2b'); ctx.telegraphLine(e.x + e.dir * 34, A.groundY - 3, e.dir > 0 ? A.right + 32 : A.left - 32, A.groundY - 3, w, '#ffb347'); if (e.phase === 2) ctx.telegraphLine(e.x - e.dir * 20, A.groundY - 3, e.dir > 0 ? A.left - 32 : A.right + 32, A.groundY - 3, w, '#ffb347'); ctx.sfx('roar'); }
        ctx.glow(e.x + e.dir * 2, e.y - 22, 16 + t / w * 16, '#ff6a2b', 0.2 + 0.2 * t / w);
        if (t % 3 === 0) ctx.particle({ x: e.x - e.dir * 4 + (ctx.random() - 0.5) * 20, y: e.y - 52 - ctx.random() * 8, vx: 0, vy: -0.5, life: 16, max: 16, colour: FLAME[t % 4], size: 1, gravity: -0.02 });
      },
      fire: function (e, ctx) {
        ctx.shake(6); ctx.sfx('boom');
        cinders(e, ctx, e.x + e.dir * 14, e.y - 1, 30, 3.2);
        ctx.spark(e.x + e.dir * 14, e.y - 2, '#ffdc9a', 14, 2.4, 18, 0.05);
        wave(e, ctx, e.dir); if (e.phase === 2) wave(e, ctx, -e.dir, 16);
      },
      box: function (e, t) { var b = GD.front(e, -6, 34, 30, 0); b.damage = 1; b.element = 'plain'; return [b]; },
      resting: function (e, ctx, t) { if (t % 9 === 0) ctx.particle({ x: e.x + e.dir * (10 + ctx.random() * 10), y: e.y - 2, vx: 0, vy: -0.4, life: 24, max: 24, colour: '#5a3e38', size: 2, gravity: -0.01 }); }
    },

    // three coals out of its own grate, lobbed; where each lands the floor burns
    coals: {
      name: 'coals', windup: 50, active: 36, recover: 34, cooldown: 80, loop: 12, anims: { windup: 'reach', attack: 'toss' },
      start: function (e) { e.vars.thrown = 0; },
      telling: function (e, ctx, t, w) {
        if (t === 1) ctx.sfx('castember');
        ctx.glow(e.x + e.dir * 3, e.y - 22, 22, '#ffb347', 0.3);
        if (t % 4 === 0) ctx.particle({ x: e.x + e.dir * 6, y: e.y - 24, vx: e.dir * (0.5 + ctx.random()), vy: -0.6 - ctx.random(), life: 18, max: 18, colour: FLAME[t % 4], size: 1, gravity: 0.03 });
      },
      during: function (e, ctx, t) {
        if ((t - 1) % 12 !== 8 || e.vars.thrown >= 3) return;
        var hero = ctx.hero, A = e.arena, F = floorOf(e), n = e.vars.thrown++, T = 54, g = 0.12;
        var hx = e.x + e.dir * 22, hy = e.y - 38, tx = clamp(hero.x + [0, 46, -42][n] * e.dir + hero.vx * 12, F.left + 10, F.right - 10);
        ctx.projectile({ x: hx, y: hy, vx: (tx - hx) / T, vy: (A.groundY - hy) / T - g * (T - 1) / 2, gravity: g, life: 240, colour: '#ffb347', size: 5, damage: 1, element: 'ember', coal: true, cause: 'coal',
          land: function (p) {
            ctx.hazard({ x0: p.x - 11, x1: p.x + 11, y0: A.groundY - 11, y1: A.groundY, life: e.phase ? 210 : 160, damage: 1, element: 'ember', colour: '#ff6a2b', fire: true });
            cinders(e, ctx, p.x, A.groundY - 2, 12, 2); ctx.sfx('hit');
          } });
        ctx.telegraphCircle(tx, A.groundY - 2, 13, T, '#ff6a2b');
        cinders(e, ctx, hx, hy, 5, 1.5);
      }
    },

    // the furnace emptied in front of it; the place to be is behind
    breath: {
      name: 'breath', windup: 62, active: 84, recover: 56, cooldown: 80, loop: 8, anims: { windup: 'inhale', attack: 'breath', recover: 'cough' },
      telling: function (e, ctx, t, w) {
        var b = GD.front(e, 12, 112, 28, 0);
        if (t === 1) { ctx.telegraph(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, w, '#ff6a2b'); ctx.sfx('roar'); }
        // the air goes in
        for (var k = 0; k < 2; k++) { var a = (ctx.random() - 0.5) * 1.2, r = 40 + ctx.random() * 50; ctx.particle({ x: e.x + e.dir * (12 + Math.cos(a) * r), y: e.y - 24 + Math.sin(a) * r, vx: -e.dir * Math.cos(a) * r / 16, vy: -Math.sin(a) * r / 16, life: 15, max: 15, colour: k ? '#ffdc9a' : '#8a6a5c', size: 1, gravity: 0 }); }
        ctx.glow(e.x + e.dir * 3, e.y - 22, 18 + t / w * 22, '#ffdc9a', 0.15 + 0.3 * t / w);
      },
      box: function (e, t) { var b = GD.front(e, 12, Math.min(112, 28 + t * 5), 28, 0); b.damage = 1; b.element = 'ember'; return [b]; },
      during: function (e, ctx, t) {
        var reach = Math.min(112, 28 + t * 5), k;
        for (k = 0; k < 8; k++) { var v = 2.4 + ctx.random() * 2.6; ctx.particle({ x: e.x + e.dir * 13, y: e.y - 22 + (ctx.random() - 0.5) * 6, vx: e.dir * v, vy: (ctx.random() - 0.3) * 1.2, life: Math.round(reach / v * (0.7 + ctx.random() * 0.4)), max: 40, colour: k < 2 ? '#ffffff' : FLAME[k % 4], size: k < 2 ? 2 : ctx.random() < 0.5 ? 4 : 3, gravity: 0.025 }); }
        // and the vent screams
        ctx.particle({ x: e.x - e.dir * 20, y: e.y - 26 + (ctx.random() - 0.5) * 6, vx: -e.dir * (1 + ctx.random()), vy: -0.3, life: 18, max: 18, colour: '#ffdc9a', size: 1, gravity: -0.02 });
        ctx.glow(e.x + e.dir * 50, e.y - 14, 60, '#ff6a2b', 0.3); ctx.light(e.x + e.dir * 50, e.y - 14, 70, 0.9);
        if (t === 1 || t === 44) ctx.sfx('breath');
        if (t % 14 === 1) ctx.shake(1.5);
      },
      resting: function (e, ctx, t) { if (t % 7 === 0) ctx.particle({ x: e.x + e.dir * 12, y: e.y - 22, vx: e.dir * 0.4, vy: -0.5, life: 30, max: 30, colour: '#5a3e38', size: 2, gravity: -0.01 }); }
    },

    // it leaves the floor, and comes down where you were
    leap: {
      name: 'leap', windup: 52, active: 50, recover: 52, cooldown: 70, moves: true, anims: { windup: 'crouch', attack: 'air', recover: 'land' },
      start: function (e, ctx) { var F = floorOf(e); e.vars.tx = clamp(ctx.hero.x, F.left + 24, F.right - 24); e.vars.landed = 0; },
      telling: function (e, ctx, t, w) {
        var A = e.arena;
        if (t === 1) { ctx.telegraphCircle(e.vars.tx, A.groundY - 2, 30, w + 40, '#ff6a2b'); ctx.telegraph(e.vars.tx - 28, A.groundY - 16, 56, 16, w + 40, '#ff6a2b'); }
        e.vx = 0;
        if (t % 5 === 0) ctx.particle({ x: e.x + (ctx.random() - 0.5) * 26, y: e.y - 1, vx: (ctx.random() - 0.5), vy: -0.6, life: 14, max: 14, colour: '#8a6a5c', size: 1, gravity: 0.02 });
      },
      fire: function (e, ctx) { e.vy = -6.4; e.vx = (e.vars.tx - e.x) / 40; e.onGround = false; ctx.sfx('jump'); cinders(e, ctx, e.x, e.y - 1, 12, 2); },
      during: function (e, ctx, t) {
        if (e.vars.landed) { e.vx = 0; e.anim = 'land'; e.frame = 0; return; }
        if (t > 8 && e.onGround) {
          e.vars.landed = t; e.vx = 0; e.anim = 'land'; e.frame = 0;
          ctx.shake(8); ctx.sfx('boom'); cinders(e, ctx, e.x - 12, e.y - 1, 20, 3.4); cinders(e, ctx, e.x + 12, e.y - 1, 20, 3.4);
          wave(e, ctx, 1, 20); wave(e, ctx, -1, 20);
        }
      },
      box: function (e, t) { return e.vars.landed && t - e.vars.landed < 8 ? [{ x0: e.x - 28, x1: e.x + 28, y0: e.y - 16, y1: e.y, damage: 1, element: 'plain' }] : []; }
    },

    // for whoever stands behind it too long: the vent, all at once
    vent: {
      name: 'vent', windup: 46, active: 14, recover: 40, cooldown: 50, keepFacing: true, anims: { windup: 'ventWind', attack: 'ventBlow' },
      telling: function (e, ctx, t, w) {
        var b = GD.front(e, -54, -8, 42, 0);
        if (t === 1) { ctx.telegraph(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, w, '#ffdc9a'); ctx.sfx('freeze'); }
        ctx.glow(e.x - e.dir * 18, e.y - 24, 10 + t / w * 14, '#ffdc9a', 0.3 + 0.3 * t / w);
      },
      fire: function (e, ctx) { ctx.sfx('castember'); ctx.shake(3); },
      box: function (e, t) { var b = GD.front(e, -54, -8, 42, 0); b.damage = 1; b.element = 'plain'; return [b]; },
      during: function (e, ctx, t) { for (var k = 0; k < 6; k++) { var v = 2 + ctx.random() * 3; ctx.particle({ x: e.x - e.dir * 18, y: e.y - 24 + (ctx.random() - 0.5) * 8, vx: -e.dir * v, vy: (ctx.random() - 0.5) * 1.6, life: 10 + ctx.random() * 8, max: 18, colour: k % 2 ? '#ffffff' : '#ffdc9a', size: 2, gravity: -0.03 }); } },
      end: function (e, ctx) { e.dir = GD.towards(e, ctx.hero); e.vars.behind = 0; e.vars.turn = 0; }
    }
  };

  // what comes next is written down; where the Warden stands can change it
  var SCRIPTS = [['slam', 'coals', 'slam', 'coals'], ['breath', 'slam', 'leap', 'coals'], ['leap', 'breath', 'slam', 'coals', 'leap', 'slam']];

  function think(e, ctx) {
    var hero = ctx.hero, v = e.vars, dx = hero.x - e.x, ad = Math.abs(dx), facing = dx * e.dir >= 0, F = floorOf(e);
    // it turns slowly, and knows when someone is at its back
    if (!facing && ad > 6) { v.turn = (v.turn || 0) + 1; if (v.turn > (e.phase === 2 ? 40 : 54)) { e.dir = -e.dir; v.turn = 0; } } else v.turn = 0;
    v.behind = !facing && ad < 64 ? (v.behind || 0) + 1 : Math.max(0, (v.behind || 0) - 2);
    // it walks toward her, heavily
    var speed = [0.42, 0.5, 0.6][e.phase], walking = facing && ad > 38 && e.x + e.dir * 2 > F.left + 20 && e.x + e.dir * 2 < F.right - 20;
    e.vx = walking ? e.dir * speed : 0;
    e.anim = walking ? 'walk' : 'idle'; e.state = walking ? 'walk' : 'idle';
    if (walking) { var was = e.frame; e.frame = Math.floor(e.clock / 9) % 6; if (was !== e.frame && (e.frame === 2 || e.frame === 5)) { ctx.shake(1.2); ctx.sfx('land'); ctx.particle({ x: e.x + e.dir * (e.frame === 2 ? -6 : 8), y: e.y - 1, vx: -e.dir * 0.4, vy: -0.5, life: 16, max: 16, colour: '#8a6a5c', size: 2, gravity: 0.02 }); } }
    else e.frame = Math.floor(e.clock / 16) % 4;
    if (e.cooldown > 0 || !hero.alive) return null;
    if (v.behind > 26) return ATTACKS.vent;
    if (!facing) return null;
    var script = SCRIPTS[e.phase], want = script[e.script % script.length];
    // the wave of a slam crosses the whole floor, so it is thrown from anywhere; the breath is not
    if (want === 'breath' && ad > 108) want = 'leap';
    if (want === 'leap' && ad < 60) want = 'slam';
    if (want === 'coals' && ad < 44) want = 'slam';
    e.script++;
    return ATTACKS[want];
  }

  function always(e, ctx) {
    var v = e.vars, A = e.arena, F = floorOf(e), hero = ctx.hero;
    v.heroBehind = (hero.x - e.x) * e.dir < -4;
    if (e.onGround) e.x = clamp(e.x, F.left + 14, F.right - 14);
    // the fire shows through the grate, and the chimney smokes
    ctx.glow(e.x + e.dir * 2, e.y - 22, 15 + 2 * Math.sin(e.clock * 0.1), '#ff6a2b', 0.16 + e.phase * 0.07);
    ctx.light(e.x, e.y - 24, 64, 0.85);
    if (e.clock % (e.phase === 2 ? 5 : 9) === 0) ctx.particle({ x: e.x - e.dir * 9 + (ctx.random() - 0.5) * 3, y: e.y - 40, vx: -e.dir * 0.15 + (ctx.random() - 0.5) * 0.2, vy: -0.45, life: 46, max: 46, colour: e.phase === 2 && ctx.random() < 0.4 ? '#ff8c42' : '#5a3e38', size: 2, gravity: -0.006 });
    if (e.phase && e.clock % 7 === 0) ctx.particle({ x: e.x + (ctx.random() - 0.5) * 22, y: e.y - 8 - ctx.random() * 26, vx: 0, vy: -0.3, life: 18, max: 18, colour: FLAME[e.clock % 4], size: 1, gravity: -0.02 });
    // below three tenths the lava climbs over the ends of the floor
    if (v.lavaAt && e.clock >= v.lavaAt) {
      v.lavaAt = 0; v.lavaUp = true;
      A.edges.forEach(function (tx) { ctx.setTile(tx, A.row, 4); cinders(e, ctx, tx * 16 + 8, A.groundY, 8, 2.6); });
      ctx.shake(5); ctx.sfx('boom');
    }
  }

  function onPhase(e, ctx, n) {
    var A = e.arena;
    cinders(e, ctx, e.x, e.y - 20, 40, 3.5);
    if (n === 2 && A.edges) {
      e.vars.lavaAt = e.clock + 150;
      ctx.telegraph(A.left, A.groundY - 8, 48, 24, 150, '#ff6a2b'); ctx.telegraph(A.right - 48, A.groundY - 8, 48, 24, 150, '#ff6a2b');
    }
  }
  function waking(e, ctx, t) {
    if (t === 62) { ctx.sfx('roar'); ctx.shake(5); cinders(e, ctx, e.x, e.y - 22, 30, 3); }
    if (t > 40) ctx.glow(e.x + e.dir * 2, e.y - 22, 14 + t * 0.2, '#ff6a2b', 0.3);
  }
  // the fire goes out; the lava crusts over, and the way across is a floor
  function fall(e, ctx) {
    var A = e.arena;
    (A.edges || []).concat(A.pits || []).forEach(function (tx) { ctx.setTile(tx, A.row, 1); ctx.spark(tx * 16 + 8, A.groundY, '#8a6a5c', 5, 1.2, 30, -0.01); });
    e.vars.lavaAt = 0;
  }

  GD.register('golem', {
    name: 'The Kiln Golem', title: 'KEEPER OF THE GREAT KILN', element: 'ember', flying: false,
    hp: 270, body: { w: 24, h: 38 }, phases: [0.6, 0.3], wake: 110, reel: 80,
    rig: buildRig, attacks: ATTACKS, think: think, always: always, onPhase: onPhase, fall: fall, waking: waking,
    // it does not go quietly: the plates burst one after another, and then the fire is out
    dyingStep: function (e, ctx) { if (e.dying < 60 && e.dying % 9 === 0) { cinders(e, ctx, e.x + (ctx.random() - 0.5) * 24, e.y - 8 - ctx.random() * 26, 14, 2.6); ctx.shake(2.5); ctx.sfx('hit'); } if (e.dying === 58) { cinders(e, ctx, e.x, e.y - 12, 50, 4); ctx.sfx('boom'); } },
    tempo: function (e) { return [1, 0.8, 0.6][e.phase]; },
    hurtBoxes: function (e) {
      var boxes = [];
      // the vent on its back, for whoever has got behind it
      if (e.vars.heroBehind) boxes.push({ x0: e.dir > 0 ? e.x - 24 : e.x + 6, x1: e.dir > 0 ? e.x - 6 : e.x + 24, y0: e.y - 36, y1: e.y - 10, mult: 1.5 });
      boxes.push({ x0: e.x - 13, x1: e.x + 13, y0: e.y - 38, y1: e.y, mult: 1 });
      return boxes;
    }
  });
})();
