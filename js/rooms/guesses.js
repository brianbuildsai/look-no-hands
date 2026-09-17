/* A Thousand Guesses — room 25, the last.

   A path tracer (Kajiya, 1986). The room in the picture is never drawn. For
   every pixel, a ray is followed backwards from the eye into the scene. Where
   it lands it bounces: off a mirror the one way a mirror allows, through
   glass by Snell's law, off a matt surface in a random direction. At every
   matt landing it also looks straight at the lamp to see whether it is lit
   from there. When it has bounced six times, or left the room, it stops, and
   what it collected is one guess at the colour of that pixel.

   One guess is nearly worthless. The picture on screen is the running average
   of all the guesses so far, kept in a floating-point texture, so it begins
   as noise and clears as it is watched. The colour the walls lend to the
   floor, the soft edges of the shadows, the light gathered under the glass
   ball: none of that is programmed. It is what the average converges to.

   Moving the view throws the guesses away, because they were guesses about a
   different picture. */
(function () {
  'use strict';

  var ENOUGH = 3000;               // guesses a pixel after which it stops: the picture no longer visibly changes

  var VERTEX = [
    '#version 300 es',
    'layout(location = 0) in vec2 aPosition;',
    'out vec2 vUv;',
    'void main() { vUv = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }'
  ].join('\n');

  var TRACE = [
    '#version 300 es',
    'precision highp float;',
    'precision highp int;',
    'in vec2 vUv;',
    'out vec4 outColor;',
    'uniform sampler2D uBefore;',      // the average of the guesses so far
    'uniform float uCount;',           // how many that is
    'uniform vec2 uSize;',
    'uniform vec3 uEye;',
    'uniform vec3 uRight;',
    'uniform vec3 uUp;',
    'uniform vec3 uAhead;',
    'uniform float uShift;',           // the picture is slid sideways on a wide screen, clear of the wall label
    'uniform float uLamp;',            // half the width of the lamp
    'uniform int uMiddle;',            // what the middle ball is made of
    'uniform uint uSeed;',
    '',
    'const int BONE = 0, BLUE = 1, ROSE = 2, PLINTH = 3, MIRROR = 4, GLASS = 5, CHALK = 6, LAMP = 7, GOLD = 8;',
    'const vec3 LAMP_AT = vec3(0.0, 3.19, -0.3);',
    '',
    'uint state;',
    'float rnd() { state = state * 747796405u + 2891336453u; uint w = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u; return float((w >> 22u) ^ w) / 4294967296.0; }',
    '',
    'void ball(vec3 ro, vec3 rd, vec3 c, float r, int m, inout float t, inout vec3 n, inout int mat) {',
    '  vec3 oc = ro - c; float b = dot(oc, rd), h = b * b - dot(oc, oc) + r * r;',
    '  if (h < 0.0) return;',
    '  h = sqrt(h); float near = -b - h; if (near < 1.0e-3) near = -b + h;',
    '  if (near < 1.0e-3 || near > t) return;',
    '  t = near; n = (ro + rd * near - c) / r; mat = m;',
    '}',
    'void block(vec3 ro, vec3 rd, vec3 lo, vec3 hi, int m, inout float t, inout vec3 n, inout int mat) {',
    '  vec3 inv = 1.0 / rd, a = (lo - ro) * inv, b = (hi - ro) * inv, small = min(a, b), big = max(a, b);',
    '  float enter = max(max(small.x, small.y), small.z), leave = min(min(big.x, big.y), big.z);',
    '  if (enter > leave || leave < 1.0e-3) return;',
    '  float at = enter > 1.0e-3 ? enter : leave;',
    '  if (at > t) return;',
    '  t = at; mat = m;',
    '  vec3 d = (ro + rd * at - (lo + hi) * 0.5) / ((hi - lo) * 0.5), s = abs(d);',
    '  n = s.x > s.y && s.x > s.z ? vec3(sign(d.x), 0.0, 0.0) : s.y > s.z ? vec3(0.0, sign(d.y), 0.0) : vec3(0.0, 0.0, sign(d.z));',
    '}',
    // a wall, seen only from the side it faces, and only as far as the room goes
    'void wall(vec3 ro, vec3 rd, vec3 facing, float offset, int m, inout float t, inout vec3 n, inout int mat) {',
    '  float slope = dot(rd, facing);',
    '  if (slope > -1.0e-5) return;',
    '  float at = (offset - dot(ro, facing)) / slope;',
    '  if (at < 1.0e-3 || at > t) return;',
    '  vec3 p = ro + rd * at;',
    '  if (abs(p.x) > 3.001 || p.y < -0.001 || p.y > 3.201 || p.z < -3.001 || p.z > 3.6) return;',
    '  t = at; n = facing; mat = m;',
    '}',
    '',
    'void scene(vec3 ro, vec3 rd, out float t, out vec3 n, out int mat) {',
    '  t = 1.0e5; n = vec3(0.0); mat = -1;',
    '  wall(ro, rd, vec3(0.0, 1.0, 0.0), 0.0, BONE, t, n, mat);',
    '  wall(ro, rd, vec3(0.0, -1.0, 0.0), -3.2, BONE, t, n, mat);',
    '  wall(ro, rd, vec3(0.0, 0.0, 1.0), -3.0, BONE, t, n, mat);',
    '  wall(ro, rd, vec3(1.0, 0.0, 0.0), -3.0, BLUE, t, n, mat);',
    '  wall(ro, rd, vec3(-1.0, 0.0, 0.0), -3.0, ROSE, t, n, mat);',
    '  block(ro, rd, vec3(-1.95, 0.0, -1.35), vec3(-1.15, 0.95, -0.55), PLINTH, t, n, mat);',
    '  block(ro, rd, vec3(-0.4, 0.0, -0.1), vec3(0.4, 0.62, 0.7), PLINTH, t, n, mat);',
    '  block(ro, rd, vec3(1.15, 0.0, -1.35), vec3(1.95, 0.95, -0.55), PLINTH, t, n, mat);',
    '  ball(ro, rd, vec3(-1.55, 1.4, -0.95), 0.45, MIRROR, t, n, mat);',
    '  ball(ro, rd, vec3(0.0, 1.07, 0.3), 0.45, uMiddle, t, n, mat);',
    '  ball(ro, rd, vec3(1.55, 1.4, -0.95), 0.45, CHALK, t, n, mat);',
    // the lamp: a bright square let into the ceiling
    '  float slope = rd.y;',
    '  if (slope > 1.0e-5) {',
    '    float at = (LAMP_AT.y - ro.y) / slope;',
    '    vec3 p = ro + rd * at;',
    '    if (at > 1.0e-3 && at < t && abs(p.x - LAMP_AT.x) < uLamp && abs(p.z - LAMP_AT.z) < uLamp) { t = at; n = vec3(0.0, -1.0, 0.0); mat = LAMP; }',
    '  }',
    '}',
    '',
    'vec3 paint(int mat) {',
    '  if (mat == BLUE) return vec3(0.10, 0.17, 0.72);',
    '  if (mat == ROSE) return vec3(0.78, 0.16, 0.28);',
    '  if (mat == PLINTH) return vec3(0.80, 0.78, 0.74);',
    '  if (mat == CHALK) return vec3(0.84, 0.82, 0.78);',
    '  return vec3(0.72, 0.70, 0.67);',
    '}',
    '',
    // a random direction away from a surface, more likely near its normal, which is how matt things scatter
    'vec3 scatter(vec3 n) {',
    '  float a = 6.2831853 * rnd(), r = sqrt(rnd());',
    '  vec3 side = normalize(abs(n.x) > 0.5 ? cross(n, vec3(0.0, 1.0, 0.0)) : cross(n, vec3(1.0, 0.0, 0.0)));',
    '  return normalize(side * cos(a) * r + cross(n, side) * sin(a) * r + n * sqrt(max(0.0, 1.0 - r * r)));',
    '}',
    '',
    'vec3 guess(vec3 ro, vec3 rd) {',
    '  vec3 light = vec3(0.0), carry = vec3(1.0);',
    '  vec3 glow = vec3(1.0, 0.86, 0.66) * (17.0 / (4.0 * uLamp * uLamp));',      // the same power from a big lamp as from a small one
    '  bool sharp = true;',                                                      // was the last bounce a mirror-like one?
    '  for (int bounce = 0; bounce < 6; bounce++) {',
    '    float t; vec3 n; int mat;',
    '    scene(ro, rd, t, n, mat);',
    '    if (mat < 0) break;',
    '    if (mat == LAMP) { if (sharp) light += carry * glow; break; }',
    '    vec3 p = ro + rd * t;',
    '    if (mat == MIRROR) { rd = reflect(rd, n); ro = p + n * 1.0e-3; carry *= 0.96; sharp = true; continue; }',
    '    if (mat == GOLD) {',
    '      rd = normalize(reflect(rd, n) + 0.12 * (vec3(rnd(), rnd(), rnd()) * 2.0 - 1.0));',
    '      if (dot(rd, n) < 0.0) rd = reflect(rd, n);',
    '      ro = p + n * 1.0e-3; carry *= vec3(1.0, 0.76, 0.32); sharp = true; continue;',
    '    }',
    '    if (mat == GLASS) {',
    '      bool inside = dot(rd, n) > 0.0;',
    '      vec3 outward = inside ? -n : n;',
    '      float ratio = inside ? 1.5 : 1.0 / 1.5, c = -dot(rd, outward);',
    '      float mirrorlike = 0.04 + 0.96 * pow(1.0 - c, 5.0);',
    '      vec3 bent = refract(rd, outward, ratio);',
    '      if (bent == vec3(0.0) || rnd() < mirrorlike) { rd = reflect(rd, outward); ro = p + outward * 1.0e-3; }',
    '      else { rd = bent; ro = p - outward * 1.0e-3; carry *= vec3(0.97, 0.99, 0.98); }',
    '      sharp = true; continue;',
    '    }',
    // a matt surface: look straight at a random point of the lamp to see whether it lights this spot...
    '    vec3 colour = paint(mat);',
    '    vec3 on = LAMP_AT + vec3((rnd() * 2.0 - 1.0) * uLamp, 0.0, (rnd() * 2.0 - 1.0) * uLamp);',
    '    vec3 toward = on - p; float far = length(toward); toward /= far;',
    '    float facing = dot(n, toward), lampFacing = toward.y;',
    '    if (facing > 0.0 && lampFacing > 0.0) {',
    '      float st; vec3 sn; int sm;',
    '      scene(p + n * 1.0e-3, toward, st, sn, sm);',
    '      if (sm == LAMP) light += carry * colour * glow * facing * lampFacing * (4.0 * uLamp * uLamp) / (3.14159265 * far * far);',
    '    }',
    // ...then carry on in a random direction, tinted by what it has just bounced off
    '    carry *= colour;',
    '    rd = scatter(n); ro = p + n * 1.0e-3; sharp = false;',
    '  }',
    '  return min(light, vec3(12.0));',
    '}',
    '',
    'void main() {',
    '  state = uint(gl_FragCoord.x) * 1973u + uint(gl_FragCoord.y) * 9277u + uSeed * 26699u;',
    '  rnd(); rnd();',
    '  vec2 at = (gl_FragCoord.xy + vec2(rnd(), rnd()) - 0.5 * uSize) / (0.5 * uSize.y);',      // a slightly different spot in the pixel each time, which smooths the edges
    '  at.x -= uShift * uSize.x / uSize.y;',
    '  vec3 rd = normalize(uAhead + uRight * at.x + uUp * at.y);',
    '  vec3 now = guess(uEye, rd);',
    '  vec3 before = texture(uBefore, vUv).rgb;',
    '  outColor = vec4(mix(before, now, 1.0 / (uCount + 1.0)), 1.0);',
    '}'
  ].join('\n');

  var SHOW = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv;',
    'out vec4 outColor;',
    'uniform sampler2D uAverage;',
    'uniform float uShade;',
    'void main() {',
    '  vec3 c = texture(uAverage, vUv).rgb * 0.9;',
    '  c *= mix(1.0, 0.12 + 0.88 * smoothstep(0.2, 0.4, vUv.x), uShade);',      // dim behind the wall label on a wide screen
    '  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);',              // film response: bright things roll off instead of clipping
    '  outColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(0.4545)), 1.0);',
    '}'
  ].join('\n');

  Gallery.register('guesses', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var context = Gallery.gl.context(canvas, { alpha: false, antialias: false, depth: false, stencil: false }, true);
    if (!context || !Gallery.gl.canRenderFloat(context.gl)) {
      env.fail('This work keeps its running average in a floating-point texture, which this browser or graphics card does not offer. The other rooms still run.');
      return null;
    }
    var gl = context.gl;

    var MATERIALS = { glass: 5, mirror: 4, chalk: 6, gold: 8 };
    var trace, show, at = {}, triangle;
    var targets = null, width = 0, height = 0;          // two floating-point pictures: the average so far, and the next one
    var count = 0, seed = 1, lost = false, smoothFloats = !!gl.getExtension('OES_texture_float_linear');
    var yaw = 0.3, pitch = 0.2, drag = null, lamp = 0.8, middle = MATERIALS.glass;

    function build() {
      trace = Gallery.gl.program(gl, VERTEX, TRACE);
      show = Gallery.gl.program(gl, VERTEX, SHOW);
      at.trace = Gallery.gl.uniforms(gl, trace, ['uBefore', 'uCount', 'uSize', 'uEye', 'uRight', 'uUp', 'uAhead', 'uShift', 'uLamp', 'uMiddle', 'uSeed']);
      at.show = Gallery.gl.uniforms(gl, show, ['uAverage', 'uShade']);
      triangle = Gallery.gl.fullscreenTriangle(gl);
    }

    // full 32-bit floats if the card will draw into them (the average of thousands of guesses needs the digits), half floats if not
    function picture(w, h) {
      var formats = gl.getExtension('EXT_color_buffer_float') ? [[gl.RGBA32F, gl.FLOAT], [gl.RGBA16F, gl.HALF_FLOAT]] : [[gl.RGBA16F, gl.HALF_FLOAT]];
      for (var k = 0; k < formats.length; k++) {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, formats[k][0], w, h, 0, gl.RGBA, formats[k][1], null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        var buffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        var complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        if (complete) return { texture: texture, buffer: buffer, precise: k === 0 && formats.length > 1 };
        gl.deleteTexture(texture); gl.deleteFramebuffer(buffer);
      }
      return null;
    }

    function allocate() {
      if (targets) targets.forEach(function (t) { gl.deleteTexture(t.texture); gl.deleteFramebuffer(t.buffer); });
      // about half a million pixels is what a laptop's graphics can guess at sixty times a second
      var most = size.w >= 900 ? 560000 : 300000, full = canvas.width * canvas.height, shrink = Math.min(1, Math.sqrt(most / full));
      width = Math.max(16, Math.round(canvas.width * shrink)); height = Math.max(16, Math.round(canvas.height * shrink));
      var a = picture(width, height), b = a && picture(width, height);
      targets = a && b ? [a, b] : null;
      if (!targets) env.fail('This graphics card would not make a floating-point picture to keep the average in. The other rooms still run.');
      forget();
    }

    function forget() { count = 0; env.redraw(); }

    function render() {
      if (lost || !targets) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);

      if (count < ENOUGH) {
        // where the eye is: on a circle round the middle of the room, outside its open front
        var reach = 8.4, target = [0, 1.3, -0.4];
        var eye = [target[0] + Math.sin(yaw) * Math.cos(pitch) * reach, target[1] + Math.sin(pitch) * reach, target[2] + Math.cos(yaw) * Math.cos(pitch) * reach];
        var fx = target[0] - eye[0], fy = target[1] - eye[1], fz = target[2] - eye[2], fl = Math.sqrt(fx * fx + fy * fy + fz * fz);
        fx /= fl; fy /= fl; fz /= fl;
        var rx = -fz, rz = fx, rl = Math.sqrt(rx * rx + rz * rz); rx /= rl; rz /= rl;
        var ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
        var narrow = size.w < 900, zoom = narrow ? 1.75 : 2.25;          // a phone stands further back, to get the whole room in
        gl.useProgram(trace);
        gl.bindFramebuffer(gl.FRAMEBUFFER, targets[1].buffer);
        gl.viewport(0, 0, width, height);
        gl.bindTexture(gl.TEXTURE_2D, targets[0].texture);
        gl.uniform1i(at.trace.uBefore, 0);
        gl.uniform1f(at.trace.uCount, count);
        gl.uniform2f(at.trace.uSize, width, height);
        gl.uniform3f(at.trace.uEye, eye[0], eye[1], eye[2]);
        gl.uniform3f(at.trace.uRight, rx, 0, rz);
        gl.uniform3f(at.trace.uUp, ux, uy, uz);
        gl.uniform3f(at.trace.uAhead, fx * zoom, fy * zoom, fz * zoom);
        gl.uniform1f(at.trace.uShift, narrow ? 0 : 0.3);
        gl.uniform1f(at.trace.uLamp, lamp);
        gl.uniform1i(at.trace.uMiddle, middle);
        gl.uniform1ui(at.trace.uSeed, seed = (seed * 1664525 + 1013904223) >>> 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        targets.reverse();
        count++;
        env.live('count', Gallery.formatCount(count));
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(show);
      gl.bindTexture(gl.TEXTURE_2D, targets[0].texture);
      // stretched to the screen smoothly, if this card can smooth the kind of texture it is
      var smooth = !targets[0].precise || smoothFloats;
      if (smooth) { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); }
      gl.uniform1i(at.show.uAverage, 0);
      gl.uniform1f(at.show.uShade, size.w >= 900 ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (smooth) { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); }
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
      yaw = Gallery.clamp(yaw - (e.clientX - drag.x) / size.w * 2.2, -0.95, 0.95);
      pitch = Gallery.clamp(pitch + (e.clientY - drag.y) / size.h * 1.4, 0.03, 0.62);
      drag.x = e.clientX; drag.y = e.clientY;
      forget();                                          // they were guesses about a different picture
    });
    function release() { drag = null; canvas.style.cursor = 'grab'; }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () { lost = false; targets = null; build(); allocate(); });
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'pan-y';

    var lampDial = env.room.querySelector('[data-guesses-lamp]');
    var lampReadout = env.room.querySelector('[data-guesses-lamp-value]');
    function readLamp() {
      lamp = Number(lampDial.value) / 100;
      if (lampReadout) lampReadout.textContent = lamp < 0.4 ? 'small: hard shadows' : lamp < 1.1 ? 'a skylight' : 'most of the ceiling: soft shadows';
      forget();
    }
    if (lampDial) { lampDial.addEventListener('input', readLamp); lamp = Number(lampDial.value) / 100; }
    var materialButtons = Array.prototype.slice.call(env.room.querySelectorAll('[data-guesses-ball]'));
    materialButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        middle = MATERIALS[button.getAttribute('data-guesses-ball')] || MATERIALS.glass;
        materialButtons.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
        forget();
      });
    });
    var againButton = env.room.querySelector('[data-guesses-again]');
    if (againButton) againButton.addEventListener('click', forget);

    try { build(); } catch (err) {
      env.fail('This work could not start its shaders on this graphics card. The other rooms still run.');
      return null;
    }
    if (lampReadout) readLamp();

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 1.5);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        allocate();
      },
      frame: function () { render(); },
      // With motion paused: make a few hundred guesses at once, so there is a picture and not a snowstorm, and stop there.
      still: function () {
        var want = drag ? Math.min(ENOUGH, count + 6) : 160;
        if (count < want) { for (var i = count; i < want; i++) render(); }
        else render();
      },
      progress: function () { return { count: count, width: width, height: height, precise: targets ? targets[0].precise : null }; }
    };
  });
})();
