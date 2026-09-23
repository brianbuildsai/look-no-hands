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
    '4': '#3f3526', '5': '#5a4632', '6': '#4c5a52', '7': '#6f7f74',   // root, root lit, old stone, old stone lit
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
      var h = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
      pen.drawImage(T.stone[PICK[(h >>> 7) & 7]], px, py);
      var up = at(tx, ty - 1), left = at(tx - 1, ty), right = at(tx + 1, ty), down = at(tx, ty + 1);
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
    var h = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
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

  /* ---- the backdrop ---- */
  // (plan 15, task 3)

  /* ---- the dressing ---- */
  // (plan 15, task 4)

  window.UndercroftWood = { tiles: tiles, INK: INK };
})();
