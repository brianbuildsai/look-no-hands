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
})();
