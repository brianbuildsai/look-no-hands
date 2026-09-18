/* sound.js: what the undercroft sounds like.

   The effects are recordings now: some sixty short files made by ElevenLabs'
   sound-effects model from the words in tools/sounds.js, listed in
   samples.js, fetched when sound is first asked for, and played with a
   little variation each time. Under them is what was here before, and it
   still answers for anything that has not loaded or was never recorded: an
   oscillator or a burst of noise shaped by an envelope and a filter. The
   music is still written as it plays: a drone on the floor's root, a
   pentatonic arpeggio drawn from a seeded chance, and a pulse whose pace
   rises as a guardian's life falls. Nothing loads or sounds until asked. */
(function () {
  'use strict';

  var ctx = null, master = null, limiter = null, on = false, noiseBuffer = null;
  var music = { playing: false, element: null, timer: null, next: 0, step: 0, tension: 0, drone: null, gain: null, rnd: null };

  var ROOTS = { ember: 55, frost: 65.41, storm: 61.74, bloom: 58.27, void: 51.91, tide: 49, gear: 73.42, glass: 69.3 };   // A1, C2, B1, Bb1, G#1
  var SCALES = { ember: [0, 3, 5, 7, 10], frost: [0, 2, 4, 7, 9], storm: [0, 2, 3, 7, 10], bloom: [0, 2, 4, 7, 9], void: [0, 1, 5, 6, 10], tide: [0, 2, 3, 7, 8], gear: [0, 2, 5, 7, 9], glass: [0, 4, 6, 7, 11] };

  function start() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14; limiter.knee.value = 20; limiter.ratio.value = 8; limiter.attack.value = 0.003; limiter.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.5;
    master.connect(limiter); limiter.connect(ctx.destination);
    var n = ctx.sampleRate * 1.5, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseBuffer = buf;
    return true;
  }
  function setOn(want) {
    on = !!want;
    if (on) { if (!start()) { on = false; return false; } if (ctx.state === 'suspended') ctx.resume(); loadSamples(); if (music.element) playMusic(music.element); }
    else { stopMusic(); hush(); }
    return on;
  }

  // a tone: type, frequency (with a slide), envelope, through a filter
  function tone(type, f0, f1, t, attack, hold, release, vol, filterHz, q) {
    if (!on || !ctx) return;
    var now = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), out = g;
    o.type = type; o.frequency.setValueAtTime(f0, now); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), now + t);
    g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(vol, now + attack); g.gain.setValueAtTime(vol, now + attack + hold); g.gain.exponentialRampToValueAtTime(0.0001, now + attack + hold + release);
    if (filterHz) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterHz; f.Q.value = q || 1; g.connect(f); out = f; }
    o.connect(g); out.connect(master);
    o.start(now); o.stop(now + attack + hold + release + 0.05);
  }
  // noise: a burst through a filter that sweeps
  function noise(t, vol, kind, f0, f1, q) {
    if (!on || !ctx) return;
    var now = ctx.currentTime, s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuffer; s.loop = true;
    f.type = kind || 'bandpass'; f.frequency.setValueAtTime(f0 || 1000, now); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1 || f0 || 1000), now + t); f.Q.value = q || 1;
    g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.0001, now + t);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(now); s.stop(now + t + 0.02);
  }

  var EFFECTS = {
    swing: function () { noise(0.12, 0.35, 'bandpass', 2600, 500, 1.2); },
    hit: function () { noise(0.08, 0.5, 'lowpass', 1800, 300); tone('sine', 140, 50, 0.1, 0.002, 0.02, 0.1, 0.5); },
    heavy: function () { noise(0.16, 0.6, 'lowpass', 1200, 200); tone('sine', 90, 30, 0.2, 0.002, 0.05, 0.2, 0.7); },
    jump: function () { tone('square', 220, 520, 0.1, 0.005, 0.02, 0.08, 0.12, 1800); },
    land: function () { tone('sine', 110, 60, 0.08, 0.002, 0.02, 0.08, 0.3); noise(0.06, 0.15, 'lowpass', 900, 200); },
    dash: function () { noise(0.18, 0.4, 'bandpass', 600, 2400, 0.8); },
    hurt: function () { tone('sawtooth', 300, 90, 0.22, 0.003, 0.05, 0.2, 0.25, 2200); noise(0.15, 0.3, 'lowpass', 2000, 200); },
    death: function () { tone('sawtooth', 220, 40, 0.9, 0.01, 0.2, 0.7, 0.3, 1400); tone('sine', 110, 30, 1.0, 0.01, 0.3, 0.7, 0.3); },
    pickup: function () { tone('sine', 660, 660, 0.1, 0.005, 0.05, 0.15, 0.2); setTimeout(function () { tone('sine', 990, 990, 0.1, 0.005, 0.08, 0.25, 0.2); }, 90); },
    select: function () { tone('square', 880, 880, 0.04, 0.003, 0.02, 0.05, 0.08, 3000); },
    door: function () { tone('sine', 80, 160, 0.5, 0.02, 0.2, 0.4, 0.3); setTimeout(function () { tone('sine', 523, 523, 0.3, 0.01, 0.1, 0.5, 0.15); }, 250); },
    roar: function () { tone('sawtooth', 70, 50, 0.7, 0.05, 0.3, 0.5, 0.4, 600, 3); noise(0.6, 0.3, 'lowpass', 500, 120); },
    boom: function () { noise(0.7, 0.7, 'lowpass', 1500, 80); tone('sine', 60, 25, 0.8, 0.005, 0.2, 0.7, 0.8); },
    freeze: function () { tone('sine', 1760, 880, 0.3, 0.005, 0.05, 0.3, 0.12); noise(0.2, 0.15, 'highpass', 4000, 8000); },
    castember: function () { noise(0.4, 0.5, 'bandpass', 300, 1800, 0.7); tone('sawtooth', 60, 40, 0.4, 0.01, 0.1, 0.3, 0.25, 400); },
    castfrost: function () { tone('sine', 1320, 2640, 0.25, 0.005, 0.05, 0.4, 0.18); noise(0.3, 0.25, 'highpass', 3000, 9000); },
    caststorm: function () { for (var k = 0; k < 6; k++) setTimeout(function () { tone('square', 1200 + Math.random() * 2000, 200, 0.05, 0.001, 0.01, 0.04, 0.15, 5000); }, k * 22); noise(0.25, 0.4, 'highpass', 2000, 6000); },
    castbloom: function () { tone('sine', 392, 392, 0.4, 0.02, 0.15, 0.4, 0.15); tone('sine', 494, 494, 0.4, 0.02, 0.15, 0.4, 0.12); tone('sine', 587, 587, 0.4, 0.03, 0.15, 0.4, 0.1); },
    chest: function () { tone('square', 180, 360, 0.12, 0.004, 0.03, 0.1, 0.12, 1600); setTimeout(function () { tone('sine', 784, 784, 0.2, 0.005, 0.05, 0.3, 0.14); }, 80); },
    bell: function () { [1, 2.76, 5.4, 8.93].forEach(function (r, i) { tone('sine', 330 * r, 330 * r, 1.6, 0.003, 0.05, 1.5 - i * 0.25, 0.22 / (i + 1)); }); },
    legend: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { setTimeout(function () { tone('sine', f, f, 0.5, 0.01, 0.12, 0.7, 0.16); tone('triangle', f / 2, f / 2, 0.5, 0.01, 0.12, 0.7, 0.08); }, i * 110); }); noise(1.2, 0.12, 'highpass', 6000, 9000); },
    shot: function () { tone('triangle', 900, 300, 0.12, 0.002, 0.02, 0.1, 0.12, 2500); }
  };
  /* ---- the recorded effects ----
     Listed in samples.js, fetched and decoded the first time sound is asked
     for. Each is trimmed of the silence before it, measured, and played at a
     level worked out from its peak and the volume the list gives it, a touch
     faster or slower each time so that a run of hits is not one hit repeated.
     Until a recording has arrived, and for anything the list does not have,
     the synthesised effect plays instead. */

  var samples = {}, asked = false, lastPlayed = {}, voices = {}, hums = {};
  // what to synthesise when there is no recording under that name
  var STAND_IN = { swingheavy: 'swing', swingquick: 'swing', whip: 'swing', lash: 'swing', bolt: 'shot', spit: 'shot', clink: 'select', confirm: 'select', flip: 'jump', blink: 'dash', charge: 'dash', flare: 'castember', brazier: 'castember', breath: 'castember', gust: 'castfrost', icicle: 'freeze', crack: 'freeze', eclipse: 'freeze', thunder: 'caststorm', beam: 'caststorm', perk: 'pickup', font: 'pickup', flamelost: 'pickup', portal: 'door', clap: 'boom', moon: 'boom', shatter: 'boom', roots: 'hit', victory: 'legend', roargolem: 'roar', roarwyrm: 'roar', roarherald: 'roar', roarthorn: 'roar', roarorrery: 'roar', roarlightless: 'roar' };
  function base() {
    var tags = document.getElementsByTagName('script');
    for (var k = 0; k < tags.length; k++) { var src = tags[k].src || '', at = src.indexOf('js/game/sound.js'); if (at >= 0) return src.slice(0, at); }
    return '';
  }
  function loadSamples() {
    if (asked || !ctx || !window.UndercroftSamples || !window.fetch) return;
    asked = true;
    var list = window.UndercroftSamples, root = base();
    Object.keys(list).forEach(function (name) {
      fetch(root + list[name].file).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(function (raw) {
        return new Promise(function (done, fail) { ctx.decodeAudioData(raw, done, fail); });
      }).then(function (buffer) {
        var data = buffer.getChannelData(0), peak = 0.001, first = 0, k;
        for (k = 0; k < data.length; k++) { var a = data[k] < 0 ? -data[k] : data[k]; if (a > peak) peak = a; }
        for (k = 0; k < data.length; k++) { if ((data[k] < 0 ? -data[k] : data[k]) > peak * 0.04) { first = k; break; } }
        samples[name] = { buffer: buffer, gain: list[name].volume * Math.min(3, 0.9 / peak), offset: list[name].loop ? 0 : Math.max(0, first / buffer.sampleRate - 0.004), loop: !!list[name].loop, short: buffer.duration < 1.3 };
        if (hums[name] && hums[name].want > 0) hum(name, hums[name].want);
      }).catch(function () { /* this one stays synthesised */ });
    });
  }
  function playSample(name) {
    var s = samples[name], now = ctx.currentTime;
    if (lastPlayed[name] && now - lastPlayed[name] < 0.045) return true;          // the same blow landing on three things is one sound
    if ((voices[name] || 0) >= 4) return true;
    lastPlayed[name] = now; voices[name] = (voices[name] || 0) + 1;
    var src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = s.buffer; src.playbackRate.value = s.short ? 0.93 + Math.random() * 0.14 : 1;
    g.gain.value = s.gain * (s.short ? 0.9 + Math.random() * 0.2 : 1);
    src.connect(g); g.connect(master);
    src.onended = function () { voices[name] = Math.max(0, (voices[name] || 1) - 1); };
    src.start(now, s.offset);
    return true;
  }
  // something that runs on (the portal's hum): ask for a level from 0 to 1, as often as you like
  function hum(name, level) {
    var h = hums[name] || (hums[name] = { want: 0, src: null, gain: null });
    h.want = on ? Math.max(0, Math.min(1, level || 0)) : 0;
    if (!ctx || !samples[name]) return;
    if (h.want > 0 && !h.src) {
      h.src = ctx.createBufferSource(); h.gain = ctx.createGain(); h.src.buffer = samples[name].buffer; h.src.loop = true; h.gain.gain.value = 0.0001;
      h.src.connect(h.gain); h.gain.connect(master); h.src.start();
    }
    if (h.gain) h.gain.gain.setTargetAtTime(Math.max(0.0001, h.want * samples[name].gain), ctx.currentTime, 0.12);
    if (h.want <= 0 && h.src) { var old = h.src, og = h.gain; h.src = null; h.gain = null; setTimeout(function () { try { old.stop(); og.disconnect(); } catch (e) { /* already gone */ } }, 500); }
  }
  function hush() { Object.keys(hums).forEach(function (n) { hum(n, 0); }); }

  function play(name) {
    if (!on || !ctx) return;
    if (samples[name] && !samples[name].loop) { playSample(name); return; }
    var fx = EFFECTS[name] || EFFECTS[STAND_IN[name]];
    if (fx) fx();
  }

  /* ---- the music ---- */

  function makeRandom(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function playMusic(element) {
    music.element = element;
    if (!on || !ctx) return;
    stopMusic(true);
    music.playing = true; music.step = 0; music.rnd = makeRandom(element.length * 7919 + 17);
    music.gain = ctx.createGain(); music.gain.gain.value = 0.0001; music.gain.connect(master);
    music.gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 2);
    // the drone: two saws a hair apart through a slow lowpass
    var root = ROOTS[element] || 55, f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; f.Q.value = 2;
    var a = ctx.createOscillator(), b = ctx.createOscillator(); a.type = 'sawtooth'; b.type = 'sawtooth'; a.frequency.value = root; b.frequency.value = root * 1.004;
    var dg = ctx.createGain(); dg.gain.value = 0.35;
    a.connect(dg); b.connect(dg); dg.connect(f); f.connect(music.gain); a.start(); b.start();
    music.drone = { a: a, b: b, f: f };
    music.next = ctx.currentTime + 0.1;
    music.timer = setInterval(schedule, 60);
  }
  function schedule() {
    if (!music.playing || !ctx) return;
    var root = ROOTS[music.element] || 55, scale = SCALES[music.element] || SCALES.ember;
    var beat = 0.5 - 0.22 * music.tension;
    while (music.next < ctx.currentTime + 0.25) {
      var t = music.next, step = music.step;
      // a pulse on the beat, quicker with tension
      if (step % 2 === 0) { var k = ctx.createOscillator(), kg = ctx.createGain(); k.type = 'sine'; k.frequency.setValueAtTime(90, t); k.frequency.exponentialRampToValueAtTime(35, t + 0.12); kg.gain.setValueAtTime(0.5 + music.tension * 0.3, t); kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); k.connect(kg); kg.connect(music.gain); k.start(t); k.stop(t + 0.2); }
      // the arpeggio: a note from the scale, two octaves up, drawn by chance, resting now and then
      if (music.rnd() < 0.7 + music.tension * 0.25) {
        var deg = scale[Math.floor(music.rnd() * scale.length)], oct = music.rnd() < 0.3 ? 8 : 4, freq = root * oct * Math.pow(2, deg / 12);
        var o = ctx.createOscillator(), g = ctx.createGain(); o.type = music.element === 'storm' ? 'square' : music.element === 'frost' ? 'triangle' : 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(music.element === 'storm' ? 0.08 : 0.16, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (music.element === 'bloom' ? 0.9 : 0.45));
        o.connect(g); g.connect(music.gain); o.start(t); o.stop(t + 1);
      }
      music.next += beat / 2; music.step++;
    }
    if (music.drone) music.drone.f.frequency.setTargetAtTime(220 + music.tension * 500 + Math.sin(ctx.currentTime * 0.3) * 60, ctx.currentTime, 0.2);
  }
  function stopMusic(keepElement) {
    if (music.timer) { clearInterval(music.timer); music.timer = null; }
    if (music.gain && ctx) { var g = music.gain, d = music.drone; g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15); setTimeout(function () { try { d.a.stop(); d.b.stop(); g.disconnect(); } catch (e) { /* already gone */ } }, 700); }
    music.playing = false; music.gain = null; music.drone = null;
    if (!keepElement) music.element = null;
  }
  function tension(v) { music.tension = Math.max(0, Math.min(1, v || 0)); }

  window.Sound = { setOn: setOn, isOn: function () { return on; }, play: play, hum: hum, music: playMusic, stop: function () { stopMusic(); hush(); }, tension: tension, effects: Object.keys(EFFECTS),
    recorded: function () { return { listed: window.UndercroftSamples ? Object.keys(window.UndercroftSamples).length : 0, loaded: Object.keys(samples).length, names: Object.keys(samples) }; } };
})();
