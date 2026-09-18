/* actors.js: what lives in the undercroft, and how it behaves.

   Ten creatures, two to an element: a walker that keeps to the floor and a
   flyer that does not. Each is text art compiled by pixels.js, a few
   frames, and a small behaviour: patrol, hop, slide, charge or blink toward
   the Warden; dive, shoot, zap or drop at her. Arenas get an elder, the
   walker grown half again with three times the life. Each creature carries
   its element's touch: ember burns, frost chills, storm shocks, bloom
   poisons, the void drains the lantern.

   The behaviours are written against a small set of engine helpers handed
   in by undercroft.js (moving bodies, tiles, sparks, lights, hurting the
   Warden, projectiles), so the creatures know nothing of the canvas. */
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

  var SPRITES = null;
  function build() {
    if (SPRITES) return SPRITES;
    SPRITES = {};
    Object.keys(KINDS).forEach(function (name) {
      var kind = KINDS[name], pal = {}, base = window.Pixels.PALETTE, over = PALETTES[kind.element], key;
      for (key in base) pal[key] = base[key];
      for (key in over) pal[key] = over[key];
      var art = ART[kind.art];
      SPRITES[name] = { walk: art.walk.map(function (rows) { return window.Pixels.art(rows, pal); }), attack: art.attack.map(function (rows) { return window.Pixels.art(rows, pal); }) };
      SPRITES[name].flipped = { walk: SPRITES[name].walk.map(window.Pixels.flipH), attack: SPRITES[name].attack.map(window.Pixels.flipH) };
    });
    return SPRITES;
  }

  /* ---- the kinds ---- */

  var STATUS = {
    ember: { name: 'burn', time: 180, colour: '#ff8c42' },
    frost: { name: 'chill', time: 200, colour: '#9fd8ff' },
    storm: { name: 'shock', time: 90, colour: '#8fa3ff' },
    bloom: { name: 'poison', time: 360, colour: '#9ae66e' },
    void:  { name: 'drain', time: 1, colour: '#a48cff' }
  };
  function statusName(element) { return STATUS[element].name; }

  var KINDS = {
    cinder:  { element: 'ember', art: 'cinder', flying: false, w: 12, h: 8,  hp: 6,  damage: 1, speed: 0.6, move: 'hop',    attack: 'contact', sight: 110 },
    wisp:    { element: 'ember', art: 'wisp',   flying: true,  w: 8,  h: 10, hp: 4,  damage: 1, speed: 0.9, move: 'hover',  attack: 'dive',    sight: 130 },
    crawler: { element: 'frost', art: 'crawler', flying: false, w: 14, h: 8, hp: 8,  damage: 1, speed: 0.35, move: 'slide', attack: 'contact', sight: 90 },
    moth:    { element: 'frost', art: 'moth',   flying: true,  w: 10, h: 9,  hp: 4,  damage: 1, speed: 0.7, move: 'hover',  attack: 'shoot',   sight: 150 },
    hound:   { element: 'storm', art: 'hound',  flying: false, w: 14, h: 9,  hp: 7,  damage: 1, speed: 0.9, move: 'charge', attack: 'contact', sight: 140 },
    bat:     { element: 'storm', art: 'bat',    flying: true,  w: 12, h: 7,  hp: 4,  damage: 1, speed: 1.0, move: 'hover',  attack: 'zap',     sight: 120 },
    toad:    { element: 'bloom', art: 'toad',   flying: false, w: 12, h: 8,  hp: 8,  damage: 1, speed: 0.5, move: 'hop',    attack: 'contact', sight: 100 },
    spore:   { element: 'bloom', art: 'spore',  flying: true,  w: 8,  h: 9,  hp: 4,  damage: 1, speed: 0.6, move: 'hover',  attack: 'drop',    sight: 120 },
    shade:   { element: 'void',  art: 'shade',  flying: false, w: 10, h: 13, hp: 9,  damage: 1, speed: 0.55, move: 'blink', attack: 'contact', sight: 150 },
    eye:     { element: 'void',  art: 'eye',    flying: true,  w: 10, h: 9,  hp: 6,  damage: 1, speed: 0.5, move: 'hover',  attack: 'beam',    sight: 170 }
  };
  var BY_ELEMENT = { ember: ['cinder', 'wisp'], frost: ['crawler', 'moth'], storm: ['hound', 'bat'], bloom: ['toad', 'spore'], void: ['shade', 'eye'] };

  // a creature for a spawn point: the element's walker or flyer, an elder for arenas
  function spawn(point, element, floor, rnd) {
    var pair = BY_ELEMENT[element], name = (point.kind === 'flyer' || point.kind === 'perch') ? pair[1] : pair[0];
    var kind = KINDS[name], elder = point.kind === 'brute', scale = 1 + (floor - 1) * 0.25;
    return {
      kind: name, spec: kind, element: element, elder: elder,
      x: point.x * 16 + 8, y: point.y * 16 - (kind.flying ? 28 : 0), vx: 0, vy: 0, w: kind.w * (elder ? 1.5 : 1), h: kind.h * (elder ? 1.5 : 1),
      hp: Math.round(kind.hp * scale * (elder ? 3 : 1)), maxHp: Math.round(kind.hp * scale * (elder ? 3 : 1)), damage: kind.damage + (elder ? 1 : 0),
      dir: rnd() < 0.5 ? -1 : 1, onGround: false, clock: Math.floor(rnd() * 60), frame: 0, anim: 'walk', state: 'idle', wait: 0, cooldown: 60, hurt: 0, flash: 0, dying: 0, home: { x: point.x * 16 + 8, y: point.y * 16 - 28 }, drop: 0,
      status: {}, seen: false
    };
  }

  // hurt a creature: knockback, a flash, and death when its life is gone
  function hurt(e, damage, fromX, ctx) {
    if (e.dying) return false;
    e.hp -= damage; e.hurt = 10; e.flash = 4;
    e.vx = (e.x < fromX ? -1 : 1) * (e.spec.flying ? 1.6 : 1.2); if (!e.spec.flying) e.vy = Math.min(e.vy, -1.4);
    if (e.state === 'charge') e.state = 'idle';
    if (e.hp <= 0) { e.hp = 0; e.dying = 1; }
    return true;
  }

  function towards(e, hero) { return hero.x > e.x ? 1 : -1; }
  function dist(e, hero) { var dx = hero.x - e.x, dy = (hero.y - 11) - (e.y - e.h / 2); return Math.sqrt(dx * dx + dy * dy); }
  // is there floor ahead, and no wall?
  function edgeAhead(e, ctx) {
    var ax = e.x + e.dir * (e.w / 2 + 2), ty = Math.floor((e.y + 2) / 16), tx = Math.floor(ax / 16);
    var below = ctx.tileAt(tx, ty), ahead = ctx.tileAt(tx, ty - 1);
    return (below !== 1 && below !== 2) || ahead === 1;
  }

  function step(e, ctx) {
    var hero = ctx.hero, spec = e.spec, k;
    if (e.dying) { e.dying++; return; }
    if (e.hurt > 0) e.hurt--;
    if (e.flash > 0) e.flash--;
    if (e.cooldown > 0) e.cooldown--;
    // statuses laid on the creature by the Warden's powers
    if (e.status.burn > 0) { e.status.burn--; if (e.status.burn % 40 === 0) { e.hp -= 1; ctx.spark(e.x, e.y - e.h / 2, '#ff8c42', 4, 1, 16, -0.02); if (e.hp <= 0) { e.hp = 0; e.dying = 1; return; } } }
    if (e.status.poison > 0) { e.status.poison--; if (e.status.poison % 50 === 0) { e.hp -= 1; ctx.spark(e.x, e.y - e.h / 2, '#9ae66e', 3, 0.8, 16, -0.01); if (e.hp <= 0) { e.hp = 0; e.dying = 1; return; } } }
    var frozen = e.status.freeze > 0, shocked = e.status.shock > 0;
    if (frozen) e.status.freeze--;
    if (shocked) e.status.shock--;
    var d = dist(e, hero), sees = d < spec.sight && hero.alive;
    if (sees) e.seen = true;
    e.clock++;
    if (frozen) { if (!spec.flying) { e.vx = 0; e.vy = Math.min(5, e.vy + 0.32); ctx.moveBody(e); } return; }
    var slow = shocked ? 0.4 : 1;
    if (spec.flying) stepFlyer(e, ctx, sees, d, slow);
    else stepWalker(e, ctx, sees, d, slow);
    // touching the Warden
    if (hero.alive && e.state !== 'hurt' && Math.abs(e.x - hero.x) < (e.w + hero.w) / 2 && hero.y > e.y - e.h && hero.y - hero.h < e.y) {
      if (ctx.hurtHero(e.x, e.damage)) ctx.afflict(e.element);
    }
    // the animation
    var rate = e.state === 'charge' || e.state === 'dive' ? 4 : spec.flying ? 6 : 9;
    e.anim = (e.state === 'windup' || e.state === 'charge' || e.state === 'dive' || e.state === 'shoot') ? 'attack' : 'walk';
    var frames = e.anim === 'attack' ? 1 : (e.kind === 'wisp' ? 3 : 2);
    if (e.clock % rate === 0) e.frame = (e.frame + 1) % frames;
  }

  function stepWalker(e, ctx, sees, d, slow) {
    var hero = ctx.hero, spec = e.spec, speed = spec.speed * slow * (e.elder ? 0.8 : 1);
    e.vy = Math.min(5, e.vy + 0.32);
    if (e.hurt > 0) { e.vx *= 0.85; }
    else if (spec.move === 'hop') {
      // a beetle or a toad: sits, then hops toward the Warden or along its patrol
      if (e.onGround) {
        e.vx *= 0.6;
        if (e.wait > 0) e.wait--;
        else { e.dir = sees ? towards(e, hero) : (edgeAhead(e, ctx) ? -e.dir : e.dir); if (!sees && edgeAhead(e, ctx)) e.dir = -e.dir; e.vx = e.dir * speed * 2.2; e.vy = sees ? -3.4 : -2.4; e.wait = sees ? 22 : 50; }
      }
    } else if (spec.move === 'slide') {
      if (e.onGround && edgeAhead(e, ctx)) e.dir = -e.dir;
      if (sees && e.onGround) e.dir = towards(e, hero);
      e.vx = e.dir * speed * (sees ? 1.8 : 1);
    } else if (spec.move === 'charge') {
      if (e.state === 'charge') { e.vx = e.dir * speed * 3.2; if (--e.wait <= 0 || (e.onGround && edgeAhead(e, ctx))) { e.state = 'idle'; e.cooldown = 70; } }
      else if (e.state === 'windup') { e.vx *= 0.7; if (--e.wait <= 0) { e.state = 'charge'; e.wait = 34; ctx.spark(e.x, e.y - 4, '#8fa3ff', 8, 1.4, 14, 0); } }
      else {
        if (e.onGround && edgeAhead(e, ctx)) e.dir = -e.dir;
        e.vx = e.dir * speed * 0.8;
        if (sees && e.cooldown <= 0 && Math.abs(hero.y - e.y) < 24) { e.state = 'windup'; e.wait = 24; e.dir = towards(e, hero); }
      }
    } else if (spec.move === 'blink') {
      if (e.onGround && edgeAhead(e, ctx)) e.dir = -e.dir;
      if (sees) e.dir = towards(e, hero);
      e.vx = e.dir * speed;
      // now and then it is simply nearer, with a breath of dark
      if (sees && e.cooldown <= 0 && d > 40) {
        var nx = hero.x - towards(e, hero) * 26, ty = Math.floor((e.y - 1) / 16), tx = Math.floor(nx / 16);
        if (ctx.tileAt(tx, ty) === 0 && ctx.tileAt(tx, ty - 1) === 0 && (ctx.tileAt(tx, ty + 1) === 1 || ctx.tileAt(tx, ty + 1) === 2)) {
          ctx.spark(e.x, e.y - 8, '#a48cff', 10, 1.2, 20, -0.02);
          e.x = nx; e.state = 'windup'; e.wait = 10;
          ctx.spark(e.x, e.y - 8, '#a48cff', 10, 1.2, 20, -0.02);
        }
        e.cooldown = 160;
      }
      if (e.state === 'windup' && --e.wait <= 0) e.state = 'idle';
    }
    var touched = ctx.moveBody(e);
    e.onGround = touched.floor;
    if (touched.wall && e.state !== 'charge') e.dir = -e.dir;
  }

  function stepFlyer(e, ctx, sees, d, slow) {
    var hero = ctx.hero, spec = e.spec, speed = spec.speed * slow, tx, ty;
    if (e.hurt > 0) { e.vx *= 0.9; e.vy *= 0.9; }
    else if (e.state === 'dive') {
      // a wisp falls on the Warden and climbs away again
      if (--e.wait <= 0) { e.state = 'idle'; e.cooldown = 90; }
    } else if (e.state === 'shoot') {
      e.vx *= 0.8; e.vy *= 0.8;
      if (--e.wait === 8) shoot(e, ctx);
      if (e.wait <= 0) { e.state = 'idle'; e.cooldown = spec.attack === 'beam' ? 150 : 110; }
    } else {
      // hovering: drift toward a point above the Warden, or home, with a slow bob
      tx = sees ? hero.x - towards(e, hero) * (spec.attack === 'dive' ? 10 : 46) : e.home.x;
      ty = sees ? hero.y - (spec.attack === 'drop' ? 60 : 40) : e.home.y;
      e.vx += (tx - e.x) * 0.004 * speed + Math.sin(e.clock * 0.05) * 0.02; e.vy += (ty - e.y) * 0.004 * speed + Math.cos(e.clock * 0.07) * 0.02;
      e.vx *= 0.93; e.vy *= 0.93;
      var cap = speed * 1.4; if (Math.abs(e.vx) > cap) e.vx = cap * (e.vx > 0 ? 1 : -1); if (Math.abs(e.vy) > cap) e.vy = cap * (e.vy > 0 ? 1 : -1);
      if (e.vx !== 0) e.dir = e.vx > 0 ? 1 : -1;
      if (sees && e.cooldown <= 0) {
        if (spec.attack === 'dive') { e.state = 'dive'; e.wait = 40; var dx = hero.x - e.x, dy = hero.y - 10 - e.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy)); e.vx = dx / len * 3.2; e.vy = dy / len * 3.2; }
        else { e.state = 'shoot'; e.wait = 24; }
      }
    }
    // flyers slide along stone rather than stopping
    var nx = e.x + e.vx, ny = e.y + e.vy;
    if (ctx.tileAt(Math.floor(nx / 16), Math.floor((e.y - e.h / 2) / 16)) === 1) { e.vx = -e.vx * 0.5; nx = e.x; }
    if (ctx.tileAt(Math.floor(e.x / 16), Math.floor((ny - e.h / 2) / 16)) === 1) { e.vy = -e.vy * 0.5; ny = e.y; }
    e.x = nx; e.y = ny;
    if (e.state === 'dive' && (ctx.tileAt(Math.floor(e.x / 16), Math.floor(e.y / 16)) === 1)) { e.state = 'idle'; e.cooldown = 90; e.vy = -1; }
  }

  // what a flyer sends: a shard, a bolt, a spore cloud, a beam
  function shoot(e, ctx) {
    var hero = ctx.hero, dx = hero.x - e.x, dy = hero.y - 10 - e.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    if (e.spec.attack === 'shoot') ctx.projectile({ x: e.x, y: e.y - 4, vx: dx / len * 2.2, vy: dy / len * 2.2, life: 120, colour: '#d8f1ff', size: 2, damage: 1, element: e.element, gravity: 0 });
    else if (e.spec.attack === 'drop') ctx.projectile({ x: e.x, y: e.y + 2, vx: (ctx.random() - 0.5) * 0.4, vy: 0.3, life: 150, colour: '#9ae66e', size: 3, damage: 1, element: e.element, gravity: 0.01, cloud: true });
    else if (e.spec.attack === 'zap') { if (len < 70) { ctx.zap(e.x, e.y - 3, hero.x, hero.y - 11, '#8fa3ff'); if (ctx.hurtHero(e.x, e.damage)) ctx.afflict(e.element); } }
    else if (e.spec.attack === 'beam') ctx.projectile({ x: e.x, y: e.y - 4, vx: dx / len * 1.4, vy: dy / len * 1.4, life: 200, colour: '#a48cff', size: 3, damage: 2, element: e.element, gravity: 0, seek: 0.03 });
  }

  window.Actors = { KINDS: KINDS, build: build, spawn: spawn, step: step, hurt: hurt, statusName: statusName, STATUS: STATUS };
})();
