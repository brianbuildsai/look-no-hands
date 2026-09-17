/* Quicksilver — room 1.

   There is no mesh here. The metal is a distance function: six spheres
   blended with a smooth minimum, so they pull toward each other like
   liquid. For every pixel the shader walks a ray forward by exactly the
   distance to the nearest surface until it lands, then lights what it hit
   with a small imaginary photo studio. One sphere follows the pointer. */
(function () {
  'use strict';

  var CAM = 5.2;
  var FOCAL = 2.2;
  var TETHER = 1.85;
  var DROP_Z = 0.35;
  var MAX_RENDER_DPR = 1.5;

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
    'uniform float uIntro;',
    'uniform vec4 uBalls[6];',
    'const float CAM = 5.2;',
    'const float FOCAL = 2.2;',
    'const float BOUND = 2.6;',
    '',
    'float smin(float a, float b, float k) {',
    '  float h = max(k - abs(a - b), 0.0) / k;',
    '  return min(a, b) - h * h * k * 0.25;',
    '}',
    '',
    'float map(vec3 p) {',
    '  float d = length(p - uBalls[0].xyz) - uBalls[0].w;',
    '  for (int i = 1; i < 6; i++) {',
    '    d = smin(d, length(p - uBalls[i].xyz) - uBalls[i].w, 0.55);',
    '  }',
    '  d += 0.016 * sin(p.x * 5.0 + uTime * 0.9) * sin(p.y * 4.3 - uTime * 0.7) * sin(p.z * 4.7 + uTime * 0.5);',
    '  return d;',
    '}',
    '',
    'vec3 normalAt(vec3 p) {',
    '  const vec2 e = vec2(1.0, -1.0) * 0.0015;',
    '  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) +',
    '                   e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));',
    '}',
    '',
    '// A standing tube light: a band of azimuth, a span of elevation.',
    'float tube(float az, float el, float centre, float halfWidth, float lo, float hi) {',
    '  float across = 1.0 - smoothstep(halfWidth, halfWidth + 0.04, abs(az - centre));',
    '  float along = smoothstep(lo - 0.05, lo, el) * (1.0 - smoothstep(hi, hi + 0.05, el));',
    '  return across * along;',
    '}',
    '',
    '// The studio the metal reflects. Crisp shapes are what make chrome read',
    '// as chrome: a seamed softbox overhead, a blue tube to the left, an amber',
    '// one to the right, a hairline white one, and a rose kicker from below.',
    'vec3 studio(vec3 r) {',
    '  float az = atan(r.x, r.z);',
    '  float el = r.y;',
    '  vec3 c = mix(vec3(0.030, 0.010, 0.030), vec3(0.008, 0.016, 0.050), smoothstep(-0.6, 0.6, el));',
    '  vec2 q = r.xz / max(r.y, 0.05);',
    '  float panel = smoothstep(0.05, 0.12, r.y)',
    '    * (1.0 - smoothstep(0.62, 0.70, abs(q.x)))',
    '    * (1.0 - smoothstep(0.90, 1.00, abs(q.y - 0.35)));',
    '  panel *= 0.78 + 0.22 * smoothstep(0.015, 0.04, abs(fract(q.x * 1.6 + 0.5) - 0.5));',
    '  c += panel * vec3(1.0, 0.95, 0.88) * 2.3;',
    '  c += tube(az, el, -1.05, 0.10, -0.55, 0.62) * vec3(0.22, 0.36, 1.0) * 3.2;',
    '  c += tube(az, el, 1.15, 0.13, -0.40, 0.50) * vec3(1.0, 0.66, 0.24) * 2.6;',
    '  c += tube(az, el, 0.62, 0.02, -0.70, 0.70) * vec3(0.9, 0.95, 1.0) * 1.5;',
    '  c += smoothstep(0.2, 1.0, r.y) * vec3(0.9, 0.9, 1.0) * 0.10;',
    '  c += smoothstep(0.35, 0.95, dot(r, normalize(vec3(0.15, -0.88, -0.35)))) * vec3(1.0, 0.29, 0.47) * 1.1;',
    '  c += smoothstep(0.55, 1.0, dot(r, normalize(vec3(-0.7, 0.1, -0.7)))) * vec3(0.2, 0.3, 1.0) * 0.9;',
    '  return c;',
    '}',
    '',
    'float occlusion(vec3 p, vec3 n) {',
    '  float o = 0.0;',
    '  float w = 1.0;',
    '  for (int i = 1; i <= 4; i++) {',
    '    float h = 0.07 * float(i);',
    '    o += (h - map(p + n * h)) * w;',
    '    w *= 0.6;',
    '  }',
    '  return clamp(1.0 - 2.0 * o, 0.0, 1.0);',
    '}',
    '',
    'float hash(vec2 p) {',
    '  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);',
    '}',
    '',
    'void main() {',
    '  vec2 uv = (gl_FragCoord.xy - uFocus) / uUnit;',
    '  vec3 ro = vec3(0.0, 0.0, CAM);',
    '  vec3 rd = normalize(vec3(uv, -FOCAL));',
    '',
    '  // Skip every pixel whose ray misses the sphere that bounds the scene.',
    '  float b = dot(ro, rd);',
    '  float h = b * b - (dot(ro, ro) - BOUND * BOUND);',
    '  if (h < 0.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }',
    '  h = sqrt(h);',
    '  float t = -b - h;',
    '  float tFar = -b + h;',
    '',
    '  float pixel = 1.0 / (FOCAL * uUnit);  // how much of the scene one pixel spans, per unit distance',
    '  float glow = 0.0;',
    '  float nearest = 1e5;',
    '  float tNearest = t;',
    '  bool hit = false;',
    '  for (int i = 0; i < 72; i++) {',
    '    float d = map(ro + rd * t);',
    '    if (d < 0.5 * pixel * t) { hit = true; break; }',
    '    if (d < nearest) { nearest = d; tNearest = t; }',
    '    glow += exp(-d * 5.0) * min(d, 0.25);',
    '    t += d * 0.9;',
    '    if (t > tFar) break;',
    '  }',
    '  // Rays that only graze the surface are blended in by how close they',
    '  // came, which softens the silhouette without rendering anything twice.',
    '  float cover = hit ? 1.0 : 1.0 - smoothstep(0.0, 2.0 * pixel * tNearest, nearest);',
    '  vec3 p = ro + rd * (hit ? t : tNearest);',
    '',
    '  // Haze around the body, faded out before the bounding sphere ends.',
    '  float miss = length(cross(ro, rd));',
    '  glow *= smoothstep(BOUND, BOUND * 0.5, miss) * (0.5 + 2.5 * (1.0 - uIntro));',
    '  vec3 color = glow * mix(vec3(0.07, 0.13, 0.85), vec3(0.75, 0.2, 0.42), smoothstep(-0.6, 0.9, -uv.y)) * 0.55;',
    '',
    '  if (cover > 0.0) {',
    '    vec3 n = normalAt(p);',
    '    vec3 v = -rd;',
    '    float ndv = clamp(dot(n, v), 0.0, 1.0);',
    '    vec3 r = reflect(rd, n);',
    '    float fresnel = pow(1.0 - ndv, 5.0);',
    '    // A thin film over the metal: colour that turns with the viewing angle.',
    '    vec3 film = 0.5 + 0.5 * cos(6.2831 * (ndv * 1.15 + n.y * 0.18 + vec3(0.02, 0.36, 0.68)) + uTime * 0.12);',
    '    vec3 tint = mix(vec3(0.86, 0.88, 0.93), film * 1.35, pow(1.0 - ndv, 1.6) * 0.8);',
    '    float ao = occlusion(p, n);',
    '    vec3 metal = studio(r) * tint * (0.62 + 0.38 * fresnel);',
    '    metal *= 0.25 + 0.75 * ao;',
    '    metal += fresnel * vec3(0.10, 0.16, 0.55) * 0.35;',
    '    color = mix(color, metal + color * 0.25, cover);',
    '  }',
    '',
    '  color = 1.0 - exp(-color * 1.25);',
    '  color = pow(color, vec3(0.4545));',
    '  color += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * (1.5 / 255.0);',
    '  gl_FragColor = vec4(max(color, 0.0), 1.0);',
    '}'
  ].join('\n');

  function easeOutCubic(x) { var k = 1 - x; return 1 - k * k * k; }

  Gallery.register('quicksilver', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pointer = env.pointer;
    var context = Gallery.gl.context(canvas, { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!context) {
      env.fail('This work is drawn by your graphics card, and this browser has WebGL switched off. The other rooms still run.');
      return null;
    }
    var gl = context.gl;
    var program, uniforms, triangle;
    var lost = false;

    var balls = new Float32Array(24);
    var focus = { x: 0, y: 0, unit: 100 };
    var drop = { x: 1.3, y: 0.4, vx: 0, vy: 0 };
    var introStart = -1;
    var intro = 0;

    function build() {
      program = Gallery.gl.program(gl, VERTEX, FRAGMENT);
      uniforms = Gallery.gl.uniforms(gl, program, ['uFocus', 'uUnit', 'uTime', 'uIntro', 'uBalls']);
      triangle = Gallery.gl.fullscreenTriangle(gl);
      gl.useProgram(program);
      var location = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    }

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () { build(); lost = false; env.redraw(); });
    build();

    // Where the body hangs: right of the headline on wide screens, in the
    // empty space above it on narrow ones.
    function placeFocus() {
      var w = size.w, h = size.h;
      if (w >= 900) {
        focus.x = w * 0.69;
        focus.y = h * 0.46;
        focus.unit = Math.min(w * 0.42, h * 0.62);
      } else {
        var title = env.room.querySelector('.hero__title');
        var stageTop = canvas.getBoundingClientRect().top;
        var titleTop = title ? title.getBoundingClientRect().top - stageTop : h * 0.44;
        var top = 56;
        focus.x = w * 0.5;
        focus.y = (top + titleTop) * 0.5 + 8;
        focus.unit = Math.max(120, Math.min(w * 0.7, (titleTop - top) * 0.95));
      }
    }

    function resize() {
      var ratio = Math.min(size.dpr, MAX_RENDER_DPR) * size.scale;
      canvas.width = Math.max(1, Math.round(size.w * ratio));
      canvas.height = Math.max(1, Math.round(size.h * ratio));
      placeFocus();
      env.live('size', canvas.width + ' × ' + canvas.height);
    }

    function moveBalls(time, dt, e) {
      var spread = 1 + (1 - e) * 2.4;
      var radii = [0.62, 0.55, 0.49, 0.43];
      for (var i = 0; i < 4; i++) {
        var a = time * (0.23 + i * 0.045) + i * 1.9;
        balls[i * 4] = Math.sin(a + i * 1.7) * 0.8 * spread;
        balls[i * 4 + 1] = Math.cos(a * 0.83 + i * 2.3) * 0.62 * spread;
        balls[i * 4 + 2] = Math.sin(a * 0.61 + i * 0.9) * 0.6 * spread;
        balls[i * 4 + 3] = radii[i] * (0.92 + 0.08 * Math.sin(time * 0.5 + i * 2.1)) * e;
      }
      // a satellite on a wide orbit that leaves and rejoins on its own
      var s = time * 0.31 + 2.0;
      balls[16] = Math.cos(s) * 1.5 * spread;
      balls[17] = Math.sin(s * 1.3) * 0.85 * spread;
      balls[18] = Math.sin(s) * 0.8;
      balls[19] = 0.23 * e;

      // the drop: toward the pointer, or wandering when nobody is there
      var tx, ty;
      var idle = !pointer.inside || performance.now() - pointer.moved > 5000;
      if (idle) {
        var w = time * 0.42;
        tx = Math.cos(w) * 1.35;
        ty = Math.sin(w * 1.7) * 0.8;
      } else {
        var k = (CAM - DROP_Z) / FOCAL / focus.unit;
        tx = (pointer.x - focus.x) * k;
        ty = -(pointer.y - focus.y) * k;
        // It goes exactly where the pointer is until it nears the end of its
        // tether, then eases to a stop instead of hitting a wall.
        var len = Math.sqrt(tx * tx + ty * ty);
        var free = TETHER * 0.65;
        if (len > free) {
          var slack = TETHER - free;
          var reach = (free + slack * Math.tanh((len - free) / slack)) / len;
          tx *= reach;
          ty *= reach;
        }
      }
      if (dt > 0) {
        var stiffness = idle ? 6 : 42;
        drop.vx += (tx - drop.x) * stiffness * dt;
        drop.vy += (ty - drop.y) * stiffness * dt;
        var damping = Math.exp(-(idle ? 3 : 7.5) * dt);
        drop.vx *= damping;
        drop.vy *= damping;
        drop.x += drop.vx * dt;
        drop.y += drop.vy * dt;
      }
      balls[20] = drop.x * spread;
      balls[21] = drop.y * spread;
      balls[22] = DROP_Z;
      balls[23] = 0.3 * e;
    }

    function draw(time, dt) {
      if (lost) return;
      var e = easeOutCubic(intro);
      moveBalls(time, dt, e);

      var ratio = canvas.width / size.w;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.uniform2f(uniforms.uFocus, focus.x * ratio, (size.h - focus.y) * ratio);
      gl.uniform1f(uniforms.uUnit, focus.unit * ratio);
      gl.uniform1f(uniforms.uTime, time % 1000);
      gl.uniform1f(uniforms.uIntro, e);
      gl.uniform4fv(uniforms.uBalls, balls);
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    return {
      adaptive: true,
      resize: resize,
      frame: function (time, dt) {
        // The body condenses over a few seconds, starting when the page is revealed.
        if (introStart < 0 && env.revealed()) { introStart = time; placeFocus(); }
        if (introStart >= 0) intro = Gallery.clamp((time - introStart) / 2.8, 0, 1);
        draw(time, dt);
      },
      still: function (time) { intro = 1; draw(time, 0); },
      reveal: function () { placeFocus(); }
    };
  });
})();
