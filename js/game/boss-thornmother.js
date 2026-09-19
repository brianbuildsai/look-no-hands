/* boss-thornmother.js: the Thornmother, rooted in the Overgrown Cistern.

   She does not move. A ribbed bulb the height of two Wardens sits in the
   middle of the hall with a shut flower on top and four vines round it, and
   everything she does comes to you. A vine rears back and lashes the floor
   from her to the wall, low, to be jumped, or at the height of your head, to
   be stood under. Roots burst up through marked cracks one after another,
   walking toward you. She spits seed pods that land and open into brambles,
   which can be cut down, and breathes out pollen that drifts. Each of those
   great efforts leaves her flower wide open, and the heart in it is soft;
   her bulb is rind and takes half. Below half her life a low lash and a high
   one come together from either side, the roots walk both ways, the
   brambles fruit into puffballs, and the pollen follows you.

   Bulb and flower are worked out rather than drawn: an oval with ribs, and
   seven petals that are ellipses fanned about the base, at five openings.
   The vines are curves sampled every few pixels, drawn live. */
(function () {
  'use strict';
  var ST = window.UndercroftSteady;   // sines that every browser agrees on (steady.js): two machines compute this game and must match to the bit
  var GD = window.Guardians;
  if (!GD) return;

  var PAL = { k: '#06120a', p: '#365040', q: '#243328', m: '#5e8a66', l: '#9ae66e', e: '#ff4f7b', E: '#ff9ab5', d: '#b02a54', y: '#ffd24d', h: '#ff3b4e', x: '#ffffff' };

  /* ---- the parts, worked out ---- */

  function grid(w, h, fn) { var rows = [], x, y; for (y = 0; y < h; y++) { var s = ''; for (x = 0; x < w; x++) s += fn(x, y) || '.'; rows.push(s); } return rows; }
  function outlined(w, h, inside, fill) {
    return grid(w, h, function (x, y) { if (!inside(x, y)) return '.'; var edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1); return edge ? 'k' : fill(x, y); });
  }
  function bulbRows(squash) {
    var w = 46, h = 34;
    function inside(x, y) { var nx = (x - 22.5) / 22.5, top = 6 + squash, ny = (y - (h - 14)) / (y < h - 14 ? (h - 14 - top) : 15); return y >= top && nx * nx + ny * ny <= 1 && y < h; }
    return outlined(w, h, inside, function (x, y) { var rib = Math.abs(((x - 22.5) / (1 + (y - 6) * 0.03))) % 7 < 1.2; return rib ? 'q' : (x + y * 2) % 13 === 0 ? 'l' : x < 14 && y < 20 ? 'm' : 'p'; });
  }
  // seven petals fanned about the base; `open` is 0 for a bud and 1 for a flower, and at 1 the heart shows
  function flowerRows(open) {
    var w = 48, h = 36, bx = 23.5, by = 31, petals = [], i;
    for (i = 0; i < 7; i++) { var a = -Math.PI / 2 + (i - 3) * (0.17 + open * 0.36), len = 21 - Math.abs(i - 3) * (1 - open) * 1.8, wide = 10 + open * 1; petals.push({ a: a, len: len, wide: wide, order: open > 0.5 ? -Math.abs(i - 3) : Math.abs(i - 3), i: i }); }
    petals.sort(function (p, q) { return q.order - p.order; });
    function inPetal(p, x, y) { var dx = x - bx, dy = y - by, u = dx * ST.cos(p.a) + dy * ST.sin(p.a) - p.len / 2, v = -dx * ST.sin(p.a) + dy * ST.cos(p.a); return (u / (p.len / 2)) * (u / (p.len / 2)) + (v / (p.wide / 2)) * (v / (p.wide / 2)) <= 1 ? v : null; }
    function top(x, y) { for (var k = petals.length - 1; k >= 0; k--) { var v = inPetal(petals[k], x, y); if (v !== null) return { p: petals[k], v: v }; } return null; }
    function heart(x, y) { var dx = x - bx, dy = y - (by - 9); return open > 0.6 && dx * dx + dy * dy <= 30; }
    return grid(w, h, function (x, y) {
      if (heart(x, y)) { var hx = x - bx, hy = y - (by - 9), rr = hx * hx + hy * hy; return rr > 22 ? 'k' : rr < 5 ? 'x' : rr < 12 ? 'y' : 'h'; }
      var t = top(x, y);
      if (!t) { var sx = x - bx, sy = y - (by + 1); return sx * sx / 64 + sy * sy / 9 <= 1 ? (sx * sx / 64 + sy * sy / 9 > 0.6 ? 'k' : 'm') : '.'; }
      var n = [top(x - 1, y), top(x + 1, y), top(x, y - 1), top(x, y + 1)], edge = n.some(function (o) { return !o || o.p !== t.p; });
      return edge ? 'k' : t.v < -1 ? 'E' : t.v > 1.5 ? 'd' : 'e';
    });
  }

  function buildRig() {
    var parts = { bulb: bulbRows(0), bulbLow: bulbRows(8), bulbFlat: bulbRows(16) }, anims, f, k;
    for (f = 0; f < 5; f++) parts['flower' + f] = flowerRows(f / 4);
    function P(flower, fx, fy, bulb, by) { return [[bulb || 'bulb', 17, 46 + (by || 0)], ['flower' + flower, 16 + (fx || 0), 20 + (fy || 0)]]; }
    anims = { idle: [P(0), P(1), P(2), P(3), P(4)], sway: [P(0, -1), P(0, 1)], wake: [[['bulbFlat', 17, 46]], [['bulbLow', 17, 46]], P(0, 0, 6), P(0), P(2), P(0)], reel: [P(1, 3, 3), P(1, 4, 4)],
      death: [P(1, 3, 3), P(0, 5, 8), P(0, 7, 14, 'bulbLow'), [['bulbLow', 17, 46]], [['bulbFlat', 17, 46]], [['bulbFlat', 17, 46]]] };
    return GD.rig(PAL, parts, 80, 80, { x: 40, y: 80 }, anims);
  }

  /* ---- the vines: curves from her roots to their tips, drawn behind her ---- */

  function vineHome(e, n) { var side = n < 2 ? -1 : 1, far = n % 3 === 0; return { x: e.x + side * (far ? 58 : 34) + ST.sin(e.clock * 0.04 + n * 1.7) * 6, y: e.arena.groundY - (far ? 40 : 64) + ST.cos(e.clock * 0.05 + n) * 5 }; }
  function drawVine(pen, cx, cy, rx, ry, tx, ty, lift, hot) {
    var mx = (rx + tx) / 2, my = Math.min(ry, ty) - lift, n = Math.max(6, Math.round((Math.abs(tx - rx) + Math.abs(ty - ry) + lift) / 3)), k, px, py;
    for (k = 0; k <= n; k++) {
      var t = k / n, u = 1 - t; px = Math.round(u * u * rx + 2 * u * t * mx + t * t * tx) - cx; py = Math.round(u * u * ry + 2 * u * t * my + t * t * ty) - cy;
      pen.fillStyle = '#06120a'; pen.fillRect(px - 2, py - 2, 5, 5);
    }
    for (k = 0; k <= n; k++) {
      t = k / n; u = 1 - t; px = Math.round(u * u * rx + 2 * u * t * mx + t * t * tx) - cx; py = Math.round(u * u * ry + 2 * u * t * my + t * t * ty) - cy;
      pen.fillStyle = hot ? '#5e8a66' : '#365040'; pen.fillRect(px - 1, py - 1, 3, 3); pen.fillStyle = hot ? '#9ae66e' : '#5e8a66'; pen.fillRect(px - 1, py - 1, 2, 1);
      if (k % 4 === 2) { pen.fillStyle = '#c5ff9a'; pen.fillRect(px + (k % 8 === 2 ? 2 : -2), py - 2, 1, 1); }
    }
    // the tip: a blade
    pen.fillStyle = '#06120a'; pen.fillRect(px - 3, py - 3, 7, 7); pen.fillStyle = hot ? '#ffffff' : '#9ae66e'; pen.fillRect(px - 2, py - 1, 5, 3); pen.fillRect(px - 1, py - 2, 3, 5); pen.fillStyle = '#ffffff'; pen.fillRect(px, py, 1, 1);
  }
  function scenery(e, G) {
    var v = e.vars, A = e.arena, pen = G.pen, k;
    if (e.state === 'wake' && e.wait > 50) return;
    // roots that have come up through the floor
    (v.spikes || []).forEach(function (s) { var up = s.t < 6 ? s.t / 6 : s.t > s.life - 8 ? (s.life - s.t) / 8 : 1, hgt = Math.round(30 * up), x = Math.round(s.x) - G.cx, y = A.groundY - G.cy; pen.fillStyle = '#06120a'; pen.fillRect(x - 5, y - hgt, 10, hgt); pen.fillStyle = '#5a4036'; pen.fillRect(x - 4, y - hgt + 1, 8, hgt - 1); pen.fillStyle = '#3b2a24'; pen.fillRect(x + 1, y - hgt + 1, 3, hgt - 1); pen.fillStyle = '#06120a'; pen.fillRect(x - 5, y - hgt, 3, 4); pen.fillRect(x + 2, y - hgt, 3, 4); pen.fillStyle = '#9ae66e'; pen.fillRect(x - 1, y - hgt - 2, 2, 3); });
    // brambles grown from her pods
    (v.brambles || []).forEach(function (b) { var grow = Math.min(1, b.age / 20), x = Math.round(b.x) - G.cx, y = A.groundY - G.cy, hgt = Math.round(14 * grow), ripe = b.fruit && b.age > b.fruit - 90; pen.fillStyle = '#06120a'; pen.fillRect(x - 9, y - hgt, 18, hgt); pen.fillStyle = b.flash > 0 ? '#ffffff' : '#243328'; pen.fillRect(x - 8, y - hgt + 1, 16, hgt - 1); pen.fillStyle = '#365040'; for (k = 0; k < 4; k++) pen.fillRect(x - 7 + k * 4, y - hgt + 1 + (k % 2) * 2, 3, Math.max(0, hgt - 3)); pen.fillStyle = '#9ae66e'; for (k = 0; k < 5; k++) pen.fillRect(x - 8 + k * 4, y - hgt - 1 + (k % 2), 1, 2); if (ripe) { pen.fillStyle = (G.tick >> 2) % 2 ? '#c5ff9a' : '#ff9ab5'; pen.fillRect(x - 2, y - hgt - 4, 4, 4); } });
    for (k = 0; k < 4; k++) { var vn = v.vines[k], side = k < 2 ? -1 : 1; drawVine(pen, G.cx, G.cy, e.x + side * (k % 3 === 0 ? 20 : 14), A.groundY - 4, vn.x, vn.y, vn.lift, vn.hot); }
  }

  /* ---- what she does ---- */

  var GREEN = ['#9ae66e', '#c5ff9a', '#5e8a66', '#ffffff'];
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function burst(ctx, x, y, n, speed, up) { for (var k = 0; k < n; k++) { var a = up ? -Math.PI * ctx.random() : ctx.random() * 6.2832, s = speed * (0.4 + ctx.random()); ctx.particle({ x: x, y: y, vx: ST.cos(a) * s, vy: ST.sin(a) * s, life: 16 + ctx.random() * 20, max: 36, colour: GREEN[k % 4], size: ctx.random() < 0.3 ? 2 : 1, gravity: 0.06 }); } }
  function sideOf(e, hero) { return hero.x < e.x ? -1 : 1; }
  function vineOn(e, side, far) { return e.vars.vines[side < 0 ? (far ? 0 : 1) : (far ? 3 : 2)]; }
  function wallOn(e, side) { return side < 0 ? e.arena.left + 4 : e.arena.right - 4; }
  // after a great effort the flower opens wide, and stays so for a while
  function openFor(e, ctx, t, span) { var v = e.vars; v.openTo = t < span - 24 ? 1 : 0; if (t === 1) ctx.sfx('castbloom'); if (t < span - 24 && t % 12 === 0) ctx.particle({ x: e.x + (ctx.random() - 0.5) * 14, y: e.y - 40, vx: (ctx.random() - 0.5) * 0.4, vy: -0.5, life: 30, max: 30, colour: '#ffd24d', size: 1, gravity: -0.004 }); }

  // one lash: `high` is at the height of her head, otherwise along the floor
  function lashBox(e, L) { var A = e.arena, x0 = e.x + L.side * 18, x1 = e.x + L.side * (18 + L.len); return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: A.groundY - (L.high ? 46 : 14), y1: A.groundY - (L.high ? 22 : 0), damage: 1, element: 'plain' }; }
  function lashTell(e, ctx, L, life) { var A = e.arena, far = Math.abs(wallOn(e, L.side) - e.x) - 18, x0 = L.side > 0 ? e.x + 18 : e.x - 18 - far; ctx.telegraph(x0, A.groundY - (L.high ? 46 : 14), far, L.high ? 24 : 14, life, L.high ? '#ff9ab5' : '#9ae66e'); }
  function lashPose(e, L, t, w, striking) {
    var A = e.arena, vn = vineOn(e, L.side, true), y = A.groundY - (L.high ? 34 : 6);
    if (!striking) { var back = Math.min(1, t / (w * 0.6)); vn.x = e.x + L.side * (30 - 22 * back); vn.y = A.groundY - 50 - 26 * back; vn.lift = 10; vn.hot = t > w * 0.5; }
    else { vn.x = e.x + L.side * (18 + L.len); vn.y = y; vn.lift = L.high ? 4 : 10 * Math.max(0, 1 - L.len / 120); vn.hot = true; }
    vn.busy = true;
  }
  function lashAttack(name, make) {
    return {
      name: name, windup: 58, active: 40, recover: 38, cooldown: 50, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { e.vars.lashes = make(e, ctx); },
      telling: function (e, ctx, t, w) { e.vars.lashes.forEach(function (L) { if (t === 1) lashTell(e, ctx, L, w); lashPose(e, L, t, w, false); }); if (t === 1) ctx.sfx('select'); },
      fire: function (e, ctx) { ctx.sfx('lash'); ctx.shake(2); },
      during: function (e, ctx, t) { e.vars.lashes.forEach(function (L) { var far = Math.abs(wallOn(e, L.side) - e.x) - 18; L.len = t <= 20 ? far * t / 20 : t <= 28 ? far : far * Math.max(0, 1 - (t - 28) / 12); lashPose(e, L, t, 0, true); if (t <= 20 && t % 2 === 0) burst(ctx, e.x + L.side * (18 + L.len), e.arena.groundY - (L.high ? 34 : 3), 2, 1.6, !L.high); }); },
      box: function (e, t) { return t > 30 ? [] : e.vars.lashes.map(function (L) { return lashBox(e, L); }); },
      end: function (e) { e.vars.vines.forEach(function (vn) { vn.busy = false; vn.hot = false; }); }
    };
  }

  var ATTACKS = {
    low: lashAttack('low', function (e, ctx) { return [{ side: sideOf(e, ctx.hero), high: false, len: 0 }]; }),
    high: lashAttack('high', function (e, ctx) { return [{ side: sideOf(e, ctx.hero), high: true, len: 0 }]; }),
    // below half: low on her side, high on the other, together
    both: lashAttack('both', function (e, ctx) { var s = sideOf(e, ctx.hero); return [{ side: s, high: ctx.random() < 0.5, len: 0 }, { side: -s, high: ctx.random() < 0.5, len: 0 }]; }),

    // roots through the floor, one after another, walking toward her
    roots: {
      name: 'roots', windup: 50, active: 70, recover: 130, cooldown: 40, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { var v = e.vars, s = sideOf(e, ctx.hero), sides = e.phase ? [s, -s] : [s], k; v.rootAt = []; sides.forEach(function (sd) { for (k = 0; k < 6; k++) { var x = e.x + sd * (34 + k * 27); if (x > e.arena.left + 8 && x < e.arena.right - 8) v.rootAt.push({ x: x, at: k * 9, done: false }); } }); },
      telling: function (e, ctx, t, w) { var v = e.vars, A = e.arena; if (t === 1) { v.rootAt.forEach(function (r) { ctx.telegraphCrack(r.x, A.groundY, 14, w + r.at, '#c5ff9a'); ctx.telegraph(r.x - 6, A.groundY - 30, 12, 30, w + r.at, '#9ae66e'); }); ctx.sfx('select'); } if (t % 10 === 0) ctx.shake(1); },
      during: function (e, ctx, t) { var v = e.vars, A = e.arena; v.rootAt.forEach(function (r) { if (!r.done && t - 1 >= r.at) { r.done = true; v.spikes.push({ x: r.x, t: 0, life: 26 }); burst(ctx, r.x, A.groundY - 2, 10, 2.6, true); ctx.sfx('roots'); ctx.shake(1.5); } }); },
      box: function (e) { var A = e.arena; return e.vars.spikes.filter(function (s) { return s.t >= 2 && s.t < 16; }).map(function (s) { return { x0: s.x - 6, x1: s.x + 6, y0: A.groundY - 30, y1: A.groundY, damage: 1, element: 'plain' }; }); },
      resting: function (e, ctx, t) { openFor(e, ctx, t, 130); }
    },

    // seed pods, lobbed; where they land a bramble grows
    pods: {
      name: 'pods', windup: 48, active: 40, recover: 130, cooldown: 40, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e) { e.vars.spat = 0; },
      telling: function (e, ctx, t, w) { e.vars.openTo = 0.5; if (t === 1) ctx.sfx('select'); if (t % 5 === 0) ctx.particle({ x: e.x + (ctx.random() - 0.5) * 10, y: e.y - 44, vx: 0, vy: -0.6, life: 14, max: 14, colour: '#c5ff9a', size: 1, gravity: 0 }); },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, n = e.phase ? 4 : 3;
        if ((t - 1) % 10 !== 0 || v.spat >= n) return;
        var k = v.spat++, T = 56, g = 0.12, hx = e.x, hy = e.y - 46, tx = clamp(ctx.hero.x + [0, 50, -46, 90][k] * sideOf(e, ctx.hero) + ctx.hero.vx * 10, A.left + 16, A.right - 16);
        if (Math.abs(tx - e.x) < 34) tx = e.x + sideOf(e, ctx.hero) * 40;
        ctx.projectile({ x: hx, y: hy, vx: (tx - hx) / T, vy: (A.groundY - hy) / T - g * (T - 1) / 2, gravity: g, life: 240, colour: '#9ae66e', size: 5, damage: 1, element: 'bloom', pod: true, cause: 'pod',
          land: function (p) { if (v.brambles.length < 6) v.brambles.push({ x: p.x, hp: 4, age: 0, life: 600, flash: 0, fruit: e.phase ? 300 : 0 }); burst(ctx, p.x, A.groundY - 2, 10, 2, true); ctx.sfx('hit'); } });
        ctx.telegraphCircle(tx, A.groundY - 2, 11, T, '#9ae66e'); ctx.sfx('spit');
      },
      resting: function (e, ctx, t) { openFor(e, ctx, t, 130); }
    },

    // pollen, breathed out, that drifts (and below half, follows)
    pollen: {
      name: 'pollen', windup: 52, active: 30, recover: 140, cooldown: 40, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e) { e.vars.puffed = 0; },
      telling: function (e, ctx, t, w) { e.vars.openTo = 0.5; if (t === 1) { ctx.telegraphCircle(e.x, e.y - 40, 40, w, '#ffd24d'); ctx.sfx('select'); } for (var k = 0; k < 2; k++) { var a = ctx.random() * 6.2832; ctx.particle({ x: e.x + ST.cos(a) * 36, y: e.y - 40 + ST.sin(a) * 36, vx: -ST.cos(a) * 2.4, vy: -ST.sin(a) * 2.4, life: 14, max: 14, colour: '#ffd24d', size: 1, gravity: 0 }); } },
      during: function (e, ctx, t) {
        var v = e.vars; v.openTo = 0.75;
        if ((t - 1) % 9 !== 0 || v.puffed >= 3) return;
        var k = v.puffed++, s = sideOf(e, ctx.hero), a = -0.5 + k * 0.35;
        ctx.projectile({ x: e.x, y: e.y - 40, vx: s * ST.cos(a) * 1.1, vy: ST.sin(a) * 0.8 - 0.2, gravity: 0.004, life: e.phase ? 300 : 240, colour: '#ffd24d', size: 12, damage: 1, element: 'bloom', cloud: true, seek: e.phase ? 0.014 : 0.004, cause: 'pollen' });
        ctx.sfx('castbloom');
      },
      resting: function (e, ctx, t) { openFor(e, ctx, t, 140); }
    }
  };

  var SCRIPTS = [['low', 'roots', 'high', 'pods', 'low', 'pollen'], ['both', 'roots', 'pods', 'both', 'pollen', 'high']];

  function think(e, ctx) {
    var v = e.vars; v.openTo = 0; e.state = 'idle';
    if (e.cooldown > 0 || !ctx.hero.alive) return null;
    var script = SCRIPTS[e.phase], want = script[e.script % script.length];
    e.script++;
    return ATTACKS[want];
  }

  function start(e, arena) { var v = e.vars, k; e.x = (arena.left + arena.right) / 2; e.y = arena.groundY; v.open = 0; v.openTo = 0; v.spikes = []; v.brambles = []; v.vines = []; for (k = 0; k < 4; k++) v.vines.push({ x: e.x, y: e.y - 10, lift: 20, busy: false, hot: false }); }
  function waking(e, ctx, t) { if (t === 30) { ctx.shake(4); ctx.sfx('boom'); burst(ctx, e.x, e.y - 4, 30, 3, true); } if (t === 84) { ctx.sfx('roar'); ctx.shake(4); burst(ctx, e.x, e.y - 44, 24, 2.4, false); } e.vars.open = t > 70 && t < 100 ? 0.5 : 0; }

  function always(e, ctx) {
    var v = e.vars, A = e.arena, hero = ctx.hero, k;
    // the flower opens and shuts by degrees, and the frame follows it
    v.open += (v.openTo - v.open) * 0.12;
    if (e.state !== 'wake' && e.stun <= 0) { e.anim = 'idle'; e.frame = clamp(Math.round(v.open * 4), 0, 4); }
    if (v.open > 0.7) { ctx.glow(e.x, e.y - 38, 14 + 3 * ST.sin(e.clock * 0.15), '#ffd24d', 0.35); }
    ctx.light(e.x, e.y - 34, 70, 0.85);
    // vines at rest sway where they hang
    for (k = 0; k < 4; k++) { var vn = v.vines[k]; if (vn.busy) continue; var home = vineHome(e, k); vn.x += (home.x - vn.x) * 0.08; vn.y += (home.y - vn.y) * 0.08; vn.lift += (26 - vn.lift) * 0.1; vn.hot = false; }
    for (k = v.spikes.length - 1; k >= 0; k--) { v.spikes[k].t++; if (v.spikes[k].t > v.spikes[k].life) v.spikes.splice(k, 1); }
    // brambles wound what stands in them, can be cut down, and below half they fruit
    for (k = v.brambles.length - 1; k >= 0; k--) {
      var b = v.brambles[k]; b.age++; if (b.flash > 0) b.flash--;
      if (b.age > 20) ctx.touch({ x0: b.x - 7, x1: b.x + 7, y0: A.groundY - 11, y1: A.groundY + 1 }, 1, 'bloom', e, b.x);
      if (b.fruit && b.age >= b.fruit && ctx.count() < 6) { ctx.summon('puff', b.x, A.groundY - 30); burst(ctx, b.x, A.groundY - 8, 12, 2, true); b.hp = 0; }
      if (b.hp <= 0 || b.age > b.life) { burst(ctx, b.x, A.groundY - 6, 10, 1.8, true); v.brambles.splice(k, 1); }
    }
  }
  function onPhase(e, ctx) { var v = e.vars; v.vines.forEach(function (vn) { vn.busy = false; vn.hot = false; }); v.openTo = 0; burst(ctx, e.x, e.y - 30, 50, 3.6, false); ctx.flash('#9ae66e', 8); }
  function fall(e, ctx) { var v = e.vars; v.brambles = []; v.spikes = []; v.vines.forEach(function (vn) { vn.busy = true; vn.hot = false; }); }
  function dyingStep(e, ctx) {
    var v = e.vars, A = e.arena;
    v.vines.forEach(function (vn, k) { vn.y = Math.min(A.groundY - 4, vn.y + 1.6); vn.lift = Math.max(2, vn.lift - 0.6); vn.x += ((e.x + (k < 2 ? -1 : 1) * (40 + k * 6)) - vn.x) * 0.05; });
    if (e.dying % 8 === 0 && e.dying < 60) { burst(ctx, e.x + (ctx.random() - 0.5) * 30, e.y - ctx.random() * 50, 12, 2.4, false); ctx.shake(2); ctx.sfx('hit'); }
    if (e.dying === 58) { burst(ctx, e.x, e.y - 20, 60, 4, false); ctx.sfx('boom'); ctx.flash('#c5ff9a', 8); }
  }

  GD.register('thornmother', {
    name: 'The Thornmother', title: 'ROOTED IN THE OVERGROWN CISTERN', element: 'bloom', flying: false, ownBody: true,
    hp: 210, body: { w: 40, h: 60 }, phases: [0.5], wake: 110, reel: 90,
    rig: buildRig, scenery: scenery, attacks: ATTACKS, think: think, always: always, onPhase: onPhase, fall: fall, waking: waking, start: start, dyingStep: dyingStep,
    tempo: function (e) { return e.phase ? 0.7 : 1; },
    hurtBoxes: function (e) {
      var v = e.vars, A = e.arena, boxes = [];
      (v.brambles || []).forEach(function (b) { if (b.age > 12) boxes.push({ x0: b.x - 9, x1: b.x + 9, y0: A.groundY - 16, y1: A.groundY, mult: 1, onHit: function (g, ctx, damage) { b.hp -= damage; b.flash = 4; ctx.sfx('hit'); ctx.spark(b.x, A.groundY - 8, '#9ae66e', 6, 1.6, 14, 0.05); return true; } }); });
      // the heart when the flower is open, the bud when it is shut, and the rind of the bulb
      if (v.open > 0.7) boxes.push({ x0: e.x - 10, x1: e.x + 10, y0: e.y - 50, y1: e.y - 29, mult: 1.5 });
      else boxes.push({ x0: e.x - 8, x1: e.x + 8, y0: e.y - 50, y1: e.y - 29, mult: 1 });
      boxes.push({ x0: e.x - 21, x1: e.x + 21, y0: e.y - 28, y1: e.y, mult: 0.5 });
      return boxes;
    }
  });
})();
