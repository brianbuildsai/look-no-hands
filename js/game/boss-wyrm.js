/* boss-wyrm.js: the Rime Wyrm, that swims in the ice of the Frozen Cistern.

   A serpent of eleven pieces: a horned head, nine plated rings and a
   bladed tail, each following the one before along the path the head has
   drawn, so it moves as a rope moves. The floor and the ceiling are water
   to it. Between blows only its fin shows, cutting the ice toward you.
   It breaches where you stand and dives where the ice has cracked, and
   every third time the ice holds, and it lies stunned on the floor with
   its soft head in reach. It crosses the ceiling and the icicles come
   down behind it; it puts its head out of a wall and empties its lungs
   along the floor, and then hangs there, spent. Below half its life it
   loops in and out of the floor like a needle, rears, and bursts in a
   ring of shards, and its tail lashes along the ice. The rings are
   armoured and take half; the head takes half again as much. */
(function () {
  'use strict';
  var GD = window.Guardians;
  if (!GD) return;

  var PAL = { k: '#0a1220', p: '#7fb8e6', q: '#3f6f94', w: '#e8f6ff', e: '#3d5bff', x: '#ffffff', l: '#bfe9ff', d: '#1d3550' };
  var ART = {
    head: ['..kk....................', '..kwkk..................', '...kwwkk....kkkkkk......', '....kwwpkkkkppppppkk....', '.....kkpppppppppppppkk..', '....kqpppppppkxkpppwwwk.', '...kqqppppppkxeekppwwwwk', '...kqqpppppppkekppppwwkk', '...kqqqppppppppppppkkk..', '....kqqqppppppppppkk....', '.....kqqqqpppkkkkkkk....', '......kkqqqppppppwwk....', '........kkkqqqqqppkk....', '...........kkkkkkk......', '........................'],
    headOpen: ['..kk....................', '..kwkk..................', '...kwwkk....kkkkkk......', '....kwwpkkkkppppppkk....', '.....kkpppppppppppppkk..', '....kqpppppppkxkpppwwwk.', '...kqqppppppkxxxkppwwwwk', '...kqqpppppppkxkppppwwkk', '...kqqqppppppppppppkkk..', '....kqqqpppppkwkwkwk....', '....kqqqqppkklllllk.....', '.....kqqqqpkkwkwkwkkk...', '......kkqqqpppppppwwk...', '........kkkqqqqqppkk....', '...........kkkkkkk......'],
    headDim: ['..kk....................', '..kwkk..................', '...kwwkk....kkkkkk......', '....kwwpkkkkppppppkk....', '.....kkpppppppppppppkk..', '....kqpppppppkkkpppwwwk.', '...kqqppppppkdddkppwwwwk', '...kqqpppppppkkkppppwwkk', '...kqqqppppppppppppkkk..', '....kqqqpppppkwkwkwk....', '....kqqqqppkkdddddk.....', '.....kqqqqpkkwkwkwkkk...', '......kkqqqpppppppwwk...', '........kkkqqqqqppkk....', '...........kkkkkkk......'],
    ring: ['......kk......', '.....kwwk.....', '....kkwwkk....', '..kkppwwppkk..', '.kpppppppppqk.', '.kppwpppppqqk.', 'kppwppppppqqqk', 'kpppppppppqqqk', 'kqppppppppqqqk', '.kqpppppqqqqk.', '.kqqqqqqqqqqk.', '..kkqqqqqqkk..', '....kkkkkk....'],
    ringSmall: ['....kk....', '...kwwk...', '.kkpwwpkk.', 'kpppppppqk', 'kpwpppqqqk', 'kpppppqqqk', 'kqppppqqqk', '.kqqqqqqk.', '..kkkkkk..'],
    tail: ['k...............', 'kwk......kkkk...', '.kwwkk.kkppppkk.', '..kwwwkpppppqqk.', '..kwwwkpppppqqk.', '.kwwkk.kkqqqqkk.', 'kwk......kkkk...', 'k...............'],
    fin: ['.....kk.....', '....kwpk....', '...kwppk....', '..kwpppqk...', '..kwpppqk...', '.kwppppqqk..', '.kwppppqqk..', 'kwpppppqqqk.', 'kkkkkkkkkkk.'],
    icicle: ['kkkkkkk', 'kwpppqk', '.kwpqk.', '.kwpqk.', '.kwpqk.', '..kwk..', '..kwk..', '..kwk..', '...k...', '...k...']
  };

  /* ---- the pieces, turned ----
     Every piece is drawn once, facing right, and turned through twenty-four
     headings when the page opens; headed left it is the same piece flipped
     top to bottom first, so its horn and its plates stay uppermost. */

  var STEPS = 24, SPR = null, WHITE = null;
  function buildRig() {
    var A = window.Pixels.art, pal = GD.palette(PAL);
    SPR = {}; WHITE = {};
    Object.keys(ART).forEach(function (n) {
      var img = A(ART[n], pal);
      SPR[n] = { img: img, right: GD.turned(img, STEPS), left: GD.turned(GD.flipV(img), STEPS) };
    });
    return { frames: { idle: [SPR.head.img] }, flipped: { idle: [SPR.head.img] }, anchor: { x: 12, y: 8 }, custom: true };
  }
  function piece(name, angle, white) {
    var set = SPR[name], k = ((Math.round(angle / (Math.PI * 2) * STEPS) % STEPS) + STEPS) % STEPS, img = (Math.cos(angle) < 0 ? set.left : set.right)[k];
    if (!white) return img;
    var key = name + (Math.cos(angle) < 0 ? 'L' : 'R') + k;
    return WHITE[key] || (WHITE[key] = window.Pixels.silhouette(img, '#ffffff'));
  }

  /* ---- the rope ----
     The head leaves a point behind it every two pixels; each piece sits a
     fixed number of points back along that line. A piece in stone is not
     drawn and cannot be struck. */

  var N = 10, GAP = 5, DEEP = 24;
  function moveHead(e, x, y) {
    var v = e.vars, T = v.trail, dx = x - e.x, dy = y - e.y;
    if (dx * dx + dy * dy > 0.04) v.angle = Math.atan2(dy, dx);
    e.x = x; e.y = y;
    if (!T.length) T.unshift({ x: x, y: y });
    // a point every two pixels exactly, however fast the head went
    var gx = x - T[0].x, gy = y - T[0].y, far = Math.sqrt(gx * gx + gy * gy);
    while (far >= 2) { T.unshift({ x: T[0].x + gx / far * 2, y: T[0].y + gy / far * 2 }); gx = x - T[0].x; gy = y - T[0].y; far = Math.sqrt(gx * gx + gy * gy); if (T.length > N * GAP + 8) T.pop(); }
  }
  // the head is somewhere else, and so is everything behind it
  function putHead(e, x, y, angle) { var v = e.vars; e.x = x; e.y = y; v.angle = angle; v.trail = []; for (var k = 0; k <= N * GAP; k++) v.trail.push({ x: x - Math.cos(angle) * k * 2, y: y - Math.sin(angle) * k * 2 }); }
  function at(e, i) { var T = e.vars.trail; return T[Math.min(T.length - 1, i * GAP)] || { x: e.x, y: e.y }; }
  function heading(e, i) { var T = e.vars.trail, j = Math.min(T.length - 1, i * GAP), a = T[Math.max(0, j - 2)], b = T[Math.min(T.length - 1, j + 2)]; return a && b && (a.x !== b.x || a.y !== b.y) ? Math.atan2(a.y - b.y, a.x - b.x) : e.vars.angle; }
  function inAir(e, p, margin) { var A = e.arena; return p.x > A.left - margin && p.x < A.right + margin && p.y > A.ceilY - margin && p.y < A.groundY + margin; }
  // what lies in the air falls to the floor: a stunned or a dying wyrm is a heap
  function slump(e, speed) { var T = e.vars.trail, floor = e.arena.groundY - 6; for (var k = 0; k < T.length; k++) if (T[k].y < floor) T[k].y = Math.min(floor, T[k].y + speed); if (e.y < floor) e.y = Math.min(floor, e.y + speed); }

  function draw(e, G) {
    var v = e.vars, A = e.arena, pen = G.pen, cx = G.cx, cy = G.cy, k, p, img, white = e.flash > 0, gone = e.dying ? Math.floor(e.dying / 5) : 0;
    // the icicles it has hung, waiting
    for (k = 0; k < v.hung.length; k++) {
      var h = v.hung[k], grow = Math.min(1, h.age / 24), ih = Math.max(2, Math.round(10 * grow));
      pen.drawImage(SPR.icicle.img, 0, 0, 7, ih, Math.round(h.x) - 3 - cx + (h.shake ? (G.tick >> 1) % 2 : 0), A.ceilY - cy, 7, ih);
    }
    pen.save(); pen.beginPath(); pen.rect(A.left - cx, A.ceilY - cy, A.right - A.left, A.groundY - A.ceilY); pen.clip();
    if (e.dying > 60) pen.globalAlpha = Math.max(0, 1 - (e.dying - 60) / 30);
    for (k = N; k >= 1; k--) {
      if (N - k < gone) continue;                       // dying, it bursts from the tail forward
      p = at(e, k);
      if (!inAir(e, p, 10)) continue;
      img = piece(k === N ? 'tail' : k > 6 ? 'ringSmall' : 'ring', heading(e, k), white);
      pen.drawImage(img, Math.round(p.x - img.width / 2) - cx, Math.round(p.y - img.height / 2) - cy);
    }
    if (inAir(e, e, 14) && gone <= N) {
      img = piece(v.face || 'head', v.angle, white);
      pen.drawImage(img, Math.round(e.x - img.width / 2) - cx, Math.round(e.y - img.height / 2) - cy);
      if (e.status.freeze > 0) { pen.globalAlpha = 0.5; pen.drawImage(piece(v.face || 'head', v.angle, true), Math.round(e.x - img.width / 2) - cx, Math.round(e.y - img.height / 2) - cy); }
    }
    pen.restore(); pen.globalAlpha = 1;
    // the tail, lashing along the ice
    if (v.lash && v.lash.len > 0) {
      var L = v.lash, a = L.dir > 0 ? 0 : Math.PI;
      for (k = 10; k < L.len - 8; k += 9) { img = piece('ringSmall', a, false); pen.drawImage(img, Math.round(L.x + L.dir * k - img.width / 2) - cx, A.groundY - 6 - Math.round(img.height / 2) - cy + (L.rise ? -Math.round(L.rise * Math.sin(k / L.len * 3.1)) : 0)); }
      img = piece('tail', a + Math.PI, false); pen.drawImage(img, Math.round(L.x + L.dir * L.len - img.width / 2) - cx, A.groundY - 7 - Math.round(img.height / 2) - cy - (L.rise || 0));
    }
    // the fin, where it swims under the floor or over the ceiling
    if (v.fin) {
      var f = SPR.fin.img, up = v.fin === 'ceiling';
      pen.save(); pen.translate(Math.round(e.x) - cx, (up ? A.ceilY : A.groundY) - cy); pen.scale(v.finDir < 0 ? -1 : 1, up ? -1 : 1); pen.drawImage(f, -6, -9); pen.restore();
    }
  }

  /* ---- what it does ---- */

  var ICE = ['#9fd8ff', '#d8f1ff', '#ffffff', '#7fb8e6'];
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function shards(ctx, x, y, n, speed, up) {
    for (var k = 0; k < n; k++) { var a = up ? -Math.PI * ctx.random() : Math.PI * 2 * ctx.random(), s = speed * (0.4 + ctx.random()); ctx.particle({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 18 + ctx.random() * 22, max: 40, colour: ICE[k % 4], size: ctx.random() < 0.35 ? 2 : 1, gravity: 0.07 }); }
  }
  function headBox(e) { return inAir(e, e, 0) ? [{ x0: e.x - 8, x1: e.x + 8, y0: e.y - 7, y1: e.y + 7, damage: 1, element: 'plain' }] : []; }
  // over the top from one hole in the ice to another
  function arc(e, s) { var v = e.vars, A = e.arena; return { x: v.x0 + (v.x1 - v.x0) * s, y: A.groundY + 16 - (v.high + 16) * 4 * s * (1 - s) }; }
  function under(e, ctx, dirn, speed) { moveHead(e, clamp(e.x + dirn * speed, e.arena.left - 20, e.arena.right + 20), Math.min(e.arena.groundY + DEEP, e.y + 3)); }

  function breachStart(e, ctx) {
    var v = e.vars, A = e.arena, mid = (A.left + A.right) / 2;
    v.x0 = clamp(e.x, A.left + 20, A.right - 20); v.dirn = v.x0 < mid ? 1 : -1; v.x1 = clamp(v.x0 + v.dirn * (140 + ctx.random() * 40), A.left + 24, A.right - 24); v.high = 84; v.fin = null; v.face = 'head'; v.out = false;
    putHead(e, v.x0, A.groundY + 16, -Math.PI / 2);
  }
  function breachTell(holds) {
    return function (e, ctx, t, w) {
      var v = e.vars, A = e.arena;
      if (t === 1) { ctx.telegraphCrack(v.x0, A.groundY, 30, w + 6, '#d8f1ff'); if (!holds) ctx.telegraphCrack(v.x1, A.groundY, 30, w + 80, '#9fd8ff'); ctx.sfx('crack'); }
      if (t % 4 === 0) ctx.particle({ x: v.x0 + (ctx.random() - 0.5) * 24, y: A.groundY - 1, vx: (ctx.random() - 0.5) * 0.6, vy: -0.8 - ctx.random(), life: 16, max: 16, colour: ICE[t % 4], size: 1, gravity: 0.05 });
      if (t % 14 === 0) ctx.shake(1.2);
    };
  }
  function breachFly(e, ctx, t, span) {
    var v = e.vars, A = e.arena, p = arc(e, Math.min(1, t / span));
    moveHead(e, p.x, p.y);
    if (!v.out && e.y < A.groundY) { v.out = true; shards(ctx, v.x0, A.groundY - 2, 26, 3.4, true); ctx.shake(4); ctx.sfx('boom'); }
    v.face = t < span * 0.7 ? 'headOpen' : 'head';
    // below half its life it sheds ice over the top of the arc
    if (e.phase && (t === Math.round(span * 0.35) || t === Math.round(span * 0.5) || t === Math.round(span * 0.65))) ctx.projectile({ x: e.x, y: e.y + 6, vx: 0, vy: 0.6, gravity: 0.16, life: 120, colour: '#d8f1ff', size: 5, damage: 1, element: 'frost', icicle: true, big: true, cause: 'icicle' });
  }

  var ATTACKS = {
    // up through the floor where you stood, over, and down where the ice has cracked
    breach: {
      name: 'breach', windup: 54, active: 86, recover: 38, cooldown: 24, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: breachStart, telling: breachTell(false),
      during: function (e, ctx, t) { breachFly(e, ctx, t, 86); if (t === 84) { shards(ctx, e.vars.x1, e.arena.groundY - 2, 20, 3, true); ctx.shake(3); ctx.sfx('freeze'); } },
      box: function (e) { return headBox(e); },
      resting: function (e, ctx) { under(e, ctx, e.vars.dirn, 3); }
    },
    // the third time the ice holds
    beach: {
      name: 'beach', windup: 54, active: 80, recover: 150, cooldown: 30, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: breachStart, telling: breachTell(true),
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena;
        if (t < 80) { breachFly(e, ctx, t, 84); if (e.y > A.groundY - 7 && t > 40) moveHead(e, e.x, A.groundY - 7); }
        if (t === 80) { ctx.shake(7); ctx.sfx('boom'); shards(ctx, e.x, A.groundY - 3, 34, 3.6, true); ctx.number(e.x, e.y - 22, 'THE ICE HOLDS', '#d8f1ff'); }
      },
      box: function (e, t) { return t < 78 ? headBox(e) : []; },
      resting: function (e, ctx, t) {
        var v = e.vars;
        if (t < 120) { slump(e, 2.4); v.face = 'headDim'; v.angle = v.dirn > 0 ? 0.25 : Math.PI - 0.25; if (t % 16 === 0) ctx.particle({ x: e.x + v.dirn * 12, y: e.y - 8, vx: v.dirn * 0.2, vy: -0.4, life: 26, max: 26, colour: '#ffffff', size: 1, gravity: -0.01 }); }
        else { v.face = 'head'; under(e, ctx, v.dirn, 1.2); if (t === 120) { shards(ctx, e.x, e.arena.groundY - 2, 16, 2.4, true); ctx.sfx('freeze'); } }
      }
    },
    // across the ceiling, and the icicles come down behind it
    rain: {
      name: 'rain', windup: 84, active: 150, recover: 20, cooldown: 40, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) {
        var v = e.vars, A = e.arena, hero = ctx.hero, spots = [], x, gaps = [], k;
        v.from = hero.x < (A.left + A.right) / 2 ? 1 : -1;                  // it starts over her head's side and crosses away, or back again below half
        for (x = A.left + 14; x < A.right - 8; x += 20) spots.push(x);
        // three lanes stay dry; one of them is never far from her
        gaps.push(clamp(Math.round((hero.x + (ctx.random() < 0.5 ? -50 : 50) - A.left - 14) / 20), 1, spots.length - 3));
        gaps.push(Math.floor(ctx.random() * (spots.length - 2))); gaps.push(Math.floor(ctx.random() * (spots.length - 2)));
        v.spots = spots.filter(function (s, i) { for (k = 0; k < gaps.length; k++) if (i === gaps[k] || i === gaps[k] + 1) return false; return true; });
        if (v.from < 0) v.spots.reverse();
        v.hung = []; v.dropped = 0; v.fin = 'ceiling'; v.finDir = v.from; v.face = 'head';
        putHead(e, v.from > 0 ? A.left + 8 : A.right - 8, A.ceilY - 16, v.from > 0 ? 0 : Math.PI);
        ctx.sfx('roar');
      },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena, x = v.from > 0 ? A.left + 8 + (A.right - A.left - 16) * t / w : A.right - 8 - (A.right - A.left - 16) * t / w, k;
        moveHead(e, x, A.ceilY - 16);
        while (v.hung.length < v.spots.length && (v.spots[v.hung.length] - x) * v.from < 0) { var s = v.spots[v.hung.length]; v.hung.push({ x: s, age: 0 }); ctx.telegraphLine(s, A.ceilY + 10, s, A.groundY, w - t + 8 + v.hung.length * (e.phase ? 4 : 5), '#9fd8ff'); ctx.particle({ x: s, y: A.ceilY + 2, vx: 0, vy: 0.5, life: 20, max: 20, colour: '#ffffff', size: 1, gravity: 0.02 }); }
        for (k = 0; k < v.hung.length; k++) v.hung[k].age++;
        if (t % 5 === 0) ctx.particle({ x: x, y: A.ceilY + 1, vx: (ctx.random() - 0.5), vy: 0.6, life: 22, max: 22, colour: '#d8f1ff', size: 1, gravity: 0.04 });
        if (t % 16 === 0) ctx.shake(1);
      },
      fire: function (e) { e.vars.fin = null; },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, every = e.phase ? 4 : 5, k;
        for (k = 0; k < v.hung.length; k++) { v.hung[k].age++; v.hung[k].shake = k < v.dropped + 3; }
        if (t % every === 0 && v.hung.length) { var h = v.hung.shift(); ctx.projectile({ x: h.x, y: A.ceilY + 8, vx: 0, vy: 1.2, gravity: 0.2, life: 120, colour: '#d8f1ff', size: 6, damage: 1, element: 'frost', icicle: true, big: true, cause: 'icicle', land: function (p) { shards(ctx, p.x, A.groundY - 2, 8, 2, true); ctx.sfx('icicle'); } }); }
      },
      end: function (e) { var A = e.arena; e.vars.hung = []; putHead(e, clamp(e.x, A.left + 30, A.right - 30), A.groundY + DEEP, 0); }
    },
    // its head out of the wall, and its lungs emptied along the floor; then it hangs there, spent
    gust: {
      name: 'gust', windup: 92, active: 96, recover: 120, cooldown: 30, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { var v = e.vars, A = e.arena; v.side = ctx.hero.x < (A.left + A.right) / 2 ? -1 : 1; v.fin = null; v.face = 'head'; putHead(e, v.side < 0 ? A.left - 18 : A.right + 18, A.groundY - 13, v.side < 0 ? 0 : Math.PI); },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena, out = -v.side;
        if (t === 1) { ctx.telegraph(A.left, A.groundY - 18, A.right - A.left, 18, w, '#9fd8ff'); ctx.telegraphCrack(v.side < 0 ? A.left + 4 : A.right - 4, A.groundY - 13, 20, 40, '#d8f1ff'); ctx.sfx('freeze'); }
        if (t < 26) moveHead(e, e.x + out * 1.4, A.groundY - 13);
        if (t === 26) { shards(ctx, e.x, e.y, 14, 2.4, false); ctx.shake(3); }
        v.face = t > 34 ? 'headOpen' : 'head';
        if (t > 34) for (var k = 0; k < 2; k++) { var r = 30 + ctx.random() * 70; ctx.particle({ x: e.x + out * r, y: e.y + (ctx.random() - 0.5) * 30, vx: -out * r / 14, vy: 0, life: 13, max: 13, colour: ICE[k], size: 1, gravity: 0 }); }
      },
      box: function (e, t) { var v = e.vars, A = e.arena, out = -v.side, reach = Math.min(A.right - A.left, 20 + t * 7), x0 = out > 0 ? e.x + 8 : e.x - 8 - reach; return [{ x0: x0, x1: x0 + reach, y0: A.groundY - 18, y1: A.groundY, damage: 1, element: 'frost' }]; },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, out = -v.side, reach = Math.min(A.right - A.left, 20 + t * 7), k;
        for (k = 0; k < 7; k++) { var s = 4 + ctx.random() * 4; ctx.particle({ x: e.x + out * (10 + ctx.random() * reach * 0.5), y: A.groundY - 2 - ctx.random() * 15, vx: out * s, vy: (ctx.random() - 0.5) * 0.4, life: 14 + ctx.random() * 14, max: 28, colour: ICE[k % 4], size: k < 2 ? 2 : 1, gravity: 0 }); }
        ctx.glow(e.x + out * 40, A.groundY - 8, 50, '#9fd8ff', 0.2);
        if (t === 1 || t === 50) ctx.sfx('gust');
        if (t % 12 === 1) ctx.shake(1.2);
      },
      resting: function (e, ctx, t) {
        var v = e.vars, out = -v.side;
        if (t < 96) { v.face = 'headDim'; if (e.y < e.arena.groundY - 8) moveHead(e, e.x, e.y + 0.5); v.angle = out > 0 ? 0.3 : Math.PI - 0.3; if (t % 14 === 0) ctx.particle({ x: e.x + out * 12, y: e.y, vx: out * 0.5, vy: -0.3, life: 24, max: 24, colour: '#ffffff', size: 1, gravity: -0.01 }); }
        else { v.face = 'head'; e.x -= out * 2; v.trail.forEach(function (p) { p.x -= out * 2; }); }
      },
      end: function (e) { var A = e.arena; putHead(e, e.vars.side < 0 ? A.left + 30 : A.right - 30, A.groundY + DEEP, 0); }
    },
    // in and out of the floor like a needle through cloth
    coil: {
      name: 'coil', windup: 56, active: 150, recover: 1, cooldown: 0, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { var v = e.vars, A = e.arena; v.cx = clamp(e.x, A.left + 70, A.right - 70); v.fin = null; v.face = 'head'; putHead(e, v.cx, A.groundY + 22, Math.PI); },
      telling: function (e, ctx, t, w) { var v = e.vars, A = e.arena; if (t === 1) { ctx.telegraphCircle(v.cx, A.groundY - 8, 50, w + 30, '#9fd8ff'); ctx.telegraphCrack(v.cx - 44, A.groundY, 26, w, '#d8f1ff'); ctx.telegraphCrack(v.cx + 44, A.groundY, 26, w + 30, '#d8f1ff'); ctx.sfx('freeze'); } if (t % 12 === 0) ctx.shake(1.2); },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, r = 30 + Math.min(16, t), th = Math.PI / 2 + t * 0.084, was = e.y < A.groundY;
        moveHead(e, v.cx + Math.cos(th) * r, A.groundY - 8 + Math.sin(th) * r);
        if (was !== (e.y < A.groundY)) { shards(ctx, e.x, A.groundY - 2, 14, 2.8, true); ctx.shake(2.5); ctx.sfx('freeze'); }
        v.face = 'headOpen';
      },
      box: function (e) { return headBox(e); },
      end: function (e) { e.vars.next = 'nova'; }
    },
    // it rears in the middle of its own rings, and bursts
    nova: {
      name: 'nova', windup: 58, active: 12, recover: 110, cooldown: 30, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e) { e.vars.rays = []; for (var k = 0; k < 9; k++) e.vars.rays.push(-Math.PI + (k + 0.5) * Math.PI / 9); },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena;
        if (t <= 26) moveHead(e, v.cx + Math.sin(t * 0.3) * 2, A.groundY + 22 - t * 2.7);
        if (t === 12) v.rays.forEach(function (a) { ctx.telegraphLine(v.cx, A.groundY - 48, v.cx + Math.cos(a) * 220, A.groundY - 48 + Math.sin(a) * 220, w - 12, '#d8f1ff'); });
        v.face = t > 26 ? 'headOpen' : 'head'; if (t > 26) v.angle = -Math.PI / 2;
        ctx.glow(e.x, e.y, 10 + t / w * 26, '#d8f1ff', 0.15 + 0.35 * t / w);
        if (t % 3 === 0) { var a = ctx.random() * 6.28; ctx.particle({ x: e.x + Math.cos(a) * 34, y: e.y + Math.sin(a) * 34, vx: -Math.cos(a) * 2.4, vy: -Math.sin(a) * 2.4, life: 13, max: 13, colour: '#ffffff', size: 1, gravity: 0 }); }
      },
      fire: function (e, ctx) {
        var v = e.vars;
        v.rays.forEach(function (a) { ctx.projectile({ x: e.x + Math.cos(a) * 10, y: e.y + Math.sin(a) * 10, vx: Math.cos(a) * 2.7, vy: Math.sin(a) * 2.7, life: 110, colour: '#d8f1ff', size: 5, damage: 1, element: 'frost', shard: true, cause: 'icicle' }); });
        shards(ctx, e.x, e.y, 40, 4, false); ctx.shake(6); ctx.sfx('boom'); ctx.flash('#d8f1ff', 6);
      },
      resting: function (e, ctx, t) {
        var v = e.vars;
        if (t < 86) { slump(e, 1.6); v.face = 'headDim'; v.angle = 0.3; if (t % 16 === 0) ctx.particle({ x: e.x + 12, y: e.y - 6, vx: 0.2, vy: -0.4, life: 26, max: 26, colour: '#ffffff', size: 1, gravity: -0.01 }); }
        else { v.face = 'head'; under(e, ctx, 1, 1); }
      }
    },
    // the tail, along the ice
    lash: {
      name: 'lash', windup: 50, active: 26, recover: 30, cooldown: 36, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { var v = e.vars; v.fin = null; v.lash = { x: e.x, dir: ctx.hero.x > e.x ? 1 : -1, len: 0, rise: 0 }; },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena, L = v.lash;
        if (t === 1) { ctx.telegraph(L.dir > 0 ? L.x : L.x - 130, A.groundY - 12, 130, 12, w, '#9fd8ff'); ctx.telegraphCrack(L.x, A.groundY, 22, w, '#d8f1ff'); ctx.sfx('freeze'); }
        L.len = Math.min(18, t); L.rise = 10 + Math.sin(t * 0.3) * 4;      // the tail stands out of the ice, and sways
      },
      during: function (e, ctx, t) {
        var L = e.vars.lash; L.rise = 0;
        L.len = t <= 9 ? 18 + (130 - 18) * t / 9 : t <= 16 ? 130 : Math.max(0, 130 * (1 - (t - 16) / 10));
        if (t === 1) ctx.sfx('swing');
        if (t < 10) shards(ctx, L.x + L.dir * L.len, e.arena.groundY - 3, 3, 2, true);
      },
      box: function (e, t) { var L = e.vars.lash, A = e.arena; return t <= 18 ? [{ x0: L.dir > 0 ? L.x : L.x - L.len, x1: L.dir > 0 ? L.x + L.len : L.x, y0: A.groundY - 11, y1: A.groundY, damage: 1, element: 'plain' }] : []; },
      resting: function (e) { e.vars.lash = null; },
      end: function (e) { e.vars.lash = null; }
    }
  };

  var SCRIPTS = [['breach', 'breach', 'beach', 'rain', 'gust'], ['coil', 'breach', 'beach', 'lash', 'gust', 'rain', 'lash']];

  // between blows it is a fin in the ice, coming for her
  function think(e, ctx) {
    var v = e.vars, A = e.arena, hero = ctx.hero;
    if (v.next) { var forced = ATTACKS[v.next]; v.next = null; return forced; }
    var script = SCRIPTS[e.phase], want = script[e.script % script.length];
    var goal = want === 'gust' ? (hero.x < (A.left + A.right) / 2 ? A.left + 30 : A.right - 30) : want === 'coil' ? (A.left + A.right) / 2 : want === 'lash' ? clamp(hero.x + (hero.x > (A.left + A.right) / 2 ? -76 : 76), A.left + 20, A.right - 20) : want === 'rain' ? e.x : hero.x;
    if (e.cooldown > 0 && want !== 'gust' && want !== 'rain') goal = hero.x + Math.sin(e.clock * 0.05) * 70;      // circling, while it gets its breath
    goal = clamp(goal, A.left + 20, A.right - 20);
    if (e.y < A.groundY + DEEP - 1) under(e, ctx, goal > e.x ? 1 : -1, 1);
    else { var step = clamp(goal - e.x, -(e.phase ? 3.2 : 2.8), e.phase ? 3.2 : 2.8); moveHead(e, e.x + step, A.groundY + DEEP); if (Math.abs(step) > 0.3) v.finDir = step > 0 ? 1 : -1; }
    v.fin = e.y >= A.groundY + DEEP - 1 ? 'floor' : null; v.face = 'head';
    if (v.fin && e.clock % 3 === 0) ctx.particle({ x: e.x - v.finDir * 5, y: A.groundY - 1, vx: -v.finDir * 0.6, vy: -0.7 - ctx.random() * 0.6, life: 14, max: 14, colour: ICE[e.clock % 4], size: 1, gravity: 0.06 });
    if (e.cooldown > 0 || !hero.alive || !v.fin || Math.abs(e.x - goal) > 5) return null;
    e.script++;
    return ATTACKS[want];
  }

  function start(e, arena) { e.vars.trail = []; e.vars.hung = []; e.vars.angle = -Math.PI / 2; e.vars.finDir = -1; putHead(e, arena.bossX, arena.groundY + 40, -Math.PI / 2); }
  // it comes up through the floor to look at her, and goes down again
  function waking(e, ctx, t) {
    var v = e.vars, A = e.arena;
    if (t === 8) { ctx.telegraphCrack(A.bossX, A.groundY, 30, 30, '#d8f1ff'); ctx.sfx('freeze'); }
    if (t > 30 && t <= 60) { moveHead(e, A.bossX + Math.sin(t * 0.2) * 5, A.groundY + 40 - (t - 30) * 3.3); if (t === 36) { shards(ctx, A.bossX, A.groundY - 2, 30, 3.4, true); ctx.shake(5); ctx.sfx('boom'); } }
    if (t > 60 && t <= 96) { v.face = 'headOpen'; v.angle = ctx.hero.x > e.x ? -0.5 : -Math.PI + 0.5; if (t === 64) { ctx.sfx('roar'); ctx.shake(4); } if (t % 3 === 0) { var a = v.angle + (ctx.random() - 0.5); ctx.particle({ x: e.x + Math.cos(v.angle) * 12, y: e.y + Math.sin(v.angle) * 12, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 20, max: 20, colour: '#ffffff', size: 1, gravity: 0 }); } }
    if (t > 96) { v.face = 'head'; v.trail.forEach(function (p) { p.y += 3.2; }); e.y += 3.2; }
    if (t === 129) putHead(e, A.bossX, A.groundY + DEEP, 0);
  }
  function always(e, ctx) {
    var v = e.vars;
    if (inAir(e, e, 0)) { ctx.light(e.x, e.y, 60, 0.85); ctx.glow(e.x, e.y, 14, '#9fd8ff', 0.18); }
    else if (v.fin) ctx.light(e.x, v.fin === 'ceiling' ? e.arena.ceilY + 6 : e.arena.groundY - 6, 34, 0.7);
  }
  function onPhase(e, ctx) { var v = e.vars; v.lash = null; v.hung = []; v.next = null; shards(ctx, e.x, e.y, 40, 4, false); ctx.flash('#d8f1ff', 8); if (!inAir(e, e, 0)) putHead(e, clamp(e.x, e.arena.left + 30, e.arena.right - 30), e.arena.groundY + DEEP, 0); e.stun = 0; e.cooldown = 50; }
  // it dies in the open: whatever was in the stone is heaved up onto the ice
  function fall(e, ctx) { var v = e.vars, A = e.arena; v.lash = null; v.hung = []; v.fin = null; v.face = 'headDim'; if (!inAir(e, e, 0)) putHead(e, clamp(e.x, A.left + 60, A.right - 60), A.groundY - 7, 0); v.trail.forEach(function (p) { p.x = clamp(p.x, A.left + 8, A.right - 8); p.y = clamp(p.y, A.ceilY + 8, A.groundY - 6); }); }
  function dyingStep(e, ctx) {
    slump(e, 2.4);
    if (e.dying % 5 === 0 && e.dying <= 5 * (N + 1)) { var i = N - e.dying / 5 + 1, p = i >= 1 ? at(e, Math.round(i)) : e; shards(ctx, p.x, p.y, 14, 2.8, false); ctx.sfx('freeze'); ctx.shake(2); }
    if (e.dying === 58) { shards(ctx, e.x, e.y, 50, 4.5, false); ctx.sfx('boom'); ctx.flash('#d8f1ff', 8); }
  }

  GD.register('wyrm', {
    name: 'The Rime Wyrm', title: 'THAT SWIMS IN THE FROZEN CISTERN', element: 'frost', flying: true, ownBody: true,
    hp: 120, body: { w: 18, h: 14 }, phases: [0.5], wake: 130, reel: 1,
    rig: buildRig, draw: draw, attacks: ATTACKS, think: think, always: always, onPhase: onPhase, fall: fall, waking: waking, start: start, dyingStep: dyingStep,
    tempo: function (e) { return e.phase ? 0.7 : 1; },
    hurtBoxes: function (e) {
      var boxes = [], v = e.vars, k, p;
      if (inAir(e, e, 0)) boxes.push({ x0: e.x - 10, x1: e.x + 10, y0: e.y - 8, y1: e.y + 8, mult: 1.5 });
      for (k = 1; k <= N; k++) { p = at(e, k); if (inAir(e, p, -2)) boxes.push({ x0: p.x - 6, x1: p.x + 6, y0: p.y - 6, y1: p.y + 6, mult: 0.5 }); }
      if (v.fin === 'floor') boxes.push({ x0: e.x - 6, x1: e.x + 6, y0: e.arena.groundY - 10, y1: e.arena.groundY, mult: 0.5 });
      return boxes;
    }
  });
})();
