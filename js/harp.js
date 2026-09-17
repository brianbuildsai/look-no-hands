/* Aeolian Harp — room 5.

   No sound files. Each string's tone is computed the first time it is
   needed with the Karplus–Strong method: fill a short loop of memory with
   noise, then play the loop round and round, averaging neighbouring samples
   on every pass. The averaging wears the noise down into a pitch, the way
   a real string sheds its harshness after the pluck. The length of the
   loop is the note. The room's echo is computed the same way, from noise.

   The strings are tuned to a five-note scale so that nothing played on
   them, by the wind or by a visitor, can be a wrong note. */
(function () {
  'use strict';

  var SCALE = [0, 2, 4, 7, 9];       // major pentatonic, in semitones
  var MAX_VOICES = 36;

  /* ---- sound ------------------------------------------------------------ */

  // One plucked-string tone, as an audio buffer.
  function stringTone(audio, frequency, ringSeconds) {
    var rate = audio.sampleRate;
    var length = Math.floor(Math.min(6, ringSeconds) * rate);
    var buffer = audio.createBuffer(1, length, rate);
    var out = buffer.getChannelData(0);

    // The loop must be rate/frequency samples long. The averaging below adds
    // half a sample; an all-pass filter supplies the remaining fraction so
    // high notes stay in tune.
    var period = rate / frequency - 0.5;
    var whole = Math.floor(period);
    var fraction = period - whole;
    if (fraction < 0.1) { whole -= 1; fraction += 1; }
    var allpass = (1 - fraction) / (1 + fraction);

    var loop = new Float32Array(whole);
    var i, smooth = 0, mean = 0;
    for (i = 0; i < whole; i++) {
      smooth += ((Math.random() * 2 - 1) - smooth) * 0.55;   // slightly softened noise
      loop[i] = smooth;
      mean += smooth;
    }
    mean /= whole;
    for (i = 0; i < whole; i++) loop[i] -= mean;

    // per-pass loss chosen so the note has faded by 60 dB after ringSeconds
    var keep = Math.pow(0.001, 1 / (frequency * ringSeconds));
    var previous = 0, apIn = 0, apOut = 0, at = 0, peak = 0;
    for (var s = 0; s < length; s++) {
      var sample = loop[at];
      var averaged = 0.5 * (sample + previous) * keep;
      previous = sample;
      var tuned = allpass * averaged + apIn - allpass * apOut;
      apIn = averaged;
      apOut = tuned;
      loop[at] = tuned;
      out[s] = sample;
      if (sample > peak) peak = sample; else if (-sample > peak) peak = -sample;
      at = at + 1 === whole ? 0 : at + 1;
    }
    var gain = peak > 0 ? 0.9 / peak : 1;
    var fade = Math.floor(rate * 0.08);
    for (s = 0; s < length; s++) {
      var tail = s > length - fade ? (length - s) / fade : 1;
      out[s] *= gain * tail;
    }
    return buffer;
  }

  // The room the harp hangs in: three seconds of decaying noise, which a
  // convolver turns into reverberation.
  function roomEcho(audio) {
    var rate = audio.sampleRate;
    var length = Math.floor(rate * 3.2);
    var impulse = audio.createBuffer(2, length, rate);
    for (var channel = 0; channel < 2; channel++) {
      var data = impulse.getChannelData(channel);
      var smooth = 0;
      for (var i = 0; i < length; i++) {
        var t = i / length;
        // the echo grows duller as it dies away
        smooth += ((Math.random() * 2 - 1) - smooth) * (0.75 - 0.6 * t);
        data[i] = i < rate * 0.012 ? 0 : smooth * Math.pow(1 - t, 2.6);
      }
    }
    return impulse;
  }

  function makeEngine() {
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    // 44.1 kHz is plenty for a harp and keeps the computed tones small on
    // machines whose sound card would otherwise ask for 96 or 192 kHz.
    var audio;
    try { audio = new AudioContextClass({ sampleRate: 44100 }); } catch (e) { audio = new AudioContextClass(); }
    var master = audio.createGain();
    var limiter = audio.createDynamicsCompressor();
    var dry = audio.createGain();
    var wet = audio.createGain();
    var echo = audio.createConvolver();
    echo.buffer = roomEcho(audio);
    master.gain.value = 0;
    dry.gain.value = 0.8;
    wet.gain.value = 0.55;
    limiter.threshold.value = -14;
    limiter.ratio.value = 6;
    dry.connect(limiter);
    echo.connect(wet);
    wet.connect(limiter);
    limiter.connect(master);
    master.connect(audio.destination);
    // a meter on the way out, so the sound can be checked without ears
    var meter = audio.createAnalyser();
    meter.fftSize = 2048;
    master.connect(meter);
    var meterData = new Float32Array(meter.fftSize);

    var tones = {};      // frequency -> buffer, made on first use
    var voices = [];     // what is sounding now

    function release(voice, seconds) {
      var now = audio.currentTime;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + seconds);
      try { voice.source.stop(now + seconds + 0.02); } catch (e) { /* already stopped */ }
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
        master.gain.linearRampToValueAtTime(on ? 0.8 : 0, now + (on ? 0.4 : 0.25));
        if (on) return audio.resume();
        setTimeout(function () { if (master.gain.value < 0.01) audio.suspend(); }, 400);
        return Promise.resolve();
      },
      prepare: function (frequency, ringSeconds) {
        if (!tones[frequency]) tones[frequency] = stringTone(audio, frequency, ringSeconds);
      },
      // strength and brightness run 0…1; pan runs −1…1
      pluck: function (id, frequency, ringSeconds, strength, brightness, pan) {
        if (audio.state !== 'running') return;
        this.prepare(frequency, ringSeconds);
        // a string can only sound once at a time; damp its previous note
        voices = voices.filter(function (voice) {
          if (voice.id === id) { release(voice, 0.03); return false; }
          return true;
        });
        while (voices.length >= MAX_VOICES) release(voices.shift(), 0.05);

        var source = audio.createBufferSource();
        var filter = audio.createBiquadFilter();
        var gain = audio.createGain();
        source.buffer = tones[frequency];
        filter.type = 'lowpass';
        filter.frequency.value = Math.min(audio.sampleRate * 0.45, 700 + frequency * 2 + brightness * 9000);
        gain.gain.value = 0.12 + 0.6 * strength;
        source.connect(filter);
        filter.connect(gain);
        var last = gain;
        if (audio.createStereoPanner) {
          last = audio.createStereoPanner();
          last.pan.value = pan;
          gain.connect(last);
        }
        last.connect(dry);
        last.connect(echo);
        var voice = { id: id, source: source, gain: gain };
        source.onended = function () {
          last.disconnect();
          voices = voices.filter(function (other) { return other !== voice; });
        };
        source.start();
        voices.push(voice);
      }
    };
  }

  /* ---- the instrument ---------------------------------------------------- */

  Gallery.register('harp', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var strings = [];
    var engine = null;
    var soundOn = false;
    var windOn = true;
    var notes = 0;
    var clock = 0;
    var finger = -1;            // the string last played from the keyboard

    /* ---- stringing the harp ---- */

    // Short, high strings on the left, clear of the wall label; long, low
    // ones on the right. Each string: where it hangs, what it sounds like,
    // and how it is moving right now.
    function stringHarp() {
      var w = size.w, h = size.h;
      var wide = w >= 900;
      var count = wide ? 24 : 15;
      var lowest = wide ? 73.42 : 146.83;      // D2, or D3 on a small harp
      var label = env.room.querySelector('.label');
      var stageRect = canvas.getBoundingClientRect();
      var labelRect = wide && label ? label.getBoundingClientRect() : null;
      var old = strings;
      strings = [];
      for (var i = 0; i < count; i++) {
        var u = i / (count - 1);
        var step = count - 1 - i;              // pitch falls from left to right
        var frequency = lowest * Math.pow(2, (12 * Math.floor(step / 5) + SCALE[step % 5]) / 12);
        var x = w * (wide ? 0.1 + 0.84 * u : 0.08 + 0.84 * u);
        var top = h * (wide ? 0.15 + 0.035 * Math.sin(u * 3.6) : 0.07 + 0.03 * Math.sin(u * 3.6));
        var bottom = h * (wide ? 0.46 + 0.46 * Math.pow(u, 1.3) : 0.6 + 0.33 * u);
        if (labelRect && x < labelRect.right - stageRect.left + 28) {
          bottom = Math.min(bottom, labelRect.top - stageRect.top - 28);
        }
        bottom = Math.max(bottom, top + 60);
        strings.push({
          x: x, top: top, bottom: bottom, u: u,
          frequency: frequency,
          ring: 1.8 + 3.4 * u,                // seconds the note lasts
          swing: 0, phase: 0, side: 1,        // how far it is swinging, where in the swing, which way it went
          glow: old[i] ? old[i].glow : 0
        });
      }
      env.live('strings', count);
    }

    /* ---- playing ---- */

    // strength 0…1; where 0…1 along the string, from its top
    function pluck(index, strength, where, side) {
      var s = strings[index];
      if (!s) return;
      strength = Gallery.clamp(strength, 0.05, 1);
      s.swing = Math.max(s.swing, (5 + 17 * strength) * (0.55 + 0.45 * s.u));
      s.phase = 0;
      s.side = side < 0 ? -1 : 1;
      s.glow = Math.min(1, s.glow + 0.35 + 0.65 * strength);
      notes++;
      env.live('notes', Gallery.formatCount(notes));
      if (soundOn && engine) {
        // plucked near an end a string sounds brighter than plucked mid-way
        var brightness = (0.25 + 0.75 * Math.abs(where - 0.5) * 2) * (0.35 + 0.65 * strength);
        engine.pluck(index, s.frequency, s.ring, strength, brightness, 0.6 - 1.2 * s.u);
      }
      if (!env.motion()) env.redraw();
    }

    // Did the pointer's path from (x0, y0) to (x1, y1) cross any strings?
    function strum(x0, y0, x1, y1, speed) {
      if (x0 === x1) return;
      for (var i = 0; i < strings.length; i++) {
        var s = strings[i];
        if ((x0 - s.x) * (x1 - s.x) > 0) continue;
        var y = y0 + (y1 - y0) * ((s.x - x0) / (x1 - x0));
        if (y < s.top || y > s.bottom) continue;
        pluck(i, 0.25 + speed * 0.5, (y - s.top) / (s.bottom - s.top), x1 - x0);
      }
    }

    var lastTouch = null;
    env.room.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var here = { x: e.clientX - rect.left, y: e.clientY - rect.top, t: e.timeStamp, id: e.pointerId };
      if (lastTouch && lastTouch.id === here.id) {
        var dt = Math.max(1, here.t - lastTouch.t);
        var speed = Math.sqrt(Math.pow(here.x - lastTouch.x, 2) + Math.pow(here.y - lastTouch.y, 2)) / dt;   // pixels per millisecond
        strum(lastTouch.x, lastTouch.y, here.x, here.y, Math.min(1.5, speed));
      }
      lastTouch = here;
    });
    ['pointerleave', 'pointercancel'].forEach(function (type) {
      env.room.addEventListener(type, function () { lastTouch = null; });
    });
    env.room.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') lastTouch = null; });

    // A tap or click lands on the nearest string, if one is close.
    canvas.addEventListener('pointerdown', function (e) {
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX - rect.left, y = e.clientY - rect.top;
      var best = -1, distance = 18;
      for (var i = 0; i < strings.length; i++) {
        var s = strings[i];
        if (y < s.top || y > s.bottom) continue;
        if (Math.abs(x - s.x) < distance) { distance = Math.abs(x - s.x); best = i; }
      }
      if (best >= 0) pluck(best, 0.7, (y - strings[best].top) / (strings[best].bottom - strings[best].top), 1);
    });

    // The wind: a gust that wanders along the harp, brushing strings near it
    // at random moments, and now and then running across several in a row.
    var wind = { next: 1.2, queue: [] };

    function blow(time, dt) {
      var gust = 0.5 + 0.46 * Math.sin(time * 0.13) * Math.cos(time * 0.071 + 1.3);
      var force = 0.5 + 0.5 * Math.sin(time * 0.05 + 2.0);
      wind.next -= dt;
      if (wind.next <= 0) {
        var centre = Math.round(gust * (strings.length - 1) + (Math.random() + Math.random() - 1) * 2.4);
        centre = Gallery.clamp(centre, 0, strings.length - 1);
        if (Math.random() < 0.16) {
          var direction = Math.random() < 0.5 ? -1 : 1;
          var run = 4 + Math.floor(Math.random() * 6);
          var gap = 0.05 + Math.random() * 0.05;
          for (var k = 0; k < run; k++) {
            wind.queue.push({ at: time + k * gap, index: centre + direction * k, strength: 0.12 + 0.2 * force + k * 0.015 });
          }
        } else {
          wind.queue.push({ at: time, index: centre, strength: 0.1 + 0.3 * force * Math.random() });
        }
        wind.next = -Math.log(1 - Math.random()) / (0.5 + 2.0 * force);
      }
      wind.queue = wind.queue.filter(function (note) {
        if (note.at > time) return true;
        if (note.index >= 0 && note.index < strings.length) pluck(note.index, note.strength, 0.3 + Math.random() * 0.4, 1);
        return false;
      });
    }

    /* ---- drawing ---- */

    function swingStrings(dt) {
      for (var i = 0; i < strings.length; i++) {
        var s = strings[i];
        if (s.swing < 0.05 && s.glow < 0.005) { s.swing = 0; s.glow = 0; continue; }
        // low strings swing slowly and for a long time, high ones quickly and briefly
        s.phase += dt * (34 + 46 * (1 - s.u));
        s.swing *= Math.exp(-dt / (0.5 + 1.5 * s.u));
        s.glow *= Math.exp(-dt / (0.7 + 1.6 * s.u));
      }
    }

    // A string bowed out by `bend` pixels at its middle, leaning by `lean`.
    function trace(s, bend, lean) {
      var third = (s.bottom - s.top) / 3;
      ctx.moveTo(s.x, s.top);
      ctx.bezierCurveTo(s.x + (bend + lean) / 0.75, s.top + third, s.x + (bend - lean) / 0.75, s.bottom - third, s.x, s.bottom);
    }

    function render() {
      var ratio = canvas.width / size.w;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      ctx.lineCap = 'round';
      if (!strings.length) return;

      // the neck the strings hang from and the board they are tied to
      ctx.strokeStyle = 'rgba(233,230,223,0.2)';
      ctx.lineWidth = 1;
      ['top', 'bottom'].forEach(function (end) {
        ctx.beginPath();
        strings.forEach(function (s, i) { if (i) ctx.lineTo(s.x, s[end]); else ctx.moveTo(s.x, s[end]); });
        ctx.stroke();
      });

      for (var i = 0; i < strings.length; i++) {
        var s = strings[i];
        var bend = Math.cos(s.phase) * s.swing * s.side;
        var lean = Math.sin(s.phase * 2.0 + 0.6) * s.swing * 0.22;
        var weight = 0.8 + 1.1 * s.u;

        if (s.swing > 0.4) {
          // the blur a fast string leaves: the whole lens it sweeps through
          ctx.beginPath();
          trace(s, s.swing, 0);
          trace({ x: s.x, top: s.bottom, bottom: s.top }, -s.swing, 0);
          ctx.fillStyle = 'rgba(255,179,71,' + (0.05 + 0.1 * s.glow).toFixed(3) + ')';
          ctx.fill();
        }
        if (s.glow > 0.02) {
          ctx.beginPath();
          trace(s, bend, lean);
          ctx.strokeStyle = 'rgba(255,179,71,' + (0.22 * s.glow).toFixed(3) + ')';
          ctx.lineWidth = weight + 7;
          ctx.stroke();
        }
        ctx.beginPath();
        trace(s, bend, lean);
        // bone at rest, warming to amber while it rings
        var g = s.glow;
        ctx.strokeStyle = 'rgba(' + Math.round(233 + 22 * g) + ',' + Math.round(230 - 30 * g) + ',' + Math.round(223 - 110 * g) + ',' + (0.5 + 0.5 * g).toFixed(3) + ')';
        ctx.lineWidth = weight + 0.6 * g;
        ctx.stroke();

        ctx.fillStyle = 'rgba(233,230,223,0.75)';
        ctx.beginPath();
        ctx.arc(s.x, s.top, 1.6, 0, 6.2832);
        ctx.arc(s.x, s.bottom, 1.6, 0, 6.2832);
        ctx.fill();
      }

      if (finger >= 0 && strings[finger] && document.activeElement === env.stage) {
        var f = strings[finger];
        ctx.strokeStyle = '#ffb347';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x, f.top - 12, 4, 0, 6.2832);
        ctx.stroke();
      }
    }

    /* ---- wiring ---- */

    function resize() {
      var ratio = Math.min(size.dpr, 2);
      canvas.width = Math.max(1, Math.round(size.w * ratio));
      canvas.height = Math.max(1, Math.round(size.h * ratio));
      stringHarp();
    }

    var soundButton = env.room.querySelector('[data-harp-sound]');
    if (soundButton) {
      soundButton.addEventListener('click', function () {
        if (!engine) engine = makeEngine();
        if (!engine) {
          soundButton.textContent = 'This browser has no sound engine';
          soundButton.disabled = true;
          return;
        }
        soundOn = !soundOn;
        soundButton.textContent = soundOn ? 'Turn sound off' : 'Turn sound on';
        soundButton.classList.toggle('is-on', soundOn);
        engine.setOn(soundOn).then(function () {
          // answer the click with a small run across the harp
          if (!soundOn) return;
          for (var k = 0; k < 6; k++) {
            wind.queue.push({ at: clock + 0.05 + k * 0.07, index: Math.floor(strings.length * 0.72) - k * 2, strength: 0.4 });
          }
          if (!env.motion()) wind.queue.splice(0).forEach(function (note) { pluck(note.index, note.strength, 0.4, 1); });
        }).catch(function () {});
      });
    }

    var windButton = env.room.querySelector('[data-harp-wind]');
    if (windButton) {
      windButton.addEventListener('click', function () {
        windOn = !windOn;
        windButton.setAttribute('aria-pressed', String(windOn));
      });
    }

    // Arrow keys walk a finger along the strings; space runs across them.
    env.stage.addEventListener('keydown', function (e) {
      var move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (move) {
        finger = Gallery.clamp((finger < 0 ? Math.floor(strings.length / 2) : finger) + move, 0, strings.length - 1);
        pluck(finger, 0.6, 0.35, move);
      } else if (e.key === ' ' || e.key === 'Enter') {
        for (var k = 0; k < strings.length; k++) wind.queue.push({ at: clock + k * 0.045, index: k, strength: 0.45 });
      } else {
        return;
      }
      e.preventDefault();
      env.redraw();
    });

    return {
      resize: resize,
      frame: function (time, dt) {
        clock = time;
        if (windOn || wind.queue.length) blow(time, windOn ? dt : 0);
        swingStrings(dt);
        render();
      },
      // Paused: the harp hangs still. It can still be played, and heard.
      still: function () {
        strings.forEach(function (s) { s.swing = 0; });
        render();
        strings.forEach(function (s) { s.glow *= 0.5; });
      },
      motion: function (on) { if (!on) wind.queue = []; },
      // for testing: is the sound engine running, and is anything coming out of it
      sound: function () {
        return engine ? { state: engine.audio.state, level: engine.level(), rate: engine.audio.sampleRate } : { state: 'not started' };
      }
    };
  });
})();
