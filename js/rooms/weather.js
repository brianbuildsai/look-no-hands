/* Indoor Weather — room 6.

   A fluid solver (after Jos Stam's "Stable Fluids"), run entirely on the
   graphics card. The air is a grid of little arrows, one per cell, saying
   which way it is moving. Every frame:

     1. find where the air is spinning, and push it to spin a little more
        (without this, a grid this coarse smooths every eddy away);
     2. work out the pressure that stops air piling up anywhere, by relaxing
        a guess a couple of dozen times, and subtract its slope;
     3. carry the arrows along themselves, and carry the smoke along them.

   The smoke is only a passenger. It shows what the arrows are doing. */
(function () {
  'use strict';

  var PRESSURE_PASSES = 22;
  // amber, ultramarine, rose, bone; the dark hues are pushed harder so all four read as equally bright smoke
  var INKS = [[0.92, 0.46, 0.08], [0.2, 0.4, 1.5], [1.3, 0.2, 0.46], [0.7, 0.68, 0.62]];

  var VERTEX = [
    '#version 300 es',
    'layout(location = 0) in vec2 aPosition;',
    'uniform vec2 uTexel;',
    'out vec2 vUv;',
    'out vec2 vL;',
    'out vec2 vR;',
    'out vec2 vT;',
    'out vec2 vB;',
    'void main() {',
    '  vUv = aPosition * 0.5 + 0.5;',
    '  vL = vUv - vec2(uTexel.x, 0.0);',
    '  vR = vUv + vec2(uTexel.x, 0.0);',
    '  vT = vUv + vec2(0.0, uTexel.y);',
    '  vB = vUv - vec2(0.0, uTexel.y);',
    '  gl_Position = vec4(aPosition, 0.0, 1.0);',
    '}'
  ].join('\n');

  var HEAD = '#version 300 es\nprecision highp float;\nprecision highp sampler2D;\nin vec2 vUv;\nin vec2 vL;\nin vec2 vR;\nin vec2 vT;\nin vec2 vB;\nout vec4 outColor;\n';

  var SHADERS = {
    // carry a field along the flow: look upstream for what will arrive here
    advect: HEAD + [
      'uniform sampler2D uVelocity;',
      'uniform sampler2D uSource;',
      'uniform vec2 uVelocityTexel;',
      'uniform float uDt;',
      'uniform float uKeep;',
      'void main() {',
      '  vec2 from = vUv - uDt * texture(uVelocity, vUv).xy * uVelocityTexel;',
      '  outColor = texture(uSource, from) * uKeep;',
      '}'
    ].join('\n'),

    // how fast the air is turning at each cell
    curl: HEAD + [
      'uniform sampler2D uVelocity;',
      'void main() {',
      '  float l = texture(uVelocity, vL).y, r = texture(uVelocity, vR).y;',
      '  float t = texture(uVelocity, vT).x, b = texture(uVelocity, vB).x;',
      '  outColor = vec4(0.5 * (r - l - t + b), 0.0, 0.0, 1.0);',
      '}'
    ].join('\n'),

    // push the air round the places where it is already turning
    vorticity: HEAD + [
      'uniform sampler2D uVelocity;',
      'uniform sampler2D uCurl;',
      'uniform float uStrength;',
      'uniform float uDt;',
      'void main() {',
      '  float l = texture(uCurl, vL).x, r = texture(uCurl, vR).x;',
      '  float t = texture(uCurl, vT).x, b = texture(uCurl, vB).x;',
      '  float c = texture(uCurl, vUv).x;',
      '  vec2 force = 0.5 * vec2(abs(t) - abs(b), abs(r) - abs(l));',
      '  force /= length(force) + 1e-4;',
      '  force *= uStrength * c;',
      '  force.y *= -1.0;',
      '  vec2 velocity = texture(uVelocity, vUv).xy + force * uDt;',
      '  outColor = vec4(clamp(velocity, -2000.0, 2000.0), 0.0, 1.0);',
      '}'
    ].join('\n'),

    // how much air is arriving at a cell minus how much is leaving; walls send it back
    divergence: HEAD + [
      'uniform sampler2D uVelocity;',
      'void main() {',
      '  float l = texture(uVelocity, vL).x, r = texture(uVelocity, vR).x;',
      '  float t = texture(uVelocity, vT).y, b = texture(uVelocity, vB).y;',
      '  vec2 c = texture(uVelocity, vUv).xy;',
      '  if (vL.x < 0.0) l = -c.x;',
      '  if (vR.x > 1.0) r = -c.x;',
      '  if (vT.y > 1.0) t = -c.y;',
      '  if (vB.y < 0.0) b = -c.y;',
      '  outColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);',
      '}'
    ].join('\n'),

    // one round of relaxing the pressure toward the value that cancels the divergence
    pressure: HEAD + [
      'uniform sampler2D uPressure;',
      'uniform sampler2D uDivergence;',
      'void main() {',
      '  float l = texture(uPressure, vL).x, r = texture(uPressure, vR).x;',
      '  float t = texture(uPressure, vT).x, b = texture(uPressure, vB).x;',
      '  outColor = vec4((l + r + b + t - texture(uDivergence, vUv).x) * 0.25, 0.0, 0.0, 1.0);',
      '}'
    ].join('\n'),

    // air flows down the pressure slope: subtracting it leaves flow that piles up nowhere
    project: HEAD + [
      'uniform sampler2D uPressure;',
      'uniform sampler2D uVelocity;',
      'void main() {',
      '  float l = texture(uPressure, vL).x, r = texture(uPressure, vR).x;',
      '  float t = texture(uPressure, vT).x, b = texture(uPressure, vB).x;',
      '  outColor = vec4(texture(uVelocity, vUv).xy - vec2(r - l, t - b), 0.0, 1.0);',
      '}'
    ].join('\n'),

    scale: HEAD + [
      'uniform sampler2D uSource;',
      'uniform float uKeep;',
      'void main() { outColor = texture(uSource, vUv) * uKeep; }'
    ].join('\n'),

    // add a soft blob of something (a push, or a puff of smoke) at a point
    splat: HEAD + [
      'uniform sampler2D uSource;',
      'uniform vec2 uPoint;',
      'uniform vec3 uAmount;',
      'uniform float uRadius;',
      'uniform float uAspect;',
      'void main() {',
      '  vec2 p = vUv - uPoint;',
      '  p.x *= uAspect;',
      '  outColor = vec4(texture(uSource, vUv).xyz + exp(-dot(p, p) / uRadius) * uAmount, 1.0);',
      '}'
    ].join('\n'),

    // show the smoke: lit a little from the upper left so it has some body
    show: HEAD + [
      'uniform sampler2D uSmoke;',
      'uniform vec2 uSmokeTexel;',
      'float weight(vec3 c) { return dot(c, vec3(0.35, 0.45, 0.2)); }',
      'void main() {',
      '  vec3 c = texture(uSmoke, vUv).rgb;',
      '  float dx = weight(texture(uSmoke, vUv + vec2(uSmokeTexel.x, 0.0)).rgb) - weight(texture(uSmoke, vUv - vec2(uSmokeTexel.x, 0.0)).rgb);',
      '  float dy = weight(texture(uSmoke, vUv + vec2(0.0, uSmokeTexel.y)).rgb) - weight(texture(uSmoke, vUv - vec2(0.0, uSmokeTexel.y)).rgb);',
      '  vec3 n = normalize(vec3(-dx * 6.0, -dy * 6.0, 1.0));',
      '  float lit = 0.72 + 0.5 * dot(n, normalize(vec3(-0.5, 0.6, 0.62)));',
      '  c = 1.0 - exp(-c * lit * 1.1);',
      '  c = pow(c, vec3(0.4545));',
      '  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;',
      '  outColor = vec4(max(c + grain / 255.0, 0.0), 1.0);',
      '}'
    ].join('\n')
  };

  Gallery.register('weather', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pointer = env.pointer;

    var context = Gallery.gl.context(canvas, { alpha: false, antialias: false, depth: false, stencil: false }, true);
    if (!context) {
      env.fail('This work runs its physics on the graphics card and needs WebGL 2, which this browser does not offer. The other rooms still run.');
      return null;
    }
    var gl = context.gl;
    if (!Gallery.gl.canRenderFloat(gl)) {
      env.fail('This work needs a graphics card that can write to floating-point textures, and this one reports that it cannot. The other rooms still run.');
      return null;
    }

    var programs = {};
    var velocity, smoke, pressure, divergence, curl;   // the fields
    var simW = 0, simH = 0, smokeW = 0, smokeH = 0;
    var lost = false;
    var curlStrength = 28;
    var gusts = true;
    var untilGust = 0.2;
    var opening = 6;                                    // a few gusts at once, so the room is never found empty
    var ink = 0, inkClock = 0, gustInk = 0;
    var last = null;                                    // where the pointer was last frame
    var warmed = false;
    var frames = 0, meanDt = 1 / 60;

    /* ---- plumbing ---- */

    function build() {
      Object.keys(SHADERS).forEach(function (name) {
        var program = Gallery.gl.program(gl, VERTEX, SHADERS[name]);
        programs[name] = { program: program, at: {} };
      });
      Gallery.gl.fullscreenTriangle(gl);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.disable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
    }

    // Run one shader over one field. `inputs` maps uniform names to numbers,
    // arrays (vectors) or fields (textures).
    function run(name, target, inputs) {
      var p = programs[name];
      gl.useProgram(p.program);
      var unit = 0;
      Object.keys(inputs).forEach(function (key) {
        var at = p.at[key] || (p.at[key] = gl.getUniformLocation(p.program, key));
        var value = inputs[key];
        if (value && value.texture) {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, value.texture);
          gl.uniform1i(at, unit++);
        } else if (typeof value === 'number') gl.uniform1f(at, value);
        else if (value.length === 2) gl.uniform2f(at, value[0], value[1]);
        else gl.uniform3f(at, value[0], value[1], value[2]);
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
      gl.viewport(0, 0, target ? target.width : canvas.width, target ? target.height : canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function field(w, h, channels, smooth, paired) {
      var makeOne = paired ? Gallery.gl.floatPair : Gallery.gl.floatTarget;
      return makeOne(gl, w, h, channels, smooth) || makeOne(gl, w, h, 4, smooth);   // some cards only render to four channels
    }

    function allocate() {
      var wide = size.w >= size.h;
      var aspect = Math.max(size.w, size.h) / Math.min(size.w, size.h);
      var cells = size.w >= 900 ? 224 : 128;
      var grain = size.w >= 900 ? 1280 : 640;
      var w = wide ? Math.round(cells * aspect) : cells, h = wide ? cells : Math.round(cells * aspect);
      var sw = wide ? grain : Math.round(grain / aspect), sh = wide ? Math.round(grain / aspect) : grain;
      if (w === simW && h === simH && velocity) return true;
      [velocity, smoke, pressure].forEach(function (pair) { if (pair) pair.dispose(); });
      simW = w; simH = h; smokeW = sw; smokeH = sh;
      velocity = field(w, h, 2, true, true);
      pressure = field(w, h, 1, false, true);
      divergence = field(w, h, 1, false, false);
      curl = field(w, h, 1, false, false);
      smoke = field(sw, sh, 4, true, true);
      if (!velocity || !pressure || !divergence || !curl || !smoke) {
        env.fail('This work needs a graphics card that can write to floating-point textures, and this one would not. The other rooms still run.');
        return false;
      }
      env.live('cells', Gallery.formatCount(w * h));
      warmed = false;
      return true;
    }

    /* ---- the solver ---- */

    function step(dt) {
      var texel = [1 / simW, 1 / simH];
      run('curl', curl, { uTexel: texel, uVelocity: velocity.read });
      run('vorticity', velocity.write, { uTexel: texel, uVelocity: velocity.read, uCurl: curl, uStrength: curlStrength, uDt: dt });
      velocity.swap();
      run('divergence', divergence, { uTexel: texel, uVelocity: velocity.read });
      // last frame's pressure is a good first guess for this frame's
      run('scale', pressure.write, { uTexel: texel, uSource: pressure.read, uKeep: 0.8 });
      pressure.swap();
      for (var i = 0; i < PRESSURE_PASSES; i++) {
        run('pressure', pressure.write, { uTexel: texel, uPressure: pressure.read, uDivergence: divergence });
        pressure.swap();
      }
      run('project', velocity.write, { uTexel: texel, uPressure: pressure.read, uVelocity: velocity.read });
      velocity.swap();
      run('advect', velocity.write, { uTexel: texel, uVelocity: velocity.read, uSource: velocity.read, uVelocityTexel: texel, uDt: dt, uKeep: Math.exp(-0.22 * dt) });
      velocity.swap();
      run('advect', smoke.write, { uTexel: texel, uVelocity: velocity.read, uSource: smoke.read, uVelocityTexel: texel, uDt: dt, uKeep: Math.exp(-0.55 * dt) });
      smoke.swap();
    }

    // A push and a puff at (x, y) in 0…1 from the lower left. The push is in cells a second.
    function splat(x, y, pushX, pushY, color, radius) {
      var aspect = size.w / size.h;
      run('splat', velocity.write, { uTexel: [0, 0], uSource: velocity.read, uPoint: [x, y], uAmount: [pushX, pushY, 0], uRadius: radius, uAspect: aspect });
      velocity.swap();
      run('splat', smoke.write, { uTexel: [0, 0], uSource: smoke.read, uPoint: [x, y], uAmount: color, uRadius: radius, uAspect: aspect });
      smoke.swap();
    }

    function gust() {
      var x = 0.08 + Math.random() * 0.84, y = 0.1 + Math.random() * 0.8;
      var toCentre = Math.atan2(0.5 - y, 0.5 - x) + (Math.random() - 0.5) * 1.8;
      var speed = 500 + Math.random() * 900;
      var c = INKS[gustInk++ % INKS.length];
      splat(x, y, Math.cos(toCentre) * speed, Math.sin(toCentre) * speed, [c[0] * 0.3, c[1] * 0.3, c[2] * 0.3], 0.0025 + Math.random() * 0.0035);
    }

    // Whatever the pointer did since last frame becomes a run of pushes along its path.
    function stir(dt) {
      if (!pointer.inside) { last = null; return false; }
      var here = { x: pointer.x, y: pointer.y };
      var from = last || here;
      last = here;
      var dx = here.x - from.x, dy = here.y - from.y;
      var moved = Math.sqrt(dx * dx + dy * dy);
      if (moved < 0.5) return false;
      inkClock += dt;
      if (inkClock > 1.1) { inkClock = 0; ink = (ink + 1) % INKS.length; }
      var pushX = Gallery.clamp(dx / size.w * simW / dt * 0.55, -1600, 1600);
      var pushY = Gallery.clamp(-dy / size.h * simH / dt * 0.55, -1600, 1600);
      var strength = 0.12 + Math.min(1, moved / dt / 1800) * 0.3;
      var c = INKS[ink];
      var dabs = Math.min(8, Math.ceil(moved / 14));
      for (var i = 1; i <= dabs; i++) {
        var t = i / dabs;
        splat((from.x + dx * t) / size.w, 1 - (from.y + dy * t) / size.h, pushX / dabs, pushY / dabs,
          [c[0] * strength / dabs, c[1] * strength / dabs, c[2] * strength / dabs], 0.0011);
      }
      return true;
    }

    function show() {
      run('show', null, { uTexel: [0, 0], uSmoke: smoke.read, uSmokeTexel: [1 / smokeW, 1 / smokeH] });
    }

    /* ---- wiring ---- */

    function clearAir() {
      [velocity, smoke, pressure].forEach(function (pair) {
        [pair.read, pair.write].forEach(function (t) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, t.framebuffer);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
        });
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    var clearButton = env.room.querySelector('[data-weather-clear]');
    if (clearButton) clearButton.addEventListener('click', function () { if (!lost && velocity) { clearAir(); untilGust = 1.5; warmed = true; env.redraw(); } });

    var gustButton = env.room.querySelector('[data-weather-gusts]');
    if (gustButton) {
      gustButton.addEventListener('click', function () {
        gusts = !gusts;
        gustButton.setAttribute('aria-pressed', String(gusts));
      });
    }

    var curlDial = env.room.querySelector('[data-weather-curl]');
    var curlReadout = env.room.querySelector('[data-weather-curl-value]');
    function readCurl() {
      curlStrength = Number(curlDial.value);
      if (curlReadout) curlReadout.textContent = curlStrength === 0 ? 'not at all' : curlStrength < 20 ? 'a little' : curlStrength < 40 ? 'like smoke' : 'like a storm';
    }
    if (curlDial) { curlDial.addEventListener('input', readCurl); readCurl(); }

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', function () {
      build();
      velocity = smoke = pressure = divergence = curl = null;
      simW = simH = 0;
      lost = !allocate();
      env.redraw();
    });

    build();

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        allocate();
      },
      frame: function (time, dt) {
        if (lost || !velocity) return;
        var stirred = stir(dt);
        if (opening > 0) { gust(); opening--; }
        if (gusts && !stirred) {
          untilGust -= dt;
          if (untilGust <= 0) { gust(); untilGust = 0.7 + Math.random() * 1.6; }
        }
        step(dt);
        show();
        meanDt += (dt - meanDt) * 0.05;
        if (++frames % 30 === 0) env.live('solves', Gallery.formatCount(Math.round(PRESSURE_PASSES / meanDt / 10) * 10));
      },
      // With motion paused: let some weather happen out of sight, then show it.
      still: function () {
        if (lost || !velocity) return;
        if (!warmed) {
          for (var i = 0; i < 90; i++) { if (i % 9 === 0 && i < 60) gust(); step(1 / 60); }
          warmed = true;
        }
        show();
      }
    };
  });
})();
