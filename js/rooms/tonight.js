/* Tonight — room 32.

   The solar system at this moment, worked out from the mean orbital
   elements of the planets: six numbers each and their slow drift, as tabled
   by E. M. Standish at the Jet Propulsion Laboratory (1992) for the years
   1800 to 2050. For each planet: take the elements for today, find the mean
   anomaly, solve Kepler's equation for the eccentric anomaly, place the
   planet on its ellipse, and tilt the ellipse into the ecliptic. Then look
   from Earth: a planet east of the Sun is in the evening sky after sunset,
   west of it in the morning sky before dawn, opposite it up all night, and
   within fifteen degrees of it lost in the glare.

   The rates are per Julian century, and the table is not meant for dates
   far outside 1800 to 2050; the dial lets you go there anyway, and the
   picture stays roughly right for a few centuries either way. */
(function () {
  'use strict';

  // a, e, I, L, long. perihelion, long. ascending node, each with its rate per century (Standish, table 1)
  var PLANETS = [
    { name: 'Mercury', a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], i: [7.00497902, -0.00594749], L: [252.25032350, 149472.67411175], w: [77.45779628, 0.16047689], o: [48.33076593, -0.12534081], dot: 2.2 },
    { name: 'Venus', a: [0.72333566, 0.00000390], e: [0.00677672, -0.00004107], i: [3.39467605, -0.00078890], L: [181.97909950, 58517.81538729], w: [131.60246718, 0.00268329], o: [76.67984255, -0.27769418], dot: 3.2 },
    { name: 'Earth', a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], i: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], w: [102.93768193, 0.32327364], o: [0.0, 0.0], dot: 3.3 },
    { name: 'Mars', a: [1.52371034, 0.00001847], e: [0.09339410, 0.00007882], i: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], w: [-23.94362959, 0.44441088], o: [49.55953891, -0.29257343], dot: 2.6 },
    { name: 'Jupiter', a: [5.20288700, -0.00011607], e: [0.04838624, -0.00013253], i: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775], w: [14.72847983, 0.21252668], o: [100.47390909, 0.20469106], dot: 6.5 },
    { name: 'Saturn', a: [9.53667594, -0.00125060], e: [0.05386179, -0.00050991], i: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201], w: [92.59887831, -0.41897216], o: [113.66242448, -0.28867794], dot: 5.6 },
    { name: 'Uranus', a: [19.18916464, -0.00196176], e: [0.04725744, -0.00004397], i: [0.77263783, -0.00242939], L: [313.23810451, 428.48202785], w: [170.95427630, 0.40805281], o: [74.01692503, 0.04240589], dot: 4.2 },
    { name: 'Neptune', a: [30.06992276, 0.00026291], e: [0.00859048, 0.00005105], i: [1.77004347, 0.00035372], L: [-55.12002969, 218.45945325], w: [44.96476227, -0.32241464], o: [131.78422574, -0.00508664], dot: 4.1 }
  ];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var RAD = Math.PI / 180;

  function wrap(deg) { deg = deg % 360; if (deg > 180) deg -= 360; if (deg <= -180) deg += 360; return deg; }

  // the heliocentric position of a planet, in astronomical units on the ecliptic, at T Julian centuries from J2000
  function position(p, T, E0) {
    var a = p.a[0] + p.a[1] * T, e = p.e[0] + p.e[1] * T, I = (p.i[0] + p.i[1] * T) * RAD;
    var L = p.L[0] + p.L[1] * T, wbar = p.w[0] + p.w[1] * T, O = (p.o[0] + p.o[1] * T) * RAD;
    var w = (wbar - (p.o[0] + p.o[1] * T)) * RAD, M = wrap(L - wbar) * RAD;
    // Kepler's equation, by Newton's method
    var E = E0 !== undefined ? E0 : M + e * Math.sin(M);
    if (E0 === undefined) for (var k = 0; k < 12; k++) { var dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= dE; if (Math.abs(dE) < 1e-9) break; }
    var xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    var cw = Math.cos(w), sw = Math.sin(w), co = Math.cos(O), so = Math.sin(O), ci = Math.cos(I), si = Math.sin(I);
    return {
      x: (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp,
      y: (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp,
      z: (sw * si) * xp + (cw * si) * yp,
      a: a, e: e
    };
  }

  function centuries(ms) { return (ms / 86400000 + 2440587.5 - 2451545.0) / 36525; }

  // everything the room needs to know for one moment
  function sky(ms) {
    var T = centuries(ms), out = { ms: ms, T: T, planets: [] }, k;
    for (k = 0; k < PLANETS.length; k++) out.planets.push(position(PLANETS[k], T));
    var earth = out.planets[2];
    out.sunLon = Math.atan2(-earth.y, -earth.x) / RAD;
    for (k = 0; k < PLANETS.length; k++) {
      var p = out.planets[k];
      p.name = PLANETS[k].name;
      p.r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      if (k === 2) continue;
      var gx = p.x - earth.x, gy = p.y - earth.y, gz = p.z - earth.z;
      p.lon = Math.atan2(gy, gx) / RAD;
      p.distance = Math.sqrt(gx * gx + gy * gy + gz * gz);
      p.elongation = wrap(p.lon - out.sunLon);
      var e = Math.abs(p.elongation);
      p.where = e < 15 ? 'glare' : e > 150 ? 'night' : p.elongation > 0 ? 'evening' : 'morning';
    }
    return out;
  }

  Gallery.register('tonight', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var offsetDays = 0, running = false, trueScale = false, centre = { x: 0, y: 0 }, R = 100, latest = null, reported = '';

    function radius(rAU) { return trueScale ? rAU / 31 * R : Math.pow(rAU / 30.6, 0.42) * R; }
    function place(p) { var s = radius(p.r === undefined ? Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) : p.r); var ang = Math.atan2(p.y, p.x); return { x: centre.x + Math.cos(ang) * s, y: centre.y - Math.sin(ang) * s }; }

    function dateText(ms) {
      var d = new Date(ms);
      var y = d.getFullYear();
      return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + (y < 1 ? (1 - y) + ' BC' : y);
    }

    function draw(s) {
      var ratio = canvas.width / size.w;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);
      var k, q, p;
      // the orbits, sampled around each ellipse as it is at this epoch
      pen.lineWidth = 1;
      pen.strokeStyle = 'rgba(233,230,223,0.16)';
      for (k = 0; k < PLANETS.length; k++) {
        pen.beginPath();
        for (q = 0; q <= 120; q++) {
          var pt = place(position(PLANETS[k], s.T, q / 120 * Math.PI * 2));
          if (q) pen.lineTo(pt.x, pt.y); else pen.moveTo(pt.x, pt.y);
        }
        pen.stroke();
      }
      // the sun
      var glow = pen.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, 26);
      glow.addColorStop(0, 'rgba(255,179,71,0.55)'); glow.addColorStop(1, 'rgba(255,179,71,0)');
      pen.fillStyle = glow; pen.beginPath(); pen.arc(centre.x, centre.y, 26, 0, 6.2832); pen.fill();
      pen.fillStyle = '#ffb347'; pen.beginPath(); pen.arc(centre.x, centre.y, 4.5, 0, 6.2832); pen.fill();
      // lines of sight from Earth, coloured by when the planet is up
      var earth = place(s.planets[2]);
      for (k = 0; k < PLANETS.length; k++) {
        if (k === 2) continue;
        p = s.planets[k];
        var at = place(p);
        pen.strokeStyle = p.where === 'evening' ? 'rgba(255,179,71,0.5)' : p.where === 'morning' ? 'rgba(61,91,255,0.7)' : p.where === 'night' ? 'rgba(233,230,223,0.4)' : 'rgba(143,141,136,0.18)';
        pen.setLineDash(p.where === 'glare' ? [2, 5] : []);
        pen.beginPath(); pen.moveTo(earth.x, earth.y); pen.lineTo(at.x, at.y); pen.stroke();
      }
      pen.setLineDash([]);
      // the planets and their names
      pen.font = '500 ' + (size.w >= 900 ? 12 : 11) + 'px "Hanken Grotesk", system-ui, sans-serif';
      pen.textBaseline = 'middle';
      for (k = 0; k < PLANETS.length; k++) {
        p = s.planets[k];
        var here = place(p), dot = PLANETS[k].dot * (size.w >= 900 ? 1 : 0.8);
        pen.fillStyle = k === 2 ? '#3d5bff' : '#e9e6df';
        pen.beginPath(); pen.arc(here.x, here.y, dot, 0, 6.2832); pen.fill();
        if (k === 2) { pen.strokeStyle = 'rgba(233,230,223,0.9)'; pen.lineWidth = 1; pen.beginPath(); pen.arc(here.x, here.y, dot + 2.5, 0, 6.2832); pen.stroke(); }
        var dx = here.x - centre.x, dy = here.y - centre.y, d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        if (d < 22 && k !== 2) continue;                              // crowded in against the sun: no room for a name
        pen.fillStyle = k === 2 ? '#e9e6df' : p.where === 'evening' ? '#ffb347' : p.where === 'morning' ? '#8fa3ff' : p.where === 'night' ? '#e9e6df' : '#8f8d88';
        // the name sits outward of the dot, unless that would run off the edge of the stage
        var lx = here.x + dx / d * (dot + 6), ly = here.y + dy / d * (dot + 6), tw = pen.measureText(PLANETS[k].name).width, leftAligned = dx >= 0;
        if (leftAligned && lx + tw > size.w - 8) { leftAligned = false; lx = here.x - dx / d * (dot + 6); }
        else if (!leftAligned && lx - tw < 8) { leftAligned = true; lx = here.x - dx / d * (dot + 6); }
        pen.textAlign = leftAligned ? 'left' : 'right';
        pen.fillText(PLANETS[k].name, lx, ly);
      }
    }

    function words(list) {
      if (!list.length) return 'none';
      if (list.length === 1) return list[0];
      return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
    }
    function report(s) {
      var groups = { evening: [], morning: [], night: [], glare: [] };
      for (var k = 0; k < PLANETS.length; k++) if (k !== 2) groups[s.planets[k].where].push(PLANETS[k].name);
      var text = dateText(s.ms) + '|' + words(groups.evening) + '|' + words(groups.morning) + '|' + words(groups.night) + '|' + words(groups.glare);
      if (text === reported) return;
      reported = text;
      env.live('date', dateText(s.ms));
      env.live('evening', words(groups.evening));
      env.live('morning', words(groups.morning));
      env.live('night', words(groups.night));
      env.live('glare', words(groups.glare));
    }

    /* ---- wiring ---- */

    var whenDial = env.room.querySelector('[data-tonight-when]');
    var whenReadout = env.room.querySelector('[data-tonight-when-value]');
    function describeWhen() {
      if (!whenReadout) return;
      var years = Math.round(offsetDays / 365.25);
      whenReadout.textContent = years === 0 ? 'tonight' : Math.abs(years) + (Math.abs(years) === 1 ? ' year ' : ' years ') + (years > 0 ? 'on' : 'back');
    }
    if (whenDial) {
      whenDial.addEventListener('input', function () { offsetDays = Number(whenDial.value) * 365.25; describeWhen(); env.redraw(); });
      describeWhen();
    }
    var runButton = env.room.querySelector('[data-tonight-run]');
    if (runButton) runButton.addEventListener('click', function () {
      running = !running;
      runButton.setAttribute('aria-pressed', String(running));
      runButton.textContent = running ? 'Hold it' : 'Let it run';
    });
    var nowButton = env.room.querySelector('[data-tonight-now]');
    if (nowButton) nowButton.addEventListener('click', function () {
      offsetDays = 0; running = false;
      if (runButton) { runButton.setAttribute('aria-pressed', 'false'); runButton.textContent = 'Let it run'; }
      if (whenDial) whenDial.value = '0';
      describeWhen(); env.redraw();
    });
    var scaleButton = env.room.querySelector('[data-tonight-scale]');
    if (scaleButton) scaleButton.addEventListener('click', function () {
      trueScale = !trueScale;
      scaleButton.setAttribute('aria-pressed', String(trueScale));
      env.redraw();
    });

    function show(dt) {
      if (running && dt > 0) {
        offsetDays += dt * 365.25 / 5;                                 // a year every five seconds
        if (offsetDays > 300 * 365.25) { offsetDays = 300 * 365.25; running = false; if (runButton) { runButton.setAttribute('aria-pressed', 'false'); runButton.textContent = 'Let it run'; } }
        if (whenDial) whenDial.value = String(Math.round(offsetDays / 365.25));
        describeWhen();
      }
      latest = sky(Date.now() + offsetDays * 86400000);
      report(latest);
      draw(latest);
    }

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        var wide = size.w >= 900;
        centre.x = size.w * (wide ? 0.645 : 0.5); centre.y = size.h * (wide ? 0.52 : 0.5);
        R = wide ? Math.min(size.w * 0.3, size.h * 0.44) : Math.min(size.w * 0.46, size.h * 0.42);
      },
      frame: function (time, dt) { show(Math.min(dt, 0.1)); },
      // With motion paused: tonight, held
      still: function () { show(0); },
      where: function (ms) { return sky(ms === undefined ? Date.now() + offsetDays * 86400000 : ms); }
    };
  });
})();
