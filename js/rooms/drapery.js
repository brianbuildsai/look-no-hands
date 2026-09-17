/* Drapery — room 17.

   There is no cloth, only a grid of points. Each point remembers where it
   was a moment ago and carries on in the same direction (that is all the
   physics there is: Verlet, 1967), gravity pulls it down, and then every
   thread between two points is put back to its proper length, over and over,
   until they more or less all agree (Jakobsen, 2001). Folds are what that
   argument looks like.

   The sheet can hang from pegs, or be let fall over a form that is never
   drawn: it is only there where the cloth touches it.

   The mesh is lit as silk: a soft wrapped light, a broad highlight, a sheen
   at grazing angles, and a blue lining on the back. */
(function () {
  'use strict';

  var WIDE = { across: 60, down: 46 }, NARROW = { across: 44, down: 34 };
  var CLOTH_W = 2.3, CLOTH_H = 1.75;
  var GRAVITY = -7.5;
  var ROUNDS = 5;                  // times a frame the threads are put back to length
  var FORMS = ['ball', 'figure', 'box'];

  var VERTEX = [
    'attribute vec3 aPosition;',
    'attribute vec3 aNormal;',
    'attribute float aHollow;',        // how far down a fold this point is
    'attribute vec2 aUv;',
    'uniform mat4 uCamera;',
    'uniform float uShift;',           // the picture is slid sideways on a wide screen, clear of the wall label
    'varying vec3 vNormal;',
    'varying vec3 vPlace;',
    'varying vec2 vUv;',
    'varying float vHollow;',
    'void main() {',
    '  vNormal = aNormal; vPlace = aPosition; vUv = aUv; vHollow = aHollow;',
    '  gl_Position = uCamera * vec4(aPosition, 1.0);',
    '  gl_Position.x += uShift * gl_Position.w;',
    '}'
  ].join('\n');

  var FRAGMENT = [
    'precision highp float;',
    'varying vec3 vNormal;',
    'varying vec3 vPlace;',
    'varying vec2 vUv;',
    'varying float vHollow;',
    'uniform vec3 uEye;',
    'uniform float uThreads;',
    'void main() {',
    '  vec3 n = normalize(vNormal);',
    '  float front = gl_FrontFacing ? 1.0 : -1.0;',
    '  n *= front;',
    '  vec3 v = normalize(uEye - vPlace);',
    // the weave: warp and weft catch the light a little differently
    '  float weave = sin(vUv.x * uThreads) * sin(vUv.y * uThreads);',
    '  vec3 silk = front > 0.0 ? vec3(0.80, 0.77, 0.72) : vec3(0.07, 0.11, 0.46);',
    '  silk *= 1.0 + 0.018 * weave;',
    // a warm key from upper right, a cool fill from the left; both wrap round, as light does through cloth
    '  vec3 keyDir = normalize(vec3(0.55, 0.75, 0.6)), fillDir = normalize(vec3(-0.8, 0.15, 0.45));',
    '  float key = max(0.0, (dot(n, keyDir) + 0.3) / 1.3);',
    '  float fill = max(0.0, (dot(n, fillDir) + 0.5) / 1.5);',
    '  vec3 colour = silk * (0.035 + key * key * vec3(1.0, 0.93, 0.82) * 0.95 + fill * vec3(0.30, 0.40, 1.0) * 0.30);',
    // the highlight of silk is broad, and there is a sheen where the cloth turns away
    '  vec3 h = normalize(keyDir + v);',
    '  colour += vec3(1.0, 0.95, 0.88) * pow(max(0.0, dot(n, h)), 22.0) * (front > 0.0 ? 0.42 : 0.2);',
    '  colour += (front > 0.0 ? vec3(1.0, 0.62, 0.66) : vec3(0.35, 0.5, 1.0)) * pow(1.0 - max(0.0, dot(n, v)), 4.0) * 0.16;',
    // folds keep their own shade
    '  colour *= 1.0 - 0.45 * smoothstep(0.0, 1.0, vHollow * front);',
    '  gl_FragColor = vec4(pow(colour, vec3(0.4545)), 1.0);',
    '}'
  ].join('\n');

  // the shadow on the floor: the same mesh, pressed flat along the direction of the light
  var SHADOW_VERTEX = [
    'attribute vec3 aPosition;',
    'uniform mat4 uCamera;',
    'uniform float uShift;',
    'varying float vHeight;',
    'void main() {',
    '  vec3 light = normalize(vec3(0.55, 0.75, 0.6));',
    '  vec3 pressed = aPosition - light * (aPosition.y / light.y);',
    '  vHeight = aPosition.y;',
    '  gl_Position = uCamera * vec4(pressed.x, 0.0, pressed.z, 1.0);',
    '  gl_Position.x += uShift * gl_Position.w;',
    '}'
  ].join('\n');
  var SHADOW_FRAGMENT = [
    'precision mediump float;',
    'varying float vHeight;',
    'void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.5 * (1.0 - clamp(vHeight / 2.4, 0.0, 0.8))); }'
  ].join('\n');

  // a pool of light on the floor for the shadow to fall in
  var FLOOR_VERTEX = [
    'attribute vec2 aCorner;',
    'uniform mat4 uCamera;',
    'uniform float uShift;',
    'varying vec2 vCorner;',
    'void main() {',
    '  vCorner = aCorner;',
    '  gl_Position = uCamera * vec4(aCorner.x * 3.2, 0.0, aCorner.y * 3.2, 1.0);',
    '  gl_Position.x += uShift * gl_Position.w;',
    '}'
  ].join('\n');
  var FLOOR_FRAGMENT = [
    'precision mediump float;',
    'varying vec2 vCorner;',
    'void main() { float d = length(vCorner); gl_FragColor = vec4(vec3(0.115, 0.11, 0.105) * pow(max(0.0, 1.0 - d), 1.6), 1.0); }'
  ].join('\n');

  /* ---- a camera, in sixteen numbers ---- */

  function perspective(fovY, aspect, near, far) {
    var f = 1 / Math.tan(fovY / 2);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0];
  }
  function lookAt(eye, at) {
    var zx = eye[0] - at[0], zy = eye[1] - at[1], zz = eye[2] - at[2];
    var l = Math.sqrt(zx * zx + zy * zy + zz * zz); zx /= l; zy /= l; zz /= l;
    var xx = zz, xy = 0, xz = -zx;                                  // up is +y
    l = Math.sqrt(xx * xx + xz * xz); xx /= l; xz /= l;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]), -(yx * eye[0] + yy * eye[1] + yz * eye[2]), -(zx * eye[0] + zy * eye[1] + zz * eye[2]), 1];
  }
  function multiply(a, b) {
    var out = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return out;
  }

  Gallery.register('drapery', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var context = Gallery.gl.context(canvas, { alpha: false, antialias: true, depth: true, stencil: false });
    if (!context) {
      env.fail('This work needs WebGL, which this browser does not offer. The other rooms still run.');
      return null;
    }
    var gl = context.gl;

    var grid = size.w >= 900 ? WIDE : NARROW;
    var NX = grid.across, NY = grid.down, COUNT = NX * NY;
    var now = new Float32Array(COUNT * 3), before = new Float32Array(COUNT * 3);
    var fixed = new Uint8Array(COUNT);                 // pegged points do not move
    var threads = null, lengths = null;               // pairs of points, and how far apart each pair should be
    var firmness = null;                              // the threads that only resist creasing are slack about it
    var mesh = new Float32Array(COUNT * 7);            // place, normal, hollow: what the graphics card is sent
    var mode = 'hang', form = 0, wind = 0.4, gust = 0, clock = 0;
    var held = null;                                  // { index, depth } while the visitor has hold of a point
    var pointerAt = null;
    var camera = null, eye = [0, 1.0, 5.4], sway = { x: 0, y: 0 };
    var programs = {}, buffers = {}, triangles = 0;
    var lost = false, settled = false;

    /* ---- the cloth ---- */

    function weave() {
      var pairs = [], x, y;
      var soft = [];
      function join(a, b, bend) { pairs.push(a, b); soft.push(bend ? 0.3 : 1); }
      for (y = 0; y < NY; y++) for (x = 0; x < NX; x++) {
        var i = y * NX + x;
        if (x + 1 < NX) join(i, i + 1);
        if (y + 1 < NY) join(i, i + NX);
        if (x + 1 < NX && y + 1 < NY) { join(i, i + NX + 1); join(i + 1, i + NX); }     // across the diagonals, against shear
        if (x + 2 < NX) join(i, i + 2, true);                                              // and skipping one, against creasing too sharply
        if (y + 2 < NY) join(i, i + 2 * NX, true);
      }
      threads = new Uint16Array(pairs);
      lengths = new Float32Array(pairs.length / 2);
      firmness = new Float32Array(soft);
      var sx = CLOTH_W / (NX - 1), sy = CLOTH_H / (NY - 1);
      for (var k = 0; k < lengths.length; k++) {
        var a = threads[k * 2], b = threads[k * 2 + 1];
        var dx = ((b % NX) - (a % NX)) * sx, dy = (((b / NX) | 0) - ((a / NX) | 0)) * sy;
        lengths[k] = Math.sqrt(dx * dx + dy * dy);
      }
      env.live('points', Gallery.formatCount(COUNT));
      env.live('threads', Gallery.formatCount(lengths.length));
    }

    function lay() {
      var x, y, i;
      fixed.fill(0);
      for (y = 0; y < NY; y++) for (x = 0; x < NX; x++) {
        i = (y * NX + x) * 3;
        var u = x / (NX - 1) - 0.5, v = y / (NY - 1);
        if (mode === 'hang') {
          // hanging flat, a little narrower than it is so that it swags between the pegs
          now[i] = u * CLOTH_W * 0.74; now[i + 1] = 2.02 - v * CLOTH_H; now[i + 2] = 0.09 * Math.sin(u * 23 + v * 3) * (0.3 + v);
        } else {
          // held out level above the form, about to be let go
          now[i] = u * CLOTH_W; now[i + 1] = 2.15 + 0.01 * Math.sin(u * 31); now[i + 2] = (v - 0.5) * CLOTH_H + (FORMS[form] === 'figure' ? 0 : 0.1);
        }
        before[i] = now[i]; before[i + 1] = now[i + 1]; before[i + 2] = now[i + 2];
      }
      if (mode === 'hang') {
        for (var peg = 0; peg < 5; peg++) fixed[Math.round(peg / 4 * (NX - 1))] = 1;
      }
      held = null; settled = false; clock = 0;
      env.redraw();
    }

    // keep a point out of the hidden form, and off the floor
    function collide(i) {
      var x = now[i], y = now[i + 1], z = now[i + 2], skin = 0.025, hit = false;
      function ball(cx, cy, cz, r) {
        var dx = x - cx, dy = y - cy, dz = z - cz, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < r + skin && d > 1e-6) { var k = (r + skin) / d; x = cx + dx * k; y = cy + dy * k; z = cz + dz * k; hit = true; }
      }
      if (FORMS[form] === 'ball') ball(0, 0.62, 0, 0.62);
      else if (FORMS[form] === 'figure') { ball(0, 0.46, 0, 0.46); ball(0, 1.1, 0, 0.29); }
      else {
        var hx = 0.5 + skin, top = 1.0 + skin;
        if (Math.abs(x) < hx && Math.abs(z) < hx && y < top) {
          // push out through whichever face is nearest
          var up = top - y, side = Math.min(hx - Math.abs(x), hx - Math.abs(z));
          if (up < side) y = top;
          else if (hx - Math.abs(x) < hx - Math.abs(z)) x = x < 0 ? -hx : hx;
          else z = z < 0 ? -hx : hx;
          hit = true;
        }
      }
      if (y < skin) { y = skin; hit = true; }
      if (hit) {
        // cloth does not slide freely over what it lies on
        before[i] += (x - before[i]) * 0.7; before[i + 1] += (y - before[i + 1]) * 0.7; before[i + 2] += (z - before[i + 2]) * 0.7;
        now[i] = x; now[i + 1] = y; now[i + 2] = z;
      }
    }

    function step(dt) {
      var i, k, p;
      clock += dt;
      gust *= Math.exp(-dt * 1.4);
      var blow = (wind * (0.55 + 0.45 * Math.sin(clock * 0.9) * Math.sin(clock * 0.37 + 1.0)) + gust) * (mode === 'hang' ? 1 : 0.25);
      var dt2 = dt * dt;
      for (p = 0; p < COUNT; p++) {
        if (fixed[p]) continue;
        i = p * 3;
        // the wind pushes on the cloth where the cloth faces it (the normal is left over from the last frame's drawing)
        var nx = mesh[p * 7 + 3], ny = mesh[p * 7 + 4], nz = mesh[p * 7 + 5];
        var ripple = 0.75 + 0.5 * Math.sin(clock * 2.3 + now[i] * 2.1 + now[i + 1] * 1.7);
        var push = (nz * 1.0 + nx * 0.25) * blow * ripple * 9.0;
        var vx = (now[i] - before[i]) * 0.992, vy = (now[i + 1] - before[i + 1]) * 0.992, vz = (now[i + 2] - before[i + 2]) * 0.992;
        before[i] = now[i]; before[i + 1] = now[i + 1]; before[i + 2] = now[i + 2];
        now[i] += vx + nx * push * dt2;
        now[i + 1] += vy + (GRAVITY + ny * push) * dt2;
        now[i + 2] += vz + nz * push * dt2;
      }
      if (held) follow();
      for (var round = 0; round < ROUNDS; round++) {
        for (k = 0; k < lengths.length; k++) {
          var a = threads[k * 2] * 3, b = threads[k * 2 + 1] * 3;
          var dx = now[b] - now[a], dy = now[b + 1] - now[a + 1], dz = now[b + 2] - now[a + 2];
          var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < 1e-7) continue;
          var fa = fixed[a / 3], fb = fixed[b / 3];
          if (fa && fb) continue;
          var give = (d - lengths[k]) / d * (fa || fb ? 1 : 0.5) * firmness[k];
          if (!fa) { now[a] += dx * give; now[a + 1] += dy * give; now[a + 2] += dz * give; }
          if (!fb) { now[b] -= dx * give; now[b + 1] -= dy * give; now[b + 2] -= dz * give; }
        }
        if (held) follow();
        if (mode === 'drape') for (p = 0; p < COUNT; p++) collide(p * 3);
      }
    }

    // the held point goes where the visitor's hand is, at the depth it was picked up
    function follow() {
      if (!held || !pointerAt) return;
      var ray = rayThrough(pointerAt.x, pointerAt.y);
      var t = (held.depth - ray.from[2]) / ray.along[2];
      var i = held.index * 3;
      now[i] = ray.from[0] + ray.along[0] * t; now[i + 1] = Math.max(0.03, ray.from[1] + ray.along[1] * t); now[i + 2] = held.depth;
      before[i] = now[i]; before[i + 1] = now[i + 1]; before[i + 2] = now[i + 2];
    }

    /* ---- drawing ---- */

    function build() {
      // attributes are given fixed slots, so the one mesh buffer can feed the cloth and its shadow alike
      function program(vertex, fragment, attributes) {
        var made = Gallery.gl.program(gl, vertex, fragment);
        attributes.forEach(function (name, slot) { gl.bindAttribLocation(made, slot, name); });
        gl.linkProgram(made);
        return made;
      }
      programs.cloth = program(VERTEX, FRAGMENT, ['aPosition', 'aNormal', 'aHollow', 'aUv']);
      programs.shadow = program(SHADOW_VERTEX, SHADOW_FRAGMENT, ['aPosition']);
      programs.floor = program(FLOOR_VERTEX, FLOOR_FRAGMENT, ['aCorner']);
      ['cloth', 'shadow', 'floor'].forEach(function (name) {
        programs[name].at = Gallery.gl.uniforms(gl, programs[name], ['uCamera', 'uShift', 'uEye', 'uThreads']);
      });
      var uv = new Float32Array(COUNT * 2), index = new Uint16Array((NX - 1) * (NY - 1) * 6), k = 0;
      for (var y = 0; y < NY; y++) for (var x = 0; x < NX; x++) {
        uv[(y * NX + x) * 2] = x / (NX - 1); uv[(y * NX + x) * 2 + 1] = y / (NY - 1);
        if (x + 1 < NX && y + 1 < NY) {
          var i = y * NX + x;
          index[k++] = i; index[k++] = i + NX; index[k++] = i + 1;
          index[k++] = i + 1; index[k++] = i + NX; index[k++] = i + NX + 1;
        }
      }
      triangles = k;
      buffers.mesh = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.mesh);
      gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.DYNAMIC_DRAW);
      buffers.uv = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
      gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
      buffers.index = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
      buffers.floor = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.floor);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    }

    // which way each point of the cloth faces, and how deep in a fold it lies
    function shape() {
      var spacing = CLOTH_W / (NX - 1);
      for (var y = 0; y < NY; y++) for (var x = 0; x < NX; x++) {
        var p = y * NX + x, i = p * 3, o = p * 7;
        var l = (y * NX + Math.max(0, x - 1)) * 3, r = (y * NX + Math.min(NX - 1, x + 1)) * 3;
        var u = (Math.max(0, y - 1) * NX + x) * 3, d = (Math.min(NY - 1, y + 1) * NX + x) * 3;
        var ax = now[r] - now[l], ay = now[r + 1] - now[l + 1], az = now[r + 2] - now[l + 2];
        var bx = now[d] - now[u], by = now[d + 1] - now[u + 1], bz = now[d + 2] - now[u + 2];
        var nx = by * az - bz * ay, ny = bz * ax - bx * az, nz = bx * ay - by * ax;
        var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= len; ny /= len; nz /= len;
        // a wider ring of neighbours: if they stand proud of this point, it is down in a fold
        var l2 = (y * NX + Math.max(0, x - 3)) * 3, r2 = (y * NX + Math.min(NX - 1, x + 3)) * 3;
        var u2 = (Math.max(0, y - 3) * NX + x) * 3, d2 = (Math.min(NY - 1, y + 3) * NX + x) * 3;
        var mx = (now[l2] + now[r2] + now[u2] + now[d2]) / 4 - now[i];
        var my = (now[l2 + 1] + now[r2 + 1] + now[u2 + 1] + now[d2 + 1]) / 4 - now[i + 1];
        var mz = (now[l2 + 2] + now[r2 + 2] + now[u2 + 2] + now[d2 + 2]) / 4 - now[i + 2];
        mesh[o] = now[i]; mesh[o + 1] = now[i + 1]; mesh[o + 2] = now[i + 2];
        mesh[o + 3] = nx; mesh[o + 4] = ny; mesh[o + 5] = nz;
        mesh[o + 6] = Math.max(-1, Math.min(1, (nx * mx + ny * my + nz * mz) / spacing * 0.6));
      }
    }

    function shift() { return size.w >= 900 ? 0.27 : 0; }

    function aim(dt) {
      var draped = mode === 'drape' ? 1 : 0, ease = 1 - Math.exp(-dt * 2.5);
      var want = [sway.x * 1.0, 1.05 + draped * 0.85 + sway.y * 0.35, size.w >= 900 ? 5.4 : 5.3 + draped * 1.3];     // a narrow screen stands further back for the fall
      for (var k = 0; k < 3; k++) eye[k] += (want[k] - eye[k]) * ease;
      var target = [0, 1.05 - draped * 0.35, 0];
      camera = { target: target, fov: 34 * Math.PI / 180, aspect: size.w / Math.max(1, size.h) };
      camera.matrix = multiply(perspective(camera.fov, camera.aspect, 0.5, 30), lookAt(eye, target));
    }

    function toScreen(i) {
      var m = camera.matrix, x = now[i], y = now[i + 1], z = now[i + 2];
      var cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
      return { x: (cx / cw + shift() + 1) / 2 * size.w, y: (1 - cy / cw) / 2 * size.h };
    }

    function rayThrough(px, py) {
      var ndcX = px / size.w * 2 - 1 - shift(), ndcY = 1 - py / size.h * 2;
      var fx = camera.target[0] - eye[0], fy = camera.target[1] - eye[1], fz = camera.target[2] - eye[2];
      var l = Math.sqrt(fx * fx + fy * fy + fz * fz); fx /= l; fy /= l; fz /= l;
      var rx = -fz, rz = fx; l = Math.sqrt(rx * rx + rz * rz); rx /= l; rz /= l;        // right = forward x up
      var ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;                            // up = right x forward
      var t = Math.tan(camera.fov / 2);
      return { from: eye.slice(), along: [fx + rx * ndcX * t * camera.aspect + ux * ndcY * t, fy + uy * ndcY * t, fz + rz * ndcX * t * camera.aspect + uz * ndcY * t] };
    }

    function render() {
      if (lost || !programs.cloth) return;
      shape();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.mesh);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh);

      var p;
      if (mode === 'drape') {
        gl.disable(gl.DEPTH_TEST);
        p = programs.floor;
        gl.useProgram(p);
        gl.uniformMatrix4fv(p.at.uCamera, false, camera.matrix);
        gl.uniform1f(p.at.uShift, shift());
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.floor);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        p = programs.shadow;
        gl.useProgram(p);
        gl.uniformMatrix4fv(p.at.uCamera, false, camera.matrix);
        gl.uniform1f(p.at.uShift, shift());
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.mesh);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawElements(gl.TRIANGLES, triangles, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.BLEND);
      }

      gl.enable(gl.DEPTH_TEST);
      p = programs.cloth;
      gl.useProgram(p);
      gl.uniformMatrix4fv(p.at.uCamera, false, camera.matrix);
      gl.uniform1f(p.at.uShift, shift());
      gl.uniform3f(p.at.uEye, eye[0], eye[1], eye[2]);
      gl.uniform1f(p.at.uThreads, NX * 5.0);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.mesh);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
      gl.drawElements(gl.TRIANGLES, triangles, gl.UNSIGNED_SHORT, 0);
      gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2); gl.disableVertexAttribArray(3);
    }

    /* ---- wiring ---- */

    function place(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || !camera) return;
      pointerAt = place(e);
      var best = -1, near = 46 * 46;
      for (var p = 0; p < COUNT; p++) {
        var s = toScreen(p * 3), d = (s.x - pointerAt.x) * (s.x - pointerAt.x) + (s.y - pointerAt.y) * (s.y - pointerAt.y);
        if (d < near) { near = d; best = p; }
      }
      if (best < 0) return;
      held = { index: best, depth: now[best * 3 + 2], wasFixed: fixed[best] };
      fixed[best] = 1;
      settled = false;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) {
      pointerAt = place(e);
      if (!held && e.pointerType === 'mouse') { sway.x = (pointerAt.x / size.w - 0.5) * 0.9; sway.y = (0.5 - pointerAt.y / size.h) * 0.9; }
    });
    function letGo() {
      if (held) fixed[held.index] = held.wasFixed;       // a peg that was moved stays a peg, where it was put
      held = null;
      canvas.style.cursor = 'grab';
    }
    canvas.addEventListener('pointerup', letGo);
    canvas.addEventListener('pointercancel', letGo);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () { lost = false; build(); env.redraw(); });
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';                   // the cloth is for handling

    var modeButtons = Array.prototype.slice.call(env.room.querySelectorAll('[data-drapery-mode]'));
    modeButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var asked = button.getAttribute('data-drapery-mode');
        if (asked === 'drape' && mode === 'drape') form = (form + 1) % FORMS.length;      // asked again: something else under it
        mode = asked;
        modeButtons.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
        lay();
      });
    });
    var gustButton = env.room.querySelector('[data-drapery-gust]');
    if (gustButton) gustButton.addEventListener('click', function () { gust = 1.6; settled = false; });
    var againButton = env.room.querySelector('[data-drapery-again]');
    if (againButton) againButton.addEventListener('click', lay);

    var windDial = env.room.querySelector('[data-drapery-wind]');
    var windReadout = env.room.querySelector('[data-drapery-wind-value]');
    function readWind() {
      var v = Number(windDial.value);
      wind = v / 10;
      if (windReadout) windReadout.textContent = v === 0 ? 'still air' : v < 4 ? 'a draught' : v < 8 ? 'a breeze' : 'a window left open';
    }
    if (windDial) { windDial.addEventListener('input', readWind); readWind(); }

    try { build(); } catch (err) {
      env.fail('This work could not start its shaders on this graphics card. The other rooms still run.');
      return null;
    }
    weave();
    lay();

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
      },
      frame: function (time, dt) {
        aim(dt);
        // two short steps a frame keep the threads stiff without making the cloth heavy
        var part = Math.min(dt, 1 / 30) / 2;
        step(part); step(part);
        render();
      },
      // With motion paused: let it fall and settle out of sight, then show it at rest.
      still: function () {
        aim(1);
        if (!settled && !held) { for (var i = 0; i < 360; i++) step(1 / 120); settled = true; }
        render();
      }
    };
  });
})();
