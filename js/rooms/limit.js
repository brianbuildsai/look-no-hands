/* Circle Limit — room 21.

   The hyperbolic plane, drawn in a disc (Poincare's picture of it): straight
   lines are arcs that meet the rim at right angles, and everything looks
   smaller toward the rim, which is infinitely far away.

   A tiling {p, q} has p-sided tiles with q of them meeting at every corner.
   On flat paper only {3,6}, {4,4} and {6,3} fit. Here there is room for any
   pair with (p - 2)(q - 2) greater than 4, because there is more room
   the further out you go.

   Nothing is stored. For every pixel, the point is reflected in three
   mirrors (two straight lines through the centre and one circular arc) again
   and again until it lands inside the single triangle the three mirrors
   enclose. How many reflections that took, odd or even, says whether the
   pixel is on a dark tile or a light one. (After Escher, who did it with a
   compass in 1958.)

   Dragging moves the plane, not the picture: the view is a Mobius
   transformation, kept in double precision here, composed with each drag,
   and quietly swapped for an equivalent one nearer home whenever it has
   wandered more than a tile away, so that it never loses precision. */
(function () {
  'use strict';

  var VERTEX = [
    '#version 300 es',
    'layout(location = 0) in vec2 aPosition;',
    'void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }'
  ].join('\n');

  var FRAGMENT = [
    '#version 300 es',
    'precision highp float;',
    'out vec4 outColor;',
    'uniform vec2 uCentre;',           // of the disc, in pixels
    'uniform float uRadius;',
    'uniform vec2 uA;',                // the view: z -> (A z + B) / (conj(B) z + conj(A))
    'uniform vec2 uB;',
    'uniform vec2 uMirror;',           // the normal of the straight mirror at angle pi / p
    'uniform vec2 uArc;',              // the circular mirror: how far out its centre is, and its radius
    'uniform vec2 uCorner;',           // where a tile corner falls inside the one triangle
    'uniform float uLook;',
    'uniform float uSpan;',            // from the middle of a tile to its corner, as the inhabitants measure it
    '',
    'vec2 times(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }',
    'vec2 over(vec2 a, vec2 b) { return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / dot(b, b); }',
    // distance as the inhabitants would measure it
    'float apart(vec2 a, vec2 b) { vec2 d = a - b; return acosh(1.0 + 2.0 * dot(d, d) / max(1.0e-6, (1.0 - dot(a, a)) * (1.0 - dot(b, b)))); }',
    '',
    'vec3 tile(vec2 z) {',
    '  float rim = dot(z, z);',
    '  if (rim >= 1.0) return vec3(0.0);',
    '  float grain = (1.0 - rim) * uRadius;',          // roughly how many pixels a tile is across, out here
    '  z = over(times(uA, z) + uB, times(vec2(uB.x, -uB.y), z) + vec2(uA.x, -uA.y));',
    '  float flips = 0.0;',
    '  for (int i = 0; i < 56; i++) {',
    '    float moved = 0.0;',
    '    if (z.y < 0.0) { z.y = -z.y; flips += 1.0; moved = 1.0; }',
    '    float side = dot(z, uMirror);',
    '    if (side > 0.0) { z -= 2.0 * side * uMirror; flips += 1.0; moved = 1.0; }',
    '    vec2 off = z - vec2(uArc.x, 0.0);',
    '    float o2 = dot(off, off);',
    '    if (o2 < uArc.y * uArc.y) { z = vec2(uArc.x, 0.0) + off * (uArc.y * uArc.y / o2); flips += 1.0; moved = 1.0; }',
    '    if (moved < 0.5) break;',
    '  }',
    '  float odd = mod(flips, 2.0);',
    '  float scale = 2.0 / (1.0 - dot(z, z));',        // how much bigger distances really are than they look, here
    '  float toAxis = z.y * scale, toMirror = -dot(z, uMirror) * scale, toArc = (length(z - vec2(uArc.x, 0.0)) - uArc.y) * scale;',
    '  vec3 bone = vec3(0.91, 0.90, 0.87);',
    '  vec3 colour;',
    '  if (uLook < 0.5) {',
    // woodcut: every other triangle is left uncut
    '    colour = odd > 0.5 ? bone * 0.92 : vec3(0.0);',
    '  } else if (uLook < 1.5) {',
    // lines: the edges of the tiles in bone, the lines of symmetry inside them fainter
    '    float pixel = 2.0 / max(grain, 0.001);',
    '    float edge = 1.0 - smoothstep(0.012, 0.012 + pixel, toArc);',
    '    float inner = 1.0 - smoothstep(0.004, 0.004 + pixel, min(toAxis, toMirror));',
    '    colour = bone * max(edge * 0.95, inner * 0.3);',
    '  } else {',
    // lanterns: a light at the middle of every tile and another at every corner
    // (sized by the tile, so that small tiles get small lanterns and the dark between them survives)
    '    float middle = apart(z, vec2(0.0)) / uSpan, corner = apart(z, uCorner) / uSpan, side = toArc / uSpan;',
    '    colour = vec3(1.0, 0.70, 0.28) * exp(-middle * middle * 11.0) + vec3(0.24, 0.36, 1.0) * exp(-corner * corner * 14.0) * 1.15;',
    '    colour += vec3(1.0, 0.31, 0.48) * exp(-side * side * 500.0) * 0.3;',
    '  }',
    // far out the tiles are smaller than a pixel: let them merge into an even tone instead of glittering
    '  vec3 merged = uLook < 0.5 ? bone * 0.42 : uLook < 1.5 ? bone * 0.2 : vec3(0.12, 0.09, 0.16);',
    '  colour = mix(merged, colour, smoothstep(1.2, 5.0, grain));',
    '  return colour * smoothstep(0.0, 2.5, grain);',
    '}',
    '',
    'void main() {',
    '  vec3 sum = vec3(0.0);',
    '  for (int k = 0; k < 4; k++) {',
    '    vec2 jitter = vec2(float(k % 2), float(k / 2)) * 0.5 - 0.25;',
    '    sum += tile((gl_FragCoord.xy + jitter - uCentre) / uRadius);',
    '  }',
    '  vec3 colour = sum * 0.25;',
    '  float d = abs(length(gl_FragCoord.xy - uCentre) - uRadius);',
    '  colour = max(colour, vec3(0.91, 0.90, 0.87) * 0.5 * (1.0 - smoothstep(0.4, 1.4, d)));',     // the rim
    '  outColor = vec4(colour, 1.0);',
    '}'
  ].join('\n');

  /* ---- Mobius maps z -> (a z + b) / (conj(b) z + conj(a)), as { a: [re, im], b: [re, im] } ---- */

  function mul(p, q) { return [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]]; }
  function bar(p) { return [p[0], -p[1]]; }
  function compose(m, n) {            // m after n
    var a = mul(m.a, n.a), t = mul(m.b, bar(n.b)), b = mul(m.a, n.b), u = mul(m.b, bar(n.a));
    return tidy({ a: [a[0] + t[0], a[1] + t[1]], b: [b[0] + u[0], b[1] + u[1]] });
  }
  function tidy(m) {                  // |a|^2 - |b|^2 should be 1: keep it so
    var k = Math.sqrt(m.a[0] * m.a[0] + m.a[1] * m.a[1] - m.b[0] * m.b[0] - m.b[1] * m.b[1]) || 1;
    return { a: [m.a[0] / k, m.a[1] / k], b: [m.b[0] / k, m.b[1] / k] };
  }
  function inverse(m) { return { a: bar(m.a), b: [-m.b[0], -m.b[1]] }; }
  function turn(angle) { return { a: [Math.cos(angle / 2), Math.sin(angle / 2)], b: [0, 0] }; }
  function slide(t) {                 // the translation that carries the centre to t
    var k = 1 / Math.sqrt(Math.max(1e-9, 1 - t[0] * t[0] - t[1] * t[1]));
    return { a: [k, 0], b: [t[0] * k, t[1] * k] };
  }
  function apply(m, z) {
    var top = mul(m.a, z), bottom = mul(bar(m.b), z);
    top = [top[0] + m.b[0], top[1] + m.b[1]]; bottom = [bottom[0] + m.a[0], bottom[1] - m.a[1]];
    var d = bottom[0] * bottom[0] + bottom[1] * bottom[1];
    return [(top[0] * bottom[0] + top[1] * bottom[1]) / d, (top[1] * bottom[0] - top[0] * bottom[1]) / d];
  }

  Gallery.register('limit', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var context = Gallery.gl.context(canvas, { alpha: false, antialias: false, depth: false, stencil: false }, true);
    if (!context) {
      env.fail('This work needs WebGL 2, which this browser does not offer. The other rooms still run.');
      return null;
    }
    var gl = context.gl;

    var p = 7, q = 3, look = 0;
    var arc = { far: 1, radius: 1 }, corner = [0, 0];
    var view = { a: [1, 0], b: [0, 0] };                 // where the plane has been dragged to
    var disc = { x: 0, y: 0, r: 100 };
    var drag = null, coast = [0, 0], idle = 99, clock = 0;
    var program, at, triangle, lost = false;

    // the three mirrors of a {p, q} tiling
    function mirrors() {
      var sp = Math.sin(Math.PI / p), cq = Math.cos(Math.PI / q), room = cq * cq - sp * sp;
      arc.far = Math.sqrt(cq * cq / room);
      arc.radius = Math.sqrt(sp * sp / room);
      var cp = Math.cos(Math.PI / p), rho = arc.far * cp - Math.sqrt(Math.max(0, arc.far * arc.far * cp * cp - 1));
      corner = [rho * cp, rho * sp];
    }

    function valid(sides, meeting) { return (sides - 2) * (meeting - 2) > 4; }

    // If the middle of the screen has wandered off the central tile, step back toward it through the
    // tile's edges: each step is a symmetry of the tiling, so the picture is unchanged, only the numbers are smaller.
    function home() {
      for (var tries = 0; tries < 6; tries++) {
        var back = inverse(view), middle = apply(back, [0, 0]);
        var rim = Math.sqrt(corner[0] * corner[0] + corner[1] * corner[1]) + 0.02;      // anything further out than a corner is off the central tile
        if (middle[0] * middle[0] + middle[1] * middle[1] < rim * rim) return;
        var sector = Math.round(Math.atan2(middle[1], middle[0]) / (2 * Math.PI / p));
        // turn so the offending edge lies on the real axis, then through that edge (a reflection in the arc after one in the axis)
        var through = { a: [0, arc.far / arc.radius], b: [0, -1 / arc.radius] };
        var step = compose(through, turn(-sector * 2 * Math.PI / p));
        view = compose(view, inverse(step));
      }
    }

    function build() {
      program = Gallery.gl.program(gl, VERTEX, FRAGMENT);
      at = Gallery.gl.uniforms(gl, program, ['uCentre', 'uRadius', 'uA', 'uB', 'uMirror', 'uArc', 'uCorner', 'uLook', 'uSpan']);
      triangle = Gallery.gl.fullscreenTriangle(gl);
    }

    function render() {
      if (lost || !program) return;
      var ratio = canvas.width / size.w, back = inverse(view);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(at.uCentre, disc.x * ratio, (size.h - disc.y) * ratio);
      gl.uniform1f(at.uRadius, disc.r * ratio);
      gl.uniform2f(at.uA, back.a[0], back.a[1]);
      gl.uniform2f(at.uB, back.b[0], back.b[1]);
      gl.uniform2f(at.uMirror, -Math.sin(Math.PI / p), Math.cos(Math.PI / p));
      gl.uniform2f(at.uArc, arc.far, arc.radius);
      gl.uniform2f(at.uCorner, corner[0], corner[1]);
      gl.uniform1f(at.uLook, look);
      var out = Math.sqrt(corner[0] * corner[0] + corner[1] * corner[1]);
      gl.uniform1f(at.uSpan, Math.log((1 + out) / (1 - out)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function move(dt) {
      clock += dt;
      idle += dt;
      if (!drag) {
        var speed = Math.sqrt(coast[0] * coast[0] + coast[1] * coast[1]);
        if (speed > 1e-5) {
          // let go while moving: it coasts
          view = compose(slide([coast[0] * dt, coast[1] * dt]), view);
          var slow = Math.exp(-dt * 1.6);
          coast[0] *= slow; coast[1] *= slow;
        }
        if (idle > 2.5) {
          // left alone, the plane drifts past and turns slowly, so that there is always somewhere new coming in from the rim
          var ease = Math.min(1, (idle - 2.5) / 2), heading = clock * 0.07;
          view = compose(slide([Math.cos(heading) * 0.09 * dt * ease, Math.sin(heading) * 0.09 * dt * ease]), view);
          view = compose(turn(0.03 * dt * ease), view);
        }
      }
      home();
    }

    /* ---- wiring ---- */

    function place(e) {
      var rect = canvas.getBoundingClientRect();
      var z = [(e.clientX - rect.left - disc.x) / disc.r, -(e.clientY - rect.top - disc.y) / disc.r];
      var far = Math.sqrt(z[0] * z[0] + z[1] * z[1]);
      if (far > 0.94) { z[0] *= 0.94 / far; z[1] *= 0.94 / far; }     // nobody can take hold of the rim: it is infinitely far away
      return z;
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      drag = { at: place(e), time: performance.now() };
      coast = [0, 0]; idle = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var to = place(e), from = drag.at, now = performance.now(), dt = Math.max(0.004, (now - drag.time) / 1000);
      // the point of the plane under the hand stays under the hand
      view = compose(compose(slide(to), slide([-from[0], -from[1]])), view);
      coast = [coast[0] * 0.6 + (to[0] - from[0]) / dt * 0.4, coast[1] * 0.6 + (to[1] - from[1]) / dt * 0.4];
      drag.at = to; drag.time = now; idle = 0;
      home();
      env.redraw();
    });
    function release() {
      if (drag && performance.now() - drag.time > 120) coast = [0, 0];
      drag = null; idle = 0;
      canvas.style.cursor = 'grab';
    }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () { lost = false; build(); env.redraw(); });
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';

    var sidesDial = env.room.querySelector('[data-limit-sides]'), meetDial = env.room.querySelector('[data-limit-meet]');
    var sidesReadout = env.room.querySelector('[data-limit-sides-value]'), meetReadout = env.room.querySelector('[data-limit-meet-value]');
    function read(changed) {
      p = Number(sidesDial.value); q = Number(meetDial.value);
      // flat paper has room for {3,6}, {4,4} and {6,3} and nothing bigger; anything that small is pushed up to the nearest tiling that needs this much room
      while (!valid(p, q)) { if (changed === 'sides') q++; else p++; }
      sidesDial.value = p; meetDial.value = q;
      if (sidesReadout) sidesReadout.textContent = p;
      if (meetReadout) meetReadout.textContent = q;
      env.live('p', p); env.live('q', q);
      mirrors();
      view = { a: [1, 0], b: [0, 0] };
      env.redraw();
    }
    if (sidesDial && meetDial) {
      sidesDial.addEventListener('input', function () { read('sides'); });
      meetDial.addEventListener('input', function () { read('meet'); });
    }
    var lookButtons = Array.prototype.slice.call(env.room.querySelectorAll('[data-limit-look]'));
    lookButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        look = Number(button.getAttribute('data-limit-look'));
        lookButtons.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
        env.redraw();
      });
    });

    try { build(); } catch (err) {
      env.fail('This work could not start its shaders on this graphics card. The other rooms still run.');
      return null;
    }
    mirrors();
    if (sidesDial && meetDial) read('sides'); else { env.live('p', p); env.live('q', q); }

    return {
      adaptive: true,
      resize: function () {
        var ratio = Math.min(size.dpr, 2) * (size.scale || 1);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wide = size.w >= 900;
        disc.x = size.w * (wide ? 0.645 : 0.5);
        disc.y = size.h * (wide ? 0.515 : 0.52);
        disc.r = wide ? Math.min(size.w * 0.33, size.h * 0.44) : Math.min(size.w * 0.47, size.h * 0.45);
      },
      frame: function (time, dt) { move(dt); render(); },
      still: function () { render(); },
      where: function () { return { p: p, q: q, view: view, arc: arc, middle: apply(inverse(view), [0, 0]) }; }
    };
  });
})();
