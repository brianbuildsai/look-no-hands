/* An Introduction — room 12.

   Two disc galaxies on a collision course, by the method Alar and Juri
   Toomre used in 1972: each galaxy is one heavy centre with a disc of stars
   around it, and the stars are treated as weightless. They feel the pull of
   the two centres and nothing else, which makes forty thousand of them cheap
   enough to follow (one square root each per centre per step). The centres
   pull on each other, and a little drag between them stands in for the
   friction that makes real galaxies merge instead of just passing.

   Everything long and graceful that appears (the bridges, the tails, the
   shells) is tide. None of it is put in by hand. */
(function () {
  'use strict';

  var STEP = 0.012;                 // time per integration step; 1 unit is about 87 million years
  var MYR_PER_UNIT = 87;
  var PASSES = {
    grazing: { closest: 2.6, tilt: 0.9 },
    close: { closest: 1.5, tilt: 0.6 },
    headon: { closest: 0.3, tilt: 1.2 }
  };

  var VERTEX = [
    'attribute vec4 aStar;',          // x, y, z, and which galaxy (0 or 1; 2 for a centre)
    'uniform mat3 uTurn;',
    'uniform vec2 uStage;',
    'uniform vec2 uFocus;',
    'uniform float uScale;',
    'uniform float uRatio;',
    'varying float vWhich;',
    'varying float vDepth;',
    'void main() {',
    '  vec3 p = uTurn * aStar.xyz;',
    '  float near = 1.0 / (1.0 + p.z * 0.035);',           // a little perspective
    '  vec2 px = uFocus + vec2(p.x, -p.y) * uScale * near;',
    '  vec2 clip = px / uStage * 2.0 - 1.0;',
    '  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);',
    '  gl_PointSize = (aStar.w > 1.5 ? 14.0 : 2.6) * uRatio * near;',
    '  vWhich = aStar.w;',
    '  vDepth = near;',
    '}'
  ].join('\n');

  var FRAGMENT = [
    'precision mediump float;',
    'uniform float uGain;',
    'varying float vWhich;',
    'varying float vDepth;',
    'void main() {',
    '  float d = length(gl_PointCoord - 0.5);',
    '  float a = smoothstep(0.5, 0.0, d);',
    '  vec3 color = vWhich > 1.5 ? vec3(1.0, 0.96, 0.9) : vWhich > 0.5 ? vec3(0.42, 0.56, 1.0) : vec3(1.0, 0.68, 0.34);',
    '  gl_FragColor = vec4(color * a * a * uGain * vDepth * (vWhich > 1.5 ? 2.2 : 1.0), 1.0);',
    '}'
  ].join('\n');

  Gallery.register('introduction', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var context = Gallery.gl.context(canvas, { alpha: false, antialias: false, depth: false, stencil: false });
    if (!context) {
      env.fail('This work is drawn by your graphics card, and this browser has WebGL switched off. The other rooms still run.');
      return null;
    }
    var gl = context.gl;
    var program, at, buffer, lost = false;

    var counts = size.w >= 900 ? [22000, 17000] : [9000, 7000];
    var total = counts[0] + counts[1];
    var pos = new Float32Array(total * 3), vel = new Float32Array(total * 3);
    var stars = new Float32Array((total + 2) * 4);         // what is sent to be drawn
    var cores = [
      { m: 1.0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 },
      { m: 0.7, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }
    ];
    var pass = 'close';
    var time = 0, speed = 1, debt = 0;
    var view = { around: 0.4, above: 0.95 };
    var drag = null, lastTouch = -1e9;
    var warmed = false;
    var extent = 6;                   // half the width of what is in view, in disc radii
    var together = 0;                 // how long the two centres have been one
    var curtain = 1;                  // brightness, lowered while the scene is reset

    /* ---- setting the two galaxies on their way ---- */

    function gaussian() {
      return (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.87;
    }

    function arrange() {
      // The centres start at the far end of a long oval orbit about each other,
      // moving sideways at exactly the speed that will bring them to within
      // `closest` of each other at the near end. (Two-body orbit, split about
      // the centre of mass so the pair as a whole stays put.)
      var q = PASSES[pass].closest, mu = cores[0].m + cores[1].m, far = 6.4;
      var rx = far, ry = 0;
      var vx = 0, vy = Math.sqrt(mu * (2 / far - 2 / (far + q)));
      var share0 = cores[1].m / mu, share1 = cores[0].m / mu;
      cores[0].x = -share0 * rx; cores[0].y = -share0 * ry; cores[0].z = 0;
      cores[0].vx = -share0 * vx; cores[0].vy = -share0 * vy; cores[0].vz = 0;
      cores[1].x = share1 * rx; cores[1].y = share1 * ry; cores[1].z = 0;
      cores[1].vx = share1 * vx; cores[1].vy = share1 * vy; cores[1].vz = 0;

      // Each disc: stars on circular orbits, crowded toward the middle. The first
      // lies in the plane of the encounter; the second is tipped out of it.
      var tilt = PASSES[pass].tilt, at = 0;
      for (var g = 0; g < 2; g++) {
        var c = cores[g], reach = g === 0 ? 1.0 : 0.82;
        var ny = g === 0 ? 0 : Math.sin(tilt), nz = g === 0 ? 1 : Math.cos(tilt);      // the disc's axis
        for (var i = 0; i < counts[g]; i++, at++) {
          var r = Math.min(1.15, Math.max(0.05, -Math.log(1 - Math.random()) * 0.38)) * reach;
          var a = Math.random() * 6.2832, ca = Math.cos(a), sa = Math.sin(a);
          var speedHere = Math.sqrt(c.m * r * r / Math.pow(r * r + 0.0225, 1.5));
          var lift = gaussian() * 0.018;
          // in-plane axes are (1, 0, 0) and (0, nz, -ny)
          pos[at * 3] = c.x + r * ca;
          pos[at * 3 + 1] = c.y + r * sa * nz + lift * ny;
          pos[at * 3 + 2] = c.z - r * sa * ny + lift * nz;
          vel[at * 3] = c.vx - speedHere * sa;
          vel[at * 3 + 1] = c.vy + speedHere * ca * nz;
          vel[at * 3 + 2] = c.vz - speedHere * ca * ny;
        }
      }
      time = 0;
      debt = 0;
      together = 0;
    }

    /* ---- physics ---- */

    function step(h) {
      var a = cores[0], b = cores[1];
      var dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      var d2 = dx * dx + dy * dy + dz * dz + 0.09;
      var pull = 1 / (d2 * Math.sqrt(d2));
      // drag between the centres when they are close, as the stars' own gravity would provide
      var d = Math.sqrt(d2), drag = 0.05 / (1 + Math.pow(d / 1.3, 3));
      together = d < 0.55 ? together + h : 0;
      var mu = a.m + b.m;
      var rvx = b.vx - a.vx, rvy = b.vy - a.vy, rvz = b.vz - a.vz;
      a.vx += (dx * pull * b.m + drag * rvx * b.m / mu) * h; a.vy += (dy * pull * b.m + drag * rvy * b.m / mu) * h; a.vz += (dz * pull * b.m + drag * rvz * b.m / mu) * h;
      b.vx -= (dx * pull * a.m + drag * rvx * a.m / mu) * h; b.vy -= (dy * pull * a.m + drag * rvy * a.m / mu) * h; b.vz -= (dz * pull * a.m + drag * rvz * a.m / mu) * h;
      a.x += a.vx * h; a.y += a.vy * h; a.z += a.vz * h;
      b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;

      var ax = a.x, ay = a.y, az = a.z, am = a.m, bx = b.x, by = b.y, bz = b.z, bm = b.m;
      for (var i = 0, n = total * 3; i < n; i += 3) {
        var x = pos[i], y = pos[i + 1], z = pos[i + 2];
        var ux = ax - x, uy = ay - y, uz = az - z;
        var u2 = ux * ux + uy * uy + uz * uz + 0.0225;
        var pa = am / (u2 * Math.sqrt(u2));
        var wx = bx - x, wy = by - y, wz = bz - z;
        var w2 = wx * wx + wy * wy + wz * wz + 0.0225;
        var pb = bm / (w2 * Math.sqrt(w2));
        var vx = vel[i] + (ux * pa + wx * pb) * h;
        var vy = vel[i + 1] + (uy * pa + wy * pb) * h;
        var vz = vel[i + 2] + (uz * pa + wz * pb) * h;
        vel[i] = vx; vel[i + 1] = vy; vel[i + 2] = vz;
        pos[i] = x + vx * h; pos[i + 1] = y + vy * h; pos[i + 2] = z + vz * h;
      }
      time += h;
    }

    /* ---- drawing ---- */

    function build() {
      program = Gallery.gl.program(gl, VERTEX, FRAGMENT);
      at = Gallery.gl.uniforms(gl, program, ['uTurn', 'uStage', 'uFocus', 'uScale', 'uRatio', 'uGain']);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, stars.byteLength, gl.DYNAMIC_DRAW);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.clearColor(0, 0, 0, 1);
    }

    function draw() {
      if (lost) return;
      var i, o;
      for (i = 0; i < total; i++) {
        o = i * 4;
        stars[o] = pos[i * 3]; stars[o + 1] = pos[i * 3 + 1]; stars[o + 2] = pos[i * 3 + 2];
        stars[o + 3] = i < counts[0] ? 0 : 1;
      }
      for (i = 0; i < 2; i++) {
        o = (total + i) * 4;
        stars[o] = cores[i].x; stars[o + 1] = cores[i].y; stars[o + 2] = cores[i].z; stars[o + 3] = 2;
      }
      // turn about the vertical axis of the encounter, then tip toward the viewer
      var ca = Math.cos(view.around), sa = Math.sin(view.around), cb = Math.cos(view.above), sb = Math.sin(view.above);
      var turn = new Float32Array([ca, sa * cb, sa * sb, -sa, ca * cb, ca * sb, 0, -sb, cb]);   // column by column

      var wide = size.w >= 900;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniformMatrix3fv(at.uTurn, false, turn);
      gl.uniform2f(at.uStage, size.w, size.h);
      gl.uniform2f(at.uFocus, size.w * (wide ? 0.62 : 0.5), size.h * 0.5);
      // stand back far enough to keep both centres in view, and move in as they close
      var apart = Math.sqrt(Math.pow(cores[1].x - cores[0].x, 2) + Math.pow(cores[1].y - cores[0].y, 2) + Math.pow(cores[1].z - cores[0].z, 2));
      var want = Gallery.clamp(apart * 0.62 + 2.3, 2.8, 6.6);
      extent += (want - extent) * 0.03;
      gl.uniform1f(at.uScale, Math.min(size.w * (wide ? 0.6 : 1.1), size.h * 0.98) / (extent * 2));
      gl.uniform1f(at.uRatio, canvas.width / size.w);
      gl.uniform1f(at.uGain, (wide ? 0.85 : 0.95) * curtain);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, stars);
      var where = gl.getAttribLocation(program, 'aStar');
      gl.enableVertexAttribArray(where);
      gl.vertexAttribPointer(where, 4, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, total + 2);
      env.live('years', Gallery.formatCount(Math.round(time * MYR_PER_UNIT / 10) * 10));
    }

    /* ---- wiring ---- */

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      view.around += (e.clientX - drag.x) / size.w * 4;
      view.above = Gallery.clamp(view.above + (e.clientY - drag.y) / size.h * 3, 0, 1.5);
      drag.x = e.clientX; drag.y = e.clientY;
      lastTouch = performance.now();
      env.redraw();
    });
    function release() { drag = null; canvas.style.cursor = 'grab'; lastTouch = performance.now(); }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.style.cursor = 'grab';

    var passButtons = Array.prototype.slice.call(env.room.querySelectorAll('[data-introduction-pass]'));
    passButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        pass = button.getAttribute('data-introduction-pass');
        passButtons.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
        arrange();
        warmed = false;
        env.redraw();
      });
    });
    var againButton = env.room.querySelector('[data-introduction-again]');
    if (againButton) againButton.addEventListener('click', function () { arrange(); warmed = false; env.redraw(); });

    var speedDial = env.room.querySelector('[data-introduction-speed]');
    var speedReadout = env.room.querySelector('[data-introduction-speed-value]');
    function readSpeed() {
      speed = Number(speedDial.value);
      if (speedReadout) speedReadout.textContent = speed === 0 ? 'stopped' : Math.round(speed * 5 * MYR_PER_UNIT) + ' million years a second';
    }
    if (speedDial) { speedDial.addEventListener('input', readSpeed); readSpeed(); }

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () { build(); lost = false; env.redraw(); });

    build();
    arrange();
    env.live('stars', Gallery.formatCount(total));

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
      },
      frame: function (now, dt) {
        debt += dt * speed * 5 / STEP;
        var steps = Math.min(14, Math.floor(debt));
        debt -= steps;
        for (var i = 0; i < steps; i++) step(STEP);
        // once they have settled into one, dim the lights and introduce them again
        if (together > 9 || time > 160) {
          curtain = Math.max(0, curtain - dt / 1.5);
          if (curtain === 0) arrange();
        } else if (curtain < 1) {
          curtain = Math.min(1, curtain + dt / 1.5);
        }
        if (!drag && performance.now() - lastTouch > 3000) view.around += dt * 0.03;
        draw();
      },
      // With motion paused: run on to just after the first pass, where the tails are, and show that.
      still: function () {
        if (!warmed) { while (time < 19) step(STEP * 2); warmed = true; }
        draw();
      }
    };
  });
})();
