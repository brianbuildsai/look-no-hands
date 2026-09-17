/* Two Slits — room 18.

   A ripple tank. The water is a grid of cells, each holding a height and how
   fast that height is changing. Sixty times a second, several times over,
   every cell compares itself with its four neighbours: if it stands lower
   than their average it is pulled up, if higher, down. That is the wave
   equation, and everything a wave does comes out of it uninstructed:
   spreading in rings, bending round corners, slowing down in glass and so
   being focused by a lens, and crossing another wave to make still places
   and leaping places.

   Waves come in from one side. The far wall keeps a running average of how
   hard the water moved at each point along it, which is what a photographic
   plate does with light. Two gaps in a wall give stripes (Young, 1801-3).

   The state lives in a half-float texture on the graphics card: red is
   height, green is its rate of change, blue is the running average. */
(function () {
  'use strict';

  var SPEED2 = 0.25;               // (wave speed x time step / cell size) squared: must stay under a half
  var WAVELENGTH = 15;             // cells
  var GLASS = 0.42;                // waves in glass go at about two thirds the speed: the square of that

  var VERTEX = [
    '#version 300 es',
    'layout(location = 0) in vec2 aPosition;',
    'out vec2 vUv;',
    'void main() { vUv = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }'
  ].join('\n');

  // one step of the wave equation
  var STEP = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv;',
    'out vec4 outState;',
    'uniform sampler2D uWater;',
    'uniform sampler2D uTank;',        // red: wall, green: glass, blue: a beach laid in front of a wall
    'uniform vec2 uCell;',             // one cell, in texture coordinates
    'uniform float uUpright;',         // 1 when the waves travel down a tall screen instead of across a wide one
    'uniform float uStart;',           // how far along the waves come in
    'uniform float uPush;',            // the incoming wave, this step
    'uniform vec3 uDrop;',             // where the visitor is touching the water (in cells), and how hard
    'void main() {',
    '  vec4 here = texture(uWater, vUv);',
    '  vec4 tank = texture(uTank, vUv);',
    '  if (tank.r > 0.5) { outState = vec4(0.0, 0.0, here.b * 0.995, 1.0); return; }',     // a wall holds the water still
    '  float around = texture(uWater, vUv - vec2(uCell.x, 0.0)).r + texture(uWater, vUv + vec2(uCell.x, 0.0)).r',
    '    + texture(uWater, vUv - vec2(0.0, uCell.y)).r + texture(uWater, vUv + vec2(0.0, uCell.y)).r;',
    '  float speed = ' + SPEED2.toFixed(3) + ' * mix(1.0, ' + GLASS.toFixed(3) + ', tank.g);',
    '  float rate = here.g + speed * (around - 4.0 * here.r);',
    // the edges of the tank are a beach: waves that reach them die away instead of bouncing back
    '  float along = uUpright > 0.5 ? 1.0 - vUv.y : vUv.x;',
    '  float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));',
    '  float beach = 0.0006 + 0.14 * pow(1.0 - smoothstep(0.0, 0.075, edge), 2.0);',
    '  beach += 0.25 * (1.0 - smoothstep(uStart - 0.07, uStart - 0.012, along)) + 0.11 * tank.b;',
    '  rate *= 1.0 - beach;',
    '  float cellAlong = uUpright > 0.5 ? uCell.y : uCell.x;',
    '  float line = (along - uStart) / (1.6 * cellAlong);',
    '  rate += uPush * exp(-line * line);',
    '  float height = (here.r + rate) * (1.0 - beach * 0.5);',
    '  vec2 away = (gl_FragCoord.xy - uDrop.xy) / 2.6;',
    '  height += uDrop.z * exp(-dot(away, away));',
    '  outState = vec4(height, rate, mix(here.b, height * height, 0.006), 1.0);',
    '}'
  ].join('\n');

  // the water, lit from one side; the walls; the glass; and the far wall's record
  var SHOW = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv;',
    'out vec4 outColor;',
    'uniform sampler2D uWater;',
    'uniform sampler2D uTank;',
    'uniform vec2 uCell;',
    'uniform float uUpright;',
    'uniform float uStart;',
    'uniform float uShade;',
    'float squeeze(float h) { return h / (abs(h) + 0.22); }',
    'void main() {',
    '  float along = uUpright > 0.5 ? 1.0 - vUv.y : vUv.x;',
    '  float across = uUpright > 0.5 ? vUv.x : vUv.y;',
    // the far wall: a strip that shows the running average measured just in front of it
    '  if (along > 0.962) {',
    '    float at = 0.9;',
    '    vec2 from = uUpright > 0.5 ? vec2(across, 1.0 - at) : vec2(at, across);',
    '    float seen = texture(uWater, from).b;',
    '    vec3 plate = vec3(1.0, 0.70, 0.28) * (1.0 - exp(-seen * 26.0));',
    '    outColor = vec4(along < 0.966 ? vec3(0.28) : plate, 1.0);',
    '    return;',
    '  }',
    '  vec4 tank = texture(uTank, vUv);',
    // what is drawn is the height squeezed a little, so the faint waves past the wall show as well as the strong ones before it
    '  float h = squeeze(texture(uWater, vUv).r);',
    '  float dx = squeeze(texture(uWater, vUv + vec2(uCell.x, 0.0)).r) - squeeze(texture(uWater, vUv - vec2(uCell.x, 0.0)).r);',
    '  float dy = squeeze(texture(uWater, vUv + vec2(0.0, uCell.y)).r) - squeeze(texture(uWater, vUv - vec2(0.0, uCell.y)).r);',
    '  vec3 n = normalize(vec3(-dx * 2.6, -dy * 2.6, 1.0));',
    '  vec3 light = normalize(vec3(-0.5, 0.6, 0.62));',
    '  float glint = pow(max(0.0, dot(n, normalize(light + vec3(0.0, 0.0, 1.0)))), 60.0);',
    '  float slope = max(0.0, dot(n, light)) - 0.62;',
    '  vec3 colour = vec3(0.0, 0.004, 0.02);',
    '  colour += vec3(0.10, 0.17, 0.62) * smoothstep(-0.05, 0.75, h) * 1.2;',          // crests are blue
    '  colour += vec3(0.24, 0.36, 1.0) * max(0.0, slope) * 1.6;',                        // and catch the light on the side facing it
    '  colour += vec3(0.93, 0.92, 0.89) * glint * 0.9;',
    '  colour = mix(colour, colour * vec3(1.25, 0.8, 0.95) + vec3(0.05, 0.012, 0.025), tank.g);',   // glass has a rose cast
    '  colour = mix(colour, vec3(0.80, 0.78, 0.74), smoothstep(0.35, 0.65, tank.r));',   // walls are bone
    '  colour *= smoothstep(uStart - 0.05, uStart + 0.02, along) * 0.92 + 0.08;',        // nothing to see before the waves come in
    '  colour *= mix(1.0, 0.2 + 0.8 * smoothstep(0.22, 0.4, vUv.x), uShade);',           // keep the wall label readable
    '  outColor = vec4(colour, 1.0);',
    '}'
  ].join('\n');

  Gallery.register('slits', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var context = Gallery.gl.context(canvas, { alpha: false, antialias: false, depth: false, stencil: false }, true);
    if (!context || !Gallery.gl.canRenderFloat(context.gl)) {
      env.fail('This work keeps its water in floating-point textures, which this browser or graphics card does not offer. The other rooms still run.');
      return null;
    }
    var gl = context.gl;

    var W = 0, H = 0;                       // the tank, in cells
    var upright = false;                    // waves run down a tall screen, across a wide one
    var start = 0.3;                        // how far along they come in
    var water = null;                       // two textures: the last state and the next
    var tank = null, tankTexture = null, tankDirty = true;      // walls, glass and beach: three bytes a cell
    var stepProgram, showProgram, stepAt, showAt, triangle;
    var phase = 0, clock = 0, waves = true, swell = 0;
    var tool = 'pebble', layout = 'two';
    var press = null, lastCell = null, drip = 0;
    var lost = false, warmed = false, owed = 0;

    /* ---- the tank: walls and glass ---- */

    // positions are given as (along, across), both 0 to 1, so the same layouts work upright
    function cellOf(along, across) {
      return upright ? { x: Math.round(across * (W - 1)), y: Math.round((1 - along) * (H - 1)) } : { x: Math.round(along * (W - 1)), y: Math.round(across * (H - 1)) };
    }
    function dab(cx, cy, radius, wall, glass) {
      for (var y = Math.max(0, cy - radius); y <= Math.min(H - 1, cy + radius); y++) {
        for (var x = Math.max(0, cx - radius); x <= Math.min(W - 1, cx + radius); x++) {
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > radius * radius + 1) continue;
          var o = (y * W + x) * 3;
          if (wall !== null) tank[o] = wall;
          if (glass !== null) tank[o + 1] = glass;
          if (wall === 0 && glass === 0) tank[o + 2] = 0;
        }
      }
      tankDirty = true;
    }

    function arrange(name) {
      layout = name;
      tank.fill(0);
      var length = upright ? H : W, breadth = upright ? W : H, i, j, c;
      var lambda = WAVELENGTH / breadth;                       // a wavelength, as a fraction of the way across
      var at = start + (upright ? 0.2 : 0.17);                  // where the barrier stands
      if (name === 'two' || name === 'one') {
        var gap = lambda * 0.5, apart = lambda * 1.75;
        for (j = 0; j < breadth; j++) {
          var across = j / (breadth - 1), open = name === 'one'
            ? Math.abs(across - 0.5) < gap * 1.3
            : Math.abs(Math.abs(across - 0.5) - apart) < gap;
          if (open) continue;
          for (i = -2; i <= 2; i++) { c = cellOf(at + i / length, across); tank[(c.y * W + c.x) * 3] = 255; }
          // the side the waves arrive at is a beach, so they are not thrown straight back into the ones behind them
          for (i = -18; i < -2; i++) { c = cellOf(at + i / length, across); tank[(c.y * W + c.x) * 3 + 2] = Math.round(255 * Math.pow((i + 18) / 15, 2)); }
        }
      } else if (name === 'lens') {
        // a lens is where two big circles overlap; the water in it is slow
        var mid = at, radius = upright ? 0.34 : 0.3, thick = 0.07, reach = breadth / length;
        for (j = 0; j < breadth; j++) for (i = 0; i < length; i++) {
          var a = i / (length - 1), b = (j / (breadth - 1) - 0.5) * reach;
          var left = Math.sqrt((a - (mid + radius - thick)) * (a - (mid + radius - thick)) + b * b) < radius;
          var right = Math.sqrt((a - (mid - radius + thick)) * (a - (mid - radius + thick)) + b * b) < radius;
          if (left && right) { c = cellOf(a, j / (breadth - 1)); tank[(c.y * W + c.x) * 3 + 1] = 255; }
        }
      }
      waves = name !== 'open';
      tankDirty = true;
      clear();
    }

    function clear() {
      if (!water) return;
      [water.read, water.write].forEach(function (t) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.framebuffer);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      swell = 0; warmed = false;
      env.redraw();
    }

    function fill() {
      if (water) water.dispose();
      upright = size.w < 900 && size.h > size.w;
      var cells = size.w >= 900 ? 640 : 300;
      if (upright) { W = cells; H = Math.round(cells * size.h / size.w); } else { W = cells; H = Math.max(120, Math.round(cells * size.h / size.w)); }
      start = upright ? 0.12 : (size.w >= 900 ? 0.3 : 0.06);
      water = Gallery.gl.floatPair(gl, W, H, 4, true);
      if (!water) { env.fail('This graphics card would not make a floating-point texture to keep the water in. The other rooms still run.'); return false; }
      tank = new Uint8Array(W * H * 3);
      if (tankTexture) gl.deleteTexture(tankTexture);
      tankTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tankTexture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, W, H, 0, gl.RGB, gl.UNSIGNED_BYTE, tank);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      env.live('cells', Gallery.formatCount(W * H));
      arrange(layout);
      return true;
    }



    /* ---- stepping and drawing ---- */

    function build() {
      stepProgram = Gallery.gl.program(gl, VERTEX, STEP);
      showProgram = Gallery.gl.program(gl, VERTEX, SHOW);
      stepAt = Gallery.gl.uniforms(gl, stepProgram, ['uWater', 'uTank', 'uCell', 'uUpright', 'uStart', 'uPush', 'uDrop']);
      showAt = Gallery.gl.uniforms(gl, showProgram, ['uWater', 'uTank', 'uCell', 'uUpright', 'uStart', 'uShade']);
      triangle = Gallery.gl.fullscreenTriangle(gl);
    }

    function bind(program, at) {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, water.read.texture);
      gl.uniform1i(at.uWater, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, tankTexture);
      gl.uniform1i(at.uTank, 1);
      gl.uniform2f(at.uCell, 1 / W, 1 / H);
      gl.uniform1f(at.uUpright, upright ? 1 : 0);
      gl.uniform1f(at.uStart, start);
    }

    function advance(steps) {
      if (tankDirty) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, tankTexture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RGB, gl.UNSIGNED_BYTE, tank);
        tankDirty = false;
      }
      gl.viewport(0, 0, W, H);
      for (var k = 0; k < steps; k++) {
        phase += 2 * Math.PI * Math.sqrt(SPEED2) / WAVELENGTH;
        swell = Math.min(1, swell + 0.004);                      // the incoming waves build up gently, so there is no first shock
        bind(stepProgram, stepAt);
        gl.uniform1f(stepAt.uPush, waves ? 0.085 * swell * Math.sin(phase) : 0);
        var drop = 0;
        if (press && tool === 'pebble') {
          // the first touch is a pebble; holding on is a dripping tap
          drop = press.fresh ? 0.9 : 0.22 * Math.sin(drip += 2 * Math.PI * Math.sqrt(SPEED2) / WAVELENGTH);
          press.fresh = false;
        }
        gl.uniform3f(stepAt.uDrop, press ? press.x + 0.5 : -99, press ? press.y + 0.5 : -99, drop);
        gl.bindFramebuffer(gl.FRAMEBUFFER, water.write.framebuffer);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        water.swap();
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function render() {
      if (lost || !water) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      bind(showProgram, showAt);
      gl.uniform1f(showAt.uShade, size.w >= 900 ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // in open water it rains a little, so there is always something to watch
    function rain(dt) {
      if (waves || press || Math.random() > dt * 1.6) return;
      var spot = cellOf(start + 0.08 + Math.random() * 0.8, 0.1 + Math.random() * 0.8);
      gl.viewport(0, 0, W, H);
      bind(stepProgram, stepAt);
      gl.uniform1f(stepAt.uPush, 0);
      gl.uniform3f(stepAt.uDrop, spot.x + 0.5, spot.y + 0.5, 0.5 + Math.random() * 0.4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, water.write.framebuffer);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      water.swap();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /* ---- wiring ---- */

    function cellAt(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: Math.floor((e.clientX - rect.left) / rect.width * W), y: Math.floor((1 - (e.clientY - rect.top) / rect.height) * H) };
    }
    function paint(cell) {
      var from = lastCell || cell, reach = Math.max(Math.abs(cell.x - from.x), Math.abs(cell.y - from.y)), n = Math.max(1, reach);
      for (var k = 0; k <= n; k++) {
        var x = Math.round(from.x + (cell.x - from.x) * k / n), y = Math.round(from.y + (cell.y - from.y) * k / n);
        if (tool === 'wall') dab(x, y, 2, 255, 0);
        else if (tool === 'glass') dab(x, y, 7, null, 255);
        else dab(x, y, 8, 0, 0);
      }
      lastCell = cell;
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || !water) return;
      var cell = cellAt(e);
      press = { x: cell.x, y: cell.y, fresh: true };
      lastCell = null; drip = 0;
      if (tool !== 'pebble') paint(cell);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      env.redraw();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!press) return;
      var cell = cellAt(e);
      press.x = cell.x; press.y = cell.y;
      if (tool !== 'pebble') paint(cell);
    });
    function lift() { press = null; lastCell = null; }
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () { lost = false; water = null; tankTexture = null; build(); fill(); });
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'none';                       // the tank is a working surface

    function group(attribute, choose) {
      var buttons = Array.prototype.slice.call(env.room.querySelectorAll('[' + attribute + ']'));
      buttons.forEach(function (button) {
        button.addEventListener('click', function () {
          choose(button.getAttribute(attribute));
          buttons.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
        });
      });
    }
    group('data-slits-layout', function (name) { if (water) arrange(name); });
    group('data-slits-tool', function (name) { tool = name; });
    var stillButton = env.room.querySelector('[data-slits-calm]');
    if (stillButton) stillButton.addEventListener('click', function () { if (water) clear(); });

    try { build(); } catch (err) {
      env.fail('This work could not start its shaders on this graphics card. The other rooms still run.');
      return null;
    }

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wasUpright = upright, wide = size.w >= 900;
        if (!water || wasUpright !== (size.w < 900 && size.h > size.w) || (wide ? 640 : 300) !== W) fill();
      },
      frame: function (time, dt) {
        if (lost || !water) return;
        clock += dt;
        rain(dt);
        // 180 steps a second whatever the screen's own rate is, so the waves travel at the same speed everywhere
        owed = Math.min(8, owed + dt * 180);
        var steps = Math.floor(owed);
        owed -= steps;
        if (steps) advance(steps);
        render();
      },
      // With motion paused: run the waves through out of sight until the far wall has its stripes, then show that.
      still: function () {
        if (lost || !water) return;
        if (!warmed) { advance(2600); warmed = true; }
        render();
      },
      // for checking from the console: the far wall's record, brightest first
      plate: function () {
        var column = upright ? null : Math.round(0.9 * W), out = [];
        gl.bindFramebuffer(gl.FRAMEBUFFER, water.read.framebuffer);
        var row = new Float32Array((upright ? W : H) * 4);
        if (upright) gl.readPixels(0, Math.round(0.1 * H), W, 1, gl.RGBA, gl.FLOAT, row); else gl.readPixels(column, 0, 1, H, gl.RGBA, gl.FLOAT, row);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        for (var k = 0; k < row.length / 4; k++) out.push(row[k * 4 + 2]);
        return out;
      }
    };


  });
})();
