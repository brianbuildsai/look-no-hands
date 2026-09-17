/* Nearly Alike — room 8.

   A double pendulum is a pendulum hanging from a pendulum. Its motion is
   completely determined by where it starts, and completely unpredictable
   anyway, because any difference between two starts, however small, doubles
   and redoubles until it is the size of the whole swing.

   Here there are fifteen hundred of them, released together, differing only
   in the angle of the lower arm, by a total of a millionth of a degree from
   the first to the last. Each is integrated separately (fourth-order
   Runge-Kutta, 240 steps a second). For a few seconds they are one pendulum.
   Then they are not.

   Drawing: the arms are redrawn every frame; the paths of the tips are kept
   in a texture that is dimmed a little each frame, so they linger and fade. */
(function () {
  'use strict';

  var G = 9.81;
  var STEPS_PER_SECOND = 240;
  var DEG = Math.PI / 180;

  // Lines and dots, coloured along a ramp by which pendulum they belong to.
  var LINE_VERTEX = [
    'attribute vec3 aVertex;',          // x, y in stage pixels; which pendulum, 0…1
    'uniform vec2 uStage;',
    'uniform float uPointSize;',
    'varying float vWhich;',
    'void main() {',
    '  vec2 clip = aVertex.xy / uStage * 2.0 - 1.0;',
    '  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);',
    '  gl_PointSize = uPointSize;',
    '  vWhich = aVertex.z;',
    '}'
  ].join('\n');

  var LINE_FRAGMENT = [
    'precision mediump float;',
    'uniform float uGain;',
    'uniform float uRound;',            // 1 when drawing dots, so they come out round
    'varying float vWhich;',
    'void main() {',
    '  if (uRound > 0.5 && length(gl_PointCoord - 0.5) > 0.5) discard;',
    '  vec3 amber = vec3(1.0, 0.70, 0.28), rose = vec3(1.0, 0.31, 0.48), blue = vec3(0.24, 0.36, 1.0);',
    '  vec3 color = vWhich < 0.0 ? vec3(0.91, 0.90, 0.87)',
    '             : vWhich < 0.5 ? mix(amber, rose, vWhich * 2.0) : mix(rose, blue, vWhich * 2.0 - 1.0);',
    '  gl_FragColor = vec4(color * uGain, 1.0);',
    '}'
  ].join('\n');

  var FILL_VERTEX = [
    'attribute vec2 aPosition;',
    'varying vec2 vUv;',
    'void main() { vUv = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }'
  ].join('\n');

  // Dims what is already in the trail texture. With reverse-subtract blending
  // this removes a fraction and then a sliver more, so trails reach true black.
  var FADE_FRAGMENT = [
    'precision mediump float;',
    'uniform float uFade;',
    'void main() { gl_FragColor = vec4(vec3(1.0 / 255.0), uFade); }'
  ].join('\n');

  var COPY_FRAGMENT = [
    'precision mediump float;',
    'uniform sampler2D uSource;',
    'varying vec2 vUv;',
    'void main() { gl_FragColor = vec4(texture2D(uSource, vUv).rgb, 1.0); }'
  ].join('\n');

  Gallery.register('alike', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var context = Gallery.gl.context(canvas, { alpha: false, antialias: true, depth: false, stencil: false });
    if (!context) {
      env.fail('This work is drawn by your graphics card, and this browser has WebGL switched off. The other rooms still run.');
      return null;
    }
    var gl = context.gl;

    var count = size.w >= 900 ? 1500 : 700;
    var a1 = new Float64Array(count), a2 = new Float64Array(count);     // angles from straight down
    var w1 = new Float64Array(count), w2 = new Float64Array(count);     // angular speeds
    var tips = new Float32Array(count * 2);                             // where each tip was last frame
    var arms = new Float32Array(count * 4 * 3);                         // two segments each
    var strokes = new Float32Array(count * 2 * 3);                      // one trail segment each
    var marks = new Float32Array(3 * 3);                                // pivot and the first pendulum's two bobs

    var start = { a1: 2.25, a2: 2.75 };
    var exponent = 6;                 // total spread at release is 10^-exponent degrees
    var elapsed = 0;
    var holding = false;
    var pivot = { x: 0, y: 0, arm: 100 };
    var debt = 0;
    var fresh = true;                 // just released: no trail segment to draw yet
    var warmed = false;
    var idle = 0;
    var lost = false;
    var g = null;                     // programs, buffers, the trail texture

    /* ---- physics ---- */

    // Angular accelerations of a double pendulum with equal arms and equal
    // bobs, left in `acc1` and `acc2`. (Lagrange's equations, solved for them.)
    var acc1 = 0, acc2 = 0;
    function accelerate(t1, t2, o1, o2) {
      var d = t1 - t2, sd = Math.sin(d), cd = Math.cos(d);
      var under = 3 - Math.cos(2 * d);
      acc1 = (-3 * G * Math.sin(t1) - G * Math.sin(t1 - 2 * t2) - 2 * sd * (o2 * o2 + o1 * o1 * cd)) / under;
      acc2 = (2 * sd * (2 * o1 * o1 + 2 * G * Math.cos(t1) + o2 * o2 * cd)) / under;
    }

    // One Runge-Kutta step of length h for every pendulum.
    function step(h) {
      for (var i = 0; i < count; i++) {
        var t1 = a1[i], t2 = a2[i], o1 = w1[i], o2 = w2[i];
        accelerate(t1, t2, o1, o2);
        var k1a = acc1, k1b = acc2;
        accelerate(t1 + 0.5 * h * o1, t2 + 0.5 * h * o2, o1 + 0.5 * h * k1a, o2 + 0.5 * h * k1b);
        var k2a = acc1, k2b = acc2;
        var o1b = o1 + 0.5 * h * k1a, o2b = o2 + 0.5 * h * k1b;
        accelerate(t1 + 0.5 * h * o1b, t2 + 0.5 * h * o2b, o1 + 0.5 * h * k2a, o2 + 0.5 * h * k2b);
        var k3a = acc1, k3b = acc2;
        var o1c = o1 + 0.5 * h * k2a, o2c = o2 + 0.5 * h * k2b;
        var o1d = o1 + h * k3a, o2d = o2 + h * k3b;
        accelerate(t1 + h * o1c, t2 + h * o2c, o1d, o2d);
        a1[i] = t1 + h / 6 * (o1 + 2 * o1b + 2 * o1c + o1d);
        a2[i] = t2 + h / 6 * (o2 + 2 * o2b + 2 * o2c + o2d);
        w1[i] = o1 + h / 6 * (k1a + 2 * k2a + 2 * k3a + acc1);
        w2[i] = o2 + h / 6 * (k1b + 2 * k2b + 2 * k3b + acc2);
      }
    }

    function release() {
      var spread = Math.pow(10, -exponent) * DEG;
      for (var i = 0; i < count; i++) {
        a1[i] = start.a1;
        a2[i] = start.a2 + (i / (count - 1) - 0.5) * spread;
        w1[i] = w2[i] = 0;
      }
      elapsed = 0;
      debt = 0;
      fresh = true;
      idle = 0;
    }

    // How far apart the lower arms have drifted, first to last, in degrees.
    function driftText() {
      var low = Infinity, high = -Infinity;
      for (var i = 0; i < count; i++) { if (a2[i] < low) low = a2[i]; if (a2[i] > high) high = a2[i]; }
      var degrees = (high - low) / DEG;
      if (degrees >= 360) return 'more than a full turn';
      if (degrees >= 10) return Math.round(degrees) + '°';
      var places = Math.min(9, Math.max(1, 1 - Math.floor(Math.log(degrees) / Math.LN10)));
      return degrees.toFixed(places) + '°';
    }

    /* ---- drawing ---- */

    function build() {
      g = {
        lines: Gallery.gl.program(gl, LINE_VERTEX, LINE_FRAGMENT),
        fade: Gallery.gl.program(gl, FILL_VERTEX, FADE_FRAGMENT),
        copy: Gallery.gl.program(gl, FILL_VERTEX, COPY_FRAGMENT),
        triangle: Gallery.gl.fullscreenTriangle(gl),
        vertices: gl.createBuffer(),
        texture: null, framebuffer: null
      };
      g.lineAt = Gallery.gl.uniforms(gl, g.lines, ['uStage', 'uPointSize', 'uGain', 'uRound']);
      g.fadeAt = Gallery.gl.uniforms(gl, g.fade, ['uFade']);
      g.copyAt = Gallery.gl.uniforms(gl, g.copy, ['uSource']);
      gl.disable(gl.DEPTH_TEST);
      makeTrailTexture();
    }

    function makeTrailTexture() {
      if (g.texture) { gl.deleteTexture(g.texture); gl.deleteFramebuffer(g.framebuffer); }
      g.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, g.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      g.framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, g.framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, g.texture, 0);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      fresh = true;
    }

    function fill(program) {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.triangle);
      var at = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(at);
      gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function strokeLines(data, vertexCount, mode, gain, pointSize) {
      gl.useProgram(g.lines);
      gl.uniform2f(g.lineAt.uStage, size.w, size.h);
      gl.uniform1f(g.lineAt.uGain, gain);
      gl.uniform1f(g.lineAt.uPointSize, pointSize || 1);
      gl.uniform1f(g.lineAt.uRound, mode === gl.POINTS ? 1 : 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.vertices);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      var at = gl.getAttribLocation(g.lines, 'aVertex');
      gl.enableVertexAttribArray(at);
      gl.vertexAttribPointer(at, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(mode, 0, vertexCount);
    }

    function draw(dt) {
      if (lost) return;
      var L = pivot.arm, px = pivot.x, py = pivot.y;
      for (var i = 0; i < count; i++) {
        var which = i / (count - 1);
        var x1 = px + L * Math.sin(a1[i]), y1 = py + L * Math.cos(a1[i]);
        var x2 = x1 + L * Math.sin(a2[i]), y2 = y1 + L * Math.cos(a2[i]);
        var a = i * 12;
        arms[a] = px; arms[a + 1] = py; arms[a + 2] = which;
        arms[a + 3] = x1; arms[a + 4] = y1; arms[a + 5] = which;
        arms[a + 6] = x1; arms[a + 7] = y1; arms[a + 8] = which;
        arms[a + 9] = x2; arms[a + 10] = y2; arms[a + 11] = which;
        var s = i * 6;
        strokes[s] = fresh ? x2 : tips[i * 2]; strokes[s + 1] = fresh ? y2 : tips[i * 2 + 1]; strokes[s + 2] = which;
        strokes[s + 3] = x2; strokes[s + 4] = y2; strokes[s + 5] = which;
        tips[i * 2] = x2; tips[i * 2 + 1] = y2;
        if (i === 0) {
          marks[0] = px; marks[1] = py; marks[2] = -1;
          marks[3] = x1; marks[4] = y1; marks[5] = -1;
          marks[6] = x2; marks[7] = y2; marks[8] = -1;
        }
      }
      fresh = false;

      // 1. the trail texture: dim it, then add this frame's bit of every tip's path
      gl.bindFramebuffer(gl.FRAMEBUFFER, g.framebuffer);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.BLEND);
      if (dt > 0) {
        gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(g.fade);
        gl.uniform1f(g.fadeAt.uFade, 1 - Math.pow(1 - 0.022, dt * 60));
        fill(g.fade);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ONE);
        if (!holding) strokeLines(strokes, count * 2, gl.LINES, 0.3);
      }

      // 2. the screen: the trails, then the arms over them
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.BLEND);
      gl.useProgram(g.copy);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, g.texture);
      gl.uniform1i(g.copyAt.uSource, 0);
      fill(g.copy);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE);
      strokeLines(arms, count * 4, gl.LINES, Math.max(0.035, 60 / count * 0.9));
      strokeLines(marks, 3, gl.POINTS, 0.85, 9 * canvas.width / size.w);
    }

    /* ---- wiring ---- */

    function resize() {
      var ratio = Math.min(size.dpr, 1.5);
      canvas.width = Math.max(1, Math.round(size.w * ratio));
      canvas.height = Math.max(1, Math.round(size.h * ratio));
      var wide = size.w >= 900;
      pivot.x = size.w * (wide ? 0.64 : 0.5);
      pivot.y = size.h * (wide ? 0.45 : 0.46);
      pivot.arm = wide ? Math.min(size.w * 0.16, size.h * 0.19) : Math.min(size.w * 0.23, size.h * 0.21);
      if (g && !lost) makeTrailTexture();
    }

    // Hold the tip and both arms follow (the elbow bends whichever way is nearer).
    function hold(e) {
      var rect = canvas.getBoundingClientRect();
      var tx = (e.clientX - rect.left - pivot.x) / pivot.arm, ty = (e.clientY - rect.top - pivot.y) / pivot.arm;
      var d = Gallery.clamp(Math.sqrt(tx * tx + ty * ty), 0.05, 1.999);
      var toward = Math.atan2(tx, ty);
      var bend = Math.acos(d / 2);
      var side = Math.sin(start.a2 - start.a1) >= 0 ? 1 : -1;
      start.a1 = toward - side * bend;
      start.a2 = toward + side * bend;
      release();
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      holding = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      hold(e);
      env.redraw();
    });
    canvas.addEventListener('pointermove', function (e) { if (holding) { hold(e); env.redraw(); } });
    function letGo() { if (holding) { holding = false; release(); env.redraw(); } }
    canvas.addEventListener('pointerup', letGo);
    canvas.addEventListener('pointercancel', letGo);

    var againButton = env.room.querySelector('[data-alike-again]');
    if (againButton) againButton.addEventListener('click', function () { release(); warmed = false; env.redraw(); });

    var likeDial = env.room.querySelector('[data-alike-spread]');
    var likeReadout = env.room.querySelector('[data-alike-spread-value]');
    var NAMES = { 3: 'a thousandth', 4: 'a ten-thousandth', 5: 'a hundred-thousandth', 6: 'a millionth', 7: 'a ten-millionth', 8: 'a hundred-millionth', 9: 'a billionth' };
    function readLike() {
      exponent = Number(likeDial.value);
      if (likeReadout) likeReadout.textContent = NAMES[exponent] + ' of a degree';
    }
    if (likeDial) {
      likeDial.addEventListener('input', readLike);
      likeDial.addEventListener('change', function () { release(); warmed = false; env.redraw(); });
      readLike();
    }

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () { build(); lost = false; env.redraw(); });

    env.live('count', Gallery.formatCount(count));
    release();

    return {
      resize: function () { resize(); if (!g) build(); },
      frame: function (time, dt) {
        if (!holding) {
          debt += dt * STEPS_PER_SECOND;
          var steps = Math.min(16, Math.floor(debt));
          debt -= steps;
          for (var i = 0; i < steps; i++) step(1 / STEPS_PER_SECOND);
          elapsed += steps / STEPS_PER_SECOND;
          // left alone for a long while, it starts again from a new pose
          idle += dt;
          if (idle > 50) { start.a1 = 1.9 + Math.random() * 1.1; start.a2 = start.a1 + 0.3 + Math.random() * 0.9; release(); }
        }
        draw(dt);
        env.live('time', elapsed.toFixed(1));
        env.live('drift', driftText());
      },
      // With motion paused: run seven seconds out of sight, then show where they got to.
      still: function () {
        if (!warmed && !holding) {
          for (var i = 0; i < 840; i++) step(1 / 120);
          elapsed = 7;
          warmed = true;
        }
        draw(0);
        env.live('time', elapsed.toFixed(1));
        env.live('drift', driftText());
      }
    };
  });
})();
