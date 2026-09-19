/* boss-reflected.js: the Reflected, in the Hall of Glass.

   Three tall mirrors stand in the hall, and something made of shards lives
   in them. While a mirror stands it is in all three at once, and only one of
   them is true: the true one carries the glint of your own lantern as it
   winds up. It reaches out of that one and sweeps the floor either side of
   it; afterwards, for a moment, that mirror can be cracked. Three cracks
   break a mirror, and the wrong mirror is only glass. Meanwhile shards hang
   in the vault, turn toward you along marked lines, and fly. When the third
   mirror breaks it has nowhere left to be, and steps out: quick and brittle
   (every blow counts for a quarter more), throwing fans of shards along
   marked lines, and crossing the hall in a cut that leaves a reflection of
   itself behind, which makes the same cut a beat later.

   The figure is drawn in parts; mirrors, cracks, shards and echoes are drawn live. */
(function () {
  'use strict';
  var GD = window.Guardians;
  if (!GD) return;

  var PAL = { k: '#140a12', p: '#d88ab4', q: '#8a4f72', l: '#ffe8f4', w: '#ffffff' };
  var RIG = null, PANE_W = 26, PANE_H = 66;

  var PARTS = {
    head: ['...k...', '..klk..', '.kllpk.', 'kllwppk', 'klwpppk', '.klppk.', '.kpppk.', '..kpk..', '...k...'],
    torso: ['....kkk....', '...klppk...', '..kllpppk..', '.kllwppppk.', 'kllwpppppqk', 'klwppppppqk', '.klpppppqk.', '.klppppqqk.', '..kpppqqk..', '..klppqqk..', '...kppqk...', '...kpqqk...', '....kqk....', '.....k.....'],
    leg: ['kpppk', 'klppk', 'klpqk', '.kpqk', '.kpqk', '.kpqk', '.klqk', '..kqk', '..kqk', '..kqk', '..kpk', '..kpk', '...kk', '...k.', '...k.'],
    blade: ['kk..................', 'klkkkkkkkkkk........', 'kllllllllllwkkkkkkk.', 'kpppppppppkkk.......', 'kkkkkkkkkk..........'],
    bladeUp: ['..k..', '..k..', '.kwk.', '.klk.', '.klk.', '.klk.', '.klk.', '.klk.', 'kllpk', 'kllpk', 'kllpk', 'kllpk', 'kllpk', 'kllpk', 'kllpk', 'kllpk', 'kllpk', 'kllpk', 'kklkk', '.kkk.']
  };
  function buildRig() {
    function pose(bob, l1, l2, arm, ax, ay, lean) { lean = lean || 0; return [['leg', 17 + l1, 41], ['leg', 24 + l2, 41], ['torso', 14 + lean, 28 + bob], ['head', 16 + lean * 2, 19 + bob], [arm, ax, ay + bob]]; }
    RIG = GD.rig(PAL, PARTS, 56, 56, { x: 24, y: 56 }, {
      none: [[]],
      idle: [pose(0, 0, 0, 'blade', 24, 36), pose(1, 0, 0, 'blade', 24, 36)],
      walk: [pose(0, -2, 2, 'blade', 24, 36), pose(1, 0, 0, 'blade', 24, 36), pose(0, 2, -2, 'blade', 24, 36), pose(1, 0, 0, 'blade', 24, 36)],
      windup: [pose(0, -1, 1, 'bladeUp', 12, 12, -1), pose(1, -2, 2, 'bladeUp', 10, 10, -2)],
      attack: [pose(1, 2, -1, 'blade', 30, 33, 2), pose(1, 3, -2, 'blade', 34, 34, 3)],
      cast: [pose(0, 0, 0, 'bladeUp', 27, 6), pose(1, 0, 0, 'bladeUp', 27, 4)],
      reel: [pose(2, -3, 3, 'blade', 22, 40, -2), pose(3, -3, 3, 'blade', 22, 42, -3)],
      wake: [[]],
      death: [pose(2, -3, 3, 'blade', 22, 40, -2), [['leg', 14, 41], ['leg', 27, 41], ['torso', 12, 32], ['head', 8, 30]], [['leg', 12, 41], ['leg', 30, 41], ['torso', 12, 38]], [['leg', 10, 41], ['leg', 32, 41]], [[]][0]]
    });
    return RIG;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function splinter(ctx, x, y, n, speed) { for (var k = 0; k < n; k++) { var a = ctx.random() * 6.2832, s = speed * (0.4 + ctx.random()); ctx.particle({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.8, life: 16 + ctx.random() * 22, max: 38, colour: k % 3 === 0 ? '#ffffff' : k % 3 === 1 ? '#ff9ecb' : '#ffe8f4', size: ctx.random() < 0.3 ? 2 : 1, gravity: 0.1 }); } }
  function standing(v) { return v.panes.filter(function (p) { return !p.broken; }); }
  function truePane(v) { return v.panes[v.trueAt]; }
  function chooseTrue(e, ctx) { var v = e.vars, left = standing(v); if (!left.length) return; var pick = left[Math.floor(ctx.random() * left.length)]; v.trueAt = v.panes.indexOf(pick); e.x = pick.x; }

  /* ---- behind everything: the mirrors and what is in them; then the shards and the echoes ---- */

  function drawShard(pen, x, y, a, len, hot) { pen.save(); pen.translate(x, y); pen.rotate(a); pen.fillStyle = '#140a12'; pen.beginPath(); pen.moveTo(len, 0); pen.lineTo(0, -4); pen.lineTo(-len * 0.6, 0); pen.lineTo(0, 4); pen.fill(); pen.fillStyle = hot ? '#ffffff' : '#ff9ecb'; pen.beginPath(); pen.moveTo(len - 2, 0); pen.lineTo(0, -2.5); pen.lineTo(-len * 0.6 + 2, 0); pen.lineTo(0, 2.5); pen.fill(); pen.fillStyle = '#ffe8f4'; pen.fillRect(-2, -1, Math.round(len * 0.7), 1); pen.restore(); }
  function scenery(e, G) {
    var v = e.vars, A = e.arena, pen = G.pen, gy = A.groundY - G.cy, k;
    v.panes.forEach(function (p, n) {
      var x = Math.round(p.x) - G.cx, x0 = x - PANE_W / 2, y0 = gy - PANE_H;
      // the frame
      pen.fillStyle = '#140a12'; pen.fillRect(x0 - 3, y0 - 4, PANE_W + 6, PANE_H + 4); pen.fillStyle = '#8a7088'; pen.fillRect(x0 - 2, y0 - 3, PANE_W + 4, PANE_H + 3); pen.fillStyle = '#f0d4e6'; pen.fillRect(x0 - 2, y0 - 3, PANE_W + 4, 1);
      if (p.broken) { pen.fillStyle = '#0c070b'; pen.fillRect(x0, y0, PANE_W, PANE_H); pen.fillStyle = '#c46a98'; for (k = 0; k < 6; k++) { var bh = 5 + (k * 7 + n * 3) % 9; pen.beginPath(); pen.moveTo(x0 + k * 4.4, gy); pen.lineTo(x0 + k * 4.4 + 2, gy - bh); pen.lineTo(x0 + k * 4.4 + 4.4, gy); pen.fill(); } return; }
      // the glass, and what stands in it
      var g = pen.createLinearGradient(x0, y0, x0 + PANE_W, gy); g.addColorStop(0, '#4a3550'); g.addColorStop(0.5, '#2a1f30'); g.addColorStop(1, '#3d2c44'); pen.fillStyle = g; pen.fillRect(x0, y0, PANE_W, PANE_H);
      if (!v.out && RIG) {
        var set = e.dir >= 0 ? RIG.frames : RIG.flipped, name = v.show || 'idle', frames = set[name] || set.idle, img = frames[Math.min(v.showFrame || 0, frames.length - 1)];
        pen.save(); pen.beginPath(); pen.rect(x0, y0, PANE_W, PANE_H); pen.clip(); pen.globalAlpha = 0.85; pen.drawImage(img, x - (e.dir >= 0 ? 24 : 32), gy - 56 + 2); pen.restore(); pen.globalAlpha = 1;
      }
      pen.globalAlpha = 0.18; pen.fillStyle = '#ffe8f4'; pen.beginPath(); pen.moveTo(x0 + 3, y0); pen.lineTo(x0 + 9, y0); pen.lineTo(x0 + 1, gy - 20); pen.lineTo(x0, gy - 20); pen.fill(); pen.globalAlpha = 1;
      // the cracks it has taken
      pen.strokeStyle = '#ffe8f4'; pen.lineWidth = 1;
      for (k = 0; k < p.cracks; k++) { var sx = x + [-4, 5, -1][k], sy = y0 + [20, 34, 48][k]; pen.beginPath(); pen.moveTo(sx, sy); pen.lineTo(sx - 9, sy - 8 - k); pen.moveTo(sx, sy); pen.lineTo(sx + 10, sy - 5); pen.moveTo(sx, sy); pen.lineTo(sx + 4, sy + 11); pen.moveTo(sx, sy); pen.lineTo(sx - 7, sy + 8); pen.stroke(); }
      if (p.flash > 0) { pen.globalAlpha = p.flash / 8; pen.fillStyle = '#ffffff'; pen.fillRect(x0, y0, PANE_W, PANE_H); pen.globalAlpha = 1; }
      // the true one carries the lantern's glint while it winds up
      if (!v.out && n === v.trueAt && v.glint > 0) { var gt = (G.tick % 40) / 40, gx = Math.round(x0 + 4 + gt * (PANE_W - 8)), gyy = Math.round(y0 + 8 + gt * 22), r = 3 + Math.round(Math.sin(gt * Math.PI) * 3); pen.fillStyle = '#ffdc9a'; pen.fillRect(gx - r, gyy, r * 2 + 1, 1); pen.fillRect(gx, gyy - r, 1, r * 2 + 1); pen.fillStyle = '#ffffff'; pen.fillRect(gx - 1, gyy - 1, 3, 3); }
    });
    // the arm out of the glass
    if (v.reach > 0 && !v.out) { var tp = truePane(v), ax = Math.round(tp.x) - G.cx, len = Math.round(46 * Math.min(1, v.reach)); for (k = -1; k <= 1; k += 2) drawShard(pen, ax + k * 8, gy - 18, k > 0 ? 0 : Math.PI, len, true); }
    v.shards.forEach(function (s) { drawShard(pen, Math.round(s.x) - G.cx, Math.round(s.y) - G.cy, s.a, 9, s.state === 'fly'); });
    // a reflection left behind, waiting to make the same cut
    v.echoes.forEach(function (o) { if (!RIG) return; var set = o.dir >= 0 ? RIG.frames : RIG.flipped, img = set[o.t < o.at ? 'windup' : 'attack'][1]; pen.globalAlpha = o.t < o.at ? 0.35 + 0.25 * Math.sin(o.t * 0.6) : 0.7; pen.drawImage(img, Math.round(o.x) - (o.dir >= 0 ? 24 : 32) - G.cx, Math.round(o.y) - 56 - G.cy); pen.globalAlpha = 1; });
  }

  /* ---- what it does ---- */

  function hang(e, ctx, n) {
    var v = e.vars, A = e.arena, hero = ctx.hero;
    for (var k = 0; k < n; k++) { var x = clamp(hero.x + (k - (n - 1) / 2) * 44 + (ctx.random() - 0.5) * 20, A.left + 14, A.right - 14); v.shards.push({ x: x, y: A.ceilY + 14 + (k % 2) * 10, a: Math.PI / 2, t: -k * 12, state: 'hang' }); }
  }
  var ATTACKS = {
    // in the mirrors: it is in all of them, it reaches out of the true one, and then that one can be cracked
    reach: {
      name: 'reach', windup: 56, active: 16, recover: 96, cooldown: 30, keepFacing: true, anims: { windup: 'none', attack: 'none' },
      start: function (e, ctx) { chooseTrue(e, ctx); e.dir = ctx.hero.x > e.x ? 1 : -1; },
      telling: function (e, ctx, t, w) { var v = e.vars; v.show = 'windup'; v.showFrame = t > w / 2 ? 1 : 0; v.glint = 2; if (t === 1) ctx.sfx('select'); if (t === w - 22) { var A = e.arena; v.panes.forEach(function (p) { if (!p.broken) ctx.telegraph(p.x - 46, A.groundY - 30, 92, 30, 22, '#ff9ecb'); }); } },
      fire: function (e, ctx) { ctx.sfx('icicle'); ctx.shake(3); splinter(ctx, e.x, e.y - 18, 14, 2.6); },
      during: function (e, ctx, t) { var v = e.vars; v.show = 'attack'; v.showFrame = 1; v.reach = Math.min(1, t / 5); },
      box: function (e) { var A = e.arena; return [{ x0: e.x - 46, x1: e.x + 46, y0: A.groundY - 30, y1: A.groundY, damage: 1, element: 'glass' }]; },
      resting: function (e, ctx, t) { var v = e.vars; v.reach = Math.max(0, 1 - t / 8); v.show = t < 70 ? 'attack' : 'idle'; v.showFrame = 0; v.exposed = t < 84; if (t === 1) ctx.number(e.x, e.y - PANE_H - 10, 'IT IS HERE', '#ffe8f4'); if (v.exposed && t % 8 === 0) ctx.particle({ x: e.x + (ctx.random() - 0.5) * 20, y: e.y - 10 - ctx.random() * 40, vx: 0, vy: -0.3, life: 16, max: 16, colour: '#ffe8f4', size: 1, gravity: 0 }); },
      end: function (e) { var v = e.vars; v.exposed = false; v.reach = 0; v.show = 'idle'; }
    },
    // shards hung in the vault: each turns toward her along a marked line, and goes
    shards: {
      name: 'shards', windup: 30, active: 20, recover: 70, cooldown: 40, keepFacing: true, anims: { windup: 'cast', attack: 'cast' },
      telling: function (e, ctx, t) { if (!e.vars.out) { e.anim = 'none'; e.vars.show = 'windup'; e.vars.showFrame = 0; } if (t === 1) ctx.sfx('select'); },
      fire: function (e, ctx) { hang(e, ctx, e.phase ? 5 : 4); ctx.sfx('castfrost'); },
      during: function (e) { if (!e.vars.out) e.anim = 'none'; },
      resting: function (e) { if (!e.vars.out) { e.anim = 'none'; e.vars.show = 'idle'; } }
    },
    // out of the glass: five shards in a fan along marked lines
    fan: {
      name: 'fan', windup: 40, active: 8, recover: 70, cooldown: 64, anims: { windup: 'windup', attack: 'attack' },
      start: function (e, ctx) { e.vars.aim = Math.atan2(ctx.hero.y - 14 - (e.y - 24), ctx.hero.x - e.x); },
      telling: function (e, ctx, t, w) { e.vx = 0; var v = e.vars; if (t < w - 14) v.aim = Math.atan2(ctx.hero.y - 14 - (e.y - 24), ctx.hero.x - e.x); for (var k = -2; k <= 2; k++) ctx.telegraphLine(e.x, e.y - 24, e.x + Math.cos(v.aim + k * 0.22) * 200, e.y - 24 + Math.sin(v.aim + k * 0.22) * 200, 2, k ? '#c46a98' : '#ff9ecb'); if (t === 1) ctx.sfx('select'); },
      fire: function (e, ctx) { var v = e.vars; for (var k = -2; k <= 2; k++) v.shards.push({ x: e.x + e.dir * 10, y: e.y - 24, a: v.aim + k * 0.22, t: 0, state: 'fly' }); ctx.sfx('icicle'); }
    },
    // a cut across the hall; and where it began, a reflection that will make the same cut
    cut: {
      name: 'cut', windup: 40, active: 22, recover: 84, cooldown: 64, moves: true, anims: { windup: 'windup', attack: 'attack' },
      telling: function (e, ctx, t, w) { e.vx = 0; if (t === 1) { var A = e.arena, far = e.dir > 0 ? Math.min(A.right - 8, e.x + 176) : Math.max(A.left + 8, e.x - 176); ctx.telegraph(Math.min(e.x, far), e.y - 26, Math.abs(far - e.x), 14, w, '#ff9ecb'); ctx.sfx('select'); } },
      fire: function (e, ctx) { var v = e.vars; v.echoes.push({ x: e.x, y: e.y, dir: e.dir, t: 0, at: 34, hit: false }); e.vx = e.dir * 8; ctx.sfx('dash'); },
      during: function (e, ctx, t) { e.vx = e.dir * 8 * Math.max(0.2, 1 - t / 26); if (t % 2 === 0) splinter(ctx, e.x - e.dir * 10, e.y - 16, 1, 1.2); },
      box: function (e) { var b = GD.front(e, -6, 30, 30, 0); b.damage = 1; b.element = 'glass'; return [b]; },
      resting: function (e) { e.vx *= 0.7; }
    }
  };
  var SCRIPTS = [['reach', 'shards', 'reach', 'reach', 'shards'], ['cut', 'fan', 'shards', 'cut', 'cut', 'fan']];

  function think(e, ctx) {
    var v = e.vars, hero = ctx.hero;
    e.state = 'idle';
    if (!v.out) { e.anim = 'none'; e.vx = 0; v.show = 'idle'; v.showFrame = (e.clock >> 4) % 2; }
    else {
      e.dir = hero.x > e.x ? 1 : -1;
      if (Math.abs(hero.x - e.x) > 64) { e.vx = e.dir * 1.15; e.anim = 'walk'; e.frame = (e.clock >> 3) % 4; } else { e.vx = 0; e.anim = 'idle'; e.frame = (e.clock >> 4) % 2; }
    }
    if (e.cooldown > 0 || !hero.alive) return null;
    var script = SCRIPTS[v.out ? 1 : 0], want = script[e.script % script.length];
    e.script++; e.vx = 0;
    return ATTACKS[want];
  }

  function start(e, arena) {
    var v = e.vars, m = (arena.left + arena.right) / 2;
    v.panes = [-128, 0, 128].map(function (dx) { return { x: m + dx, cracks: 0, broken: false, flash: 0 }; });
    v.trueAt = 1; v.out = false; v.shards = []; v.echoes = []; v.reach = 0; v.glint = 0; v.exposed = false; v.show = 'idle'; v.showFrame = 0; v.crackCd = 0; v.told = 0;
    e.x = m; e.y = arena.groundY;
  }
  function waking(e, ctx, t) { var v = e.vars; e.anim = 'none'; if (t === 30 || t === 50 || t === 70) { var p = v.panes[(t - 30) / 20]; p.flash = 8; ctx.sfx('clink'); } if (t === 90) { ctx.sfx('roar'); ctx.shake(3); } }

  function crack(e, ctx, p, damage) {
    var v = e.vars, A = e.arena;
    if (v.crackCd > 0) return false;
    v.crackCd = 26; p.cracks = Math.min(3, p.cracks + (damage >= 8 ? 2 : 1)); p.flash = 8;
    ctx.sfx('crack'); ctx.shake(3); splinter(ctx, p.x, A.groundY - 34, 12, 2.4);
    var total = 0; v.panes.forEach(function (q) { total += q.cracks; });
    e.hp = Math.min(e.hp, e.maxHp - Math.round(total * e.maxHp * 0.5 / 9) - (total >= 9 ? 1 : 0)); e.flash = 4;
    ctx.number(p.x, A.groundY - PANE_H - 10, p.cracks >= 3 ? 'BROKEN' : p.cracks + ' OF 3', '#ffe8f4');
    if (p.cracks >= 3) {
      p.broken = true; ctx.sfx('glassbreak'); ctx.shake(7); ctx.flash('#ffe8f4', 6); splinter(ctx, p.x, A.groundY - 34, 60, 3.6);
      if (e.attack && e.attack.def.end) e.attack.def.end(e, ctx); e.attack = null; e.boxes = []; e.cooldown = 50; v.exposed = false; v.reach = 0;
      if (standing(v).length) chooseTrue(e, ctx);
    }
    return true;
  }

  function always(e, ctx) {
    var v = e.vars, A = e.arena, hero = ctx.hero, k;
    if (v.glint > 0) v.glint--; if (v.crackCd > 0) v.crackCd--; if (v.told > 0) v.told--;
    v.panes.forEach(function (p) { if (p.flash > 0) p.flash--; if (!p.broken) ctx.light(p.x, A.groundY - 36, 46, 0.7); });
    // while a mirror stands nothing else can end it
    if (!v.out && e.state !== 'wake') { e.anim = 'none'; if (standing(v).length && e.hp <= e.maxHp * 0.5 + 1) e.hp = Math.floor(e.maxHp * 0.5) + 2; }
    if (v.out) ctx.light(e.x, e.y - 24, 56, 0.85);
    for (k = v.shards.length - 1; k >= 0; k--) {
      var s = v.shards[k]; s.t++;
      if (s.state === 'hang') {
        if (s.t < 0) continue;
        var want = Math.atan2(hero.y - 12 - s.y, hero.x - s.x); if (s.t < 30) { var d = want - s.a; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; s.a += clamp(d, -0.12, 0.12); }
        ctx.telegraphLine(s.x, s.y, s.x + Math.cos(s.a) * 220, s.y + Math.sin(s.a) * 220, 2, s.t < 30 ? '#c46a98' : '#ff9ecb');
        if (s.t >= 44) { s.state = 'fly'; ctx.sfx('shardfly'); }
        continue;
      }
      s.x += Math.cos(s.a) * 5.2; s.y += Math.sin(s.a) * 5.2;
      if (ctx.touch({ x0: s.x - 4, x1: s.x + 4, y0: s.y - 3, y1: s.y + 3 }, 1, 'glass', e, s.x)) s.dead = true;
      if (s.dead || s.t > 200 || ctx.tileAt(Math.floor(s.x / 16), Math.floor(s.y / 16)) === 1) { splinter(ctx, s.x, s.y, 6, 1.8); v.shards.splice(k, 1); }
    }
    for (k = v.echoes.length - 1; k >= 0; k--) {
      var o = v.echoes[k]; o.t++;
      if (o.t === o.at - 20) ctx.telegraph(o.dir > 0 ? o.x : o.x - 176, o.y - 26, 176, 14, 20, '#ffe8f4');
      if (o.t >= o.at) { o.x += o.dir * 8 * Math.max(0.2, 1 - (o.t - o.at) / 26); if (!o.hit && ctx.touch({ x0: o.x + o.dir * 12 - 14, x1: o.x + o.dir * 12 + 14, y0: o.y - 30, y1: o.y }, 1, 'glass', e, o.x)) o.hit = true; }
      if (o.t > o.at + 22) { splinter(ctx, o.x, o.y - 20, 14, 2); v.echoes.splice(k, 1); }
    }
  }
  // the last mirror is gone: it has nowhere left to be
  function onPhase(e, ctx) { var v = e.vars, A = e.arena; v.panes.forEach(function (p) { if (!p.broken) { p.broken = true; splinter(ctx, p.x, A.groundY - 34, 40, 3); } }); v.out = true; v.exposed = false; v.reach = 0; e.y = A.groundY; e.anim = 'reel'; splinter(ctx, e.x, e.y - 24, 50, 3.6); ctx.flash('#ff9ecb', 8); ctx.number(e.x, e.y - 60, 'NOWHERE LEFT TO BE', '#ffe8f4'); }
  function fall(e) { e.vars.shards = []; e.vars.echoes = []; }
  function dyingStep(e, ctx) { if (e.dying % 7 === 0 && e.dying < 60) { splinter(ctx, e.x + (ctx.random() - 0.5) * 20, e.y - ctx.random() * 40, 10, 2.4); ctx.sfx('clink'); } if (e.dying === 58) { ctx.sfx('shatter'); ctx.flash('#ffe8f4', 8); splinter(ctx, e.x, e.y - 20, 70, 4); } }

  GD.register('reflected', {
    name: 'The Reflected', title: 'IN THE HALL OF GLASS, IN ALL OF IT', element: 'glass', flying: false,
    hp: 300, body: { w: 14, h: 38 }, phases: [0.5], wake: 110, reel: 80,
    rig: buildRig, scenery: scenery, attacks: ATTACKS, think: think, always: always, onPhase: onPhase, fall: fall, waking: waking, start: start, dyingStep: dyingStep,
    tempo: function () { return 1; },
    hurtBoxes: function (e) {
      var v = e.vars, A = e.arena;
      if (v.out) return [{ x0: e.x - 8, x1: e.x + 8, y0: e.y - 40, y1: e.y, mult: 1.25 }];
      return standing(v).map(function (p) {
        var n = v.panes.indexOf(p);
        return { x0: p.x - PANE_W / 2, x1: p.x + PANE_W / 2, y0: A.groundY - PANE_H, y1: A.groundY, mult: 1, onHit: function (g, ctx, damage) {
          if (n === v.trueAt && v.exposed) return crack(g, ctx, p, damage);
          p.flash = 4; ctx.sfx('mirror'); ctx.spark(p.x, A.groundY - 30, '#ffffff', 5, 1.6, 10, 0.03);
          if (!(v.told > 0)) { ctx.number(p.x, A.groundY - PANE_H - 10, n === v.trueAt ? 'NOT YET' : 'ONLY GLASS', '#c4c1ba'); v.told = 90; }
          return false;
        } };
      });
    }
  });
})();
