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
  var ST = window.UndercroftSteady;   // sines that every browser agrees on (steady.js): two machines compute this game and must match to the bit
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
      fire: function (e, ctx) { ctx.sfx('harpoon'); ctx.spark(e.x + e.dir * 18, e.y - 15, '#d6fff8', 8, 1.6, 10, 0); e.vars.tipX = e.x + e.dir * 14; e.vars.anchorX = e.x + e.dir * (e.vars.len + 4); },
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
      start: function (e, ctx) { e.vars.angle = ST.atan2(ctx.hero.y - 11 - e.y, ctx.hero.x - e.x); ctx.sfx('select'); },
      telling: function (e, ctx, t, w) {
        if (t < w - 14) e.vars.angle = turnToward(e.vars.angle, ST.atan2(ctx.hero.y - 11 - e.y, ctx.hero.x - e.x), 0.05);
        e.vx *= 0.85; e.vy *= 0.85;
        ctx.telegraphLine(e.x, e.y, e.x + ST.cos(e.vars.angle) * 118, e.y + ST.sin(e.vars.angle) * 118, 2, '#5fd4c4');
      },
      fire: function (e, ctx) { e.vx = ST.cos(e.vars.angle) * 5.2; e.vy = ST.sin(e.vars.angle) * 5.2; e.dir = e.vx >= 0 ? 1 : -1; ctx.sfx('dash'); },
      box: function (e) { return [{ x0: e.x - 9 * e.size, x1: e.x + 9 * e.size, y0: e.y - 7 * e.size, y1: e.y + 7 * e.size }]; },
      during: function (e, ctx, t) { if (t % 2 === 0) ctx.particle({ x: e.x - e.vx, y: e.y + (ctx.random() - 0.5) * 8, vx: 0, vy: -0.2, life: 14, max: 14, colour: '#9ff5e6', size: 1, gravity: -0.01 }); },
      resting: function (e) { e.vx *= 0.88; e.vy *= 0.88; } }],
    // the lure: a small light that goes wherever it goes, and goes out when it means to bite
    always: function (e, ctx) { if (e.dying || e.attack && e.attack.phase !== 'recover') return; var lx = e.x + e.dir * 9 * e.size, ly = e.y - 7 * e.size + ST.sin(e.clock * 0.08) * 1.5; ctx.light(lx, ly, 20, 0.95); ctx.glow(lx, ly, 9, '#9ff5e6', 0.55); } };

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
      telling: function (e, ctx, t) { e.vx = 0; if (t % 6 === 0) ctx.spark(e.x - e.dir * 9, e.y - 22, '#efd27a', 2, 1, 10, 0); if (t % 8 === 0) ctx.sfx('tick'); },
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
        else { e.anim = 'rewind'; e.frame = (t >> 2) % 2; if (t % 8 === 0) { ctx.sfx('tick'); ctx.spark(e.x - e.dir * 9, e.y - 20, '#efd27a', 2, 1, 10, 0); } }
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
    for (k = 0; k < 12; k++) { var r = k % 2 ? 3.2 : 5, an = a + k / 12 * 6.2832; if (k) g.lineTo(x + ST.cos(an) * r, y + ST.sin(an) * r); else g.moveTo(x + ST.cos(an) * r, y + ST.sin(an) * r); }
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
        ctx.sfx('cogthrow');
      } }] };

  BY_ELEMENT.gear = ['winder', 'governor'];
  /* ---- glass ---- */

  /* The Reflection: a knight of rose glass behind a mirror. From the front nothing reaches it, and what is thrown
     comes back; it is open from behind, and for a moment after it has lunged and the mirror has swung aside. */
  function reflectionRig() {
    var P = {
      head: ['..kkkkk..', '.kpllppk.', 'kplppppqk', 'kpkkkkkqk', 'kpkwkwkqk', 'kppppppqk', '.kqqqqqk.', '..kkkkk..'],
      body: ['.kkkkkkk.', 'kpplpppqk', 'kplpppqqk', 'kppppqqqk', 'kpppqqpqk', 'kppqqpppk', '.kqqpppk.', '.kqppppk.', '..kkkkk..'],
      leg: ['kpk.', 'kpk.', 'kqk.', 'kpk.', 'kplk', 'kkkk'],
      shield: ['..kkk..', '.klllk.', 'kllwllk', 'klwlllk', 'kwllllk', 'klllllk', 'kllllwk', 'klllwlk', 'kllwllk', 'klllllk', 'klllllk', '.klllk.', '.klllk.', '..klk..', '...k...'],
      shieldGlint: ['..kkk..', '.kwwwk.', 'kwwwwwk', 'kwwwwwk', 'kwwwwwk', 'kwwwwwk', 'kwwwwwk', 'kwwwwwk', 'kwwwwwk', 'kwwwwwk', 'kwwwwwk', '.kwwwk.', '.kwwwk.', '..kwk..', '...k...'],
      shieldSide: ['.k.', 'klk', 'klk', 'klk', 'klk', 'klk', 'klk', 'klk', 'klk', 'klk', 'klk', 'klk', 'klk', 'klk', '.k.'],
      sword: ['kpk.........', 'kpkllllllllW', 'kkk.........'],
      swordUp: ['.W.', '.l.', '.l.', '.l.', '.l.', '.l.', '.l.', '.l.', '.l.', 'kpk', 'kpk', 'kkk']
    };
    var walk = [], k;
    for (k = 0; k < 4; k++) {
      var bob = k % 2 ? 1 : 0, a = [1, 0, -1, 0][k], l1 = [0, 1, 0, 0][k], l2 = [0, 0, 0, 1][k];
      walk.push([['swordUp', 10, 7 + bob], ['leg', 14 - a, 28 - l2], ['body', 13, 19 + bob], ['leg', 19 + a, 28 - l1], ['head', 13, 11 + bob], ['shield', 23, 14 + bob]]);
    }
    return rig('glass', P, 38, 34, { x: 18, y: 34 }, {
      walk: walk,
      windup: [
        [['sword', 1, 22, { flip: true }], ['leg', 13, 28], ['body', 13, 19], ['leg', 20, 28], ['head', 13, 11], ['shield', 23, 14]],
        [['sword', 0, 21, { flip: true }], ['leg', 12, 28], ['body', 12, 19], ['leg', 20, 28], ['head', 12, 11], ['shieldGlint', 22, 14]]
      ],
      attack: [
        [['shieldSide', 12, 14], ['leg', 12, 28], ['body', 15, 19], ['leg', 22, 28], ['head', 16, 12], ['sword', 24, 22]],
        [['shieldSide', 11, 14], ['leg', 11, 28], ['body', 16, 20], ['leg', 23, 28], ['head', 17, 13], ['sword', 26, 23]],
        [['shieldSide', 11, 14], ['leg', 12, 28], ['body', 15, 20], ['leg', 22, 28], ['head', 16, 13], ['sword', 25, 24]]
      ],
      // after the lunge: the mirror is aside and the sword is down
      open: [[['shieldSide', 10, 15], ['leg', 13, 28], ['body', 14, 20], ['leg', 21, 28], ['head', 15, 13], ['sword', 24, 27]]],
      hurt: [[['swordUp', 8, 8], ['leg', 15, 28], ['body', 12, 19], ['leg', 19, 28], ['head', 11, 10], ['shield', 24, 15]]]
    });
  }
  function guarding(e) { return !e.dying && !(e.status.freeze > 0 || e.status.stun > 0) && !(e.attack && e.attack.phase !== 'windup'); }
  KINDS.reflection = { element: 'glass', flying: false, body: { w: 12, h: 22 }, hurt: { w: 16, h: 24 }, hp: 11, speed: 0.42, sight: 160, move: 'walk', keep: 30, rig: reflectionRig,
    // one box, and the mirror decides: from the front, guarded, a blow rings off it and a missile is sent back
    boxes: function (e, w, h) {
      return [{ x0: e.x - w / 2, x1: e.x + w / 2, y0: e.y - h, y1: e.y, mult: 1, onHit: function (c, ctx, damage, fromX, missile) {
        var fromFront = (fromX - c.x) * c.dir > 0;
        if (!fromFront || !guarding(c)) { var soft = c.attack && c.attack.phase === 'recover'; return ctx.wound(c, soft ? Math.round(damage * 1.5) : damage, fromX); }
        c.vars.glint = 8; ctx.spark(c.x + c.dir * 10, c.y - 16, '#ffffff', 6, 1.8, 10, 0.03); ctx.sfx('mirror');
        if (missile) { ctx.projectile({ x: c.x + c.dir * 14, y: c.y - 15, vx: c.dir * 3.6, vy: 0, life: 80, colour: '#ffe8f4', size: 5, damage: 1, element: 'glass', shard: true, cause: 'reflection' }); return true; }
        if (!(c.vars.told > 0)) { ctx.number(c.x, c.y - c.h - 14, 'MIRRORED', '#ffe8f4'); c.vars.told = 240; }
        return false;
      } }];
    },
    attacks: [{ name: 'lunge', range: [0, 74], windup: 32, active: 14, recover: 56, cooldown: 70, grounded: true, moves: true,
      start: function (e, ctx) { if (e.vars.dir !== undefined && (ctx.hero.x - e.x) * e.vars.dir < 0) { e.dir = e.vars.dir; e.attack = null; e.cooldown = 12; } },
      telling: function (e, ctx, t, w) { e.vx = 0; if (t === 1) ctx.telegraph(e.dir > 0 ? e.x + 6 : e.x - 66, e.y - 16, 60, 8, w, '#ff9ecb'); },
      fire: function (e, ctx) { e.vx = e.dir * 4.2; ctx.sfx('swing'); },
      box: function (e) { return [front(e, 4, 26, 18, -6)]; },
      during: function (e, ctx, t) { if (AC.kit.edgeAhead(e, ctx)) e.vx = 0; if (t % 2 === 0) ctx.particle({ x: e.x - e.dir * 8, y: e.y - 10, vx: -e.dir, vy: 0, life: 8, max: 8, colour: '#ffe8f4', size: 1, gravity: 0 }); },
      resting: function (e, ctx, t) { e.vx *= 0.7; if (t < 44) { e.anim = 'open'; e.frame = 0; } } }],
    // it is slow to turn: get behind it and for two thirds of a second its back is to you
    always: function (e) {
      var v = e.vars;
      if (v.told > 0) v.told--;
      if (v.glint > 0) { v.glint--; if (!e.attack && e.anim === 'walk') { e.anim = 'windup'; e.frame = 1; } }
      if (v.dir === undefined) v.dir = e.dir;
      if (e.attack) { v.dir = e.dir; v.turn = 0; return; }
      if (e.dir !== v.dir) { v.turn = (v.turn || 0) + 1; if (v.turn < 40) { e.dir = v.dir; e.x -= e.vx; e.vx = 0; e.frame = 0; } else { v.dir = e.dir; v.turn = 0; } } else v.turn = 0;
    } };

  /* The Prism: a crystal afloat with two chips of itself in orbit. Its beam goes a marked way and there splits in three. */
  function prismRig() {
    var P = {
      crystal: ['....k....', '...klk...', '..kllpk..', '..klppk..', '.kllpppk.', '.klpppqk.', 'kllpppqqk', 'klwppqqqk', 'kllpppqqk', '.klppqqk.', '.klppqqk.', '..kpqqk..', '..kpqqk..', '...kqk...', '....k....'],
      crystalLit: ['....k....', '...kwk...', '..kwwlk..', '..kwllk..', '.kwwlllk.', '.kwllllk.', 'kwwlllllk', 'kwwllllpk', 'kwwlllllk', '.kwllllk.', '.kwlllpk.', '..kllpk..', '..kllpk..', '...klk...', '....k....'],
      chip: ['.l.', 'lwl', '.l.']
    };
    var ORBIT = [[[1, 12], [22, 14]], [[4, 4], [19, 22]], [[11, 0], [12, 26]], [[19, 4], [4, 22]]], walk = [], k;
    for (k = 0; k < 4; k++) { var bob = k % 2 ? 1 : 0; walk.push([['chip', ORBIT[k][0][0], ORBIT[k][0][1]], ['crystal', 8, 7 + bob], ['chip', ORBIT[k][1][0], ORBIT[k][1][1]]]); }
    return rig('glass', P, 26, 30, { x: 13, y: 14 }, {
      walk: walk,
      windup: [[['chip', 4, 12], ['crystal', 8, 7], ['chip', 19, 14]], [['chip', 6, 13], ['crystalLit', 8, 7], ['chip', 17, 13]]],
      attack: [[['chip', 0, 13], ['crystalLit', 8, 7], ['chip', 23, 13]], [['chip', 1, 12], ['crystalLit', 8, 8], ['chip', 22, 14]], [['chip', 2, 12], ['crystal', 8, 7], ['chip', 21, 14]]],
      hurt: [[['chip', 2, 20], ['crystal', 9, 9], ['chip', 22, 4]]]
    });
  }
  function ray(e, ctx, x0, y0, angle, max, out) {
    var c = ST.cos(angle), s = ST.sin(angle), len = 6;
    for (; len < max; len += 8) { var x = x0 + c * len, y = y0 + s * len; if (ctx.tileAt(Math.floor(x / 16), Math.floor(y / 16)) === 1) break; if (out) out.push({ x0: x - 4, x1: x + 4, y0: y - 4, y1: y + 4 }); }
    return { x: x0 + c * len, y: y0 + s * len, len: len };
  }
  KINDS.prism = { element: 'glass', flying: true, body: { w: 10, h: 14 }, hurt: { w: 13, h: 18 }, hp: 7, speed: 0.45, sight: 190, move: 'hover', stand: 84, height: 40, rig: prismRig,
    attacks: [{ name: 'refract', range: [44, 180], above: 90, below: 120, windup: 58, active: 40, recover: 44, cooldown: 170,
      start: function (e, ctx) { var dx = ctx.hero.x - e.x, dy = ctx.hero.y - 11 - e.y; e.vars.angle = ST.atan2(dy, dx); e.vars.split = Math.max(36, Math.min(96, Math.sqrt(dx * dx + dy * dy) * 0.55)); },
      telling: function (e, ctx, t, w) {
        var v = e.vars;
        if (t < w - 18) v.angle = turnToward(v.angle, ST.atan2(ctx.hero.y - 11 - e.y, ctx.hero.x - e.x), 0.05);
        var first = ray(e, ctx, e.x, e.y, v.angle, v.split, null);
        ctx.telegraphLine(e.x, e.y, first.x, first.y, 2, '#ff9ecb');
        if (first.len >= v.split) { for (var n = -1; n <= 1; n++) { var b = ray(e, ctx, first.x, first.y, v.angle + n * 0.42, 110, null); ctx.telegraphLine(first.x, first.y, b.x, b.y, 2, n ? '#c46a98' : '#ff9ecb'); } ctx.telegraphCircle(first.x, first.y, 4, 2, '#ffe8f4'); }
        if (t % 12 === 0) ctx.sfx('select');
      },
      fire: function (e, ctx) { ctx.sfx('beam'); },
      box: function (e, t, ctx) {
        var v = e.vars, out = [], first = ray(e, ctx, e.x, e.y, v.angle, v.split, out);
        v.rays = [[e.x, e.y, first.x, first.y]];
        if (first.len >= v.split) for (var n = -1; n <= 1; n++) { var b = ray(e, ctx, first.x, first.y, v.angle + n * 0.42, 110, out); v.rays.push([first.x, first.y, b.x, b.y]); }
        return out;
      },
      during: function (e, ctx) { var r = e.vars.rays || []; for (var k = 0; k < r.length; k++) ctx.beam(r[k][0], r[k][1], r[k][2], r[k][3], '#ff9ecb'); } }] };

  BY_ELEMENT.glass = ['reflection', 'prism'];
})();
