/* No Bottom — room 16.

   The Mandelbrot set: take a point c, start from zero, and repeat
   z -> z*z + c. Colour c by how long z takes to run away. That is all of it.

   The edge has detail at every magnification, but a graphics card only keeps
   about seven digits, and a trillion times down two neighbouring pixels
   differ in the fifteenth. So the work is split (this is called perturbation):

     - the processor follows ONE point, the middle of the view, in double
       precision, and hands its whole orbit to the graphics card as a texture;
     - every pixel follows only the DIFFERENCE between its own orbit and that
       one. The difference is tiny but it is a floating-point number, and a
       floating-point number is just as precise when it is tiny.

   When a pixel's orbit wanders so far that the difference is bigger than the
   orbit itself, it starts again from the beginning of the reference
   ("rebasing", Zhuoran 2021), which is what keeps this free of glitches.

   The fall aims at Misiurewicz points: places on the edge where the set is
   the same spiral at every scale, found here by Newton's method. Right beside
   each one, found the same way, is a small copy of the whole set, and that
   is where the fall ends. */
(function () {
  'use strict';

  var HOME = { x: -0.6, y: 0, scale: 1.35 };
  var FLOOR = 1.5e-13;                     // below this, double precision itself runs out
  var REF_WIDTH = 1024;

  // Where to fall: [real, imaginary, preperiod, period]. Polished by Newton's method on arrival.
  var TARGETS = [
    [-0.56220262152303724, 0.64281714907277532, 6, 1],
    [0.25053339883659886, 0.62289242513572585, 11, 1],
    [-0.86709043348080894, 0.26473616977409720, 23, 1],
    [-0.27503647781530666, 0.75439548469339546, 21, 1],
    [-1.2247972183333369, 0.18212722377536161, 15, 2],
    [0.00056977777304431686, 0.75146474076194014, 10, 1],
    [-0.91510626492223157, 0.28967572084514220, 15, 1],
    [-0.14275631064169242, 1.0558427989502803, 7, 1]
  ];

  var VERTEX = [
    '#version 300 es',
    'layout(location = 0) in vec2 aPosition;',
    'out vec2 vP;',
    'uniform float uAspect;',
    'void main() { vP = vec2(aPosition.x * uAspect, aPosition.y); gl_Position = vec4(aPosition, 0.0, 1.0); }'
  ].join('\n');

  var FRAGMENT = [
    '#version 300 es',
    'precision highp float;',
    'precision highp sampler2D;',
    'in vec2 vP;',
    'out vec4 outColor;',
    'uniform sampler2D uOrbit;',      // the reference orbit, one texel a step
    'uniform int uOrbitLength;',
    'uniform int uSteps;',
    'uniform float uScale;',          // half the height of the view, in the plane
    'uniform float uPixel;',          // one pixel, as a fraction of that
    'uniform float uLow;',            // the step counts the palette is stretched between
    'uniform float uHigh;',
    'uniform float uShade;',
    'uniform float uAspect;',
    '',
    'vec2 orbit(int m) { return texelFetch(uOrbit, ivec2(m % ' + REF_WIDTH + ', m / ' + REF_WIDTH + '), 0).xy; }',
    '',
    // dark far from the set, blue as it nears, then rose, amber and bone at the edge itself
    'vec3 ramp(float t) {',
    '  vec3 a = vec3(0.0), b = vec3(0.015, 0.03, 0.16), c = vec3(0.12, 0.2, 0.86);',
    '  vec3 d = vec3(0.95, 0.27, 0.44), e = vec3(1.0, 0.70, 0.28), f = vec3(0.93, 0.92, 0.89);',
    '  if (t < 0.28) return mix(a, b, smoothstep(0.0, 0.28, t));',
    '  if (t < 0.58) return mix(b, c, smoothstep(0.28, 0.58, t));',
    '  if (t < 0.8) return mix(c, d, smoothstep(0.58, 0.8, t));',
    '  if (t < 0.95) return mix(d, e, smoothstep(0.8, 0.95, t));',
    '  return mix(e, f, smoothstep(0.95, 1.2, t));',
    '}',
    '',
    'void main() {',
    '  vec2 dc = vP * uScale;',        // how far this pixel is from the reference point
    '  vec2 dz = vec2(0.0);',          // how far its orbit is from the reference orbit
    '  vec2 Z = vec2(0.0);',
    '  vec2 z = vec2(0.0);',
    '  vec2 der = vec2(0.0);',         // dz/dc, for judging the distance to the edge
    '  int m = 0;',
    '  float zz = 0.0;',
    '  int count = -1;',
    '  for (int i = 0; i < 6000; i++) {',
    '    if (i >= uSteps) break;',
    '    der = 2.0 * vec2(z.x * der.x - z.y * der.y, z.x * der.y + z.y * der.x) + vec2(1.0, 0.0);',
    '    dz = 2.0 * vec2(Z.x * dz.x - Z.y * dz.y, Z.x * dz.y + Z.y * dz.x) + vec2(dz.x * dz.x - dz.y * dz.y, 2.0 * dz.x * dz.y) + dc;',
    '    m++;',
    '    Z = orbit(m);',
    '    z = Z + dz;',
    '    zz = dot(z, z);',
    '    if (zz > 1.0e4) { count = i; break; }',
    '    if (zz < dot(dz, dz) || m >= uOrbitLength - 1) { dz = z; m = 0; Z = vec2(0.0); }',
    '  }',
    '  if (count < 0) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }',
    '  float smoothCount = float(count) + 1.0 - log2(0.5 * log2(zz)) + 2.73;',
    '  float t = clamp((smoothCount - uLow) / max(uHigh - uLow, 1.0), 0.0, 1.5);',
    '  vec3 colour = ramp(pow(t, 1.15));',
    // the distance to the edge in pixels: threads thinner than a pixel are drawn as hairlines
    '  float toEdge = sqrt(zz) * 0.5 * log(zz) / max(length(der), 1.0e-30);',
    '  float pixels = toEdge / (uScale * uPixel);',
    '  colour = mix(colour, vec3(0.93, 0.92, 0.89), 0.85 * exp(-pixels * 0.8));',
    // on a wide screen the wall label hangs over the left of the picture: keep it dim there
    '  float across = vP.x / uAspect * 0.5 + 0.5;',
    '  colour *= mix(1.0, 0.16 + 0.84 * smoothstep(0.24, 0.5, across), uShade);',
    '  colour *= 0.3 + 0.7 * smoothstep(0.99, 0.72, vP.y);',      // and under the masthead
    '  outColor = vec4(colour, 1.0);',
    '}'
  ].join('\n');

  var COPY_FRAGMENT = [
    '#version 300 es',
    'precision highp float;',         // uAspect is shared with the vertex shader, so the precisions have to agree
    'in vec2 vP;',
    'out vec4 outColor;',
    'uniform sampler2D uImage;',
    'uniform vec2 uUse;',             // how much of the texture holds this frame
    'uniform float uAspect;',
    'void main() { outColor = texture(uImage, (vec2(vP.x / uAspect, vP.y) * 0.5 + 0.5) * uUse); }'
  ].join('\n');

  /* ---- arithmetic the careful way, in double precision ---- */

  // The reference orbit of c, until it runs away or the steps run out.
  function followInto(out, cx, cy, steps) {
    var x = 0, y = 0, n = 1;
    out[0] = 0; out[1] = 0;
    while (n <= steps) {
      var t = x * x - y * y + cx;
      y = 2 * x * y + cy;
      x = t;
      out[n * 2] = x; out[n * 2 + 1] = y;
      n++;
      if (x * x + y * y > 1e6) break;
    }
    return n;                                   // how many entries were written
  }

  function escapeTime(cx, cy, steps) {
    var x = 0, y = 0, n = 0;
    while (n < steps) {
      var xx = x * x, yy = y * y;
      if (xx + yy > 1e4) return n;
      y = 2 * x * y + cy;
      x = xx - yy + cx;
      n++;
    }
    return -1;
  }

  // z after n steps, and its derivative with respect to c
  function stepWithSlope(cx, cy, n) {
    var zx = 0, zy = 0, dx = 0, dy = 0;
    for (var i = 0; i < n; i++) {
      var ndx = 2 * (zx * dx - zy * dy) + 1, ndy = 2 * (zx * dy + zy * dx);
      var nzx = zx * zx - zy * zy + cx;
      zy = 2 * zx * zy + cy; zx = nzx; dx = ndx; dy = ndy;
      if (zx * zx + zy * zy > 1e12) return null;
    }
    return [zx, zy, dx, dy];
  }

  // Newton's method for the point whose orbit, after `before` steps, repeats every `period`.
  function misiurewicz(cx, cy, before, period) {
    for (var round = 0; round < 50; round++) {
      var a = stepWithSlope(cx, cy, before + period), b = stepWithSlope(cx, cy, before);
      if (!a || !b) return null;
      var fx = a[0] - b[0], fy = a[1] - b[1], gx = a[2] - b[2], gy = a[3] - b[3];
      var g = gx * gx + gy * gy;
      if (!(g > 0)) return null;
      var sx = (fx * gx + fy * gy) / g, sy = (fy * gx - fx * gy) / g;
      cx -= sx; cy -= sy;
      if (sx * sx + sy * sy < 1e-31) {
        // the same equation is also solved by the middles of the black bulbs, which are no use: nothing to see in there
        var back = stepWithSlope(cx, cy, period);
        return back && back[0] * back[0] + back[1] * back[1] > 1e-12 ? { x: cx, y: cy } : null;
      }
    }
    return null;
  }

  // Newton's method again, for the middle of a small copy of the whole set whose orbit returns to zero after `period` steps.
  function nucleus(cx, cy, period) {
    for (var round = 0; round < 60; round++) {
      var a = stepWithSlope(cx, cy, period);
      if (!a) return null;
      var g = a[2] * a[2] + a[3] * a[3];
      if (!(g > 0)) return null;
      var sx = (a[0] * a[2] + a[1] * a[3]) / g, sy = (a[1] * a[2] - a[0] * a[3]) / g;
      cx -= sx; cy -= sy;
      if (sx * sx + sy * sy < 1e-32) return { x: cx, y: cy };
    }
    return null;
  }

  // How big that copy is, and which way up, as one complex number (Heiland-Allen's estimate).
  function copySize(cx, cy, period) {
    var zx = 0, zy = 0, lx = 1, ly = 0, bx = 1, by = 0;
    for (var i = 1; i < period; i++) {
      var t = zx * zx - zy * zy + cx; zy = 2 * zx * zy + cy; zx = t;
      t = 2 * (zx * lx - zy * ly); ly = 2 * (zx * ly + zy * lx); lx = t;
      var l = lx * lx + ly * ly;
      bx += lx / l; by -= ly / l;
    }
    var qx = lx * lx - ly * ly, qy = 2 * lx * ly;                  // l squared
    var dx = bx * qx - by * qy, dy = bx * qy + by * qx, d = dx * dx + dy * dy;
    return d > 0 && isFinite(d) ? { x: dx / d, y: -dy / d } : null;
  }

  // The best small copy to end a fall at: close to the aiming point, big enough for
  // double precision to reach, and of as low a period as possible so it is cheap to draw.
  function copyNear(tx, ty, smallest, largest) {
    var best = null;
    for (var period = 8; period <= 130; period++) {
      for (var ring = 0; ring < 3; ring++) {
        var reach = ring === 0 ? 1e-6 : ring === 1 ? 1e-7 : 1e-8;
        for (var k = 0; k < 8; k++) {
          var angle = k / 8 * 6.2832 + period;
          var n = nucleus(tx + Math.cos(angle) * reach, ty + Math.sin(angle) * reach, period);
          if (!n) continue;
          var far = Math.sqrt((n.x - tx) * (n.x - tx) + (n.y - ty) * (n.y - ty));
          if (far > 1e-5) continue;
          var size = copySize(n.x, n.y, period);
          if (!size) continue;
          var across = Math.sqrt(size.x * size.x + size.y * size.y);
          if (across < smallest || across > largest) continue;
          if (!best || period < best.period) best = { x: n.x, y: n.y, period: period, size: size, across: across };
        }
      }
      if (best && period > best.period + 6) break;
    }
    return best;
  }

  function inWords(times) {
    if (times < 1e6) return Gallery.formatCount(Math.round(times));
    var names = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']];
    for (var i = 0; i < names.length; i++) {
      if (times >= names[i][0]) {
        var n = times / names[i][0];
        return (n >= 100 ? Math.round(n) : n >= 10 ? n.toFixed(0) : n.toFixed(1)) + ' ' + names[i][1];
      }
    }
    return String(times);
  }

  Gallery.register('bottom', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var context = Gallery.gl.context(canvas, { alpha: false, antialias: false, depth: false, stencil: false }, true);
    if (!context) {
      env.fail('This work needs WebGL 2, which this browser does not offer. The other rooms still run.');
      return null;
    }
    var gl = context.gl;

    var HARD_STEPS = size.w >= 900 ? 5000 : 2400;
    var view = { x: HOME.x, y: HOME.y, scale: HOME.scale };
    var mode = 'falling';                   // falling, rising, or held (the visitor said hold still)
    var target = null, targetIndex = -1;    // the point the fall is aimed at
    var arrivalSteps = 0;
    var bottom = FLOOR, arriving = false;   // how far down this fall goes, and whether a copy of the set is waiting there
    var offset = { x: 0, y: 0 };            // where that point sits on screen, in view units
    var rate = 0.7;                         // doublings a second
    var press = null;                       // { x, y } in view units while the visitor steers
    var steps = 200, low = 0, high = 60, lowNow = 0, highNow = 60;
    var sinceSurvey = 99, dull = 0, atFloor = 0, clock = 0;
    var quality = 0.75, steady = 0, dirty = true;
    var orbit = new Float32Array(REF_WIDTH * Math.ceil((6000 + 2) / REF_WIDTH) * 2);
    var orbitLength = 1;
    var lost = false;
    var program, copyProgram, at, copyAt, triangle, orbitTexture, frame = null;

    /* ---- where it is going ---- */

    function aspect() { return size.w / Math.max(1, size.h); }

    // the decimal place in which two neighbouring pixels first differ
    function decimalPlace() { return Math.max(1, Math.ceil(-Math.log(view.scale / Math.max(1, size.h / 2)) / Math.LN10)); }

    // Aim at a point where the set is the same spiral at every scale, then look right beside it
    // for a small copy of the whole set to arrive at. From the surface the two are the same place.
    function nextTarget() {
      targetIndex = (targetIndex + 1) % TARGETS.length;
      var t = TARGETS[targetIndex];
      target = misiurewicz(t[0], t[1], t[2], t[3]) || { x: t[0], y: t[1] };
      bottom = FLOOR;
      var copy = size.w >= 900 ? copyNear(target.x, target.y, 7e-14, 3e-13) || copyNear(target.x, target.y, 7e-14, 4e-12)
        : copyNear(target.x, target.y, 8e-13, 6e-11);
      if (copy) {
        // the copy's cardioid is centred a little to the "left" of its nucleus, whichever way left is for it
        target = { x: copy.x - 0.3 * copy.size.x, y: copy.y - 0.3 * copy.size.y };
        bottom = Math.max(FLOOR, copy.across * 2.3);
        arrivalSteps = Math.min(HARD_STEPS, copy.period * 36);     // a copy of period p needs about this many to have a clean edge
      }
      arriving = !!copy;
      offset.x = (target.x - view.x) / view.scale;
      offset.y = (target.y - view.y) / view.scale;
    }

    // After the visitor lets go: look for the nearest self-similar point in view and follow that down.
    function retarget() {
      var best = null, reach = view.scale * 0.7;
      for (var before = 4; before <= 26; before += 2) {
        for (var period = 1; period <= 2; period++) {
          var found = misiurewicz(view.x, view.y, before, period);
          if (!found) continue;
          var far = Math.sqrt((found.x - view.x) * (found.x - view.x) + (found.y - view.y) * (found.y - view.y));
          if (far < reach && (!best || far < best.far)) best = { x: found.x, y: found.y, far: far };
        }
      }
      target = best ? { x: best.x, y: best.y } : { x: view.x, y: view.y };
      bottom = FLOOR; arriving = false;
      offset.x = (target.x - view.x) / view.scale;
      offset.y = (target.y - view.y) / view.scale;
    }

    // A coarse look at the view in double precision: how many steps the picture needs,
    // what range the colours should be stretched over, and whether there is anything to see.
    function survey() {
      var counts = [], inside = 0, a = aspect();
      for (var j = 0; j < 9; j++) {
        for (var i = 0; i < 14; i++) {
          var n = escapeTime(view.x + ((i + 0.5) / 14 * 2 - 1) * a * view.scale, view.y + ((j + 0.5) / 9 * 2 - 1) * view.scale, HARD_STEPS);
          if (n < 0) inside++; else counts.push(n);
        }
      }
      counts.sort(function (p, q) { return p - q; });
      if (counts.length > 8) {
        low = counts[Math.floor(counts.length * 0.04)];
        high = Math.max(low + 12, counts[Math.floor(counts.length * 0.96)]);
        var top = counts[Math.floor(counts.length * 0.97)];
        steps = Math.max(160, Math.min(HARD_STEPS, Math.round(top * 1.4 + 140)));
      }
      if (arriving && !press) {
        // coming up to the copy at the bottom: work up to the steps it will need, so its edge does not pop
        var nearness = 1 - Math.log(view.scale / bottom) / Math.log(40);
        steps = Math.max(steps, Math.round(arrivalSteps * Math.max(0, Math.min(1, nearness))));
      }
      var flat = counts.length > 8 && counts[counts.length - 1] - counts[0] < 3;
      return inside === 126 || flat;
    }

    function move(dt) {
      clock += dt;
      var before = view.scale;
      if (press && mode !== 'rising') {
        // the point under the visitor's finger stays under it while the view closes in
        var px = view.x + press.x * view.scale, py = view.y + press.y * view.scale;
        view.scale = Math.max(FLOOR, view.scale * Math.pow(0.5, rate * 1.6 * dt));
        view.x = px - press.x * view.scale; view.y = py - press.y * view.scale;
        target = null;
      } else if (mode === 'falling') {
        if (!target) retarget();
        view.scale = Math.max(bottom, view.scale * Math.pow(0.5, rate * dt));
        // the aiming point drifts to the middle of the clear part of the screen (the wall label has the left)
        var ease = Math.exp(-dt * 0.55), middle = size.w >= 900 ? aspect() * 0.27 : 0;
        offset.x = middle + (offset.x - middle) * ease; offset.y *= ease;
        view.x = target.x - offset.x * view.scale; view.y = target.y - offset.y * view.scale;
      } else if (mode === 'rising') {
        view.scale = Math.min(HOME.scale, view.scale * Math.pow(2, 4.5 * dt));
        if (view.scale > 0.02) {
          var home = 1 - Math.exp(-dt * 2.2);
          view.x += (HOME.x - view.x) * home; view.y += (HOME.y - view.y) * home;
        }
        if (view.scale >= HOME.scale) { mode = 'falling'; nextTarget(); }
      }
      if (view.scale !== before || press) dirty = true;

      if (mode === 'falling' || press) {
        var landed = view.scale <= (press ? FLOOR : bottom);
        if (landed && atFloor === 0) { survey(); lowNow = low; highNow = high; dirty = true; }     // one last good look, then rest
        atFloor = landed ? atFloor + dt : 0;
        if (atFloor > (arriving && !press ? 7 : 2.5) || dull > 3.5) { mode = 'rising'; atFloor = 0; dull = 0; press = null; }
      }

      sinceSurvey += dt;
      if (sinceSurvey > 0.2 && dirty) {
        var nothing = survey();
        dull = nothing && mode === 'falling' ? dull + sinceSurvey : 0;
        sinceSurvey = 0;
      }
      var settle = 1 - Math.exp(-dt * 5);
      lowNow += (low - lowNow) * settle;
      highNow += (high - highNow) * settle;

      env.live('zoom', inWords(HOME.scale / view.scale));
      env.live('digits', decimalPlace());
      env.live('steps', Gallery.formatCount(steps));
    }

    /* ---- drawing ---- */

    function build() {
      program = Gallery.gl.program(gl, VERTEX, FRAGMENT);
      copyProgram = Gallery.gl.program(gl, VERTEX, COPY_FRAGMENT);
      at = Gallery.gl.uniforms(gl, program, ['uAspect', 'uOrbit', 'uOrbitLength', 'uSteps', 'uScale', 'uPixel', 'uLow', 'uHigh', 'uShade']);
      copyAt = Gallery.gl.uniforms(gl, copyProgram, ['uAspect', 'uImage', 'uUse']);
      triangle = Gallery.gl.fullscreenTriangle(gl);
      orbitTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, orbitTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, REF_WIDTH, orbit.length / 2 / REF_WIDTH, 0, gl.RG, gl.FLOAT, orbit);
    }

    // The picture is drawn into a texture at whatever size keeps the fall smooth, then stretched to fit.
    function makeFrame() {
      if (frame) { gl.deleteTexture(frame.texture); gl.deleteFramebuffer(frame.buffer); }
      frame = { texture: gl.createTexture(), buffer: gl.createFramebuffer(), w: canvas.width, h: canvas.height };
      gl.bindTexture(gl.TEXTURE_2D, frame.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, frame.w, frame.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, frame.buffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frame.texture, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function render(full) {
      if (lost || !program || !frame) return;
      orbitLength = followInto(orbit, view.x, view.y, steps);
      var rows = Math.ceil(orbitLength / REF_WIDTH);
      gl.bindTexture(gl.TEXTURE_2D, orbitTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, REF_WIDTH, rows, gl.RG, gl.FLOAT, orbit.subarray(0, rows * REF_WIDTH * 2));

      var q = full ? 1 : quality;
      var w = Math.max(16, Math.round(frame.w * q)), h = Math.max(16, Math.round(frame.h * q));
      gl.bindFramebuffer(gl.FRAMEBUFFER, frame.buffer);
      gl.viewport(0, 0, w, h);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, orbitTexture);
      gl.uniform1i(at.uOrbit, 0);
      gl.uniform1i(at.uOrbitLength, orbitLength);
      gl.uniform1i(at.uSteps, steps);
      gl.uniform1f(at.uAspect, aspect());
      gl.uniform1f(at.uScale, view.scale);
      gl.uniform1f(at.uPixel, 2 / h);
      gl.uniform1f(at.uLow, lowNow);
      gl.uniform1f(at.uHigh, highNow);
      gl.uniform1f(at.uShade, size.w >= 900 ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(copyProgram);
      gl.bindTexture(gl.TEXTURE_2D, frame.texture);
      gl.uniform1i(copyAt.uImage, 0);
      gl.uniform1f(copyAt.uAspect, aspect());
      gl.uniform2f(copyAt.uUse, w / frame.w, h / frame.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // Fewer pixels when frames come late, more again when there is time to spare.
    function pace(dt) {
      if (dt > 1 / 45) { quality = Math.max(0.3, quality * 0.88); steady = 0; }
      else if (dt < 1 / 56 && ++steady > 40) { quality = Math.min(1, quality * 1.08); steady = 0; }
    }

    /* ---- wiring ---- */

    function place(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: ((e.clientX - rect.left) / rect.width * 2 - 1) * aspect(), y: 1 - (e.clientY - rect.top) / rect.height * 2 };
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || mode === 'rising') return;
      press = place(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      env.redraw();
    });
    canvas.addEventListener('pointermove', function (e) { if (press) press = place(e); });
    function lift() { press = null; }
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () { lost = false; frame = null; build(); makeFrame(); dirty = true; env.redraw(); });
    canvas.style.cursor = 'crosshair';

    var holdButton = env.room.querySelector('[data-bottom-hold]');
    function showHold() {
      if (!holdButton) return;
      holdButton.textContent = mode === 'held' ? 'Keep falling' : 'Hold still';
      holdButton.setAttribute('aria-pressed', String(mode === 'held'));
    }
    if (holdButton) {
      holdButton.addEventListener('click', function () {
        mode = mode === 'held' ? 'falling' : 'held';
        showHold();
        dirty = true;
        env.redraw();
      });
    }
    var upButton = env.room.querySelector('[data-bottom-up]');
    if (upButton) upButton.addEventListener('click', function () { mode = 'rising'; press = null; dirty = true; showHold(); });

    var speedDial = env.room.querySelector('[data-bottom-speed]');
    var speedReadout = env.room.querySelector('[data-bottom-speed-value]');
    function readSpeed() {
      rate = Number(speedDial.value) / 10;
      if (speedReadout) speedReadout.textContent = 'twice as close every ' + (1 / rate).toFixed(1) + ' seconds';
    }
    if (speedDial) { speedDial.addEventListener('input', readSpeed); readSpeed(); }

    try { build(); } catch (err) {
      env.fail('This work could not start its shaders on this graphics card. The other rooms still run.');
      return null;
    }
    nextTarget();

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 1.5);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        makeFrame();
        dirty = true;
      },
      frame: function (time, dt) {
        move(dt);
        if (!dirty) return;
        var resting = !press && (mode === 'held' || atFloor > 0);
        if (!resting) pace(dt);
        render(resting);                       // holding still earns a picture at full size, drawn once
        dirty = !resting;
      },
      // With motion paused: one finished picture, part of the way down.
      still: function () {
        if (view.scale > 1) {
          view.scale = 4e-6;
          offset.x = size.w >= 900 ? aspect() * 0.27 : 0; offset.y = 0;
          view.x = target.x - offset.x * view.scale; view.y = target.y;
          survey(); lowNow = low; highNow = high;
          env.live('zoom', inWords(HOME.scale / view.scale));
          env.live('digits', decimalPlace());
          env.live('steps', Gallery.formatCount(steps));
        }
        render(true);
      },
      // for checking the arithmetic from the console
      look: function () { return { x: view.x, y: view.y, scale: view.scale, steps: steps, low: lowNow, high: highNow, quality: quality, mode: mode, orbit: orbitLength }; },
      jump: function (x, y, scale) { view.x = x; view.y = y; view.scale = scale; target = { x: x, y: y }; offset.x = offset.y = 0; survey(); lowNow = low; highNow = high; dirty = true; }
    };
  });
})();
