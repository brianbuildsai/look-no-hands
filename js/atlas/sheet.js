/* sheet.js — the page around the globe.

   Takes the word, has the world surveyed a slice at a time, hands it to the
   globe, and fills in everything printed around it: the title block, the
   names that ride on the sphere, the gazetteer, the key and the almanac.

   Typographic rule, as on a sea chart: water is named in italic serif,
   land in upright sans. It is applied here to the labels on the globe
   exactly as the stylesheet applies it to the page. */
(function () {
  'use strict';

  var DEFAULT_WORD = 'nowhere';
  var SLICE_MS = 14;              // how long the survey may hold the page at a time
  var SUGGESTIONS = ['lantern', 'saltwind', 'ember', 'marrow', 'thimble', 'juniper', 'halcyon', 'cinder', 'quill',
    'meridian', 'tallow', 'wren', 'obsidian', 'fathom', 'harbour', 'nettle', 'solstice', 'umbra', 'kestrel', 'loam'];

  var SERIF = '"Libre Caslon Text", "Iowan Old Style", Georgia, serif';
  var SANS = '"Barlow Semi Condensed", "Arial Narrow", "Segoe UI", sans-serif';
  var INK = '#14202b';
  var WATER_INK = '#21506e';
  var MAGENTA = '#a8286f';

  var world = null;
  var globe = null;
  var speech = null;
  var chart = null;               // { name, places } once the survey is finished
  var chosen = null;
  var hits = [];                  // where each name was drawn, for the pointer
  var surveyTimer = 0;

  function $(selector) { return document.querySelector(selector); }
  var el = {
    globe: $('[data-globe]'),
    labels: $('.globe__labels'),
    progress: $('[data-progress]'),
    name: $('[data-world="name"]'),
    nameInline: $('[data-world="name-inline"]'),
    word: $('[data-world="word"]'),
    entry: $('[data-entry]'),
    form: $('[data-word-form]'),
    input: $('#word'),
    another: $('[data-another]'),
    copy: $('[data-copy]'),
    copyStatus: $('[data-copy-status]'),
    almanac: $('[data-almanac]'),
    scale: $('[data-key="scale"]'),
    scaleRule: $('.scale-bar__rule')
  };

  function count(n) { return Math.round(n).toLocaleString('en-US'); }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ---- names on the globe ---- */

  var pen = el.labels.getContext('2d');
  var canSpace = pen && 'letterSpacing' in pen;

  function styleFor(place) {
    if (place.kind === 'water') {
      var open = place.priority > 70;
      return { font: 'italic ' + (open ? 15 : 12.5) + 'px ' + SERIF, size: open ? 15 : 12.5, color: WATER_INK, spacing: open ? 2.4 : 1, centred: true };
    }
    if (place.kind === 'land') {
      var main = place.priority > 97;
      return { font: '600 ' + (main ? 13.5 : 12) + 'px ' + SANS, size: main ? 13.5 : 12, color: 'rgba(20,32,43,0.74)', spacing: 3.2, centred: true, capitals: true };
    }
    if (place.kind === 'peak') return { font: '500 11.5px ' + SANS, size: 11.5, color: INK, spacing: 0.2, marker: 'peak' };
    if (place.capital) return { font: '600 13.5px ' + SANS, size: 13.5, color: INK, spacing: 0.2, marker: 'capital' };
    return { font: (place.priority > 52 ? '500 12.5px ' : '400 11.5px ') + SANS, size: place.priority > 52 ? 12.5 : 11.5, color: INK, spacing: 0.2, marker: 'town' };
  }

  function drawMarker(kind, x, y, color) {
    pen.fillStyle = color;
    pen.strokeStyle = color;
    pen.lineWidth = 1.2;
    pen.beginPath();
    if (kind === 'peak') {
      pen.moveTo(x, y - 4.5); pen.lineTo(x + 4, y + 3); pen.lineTo(x - 4, y + 3); pen.closePath(); pen.fill();
    } else if (kind === 'capital') {
      pen.rect(x - 2.5, y - 2.5, 5, 5); pen.fill();
      pen.strokeRect(x - 5, y - 5, 10, 10);
    } else {
      pen.arc(x, y, 2.4, 0, 6.2832); pen.fill();
    }
  }

  function overlaps(box, taken) {
    for (var i = 0; i < taken.length; i++) {
      var t = taken[i];
      if (box.x0 < t.x1 + 3 && box.x1 > t.x0 - 3 && box.y0 < t.y1 + 2 && box.y1 > t.y0 - 2) return true;
    }
    return false;
  }

  // Called after every frame the globe draws. Names are placed in order of
  // importance; a name that would sit on top of another is left off, which
  // is how printed maps stay legible too.
  function drawLabels() {
    var size = globe.size;
    if (el.labels.width !== Math.round(size.w * size.ratio) || el.labels.height !== Math.round(size.h * size.ratio)) {
      el.labels.width = Math.round(size.w * size.ratio);
      el.labels.height = Math.round(size.h * size.ratio);
    }
    pen.setTransform(size.ratio, 0, 0, size.ratio, 0, 0);
    pen.clearRect(0, 0, size.w, size.h);
    hits = [];
    if (!chart) return;

    // a small globe has room for fewer names
    var floor = size.radius < 150 ? 60 : size.radius < 230 ? 45 : size.radius < 300 ? 25 : 0;
    var order = chart.places.slice().sort(function (a, b) {
      return (b === chosen) - (a === chosen) || b.priority - a.priority;
    });
    var taken = [];
    pen.textBaseline = 'middle';
    pen.lineJoin = 'round';

    for (var i = 0; i < order.length; i++) {
      var place = order[i];
      var isChosen = place === chosen;
      if (place.priority < floor && !isChosen) continue;
      var at = globe.project(place.lat, place.lon);
      if (at.facing < 0.1) continue;
      var style = styleFor(place);
      var text = style.capitals ? place.name.toUpperCase() : place.name;
      pen.font = style.font;
      if (canSpace) pen.letterSpacing = style.spacing + 'px';
      var width = pen.measureText(text).width;
      var left = style.centred ? at.x - width / 2 : at.x + 8;
      // keep the whole name on the sheet: slide it in from either edge
      left = Math.max(3, Math.min(size.w - width - 3, left));
      var box = { x0: style.centred ? left : at.x - 6, y0: at.y - style.size * 0.7, x1: left + width, y1: at.y + style.size * 0.7 };

      var crowded = overlaps(box, taken);
      if (crowded && !isChosen) {
        // a town too crowded to name still gets its dot, and can still be chosen
        if (style.marker && !overlaps({ x0: at.x - 4, y0: at.y - 4, x1: at.x + 4, y1: at.y + 4 }, taken)) {
          pen.globalAlpha = Math.min(1, (at.facing - 0.1) / 0.2) * 0.7;
          drawMarker(style.marker, at.x, at.y, INK);
          hits.push({ place: place, x0: at.x - 7, y0: at.y - 7, x1: at.x + 7, y1: at.y + 7 });
        }
        continue;
      }
      taken.push(box);
      hits.push({ place: place, x0: box.x0 - 3, y0: box.y0 - 3, x1: box.x1 + 3, y1: box.y1 + 3 });

      pen.globalAlpha = Math.min(1, (at.facing - 0.1) / 0.2);
      var color = isChosen ? MAGENTA : style.color;
      if (style.marker) drawMarker(style.marker, at.x, at.y, color);
      pen.strokeStyle = 'rgba(244,246,243,0.82)';
      pen.lineWidth = 3;
      pen.strokeText(text, left, at.y + 0.5);
      pen.fillStyle = color;
      pen.fillText(text, left, at.y + 0.5);
      if (isChosen) {
        pen.strokeStyle = MAGENTA;
        pen.lineWidth = 1.5;
        pen.beginPath();
        pen.arc(at.x, at.y, style.centred ? 3 : 9, 0, 6.2832);
        pen.stroke();
      }
    }
    pen.globalAlpha = 1;
    if (canSpace) pen.letterSpacing = '0px';
  }

  function placeAt(x, y) {
    for (var i = 0; i < hits.length; i++) {
      var h = hits[i];
      if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return h.place;
    }
    return null;
  }

  /* ---- choosing a place ---- */

  function figure(list, term, value) {
    var row = make('div');
    row.appendChild(make('dt', '', term));
    row.appendChild(make('dd', '', value));
    list.appendChild(row);
  }

  function choose(place, fromList) {
    chosen = place;
    document.querySelectorAll('.place').forEach(function (button) {
      var mine = place && Number(button.getAttribute('data-place')) === place.id;
      button.classList.toggle('is-chosen', !!mine);
      if (mine) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
    });

    el.entry.textContent = '';
    if (!place) {
      el.entry.appendChild(make('p', 'entry__empty', 'Nothing chosen yet. Choose a name on the globe or in the gazetteer.'));
      globe.setIdleTurn(true);
      globe.invalidate();
      return;
    }
    el.entry.appendChild(make('h2', 'entry__name' + (place.kind === 'water' ? ' entry__name--water' : ''), place.name));
    el.entry.appendChild(make('p', 'entry__kind', place.kindText + (place.land ? ', ' + place.land : '')));
    var figures = make('dl', 'entry__figures');
    figure(figures, 'Position', place.position);
    if (place.kind === 'water') figure(figures, 'Depth here', count(-place.metres) + ' m');
    else figure(figures, 'Height', count(Math.max(0, place.metres)) + ' m');
    if (place.people) figure(figures, 'People', count(place.people));
    if (place.areaKm2) figure(figures, 'Area', count(place.areaKm2) + ' km²');
    el.entry.appendChild(figures);
    el.entry.appendChild(make('p', 'entry__text', place.text));

    globe.flyTo(place.lat, place.lon);
    // chosen from the list with the globe out of sight: bring the globe back
    if (fromList) {
      var rect = el.globe.getBoundingClientRect();
      if (rect.bottom < 80 || rect.top > window.innerHeight - 80) {
        var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.globe.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
      }
    }
  }

  /* ---- everything printed round the globe ---- */

  function fillGazetteer() {
    ['town', 'water', 'land', 'peak'].forEach(function (kind) {
      var list = $('[data-gazetteer="' + kind + '"]');
      list.textContent = '';
      chart.places.filter(function (p) { return p.kind === kind; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); })
        .forEach(function (place) {
          var item = make('li');
          var button = make('button', 'place' + (kind === 'water' ? ' place--water' : ''));
          button.type = 'button';
          button.setAttribute('data-place', place.id);
          button.appendChild(make('span', 'place__name', place.name));
          button.appendChild(make('span', 'place__leader'));
          button.appendChild(make('span', 'place__where', place.position));
          button.addEventListener('click', function () { choose(place, true); });
          item.appendChild(button);
          list.appendChild(item);
        });
    });
  }

  // The same tints the globe is printed in, lower bound of each band beneath.
  var DEPTHS = [['#dfeff5', '0'], ['#c5e1ec', '200'], ['#afd3e5', '1,000'], ['#96c3db', '3,000'], ['#7fb0cc', '5,000']];
  var HEIGHTS = [['#f3eac6', '0'], ['#eeddaa', '200'], ['#e7cf92', '500'], ['#dcbd7c', '1,000'], ['#cca669', '2,000'], ['#b8905c', '3,500'], ['#f4f2ec', '5,000']];

  function fillKey() {
    [['depths', DEPTHS], ['heights', HEIGHTS]].forEach(function (pair) {
      var list = $('[data-key="' + pair[0] + '"]');
      list.textContent = '';
      pair[1].forEach(function (band) {
        var item = make('li', 'key__swatch');
        var chip = make('span', 'key__chip');
        chip.style.background = band[0];
        item.appendChild(chip);
        item.appendChild(document.createTextNode(band[1]));
        list.appendChild(item);
      });
    });
  }

  // How much ground the scale bar covers at the middle of the disc, where
  // the globe is seen square-on: a round number of kilometres.
  function updateScale() {
    if (!world) return;
    var kmPerPixel = world.shape.radiusKm / globe.size.radius;
    var target = kmPerPixel * 120;
    var magnitude = Math.pow(10, Math.floor(Math.log(target) / Math.LN10));
    var nice = [5, 2, 1].map(function (m) { return m * magnitude; }).filter(function (v) { return v <= target; })[0] || magnitude;
    el.scaleRule.style.width = (nice / kmPerPixel).toFixed(1) + 'px';
    el.scale.textContent = count(nice) + ' km';
  }

  function fillAlmanac() {
    var stats = world.stats, shape = world.shape;
    var sky = Atlas.world.fork(world.seedText, 'almanac');
    var towns = chart.places.filter(function (p) { return p.kind === 'town'; });
    var capital = towns.filter(function (p) { return p.capital; })[0];
    var summit = chart.places.filter(function (p) { return p.kind === 'peak'; })[0];
    var people = towns.reduce(function (sum, p) { return sum + p.people; }, 0);
    var moons = Math.floor(sky() * 4);
    var rows = [
      ['Drawn for', '“' + (world.word || 'nothing at all') + '”'],
      ['Number behind the word', count(world.seed)],
      ['Radius', count(shape.radiusKm) + ' km'],
      ['Surface', count(stats.surfaceKm2 / 1e6) + ' million km²'],
      ['Land', Math.round(stats.landShare * 100) + '% of the surface'],
      ['Coastline, roughly', count(Math.round(stats.coastKm / 1000) * 1000) + ' km'],
      ['Highest ground', summit ? summit.name + ', ' + count(summit.metres) + ' m' : count(stats.highest.metres) + ' m'],
      ['Deepest sounding', count(-stats.deepest.metres) + ' m', true],
      ['Mean depth of the sea', count(stats.meanSeaDepth) + ' m', true],
      ['Mean height of the land', count(stats.meanLandHeight) + ' m'],
      ['Capital', capital ? capital.name + ', ' + count(capital.people) : 'none'],
      ['People in the charted towns', count(people)],
      ['Length of the day', (14 + sky() * 26).toFixed(1) + ' hours'],
      ['Length of the year', count(180 + sky() * 520) + ' days'],
      ['Moons', moons === 0 ? 'none' : String(moons)],
      ['Its word for a harbour', speech.portWord]
    ];
    el.almanac.textContent = '';
    rows.forEach(function (row) {
      var line = make('div', 'almanac__row');
      line.appendChild(make('dt', '', row[0]));
      line.appendChild(make('dd', row[2] ? 'is-water' : '', row[1]));
      el.almanac.appendChild(line);
    });
  }

  /* ---- from a word to a world ---- */

  function draw(word) {
    clearTimeout(surveyTimer);
    chart = null;
    choose(null);
    world = Atlas.world.create(word);
    speech = Atlas.tongue.create(world.seedText);
    var name = speech.world();            // coined first, so it can be shown at once
    el.word.textContent = world.word || 'nothing at all';
    el.name.textContent = name;
    el.nameInline.textContent = name;
    el.input.value = world.word;
    document.title = name + ' — An Atlas of Nowhere';
    globe.setWorld(world);
    updateScale();
    survey(name);
  }

  // Survey a slice, say how far it has got, and come back for more.
  function survey(name) {
    var done = world.step(SLICE_MS);
    globe.invalidate();
    if (done < 1) {
      el.progress.textContent = 'Drawing this world, ' + Math.floor(done * 100) + '%';
      surveyTimer = setTimeout(function () { survey(name); }, 0);
      return;
    }
    el.progress.textContent = '';
    chart = Atlas.places.find(world, speech, name);
    chart.name = name;
    fillGazetteer();
    fillAlmanac();
    globe.invalidate();
  }

  // The word lives in the address, so a world can be passed on as a link.
  function wordFromAddress() {
    var raw = window.location.hash.replace(/^#/, '');
    if (!raw) return null;
    try { return decodeURIComponent(raw); } catch (e) { return raw; }
  }

  function go(word) {
    var clean = Atlas.world.normaliseWord(word) || DEFAULT_WORD;     // an empty box draws the default world
    var target = '#' + encodeURIComponent(clean);
    if (window.location.hash === target) draw(clean);
    else window.location.hash = target;      // the hashchange listener does the drawing
  }

  function say(message) {
    el.copyStatus.textContent = message;
    clearTimeout(say.timer);
    say.timer = setTimeout(function () { el.copyStatus.textContent = ''; }, 2600);
  }

  // The older way to copy, for browsers that refuse the clipboard API.
  function copyByHand(text) {
    var box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.position = 'fixed';
    box.style.opacity = '0';
    document.body.appendChild(box);
    box.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(box);
    return ok;
  }

  function copyLink() {
    var link = window.location.href.split('#')[0] + '#' + encodeURIComponent(world.word);
    function settle(ok) { say(ok ? 'Link copied' : 'Could not copy. The link is in the address bar.'); }
    // make sure the address bar really does hold the link, whichever way this goes
    if (window.location.hash !== '#' + encodeURIComponent(world.word)) {
      try { window.history.replaceState(null, '', '#' + encodeURIComponent(world.word)); } catch (e) { /* file: pages may refuse */ }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(function () { settle(true); }, function () { settle(copyByHand(link)); });
    } else {
      settle(copyByHand(link));
    }
  }

  /* ---- boot ---- */

  globe = Atlas.globe.create(el.globe, {
    onRender: drawLabels,
    onResize: updateScale,
    onClick: function (x, y) { var place = placeAt(x, y); if (place) choose(place, false); },
    onHover: function (x, y) { el.globe.classList.toggle('is-over-place', !!placeAt(x, y)); }
  });

  function submitWord(e) {
    e.preventDefault();
    go(el.input.value);
    el.input.blur();
  }
  el.form.addEventListener('submit', submitWord);
  // Enter is handled directly as well: some keyboards and tools deliver the
  // key without triggering the form's own submission.
  el.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitWord(e); });
  el.another.addEventListener('click', function () {
    var next = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
    if (world && next === world.word) next = SUGGESTIONS[(SUGGESTIONS.indexOf(next) + 1) % SUGGESTIONS.length];
    go(next);
  });
  el.copy.addEventListener('click', copyLink);
  window.addEventListener('hashchange', function () { draw(wordFromAddress() || DEFAULT_WORD); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { globe.invalidate(); });

  fillKey();
  draw(wordFromAddress() || DEFAULT_WORD);

  // for testing from the console
  Atlas.sheet = {
    draw: draw,
    choose: choose,
    globe: function () { return globe; },
    world: function () { return world; },
    chart: function () { return chart; },
    hits: function () { return hits; }
  };
})();
