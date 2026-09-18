/* actors.js: what lives in the undercroft, and how it behaves.

   Ten creatures, two to an element. Each is struck in its hurt boxes and
   strikes only with the boxes of its attacks; touching one is harmless, so
   every wound is one that could have been read. An attack is a wind-up that
   tells, a few active steps, and a recovery in which the creature is open.
   Arenas get elders, larger, tougher, and not to be staggered. Each creature
   carries its element's touch: ember burns, frost chills, storm shocks,
   bloom poisons, the void drains the lantern.

   The behaviours are written against a small set of engine helpers handed
   in by undercroft.js (moving bodies, tiles, sparks, lights, projectiles),
   so the creatures know nothing of the canvas. */
(function () {
  'use strict';

  /* ---- the art ----
     One palette per element: p the body, q its shadow, l its light, e the
     eye, k the outline. The same letters in every creature, so each
     element's pair share a colour and nothing else. */

  var PALETTES = {
    ember: { k: '#1a0806', p: '#c9401f', q: '#7a2412', l: '#ffb347', e: '#ffdc9a', w: '#ffdc9a' },
    frost: { k: '#0a1220', p: '#7fb4d8', q: '#3f6f94', l: '#e6f6ff', e: '#ffffff', w: '#d8f1ff' },
    storm: { k: '#0e0a1c', p: '#6b5aa8', q: '#3a2f6a', l: '#c9b8ff', e: '#ffffff', w: '#8fa3ff' },
    bloom: { k: '#06120a', p: '#4e9a52', q: '#2c5e31', l: '#c5ff9a', e: '#f0ffd8', w: '#9ae66e' },
    void:  { k: '#000000', p: '#1e1a2c', q: '#0d0b14', l: '#5b3fa0', e: '#ffffff', w: '#a48cff' }
  };

  // frames are lists of rows; each creature has walk (or hover) frames and an attack frame
  var ART = {
    cinder: {   // an ember beetle that hops
      walk: [
        ['....kkkkkk....', '..kkpppppplk..', '.kppqpppppplk.', 'kpqqpppepplpk.', 'kppqppppppplk.', '.kppppppppppk.', '..kqqkkkkqqk..', '.kk.kk..kk.kk.'],
        ['....kkkkkk....', '..kkpppppplk..', '.kppqpppppplk.', 'kpqqpppepplpk.', 'kppqppppppplk.', '.kppppppppppk.', '..kqqkkkkqqk..', '..kk.kk.kk.kk.']
      ],
      attack: [['...kkkkkkkk...', '.kkppplllppkk.', 'kppqplllllpppk', 'kpqqpplelppppk', 'kppqppllllpppk', '.kppppppppppk.', '..kqqkkkkqqk..', '.kkkk....kkkk.']]
    },
    wisp: {   // a flame with an eye, that dives
      walk: [
        ['....kk....', '...kllk...', '..kllllk..', '..klplpk..', '.kpplppqk.', '.kppeppqk.', '.kpppppqk.', '..kppqqk..', '...kqqk...', '....kk....'],
        ['...kk.....', '..kllk....', '..kllllk..', '..klplplk.', '.kpplpppk.', '.kppeppqk.', '.kpppppqk.', '..kppqqk..', '...kqqk...', '....kk....'],
        ['.....kk...', '....kllk..', '..kllllk..', '.klplplk..', '.kpplppqk.', '.kppeppqk.', '.kpppppqk.', '..kppqqk..', '...kqqk...', '....kk....']
      ],
      attack: [['....kk....', '...kllk...', '..kllllk..', '.kllplllk.', 'kpplllppqk', 'kppeeeppqk', 'kpppppppqk', '.kppqqqqk.', '..kqqqqk..', '...kkkk...']]
    },
    crawler: {   // a rime slug that slides
      walk: [
        ['.....kkkkkk.....', '...kkllpppplkk..', '..klppqppppppqk.', '.kpppqqppppppqpk', 'kpppppppqqpppepk', 'kqppppppppppppqk', '.kqqqqqqqqqqqqk.', '..kkkkkkkkkkkk..'],
        ['....kkkkkkk.....', '..kkllppppplkk..', '.klppqpppppppqk.', 'kpppqqpppppppqpk', 'kpppppppqqpppepk', 'kqppppppppppppqk', '.kqqqqqqqqqqqqk.', '..kkkkkkkkkkkk..']
      ],
      attack: [['....kkkkkkk.....', '..kkllpwwwwlkk..', '.klppqpwwwwwpqk.', 'kpppqqpwwwwwpqpk', 'kpppppppwwpppepk', 'kqppppppppppppqk', '.kqqqqqqqqqqqqk.', '..kkkkkkkkkkkk..']]
    },
    moth: {   // a hail moth, wings beating, that shoots shards
      walk: [
        ['kkk........kkk', 'klllk.....kllk', 'kllllk...klllk', '.klllkkkkllkk.', '..kllkppkllk..', '...kkpepepk...', '....kppppk....', '.....kqqk.....', '.....kkkk.....'],
        ['..............', '..kkkk...kkkk.', '.kllllk.kllllk', '.kllllkkkllllk', '..kllkppkllk..', '...kkpepepk...', '....kppppk....', '.....kqqk.....', '.....kkkk.....']
      ],
      attack: [['..............', '..kkkk...kkkk.', '.kllllk.kllllk', '.kllllkkkllllk', '..kllkppkllk..', '...kkpwpwpk...', '....kpwwpk....', '.....kwwk.....', '.....kkkk.....']]
    },
    hound: {   // a spark hound that charges
      walk: [
        ['......kkkk......', '..kkkkpllpkkk...', '.kppppplpppppkk.', 'kpqppppppppppepk', 'kpppppppppppppkk', '.kqppppppppppk..', '..kqpkkkkkpqk...', '..kpk....kpk....', '..kkk....kkk....'],
        ['......kkkk......', '..kkkkpllpkkk...', '.kppppplpppppkk.', 'kpqppppppppppepk', 'kpppppppppppppkk', '.kqppppppppppk..', '..kqpkkkkkpqk...', '...kpk..kpk.....', '...kkk..kkk.....']
      ],
      attack: [['....kkkkkk......', 'kkkkpllllpkkk...', 'kwwpplllpppppkk.', 'kpwppppppppppepk', 'kppwpppppppppekk', '.kqppppppppppk..', '.kqpkkkkkkkpqk..', 'kpk........kpk..', 'kkk........kkk..']]
    },
    bat: {   // a charge bat that zaps
      walk: [
        ['kk..........kk', 'kpk........kpk', 'kppk..kk..kppk', '.kppkkppkkppk.', '..kpppeppppk..', '...kpppppqk...', '....kkkkkk....'],
        ['..............', '..kk......kk..', '.kppk.kk.kppk.', '.kpppkppkpppk.', '..kpppeppppk..', '...kpppppqk...', '....kkkkkk....']
      ],
      attack: [['..............', '..kk......kk..', '.kppk.kk.kppk.', '.kpppkppkpppk.', '..kwwpepwwpk..', '...kpwwwwqk...', '....kkkkkk....']]
    },
    toad: {   // a thorn toad that hops, poisonous
      walk: [
        ['..kk.k....k.kk', '.klkkl....lkkl', 'kppplkkkkklppk', 'kppppppepppppk', 'kqppppppppppqk', '.kqqppppppqqk.', '..kkqqkkqqkk..', '..kkk....kkk..'],
        ['..kk.k....k.kk', '.klkkl....lkkl', 'kppplkkkkklppk', 'kppppppepppppk', 'kqppppppppppqk', '.kqqppppppqqk.', '.kqqkkkkkkqqk.', '.kkk......kkk.']
      ],
      attack: [['..kk.k....k.kk', '.klkkl....lkkl', 'kppplkkkkklppk', 'kppppppepppppk', 'kqppwwwwwwppqk', '.kqqwwwwwwqqk.', '..kkqqkkqqkk..', '..kkk....kkk..']]
    },
    spore: {   // a spore fly, a bulb on wings, that drops clouds
      walk: [
        ['kkk....kkk', 'kllk..kllk', '.kllkkllk.', '..klppl...', '..kppepk..', '..kppppk..', '..kqppqk..', '...kqqk...', '....kk....'],
        ['..........', 'kkk....kkk', 'kllkkkkllk', '..klppl...', '..kppepk..', '..kppppk..', '..kqppqk..', '...kqqk...', '....kk....']
      ],
      attack: [['..........', 'kkk....kkk', 'kllkkkkllk', '..klppl...', '..kppepk..', '..kpwwpk..', '..kqwwqk..', '...kwwk...', '....kk....']]
    },
    shade: {   // a shade that walks, then is suddenly nearer
      walk: [
        ['....kkkk....', '...kppppk...', '...kpepppk..', '...kppppk...', '..kkppppkk..', '.kpkppppkpk.', '.kpkppppkpk.', '.kkkppppkkk.', '...kppppk...', '...kppppk...', '...kpkkpk...', '..kpk..kpk..', '..kkk..kkk..'],
        ['....kkkk....', '...kppppk...', '...kpepppk..', '...kppppk...', '..kkppppkk..', '.kpkppppkpk.', '.kpkppppkpk.', '.kkkppppkkk.', '...kppppk...', '...kppppk...', '...kpkkpk...', '...kpkkpk...', '...kkkkkk...']
      ],
      attack: [['....kkkk....', '...kllllk...', '...klelllk..', '...kllllk...', '.kkkllllkkk.', 'kpkkppppkkpk', 'kpk.kppk.kpk', 'kkk.kppk.kkk', '...kppppk...', '...kppppk...', '...kpkkpk...', '..kpk..kpk..', '..kkk..kkk..']]
    },
    eye: {   // an eye that hovers and looks, then fires
      walk: [
        ['...kkkkkk...', '..kppppppk..', '.kpplwwwppk.', 'kppplweewppk', 'kpppwweewppk', 'kpppplwwppqk', '.kpppppppqk.', '..kqqqqqqk..', '...kkkkkk...'],
        ['...kkkkkk...', '..kppppppk..', '.kppplwwppk.', 'kpppplweeppk', 'kppppwweeppk', 'kppppplwppqk', '.kpppppppqk.', '..kqqqqqqk..', '...kkkkkk...']
      ],
      attack: [['...kkkkkk...', '..kppppppk..', '.kpplllllpk.', 'kpplleeellpk', 'kppllwwwllpk', 'kppplllllpqk', '.kpppppppqk.', '..kqqqqqqk..', '...kkkkkk...']]
    }
  };

  /* ---- the kinds ----
     A kind says what a creature is made of: its element, the box that stops
     at walls (body), the box it can be struck in (hurt), its life, how it
     gets about, and its attacks, each with a range it begins from, a wind-up,
     active steps, a recovery, and the boxes or missiles it strikes with. */

  function bite(reach) {
    return { name: 'bite', range: [0, reach + 4], windup: 24, active: 8, recover: 26, cooldown: 60, grounded: true,
      box: function (e) { return [front(e, 2, reach, 12, 0)]; } };
  }
  function aim(e, ctx, speed) { var hero = ctx.hero, dx = hero.x - e.x, dy = hero.y - 11 - e.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy)); return { vx: dx / len * speed, vy: dy / len * speed, len: len }; }

  var KINDS = {
    cinder:  { element: 'ember', art: 'cinder', flying: false, body: { w: 12, h: 8 }, hurt: { w: 14, h: 9 }, hp: 6, speed: 0.6, sight: 110, move: 'hop', attacks: [bite(20)] },
    wisp:    { element: 'ember', art: 'wisp', flying: true, body: { w: 8, h: 10 }, hurt: { w: 10, h: 11 }, hp: 4, speed: 0.9, sight: 130, move: 'hover', stand: 12,
      attacks: [{ name: 'dive', range: [0, 90], below: 90, windup: 22, active: 34, recover: 30, cooldown: 90, moves: true,
        fire: function (e, ctx) { var a = aim(e, ctx, 3.2); e.vx = a.vx; e.vy = a.vy; },
        box: function (e) { return [{ x0: e.x - 5, x1: e.x + 5, y0: e.y - 6, y1: e.y + 6 }]; },
        resting: function (e) { e.vy -= 0.08; } }] },
    crawler: { element: 'frost', art: 'crawler', flying: false, body: { w: 14, h: 8 }, hurt: { w: 16, h: 9 }, hp: 8, speed: 0.35, sight: 90, move: 'walk', attacks: [bite(22)] },
    moth:    { element: 'frost', art: 'moth', flying: true, body: { w: 10, h: 9 }, hurt: { w: 14, h: 10 }, hp: 4, speed: 0.7, sight: 150, move: 'hover',
      attacks: [{ name: 'shard', range: [20, 130], below: 100, windup: 26, active: 4, recover: 24, cooldown: 110,
        fire: function (e, ctx) { var a = aim(e, ctx, 2.2); ctx.projectile({ x: e.x, y: e.y, vx: a.vx, vy: a.vy, life: 120, colour: '#d8f1ff', size: 3, damage: 1, element: 'frost', gravity: 0 }); } }] },
    hound:   { element: 'storm', art: 'hound', flying: false, body: { w: 14, h: 9 }, hurt: { w: 16, h: 10 }, hp: 7, speed: 0.9, sight: 140, move: 'walk', keep: 40,
      attacks: [{ name: 'leap', range: [24, 80], windup: 26, active: 22, recover: 30, cooldown: 80, grounded: true, moves: true,
        fire: function (e, ctx) { e.vx = e.dir * 3; e.vy = -2.6; ctx.spark(e.x, e.y - 4, '#8fa3ff', 8, 1.4, 14, 0); },
        box: function (e) { return [front(e, 0, 12, 10, 0)]; } }] },
    bat:     { element: 'storm', art: 'bat', flying: true, body: { w: 12, h: 7 }, hurt: { w: 14, h: 8 }, hp: 4, speed: 1.0, sight: 120, move: 'hover',
      attacks: [{ name: 'zap', range: [0, 70], below: 80, windup: 30, active: 5, recover: 30, cooldown: 110,
        telling: function (e, ctx, t) { if (t % 4 === 0) ctx.spark(e.x, e.y, '#8fa3ff', 2, 1, 10, 0); },
        fire: function (e, ctx) { var a = aim(e, ctx, 4.5); ctx.projectile({ x: e.x, y: e.y, vx: a.vx, vy: a.vy, life: 40, colour: '#ffffff', size: 3, damage: 1, element: 'storm', gravity: 0 }); } }] },
    toad:    { element: 'bloom', art: 'toad', flying: false, body: { w: 12, h: 8 }, hurt: { w: 14, h: 9 }, hp: 8, speed: 0.5, sight: 100, move: 'hop', attacks: [bite(22)] },
    spore:   { element: 'bloom', art: 'spore', flying: true, body: { w: 8, h: 9 }, hurt: { w: 10, h: 10 }, hp: 4, speed: 0.6, sight: 120, move: 'hover', stand: 0, height: 60,
      attacks: [{ name: 'drop', range: [0, 40], below: 110, windup: 24, active: 4, recover: 24, cooldown: 110,
        fire: function (e, ctx) { ctx.projectile({ x: e.x, y: e.y + 4, vx: (ctx.random() - 0.5) * 0.4, vy: 0.3, life: 150, colour: '#9ae66e', size: 4, damage: 1, element: 'bloom', gravity: 0.01, cloud: true }); } }] },
    shade:   { element: 'void', art: 'shade', flying: false, body: { w: 10, h: 13 }, hurt: { w: 10, h: 14 }, hp: 9, speed: 0.55, sight: 150, move: 'walk', attacks: [bite(22)] },
    eye:     { element: 'void', art: 'eye', flying: true, body: { w: 10, h: 9 }, hurt: { w: 12, h: 10 }, hp: 6, speed: 0.5, sight: 170, move: 'hover',
      attacks: [{ name: 'beam', range: [30, 150], below: 110, windup: 30, active: 4, recover: 30, cooldown: 150,
        fire: function (e, ctx) { var a = aim(e, ctx, 1.4); ctx.projectile({ x: e.x, y: e.y, vx: a.vx, vy: a.vy, life: 200, colour: '#a48cff', size: 3, damage: 1, element: 'void', gravity: 0, seek: 0.03 }); } }] }
  };
  var BY_ELEMENT = { ember: ['cinder', 'wisp'], frost: ['crawler', 'moth'], storm: ['hound', 'bat'], bloom: ['toad', 'spore'], void: ['shade', 'eye'] };

  // compile a kind's frames: the old flat art gives walk frames and one attack frame, used for wind-up and blow alike
  var SPRITES = null;
  function build() {
    if (SPRITES) return SPRITES;
    SPRITES = {};
    Object.keys(KINDS).forEach(function (name) {
      var kind = KINDS[name], set;
      if (kind.rig) set = kind.rig();
      else {
        var pal = {}, base = window.Pixels.PALETTE, over = PALETTES[kind.element], key;
        for (key in base) pal[key] = base[key];
        for (key in over) pal[key] = over[key];
        var art = ART[kind.art], walk = art.walk.map(function (rows) { return window.Pixels.art(rows, pal); }), attack = art.attack.map(function (rows) { return window.Pixels.art(rows, pal); });
        set = { frames: { walk: walk, windup: attack, attack: attack, hurt: [walk[0]] }, anchor: { x: walk[0].width / 2, y: kind.flying ? walk[0].height / 2 : walk[0].height } };
      }
      set.flipped = {};
      Object.keys(set.frames).forEach(function (anim) { set.flipped[anim] = set.frames[anim].map(window.Pixels.flipH); });
      kind.frames = set.frames;
      SPRITES[name] = set;
    });
    return SPRITES;
  }

  /* ---- the core: bodies, boxes, the clock of an attack ----

     A creature is struck in its hurt boxes and strikes with its attack
     boxes, and nothing else about it can wound: touching one is harmless.
     An attack is a wind-up (a pose that tells), some active steps (the
     boxes are live and the frames show the blow) and a recovery (it is
     open). Struck during the wind-up, an ordinary creature loses the
     attack; an elder does not. */

  var STATUS = {
    ember: { name: 'burn', time: 180, colour: '#ff8c42' },
    frost: { name: 'chill', time: 200, colour: '#9fd8ff' },
    storm: { name: 'shock', time: 90, colour: '#8fa3ff' },
    bloom: { name: 'poison', time: 360, colour: '#9ae66e' },
    void:  { name: 'drain', time: 1, colour: '#a48cff' }
  };
  function statusName(element) { return STATUS[element].name; }

  function make(name, x, groundY, elder, floor, rnd) {
    var K = KINDS[name], scale = 1 + ((floor || 1) - 1) * 0.3, size = elder ? 1.4 : 1;
    var hp = Math.round(K.hp * scale * (elder ? 3 : 1));
    return {
      kind: name, spec: K, element: K.element, elder: !!elder, size: size,
      x: x, y: K.flying ? groundY - 36 : groundY, vx: 0, vy: 0, w: K.body.w * size, h: K.body.h * size,
      hp: hp, maxHp: hp, dir: rnd() < 0.5 ? -1 : 1, onGround: false, clock: Math.floor(rnd() * 60), frame: 0, anim: 'walk',
      state: 'idle', wait: Math.floor(rnd() * 40), cooldown: 50 + Math.floor(rnd() * 40), hurt: 0, flash: 0, dying: 0,
      home: { x: x, y: groundY - 36 }, drop: 0, status: {}, seen: false, attack: null, boxes: [], hitHero: false, vars: {}
    };
  }
  // a creature for a spawn point: the element's walker or flyer, an elder for arenas
  function spawn(point, element, floor, rnd) {
    var pair = BY_ELEMENT[element], name = (point.kind === 'flyer' || point.kind === 'perch') ? pair[1] : pair[0];
    return make(name, point.x * 16 + 8, point.y * 16, point.kind === 'brute', floor, rnd);
  }

  // where a creature can be struck: a walker stands on (x, y), a flyer is centred on it
  function hurtBoxes(e) {
    var K = e.spec, w = K.hurt.w * e.size, h = K.hurt.h * e.size, oy = (K.hurt.oy || 0) * e.size;
    if (e.vars && e.vars.shelled) return [];
    if (K.flying) return [{ x0: e.x - w / 2, x1: e.x + w / 2, y0: e.y - h / 2 + oy, y1: e.y + h / 2 + oy, mult: 1 }];
    return [{ x0: e.x - w / 2, x1: e.x + w / 2, y0: e.y - h + oy, y1: e.y + oy, mult: 1 }];
  }
  // a box in front of a creature: from `near` to `far` ahead of it, `up` above its feet (or centre) to `down` below
  function front(e, near, far, up, down) {
    var s = e.size, x0 = e.dir > 0 ? e.x + near * s : e.x - far * s, x1 = e.dir > 0 ? e.x + far * s : e.x - near * s;
    return { x0: x0, x1: x1, y0: e.y - up * s, y1: e.y + down * s };
  }

  function hurt(e, damage, fromX, ctx) {
    if (e.dying) return false;
    e.hp -= damage; e.hurt = 10; e.flash = 4;
    if (!e.elder) { e.vx = (e.x < fromX ? -1 : 1) * (e.spec.flying ? 1.6 : 1.2); if (!e.spec.flying) e.vy = Math.min(e.vy, -1.4); }
    // a blow during the wind-up breaks an ordinary creature's attack
    if (e.attack && e.attack.phase === 'windup' && !e.elder && !e.attack.def.steady) { if (e.attack.def.end) e.attack.def.end(e, ctx); e.attack = null; e.boxes = []; e.cooldown = 40; }
    if (e.spec.struck) e.spec.struck(e, ctx);
    if (e.hp <= 0) { e.hp = 0; e.dying = 1; e.boxes = []; e.attack = null; }
    return true;
  }

  function towards(e, hero) { return hero.x > e.x ? 1 : -1; }
  function dist(e, hero) { var dx = hero.x - e.x, dy = (hero.y - 11) - (e.spec.flying ? e.y : e.y - e.h / 2); return Math.sqrt(dx * dx + dy * dy); }
  // is there floor ahead, and no wall?
  function edgeAhead(e, ctx) {
    var ax = e.x + e.dir * (e.w / 2 + 2), ty = Math.floor((e.y + 2) / 16), tx = Math.floor(ax / 16);
    var below = ctx.tileAt(tx, ty), ahead = ctx.tileAt(tx, ty - 1);
    return (below !== 1 && below !== 2) || ahead === 1;
  }

  function beginAttack(e, A, ctx) {
    e.attack = { def: A, t: 0, phase: 'windup' };
    e.dir = towards(e, ctx.hero); e.hitHero = false; e.boxes = [];
    if (A.start) A.start(e, ctx);
  }
  function stepAttack(e, ctx) {
    var a = e.attack, A = a.def, F = e.spec.frames;
    var w = Math.round(A.windup * (e.elder ? 0.85 : 1)), act = A.active, rec = A.recover;
    a.t++;
    if (a.t <= w) {
      a.phase = 'windup'; e.anim = 'windup'; e.frame = Math.min(F.windup.length - 1, Math.floor((a.t - 1) / w * F.windup.length));
      if (A.telling) A.telling(e, ctx, a.t, w);
    } else if (a.t <= w + act) {
      if (a.phase !== 'active') { a.phase = 'active'; if (A.fire) A.fire(e, ctx); }
      e.anim = 'attack'; e.frame = Math.min(F.attack.length - 1, Math.floor((a.t - w - 1) / act * F.attack.length));
      e.boxes = A.box ? A.box(e, a.t - w, ctx) : [];
      if (A.during) A.during(e, ctx, a.t - w);
    } else if (a.t <= w + act + rec) {
      a.phase = 'recover'; e.boxes = [];
      e.anim = a.t - w - act < rec * 0.4 ? 'attack' : 'walk'; e.frame = e.anim === 'attack' ? F.attack.length - 1 : 0;
      if (A.resting) A.resting(e, ctx, a.t - w - act);
    } else {
      e.attack = null; e.boxes = []; e.cooldown = Math.round(A.cooldown * (e.elder ? 0.75 : 1));
      if (A.end) A.end(e, ctx);
    }
  }
  // which attack, if any, the creature will begin: the first whose range the Warden stands in
  function chooseAttack(e, ctx, sees) {
    if (!sees || e.cooldown > 0 || e.hurt > 0) return null;
    var hero = ctx.hero, dx = Math.abs(hero.x - e.x), dy = (hero.y - 11) - (e.spec.flying ? e.y : e.y - e.h / 2), list = e.spec.attacks;
    for (var k = 0; k < list.length; k++) {
      var A = list[k];
      if (A.elderOnly && !e.elder) continue;
      if (dx >= A.range[0] * e.size && dx <= A.range[1] * e.size && dy >= (A.above === undefined ? -28 : -A.above) && dy <= (A.below === undefined ? 28 : A.below)) {
        if (A.chance && ctx.random() > A.chance) continue;
        if (A.grounded && !e.onGround) continue;
        return A;
      }
    }
    return null;
  }

  function step(e, ctx) {
    var hero = ctx.hero, K = e.spec;
    if (e.dying) { e.dying++; e.boxes = []; return; }
    if (e.hurt > 0) e.hurt--;
    if (e.flash > 0) e.flash--;
    if (e.cooldown > 0) e.cooldown--;
    if (e.status.burn > 0) { e.status.burn--; if (e.status.burn % 40 === 0) { e.hp -= (e.status.burnDamage || 1); ctx.spark(e.x, e.y - e.h / 2, '#ff8c42', 4, 1, 16, -0.02); if (e.hp <= 0) { e.hp = 0; e.dying = 1; return; } } }
    if (e.status.poison > 0) { e.status.poison--; if (e.status.poison % 50 === 0) { e.hp -= 1; ctx.spark(e.x, e.y - e.h / 2, '#9ae66e', 3, 0.8, 16, -0.01); if (e.hp <= 0) { e.hp = 0; e.dying = 1; return; } } }
    var frozen = e.status.freeze > 0, shocked = e.status.shock > 0;
    if (frozen) e.status.freeze--;
    if (shocked) e.status.shock--;
    var d = dist(e, hero), sees = d < K.sight && hero.alive;
    if (sees) e.seen = true;
    e.clock++;
    if (frozen) { e.boxes = []; if (!K.flying) { e.vx = 0; e.vy = Math.min(5, e.vy + 0.32); ctx.moveBody(e); } return; }
    var slow = shocked ? 0.4 : 1;
    if (e.attack) {
      stepAttack(e, ctx);
      if (!K.flying) { e.vy = Math.min(5, e.vy + 0.32); if (!(e.attack && e.attack.def.moves)) e.vx *= 0.8; var t = ctx.moveBody(e); e.onGround = t.floor; if (t.wall && e.attack && e.attack.def.moves) e.vx = 0; }
      else { e.x += e.vx; e.y += e.vy; if (!(e.attack && e.attack.def.moves)) { e.vx *= 0.85; e.vy *= 0.85; } }
    } else {
      var A = chooseAttack(e, ctx, sees);
      if (A) beginAttack(e, A, ctx);
      else {
        MOVES[K.move](e, ctx, sees, d, slow);
        var rate = K.flying ? 6 : 8;
        e.anim = e.hurt > 0 ? 'hurt' : 'walk';
        if (e.clock % rate === 0) e.frame = (e.frame + 1) % K.frames.walk.length;
        if (e.anim === 'hurt') e.frame = 0;
      }
    }
    if (K.always) K.always(e, ctx);
  }

  /* ---- ways of getting about ---- */

  var MOVES = {
    // on foot, turning at edges, toward the Warden when it sees her, stopping just short
    walk: function (e, ctx, sees, d, slow) {
      var hero = ctx.hero, K = e.spec, speed = K.speed * slow;
      e.vy = Math.min(5, e.vy + 0.32);
      if (e.hurt > 0) e.vx *= 0.85;
      else {
        if (sees) e.dir = towards(e, hero);
        if (e.onGround && edgeAhead(e, ctx)) { if (sees) { e.vx = 0; } else e.dir = -e.dir; }
        var keep = K.keep || 18;
        e.vx = sees && Math.abs(hero.x - e.x) < keep ? 0 : e.dir * speed * (sees ? 1.5 : 1);
        if (e.onGround && edgeAhead(e, ctx)) e.vx = 0;
      }
      var t = ctx.moveBody(e); e.onGround = t.floor;
      if (t.wall && !sees) e.dir = -e.dir;
    },
    // in hops: sits, then hops along its patrol or toward the Warden
    hop: function (e, ctx, sees, d, slow) {
      var hero = ctx.hero, speed = e.spec.speed * slow;
      e.vy = Math.min(5, e.vy + 0.32);
      if (e.hurt > 0) e.vx *= 0.85;
      else if (e.onGround) {
        e.vx *= 0.6;
        if (e.wait > 0) e.wait--;
        else { e.dir = sees ? towards(e, hero) : e.dir; if (edgeAhead(e, ctx)) e.dir = -e.dir; if (!edgeAhead(e, ctx)) { e.vx = e.dir * speed * 2.2; e.vy = sees ? -3.2 : -2.4; } e.wait = sees ? 30 : 55; }
      }
      var t = ctx.moveBody(e); e.onGround = t.floor;
      if (t.wall) e.dir = -e.dir;
    },
    // in the air: drifting to a place above and beside the Warden, or home, with a slow bob
    hover: function (e, ctx, sees, d, slow) {
      var hero = ctx.hero, K = e.spec, speed = K.speed * slow;
      if (e.hurt > 0) { e.vx *= 0.9; e.vy *= 0.9; }
      else {
        var tx = sees ? hero.x - towards(e, hero) * (K.stand || 46) : e.home.x, ty = sees ? hero.y - (K.height || 42) : e.home.y;
        e.vx += (tx - e.x) * 0.004 * speed + Math.sin(e.clock * 0.05) * 0.02; e.vy += (ty - e.y) * 0.004 * speed + Math.cos(e.clock * 0.07) * 0.02;
        e.vx *= 0.93; e.vy *= 0.93;
        var cap = speed * 1.4; if (Math.abs(e.vx) > cap) e.vx = cap * (e.vx > 0 ? 1 : -1); if (Math.abs(e.vy) > cap) e.vy = cap * (e.vy > 0 ? 1 : -1);
        if (sees) e.dir = towards(e, hero); else if (Math.abs(e.vx) > 0.1) e.dir = e.vx > 0 ? 1 : -1;
      }
      var nx = e.x + e.vx, ny = e.y + e.vy;
      if (ctx.tileAt(Math.floor(nx / 16), Math.floor(e.y / 16)) === 1) { e.vx = -e.vx * 0.5; nx = e.x; }
      if (ctx.tileAt(Math.floor(e.x / 16), Math.floor(ny / 16)) === 1) { e.vy = -e.vy * 0.5; ny = e.y; }
      e.x = nx; e.y = ny;
    }
  };

  window.Actors = { KINDS: KINDS, BY_ELEMENT: BY_ELEMENT, build: build, spawn: spawn, make: make, step: step, hurt: hurt, hurtBoxes: hurtBoxes, statusName: statusName, STATUS: STATUS };
})();
