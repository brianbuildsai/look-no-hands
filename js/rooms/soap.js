/* Soap — room 30.

   A soap film in a wire ring. The film is a sheet of water a few hundred
   millionths of a millimetre thick, and its colours are not pigment: light
   reflecting from the back of the film has travelled a little further than
   light reflecting from the front, and for each wavelength that extra
   distance either helps or cancels. Here every pixel's colour is worked out
   that way, wavelength by wavelength across the visible spectrum, from the
   thickness of the film at that point (the CIE colour-matching functions,
   as Gaussian fits, turn the spectrum into a colour).

   The film drains: thicker liquid sinks and thinner liquid rises, it swirls,
   and it thins from the top until the top goes black, which is what a soap
   film does just before it pops. Then it pops. Blow on it to push the liquid
   about. */
(function () {
  'use strict';

  var VERTEX = [
    '#version 300 es',
    'layout(location = 0) in vec2 aPosition;',
    'out vec2 vUv;',
    'void main() { vUv = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }'
  ].join('\n');

  var NOISE = [
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);',
    '}'
  ].join('\n');

  // one step of the film: thick sinks, thin rises, it swirls, it thins, and it can be blown about
  var STEP = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv;',
    'out vec4 outFilm;',
    'uniform sampler2D uFilm;',
    'uniform float uMean;',            // the thickness the film is settling toward, in nanometres
    'uniform float uDrain;',
    'uniform float uSwirl;',
    'uniform float uThin;',
    'uniform float uTime;',
    'uniform float uDt;',
    'uniform vec4 uBlow;',             // where the visitor is blowing (film coordinates) and how hard
    'uniform vec3 uHole;',             // a hole: where, and its radius
    'uniform float uFresh;',           // 1 to start a new film
    NOISE,
    'void main() {',
    '  vec2 p = (vUv - 0.5) * 2.0;',
    '  float rim = length(p);',
    '  if (rim > 0.985) { outFilm = vec4(0.0); return; }',
    // a new film is already thinner at the top than the bottom, and a little uneven
    '  if (uFresh > 0.5) { outFilm = vec4(uMean * (0.3 + 1.3 * (1.0 - vUv.y)) * (0.8 + 0.25 * noise(vUv * 5.0 + uTime) + 0.15 * noise(vUv * 17.0 - uTime)), 0.0, 0.0, 1.0); return; }',
    '  float h = texture(uFilm, vUv).r;',
    // the liquid drains under gravity, and the thicker it is the faster it flows (as through any narrow gap)
    '  vec2 vel = vec2(0.0, -(h * h) / 400.0 * uDrain);',
    // and it swirls: eddies large and small, slowly changing (the fine ones strongest near the wire, as in a real film)
    '  float e = 0.02;',
    '  vec2 q = vUv * 2.5 + uTime * 0.05;',
    '  float nx = noise(q + vec2(e, 0.0)) - noise(q - vec2(e, 0.0)), ny = noise(q + vec2(0.0, e)) - noise(q - vec2(0.0, e));',
    '  vec2 q2 = vUv * 9.0 - uTime * 0.11;',
    '  float nx2 = noise(q2 + vec2(e, 0.0)) - noise(q2 - vec2(e, 0.0)), ny2 = noise(q2 + vec2(0.0, e)) - noise(q2 - vec2(0.0, e));',
    '  vel += vec2(ny, -nx) * uSwirl + vec2(ny2, -nx2) * uSwirl * (0.25 + 0.6 * smoothstep(0.5, 0.98, rim));',
    // breath
    '  vec2 away = vUv - uBlow.xy;',
    '  float d = length(away);',
    '  if (d > 1.0e-4) vel += away / d * exp(-d * d * 140.0) * uBlow.z;',
    '  vec2 from = vUv - vel * uDt;',
    '  h = texture(uFilm, from).r;',
    '  if (length((from - 0.5) * 2.0) > 0.985) h = uMean * (0.25 + 1.3 * (1.0 - vUv.y)) * (0.8 + 0.4 * noise(vUv * 14.0 + uTime * 0.3));',      // off the wire comes thin liquid at the top and thick at the bottom, unevenly
    '  h -= uThin * uDt;',
    // near the wire the film is fed and stays thicker
    '  h = mix(h, uMean * (0.25 + 1.3 * (1.0 - vUv.y)), smoothstep(0.9, 0.985, rim) * 0.12);',
    '  if (uHole.z > 0.0 && distance(p, uHole.xy) < uHole.z) h = 0.0;',
    '  outFilm = vec4(max(h, 0.0), 0.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  // the colour of a film of a given thickness, wavelength by wavelength
  var SHOW = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv;',
    'out vec4 outColor;',
    'uniform sampler2D uFilm;',
    'uniform vec2 uCentre;',           // the ring, in pixels
    'uniform float uRadius;',
    'uniform vec2 uSize;',
    // the CIE 1931 colour-matching functions as sums of Gaussians (Wyman, Sloan and Shirley, 2013)
    'float lobe(float x, float mu, float s1, float s2) { float t = (x - mu) / (x < mu ? s1 : s2); return exp(-0.5 * t * t); }',
    'vec3 match(float l) {',
    '  float x = 1.056 * lobe(l, 599.8, 37.9, 31.0) + 0.362 * lobe(l, 442.0, 16.0, 26.7) - 0.065 * lobe(l, 501.1, 20.4, 26.2);',
    '  float y = 0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1);',
    '  float z = 1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8);',
    '  return vec3(x, y, z);',
    '}',
    'void main() {',
    '  vec2 film = (gl_FragCoord.xy - uCentre) / uRadius;',
    '  float rim = length(film);',
    '  vec3 colour = vec3(0.0);',
    '  if (rim < 1.0) {',
    '    float h = texture(uFilm, film * 0.5 + 0.5).r;',
    '    if (h > 0.0) {',
    '      vec3 xyz = vec3(0.0), white = vec3(0.0);',
    '      for (int k = 0; k < 24; k++) {',
    '        float l = 400.0 + 12.5 * float(k);',
    // light from the back of the film has gone there and back through it: 2 n h further, and the front reflection is turned over
    '        float r = 0.5 - 0.5 * cos(4.0 * 3.14159265 * 1.33 * h / l);',
    '        vec3 m = match(l);',
    '        xyz += m * r; white += m;',
    '      }',
    '      xyz /= white.y;',
    '      colour = mat3(3.2406, -0.9689, 0.0557, -1.5372, 1.8758, -0.2040, -0.4986, 0.0415, 1.0570) * xyz;',
    '      colour = max(colour, 0.0) * 0.72;',
    // the room's light on the film: brighter toward the top left, where the lamp is
    '      colour *= 0.55 + 0.55 * smoothstep(1.2, -0.9, film.x - film.y);',
    '      colour = pow(colour, vec3(0.4545));',
    '    }',
    '  }',
    // the wire
    '  float wire = abs(rim - 1.0) * uRadius;',
    '  colour = mix(colour, vec3(0.91, 0.90, 0.87) * 0.7, 1.0 - smoothstep(0.6, 1.8, wire));',
    '  outColor = vec4(colour, 1.0);',
    '}'
  ].join('\n');

  Gallery.register('soap', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var context = Gallery.gl.context(canvas, { alpha: false, antialias: false, depth: false, stencil: false }, true);
    if (!context || !Gallery.gl.canRenderFloat(context.gl)) {
      env.fail('This work keeps the film in a floating-point texture, which this browser or graphics card does not offer. The other rooms still run.');
      return null;
    }
    var gl = context.gl;

    var N = size.w >= 900 ? 512 : 288;
    var film = null, step, show, at = {}, triangle, lost = false;
    var ring = { x: 0, y: 0, r: 100 };
    var mean = 700, age = 0, films = 0, drain = 1, fresh = true, clock = 0;
    var blow = { x: 0.5, y: 0.5, strength: 0 }, hole = null, popped = 0;
    var seed = 30;
    function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

    function build() {
      step = Gallery.gl.program(gl, VERTEX, STEP);
      show = Gallery.gl.program(gl, VERTEX, SHOW);
      at.step = Gallery.gl.uniforms(gl, step, ['uFilm', 'uMean', 'uDrain', 'uSwirl', 'uThin', 'uTime', 'uDt', 'uBlow', 'uHole', 'uFresh']);
      at.show = Gallery.gl.uniforms(gl, show, ['uFilm', 'uCentre', 'uRadius', 'uSize']);
      triangle = Gallery.gl.fullscreenTriangle(gl);
    }

    function newFilm() {
      mean = 620 + random() * 160; age = 0; fresh = true; hole = null; popped = 0;
      films++;
      env.live('films', films);
    }

    function advance(dt) {
      if (lost || !film) return;
      clock += dt; age += dt;
      // the film thins with time, faster as it goes: the average thickness sinks toward nothing
      mean = Math.max(8, mean - dt * (2 + 4 * drain) * (1 + age * 0.03));
      // when the top has gone black the film is about to go: a hole opens near the top and races outward
      if (!hole && (mean < 55 || popped)) hole = { x: (random() - 0.5) * 0.6, y: 0.55 + random() * 0.3, r: 0.001 };
      if (hole) { hole.r += dt * 3.5; if (hole.r > 2.4) { newFilm(); } }
      gl.viewport(0, 0, N, N);
      gl.useProgram(step);
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, film.read.texture);
      gl.uniform1i(at.step.uFilm, 0);
      gl.uniform1f(at.step.uMean, mean);
      gl.uniform1f(at.step.uDrain, 0.05 * drain);
      gl.uniform1f(at.step.uSwirl, 1.4);
      gl.uniform1f(at.step.uThin, 0.45 * drain);
      gl.uniform1f(at.step.uTime, clock);
      gl.uniform1f(at.step.uDt, Math.min(dt, 0.05));
      gl.uniform4f(at.step.uBlow, blow.x, blow.y, blow.strength, 0);
      gl.uniform3f(at.step.uHole, hole ? hole.x : 0, hole ? hole.y : 0, hole ? hole.r : 0);
      gl.uniform1f(at.step.uFresh, fresh ? 1 : 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, film.write.framebuffer);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      film.swap();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      fresh = false;
      blow.strength *= Math.exp(-dt * 6);
      env.live('mean', Math.round(mean));
      env.live('age', Math.round(age));
    }

    function render() {
      if (lost || !film) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(show);
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, film.read.texture);
      gl.uniform1i(at.show.uFilm, 0);
      var ratio = canvas.width / size.w;
      gl.uniform2f(at.show.uCentre, ring.x * ratio, (size.h - ring.y) * ratio);
      gl.uniform1f(at.show.uRadius, ring.r * ratio);
      gl.uniform2f(at.show.uSize, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /* ---- wiring ---- */

    function place(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: ((e.clientX - rect.left - ring.x) / ring.r) * 0.5 + 0.5, y: (-(e.clientY - rect.top - ring.y) / ring.r) * 0.5 + 0.5 };
    }
    canvas.addEventListener('pointermove', function (e) {
      var p = place(e);
      blow.x = p.x; blow.y = p.y;
      // a passing hand stirs it a little; a pressed one blows hard
      if (e.buttons & 1) blow.strength = 1.6; else blow.strength = Math.max(blow.strength, 0.25);
    });
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var p = place(e);
      blow.x = p.x; blow.y = p.y; blow.strength = 1.6;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () { lost = false; film = null; build(); });
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'pan-y';

    var drainDial = env.room.querySelector('[data-soap-drain]');
    var drainReadout = env.room.querySelector('[data-soap-drain-value]');
    function readDrain() {
      drain = Number(drainDial.value) / 10;
      if (drainReadout) drainReadout.textContent = drain < 0.6 ? 'slowly: it lasts minutes' : drain < 1.6 ? 'as a film does' : 'quickly';
    }
    if (drainDial) { drainDial.addEventListener('input', readDrain); readDrain(); }
    var popButton = env.room.querySelector('[data-soap-pop]');
    if (popButton) popButton.addEventListener('click', function () { popped = 1; });
    var newButton = env.room.querySelector('[data-soap-new]');
    if (newButton) newButton.addEventListener('click', function () { newFilm(); env.redraw(); });

    try { build(); } catch (err) {
      env.fail('This work could not start its shaders on this graphics card. The other rooms still run.');
      return null;
    }

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wide = size.w >= 900;
        ring.x = size.w * (wide ? 0.645 : 0.5); ring.y = size.h * (wide ? 0.515 : 0.5);
        ring.r = wide ? Math.min(size.w * 0.3, size.h * 0.42) : Math.min(size.w * 0.45, size.h * 0.42);
        if (!film) {
          film = Gallery.gl.floatPair(gl, N, N, 1, true);
          if (!film) { env.fail('This graphics card would not make a floating-point texture to keep the film in. The other rooms still run.'); return; }
          newFilm();
        }
      },
      frame: function (time, dt) { advance(dt); render(); },
      // With motion paused: a film a little way into its life, held
      still: function () { if (age < 8) for (var i = 0; i < 480; i++) advance(1 / 60); render(); },
      film: function () { return { mean: mean, age: age, films: films, hole: hole }; }
    };
  });
})();
