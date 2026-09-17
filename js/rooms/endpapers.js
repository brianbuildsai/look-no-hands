/* Endpapers — room 10.

   Paper marbling, done with algebra (after Aubrey Jaffer's "mathematical
   marbling"). Every tool is a map that moves the whole surface and can be
   undone exactly:

     an ink drop of radius r at C pushes every point P out to
         C + (P - C) * sqrt(1 + r^2 / |P - C|^2)
     a tine drawn along a line drags each point along it by z / 2^(d/c),
         d being the point's distance from the line
     a swirl turns each point about C by an angle that fades with distance.

   Nothing is ever painted. The sheet is only a list of strokes. To colour a
   pixel, the shader starts at that pixel and undoes the strokes one by one,
   newest first, until it lands inside some ink drop (that is its colour) or
   runs out of strokes (it is bare bath). */
(function () {
  'use strict';

  var MAX_STROKES = 96;
  var INKS = [[0.98, 0.68, 0.25], [0.17, 0.28, 0.88], [0.94, 0.27, 0.45], [0.91, 0.89, 0.84], [0.025, 0.028, 0.045]];
  var DROP = 0, TINE = 1, SWIRL = 2;

  var VERTEX = '#version 300 es\nlayout(location = 0) in vec2 aPosition;\nvoid main() { gl_Position = vec4(aPosition, 0.0, 1.0); }';

  var FRAGMENT = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec4 uSheet;        // where the sheet is on the canvas: x, y from lower left, width, height, in canvas pixels',
    'uniform vec2 uSize;         // the sheet\'s size in its own units (stage pixels)',
    'uniform int uCount;',
    'uniform vec4 uA[96];        // per stroke: x, y, first number, kind',
    'uniform vec4 uB[96];        // per stroke: the other numbers',
    'uniform vec3 uInk[5];',
    'uniform sampler2D uBase;    // an older sheet, flattened, under the strokes',
    'uniform float uHasBase;',
    'uniform float uFine;        // 1: take four samples a pixel',
    'uniform float uPaper;       // 1: add paper grain (not when flattening)',
    'out vec4 outColor;',
    '',
    'vec3 inkAt(vec2 p) {',
    '  for (int i = 0; i < 96; i++) {',
    '    if (i >= uCount) break;',
    '    vec4 a = uA[uCount - 1 - i], b = uB[uCount - 1 - i];',
    '    if (a.w < 0.5) {                       // undo a drop',
    '      vec2 d = p - a.xy;',
    '      float d2 = dot(d, d), r2 = a.z * a.z;',
    '      if (d2 < r2) return uInk[int(b.w + 0.5)];',
    '      p = a.xy + d * sqrt(1.0 - r2 / d2);',
    '    } else if (a.w < 1.5) {                // undo a tine, or a whole comb of them',
    '      vec2 along = b.xy;',
    '      float d = dot(p - a.xy, vec2(-along.y, along.x));',
    '      d = b.w > 0.0 ? abs(mod(d + b.w * 0.5, b.w) - b.w * 0.5) : abs(d);',
    '      p -= along * a.z * exp2(-d / b.z);',
    '    } else {                               // undo a swirl',
    '      vec2 d = p - a.xy;',
    '      float turn = -a.z * exp2(-length(d) / b.x);',
    '      float c = cos(turn), s = sin(turn);',
    '      p = a.xy + vec2(c * d.x - s * d.y, s * d.x + c * d.y);',
    '    }',
    '  }',
    '  if (uHasBase > 0.5) return texture(uBase, vec2(p.x, uSize.y - p.y) / uSize).rgb;',
    '  return vec3(0.035, 0.045, 0.09);',
    '}',
    '',
    'void main() {',
    '  vec2 q = gl_FragCoord.xy - uSheet.xy;',
    '  if (q.x < 0.0 || q.y < 0.0 || q.x > uSheet.z || q.y > uSheet.w) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }',
    '  float unit = uSize.x / uSheet.z;            // sheet units per canvas pixel',
    '  vec2 p = vec2(q.x, uSheet.w - q.y) * unit;',
    '  vec3 color;',
    '  if (uFine > 0.5) {',
    '    float o = 0.25 * unit;',
    '    color = 0.25 * (inkAt(p + vec2(o, o * 0.4)) + inkAt(p + vec2(-o, -o * 0.4)) + inkAt(p + vec2(-o * 0.4, o)) + inkAt(p + vec2(o * 0.4, -o)));',
    '  } else {',
    '    color = inkAt(p);',
    '  }',
    '  if (uPaper > 0.5) {',
    '    float grain = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);',
    '    color *= 0.94 + 0.06 * grain;',
    '    vec2 edge = min(q, uSheet.zw - q);',
    '    color *= 0.86 + 0.14 * smoothstep(0.0, 26.0, min(edge.x, edge.y));',
    '  }',
    '  outColor = vec4(color, 1.0);',
    '}'
  ].join('\n');

  Gallery.register('endpapers', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    // (the drawing is kept between frames: the sheet is only repainted when a stroke changes)
    var context = Gallery.gl.context(canvas, { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true }, true);
    if (!context) {
      env.fail('This work needs WebGL 2, which this browser does not offer. The other rooms still run.');
      return null;
    }
    var gl = context.gl;
    canvas.style.touchAction = 'none';       // the sheet is a working surface

    var program, at;
    var strokes = [];             // what has been done to the sheet, oldest first
    var growing = [];             // strokes still easing toward their full size
    var pending = null;           // the stroke under the visitor's hand
    var queue = [];               // strokes the machine has yet to lay, with times
    var sheet = { x: 0, y: 0, w: 100, h: 100 };
    var base = null;              // a flattened earlier state, as a texture
    var tool = 'drop';
    var ink = 0;
    var clock = 0;
    var dirty = true, refine = false, settledFor = 0;
    var lost = false;
    var packedA = new Float32Array(MAX_STROKES * 4), packedB = new Float32Array(MAX_STROKES * 4);

    var laid = 0;                 // strokes ever laid on this sheet, flattened ones included

    /* ---- strokes ---- */

    function pack(list) {
      for (var i = 0; i < list.length && i < MAX_STROKES; i++) {
        var s = list[i], o = i * 4;
        packedA[o] = s.x; packedA[o + 1] = s.y; packedA[o + 3] = s.type;
        if (s.type === DROP) {
          packedA[o + 2] = s.r;
          packedB[o] = packedB[o + 1] = packedB[o + 2] = 0; packedB[o + 3] = s.ink;
        } else if (s.type === TINE) {
          packedA[o + 2] = s.z;
          packedB[o] = s.mx; packedB[o + 1] = s.my; packedB[o + 2] = s.c; packedB[o + 3] = s.spacing || 0;
        } else {
          packedA[o + 2] = s.turn;
          packedB[o] = s.reach; packedB[o + 1] = packedB[o + 2] = packedB[o + 3] = 0;
        }
      }
      return Math.min(list.length, MAX_STROKES);
    }

    function add(stroke) {
      if (strokes.length >= MAX_STROKES - 2) flatten();
      strokes.push(stroke);
      laid++;
      env.live('strokes', Gallery.formatCount(laid));
      dirty = true;
    }

    // Lay a stroke that eases up to its full size, so it can be watched happening.
    function addGrowing(stroke, key, seconds) {
      var full = stroke[key];
      stroke[key] = 0;
      add(stroke);
      growing.push({ stroke: stroke, key: key, full: full, from: clock, seconds: seconds });
    }

    // The machine's own sheet: stones first, then one of three ways of working them.
    function compose(instant) {
      var w = sheet.w, h = sheet.h, t = 0.3, i;
      queue = [];
      function later(stroke, key, seconds) { queue.push({ at: clock + t, stroke: stroke, key: key, seconds: seconds }); }
      // a ground of broad drops to cover the bath...
      for (i = 0; i < 9; i++) {
        later({ type: DROP, x: w * (0.08 + Math.random() * 0.84), y: h * (0.06 + Math.random() * 0.88), r: w * (0.15 + Math.random() * 0.08), ink: i % 4 }, 'r', 0.3);
        t += 0.09;
      }
      // ...then stones: three drops let fall on the same spot, each pushing the
      // last out into a ring around it
      for (i = 0; i < 12; i++) {
        var sx = w * (0.08 + Math.random() * 0.84), sy = h * (0.06 + Math.random() * 0.88);
        var big = w * (0.07 + Math.random() * 0.035);
        for (var ring = 0; ring < 3; ring++) {
          var which = (i + ring * 2) % 5;
          later({ type: DROP, x: sx, y: sy, r: big * [1, 0.72, 0.45][ring], ink: which === 4 && ring !== 1 ? 3 : which }, 'r', 0.25);
          t += 0.07;
        }
      }
      t += 0.5;
      var recipe = Math.floor(Math.random() * 3);
      if (recipe === 0) {           // nonpareil: combed down, combed back, then finely across
        later({ type: TINE, x: w * 0.5, y: 0, mx: 0, my: 1, z: h * 0.17, c: w * 0.05, spacing: w * 0.2 }, 'z', 1.0); t += 1.1;
        later({ type: TINE, x: w * 0.6, y: 0, mx: 0, my: -1, z: h * 0.17, c: w * 0.05, spacing: w * 0.2 }, 'z', 1.0); t += 1.1;
        later({ type: TINE, x: 0, y: h * 0.5, mx: 1, my: 0, z: w * 0.075, c: w * 0.02, spacing: w * 0.062 }, 'z', 1.2);
      } else if (recipe === 1) {    // bouquet: combed across, then a row of swirls
        later({ type: TINE, x: 0, y: h * 0.5, mx: 1, my: 0, z: w * 0.2, c: w * 0.045, spacing: h * 0.15 }, 'z', 1.0); t += 1.1;
        later({ type: TINE, x: 0, y: h * 0.575, mx: -1, my: 0, z: w * 0.2, c: w * 0.045, spacing: h * 0.15 }, 'z', 1.0); t += 1.1;
        for (i = 0; i < 4; i++) {
          later({ type: SWIRL, x: w * (0.2 + 0.2 * i), y: h * (i % 2 ? 0.66 : 0.34), turn: (i % 2 ? -1 : 1) * 2.6, reach: w * 0.1 }, 'turn', 0.9);
          t += 0.45;
        }
      } else {                      // stone and wave: two long diagonal rakes and one big turn
        later({ type: TINE, x: w * 0.3, y: h * 0.3, mx: 0.6, my: 0.8, z: h * 0.3, c: w * 0.09 }, 'z', 1.1); t += 1.0;
        later({ type: TINE, x: w * 0.7, y: h * 0.6, mx: -0.6, my: -0.8, z: h * 0.3, c: w * 0.09 }, 'z', 1.1); t += 1.0;
        later({ type: SWIRL, x: w * 0.5, y: h * 0.5, turn: 3.4, reach: w * 0.2 }, 'turn', 1.4);
      }
      if (instant) {
        queue.forEach(function (item) { add(item.stroke); });
        queue = [];
      }
    }

    function fresh() {
      strokes = []; growing = []; queue = []; pending = null;
      if (base) { gl.deleteTexture(base.texture); gl.deleteFramebuffer(base.framebuffer); base = null; }
      laid = 0;
      env.live('strokes', '0');
      dirty = true;
    }

    /* ---- drawing ---- */

    function build() {
      program = Gallery.gl.program(gl, VERTEX, FRAGMENT);
      at = Gallery.gl.uniforms(gl, program, ['uSheet', 'uSize', 'uCount', 'uA', 'uB', 'uInk', 'uBase', 'uHasBase', 'uFine', 'uPaper']);
      Gallery.gl.fullscreenTriangle(gl);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.useProgram(program);
      var flat = [];
      INKS.forEach(function (c) { flat.push(c[0], c[1], c[2]); });
      gl.uniform3fv(at.uInk, new Float32Array(flat));
    }

    function paint(list, target, fine) {
      var ratio = canvas.width / size.w;
      gl.useProgram(program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
      if (target) {
        gl.viewport(0, 0, target.width, target.height);
        gl.uniform4f(at.uSheet, 0, 0, target.width, target.height);
      } else {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform4f(at.uSheet, sheet.x * ratio, (size.h - sheet.y - sheet.h) * ratio, sheet.w * ratio, sheet.h * ratio);
      }
      gl.uniform2f(at.uSize, sheet.w, sheet.h);
      gl.uniform1i(at.uCount, pack(list));
      gl.uniform4fv(at.uA, packedA);
      gl.uniform4fv(at.uB, packedB);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, base ? base.texture : null);
      gl.uniform1i(at.uBase, 0);
      gl.uniform1f(at.uHasBase, base ? 1 : 0);
      gl.uniform1f(at.uFine, fine ? 1 : 0);
      gl.uniform1f(at.uPaper, target ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // When the list of strokes is nearly full, bake the sheet as it stands
    // into a texture and carry on with an empty list on top of it.
    function flatten() {
      growing.forEach(function (item) { item.stroke[item.key] = item.full; });
      growing = [];
      var ratio = canvas.width / size.w;
      var w = Math.max(2, Math.round(sheet.w * ratio)), h = Math.max(2, Math.round(sheet.h * ratio));
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      var next = { texture: texture, framebuffer: framebuffer, width: w, height: h };
      paint(strokes, next, true);
      if (base) { gl.deleteTexture(base.texture); gl.deleteFramebuffer(base.framebuffer); }
      base = next;
      strokes = [];
    }

    function placeSheet() {
      var w = size.w, h = size.h, before = sheet.w + 'x' + sheet.h;
      if (w >= 900) {
        sheet.h = Math.round(h * 0.8);
        sheet.w = Math.round(Math.min(w * 0.5, sheet.h * 0.86));
        sheet.x = Math.round(Math.min(w * 0.67 - sheet.w / 2, w - sheet.w - Math.max(16, w * 0.04)));
        sheet.y = Math.round((h - sheet.h) / 2 + 14);
      } else {
        sheet.x = 16; sheet.y = 60; sheet.w = w - 32; sheet.h = h - 76;      // clear of the masthead
      }
      return before !== sheet.w + 'x' + sheet.h;
    }

    /* ---- wiring ---- */

    function onSheet(e) {
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX - rect.left - sheet.x, y = e.clientY - rect.top - sheet.y;
      return { x: x, y: y, inside: x >= 0 && y >= 0 && x <= sheet.w && y <= sheet.h };
    }

    var from = null;
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || lost) return;
      var p = onSheet(e);
      if (!p.inside) return;
      queue = [];                       // the visitor takes over from the machine
      from = p;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      if (tool === 'drop') pending = { type: DROP, x: p.x, y: p.y, r: 8, ink: ink };
      else if (tool === 'swirl') pending = { type: SWIRL, x: p.x, y: p.y, turn: 0, reach: sheet.w * 0.16 };
      else pending = { type: TINE, x: p.x, y: p.y, mx: 1, my: 0, z: 0, c: tool === 'comb' ? sheet.w * 0.028 : sheet.w * 0.05, spacing: tool === 'comb' ? sheet.w * 0.09 : 0 };
      dirty = true;
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!pending || !from) return;
      var p = onSheet(e), dx = p.x - from.x, dy = p.y - from.y;
      var length = Math.sqrt(dx * dx + dy * dy);
      if (pending.type === TINE && length > 3) {
        pending.mx = dx / length; pending.my = dy / length;
        // a rake moves ink a hand's width, a comb less: far enough to feather, not to empty the bath
        pending.z = pending.spacing ? Math.min(length * 0.5, sheet.w * 0.13) : Math.min(length * 0.7, sheet.w * 0.3);
      } else if (pending.type === SWIRL) {
        pending.turn = Gallery.clamp(dx / 90, -5, 5);
      }
      dirty = true;
    });
    function commit() {
      if (!pending) return;
      var stroke = pending;
      pending = null; from = null;
      if (stroke.type === DROP && !env.motion()) stroke.r = sheet.w * 0.1;    // no growing while motion is paused
      var worthIt = stroke.type === DROP || (stroke.type === TINE && stroke.z > 4) || (stroke.type === SWIRL && Math.abs(stroke.turn) > 0.05);
      if (worthIt) {
        add(stroke);
        if (stroke.type === DROP) chooseInk((ink + 1) % INKS.length);   // the next drop is a different colour, as on a real bath
      }
      dirty = true;
    }
    canvas.addEventListener('pointerup', commit);
    canvas.addEventListener('pointercancel', commit);
    canvas.style.cursor = 'crosshair';

    var toolButtons = Array.prototype.slice.call(env.room.querySelectorAll('[data-endpapers-tool]'));
    toolButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        tool = button.getAttribute('data-endpapers-tool');
        toolButtons.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
      });
    });

    var inkButtons = Array.prototype.slice.call(env.room.querySelectorAll('[data-endpapers-ink]'));
    function chooseInk(index) {
      ink = index;
      inkButtons.forEach(function (button) { button.setAttribute('aria-pressed', String(Number(button.getAttribute('data-endpapers-ink')) === ink)); });
    }
    inkButtons.forEach(function (button) {
      button.addEventListener('click', function () { chooseInk(Number(button.getAttribute('data-endpapers-ink'))); });
    });

    function on(selector, handler) {
      var button = env.room.querySelector(selector);
      if (button) button.addEventListener('click', function () { if (!lost) handler(); env.redraw(); });
    }
    on('[data-endpapers-undo]', function () {
      if (!strokes.length) return;
      var gone = strokes.pop();
      growing = growing.filter(function (item) { return item.stroke !== gone; });
      laid = Math.max(0, laid - 1);
      env.live('strokes', Gallery.formatCount(laid));
      dirty = true;
    });
    on('[data-endpapers-fresh]', fresh);
    on('[data-endpapers-compose]', function () { fresh(); compose(!env.motion()); });

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () { build(); base = null; lost = false; dirty = true; env.redraw(); });
    build();

    function advance(dt) {
      clock += dt;
      while (queue.length && queue[0].at <= clock) {
        var item = queue.shift();
        addGrowing(item.stroke, item.key, item.seconds);
      }
      growing = growing.filter(function (item) {
        var t = Math.min(1, (clock - item.from) / item.seconds);
        item.stroke[item.key] = item.full * (1 - Math.pow(1 - t, 3));
        dirty = true;
        return t < 1;
      });
      if (pending && pending.type === DROP) { pending.r = Math.min(sheet.w * 0.3, pending.r + dt * sheet.w * 0.16); dirty = true; }
    }

    function show(dt) {
      if (lost) return;
      var list = pending ? strokes.concat([pending]) : strokes;
      if (dirty) {
        paint(list, null, false);
        dirty = false; refine = true; settledFor = 0;
      } else if (refine) {
        // once things have stopped changing, one careful pass with four samples a pixel
        settledFor += dt;
        if (settledFor > 0.12) { paint(list, null, true); refine = false; }
      }
    }

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 1.5);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        if (placeSheet()) { fresh(); compose(!env.motion()); }
        dirty = true;
      },
      frame: function (time, dt) { advance(dt); show(dt); },
      still: function () {
        // with motion paused, anything still on its way arrives at once
        queue.forEach(function (item) { add(item.stroke); });
        queue = [];
        growing.forEach(function (item) { item.stroke[item.key] = item.full; });
        growing = [];
        paint(pending ? strokes.concat([pending]) : strokes, null, true);
        dirty = false; refine = false;
      }
    };
  });
})();
