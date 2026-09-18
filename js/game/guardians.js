/* guardians.js: the ones that wait at the foot of each floor.

   This file is the ground they stand on: the registry a guardian's own
   file writes itself into, the rig that builds its frames from parts, the
   clock of an attack (a wind-up that tells, the live steps, a recovery),
   the marks on its bar where it changes, and the boxes it is struck in.
   The Kiln Golem has its own file. Until theirs are written, the wyrm,
   the herald and the mirror below are the older, simpler kind. */
(function () {
  'use strict';

  /* ---- the art ---- */

  var PALETTES = {
    ember: { k: '#1a0806', p: '#5a3e38', q: '#3a2a28', l: '#ff6a2b', e: '#ffdc9a', w: '#ffb347', m: '#8a6a5c' },
    frost: { k: '#0a1220', p: '#9fd8ff', q: '#3f6f94', l: '#ffffff', e: '#3d5bff', w: '#d8f1ff', m: '#6f83a0' },
    storm: { k: '#0e0a1c', p: '#443e58', q: '#2e2a3c', l: '#a48cff', e: '#ffffff', w: '#8fa3ff', m: '#7a7099' },
    bloom: { k: '#06120a', p: '#365040', q: '#243328', l: '#9ae66e', e: '#ff4f7b', w: '#c5ff9a', m: '#5e8a66' },
    void:  { k: '#000000', p: '#1e1a2c', q: '#0d0b14', l: '#5b3fa0', e: '#ffffff', w: '#a48cff', m: '#2b2836' }
  };

  var ART = {
    wyrm: {
      idle: [
        ['..............kkkk..............', '............kkppppkk............', '...........kpppwwpppk...........', '..........kppwwlleppk...........', '.........kppwwlllleppkk.........', '........kppwwwllllpppppkk.......', '.......kppwwwwllllpppppppkk.....', '......kppwwwwwllllpppppppppkk...', '.....kqqpwwwwwlllppppppqqqppppk.', '....kqqqppwwwwllppppppqqqqqpppk.', '...kqqqqpppwwwlppppppqqqqqpppk..', '..kqqqqqppppppppppppqqqqqpppk...', '.kqqqqqqpppppppppppqqqqqpppk....', 'kqqqqqqqppppppppppqqqqqpppk.....', 'kkkkkkkkkkkkkkkkkkkkkkkkkk......'],
        ['..............kkkk..............', '............kkppppkk............', '...........kpppwwpppk...........', '..........kppwwlleppk...........', '.........kppwwlllleppkk.........', '........kppwwwllllpppppkk.......', '.......kppwwwwllllpppppppkk.....', '......kppwwwwwllllpppppppppkk...', '.....kqqpwwwwwlllppppppqqqppppk.', '....kqqqppwwwwllppppppqqqqqpppk.', '...kqqqqpppwwwlppppppqqqqqpppk..', '..kqqqqqppppppppppppqqqqqpppkk..', '.kqqqqqqpppppppppppqqqqqppppppk.', 'kqqqqqqqppppppppppqqqqqppppppk..', 'kkkkkkkkkkkkkkkkkkkkkkkkkkkkk...']
      ],
      attack: [['..............kkkk..............', '............kkppppkk............', '...........kpppwwpppk...........', '..........kppwwlleppk...........', '.........kppwwlllleppkk.........', '..kkkkkkkppwwwllllpppppkk.......', '.klllllkppwwwwllllpppppppkk.....', 'kllllllkppwwwwwllllpppppppppkk..', 'kllllllkqqpwwwwwlllppppppqqqppppk', '.klllllkqqqppwwwwllppppppqqqqqpppk', '..kkkkkkqqqqpppwwwlppppppqqqqqpppk', '..kqqqqqppppppppppppqqqqqpppk...', '.kqqqqqqpppppppppppqqqqqpppk....', 'kqqqqqqqppppppppppqqqqqpppk.....', 'kkkkkkkkkkkkkkkkkkkkkkkkkk......']]
    },
    herald: {
      idle: [
        ['.......kkkkkk.......', '.....kkppppppkk.....', '....kppppppppppk....', '....kpppkkkkpppk....', '....kppkeekkeekppk..', '.....kkpppppppkk....', '......kppppppk......', '.....kppplllppk.....', '....kppplllllppk....', '...kppplllwlllppk...', '...kpppllwwwllppk...', '..kppppllwwwllpppk..', '..kpppplllwlllpppk..', '..kkkppplllllpppkkk.', '....kpppppppppppk...', '....kppppppppppk....', '.....kppppppppk.....', '......kpppppk.......', '.......kpppk........', '........kkk.........'],
        ['.......kkkkkk.......', '.....kkppppppkk.....', '....kppppppppppk....', '....kpppkkkkpppk....', '....kppkeekkeekppk..', '.....kkpppppppkk....', '......kppppppk......', '.....kppplllppk.....', '....kppplllllppk....', '...kppplllwlllppk...', '...kpppllwwwllppk...', '..kppppllwwwllpppk..', '..kpppplllwlllpppk..', '..kkkppplllllpppkkk.', '....kpppppppppppk...', '....kppppppppppk....', '.....kppppppppk.....', '......kpppppk.......', '......kppppk........', '.......kkkk.........']
      ],
      attack: [['.......kkkkkk.......', '.....kkppppppkk.....', '....kppppppppppk....', '....kpppkkkkpppk....', '....kppkwwkkwwkppk..', '.....kkpppppppkk....', 'kkk...kppppppk...kkk', 'kwwkkkppplllppkkkwwk', 'kwwwwwpplllllppwwwwk', 'kkkkkppplllwlllppkkk', '...kpppllwwwllppk...', '..kppppllwwwllpppk..', '..kpppplllwlllpppk..', '..kkkppplllllpppkkk.', '....kpppppppppppk...', '....kppppppppppk....', '.....kppppppppk.....', '......kpppppk.......', '.......kpppk........', '........kkk.........']]
    },
    heart: {
      idle: [
        ['....kk....kk....kk....kk....', '...kmmk..kmmk..kmmk..kmmk...', '..kmmmmkkmmmmkkmmmmkkmmmmk..', '.kmmmmmmmmmmmmmmmmmmmmmmmmk.', '.kmmppppmmmmmmmmmmmmppppmmk.', 'kmmppppppmmmmmmmmmmppppppmmk', 'kmpppeepppmmmmmmmmpppeepppmk', 'kmppeeeeppmmmmmmmmppeeeeppmk', 'kmpppeepppppmmmmpppppeepppmk', '.kmpppppppppppppppppppppmk..', '..kmmppppppppppppppppppmk...', '...kmmmpppppppppppppppmk....', '....kmmmmpppppppppppmk......', '.....kmmmmmpppppppmmk.......', '......kmmmmmmpppmmmk........', '.......kkmmmmmmmmkk.........', '.........kkmmmmkk...........', '...........kkkk.............'],
        ['....kk....kk....kk....kk....', '...kmmk..kmmk..kmmk..kmmk...', '..kmmmmkkmmmmkkmmmmkkmmmmk..', '.kmmmmmmmmmmmmmmmmmmmmmmmmk.', '.kmmpppppmmmmmmmmmmmpppppmk.', 'kmmpppppppmmmmmmmmmpppppppmk', 'kmppppeeppppmmmmmmppppeeppmk', 'kmpppeeeepppmmmmmmpppeeeepmk', 'kmppppeeppppppmmppppppeeppmk', '.kmppppppppppppppppppppppmk.', '..kmmppppppppppppppppppmk...', '...kmmmpppppppppppppppmk....', '....kmmmmpppppppppppmk......', '.....kmmmmmpppppppmmk.......', '......kmmmmmmpppmmmk........', '.......kkmmmmmmmmkk.........', '.........kkmmmmkk...........', '...........kkkk.............']
      ],
      attack: [['....kk....kk....kk....kk....', '...kllk..kllk..kllk..kllk...', '..kllllkkllllkkllllkkllllk..', '.kmmmmmmmmmmmmmmmmmmmmmmmmk.', '.kmmppppmmmmmmmmmmmmppppmmk.', 'kmmppppppmmmmmmmmmmppppppmmk', 'kmpppwwpppmmmmmmmmpppwwpppmk', 'kmppwwwwppmmmmmmmmppwwwwppmk', 'kmpppwwpppppmmmmpppppwwpppmk', '.kmpppppppppppppppppppppmk..', '..kmmppppppppppppppppppmk...', '...kmmmpppppppppppppppmk....', '....kmmmmpppppppppppmk......', '.....kmmmmmpppppppmmk.......', '......kmmmmmmpppmmmk........', '.......kkmmmmmmmmkk.........', '.........kkmmmmkk...........', '...........kkkk.............']]
    }
  };

  var SPRITES = null;
  function build() {
    if (SPRITES) return SPRITES;
    SPRITES = {};
    Object.keys(ART).forEach(function (name) {
      var el = KINDS[name].element, pal = {}, base = window.Pixels.PALETTE, over = PALETTES[el], key;
      for (key in base) pal[key] = base[key];
      for (key in over) pal[key] = over[key];
      var A = window.Pixels.art;
      SPRITES[name] = { idle: ART[name].idle.map(function (r) { return A(r, pal); }), attack: ART[name].attack.map(function (r) { return A(r, pal); }) };
      SPRITES[name].flipped = { idle: SPRITES[name].idle.map(window.Pixels.flipH), attack: SPRITES[name].attack.map(window.Pixels.flipH) };
    });
    // the mirror wears the Warden's own frames, in the void's colours, with one white eye
    var W = window.Pixels.warden.build(), mirror = { idle: [], attack: [], flipped: { idle: [], attack: [] } };
    function shade(img) {
      var c = window.Pixels.silhouette(img, '#1e1a2c'), g = c.getContext('2d');
      g.fillStyle = '#ffffff'; g.fillRect(37, 29, 1, 1);
      g.fillStyle = '#5b3fa0'; g.fillRect(28, 42, 5, 4);
      return c;
    }
    mirror.idle = W.idle.map(shade); mirror.attack = W.attack1.map(shade).concat(W.attack3.map(shade)); mirror.dash = W.dash.map(shade); mirror.cast = W.cast.map(shade);
    mirror.flipped.idle = mirror.idle.map(window.Pixels.flipH); mirror.flipped.attack = mirror.attack.map(window.Pixels.flipH); mirror.flipped.dash = mirror.dash.map(window.Pixels.flipH); mirror.flipped.cast = mirror.cast.map(window.Pixels.flipH);
    SPRITES.mirror = mirror;
    return SPRITES;
  }

  /* ---- the kinds and their patterns ---- */

  var KINDS = {
    wyrm:   { element: 'frost', name: 'The Frost Wyrm',  w: 30, h: 14, hp: 50, flying: true,  damage: 1 },
    herald: { element: 'storm', name: 'The Storm Herald', w: 14, h: 26, hp: 45, flying: true,  damage: 1 },
    heart:  { element: 'bloom', name: 'The Bramble Heart', w: 26, h: 18, hp: 70, flying: false, damage: 1 },
    mirror: { element: 'void',  name: 'The Void Mirror',  w: 10, h: 22, hp: 55, flying: false, damage: 2 }
  };
  var BY_FLOOR = ['golem', 'wyrm', 'herald', 'mirror'];

  function legacySpawn(floor, arena, rnd) {
    var kind = BY_FLOOR[Math.max(0, Math.min(3, floor - 1))], spec = KINDS[kind];
    var scale = 1 + (floor - 1) * 0.15;
    return {
      boss: true, kind: kind, spec: spec, element: spec.element, name: spec.name,
      x: arena.bossX, y: spec.flying ? arena.groundY - 70 : arena.groundY, vx: 0, vy: 0, w: spec.w, h: spec.h,
      hp: Math.round(spec.hp * scale), maxHp: Math.round(spec.hp * scale), damage: spec.damage,
      dir: -1, onGround: false, clock: 0, frame: 0, anim: 'idle', state: 'wake', wait: 60, cooldown: 90, hurt: 0, flash: 0, dying: 0, phase: 0, status: {}, seen: true, elder: true,
      home: { x: arena.bossX, y: arena.groundY - 70 }, arena: arena, healed: false, drop: 0
    };
  }

  function towards(e, hero) { return hero.x > e.x ? 1 : -1; }

  function legacyStep(e, ctx) {
    var hero = ctx.hero, A = e.arena;
    if (e.dying) { e.dying++; if (e.dying % 6 === 0) ctx.spark(e.x + (ctx.random() - 0.5) * e.w, e.y - ctx.random() * e.h, '#ffffff', 6, 1.5, 20, 0); return; }
    if (e.hurt > 0) e.hurt--;
    if (e.flash > 0) e.flash--;
    if (e.cooldown > 0) e.cooldown--;
    e.clock++;
    // the second wind: at a third of its life, it changes
    if (!e.phase && e.hp > 0 && e.hp < e.maxHp * 0.4) { e.phase = 1; ctx.spark(e.x, e.y - e.h / 2, '#ffffff', 40, 2.5, 40, 0); ctx.shake(4); if (e.kind === 'heart' && !e.healed) { e.healed = true; e.hp = Math.min(e.maxHp, e.hp + 12); } }
    if (e.status.freeze > 0) e.status.freeze = Math.min(e.status.freeze - 1, 24);
    if (e.status.burn > 0) { e.status.burn--; if (e.status.burn % 40 === 0) { e.hp -= (e.status.burnDamage || 1); ctx.spark(e.x, e.y - e.h / 2, '#ff8c42', 4, 1, 16, -0.02); } }
    if (e.status.poison > 0) { e.status.poison--; if (e.status.poison % 50 === 0) { e.hp -= 1; } }
    if (e.status.shock > 0) e.status.shock--;
    if (e.hp <= 0) { e.hp = 0; e.dying = 1; return; }
    var quick = e.phase ? 0.6 : 1;
    if (e.state === 'wake') { if (--e.wait <= 0) e.state = 'idle'; return; }
    if (e.status.freeze > 0) { if (!e.spec.flying) { e.vx = 0; e.vy = Math.min(5, e.vy + 0.32); ctx.moveBody(e); } return; }
    PATTERNS[e.kind](e, ctx, quick);
    // touching the Warden
    if (hero.alive && !e.spec.flying && Math.abs(e.x - hero.x) < (e.w + hero.w) / 2 && hero.y > e.y - e.h && hero.y - hero.h < e.y) { if (ctx.hurtHero(e.x, e.damage, e)) ctx.afflict(e.element); }
    if (hero.alive && e.spec.flying && e.state === 'swoop' && Math.abs(e.x - hero.x) < e.w / 2 + hero.w / 2 && Math.abs((e.y - e.h / 2) - (hero.y - hero.h / 2)) < (e.h + hero.h) / 2) { if (ctx.hurtHero(e.x, e.damage, e)) ctx.afflict(e.element); }
    var rate = e.state === 'idle' || e.state === 'walk' ? 14 : 6;
    if (e.clock % rate === 0) e.frame = (e.frame + 1) % 2;
  }

  var PATTERNS = {
    wyrm: function (e, ctx, quick) {
      var hero = ctx.hero, A = e.arena, tx, ty;
      if (e.state === 'idle') {
        e.anim = 'idle';
        tx = hero.x - towards(e, hero) * 60; ty = A.groundY - 64 + Math.sin(e.clock * 0.04) * 14;
        e.vx += (tx - e.x) * 0.003; e.vy += (ty - e.y) * 0.004; e.vx *= 0.94; e.vy *= 0.94;
        if (Math.abs(e.vx) > 0.3) e.dir = e.vx > 0 ? 1 : -1;
        if (e.cooldown <= 0) { var r = ctx.random(); e.state = r < 0.4 ? 'swoop' : r < 0.7 ? 'hail' : 'breath'; e.wait = 36; }
      } else if (e.state === 'swoop') {
        e.anim = 'attack';
        if (e.wait > 0) { e.vx *= 0.9; e.vy *= 0.9; if (e.wait === 36) { e.dir = towards(e, hero); e.swoopY = hero.y - 10; ctx.telegraph(A.left, e.swoopY - 8, A.right - A.left, 16, 36, '#9fd8ff'); } if (--e.wait === 0) { e.vx = e.dir * 5; e.vy = (e.swoopY - e.y) * 0.05; e.wait = -1; } }
        else { e.vy += (e.swoopY - (e.y - 4)) * 0.08; e.vy *= 0.8; e.wait--; if ((e.dir > 0 ? e.x > A.right - 20 : e.x < A.left + 20) || e.wait < -80) { e.state = 'idle'; e.cooldown = Math.round(120 * quick); e.vx = 0; } }
      } else if (e.state === 'hail') {
        e.anim = 'attack'; e.vx *= 0.9; e.vy *= 0.9;
        if (e.wait === 36) { e.spots = []; for (var k = 0; k < 6; k++) e.spots.push(hero.x + (ctx.random() - 0.5) * 140); e.spots.forEach(function (sx) { ctx.telegraph(sx - 3, A.groundY - 90, 6, 90, 36, '#9fd8ff'); }); }
        if (--e.wait === 0) e.spots.forEach(function (sx, i) { ctx.projectile({ x: sx, y: A.groundY - 120 - i * 10, vx: 0, vy: 1 + i * 0.3, life: 140, colour: '#d8f1ff', size: 3, damage: 1, element: 'frost', gravity: 0.06 }); });
        if (e.wait <= -20) { e.state = 'idle'; e.cooldown = Math.round(140 * quick); }
      } else if (e.state === 'breath') {
        e.anim = 'attack'; e.vx *= 0.9; e.vy *= 0.9; e.dir = towards(e, hero);
        if (e.wait === 36) ctx.telegraph(e.dir > 0 ? e.x : e.x - 70, e.y - 20, 70, 40, 36, '#9fd8ff');
        if (--e.wait <= 0 && e.wait > -40) { if (e.wait % 3 === 0) ctx.hazard({ x0: e.dir > 0 ? e.x : e.x - 70, x1: e.dir > 0 ? e.x + 70 : e.x, y0: e.y - 20, y1: e.y + 20, life: 4, damage: 1, element: 'frost', colour: '#d8f1ff' }); if (e.wait % 2 === 0) ctx.spark(e.x + e.dir * 10, e.y - 2, '#d8f1ff', 3, 2.4, 26, 0); }
        if (e.wait <= -40) { e.state = 'idle'; e.cooldown = Math.round(150 * quick); }
      }
      e.x += e.vx; e.y += e.vy;
      if (e.x < A.left + 16) { e.x = A.left + 16; e.vx = Math.abs(e.vx); } if (e.x > A.right - 16) { e.x = A.right - 16; e.vx = -Math.abs(e.vx); }
      if (e.y > A.groundY - 6) e.y = A.groundY - 6; if (e.y < 24) e.y = 24;
    },
    herald: function (e, ctx, quick) {
      var hero = ctx.hero, A = e.arena;
      if (e.state === 'idle') {
        e.anim = 'idle';
        var ty = A.groundY - 34 + Math.sin(e.clock * 0.05) * 6;
        e.vy += (ty - e.y) * 0.01; e.vy *= 0.9; e.vx *= 0.9; e.dir = towards(e, hero);
        if (e.cooldown <= 0) { var r = ctx.random(); e.state = r < 0.45 ? 'bolts' : r < 0.8 ? 'blink' : 'summon'; e.wait = 40; }
      } else if (e.state === 'blink') {
        e.anim = 'attack';
        if (--e.wait === 20) { ctx.spark(e.x, e.y - 12, '#a48cff', 20, 2, 24, 0); e.x = A.left + 30 + ctx.random() * (A.right - A.left - 60); ctx.spark(e.x, e.y - 12, '#ffffff', 20, 2, 24, 0); }
        if (e.wait <= 0) { e.state = 'idle'; e.cooldown = Math.round(70 * quick); }
      } else if (e.state === 'bolts') {
        e.anim = 'attack'; e.vx *= 0.9; e.vy *= 0.9;
        if (e.wait === 40) { e.spots = [hero.x, hero.x - 44, hero.x + 44]; if (e.phase) e.spots.push(hero.x - 88, hero.x + 88); e.spots.forEach(function (sx) { ctx.telegraph(sx - 5, 16, 10, A.groundY - 16, 40, '#8fa3ff'); }); }
        if (--e.wait === 0) e.spots.forEach(function (sx) { ctx.zap(sx, 16, sx, A.groundY, '#ffffff'); ctx.hazard({ x0: sx - 5, x1: sx + 5, y0: 16, y1: A.groundY, life: 10, damage: 1, element: 'storm', colour: '#8fa3ff' }); ctx.spark(sx, A.groundY, '#8fa3ff', 10, 1.6, 20, 0.04); });
        if (e.wait <= -30) { e.state = 'idle'; e.cooldown = Math.round(120 * quick); }
      } else if (e.state === 'summon') {
        e.anim = 'attack';
        if (--e.wait === 0) { if (ctx.count() < 5) { ctx.summon('jelly', e.x - 30, e.y - 20); ctx.summon('jelly', e.x + 30, e.y - 20); } }
        if (e.wait <= -20) { e.state = 'idle'; e.cooldown = Math.round(200 * quick); }
      }
      e.x += e.vx; e.y += e.vy;
      if (e.x < A.left + 16) e.x = A.left + 16; if (e.x > A.right - 16) e.x = A.right - 16;
    },
    heart: function (e, ctx, quick) {
      var hero = ctx.hero, A = e.arena;
      e.dir = towards(e, hero);
      if (e.state === 'idle') {
        e.anim = 'idle';
        if (e.cooldown <= 0) { var r = ctx.random(); e.state = r < 0.45 ? 'thorns' : r < 0.75 ? 'lash' : 'spores'; e.wait = 40; }
      } else if (e.state === 'thorns') {
        e.anim = 'attack';
        if (e.wait === 40) { e.spots = [hero.x, hero.x - 28, hero.x + 28]; if (e.phase) e.spots.push(hero.x - 56, hero.x + 56); e.spots.forEach(function (sx) { ctx.telegraph(sx - 8, A.groundY - 30, 16, 30, 40, '#9ae66e'); }); }
        if (--e.wait === 0) e.spots.forEach(function (sx) { ctx.hazard({ x0: sx - 8, x1: sx + 8, y0: A.groundY - 30, y1: A.groundY, life: 30, damage: 1, element: 'bloom', colour: '#9ae66e' }); ctx.spark(sx, A.groundY - 10, '#c5ff9a', 12, 1.8, 24, 0.03); });
        if (e.wait <= -30) { e.state = 'idle'; e.cooldown = Math.round(120 * quick); }
      } else if (e.state === 'lash') {
        e.anim = 'attack';
        if (e.wait === 40) ctx.telegraph(A.left, A.groundY - 12, A.right - A.left, 12, 40, '#9ae66e');
        if (--e.wait === 0) { ctx.hazard({ x0: A.left, x1: A.right, y0: A.groundY - 12, y1: A.groundY, life: 12, damage: 1, element: 'bloom', colour: '#9ae66e' }); ctx.shake(3); }
        if (e.wait <= -30) { e.state = 'idle'; e.cooldown = Math.round(130 * quick); }
      } else if (e.state === 'spores') {
        e.anim = 'attack';
        if (--e.wait === 0) for (var k = 0; k < 5; k++) ctx.projectile({ x: hero.x + (ctx.random() - 0.5) * 120, y: 20 + k * 6, vx: (ctx.random() - 0.5) * 0.4, vy: 0.4, life: 200, colour: '#9ae66e', size: 3, damage: 1, element: 'bloom', gravity: 0.008, cloud: true });
        if (e.wait <= -30) { e.state = 'idle'; e.cooldown = Math.round(160 * quick); }
      }
    },
    mirror: function (e, ctx, quick) {
      var hero = ctx.hero, A = e.arena, d = Math.abs(hero.x - e.x);
      e.vy = Math.min(5, e.vy + 0.32);
      if (e.state === 'idle') {
        e.anim = 'idle'; e.dir = towards(e, hero);
        e.vx = e.dir * (e.phase ? 1.5 : 1.15);
        if (d < 26 && e.cooldown <= 0) { e.state = 'swing'; e.wait = 14; e.vx = 0; }
        else if (e.cooldown <= 0 && d > 50 && d < 140 && ctx.random() < 0.5) { e.state = 'cast'; e.wait = 20; e.vx = 0; }
        else if (e.cooldown <= 0 && d > 60) { e.state = 'dash'; e.wait = 14; }
        if (e.onGround && hero.y < e.y - 20 && ctx.random() < 0.02) e.vy = -5.2;
      } else if (e.state === 'swing') {
        e.anim = 'attack'; e.vx *= 0.8;
        if (--e.wait === 8) ctx.hazard({ x0: e.dir > 0 ? e.x : e.x - 26, x1: e.dir > 0 ? e.x + 26 : e.x, y0: e.y - 26, y1: e.y - 2, life: 4, damage: 2, element: 'void', colour: '#a48cff' });
        if (e.wait <= 0) { e.state = 'idle'; e.cooldown = Math.round(50 * quick); }
      } else if (e.state === 'dash') {
        e.anim = 'dash'; e.vx = e.dir * 4.2; e.vy = 0;
        if (e.wait % 2 === 0) ctx.afterimage(e);
        if (--e.wait <= 0) { e.state = 'idle'; e.cooldown = Math.round(60 * quick); }
      } else if (e.state === 'cast') {
        e.anim = 'cast'; e.vx *= 0.8;
        if (--e.wait === 10) ctx.mirrorCast(e);
        if (e.wait <= 0) { e.state = 'idle'; e.cooldown = Math.round(140 * quick); }
      }
      var touched = ctx.moveBody(e); e.onGround = touched.floor;
      if (e.x < A.left + 8) e.x = A.left + 8; if (e.x > A.right - 8) e.x = A.right - 8;
    }
  };

  /* ---- the guardians proper: a rig, boxes, and a clock for every blow ----

     A guardian registers itself from its own file. Like the creatures it
     is drawn from parts placed by poses, it is struck in its hurt boxes
     (some of them soft, and worth more), and nothing about it wounds but
     the boxes of an attack: a wind-up that tells for three quarters of a
     second or longer, the live steps, and a recovery in which it is open.
     Its life is cut into phases; crossing a mark breaks whatever it was
     doing, staggers it, and changes what it does next. */

  var REG = {};
  function register(kind, def) { def.modern = true; REG[kind] = def; }
  function paletteWith(over) { var pal = {}, base = window.Pixels.PALETTE, key; for (key in base) pal[key] = base[key]; for (key in over) pal[key] = over[key]; return pal; }
  // frames from parts: anims is { name: [frame, ...] } and a frame is a list of [part, x, y, options]
  function rig(pal, parts, w, h, anchor, anims) {
    var A = window.Pixels.art, C = window.Pixels.compose, full = paletteWith(pal), imgs = {}, frames = {}, flipped = {};
    Object.keys(parts).forEach(function (n) { imgs[n] = A(parts[n], full); });
    Object.keys(anims).forEach(function (name) {
      frames[name] = anims[name].map(function (layers) {
        return C(w, h, layers.filter(Boolean).map(function (L) { return { img: imgs[L[0]], x: L[1], y: L[2], flip: L[3] && L[3].flip, rot: L[3] && L[3].rot }; }));
      });
      flipped[name] = frames[name].map(window.Pixels.flipH);
    });
    return { frames: frames, flipped: flipped, anchor: anchor, parts: imgs };
  }
  // a sparse overlay: a few marks on an empty field
  function dots(w, h, marks) {
    var rows = [], y, x;
    for (y = 0; y < h; y++) { var s = ''; for (x = 0; x < w; x++) s += '.'; rows.push(s); }
    marks.forEach(function (m) { rows[m[1]] = rows[m[1]].slice(0, m[0]) + m[2] + rows[m[1]].slice(m[0] + 1); });
    return rows;
  }

  function towardsHero(e, hero) { return hero.x > e.x ? 1 : -1; }
  // a box ahead of a guardian (negative distances are behind it), from `up` above its feet to `down` below
  function front(e, near, far, up, down) {
    var x0 = e.dir > 0 ? e.x + near : e.x - far, x1 = e.dir > 0 ? e.x + far : e.x - near;
    return { x0: x0, x1: x1, y0: e.y - up, y1: e.y + (down || 0) };
  }

  function spawn(floor, arena, rnd) {
    var kind = BY_FLOOR[Math.max(0, Math.min(3, floor - 1))], D = REG[kind];
    if (!D) return legacySpawn(floor, arena, rnd);
    var e = {
      boss: true, kind: kind, spec: D, element: D.element, name: D.name, title: D.title || '',
      x: arena.bossX, y: D.flying ? arena.groundY - 70 : arena.groundY, vx: 0, vy: 0, w: D.body.w, h: D.body.h, size: 1,
      hp: D.hp, maxHp: D.hp, dir: -1, onGround: false, clock: 0, frame: 0, anim: 'wake', state: 'wake', wait: D.wake || 110, cooldown: 30,
      hurt: 0, flash: 0, dying: 0, phase: 0, stun: 0, status: {}, seen: true, elder: true, attack: null, boxes: [], hitHero: false, vars: {}, script: 0,
      home: { x: arena.bossX, y: arena.groundY - 70 }, arena: arena, drop: 0
    };
    if (D.start) D.start(e, arena, rnd);
    return e;
  }

  function begin(e, A, ctx) {
    e.attack = { def: A, t: 0, phase: 'windup' }; e.state = A.name;
    if (!A.keepFacing) e.dir = towardsHero(e, ctx.hero);
    e.hitHero = false; e.boxes = [];
    if (A.start) A.start(e, ctx);
  }
  function frameOf(F, name, t, span, loop) {
    var n = (F[name] || F.idle).length;
    if (loop) return Math.floor(((t - 1) % loop) / loop * n);
    return Math.min(n - 1, Math.floor((t - 1) / Math.max(1, span) * n));
  }
  function clock(e, ctx) {
    var a = e.attack, A = a.def, F = e.spec.frames, w = A.windup, act = A.active, rec = A.recover;
    a.t++;
    if (a.t <= w) {
      a.phase = 'windup'; e.anim = A.anims.windup; e.frame = frameOf(F, e.anim, a.t, w);
      if (A.telling) A.telling(e, ctx, a.t, w);
    } else if (a.t <= w + act) {
      if (a.phase !== 'active') { a.phase = 'active'; if (A.fire) A.fire(e, ctx); }
      e.anim = A.anims.attack; e.frame = frameOf(F, e.anim, a.t - w, act, A.loop);
      e.boxes = A.box ? A.box(e, a.t - w, ctx) : [];
      if (A.during) A.during(e, ctx, a.t - w);
    } else if (a.t <= w + act + rec) {
      a.phase = 'recover'; e.boxes = [];
      if (A.anims.recover) { e.anim = A.anims.recover; e.frame = frameOf(F, e.anim, a.t - w - act, rec); }
      else { e.anim = A.anims.attack; e.frame = (F[e.anim] || F.idle).length - 1; }
      if (A.resting) A.resting(e, ctx, a.t - w - act);
    } else {
      e.attack = null; e.boxes = []; e.state = 'idle';
      e.cooldown = Math.round(A.cooldown * (e.spec.tempo ? e.spec.tempo(e) : 1));
      if (A.end) A.end(e, ctx);
    }
  }

  function stepModern(e, ctx) {
    var D = e.spec, F = D.frames;
    if (e.dying) {
      e.dying++; e.boxes = []; e.attack = null;
      if (e.dying === 2 && D.fall) D.fall(e, ctx);
      if (D.dyingStep) D.dyingStep(e, ctx);
      if (e.dying < 80) ctx.light(e.x, e.y - e.h / 2, 60, 0.85);
      if (F.death) { e.anim = 'death'; e.frame = Math.min(F.death.length - 1, Math.floor(e.dying / 60 * F.death.length)); }
      if (e.dying % 6 === 0 && e.dying < 64) ctx.spark(e.x + (ctx.random() - 0.5) * e.w, e.y - ctx.random() * e.h, '#ffffff', 6, 1.5, 20, 0);
      if (!D.flying) { e.vx = 0; e.vy = Math.min(5.5, e.vy + 0.32); ctx.moveBody(e); }
      return;
    }
    if (e.hurt > 0) e.hurt--;
    if (e.flash > 0) e.flash--;
    if (e.cooldown > 0) e.cooldown--;
    e.clock++;
    if (e.status.burn > 0) { e.status.burn--; if (e.status.burn % 40 === 0) { e.hp -= (e.status.burnDamage || 1); ctx.spark(e.x, e.y - e.h / 2, '#ff8c42', 4, 1, 16, -0.02); } }
    if (e.status.poison > 0) { e.status.poison--; if (e.status.poison % 50 === 0) e.hp -= 1; }
    if (e.status.shock > 0) e.status.shock--;
    if (e.hp <= 0) { e.hp = 0; e.dying = 1; e.boxes = []; e.attack = null; return; }
    // a mark on the bar is crossed: whatever it was doing breaks, and it reels
    while (e.phase < D.phases.length && e.hp <= e.maxHp * D.phases[e.phase]) {
      e.phase++;
      if (e.attack && e.attack.def.end) e.attack.def.end(e, ctx);
      e.attack = null; e.boxes = []; e.stun = D.reel || 70; e.cooldown = 20; e.script = 0; e.state = 'reel';
      ctx.spark(e.x, e.y - e.h / 2, '#ffffff', 40, 2.5, 40, 0); ctx.shake(5); ctx.sfx('roar');
      if (D.onPhase) D.onPhase(e, ctx, e.phase);
    }
    // cold only slows a guardian for a moment
    if (e.status.freeze > 0) { e.status.freeze = Math.min(e.status.freeze - 1, 20); e.boxes = []; if (!D.flying) { e.vx = 0; e.vy = Math.min(5.5, e.vy + 0.32); ctx.moveBody(e); } return; }
    if (e.state === 'wake') {
      e.anim = 'wake'; e.frame = frameOf(F, 'wake', (D.wake || 110) - e.wait + 1, D.wake || 110);
      if (D.waking) D.waking(e, ctx, (D.wake || 110) - e.wait);
      if (--e.wait <= 0) e.state = 'idle';
    } else if (e.stun > 0) {
      e.stun--; e.vx = 0; e.anim = 'reel'; e.frame = Math.floor(e.clock / 12) % (F.reel || F.idle).length;
      if (e.stun === 0) e.state = 'idle';
    } else if (e.attack) clock(e, ctx);
    else {
      var A = D.think(e, ctx);
      if (A) begin(e, A, ctx);
    }
    if (!D.flying && !D.ownBody) {
      e.vy = Math.min(5.5, e.vy + 0.32);
      if (e.attack && !e.attack.def.moves) e.vx *= 0.8;
      var touched = ctx.moveBody(e); e.onGround = touched.floor;
    }
    if (D.always) D.always(e, ctx);
  }

  function step(e, ctx) { if (e.spec.modern) stepModern(e, ctx); else legacyStep(e, ctx); }

  // where a guardian can be struck; soft places first, so that they are what a blade finds
  function hurtBoxes(e) {
    if (e.spec.modern) { if (e.state === 'wake') return []; if (e.spec.hurtBoxes) return e.spec.hurtBoxes(e); }
    return [{ x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y - e.h, y1: e.y, mult: 1 }];
  }
  // for the probes: make it begin an attack by name, now
  function command(e, name, ctx) {
    if (!e.spec.modern) { e.state = name; e.wait = 40; e.cooldown = 0; return e.state; }
    var A = e.spec.attacks[name];
    if (!A) return Object.keys(e.spec.attacks).join(',');
    e.state = 'idle'; e.wait = 0; e.stun = 0; begin(e, A, ctx);
    return name;
  }

  function buildAll() {
    var S = build();
    Object.keys(REG).forEach(function (kind) { if (!S[kind]) { S[kind] = REG[kind].rig(); REG[kind].frames = (S[kind].byPhase ? S[kind].byPhase[0] : S[kind]).frames; } });
    return S;
  }

  window.Guardians = { KINDS: KINDS, REG: REG, BY_FLOOR: BY_FLOOR, register: register, rig: rig, dots: dots, front: front, towards: towardsHero, build: buildAll, spawn: spawn, step: step, hurtBoxes: hurtBoxes, command: command };
})();
