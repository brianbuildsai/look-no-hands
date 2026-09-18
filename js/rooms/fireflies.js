/* Fireflies — room 28.

   Along some rivers in Southeast Asia, thousands of fireflies in one tree
   flash together, all at once, all night. No firefly is in charge. Each one
   has a clock that runs from empty to full and flashes when it fills; when it
   sees a neighbour flash, it sets its own clock a little further forward,
   and the further along it already was, the bigger the nudge. That is enough
   (Mirollo and Strogatz proved it in 1990): they fall into step, first in
   patches, then in waves that sweep the patches together, then all.

   Nothing else is going on here. There are three thousand clocks, each one
   only able to see the few dozen nearest it. */
(function () {
  'use strict';

  Gallery.register('fireflies', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var COUNT = size.w >= 900 ? 3000 : 1200;
    var x = new Float32Array(COUNT), y = new Float32Array(COUNT), phase = new Float32Array(COUNT), rate = new Float32Array(COUNT);
    var glow = new Float32Array(COUNT), dx = new Float32Array(COUNT), dy = new Float32Array(COUNT);
    var listen = 0.009, sight = 62, cell = 62, columns = 1, rows = 1, bins = [];
    var meadow = { x: 0, y: 0, w: 100, h: 100 };
    var clock = 0, together = 0, steady = 0, flashes = 0, seed = 28;
    var sprite = null;
    function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

    function scatter(all, cx, cy, radius) {
      for (var i = 0; i < COUNT; i++) {
        if (!all && (x[i] - cx) * (x[i] - cx) + (y[i] - cy) * (y[i] - cy) > radius * radius) continue;
        phase[i] = random();
      }
      steady = 0;
    }

    function settle() {
      for (var i = 0; i < COUNT; i++) {
        x[i] = meadow.x + random() * meadow.w; y[i] = meadow.y + random() * meadow.h;
        phase[i] = random();
        rate[i] = 1 / (1.05 + random() * 0.25);          // a flash every second and a bit, each at its own pace
        dx[i] = 0; dy[i] = 0; glow[i] = 0;
      }
      env.live('count', Gallery.formatCount(COUNT));
    }

    // file every firefly by where it is, so a flash only has to be shown to the ones nearby
    function file() {
      cell = sight;
      columns = Math.max(1, Math.ceil(meadow.w / cell)); rows = Math.max(1, Math.ceil(meadow.h / cell));
      bins = [];
      for (var k = 0; k < columns * rows; k++) bins.push([]);
      for (var i = 0; i < COUNT; i++) {
        var cx = Math.min(columns - 1, Math.max(0, Math.floor((x[i] - meadow.x) / cell))), cy = Math.min(rows - 1, Math.max(0, Math.floor((y[i] - meadow.y) / cell)));
        bins[cy * columns + cx].push(i);
      }
    }

    function flash(i) {
      flashes++;
      glow[i] = 1;
      var cx = Math.floor((x[i] - meadow.x) / cell), cy = Math.floor((y[i] - meadow.y) / cell), reach = sight * sight;
      for (var gy = Math.max(0, cy - 1); gy <= Math.min(rows - 1, cy + 1); gy++) {
        for (var gx = Math.max(0, cx - 1); gx <= Math.min(columns - 1, cx + 1); gx++) {
          var list = bins[gy * columns + gx];
          for (var k = 0; k < list.length; k++) {
            var j = list[k];
            if (j === i) continue;
            var ex = x[j] - x[i], ey = y[j] - y[i];
            if (ex * ex + ey * ey > reach) continue;
            // the nudge: further forward the nearer the neighbour already was to flashing, and none just after it has
            if (phase[j] > 0.08) phase[j] = Math.min(1, phase[j] + listen * phase[j]);
          }
        }
      }
    }

    function tick(dt) {
      var i;
      clock += dt;
      for (i = 0; i < COUNT; i++) {
        phase[i] += rate[i] * dt;
        if (phase[i] >= 1) { phase[i] -= 1; flash(i); }
        glow[i] *= Math.exp(-dt * 5.5);
        // a little wandering, as they do
        dx[i] += (random() - 0.5) * 4 * dt; dy[i] += (random() - 0.5) * 4 * dt;
        dx[i] *= 0.98; dy[i] *= 0.98;
        x[i] += dx[i] * dt * 12; y[i] += dy[i] * dt * 12;
        if (x[i] < meadow.x) { x[i] = meadow.x; dx[i] = Math.abs(dx[i]); }
        if (x[i] > meadow.x + meadow.w) { x[i] = meadow.x + meadow.w; dx[i] = -Math.abs(dx[i]); }
        if (y[i] < meadow.y) { y[i] = meadow.y; dy[i] = Math.abs(dy[i]); }
        if (y[i] > meadow.y + meadow.h) { y[i] = meadow.y + meadow.h; dy[i] = -Math.abs(dy[i]); }
      }
      // how much in step they are: the length of the average clock hand (0 all over the place, 1 perfect)
      var sx = 0, sy = 0;
      for (i = 0; i < COUNT; i++) { sx += Math.cos(phase[i] * 6.2831853); sy += Math.sin(phase[i] * 6.2831853); }
      together = Math.sqrt(sx * sx + sy * sy) / COUNT;
      env.live('together', Math.round(together * 100));
      // once they have been in step a good while, something disturbs a patch of them, and it has to be won back
      steady = together > 0.94 ? steady + dt : 0;
      if (steady > 28) { scatter(false, meadow.x + random() * meadow.w, meadow.y + random() * meadow.h, Math.min(meadow.w, meadow.h) * 0.3); }
      if (Math.floor(clock * 4) !== Math.floor((clock - dt) * 4)) file();
    }

    /* ---- drawing ---- */

    function makeSprite() {
      sprite = document.createElement('canvas');
      sprite.width = sprite.height = 48;
      var g = sprite.getContext('2d'), fade = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      fade.addColorStop(0, 'rgba(255,214,120,1)'); fade.addColorStop(0.18, 'rgba(255,179,71,0.75)'); fade.addColorStop(0.5, 'rgba(255,150,50,0.18)'); fade.addColorStop(1, 'rgba(255,140,40,0)');
      g.fillStyle = fade; g.fillRect(0, 0, 48, 48);
    }

    function render() {
      var ratio = canvas.width / size.w, i;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);
      // the ones that are dark: a faint grey-green speck each, so the swarm can be seen waiting
      pen.fillStyle = 'rgba(120,130,90,0.35)';
      pen.beginPath();
      for (i = 0; i < COUNT; i++) if (glow[i] < 0.06) pen.rect(x[i] - 0.6, y[i] - 0.6, 1.2, 1.2);
      pen.fill();
      // the ones that are lit
      pen.globalCompositeOperation = 'lighter';
      for (i = 0; i < COUNT; i++) {
        if (glow[i] < 0.06) continue;
        var r = 7 + glow[i] * 9;
        pen.globalAlpha = glow[i];
        pen.drawImage(sprite, x[i] - r, y[i] - r, r * 2, r * 2);
      }
      pen.globalAlpha = 1;
      pen.globalCompositeOperation = 'source-over';
    }

    /* ---- wiring ---- */

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var rect = canvas.getBoundingClientRect();
      scatter(false, e.clientX - rect.left, e.clientY - rect.top, Math.min(meadow.w, meadow.h) * 0.28);
      env.redraw();
    });
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'pan-y';

    var listenDial = env.room.querySelector('[data-fireflies-listen]');
    var listenReadout = env.room.querySelector('[data-fireflies-listen-value]');
    function readListen() {
      listen = Number(listenDial.value) / 1000;
      if (listenReadout) listenReadout.textContent = listen === 0 ? 'not at all: each to its own' : listen < 0.007 ? 'hardly: it takes minutes' : listen < 0.014 ? 'a little: waves' : listen < 0.025 ? 'a fair bit' : 'closely: all at once';
    }
    if (listenDial) { listenDial.addEventListener('input', readListen); readListen(); }
    var scatterButton = env.room.querySelector('[data-fireflies-scatter]');
    if (scatterButton) scatterButton.addEventListener('click', function () { scatter(true); env.redraw(); });

    makeSprite();

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wide = size.w >= 900;
        meadow.x = wide ? size.w * 0.36 : size.w * 0.04; meadow.w = wide ? size.w * 0.61 : size.w * 0.92;
        meadow.y = size.h * 0.1; meadow.h = size.h * 0.84;
        sight = wide ? 62 : 52;
        settle();
        file();
      },
      frame: function (time, dt) { tick(Math.min(dt, 0.05)); render(); },
      // With motion paused: let them fall into step out of sight, then show a moment of it
      still: function () {
        if (together < 0.9) { for (var i = 0; i < 2400 && together < 0.95; i++) tick(1 / 60); }
        render();
      },
      sync: function () { return { together: together, flashes: flashes, clock: clock }; }
    };
  });
})();
