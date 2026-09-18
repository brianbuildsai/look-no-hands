/* actors-deep.js: what lives on the three newer floors.

   Six creatures, two to an element, written against actors.js exactly as
   its own ten are: a rig of parts placed by poses, a box that stops at
   walls, a box that can be struck, and attacks that tell before they strike.
   They are added to Actors.KINDS before the engine compiles the sprites.

     tide   the Diver (a drowned suit with a harpoon) and the Angler (a lure in the dark)
     gear   the Winder (a wind-up knight that runs down) and the Governor (it throws a cog that comes back)
     glass  the Reflection (it turns what is thrown) and the Prism (its beam splits in three) */
(function () {
  'use strict';
  var AC = window.Actors;
  if (!AC || !AC.kit) return;
  var KINDS = AC.KINDS, BY_ELEMENT = AC.BY_ELEMENT, rig = AC.kit.rig, front = AC.kit.front, turnToward = AC.kit.turnToward, groundBelow = AC.kit.groundBelow;

  /* ---- tide ---- */

  /* The Diver: a brass helmet, a canvas suit, lead boots, and nobody inside. It plants its feet, fires a harpoon
     on a chain along a marked line, and hauls itself to wherever it stuck. */
  function diverRig() {
    var P = {
      helmet: ['..kkkkkkk..', '.krRRRRRrk.', 'krRkkkkkRrk', 'krkllwllkrk', 'krklwwllkrk', 'krklllllkrk', 'krRkkkkkRrk', '.krrrrrrrk.', 'kGGGGGGGGGk', '.kkkkkkkkk.'],
      body: ['.kkkkkkkkk.', 'kppppppppqk', 'kpprRRrppqk', 'kpprRRrppqk', 'kppppppppqk', 'kGGGGGGGGGk', 'kqppppppqqk', '.kqppppqqk.', '..kkkkkkk..'],
      leg: ['kpk.', 'kpk.', 'kqk.', 'kGGk', 'kGGk', 'kkkk'],
      arm: ['kpk', 'kpk', 'kqk', 'kpk', 'kRk', 'kkk'],
      gun: ['.kkkkkkk...', 'kgggggggwwW', 'kgkkkkkk...', 'kk.........'],
      gunEmpty: ['.kkkkkkk...', 'kgggggggk..', 'kgkkkkkk...', 'kk.........'],
      hose: ['.q', 'q.', 'q.', '.q', '.q', 'q.', 'q.', '.q']
    };
    var walk = [], k;
    for (k = 0; k < 4; k++) {
      var bob = k % 2 ? 1 : 0, a = [1, 0, -1, 0][k], l1 = [0, 1, 0, 0][k], l2 = [0, 0, 0, 1][k];
      walk.push([['hose', 9 + (k % 2), 2 + bob], ['leg', 12 - a, 28 - l2], ['body', 11, 19 + bob], ['leg', 18 + a, 28 - l1], ['helmet', 11, 9 + bob], ['arm', 15, 21 + bob], ['gun', 17, 23 + bob]]);
    }
    return rig('tide', P, 36, 34, { x: 17, y: 34 }, {
      walk: walk,
      windup: [
        [['hose', 9, 2], ['leg', 11, 28], ['body', 11, 19], ['leg', 19, 28], ['helmet', 11, 9], ['arm', 15, 19], ['gun', 17, 20]],
        [['hose', 8, 3], ['leg', 10, 28], ['body', 10, 19], ['leg', 19, 28], ['helmet', 10, 9], ['arm', 14, 18], ['gun', 16, 18]]
      ],
      attack: [
        [['hose', 7, 3], ['leg', 10, 28], ['body', 9, 19], ['leg', 19, 28], ['helmet', 8, 10], ['arm', 13, 18], ['gunEmpty', 14, 18]],
        [['hose', 8, 3], ['leg', 10, 28], ['body', 10, 19], ['leg', 19, 28], ['helmet', 10, 9], ['arm', 14, 18], ['gunEmpty', 16, 18]]
      ],
      // hauled along its own chain: leaning into it, boots dragging
      haul: [
        [['hose', 6, 4], ['leg', 9, 28], ['body', 12, 20], ['leg', 14, 28], ['helmet', 14, 11], ['arm', 17, 19], ['gunEmpty', 19, 19]],
        [['hose', 7, 4], ['leg', 10, 28], ['body', 12, 19], ['leg', 15, 28], ['helmet', 14, 10], ['arm', 17, 18], ['gunEmpty', 19, 18]]
      ],
      hurt: [[['hose', 11, 2], ['leg', 13, 28], ['body', 10, 19], ['leg', 17, 28], ['helmet', 9, 8], ['arm', 14, 17], ['gun', 15, 17]]]
    });
  }
  function lineTo(e, ctx, max) { for (var len = 12; len < max; len += 8) if (ctx.tileAt(Math.floor((e.x + e.dir * len) / 16), Math.floor((e.y - 15) / 16)) === 1) break; return len; }
  KINDS.diver = { element: 'tide', flying: false, body: { w: 12, h: 22 }, hurt: { w: 15, h: 26 }, hp: 13, speed: 0.28, sight: 170, move: 'walk', keep: 60, rig: diverRig,
    attacks: [{ name: 'harpoon', range: [40, 150], above: 22, below: 22, windup: 46, active: 56, recover: 36, cooldown: 120, grounded: true, moves: true,
      start: function (e, ctx) { e.vars.len = lineTo(e, ctx, 168); e.vars.stuck = false; },
      telling: function (e, ctx, t, w) { if (t === 1) ctx.telegraph(e.dir > 0 ? e.x + 10 : e.x - 10 - e.vars.len, e.y - 18, e.vars.len, 6, w, '#5fd4c4'); e.vx = 0; },
      fire: function (e, ctx) { ctx.sfx('shot'); ctx.spark(e.x + e.dir * 18, e.y - 15, '#d6fff8', 8, 1.6, 10, 0); e.vars.tipX = e.x + e.dir * 14; e.vars.anchorX = e.x + e.dir * (e.vars.len + 4); },
      box: function (e, t, ctx) {
        var v = e.vars, out = [];
        if (!v.stuck) {
          v.tipX += e.dir * 12;
          if ((v.anchorX - v.tipX) * e.dir <= 0) { v.tipX = v.anchorX; v.stuck = true; ctx.spark(v.tipX, e.y - 15, '#ffffff', 10, 1.8, 12, 0.04); ctx.shake(1.5); ctx.sfx('clink'); }
          out.push({ x0: Math.min(e.x, v.tipX) - 2, x1: Math.max(e.x, v.tipX) + 2, y0: e.y - 19, y1: e.y - 12 });
        } else if (Math.abs(v.anchorX - e.x) > 22) {
          e.vx = e.dir * 2.7; e.anim = 'haul'; e.frame = (t >> 3) % 2;
          if (t % 3 === 0) ctx.particle({ x: e.x - e.dir * 6, y: e.y - 1, vx: -e.dir * 0.6, vy: -0.5, life: 12, max: 12, colour: '#9ff5e6', size: 1, gravity: 0.05 });
          out.push(front(e, 0, 13, 24, 0));
        } else e.vx *= 0.6;
        return out;
      },
      during: function (e, ctx) { ctx.chain(e.x + e.dir * 12, e.y - 15, e.vars.tipX, e.y - 15, '#9ff5e6'); if (e.vars.stuck) ctx.light(e.vars.tipX, e.y - 15, 12, 0.6); },
      resting: function (e) { e.vx *= 0.7; } }] };

  /* The Angler: a deep fish that swims the air. In the dark of the Stacks its lure is all you see of it, until the lure goes out. */
  function anglerRig() {
    var P = {
      body: ['....kkkkkkk.....', '..kkqqqqqqqkk...', '.kqqpppppppqqk..', 'kqpppppppppepqk.', 'kqppppppppppppqk', 'kqpppppkwkwkwkwk', 'kqppppk.........', 'kqpppppkwkwkwkwk', 'kqqppppppppppqk.', '.kqqppppppppqk..', '..kkqqqqqqqkk...', '....kkkkkkk.....'],
      bodyBite: ['....kkkkkkk.....', '..kkqqqqqqqkk...', '.kqqpppppppqqk..', 'kqpppppppppwpqk.', 'kqppppppppppppqk', 'kqpppppkwkwkwkwk', 'kqpppppkkwkwkwkk', 'kqqppppppppppqk.', '.kqqppppppppqk..', '..kkqqqqqqqkk...', '....kkkkkkk.....'],
      bodyWide: ['....kkkkkkk.....', '..kkqqqqqqqkk...', '.kqqpppppppqqk..', 'kqpppppppppwpqk.', 'kqpppppkwkwkwkwk', 'kqppppk.........', 'kqpppk..........', 'kqppppk.........', 'kqpppppkwkwkwkwk', 'kqqppppppppppqk.', '.kqqppppppppqk..', '..kkqqqqqqqkk...', '....kkkkkkk.....'],
      tail: ['...kk.', '..kqk.', 'kkqqk.', 'kqqpkk', 'kqqpkk', 'kkqqk.', '..kqk.', '...kk.'],
      fin: ['.kk.', 'kqqk', 'kqk.', 'kk..'],
      stalk: ['..lll..', '.l...l.', 'l.....l', 'l......'],
      lure: ['.w.', 'wWw', '.w.'],
      lureOut: ['.q.', 'qkq', '.q.']
    };
    var walk = [], k;
    for (k = 0; k < 4; k++) { var bob = k % 2 ? 1 : 0, wag = [0, 1, 0, -1][k]; walk.push([['tail', 2, 10 + wag], ['body', 7, 8 + bob], ['fin', 13, 19 + bob], ['stalk', 19, 3 + bob], ['lure', 24, 6 + bob + (k === 2 ? 1 : 0)]]); }
    return rig('tide', P, 36, 28, { x: 17, y: 14 }, {
      walk: walk,
      windup: [
        [['tail', 2, 10], ['body', 7, 8], ['fin', 13, 19], ['stalk', 19, 3], ['lureOut', 24, 6]],
        [['tail', 1, 9], ['bodyWide', 6, 7], ['fin', 12, 20], ['stalk', 18, 2], ['lureOut', 23, 5]]
      ],
      attack: [
        [['tail', 0, 11], ['bodyWide', 8, 7], ['fin', 14, 20], ['stalk', 20, 2], ['lureOut', 25, 5]],
        [['tail', 1, 10], ['bodyBite', 9, 8], ['fin', 15, 19], ['stalk', 21, 3], ['lureOut', 26, 6]],
        [['tail', 2, 10], ['bodyBite', 8, 8], ['fin', 14, 19], ['stalk', 20, 3], ['lure', 25, 6]]
      ],
      hurt: [[['tail', 3, 8], ['bodyBite', 7, 9], ['fin', 13, 19], ['stalk', 19, 4], ['lureOut', 24, 7]]]
    });
  }
  KINDS.angler = { element: 'tide', flying: true, body: { w: 12, h: 10 }, hurt: { w: 18, h: 13 }, hp: 8, speed: 0.55, sight: 170, move: 'hover', stand: 70, height: 26, rig: anglerRig,
    attacks: [{ name: 'bite', range: [28, 130], above: 60, below: 70, windup: 48, active: 22, recover: 44, cooldown: 130, moves: true,
      start: function (e, ctx) { e.vars.angle = Math.atan2(ctx.hero.y - 11 - e.y, ctx.hero.x - e.x); ctx.sfx('select'); },
      telling: function (e, ctx, t, w) {
        if (t < w - 14) e.vars.angle = turnToward(e.vars.angle, Math.atan2(ctx.hero.y - 11 - e.y, ctx.hero.x - e.x), 0.05);
        e.vx *= 0.85; e.vy *= 0.85;
        ctx.telegraphLine(e.x, e.y, e.x + Math.cos(e.vars.angle) * 118, e.y + Math.sin(e.vars.angle) * 118, 2, '#5fd4c4');
      },
      fire: function (e, ctx) { e.vx = Math.cos(e.vars.angle) * 5.2; e.vy = Math.sin(e.vars.angle) * 5.2; e.dir = e.vx >= 0 ? 1 : -1; ctx.sfx('dash'); },
      box: function (e) { return [{ x0: e.x - 9 * e.size, x1: e.x + 9 * e.size, y0: e.y - 7 * e.size, y1: e.y + 7 * e.size }]; },
      during: function (e, ctx, t) { if (t % 2 === 0) ctx.particle({ x: e.x - e.vx, y: e.y + (ctx.random() - 0.5) * 8, vx: 0, vy: -0.2, life: 14, max: 14, colour: '#9ff5e6', size: 1, gravity: -0.01 }); },
      resting: function (e) { e.vx *= 0.88; e.vy *= 0.88; } }],
    // the lure: a small light that goes wherever it goes, and goes out when it means to bite
    always: function (e, ctx) { if (e.dying || e.attack && e.attack.phase !== 'recover') return; var lx = e.x + e.dir * 9 * e.size, ly = e.y - 7 * e.size + Math.sin(e.clock * 0.08) * 1.5; ctx.light(lx, ly, 20, 0.95); ctx.glow(lx, ly, 9, '#9ff5e6', 0.55); } };

  BY_ELEMENT.tide = ['diver', 'angler'];
  /* ---- gear ---- */

  /* The Winder: a wind-up knight with a key in its back. Three spinning turns toward you, and then it has run
     down: it stands slumped and soft until the key has turned itself round again. */
  function winderRig() {
    var P = {
      head: ['..kkkkk..', '.kpppppk.', 'kpppppplk', 'kpkkkkkpk', 'kpkwwwkpk', 'kpppppplk', '.kqqqqqk.', '..kkkkk..'],
      headBack: ['..kkkkk..', '.kpppppk.', 'kqppppppk', 'kqppppppk', 'kqppppppk', 'kqppppppk', '.kqqqqqk.', '..kkkkk..'],
      headDim: ['..kkkkk..', '.kpppppk.', 'kpppppplk', 'kpkkkkkpk', 'kpkqqqkpk', 'kpppppplk', '.kqqqqqk.', '..kkkkk..'],
      body: ['.kkkkkkkkk.', 'kplpppppplk', 'kppppppppqk', 'kpprrrrppqk', 'kppppppppqk', 'kplpppppplk', 'kqppppppqqk', '.kqqqqqqqk.', '..kkkkkkk..'],
      keyA: ['RR...RR', 'R.R.R.R', 'RR.R.RR', '...r...', '...r...', '...r...'],
      keyB: ['...R...', '...R...', '...R...', '...r...', '...r...', '...r...'],
      leg: ['kpk.', 'kpk.', 'kqk.', 'kpk.', 'kppk', 'kkkk'],
      blade: ['kpk.........', 'kpkgwwwwwwwW', 'kkk.........'],
      bladeUp: ['.W.', '.w.', '.w.', '.w.', '.w.', '.w.', '.w.', '.w.', '.g.', 'kpk', 'kpk', 'kkk'],
      bladeDown: ['kpk', 'kpk', 'kkk', '.g.', '.w.', '.w.', '.w.', '.w.', '.W.']
    };
    var walk = [], k;
    for (k = 0; k < 4; k++) {
      var bob = k % 2 ? 1 : 0, a = [1, 0, -1, 0][k], l1 = [0, 1, 0, 0][k], l2 = [0, 0, 0, 1][k];
      walk.push([[k % 2 ? 'keyB' : 'keyA', 9, 13 + bob], ['leg', 15 - a, 28 - l2], ['body', 14, 19 + bob], ['leg', 21 + a, 28 - l1], ['head', 15, 11 + bob], ['blade', 23, 22 + bob]]);
    }
    function turn(n) { var right = n % 2 === 0; return [[n % 2 ? 'keyB' : 'keyA', right ? 9 : 24, 13], ['leg', 16, 28], ['body', 14, 19], ['leg', 20, 28], [right ? 'head' : 'headBack', 15, 11], ['blade', right ? 24 : 4, 21, right ? null : { flip: true }]]; }
    return rig('gear', P, 40, 34, { x: 20, y: 34 }, {
      walk: walk,
      windup: [
        [['keyA', 9, 13], ['leg', 14, 28], ['body', 14, 19], ['leg', 22, 28], ['head', 15, 11], ['bladeUp', 26, 9]],
        [['keyB', 9, 12], ['leg', 13, 28], ['body', 14, 18], ['leg', 23, 28], ['head', 15, 10], ['bladeUp', 27, 7]]
      ],
      attack: [turn(0), turn(1), turn(2), turn(3)],
      spin: [turn(0), turn(1), turn(2), turn(3)],
      slump: [[['keyB', 9, 15], ['leg', 15, 28], ['body', 14, 20], ['leg', 21, 28], ['headDim', 17, 14], ['bladeDown', 26, 22]]],
      rewind: [
        [['keyA', 9, 15], ['leg', 15, 28], ['body', 14, 20], ['leg', 21, 28], ['headDim', 17, 14], ['bladeDown', 26, 22]],
        [['keyB', 9, 15], ['leg', 15, 28], ['body', 14, 20], ['leg', 21, 28], ['headDim', 17, 13], ['bladeDown', 26, 22]]
      ],
      hurt: [[['keyB', 8, 14], ['leg', 16, 28], ['body', 13, 19], ['leg', 20, 28], ['head', 13, 10], ['bladeUp', 25, 10]]]
    });
  }
  KINDS.winder = { element: 'gear', flying: false, body: { w: 12, h: 22 }, hurt: { w: 15, h: 24 }, hp: 14, speed: 0.4, sight: 150, move: 'walk', keep: 26, rig: winderRig,
    // run down, it is soft
    boxes: function (e, w, h) { var soft = e.attack && e.attack.phase === 'recover'; return [{ x0: e.x - w / 2, x1: e.x + w / 2, y0: e.y - h, y1: e.y, mult: soft ? 1.5 : 1 }]; },
    attacks: [{ name: 'spin', range: [0, 66], windup: 34, active: 84, recover: 110, cooldown: 30, grounded: true, steady: true, moves: true, anims: { attack: 'spin' },
      telling: function (e, ctx, t) { e.vx = 0; if (t % 6 === 0) ctx.spark(e.x - e.dir * 9, e.y - 22, '#efd27a', 2, 1, 10, 0); if (t % 8 === 0) ctx.sfx('select'); },
      box: function (e) { return [{ x0: e.x - 25 * e.size, x1: e.x + 25 * e.size, y0: e.y - 17 * e.size, y1: e.y - 8 * e.size }]; },
      during: function (e, ctx, t) {
        if (t % 28 === 1) { e.dir = ctx.hero.x > e.x ? 1 : -1; e.vx = e.dir * 1.5; e.hitHero = false; ctx.sfx('swing'); }
        if (e.onGround && AC.kit.edgeAhead(e, ctx)) e.vx = 0;
        e.frame = (t >> 2) % 4;
        if (t % 3 === 0) ctx.particle({ x: e.x + (ctx.random() < 0.5 ? -1 : 1) * 24 * e.size, y: e.y - 12 * e.size, vx: 0, vy: -0.3, life: 8, max: 8, colour: '#ffffff', size: 1, gravity: 0 });
      },
      resting: function (e, ctx, t) {
        e.vx = 0;
        if (t < 66) { e.anim = 'slump'; e.frame = 0; if (t === 1) { ctx.number(e.x, e.y - e.h - 14, 'RUN DOWN', '#efd27a'); ctx.spark(e.x, e.y - 20, '#8f8d88', 6, 1, 20, -0.02); } }
        else { e.anim = 'rewind'; e.frame = (t >> 2) % 2; if (t % 8 === 0) { ctx.sfx('select'); ctx.spark(e.x - e.dir * 9, e.y - 20, '#efd27a', 2, 1, 10, 0); } }
      } }] };

  /* The Governor: two brass balls flying round a spindle. When it spins up they rise; it lets a cog go, which
     falls, runs along the floor, climbs the wall it meets, drops, and comes back the way it went. */
  function governorRig() {
    var P = {
      hub: ['..kkk..', '.krRrk.', '.krRrk.', 'kkrRrkk', 'krRRRrk', 'kkrRrkk', '.krerk.', '.krRrk.', '..kkk..'],
      ball: ['.kkk.', 'kplpk', 'kpppk', 'kqppk', '.kkk.'],
      rod: ['gg', 'gg'],
      cog: ['.k.k.k.', 'kRRRRRk', '.RrrrR.', 'kRrkrRk', '.RrrrR.', 'kRRRRRk', '.k.k.k.']
    };
    function arms(lx, ly, rx, ry, bob) { var hx = 15, hy = 10 + bob; return [['rod', Math.round((lx + 2 + hx) / 2), Math.round((ly + 2 + hy) / 2)], ['rod', Math.round((rx + 2 + hx + 2) / 2), Math.round((ry + 2 + hy) / 2)], ['ball', lx, ly], ['hub', 14, 5 + bob], ['ball', rx, ry]]; }
    return rig('gear', P, 34, 30, { x: 17, y: 12 }, {
      walk: [arms(3, 16, 26, 16, 0), arms(8, 17, 21, 17, 1), [['rod', 16, 15], ['hub', 14, 5], ['ball', 15, 17]], arms(8, 17, 21, 17, 1)],
      windup: [arms(1, 12, 28, 12, 0), arms(0, 7, 29, 7, -1)],
      attack: [arms(0, 7, 29, 7, 0).concat([['cog', 14, 16]]), arms(3, 16, 26, 16, 1), arms(5, 18, 24, 18, 1)],
      hurt: [arms(2, 9, 25, 19, 1)]
    });
  }
  function drawCog(p, g, cx, cy, tick) {
    var x = Math.round(p.x) - cx, y = Math.round(p.y) - cy, a = tick * 0.4 * (p.vx < 0 ? -1 : 1), k;
    g.fillStyle = '#140d04'; g.beginPath(); g.arc(x, y, 5.5, 0, 6.2832); g.fill();
    g.fillStyle = '#c9a44c'; g.beginPath();
    for (k = 0; k < 12; k++) { var r = k % 2 ? 3.2 : 5, an = a + k / 12 * 6.2832; if (k) g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); else g.moveTo(x + Math.cos(an) * r, y + Math.sin(an) * r); }
    g.fill(); g.fillStyle = '#efd27a'; g.fillRect(x - 1, y - 1, 2, 2);
  }
  function steerCog(p, ctx) {
    var solid = function (x, y) { return ctx.tileAt(Math.floor(x / 16), Math.floor(y / 16)) === 1; }, under = function (x, y) { var t = ctx.tileAt(Math.floor(x / 16), Math.floor(y / 16)); return t === 1 || t === 2; };
    if (p.phase === 'fall' || p.phase === 'drop') {
      if (p.vy > 0 && under(p.x, p.y + 6)) { p.y = Math.floor((p.y + 6) / 16) * 16 - 5; p.vy = 0; p.gravity = 0; p.vx = (p.phase === 'fall' ? p.dir : -p.dir) * 2.6; p.phase = p.phase === 'fall' ? 'run' : 'back'; ctx.spark(p.x, p.y + 4, '#efd27a', 4, 1.2, 8, 0.05); }
    } else if (p.phase === 'run' || p.phase === 'back') {
      var d = p.vx > 0 ? 1 : -1;
      if (solid(p.x + d * 7, p.y)) { if (p.phase === 'run') { p.phase = 'climb'; p.vx = 0; p.vy = -2.4; p.climbed = 0; p.wallDir = d; } else p.life = 1; }
      else if (!under(p.x + d * 4, p.y + 8)) { if (p.phase === 'run') { p.phase = 'back'; p.vx = -p.vx; } else p.life = 1; }
      if (ctx.random() < 0.3) ctx.particle({ x: p.x, y: p.y + 5, vx: -d * 0.5, vy: -0.6, life: 8, max: 8, colour: '#ffdc9a', size: 1, gravity: 0.06 });
    } else if (p.phase === 'climb') {
      p.climbed += 2.4;
      if (p.climbed > 60 || solid(p.x, p.y - 8) || !solid(p.x + p.wallDir * 7, p.y)) { p.phase = 'drop'; p.vy = -0.5; p.gravity = 0.2; p.vx = -p.wallDir * 1.4; }
    }
  }
  KINDS.governor = { element: 'gear', flying: true, body: { w: 12, h: 12 }, hurt: { w: 16, h: 17 }, hp: 7, speed: 0.5, sight: 170, move: 'hover', stand: 78, height: 54, rig: governorRig,
    attacks: [{ name: 'cog', range: [10, 150], above: 90, below: 150, windup: 40, active: 6, recover: 40, cooldown: 170,
      telling: function (e, ctx, t) { if (t % 4 === 0) ctx.spark(e.x + (ctx.random() < 0.5 ? -14 : 14), e.y - 2, '#efd27a', 1, 0.8, 8, 0); if (t % 10 === 0) ctx.sfx('select'); },
      fire: function (e, ctx) {
        ctx.projectile({ x: e.x, y: e.y + 10, vx: e.dir * 1.2, vy: 0.5, gravity: 0.2, life: 330, colour: '#c9a44c', size: 9, damage: 1, element: 'gear', cause: 'cog', phase: 'fall', dir: e.dir, steer: steerCog, draw: drawCog });
        ctx.sfx('clink');
      } }] };

  BY_ELEMENT.gear = ['winder', 'governor'];
})();
