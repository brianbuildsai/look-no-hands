/* Docent — room 35.

   The building writes a wall label for a room that does not exist. In the
   page, when it opens, it reads every label in the exhibition (the hall's
   five and the thirty rooms beyond, delivered by tools/make-rooms.js as
   js/corpus.js) and learns from them the oldest language model there is: a
   Markov chain, which knows only which word tends to follow which two.
   Then it writes, and typesets the result as it goes, in the house style,
   with a glyph it has also made up.

   Nothing is stored between visits and nothing is fetched: the model is
   rebuilt from the labels each time, which takes a few milliseconds. A
   figure on the label says how many words in a row the docent has copied
   from an existing label, so that the visitor can judge it. */
(function () {
  'use strict';

  Gallery.register('docent', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }
    var corpus = window.CORPUS;
    if (!corpus || !corpus.labels || !corpus.labels.length) {
      env.fail('The docent has nothing to read: the file of wall texts did not load. The other rooms still run.');
      return null;
    }

    var seed = 35;
    function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    function pick(list) { return list[Math.floor(random() * list.length)]; }
    function push(map, key, val) { (map[key] || (map[key] = [])).push(val); }
    function tokens(text) { return String(text || '').split(/\s+/).filter(Boolean); }

    /* ---- learning ---- */

    // a chain of order two, which knows what follows each pair of words, with an order-one fallback
    function chain() { return { two: {}, one: {}, starts: [], words: 0 }; }
    function learn(model, text) {
      var t = tokens(text);
      if (t.length < 3) return;
      model.words += t.length;
      model.starts.push(t[0] + ' ' + t[1]);
      for (var i = 0; i < t.length; i++) {
        if (i + 1 < t.length) push(model.one, t[i], t[i + 1]);
        if (i + 2 < t.length) push(model.two, t[i] + ' ' + t[i + 1], t[i + 2]);
        if (/[.!?]$/.test(t[i]) && i + 2 < t.length) model.starts.push(t[i + 1] + ' ' + t[i + 2]);
      }
    }

    // write a run of sentences: at least min words, stopping at the first full stop after that, never past max
    function compose(model, minWords, maxWords, stray, first) {
      var words = (first || pick(model.starts)).split(' '), guard = 0;
      while (words.length < maxWords && guard++ < 600) {
        var a = words[words.length - 2], b = words[words.length - 1], next = model.two[a + ' ' + b];
        // straying: now and then, and more often where the road is single file, take the looser one-word path
        if (!next || random() < stray || (next.length === 1 && random() < stray * 2.5)) next = model.one[b] || next;
        // a dead end, where a label once ended: finish the sentence and begin another, unless there is enough already
        if (!next) {
          if (words.length >= minWords) break;
          if (!/[.!?]$/.test(b)) words[words.length - 1] = b.replace(/[,;:]$/, '') + '.';
          var fresh = pick(model.restarts || model.starts).split(' ');
          words.push(fresh[0], fresh[1]);
          continue;
        }
        var w = pick(next);
        words.push(w);
        if (words.length >= minWords && /[.!?]$/.test(w)) break;
      }
      var last = words[words.length - 1];
      if (!/[.!?]$/.test(last)) words[words.length - 1] = last.replace(/[,;:]$/, '') + '.';
      return words.join(' ');
    }

    // letters: a chain of order two over the letters of every word, for inventing titles
    var letters = { next: {} }, vocabulary = {};
    function learnWord(w) {
      w = w.toLowerCase().replace(/[^a-z]/g, '');
      if (w.length < 5) return;
      vocabulary[w] = 1;
      var s = '^^' + w + '$';
      for (var i = 0; i + 2 < s.length; i++) push(letters.next, s.slice(i, i + 2), s[i + 2]);
    }
    function coin() {
      for (var tries = 0; tries < 80; tries++) {
        var s = '^^', guard = 0;
        while (guard++ < 14) {
          var options = letters.next[s.slice(-2)];
          if (!options) break;
          var c = pick(options);
          if (c === '$') break;
          s += c;
        }
        var w = s.slice(2);
        if (w.length >= 5 && w.length <= 11 && !vocabulary[w] && !/(.)\1\1/.test(w)) return w.charAt(0).toUpperCase() + w.slice(1);
      }
      return 'Untitled';
    }

    // every run of four to sixteen words in the corpus, so the docent can confess how much it copied
    var grams = {};
    function learnGrams(text) {
      var t = tokens(text);
      for (var n = 4; n <= 16; n++) {
        var set = grams[n] || (grams[n] = {});
        for (var i = 0; i + n <= t.length; i++) set[t.slice(i, i + n).join(' ')] = 1;
      }
    }
    function longestCopied(text) {
      var t = tokens(text), best = 0;
      for (var i = 0; i < t.length; i++) {
        for (var n = 4; n <= 16 && i + n <= t.length; n++) {
          if (grams[n][t.slice(i, i + n).join(' ')]) best = Math.max(best, n); else break;
        }
      }
      return best;
    }

    var body = chain(), mediums = chain(), walls = chain();
    corpus.labels.forEach(function (label) {
      learn(body, label.text); learn(body, label.description); learn(body, label.line);
      learn(mediums, label.medium);
      learn(walls, label.wall);
      learnGrams(label.text); learnGrams(label.description); learnGrams(label.wall); learnGrams(label.medium); learnGrams(label.line);
      tokens(label.text + ' ' + label.description + ' ' + label.wall + ' ' + label.line + ' ' + label.title).forEach(learnWord);
    });
    var mediumStarts = mediums.starts.filter(function (s) { return s.indexOf('2026.') === 0; });
    mediums.restarts = mediums.starts.filter(function (s) { return s.indexOf('2026.') !== 0; });
    var learned = body.words + mediums.words + walls.words;

    /* ---- writing ---- */

    var stray = 0.2, count = 0;

    // a glyph nobody designed: two to four strokes from the plan's own vocabulary of marks
    function inventGlyph() {
      var ops = [], n = 2 + Math.floor(random() * 3);
      for (var k = 0; k < n; k++) ops.push({ kind: Math.floor(random() * 6), a: random(), b: random(), c: random() });
      return ops;
    }

    function write() {
      count++;
      var label = {
        number: 35 + count,
        title: coin(),
        // the medium lines and wall notes are a smaller store of words, so the docent strays further in them
        medium: compose(mediums, 14, 34, Math.min(0.7, stray + 0.15), mediumStarts.length ? pick(mediumStarts) : undefined),
        body: compose(body, 70, 115, stray),
        wall: compose(walls, 34, 62, Math.min(0.7, stray + 0.1)),
        glyph: inventGlyph()
      };
      if (random() < 0.3) label.title += ' ' + coin().toLowerCase();
      label.copied = Math.max(longestCopied(label.body), longestCopied(label.wall), longestCopied(label.medium));
      env.live('written', count);
      env.live('copied', label.copied ? String(label.copied) : 'fewer than four');
      return label;
    }
    env.live('words', Gallery.formatCount ? Gallery.formatCount(learned) : learned);

    /* ---- typesetting ---- */

    var column = { x: 0, y: 0, w: 400, h: 600 }, scale = 1;
    var current = null, sections = [], total = 0, written = 0, phase = 'writing', hold = 0, fade = 0;
    var SANS = '"Hanken Grotesk", system-ui, sans-serif', SERIF = 'Fraunces, Georgia, serif';
    var BONE = '#e9e6df', ASH = '#8f8d88';

    function wrap(text, font, width) {
      pen.font = font;
      var words = text.split(' '), lines = [], line = '';
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + ' ' + words[i] : words[i];
        if (line && pen.measureText(test).width > width) { lines.push(line); line = words[i]; } else line = test;
      }
      if (line) lines.push(line);
      return lines;
    }

    // lay the label out in the house style; if it will not fit the stage, set it a little smaller and try again
    function layout(label) {
      for (var attempt = 0; attempt < 4; attempt++) {
        var s = scale * Math.pow(0.9, attempt), height = 0;
        var specs = [
          { text: 'Room ' + label.number, font: '500 ' + (11 * s).toFixed(1) + 'px ' + SANS, colour: ASH, line: 16 * s, gap: 6 * s },
          { text: label.title, font: 'italic 500 ' + (40 * s).toFixed(1) + 'px ' + SERIF, colour: BONE, line: 46 * s, gap: 10 * s },
          { text: label.medium, font: '400 ' + (13 * s).toFixed(1) + 'px ' + SANS, colour: ASH, line: 19 * s, gap: 12 * s },
          { text: label.body, font: '400 ' + (15.5 * s).toFixed(1) + 'px ' + SANS, colour: BONE, line: 24 * s, gap: 16 * s },
          { text: label.wall, font: 'italic 400 ' + (13 * s).toFixed(1) + 'px ' + SANS, colour: ASH, line: 19 * s, gap: 0 }
        ];
        var out = [], chars = 0;
        specs.forEach(function (spec) {
          spec.lines = wrap(spec.text, spec.font, column.w);
          spec.lines.forEach(function (l) { chars += l.length + 1; });
          height += spec.lines.length * spec.line + spec.gap;
          out.push(spec);
        });
        if (height + 70 * s <= column.h || attempt === 3) { sections = out; total = chars; return; }
      }
    }

    function drawGlyph(ops, cx, cy, s) {
      pen.save();
      pen.translate(cx, cy);
      pen.strokeStyle = BONE; pen.fillStyle = BONE; pen.lineWidth = 1.2; pen.lineCap = 'round';
      for (var k = 0; k < ops.length; k++) {
        var op = ops[k], r = s * (0.18 + op.a * 0.3), ang = op.b * Math.PI * 2;
        pen.beginPath();
        if (op.kind === 0) { pen.arc(0, 0, r, 0, 6.2832); pen.stroke(); }
        else if (op.kind === 1) { pen.arc(0, 0, r, ang, ang + 1.5 + op.c * 3); pen.stroke(); }
        else if (op.kind === 2) { pen.moveTo(Math.cos(ang) * s * 0.45, Math.sin(ang) * s * 0.45); pen.lineTo(-Math.cos(ang) * s * 0.45, -Math.sin(ang) * s * 0.45); pen.stroke(); }
        else if (op.kind === 3) { var n = 3 + Math.floor(op.c * 4); for (var d = 0; d < n; d++) { var t = ang + d / n * 6.2832; pen.moveTo(Math.cos(t) * r + 1.5, Math.sin(t) * r); pen.arc(Math.cos(t) * r, Math.sin(t) * r, 1.5, 0, 6.2832); } pen.fill(); }
        else if (op.kind === 4) { pen.moveTo(-s * 0.45, 0); for (var q = 1; q <= 4; q++) pen.quadraticCurveTo(-s * 0.45 + (q - 0.5) * s * 0.225, (q % 2 ? -1 : 1) * r * 0.6, -s * 0.45 + q * s * 0.225, 0); pen.stroke(); }
        else { pen.moveTo(-r, s * (op.c - 0.5) * 0.7); pen.lineTo(r, s * (op.c - 0.5) * 0.7); pen.stroke(); }
      }
      pen.restore();
    }

    function draw() {
      var ratio = canvas.width / size.w;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);
      if (!current) return;
      pen.globalAlpha = phase === 'fading' ? Math.max(0, 1 - fade) : 1;
      pen.textBaseline = 'alphabetic';
      pen.textAlign = 'left';
      var s = scale, left = Math.floor(written), y = column.y + 46 * s, x = column.x;
      if (left > 0) drawGlyph(current.glyph, x + 20 * s, column.y + 18 * s, 40 * s);
      y += 12 * s;
      var caret = null;
      for (var k = 0; k < sections.length && left > 0; k++) {
        var sec = sections[k];
        pen.font = sec.font; pen.fillStyle = sec.colour;
        for (var n = 0; n < sec.lines.length && left > 0; n++) {
          var line = sec.lines[n], shown = line.slice(0, left);
          y += sec.line;
          pen.fillText(shown, x, y);
          if (shown.length < line.length && phase === 'writing') caret = { x: x + pen.measureText(shown).width + 2, y: y, h: sec.line * 0.7 };
          left -= line.length + 1;
        }
        y += sec.gap;
      }
      // the pen's position, while it writes
      if (phase === 'writing') {
        if (!caret && sections.length) caret = { x: x, y: y + 12 * s, h: 14 * s };
        pen.fillStyle = '#ffb347';
        pen.fillRect(caret.x, caret.y - caret.h, 1.5, caret.h);
      }
      pen.globalAlpha = 1;
    }

    /* ---- the voice ---- */

    var speak = false, canSpeak = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
    function hush() { if (canSpeak) { try { window.speechSynthesis.cancel(); } catch (e) { /* not fatal */ } } }
    function say(label) {
      if (!speak || !canSpeak || !label) return;
      try {
        window.speechSynthesis.cancel();
        var u = new window.SpeechSynthesisUtterance('Room ' + label.number + '. ' + label.title + '. ' + label.medium + ' ' + label.body + ' ' + label.wall);
        u.rate = 0.92; u.pitch = 0.85;
        var voices = window.speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
        if (voices.length) u.voice = voices[0];
        window.speechSynthesis.speak(u);
      } catch (e) { /* the docent stays quiet */ }
    }

    /* ---- wiring ---- */

    function next() {
      current = write();
      layout(current);
      written = 0; phase = 'writing'; hold = 0; fade = 0;
      say(current);
    }

    var strayDial = env.room.querySelector('[data-docent-stray]');
    var strayReadout = env.room.querySelector('[data-docent-stray-value]');
    function readStray() {
      stray = Number(strayDial.value) / 100;
      if (strayReadout) strayReadout.textContent = stray < 0.05 ? 'hardly at all' : stray < 0.25 ? 'now and then' : stray < 0.45 ? 'often' : 'at every step';
    }
    if (strayDial) { strayDial.addEventListener('input', readStray); readStray(); }
    var anotherButton = env.room.querySelector('[data-docent-another]');
    if (anotherButton) anotherButton.addEventListener('click', function () { next(); env.redraw(); });
    var speakButton = env.room.querySelector('[data-docent-speak]');
    if (speakButton) {
      if (!canSpeak) { speakButton.disabled = true; speakButton.textContent = 'No voice in this browser'; }
      else speakButton.addEventListener('click', function () {
        speak = !speak;
        speakButton.setAttribute('aria-pressed', String(speak));
        speakButton.textContent = speak ? 'Hush' : 'Let it speak';
        if (speak) say(current); else hush();
      });
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) hush(); });
    window.addEventListener('pagehide', hush);

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wide = size.w >= 900;
        scale = wide ? 1 : 0.86;
        column.w = wide ? Math.min(540, size.w * 0.42) : size.w - 48;
        column.x = wide ? size.w * 0.66 - column.w / 2 : 24;
        // below the masthead, which sits over the top of the stage on phones
        column.y = wide ? size.h * 0.1 : 92;
        column.h = size.h - column.y - (wide ? size.h * 0.06 : 20);
        if (!current) next(); else layout(current);
      },
      frame: function (time, dt) {
        dt = Math.min(dt, 0.1);
        if (phase === 'writing') {
          written += dt * 44;
          if (written >= total) { written = total; phase = 'holding'; hold = 8; }
        } else if (phase === 'holding') {
          hold -= dt;
          if (hold <= 0 && !(speak && canSpeak && window.speechSynthesis.speaking)) { phase = 'fading'; fade = 0; }
        } else {
          fade += dt / 0.7;
          if (fade >= 1) next();
        }
        draw();
      },
      // With motion paused: the label complete, held, and the voice silent
      still: function () { hush(); if (current) { written = total; phase = 'holding'; hold = 1e9; } draw(); },
      label: function () { return current ? { number: current.number, title: current.title, medium: current.medium, body: current.body, wall: current.wall, copied: current.copied, learned: learned, labels: corpus.labels.length, lines: sections.map(function (s) { return s.lines.length; }), total: total, written: written, phase: phase } : null; }
    };
  });
})();
