/* wood.js: the Sunken Wood, floor 2, and how it draws itself.

   A wood that grew in the dark under the kilns. Its look is taken from a
   misty swamp at night (a black tree framing the top, pale orbs in the haze,
   terraces of trees fading into fog) and from a forest tileset (dark earth
   under thick moss that hangs over every edge, roots under every overhang,
   logs for ledges). Nothing here is an image: the tiles are text, one
   character a pixel, and the rest is drawn as it is needed.

   Everything moves: the grass on every cap, the roots under every overhang,
   the bog, the fog in two bands at two speeds, the orbs, the fireflies, the
   leaves, the vines. None of it is the game: it is drawing only, and reads
   the step count and the camera, never changes them. */
(function () {
  'use strict';
  var ST = window.UndercroftSteady;   // drawing keeps the one rule too: steady sines, so every browser draws what the others do
  var PX = window.Pixels;
  if (!PX || !ST) return;
  var TILE = 16;

  /* ---- the colours ----
     Figures for earth and root, small letters for moss and water. */
  var INK = {
    id: 'wood', k: '#0b0d08',
    '0': '#15170f', '1': '#1d2117', '2': '#262b1d', '3': '#323824',   // peat, darkest to lightest
    '4': '#3f3526', '5': '#5a4632', '6': '#3a443d', '7': '#505c53',   // root, root lit, old stone, old stone lit
    a: '#2f4a1c', b: '#4f7324', c: '#7fa332', d: '#a9c24a', e: '#d6e67a', f: '#1f3a2e',   // moss, deepest to its glint; teal moss
    x: '#d9d2b8', r: '#8a3a2a'   // thorn, berry
  };
  function art(rows) { return PX.art(rows, INK); }

  /* ---- the tiles ---- */

  // four earths: a root through it, clods, plain peat, and (rarely) an old stone the wood swallowed
  var EARTH = [
    ['2212222122221222', '2222122222222122', '1222223322221222', '2212233332122222', '2222223321222142', '2122222222221452', '2221222212224522', '2222122222245222',
     '2124442222452212', '2145554444522222', '2455222255522122', '1222212222222222', '2221222332212221', '2222223663222222', '2122222332222122', '2222122222222222'],
    ['2222212222122222', '2122222222222212', '2223322212222222', '2233332222221222', '2223322222212222', '1222222122222222', '2222222222233222', '2212222222333322',
     '2222212222233222', '2222222212222122', '2122222222222222', '2222233222122222', '2212333322222212', '2222233222212222', '2222222222222222', '1222212222122222'],
    ['2222222122222222', '2122222222212222', '2222212222222222', '2222222222222212', '2212222221222222', '2222222222222222', '2222122222222122', '1222222222122222',
     '2222222222222222', '2221222212222222', '2222222222222212', '2122222222222222', '2222221222222222', '2222222222122222', '2212222222222222', '2222222122222212'],
    ['2222122222222122', '2126666666662222', '2267777777766222', '2267666666676222', '2167666666676122', '2267666f66676222', '2267666666676222', '2266666666666222',
     '2226666666662212', '2222222222222222', '2212222122222222', '2222222222212222', '2122233222222222', '2222333322222122', '2222233222222222', '2222122222212222']
  ];
  // the moss over a top: its body sits on the tile's first six rows, blades stand in the four above, and it hangs in a fringe
  var CAP = ['dddcddeddddcdddd', 'cccdcccccdccccdc', 'bcbbbcbbbbcbbbcb', 'bbabbbbabbbbabbb', 'abaabbabaabbaaba', 'aaa.aaba.aaa.aba', '.a...aa...a...a.', '.....a..........'];
  // three sets of blades, so that no two caps side by side stand alike; the third has a pale bell of a flower in it
  var BLADES = [
    [[1, 3, 'c'], [3, 2, 'd'], [6, 4, 'c'], [8, 2, 'e'], [11, 3, 'd'], [14, 4, 'c']],
    [[0, 2, 'd'], [2, 4, 'c'], [5, 3, 'd'], [9, 4, 'c'], [10, 2, 'e'], [13, 3, 'c']],
    [[2, 3, 'd'], [4, 2, 'c'], [7, 3, 'c'], [9, 3, 'b', 'x'], [12, 4, 'd'], [15, 2, 'c']]
  ];
  var PICK = [0, 1, 2, 0, 1, 2, 2, 3];   // which earth, by a tile's hash: the old stone one time in eight
  // moss down a side that faces air
  var SIDE = ['ab.', 'a..', 'ba.', 'a..', 'f..', 'a..', '...', 'f..', 'a..', 'fa.', 'a..', '...', 'f..', 'a..', '...', 'f..'];
  // a log for a ledge, and the cut face at either end of it
  var LOG = ['dcddedddcdddcddd', 'cbbcbbbbcbbbcbbb', '5545555455554555', '4454444544445444', '4344434443444344', '3333333033333333'];
  var LOG_END = ['.cd.', '5555', '5445', '5405', '5445', '.55.'];
  // brambles for spikes: thorns that catch what light there is
  var BRAMBLE = ['................', '................', '................', '................', '................', '.....x......x...', '..x..5x....x5...', '...45.4...54.4x.',
                 'x.4...45.44...4.', '.45..x.454..x.45', '4..44..4.4.44..4', '.x4..54...4..44x', '45.x4..4x4.45.4.', '4444544454445444', '0000000000000000', '0000000000000000'];

  function flip(c) { return PX.flipH ? PX.flipH(c) : c; }
  // a tile's own number, well stirred, so that neighbours do not fall into rows
  function mix(tx, ty) { var h = Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663); h ^= h >>> 13; h = Math.imul(h, 1540483477); h ^= h >>> 15; return h >>> 0; }

  // the set the engine keeps for this element: earths, caps in four winds, sides, a log and its ends, brambles, the bog in six frames
  function tiles(el) {
    var caps = [], f, k, s;
    for (s = 0; s < BLADES.length; s++) for (f = 0; f < 4; f++) {
      var c = PX.blank(TILE, 12), g = c.getContext('2d'), sway = [0, 1, 0, -1][f];
      g.drawImage(art(CAP), 0, 4);
      for (k = 0; k < BLADES[s].length; k++) {
        var B = BLADES[s][k], lean = (k % 2 ? sway : -sway);
        g.fillStyle = INK[B[2]];
        for (var y = 1; y <= B[1]; y++) g.fillRect(B[0] + (y > 2 ? lean : 0), 4 - y, 1, 1);
        if (B[3]) { g.fillStyle = INK[B[3]]; g.fillRect(B[0] + lean - 1, 4 - B[1] - 1, 3, 1); g.fillRect(B[0] + lean, 4 - B[1], 1, 1); }
        else if (B[1] >= 3) { g.fillStyle = INK.e; g.fillRect(B[0] + lean, 4 - B[1], 1, 1); }
      }
      caps.push(c);
    }
    var side = art(SIDE), end = art(LOG_END);
    var bog = [];
    for (f = 0; f < 6; f++) bog.push(bogFrame(el, f));
    return { wood: true, stone: EARTH.map(art), cap: caps, side: [side, flip(side)], log: art(LOG), end: [end, flip(end)], spikes: art(BRAMBLE), hazard: bog, paint: paint };
  }

  // black water: a lit skin with duckweed and a shimmer that walks, and two bubbles that rise and burst out of step with each other
  function bogFrame(el, f) {
    var c = PX.blank(TILE, TILE), g = c.getContext('2d'), H = el.hazardColours, k;
    g.fillStyle = H[0]; g.fillRect(0, 4, TILE, 12);
    g.fillStyle = '#1a3029'; g.fillRect(0, 5, TILE, 2);
    g.fillStyle = '#0a1410'; g.fillRect(0, 13, TILE, 3);
    g.fillStyle = H[1]; g.fillRect(0, 4, TILE, 1);
    g.fillStyle = '#8fd6b0'; g.fillRect((f * 3) % 16, 4, 2, 1); g.fillRect((f * 3 + 9) % 16, 4, 1, 1);
    g.fillStyle = INK.c; g.fillRect(2, 4, 2, 1); g.fillRect(12, 4, 1, 1); g.fillStyle = INK.b; g.fillRect(7, 4, 2, 1);
    for (k = 0; k < 2; k++) {
      var p = (f + k * 3) % 6, bx = k ? 11 : 5;
      g.fillStyle = H[2];
      if (p < 5) { var by = 14 - p * 2; g.fillRect(bx, by, 1, 1); if (p > 1) { g.fillStyle = H[1]; g.fillRect(bx - 1, by, 1, 1); } }
      else { g.fillRect(bx - 2, 3, 1, 1); g.fillRect(bx + 2, 3, 1, 1); g.fillRect(bx - 1, 2, 3, 1); }
    }
    return c;
  }

  // one tile, knowing its neighbours: moss where it meets air above or beside, roots under an overhang, logs with ends
  function paint(pen, T, t, tx, ty, px, py, at, tick) {
    if (t === 1) {
      var h = mix(tx, ty);
      pen.drawImage(T.stone[PICK[(h >>> 7) & 7]], px, py);
      var up = at(tx, ty - 1), left = at(tx - 1, ty), right = at(tx + 1, ty), down = at(tx, ty + 1);
      // earth with earth all round is deep in the bank, and darker, as the tileset's is
      if (up === 1 && left === 1 && right === 1 && down === 1) { pen.fillStyle = 'rgba(4,7,4,0.42)'; pen.fillRect(px, py, TILE, TILE); }
      if (left !== 1) pen.drawImage(T.side[0], px, py);
      if (right !== 1) pen.drawImage(T.side[1], px + TILE - 3, py);
      if (up !== 1) pen.drawImage(T.cap[((h >>> 11) % 3) * 4 + ((Math.floor(tick / 14) + tx * 3) & 3)], px, py - 4);
      if (down === 0) roots(pen, tx, ty, px, py + TILE, tick);
    } else if (t === 2) {
      pen.drawImage(T.log, px, py);
      if (at(tx - 1, ty) !== 2) pen.drawImage(T.end[0], px, py);
      if (at(tx + 1, ty) !== 2) pen.drawImage(T.end[1], px + TILE - 4, py);
    } else if (t === 3) pen.drawImage(T.spikes, px, py);
    else if (t === 4) pen.drawImage(T.hazard[(Math.floor(tick / 10) + tx * 2) % 6], px, py);
  }

  // roots and moss that hang from an overhang, a few to a tile, swaying from the knee down
  function roots(pen, tx, ty, px, py, tick) {
    var h = mix(tx, ty);
    for (var k = 0; k < 3; k++) {
      var x = (h >> (k * 5)) & 15, len = 3 + ((h >> (k * 3 + 16)) & 7);
      if (((h >> (k + 28)) & 1) && k) continue;
      var sw = Math.round(ST.sin(tick * 0.035 + tx * 1.7 + k * 2.1) * 1.2);
      for (var y = 0; y < len; y++) {
        pen.fillStyle = y === 0 ? INK.a : k === 1 ? (y % 3 ? INK['4'] : INK['5']) : (y < 2 ? INK.a : INK.f);
        pen.fillRect(px + x + (y > len / 2 ? sw : 0), py + y, 1, 1);
      }
      if (k === 1) { pen.fillStyle = INK['5']; pen.fillRect(px + x + sw - 1, py + len - 1, 1, 1); }
    }
  }

  /* ---- the backdrop ----
     Back to front, as the swamp paintings are layered: a haze, pale orbs hanging in it, two terraces of trees
     going into the fog, a band of fog, near trunks twisted and hung with moss, a second band of fog, the black
     canopy over the top of the view, fireflies, and leaves coming down. Each layer slides at its own share of
     the camera, and the fog also drifts of its own accord. The still parts are painted once, into strips that
     wrap round; what moves is drawn each frame. */

  var LAYERS = null;
  // the painting's own chance: a fixed stream, so that the wood is the same wood on every machine and every visit
  function stream(seed) { var s = seed >>> 0; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function blob(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.2832); g.fill(); }
  // a strip w wide that wraps: anything drawn near one end is drawn again past the other
  function wrapped(w, h, draw) { var c = PX.blank(w, h), g = c.getContext('2d'); draw(g, function (fn) { fn(0); fn(-w); fn(w); }); return c; }

  function layers() {
    if (LAYERS) return LAYERS;
    var rnd = stream(1521);
    // far terraces: rounded crowns in the colours of the fog, lit a little from above, on a bank
    function terrace(w, h, n, base, size, col, lit, bank) {
      return wrapped(w, h, function (g, thrice) {
        var k;
        for (k = 0; k < n; k++) {
          var x = rnd() * w, y = base + rnd() * (h - base) * 0.5, r = size * (0.6 + rnd() * 0.7);
          thrice(function (o) {
            g.fillStyle = bank; g.fillRect(x + o - 1, y, 2, h - y);
            g.fillStyle = col; blob(g, x + o, y, r, r * 0.8); blob(g, x + o - r * 0.6, y + r * 0.3, r * 0.7, r * 0.55); blob(g, x + o + r * 0.6, y + r * 0.25, r * 0.65, r * 0.5);
            g.fillStyle = lit; blob(g, x + o - r * 0.25, y - r * 0.45, r * 0.45, r * 0.22);
          });
        }
        g.fillStyle = bank; g.fillRect(0, h - 14, w, 14);
      });
    }
    var far = terrace(768, 120, 46, 30, 16, '#46665d', '#58786e', '#3f5d55');
    var near = terrace(896, 150, 30, 44, 24, '#2c4a42', '#3a5d53', '#243f38');
    // fog: soft overlapping clouds, very thin, pale
    function fog(w, h, n, alpha) {
      return wrapped(w, h, function (g, thrice) {
        for (var k = 0; k < n; k++) {
          var x = rnd() * w, y = h * 0.3 + rnd() * h * 0.45, rx = 30 + rnd() * 60, ry = 6 + rnd() * 10;
          g.fillStyle = 'rgba(184,208,198,' + (alpha * (0.5 + rnd() * 0.5)).toFixed(3) + ')';
          thrice(function (o) { blob(g, x + o, y, rx, ry); });
        }
      });
    }
    var fogA = fog(640, 70, 34, 0.18), fogB = fog(704, 90, 26, 0.12);
    // near trunks: twisted, leaning, with limbs; where moss hangs from them is kept to be drawn swaying
    var trunkMoss = [];
    var trunks = wrapped(1024, 300, function (g, thrice) {
      for (var k = 0; k < 6; k++) {
        var x0 = 60 + k * 170 + rnd() * 60, lean = (rnd() - 0.5) * 60, wd = 9 + rnd() * 8, y;
        for (y = 300; y > -10; y -= 2) {
          var t = 1 - y / 300, x = x0 + lean * t * t + ST.sin(y * 0.045 + k) * 5, w2 = wd * (0.7 + 0.5 * (y / 300));
          thrice(function (o) { g.fillStyle = '#132520'; g.fillRect(x + o - w2 / 2, y, w2, 3); g.fillStyle = '#2a4238'; g.fillRect(x + o - w2 / 2, y, 2, 3); g.fillStyle = '#0a1411'; g.fillRect(x + o + w2 / 2 - 2, y, 2, 3); });
          if (y % 60 === 0 && y < 240) trunkMoss.push({ x: x + (rnd() - 0.5) * w2, y: y, len: 10 + rnd() * 26 });
        }
        for (var b = 0; b < 3; b++) {
          var by = 40 + rnd() * 160, dir = rnd() < 0.5 ? -1 : 1, bl = 30 + rnd() * 50, bx = x0 + lean * (1 - by / 300) * (1 - by / 300);
          for (var s = 0; s < bl; s += 1.5) {
            var sx = bx + dir * s, sy = by - s * 0.55 + ST.sin(s * 0.12 + b) * 3, sw = Math.max(1, 5 - s / bl * 4);
            thrice(function (o) { g.fillStyle = '#132520'; g.fillRect(sx + o, sy, 2, sw); });
            if (Math.abs(s - bl * 0.7) < 1) trunkMoss.push({ x: sx, y: sy + sw, len: 8 + rnd() * 20 });
          }
        }
      }
    });
    // the canopy: a black mass of limbs and leaves across the top, hung with moss
    var canopyMoss = [];
    var canopy = wrapped(768, 80, function (g, thrice) {
      var k;
      g.fillStyle = '#070b09';
      for (k = 0; k < 26; k++) {
        var x = rnd() * 768, y = rnd() * 26, r = 10 + rnd() * 22;
        thrice(function (o) { blob(g, x + o, y, r * 1.4, r * 0.7); });
        if (rnd() < 0.8) canopyMoss.push({ x: x + (rnd() - 0.5) * r, y: y + r * 0.6, len: 8 + rnd() * 30 });
      }
      for (k = 0; k < 14; k++) {
        var lx = rnd() * 768, ly = 20 + rnd() * 30, len = 30 + rnd() * 60, dir = rnd() < 0.5 ? -1 : 1;
        for (var s = 0; s < len; s += 1) { var bx = lx + dir * s, by = ly + ST.sin(s * 0.08 + k) * 5 + s * 0.12, bw = Math.max(1, 4 - s / len * 3); thrice(function (o) { g.fillRect(bx + o, by, 1, bw); }); }
      }
      g.fillStyle = '#132720';
      for (k = 0; k < 40; k++) { var cx = rnd() * 768, cy = 10 + rnd() * 34; var cr = 3 + rnd() * 4; thrice(function (o) { blob(g, cx + o, cy, cr, 2); }); }
    });
    // fireflies and leaves: where each begins, and how it goes
    var flies = [], leaves = [], k;
    for (k = 0; k < 26; k++) flies.push({ x: rnd() * 600, y: 30 + rnd() * 170, a: rnd() * 6.2832, b: rnd() * 6.2832, r: 8 + rnd() * 22, s: 0.006 + rnd() * 0.012, blink: Math.floor(rnd() * 240) });
    for (k = 0; k < 9; k++) leaves.push({ x: rnd() * 480, y: rnd() * 240, v: 0.18 + rnd() * 0.22, sway: 8 + rnd() * 14, ph: rnd() * 6.2832, c: ['#7fa332', '#a9c24a', '#5a4632', '#4f7324'][k % 4] });
    LAYERS = { far: far, near: near, fogA: fogA, fogB: fogB, trunks: trunks, trunkMoss: trunkMoss, canopy: canopy, canopyMoss: canopyMoss, flies: flies, leaves: leaves, grads: {} };
    return LAYERS;
  }

  // a strip across the view at `x` of the way along it, repeated as far as the view goes
  function across(pen, img, x, y, W, alpha) {
    var w = img.width, o = ((x % w) + w) % w;
    if (alpha !== undefined) pen.globalAlpha = alpha;
    for (var at = -o; at < W; at += w) pen.drawImage(img, Math.round(at), Math.round(y));
    pen.globalAlpha = 1;
  }
  // moss hanging from a strip, swaying: each strand bends more toward its end
  function moss(pen, list, img, x, y, W, tick, colour) {
    var w = img.width, o = ((x % w) + w) % w;
    pen.fillStyle = colour;
    for (var at = -o; at < W; at += w) {
      for (var k = 0; k < list.length; k++) {
        var m = list[k], mx = at + m.x;
        if (mx < -10 || mx > W + 10) continue;
        for (var s = 0; s < m.len; s += 2) { var bend = ST.sin(tick * 0.02 + k * 1.3 + s * 0.05) * s * 0.08; pen.fillRect(Math.round(mx + bend), Math.round(y + m.y + s), 1, 2); }
      }
    }
  }

  function backdrop(pen, W, H, cam, tick, glow) {
    var L = layers(), cy = cam.y, k;
    // the haze: black at the top, a paler band low down where the fog lies
    var grad = L.grads[H] || (L.grads[H] = (function () { var g = pen.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0c1916'); g.addColorStop(0.4, '#2a4540'); g.addColorStop(0.7, '#5c7a70'); g.addColorStop(1, '#34504a'); return g; })());
    pen.fillStyle = grad; pen.fillRect(0, 0, W, H);
    // pale orbs in the haze, as in the paintings: gold, and one rose; each breathes and hangs a little lower now and then
    var orbs = [[70, 46, 7, '#f3e3a6'], [250, 30, 5, '#f0d6c4'], [330, 62, 4, '#e8b4b4']];
    for (k = 0; k < orbs.length; k++) {
      var O = orbs[k], ox = ((O[0] - cam.x * 0.04) % (W + 60) + W + 60) % (W + 60) - 30, oy = O[1] - cy * 0.03 + ST.sin(tick * 0.01 + k * 2) * 2, pulse = 0.75 + 0.25 * ST.sin(tick * 0.03 + k * 1.7);
      var halo = pen.createRadialGradient(ox, oy, 0, ox, oy, O[2] * 4);
      halo.addColorStop(0, 'rgba(243,227,166,' + (0.35 * pulse).toFixed(3) + ')'); halo.addColorStop(1, 'rgba(243,227,166,0)');
      pen.fillStyle = halo; pen.fillRect(ox - O[2] * 4, oy - O[2] * 4, O[2] * 8, O[2] * 8);
      pen.fillStyle = O[3]; pen.globalAlpha = 0.6 + 0.4 * pulse; pen.beginPath(); pen.arc(ox, oy, O[2], 0, 6.2832); pen.fill(); pen.globalAlpha = 1;
      glow(ox + cam.x, oy + cam.y, O[2] * 4, O[3], 0.12 * pulse);
    }
    // two terraces of trees, the far one nearly fog
    across(pen, L.far, cam.x * 0.1, 92 - cy * 0.05, W, 0.9);
    across(pen, L.fogA, cam.x * 0.14 + tick * 0.05, 100 - cy * 0.06, W);
    across(pen, L.near, cam.x * 0.2, 112 - cy * 0.08, W);
    // near trunks, and the moss that hangs from them
    var ty = -40 - cy * 0.12;
    across(pen, L.trunks, cam.x * 0.35, ty, W);
    moss(pen, L.trunkMoss, L.trunks, cam.x * 0.35, ty, W, tick, '#35584a');
    across(pen, L.fogB, cam.x * 0.45 + tick * 0.12, 140 - cy * 0.15, W);
    // fireflies: each wanders on two slow circles and blinks in its own time
    for (k = 0; k < L.flies.length; k++) {
      var F = L.flies[k], fx = ((F.x + ST.cos(tick * F.s + F.a) * F.r - cam.x * 0.5) % (W + 40) + W + 40) % (W + 40) - 20, fy = F.y + ST.sin(tick * F.s * 1.3 + F.b) * F.r * 0.6 - cy * 0.1;
      var on = (tick + F.blink) % 240, lit = on < 90 ? 1 : on < 110 ? 1 - (on - 90) / 20 : on > 220 ? (on - 220) / 20 : 0;
      if (lit <= 0.05) continue;
      pen.globalAlpha = lit; pen.fillStyle = '#e6f5a0'; pen.fillRect(Math.round(fx), Math.round(fy), 1, 1); pen.globalAlpha = 1;
      if (lit > 0.5 && k % 2 === 0) glow(fx + cam.x, fy + cam.y, 7, '#d6f07a', 0.35 * lit);
    }
    // the canopy over the top of the view, and its moss
    var cyTop = -6 - Math.min(24, cy * 0.04);
    across(pen, L.canopy, cam.x * 0.55, cyTop, W);
    moss(pen, L.canopyMoss, L.canopy, cam.x * 0.55, cyTop, W, tick, '#1f3a2e');
    // leaves coming down, turning as they fall
    for (k = 0; k < L.leaves.length; k++) {
      var Lf = L.leaves[k], fall = (Lf.y + tick * Lf.v) % (H + 20) - 10, lx = ((Lf.x + ST.sin(tick * 0.02 + Lf.ph) * Lf.sway - cam.x * 0.8) % (W + 20) + W + 20) % (W + 20) - 10, turn = ST.sin(tick * 0.08 + Lf.ph);
      pen.fillStyle = Lf.c; pen.fillRect(Math.round(lx), Math.round(fall), turn > 0.3 ? 2 : 1, turn < -0.3 ? 2 : 1);
    }
  }

  /* ---- the dressing ---- */
  // (plan 15, task 4)

  window.UndercroftWood = { tiles: tiles, backdrop: backdrop, INK: INK };
})();
