/* guardians.js: the five that wait at the foot of each floor.

   The Kiln Golem, that slams the ground and raises lava; the Frost Wyrm,
   that swoops and breathes; the Storm Herald, that is elsewhere when the
   bolt lands; the Bramble Heart, rooted, whose thorns rise where you stand;
   and the Void Mirror, which is you, with your own sword and your own
   power. Each has a name and a bar, a way of telling you what it is about
   to do, and a second wind when its life is low.

   Like the creatures, the guardians know nothing of the canvas: they are
   stepped with the engine's helpers and draw themselves from text art,
   except the mirror, which borrows the Warden's own frames. */
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
    golem: {
      idle: [
        ['........kkkkkkkk........', '......kkppppppppkk......', '.....kpppmmmmmmpppk.....', '....kppmmlllllmmppk.....', '....kppmlleeellmppk.....', '....kppmmlllllmmppk.....', '.....kpppmmmmmmpppk.....', '....kkkppppppppppkkk....', '..kkpppkkppllppkkpppkk..', '.kppppppkpllllpkppppppk.', 'kpppqqppkppllppkppqqpppk', 'kppqqqppkkppppkkppqqqppk', 'kppqqqpk.kppppk.kpqqqppk', '.kpppppk.kppppk.kpppppk.', '.kkkkkk..kppppk..kkkkkk.', '.........kppppk.........', '........kppqqppk........', '.......kppqqqqppk.......', '.......kppqqqqppk.......', '......kkkkkkkkkkkk......'],
        ['........kkkkkkkk........', '......kkppppppppkk......', '.....kpppmmmmmmpppk.....', '....kppmmlllllmmppk.....', '....kppmllelleelmppk....', '....kppmmlllllmmppk.....', '.....kpppmmmmmmpppk.....', '....kkkppppppppppkkk....', '..kkpppkkpplllpkkpppkk..', '.kppppppkplllllpkppppppk', 'kpppqqppkpplllppkppqqpppk', 'kppqqqppkkppppkkppqqqppk', 'kppqqqpk.kppppk.kpqqqppk', '.kpppppk.kppppk.kpppppk.', '.kkkkkk..kppppk..kkkkkk.', '.........kppppk.........', '........kppqqppk........', '.......kppqqqqppk.......', '.......kppqqqqppk.......', '......kkkkkkkkkkkk......']
      ],
      attack: [['........kkkkkkkk........', '......kkppppppppkk......', '.....kpppmmmmmmpppk.....', '....kppmmlllllmmppk.....', '....kppmleeeeeelmppk....', '....kppmmlllllmmppk.....', '.kkkkkpppmmmmmmpppkkkkk.', 'kpppkkkppppppppppkkkpppk', 'kpppppkkppllllppkkpppppk', 'kqqqppppkplwwlpkppppqqqk', 'kqqqppppkplwwlpkppppqqqk', '.kkkkkkpkkppppkkpkkkkkk.', '.......k.kppppk.k.......', '.........kppppk.........', '.........kppppk.........', '.........kppppk.........', '........kppqqppk........', '.......kppqqqqppk.......', '.......kppqqqqppk.......', '......kkkkkkkkkkkk......']]
    },
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
      g.fillStyle = '#ffffff'; g.fillRect(17, 9, 1, 1);
      g.fillStyle = '#5b3fa0'; g.fillRect(8, 22, 5, 4);
      return c;
    }
    mirror.idle = W.idle.map(shade); mirror.attack = W.attack1.map(shade).concat(W.attack3.map(shade)); mirror.dash = W.dash.map(shade); mirror.cast = W.cast.map(shade);
    mirror.flipped.idle = mirror.idle.map(window.Pixels.flipH); mirror.flipped.attack = mirror.attack.map(window.Pixels.flipH); mirror.flipped.dash = mirror.dash.map(window.Pixels.flipH); mirror.flipped.cast = mirror.cast.map(window.Pixels.flipH);
    SPRITES.mirror = mirror;
    return SPRITES;
  }

  /* ---- the kinds and their patterns ---- */

  var KINDS = {
    golem:  { element: 'ember', name: 'The Kiln Golem',  w: 22, h: 20, hp: 60, flying: false, damage: 1 },
    wyrm:   { element: 'frost', name: 'The Frost Wyrm',  w: 30, h: 14, hp: 50, flying: true,  damage: 1 },
    herald: { element: 'storm', name: 'The Storm Herald', w: 14, h: 26, hp: 45, flying: true,  damage: 1 },
    heart:  { element: 'bloom', name: 'The Bramble Heart', w: 26, h: 18, hp: 70, flying: false, damage: 1 },
    mirror: { element: 'void',  name: 'The Void Mirror',  w: 10, h: 22, hp: 55, flying: false, damage: 2 }
  };
  var BY_FLOOR = ['golem', 'wyrm', 'herald', 'heart', 'mirror'];

  function spawn(floor, arena, rnd) {
    var kind = BY_FLOOR[Math.max(0, Math.min(4, floor - 1))], spec = KINDS[kind];
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

  function step(e, ctx) {
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
    golem: function (e, ctx, quick) {
      var hero = ctx.hero, A = e.arena;
      e.vy = Math.min(5, e.vy + 0.32);
      if (e.state === 'idle') {
        e.anim = 'idle';
        e.dir = towards(e, hero); e.vx = e.dir * (e.phase ? 0.5 : 0.32);
        if (e.cooldown <= 0) { e.state = ctx.random() < 0.5 ? 'slam' : 'erupt'; e.wait = 40; e.vx = 0; }
      } else if (e.state === 'slam') {
        e.anim = 'attack'; e.vx = 0;
        if (--e.wait === 0) {
          ctx.shake(5); ctx.spark(e.x, e.y, '#ff6a2b', 24, 2, 26, 0.04);
          ctx.projectile({ x: e.x - 12, y: e.y - 4, vx: -2.2, vy: 0, life: 90, colour: '#ff6a2b', size: 5, damage: 1, element: 'ember', gravity: 0, wave: true });
          ctx.projectile({ x: e.x + 12, y: e.y - 4, vx: 2.2, vy: 0, life: 90, colour: '#ff6a2b', size: 5, damage: 1, element: 'ember', gravity: 0, wave: true });
        }
        if (e.wait <= -20) { e.state = 'idle'; e.cooldown = Math.round(150 * quick); }
      } else if (e.state === 'erupt') {
        e.anim = 'attack';
        if (e.wait === 40) { e.spots = [hero.x, hero.x - 48 * towards(e, hero), hero.x + 40 * towards(e, hero)]; e.spots.forEach(function (sx) { ctx.telegraph(sx - 8, A.groundY - 44, 16, 44, 44, '#ff6a2b'); }); }
        if (--e.wait === 0) e.spots.forEach(function (sx) { ctx.hazard({ x0: sx - 8, x1: sx + 8, y0: A.groundY - 44, y1: A.groundY, life: 34, damage: 1, element: 'ember', colour: '#ff6a2b' }); ctx.spark(sx, A.groundY, '#ffb347', 20, 2.6, 30, 0.05); });
        if (e.wait <= -30) { e.state = 'idle'; e.cooldown = Math.round(130 * quick); }
      }
      var touched = ctx.moveBody(e); e.onGround = touched.floor;
    },
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

  window.Guardians = { KINDS: KINDS, build: build, spawn: spawn, step: step };
})();
