/* sound.js: what the undercroft sounds like, all of it synthesised.

   No recordings, as everywhere in this building. Every effect is an
   oscillator or a burst of noise shaped by an envelope and a filter: the
   sword's swing is filtered noise sweeping down, a hit is a thump under a
   click, a jump a square wave rising, each power its own crackle, chime,
   spark or chord. The music is written as it plays: a drone on the floor's
   root, a pentatonic arpeggio drawn from a seeded chance, and a pulse whose
   pace rises as a guardian's life falls. Nothing sounds until asked. */
(function () {
  'use strict';

  var ctx = null, master = null, limiter = null, on = false, noiseBuffer = null;
  var music = { playing: false, element: null, timer: null, next: 0, step: 0, tension: 0, drone: null, gain: null, rnd: null };

  var ROOTS = { ember: 55, frost: 65.41, storm: 61.74, bloom: 58.27, void: 51.91 };   // A1, C2, B1, Bb1, G#1
  var SCALES = { ember: [0, 3, 5, 7, 10], frost: [0, 2, 4, 7, 9], storm: [0, 2, 3, 7, 10], bloom: [0, 2, 4, 7, 9], void: [0, 1, 5, 6, 10] };

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
    if (on) { if (!start()) { on = false; return false; } if (ctx.state === 'suspended') ctx.resume(); if (music.element) playMusic(music.element); }
    else stopMusic();
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
    shot: function () { tone('triangle', 900, 300, 0.12, 0.002, 0.02, 0.1, 0.12, 2500); }
  };
  function play(name) { if (!on || !ctx) return; var fx = EFFECTS[name]; if (fx) fx(); }

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

  window.Sound = { setOn: setOn, isOn: function () { return on; }, play: play, music: playMusic, stop: function () { stopMusic(); }, tension: tension, effects: Object.keys(EFFECTS) };
})();
