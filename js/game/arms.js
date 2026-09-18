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
  // is there floor to stand on under x within three tiles, with nothing that burns in the way
  function safeFloor(T, x, y) {
    for (var yy = y + 2; yy < y + 56; yy += 8) { var tile = T.tileAt(Math.floor(x / 16), Math.floor(yy / 16)); if (tile === 1 || tile === 2) return true; if (tile === 3 || tile === 4) return false; }
    return false;
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

  /* ---- Thunderhead: the last thrust calls a storm, and her dash leaves lightning behind it ---- */

  function jagged(x0, y0, x1, y1, rnd, sway) {
    var pts = [x0, y0], n = Math.max(4, Math.round(Math.abs(y1 - y0) / 16));
    for (var k = 1; k < n; k++) { var f = k / n; pts.push(x0 + (x1 - x0) * f + (rnd() - 0.5) * sway * (1 - f * 0.6), y0 + (y1 - y0) * f); }
    pts.push(x1, y1);
    return pts;
  }
  function strokePath(g, pts, cx, cy) { g.beginPath(); for (var k = 0; k < pts.length; k += 2) { if (k) g.lineTo(pts[k] - cx, pts[k + 1] - cy); else g.moveTo(pts[k] - cx, pts[k + 1] - cy); } g.stroke(); }

  FIRE.tempest = function (T) {
    var h = T.hero, list = T.creatures().filter(function (c) { return !c.dying && Math.abs(c.x - h.x) < 220 && Math.abs(c.y - h.y) < 130; }), bolts = [], k;
    list.sort(function (a, b) { return Math.abs(a.x - h.x) - Math.abs(b.x - h.x); });
    for (k = 0; k < 6; k++) {
      var c = list.length ? list[k % list.length] : null;
      bolts.push({ at: 16 + k * 8, target: c, again: !!c && k >= list.length, x: c ? c.x : h.x + h.dir * (30 + k * 26), y: c ? c.y : h.y, path: null, fork: null, life: 0 });
    }
    add({ kind: 'tempest', bolts: bolts, max: 16 + 6 * 8 + 24, lit: 0 });
    T.sfx('roarherald'); T.flash('#8fa3ff', 4);
  };
  STEP.tempest = function (s, T) {
    if (s.lit > 0) s.lit--;
    for (var k = 0; k < s.bolts.length; k++) {
      var b = s.bolts[k];
      if (b.life > 0) b.life--;
      if (s.t !== b.at) continue;
      if (b.target && !b.target.dying) { b.x = b.target.x; b.y = b.target.y; }
      var gy = groundAt(T, b.x, b.y - 8), top = T.cam.y - 10, sx = b.x + (T.random() - 0.5) * 60;
      b.path = jagged(sx, top, b.x, gy, T.random, 26);
      var mid = Math.floor(b.path.length / 4) * 2;
      b.fork = jagged(b.path[mid], b.path[mid + 1], b.path[mid] + (T.random() - 0.5) * 70, b.path[mid + 1] + 40 + T.random() * 30, T.random, 14);
      b.life = 9; s.lit = 4;
      T.strike({ x0: b.x - 13, x1: b.x + 13, y0: gy - 150, y1: gy + 3 }, (b.again ? 2 : 4) + T.mods().damage, 2, 'storm');
      T.spark(b.x, gy - 2, '#ffffff', 16, 2.8, 16, 0.05); T.spark(b.x, gy - 2, '#8fa3ff', 10, 2, 22, 0.02);
      T.ring({ x: b.x, y: gy, r: 3, grow: 2.2, life: 10, max: 10, colour: '#c9b8ff' });
      T.shake(4); T.sfx('thunder');
    }
    return s.t < s.max;
  };
  DRAW.tempest = function (s, T) { for (var k = 0; k < s.bolts.length; k++) { var b = s.bolts[k]; if (b.life > 0) { T.light(b.x, b.y - 20, 110, b.life / 9); T.light(b.x, b.y - 90, 70, b.life / 12); } } };
  OVER.tempest = function (s, T, g, cx, cy) {
    var a = Math.min(1, s.t / 10) * Math.min(1, (s.max - s.t) / 14), k, W = T.W;
    // the cloud: a dark band along the top of the picture that rolls, and lights from inside when a bolt goes
    for (k = 0; k < 17; k++) {
      var px = ((k * 27 + s.t * (k % 2 ? 0.5 : -0.35)) % (W + 40) + W + 40) % (W + 40) - 20, r = 13 + (k * 7) % 9, py = -2 + (k * 5) % 8;
      g.globalAlpha = a * 0.92; g.fillStyle = s.lit > 0 && k % 3 === s.t % 3 ? '#6b5aa8' : '#15122a'; g.beginPath(); g.arc(px, py, r, 0, 6.2832); g.fill();
      g.globalAlpha = a * 0.5; g.fillStyle = '#3a2f6a'; g.beginPath(); g.arc(px + 2, py + 4, r * 0.62, 0, 3.1416); g.fill();
    }
    g.globalAlpha = 1;
    for (k = 0; k < s.bolts.length; k++) {
      var b = s.bolts[k];
      // where the next one will fall: a thin line for a few steps before it
      if (s.t >= b.at - 7 && s.t < b.at) { var tx = Math.round((b.target && !b.target.dying ? b.target.x : b.x)) - cx; g.globalAlpha = 0.35; g.fillStyle = '#c9b8ff'; g.fillRect(tx, 0, 1, T.H); g.globalAlpha = 1; }
      if (b.life <= 0 || !b.path) continue;
      var f = b.life / 9;
      g.lineJoin = 'round';
      g.globalAlpha = 0.35 * f; g.strokeStyle = '#8fa3ff'; g.lineWidth = 7; strokePath(g, b.path, cx, cy);
      g.globalAlpha = 0.8 * f; g.strokeStyle = '#c9b8ff'; g.lineWidth = 3; strokePath(g, b.path, cx, cy); g.lineWidth = 1; strokePath(g, b.fork, cx, cy);
      g.globalAlpha = Math.min(1, f * 1.5); g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; strokePath(g, b.path, cx, cy);
      g.globalAlpha = 1;
    }
  };
  // the wake of a dash: it lies where she went for a moment, and bites once
  var lastX = null, wakeSeen = [], wasDashing = false;
  function stormWake(T) {
    var h = T.hero, dashing = !!(h.act && h.act.kind === 'dash') && T.weapon().ability === 'stormdash';
    if (dashing && !wasDashing) wakeSeen = [];
    if (dashing && lastX !== null && Math.abs(h.x - lastX) > 0.5) add({ kind: 'wake', x0: lastX, x1: h.x, y: h.y - 11, max: 38, seen: wakeSeen, seed: Math.floor(T.random() * 1000) });
    wasDashing = dashing; lastX = h.x;
  }
  STEP.wake = function (s, T) {
    if (s.t % 4 === 1) T.touch({ x0: Math.min(s.x0, s.x1) - 2, x1: Math.max(s.x0, s.x1) + 2, y0: s.y - 12, y1: s.y + 10 }, 2 + T.mods().damage, 'storm', (s.x0 + s.x1) / 2, s.seen, false);
    return s.t < s.max;
  };
  DRAW.wake = function (s, T, g, cx, cy) {
    var f = 1 - s.t / s.max, n = Math.max(1, Math.round(Math.abs(s.x1 - s.x0) / 5)), k, ph = s.seed + Math.floor(s.t / 3) * 7;
    g.globalAlpha = f; g.strokeStyle = (s.t >> 1) % 2 ? '#ffffff' : '#8fa3ff'; g.lineWidth = 1; g.beginPath();
    for (k = 0; k <= n; k++) { var x = s.x0 + (s.x1 - s.x0) * k / n, y = s.y + Math.sin((k + ph) * 12.9898) * 4 * f; if (k) g.lineTo(x - cx, y - cy); else g.moveTo(x - cx, y - cy); }
    g.stroke(); g.globalAlpha = 1;
    if (s.t % 6 === 0) T.light((s.x0 + s.x1) / 2, s.y, 18, 0.4 * f);
  };

  /* ---- Last Light: she is already past them; the picture goes out but for one line; a beat later, the cut ---- */

  FIRE.nightfall = function (T) {
    var h = T.hero, d = h.dir, from = h.x, to = from, step, half = h.w / 2;
    for (step = 4; step <= 124; step += 4) { var nx = from + d * step; if (T.blocked(nx - half, h.y - h.h, nx + half, h.y, false)) break; to = nx; }
    // not into a pit: come back until there is floor within three tiles
    while (Math.abs(to - from) > 8 && !safeFloor(T, to, h.y)) to -= d * 4;
    h.x = to; h.vx = 0; h.vy = 0; h.invuln = Math.max(h.invuln, 44);
    add({ kind: 'nightfall', x0: from, x1: to, y: h.y - 13, dir: d, max: 46, damage: T.weapon().damage[2] + T.mods().damage, marks: [] });
    T.sfx('eclipse');
  };
  STEP.nightfall = function (s, T) {
    var list = T.creatures(), k;
    if (s.t === 26) {
      var box = { x0: Math.min(s.x0, s.x1) - 8, x1: Math.max(s.x0, s.x1) + 8, y0: s.y - 16, y1: s.y + 14 };
      for (k = 0; k < list.length; k++) { var c = list[k]; if (c.dying) continue; var bs = T.boxesOf(c); for (var j = 0; j < bs.length; j++) if (bs[j].x0 < box.x1 && bs[j].x1 > box.x0 && bs[j].y0 < box.y1 && bs[j].y1 > box.y0) { s.marks.push({ x: Math.max(box.x0, Math.min(box.x1, c.x)), y: (bs[j].y0 + bs[j].y1) / 2, a: -0.9 + T.random() * 0.5 }); break; } }
      T.strike(box, s.damage, 2, null);
      T.flash('#ffffff', 7); T.shake(7); T.sfx('shatter');
      for (k = 0; k < 24; k++) bit(T, s.x0 + (s.x1 - s.x0) * T.random(), s.y + (T.random() - 0.5) * 6, (T.random() - 0.5) * 2, -0.5 - T.random() * 1.5, 26, T.random() < 0.5 ? '#ffffff' : '#ffd24d', 1, 0.03);
    }
    return s.t < s.max;
  };
  OVER.nightfall = function (s, T, g, cx, cy) {
    var y = Math.round(s.y) - cy, xa = s.x0 - cx, xb = s.x1 - cx, k;
    if (s.t < 26) {
      g.fillStyle = 'rgba(0,0,0,' + Math.min(0.94, s.t / 5).toFixed(2) + ')'; g.fillRect(0, 0, T.W, T.H);
      // the line: drawn at once from where she was to where she is, then thinning to a hair
      var drawn = Math.min(1, s.t / 4), thick = s.t < 8 ? 3 : s.t < 16 ? 2 : 1;
      g.fillStyle = '#ffffff'; g.fillRect(Math.min(xa, xa + (xb - xa) * drawn), y - Math.floor(thick / 2), Math.abs(xb - xa) * drawn, thick);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, y, T.W, 1);
      T.heroShape('#ffffff', 1);
      // the click of the guard against the sheath
      if (s.t >= 18) { var gl = (s.t - 18) / 8, gx = Math.round(xb - s.dir * 5), gy = y + 2, r = Math.round(7 * Math.sin(gl * 3.1416)); g.fillStyle = '#ffd24d'; g.fillRect(gx - r, gy, r * 2 + 1, 1); g.fillRect(gx, gy - r, 1, r * 2 + 1); }
    } else {
      var f = 1 - (s.t - 26) / (s.max - 26);
      g.globalAlpha = f; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
      for (k = 0; k < s.marks.length; k++) { var m = s.marks[k], len = 26 * (1.2 - f * 0.4); g.beginPath(); g.moveTo(m.x - cx - Math.cos(m.a) * len, m.y - cy - Math.sin(m.a) * len); g.lineTo(m.x - cx + Math.cos(m.a) * len, m.y - cy + Math.sin(m.a) * len); g.stroke(); }
      g.lineWidth = 1; g.beginPath(); g.moveTo(xa, y); g.lineTo(xb, y); g.stroke();
      g.globalAlpha = 1;
    }
  };

  // while this is true the engine holds everything but her still
  function stopped() { for (var k = 0; k < fx.length; k++) { var s = fx[k]; if (s.kind === 'nightfall' && s.t < 26 || s.holds) return true; } return false; }

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
    stormWake(T);
    for (var k = fx.length - 1; k >= 0; k--) { var s = fx[k]; s.t++; if (!STEP[s.kind] || !STEP[s.kind](s, T)) fx.splice(fx.indexOf(s), 1); }
    // whatever a toll has stopped sees stars
    var list = T.creatures();
    for (var j = 0; j < list.length; j++) { var c = list[j]; if (!c.dying && c.status.stun > 0 && T.tick() % 5 === 0) { var a = T.tick() * 0.2; bit(T, c.x + Math.cos(a) * 7, c.y - c.h - 5 + Math.sin(a) * 2, 0, 0, 10, '#efd27a', 1, 0); } }
  }
  function draw(T) { var cx = Math.round(T.cam.x), cy = Math.round(T.cam.y); for (var k = 0; k < fx.length; k++) if (DRAW[fx[k].kind]) DRAW[fx[k].kind](fx[k], T, T.pen, cx, cy); }
  function over(T) { var cx = Math.round(T.cam.x), cy = Math.round(T.cam.y); for (var k = 0; k < fx.length; k++) if (OVER[fx[k].kind]) OVER[fx[k].kind](fx[k], T, T.pen, cx, cy); }
  function clear() { fx.length = 0; lastX = null; wasDashing = false; }
  function count(kind) { var n = 0; for (var k = 0; k < fx.length; k++) if (!kind || fx[k].kind === kind) n++; return n; }

  window.Arms = { stopped: stopped, fire: fire, swing: swing, step: step, draw: draw, over: over, clear: clear, count: count, FIRE: FIRE, STEP: STEP, DRAW: DRAW, OVER: OVER, add: add, shot: shot, bit: bit, groundAt: groundAt };
})();
