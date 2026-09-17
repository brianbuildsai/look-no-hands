/* Four Numbers — room 19.

   Take a point (x, y) and move it to

       ( sin(a y) + c cos(a x) ,  sin(b x) + d cos(b y) )

   and do that again, for ever, marking everywhere it lands. For most choices
   of the four numbers a, b, c, d the point never settles and never repeats,
   and the marks pile up into a figure: a strange attractor (this recipe is
   Clifford Pickover's).

   Here a few hundred thousand points are dropped at random every frame, each
   is put through the recipe a few dozen times in the vertex shader, by which
   time it is on the figure wherever it started, and it is added as a speck of
   light to a floating-point picture that slowly fades. The picture is shown
   through a logarithm, the way an eye or a photographic plate would see it,
   because the bright parts are thousands of times brighter than the faint.

   Each speck is coloured by the direction it was last moving in. */
(function () {
  'use strict';

  // Choices of the four numbers that each draw a full figure, in an order found by search so that
  // the straight path from each to the next (and from the last back to the first) stays a full figure too.
  var PLACES = [
    [-1.4, 1.6, 1.0, 0.7], [-1.21, 1.25, 1.14, 1.3], [-2.07, 1.51, 0.66, 0.77], [-1.69, 1.36, 1.89, -0.56],
    [-1.39, 1.44, 0.91, -1.54], [-1.32, 2.05, 1.39, -1.2], [-1.47, 1.87, -0.51, -1.58], [-1.94, 1.44, 0.97, -0.85],
    [-1.54, 1.46, -1.73, -0.86], [-1.47, 1.26, 1.49, -1.04]
  ];

  var POINTS_VERTEX = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec4 uNumbers;',          // a, b, c, d
    'uniform uint uSeed;',
    'uniform vec4 uView;',             // centre x, centre y, scale x, scale y
    'out vec3 vInk;',
    'uint shuffle(uint v) { v = v * 747796405u + 2891336453u; v = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u; return (v >> 22u) ^ v; }',
    'void main() {',
    '  uint h = shuffle(uint(gl_VertexID) + uSeed);',
    '  uint k = shuffle(h);',
    '  vec2 p = vec2(float(h), float(k)) / 4294967295.0 * 4.0 - 2.0;',
    '  vec2 was = p;',
    '  float a = uNumbers.x, b = uNumbers.y, c = uNumbers.z, d = uNumbers.w;',
    '  for (int i = 0; i < STEPS; i++) {',
    '    was = p;',
    '    p = vec2(sin(a * was.y) + c * cos(a * was.x), sin(b * was.x) + d * cos(b * was.y));',
    '  }',
    // coloured by the way it was going: amber, blue and rose share the compass between them
    '  vec2 going = p - was;',
    '  float angle = atan(going.y, going.x);',
    '  vec3 share = 0.5 + 0.5 * cos(angle - vec3(0.0, 2.094, 4.189));',
    '  share = share * share;',
    '  vInk = (vec3(1.0, 0.70, 0.28) * share.x + vec3(0.24, 0.36, 1.0) * share.y + vec3(1.0, 0.31, 0.48) * share.z) / (share.x + share.y + share.z);',
    '  gl_Position = vec4((p - uView.xy) * uView.zw, 0.0, 1.0);',
    '  gl_PointSize = 1.0;',
    '}'
  ].join('\n');

  var POINTS_FRAGMENT = [
    '#version 300 es',
    'precision highp float;',
    'in vec3 vInk;',
    'out vec4 outColor;',
    'uniform float uSpeck;',
    'void main() { outColor = vec4(vInk * uSpeck, 1.0); }'
  ].join('\n');

  var SCREEN_VERTEX = [
    '#version 300 es',
    'layout(location = 0) in vec2 aPosition;',
    'out vec2 vUv;',
    'void main() { vUv = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }'
  ].join('\n');

  var FADE_FRAGMENT = [
    '#version 300 es',
    'precision highp float;',
    'out vec4 outColor;',
    'void main() { outColor = vec4(0.0); }'       // drawn with a blend that only dims what is already there
  ].join('\n');

  var SHOW_FRAGMENT = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv;',
    'out vec4 outColor;',
    'uniform sampler2D uLight;',
    'uniform float uGain;',
    'void main() {',
    '  vec3 light = texture(uLight, vUv).rgb;',
    '  float total = light.r + light.g + light.b;',
    '  float seen = log(1.0 + total * uGain) / log(1.0 + 600.0);',      // what reaches the eye
    '  vec3 colour = total > 0.0 ? light / total * 3.0 * seen : vec3(0.0);',
    '  colour = mix(colour, vec3(seen), smoothstep(0.8, 1.25, seen) * 0.8);',  // the very brightest threads burn out to white
    '  outColor = vec4(pow(min(colour, vec3(1.0)), vec3(0.85)), 1.0);',
    '}'
  ].join('\n');

  Gallery.register('numbers', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var context = Gallery.gl.context(canvas, { alpha: false, antialias: false, depth: false, stencil: false }, true);
    if (!context || !Gallery.gl.canRenderFloat(context.gl)) {
      env.fail('This work adds up its light in a floating-point picture, which this browser or graphics card does not offer. The other rooms still run.');
      return null;
    }
    var gl = context.gl;

    var wide = size.w >= 900;
    var COUNT = wide ? 320000 : 140000, STEPS = wide ? 36 : 28;
    var numbers = PLACES[0].slice(), from = PLACES[0].slice(), place = 0;
    var journey = 0, resting = 3;                // seconds into the move to the next place; seconds left to stay at this one
    var held = false, drag = null, pair = 0, idle = 0;
    var light = null, points, fade, show, at = {}, triangle, seed = 1, frames = 0;
    var view = [0, 0, 0.3, 0.3], lost = false, flush = 0;

    function build() {
      points = Gallery.gl.program(gl, POINTS_VERTEX.replace('STEPS', String(STEPS)), POINTS_FRAGMENT);
      fade = Gallery.gl.program(gl, SCREEN_VERTEX, FADE_FRAGMENT);
      show = Gallery.gl.program(gl, SCREEN_VERTEX, SHOW_FRAGMENT);
      at.points = Gallery.gl.uniforms(gl, points, ['uNumbers', 'uSeed', 'uView', 'uSpeck']);
      at.show = Gallery.gl.uniforms(gl, show, ['uLight', 'uGain']);
      triangle = Gallery.gl.fullscreenTriangle(gl);
    }

    function report() {
      ['a', 'b', 'c', 'd'].forEach(function (name, k) { env.live(name, (numbers[k] < 0 ? '−' : '') + Math.abs(numbers[k]).toFixed(2)); });
    }

    // wander: rest at a place while the picture sharpens, then drift to the next
    function wander(dt) {
      if (drag || held) return;
      if (idle > 0) { idle -= dt; if (idle <= 0) { from = numbers.slice(); journey = 0; resting = 0; } return; }
      if (resting > 0) { resting -= dt; return; }
      journey += dt / 10;
      var next = PLACES[(place + 1) % PLACES.length];
      var t = Math.min(1, journey), ease = t * t * (3 - 2 * t);
      for (var k = 0; k < 4; k++) numbers[k] = from[k] + (next[k] - from[k]) * ease;
      if (t >= 1) { place = (place + 1) % PLACES.length; from = next.slice(); journey = 0; resting = 5; }
      report();
    }

    function moving() { return !!drag || (!held && idle <= 0 && resting <= 0); }

    function fit(dt) {
      // the figure lies inside 1 + |c| by 1 + |d|; keep it in the clear part of the screen
      var reachX = 1 + Math.abs(numbers[2]), reachY = 1 + Math.abs(numbers[3]);
      var roomX = wide ? 0.62 : 0.94, roomY = wide ? 0.8 : 0.84;
      var pixels = Math.min(size.w * roomX / (2 * reachX), size.h * roomY / (2 * reachY));
      var wantX = pixels * 2 / size.w, wantY = pixels * 2 / size.h, ease = 1 - Math.exp(-dt * 3);
      view[2] += (wantX - view[2]) * ease; view[3] += (wantY - view[3]) * ease;
      view[0] = wide ? -0.3 / view[2] : 0;       // slid to the right of the wall label
      view[1] = wide ? 0 : -0.04 / view[3];
    }

    function render(dt) {
      if (lost || !light) return;
      var fading = flush > 0 ? 0.55 : moving() ? 0.9 : 0.972;      // after a jump the old figure is let go of quickly
      if (flush > 0) flush--;
      gl.bindFramebuffer(gl.FRAMEBUFFER, light.framebuffer);
      gl.viewport(0, 0, light.width, light.height);
      gl.enable(gl.BLEND);
      // dim what is there...
      gl.useProgram(fade);
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.blendColor(0, 0, 0, fading);
      gl.blendFunc(gl.ZERO, gl.CONSTANT_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // ...and add this frame's specks. Each is worth less when the picture fades slowly, so the brightness holds steady.
      gl.useProgram(points);
      gl.disableVertexAttribArray(0);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform4f(at.points.uNumbers, numbers[0], numbers[1], numbers[2], numbers[3]);
      gl.uniform1ui(at.points.uSeed, seed = (seed * 1664525 + 1013904223) >>> 0);
      gl.uniform4f(at.points.uView, view[0], view[1], view[2], view[3]);
      gl.uniform1f(at.points.uSpeck, (1 - fading) * 320000 / COUNT * 0.55);
      gl.drawArrays(gl.POINTS, 0, COUNT);
      gl.disable(gl.BLEND);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(show);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, light.texture);
      gl.uniform1i(at.show.uLight, 0);
      gl.uniform1f(at.show.uGain, 55 * (light.width * light.height) / (1440 * 900));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frames++;
    }

    /* ---- wiring ---- */

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var limit = pair === 0 ? 3 : 2;
      numbers[pair * 2] = Gallery.clamp(numbers[pair * 2] + (e.clientX - drag.x) / size.w * 2.4, -limit, limit);
      numbers[pair * 2 + 1] = Gallery.clamp(numbers[pair * 2 + 1] - (e.clientY - drag.y) / size.h * 2.4, -limit, limit);
      drag.x = e.clientX; drag.y = e.clientY;
      report();
      env.redraw();
    });
    function release() { if (drag) idle = 7; drag = null; canvas.style.cursor = 'grab'; }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () { lost = false; light = null; build(); env.redraw(); });
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';

    var pairButtons = Array.prototype.slice.call(env.room.querySelectorAll('[data-numbers-pair]'));
    pairButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        pair = Number(button.getAttribute('data-numbers-pair'));
        pairButtons.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
      });
    });
    var holdButton = env.room.querySelector('[data-numbers-hold]');
    if (holdButton) {
      holdButton.addEventListener('click', function () {
        held = !held;
        holdButton.textContent = held ? 'Let it wander' : 'Hold it there';
        holdButton.setAttribute('aria-pressed', String(held));
        if (!held) { from = numbers.slice(); journey = 0; resting = 0; idle = 0; }
      });
    }
    var elsewhere = env.room.querySelector('[data-numbers-elsewhere]');
    if (elsewhere) {
      elsewhere.addEventListener('click', function () {
        place = (place + 1) % PLACES.length;
        numbers = PLACES[place].slice(); from = numbers.slice();
        journey = 0; resting = 6; idle = 0; flush = 14;
        report();
        env.redraw();
      });
    }

    try { build(); } catch (err) {
      env.fail('This work could not start its shaders on this graphics card. The other rooms still run.');
      return null;
    }
    report();
    env.live('points', Gallery.formatCount(COUNT * 60));

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 1.5);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        if (light) { gl.deleteTexture(light.texture); gl.deleteFramebuffer(light.framebuffer); }
        light = Gallery.gl.floatTarget(gl, canvas.width, canvas.height, 4, false);
        if (!light) env.fail('This graphics card would not make a floating-point picture to add the light up in. The other rooms still run.');
        fit(10);
      },
      frame: function (time, dt) {
        wander(dt);
        fit(dt);
        render(dt);
      },
      // With motion paused: add up a second's worth of light at the first place, and show that.
      still: function () {
        fit(10);
        if (frames < 60) for (var i = 0; i < 70; i++) render(1 / 60);
        else render(1 / 60);
      },
      where: function () { return { numbers: numbers.slice(), held: held, idle: idle, resting: resting, journey: journey, frames: frames }; }
    };
  });
})();
