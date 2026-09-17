/* core.js — the small runtime every work plugs into.

   A work is a function registered with Gallery.register(name, factory).
   The factory receives an `env` (its canvas, size, pointer, helpers) and
   returns { resize, frame, still?, reveal?, motion?, adaptive? }.

   The core owns the things no work should have to think about: one frame
   loop, running only what is on screen, a sane time step, resolution that
   backs off on slow machines, the motion switch, and failing politely. */
(function () {
  'use strict';

  var MAX_DPR = 2;
  var MIN_SCALE = 0.5;

  var factories = {};
  var instances = [];
  var liveEls = {};
  var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motionOn = !reducedQuery.matches;
  var revealed = false;
  var lastNow = 0;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* ---- live figures on the wall labels -------------------------------- */

  function setLive(id, value) {
    var el = liveEls[id];
    if (!el) return;
    var text = String(value);
    if (el.__shown !== text) {
      el.textContent = text;
      el.__shown = text;
    }
  }

  function formatCount(n) {
    return Math.round(n).toLocaleString('en-US');
  }

  /* ---- instances ------------------------------------------------------- */

  function Instance(stage) {
    this.name = stage.getAttribute('data-work');
    this.stage = stage;
    this.canvas = stage.querySelector('canvas');
    this.notice = stage.querySelector('.stage__notice');
    this.room = stage.closest('[data-room]') || stage;
    this.api = null;
    this.failed = false;
    this.visible = false;
    this.dirty = true;
    this.time = 0;
    this.frames = 0;
    this.fps = 60;
    this.size = { w: 1, h: 1, dpr: 1, scale: 1 };
    this.pointer = { x: 0, y: 0, inside: false, down: false, moved: 0, type: 'mouse' };
    // adaptive resolution bookkeeping
    this.emaMs = 16.7;
    this.sinceChange = 0;
    this.beforeDrop = 0;
    this.lockScale = false;
  }

  function fail(inst, message) {
    if (inst.failed) return;
    inst.failed = true;
    inst.stage.classList.add('is-failed');
    if (inst.notice) inst.notice.textContent = message;
  }

  function measure(inst) {
    var rect = inst.stage.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    var s = inst.size;
    if (w === s.w && h === s.h && dpr === s.dpr) return false;
    s.w = w; s.h = h; s.dpr = dpr;
    return true;
  }

  function applySize(inst) {
    if (!inst.api || inst.failed) return;
    try {
      inst.api.resize(inst.size);
    } catch (err) {
      console.error(err);
      fail(inst, 'This work stopped because of an error while resizing. Reload the page to start it again.');
    }
    inst.dirty = true;
  }

  function init(inst) {
    if (inst.api || inst.failed) return;
    var factory = factories[inst.name];
    if (!factory) return;
    measure(inst);
    var env = {
      name: inst.name,
      stage: inst.stage,
      canvas: inst.canvas,
      room: inst.room,
      size: inst.size,
      pointer: inst.pointer,
      live: function (key, value) { setLive(inst.name + '.' + key, value); },
      fail: function (message) { fail(inst, message); },
      motion: function () { return motionOn; },
      revealed: function () { return revealed; },
      redraw: function () { inst.dirty = true; }
    };
    try {
      inst.api = factory(env) || null;
    } catch (err) {
      console.error(err);
      fail(inst, 'This work could not start in this browser. The other rooms still run.');
    }
    if (inst.failed) { inst.api = null; return; }
    if (!inst.api) return;
    applySize(inst);
    if (revealed && inst.api.reveal) inst.api.reveal();
  }

  function trackPointer(inst) {
    var p = inst.pointer;
    var target = inst.room;

    function place(e) {
      var rect = inst.canvas.getBoundingClientRect();
      p.x = e.clientX - rect.left;
      p.y = e.clientY - rect.top;
      p.inside = true;
      p.type = e.pointerType || 'mouse';
      p.moved = performance.now();
    }

    target.addEventListener('pointermove', place);
    target.addEventListener('pointerdown', function (e) { place(e); p.down = true; });
    target.addEventListener('pointerup', function (e) {
      p.down = false;
      if (e.pointerType !== 'mouse') p.inside = false;
    });
    target.addEventListener('pointercancel', function () { p.down = false; p.inside = false; });
    target.addEventListener('pointerleave', function () { p.down = false; p.inside = false; });
  }

  /* ---- adaptive resolution --------------------------------------------
     Only ever steps down, and only while stepping down is helping. If a
     drop in resolution does not buy back frame time (a 30 Hz display, a
     busy main thread) it is undone and the scale is locked. */

  function adapt(inst, ms) {
    if (!inst.api.adaptive || inst.lockScale || ms > 100) return;
    inst.emaMs += (ms - inst.emaMs) * 0.08;
    inst.sinceChange++;
    if (inst.sinceChange < 50) return;

    var s = inst.size;
    if (inst.beforeDrop) {
      if (inst.emaMs > inst.beforeDrop * 0.93) {
        s.scale = Math.min(1, s.scale / 0.82);
        inst.lockScale = true;
        applySize(inst);
        return;
      }
      inst.beforeDrop = 0;
    }
    if (inst.emaMs > 21.5 && s.scale > MIN_SCALE) {
      inst.beforeDrop = inst.emaMs;
      s.scale = Math.max(MIN_SCALE, s.scale * 0.82);
      inst.sinceChange = 0;
      applySize(inst);
    }
  }

  /* ---- the frame loop -------------------------------------------------- */

  function runFrame(inst, dt) {
    inst.time += dt;
    inst.frames++;
    try {
      inst.api.frame(inst.time, dt);
    } catch (err) {
      console.error(err);
      fail(inst, 'This work stopped because of an error. Reload the page to start it again.');
    }
    inst.dirty = false;
  }

  function runStill(inst) {
    try {
      if (inst.api.still) inst.api.still(inst.time);
      else inst.api.frame(inst.time, 0);
    } catch (err) {
      console.error(err);
      fail(inst, 'This work stopped because of an error. Reload the page to start it again.');
    }
    inst.dirty = false;
  }

  function tick(now) {
    requestAnimationFrame(tick);
    var ms = lastNow ? now - lastNow : 16.7;
    lastNow = now;
    var dt = clamp(ms / 1000, 0.001, 0.05);

    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      if (!inst.api || inst.failed || !inst.visible) continue;
      if (motionOn) {
        runFrame(inst, dt);
        if (inst.failed) continue;
        if (ms < 250) inst.fps += (1000 / ms - inst.fps) * 0.06;
        if (inst.frames % 30 === 0) setLive(inst.name + '.fps', Math.round(inst.fps));
        adapt(inst, ms);
      } else if (inst.dirty) {
        runStill(inst);
      }
    }
  }

  /* ---- visibility, sizing ------------------------------------------------ */

  function inViewport(el, marginFraction) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var m = vh * marginFraction;
    return rect.bottom > -m && rect.top < vh + m;
  }

  function watch() {
    var nearObserver = null;
    var seenObserver = null;

    if ('IntersectionObserver' in window) {
      nearObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) init(entry.target.__inst);
        });
      }, { rootMargin: '60% 0px' });

      seenObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var inst = entry.target.__inst;
          inst.visible = entry.isIntersecting;
          if (inst.visible) { inst.dirty = true; inst.sinceChange = 0; }
        });
      }, { rootMargin: '5% 0px' });
    }

    instances.forEach(function (inst) {
      inst.stage.__inst = inst;
      // Do not wait for the observers' first callback.
      if (inViewport(inst.stage, 0.6)) init(inst);
      inst.visible = inViewport(inst.stage, 0.05);
      if (nearObserver) {
        nearObserver.observe(inst.stage);
        seenObserver.observe(inst.stage);
      } else {
        init(inst);
        inst.visible = true;
      }
    });

    function remeasureAll() {
      instances.forEach(function (inst) {
        if (measure(inst)) applySize(inst);
      });
    }

    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(remeasureAll);
      instances.forEach(function (inst) { ro.observe(inst.stage); });
    }
    window.addEventListener('resize', remeasureAll);
    window.addEventListener('orientationchange', remeasureAll);
  }

  /* ---- the motion switch ------------------------------------------------- */

  function setMotion(on) {
    motionOn = on;
    var button = document.querySelector('[data-motion-toggle]');
    if (button) {
      var verb = button.querySelector('[data-motion-verb]');
      if (verb) verb.textContent = on ? 'Pause' : 'Play';
      button.setAttribute('aria-label', on ? 'Pause motion' : 'Play motion');
      button.classList.toggle('is-paused', !on);
    }
    instances.forEach(function (inst) {
      inst.dirty = true;
      if (inst.api && inst.api.motion) inst.api.motion(on);
    });
  }

  function wireMotionToggle() {
    var button = document.querySelector('[data-motion-toggle]');
    if (button) button.addEventListener('click', function () { setMotion(!motionOn); });
    setMotion(motionOn);
  }

  /* ---- which room are we in ------------------------------------------------ */

  function wireRoomsNav() {
    var links = {};
    document.querySelectorAll('.rooms-nav__link').forEach(function (a) {
      links[a.getAttribute('href').slice(1)] = a;
    });

    function mark(id) {
      Object.keys(links).forEach(function (key) {
        var current = key === id;
        links[key].classList.toggle('is-current', current);
        if (current) links[key].setAttribute('aria-current', 'true');
        else links[key].removeAttribute('aria-current');
      });
    }

    if (!('IntersectionObserver' in window)) return;
    // A thin band across the middle of the screen decides the current room.
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) mark(entry.target.id);
      });
    }, { rootMargin: '-48% 0px -48% 0px' });
    document.querySelectorAll('[data-room]').forEach(function (room) { observer.observe(room); });
    mark('quicksilver');
  }

  /* ---- reveal: the one orchestrated moment ----------------------------------- */

  function reveal() {
    if (revealed) return;
    revealed = true;
    document.documentElement.classList.remove('is-loading');
    instances.forEach(function (inst) {
      if (inst.api && inst.api.reveal) inst.api.reveal();
    });
  }

  function scheduleReveal() {
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fonts.then(function () { requestAnimationFrame(reveal); });
    setTimeout(reveal, 2500);
  }

  /* ---- a favicon, computed like everything else ------------------------------- */

  function drawFavicon() {
    try {
      var c = document.createElement('canvas');
      c.width = c.height = 64;
      var g = c.getContext('2d');
      var body = g.createRadialGradient(24, 20, 2, 32, 32, 30);
      body.addColorStop(0, '#ffffff');
      body.addColorStop(0.25, '#cfd6e6');
      body.addColorStop(0.6, '#4a5068');
      body.addColorStop(1, '#0b0c12');
      g.fillStyle = body;
      g.beginPath();
      g.arc(32, 32, 28, 0, Math.PI * 2);
      g.fill();
      var link = document.createElement('link');
      link.rel = 'icon';
      link.href = c.toDataURL('image/png');
      document.head.appendChild(link);
    } catch (err) { /* a missing favicon is not worth a warning */ }
  }

  /* ---- WebGL helpers ------------------------------------------------------------ */

  var glHelpers = {
    context: function (canvas, attributes, requireV2) {
      var gl = null;
      var version = 0;
      try { gl = canvas.getContext('webgl2', attributes); if (gl) version = 2; } catch (e) { gl = null; }
      if (!gl && !requireV2) {
        try { gl = canvas.getContext('webgl', attributes); if (gl) version = 1; } catch (e2) { gl = null; }
      }
      return gl ? { gl: gl, version: version } : null;
    },

    program: function (gl, vertexSource, fragmentSource) {
      function compile(type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          var log = gl.getShaderInfoLog(shader);
          gl.deleteShader(shader);
          throw new Error('Shader failed to compile: ' + log);
        }
        return shader;
      }
      var program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('Program failed to link: ' + gl.getProgramInfoLog(program));
      }
      return program;
    },

    // One oversized triangle covers the screen with no diagonal seam.
    fullscreenTriangle: function (gl) {
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      return buffer;
    },

    uniforms: function (gl, program, names) {
      var out = {};
      names.forEach(function (name) { out[name] = gl.getUniformLocation(program, name); });
      return out;
    },

    // Simulations on the graphics card keep their state in half-float
    // textures and need to be able to draw into them. WebGL 2 only.
    canRenderFloat: function (gl) {
      return !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
    },

    // A half-float texture that can be drawn into. `channels` is 1, 2 or 4.
    // Returns null if this graphics card refuses the combination.
    floatTarget: function (gl, width, height, channels, smooth) {
      var formats = { 1: [gl.R16F, gl.RED], 2: [gl.RG16F, gl.RG], 4: [gl.RGBA16F, gl.RGBA] }[channels];
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, formats[0], width, height, 0, formats[1], gl.HALF_FLOAT, null);
      var filter = smooth ? gl.LINEAR : gl.NEAREST;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      var complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.clearColor(0, 0, 0, 0);
      if (complete) gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!complete) { gl.deleteTexture(texture); gl.deleteFramebuffer(framebuffer); return null; }
      return { texture: texture, framebuffer: framebuffer, width: width, height: height };
    },

    // Two of them, for steps that read the last state and write the next.
    floatPair: function (gl, width, height, channels, smooth) {
      var a = glHelpers.floatTarget(gl, width, height, channels, smooth);
      var b = a && glHelpers.floatTarget(gl, width, height, channels, smooth);
      if (!a || !b) return null;
      return {
        read: a, write: b, width: width, height: height,
        swap: function () { var t = this.read; this.read = this.write; this.write = t; },
        dispose: function () {
          [a, b].forEach(function (t) { gl.deleteTexture(t.texture); gl.deleteFramebuffer(t.framebuffer); });
        }
      };
    }
  };

  /* ---- boot ------------------------------------------------------------------------ */

  function boot() {
    document.querySelectorAll('[data-live]').forEach(function (el) {
      liveEls[el.getAttribute('data-live')] = el;
    });
    document.querySelectorAll('[data-work]').forEach(function (stage) {
      var inst = new Instance(stage);
      instances.push(inst);
      trackPointer(inst);
    });
    drawFavicon();
    wireMotionToggle();
    wireRoomsNav();
    watch();
    scheduleReveal();
    requestAnimationFrame(tick);
  }

  window.Gallery = {
    register: function (name, factory) { factories[name] = factory; },
    gl: glHelpers,
    clamp: clamp,
    formatCount: formatCount,

    // A work's own interface, for testing from the console.
    inspect: function (name) {
      var inst = instances.filter(function (i) { return i.name === name; })[0];
      return inst ? inst.api : null;
    },

    // Advance one work by hand, without waiting for the display. Used to test
    // the works in a browser window that is not being painted.
    step: function (name, frames, dtSeconds) {
      var inst = instances.filter(function (i) { return i.name === name; })[0];
      if (!inst) return null;
      init(inst);
      if (measure(inst)) applySize(inst);
      if (!inst.api) return { failed: inst.failed };
      for (var i = 0; i < (frames || 1); i++) runFrame(inst, dtSeconds || 1 / 60);
      return { failed: inst.failed, time: inst.time, size: inst.size };
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
