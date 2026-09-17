/* Where Light Turns Back — room 7.

   A black hole, drawn the only honest way: by following light. For every
   pixel a ray leaves the eye and is walked forward in short steps. At each
   step it is pulled toward the hole by exactly the amount that makes its
   path a true light path around a non-rotating black hole (in units where
   the hole's radius is 1, the pull is 1.5 h^2 / r^5 toward the centre, h
   being the ray's angular momentum, which never changes).

   A ray ends one of three ways. It falls inside radius 1 and is black. It
   crosses the thin glowing disc, perhaps more than once, and picks up its
   light. Or it escapes, and shows whatever star lies in the direction it
   is finally heading, which is not the direction it set out in. */
(function () {
  'use strict';

  var FOCAL = 1.55;
  var MAX_RENDER_DPR = 1.25;

  var VERTEX = [
    'attribute vec2 aPosition;',
    'void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }'
  ].join('\n');

  var FRAGMENT = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uFocus;',
    'uniform float uUnit;',
    'uniform float uTime;',
    'uniform vec3 uEye;',
    'uniform vec3 uRight;',
    'uniform vec3 uUp;',
    'uniform vec3 uForward;',
    'uniform float uDisc;',
    'const float FOCAL = 1.55;',
    'const float R_IN = 3.0;',      // nothing can orbit closer than three radii
    'const float R_OUT = 11.5;',
    'const float TAU = 6.2831853;',
    '',
    'float hash21(vec2 p) {',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',
    'float hash31(vec3 p) {',
    '  p = fract(p * vec3(0.1031, 0.1030, 0.0973));',
    '  p += dot(p, p.yxz + 33.33);',
    '  return fract((p.x + p.y) * p.z);',
    '}',
    '// value noise that repeats every `period` cells across, so it can wrap round the disc',
    'float ringNoise(vec2 p, float period) {',
    '  vec2 i = floor(p), f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float x0 = mod(i.x, period), x1 = mod(i.x + 1.0, period);',
    '  return mix(mix(hash21(vec2(x0, i.y)), hash21(vec2(x1, i.y)), f.x),',
    '             mix(hash21(vec2(x0, i.y + 1.0)), hash21(vec2(x1, i.y + 1.0)), f.x), f.y);',
    '}',
    'float streaks(float r, float angle) {',
    '  vec2 p = vec2(angle / TAU * 14.0, log(r) * 7.0);',
    '  float n = 0.55 * ringNoise(p, 14.0) + 0.3 * ringNoise(p * 2.0, 28.0) + 0.15 * ringNoise(p * 4.0, 56.0);',
    '  return n;',
    '}',
    '',
    '// The disc where a ray crosses it: colour and how much of the ray it stops.',
    'vec4 disc(vec3 hit, vec3 travel) {',
    '  float r = length(hit.xz);',
    '  float body = smoothstep(R_IN, R_IN + 0.5, r) * (1.0 - smoothstep(R_OUT - 4.0, R_OUT, r));',
    '  if (body <= 0.0) return vec4(0.0);',
    '  float angle = atan(hit.z, hit.x);',
    '  // inner gas orbits faster than outer, so the pattern is sheared; two copies',
    '  // out of step are cross-faded so the shear never winds up for ever',
    '  float spin = 5.0 / (r * sqrt(r));',
    '  float a = fract(uTime / 9.0), b = fract(uTime / 9.0 + 0.5);',
    '  float gas = mix(streaks(r, angle - spin * a * 9.0), streaks(r, angle - spin * b * 9.0), abs(1.0 - 2.0 * a));',
    '  // the gas moves at up to half the speed of light: brighter and bluer coming toward you',
    '  float beta = sqrt(0.5 / (r - 1.0));',
    '  vec3 orbit = normalize(vec3(-hit.z, 0.0, hit.x));',
    '  float toward = dot(orbit, -normalize(travel));',
    '  float doppler = sqrt(1.0 - beta * beta) / (1.0 - beta * toward);',
    '  float climb = sqrt(1.0 - 1.0 / r);              // light loses energy climbing out',
    '  float heat = pow(R_IN / r, 0.75) * doppler * climb * 1.08;',
    '  vec3 color = mix(vec3(0.75, 0.08, 0.16), vec3(1.0, 0.52, 0.14), smoothstep(0.22, 0.58, heat));',
    '  color = mix(color, vec3(1.0, 0.93, 0.84), smoothstep(0.66, 1.05, heat));',
    '  color = mix(color, vec3(0.72, 0.84, 1.0), smoothstep(1.1, 1.6, heat));',
    '  float glow = pow(R_IN / r, 2.0) * pow(doppler, 3.0) * climb * (0.35 + 1.1 * gas * gas);',
    '  return vec4(color * glow * 3.2, body * (0.35 + 0.6 * gas));',
    '}',
    '',
    'vec3 sky(vec3 d) {',
    '  vec3 color = vec3(0.0);',
    '  for (int k = 0; k < 2; k++) {',
    '    float cells = k == 0 ? 48.0 : 110.0;',
    '    vec3 q = d * cells;',
    '    vec3 c = floor(q);',
    '    float h = hash31(c);',
    '    if (h > 0.9) {',
    '      vec3 where = c + 0.5 + (vec3(hash31(c + 1.7), hash31(c + 5.3), hash31(c + 9.1)) - 0.5) * 0.7;',
    '      float near = length(q - where);',
    '      float bright = (h - 0.9) * 10.0;',
    '      vec3 tint = mix(vec3(1.0, 0.72, 0.42), vec3(0.7, 0.82, 1.0), hash31(c + 3.1));',
    '      color += tint * bright * bright * smoothstep(0.22, 0.0, near) * (k == 0 ? 1.6 : 0.8);',
    '    }',
    '  }',
    '  // a band of unresolved stars, like the Milky Way, tilted across the sky',
    '  float band = dot(d, normalize(vec3(0.35, 0.8, 0.48)));',
    '  float lane = exp(-band * band * 14.0);',
    '  vec2 along = vec2(atan(d.z, d.x) * 3.0, d.y * 4.0);',
    '  float cloud = ringNoise(along * 2.0, 38.0) * 0.6 + ringNoise(along * 5.0, 95.0) * 0.4;',
    '  color += lane * cloud * cloud * vec3(0.20, 0.23, 0.36) * 0.55;',
    '  return color;',
    '}',
    '',
    'void main() {',
    '  vec2 uv = (gl_FragCoord.xy - uFocus) / uUnit;',
    '  vec3 p = uEye;',
    '  vec3 v = normalize(uRight * uv.x + uUp * uv.y + uForward * FOCAL);',
    '  vec3 spinAxis = cross(p, v);',
    '  float h2 = dot(spinAxis, spinAxis);',
    '',
    '  vec3 color = vec3(0.0);',
    '  float clear = 1.0;          // how much of the ray is still unblocked',
    '  bool swallowed = false;',
    '  for (int i = 0; i < 150; i++) {',
    '    float r = length(p);',
    '    if (r < 1.0) { swallowed = true; break; }',
    '    if (r > 48.0 && dot(p, v) > 0.0) break;',
    '    float dt = clamp(0.045 * r * sqrt(r), 0.03, 1.7);',
    '    vec3 before = p;',
    '    v += -1.5 * h2 * p / (r * r * r * r * r) * dt;',
    '    p += v * dt;',
    '    if (uDisc > 0.5 && before.y * p.y < 0.0) {',
    '      vec3 hit = mix(before, p, before.y / (before.y - p.y));',
    '      vec4 d = disc(hit, v);',
    '      color += clear * d.rgb * d.a;',
    '      clear *= 1.0 - d.a;',
    '      if (clear < 0.02) break;',
    '    }',
    '  }',
    '  if (!swallowed) color += clear * sky(normalize(v));',
    '',
    '  color = 1.0 - exp(-color * 1.15);',
    '  color = pow(color, vec3(0.4545));',
    '  color += (hash21(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;',
    '  gl_FragColor = vec4(max(color, 0.0), 1.0);',
    '}'
  ].join('\n');

  Gallery.register('horizon', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var context = Gallery.gl.context(canvas, { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!context) {
      env.fail('This work is drawn by your graphics card, and this browser has WebGL switched off. The other rooms still run.');
      return null;
    }
    var gl = context.gl;
    var program, uniforms, lost = false;

    var view = { around: 0.6, above: 0.16, distance: 26 };
    var drift = { around: 0, above: 0 };
    var drag = null;
    var lastTouch = -1e9;
    var showDisc = true;
    var focus = { x: 0, y: 0, unit: 100 };
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    function build() {
      program = Gallery.gl.program(gl, VERTEX, FRAGMENT);
      uniforms = Gallery.gl.uniforms(gl, program, ['uFocus', 'uUnit', 'uTime', 'uEye', 'uRight', 'uUp', 'uForward', 'uDisc']);
      Gallery.gl.fullscreenTriangle(gl);
      gl.useProgram(program);
      var location = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    }

    function resize() {
      var ratio = Math.min(size.dpr, MAX_RENDER_DPR) * size.scale;
      canvas.width = Math.max(1, Math.round(size.w * ratio));
      canvas.height = Math.max(1, Math.round(size.h * ratio));
      // the hole sits right of the wall label on wide screens, centred otherwise
      var wide = size.w >= 900;
      focus.x = size.w * (wide ? 0.62 : 0.5);
      focus.y = size.h * (wide ? 0.48 : 0.5);
      focus.unit = Math.min(size.w * (wide ? 0.5 : 0.9), size.h * 0.95);
      env.live('rays', Gallery.formatCount(canvas.width * canvas.height));
    }

    function draw(time) {
      if (lost) return;
      var ca = Math.cos(view.above), sa = Math.sin(view.above);
      var eye = [Math.sin(view.around) * ca * view.distance, sa * view.distance, Math.cos(view.around) * ca * view.distance];
      var forward = [-eye[0] / view.distance, -eye[1] / view.distance, -eye[2] / view.distance];
      // right = forward x up(0,1,0), then up = right x forward
      var right = [-forward[2], 0, forward[0]];
      var length = Math.sqrt(right[0] * right[0] + right[2] * right[2]) || 1;
      right[0] /= length; right[2] /= length;
      var up = [right[1] * forward[2] - right[2] * forward[1], right[2] * forward[0] - right[0] * forward[2], right[0] * forward[1] - right[1] * forward[0]];

      var ratio = canvas.width / size.w;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.uniform2f(uniforms.uFocus, focus.x * ratio, (size.h - focus.y) * ratio);
      gl.uniform1f(uniforms.uUnit, focus.unit * ratio);
      gl.uniform1f(uniforms.uTime, time % 900);
      gl.uniform3f(uniforms.uEye, eye[0], eye[1], eye[2]);
      gl.uniform3f(uniforms.uRight, right[0], right[1], right[2]);
      gl.uniform3f(uniforms.uUp, up[0], up[1], up[2]);
      gl.uniform3f(uniforms.uForward, forward[0], forward[1], forward[2]);
      gl.uniform1f(uniforms.uDisc, showDisc ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /* ---- walking round it ---- */

    function tilt(value) { return Gallery.clamp(value, -0.75, 0.75); }

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
      drift.around = drift.above = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      var dt = Math.max(1, e.timeStamp - drag.t) / 1000;
      var turn = -(e.clientX - drag.x) / size.w * 3.2, rise = (e.clientY - drag.y) / size.h * 2.2;
      view.around += turn;
      view.above = tilt(view.above + rise);
      drift.around = drift.around * 0.6 + turn / dt * 0.4;
      drift.above = drift.above * 0.6 + rise / dt * 0.4;
      drag.x = e.clientX; drag.y = e.clientY; drag.t = e.timeStamp;
      lastTouch = performance.now();
      env.redraw();
    });
    function release(e) {
      if (!drag) return;
      if (e && e.timeStamp - drag.t > 90) drift.around = drift.above = 0;
      if (reduced.matches) drift.around = drift.above = 0;
      drag = null;
      canvas.style.cursor = '';
      lastTouch = performance.now();
    }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.style.cursor = 'grab';

    var distanceDial = env.room.querySelector('[data-horizon-distance]');
    var distanceReadout = env.room.querySelector('[data-horizon-distance-value]');
    function readDistance() {
      view.distance = Number(distanceDial.value);
      if (distanceReadout) distanceReadout.textContent = Math.round(view.distance) + ' radii away';
      env.redraw();
    }
    if (distanceDial) { distanceDial.addEventListener('input', readDistance); readDistance(); }

    var discButton = env.room.querySelector('[data-horizon-disc]');
    if (discButton) {
      discButton.addEventListener('click', function () {
        showDisc = !showDisc;
        discButton.setAttribute('aria-pressed', String(showDisc));
        env.redraw();
      });
    }

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () { build(); lost = false; env.redraw(); });
    build();

    return {
      adaptive: true,
      resize: resize,
      frame: function (time, dt) {
        if (!drag) {
          if (Math.abs(drift.around) > 0.002 || Math.abs(drift.above) > 0.002) {
            view.around += drift.around * dt;
            view.above = tilt(view.above + drift.above * dt);
            var friction = Math.exp(-dt * 2.4);
            drift.around *= friction;
            drift.above *= friction;
          } else if (performance.now() - lastTouch > 2500) {
            view.around += dt * 0.035;       // a slow walk round it while nobody is steering
          }
        }
        draw(time);
      },
      still: function (time) { draw(time); }
    };
  });
})();
