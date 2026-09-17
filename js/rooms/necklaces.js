/* Necklaces — room 14.

   A rhythm is a necklace: some beads sounded, some silent, joined in a ring.
   Spread k sounded beads as evenly as they will go among n (bead i sounds
   when i * k mod n is less than k, which is Euclid's algorithm for the
   greatest common divisor in disguise) and what comes out, again and again,
   is a rhythm somebody has been playing for a few hundred years. Godfried
   Toussaint noticed this in 2005.

   The four instruments are synthesised when they are struck: a sine that
   drops in pitch for the drum, filtered noise for the clap and the shaker,
   two out-of-tune sines for the bell. Notes are booked a tenth of a second
   ahead on the audio clock, which keeps time far better than the screen. */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var INSTRUMENTS = [
    { name: 'Shaker', color: [61, 91, 255] },
    { name: 'Bell', color: [233, 230, 223] },
    { name: 'Clap', color: [255, 79, 123] },
    { name: 'Low drum', color: [255, 179, 71] }
  ];
  // outer ring to inner: [beats sounded, beads, turned by]
  var ENSEMBLES = {
    havana: [[7, 16, 0], [5, 16, 0], [2, 8, 2], [3, 8, 0]],
    accra: [[7, 12, 0], [5, 12, 2], [3, 12, 1], [4, 12, 0]],
    istanbul: [[5, 9, 0], [4, 9, 0], [2, 9, 4], [3, 9, 0]]
  };
  // what the world calls some of these (after Toussaint, 2005)
  var KNOWN = {
    '2,5': 'a Persian rhythm, khafif-e-ramal', '3,4': 'the cumbia of Colombia', '3,7': 'a Bulgarian ruchenitza',
    '3,8': 'the Cuban tresillo', '4,7': 'another Bulgarian ruchenitza', '4,9': 'the Turkish aksak', '5,7': 'the Arab nawakhat',
    '5,8': 'the Cuban cinquillo', '5,9': 'the Arab agsag-samai', '7,8': 'a Tuareg rhythm from Libya',
    '5,12': 'a Venda clapping song from South Africa', '5,16': 'the bossa nova', '7,12': 'the bell pattern of West Africa',
    '7,16': 'a samba rhythm from Brazil', '9,16': 'a rhythm from the Central African Republic'
  };
  var BELL_NOTES = [293.66, 329.63, 369.99, 440, 493.88, 587.33];

  function sounds(k, n, i) { return (i * k) % n < k; }

  /* ---- sound ---- */

  function makeEngine() {
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    var audio = new AudioContextClass();
    var rate = audio.sampleRate;

    var master = audio.createGain();
    var squash = audio.createDynamicsCompressor();
    var room = audio.createConvolver();
    var wet = audio.createGain();
    master.gain.value = 0;
    wet.gain.value = 0.3;
    squash.threshold.value = -16;
    squash.ratio.value = 5;
    squash.connect(master);
    room.connect(wet);
    wet.connect(squash);
    master.connect(audio.destination);
    var meter = audio.createAnalyser();
    meter.fftSize = 2048;
    master.connect(meter);
    var meterData = new Float32Array(meter.fftSize);

    // a second and a half of fading noise: a small room for the bell and the clap to ring in
    var tail = audio.createBuffer(2, Math.floor(rate * 1.5), rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = tail.getChannelData(ch);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    }
    room.buffer = tail;

    var hiss = audio.createBuffer(1, rate, rate);
    var h = hiss.getChannelData(0);
    for (var k = 0; k < h.length; k++) h[k] = Math.random() * 2 - 1;

    function envelope(peak, when, attack, fall) {
      var g = audio.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, when + attack + fall);
      return g;
    }
    function noiseBurst(when, seconds, filterType, frequency, q, peak, fall, echo) {
      var source = audio.createBufferSource();
      source.buffer = hiss;
      var filter = audio.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = frequency;
      filter.Q.value = q;
      var g = envelope(peak, when, 0.002, fall);
      source.connect(filter); filter.connect(g); g.connect(squash);
      if (echo) g.connect(room);
      source.start(when, Math.random() * 0.5, seconds);
    }
    function tone(when, from, to, glide, peak, fall, echo, type) {
      var osc = audio.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(from, when);
      if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, when + glide);
      var g = envelope(peak, when, 0.003, fall);
      osc.connect(g); g.connect(squash);
      if (echo) g.connect(room);
      osc.start(when);
      osc.stop(when + fall + 0.1);
    }

    return {
      audio: audio,
      level: function () {
        meter.getFloatTimeDomainData(meterData);
        var sum = 0;
        for (var i = 0; i < meterData.length; i++) sum += meterData[i] * meterData[i];
        return Math.sqrt(sum / meterData.length);
      },
      setOn: function (on) {
        var now = audio.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(on ? 0.6 : 0, now + 0.2);
        if (on) return audio.resume();
        setTimeout(function () { if (master.gain.value < 0.01) audio.suspend(); }, 350);
        return Promise.resolve();
      },
      // which: 0 shaker, 1 bell, 2 clap, 3 low drum. `step` picks the bell's note.
      strike: function (which, when, step) {
        if (which === 0) noiseBurst(when, 0.08, 'highpass', 6500, 0.7, 0.2, 0.05, false);
        else if (which === 1) {
          var f = BELL_NOTES[(step * 2) % BELL_NOTES.length];
          tone(when, f, f, 0, 0.26, 1.0, true);
          tone(when, f * 2.76, f * 2.76, 0, 0.09, 0.5, true);
        } else if (which === 2) {
          noiseBurst(when, 0.25, 'bandpass', 1700, 0.9, 0.5, 0.16, true);
          noiseBurst(when + 0.012, 0.25, 'bandpass', 1500, 0.9, 0.35, 0.14, true);
        } else {
          tone(when, 150, 46, 0.13, 0.95, 0.4, false);
        }
      }
    };
  }

  Gallery.register('necklaces', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var rings = [];                 // { k, n, turn, flash[], next }
    var bar = 0;                    // how many times round so far, as a fraction
    var beats = 104;                // beats a minute; four beats to a turn of the wheel
    var engine = null, soundOn = false, startedAt = 0;
    var centre = { x: 0, y: 0, r: 100 };
    var grab = null;

    /* ---- the rings ---- */

    function isSounded(ring, bead) {
      return ring.k > 0 && sounds(ring.k, ring.n, ((bead - ring.turn) % ring.n + ring.n) % ring.n);
    }

    function barSeconds() { return 240 / beats; }

    // after anything that changes the timing: book the next bead that has not gone by yet
    function resync() {
      rings.forEach(function (ring) {
        ring.next = Math.ceil(bar * ring.n - 1e-6);
        ring.seen = Math.floor(bar * ring.n);
      });
      if (engine && soundOn) startedAt = engine.audio.currentTime - bar * barSeconds();
    }

    function describe() {
      rings.forEach(function (ring, j) {
        var count = env.room.querySelector('[data-ring-count="' + j + '"]');
        var where = env.room.querySelector('[data-ring-where="' + j + '"]');
        if (count) count.textContent = ring.k + ' in ' + ring.n;
        if (where) {
          where.textContent = ring.k === 0 ? 'silent'
            : ring.k === ring.n ? 'every bead'
            : KNOWN[ring.k + ',' + ring.n] || (ring.n % ring.k === 0 ? 'a plain steady pulse' : 'evenly spread, with no famous name');
        }
      });
      env.redraw();
    }

    function setEnsemble(name) {
      rings = ENSEMBLES[name].map(function (p) {
        return { k: p[0], n: p[1], turn: p[2], flash: new Float32Array(p[1]), next: 0, seen: 0 };
      });
      resync();
      describe();
    }

    function advance(dt) {
      var seconds = barSeconds(), j, ring;
      if (soundOn && engine && engine.audio.state === 'running') {
        var now = engine.audio.currentTime;
        bar = (now - startedAt) / seconds;
        for (j = 0; j < rings.length; j++) {
          ring = rings[j];
          // book every bead that falls in the next tenth of a second
          while (startedAt + ring.next / ring.n * seconds < now + 0.11) {
            var when = startedAt + ring.next / ring.n * seconds;
            var bead = ring.next % ring.n;
            if (when > now - 0.04 && isSounded(ring, bead)) engine.strike(j, Math.max(when, now), bead);
            ring.next++;
          }
        }
      } else {
        bar += dt / seconds;
      }
      // light the beads the hand has just passed
      for (j = 0; j < rings.length; j++) {
        ring = rings[j];
        var reached = Math.floor(bar * ring.n);
        if (reached - ring.seen > ring.n) ring.seen = reached - 1;        // after a long pause, do not replay everything
        while (ring.seen < reached) {
          ring.seen++;
          var lit = ring.seen % ring.n;
          if (isSounded(ring, lit)) ring.flash[lit] = 1;
        }
        var fade = Math.exp(-dt * 6.5);
        for (var b = 0; b < ring.n; b++) ring.flash[b] *= fade;
      }
    }

    /* ---- drawing ---- */

    function radiusOf(j) { return centre.r * [1, 0.79, 0.58, 0.37][j]; }

    function render() {
      var ratio = canvas.width / size.w;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);
      pen.lineJoin = 'round';

      rings.forEach(function (ring, j) {
        var r = radiusOf(j), c = INSTRUMENTS[j].color, rgb = c[0] + ',' + c[1] + ',' + c[2];
        var energy = 0, b, a;
        for (b = 0; b < ring.n; b++) energy = Math.max(energy, ring.flash[b]);

        pen.beginPath();
        pen.arc(centre.x, centre.y, r, 0, TAU);
        pen.strokeStyle = 'rgba(233,230,223,0.16)';
        pen.lineWidth = 1;
        pen.stroke();

        // the necklace's shape: a polygon through the sounded beads
        pen.beginPath();
        var first = true;
        for (b = 0; b < ring.n; b++) {
          if (!isSounded(ring, b)) continue;
          a = -Math.PI / 2 + b / ring.n * TAU;
          if (first) pen.moveTo(centre.x + Math.cos(a) * r, centre.y + Math.sin(a) * r);
          else pen.lineTo(centre.x + Math.cos(a) * r, centre.y + Math.sin(a) * r);
          first = false;
        }
        pen.closePath();
        pen.fillStyle = 'rgba(' + rgb + ',' + (0.03 + 0.07 * energy).toFixed(3) + ')';
        pen.fill();
        pen.strokeStyle = 'rgba(' + rgb + ',' + (0.5 + 0.4 * energy).toFixed(3) + ')';
        pen.lineWidth = 1.2;
        pen.stroke();

        for (b = 0; b < ring.n; b++) {
          a = -Math.PI / 2 + b / ring.n * TAU;
          var x = centre.x + Math.cos(a) * r, y = centre.y + Math.sin(a) * r;
          if (isSounded(ring, b)) {
            var f = ring.flash[b];
            if (f > 0.02) {
              pen.beginPath();
              pen.arc(x, y, 6 + f * 16, 0, TAU);
              pen.fillStyle = 'rgba(' + rgb + ',' + (f * 0.22).toFixed(3) + ')';
              pen.fill();
              // and a ripple going out from it, like a stone in a pond
              pen.beginPath();
              pen.arc(x, y, 8 + (1 - f) * (1 - f) * centre.r * 0.22, 0, TAU);
              pen.strokeStyle = 'rgba(' + rgb + ',' + (f * f * 0.5).toFixed(3) + ')';
              pen.lineWidth = 1;
              pen.stroke();
            }
            pen.beginPath();
            pen.arc(x, y, 5 + f * 3.5, 0, TAU);
            pen.fillStyle = 'rgb(' + rgb + ')';
            pen.fill();
          } else {
            pen.beginPath();
            pen.arc(x, y, 2, 0, TAU);
            pen.fillStyle = 'rgba(143,141,136,0.75)';
            pen.fill();
          }
        }
      });

      // the hand that sweeps round once every four beats, and the mark it starts from
      var turnAngle = -Math.PI / 2 + (bar % 1) * TAU;
      pen.beginPath();
      pen.moveTo(centre.x, centre.y);
      pen.lineTo(centre.x + Math.cos(turnAngle) * centre.r * 1.09, centre.y + Math.sin(turnAngle) * centre.r * 1.09);
      pen.strokeStyle = 'rgba(233,230,223,0.55)';
      pen.lineWidth = 1;
      pen.stroke();
      pen.beginPath();
      pen.moveTo(centre.x, centre.y - centre.r * 1.13);
      pen.lineTo(centre.x - 5, centre.y - centre.r * 1.13 - 9);
      pen.lineTo(centre.x + 5, centre.y - centre.r * 1.13 - 9);
      pen.closePath();
      pen.fillStyle = 'rgba(233,230,223,0.6)';
      pen.fill();
      pen.beginPath();
      pen.arc(centre.x, centre.y, 3, 0, TAU);
      pen.fill();
    }

    /* ---- wiring ---- */

    function change(j, by) {
      var ring = rings[j];
      if (!ring) return;
      ring.k = Gallery.clamp(ring.k + by, 0, ring.n);
      describe();
    }
    [0, 1, 2, 3].forEach(function (j) {
      var less = env.room.querySelector('[data-ring-less="' + j + '"]');
      var more = env.room.querySelector('[data-ring-more="' + j + '"]');
      if (less) less.addEventListener('click', function () { change(j, -1); });
      if (more) more.addEventListener('click', function () { change(j, 1); });
    });

    var ensembleButtons = Array.prototype.slice.call(env.room.querySelectorAll('[data-necklaces-ensemble]'));
    ensembleButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setEnsemble(button.getAttribute('data-necklaces-ensemble'));
        ensembleButtons.forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
      });
    });

    var tempoDial = env.room.querySelector('[data-necklaces-tempo]');
    var tempoReadout = env.room.querySelector('[data-necklaces-tempo-value]');
    function readTempo() {
      beats = Number(tempoDial.value);
      if (tempoReadout) tempoReadout.textContent = beats + ' beats a minute';
      env.live('beats', beats);
      resync();
    }
    if (tempoDial) tempoDial.addEventListener('input', readTempo);

    var soundButton = env.room.querySelector('[data-necklaces-sound]');
    if (soundButton) {
      soundButton.addEventListener('click', function () {
        if (!engine) engine = makeEngine();
        if (!engine) { soundButton.textContent = 'This browser has no sound engine'; soundButton.disabled = true; return; }
        soundOn = !soundOn;
        soundButton.textContent = soundOn ? 'Turn sound off' : 'Turn sound on';
        soundButton.classList.toggle('is-on', soundOn);
        engine.setOn(soundOn).then(resync).catch(function () {});
      });
    }

    // take hold of a ring and turn it
    function polar(e) {
      var rect = canvas.getBoundingClientRect();
      var dx = e.clientX - rect.left - centre.x, dy = e.clientY - rect.top - centre.y;
      return { d: Math.sqrt(dx * dx + dy * dy), a: Math.atan2(dy, dx) };
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var p = polar(e), nearest = -1, gap = 22;
      rings.forEach(function (ring, j) { if (Math.abs(p.d - radiusOf(j)) < gap) { gap = Math.abs(p.d - radiusOf(j)); nearest = j; } });
      if (nearest < 0) return;
      grab = { ring: nearest, from: p.a, turn: rings[nearest].turn };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!grab) return;
      var ring = rings[grab.ring];
      var swept = polar(e).a - grab.from;
      swept = swept - Math.round(swept / TAU) * TAU;
      var turn = ((grab.turn + Math.round(swept / (TAU / ring.n))) % ring.n + ring.n) % ring.n;
      if (turn !== ring.turn) { ring.turn = turn; describe(); }
    });
    function drop() { grab = null; canvas.style.cursor = 'grab'; }
    canvas.addEventListener('pointerup', drop);
    canvas.addEventListener('pointercancel', drop);
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'pan-y';       // a finger can still scroll the page; sideways it turns a ring

    setEnsemble('havana');
    if (tempoDial) readTempo();

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wide = size.w >= 900;
        centre.x = size.w * (wide ? 0.64 : 0.5);
        centre.y = size.h * (wide ? 0.51 : 0.52);
        centre.r = wide ? Math.min(size.w * 0.25, size.h * 0.37) : Math.min(size.w * 0.42, size.h * 0.4);
      },
      frame: function (time, dt) { advance(dt); render(); },
      still: function () { render(); },
      // pausing motion also stops the music: a rhythm nobody can see turning is only noise
      motion: function (on) {
        if (!on && soundOn && engine) {
          soundOn = false;
          engine.setOn(false);
          if (soundButton) { soundButton.textContent = 'Turn sound on'; soundButton.classList.remove('is-on'); }
        }
      },
      sound: function () { return engine ? { state: engine.audio.state, level: engine.level(), bar: bar } : { state: 'not started' }; }
    };
  });
})();
