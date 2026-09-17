/* Murmuration — room 2.

   Tens of thousands of points, each with a position, a velocity and a place
   it would like to be. The places come from drawing the words, unseen, on a
   spare canvas and keeping the pixels that landed inside a letter. Every
   frame each point is pulled toward its place, stirred by a slow current,
   and pushed away from the pointer. The physics runs on the processor; the
   graphics card only has to draw dots and let the old ones fade. */
(function () {
  'use strict';

  var PHRASES = ['Hello.', 'Look, no hands.', 'Now you.'];
  var PHRASE_SECONDS = 7;
  var DUST_SHARE = 0.14;      // points that never join a letter
  var FADE = 0.34;            // how much of the last frame is wiped each frame
  var CELL = 40;              // size of one cell of the current, in pixels

  // The current: [kx, ky, speed, push x, push y]. Each wave pushes at right
  // angles to the direction it varies in, which is what keeps it sink-free.
  var WAVES = [
    [0.0061, 0.0017, 0.21],
    [-0.0023, 0.0052, -0.17],
    [0.0034, -0.0041, 0.13],
    [0.0009, 0.0071, -0.11]
  ].map(function (w) {
    var length = Math.sqrt(w[0] * w[0] + w[1] * w[1]);
    return [w[0], w[1], w[2], w[1] / length, -w[0] / length];
  });

  var POINT_VERTEX = [
    'attribute vec3 aState;',   // x, y in stage pixels, speed
    'attribute vec2 aSeed;',    // size, tint
    'uniform vec2 uStage;',
    'uniform float uRatio;',
    'varying float vSpeed;',
    'varying vec2 vSeed;',
    'void main() {',
    '  vec2 clip = aState.xy / uStage * 2.0 - 1.0;',
    '  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);',
    '  gl_PointSize = (1.3 + aSeed.x * 2.3) * uRatio;',
    '  vSpeed = aState.z;',
    '  vSeed = aSeed;',
    '}'
  ].join('\n');

  var POINT_FRAGMENT = [
    'precision mediump float;',
    'uniform float uGain;',
    'varying float vSpeed;',
    'varying vec2 vSeed;',
    'void main() {',
    '  float d = length(gl_PointCoord - 0.5);',
    '  float a = smoothstep(0.5, 0.08, d);',
    '  vec3 rest = mix(vec3(0.95, 0.91, 0.84), vec3(1.0, 0.66, 0.24), vSeed.y * 0.75);',
    '  vec3 flight = vec3(0.26, 0.40, 1.0);',
    '  vec3 color = mix(rest, flight, smoothstep(40.0, 420.0, vSpeed));',
    '  gl_FragColor = vec4(color * a * uGain, 1.0);',
    '}'
  ].join('\n');

  var FADE_VERTEX = [
    'attribute vec2 aPosition;',
    'void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }'
  ].join('\n');

  var FADE_FRAGMENT = [
    'precision mediump float;',
    'uniform float uFade;',
    'void main() { gl_FragColor = vec4(vec3(1.5 / 255.0), uFade); }'
  ].join('\n');

  Gallery.register('murmuration', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pointer = env.pointer;
    var context = Gallery.gl.context(canvas, { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true });
    if (!context) {
      env.fail('This work is drawn by your graphics card, and this browser has WebGL switched off. The other rooms still run.');
      return null;
    }
    var gl = context.gl;

    var count = size.w >= 900 ? 40000 : 18000;
    var pos = new Float32Array(count * 2);
    var vel = new Float32Array(count * 2);
    var tgt = new Float32Array(count * 2);
    var seed = new Float32Array(count * 2);
    var delay = new Float32Array(count);
    var state = new Float32Array(count * 3);
    var textCount = Math.round(count * (1 - DUST_SHARE));

    var glState = null;          // programs, buffers, uniform locations
    var lost = false;
    var flow = { cols: 0, rows: 0, x: null, y: null };
    var sampler = document.createElement('canvas');
    var samplerContext = sampler.getContext('2d', { willReadFrequently: true });

    var currentText = '';
    var typedText = '';
    var phraseIndex = -1;
    var phraseClock = PHRASE_SECONDS;  // so the first phrase arrives at once
    var sinceChange = 10;
    var needsClear = true;
    var typingTimer = 0;

    var hasTargets = false;
    var placed = false;
    var lastW = 0;
    var lastH = 0;
    var GAIN = 0.42;
    var LINE_HEIGHT = 1.0;

    /* ---- graphics setup ---- */

    function build() {
      var points = Gallery.gl.program(gl, POINT_VERTEX, POINT_FRAGMENT);
      var fade = Gallery.gl.program(gl, FADE_VERTEX, FADE_FRAGMENT);
      glState = {
        points: points,
        fade: fade,
        pointUniforms: Gallery.gl.uniforms(gl, points, ['uStage', 'uRatio', 'uGain']),
        fadeUniforms: Gallery.gl.uniforms(gl, fade, ['uFade']),
        aState: gl.getAttribLocation(points, 'aState'),
        aSeed: gl.getAttribLocation(points, 'aSeed'),
        aPosition: gl.getAttribLocation(fade, 'aPosition'),
        stateBuffer: gl.createBuffer(),
        seedBuffer: gl.createBuffer(),
        triangle: Gallery.gl.fullscreenTriangle(gl)
      };
      gl.bindBuffer(gl.ARRAY_BUFFER, glState.stateBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, state.byteLength, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, glState.seedBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      needsClear = true;
    }

    function seedPoints() {
      for (var i = 0; i < count; i++) {
        var r = Math.random();
        var dust = i >= textCount;
        seed[i * 2] = dust ? r * r * 0.6 : r * r;
        seed[i * 2 + 1] = Math.random();
        delay[i] = Math.random() * 0.9;
      }
    }

    function scatter() {
      for (var i = 0; i < count; i++) {
        pos[i * 2] = Math.random() * size.w;
        pos[i * 2 + 1] = Math.random() * size.h;
        vel[i * 2] = 0;
        vel[i * 2 + 1] = 0;
      }
      placed = true;
    }

    /* ---- turning words into places to be ---- */

    function fontAt(px) {
      return '560 ' + px + 'px Fraunces, "Iowan Old Style", "Palatino Linotype", Georgia, serif';
    }

    // The part of the stage the words may occupy: clear of the masthead, and
    // on wide screens clear of the wall label at the lower left.
    function region() {
      var w = size.w, h = size.h;
      if (w < 900) return { x: w * 0.06, y: h * 0.12, w: w * 0.88, h: h * 0.76 };
      var label = env.room.querySelector('.label');
      var stageTop = canvas.getBoundingClientRect().top;
      var labelTop = label ? label.getBoundingClientRect().top - stageTop : h * 0.6;
      var top = h * 0.13;
      var bottom = Math.max(top + 160, Math.min(h * 0.74, labelTop - 32));
      return { x: w * 0.07, y: top, w: w * 0.86, h: bottom - top };
    }

    // Every way of breaking the words over one, two or three lines.
    function arrangements(words) {
      var out = [[words.join(' ')]];
      for (var i = 1; i < words.length; i++) {
        out.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
        for (var j = i + 1; j < words.length; j++) {
          out.push([words.slice(0, i).join(' '), words.slice(i, j).join(' '), words.slice(j).join(' ')]);
        }
      }
      return out;
    }

    // Pick the arrangement that lets the type be largest inside the box.
    function fit(words, box) {
      var best = null;
      samplerContext.font = fontAt(100);
      arrangements(words).forEach(function (lines) {
        var widest = 1;
        lines.forEach(function (line) {
          widest = Math.max(widest, samplerContext.measureText(line).width);
        });
        // Capped so that short words stay dense with points instead of growing thin.
        var px = Math.min(box.w * 0.97 / widest * 100, box.h / (lines.length * LINE_HEIGHT), size.h * 0.34);
        if (!best || px > best.px) best = { lines: lines, px: px };
      });
      return best;
    }

    function sampleTargets(text) {
      var words = text.split(/\s+/).filter(Boolean);
      if (!words.length) return false;
      var box = region();
      var layout = fit(words, box);
      var s = Math.min(1, 900 / box.w);
      var W = Math.max(2, Math.ceil(box.w * s));
      var H = Math.max(2, Math.ceil(box.h * s));
      sampler.width = W;
      sampler.height = H;
      samplerContext.clearRect(0, 0, W, H);
      samplerContext.fillStyle = '#fff';
      samplerContext.textAlign = 'center';
      samplerContext.textBaseline = 'alphabetic';
      samplerContext.font = fontAt(layout.px * s);
      var lineHeight = layout.px * LINE_HEIGHT * s;
      var first = (H - lineHeight * layout.lines.length) / 2 + lineHeight * 0.76;
      layout.lines.forEach(function (line, i) {
        samplerContext.fillText(line, W / 2, first + i * lineHeight);
      });

      var data = samplerContext.getImageData(0, 0, W, H).data;
      var inside = [];
      for (var p = 0, n = W * H; p < n; p++) {
        if (data[p * 4 + 3] > 128) inside.push(p);
      }
      if (!inside.length) return false;
      for (var i = 0; i < textCount; i++) {
        var pick = inside[(Math.random() * inside.length) | 0];
        tgt[i * 2] = box.x + ((pick % W) + Math.random()) / s;
        tgt[i * 2 + 1] = box.y + (((pick / W) | 0) + Math.random()) / s;
      }
      return true;
    }

    function setText(text, kick) {
      currentText = text;
      hasTargets = sampleTargets(text);
      if (!kick) return;
      sinceChange = 0;
      for (var i = 0; i < textCount; i++) {
        var a = Math.random() * 6.2832;
        var v = 90 + Math.random() * 380;
        vel[i * 2] += Math.cos(a) * v;
        vel[i * 2 + 1] += Math.sin(a) * v;
      }
    }

    /* ---- the physics ---- */

    // A slow current that stirs everything, kept on a coarse grid so forty
    // thousand points can read it without forty thousand sines.
    function updateFlow(time) {
      var cols = Math.ceil(size.w / CELL) + 2;
      var rows = Math.ceil(size.h / CELL) + 2;
      if (cols !== flow.cols || rows !== flow.rows) {
        flow.cols = cols;
        flow.rows = rows;
        flow.x = new Float32Array(cols * rows);
        flow.y = new Float32Array(cols * rows);
      }
      // Four overlapping waves, each pushing along its own crests. A current
      // built this way has no sinks, so the dust never bunches up anywhere.
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = c * CELL, y = r * CELL;
          var vx = 0, vy = 0;
          for (var k = 0; k < WAVES.length; k++) {
            var wave = WAVES[k];
            var push = Math.cos(wave[0] * x + wave[1] * y + wave[2] * time) * 0.62;
            vx += push * wave[3];
            vy += push * wave[4];
          }
          flow.x[r * cols + c] = vx;
          flow.y[r * cols + c] = vy;
        }
      }
    }

    // Read the current between grid points, blending the four nearest.
    var flowAt = { x: 0, y: 0 };
    function readFlow(x, y) {
      var cols = flow.cols;
      var gx = x / CELL, gy = y / CELL;
      if (gx < 0) gx = 0; else if (gx > cols - 1.001) gx = cols - 1.001;
      if (gy < 0) gy = 0; else if (gy > flow.rows - 1.001) gy = flow.rows - 1.001;
      var c = gx | 0, r = gy | 0;
      var u = gx - c, v = gy - r;
      var i = r * cols + c;
      var a = (1 - u) * (1 - v), b = u * (1 - v), d = (1 - u) * v, e = u * v;
      flowAt.x = flow.x[i] * a + flow.x[i + 1] * b + flow.x[i + cols] * d + flow.x[i + cols + 1] * e;
      flowAt.y = flow.y[i] * a + flow.y[i + 1] * b + flow.y[i + cols] * d + flow.y[i + cols + 1] * e;
    }

    function simulate(dt) {
      sinceChange += dt;
      var w = size.w, h = size.h;
      var pushing = pointer.inside;
      var px = pointer.x, py = pointer.y;
      var R = w >= 900 ? 125 : 80;
      var R2 = R * R;
      var damp = Math.exp(-5.2 * dt);
      var excite = Math.exp(-sinceChange * 1.3);   // 1 just after the words change, then 0
      var drift = 24 + 260 * excite;

      for (var i = 0; i < count; i++) {
        var ix = i * 2;
        var x = pos[ix], y = pos[ix + 1];
        var vx = vel[ix], vy = vel[ix + 1];

        readFlow(x, y);
        var ax = flowAt.x * drift;
        var ay = flowAt.y * drift;

        if (i < textCount && hasTargets) {
          // Each point waits its own moment before heading home, so the
          // flock arrives as a ribbon and not as a single snap.
          var held = sinceChange - delay[i];
          if (held > 0) {
            var k = 34 * (held * 1.6 < 1 ? held * 1.6 : 1);
            ax += (tgt[ix] - x) * k;
            ay += (tgt[ix + 1] - y) * k;
          }
        } else {
          ax *= 2.4;
          ay *= 2.4;
          if (x < -20) x = w + 20; else if (x > w + 20) x = -20;
          if (y < -20) y = h + 20; else if (y > h + 20) y = -20;
        }

        if (pushing) {
          var dx = x - px, dy = y - py;
          var d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            var d = Math.sqrt(d2) + 0.001;
            var push = 1 - d / R;
            push = push * push * 5600;
            ax += dx / d * push;
            ay += dy / d * push;
          }
        }

        vx = (vx + ax * dt) * damp;
        vy = (vy + ay * dt) * damp;
        x += vx * dt;
        y += vy * dt;
        pos[ix] = x; pos[ix + 1] = y;
        vel[ix] = vx; vel[ix + 1] = vy;
        state[i * 3] = x;
        state[i * 3 + 1] = y;
        state[i * 3 + 2] = Math.sqrt(vx * vx + vy * vy);
      }
    }

    /* ---- drawing ---- */

    function draw(dt, wipe) {
      var g = glState;
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Keep most of the previous frame so moving points leave short trails.
      // Reverse-subtract also takes a sliver off every pixel, so a trail
      // fades to true black instead of stalling one step above it.
      var fade = wipe ? 1 : 1 - Math.pow(1 - FADE, dt * 60);
      if (needsClear || wipe) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        needsClear = false;
      } else {
        gl.useProgram(g.fade);
        gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1f(g.fadeUniforms.uFade, fade);
        gl.disableVertexAttribArray(g.aSeed);
        gl.bindBuffer(gl.ARRAY_BUFFER, g.triangle);
        gl.enableVertexAttribArray(g.aPosition);
        gl.vertexAttribPointer(g.aPosition, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      gl.useProgram(g.points);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform2f(g.pointUniforms.uStage, size.w, size.h);
      gl.uniform1f(g.pointUniforms.uRatio, canvas.width / size.w);
      // Brightness is set so a resting point looks the same at any frame rate.
      gl.uniform1f(g.pointUniforms.uGain, GAIN * fade / FADE);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.stateBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, state);
      gl.enableVertexAttribArray(g.aState);
      gl.vertexAttribPointer(g.aState, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.seedBuffer);
      gl.enableVertexAttribArray(g.aSeed);
      gl.vertexAttribPointer(g.aSeed, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, count);
    }

    /* ---- wiring ---- */

    function resize() {
      var ratio = Math.min(size.dpr, 2);
      canvas.width = Math.max(1, Math.round(size.w * ratio));
      canvas.height = Math.max(1, Math.round(size.h * ratio));
      if (!placed) {
        scatter();
      } else if (lastW && lastH) {
        var sx = size.w / lastW, sy = size.h / lastH;
        for (var i = 0; i < count; i++) { pos[i * 2] *= sx; pos[i * 2 + 1] *= sy; }
      }
      lastW = size.w;
      lastH = size.h;
      if (currentText) hasTargets = sampleTargets(currentText);
      needsClear = true;
    }

    function nextPhrase() {
      phraseIndex = (phraseIndex + 1) % PHRASES.length;
      setText(PHRASES[phraseIndex], true);
    }

    var input = env.room.querySelector('.say__input');
    var form = env.room.querySelector('[data-say-form]');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });
    if (input) {
      input.addEventListener('input', function () {
        typedText = input.value.replace(/\s+/g, ' ').trim();
        clearTimeout(typingTimer);
        typingTimer = setTimeout(function () {
          if (typedText) setText(typedText, true);
          else phraseClock = PHRASE_SECONDS;
          env.redraw();
        }, 160);
      });
    }

    // The words are first sampled in whatever serif is to hand; sample them
    // again, quietly, once the real typeface has arrived.
    if (document.fonts && document.fonts.load) {
      document.fonts.load(fontAt(100)).then(function () {
        if (currentText) hasTargets = sampleTargets(currentText);
        env.redraw();
      }).catch(function () {});
    }

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () { build(); lost = false; env.redraw(); });

    seedPoints();
    build();
    env.live('count', Gallery.formatCount(count));

    return {
      resize: resize,
      frame: function (time, dt) {
        if (lost) return;
        if (!typedText) {
          phraseClock += dt;
          if (phraseClock >= PHRASE_SECONDS) { phraseClock = 0; nextPhrase(); }
        }
        updateFlow(time);
        simulate(dt);
        draw(dt, false);
      },
      // With motion paused the flock is simply shown at rest, in place.
      still: function () {
        if (lost) return;
        if (!currentText) setText(typedText || PHRASES[0], false);
        for (var i = 0; i < count; i++) {
          var atHome = i < textCount && hasTargets;
          var x = atHome ? tgt[i * 2] : pos[i * 2];
          var y = atHome ? tgt[i * 2 + 1] : pos[i * 2 + 1];
          pos[i * 2] = x; pos[i * 2 + 1] = y;
          vel[i * 2] = 0; vel[i * 2 + 1] = 0;
          state[i * 3] = x; state[i * 3 + 1] = y; state[i * 3 + 2] = 0;
        }
        draw(0, true);
      }
    };
  });
})();
