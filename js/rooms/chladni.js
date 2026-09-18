/* Chladni — room 27.

   Sprinkle sand on a metal plate, bow its edge, and the sand leaps off
   wherever the plate is moving and collects where it is still: the nodal
   lines of whichever way the plate is vibrating. Ernst Chladni showed this
   to Napoleon in 1809.

   For a square plate the shapes are well described by
       f(x, y) = cos(n pi x) cos(m pi y) +/- cos(m pi x) cos(n pi y)
   for whole numbers m and n: the pattern of where it moves most and least.
   Every grain here is pushed away from where |f| is large, with a little
   random jostling in proportion to how hard the plate shakes under it, and
   settles on the lines where f is zero. The tone is synthesised: a few
   inharmonic partials, as a plate has, at a pitch that rises with the mode. */
(function () {
  'use strict';

  // the ways a square plate can ring, lowest first: [m, n, sign]
  var MODES = (function () {
    var out = [];
    for (var m = 1; m <= 7; m++) for (var n = m + 1; n <= 8; n++) out.push([m, n, (m + n) % 2 ? 1 : -1]);
    out.sort(function (a, b) { return (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1]); });
    return out;
  })();
  function pitchOf(mode) { return 48 * Math.pow(mode[0] * mode[0] + mode[1] * mode[1], 0.86); }

  /* ---- sound ---- */

  function makePlate() {
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    var audio = new AudioContextClass();
    var master = audio.createGain(), squash = audio.createDynamicsCompressor();
    master.gain.value = 0;
    squash.connect(master); master.connect(audio.destination);
    var meter = audio.createAnalyser(); meter.fftSize = 2048; master.connect(meter);
    var wave = new Float32Array(meter.fftSize);
    // a plate rings with partials that are not in tune with each other: that is what makes it sound like metal
    var partials = [[1, 0.5], [1.58, 0.28], [2.42, 0.18], [3.9, 0.08]].map(function (p) {
      var osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'sine'; gain.gain.value = 0;
      osc.connect(gain); gain.connect(squash); osc.start();
      return { osc: osc, gain: gain, ratio: p[0], level: p[1] };
    });
    return {
      audio: audio,
      // slide to a new pitch, and swell it: a bow drawn along the edge
      ring: function (hz) {
        var now = audio.currentTime;
        partials.forEach(function (p) {
          p.osc.frequency.setTargetAtTime(hz * p.ratio, now, 0.03);
          p.gain.gain.cancelScheduledValues(now);
          p.gain.gain.setTargetAtTime(p.level * 0.25, now, 0.12);
          p.gain.gain.setTargetAtTime(p.level * 0.08, now + 0.6, 1.2);
        });
      },
      setOn: function (on) {
        var now = audio.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(on ? 0.8 : 0, now + 0.25);
        if (on) return audio.resume();
        setTimeout(function () { if (master.gain.value < 0.01) audio.suspend(); }, 400);
        return Promise.resolve();
      },
      listen: function () {
        meter.getFloatTimeDomainData(wave);
        var sum = 0, crossings = 0;
        for (var i = 0; i < wave.length; i++) { sum += wave[i] * wave[i]; if (i && wave[i - 1] < 0 && wave[i] >= 0) crossings++; }
        return { state: audio.state, level: Math.sqrt(sum / wave.length), hz: crossings * audio.sampleRate / wave.length };
      }
    };
  }

  Gallery.register('chladni', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var COUNT = size.w >= 900 ? 14000 : 7000;
    var gx = new Float32Array(COUNT), gy = new Float32Array(COUNT);        // grains, in plate coordinates 0..1
    var plate = { x: 0, y: 0, side: 100 };
    var which = 4, mode = MODES[which], shake = 1, idle = 99, clock = 0, next = 0;
    var engine = null, soundOn = false, pour = null, seed = 27;
    function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

    function sprinkle() {
      for (var i = 0; i < COUNT; i++) { gx[i] = random(); gy[i] = random(); }
    }
    function choose(index, bow) {
      which = Math.max(0, Math.min(MODES.length - 1, index));
      mode = MODES[which];
      shake = 1;
      env.live('mode', mode[0] + ', ' + mode[1]);
      env.live('hz', Math.round(pitchOf(mode)));
      var readout = env.room.querySelector('[data-chladni-mode-value]');
      if (readout) readout.textContent = 'm = ' + mode[0] + ', n = ' + mode[1] + ': ' + Math.round(pitchOf(mode)) + ' Hz';
      var dial = env.room.querySelector('[data-chladni-mode]');
      if (dial && Number(dial.value) !== which) dial.value = which;
      if (bow && engine && soundOn) engine.ring(pitchOf(mode));
    }

    // every grain is shoved away from where the plate moves most, and jostled in proportion to the motion under it
    function settle(dt) {
      var m = mode[0] * Math.PI, n = mode[1] * Math.PI, sign = mode[2], k = Math.min(dt, 0.04) * 60;
      var push = 0.0014 * k * shake, jostle = 0.022 * k * shake;
      for (var i = 0; i < COUNT; i++) {
        var x = gx[i], y = gy[i];
        var cnx = Math.cos(n * x), cmy = Math.cos(m * y), cmx = Math.cos(m * x), cny = Math.cos(n * y);
        var f = cnx * cmy + sign * cmx * cny;
        // the slope of f squared, which is the way downhill toward the still lines
        var fx = -n * Math.sin(n * x) * cmy - sign * m * Math.sin(m * x) * cny;
        var fy = -m * cnx * Math.sin(m * y) - sign * n * cmx * Math.sin(n * y);
        var a = Math.abs(f);
        x += (-f * fx * push + (random() - 0.5) * jostle * a);
        y += (-f * fy * push + (random() - 0.5) * jostle * a);
        // sand that leaves the plate is lost; more is sprinkled somewhere else
        if (x < 0 || x > 1 || y < 0 || y > 1) { x = random(); y = random(); }
        gx[i] = x; gy[i] = y;
      }
    }

    function render() {
      var ratio = canvas.width / size.w, i;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);
      // the plate, held by a pin at its middle
      pen.fillStyle = '#0b0b0c';
      pen.fillRect(plate.x, plate.y, plate.side, plate.side);
      pen.strokeStyle = 'rgba(233,230,223,0.32)';
      pen.lineWidth = 1;
      pen.strokeRect(plate.x + 0.5, plate.y + 0.5, plate.side - 1, plate.side - 1);
      pen.fillStyle = '#ffb347';
      pen.beginPath(); pen.arc(plate.x + plate.side / 2, plate.y + plate.side / 2, 2.5, 0, 6.2832); pen.fill();
      // the sand
      var s = size.w >= 900 ? 1.5 : 1.2;
      pen.fillStyle = 'rgba(236,222,190,0.92)';
      pen.beginPath();
      for (i = 0; i < COUNT; i++) pen.rect(plate.x + gx[i] * plate.side - s / 2, plate.y + gy[i] * plate.side - s / 2, s, s);
      pen.fill();
      // the bow, drawn along the edge while the plate sounds
      if (shake > 0.15) {
        var t = clock * 3.1, along = plate.side * (0.5 + 0.42 * Math.sin(t));
        pen.strokeStyle = 'rgba(255,179,71,' + (0.5 * shake).toFixed(2) + ')';
        pen.lineWidth = 2;
        pen.beginPath(); pen.moveTo(plate.x + plate.side + 6, plate.y + along - 22); pen.lineTo(plate.x + plate.side + 14, plate.y + along + 22); pen.stroke();
      }
    }

    /* ---- wiring ---- */

    function place(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: (e.clientX - rect.left - plate.x) / plate.side, y: (e.clientY - rect.top - plate.y) / plate.side };
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      pour = place(e); idle = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    });
    canvas.addEventListener('pointermove', function (e) { if (pour) pour = place(e); });
    function lift() { pour = null; }
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'pan-y';

    var dial = env.room.querySelector('[data-chladni-mode]');
    if (dial) { dial.max = MODES.length - 1; dial.addEventListener('input', function () { idle = 0; choose(Number(dial.value), true); }); }
    var bowButton = env.room.querySelector('[data-chladni-bow]');
    if (bowButton) bowButton.addEventListener('click', function () { idle = 0; choose(which, true); });
    var soundButton = env.room.querySelector('[data-chladni-sound]');
    function showSound() { if (soundButton) { soundButton.textContent = soundOn ? 'Silence it' : 'Let it sound'; soundButton.classList.toggle('is-on', soundOn); } }
    if (soundButton) {
      soundButton.addEventListener('click', function () {
        if (!engine) engine = makePlate();
        if (!engine) { soundButton.textContent = 'This browser has no sound engine'; soundButton.disabled = true; return; }
        soundOn = !soundOn;
        showSound();
        engine.setOn(soundOn).then(function () { if (soundOn) engine.ring(pitchOf(mode)); }).catch(function () {});
      });
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden && soundOn && engine) { soundOn = false; engine.setOn(false); showSound(); } });

    sprinkle();
    choose(which, false);

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wide = size.w >= 900;
        plate.side = wide ? Math.min(size.w * 0.52, size.h * 0.8) : Math.min(size.w * 0.86, size.h * 0.8);
        plate.x = (wide ? size.w * 0.645 : size.w * 0.5) - plate.side / 2;
        plate.y = (wide ? size.h * 0.53 : size.h * 0.5) - plate.side / 2;
      },
      frame: function (time, dt) {
        clock += dt; idle += dt;
        shake = Math.max(0.12, shake - dt * 0.09);           // the ringing dies away, but the plate never quite stops
        if (pour) for (var k = 0; k < 40; k++) { var i = Math.floor(random() * COUNT); gx[i] = Math.max(0, Math.min(1, pour.x + (random() - 0.5) * 0.06)); gy[i] = Math.max(0, Math.min(1, pour.y + (random() - 0.5) * 0.06)); }
        // left alone, it is bowed at a new pitch every few seconds
        if (idle > 5) { next += dt; if (next > 6) { next = 0; choose((which + 1 + Math.floor(random() * 3)) % MODES.length, true); } }
        settle(dt);
        render();
      },
      // With motion paused: let the sand find its lines out of sight, then show them
      still: function () { for (var i = 0; i < 240; i++) settle(1 / 60); render(); },
      motion: function (on) { if (!on && soundOn && engine) { soundOn = false; engine.setOn(false); showSound(); } },
      sound: function () { return engine ? engine.listen() : { state: 'not started' }; },
      // how well the sand has found the still lines: the mean |f| under the grains (0 is perfect)
      rest: function () { var m = mode[0] * Math.PI, n = mode[1] * Math.PI, sum = 0; for (var i = 0; i < COUNT; i++) sum += Math.abs(Math.cos(n * gx[i]) * Math.cos(m * gy[i]) + mode[2] * Math.cos(m * gx[i]) * Math.cos(n * gy[i])); return { mode: mode, meanF: sum / COUNT }; }
    };
  });
})();
