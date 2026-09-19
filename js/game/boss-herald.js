/* boss-herald.js: the Storm Herald, who conducts the Gallery of Rails.

   A tall thing in a tailcoat that does not touch the floor, a pale mask
   under hair that stands up like a struck tree, and a baton. The hall is
   its orchestra: two rails laid along the floor and four pylons in the
   corners. It beats out a bar and a mark is laid where you stand on every
   beat; then the bolts fall in the same rhythm, in the same places. It
   points, a warning sweeps along one rail, and that half of the floor is
   live. It is gone, and above you, and the bolt comes straight down. It
   sets two balls of lightning waltzing toward you, which can be struck,
   and a ball struck back into it undoes it. Below half its life the
   pylons join in arcs that turn about the hall like the hand of a clock.
   After each of its great pieces it has nothing left, and sinks to the
   floor, and is open. */
(function () {
  'use strict';
  var GD = window.Guardians;
  if (!GD) return;

  var PAL = { k: '#0e0a1c', p: '#443e58', q: '#2e2a3c', m: '#7a7099', l: '#a48cff', w: '#cfc6ee', e: '#f4f1ff', x: '#ffffff', y: '#ffd24d', d: '#1e1a28' };

  /* ---- the parts (it faces right) ---- */

  var PARTS = {
    head: ['..l..w..l.....', '.l.lw.lw......', 'l.lwlwlkkkkk..', '.lwlwlkeeeeek.', 'lwlwlkeeeeeeek', '.lwlwkeekkeeke', 'lwlwlkeeeeeeek', '.lwlwkeeeekkek', '..lwlkkeeeeek.', '...lw.kkeeek..', '....l...kkk...'],
    headDim: ['..............', '..q..q........', '.q.qq.qkkkkk..', '..qqqqkmmmmmk.', '.qqqqkmmmmmmmk', '..qqqkmmkkmmkm', '.qqqqkmmmmmmmk', '..qqqkmmmmkkmk', '...qqkkmmmmmk.', '....q.kkmmmk..', '........kkk...'],
    coat: ['....kkkkkkk.....', '...kmmkppkmmk...', '...kmkpppppkmk..', '..kqpppppypppk..', '..kqppppppppppk.', '..kqpppppyppppk.', '..kqppppppppppk.', '..kqpppppypppk..', '...kqppppppppk..', '...kqpppppppk...', '...kqqppppppk...', '..kqqppppppppk..', '..kqqpppppppppk.', '.kqqppppkpppppk.', '.kqqpppkkkppppk.', '.kqqppk...kpppk.'],
    tailsA: ['.kqqpk.....kppk.', 'kqqpk.......kppk', 'kqpk.........kpk', 'kqk...........kk', 'kk..............'],
    tailsB: ['.kqqpk.....kppk.', '.kqqpk......kppk', '..kqpk.......kpk', '...kqk.......kk.', '....kk..........'],
    tailsLimp: ['.kqqpk.....kppk.', '.kqqpk.....kppk.', '.kqpk......kpk..', '.kqk.......kk...', '.kk.............'],
    arm: ['.kkk.', 'kpppk', 'kqppk', 'kqppk', '.kqpk', '.kqpk', '.kqpk', '.kqpk', '.kqpk', '.kmmk', '.keek', '.keek', '..kk.'],
    armDiag: ['kkkk........', 'kpppkk......', 'kqpppkk.....', '.kqpppkk....', '..kqqppkk...', '...kkqppkk..', '.....kqppkk.', '......kqmmkk', '.......kkeek', '........keek', '.........kk.'],
    baton: ['x', 'x', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'y', 'y'],
    batonDiag: ['x...........', '.x..........', '..e.........', '...e........', '....e.......', '.....e......', '......e.....', '.......e....', '........e...', '.........y..', '..........y.'],
    sliver: ['x', 'x', 'l', 'x', 'l', 'x', 'x', 'l', 'x', 'l', 'x', 'l', 'x', 'x', 'l', 'x', 'l', 'x', 'x', 'l', 'x', 'l', 'x', 'l', 'x', 'x', 'l', 'x', 'l', 'x'],
    heap: ['........kkkk..........', '......kkppppkk....kk..', '....kkqppppppkkk.keek.', '..kkqqppppypppppkkeek.', '.kqqqpppppppppppppkk..', 'kqqqqqqpppppppppppppk.', 'kkkkkkkkkkkkkkkkkkkkk.']
  };

  /* ---- the poses ----
     A frame is 64 by 56 and the hem of its coat is at (32, 52); the arms
     turn by quarters about the shoulder, as the golem's do, and the hand
     with the baton carries it. */

  var ARM = {
    down:     function (sx, sy) { return ['arm', sx - 2, sy - 2]; },
    fwd:      function (sx, sy) { return ['arm', sx - 2, sy - 3, { rot: 3 }]; },
    back:     function (sx, sy) { return ['arm', sx - 11, sy - 2, { rot: 1 }]; },
    up:       function (sx, sy) { return ['arm', sx - 3, sy - 11, { rot: 2 }]; },
    downfwd:  function (sx, sy) { return ['armDiag', sx - 1, sy - 1]; },
    upfwd:    function (sx, sy) { return ['armDiag', sx - 1, sy - 11, { rot: 3 }]; },
    downback: function (sx, sy) { return ['armDiag', sx - 10, sy - 1, { rot: 1 }]; },
    upback:   function (sx, sy) { return ['armDiag', sx - 11, sy - 10, { rot: 2 }]; }
  };
  // where the hand is, from the shoulder, and how the baton leaves it
  var HAND = { down: [0, 9], fwd: [9, 0], back: [-9, 0], up: [0, -9], downfwd: [8, 8], upfwd: [8, -8], downback: [-8, 8], upback: [-8, -8] };
  function batonAt(mode, hx, hy) {
    if (mode === 'down') return ['baton', hx - 1, hy - 1, { rot: 2 }];
    if (mode === 'up') return ['baton', hx, hy - 13];
    if (mode === 'fwd') return ['baton', hx - 1, hy, { rot: 1 }];
    if (mode === 'back') return ['baton', hx - 13, hy - 1, { rot: 3 }];
    if (mode === 'upfwd') return ['batonDiag', hx - 1, hy - 10, { flip: true }];
    if (mode === 'downback') return ['batonDiag', hx - 11, hy - 1, { flip: true, rot: 2 }];
    if (mode === 'upback') return ['batonDiag', hx - 10, hy - 10];
    return ['batonDiag', hx - 2, hy - 1, { rot: 2 }];
  }

  function pose(o) {
    var bob = o.bob || 0, lean = o.lean || 0, cx = 24 + lean, cy = 30 + bob, sy = cy + 4;
    var near = o.near || 'downfwd', far = o.far || 'downback', hd = o.headAt || [0, 0], layers = [];
    layers.push(ARM[far](cx + 4, sy));
    layers.push([o.tails || 'tailsA', cx, cy + 16]);
    layers.push(['coat', cx, cy]);
    layers.push([o.head || 'head', cx + 2 + hd[0], cy - 10 + hd[1]]);
    layers.push(ARM[near](cx + 11, sy));
    if (!o.noBaton) layers.push(batonAt(near, cx + 11 + HAND[near][0], sy + HAND[near][1]));
    return layers;
  }

  function anims() {
    var P = pose, sliver = [['sliver', 32, 22]];
    return {
      idle: [P({}), P({ tails: 'tailsB' }), P({ bob: 1 }), P({ bob: 1, tails: 'tailsB' })],
      wake: [sliver, sliver, P({ near: 'down', far: 'down' }), P({ lean: 3, near: 'back', far: 'downback', headAt: [2, 3] }), P({ lean: 3, near: 'back', far: 'downback', headAt: [2, 3], tails: 'tailsB' }), P({ near: 'up', far: 'upback', headAt: [0, -1] })],
      beat: [P({ near: 'down', far: 'upback' }), P({ near: 'downback', far: 'upback', tails: 'tailsB' }), P({ near: 'fwd', far: 'upback' }), P({ near: 'up', far: 'upback', tails: 'tailsB', headAt: [0, -1] })],
      raise: [P({ near: 'upfwd', far: 'upback' }), P({ near: 'up', far: 'upback', headAt: [0, -1], tails: 'tailsB' }), P({ near: 'upback', far: 'upback', headAt: [-1, -1], lean: -1 })],
      strike: [P({ near: 'fwd', far: 'back', lean: 1 }), P({ near: 'downfwd', far: 'upback', lean: 2, tails: 'tailsB' }), P({ near: 'down', far: 'upback', lean: 2, headAt: [1, 1] })],
      point: [P({ near: 'upfwd', far: 'downback', lean: 1 }), P({ near: 'fwd', far: 'downback', lean: 2, tails: 'tailsB' })],
      cup: [P({ near: 'upfwd', far: 'upback', noBaton: true }), P({ near: 'up', far: 'up', noBaton: true, headAt: [0, -1], tails: 'tailsB' })],
      cast: [P({ near: 'fwd', far: 'back', noBaton: true, lean: 1 }), P({ near: 'downfwd', far: 'downback', noBaton: true, lean: 1 })],
      vanish: [P({ near: 'down', far: 'down' }), sliver, [['sliver', 32, 30]], []],
      spent: [P({ bob: 2, lean: 2, near: 'down', far: 'down', head: 'headDim', headAt: [2, 3], tails: 'tailsLimp' }), P({ bob: 3, lean: 2, near: 'down', far: 'down', head: 'headDim', headAt: [2, 4], tails: 'tailsLimp' })],
      reel: [P({ bob: 1, lean: -2, near: 'upback', far: 'back', head: 'headDim', headAt: [-1, 0] }), P({ bob: 2, lean: -2, near: 'back', far: 'back', head: 'headDim', headAt: [-1, 1], tails: 'tailsB' })],
      death: [P({ lean: -2, near: 'upback', far: 'back', head: 'headDim' }), P({ bob: 3, lean: 2, near: 'down', far: 'down', head: 'headDim', headAt: [2, 4], tails: 'tailsLimp', noBaton: true }), P({ bob: 8, lean: 2, near: 'down', far: 'down', head: 'headDim', headAt: [3, 8], tails: 'tailsLimp', noBaton: true }), [['heap', 21, 45], ['sliver', 32, 12]], [['heap', 21, 45]], [['heap', 21, 45]]]
    };
  }
  function buildRig() { return GD.rig(PAL, PARTS, 64, 56, { x: 32, y: 52 }, anims()); }

  /* ---- the hall: two rails and four pylons, drawn behind it ---- */

  function pylons(A) { return [{ x: A.left + 14, y: A.ceilY + 26, up: true }, { x: A.right - 14, y: A.ceilY + 26, up: true }, { x: A.right - 14, y: A.groundY - 8, up: false }, { x: A.left + 14, y: A.groundY - 8, up: false }]; }
  function scenery(e, G) {
    var A = e.arena, v = e.vars, pen = G.pen, cx = G.cx, cy = G.cy, mid = Math.round((A.left + A.right) / 2), k;
    // the rails, and the block of glass that parts them
    for (k = 0; k < 2; k++) {
      var x0 = k ? mid + 3 : A.left, x1 = k ? A.right : mid - 3, live = v.live === (k ? 1 : -1) || v.live === 2;
      pen.fillStyle = live ? '#ffffff' : '#7a7099'; pen.fillRect(x0 - cx, A.groundY - 1 - cy, x1 - x0, 1);
      pen.fillStyle = live ? '#8fa3ff' : '#443e58'; pen.fillRect(x0 - cx, A.groundY - 2 - cy, x1 - x0, 1);
      for (var tx = x0 + 6; tx < x1; tx += 16) { pen.fillStyle = '#2e2a3c'; pen.fillRect(tx - cx, A.groundY - 3 - cy, 3, 3); }
    }
    pen.fillStyle = '#cfc6ee'; pen.fillRect(mid - 3 - cx, A.groundY - 5 - cy, 6, 5); pen.fillStyle = '#ffffff'; pen.fillRect(mid - 2 - cx, A.groundY - 4 - cy, 1, 3);
    pylons(A).forEach(function (p, i) {
      var hot = v.hot && v.hot[i], x = Math.round(p.x) - cx, y = Math.round(p.y) - cy, s = p.up ? -1 : 1;
      pen.fillStyle = '#1e1a28'; pen.fillRect(x - 4, p.up ? A.ceilY - cy : y + 4, 8, p.up ? p.y - A.ceilY - 4 : A.groundY - p.y - 4);
      pen.fillStyle = '#443e58'; pen.fillRect(x - 3, p.up ? A.ceilY - cy : y + 4, 5, p.up ? p.y - A.ceilY - 4 : A.groundY - p.y - 4);
      pen.fillStyle = '#7a7099'; pen.fillRect(x - 5, y + (p.up ? -6 : 3), 10, 2); pen.fillRect(x - 4, y + (p.up ? -10 : 7), 8, 1);
      pen.fillStyle = '#ffd24d'; pen.fillRect(x - 1, y + s * -1 - 1, 2, 4);
      pen.fillStyle = hot ? '#ffffff' : '#a48cff'; pen.fillRect(x - 2, y - 2, 4, 4); pen.fillStyle = hot ? '#a48cff' : '#443e58'; pen.fillRect(x - 1, y - 1, 2, 2);
    });
    // the two that waltz
    (v.balls || []).forEach(function (b) {
      var x = Math.round(b.x) - cx, y = Math.round(b.y) - cy, r = b.born < 20 ? 2 + b.born / 5 : 6, f = (G.tick >> 1) % 4;
      pen.fillStyle = '#3d5bff'; pen.beginPath(); pen.arc(x, y, r + 1, 0, 6.2832); pen.fill();
      pen.fillStyle = '#8fa3ff'; pen.beginPath(); pen.arc(x, y, r - 1, 0, 6.2832); pen.fill();
      pen.fillStyle = '#ffffff'; pen.beginPath(); pen.arc(x + (f === 1 ? 1 : f === 3 ? -1 : 0), y + (f === 0 ? -1 : f === 2 ? 1 : 0), Math.max(1, r - 3), 0, 6.2832); pen.fill();
      pen.strokeStyle = '#ffffff'; pen.lineWidth = 1; pen.beginPath();
      for (var s = 0; s < 3; s++) { var a = G.tick * 0.3 + s * 2.1 + b.id; pen.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); pen.lineTo(x + Math.cos(a + 0.4) * (r + 4), y + Math.sin(a + 0.4) * (r + 4)); }
      pen.stroke();
    });
  }

  /* ---- what it does ---- */

  var VOLT = ['#8fa3ff', '#a48cff', '#ffffff', '#3d5bff'];
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function crackle(ctx, x, y, n, speed) { for (var k = 0; k < n; k++) { var a = ctx.random() * 6.2832, s = speed * (0.4 + ctx.random()); ctx.particle({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 8 + ctx.random() * 12, max: 20, colour: VOLT[k % 4], size: 1, gravity: 0 }); } }
  function hover(e, tx, ty, ease) { e.x += (tx - e.x) * ease; e.y += (ty - e.y) * ease; }
  // a bolt from the top of the hall to the floor, and the box it burns
  function bolt(e, ctx, x, wide) {
    var A = e.arena;
    ctx.zap(x, A.ceilY, x + (ctx.random() - 0.5) * 8, A.groundY, '#ffffff'); ctx.zap(x + 2, A.ceilY, x - 2, A.groundY, '#8fa3ff'); ctx.beam(x, A.ceilY, x, A.groundY, '#a48cff');
    ctx.hazard({ x0: x - wide / 2, x1: x + wide / 2, y0: A.ceilY, y1: A.groundY, life: 7, damage: 1, element: 'storm', colour: '#8fa3ff' });
    crackle(ctx, x, A.groundY - 2, 14, 2.6); ctx.light(x, A.groundY - 40, 70, 1); ctx.shake(2.5); ctx.sfx('thunder');
  }
  // after a great piece it has nothing left: it sinks to the floor and hangs there
  function spend(e, ctx, t, span) {
    var A = e.arena;
    if (t < span - 26) { hover(e, e.x, A.groundY - 3, 0.08); e.anim = 'spent'; e.frame = Math.floor(t / 20) % 2; if (t % 18 === 0) ctx.particle({ x: e.x + (ctx.random() - 0.5) * 10, y: e.y - 40, vx: 0, vy: -0.3, life: 24, max: 24, colour: '#7a7099', size: 1, gravity: -0.01 }); }
    else { hover(e, e.x, A.groundY - 46, 0.1); e.anim = 'idle'; e.frame = 0; }
  }
  var BARS = [[0, 24, 48, 60], [0, 16, 32, 40, 56, 64]];

  var ATTACKS = {
    // a bar beaten out, a mark on every beat; then the bolts, in the same time
    rhythm: {
      name: 'rhythm', windup: 112, active: 80, recover: 120, cooldown: 50, anims: { windup: 'beat', attack: 'strike' },
      start: function (e) { e.vars.marks = []; e.vars.struck = 0; },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena, bar = BARS[e.phase], n = v.marks.length;
        if (n < bar.length && t - 1 >= bar[n]) {
          var x = clamp(ctx.hero.x + ctx.hero.vx * 6, A.left + 10, A.right - 10);
          v.marks.push(x);
          ctx.telegraph(x - 6, A.ceilY, 12, A.groundY - A.ceilY, w - t + 1 + bar[n], '#8fa3ff'); ctx.telegraphCircle(x, A.groundY - 1, 9, w - t + 1 + bar[n], '#ffffff');
          ctx.sfx('select'); crackle(ctx, x, A.groundY - 2, 5, 1.4);
          v.beatAt = t;
        }
        e.anim = 'beat'; e.frame = v.beatAt && t - v.beatAt < 8 ? (v.marks.length - 1) % 4 : (v.marks.length + 3) % 4;
        e.dir = GD.towards(e, ctx.hero);
      },
      during: function (e, ctx, t) {
        var v = e.vars, bar = BARS[e.phase];
        while (v.struck < v.marks.length && t - 1 >= bar[v.struck]) { bolt(e, ctx, v.marks[v.struck], 12); v.struck++; v.beatAt = t; }
        e.anim = v.beatAt && t - v.beatAt < 6 ? 'strike' : 'raise'; e.frame = e.anim === 'strike' ? 1 : 1;
      },
      resting: function (e, ctx, t) { spend(e, ctx, t, 120); }
    },
    // it points, the warning runs along one rail, and that half of the floor is live
    half: {
      name: 'half', windup: 72, active: 84, recover: 110, cooldown: 50, keepFacing: true, anims: { windup: 'raise', attack: 'point' },
      start: function (e, ctx) { var v = e.vars, A = e.arena, mid = (A.left + A.right) / 2; v.side = v.forceSide || (ctx.hero.x < mid ? -1 : 1); v.forceSide = 0; e.dir = v.side; v.swept = 0; },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena, mid = (A.left + A.right) / 2, span = (A.right - A.left) / 2, step = 32;
        hover(e, mid - v.side * 30, A.groundY - 44, 0.06);
        // the warning is a sweep, from the glass in the middle out to the wall
        while (v.swept * step < span && t >= 1 + v.swept * 5) { var x0 = v.side > 0 ? mid + v.swept * step : mid - (v.swept + 1) * step; ctx.telegraph(Math.max(A.left, x0), A.groundY - 12, step, 12, w - t + 2, '#8fa3ff'); crackle(ctx, x0 + 16, A.groundY - 3, 4, 1.6); if (v.swept % 2 === 0) ctx.sfx('select'); v.swept++; }
        if (t > 40) { e.anim = 'point'; e.frame = 0; }
      },
      fire: function (e, ctx) { e.vars.live = e.vars.side; ctx.sfx('caststorm'); ctx.shake(3); ctx.flash('#8fa3ff', 5); },
      box: function (e) { var v = e.vars, A = e.arena, mid = (A.left + A.right) / 2; return [{ x0: v.side > 0 ? mid + 3 : A.left, x1: v.side > 0 ? A.right : mid - 3, y0: A.groundY - 11, y1: A.groundY, damage: 1, element: 'storm' }]; },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, mid = (A.left + A.right) / 2, x0 = v.side > 0 ? mid : A.left, x1 = v.side > 0 ? A.right : mid, k;
        for (k = 0; k < 4; k++) { var x = x0 + ctx.random() * (x1 - x0); ctx.particle({ x: x, y: A.groundY - 1, vx: (ctx.random() - 0.5) * 0.6, vy: -0.8 - ctx.random() * 1.6, life: 8 + ctx.random() * 8, max: 16, colour: VOLT[k], size: 1, gravity: 0 }); }
        if (t % 3 === 0) { var zx = x0 + ctx.random() * (x1 - x0 - 30); ctx.zap(zx, A.groundY - 2, zx + 30, A.groundY - 2 - ctx.random() * 9, '#ffffff'); }
        ctx.glow((x0 + x1) / 2, A.groundY - 4, 90, '#8fa3ff', 0.12);
        if (t % 16 === 1) ctx.sfx('caststorm');
      },
      // below half, the other rail follows at once, and only then is it spent
      resting: function (e, ctx, t) { var v = e.vars; v.live = 0; if (e.phase && !v.second) { if (t > 8) { v.second = true; v.forceSide = -v.side; v.next = 'half'; e.attack.t = 9999; } return; } spend(e, ctx, t, 110); },
      end: function (e) { var v = e.vars; v.live = 0; if (!v.next) v.second = false; }
    },
    // it is gone, and above you
    blink: {
      name: 'blink', windup: 74, active: 10, recover: 46, cooldown: 40, anims: { windup: 'raise', attack: 'strike' },
      start: function (e) { e.vars.gone = false; },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena;
        if (t <= 16) { e.anim = 'vanish'; e.frame = Math.min(3, Math.floor(t / 4)); v.away = t > 8; if (t === 1) { ctx.sfx('dash'); crackle(ctx, e.x, e.y - 26, 16, 2.4); } }
        if (t === 17) { e.x = clamp(ctx.hero.x, A.left + 12, A.right - 12); e.y = A.ceilY + 64; crackle(ctx, e.x, e.y - 26, 20, 2.6); ctx.telegraph(e.x - 8, e.y, 16, A.groundY - e.y, w - 16, '#8fa3ff'); ctx.telegraphCircle(e.x, A.groundY - 1, 11, w - 16, '#ffffff'); ctx.sfx('select'); }
        if (t > 16 && t <= 26) { e.anim = 'vanish'; e.frame = Math.max(0, 2 - Math.floor((t - 17) / 4)); v.away = t < 22; }
        if (t > 26) { v.away = false; ctx.glow(e.x, e.y - 58, 6 + (t - 26) / 4, '#ffffff', 0.4); }
      },
      fire: function (e, ctx) { var A = e.arena; ctx.zap(e.x, e.y, e.x, A.groundY, '#ffffff'); ctx.beam(e.x, e.y, e.x, A.groundY, '#a48cff'); crackle(ctx, e.x, A.groundY - 2, 18, 2.8); ctx.shake(3); ctx.sfx('caststorm'); },
      box: function (e) { var A = e.arena; return [{ x0: e.x - 8, x1: e.x + 8, y0: e.y, y1: A.groundY, damage: 1, element: 'storm' }]; },
      end: function (e) { var v = e.vars; v.away = false; if (e.phase && !v.again) { v.again = true; v.next = 'blink'; } else v.again = false; }
    },
    // two balls of lightning, set waltzing
    waltz: {
      name: 'waltz', windup: 56, active: 12, recover: 30, cooldown: 60, anims: { windup: 'cup', attack: 'cast' },
      telling: function (e, ctx, t, w) { ctx.glow(e.x + e.dir * 10, e.y - 46, 4 + t / w * 8, '#8fa3ff', 0.5); ctx.glow(e.x - e.dir * 6, e.y - 46, 4 + t / w * 8, '#8fa3ff', 0.5); if (t % 4 === 0) crackle(ctx, e.x + (t % 8 ? 10 : -6) * e.dir, e.y - 46, 2, 1.2); if (t === 1) ctx.sfx('castfrost'); },
      fire: function (e, ctx) {
        var v = e.vars, n = e.phase ? 3 : 2, k;
        v.balls = []; v.dance = { x: e.x, y: e.y - 40, a: 0, t: 0, n: n };
        for (k = 0; k < n; k++) v.balls.push({ id: k, x: e.x, y: e.y - 40, born: 0, life: 540, struck: false, vx: 0, vy: 0 });
        ctx.sfx('shot');
      }
    },
    // the pylons join, and the arc turns about the hall like the hand of a clock
    pylons: {
      name: 'pylons', windup: 50, active: 300, recover: 130, cooldown: 50, anims: { windup: 'raise', attack: 'beat' },
      telling: function (e, ctx, t, w) { var A = e.arena; hover(e, (A.left + A.right) / 2, A.ceilY + 70, 0.06); e.vars.hot = [1, 1, 1, 1]; if (t % 6 === 0) pylons(A).forEach(function (p) { crackle(ctx, p.x, p.y, 2, 1.4); }); if (t === 1) ctx.sfx('roar'); },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, P = pylons(A), step = Math.floor((t - 1) / 50), k;
        hover(e, (A.left + A.right) / 2, A.ceilY + 70, 0.06);
        // top, a diagonal, the floor, the other diagonal, both walls: each told while the last is live
        var LINKS = [[[0, 1]], [[0, 2]], [[3, 2]], [[1, 3]], [[0, 3], [1, 2]]];
        if ((t - 1) % 50 === 0 && step < LINKS.length) LINKS[step].forEach(function (L) { ctx.telegraphLine(P[L[0]].x, P[L[0]].y, P[L[1]].x, P[L[1]].y, 50, '#a48cff'); ctx.sfx('select'); });
        v.hot = [0, 0, 0, 0]; v.links = [];
        if (step >= 1 && (t - 1) % 50 < 36) { LINKS[step - 1].forEach(function (L) { v.links.push(L); v.hot[L[0]] = v.hot[L[1]] = 1; ctx.beam(P[L[0]].x, P[L[0]].y, P[L[1]].x, P[L[1]].y, '#a48cff'); if (t % 3 === 0) { var s = ctx.random(); crackle(ctx, P[L[0]].x + (P[L[1]].x - P[L[0]].x) * s, P[L[0]].y + (P[L[1]].y - P[L[0]].y) * s, 2, 1.6); } }); if ((t - 1) % 50 === 0) { ctx.sfx('caststorm'); ctx.shake(2); } }
        e.anim = 'beat'; e.frame = Math.floor(t / 12) % 4; e.dir = Math.floor(t / 50) % 2 ? 1 : -1;
      },
      // an arc is a row of small boxes between two pylons
      box: function (e) {
        var P = pylons(e.arena), out = [];
        (e.vars.links || []).forEach(function (L) { var a = P[L[0]], b = P[L[1]], n = Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / 10); for (var k = 0; k <= n; k++) { var x = a.x + (b.x - a.x) * k / n, y = a.y + (b.y - a.y) * k / n; out.push({ x0: x - 5, x1: x + 5, y0: y - 5, y1: y + 5, damage: 1, element: 'storm' }); } });
        return out;
      },
      resting: function (e, ctx, t) { e.vars.hot = null; e.vars.links = []; spend(e, ctx, t, 130); },
      end: function (e) { e.vars.hot = null; e.vars.links = []; }
    }
  };

  // a ball struck goes where it was sent; sent into the Herald, it undoes it
  function strikeBall(e, ctx, b, fromX) {
    var dx = e.x - b.x, dy = (e.y - 26) - b.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy)), away = b.x >= fromX ? 1 : -1;
    b.struck = true; b.life = 90;
    // toward the Herald if the blow was roughly that way, otherwise just away
    if (dx * away > 0) { b.vx = dx / len * 4.2; b.vy = dy / len * 4.2; } else { b.vx = away * 4; b.vy = -1.2; }
    crackle(ctx, b.x, b.y, 12, 2.4); ctx.sfx('hit'); ctx.shake(1.5);
    return true;
  }

  var SCRIPTS = [['rhythm', 'blink', 'half', 'waltz', 'blink'], ['pylons', 'rhythm', 'blink', 'half', 'waltz']];

  function think(e, ctx) {
    var v = e.vars, A = e.arena, hero = ctx.hero;
    if (v.next) { var forced = ATTACKS[v.next]; v.next = null; return forced; }
    // it keeps its distance, above the reach of a standing blade
    var side = e.x < hero.x ? -1 : 1, tx = clamp(hero.x + side * 86, A.left + 24, A.right - 24);
    if (Math.abs(tx - hero.x) < 50) tx = clamp(hero.x - side * 86, A.left + 24, A.right - 24);
    hover(e, tx, A.groundY - 46 + Math.sin(e.clock * 0.05) * 5, 0.05);
    e.dir = GD.towards(e, hero); e.anim = 'idle'; e.frame = Math.floor(e.clock / 10) % 4; e.state = 'idle';
    if (e.cooldown > 0 || !hero.alive) return null;
    var script = SCRIPTS[e.phase], want = script[e.script % script.length];
    if (want === 'waltz' && v.balls && v.balls.length) want = 'blink';
    e.script++;
    return ATTACKS[want];
  }

  function start(e, arena) { e.y = arena.groundY - 46; e.vars.balls = []; }
  function waking(e, ctx, t) { if (t === 1) { crackle(ctx, e.x, e.y - 26, 24, 2.6); ctx.sfx('dash'); } if (t === 96) { ctx.sfx('roar'); ctx.shake(3); pylons(e.arena).forEach(function (p) { crackle(ctx, p.x, p.y, 10, 2); }); } e.vars.hot = t > 96 ? [1, 1, 1, 1] : null; if (t >= 119) e.vars.hot = null; }

  function always(e, ctx) {
    var v = e.vars, A = e.arena, hero = ctx.hero, k, b;
    ctx.light(e.x, e.y - 28, 58, 0.85); if (!v.away) ctx.glow(e.x, e.y - 44, 10, '#a48cff', 0.16);
    if (e.clock % 5 === 0 && !v.away) ctx.particle({ x: e.x + (ctx.random() - 0.5) * 10, y: e.y, vx: 0, vy: 0.5, life: 14, max: 14, colour: VOLT[e.clock % 4], size: 1, gravity: 0 });
    // the waltz: on ONE the pair steps toward her; on two and three it turns
    if (v.balls && v.balls.length) {
      var D = v.dance; D.t++;
      var beat = Math.floor(D.t / 22) % 3, into = (D.t % 22) / 22, ease = into * into * (3 - 2 * into);
      if (D.t % 22 === 0) { D.from = { x: D.x, y: D.y, a: D.a }; if (beat === 0) { var dx = hero.x - D.x, dy = hero.y - 14 - D.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy)); D.to = { x: D.x + dx / len * 34, y: D.y + dy / len * 34, a: D.a }; } else D.to = { x: D.x, y: D.y, a: D.a + Math.PI / 3 }; }
      if (D.from) { D.x = D.from.x + (D.to.x - D.from.x) * ease; D.y = clamp(D.from.y + (D.to.y - D.from.y) * ease, A.ceilY + 30, A.groundY - 12); D.a = D.from.a + (D.to.a - D.from.a) * ease; }
      for (k = v.balls.length - 1; k >= 0; k--) {
        b = v.balls[k]; b.born++; b.life--;
        if (b.struck) {
          b.x += b.vx; b.y += b.vy;
          if (!e.dying && !v.away && Math.abs(b.x - e.x) < 12 && Math.abs(b.y - (e.y - 26)) < 28) { e.hp -= 10; e.flash = 6; e.stun = Math.max(e.stun, 100); if (e.attack && e.attack.def.end) e.attack.def.end(e, ctx); e.attack = null; e.boxes = []; v.next = null; ctx.number(e.x, e.y - 60, 10, '#ffffff'); ctx.number(e.x, e.y - 72, 'ITS OWN LIGHTNING', '#8fa3ff'); crackle(ctx, b.x, b.y, 30, 3.2); ctx.shake(5); ctx.sfx('heavy'); ctx.flash('#8fa3ff', 6); b.life = 0; }
        } else {
          var r = Math.min(26, b.born * 1.2), a = D.a + k * Math.PI * 2 / D.n;
          b.x = D.x + Math.cos(a) * r; b.y = D.y + Math.sin(a) * r * 0.8;
          if (b.born > 24 && ctx.touch({ x0: b.x - 3, x1: b.x + 3, y0: b.y - 2, y1: b.y + 3 }, 1, 'storm', e, b.x)) { b.life = 0; crackle(ctx, b.x, b.y, 16, 2.6); }
        }
        ctx.light(b.x, b.y, 26, 0.8); ctx.glow(b.x, b.y, 10, '#8fa3ff', 0.3);
        if (b.life <= 0 || b.x < A.left - 10 || b.x > A.right + 10 || b.y < A.ceilY - 10) { crackle(ctx, b.x, b.y, 8, 1.6); v.balls.splice(k, 1); }
      }
    }
    // stunned by its own lightning, it sinks as when it is spent
    if (e.stun > 0 && !e.dying) hover(e, e.x, A.groundY - 3, 0.08);
  }
  function onPhase(e, ctx) { var v = e.vars; v.live = 0; v.hot = null; v.links = []; v.next = null; v.away = false; v.second = false; v.again = false; crackle(ctx, e.x, e.y - 26, 40, 3.4); ctx.flash('#a48cff', 8); }
  function fall(e, ctx) { var v = e.vars; v.live = 0; v.hot = null; v.links = []; v.balls = []; v.away = false; }
  function dyingStep(e, ctx) {
    var A = e.arena;
    if (e.y < A.groundY - 1) e.y = Math.min(A.groundY - 1, e.y + 2.2);
    if (e.dying % 7 === 0 && e.dying < 60) { crackle(ctx, e.x + (ctx.random() - 0.5) * 12, e.y - ctx.random() * 44, 12, 2.6); ctx.zap(e.x, e.y - 26, e.x + (ctx.random() - 0.5) * 90, e.y - 26 - ctx.random() * 60, '#ffffff'); ctx.sfx('hit'); }
    if (e.dying === 40) pylons(A).forEach(function (p) { ctx.zap(e.x, e.y - 20, p.x, p.y, '#a48cff'); crackle(ctx, p.x, p.y, 14, 2.4); });
    if (e.dying === 58) { crackle(ctx, e.x, e.y - 10, 50, 4); ctx.sfx('boom'); ctx.flash('#ffffff', 8); }
  }

  GD.register('herald', {
    name: 'The Storm Herald', title: 'WHO CONDUCTS THE GALLERY OF RAILS', element: 'storm', flying: true, ownBody: true,
    hp: 170, body: { w: 14, h: 52 }, phases: [0.5], wake: 120, reel: 60,
    rig: buildRig, scenery: scenery, attacks: ATTACKS, think: think, always: always, onPhase: onPhase, fall: fall, waking: waking, start: start, dyingStep: dyingStep,
    tempo: function (e) { return e.phase ? 0.7 : 1; },
    hurtBoxes: function (e) {
      var boxes = [];
      if (e.vars.away) return boxes;
      (e.vars.balls || []).forEach(function (b) { if (!b.struck && b.born > 20) boxes.push({ x0: b.x - 8, x1: b.x + 8, y0: b.y - 8, y1: b.y + 8, mult: 1, onHit: function (g, ctx, damage, fromX) { return strikeBall(g, ctx, b, fromX); } }); });
      boxes.push({ x0: e.x - 7, x1: e.x + 7, y0: e.y - 50, y1: e.y - 2, mult: 1 });
      return boxes;
    }
  });
})();
