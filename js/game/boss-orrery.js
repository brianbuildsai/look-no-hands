/* boss-orrery.js: the Orrery, in the Dark Observatory.

   The building has a room of tonight's planets; this is what was under it.
   A black core with a violet rim hangs in the middle of the hall, and three
   moons go round it on three rings. At rest the moons are dim and harmless
   and their orbits are drawn faintly, so the paths can always be read. When
   the rings light, the core sinks and the moons come round fast and low, a
   skipping rope of three ropes. A moon is flung at a marked spot, cracks the
   floor each way, and lies there a while before it rolls home. The core
   pulls everything toward it while its inner moon whirls, then lets go,
   winded. It eclipses: the hall goes dark, and it is elsewhere.

   The core's shell takes very little. The moons have a life of their own:
   break one, and the shell cracks until the moon re-forms, and what is
   inside is soft. Below half its life the lit moons leave a burning trail,
   and the pull comes with a flung moon. */
(function () {
  'use strict';
  var GD = window.Guardians;
  if (!GD) return;

  var PAL = { k: '#000000', p: '#1e1a2c', q: '#0d0b14', m: '#4a4560', l: '#5b3fa0', w: '#a48cff', x: '#ffffff', g: '#8f8d88', G: '#c4c1ba' };
  function grid(w, h, fn) { var rows = [], x, y; for (y = 0; y < h; y++) { var s = ''; for (x = 0; x < w; x++) s += fn(x, y) || '.'; rows.push(s); } return rows; }
  function disc(r, fill) { var d = r * 2 + 1; return grid(d, d, function (x, y) { var dx = x - r, dy = y - r, rr = dx * dx + dy * dy; if (rr > r * r + r * 0.6) return '.'; return rr > (r - 1.2) * (r - 1.2) ? 'k' : fill(dx, dy, rr); }); }
  var SPR = null;
  function buildRig() {
    var A = window.Pixels.art, pal = GD.palette(PAL);
    SPR = {
      core: A(disc(15, function (dx, dy, rr) { return rr > 150 ? 'l' : rr > 120 && dx + dy < 0 ? 'w' : dx * dx * 0.6 + (dy + 4) * (dy + 4) < 30 ? 'p' : 'q'; }), pal),
      cracked: A(disc(15, function (dx, dy, rr) { var crack = Math.abs(dx - dy * 0.4 + Math.sin(dy) * 2) < 1.1 || Math.abs(dx * 0.5 + dy - 3 + Math.sin(dx) * 2) < 1 && dx > -2; return crack ? (rr < 60 ? 'x' : 'w') : rr > 150 ? 'l' : 'q'; }), pal),
      moon: A(disc(6, function (dx, dy, rr) { return (dx === -2 && dy === -1) || (dx === 2 && dy === 2) || (dx === 0 && dy === -3) ? 'm' : dx + dy < -2 ? 'G' : 'g'; }), pal),
      moonHot: A(disc(6, function (dx, dy, rr) { return rr < 10 ? 'x' : dx + dy < 0 ? 'w' : 'l'; }), pal)
    };
    SPR.white = window.Pixels.silhouette(SPR.core, '#ffffff');
    return { frames: { idle: [SPR.core] }, flipped: { idle: [SPR.core] }, anchor: { x: 15, y: 15 }, custom: true };
  }

  /* ---- the rings: where a moon is, and the path it keeps ---- */

  var RINGS = [{ rx: 58, ry: 26, speed: 0.030 }, { rx: 100, ry: 44, speed: -0.021 }, { rx: 146, ry: 62, speed: 0.015 }];
  function moonAt(e, m) { var R = RINGS[m.ring], sc = e.vars.spread; return { x: e.x + Math.cos(m.a) * R.rx * sc, y: e.y + Math.sin(m.a) * R.ry * sc }; }

  function draw(e, G) {
    var v = e.vars, A = e.arena, pen = G.pen, cx = G.cx, cy = G.cy, k, n, a, px, py, x = Math.round(e.x) - cx, y = Math.round(e.y) - cy;
    var fade = e.dying > 60 ? Math.max(0, 1 - (e.dying - 60) / 30) : e.state === 'wake' ? Math.min(1, (130 - e.wait) / 60) : 1;
    pen.globalAlpha = fade;
    // the orbits, dotted: faint at rest, bright when the moons are lit
    for (k = 0; k < 3; k++) { var R = RINGS[k], live = v.live, dots = 40 + k * 14; pen.fillStyle = live ? '#a48cff' : '#2b2836'; for (n = 0; n < dots; n++) { a = n / dots * 6.2832 + (live ? G.tick * 0.01 * (k % 2 ? -1 : 1) : 0); px = x + Math.round(Math.cos(a) * R.rx * v.spread); py = y + Math.round(Math.sin(a) * R.ry * v.spread); if (py < A.groundY - cy && py > A.ceilY - cy) pen.fillRect(px, py, 1, 1); } }
    // the accretion: motes on a tilted ring, the far half behind the core and the near half before it
    function motes(front) { for (n = 0; n < 30; n++) { a = n / 30 * 6.2832 + G.tick * 0.05; var s = Math.sin(a); if ((s > 0) !== front) continue; pen.fillStyle = n % 3 === 0 ? '#ffffff' : n % 3 === 1 ? '#a48cff' : '#5b3fa0'; pen.fillRect(x + Math.round(Math.cos(a) * 24), y + Math.round(s * 6 + Math.cos(a) * 3), n % 5 === 0 ? 2 : 1, 1); } }
    motes(false);
    pen.drawImage(e.flash > 0 ? SPR.white : v.cracked > 0 ? SPR.cracked : SPR.core, x - 15, y - 15);
    if (v.cracked > 0) { pen.fillStyle = '#ffffff'; pen.fillRect(x - 1 + (G.tick >> 2) % 3, y - 2, 2, 2); }
    motes(true);
    // the moons
    v.moons.forEach(function (m) {
      if (m.broken > 0) { if (m.broken < 120) { var p0 = moonAt(e, m); pen.fillStyle = '#4a4560'; for (n = 0; n < 5; n++) pen.fillRect(Math.round(p0.x + Math.cos(n * 1.3 + G.tick * 0.1) * (m.broken / 20)) - cx, Math.round(p0.y + Math.sin(n * 1.3 + G.tick * 0.1) * (m.broken / 20)) - cy, 1, 1); } return; }
      var hot = m.hot || (v.live && !m.away), img = m.flash > 0 ? SPR.moonHot : hot ? SPR.moonHot : SPR.moon;
      pen.drawImage(img, Math.round(m.x) - 6 - cx, Math.round(m.y) - 6 - cy);
      if (m.hp < m.maxHp) { pen.fillStyle = '#0b0b12'; pen.fillRect(Math.round(m.x) - 6 - cx, Math.round(m.y) - 10 - cy, 13, 2); pen.fillStyle = '#a48cff'; pen.fillRect(Math.round(m.x) - 6 - cx, Math.round(m.y) - 10 - cy, Math.round(13 * m.hp / m.maxHp), 2); }
    });
    pen.globalAlpha = 1;
  }

  /* ---- what it does ---- */

  var VOID = ['#5b3fa0', '#a48cff', '#ffffff', '#2b2836'];
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function dustOf(ctx, x, y, n, speed, up) { for (var k = 0; k < n; k++) { var a = up ? -Math.PI * ctx.random() : ctx.random() * 6.2832, s = speed * (0.3 + ctx.random()); ctx.particle({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 16 + ctx.random() * 22, max: 38, colour: VOID[k % 4], size: ctx.random() < 0.3 ? 2 : 1, gravity: up ? 0.05 : 0 }); } }
  function home(e) { return e.arena.groundY - 74; }
  function liveBoxes(e) { var out = []; e.vars.moons.forEach(function (m) { if (m.broken > 0 || m.away) return; out.push({ x0: m.x - 5, x1: m.x + 5, y0: m.y - 5, y1: m.y + 5, damage: 1, element: 'void' }); }); return out; }
  // a moon struck: it has a life of its own, and when it breaks the shell cracks
  function strikeMoon(e, ctx, m, damage) {
    m.hp -= damage; m.flash = 5; ctx.sfx('hit'); ctx.spark(m.x, m.y, '#c4c1ba', 6, 1.6, 14, 0.04); ctx.number(m.x, m.y - 12, damage, '#c4c1ba');
    if (m.hp <= 0) { m.broken = 420; m.away = false; m.hot = false; e.vars.cracked = 300; dustOf(ctx, m.x, m.y, 30, 3, false); ctx.shake(5); ctx.sfx('shatter'); ctx.flash('#a48cff', 6); ctx.number(e.x, e.y - 26, 'THE SHELL CRACKS', '#ffffff'); if (e.attack && e.attack.def.name === 'fling') { e.attack.t = 9999; } }
    return true;
  }

  var ATTACKS = {
    // the rings light, the core sinks, and the moons come round fast and low
    orbits: {
      name: 'orbits', windup: 62, active: 210, recover: 40, cooldown: 50, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena;
        if (t === 1) { ctx.telegraph(e.x - 112, A.groundY - 26, 224, 26, w, '#a48cff'); ctx.sfx('roar'); }
        v.lit = t / w; e.y += (A.groundY - 58 - e.y) * 0.05;
      },
      fire: function (e, ctx) { e.vars.live = true; ctx.sfx('caststorm'); ctx.shake(2); },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena; e.y += (A.groundY - 58 - e.y) * 0.05; v.spin = (e.phase ? 3.1 : 2.5); v.spreadTo = 1 + 0.12 * Math.sin(t * 0.05);
        if (e.phase && t % 5 === 0) v.moons.forEach(function (m) { if (m.broken <= 0 && m.y > A.groundY - 40) ctx.hazard({ x0: m.x - 4, x1: m.x + 4, y0: m.y - 4, y1: m.y + 4, life: 34, damage: 1, element: 'void', colour: '#5b3fa0' }); });
        if (t % 20 === 1) ctx.sfx('swing');
      },
      box: function (e) { return liveBoxes(e); },
      end: function (e) { var v = e.vars; v.live = false; v.spin = 1; v.spreadTo = 1; v.lit = 0; }
    },
    // a moon, flung at where she stood; it cracks the floor each way and lies there a while
    fling: {
      name: 'fling', windup: 58, active: 22, recover: 110, cooldown: 40, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { var v = e.vars, free = v.moons.filter(function (m) { return m.broken <= 0; }); v.shot = free.length ? free[Math.floor(ctx.random() * free.length)] : null; if (v.shot) { v.shot.hot = true; v.shot.away = true; } },
      telling: function (e, ctx, t, w) {
        var v = e.vars, A = e.arena, m = v.shot; if (!m) return;
        if (t <= 28) v.tx = clamp(ctx.hero.x, A.left + 14, A.right - 14);
        if (t === 29) { ctx.telegraphCircle(v.tx, A.groundY - 2, 20, w - 28, '#a48cff'); ctx.telegraphLine(m.x, m.y, v.tx, A.groundY - 6, w - 28, '#ffffff'); ctx.telegraphLine(v.tx, A.groundY - 3, A.left, A.groundY - 3, w - 28, '#5b3fa0'); ctx.telegraphLine(v.tx, A.groundY - 3, A.right, A.groundY - 3, w - 28, '#5b3fa0'); ctx.sfx('select'); }
        m.x += (e.x + (m.x < e.x ? -30 : 30) - m.x) * 0.06; m.y += (e.y - 34 - m.y) * 0.06;
        ctx.glow(m.x, m.y, 8 + t / w * 10, '#ffffff', 0.4);
      },
      fire: function (e, ctx) { var m = e.vars.shot; if (m) { m.from = { x: m.x, y: m.y }; ctx.sfx('shot'); } },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, m = v.shot; if (!m || m.broken > 0) return;
        if (t <= 14) { var s = t / 14; m.x = m.from.x + (v.tx - m.from.x) * s; m.y = m.from.y + (A.groundY - 7 - m.from.y) * s * s; ctx.particle({ x: m.x, y: m.y, vx: 0, vy: 0, life: 10, max: 10, colour: '#a48cff', size: 2, gravity: 0 }); }
        if (t === 14) { ctx.shake(6); ctx.sfx('moon'); dustOf(ctx, m.x, A.groundY - 2, 28, 3.2, true); [1, -1].forEach(function (d) { ctx.projectile({ x: m.x + d * 14, y: A.groundY - 5, vx: d * 2.5, vy: 0, life: 170, colour: '#5b3fa0', core: '#a48cff', size: 9, damage: 1, element: 'plain', gravity: 0, wave: true, cause: 'orrery' }); }); if (e.phase) dustOf(ctx, m.x, A.groundY - 10, 10, 2, false); }
      },
      box: function (e, t) { var m = e.vars.shot; return m && m.broken <= 0 && t <= 16 ? [{ x0: m.x - 9, x1: m.x + 9, y0: m.y - 9, y1: m.y + 9, damage: 1, element: 'void' }] : []; },
      // it lies where it fell, dim, and then rolls home
      resting: function (e, ctx, t) { var m = e.vars.shot; if (!m || m.broken > 0) return; m.hot = false; if (t > 78) { var p = moonAt(e, m); m.x += (p.x - m.x) * 0.12; m.y += (p.y - m.y) * 0.12; } },
      end: function (e) { var m = e.vars.shot; if (m) { m.away = false; m.hot = false; } e.vars.shot = null; }
    },
    // it pulls everything toward it while the inner moon whirls; then it lets go, winded
    pull: {
      name: 'pull', windup: 52, active: 150, recover: 120, cooldown: 40, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      telling: function (e, ctx, t, w) { var A = e.arena; if (t === 1) { ctx.telegraphCircle(e.x, A.groundY - 30, 62, w, '#a48cff'); ctx.sfx('roar'); } e.y += (A.groundY - 44 - e.y) * 0.05; for (var k = 0; k < 2; k++) { var a = ctx.random() * 6.2832, r = 60 + ctx.random() * 80; ctx.particle({ x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r * 0.6, vx: -Math.cos(a) * r / 20, vy: -Math.sin(a) * r * 0.6 / 20, life: 18, max: 18, colour: VOID[k], size: 1, gravity: 0 }); } },
      fire: function (e, ctx) { e.vars.live = true; e.vars.flung = false; ctx.sfx('castfrost'); },
      during: function (e, ctx, t) {
        var v = e.vars, A = e.arena, hero = ctx.hero, dx = e.x - hero.x, far = Math.abs(dx);
        e.y += (A.groundY - 44 - e.y) * 0.05; v.spin = 3.4; v.spreadTo = 0.62;
        // the pull is on her place, not her speed, so running only slows it
        if (hero.alive && far > 8) hero.x = clamp(hero.x + (dx > 0 ? 1 : -1) * (hero.onGround ? 0.8 : 1.1) * Math.min(1, 220 / (far + 60)), A.left + 6, A.right - 6);
        for (var k = 0; k < 3; k++) { var a = ctx.random() * 6.2832, r = 50 + ctx.random() * 110; ctx.particle({ x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r * 0.6, vx: -Math.cos(a) * r / 16, vy: -Math.sin(a) * r * 0.6 / 16, life: 14, max: 14, colour: VOID[k], size: 1, gravity: 0 }); }
        if (t % 24 === 1) ctx.sfx('dash');
      },
      box: function (e) { return liveBoxes(e).slice(0, 1).concat(e.phase ? liveBoxes(e).slice(1, 2) : []); },
      resting: function (e, ctx, t) { var v = e.vars, A = e.arena; v.live = false; v.spin = 1; v.spreadTo = 1; v.winded = t < 96; e.y += ((v.winded ? A.groundY - 40 : home(e)) - e.y) * 0.06; if (t === 1) { dustOf(ctx, e.x, e.y, 40, 3.4, false); ctx.shake(4); ctx.sfx('boom'); } },
      end: function (e) { var v = e.vars; v.live = false; v.spin = 1; v.spreadTo = 1; v.winded = false; }
    },
    // the hall goes dark, and it is elsewhere
    eclipse: {
      name: 'eclipse', windup: 40, active: 36, recover: 24, cooldown: 10, keepFacing: true, anims: { windup: 'idle', attack: 'idle' },
      start: function (e, ctx) { var A = e.arena, mid = (A.left + A.right) / 2, spots = [mid - 96, mid, mid + 96].filter(function (x) { return Math.abs(x - e.x) > 40; }); e.vars.toX = spots[Math.floor(ctx.random() * spots.length)]; },
      telling: function (e, ctx, t) { if (t === 1) ctx.sfx('eclipse'); },
      fire: function (e, ctx) { ctx.blackout(true); },
      during: function (e, ctx, t) { var v = e.vars; e.x += (v.toX - e.x) * 0.16; ctx.glow(e.x, e.y, 26, '#a48cff', 0.5); ctx.light(e.x, e.y, 30, 0.6); },
      resting: function (e, ctx, t) { if (t === 1) { ctx.blackout(false); ctx.flash('#a48cff', 5); dustOf(ctx, e.x, e.y, 24, 2.6, false); } },
      end: function (e, ctx) { ctx.blackout(false); }
    }
  };

  var SCRIPTS = [['orbits', 'fling', 'pull', 'fling', 'eclipse'], ['eclipse', 'orbits', 'pull', 'fling', 'fling']];

  function think(e, ctx) {
    var v = e.vars; e.state = 'idle';
    e.y += (home(e) + Math.sin(e.clock * 0.04) * 4 - e.y) * 0.04;
    if (e.cooldown > 0 || !ctx.hero.alive) return null;
    var script = SCRIPTS[e.phase], want = script[e.script % script.length];
    if (want === 'fling' && !v.moons.some(function (m) { return m.broken <= 0; })) want = 'pull';
    e.script++;
    return ATTACKS[want];
  }

  function start(e, arena) { var v = e.vars, k; e.x = (arena.left + arena.right) / 2; e.y = arena.groundY - 74; v.spread = 1; v.spreadTo = 1; v.spin = 1; v.live = false; v.cracked = 0; v.winded = false; v.moons = []; for (k = 0; k < 3; k++) v.moons.push({ ring: k, a: k * 2.1, hp: 12, maxHp: 12, broken: 0, flash: 0, away: false, hot: false, x: e.x, y: e.y }); }
  function waking(e, ctx, t) { if (t === 1) ctx.sfx('freeze'); if (t === 80) { ctx.sfx('roar'); ctx.shake(4); dustOf(ctx, e.x, e.y, 40, 3, false); } e.vars.spread = Math.min(1, t / 90); e.vars.spreadTo = 1; }

  function always(e, ctx) {
    var v = e.vars, A = e.arena, hero = ctx.hero;
    v.spread += (v.spreadTo - v.spread) * 0.05;
    if (v.cracked > 0) { v.cracked--; if (!e.attack) e.y += (A.groundY - 46 - e.y) * 0.05; if (v.cracked % 10 === 0) ctx.particle({ x: e.x + (ctx.random() - 0.5) * 16, y: e.y + (ctx.random() - 0.5) * 16, vx: 0, vy: -0.5, life: 20, max: 20, colour: '#ffffff', size: 1, gravity: 0 }); }
    v.moons.forEach(function (m) {
      if (m.flash > 0) m.flash--;
      if (m.broken > 0) { m.broken--; if (m.broken === 0) { m.hp = m.maxHp; dustOf(ctx, moonAt(e, m).x, moonAt(e, m).y, 12, 1.6, false); } return; }
      m.a += RINGS[m.ring].speed * v.spin;
      if (!m.away) { var p = moonAt(e, m); m.x = p.x; m.y = Math.min(A.groundY - 6, Math.max(A.ceilY + 6, p.y)); }
      if (v.live && !m.away) ctx.glow(m.x, m.y, 9, '#a48cff', 0.35);
      ctx.light(m.x, m.y, 16, 0.5);
    });
    ctx.light(e.x, e.y, 64, 0.85); ctx.glow(e.x, e.y, 24 + 3 * Math.sin(e.clock * 0.08), '#5b3fa0', 0.3);
  }
  function onPhase(e, ctx) { var v = e.vars; v.live = false; v.spin = 1; v.spreadTo = 1; v.winded = false; ctx.blackout(false); if (v.shot) { v.shot.away = false; v.shot.hot = false; v.shot = null; } dustOf(ctx, e.x, e.y, 50, 3.6, false); ctx.flash('#a48cff', 8); }
  function fall(e, ctx) { var v = e.vars; ctx.blackout(false); v.live = false; v.moons.forEach(function (m) { if (m.broken <= 0) { dustOf(ctx, m.x, m.y, 16, 2.4, false); m.broken = 9999; } }); v.cracked = 9999; }
  function dyingStep(e, ctx) {
    e.y = Math.min(e.arena.groundY - 16, e.y + 0.8); e.vars.spread *= 0.97;
    if (e.dying % 7 === 0 && e.dying < 60) { dustOf(ctx, e.x + (ctx.random() - 0.5) * 24, e.y + (ctx.random() - 0.5) * 24, 12, 2.6, false); ctx.shake(2); ctx.sfx('hit'); }
    if (e.dying === 58) { dustOf(ctx, e.x, e.y, 70, 4.5, false); ctx.sfx('boom'); ctx.flash('#ffffff', 12); ctx.shake(8); }
    ctx.light(e.x, e.y, 60 + e.dying * 2, 1);
  }

  GD.register('orrery', {
    name: 'The Orrery', title: 'WHAT WAS UNDER THE ROOM OF PLANETS', element: 'void', flying: true, ownBody: true,
    hp: 180, body: { w: 30, h: 30 }, phases: [0.5], wake: 130, reel: 70,
    rig: buildRig, draw: draw, attacks: ATTACKS, think: think, always: always, onPhase: onPhase, fall: fall, waking: waking, start: start, dyingStep: dyingStep,
    tempo: function (e) { return e.phase ? 0.7 : 1; },
    hurtBoxes: function (e) {
      var v = e.vars, boxes = [];
      v.moons.forEach(function (m) { if (m.broken > 0) return; boxes.push({ x0: m.x - 7, x1: m.x + 7, y0: m.y - 7, y1: m.y + 7, mult: 1, onHit: function (g, ctx, damage) { return strikeMoon(g, ctx, m, damage); } }); });
      boxes.push({ x0: e.x - 14, x1: e.x + 14, y0: e.y - 14, y1: e.y + 14, mult: v.cracked > 0 ? 1.5 : v.winded ? 1 : 0.4, core: true });
      return boxes;
    }
  });
})();
