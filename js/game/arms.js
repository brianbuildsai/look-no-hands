/* arms.js: what the newer weapons do at the end of their strokes.

   The engine keeps the older finishers (the quake, the pillar of the sun,
   the flock). Everything added since lives here so that file does not
   swell: each effect is a small thing with a life of its own, stepped once
   a step and drawn under the dark, written against a kit of engine helpers
   (strike, touch, spark, ring, light) handed in by undercroft.js. Nothing
   here knows about the canvas beyond the pen it is given.

     Arms.fire(name, T)      a finisher begins
     Arms.swing(sw, n, T)    a stroke whose shape the engine does not know
     Arms.step(T)            once a step
     Arms.draw(T)            under the dark, over the hero
     Arms.over(T)            over everything but the HUD
     Arms.clear()            a new stage, a new run */
(function () {
  'use strict';

  var fx = [];                      // everything alive
  var FIRE = {}, STEP = {}, DRAW = {}, OVER = {};

  function add(o) { o.t = 0; fx.push(o); return o; }
  function groundAt(T, x, y) {
    for (var yy = y - 10; yy < y + 96; yy += 4) { var tile = T.tileAt(Math.floor(x / 16), Math.floor(yy / 16)); if (tile === 1 || tile === 2) return Math.floor(yy / 16) * 16; }
    return y;
  }
  function bit(T, x, y, vx, vy, life, colour, size, gravity) { T.particle({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, colour: colour, size: size || 1, gravity: gravity || 0 }); }

  /* ---- shots: anything a weapon throws that flies straight ---- */

  function shot(T, o) { o.kind = 'shot'; o.seen = []; o.life = o.life || 50; return add(o); }
  STEP.shot = function (s, T) {
    s.x += s.vx; s.y += s.vy;
    if (T.tick() % 2 === 0) bit(T, s.x, s.y, 0, 0, 8, s.colour, 1, 0);
    var hitWall = T.tileAt(Math.floor(s.x / 16), Math.floor(s.y / 16)) === 1;
    var n = T.touch({ x0: s.x - 4, x1: s.x + 4, y0: s.y - 4, y1: s.y + 4 }, s.damage, s.element, s.x - s.vx * 4, s.seen, !s.pierce);
    if (--s.life <= 0 || hitWall || n && !s.pierce) { T.spark(s.x, s.y, s.colour, 6, 1.4, 12, 0.03); return false; }
    return true;
  };
  DRAW.shot = function (s, T, g, cx, cy) {
    var a = Math.atan2(s.vy, s.vx), x = Math.round(s.x) - cx, y = Math.round(s.y) - cy;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = s.colour; g.beginPath(); g.moveTo(6, 0); g.lineTo(0, -2.5); g.lineTo(-5, 0); g.lineTo(0, 2.5); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(-1, -0.5, 5, 1);
    g.restore();
    T.light(s.x, s.y, 14, 0.5);
  };

  /* ---- the Returning Disc: out, and back to the hand ---- */

  function throwDisc(T, n, big, angle) {
    var h = T.hero, w = T.weapon(), d = h.dir, sp = big ? 5.4 : 4.6;
    add({ kind: 'disc', x: h.x + d * 10, y: h.y - 15, vx: Math.cos(angle) * sp * d, vy: Math.sin(angle) * sp, dir: d, out: true, seen: [], spin: 0, big: big, damage: w.damage[n] + T.mods().damage, colour: w.trail, trail: [] });
  }
  STEP.disc = function (s, T) {
    var h = T.hero;
    s.spin += 0.6; s.trail.push(s.x, s.y); if (s.trail.length > 12) s.trail.splice(0, 2);
    if (s.out) {
      s.x += s.vx; s.y += s.vy; s.vx *= 0.955; s.vy *= 0.955;
      var wall = T.tileAt(Math.floor((s.x + s.vx * 2) / 16), Math.floor(s.y / 16)) === 1;
      if (wall) T.spark(s.x, s.y, '#ffffff', 5, 1.4, 10, 0.04);
      if (wall || Math.abs(s.vx) + Math.abs(s.vy) < 0.9) { s.out = false; s.seen = []; s.speed = 1; }
    } else {
      var dx = h.x - s.x, dy = h.y - 14 - s.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      s.speed = Math.min(5.5, s.speed + 0.3); s.x += dx / len * s.speed; s.y += dy / len * s.speed;
      if (len < 9 || s.t > 200) { T.spark(h.x + h.dir * 6, h.y - 14, s.colour, 4, 1, 8, 0); return false; }
    }
    T.touch({ x0: s.x - 6, x1: s.x + 6, y0: s.y - 6, y1: s.y + 6 }, s.damage, null, s.x - (s.out ? s.vx : -s.dir) * 4, s.seen, false);
    return true;
  };
  DRAW.disc = function (s, T, g, cx, cy) {
    var x = Math.round(s.x) - cx, y = Math.round(s.y) - cy, r = s.big ? 6 : 5, k;
    g.strokeStyle = s.colour; g.globalAlpha = 0.4; g.lineWidth = 2; g.beginPath();
    for (k = 0; k < s.trail.length; k += 2) { if (k) g.lineTo(s.trail[k] - cx, s.trail[k + 1] - cy); else g.moveTo(s.trail[k] - cx, s.trail[k + 1] - cy); }
    g.stroke(); g.globalAlpha = 1;
    g.strokeStyle = '#0b0b12'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.stroke();
    g.strokeStyle = '#d8d8e0'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, s.spin, s.spin + 1.2); g.stroke(); g.beginPath(); g.arc(x, y, r, s.spin + 3.14, s.spin + 4.34); g.stroke();
    T.light(s.x, s.y, 12, 0.4);
  };

  /* ---- the Pike: the last thrust carries her through them ---- */

  FIRE.skewer = function (T) { add({ kind: 'skewer', seen: [], dir: T.hero.dir }); T.sfx('dash'); };
  STEP.skewer = function (s, T) {
    var h = T.hero;
    if (s.t > 9 || !h.alive) return false;
    h.vx = s.dir * 5.2; h.invuln = Math.max(h.invuln, 4);
    T.touch({ x0: h.x - 14, x1: h.x + 14, y0: h.y - 22, y1: h.y - 3 }, 3 + T.mods().damage, null, h.x - s.dir * 8, s.seen, false);
    for (var k = 0; k < 2; k++) bit(T, h.x - s.dir * (4 + T.random() * 10), h.y - 8 - T.random() * 14, -s.dir * (1 + T.random()), 0, 10, k ? '#6ec6ff' : '#ffffff', 1, 0);
    return true;
  };

  /* ---- the Trident: a geyser under whatever stands ahead ---- */

  FIRE.geyser = function (T) {
    var h = T.hero, near = T.nearest(h.x + h.dir * 40, h.y - 12, 70, h.dir), x = near ? near.x : h.x + h.dir * 44;
    add({ kind: 'geyser', x: x, y: groundAt(T, x, near ? near.y : h.y), max: 44 });
    T.sfx('gust');
  };
  STEP.geyser = function (s, T) {
    var k, list = T.creatures();
    if (s.t === 8) {
      T.strike({ x0: s.x - 12, x1: s.x + 12, y0: s.y - 76, y1: s.y + 2 }, 4 + T.mods().damage, 2, 'tide');
      for (k = 0; k < list.length; k++) { var c = list[k]; if (!c.dying && !c.boss && !c.spec.flying && Math.abs(c.x - s.x) < 16 && Math.abs(c.y - s.y) < 24) { c.vy = -4.6; c.onGround = false; c.y -= 2; } }
      T.shake(3);
    }
    if (s.t > 4 && s.t < 34) for (k = 0; k < 3; k++) bit(T, s.x + (T.random() - 0.5) * 14, s.y - T.random() * 60, (T.random() - 0.5) * 1.6, -1 - T.random() * 2, 20, T.random() < 0.4 ? '#ffffff' : '#5fd4c4', 1, 0.12);
    return s.t < s.max;
  };
  DRAW.geyser = function (s, T, g, cx, cy) {
    var t = s.t / s.max, rise = t < 0.2 ? t / 0.2 : t > 0.7 ? Math.max(0, 1 - (t - 0.7) / 0.3) : 1, hgt = Math.round(72 * rise), x = Math.round(s.x) - cx, y = Math.round(s.y) - cy, k;
    if (s.t < 8) { g.fillStyle = 'rgba(95,212,196,0.5)'; g.fillRect(x - 10, y - 1, 20, 2); return; }
    for (k = 0; k < hgt; k += 2) {
      var wob = Math.round(Math.sin((k + s.t * 3) * 0.3) * 2), wd = Math.round(9 - k / 72 * 4);
      g.fillStyle = '#1f7a70'; g.fillRect(x - wd + wob, y - k - 2, wd * 2, 2);
      g.fillStyle = '#5fd4c4'; g.fillRect(x - wd + 2 + wob, y - k - 2, wd * 2 - 4, 2);
      g.fillStyle = '#d6fff8'; g.fillRect(x - 1 + wob, y - k - 2, 2, 2);
    }
    g.fillStyle = '#ffffff'; g.fillRect(x - 8, y - hgt - 4, 16, 3); g.fillRect(x - 5, y - hgt - 6, 10, 2);
    T.light(s.x, s.y - hgt / 2, 40, 0.7); T.glow(s.x, s.y - hgt / 2, 26, '#5fd4c4', 0.25);
  };

  /* ---- the Mainspring Saw: every cut lands twice, and the last sends a saw along the floor and back ---- */

  STEP.echo = function (s, T) { if (s.t < 5) return true; if (T.strike(s.box, s.damage, 0, s.element)) T.spark((s.box.x0 + s.box.x1) / 2, (s.box.y0 + s.box.y1) / 2, '#efd27a', 5, 1.4, 10, 0.05); return false; };
  FIRE.runningsaw = function (T) {
    var h = T.hero;
    add({ kind: 'saw', x: h.x + h.dir * 14, y: groundAt(T, h.x + h.dir * 14, h.y), x0: h.x, dir: h.dir, back: false, seen: [], spin: 0, gone: 0 });
    T.sfx('clink');
  };
  STEP.saw = function (s, T) {
    s.spin += 0.5 * s.dir;
    var ahead = s.x + s.dir * 8, wall = T.tileAt(Math.floor(ahead / 16), Math.floor((s.y - 4) / 16)) === 1, below = T.tileAt(Math.floor(ahead / 16), Math.floor((s.y + 2) / 16)), floor = below === 1 || below === 2;
    if (!s.back && (wall || !floor || Math.abs(s.x - s.x0) > 130)) { s.back = true; s.dir = -s.dir; s.seen = []; T.spark(s.x, s.y - 6, '#ffffff', 6, 1.6, 10, 0.05); }
    else if (s.back && (wall || !floor || (s.x - s.x0) * s.dir > 6 || s.t > 170)) { T.spark(s.x, s.y - 6, '#efd27a', 10, 1.8, 14, 0.05); return false; }
    s.x += s.dir * 3.2;
    T.touch({ x0: s.x - 7, x1: s.x + 7, y0: s.y - 14, y1: s.y }, 3 + T.mods().damage, 'gear', s.x - s.dir * 6, s.seen, false);
    if (T.tick() % 2 === 0) bit(T, s.x - s.dir * 5, s.y - 1, -s.dir * (0.5 + T.random()), -0.6 - T.random(), 10, T.random() < 0.5 ? '#ffdc9a' : '#ffffff', 1, 0.08);
    return true;
  };
  DRAW.saw = function (s, T, g, cx, cy) {
    var x = Math.round(s.x) - cx, y = Math.round(s.y) - 7 - cy, k;
    g.fillStyle = '#0b0b12'; g.beginPath(); g.arc(x, y, 7.5, 0, 6.2832); g.fill();
    g.fillStyle = '#c9a44c'; g.beginPath();
    for (k = 0; k < 16; k++) { var a = s.spin + k / 16 * 6.2832, r = k % 2 ? 4.5 : 7; if (k) g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.fill();
    g.fillStyle = '#efd27a'; g.beginPath(); g.arc(x, y, 3, 0, 6.2832); g.fill();
    g.fillStyle = '#0b0b12'; g.fillRect(x - 1, y - 1, 2, 2);
    T.light(s.x, s.y - 7, 16, 0.5);
  };

  /* ---- the Glass Sabre: the thrust breaks into three ---- */

  FIRE.shardfan = function (T) {
    var h = T.hero, d = h.dir;
    for (var k = -1; k <= 1; k++) shot(T, { x: h.x + d * 18, y: h.y - 14, vx: d * 4.6 * Math.cos(k * 0.28), vy: 4.6 * Math.sin(k * 0.28), damage: 3 + T.mods().damage, element: 'glass', colour: '#ff9ecb', life: 44 });
    T.sfx('icicle'); T.flash('#ff9ecb', 3);
  };

  /* ---- the Umbral Flail: a small singularity where the lash ends ---- */

  FIRE.singularity = function (T) {
    var h = T.hero, w = T.weapon();
    add({ kind: 'hole', x: h.x + h.dir * w.reach * T.mods().reach * 0.85, y: h.y - 16, max: 60 });
    T.sfx('eclipse');
  };
  STEP.hole = function (s, T) {
    var list = T.creatures(), k;
    if (s.t < 46) {
      for (k = 0; k < list.length; k++) {
        var c = list[k]; if (c.dying || c.boss) continue;
        var dx = s.x - c.x, dy = s.y - (c.spec.flying ? c.y : c.y - c.h / 2), len = Math.sqrt(dx * dx + dy * dy);
        if (len > 84 || len < 4) continue;
        var pull = (c.elder ? 0.5 : 1.3) * (1 - len / 100), nx = dx / len * pull;
        if (T.tileAt(Math.floor((c.x + nx + (nx > 0 ? c.w / 2 : -c.w / 2)) / 16), Math.floor((c.y - 4) / 16)) !== 1) c.x += nx;
        if (c.spec.flying) c.y += dy / len * pull;
      }
      for (k = 0; k < 2; k++) { var a = T.random() * 6.2832, r = 30 + T.random() * 30; bit(T, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, -Math.cos(a) * 2 + Math.sin(a), -Math.sin(a) * 2 - Math.cos(a), 12, T.random() < 0.3 ? '#ffffff' : '#a48cff', 1, 0); }
    }
    if (s.t === 46) {
      T.strike({ x0: s.x - 30, x1: s.x + 30, y0: s.y - 30, y1: s.y + 30 }, 6 + T.mods().damage, 2, null);
      T.ring({ x: s.x, y: s.y, r: 4, grow: 3.2, life: 14, max: 14, colour: '#a48cff' }); T.spark(s.x, s.y, '#d9b8ff', 26, 3, 22, 0); T.flash('#a48cff', 5); T.shake(5); T.sfx('boom');
    }
    return s.t < s.max;
  };
  DRAW.hole = function (s, T, g, cx, cy) {
    if (s.t >= 46) return;
    var x = Math.round(s.x) - cx, y = Math.round(s.y) - cy, r = Math.min(9, 2 + s.t * 0.4) * (s.t > 40 ? (46 - s.t) / 6 : 1), k;
    g.strokeStyle = '#a48cff'; g.lineWidth = 1;
    for (k = 0; k < 3; k++) { g.globalAlpha = 0.7 - k * 0.2; g.beginPath(); g.ellipse(x, y, r + 5 + k * 5, (r + 5 + k * 5) * 0.4, s.t * 0.12 + k, 0, 4.4); g.stroke(); }
    g.globalAlpha = 1;
    g.fillStyle = '#000000'; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
    g.strokeStyle = '#d9b8ff'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r + 0.5, 0, 6.2832); g.stroke();
    T.glow(s.x, s.y, 30, '#a48cff', 0.35);
  };

  /* ---- the Bellringer's Maul: a toll that stops what hears it ---- */

  FIRE.toll = function (T) {
    var h = T.hero, x = h.x + h.dir * 22, list = T.creatures(), k;
    for (k = 0; k < 3; k++) add({ kind: 'tollring', x: x, y: h.y - 4, wait: k * 7, max: 30 + k * 7 });
    for (k = 0; k < list.length; k++) {
      var c = list[k]; if (c.dying) continue;
      var dx = c.x - x, dy = c.y - h.y; if (dx * dx + dy * dy > 84 * 84) continue;
      if (c.boss) continue;
      c.status.stun = c.elder ? 50 : 100; if (c.attack) { if (c.attack.def.end) c.attack.def.end(c, T.ctx); c.attack = null; c.boxes = []; } c.cooldown = Math.max(c.cooldown, 60);
      T.number(c.x, c.y - c.h - 14, 'STUNNED', '#efd27a');
    }
    T.sfx('bell'); T.shake(6); T.flash('#efd27a', 4);
  };
  STEP.tollring = function (s) { return s.t < s.max; };
  DRAW.tollring = function (s, T, g, cx, cy) {
    if (s.t < s.wait) return;
    var p = (s.t - s.wait) / (s.max - s.wait), r = 6 + p * 84;
    g.globalAlpha = (1 - p) * 0.9; g.strokeStyle = '#efd27a'; g.lineWidth = 2; g.beginPath(); g.arc(Math.round(s.x) - cx, Math.round(s.y) - cy, r, 0, 6.2832); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.arc(Math.round(s.x) - cx, Math.round(s.y) - cy, r - 2, 0, 6.2832); g.stroke(); g.globalAlpha = 1;
    T.light(s.x, s.y, r * 0.8, 0.3 * (1 - p));
  };

  /* ---- the way in ---- */

  function fire(name, T) { if (!FIRE[name]) return false; FIRE[name](T); return true; }
  // a stroke of a shape the engine does not draw itself; and what a weapon adds to every stroke
  function swing(sw, n, T) {
    var w = T.weapon();
    if (sw.shape === 'throw') {
      if (sw.finisher) { throwDisc(T, n, true, -0.3); throwDisc(T, n, true, 0); throwDisc(T, n, true, 0.3); } else throwDisc(T, n, false, 0);
      return true;
    }
    if (w.twice) { var box = T.swingBox(sw); if (box) add({ kind: 'echo', box: box, damage: Math.max(1, Math.ceil((w.damage[n] + T.mods().damage) / 2)), element: w.element || null }); }
    return false;
  }
  function step(T) {
    for (var k = fx.length - 1; k >= 0; k--) { var s = fx[k]; s.t++; if (!STEP[s.kind] || !STEP[s.kind](s, T)) fx.splice(fx.indexOf(s), 1); }
    // whatever a toll has stopped sees stars
    var list = T.creatures();
    for (var j = 0; j < list.length; j++) { var c = list[j]; if (!c.dying && c.status.stun > 0 && T.tick() % 5 === 0) { var a = T.tick() * 0.2; bit(T, c.x + Math.cos(a) * 7, c.y - c.h - 5 + Math.sin(a) * 2, 0, 0, 10, '#efd27a', 1, 0); } }
  }
  function draw(T) { var cx = Math.round(T.cam.x), cy = Math.round(T.cam.y); for (var k = 0; k < fx.length; k++) if (DRAW[fx[k].kind]) DRAW[fx[k].kind](fx[k], T, T.pen, cx, cy); }
  function over(T) { var cx = Math.round(T.cam.x), cy = Math.round(T.cam.y); for (var k = 0; k < fx.length; k++) if (OVER[fx[k].kind]) OVER[fx[k].kind](fx[k], T, T.pen, cx, cy); }
  function clear() { fx.length = 0; }
  function count(kind) { var n = 0; for (var k = 0; k < fx.length; k++) if (!kind || fx[k].kind === kind) n++; return n; }

  window.Arms = { fire: fire, swing: swing, step: step, draw: draw, over: over, clear: clear, count: count, FIRE: FIRE, STEP: STEP, DRAW: DRAW, OVER: OVER, add: add, shot: shot, bit: bit, groundAt: groundAt };
})();
