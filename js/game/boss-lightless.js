/* boss-lightless.js: the Lightless, in the Vault, last.

   First it is you: your outline with a violet rim, your weapon, your
   power, your three strokes and your dash. Worn down a third, it stops
   pretending. What is left is a great dark mask with one eye that is a
   slit until it means to strike, and two hands. A fist comes down where
   its shadow was and the floor sends a wave each way, as the Golem's did;
   a palm sweeps the whole floor and must be jumped; the two palms clap
   and must be dashed through; the eye opens and a beam walks the hall,
   and then the mask sinks, spent, with its eye in reach. It remembers the
   others: shards hung along the ceiling that fall in a sweep, as the
   Wyrm's did, and bolts that fall in the rhythm their marks were laid in,
   as the Herald's did. At its last third it puts out the lights. There is
   your lantern, its eye opening before each blow, and three braziers that
   a blade will light. All three lit undoes it: it sinks, and takes double,
   until it gathers the dark again. */
(function () {
  'use strict';
  var GD = window.Guardians;
  if (!GD) return;

  var PAL = { k: '#000000', p: '#1e1a2c', q: '#0d0b14', m: '#2b2836', l: '#5b3fa0', w: '#a48cff', x: '#ffffff' };
  var ART = {
    fist: ['...kkkkkkkkkkkkkk...', '..klppppppppppppqk..', '.klpppppppppppppqqk.', 'klppkppppkppppkppqqk', 'klppkppppkppppkppqqk', 'klppkppppkppppkppqqk', 'klpppppppppppppppqqk', 'klppppppppppppppqqqk', 'klpppppppppppppqqqqk', 'klppppppppppppqqqqqk', '.klppppppppppqqqqqk.', '.klqqqqqqqqqqqqqqqk.', '..kkqqqqqqqqqqqqkk..', '....kkkkkkkkkkkk....'],
    palm: ['..kk.kk.kk.kk.', '.klpklpklpklpk', '.klpklpklpklpk', '.klpklpklpklpk', '.klpklpklpklpk', '.klpklpklpklpk', '.klpklpklpklpk', '.klpklpklpklpk', '.klpppppppppqk', '.klpppppppppqk', 'kklppppppppqqk', 'klkpppplpppqqk', 'klkppplllppqqk', 'klkpppplpppqqk', 'kklppppppppqqk', '.klpppppppqqqk', '.klppppppqqqqk', '..klppppqqqqk.', '..kkqqqqqqqkk.', '...kkkkkkkkk..']
  };
  // the mask is worked out rather than drawn: a long oval, rimmed in violet, darker toward one side, cracked from the crown to the eye
  function maskRows() {
    var W = 60, H = 58, rows = [], x, y;
    function inside(px, py) { var nx = (px - 29.5) / 29.5, ny = (py - 26) / (py < 26 ? 26.5 : 31); return nx * nx + ny * ny * (1 + 0.35 * Math.max(0, ny)) <= 1; }
    for (y = 0; y < H; y++) {
      var s = '';
      for (x = 0; x < W; x++) {
        if (!inside(x, y)) { s += '.'; continue; }
        var edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1), rim = !inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2);
        var crack = (x === 29 && y < 20 && y > 2) || (x === 30 && y > 7 && y < 12) || (x === 28 && y > 13 && y < 18) || (x === 31 && y > 15 && y < 20) || (y > 33 && y < 47 && (x === 19 || x === 40) && (y + x) % 5 !== 0) || (y > 36 && y < 43 && (x === 20 || x === 39) && y % 2 === 0);
        var brow = y > 17 && y < 21 && Math.abs(x - 29.5) < 19 && Math.abs(x - 29.5) > 1;
        s += edge ? 'k' : rim ? 'l' : crack ? 'l' : brow ? 'q' : x > 42 || y > 45 ? 'q' : (x + y * 3) % 17 === 0 ? 'm' : 'p';
      }
      rows.push(s);
    }
    return rows;
  }

  var SPR = null, SHADES = null;
  function buildRig() {
    var A = window.Pixels.art, pal = GD.palette(PAL);
    SPR = { fist: A(ART.fist, pal), palm: A(ART.palm, pal), mask: A(maskRows(), pal) };
    SPR.fistDown = GD.flipV(SPR.fist); SPR.palmFlip = window.Pixels.flipH(SPR.palm);
    SPR.white = { fist: window.Pixels.silhouette(SPR.fist, '#ffffff'), fistDown: window.Pixels.silhouette(SPR.fistDown, '#ffffff'), palm: window.Pixels.silhouette(SPR.palm, '#ffffff'), palmFlip: window.Pixels.silhouette(SPR.palmFlip, '#ffffff'), mask: window.Pixels.silhouette(SPR.mask, '#ffffff') };
    SHADES = typeof Map === 'function' ? new Map() : null;
    return { frames: { idle: [SPR.mask] }, flipped: { idle: [SPR.mask] }, anchor: { x: 30, y: 28 }, custom: true };
  }
  // the Warden's own frame, emptied: dark, with a violet rim
  function shade(img, flip, white) {
    var key = img, set = SHADES && SHADES.get(key);
    if (!set) {
      var P = window.Pixels, dark = P.silhouette(img, '#0d0b14'), rim = P.silhouette(img, '#5b3fa0'), c = P.blank(img.width, img.height), g = c.getContext('2d');
      g.drawImage(rim, -1, 0); g.drawImage(rim, 1, 0); g.drawImage(rim, 0, -1); g.drawImage(rim, 0, 1); g.drawImage(dark, 0, 0);
      set = { right: c, left: P.flipH(c), white: P.silhouette(img, '#ffffff') }; set.whiteLeft = P.flipH(set.white);
      if (SHADES) SHADES.set(key, set);
    }
    return white ? (flip ? set.whiteLeft : set.white) : (flip ? set.left : set.right);
  }
  function wardenFrames(e) { return window.Pixels.hero.build(e.vars.classId, e.vars.weaponId, window.Weapons.views(e.vars.weaponId)); }

  function drawBrazier(pen, b, cx, cy, tick) {
    var x = Math.round(b.x) - cx, y = Math.round(b.y) - cy;
    pen.fillStyle = '#100e16'; pen.fillRect(x - 2, y - 10, 4, 10); pen.fillRect(x - 5, y - 2, 10, 2);
    pen.fillStyle = '#4a4560'; pen.fillRect(x - 7, y - 14, 14, 4); pen.fillStyle = '#2b2836'; pen.fillRect(x - 6, y - 11, 12, 2); pen.fillStyle = '#8f8d88'; pen.fillRect(x - 7, y - 14, 14, 1);
    if (b.lit) { var f = (tick >> 2) % 3; pen.fillStyle = '#ff8c42'; pen.fillRect(x - 4, y - 19 - f, 8, 5 + f); pen.fillStyle = '#ffdc9a'; pen.fillRect(x - 2, y - 18 - f, 4, 4 + f); pen.fillStyle = '#ffffff'; pen.fillRect(x - 1, y - 16, 2, 2); pen.fillStyle = '#ff8c42'; pen.fillRect(x - 1 + f, y - 23 - f, 2, 3); }
    else { pen.fillStyle = '#5b3fa0'; pen.fillRect(x - 1, y - 15, 2, 1); }
  }

  function draw(e, G) {
    var v = e.vars, pen = G.pen, cx = G.cx, cy = G.cy, k, img, white = e.flash > 0;
    (v.braziers || []).forEach(function (b) { drawBrazier(pen, b, cx, cy, G.tick); });
    if (v.form === 'double') {
      var F = wardenFrames(e), frames = F[v.anim] || F.idle, A = window.Pixels.warden.anchor;
      for (k = 0; k < v.ghosts.length; k++) { var gh = v.ghosts[k]; pen.globalAlpha = gh.life / 14 * 0.5; pen.drawImage(shade(gh.img, gh.dir < 0, false), Math.round(gh.x) - A.x - cx, Math.round(gh.y) - A.y - cy); }
      pen.globalAlpha = e.dying ? Math.max(0, 1 - e.dying / 40) : 1;
      img = frames[Math.min(frames.length - 1, v.frame || 0)];
      pen.drawImage(shade(img, e.dir < 0, white), Math.round(e.x) - A.x - cx, Math.round(e.y) - A.y - cy);
      pen.globalAlpha = 1;
      return;
    }
    var show = Math.min(1, (v.appear || 0) / 60), dying = e.dying ? Math.min(1, e.dying / 60) : 0;
    pen.globalAlpha = show * (e.dying > 60 ? Math.max(0, 1 - (e.dying - 60) / 30) : 1);
    // the hands, then the mask over them
    v.hands.forEach(function (h, i) {
      var name = h.pose === 'palm' ? (h.flip ? 'palmFlip' : 'palm') : h.pose === 'fistDown' ? 'fistDown' : 'fist', s = SPR[name], hw = white && v.struckHand === i;
      pen.drawImage(hw ? SPR.white[name] : s, Math.round(h.x - s.width / 2) - cx, Math.round(h.y - s.height / 2) - cy + (e.dying ? Math.round(dying * dying * 60) : 0));
    });
    var mx = Math.round(e.x) - 30 - cx + (e.dying ? (G.tick % 2) * 2 - 1 : 0), my = Math.round(e.y) - 28 - cy;
    pen.drawImage(white && v.struckHand === -1 ? SPR.white.mask : SPR.mask, mx, my);
    // the eye: a slit, until it means something
    var open = v.eye || 0, ex = mx + 30, ey = my + 26, look = Math.round(v.look || 0), dx, hh;
    pen.fillStyle = '#000000'; pen.fillRect(ex - 15, ey - 1, 30, 2);
    if (open > 0.05) {
      for (dx = -14; dx <= 14; dx++) { hh = Math.round(open * 6 * (1 - (dx / 14.5) * (dx / 14.5))); if (hh > 0) { pen.fillStyle = v.spent ? '#8f8d88' : '#ffffff'; pen.fillRect(ex + dx, ey - hh, 1, hh * 2); } }
      for (dx = -4; dx <= 4; dx++) { hh = Math.min(Math.round(open * 6 * (1 - ((dx + look) / 14.5) * ((dx + look) / 14.5))), Math.round(Math.sqrt(17 - dx * dx))); if (hh > 0) { pen.fillStyle = v.spent ? '#4a4560' : '#a48cff'; pen.fillRect(ex + look + dx, ey - hh, 1, hh * 2); } }
      pen.fillStyle = '#000000'; pen.fillRect(ex + look, ey - Math.max(1, Math.round(open * 3)), 1, Math.max(2, Math.round(open * 6)));
    } else { pen.fillStyle = '#5b3fa0'; pen.fillRect(ex - 13, ey, 26, 1); }
    // dying, it cracks, and what is inside is light
    if (e.dying) { pen.fillStyle = '#ffffff'; for (k = 0; k < Math.floor(dying * 9); k++) { var a = k * 2.4, len = 6 + dying * 16; for (var s2 = 2; s2 < len; s2++) pen.fillRect(Math.round(ex + Math.cos(a) * s2 + Math.sin(s2 * 1.3 + k) * 1.5), Math.round(ey + Math.sin(a) * s2 * 1.2), 1, 1); } }
    pen.globalAlpha = 1;
  }

  /* ---- first it is you ---- */

  var VOID = ['#5b3fa0', '#a48cff', '#ffffff', '#2b2836'];
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function motes(ctx, x, y, n, speed, up) { for (var k = 0; k < n; k++) { var a = up ? -Math.PI * ctx.random() : ctx.random() * 6.2832, s = speed * (0.3 + ctx.random()); ctx.particle({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 16 + ctx.random() * 22, max: 38, colour: VOID[k % 4], size: ctx.random() < 0.3 ? 2 : 1, gravity: up ? 0.05 : -0.01 }); } }
  function setPose(e, anim, frame) { e.vars.anim = anim; e.vars.frame = frame; }
  function body(e, ctx, damp) { e.vy = Math.min(5.5, e.vy + 0.32); if (damp) e.vx *= damp; var t = ctx.moveBody(e); e.onGround = t.floor; var A = e.arena; e.x = clamp(e.x, A.left + 8, A.right - 8); }
  // a violet wave along the floor, as the Golem's was
  function voidWave(e, ctx, x, dir) { ctx.projectile({ x: x + dir * 16, y: e.arena.groundY - 5, vx: dir * 2.5, vy: 0, life: 170, colour: '#5b3fa0', core: '#a48cff', size: 9, damage: 1, element: 'plain', gravity: 0, wave: true, cause: 'lightless' }); }
  function voidBolt(e, ctx, x) {
    var A = e.arena;
    ctx.zap(x, A.ceilY, x + (ctx.random() - 0.5) * 8, A.groundY, '#ffffff'); ctx.beam(x, A.ceilY, x, A.groundY, '#5b3fa0');
    ctx.hazard({ x0: x - 6, x1: x + 6, y0: A.ceilY, y1: A.groundY, life: 7, damage: 1, element: 'void', colour: '#a48cff' });
    motes(ctx, x, A.groundY - 2, 12, 2.4, true); ctx.light(x, A.groundY - 40, 60, 1); ctx.shake(2.5); ctx.sfx('caststorm');
  }

  var DOUBLE = {
    // your three strokes, with your weapon
    combo: {
      name: 'combo', windup: 46, active: 48, recover: 46, cooldown: 40, anims: { windup: 'idle', attack: 'idle' },
      telling: function (e, ctx, t, w) {
        var b = GD.front(e, 2, 32, 28, -2);
        if (t === 1) { ctx.telegraph(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, w, '#a48cff'); ctx.sfx('select'); }
        setPose(e, 'heavy1', Math.min(1, Math.floor(t / 14))); e.vx = 0;
        ctx.glow(e.x - e.dir * 6, e.y - 30, 4 + t / w * 8, '#ffffff', 0.5);
      },
      during: function (e, ctx, t) {
        var n = Math.min(2, Math.floor((t - 1) / 16)), s = (t - 1) % 16, names = ['attack1', 'attack2', 'attack3'], len = n === 2 ? 5 : 4;
        setPose(e, names[n], Math.min(len - 1, Math.floor(s / 16 * len)));
        if (s === 0) { e.hitHero = false; e.dir = GD.towards(e, ctx.hero); e.vx = e.dir * (n === 2 ? 2.6 : 1.7); ctx.sfx('swing'); }
        if (s === 5) ctx.crescent(e.x + e.dir * 8, e.y - 14, e.dir, n === 2 ? 22 : 18, '#a48cff', 10);
      },
      box: function (e, t) { var s = (t - 1) % 16; if (s < 5 || s > 10) return []; var b = GD.front(e, 2, 32, 28, -2); b.damage = 1; b.element = 'void'; return [b]; },
      resting: function (e, ctx, t) { setPose(e, t < 12 ? 'land' : 'idle', t < 12 ? 1 : Math.floor(t / 10) % 4); }
    },
    // your dash, with an edge on it
    dashcut: {
      name: 'dashcut', windup: 48, active: 16, recover: 52, cooldown: 40, anims: { windup: 'idle', attack: 'idle' },
      telling: function (e, ctx, t, w) {
        if (t === 1) { ctx.telegraphLine(e.x, e.y - 11, clamp(e.x + e.dir * 150, e.arena.left + 8, e.arena.right - 8), e.y - 11, w, '#a48cff'); ctx.telegraph(e.dir > 0 ? e.x : e.x - 140, e.y - 24, 140, 24, w, '#a48cff'); ctx.sfx('select'); }
        setPose(e, 'dash', 0); e.vx = 0;
        if (t % 4 === 0) motes(ctx, e.x - e.dir * 6, e.y - 10, 2, 1.2, false);
      },
      fire: function (e, ctx) { ctx.sfx('dash'); },
      during: function (e, ctx, t) { setPose(e, 'dash', 1); e.vx = e.dir * 8; e.vy = 0; if (t % 2 === 0) { var F = wardenFrames(e); e.vars.ghosts.push({ x: e.x, y: e.y, dir: e.dir, img: F.dash[1], life: 14 }); } },
      box: function (e) { return [{ x0: e.x - 12, x1: e.x + 12, y0: e.y - 24, y1: e.y, damage: 1, element: 'void' }]; },
      resting: function (e, ctx, t) { setPose(e, t < 16 ? 'land' : 'idle', t < 16 ? Math.min(1, Math.floor(t / 8)) : Math.floor(t / 10) % 4); }
    },
    // your power, in its colours
    cast: {
      name: 'cast', windup: 54, active: 10, recover: 44, cooldown: 50, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { e.vars.markX = ctx.hero.x; },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena, b;
        if (t === 1) {
          ctx.sfx('select');
          if (v.power === 'emberwave') { b = GD.front(e, 4, 64, 44, -2); ctx.telegraph(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, w, '#a48cff'); }
          else if (v.power === 'frostlance') ctx.telegraphLine(e.x, e.y - 10, e.dir > 0 ? A.right : A.left, e.y - 10, w, '#a48cff');
          else if (v.power === 'stormchain') { ctx.telegraph(v.markX - 6, A.ceilY, 12, A.groundY - A.ceilY, w, '#a48cff'); ctx.telegraphCircle(v.markX, A.groundY - 1, 9, w, '#ffffff'); }
          else ctx.telegraphCircle(e.x, e.y - 14, 46, w, '#a48cff');
        }
        setPose(e, 'cast', Math.min(2, Math.floor(t / w * 3))); e.vx = 0;
        ctx.glow(e.x + e.dir * 8, e.y - 16, 5 + t / w * 12, '#a48cff', 0.4);
      },
      fire: function (e, ctx) {
        var v = e.vars, k;
        ctx.flash('#5b3fa0', 5);
        if (v.power === 'frostlance') ctx.projectile({ x: e.x + e.dir * 8, y: e.y - 10, vx: e.dir * 4.6, vy: 0, life: 110, colour: '#a48cff', size: 6, damage: 1, element: 'frost', gravity: 0, lance: true, cause: 'lightless' });
        else if (v.power === 'stormchain') voidBolt(e, ctx, v.markX);
        else if (v.power === 'emberwave') for (k = 0; k < 34; k++) { var a = (ctx.random() - 0.5) * 0.9, s = 2 + ctx.random() * 2.6; ctx.particle({ x: e.x + e.dir * 6, y: e.y - 14, vx: Math.cos(a) * s * e.dir, vy: Math.sin(a) * s - 0.4, life: 16 + ctx.random() * 14, max: 30, colour: VOID[k % 3], size: k % 3 ? 2 : 3, gravity: -0.02 }); }
        else { for (k = 0; k < 28; k++) { var a2 = k / 28 * 6.2832; ctx.particle({ x: e.x, y: e.y - 14, vx: Math.cos(a2) * 2.6, vy: Math.sin(a2) * 2.6, life: 18, max: 18, colour: VOID[k % 3], size: 2, gravity: 0 }); } e.hp = Math.min(e.maxHp, e.hp + 5); ctx.number(e.x, e.y - 34, '+5', '#a48cff'); }
        ctx.sfx('castfrost');
      },
      during: function (e) { setPose(e, 'cast', e.attack.t % 2 ? 3 : 4); },
      box: function (e) {
        var v = e.vars, b;
        if (v.power === 'emberwave') { b = GD.front(e, 4, 64, 44, -2); b.damage = 1; b.element = 'ember'; return [b]; }
        if (v.power === 'bloomburst') return [{ x0: e.x - 46, x1: e.x + 46, y0: e.y - 44, y1: e.y + 4, damage: 1, element: 'bloom' }];
        return [];
      },
      resting: function (e, ctx, t) { setPose(e, 'idle', Math.floor(t / 10) % 4); }
    }
  };

  function thinkDouble(e, ctx) {
    var v = e.vars, hero = ctx.hero, dx = hero.x - e.x, ad = Math.abs(dx);
    e.dir = dx > 0 ? 1 : -1;
    var run = ad > 28;
    e.vx = run ? e.dir * 1.15 : 0;
    if (e.onGround && hero.y < e.y - 26 && ad < 70 && e.clock % 40 === 0) { e.vy = -5.4; ctx.sfx('jump'); }
    if (!e.onGround) setPose(e, e.vy < 0 ? 'jump' : 'fall', 0); else setPose(e, run ? 'run' : 'idle', run ? Math.floor(e.clock / 5) % 8 : Math.floor(e.clock / 10) % 4);
    if (e.cooldown > 0 || !hero.alive || !e.onGround) return null;
    var want = ad < 38 ? 'combo' : (e.script % 2 ? 'cast' : 'dashcut');
    if (want === 'dashcut' && ad > 150) want = 'cast';
    if (ad >= 38) e.script++;
    return DOUBLE[want];
  }

  /* ---- then it stops pretending ---- */

  function homeOf(e, i) { var A = e.arena, mid = (A.left + A.right) / 2; return { x: mid + (i ? 84 : -84), y: A.ceilY + 84 + Math.sin(e.clock * 0.05 + i * 2) * 4 }; }
  function reach(h, tx, ty, ease) { h.x += (tx - h.x) * ease; h.y += (ty - h.y) * ease; }
  function nearHand(e, x) { var H = e.vars.hands; return Math.abs(H[0].x - x) <= Math.abs(H[1].x - x) ? 0 : 1; }
  function handBox(h, w, hh) { return { x0: h.x - w, x1: h.x + w, y0: h.y - hh, y1: h.y + hh, damage: 1, element: 'plain' }; }
  function eyeOf(e) { return { x: e.x, y: e.y - 2 }; }
  var HIGH = 50, LOW = 46;   // how far under the ceiling it hangs, and how far over the floor it sinks
  // when it has spent itself the mask sinks until its eye is in reach
  function sink(e, ctx, t, span) { var A = e.arena, v = e.vars; v.spent = t < span - 30; v.eyeTo = v.spent ? 0.6 : 0; e.y += ((v.spent ? A.groundY - LOW : A.ceilY + HIGH) - e.y) * 0.07; if (v.spent && t % 16 === 0) motes(ctx, e.x + (ctx.random() - 0.5) * 30, e.y + 18, 2, 0.8, false); }
  var BAR = [0, 24, 48, 60];

  var MASK = {
    // a fist, where its shadow was; and the floor sends a wave each way, as the Golem's did
    slam: {
      name: 'slam', windup: 64, active: 12, recover: 84, cooldown: 44, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { var v = e.vars; v.hand = nearHand(e, ctx.hero.x); v.landed = false; v.hands[v.hand].busy = true; },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena, h = v.hands[v.hand];
        if (t <= 30) v.tx = clamp(ctx.hero.x, A.left + 14, A.right - 14);
        if (t === 31) { ctx.telegraph(v.tx - 14, A.groundY - 5, 28, 5, w - 30, '#a48cff'); ctx.telegraphLine(v.tx, A.ceilY + 40, v.tx, A.groundY, w - 30, '#5b3fa0'); ctx.telegraphLine(v.tx, A.groundY - 3, A.left, A.groundY - 3, w - 30, '#5b3fa0'); ctx.telegraphLine(v.tx, A.groundY - 3, A.right, A.groundY - 3, w - 30, '#5b3fa0'); ctx.sfx('select'); }
        h.pose = 'fistDown'; reach(h, v.tx, A.ceilY + 30, 0.12); v.eyeTo = 1;
      },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, h = v.hands[v.hand];
        if (!v.landed) { h.y = Math.min(A.groundY - 7, h.y + 13); if (h.y >= A.groundY - 7) { v.landed = true; ctx.shake(7); ctx.sfx('boom'); motes(ctx, h.x, A.groundY - 2, 30, 3.4, true); voidWave(e, ctx, h.x, 1); voidWave(e, ctx, h.x, -1); } }
      },
      box: function (e, t) { var v = e.vars; return v.landed && t > 8 ? [] : [handBox(v.hands[v.hand], 11, 9)]; },
      resting: function (e, ctx, t) { var v = e.vars, h = v.hands[v.hand]; v.eyeTo = 0; if (t > 64) { h.busy = false; h.pose = 'fist'; } },
      end: function (e) { e.vars.hands.forEach(function (h) { h.busy = false; h.pose = 'fist'; }); }
    },
    // a palm, the length of the floor
    sweep: {
      name: 'sweep', windup: 62, active: 72, recover: 30, cooldown: 44, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { var v = e.vars, A = e.arena; v.hand = ctx.hero.x < (A.left + A.right) / 2 ? 1 : 0; v.from = v.hand ? A.right - 12 : A.left + 12; v.to = v.hand ? A.left + 12 : A.right - 12; v.hands[v.hand].busy = true; },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena, h = v.hands[v.hand];
        if (t === 1) { ctx.telegraph(A.left, A.groundY - 24, A.right - A.left, 24, w, '#a48cff'); ctx.telegraphLine(v.from, A.groundY - 12, v.to, A.groundY - 12, w, '#a48cff'); ctx.sfx('select'); }
        h.pose = 'palm'; h.flip = v.hand === 1; reach(h, v.from, A.groundY - 11, 0.1); v.eyeTo = 1;
      },
      fire: function (e, ctx) { ctx.sfx('swing'); },
      during: function (e, ctx, t) { var v = e.vars, A = e.arena, h = v.hands[v.hand]; h.x = v.from + (v.to - v.from) * t / 72; h.y = A.groundY - 11; if (t % 2 === 0) motes(ctx, h.x, A.groundY - 2, 2, 1.6, true); },
      box: function (e) { return [handBox(e.vars.hands[e.vars.hand], 8, 11)]; },
      resting: function (e) { e.vars.eyeTo = 0; },
      end: function (e) { e.vars.hands.forEach(function (h) { h.busy = false; h.pose = 'fist'; }); }
    },
    // both palms, and you between them
    clap: {
      name: 'clap', windup: 66, active: 16, recover: 64, cooldown: 44, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { var v = e.vars, A = e.arena; v.cx = clamp(ctx.hero.x, A.left + 60, A.right - 60); v.hands[0].busy = v.hands[1].busy = true; v.met = false; },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena, H = v.hands;
        if (t <= 24) v.cx = clamp(ctx.hero.x, A.left + 60, A.right - 60);
        if (t === 25) { ctx.telegraph(v.cx - 112, A.groundY - 28, 224, 28, w - 24, '#a48cff'); ctx.telegraphLine(v.cx - 112, A.groundY - 14, v.cx - 6, A.groundY - 14, w - 24, '#a48cff'); ctx.telegraphLine(v.cx + 112, A.groundY - 14, v.cx + 6, A.groundY - 14, w - 24, '#a48cff'); ctx.sfx('select'); }
        H[0].pose = H[1].pose = 'palm'; H[0].flip = false; H[1].flip = true;
        reach(H[0], v.cx - 112, A.groundY - 14, 0.1); reach(H[1], v.cx + 112, A.groundY - 14, 0.1); v.eyeTo = 1;
      },
      fire: function (e, ctx) { ctx.sfx('swing'); },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, H = v.hands, s = Math.min(1, t / 14);
        H[0].x = v.cx - 112 + 104 * s; H[1].x = v.cx + 112 - 104 * s; H[0].y = H[1].y = A.groundY - 14;
        if (s >= 1 && !v.met) { v.met = true; ctx.shake(6); ctx.sfx('boom'); ctx.flash('#5b3fa0', 5); motes(ctx, v.cx, A.groundY - 14, 40, 3.6, false); }
      },
      box: function (e, t) { var H = e.vars.hands; return t > 15 ? [] : [handBox(H[0], 8, 14), handBox(H[1], 8, 14)]; },
      resting: function (e, ctx, t) { var v = e.vars; v.eyeTo = 0; if (t > 44) v.hands.forEach(function (h) { h.busy = false; h.pose = 'fist'; }); },
      end: function (e) { e.vars.hands.forEach(function (h) { h.busy = false; h.pose = 'fist'; }); }
    },
    // the eye opens, and a beam walks the hall; then it has nothing left
    beam: {
      name: 'beam', windup: 72, active: 124, recover: 130, cooldown: 44, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { var v = e.vars, A = e.arena; v.sweep = ctx.hero.x < (A.left + A.right) / 2 ? -1 : 1; v.bx = v.sweep > 0 ? A.left + 8 : A.right - 8; },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena, eye = eyeOf(e);
        if (t === 1) { ctx.telegraphLine(eye.x, eye.y, v.bx, A.groundY, w, '#ffffff'); ctx.telegraphLine(v.bx, A.groundY - 4, v.sweep > 0 ? A.right : A.left, A.groundY - 4, w, '#a48cff'); ctx.sfx('roar'); }
        v.eyeTo = 1; v.look = v.sweep > 0 ? -3 : 3;
        ctx.glow(eye.x, eye.y, 8 + t / w * 14, '#ffffff', 0.15 + 0.3 * t / w);
      },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, eye = eyeOf(e);
        v.bx += v.sweep * (A.right - A.left - 16) / 124; v.look = clamp((v.bx - e.x) / 60, -3, 3);
        ctx.beam(eye.x, eye.y, v.bx, A.groundY, '#a48cff'); motes(ctx, v.bx, A.groundY - 2, 3, 2.4, true); ctx.light(v.bx, A.groundY - 10, 40, 1);
        if (t % 10 === 1) ctx.sfx('caststorm');
      },
      box: function (e) { var v = e.vars, A = e.arena, eye = eyeOf(e), out = [], n = 14; for (var k = 3; k <= n; k++) { var x = eye.x + (v.bx - eye.x) * k / n, y = eye.y + (A.groundY - eye.y) * k / n; out.push({ x0: x - 5, x1: x + 5, y0: y - 6, y1: y + 6, damage: 1, element: 'void' }); } return out; },
      resting: function (e, ctx, t) { sink(e, ctx, t, 130); },
      end: function (e) { e.vars.spent = false; }
    },
    // shards hung along the ceiling, falling from the middle outward: what the Wyrm did
    rain: {
      name: 'rain', windup: 84, active: 110, recover: 30, cooldown: 44, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) {
        var v = e.vars, A = e.arena, mid = (A.left + A.right) / 2, dry = clamp(Math.round((ctx.hero.x + (ctx.random() < 0.5 ? -46 : 46) - A.left - 14) / 22), 1, 18), dry2 = Math.floor(ctx.random() * 19), k, all = [];
        for (k = 0; A.left + 14 + k * 22 < A.right - 8; k++) if (k !== dry && k !== dry + 1 && k !== dry2 && k !== dry2 + 1) all.push(A.left + 14 + k * 22);
        v.spots = all.sort(function (a, b) { return Math.abs(a - mid) - Math.abs(b - mid); }); v.hung = 0; v.fell = 0;
        v.hands[0].busy = v.hands[1].busy = true; ctx.number(e.x, e.y + 34, 'IT REMEMBERS THE CISTERN', '#a48cff');
      },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena, mid = (A.left + A.right) / 2, out = (A.right - A.left) / 2 * t / w;
        reach(v.hands[0], mid - out, A.ceilY + 10, 0.2); reach(v.hands[1], mid + out, A.ceilY + 10, 0.2); v.hands[0].pose = v.hands[1].pose = 'fist'; v.eyeTo = 1;
        while (v.hung < v.spots.length && Math.abs(v.spots[v.hung] - mid) <= out) { var s = v.spots[v.hung]; ctx.telegraphLine(s, A.ceilY + 8, s, A.groundY, w - t + 6 + Math.floor(v.hung / 2) * 6, '#a48cff'); v.hung++; }
      },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, k;
        if (t % 6 === 0) for (k = 0; k < 2 && v.fell < v.spots.length; k++) { var s = v.spots[v.fell++]; ctx.projectile({ x: s, y: A.ceilY + 8, vx: 0, vy: 1.2, gravity: 0.2, life: 120, colour: '#a48cff', size: 6, damage: 1, element: 'void', icicle: true, big: true, cause: 'lightless', land: function (p) { motes(ctx, p.x, A.groundY - 2, 8, 2, true); } }); }
        if (t > 30) v.hands.forEach(function (h) { h.busy = false; });
      },
      resting: function (e) { e.vars.eyeTo = 0; },
      end: function (e) { e.vars.hands.forEach(function (h) { h.busy = false; h.pose = 'fist'; }); }
    },
    // a mark on every beat, and then the bolts in the same time: what the Herald did
    rhythm: {
      name: 'rhythm', windup: 112, active: 76, recover: 40, cooldown: 44, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { e.vars.marks = []; e.vars.fell = 0; ctx.number(e.x, e.y + 34, 'IT REMEMBERS THE GALLERY', '#a48cff'); },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena, n = v.marks.length;
        if (n < BAR.length && t - 1 >= BAR[n]) { var x = clamp(ctx.hero.x + ctx.hero.vx * 6, A.left + 10, A.right - 10); v.marks.push(x); ctx.telegraph(x - 6, A.ceilY, 12, A.groundY - A.ceilY, w - t + 1 + BAR[n], '#a48cff'); ctx.telegraphCircle(x, A.groundY - 1, 9, w - t + 1 + BAR[n], '#ffffff'); ctx.sfx('select'); v.blink = 8; }
        v.eyeTo = v.blink > 0 ? 1 : 0.35; if (v.blink > 0) v.blink--;
      },
      during: function (e, ctx, t) { var v = e.vars; v.eyeTo = 1; while (v.fell < v.marks.length && t - 1 >= BAR[v.fell]) voidBolt(e, ctx, v.marks[v.fell++]); },
      resting: function (e) { e.vars.eyeTo = 0; }
    }
  };

  var SCRIPTS = [null, ['slam', 'sweep', 'rhythm', 'clap', 'beam', 'rain'], ['slam', 'clap', 'rhythm', 'sweep', 'beam', 'rain']];

  function think(e, ctx) {
    var v = e.vars, hero = ctx.hero;
    if (v.form === 'double') return thinkDouble(e, ctx);
    var A = e.arena; e.x += ((A.left + A.right) / 2 + Math.sin(e.clock * 0.02) * 30 - e.x) * 0.03; e.y += (A.ceilY + HIGH - e.y) * 0.06;
    v.look = clamp((hero.x - e.x) / 50, -3, 3); v.eyeTo = 0;
    if (e.cooldown > 0 || !hero.alive || v.appear < 60) return null;
    var script = SCRIPTS[e.phase], want = script[e.script % script.length];
    e.script++;
    return MASK[want];
  }

  function start(e, arena, rnd) {
    var v = e.vars, mid = (arena.left + arena.right) / 2;
    v.form = 'double'; v.anim = 'idle'; v.frame = 0; v.ghosts = []; v.hands = []; v.braziers = [{ x: arena.left + 58, y: arena.groundY, lit: 0 }, { x: mid, y: arena.groundY - 32, lit: 0 }, { x: arena.right - 58, y: arena.groundY, lit: 0 }];
    v.weaponId = 'shortsword'; v.power = 'emberwave'; v.classId = 'warden'; e.w = 10; e.h = 22; e.y = arena.groundY;
  }
  function waking(e, ctx, t) {
    var v = e.vars;
    if (t === 1) { v.weaponId = ctx.weaponId(); v.power = ctx.powerName(); v.classId = ctx.classId(); }
    // it stands as you stand, and then it draws
    setPose(e, t < 70 ? 'idle' : 'heavy1', t < 70 ? Math.floor(t / 10) % 4 : Math.min(1, Math.floor((t - 70) / 12)));
    e.dir = GD.towards(e, ctx.hero); body(e, ctx, 0.8);
    if (t === 70) { ctx.sfx('select'); motes(ctx, e.x, e.y - 12, 20, 2, false); }
  }

  function always(e, ctx) {
    var v = e.vars, A = e.arena, k;
    if (v.form === 'double') {
      if (e.state !== 'wake') body(e, ctx, e.attack ? (e.attack.def.name === 'dashcut' && e.attack.phase === 'active' ? 1 : 0.82) : 1);
      for (k = v.ghosts.length - 1; k >= 0; k--) if (--v.ghosts[k].life <= 0) v.ghosts.splice(k, 1);
      ctx.glow(e.x + e.dir * 1, e.y - 19, 3, '#ffffff', 0.7);
      if (!v.dark) ctx.light(e.x, e.y - 12, 40, 0.7);
      if (e.clock % 6 === 0) ctx.particle({ x: e.x + (ctx.random() - 0.5) * 8, y: e.y - ctx.random() * 20, vx: 0, vy: -0.3, life: 20, max: 20, colour: VOID[e.clock % 2], size: 1, gravity: -0.01 });
      return;
    }
    if (v.appear < 60) v.appear++;
    v.eye = (v.eye || 0) + ((v.eyeTo || 0) - (v.eye || 0)) * 0.15;
    v.hands.forEach(function (h, i) { if (!h.busy) { var home = homeOf(e, i); reach(h, home.x, home.y, 0.06); h.pose = 'fist'; } });
    // its eye shows in the dark; the rest of it does not
    var eye = eyeOf(e);
    if (v.eye > 0.1) { ctx.glow(eye.x, eye.y, 5 + v.eye * 9, v.spent ? '#8f8d88' : '#a48cff', 0.12 + v.eye * 0.2); ctx.light(eye.x, eye.y, 24 + v.eye * 34, 0.9); }
    if (!v.dark) { ctx.light(e.x, e.y, 70, 0.8); v.hands.forEach(function (h) { ctx.light(h.x, h.y, 30, 0.6); }); }
    // the braziers: lit by a blade, and put out again one at a time unless all three burn
    var lit = 0;
    v.braziers.forEach(function (b) { if (b.lit) { lit++; b.lit++; ctx.light(b.x, b.y - 16, 84, 1); ctx.glow(b.x, b.y - 18, 16, '#ff8c42', 0.3); if (e.clock % 5 === 0) ctx.particle({ x: b.x + (ctx.random() - 0.5) * 6, y: b.y - 20, vx: 0, vy: -0.6, life: 18, max: 18, colour: '#ffdc9a', size: 1, gravity: -0.01 }); } });
    if (v.dark && !v.exposed && lit === 3 && !e.dying) { v.exposed = true; e.stun = 280; if (e.attack && e.attack.def.end) e.attack.def.end(e, ctx); e.attack = null; e.boxes = []; ctx.calm(); ctx.number(e.x, e.y + 34, 'IT CANNOT BEAR THE LIGHT', '#ffdc9a'); ctx.flash('#ffdc9a', 8); ctx.shake(6); ctx.sfx('roar'); }
    if (v.exposed) {
      v.spent = e.stun > 30; v.eyeTo = v.spent ? 0.6 : 0; e.y += ((v.spent ? A.groundY - LOW : A.ceilY + HIGH) - e.y) * 0.07;
      if (e.stun <= 1) { v.exposed = false; v.spent = false; v.braziers.forEach(function (b) { if (b.lit) motes(ctx, b.x, b.y - 18, 8, 1.4, false); b.lit = 0; }); ctx.number(e.x, e.y + 34, 'IT GATHERS THE DARK', '#a48cff'); e.cooldown = 40; }
    } else if (v.dark && lit > 0 && lit < 3) {
      var oldest = null; v.braziers.forEach(function (b) { if (b.lit && (!oldest || b.lit > oldest.lit)) oldest = b; });
      if (oldest.lit > 720) { oldest.lit = 0; motes(ctx, oldest.x, oldest.y - 18, 10, 1.4, false); ctx.sfx('freeze'); }
    }
  }

  function onPhase(e, ctx, n) {
    var v = e.vars, A = e.arena, mid = (A.left + A.right) / 2;
    if (n === 1) {
      motes(ctx, e.x, e.y - 12, 60, 3.6, false); ctx.flash('#5b3fa0', 10); ctx.number(e.x, e.y - 40, 'IT STOPS PRETENDING', '#a48cff');
      v.form = 'mask'; v.appear = 0; v.ghosts = []; e.w = 54; e.h = 54; e.vx = e.vy = 0; e.x = mid; e.y = A.ceilY + HIGH;
      v.hands = [{ x: mid - 84, y: A.ceilY + 84, pose: 'fist', flip: false, busy: false }, { x: mid + 84, y: A.ceilY + 84, pose: 'fist', flip: true, busy: false }];
    } else {
      v.dark = true; ctx.blackout(true); v.hands.forEach(function (h) { h.busy = false; h.pose = 'fist'; }); v.spent = false;
      ctx.number(e.x, e.y + 34, 'IT PUTS OUT THE LIGHTS', '#a48cff'); ctx.sfx('freeze');
    }
  }
  function fall(e, ctx) { var v = e.vars; v.dark = false; v.exposed = false; ctx.blackout(false); ctx.flash('#ffffff', 14); v.eyeTo = 1; v.eye = 1; v.braziers.forEach(function (b) { b.lit = 1; }); }
  function dyingStep(e, ctx) {
    var v = e.vars;
    if (e.dying % 6 === 0 && e.dying < 60) { motes(ctx, e.x + (ctx.random() - 0.5) * 40, e.y + (ctx.random() - 0.5) * 40, 14, 3, false); ctx.shake(2.5); ctx.sfx('hit'); }
    if (e.dying === 58) { motes(ctx, e.x, e.y, 80, 5, false); ctx.flash('#ffffff', 20); ctx.sfx('boom'); ctx.shake(9); }
    ctx.light(e.x, e.y, 60 + e.dying * 3, 1);
  }

  GD.register('lightless', {
    name: 'The Lightless', title: 'WHAT THE UNDERCROFT WAS BUILT OVER', element: 'void', flying: true, ownBody: true,
    hp: 270, body: { w: 10, h: 22 }, phases: [0.667, 0.333], wake: 96, reel: 90,
    rig: buildRig, draw: draw, attacks: null, think: think, always: always, onPhase: onPhase, fall: fall, waking: waking, start: start, dyingStep: dyingStep,
    hurtBoxes: function (e) {
      var v = e.vars, boxes = [], mult = v.exposed ? 2 : 1;
      if (v.form === 'double') return [{ x0: e.x - 5, x1: e.x + 5, y0: e.y - 22, y1: e.y, mult: 1 }];
      if (v.appear < 60) return boxes;
      if (v.dark) v.braziers.forEach(function (b) { if (!b.lit) boxes.push({ x0: b.x - 8, x1: b.x + 8, y0: b.y - 20, y1: b.y, mult: 1, onHit: function (g, ctx) { b.lit = 1; ctx.sfx('castember'); ctx.flash('#ffdc9a', 4); ctx.spark(b.x, b.y - 18, '#ffdc9a', 16, 2.2, 24, 0.03); return true; } }); });
      if (v.spent) boxes.push({ x0: e.x - 16, x1: e.x + 16, y0: e.y - 12, y1: e.y + 8, mult: 1.5 * mult, hand: -1 });
      boxes.push({ x0: e.x - 27, x1: e.x + 27, y0: e.y - 26, y1: e.y + 29, mult: mult, hand: -1 });
      v.hands.forEach(function (h, i) { var w = h.pose === 'palm' ? 7 : 10, hh = h.pose === 'palm' ? 10 : 7; boxes.push({ x0: h.x - w, x1: h.x + w, y0: h.y - hh, y1: h.y + hh, mult: mult, hand: i }); });
      return boxes;
    }
  });
  GD.REG.lightless.attacks = { combo: DOUBLE.combo, dashcut: DOUBLE.dashcut, cast: DOUBLE.cast, slam: MASK.slam, sweep: MASK.sweep, clap: MASK.clap, beam: MASK.beam, rain: MASK.rain, rhythm: MASK.rhythm };
})();
