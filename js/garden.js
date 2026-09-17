/* Turing's Garden — room 4.

   A reaction–diffusion system (the Gray–Scott model). Every cell holds the
   amounts of two chemicals. One is fed in steadily, the other eats it to
   make more of itself and slowly dies off, and both spread to their
   neighbours at different speeds. That is the whole rule. Coral, dividing
   cells, mazes and loops are the same rule with two numbers changed.

   The grid lives in a pair of floating-point textures on the graphics card.
   Each step reads one and writes the other, several hundred times a second. */
(function () {
  'use strict';

  var CELL_PIXELS = 2.5;          // one cell covers this many screen pixels
  var STEPS_PER_SECOND = 900;
  var MIN_STEPS_PER_SECOND = 300;
  var SEED_CELLS = 9;             // radius of a scattered seed; smaller ones starve in some species
  var BRUSH_CELLS = 7;            // radius of the stroke the pointer plants

  // Feed and kill rates; everything the garden can be is in these two numbers.
  // Each pair was checked on the processor first, at the graphics card's
  // half-float precision, to be sure it survives and spreads from a seed.
  var SPECIES = {
    coral: { feed: 0.0545, kill: 0.062 },
    cells: { feed: 0.030, kill: 0.061 },
    maze: { feed: 0.029, kill: 0.057 },
    loops: { feed: 0.058, kill: 0.0628 }
  };

  var VERTEX = [
    '#version 300 es',
    'layout(location = 0) in vec2 aPosition;',
    'out vec2 vUv;',
    'void main() {',
    '  vUv = aPosition * 0.5 + 0.5;',
    '  gl_Position = vec4(aPosition, 0.0, 1.0);',
    '}'
  ].join('\n');

  // One generation. Red channel is chemical A (the food), green is B (the eater).
  var STEP_FRAGMENT = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uState;',
    'uniform vec2 uTexel;',
    'uniform float uFeed;',
    'uniform float uKill;',
    'uniform vec2 uBedCentre;',
    'uniform vec2 uBedRadius;',
    'uniform vec4 uKeepOut;      // left, bottom, right, top of the wall label',
    'uniform vec4 uBrush;       // a stroke from xy to zw, x already scaled by aspect',
    'uniform float uBrushRadius;  // zero when nothing is being planted',
    'uniform float uAspect;',
    'in vec2 vUv;',
    'out vec4 outColor;',
    '',
    'void main() {',
    '  vec2 here = texture(uState, vUv).rg;',
    '  vec2 dx = vec2(uTexel.x, 0.0);',
    '  vec2 dy = vec2(0.0, uTexel.y);',
    '  // how different this cell is from its eight neighbours',
    '  vec2 spread = -here',
    '    + 0.2 * (texture(uState, vUv + dx).rg + texture(uState, vUv - dx).rg',
    '           + texture(uState, vUv + dy).rg + texture(uState, vUv - dy).rg)',
    '    + 0.05 * (texture(uState, vUv + dx + dy).rg + texture(uState, vUv + dx - dy).rg',
    '            + texture(uState, vUv - dx + dy).rg + texture(uState, vUv - dx - dy).rg);',
    '',
    '  // Outside the bed the eater dies faster, so the garden has a soft edge.',
    '  // The wall label is kept clear the same way.',
    '  float bed = smoothstep(1.0, 0.76, length((vUv - uBedCentre) / uBedRadius));',
    '  vec2 beyond = max(max(uKeepOut.xy - vUv, vUv - uKeepOut.zw), 0.0);',
    '  bed *= smoothstep(0.0, 0.07, length(beyond));',
    '  float kill = mix(uKill + 0.016, uKill, bed);',
    '',
    '  float a = here.r;',
    '  float b = here.g;',
    '  float eaten = a * b * b;',
    '  a += spread.r - eaten + uFeed * (1.0 - a);',
    '  b += 0.5 * spread.g + eaten - (kill + uFeed) * b;',
    '',
    '  if (uBrushRadius > 0.0) {',
    '    vec2 p = vec2(vUv.x * uAspect, vUv.y);',
    '    vec2 along = uBrush.zw - uBrush.xy;',
    '    float t = clamp(dot(p - uBrush.xy, along) / max(dot(along, along), 1e-8), 0.0, 1.0);',
    '    float d = length(p - (uBrush.xy + along * t));',
    '    float planted = 1.0 - smoothstep(uBrushRadius * 0.5, uBrushRadius, d);',
    '    b = max(b, planted * 0.9);',
    '    a = min(a, 1.0 - planted * 0.5);',
    '  }',
    '  outColor = vec4(clamp(a, 0.0, 1.0), clamp(b, 0.0, 1.0), 0.0, 1.0);',
    '}'
  ].join('\n');

  // Showing it: treat the amount of B as height, light it from the upper
  // left, and colour it from deep blue at the shore to amber at the crest.
  var SHOW_FRAGMENT = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D uState;',
    'uniform vec2 uTexel;',
    'in vec2 vUv;',
    'out vec4 outColor;',
    '',
    'vec3 ramp(float t) {',
    '  vec3 deep = vec3(0.03, 0.05, 0.34);',
    '  vec3 ultramarine = vec3(0.24, 0.36, 1.0);',
    '  vec3 rose = vec3(1.0, 0.31, 0.48);',
    '  vec3 amber = vec3(1.0, 0.70, 0.28);',
    '  vec3 bone = vec3(0.96, 0.93, 0.86);',
    '  vec3 c = mix(deep, ultramarine, smoothstep(0.0, 0.3, t));',
    '  c = mix(c, rose, smoothstep(0.3, 0.58, t));',
    '  c = mix(c, amber, smoothstep(0.58, 0.82, t));',
    '  return mix(c, bone, smoothstep(0.82, 1.0, t));',
    '}',
    '',
    'void main() {',
    '  float b = texture(uState, vUv).g;',
    '  float slopeX = texture(uState, vUv + vec2(uTexel.x, 0.0)).g - texture(uState, vUv - vec2(uTexel.x, 0.0)).g;',
    '  float slopeY = texture(uState, vUv + vec2(0.0, uTexel.y)).g - texture(uState, vUv - vec2(0.0, uTexel.y)).g;',
    '  vec3 n = normalize(vec3(-slopeX * 7.0, -slopeY * 7.0, 1.0));',
    '  vec3 light = normalize(vec3(-0.5, 0.6, 0.62));',
    '  float diffuse = clamp(dot(n, light), 0.0, 1.0);',
    '  float shine = pow(clamp(reflect(-light, n).z, 0.0, 1.0), 28.0);',
    '  float t = smoothstep(0.03, 0.47, b);',
    '  vec3 color = ramp(t) * (0.28 + 0.9 * diffuse) + shine * vec3(1.0, 0.96, 0.88) * 0.6 * t;',
    '  color *= smoothstep(0.02, 0.12, b);',
    '  // the faint trace of B that has leaked into the dark reads as a glow',
    '  color += vec3(0.05, 0.10, 0.62) * smoothstep(0.0, 0.05, b) * (1.0 - smoothstep(0.05, 0.22, b)) * 0.55;',
    '  outColor = vec4(color, 1.0);',
    '}'
  ].join('\n');

  Gallery.register('garden', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pointer = env.pointer;

    var context = Gallery.gl.context(canvas, { alpha: false, antialias: false, depth: false, stencil: false }, true);
    if (!context) {
      env.fail('This work needs WebGL 2 to keep its chemistry on the graphics card, and this browser does not offer it. The other rooms still run.');
      return null;
    }
    var gl = context.gl;
    // Rendering into floating-point textures is an extension, though a near-universal one.
    if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) {
      env.fail('This work needs a graphics card that can write to floating-point textures, and this one reports that it cannot. The other rooms still run.');
      return null;
    }

    var stepProgram, showProgram, stepUniforms, showUniforms, triangle;
    var targets = [];            // two {texture, framebuffer}; we read one and write the other
    var current = 0;
    var simW = 0, simH = 0;
    var species = SPECIES.coral;
    var seeds = [];              // places waiting to be planted, one per generation
    var lastPoint = null;
    var budget = STEPS_PER_SECOND;
    var slowFrames = 0;
    var warmed = false;
    var lost = false;
    var ticks = 0;

    var keepOut = [-2, -2, -1, -1];   // nowhere, until the label is measured

    function bed() {
      return size.w >= 900 ? { cx: 0.62, cy: 0.49, rx: 0.4, ry: 0.45 }
                           : { cx: 0.5, cy: 0.5, rx: 0.56, ry: 0.52 };
    }

    // Where the wall label sits over the stage, in texture space. On narrow
    // screens the label is below the stage and nothing needs keeping clear.
    function measureLabel() {
      var label = env.room.querySelector('.label');
      if (!label || size.w < 900) { keepOut = [-2, -2, -1, -1]; return; }
      var stage = canvas.getBoundingClientRect();
      var rect = label.getBoundingClientRect();
      if (!stage.width || !stage.height) return;
      keepOut = [
        (rect.left - stage.left) / stage.width,
        1 - (rect.bottom - stage.top) / stage.height,
        (rect.right - stage.left) / stage.width,
        1 - (rect.top - stage.top) / stage.height
      ];
    }

    function build() {
      stepProgram = Gallery.gl.program(gl, VERTEX, STEP_FRAGMENT);
      showProgram = Gallery.gl.program(gl, VERTEX, SHOW_FRAGMENT);
      stepUniforms = Gallery.gl.uniforms(gl, stepProgram,
        ['uState', 'uTexel', 'uFeed', 'uKill', 'uBedCentre', 'uBedRadius', 'uKeepOut', 'uBrush', 'uBrushRadius', 'uAspect']);
      showUniforms = Gallery.gl.uniforms(gl, showProgram, ['uState', 'uTexel']);
      triangle = Gallery.gl.fullscreenTriangle(gl);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.disable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
    }

    function makeTarget(w, h, data) {
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.FLOAT, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return ok ? { texture: texture, framebuffer: framebuffer } : null;
    }

    // An empty bed: food everywhere, no eater anywhere.
    function clearBed() {
      var blank = new Float32Array(simW * simH * 4);
      for (var i = 0; i < blank.length; i += 4) { blank[i] = 1; blank[i + 3] = 1; }
      targets.forEach(function (t) { gl.deleteTexture(t.texture); gl.deleteFramebuffer(t.framebuffer); });
      targets = [makeTarget(simW, simH, blank), makeTarget(simW, simH, blank)];
      current = 0;
      seeds = [];
      if (!targets[0] || !targets[1]) {
        env.fail('This work needs a graphics card that can write to floating-point textures, and this one would not. The other rooms still run.');
        return false;
      }
      return true;
    }

    function scatter(n) {
      var b = bed();
      for (var i = 0; i < n; i++) {
        var angle = Math.random() * 6.2832;
        var reach = Math.sqrt(Math.random()) * 0.62;
        seeds.push({ x: b.cx + Math.cos(angle) * reach * b.rx, y: b.cy + Math.sin(angle) * reach * b.ry });
      }
    }

    /* ---- running it ---- */

    // The stroke the pointer made since the last frame, in texture space.
    function pointerStroke() {
      if (!pointer.inside) { lastPoint = null; return null; }
      var here = { x: pointer.x / size.w, y: 1 - pointer.y / size.h };
      var from = lastPoint || here;
      lastPoint = here;
      return { ax: from.x, ay: from.y, bx: here.x, by: here.y, radius: BRUSH_CELLS };
    }

    function advance(steps, stroke) {
      var aspect = simW / simH;
      var b = bed();
      gl.useProgram(stepProgram);
      gl.viewport(0, 0, simW, simH);
      gl.uniform1i(stepUniforms.uState, 0);
      gl.uniform2f(stepUniforms.uTexel, 1 / simW, 1 / simH);
      gl.uniform1f(stepUniforms.uFeed, species.feed);
      gl.uniform1f(stepUniforms.uKill, species.kill);
      gl.uniform2f(stepUniforms.uBedCentre, b.cx, b.cy);
      gl.uniform2f(stepUniforms.uBedRadius, b.rx, b.ry);
      gl.uniform4f(stepUniforms.uKeepOut, keepOut[0], keepOut[1], keepOut[2], keepOut[3]);
      gl.uniform1f(stepUniforms.uAspect, aspect);
      gl.activeTexture(gl.TEXTURE0);

      for (var i = 0; i < steps; i++) {
        var dab = null;
        if (i === 0 && stroke) dab = stroke;
        else if (seeds.length) { var s = seeds.pop(); dab = { ax: s.x, ay: s.y, bx: s.x, by: s.y, radius: SEED_CELLS }; }
        if (dab) {
          gl.uniform4f(stepUniforms.uBrush, dab.ax * aspect, dab.ay, dab.bx * aspect, dab.by);
          gl.uniform1f(stepUniforms.uBrushRadius, dab.radius / simH);
        } else {
          gl.uniform1f(stepUniforms.uBrushRadius, 0);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, targets[1 - current].framebuffer);
        gl.bindTexture(gl.TEXTURE_2D, targets[current].texture);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        current = 1 - current;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function show() {
      gl.useProgram(showProgram);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, targets[current].texture);
      gl.uniform1i(showUniforms.uState, 0);
      gl.uniform2f(showUniforms.uTexel, 1 / simW, 1 / simH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /* ---- wiring ---- */

    function resize() {
      var ratio = Math.min(size.dpr, 2);
      canvas.width = Math.max(1, Math.round(size.w * ratio));
      canvas.height = Math.max(1, Math.round(size.h * ratio));
      measureLabel();
      var w = Gallery.clamp(Math.round(size.w / CELL_PIXELS), 64, 1024);
      var h = Gallery.clamp(Math.round(size.h / CELL_PIXELS), 64, 1024);
      // A phone's address bar nudges the height by a few pixels; do not dig up the garden for that.
      if (targets.length && Math.abs(w - simW) < 8 && Math.abs(h - simH) < 8) return;
      simW = w;
      simH = h;
      if (!clearBed()) return;
      scatter(size.w >= 900 ? 14 : 8);
      warmed = false;
      env.live('cells', Gallery.formatCount(simW * simH));
    }

    var speciesButtons = Array.prototype.slice.call(env.room.querySelectorAll('[data-garden-species]'));
    speciesButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var name = button.getAttribute('data-garden-species');
        species = SPECIES[name] || SPECIES.coral;
        speciesButtons.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
        warmed = false;
        env.redraw();
      });
    });

    var seedButton = env.room.querySelector('[data-garden-seed]');
    if (seedButton) seedButton.addEventListener('click', function () { scatter(10); warmed = false; env.redraw(); });

    var clearButton = env.room.querySelector('[data-garden-clear]');
    if (clearButton) clearButton.addEventListener('click', function () { if (!lost && simW) clearBed(); env.redraw(); });

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () {
      build();
      targets = [];
      lost = false;
      if (simW && clearBed()) scatter(12);
      env.redraw();
    });

    build();
    env.live('steps', Gallery.formatCount(budget));

    return {
      resize: resize,
      frame: function (time, dt) {
        if (lost || !targets.length) return;
        if (++ticks % 90 === 0) measureLabel();   // the label reflows when its typeface arrives
        // Ease off on machines that cannot keep up, down to a third of full speed.
        if (dt > 1 / 40) slowFrames++; else if (slowFrames > 0) slowFrames--;
        if (slowFrames > 45 && budget > MIN_STEPS_PER_SECOND) {
          budget = Math.max(MIN_STEPS_PER_SECOND, budget * 0.8);
          slowFrames = 0;
          env.live('steps', Gallery.formatCount(budget));
        }
        advance(Gallery.clamp(Math.round(budget * dt), 1, 24), pointerStroke());
        show();
      },
      // With motion paused, grow the garden out of sight and show the result.
      still: function () {
        if (lost || !targets.length) return;
        if (!warmed) { advance(900, null); warmed = true; }
        show();
      }
    };
  });
})();
