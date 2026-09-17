/* Ptolemy's Pencil — room 9.

   Any closed drawing can be made by circles riding on circles, each turning
   at a steady whole-number speed: once round, twice, three times, backwards
   once, and so on. Finding the right size and starting angle for each circle
   is a Fourier transform, and it is short enough to read: treat each point
   of the drawing as a complex number, and for every speed n, average the
   points multiplied by a counter-rotation at that speed. What survives the
   averaging is how much of the drawing turns at speed n.

   The biggest circles are drawn first. With only a few, the pen draws a
   blob; with a few hundred it draws whatever you drew. */
(function () {
  'use strict';

  var SAMPLES = 512;              // points taken along the drawing
  var LOOP_SECONDS = 14;          // one full trip of the pen
  var TAU = Math.PI * 2;

  // Walk along a polyline and return `count` points evenly spaced along it (closing the loop).
  function resample(points, count) {
    var closed = points.concat([points[0]]);
    var lengths = [0];
    for (var i = 1; i < closed.length; i++) {
      var dx = closed[i][0] - closed[i - 1][0], dy = closed[i][1] - closed[i - 1][1];
      lengths.push(lengths[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    var total = lengths[lengths.length - 1];
    var out = [], segment = 1;
    for (var k = 0; k < count; k++) {
      var want = total * k / count;
      while (segment < closed.length - 1 && lengths[segment] < want) segment++;
      var span = lengths[segment] - lengths[segment - 1] || 1;
      var t = (want - lengths[segment - 1]) / span;
      out.push([closed[segment - 1][0] + (closed[segment][0] - closed[segment - 1][0]) * t,
                closed[segment - 1][1] + (closed[segment][1] - closed[segment - 1][1]) * t]);
    }
    return out;
  }

  // The transform. Returns one circle per speed: { speed, re, im, radius },
  // largest first, after the speed-0 term (which is just where the centre is).
  function transform(points) {
    var n = points.length, circles = [];
    for (var speed = -n / 2; speed < n / 2; speed++) {
      var re = 0, im = 0;
      for (var k = 0; k < n; k++) {
        var angle = -TAU * speed * k / n;
        var c = Math.cos(angle), s = Math.sin(angle);
        re += points[k][0] * c - points[k][1] * s;
        im += points[k][0] * s + points[k][1] * c;
      }
      re /= n; im /= n;
      circles.push({ speed: speed, re: re, im: im, radius: Math.sqrt(re * re + im * im) });
    }
    circles.sort(function (a, b) { return (b.speed === 0) - (a.speed === 0) || b.radius - a.radius; });
    return circles;
  }

  Gallery.register('pencil', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }
    canvas.style.touchAction = 'none';       // this stage is a drawing surface

    var original = [];            // the drawing, resampled
    var circles = [];
    var using = 40;               // how many circles are switched on
    var traced = [];              // where the pen goes with that many circles
    var progress = 0;             // 0…1 round the loop
    var sketch = null;            // a drawing in progress
    var isHand = true;

    /* ---- from a drawing to circles ---- */

    // Where the pen goes round one whole loop, using only the first `using` circles.
    function retrace() {
      var m = Math.min(using, circles.length);
      traced = [];
      for (var k = 0; k <= SAMPLES; k++) {
        var t = k / SAMPLES, x = 0, y = 0;
        for (var j = 0; j < m; j++) {
          var c = circles[j], a = TAU * c.speed * t;
          var ca = Math.cos(a), sa = Math.sin(a);
          x += c.re * ca - c.im * sa;
          y += c.re * sa + c.im * ca;
        }
        traced.push([x, y]);
      }
      env.live('circles', Gallery.formatCount(Math.max(0, m - 1)));
    }

    function useShape(points) {
      original = resample(points, SAMPLES);
      circles = transform(original);
      progress = 0;
      retrace();
      env.redraw();
    }

    function showHand() {
      var wide = size.w >= 900;
      var tall = Math.min(size.h * 0.74, size.w * (wide ? 0.62 : 1.15));
      var cx = size.w * (wide ? 0.64 : 0.5), cy = size.h * 0.51;
      isHand = true;
      useShape(Gallery.hand(tall, 10).map(function (p) { return [p[0] + cx, p[1] + cy]; }));
    }

    /* ---- drawing ---- */

    function path(points, from, to) {
      pen.beginPath();
      for (var i = from; i <= to; i++) {
        if (i === from) pen.moveTo(points[i][0], points[i][1]); else pen.lineTo(points[i][0], points[i][1]);
      }
    }

    function render() {
      var ratio = canvas.width / size.w;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);
      pen.lineJoin = 'round';
      pen.lineCap = 'round';

      if (sketch) {
        if (sketch.length > 1) {
          path(sketch, 0, sketch.length - 1);
          pen.strokeStyle = 'rgba(233,230,223,0.9)';
          pen.lineWidth = 2;
          pen.stroke();
        }
        return;
      }
      if (!traced.length) return;

      // what was drawn, faintly, so the circles' attempt can be judged against it
      path(original, 0, original.length - 1);
      pen.closePath();
      pen.strokeStyle = 'rgba(143,141,136,0.4)';
      pen.lineWidth = 1;
      pen.stroke();

      // the pen's line: all of the last lap dimly, this lap brightly up to the pen
      var reached = Math.floor(progress * SAMPLES);
      path(traced, 0, SAMPLES);
      pen.strokeStyle = 'rgba(255,179,71,0.22)';
      pen.lineWidth = 1.5;
      pen.stroke();
      if (reached > 0) {
        path(traced, 0, reached);
        pen.strokeStyle = 'rgba(255,179,71,0.18)';
        pen.lineWidth = 7;
        pen.stroke();
        pen.strokeStyle = 'rgba(255,200,120,0.98)';
        pen.lineWidth = 2;
        pen.stroke();
      }

      // the circles, each centred on the rim of the one before
      var t = progress, x = 0, y = 0;
      var m = Math.min(using, circles.length);
      pen.lineWidth = 1;
      for (var j = 0; j < m; j++) {
        var c = circles[j], a = TAU * c.speed * t;
        var nx = x + c.re * Math.cos(a) - c.im * Math.sin(a);
        var ny = y + c.re * Math.sin(a) + c.im * Math.cos(a);
        if (j > 0) {
          if (c.radius > 1.5) {
            pen.beginPath();
            pen.arc(x, y, c.radius, 0, TAU);
            pen.strokeStyle = 'rgba(233,230,223,' + (j < 12 ? 0.3 : 0.14) + ')';
            pen.stroke();
          }
          pen.beginPath();
          pen.moveTo(x, y);
          pen.lineTo(nx, ny);
          pen.strokeStyle = 'rgba(233,230,223,0.75)';
          pen.stroke();
        }
        x = nx; y = ny;
      }
      var glow = pen.createRadialGradient(x, y, 0, x, y, 16);
      glow.addColorStop(0, 'rgba(255,215,150,0.95)');
      glow.addColorStop(0.25, 'rgba(255,179,71,0.5)');
      glow.addColorStop(1, 'rgba(255,179,71,0)');
      pen.fillStyle = glow;
      pen.beginPath();
      pen.arc(x, y, 16, 0, TAU);
      pen.fill();
    }

    /* ---- wiring ---- */

    function spot(e) {
      var rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      sketch = [spot(e)];
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      env.redraw();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!sketch) return;
      var p = spot(e), last = sketch[sketch.length - 1];
      if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) > 2) { sketch.push(p); env.redraw(); }
    });
    function finish() {
      if (!sketch) return;
      var drawn = sketch, length = 0;
      sketch = null;
      for (var i = 1; i < drawn.length; i++) length += Math.abs(drawn[i][0] - drawn[i - 1][0]) + Math.abs(drawn[i][1] - drawn[i - 1][1]);
      // a tap or a scribble too short to mean anything leaves things as they were
      if (drawn.length >= 8 && length > 120) { isHand = false; useShape(drawn); }
      env.redraw();
    }
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
    canvas.style.cursor = 'crosshair';

    var dial = env.room.querySelector('[data-pencil-circles]');
    function readDial() {
      // the dial is stretched so that the interesting low numbers get most of its travel
      using = 1 + Math.round(1 + 299 * Math.pow(Number(dial.value) / 100, 2.4));
      retrace();
      env.redraw();
    }
    if (dial) dial.addEventListener('input', readDial);

    var handButton = env.room.querySelector('[data-pencil-hand]');
    if (handButton) handButton.addEventListener('click', showHand);

    env.live('points', Gallery.formatCount(SAMPLES));
    if (dial) using = 1 + Math.round(1 + 299 * Math.pow(Number(dial.value) / 100, 2.4));

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        if (isHand) showHand();
      },
      frame: function (time, dt) {
        if (!sketch) progress = (progress + dt / LOOP_SECONDS) % 1;
        render();
      },
      // With motion paused: the pen is shown most of the way round its loop.
      still: function () {
        if (!sketch) progress = 0.86;
        render();
      }
    };
  });
})();
