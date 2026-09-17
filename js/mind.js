/* Study for a Mind — room 3.

   A real neural network, written out longhand: two inputs (where a dot is),
   a layer of sixteen neurons, a layer of eight, one output (amber or blue).
   It learns by gradient descent with the Adam optimiser, sixty steps a
   second. Nothing is precomputed and nothing is faked: the map on screen is
   the network's actual answer for every position, redrawn as it changes. */
(function () {
  'use strict';

  var SIZES = [2, 16, 8, 1];
  var LEARNING_RATE = 0.012;
  var STEPS_PER_SECOND = 60;
  var MAX_DOTS = 600;
  var TILE_GRID = 20;

  var AMBER = [255, 179, 71];
  var BLUE = [61, 91, 255];
  var AMBER_DOT = [255, 208, 138];   // dots are a lighter tint so they show on their own colour
  var BLUE_DOT = [132, 156, 255];

  /* ---- the network ---------------------------------------------------- */

  function makeNetwork(sizes) {
    var layers = [];
    for (var l = 1; l < sizes.length; l++) {
      var nIn = sizes[l - 1], nOut = sizes[l];
      var layer = {
        nIn: nIn, nOut: nOut,
        W: new Float64Array(nIn * nOut), b: new Float64Array(nOut),       // weights, biases
        gW: new Float64Array(nIn * nOut), gb: new Float64Array(nOut),     // their gradients
        mW: new Float64Array(nIn * nOut), vW: new Float64Array(nIn * nOut), // Adam's running averages
        mb: new Float64Array(nOut), vb: new Float64Array(nOut),
        a: new Float64Array(nOut),                                        // activations
        d: new Float64Array(nOut)                                         // error signal
      };
      // Random starting weights. The first layer starts wide so its neurons
      // begin as lines scattered across the whole map, not bunched at the centre.
      var spread = Math.sqrt(3 / nIn) * (l === 1 ? 2.2 : 1.2);
      for (var i = 0; i < layer.W.length; i++) layer.W[i] = (Math.random() * 2 - 1) * spread;
      layers.push(layer);
    }
    return { layers: layers, steps: 0, connections: layers.reduce(function (n, y) { return n + y.W.length; }, 0) };
  }

  // tanh written with one exponential. Same function, and several times
  // quicker than Math.tanh, which matters at 250,000 calls a frame.
  function tanh(x) {
    if (x > 18) return 1;
    if (x < -18) return -1;
    var e = Math.exp(2 * x);
    return (e - 1) / (e + 1);
  }

  // Forward pass: what does the network say about the point (x0, x1)?
  function predict(net, x0, x1) {
    var layers = net.layers;
    var first = layers[0];
    var j, i, s, off;
    for (j = 0; j < first.nOut; j++) {
      first.a[j] = tanh(first.b[j] + first.W[j * 2] * x0 + first.W[j * 2 + 1] * x1);
    }
    var prev = first.a;
    for (var l = 1; l < layers.length; l++) {
      var layer = layers[l];
      var last = l === layers.length - 1;
      for (j = 0; j < layer.nOut; j++) {
        s = layer.b[j];
        off = j * layer.nIn;
        for (i = 0; i < layer.nIn; i++) s += layer.W[off + i] * prev[i];
        layer.a[j] = last ? 1 / (1 + Math.exp(-s)) : tanh(s);
        if (last) net.score = s;   // the raw score, before it is squashed to 0…1
      }
      prev = layer.a;
    }
    return prev[0];
  }

  // One step of learning over every dot: predict, measure the error, pass
  // the blame backwards through the layers, then nudge every weight.
  function learn(net, dots) {
    var layers = net.layers;
    var n = dots.x.length;
    if (!n) return { accuracy: 0, loss: 0 };
    var l, j, i, q, s, layer, next, off;
    for (l = 0; l < layers.length; l++) { layers[l].gW.fill(0); layers[l].gb.fill(0); }

    var right = 0, loss = 0;
    var input0 = new Float64Array(2);
    for (var k = 0; k < n; k++) {
      var y = dots.label[k];
      var p = predict(net, dots.x[k], dots.y[k]);
      if ((p > 0.5) === (y > 0.5)) right++;
      loss -= y * Math.log(p + 1e-9) + (1 - y) * Math.log(1 - p + 1e-9);
      input0[0] = dots.x[k];
      input0[1] = dots.y[k];

      for (l = layers.length - 1; l >= 0; l--) {
        layer = layers[l];
        if (l === layers.length - 1) {
          layer.d[0] = p - y;
        } else {
          next = layers[l + 1];
          for (j = 0; j < layer.nOut; j++) {
            s = 0;
            for (q = 0; q < next.nOut; q++) s += next.W[q * next.nIn + j] * next.d[q];
            layer.d[j] = s * (1 - layer.a[j] * layer.a[j]);
          }
        }
        var input = l === 0 ? input0 : layers[l - 1].a;
        for (j = 0; j < layer.nOut; j++) {
          off = j * layer.nIn;
          layer.gb[j] += layer.d[j];
          for (i = 0; i < layer.nIn; i++) layer.gW[off + i] += layer.d[j] * input[i];
        }
      }
    }

    // Adam: a learning rate per weight, steadied by running averages.
    net.steps++;
    var c1 = 1 - Math.pow(0.9, net.steps);
    var c2 = 1 - Math.pow(0.999, net.steps);
    function nudge(w, g, m, v) {
      for (var t = 0; t < w.length; t++) {
        var grad = g[t] / n;
        m[t] = 0.9 * m[t] + 0.1 * grad;
        v[t] = 0.999 * v[t] + 0.001 * grad * grad;
        w[t] -= LEARNING_RATE * (m[t] / c1) / (Math.sqrt(v[t] / c2) + 1e-8);
      }
    }
    for (l = 0; l < layers.length; l++) {
      layer = layers[l];
      nudge(layer.W, layer.gW, layer.mW, layer.vW);
      nudge(layer.b, layer.gb, layer.mb, layer.vb);
    }
    return { accuracy: right / n, loss: loss / n };
  }

  /* ---- things to learn ------------------------------------------------- */

  var DATASETS = {
    // two arms winding around each other twice
    spiral: function (add) {
      for (var arm = 0; arm < 2; arm++) {
        for (var i = 0; i < 100; i++) {
          var t = i / 99;
          var r = 0.1 + 0.82 * t;
          var a = 2 * 2 * Math.PI * t + arm * Math.PI;
          add(r * Math.cos(a) + (Math.random() - 0.5) * 0.04, r * Math.sin(a) + (Math.random() - 0.5) * 0.04, arm);
        }
      }
    },
    // an island of amber inside a ring of blue
    rings: function (add) {
      for (var i = 0; i < 170; i++) {
        var inner = i % 2 === 0;
        var r = inner ? Math.sqrt(Math.random()) * 0.34 : 0.6 + Math.random() * 0.28;
        var a = Math.random() * 2 * Math.PI;
        add(r * Math.cos(a), r * Math.sin(a), inner ? 1 : 0);
      }
    },
    // opposite corners match, which no single straight line can separate
    quarters: function (add) {
      for (var i = 0; i < 170; i++) {
        var x = (Math.random() * 2 - 1) * 0.84;
        var y = (Math.random() * 2 - 1) * 0.84;
        x += (x < 0 ? -1 : 1) * 0.07;
        y += (y < 0 ? -1 : 1) * 0.07;
        add(x, y, x * y > 0 ? 1 : 0);
      }
    },
    blank: function () {}
  };

  Gallery.register('mind', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var net = makeNetwork(SIZES);
    var dots = { x: [], y: [], label: [], born: [] };
    var addingBlue = false;
    var setName = 'spiral';
    var stepDebt = 0;
    var clock = 0;
    var lastResult = { accuracy: 0 };
    var layout = null;
    var fieldGrid = 96;
    var field = document.createElement('canvas');
    var fieldContext = field.getContext('2d');
    var fieldImage = null;
    var logits = null;
    var tiles = [];

    /* ---- where things sit ---- */

    // Wide screens: neurons in a column to the left of the map. Otherwise a
    // row beneath it. `map` and each tile are squares given as {x, y, s}.
    function arrange() {
      var w = size.w, h = size.h;
      var gutter = Math.max(16, Math.min(56, w * 0.04));
      var count = SIZES[2];
      var map, tileSize, gap, i, list = [];

      if (w >= 1200) {
        var s = Math.min(h * 0.7, w * 0.42);
        map = { x: w - gutter - s, y: (h - s) / 2 + 14, s: s };
        gap = 12;
        tileSize = Math.min(64, (s - gap * (count - 1)) / count);
        var total = tileSize * count + gap * (count - 1);
        for (i = 0; i < count; i++) {
          list.push({ x: map.x - 104 - tileSize, y: map.y + (s - total) / 2 + i * (tileSize + gap), s: tileSize });
        }
        return { map: map, tiles: list, column: true, caption: { x: map.x, y: map.y + s + 26 } };
      }

      var narrow = w < 900;
      var top = narrow ? 16 : 84;
      var room = h - top - (narrow ? 118 : 150);
      var side = Math.max(120, Math.min(narrow ? w - 32 : w * 0.44, room));
      map = { x: narrow ? (w - side) / 2 : w - gutter - side, y: top, s: side };
      gap = narrow ? 8 : 10;
      tileSize = (side - gap * (count - 1)) / count;
      for (i = 0; i < count; i++) {
        list.push({ x: map.x + i * (tileSize + gap), y: map.y + side + 40, s: tileSize });
      }
      return { map: map, tiles: list, column: false, caption: { x: map.x, y: map.y + side + 40 + tileSize + 24 } };
    }

    function resize() {
      var ratio = Math.min(size.dpr, 2);
      canvas.width = Math.max(1, Math.round(size.w * ratio));
      canvas.height = Math.max(1, Math.round(size.h * ratio));
      layout = arrange();
      // The map is sampled at the corners of a grid, edges included.
      fieldGrid = size.w < 900 ? 64 : 80;
      field.width = field.height = fieldGrid + 1;
      fieldImage = fieldContext.createImageData(fieldGrid + 1, fieldGrid + 1);
      logits = new Float32Array((fieldGrid + 1) * (fieldGrid + 1));
      tiles = layout.tiles.map(function () {
        var c = document.createElement('canvas');
        c.width = c.height = TILE_GRID;
        var tileContext = c.getContext('2d');
        return { canvas: c, context: tileContext, image: tileContext.createImageData(TILE_GRID, TILE_GRID) };
      });
    }

    /* ---- drawing ---- */

    // Colour for the network's answer, from its raw score z (negative blue,
    // positive amber). Brighter means more certain, and faint bands mark
    // equal steps of certainty, like contour lines on a hillside.
    function paintAnswer(data, o, z) {
      var hue = z > 0 ? AMBER : BLUE;
      var sure = tanh(Math.abs(z) / 6);
      var body = (0.1 + 0.4 * sure) * (0.93 + 0.07 * Math.cos(z * 1.6));
      data[o] = hue[0] * body;
      data[o + 1] = hue[1] * body;
      data[o + 2] = hue[2] * body;
      data[o + 3] = 255;
    }

    // Colour for one hidden neuron's activation a (−1 … 1).
    function paintNeuron(data, o, a) {
      var hue = a > 0 ? AMBER : BLUE;
      var body = 0.06 + 0.7 * Math.abs(a);
      data[o] = hue[0] * body;
      data[o + 1] = hue[1] * body;
      data[o + 2] = hue[2] * body;
      data[o + 3] = 255;
    }

    function computeField() {
      var g = fieldGrid, n = g + 1, data = fieldImage.data;
      for (var r = 0; r < n; r++) {
        var y = 1 - r / g * 2;
        for (var c = 0; c < n; c++) {
          predict(net, c / g * 2 - 1, y);
          logits[r * n + c] = net.score;
          paintAnswer(data, (r * n + c) * 4, net.score);
        }
      }
      fieldContext.putImageData(fieldImage, 0, 0);

      var hidden = net.layers[1].a;
      for (r = 0; r < TILE_GRID; r++) {
        y = 1 - (r + 0.5) / TILE_GRID * 2;
        for (c = 0; c < TILE_GRID; c++) {
          predict(net, (c + 0.5) / TILE_GRID * 2 - 1, y);
          for (var t = 0; t < tiles.length; t++) paintNeuron(tiles[t].image.data, (r * TILE_GRID + c) * 4, hidden[t]);
        }
      }
      for (t = 0; t < tiles.length; t++) tiles[t].context.putImageData(tiles[t].image, 0, 0);
    }

    // The line where the network is exactly undecided, traced through the
    // grid of scores square by square (marching squares) so it stays crisp
    // however sharp the network's opinion becomes.
    function traceBoundary(map) {
      var g = fieldGrid, n = g + 1, cell = map.s / g;
      ctx.beginPath();
      for (var r = 0; r < g; r++) {
        for (var c = 0; c < g; c++) {
          var tl = logits[r * n + c], tr = logits[r * n + c + 1];
          var bl = logits[(r + 1) * n + c], br = logits[(r + 1) * n + c + 1];
          var kind = (tl > 0 ? 1 : 0) | (tr > 0 ? 2 : 0) | (br > 0 ? 4 : 0) | (bl > 0 ? 8 : 0);
          if (kind === 0 || kind === 15) continue;
          var x = map.x + c * cell, y = map.y + r * cell;
          // where the score crosses zero along each side of the square
          var topX = x + cell * (tl / (tl - tr)), rightY = y + cell * (tr / (tr - br));
          var bottomX = x + cell * (bl / (bl - br)), leftY = y + cell * (tl / (tl - bl));
          switch (kind) {
            case 1: case 14: ctx.moveTo(x, leftY); ctx.lineTo(topX, y); break;
            case 2: case 13: ctx.moveTo(topX, y); ctx.lineTo(x + cell, rightY); break;
            case 3: case 12: ctx.moveTo(x, leftY); ctx.lineTo(x + cell, rightY); break;
            case 4: case 11: ctx.moveTo(x + cell, rightY); ctx.lineTo(bottomX, y + cell); break;
            case 6: case 9: ctx.moveTo(topX, y); ctx.lineTo(bottomX, y + cell); break;
            case 7: case 8: ctx.moveTo(x, leftY); ctx.lineTo(bottomX, y + cell); break;
            case 5:
              ctx.moveTo(x, leftY); ctx.lineTo(topX, y);
              ctx.moveTo(x + cell, rightY); ctx.lineTo(bottomX, y + cell);
              break;
            case 10:
              ctx.moveTo(topX, y); ctx.lineTo(x + cell, rightY);
              ctx.moveTo(x, leftY); ctx.lineTo(bottomX, y + cell);
              break;
          }
        }
      }
    }

    function render() {
      var ratio = canvas.width / size.w;
      var map = layout.map;
      var t, tile;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      computeField();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // connections: thickness is how much the output listens to that neuron
      var out = net.layers[2].W;
      ctx.lineCap = 'round';
      for (t = 0; t < tiles.length; t++) {
        tile = layout.tiles[t];
        var weight = out[t];
        var hue = weight > 0 ? AMBER : BLUE;
        ctx.strokeStyle = 'rgba(' + hue[0] + ',' + hue[1] + ',' + hue[2] + ',0.75)';
        ctx.lineWidth = Math.max(0.6, Math.min(7, Math.abs(weight) * 1.6));
        ctx.beginPath();
        if (layout.column) {
          var y0 = tile.y + tile.s / 2;
          var y1 = map.y + map.s * (0.2 + 0.6 * (t + 0.5) / tiles.length);
          ctx.moveTo(tile.x + tile.s, y0);
          ctx.bezierCurveTo(tile.x + tile.s + 50, y0, map.x - 50, y1, map.x, y1);
        } else {
          var x0 = tile.x + tile.s / 2;
          var x1 = map.x + map.s * (0.2 + 0.6 * (t + 0.5) / tiles.length);
          ctx.moveTo(x0, tile.y);
          ctx.bezierCurveTo(x0, tile.y - 20, x1, map.y + map.s + 20, x1, map.y + map.s);
        }
        ctx.stroke();
      }

      // the map, then the neurons
      var half = map.s / fieldGrid / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(map.x, map.y, map.s, map.s);
      ctx.clip();
      ctx.drawImage(field, map.x - half, map.y - half, map.s + half * 2, map.s + half * 2);
      traceBoundary(map);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(233,230,223,0.16)';
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(244,242,236,0.95)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(233,230,223,0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(map.x + 0.5, map.y + 0.5, map.s - 1, map.s - 1);
      for (t = 0; t < tiles.length; t++) {
        tile = layout.tiles[t];
        ctx.drawImage(tiles[t].canvas, tile.x, tile.y, tile.s, tile.s);
        ctx.strokeRect(tile.x + 0.5, tile.y + 0.5, tile.s - 1, tile.s - 1);
      }

      // the dots
      var radius = size.w < 900 ? 3 : 3.6;
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = '#000';
      for (var k = 0; k < dots.x.length; k++) {
        var age = clock - dots.born[k];
        var grow = age < 0.45 ? 1 + (1 - age / 0.45) * 2.2 : 1;
        var hueDot = dots.label[k] > 0.5 ? AMBER_DOT : BLUE_DOT;
        ctx.fillStyle = 'rgb(' + hueDot[0] + ',' + hueDot[1] + ',' + hueDot[2] + ')';
        ctx.beginPath();
        ctx.arc(map.x + (dots.x[k] + 1) / 2 * map.s, map.y + (1 - dots.y[k]) / 2 * map.s, radius * grow, 0, 6.2832);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = '#8f8d88';
      ctx.font = '400 13px "Hanken Grotesk", "Segoe UI", system-ui, sans-serif';
      ctx.textBaseline = 'alphabetic';
      var where = layout.column ? 'Left' : 'Above';
      var caption = dots.x.length ? where + ': what eight of its neurons respond to. Thicker lines count for more.'
                                  : 'No dots yet. Click or tap the map to add some.';
      wrapText(caption, layout.caption.x, layout.caption.y, layout.map.s, 18);
    }

    function wrapText(text, x, y, maxWidth, lineHeight) {
      var words = text.split(' ');
      var line = '';
      for (var i = 0; i < words.length; i++) {
        var attempt = line ? line + ' ' + words[i] : words[i];
        if (ctx.measureText(attempt).width > maxWidth && line) {
          ctx.fillText(line, x, y);
          y += lineHeight;
          line = words[i];
        } else {
          line = attempt;
        }
      }
      if (line) ctx.fillText(line, x, y);
    }

    /* ---- dots, buttons, and the loop ---- */

    function report() {
      env.live('params', net.connections);
      env.live('step', Gallery.formatCount(net.steps));
      env.live('accuracy', dots.x.length ? Math.round(lastResult.accuracy * 100) + '% right' : 'waiting for dots');
    }

    function forget() {
      net = makeNetwork(SIZES);
      stepDebt = 0;
      lastResult = { accuracy: 0 };
      report();
      env.redraw();
    }

    function addDot(x, y, label, born) {
      if (dots.x.length >= MAX_DOTS) return;
      dots.x.push(x);
      dots.y.push(y);
      dots.label.push(label);
      dots.born.push(born);
    }

    function loadSet(name) {
      dots = { x: [], y: [], label: [], born: [] };
      DATASETS[name](function (x, y, label) { addDot(x, y, label, -10); });
      setName = name;
      setButtons.forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.getAttribute('data-mind-set') === name));
      });
      forget();
    }

    // Pointer position as a place on the map, or null when it is off the map.
    function onMap(e) {
      if (!layout) return null;
      var rect = canvas.getBoundingClientRect();
      var px = e.clientX - rect.left, py = e.clientY - rect.top;
      var u = (px - layout.map.x) / layout.map.s;
      var v = (py - layout.map.y) / layout.map.s;
      if (u < 0 || u > 1 || v < 0 || v > 1) return null;
      return { x: u * 2 - 1, y: 1 - v * 2, px: px, py: py };
    }

    var drawing = false;
    var lastPlaced = { px: 0, py: 0 };

    function place(spot) {
      addDot(spot.x, spot.y, addingBlue ? 0 : 1, clock);
      lastPlaced.px = spot.px;
      lastPlaced.py = spot.py;
      report();
      env.redraw();
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var spot = onMap(e);
      if (!spot) return;
      drawing = true;
      place(spot);
    });
    canvas.addEventListener('pointermove', function (e) {
      var spot = onMap(e);
      canvas.style.cursor = spot ? 'crosshair' : '';
      if (!drawing || !spot) return;
      var dx = spot.px - lastPlaced.px, dy = spot.py - lastPlaced.py;
      if (dx * dx + dy * dy > 18 * 18) place(spot);
    });
    window.addEventListener('pointerup', function () { drawing = false; });
    window.addEventListener('pointercancel', function () { drawing = false; });

    var setButtons = Array.prototype.slice.call(env.room.querySelectorAll('[data-mind-set]'));
    setButtons.forEach(function (button) {
      button.addEventListener('click', function () { loadSet(button.getAttribute('data-mind-set')); });
    });

    var classButton = env.room.querySelector('[data-mind-class]');
    if (classButton) {
      classButton.addEventListener('click', function () {
        addingBlue = !addingBlue;
        classButton.textContent = addingBlue ? 'Adding blue dots' : 'Adding amber dots';
        classButton.classList.toggle('is-blue', addingBlue);
      });
    }

    var resetButton = env.room.querySelector('[data-mind-reset]');
    if (resetButton) resetButton.addEventListener('click', forget);

    loadSet(setName);

    return {
      resize: resize,
      frame: function (time, dt) {
        clock = time;
        stepDebt += dt * STEPS_PER_SECOND;
        var steps = Math.min(4, Math.floor(stepDebt));
        stepDebt -= steps;
        for (var i = 0; i < steps && dots.x.length; i++) lastResult = learn(net, dots);
        report();
        render();
      },
      // With motion paused, skip the watching and show what it has learned.
      still: function (time) {
        clock = time + 1;
        var target = Math.max(600, net.steps + 200);
        while (dots.x.length && net.steps < target) lastResult = learn(net, dots);
        report();
        render();
      }
    };
  });
})();
