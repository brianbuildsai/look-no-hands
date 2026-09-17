/* Reaching — room 20.

   A tree grown by "space colonisation" (Runions, Lane and Prusinkiewicz,
   2007). Light is scattered in the air as specks. Over and over:

     - every speck finds the nearest bit of branch, if any is within sensing
       distance, and pulls on it;
     - every bit of branch that is pulled grows one short length in the
       average direction of its pulls;
     - a speck that a branch comes close enough to is used up.

   That is the whole method. There is no description of a tree in it: the
   shape is the order in which the light ran out.

   Thickness follows Leonardo's rule: where a branch forks, the areas of the
   two add up to the area of the one. So a branch is as thick as the square
   root of the number of tips it feeds. The tree sways by bending a little at
   every joint, thin joints more than thick ones. */
(function () {
  'use strict';

  var MOST = 9000;                 // lengths of branch, at most
  var LENGTH = 6;                  // one length, in pixels
  var REACHED = LENGTH * 1.7;      // a speck this close to a branch is used up
  var WIDTHS = [0.7, 0.95, 1.3, 1.8, 2.4, 3.2, 4.3, 5.7, 7.6, 10, 13.5, 18, 24, 32];

  Gallery.register('reaching', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    // the tree: parents come before children, so one pass from the root reaches everything in order
    var x = new Float32Array(MOST), y = new Float32Array(MOST), parent = new Int32Array(MOST);
    var pullX = new Float32Array(MOST), pullY = new Float32Array(MOST), pulls = new Uint16Array(MOST), shoots = new Uint8Array(MOST);
    var area = new Float32Array(MOST), bendX = new Float32Array(MOST), bendY = new Float32Array(MOST), turn = new Float32Array(MOST), depth = new Uint16Array(MOST);
    var count = 0;
    var specks = [];                 // light not yet reached: { x, y, waited, born }
    var leaves = [];                 // light that was reached: { node, dx, dy }
    var cells = {}, sense = 80;      // branch lengths filed by where they are, in squares one sensing-distance across
    var root = { x: 0, y: 0 }, clock = 0, stalled = 0, lastScatter = null, grown = false;
    var seed = 20, owed = 0, planting = false;
    function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

    /* ---- growing ---- */

    function file(i) {
      var key = Math.floor(x[i] / sense) + ',' + Math.floor(y[i] / sense);
      (cells[key] || (cells[key] = [])).push(i);
    }
    function refile() { cells = {}; for (var i = 0; i < count; i++) file(i); }

    function add(px, py, from) {
      if (count >= MOST) return -1;
      var i = count++;
      x[i] = px; y[i] = py; parent[i] = from;
      pullX[i] = pullY[i] = 0; pulls[i] = 0; shoots[i] = 0;
      depth[i] = from < 0 ? 0 : depth[from] + 1;
      bendX[i] = px; bendY[i] = py; turn[i] = 0;
      file(i);
      return i;
    }

    // the nearest length of branch to a point, no further off than `within`
    function nearest(px, py, within) {
      var cx = Math.floor(px / sense), cy = Math.floor(py / sense), best = -1, bestD = within * within;
      for (var gy = cy - 1; gy <= cy + 1; gy++) for (var gx = cx - 1; gx <= cx + 1; gx++) {
        var list = cells[gx + ',' + gy];
        if (!list) continue;
        for (var k = 0; k < list.length; k++) {
          var i = list[k], d = (x[i] - px) * (x[i] - px) + (y[i] - py) * (y[i] - py);
          if (d < bestD) { bestD = d; best = i; }
        }
      }
      return best;
    }

    function scatter(cx, cy, radius, howMany) {
      for (var k = 0; k < howMany; k++) {
        var a = random() * 6.2832, r = radius * Math.sqrt(random());
        var px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 0.85;
        if (px < (planting && size.w >= 900 ? size.w * 0.37 : 4) || px > size.w - 4 || py < (planting ? 70 : 4) || py > root.y - 12) continue;
        specks.push({ x: px, y: py, waited: 0, born: clock });
      }
      stalled = 0; grown = false;
      report();
    }

    function plant() {
      count = 0; cells = {}; specks = []; leaves = []; stalled = 0; grown = false; lastScatter = null;
      planting = true;                  // the first light keeps clear of the wall label and the masthead; the visitor's can go anywhere
      var wide = size.w >= 900;
      root.x = size.w * (wide ? 0.64 : 0.5);
      root.y = size.h * (wide ? 0.9 : 0.93);
      add(root.x, root.y, -1);
      // a crown of light: a few overlapping clouds of specks above where the trunk will be
      var reach = Math.min(size.w * (wide ? 0.2 : 0.44), size.h * 0.4), top = root.y - size.h * (wide ? 0.78 : 0.8);
      var clouds = 4 + Math.floor(random() * 3), each = Math.round((wide ? 1700 : 700) / clouds);
      for (var k = 0; k < clouds; k++) {
        var lean = (random() - 0.5) * 1.5;
        scatter(root.x + lean * reach * 0.75, top + (0.18 + random() * 0.42) * (root.y - top), reach * (0.45 + random() * 0.4), each);
      }
      planting = false;
      env.redraw();
    }

    function grow() {
      var i, k, s, pulled = [];
      for (k = specks.length - 1; k >= 0; k--) {
        s = specks[k];
        i = nearest(s.x, s.y, sense);
        if (i < 0) continue;
        var dx = s.x - x[i], dy = s.y - y[i], d = Math.sqrt(dx * dx + dy * dy);
        if (d < REACHED || ++s.waited > 140) {
          // used up (or given up on: two branches can pull a speck's attention back and forth for ever)
          if (d < REACHED) leaves.push({ node: i, dx: dx, dy: dy, born: clock });
          specks[k] = specks[specks.length - 1]; specks.pop();
          continue;
        }
        if (!pulls[i]) pulled.push(i);
        pullX[i] += dx / d; pullY[i] += dy / d; pulls[i]++;
      }
      for (k = 0; k < pulled.length; k++) {
        i = pulled[k];
        var px = pullX[i], py = pullY[i] - 0.12 * pulls[i], len = Math.sqrt(px * px + py * py);     // and a slight wish to go up
        pullX[i] = pullY[i] = 0; pulls[i] = 0;
        if (len < 0.2 || shoots[i] >= 3) continue;
        var nx = x[i] + px / len * LENGTH, ny = y[i] + py / len * LENGTH;
        var close = nearest(nx, ny, LENGTH * 0.55);
        if (close >= 0) continue;                                     // something has already grown there
        if (add(nx, ny, i) >= 0) shoots[i]++;
      }
      if (pulled.length) { stalled = 0; return true; }

      // Nothing within sensing distance. If there is light anywhere at all, the nearest twig to the
      // nearest speck sets off toward it on its own. (This is also how the trunk gets up to the crown.)
      if (!specks.length || count >= MOST) return false;
      if (++stalled % 2) return true;
      var best = -1, bestSpeck = null, bestD = 1e12, tries = Math.min(specks.length, 60);
      for (k = 0; k < tries; k++) {
        s = specks[(Math.floor(random() * specks.length))];
        for (i = Math.max(0, count - 4000); i < count; i += 1) {
          var ex = s.x - x[i], ey = s.y - y[i], e = ex * ex + ey * ey;
          if (e < bestD) { bestD = e; best = i; bestSpeck = s; }
        }
      }
      if (best < 0) return false;
      var far = Math.sqrt(bestD);
      var gx = (bestSpeck.x - x[best]) / far, gy = (bestSpeck.y - y[best]) / far - 0.35;
      var gl = Math.sqrt(gx * gx + gy * gy) || 1;
      if (shoots[best] < 3 && nearest(x[best] + gx / gl * LENGTH, y[best] + gy / gl * LENGTH, LENGTH * 0.55) < 0) {
        if (add(x[best] + gx / gl * LENGTH, y[best] + gy / gl * LENGTH, best) >= 0) shoots[best]++;
      } else if (++bestSpeck.waited > 30) {
        specks.splice(specks.indexOf(bestSpeck), 1);
      }
      return true;
    }

    // Leonardo's rule, from the tips down: a branch carries the area of everything it feeds
    function thicken() {
      var i;
      for (i = 0; i < count; i++) area[i] = 0;
      for (i = count - 1; i > 0; i--) { if (area[i] === 0) area[i] = 1; area[parent[i]] += area[i]; }
      if (area[0] === 0) area[0] = 1;
    }

    function report() {
      env.live('branches', Gallery.formatCount(Math.max(0, count - 1)));
      env.live('reached', Gallery.formatCount(leaves.length));
      env.live('left', Gallery.formatCount(specks.length));
    }

    /* ---- drawing ---- */

    // every joint bends a little in the wind, thin ones more, and the bends add up along the branch
    function sway(wind) {
      for (var i = 1; i < count; i++) {
        var p = parent[i], stiff = 1 + Math.sqrt(area[i]) * 0.9;
        var bend = wind * (Math.sin(clock * 0.9 + x[i] * 0.011 + depth[i] * 0.05) + 0.5 * Math.sin(clock * 2.1 + y[i] * 0.017)) / stiff;
        turn[i] = turn[p] + bend;
        var c = Math.cos(turn[i]), s = Math.sin(turn[i]), ox = x[i] - x[p], oy = y[i] - y[p];
        bendX[i] = bendX[p] + ox * c - oy * s;
        bendY[i] = bendY[p] + ox * s + oy * c;
      }
    }

    function render(still) {
      var ratio = canvas.width / size.w, i, k;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);
      thicken();
      sway(still ? 0 : 0.0042);

      // the ground
      pen.strokeStyle = 'rgba(233,230,223,0.28)';
      pen.lineWidth = 1;
      var ground = pen.createLinearGradient(root.x - size.w * 0.34, 0, root.x + size.w * 0.34, 0);
      ground.addColorStop(0, 'rgba(233,230,223,0)'); ground.addColorStop(0.5, 'rgba(233,230,223,0.34)'); ground.addColorStop(1, 'rgba(233,230,223,0)');
      pen.strokeStyle = ground;
      pen.beginPath(); pen.moveTo(root.x - size.w * 0.34, root.y + 0.5); pen.lineTo(root.x + size.w * 0.34, root.y + 0.5); pen.stroke();

      // light still in the air
      pen.fillStyle = 'rgba(96,124,255,0.75)';
      pen.beginPath();
      for (k = 0; k < specks.length; k++) {
        var s = specks[k], twinkle = 1.1 + 0.5 * Math.sin(clock * 3 + s.x * 0.3 + s.y * 0.7), fresh = still ? 0 : Math.max(0, 1 - (clock - s.born) * 1.5);
        pen.moveTo(s.x + twinkle, s.y); pen.arc(s.x, s.y, twinkle + fresh * 2.5, 0, 6.2832);
      }
      pen.fill();

      // the tree, thickest first: one path for each width
      var paths = [];
      for (k = 0; k < WIDTHS.length; k++) paths.push([]);
      for (i = 1; i < count; i++) {
        var w = (size.w >= 900 ? 1.05 : 0.8) * Math.pow(area[i], 0.47), b = 0;
        while (b < WIDTHS.length - 1 && WIDTHS[b] < w) b++;
        paths[b].push(i);
      }
      pen.lineCap = 'round';
      for (k = WIDTHS.length - 1; k >= 0; k--) {
        if (!paths[k].length) continue;
        var shade = 0.62 + 0.38 * Math.min(1, k / 6);
        pen.strokeStyle = 'rgba(233,230,223,' + shade.toFixed(2) + ')';
        pen.lineWidth = WIDTHS[k];
        pen.beginPath();
        for (var j = 0; j < paths[k].length; j++) {
          i = paths[k][j];
          pen.moveTo(bendX[parent[i]], bendY[parent[i]]); pen.lineTo(bendX[i], bendY[i]);
        }
        pen.stroke();
      }

      pen.clearRect(0, root.y + 1, size.w, size.h - root.y);          // nothing shows below the ground

      // light that was reached stays where it was caught, as a leaf of it
      pen.globalCompositeOperation = 'lighter';
      pen.fillStyle = 'rgba(255,179,71,0.6)';
      pen.beginPath();
      for (k = 0; k < leaves.length; k++) {
        var leaf = leaves[k], n = leaf.node, c = Math.cos(turn[n]), sn = Math.sin(turn[n]);
        var lx = bendX[n] + leaf.dx * c - leaf.dy * sn, ly = bendY[n] + leaf.dx * sn + leaf.dy * c;
        var glow = 1.9 + (still ? 0 : Math.max(0, 1 - (clock - leaf.born) * 2) * 3);      // a leaf flares as it is caught
        pen.moveTo(lx + glow, ly); pen.arc(lx, ly, glow, 0, 6.2832);
      }
      pen.fill();
      pen.globalCompositeOperation = 'source-over';
    }

    /* ---- wiring ---- */

    function place(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      lastScatter = place(e);
      scatter(lastScatter.x, lastScatter.y, 42, 14);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      env.redraw();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!lastScatter) return;
      var p = place(e);
      if ((p.x - lastScatter.x) * (p.x - lastScatter.x) + (p.y - lastScatter.y) * (p.y - lastScatter.y) < 28 * 28) return;
      lastScatter = p;
      scatter(p.x, p.y, 38, 9);
    });
    function lift() { lastScatter = null; }
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'pan-y';

    var senseDial = env.room.querySelector('[data-reaching-sense]');
    var senseReadout = env.room.querySelector('[data-reaching-sense-value]');
    function readSense() {
      sense = Number(senseDial.value);
      if (senseReadout) senseReadout.textContent = sense < 60 ? 'short-sighted: dense and twiggy' : sense < 110 ? 'a fair distance' : 'far-sighted: long bare limbs';
      refile();
    }
    if (senseDial) { senseDial.addEventListener('input', readSense); sense = Number(senseDial.value); }
    var again = env.room.querySelector('[data-reaching-again]');
    if (again) again.addEventListener('click', function () { seed = (Math.random() * 1e9) >>> 0; plant(); });
    var rain = env.room.querySelector('[data-reaching-rain]');
    if (rain) rain.addEventListener('click', function () {
      planting = true;                  // rain keeps clear of the label and the masthead too
      for (var k = 0; k < 6; k++) scatter(size.w * (size.w >= 900 ? 0.36 + random() * 0.6 : 0.08 + random() * 0.84), root.y * (0.12 + random() * 0.6), 90, 45);
      planting = false;
      env.redraw();
    });

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        if (senseDial) readSense();
        plant();
      },
      frame: function (time, dt) {
        clock += dt;
        // forty rounds of growth a second: slow enough to watch it decide
        owed = Math.min(3, owed + dt * 40);
        while (owed >= 1 && !grown) { owed -= 1; if (!grow()) grown = true; }
        if (grown) owed = 0;
        report();
        render(false);
      },
      // With motion paused: grow the whole tree at once and show it standing still.
      still: function () {
        for (var i = 0; i < 4000 && !grown; i++) if (!grow()) grown = true;
        report();
        render(true);
      }
    };


  });
})();
