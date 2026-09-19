/* boss-regulator.js: the Regulator, in the Escapement.

   The building's clock, from behind. A great dial is set in the far wall
   and under it a pendulum swings from a rail in the vault, its bob a brass
   face the size of a shield. The bob is the guardian: it can be struck at
   the bottom of its swing, or anywhere in it by one who jumps. It throws
   cogs along marked lines; they bite into the stone and stay there, and at
   the next tick they fly back along the same lines to where they were
   thrown from (a cog in the wall can be broken before it does). One of the
   dial's hands comes loose and sweeps your half of the hall, which is marked
   first: the other half is safe. And it strikes the hour: the bob is drawn
   up, the bell counts, and for every stroke a weight falls on a marked
   spot. After it has struck, the bob hangs low and still with its case open,
   and the works inside are soft. Below half its life the pendulum quickens,
   the second hand follows the first across the other half, the hour is
   five, and the cogs are five.

   The bob and its works are computed discs; the dial, rod and hands are drawn live. */
(function () {
  'use strict';
  var GD = window.Guardians;
  if (!GD) return;

  var PAL = { k: '#140d04', R: '#efd27a', r: '#c9a44c', G: '#7a5a1e', g: '#574632', w: '#ffffff', e: '#fff3b0', x: '#0b0b12', h: '#ff8c42', H: '#ffdc9a' };
  var SPR = null;

  function disc(r, fn) {
    var rows = [], x, y, lim = r * r + r;
    function inside(dx, dy) { return dx * dx + dy * dy <= lim; }
    for (y = -r; y <= r; y++) { var s = ''; for (x = -r; x <= r; x++) { if (!inside(x, y)) { s += '.'; continue; } var edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1); s += edge ? 'k' : fn(x, y, x * x + y * y); } rows.push(s); }
    return rows;
  }
  function buildRig() {
    var A = window.Pixels.art, pal = GD.palette(PAL);
    function brass(dx, dy, rr) { return rr > 130 ? (dx + dy < 0 ? 'R' : 'G') : rr > 84 && rr < 104 ? 'G' : dx + dy < -7 ? 'R' : dx + dy > 9 ? 'G' : 'r'; }
    SPR = {
      // the face: two slit eyes and a keyhole for a mouth
      bob: A(disc(13, function (dx, dy, rr) { var eye = (Math.abs(dx) >= 3 && Math.abs(dx) <= 6 && dy >= -4 && dy <= -2), glint = Math.abs(dx) === 4 && dy === -3, hole = (dx * dx + (dy - 3) * (dy - 3) <= 4) || (Math.abs(dx) <= 0 && dy > 3 && dy < 8); return glint ? 'e' : eye || hole ? 'x' : brass(dx, dy, rr); }), pal),
      // the case swung away: two wheels and a hot mainspring
      open: A(disc(13, function (dx, dy, rr) { if (rr > 104) return brass(dx, dy, rr); var a = (dx + 4) * (dx + 4) + (dy + 3) * (dy + 3), b = (dx - 5) * (dx - 5) + (dy - 4) * (dy - 4); return rr <= 6 ? 'H' : rr <= 14 ? 'h' : (a > 9 && a < 22) || (b > 6 && b < 16) ? 'r' : a <= 2 || b <= 2 ? 'R' : (dx + dy * 3) % 5 === 0 ? 'g' : 'x'; }), pal),
      cog: A(disc(5, function (dx, dy, rr) { return rr <= 2 ? 'x' : rr > 18 && (Math.abs(dx) === Math.abs(dy) || dx === 0 || dy === 0) ? 'R' : rr > 18 ? 'G' : 'r'; }), pal),
      weight: A(['..kkk..', '..kgk..', '.kkkkk.', 'kRrrrGk', 'kRrrrGk', 'kRrrrGk', 'kRrrrGk', 'kRrrrGk', 'kRrrrGk', 'kRrrrGk', 'kGGGGGk', '.kkkkk.'], pal)
    };
    SPR.white = window.Pixels.silhouette(SPR.bob, '#ffffff');
    return { frames: { idle: [SPR.bob] }, flipped: { idle: [SPR.bob] }, anchor: { x: 13, y: 13 }, custom: true };
  }

  function mid(A) { return (A.left + A.right) / 2; }
  function dialAt(A) { return { x: mid(A), y: A.groundY - 104 }; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function chips(ctx, x, y, n, speed) { for (var k = 0; k < n; k++) { var a = ctx.random() * 6.2832, s = speed * (0.4 + ctx.random()); ctx.particle({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6, life: 14 + ctx.random() * 16, max: 30, colour: k % 3 ? '#efd27a' : '#ffffff', size: ctx.random() < 0.3 ? 2 : 1, gravity: 0.08 }); } }

  /* ---- behind it: the dial, its hands, the rail, the rod ---- */

  function scenery(e, G) {
    var v = e.vars, A = e.arena, pen = G.pen, d = dialAt(A), x = Math.round(d.x) - G.cx, y = Math.round(d.y) - G.cy, k;
    // the dial: a dark face in a brass ring, twelve marks, the hour and the minute
    pen.fillStyle = '#140d04'; pen.beginPath(); pen.arc(x, y, 40, 0, 6.2832); pen.fill();
    pen.fillStyle = '#7a5a1e'; pen.beginPath(); pen.arc(x, y, 38, 0, 6.2832); pen.fill();
    pen.fillStyle = '#1f170a'; pen.beginPath(); pen.arc(x, y, 34, 0, 6.2832); pen.fill();
    for (k = 0; k < 12; k++) { var a = k / 12 * 6.2832, big = k % 3 === 0; pen.fillStyle = big ? '#efd27a' : '#94784a'; pen.fillRect(Math.round(x + Math.cos(a) * 29) - (big ? 1 : 0), Math.round(y + Math.sin(a) * 29) - (big ? 1 : 0), big ? 3 : 1, big ? 3 : 1); }
    function hand(angle, len, wide, colour) { pen.strokeStyle = colour; pen.lineWidth = wide; pen.beginPath(); pen.moveTo(x, y); pen.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len); pen.stroke(); }
    hand(v.hour, 17, 3, '#c9a44c');
    if (!v.loose) hand(v.minute, 27, 2, '#efd27a');
    pen.fillStyle = '#efd27a'; pen.fillRect(x - 2, y - 2, 4, 4);
    // a hand come loose: long enough to reach the floor, bright along its edge
    if (v.loose) { hand(v.loose.a, v.loose.len, 5, v.loose.hot ? '#ff8c42' : '#7a5a1e'); hand(v.loose.a, v.loose.len, 2, v.loose.hot ? '#ffffff' : '#efd27a'); }
    // the rail in the vault, and the rod down to the bob
    var py = A.ceilY + 4 - G.cy; pen.fillStyle = '#261f15'; pen.fillRect(A.left - G.cx, py - 3, A.right - A.left, 3); pen.fillStyle = '#94784a'; pen.fillRect(A.left - G.cx, py - 1, A.right - A.left, 1);
    if (!v.snapped) { var px = Math.round(v.pivotX) - G.cx, n = Math.max(2, Math.round(v.len / 3)); for (k = 0; k <= n; k++) { pen.fillStyle = k % 4 === 0 ? '#efd27a' : '#94784a'; pen.fillRect(Math.round(px + (e.x - v.pivotX) * k / n) - 1, Math.round(py + (e.y - G.cy - py) * k / n), 2, 3); } pen.fillStyle = '#140d04'; pen.fillRect(px - 4, py - 4, 8, 6); pen.fillStyle = '#c9a44c'; pen.fillRect(px - 3, py - 3, 6, 4); }
    // cogs in flight, in the stone, and coming back
    v.cogs.forEach(function (c) { var img = SPR.cog, cx2 = Math.round(c.x) - G.cx, cy2 = Math.round(c.y) - G.cy; pen.save(); pen.translate(cx2, cy2); if (c.state !== 'stuck') pen.rotate(G.tick * 0.5); pen.drawImage(c.flash > 0 ? window.Pixels.silhouette(img, '#ffffff') : img, -5, -5); pen.restore(); });
  }
  function draw(e, G) {
    var v = e.vars, pen = G.pen, x = Math.round(e.x) - 13 - G.cx, y = Math.round(e.y) - 13 - G.cy;
    if (e.dying > 70) pen.globalAlpha = Math.max(0, 1 - (e.dying - 70) / 20);
    pen.drawImage(e.flash > 0 ? SPR.white : v.open ? SPR.open : SPR.bob, x, y);
    pen.globalAlpha = 1;
  }

  /* ---- what it does ---- */

  function throwCogs(e, ctx) {
    var v = e.vars, hero = ctx.hero, base = Math.atan2(hero.y - 12 - e.y, hero.x - e.x), n = e.phase ? 5 : 3, k;
    for (k = 0; k < n; k++) { var a = base + (k - (n - 1) / 2) * 0.3; v.cogs.push({ x: e.x, y: e.y, ox: e.x, oy: e.y, vx: Math.cos(a) * 3.4, vy: Math.sin(a) * 3.4, state: 'out', t: 0, hp: 1, flash: 0 }); }
    ctx.sfx('cogthrow'); ctx.shake(2);
  }
  function sweepBoxes(e) {
    var v = e.vars, A = e.arena, d = dialAt(A), L = v.loose, out = [], len;
    if (!L || !L.hot) return out;
    for (len = 44; len < L.len; len += 8) { var x = d.x + Math.cos(L.a) * len, y = d.y + Math.sin(L.a) * len; if (y > A.groundY + 4) break; out.push({ x0: x - 5, x1: x + 5, y0: y - 5, y1: y + 5, damage: 1, element: 'gear' }); }
    return out;
  }
  // a hand sweeps one half of the hall: from lying out along the wall down to the vertical
  function tellHalf(e, ctx, side, life) { var A = e.arena, m = mid(A); ctx.telegraph(side > 0 ? m : A.left, A.groundY - 12, m - A.left, 12, life, '#ff8c42'); ctx.telegraphLine(dialAt(A).x, dialAt(A).y, side > 0 ? A.right : A.left, A.groundY - 30, life, '#efd27a'); ctx.telegraphLine(dialAt(A).x, dialAt(A).y, m, A.groundY, life, '#efd27a'); }
  function sweep(e, ctx, side, t, span) { var f = clamp(t / span, 0, 1), from = side > 0 ? 0.3 : Math.PI - 0.3; e.vars.loose = { a: from + (Math.PI / 2 - from) * f, len: 210, hot: true }; if (t % 3 === 0) { var A = e.arena, d = dialAt(A), a = e.vars.loose.a, reach = (A.groundY - d.y) / Math.max(0.2, Math.sin(a)); chips(ctx, d.x + Math.cos(a) * reach, A.groundY - 2, 2, 1.8); } }
  function handsAttack(name, both) {
    return {
      name: name, windup: 64, active: both ? 116 : 40, recover: 50, cooldown: 40, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { e.vars.side = ctx.hero.x > mid(e.arena) ? 1 : -1; },
      telling: function (e, ctx, t, w) { var v = e.vars; if (t === 1) { tellHalf(e, ctx, v.side, w); ctx.sfx('select'); } v.loose = { a: v.side > 0 ? 0.3 : Math.PI - 0.3, len: 60 + 150 * clamp(t / (w - 10), 0, 1), hot: false }; if (t % 16 === 0) ctx.sfx('select'); },
      fire: function (e, ctx) { ctx.sfx('handsweep'); ctx.shake(3); },
      during: function (e, ctx, t) {
        var v = e.vars;
        if (t <= 40) sweep(e, ctx, v.side, t, 40);
        else if (t <= 76) { if (t === 41) { tellHalf(e, ctx, -v.side, 36); e.hitHero = false; } v.loose = { a: -v.side > 0 ? 0.3 : Math.PI - 0.3, len: 210, hot: false }; }
        else { if (t === 77) ctx.sfx('handsweep'); sweep(e, ctx, -v.side, t - 76, 40); }
      },
      box: function (e) { return sweepBoxes(e); },
      resting: function (e, ctx, t) { var v = e.vars; if (v.loose) { v.loose.hot = false; v.loose.len = Math.max(27, v.loose.len - 8); if (v.loose.len <= 27) v.loose = null; } },
      end: function (e) { e.vars.loose = null; }
    };
  }
  function drawWeight(p, g, cx, cy) { var x = Math.round(p.x) - cx, y = Math.round(p.y) - cy, k; for (k = p.top - cy; k < y - 6; k += 3) { g.fillStyle = (k & 1) ? '#94784a' : '#574632'; g.fillRect(x, k, 1, 2); } g.drawImage(SPR.weight, x - 3, y - 6); }
  function strikeAttack(name, hours) {
    return {
      name: name, windup: 56, active: hours * 34 + 12, recover: 150, cooldown: 40, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e) { e.vars.mode = 'drawn'; e.vars.struck = 0; },
      telling: function (e, ctx, t) { if (t === 1) ctx.sfx('select'); if (t % 6 === 0) ctx.particle({ x: e.x + (ctx.random() - 0.5) * 20, y: e.y + 12, vx: 0, vy: -0.8, life: 14, max: 14, colour: '#efd27a', size: 1, gravity: 0 }); },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, n = Math.floor((t - 1) / 34), at = (t - 1) % 34;
        if (n >= hours) return;
        if (at === 0) {
          // the bell counts, the hour hand steps on, and the place is marked
          v.struck = n + 1; v.hour += 6.2832 / 12; v.markX = clamp(ctx.hero.x + ctx.hero.vx * 14 + (ctx.random() - 0.5) * 16, A.left + 12, A.right - 12);
          ctx.telegraph(v.markX - 8, A.ceilY, 16, A.groundY - A.ceilY, 30, '#efd27a'); ctx.telegraphCrack(v.markX, A.groundY, 14, 30, '#ff8c42');
          ctx.sfx('bell'); ctx.shake(2); ctx.number(dialAt(A).x, dialAt(A).y - 46, String(n + 1), '#efd27a');
        }
        if (at === 30) ctx.projectile({ x: v.markX, y: A.ceilY + 12, top: A.ceilY + 4, vx: 0, vy: 5, gravity: 0.35, life: 120, colour: '#c9a44c', size: 12, damage: 1, element: 'gear', cause: 'weight', draw: drawWeight, land: function (p) { ctx.shake(4); ctx.sfx('weightfall'); chips(ctx, p.x, A.groundY - 2, 14, 2.6); } });
      },
      // struck: it hangs low and still with its case open
      resting: function (e, ctx, t) { var v = e.vars; v.mode = t < 126 ? 'low' : 'swing'; v.open = t > 8 && t < 126; if (t === 9) { ctx.sfx('door'); ctx.number(e.x, e.y - 24, 'OPEN', '#ffdc9a'); } if (v.open && t % 10 === 0) ctx.particle({ x: e.x + (ctx.random() - 0.5) * 10, y: e.y, vx: (ctx.random() - 0.5) * 0.6, vy: -0.6, life: 20, max: 20, colour: '#ff8c42', size: 1, gravity: -0.01 }); },
      end: function (e) { e.vars.mode = 'swing'; e.vars.open = false; }
    };
  }

  var ATTACKS = {
    // cogs along marked lines; they stay in the stone until the next tick, and come back
    cogs: {
      name: 'cogs', windup: 46, active: 8, recover: 60, cooldown: 50, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e) { e.vars.mode = 'still'; },
      telling: function (e, ctx, t, w) { var hero = ctx.hero, base = Math.atan2(hero.y - 12 - e.y, hero.x - e.x), n = e.phase ? 5 : 3; for (var k = 0; k < n; k++) { var a = base + (k - (n - 1) / 2) * 0.3; ctx.telegraphLine(e.x, e.y, e.x + Math.cos(a) * 240, e.y + Math.sin(a) * 240, 2, k === (n - 1) / 2 ? '#efd27a' : '#94784a'); } if (t === 1) ctx.sfx('select'); },
      fire: function (e, ctx) { throwCogs(e, ctx); },
      end: function (e) { e.vars.mode = 'swing'; }
    },
    hands: handsAttack('hands', false),
    handsBoth: handsAttack('handsBoth', true),
    strike: strikeAttack('strike', 3),
    strikeFive: strikeAttack('strikeFive', 5)
  };
  var SCRIPTS = [['cogs', 'hands', 'strike'], ['handsBoth', 'cogs', 'strikeFive', 'cogs']];

  function think(e, ctx) {
    e.state = 'idle';
    if (e.cooldown > 0 || !ctx.hero.alive) return null;
    var script = SCRIPTS[e.phase], want = script[e.script % script.length];
    e.script++;
    return ATTACKS[want];
  }

  function start(e, arena) { var v = e.vars; v.pivotX = mid(arena); v.phi = 0; v.amp = 0; v.len = 30; v.mode = 'swing'; v.cogs = []; v.loose = null; v.open = false; v.hour = -1.5708; v.minute = 0; v.snapped = false; e.x = v.pivotX; e.y = arena.ceilY + 4 + v.len; }
  function waking(e, ctx, t) { var v = e.vars; v.len = 30 + (92 - 30) * clamp(t / 80, 0, 1); if (t === 84) { ctx.sfx('roar'); ctx.shake(4); } if (t % 20 === 0) ctx.sfx('select'); }

  function always(e, ctx) {
    var v = e.vars, A = e.arena, hero = ctx.hero, k, py = A.ceilY + 4;
    if (e.state === 'wake') { v.amp = 0; } else if (e.stun > 0) v.mode = 'swing';
    // the swing: wide when it is free, stilled to throw, drawn up to strike, hung low after
    var wantAmp = v.mode === 'swing' ? 0.82 : 0, wantLen = v.mode === 'drawn' ? 44 : v.mode === 'low' ? 106 : 92, speed = e.phase ? 0.052 : 0.036;
    if (e.state !== 'wake') v.len += (wantLen - v.len) * 0.06;
    v.amp += (wantAmp - v.amp) * (wantAmp ? 0.02 : 0.08);
    if (v.mode === 'swing' && e.stun <= 0) v.phi += speed;
    var wantPivot = v.mode === 'swing' ? clamp(hero.x, A.left + 96, A.right - 96) : v.mode === 'still' ? v.pivotX : mid(A);
    v.pivotX += clamp(wantPivot - v.pivotX, -0.5, 0.5);
    var th = v.amp * Math.sin(v.phi);
    e.x = v.pivotX + Math.sin(th) * v.len; e.y = py + Math.cos(th) * v.len;
    // the clock keeps time: the minute hand steps once a second
    if (e.clock % 60 === 0) { v.minute += 6.2832 / 60 * 5; if (e.state !== 'wake' && !e.attack) ctx.sfx('tick'); }
    ctx.light(e.x, e.y, 60, 0.85); ctx.light(dialAt(A).x, dialAt(A).y, 50, 0.6);
    if (v.open) ctx.glow(e.x, e.y, 16, '#ff8c42', 0.4);
    // the cogs
    for (k = v.cogs.length - 1; k >= 0; k--) {
      var c = v.cogs[k]; c.t++; if (c.flash > 0) c.flash--;
      if (c.state === 'out') {
        c.x += c.vx; c.y += c.vy;
        if (ctx.tileAt(Math.floor((c.x + c.vx * 2) / 16), Math.floor((c.y + c.vy * 2) / 16)) === 1 || c.t > 140) { c.state = 'stuck'; c.t = 0; chips(ctx, c.x, c.y, 6, 1.6); ctx.sfx('clink'); }
      } else if (c.state === 'stuck') {
        if (c.t === 34) ctx.telegraphLine(c.x, c.y, c.ox, c.oy, 26, '#ff8c42');
        if (c.t >= 60) { var dx = c.ox - c.x, dy = c.oy - c.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy)); c.vx = dx / len * 4.4; c.vy = dy / len * 4.4; c.state = 'back'; c.t = 0; c.left = len; }
      } else { c.x += c.vx; c.y += c.vy; c.left -= 4.4; if (c.left <= 0) { v.cogs.splice(k, 1); continue; } }
      if (c.hp <= 0) { chips(ctx, c.x, c.y, 10, 2); v.cogs.splice(k, 1); continue; }
      if (c.state !== 'stuck') ctx.touch({ x0: c.x - 5, x1: c.x + 5, y0: c.y - 4, y1: c.y + 4 }, 1, 'gear', e, c.x);
    }
  }
  function onPhase(e, ctx) { var v = e.vars; v.loose = null; v.open = false; v.mode = 'swing'; chips(ctx, e.x, e.y, 50, 3.4); ctx.flash('#efd27a', 8); }
  function fall(e) { var v = e.vars; v.cogs = []; v.loose = null; v.open = true; v.snapped = true; v.vy = 0; }
  function dyingStep(e, ctx) {
    var v = e.vars, A = e.arena;
    // the rod parts, and the bob comes down
    v.vy = Math.min(6, (v.vy || 0) + 0.3); if (e.y < A.groundY - 13) e.y += v.vy; else if (!v.landed) { v.landed = true; ctx.shake(6); ctx.sfx('boom'); chips(ctx, e.x, A.groundY - 4, 40, 3.2); }
    if (e.dying % 8 === 0 && e.dying < 60) chips(ctx, e.x, e.y, 8, 2.2);
    if (e.dying === 58) ctx.flash('#efd27a', 8);
  }

  GD.register('regulator', {
    name: 'The Regulator', title: "THE BUILDING'S CLOCK, FROM BEHIND", element: 'gear', flying: true, ownBody: true,
    hp: 260, body: { w: 26, h: 26 }, phases: [0.5], wake: 110, reel: 80,
    rig: buildRig, draw: draw, scenery: scenery, attacks: ATTACKS, think: think, always: always, onPhase: onPhase, fall: fall, waking: waking, start: start, dyingStep: dyingStep,
    tempo: function (e) { return e.phase ? 0.65 : 1; },
    hurtBoxes: function (e) {
      var v = e.vars, boxes = [];
      v.cogs.forEach(function (c) { if (c.state === 'stuck') boxes.push({ x0: c.x - 8, x1: c.x + 8, y0: c.y - 8, y1: c.y + 8, mult: 1, onHit: function (g, ctx) { c.hp = 0; c.flash = 4; ctx.sfx('clink'); return true; } }); });
      boxes.unshift({ x0: e.x - 13, x1: e.x + 13, y0: e.y - 13, y1: e.y + 13, mult: v.open ? 1.5 : 1 });
      return boxes;
    }
  });
})();
