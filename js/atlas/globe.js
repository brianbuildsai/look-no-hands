/* globe.js — the chart, on a sphere.

   There is no mesh. The globe is drawn by a fragment shader: for each pixel
   inside the disc it works out which point of the sphere is showing, turns
   that into a latitude and longitude, reads the height there from the
   survey, and inks it the way a chart would be: stepped depth and height
   tints, contour lines where the tints change, a coastline, hill shading
   lit from the north-west, and a graticule every fifteen degrees.

   North stays up, as on a chart. The view is described by the latitude and
   longitude at the centre of the disc. */
(function (root) {
  'use strict';

  var RAD = Math.PI / 180;
  var MAX_TILT = 80 * RAD;

  var VERTEX = [
    'attribute vec2 aPosition;',
    'void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }'
  ].join('\n');

  var FRAGMENT = [
    '#extension GL_OES_standard_derivatives : enable',
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform sampler2D uSurvey;',
    'uniform vec2 uSurveySize;',
    'uniform vec2 uCentre;      // of the disc, in canvas pixels',
    'uniform float uRadius;     // of the disc, in canvas pixels',
    'uniform vec2 uView;        // latitude and longitude at the centre, radians',
    'uniform vec2 uRange;       // the metres that 0 and 65535 stand for',
    'uniform float uTexelKm;    // ground covered by one survey cell at the equator',
    'const float PI = 3.14159265359;',
    '',
    '#ifdef GL_OES_standard_derivatives',
    'float spread(float v) { return max(fwidth(v), 1e-5); }',
    '#else',
    'float spread(float v) { return max(abs(v) * 0.02, 1e-3); }',
    '#endif',
    '',
    '// Heights arrive packed into two bytes, so they are unpacked and blended',
    '// between the four nearest cells by hand.',
    'float unpack(vec4 t) {',
    '  float sixteen = floor(t.r * 255.0 + 0.5) * 256.0 + floor(t.g * 255.0 + 0.5);',
    '  return sixteen / 65535.0 * (uRange.y - uRange.x) + uRange.x;',
    '}',
    'float heightAt(vec2 uv) {',
    '  vec2 st = uv * uSurveySize - 0.5;',
    '  vec2 cell = floor(st);',
    '  vec2 f = st - cell;',
    '  vec2 a = (cell + 0.5) / uSurveySize;',
    '  vec2 b = (cell + 1.5) / uSurveySize;',
    '  float h00 = unpack(texture2D(uSurvey, vec2(a.x, a.y)));',
    '  float h10 = unpack(texture2D(uSurvey, vec2(b.x, a.y)));',
    '  float h01 = unpack(texture2D(uSurvey, vec2(a.x, b.y)));',
    '  float h11 = unpack(texture2D(uSurvey, vec2(b.x, b.y)));',
    '  return mix(mix(h00, h10, f.x), mix(h01, h11, f.x), f.y);',
    '}',
    '',
    '// Depth tints: deeper water is printed darker.',
    'vec3 seaTint(float depth) {',
    '  if (depth < 200.0) return vec3(0.875, 0.937, 0.961);',
    '  if (depth < 1000.0) return vec3(0.773, 0.882, 0.925);',
    '  if (depth < 3000.0) return vec3(0.686, 0.827, 0.898);',
    '  if (depth < 5000.0) return vec3(0.588, 0.765, 0.859);',
    '  return vec3(0.498, 0.690, 0.800);',
    '}',
    '// Height tints: buff lowlands through ochre to pale summits.',
    'vec3 landTint(float h) {',
    '  if (h < 200.0) return vec3(0.953, 0.918, 0.776);',
    '  if (h < 500.0) return vec3(0.933, 0.867, 0.667);',
    '  if (h < 1000.0) return vec3(0.906, 0.812, 0.573);',
    '  if (h < 2000.0) return vec3(0.863, 0.741, 0.486);',
    '  if (h < 3500.0) return vec3(0.800, 0.651, 0.412);',
    '  if (h < 5000.0) return vec3(0.722, 0.565, 0.361);',
    '  return vec3(0.957, 0.949, 0.925);',
    '}',
    '// How far, in metres, this height is from the nearest change of tint.',
    'float toContour(float h) {',
    '  float d = abs(h + 5000.0);',
    '  d = min(d, abs(h + 3000.0));',
    '  d = min(d, abs(h + 1000.0));',
    '  d = min(d, abs(h + 200.0));',
    '  d = min(d, abs(h - 200.0));',
    '  d = min(d, abs(h - 500.0));',
    '  d = min(d, abs(h - 1000.0));',
    '  d = min(d, abs(h - 2000.0));',
    '  d = min(d, abs(h - 3500.0));',
    '  return min(d, abs(h - 5000.0));',
    '}',
    '',
    'void main() {',
    '  vec2 p = (gl_FragCoord.xy - uCentre) / uRadius;',
    '  float r2 = dot(p, p);',
    '  float edge = (sqrt(r2) - 1.0) * uRadius;     // pixels outside the limb',
    '  if (edge > 1.0) { gl_FragColor = vec4(0.0); return; }',
    '',
    '  // the point of the sphere under this pixel, then undo the tilt',
    '  float z = sqrt(max(1.0 - r2, 0.0));',
    '  float y = p.y * cos(uView.x) + z * sin(uView.x);',
    '  float depthwards = -p.y * sin(uView.x) + z * cos(uView.x);',
    '  float lat = asin(clamp(y, -1.0, 1.0));',
    '  float lon = uView.y + atan(p.x, depthwards);',
    '  vec2 uv = vec2(fract(lon / (2.0 * PI) + 0.5), 0.5 - lat / PI);',
    '',
    '  vec3 stock = vec3(0.957, 0.965, 0.953);',
    '  vec3 ink = vec3(0.078, 0.125, 0.169);',
    '  vec3 color = stock;',
    '',
    '  // rows the survey has not reached yet are left as blank paper',
    '  vec2 nearest = (floor(uv * uSurveySize) + 0.5) / uSurveySize;',
    '  float known = step(0.5, texture2D(uSurvey, nearest).b);',
    '',
    '  // (read outside the branch: screen-space derivatives need every pixel to take the same path)',
    '  float h = heightAt(uv);',
    '  float hSpread = spread(h);',
    '  if (known > 0.5) {',
    '    if (h < 0.0) {',
    '      color = seaTint(-h);',
    '      float isobath = 1.0 - smoothstep(0.3, 1.1, toContour(h) / hSpread);',
    '      color = mix(color, vec3(0.31, 0.50, 0.64), isobath * 0.55);',
    '    } else {',
    '      color = landTint(h);',
    '      // slope of the ground, east and north, for the hill shading',
    '      vec2 texel = 1.0 / uSurveySize;',
    '      float metres = uTexelKm * 1000.0;',
    '      float east = (heightAt(uv + vec2(texel.x, 0.0)) - heightAt(uv - vec2(texel.x, 0.0))) / (2.0 * metres * max(cos(lat), 0.15));',
    '      float north = (heightAt(uv - vec2(0.0, texel.y)) - heightAt(uv + vec2(0.0, texel.y))) / (2.0 * metres);',
    '      vec3 n = normalize(vec3(-east * 30.0, -north * 30.0, 1.0));',
    '      float lit = dot(n, normalize(vec3(-0.55, 0.55, 0.62))) / 0.62;',
    '      color *= mix(0.72, 1.0, clamp(lit, 0.0, 1.0)) + 0.1 * clamp(lit - 1.0, 0.0, 0.6);',
    '      float contour = 1.0 - smoothstep(0.3, 1.1, toContour(h) / hSpread);',
    '      color = mix(color, vec3(0.50, 0.34, 0.18), contour * 0.4 * clamp(1.6 - hSpread / 90.0, 0.2, 1.0));',
    '    }',
    '    float coast = 1.0 - smoothstep(0.5, 1.5, abs(h) / hSpread);',
    '    color = mix(color, ink, coast * 0.9);',
    '  }',
    '',
    '  // graticule every fifteen degrees; sin(12a) is zero exactly there, and',
    '  // has no jump where longitude wraps round',
    '  float parallel = sin(12.0 * lat);',
    '  float meridian = sin(12.0 * lon);',
    '  float lines = 1.0 - smoothstep(0.35, 1.05, abs(parallel) / spread(parallel));',
    '  float fadeAtPoles = 1.0 - smoothstep(1.30, 1.45, abs(lat));',
    '  lines = max(lines, (1.0 - smoothstep(0.35, 1.05, abs(meridian) / spread(meridian))) * fadeAtPoles);',
    '  color = mix(color, ink, lines * 0.17);',
    '',
    '  // a little shade toward the limb for roundness, then the limb itself',
    '  color *= 1.0 - 0.11 * r2 * r2 * r2;',
    '  color = mix(color, ink, 1.0 - smoothstep(0.6, 1.6, abs(edge + 0.8)));',
    '  float alpha = 1.0 - smoothstep(0.0, 1.0, edge);',
    '  gl_FragColor = vec4(color * alpha, alpha);',
    '}'
  ].join('\n');

  function create(container, options) {
    options = options || {};
    var surface = container.querySelector('.globe__surface');
    var notice = container.querySelector('.globe__notice');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    var view = { lat: 18 * RAD, lon: 0 };          // what is at the centre of the disc
    var spin = { lat: 0, lon: 0 };                 // how fast it is turning, radians a second
    var flight = null;                             // a journey to a chosen place
    var size = { w: 1, h: 1, ratio: 1, radius: 1 };
    var world = null;
    var uploadedRows = 0;
    var dirty = true;
    var onScreen = true;
    var dragging = null;
    var lastTouched = -1e9;
    var idleTurn = true;
    var lastNow = 0;
    var failed = false;

    /* ---- the graphics card's side ---- */

    function fail(message) {
      failed = true;
      container.classList.add('is-failed');
      if (notice) notice.textContent = message;
    }

    var gl = null;
    try {
      gl = surface.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true });
    } catch (e) { gl = null; }
    if (!gl) {
      fail('The globe is drawn by your graphics card, and this browser has WebGL switched off. The gazetteer and almanac below still describe the world.');
    }

    var program, uniforms, texture;

    function compile(type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    }

    function build() {
      gl.getExtension('OES_standard_derivatives');   // for hairlines of even width; the shader copes without
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      uniforms = {};
      ['uSurvey', 'uSurveySize', 'uCentre', 'uRadius', 'uView', 'uRange', 'uTexelKm'].forEach(function (name) {
        uniforms[name] = gl.getUniformLocation(program, name);
      });
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var location = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);

      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);         // longitude wraps round
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);  // latitude does not
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      uploadedRows = 0;
      if (world) startTexture();
    }

    function startTexture() {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, world.width, world.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, world.bytes);
      uploadedRows = world.rowsDone;
    }

    // Send the graphics card whichever rows have been surveyed since last time.
    function uploadNewRows() {
      if (!world || uploadedRows >= world.rowsDone) return false;
      var from = uploadedRows, count = world.rowsDone - from;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, from, world.width, count, gl.RGBA, gl.UNSIGNED_BYTE,
        world.bytes.subarray(from * world.width * 4, (from + count) * world.width * 4));
      uploadedRows = world.rowsDone;
      return true;
    }

    function render() {
      if (failed) return;
      gl.viewport(0, 0, surface.width, surface.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!world) return;
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniforms.uSurvey, 0);
      gl.uniform2f(uniforms.uSurveySize, world.width, world.height);
      gl.uniform2f(uniforms.uCentre, size.w * size.ratio / 2, size.h * size.ratio / 2);
      gl.uniform1f(uniforms.uRadius, size.radius * size.ratio);
      gl.uniform2f(uniforms.uView, view.lat, view.lon);
      gl.uniform2f(uniforms.uRange, world.encodeMin, world.encodeMax);
      gl.uniform1f(uniforms.uTexelKm, 2 * Math.PI * world.shape.radiusKm / world.width);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (gl) {
      try { build(); } catch (err) {
        console.error(err);
        fail('The globe could not be drawn on this graphics card. The gazetteer and almanac below still describe the world.');
      }
      surface.addEventListener('webglcontextlost', function (e) { e.preventDefault(); });
      surface.addEventListener('webglcontextrestored', function () {
        try { build(); dirty = true; } catch (err) { console.error(err); fail('The graphics driver reset and the globe could not be redrawn. Reload the page to see it again.'); }
      });
    }

    /* ---- where things are ---- */

    function resize() {
      var rect = container.getBoundingClientRect();
      var w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (w === size.w && h === size.h && ratio === size.ratio) return;
      size.w = w; size.h = h; size.ratio = ratio;
      size.radius = Math.min(w, h) * 0.46;
      surface.width = Math.round(w * ratio);
      surface.height = Math.round(h * ratio);
      if (options.onResize) options.onResize(size);
      dirty = true;
    }

    // Latitude and longitude (degrees) to a position over the container.
    // `facing` runs from 1 at the centre of the disc to 0 at the limb, and
    // below 0 on the far side.
    function project(latDeg, lonDeg) {
      var lat = latDeg * RAD, lon = lonDeg * RAD - view.lon;
      var x = Math.cos(lat) * Math.sin(lon);
      var y = Math.sin(lat);
      var z = Math.cos(lat) * Math.cos(lon);
      var up = y * Math.cos(view.lat) - z * Math.sin(view.lat);
      var toward = y * Math.sin(view.lat) + z * Math.cos(view.lat);
      return { x: size.w / 2 + x * size.radius, y: size.h / 2 - up * size.radius, facing: toward };
    }

    // The reverse: what is under this point of the container, if anything.
    function unproject(px, py) {
      var u = (px - size.w / 2) / size.radius, v = (size.h / 2 - py) / size.radius;
      var r2 = u * u + v * v;
      if (r2 > 1) return null;
      var z = Math.sqrt(1 - r2);
      var y = v * Math.cos(view.lat) + z * Math.sin(view.lat);
      var depthwards = -v * Math.sin(view.lat) + z * Math.cos(view.lat);
      var lon = (view.lon + Math.atan2(u, depthwards)) / RAD;
      lon = ((lon + 180) % 360 + 360) % 360 - 180;
      return { lat: Math.asin(Math.max(-1, Math.min(1, y))) / RAD, lon: lon };
    }

    /* ---- turning it ---- */

    function touched() {
      lastTouched = performance.now();
      dirty = true;
    }

    function clampTilt() {
      view.lat = Math.max(-MAX_TILT, Math.min(MAX_TILT, view.lat));
    }

    container.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragging = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, moved: 0 };
      flight = null;
      spin.lat = spin.lon = 0;
      try { container.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      touched();
    });

    container.addEventListener('pointermove', function (e) {
      if (!dragging || dragging.id !== e.pointerId) return;
      var dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
      var dt = Math.max(1, e.timeStamp - dragging.t) / 1000;
      // dragging by one radius turns the globe one radian: the surface follows the hand
      var dLon = -dx / size.radius, dLat = dy / size.radius;
      view.lon += dLon;
      view.lat += dLat;
      clampTilt();
      spin.lon = spin.lon * 0.6 + (dLon / dt) * 0.4;
      spin.lat = spin.lat * 0.6 + (dLat / dt) * 0.4;
      dragging.x = e.clientX; dragging.y = e.clientY; dragging.t = e.timeStamp;
      dragging.moved += Math.abs(dx) + Math.abs(dy);
      if (dragging.moved > 4) container.classList.add('is-turning');
      touched();
    });

    function release(e) {
      if (!dragging || (e && dragging.id !== e.pointerId)) return;
      var wasClick = dragging.moved <= 4;
      // a drag that stopped before release should not fling the globe
      if (e && e.timeStamp - dragging.t > 80) spin.lat = spin.lon = 0;
      if (reduced.matches) spin.lat = spin.lon = 0;
      dragging = null;
      container.classList.remove('is-turning');
      if (wasClick && e && options.onClick) {
        var rect = container.getBoundingClientRect();
        options.onClick(e.clientX - rect.left, e.clientY - rect.top);
      }
      touched();
    }
    container.addEventListener('pointerup', release);
    container.addEventListener('pointercancel', function (e) { if (dragging) { dragging.moved = 99; release(e); } });

    container.addEventListener('pointermove', function (e) {
      if (dragging || !options.onHover) return;
      var rect = container.getBoundingClientRect();
      options.onHover(e.clientX - rect.left, e.clientY - rect.top);
    });

    container.addEventListener('keydown', function (e) {
      var step = 10 * RAD;
      if (e.key === 'ArrowLeft') view.lon -= step;
      else if (e.key === 'ArrowRight') view.lon += step;
      else if (e.key === 'ArrowUp') view.lat += step;
      else if (e.key === 'ArrowDown') view.lat -= step;
      else return;
      e.preventDefault();
      flight = null;
      spin.lat = spin.lon = 0;
      clampTilt();
      idleTurn = false;
      touched();
    });

    // Travel to a place. The shorter way round, eased, under a second.
    function flyTo(latDeg, lonDeg) {
      var lat = Math.max(-MAX_TILT, Math.min(MAX_TILT, latDeg * RAD));
      var lon = lonDeg * RAD;
      var turn = lon - view.lon;
      turn = turn - Math.round(turn / (2 * Math.PI)) * 2 * Math.PI;
      spin.lat = spin.lon = 0;
      idleTurn = false;
      if (reduced.matches) {
        view.lat = lat; view.lon += turn; flight = null;
      } else {
        flight = { fromLat: view.lat, fromLon: view.lon, toLat: lat, toLon: view.lon + turn, t: 0 };
      }
      touched();
    }

    /* ---- the loop ---- */

    function advance(dt) {
      if (flight) {
        flight.t = Math.min(1, flight.t + dt / 0.9);
        var k = flight.t < 0.5 ? 4 * flight.t * flight.t * flight.t : 1 - Math.pow(-2 * flight.t + 2, 3) / 2;
        view.lat = flight.fromLat + (flight.toLat - flight.fromLat) * k;
        view.lon = flight.fromLon + (flight.toLon - flight.fromLon) * k;
        if (flight.t >= 1) flight = null;
        dirty = true;
      } else if (!dragging) {
        if (Math.abs(spin.lon) > 0.002 || Math.abs(spin.lat) > 0.002) {
          view.lon += spin.lon * dt;
          view.lat += spin.lat * dt;
          clampTilt();
          var friction = Math.exp(-dt * 2.6);
          spin.lon *= friction;
          spin.lat *= friction;
          dirty = true;
        } else if (idleTurn && !reduced.matches && performance.now() - lastTouched > 2500) {
          view.lon += dt * 0.045;      // a slow turn while nobody is holding it
          dirty = true;
        }
      }
      // keep the longitude small so precision never wears away
      if (view.lon > Math.PI * 2 || view.lon < -Math.PI * 2) view.lon -= Math.round(view.lon / (2 * Math.PI)) * 2 * Math.PI;
    }

    function frame(now) {
      requestAnimationFrame(frame);
      var dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 1 / 60;
      lastNow = now;
      if (!onScreen) return;
      step(dt);
    }

    function step(dt) {
      resize();
      advance(dt);
      if (!failed && uploadNewRows()) dirty = true;
      if (!dirty) return;
      dirty = false;
      render();
      if (options.onRender) options.onRender();
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) dirty = true;
      }).observe(container);
    }
    window.addEventListener('resize', function () { dirty = true; });
    requestAnimationFrame(frame);

    return {
      size: size,
      view: view,
      failed: function () { return failed; },
      project: project,
      unproject: unproject,
      flyTo: flyTo,
      setWorld: function (next) {
        world = next;
        if (!failed) startTexture();
        dirty = true;
      },
      setIdleTurn: function (on) { idleTurn = on; },
      invalidate: function () { dirty = true; },
      // Draw now, without waiting for the display. Used for testing in a window that is not being painted.
      step: function (dt) { dirty = true; step(dt || 0); }
    };
  }

  root.Atlas = root.Atlas || {};
  root.Atlas.globe = { create: create };
})(typeof window !== 'undefined' ? window : globalThis);
