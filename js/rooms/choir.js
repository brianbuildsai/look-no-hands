/* Choir — room 23.

   Four voices that are not recordings of anybody. A voice is made the way a
   throat makes one (formant synthesis):

     - a buzz, like the vocal folds: a sawtooth wave at the note being sung,
       with a little breath mixed in and a slow wobble of pitch (vibrato);
     - a throat: the buzz goes through four resonant filters side by side.
       Where those resonances sit is what makes "ah" different from "ee".
       Moving between vowels is sliding the filters, nothing more.

   The resonances for each vowel and each kind of voice are the standard
   measured ones (the table in the Csound manual, after Peterson and Barney's
   1952 measurements and later singers' data).

   Left alone the choir walks through eight chords and drifts between vowels.
   With a pointer on the stage, across chooses the vowel and up-and-down
   chooses the chord. */
(function () {
  'use strict';

  var VOWELS = ['oo', 'oh', 'ah', 'eh', 'ee'];
  // for each voice, for each vowel in that order: four resonances in hertz, their loudness in decibels, their widths in hertz
  var THROATS = {
    bass: [
      [[350, 600, 2400, 2675], [0, -20, -32, -28], [40, 80, 100, 120]],
      [[400, 750, 2400, 2600], [0, -11, -21, -20], [40, 80, 100, 120]],
      [[600, 1040, 2250, 2450], [0, -7, -9, -9], [60, 70, 110, 120]],
      [[400, 1620, 2400, 2800], [0, -12, -9, -12], [40, 80, 100, 120]],
      [[250, 1750, 2600, 3050], [0, -30, -16, -22], [60, 90, 100, 120]]
    ],
    tenor: [
      [[350, 600, 2700, 2900], [0, -20, -17, -14], [40, 60, 100, 120]],
      [[400, 800, 2600, 2800], [0, -10, -12, -12], [40, 80, 100, 120]],
      [[650, 1080, 2650, 2900], [0, -6, -7, -8], [80, 90, 120, 130]],
      [[400, 1700, 2600, 3200], [0, -14, -12, -14], [70, 80, 100, 120]],
      [[290, 1870, 2800, 3250], [0, -15, -18, -20], [40, 90, 100, 120]]
    ],
    alto: [
      [[325, 700, 2530, 3500], [0, -12, -30, -40], [50, 60, 170, 180]],
      [[450, 800, 2830, 3500], [0, -9, -16, -28], [70, 80, 100, 130]],
      [[800, 1150, 2800, 3500], [0, -4, -20, -36], [80, 90, 120, 130]],
      [[400, 1600, 2700, 3300], [0, -24, -30, -35], [60, 80, 120, 150]],
      [[350, 1700, 2700, 3700], [0, -20, -30, -36], [50, 100, 120, 150]]
    ],
    soprano: [
      [[325, 700, 2700, 3800], [0, -16, -35, -40], [50, 60, 170, 180]],
      [[450, 800, 2830, 3800], [0, -11, -22, -22], [70, 80, 100, 130]],
      [[800, 1150, 2900, 3900], [0, -6, -32, -20], [80, 90, 120, 130]],
      [[350, 2000, 2800, 3600], [0, -20, -15, -40], [60, 100, 120, 150]],
      [[270, 2140, 2950, 3900], [0, -12, -26, -26], [60, 90, 100, 120]]
    ]
  };
  var VOICES = [
    { name: 'Bass', throat: 'bass', pan: -0.55, colour: [255, 179, 71] },
    { name: 'Tenor', throat: 'tenor', pan: -0.2, colour: [255, 79, 123] },
    { name: 'Alto', throat: 'alto', pan: 0.2, colour: [233, 230, 223] },
    { name: 'Soprano', throat: 'soprano', pan: 0.55, colour: [96, 124, 255] }
  ];
  // eight chords, lowest voice first, as piano keys (60 is middle C)
  var CHORDS = [
    { name: 'D major', notes: [50, 57, 66, 74] }, { name: 'B minor', notes: [47, 59, 66, 74] },
    { name: 'G major', notes: [43, 59, 67, 74] }, { name: 'A major', notes: [45, 57, 64, 73] },
    { name: 'F sharp minor', notes: [42, 57, 66, 73] }, { name: 'G major', notes: [43, 59, 67, 71] },
    { name: 'E minor', notes: [40, 59, 67, 71] }, { name: 'A major', notes: [45, 57, 64, 69] }
  ];
  var NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

  function hertz(key) { return 440 * Math.pow(2, (key - 69) / 12); }
  function noteName(key) { return NOTE_NAMES[key % 12] + (Math.floor(key / 12) - 1); }

  // the throat for a vowel position between 0 (oo) and 4 (ee): resonances slide from one vowel to the next
  function throatAt(kind, position) {
    var table = THROATS[kind], i = Math.min(3, Math.floor(position)), t = position - i, a = table[i], b = table[i + 1], out = [];
    for (var f = 0; f < 4; f++) {
      out.push({
        hz: a[0][f] * Math.pow(b[0][f] / a[0][f], t),
        db: a[1][f] + (b[1][f] - a[1][f]) * t,
        wide: a[2][f] + (b[2][f] - a[2][f]) * t
      });
    }
    return out;
  }

  /* ---- sound ---- */

  function makeChoir() {
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    var audio = new AudioContextClass(), rate = audio.sampleRate;

    var master = audio.createGain(), squash = audio.createDynamicsCompressor(), hall = audio.createConvolver(), wet = audio.createGain();
    master.gain.value = 0;
    squash.threshold.value = -18; squash.ratio.value = 4;
    wet.gain.value = 0.42;
    squash.connect(master); hall.connect(wet); wet.connect(squash); master.connect(audio.destination);
    var meter = audio.createAnalyser();
    meter.fftSize = 8192; meter.smoothingTimeConstant = 0.6;
    master.connect(meter);
    var wave = new Float32Array(2048), spectrum = new Float32Array(meter.frequencyBinCount);

    // a stone room: three seconds of noise dying away, duller as it goes
    var tail = audio.createBuffer(2, Math.floor(rate * 3), rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = tail.getChannelData(ch), last = 0;
      for (var i = 0; i < d.length; i++) {
        var t = i / d.length, dull = 0.25 + 0.7 * t;
        last = last * dull + (Math.random() * 2 - 1) * (1 - dull);
        d[i] = last * Math.pow(1 - t, 2.6) * (i < rate * 0.012 ? i / (rate * 0.012) : 1);
      }
    }
    hall.buffer = tail;

    var breath = audio.createBuffer(1, rate * 2, rate), b = breath.getChannelData(0);
    for (var k = 0; k < b.length; k++) b[k] = Math.random() * 2 - 1;

    var singers = VOICES.map(function (voice, v) {
      var folds = audio.createOscillator(), soften = audio.createBiquadFilter();
      folds.type = 'sawtooth';
      soften.type = 'lowpass'; soften.frequency.value = 2600 + v * 500; soften.Q.value = 0.4;
      folds.connect(soften);
      var air = audio.createBufferSource(), airTone = audio.createBiquadFilter(), airLevel = audio.createGain();
      air.buffer = breath; air.loop = true;
      airTone.type = 'bandpass'; airTone.frequency.value = 2200; airTone.Q.value = 0.6;
      airLevel.gain.value = 0.02;
      air.connect(airTone); airTone.connect(airLevel);
      // vibrato: a slow wobble of pitch, a slightly different speed for each singer so they never line up
      var wobble = audio.createOscillator(), depth = audio.createGain();
      wobble.frequency.value = 5.1 + v * 0.37;
      depth.gain.value = 0;
      wobble.connect(depth); depth.connect(folds.frequency);
      var out = audio.createGain(), side = audio.createStereoPanner ? audio.createStereoPanner() : null;
      out.gain.value = 0;
      var throat = [0, 1, 2, 3].map(function () {
        var filter = audio.createBiquadFilter(), level = audio.createGain();
        filter.type = 'bandpass';
        soften.connect(filter); airLevel.connect(filter); filter.connect(level); level.connect(out);
        return { filter: filter, level: level };
      });
      if (side) { side.pan.value = voice.pan; out.connect(side); side.connect(squash); side.connect(hall); }
      else { out.connect(squash); out.connect(hall); }
      folds.start(); air.start(); wobble.start();
      return { folds: folds, depth: depth, out: out, throat: throat };
    });

    return {
      audio: audio,
      // slide one singer to a note and a vowel
      sing: function (v, key, vowel, loud) {
        var now = audio.currentTime, s = singers[v], hz = hertz(key);
        s.folds.frequency.setTargetAtTime(hz, now, 0.06);
        s.depth.gain.setTargetAtTime(hz * 0.0055, now, 0.4);
        s.out.gain.setTargetAtTime(loud ? 0.5 : 0, now, loud ? 0.18 : 0.3);
        throatAt(VOICES[v].throat, vowel).forEach(function (f, n) {
          s.throat[n].filter.frequency.setTargetAtTime(f.hz, now, 0.05);
          s.throat[n].filter.Q.setTargetAtTime(f.hz / f.wide, now, 0.05);
          // (the upper resonances are lifted a little: a sawtooth is duller than a real pair of vocal folds up there)
          s.throat[n].level.gain.setTargetAtTime(Math.pow(10, (f.db + [0, 5, 9, 9][n]) / 20), now, 0.05);
        });
      },
      setOn: function (on) {
        var now = audio.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(on ? 0.7 : 0, now + (on ? 0.6 : 0.25));
        if (on) return audio.resume();
        setTimeout(function () { if (master.gain.value < 0.01) audio.suspend(); }, 400);
        return Promise.resolve();
      },
      // for checking: how loud it is, and where in the spectrum the energy sits
      listen: function () {
        meter.getFloatTimeDomainData(wave);
        var sum = 0;
        for (var i = 0; i < wave.length; i++) sum += wave[i] * wave[i];
        meter.getFloatFrequencyData(spectrum);
        var bands = [[200, 1000], [1000, 2400], [2400, 4200]], peaks = bands.map(function (band) {
          var best = -200, at = 0;
          for (var n = Math.floor(band[0] / (rate / 2) * spectrum.length); n < band[1] / (rate / 2) * spectrum.length; n++) {
            if (spectrum[n] > best) { best = spectrum[n]; at = n; }
          }
          return { hz: Math.round(at * (rate / 2) / spectrum.length), db: Math.round(best) };
        });
        return { state: audio.state, level: Math.sqrt(sum / wave.length), peaks: peaks };
      }
    };
  }

  Gallery.register('choir', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var engine = null, soundOn = false;
    var singing = [true, true, true, true];
    var vowel = 2, chord = 0;                 // where the choir is: between the vowels, and which chord
    var shown = { vowel: 2, keys: CHORDS[0].notes.slice(), open: [0, 0, 0, 0] };      // the same, eased, for drawing
    var hand = null, present = false, sinceTouched = 99, clock = 0, bar = 0;
    var history = [[], [], [], []];           // where each voice's note has been, for the score

    function conduct(dt) {
      clock += dt; sinceTouched += dt;
      if (hand && (present || sinceTouched < 6)) {
        vowel = Gallery.clamp(hand.x, 0, 1) * 4;
        chord = Math.min(CHORDS.length - 1, Math.floor(Gallery.clamp(hand.y, 0, 0.9999) * CHORDS.length));
      } else {
        // left alone: a new chord every few seconds, and a slow walk through the vowels
        bar += dt / 3.4;
        chord = Math.floor(bar) % CHORDS.length;
        vowel = 2 + 2 * Math.sin(clock * 0.23) * Math.cos(clock * 0.071);
      }
      if (engine && soundOn) for (var v = 0; v < 4; v++) engine.sing(v, CHORDS[chord].notes[v], vowel, singing[v]);
      var ease = 1 - Math.exp(-dt * 9);
      shown.vowel += (vowel - shown.vowel) * ease;
      for (v = 0; v < 4; v++) {
        shown.keys[v] += (CHORDS[chord].notes[v] - shown.keys[v]) * ease;
        shown.open[v] += ((singing[v] ? 1 : 0) - shown.open[v]) * (1 - Math.exp(-dt * 5));
        history[v].push(shown.keys[v]);
        if (history[v].length > 420) history[v].shift();
      }
      var nearest = Math.round(vowel);
      env.live('vowel', VOWELS[nearest]);
      env.live('chord', CHORDS[chord].name);
    }

    /* ---- drawing ---- */

    function mouth(cx, cy, r, v) {
      var voice = VOICES[v], rgb = voice.colour.join(','), throat = throatAt(voice.throat, shown.vowel);
      // how far the jaw drops goes with the first resonance; how far the lips spread goes with the second
      var drop = Gallery.clamp((throat[0].hz - 240) / 560, 0.06, 1), spread = Gallery.clamp((throat[1].hz - 550) / 1600, 0, 1);
      var breathe = 1 + 0.025 * Math.sin(clock * (5.1 + v * 0.37) * 6.2832);        // in time with that singer's vibrato
      var w = r * (0.34 + 0.4 * spread) * breathe, h = r * (0.06 + 0.5 * drop * shown.open[v]) * breathe;
      // a face
      pen.strokeStyle = 'rgba(' + rgb + ',0.32)';
      pen.lineWidth = 1;
      pen.beginPath(); pen.arc(cx, cy, r, 0, 6.2832); pen.stroke();
      // sound leaving it
      for (var k = 0; k < 3; k++) {
        var ring = ((clock * 0.55 + k / 3 + v * 0.13) % 1), alpha = (1 - ring) * 0.22 * shown.open[v];
        pen.strokeStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
        pen.beginPath(); pen.arc(cx, cy, r * (1.05 + ring * 0.7), 0, 6.2832); pen.stroke();
      }
      // the lips: two curves between the corners
      pen.fillStyle = '#000';
      pen.strokeStyle = 'rgba(' + rgb + ',0.95)';
      pen.lineWidth = 1.6;
      pen.beginPath();
      pen.moveTo(cx - w, cy + r * 0.12);
      pen.bezierCurveTo(cx - w * 0.5, cy + r * 0.12 - h * 1.25, cx + w * 0.5, cy + r * 0.12 - h * 1.25, cx + w, cy + r * 0.12);
      pen.bezierCurveTo(cx + w * 0.5, cy + r * 0.12 + h * 1.45, cx - w * 0.5, cy + r * 0.12 + h * 1.45, cx - w, cy + r * 0.12);
      pen.closePath();
      pen.fill(); pen.stroke();
      // two eyes, closed when resting
      pen.lineWidth = 1.2;
      for (var side = -1; side <= 1; side += 2) {
        pen.beginPath();
        pen.arc(cx + side * r * 0.36, cy - r * 0.3, r * 0.1, Math.PI * (1 + 0.1), Math.PI * (2 - 0.1), shown.open[v] > 0.5);
        pen.stroke();
      }
      // who it is, and what it is singing
      pen.fillStyle = 'rgba(143,141,136,1)';
      pen.font = '500 ' + Math.round(Math.max(11, r * 0.17)) + 'px "Hanken Grotesk", system-ui, sans-serif';
      pen.textAlign = 'center';
      pen.fillText(voice.name + (singing[v] ? ', ' + noteName(CHORDS[chord].notes[v]) : ', resting'), cx, cy + r * 1.42);
    }

    function render() {
      var ratio = canvas.width / size.w, wide = size.w >= 900, v, i;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);
      var left = wide ? size.w * 0.37 : size.w * 0.05, right = size.w * (wide ? 0.97 : 0.95), top = size.h * (wide ? 0.16 : 0.13);
      var across = right - left, r, cy;
      if (wide) { r = Math.min(across / 4 * 0.4, size.h * 0.15); cy = top + r * 1.15; }
      else { r = Math.min(across / 2 * 0.3, size.h * 0.1); cy = top + r * 1.1; }
      for (v = 0; v < 4; v++) {
        if (wide) mouth(left + across * (v + 0.5) / 4, cy, r, v);
        else mouth(left + across * ((v % 2) + 0.5) / 2, cy + Math.floor(v / 2) * r * 2.9, r, v);
      }

      // the score: each voice's note over the last few seconds, low notes low
      var scoreTop = wide ? cy + r * 2.3 : cy + r * 5.3, scoreBottom = size.h * (wide ? 0.9 : 0.95);
      function yOf(key) { return scoreBottom - (key - 38) / (76 - 38) * (scoreBottom - scoreTop); }
      pen.strokeStyle = 'rgba(233,230,223,0.1)';
      pen.lineWidth = 1;
      pen.beginPath();
      for (var key = 38; key <= 76; key += 12) { pen.moveTo(left, yOf(key) + 0.5); pen.lineTo(right, yOf(key) + 0.5); }
      pen.stroke();
      for (v = 0; v < 4; v++) {
        var line = history[v];
        if (line.length < 2) continue;
        pen.strokeStyle = 'rgba(' + VOICES[v].colour.join(',') + ',' + (0.25 + 0.65 * shown.open[v]).toFixed(2) + ')';
        pen.lineWidth = 1.6;
        pen.beginPath();
        for (i = 0; i < line.length; i++) {
          var x = right - (line.length - 1 - i) / 420 * across, y = yOf(line[i]);
          if (i) pen.lineTo(x, y); else pen.moveTo(x, y);
        }
        pen.stroke();
        pen.fillStyle = 'rgb(' + VOICES[v].colour.join(',') + ')';
        pen.beginPath(); pen.arc(right, yOf(line[line.length - 1]), 3, 0, 6.2832); pen.fill();
      }

      // the conductor's hand: across for the vowel, up and down for the chord
      if (hand && (present || sinceTouched < 6)) {
        var hx = hand.x * size.w, hy = hand.y * size.h;
        pen.strokeStyle = 'rgba(233,230,223,0.3)';
        pen.lineWidth = 1;
        pen.beginPath(); pen.moveTo(hx + 0.5, 0); pen.lineTo(hx + 0.5, size.h); pen.moveTo(0, hy + 0.5); pen.lineTo(size.w, hy + 0.5); pen.stroke();
        pen.fillStyle = '#e9e6df';
        pen.font = 'italic 300 ' + (wide ? 26 : 20) + 'px Fraunces, Georgia, serif';
        pen.textAlign = hx > size.w * 0.8 ? 'right' : 'left';
        pen.fillText('“' + VOWELS[Math.round(vowel)] + '”, ' + CHORDS[chord].name, hx + (hx > size.w * 0.8 ? -12 : 12), hy - 10);
      }
    }

    /* ---- wiring ---- */

    function place(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
    }
    canvas.addEventListener('pointermove', function (e) { hand = place(e); if (e.pointerType === 'mouse') present = true; else sinceTouched = 0; });
    canvas.addEventListener('pointerdown', function (e) { hand = place(e); sinceTouched = 0; env.redraw(); });
    canvas.addEventListener('pointerleave', function () { present = false; sinceTouched = 4; });
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'pan-y';

    var soundButton = env.room.querySelector('[data-choir-sound]');
    function showSound() {
      if (!soundButton) return;
      soundButton.textContent = soundOn ? 'Hush' : 'Let them sing';
      soundButton.classList.toggle('is-on', soundOn);
    }
    if (soundButton) {
      soundButton.addEventListener('click', function () {
        if (!engine) engine = makeChoir();
        if (!engine) { soundButton.textContent = 'This browser has no sound engine'; soundButton.disabled = true; return; }
        soundOn = !soundOn;
        showSound();
        engine.setOn(soundOn).catch(function () {});
      });
    }
    // a held chord would go on sounding in a tab nobody is looking at: hush when the page is hidden
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && soundOn && engine) { soundOn = false; engine.setOn(false); showSound(); }
    });

    var voiceButtons = Array.prototype.slice.call(env.room.querySelectorAll('[data-choir-voice]'));
    voiceButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var v = Number(button.getAttribute('data-choir-voice'));
        singing[v] = !singing[v];
        button.setAttribute('aria-pressed', String(singing[v]));
        env.live('voices', singing.filter(Boolean).length);
        env.redraw();
      });
    });
    env.live('voices', 4);

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
      },
      frame: function (time, dt) { conduct(dt); render(); },
      still: function () { render(); },
      // pausing motion also stops the singing
      motion: function (on) { if (!on && soundOn && engine) { soundOn = false; engine.setOn(false); showSound(); } },
      sound: function () { return engine ? engine.listen() : { state: 'not started' }; },
      where: function () { return { vowel: vowel, chord: chord, keys: CHORDS[chord].notes }; }
    };
  });
})();
