/* places.js — what is on the chart, and where.

   Reads a finished survey and decides where things would plausibly be:
   the large landmasses, towns on coasts and lowlands in liveable latitudes,
   seas in open deep water and gulfs where land closes round, summits on
   the highest ground. Each gets a name from the world's language and a
   line or two for the gazetteer.

   No DOM in here: loaded by the page and tested in Node. */
(function (root) {
  'use strict';

  var worldApi = root.Atlas && root.Atlas.world ? root.Atlas.world
    : (typeof require === 'function' ? require('./world.js') : null);

  var RAD = Math.PI / 180;

  /* ---- geometry on a sphere ---- */

  // Angle between two places, in degrees of arc.
  function apart(a, b) {
    var s = Math.sin(a.lat * RAD) * Math.sin(b.lat * RAD) +
            Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((a.lon - b.lon) * RAD);
    return Math.acos(Math.max(-1, Math.min(1, s))) / RAD;
  }

  // Where you arrive travelling `arc` degrees from a place on a bearing.
  function travel(place, bearingDeg, arc) {
    var lat = place.lat * RAD, lon = place.lon * RAD, b = bearingDeg * RAD, d = arc * RAD;
    var lat2 = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(b));
    var lon2 = lon + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(lat2));
    return { lat: lat2 / RAD, lon: ((lon2 / RAD + 540) % 360) - 180 };
  }

  // A place chosen evenly over the whole sphere (not bunched at the poles).
  function anywhere(rand) {
    return { lat: Math.asin(2 * rand() - 1) / RAD, lon: rand() * 360 - 180 };
  }

  // Of eight directions, in how many does sea (or land) lie within `arc` degrees?
  function around(world, place, arc, wantSea) {
    var count = 0;
    for (var k = 0; k < 8; k++) {
      var there = travel(place, k * 45, arc);
      if ((world.heightAt(there.lat, there.lon) < 0) === wantSea) count++;
    }
    return count;
  }

  function farEnough(place, others, minimum) {
    for (var i = 0; i < others.length; i++) if (apart(place, others[i]) < minimum) return false;
    return true;
  }

  /* ---- landmasses ---- */

  // Flood-fill a coarse copy of the survey to find each separate body of
  // land, how much of the sphere it covers, and a point safely inside it.
  function findLands(world) {
    var W = 256, H = 128;
    var sx = world.width / W, sy = world.height / H;
    var land = new Uint8Array(W * H);
    var owner = new Int32Array(W * H).fill(-1);
    var x, y, sphere = 0;
    for (y = 0; y < H; y++) {
      var weight = Math.cos((90 - (y + 0.5) / H * 180) * RAD);
      for (x = 0; x < W; x++) {
        sphere += weight;
        land[y * W + x] = world.heights[Math.floor((y + 0.5) * sy) * world.width + Math.floor((x + 0.5) * sx)] >= 0 ? 1 : 0;
      }
    }

    var bodies = [];
    for (var start = 0; start < W * H; start++) {
      if (!land[start] || owner[start] >= 0) continue;
      var id = bodies.length;
      var body = { id: id, area: 0, vx: 0, vy: 0, vz: 0, cells: [] };
      var stack = [start];
      owner[start] = id;
      while (stack.length) {
        var cell = stack.pop();
        var cx = cell % W, cy = (cell / W) | 0;
        var lat = (90 - (cy + 0.5) / H * 180) * RAD, lon = ((cx + 0.5) / W * 360 - 180) * RAD;
        var w = Math.cos(lat);
        body.area += w;
        body.vx += w * Math.cos(lat) * Math.cos(lon);
        body.vy += w * Math.sin(lat);
        body.vz += w * Math.cos(lat) * Math.sin(lon);
        body.cells.push(cell);
        var next = [cy * W + (cx + 1) % W, cy * W + (cx + W - 1) % W];
        if (cy > 0) next.push((cy - 1) * W + cx);
        if (cy < H - 1) next.push((cy + 1) * W + cx);
        for (var n = 0; n < next.length; n++) {
          if (land[next[n]] && owner[next[n]] < 0) { owner[next[n]] = id; stack.push(next[n]); }
        }
      }
      bodies.push(body);
    }

    bodies.forEach(function (body) {
      body.share = body.area / sphere;
      var length = Math.sqrt(body.vx * body.vx + body.vy * body.vy + body.vz * body.vz) || 1;
      var ux = body.vx / length, uy = body.vy / length, uz = body.vz / length;
      // The centre of a crescent is in the sea; use the land cell nearest to it.
      var best = -2, bestCell = body.cells[0];
      for (var i = 0; i < body.cells.length; i++) {
        var cx = body.cells[i] % W, cy = (body.cells[i] / W) | 0;
        var lat = (90 - (cy + 0.5) / H * 180) * RAD, lon = ((cx + 0.5) / W * 360 - 180) * RAD;
        var dot = ux * Math.cos(lat) * Math.cos(lon) + uy * Math.sin(lat) + uz * Math.cos(lat) * Math.sin(lon);
        // (and only a cell whose centre really is dry on the fine survey)
        if (dot > best && world.heightAt(lat / RAD, lon / RAD) > 0) { best = dot; bestCell = body.cells[i]; }
      }
      body.lat = 90 - (((bestCell / W) | 0) + 0.5) / H * 180;
      body.lon = ((bestCell % W) + 0.5) / W * 360 - 180;
      delete body.cells;
    });

    return {
      bodies: bodies,
      // which body of land a place stands on, or -1 for the sea
      at: function (lat, lon) {
        var gx = Math.floor(((lon + 180) / 360) * W) % W;
        var gy = Math.max(0, Math.min(H - 1, Math.floor((90 - lat) / 180 * H)));
        return owner[gy * W + (gx + W) % W];
      }
    };
  }

  /* ---- choosing sites ---- */

  function siteTowns(world, rand, count) {
    var candidates = [];
    for (var i = 0; i < 900; i++) {
      var p = anywhere(rand);
      var h = world.heightAt(p.lat, p.lon);
      if (h < 3 || h > 2400) continue;
      var coastal = h < 350 && around(world, p, 0.5, true) > 0;      // the sea within about fifty kilometres
      var score = rand() * 0.75 + (coastal ? 0.33 : 0) + (h < 400 ? 0.25 : 0) + (Math.abs(p.lat) < 52 ? 0.22 : 0);
      if (Math.abs(p.lat) > 64) score *= 0.3;
      candidates.push({ lat: p.lat, lon: p.lon, metres: h, coastal: coastal, score: score });
    }
    candidates.sort(function (a, b) { return b.score - a.score; });
    var towns = [];
    for (var c = 0; c < candidates.length && towns.length < count; c++) {
      if (farEnough(candidates[c], towns, 8)) towns.push(candidates[c]);
    }
    return towns;
  }

  function siteWaters(world, rand) {
    var open = [], closed = [], i, p, depth;
    for (i = 0; i < 700; i++) {
      p = anywhere(rand);
      depth = -world.heightAt(p.lat, p.lon);
      if (depth < 2500 || Math.abs(p.lat) > 70) continue;
      if (around(world, p, 7, true) < 8 || around(world, p, 14, true) < 7) continue;
      open.push({ lat: p.lat, lon: p.lon, metres: -depth, score: depth / 10000 + rand() * 0.5 });
    }
    for (i = 0; i < 1200; i++) {
      p = anywhere(rand);
      depth = -world.heightAt(p.lat, p.lon);
      if (depth < 20 || depth > 2200 || Math.abs(p.lat) > 72) continue;
      var hemmed = around(world, p, 4.5, false);
      if (hemmed < 4 || around(world, p, 1, true) < 7) continue;
      // land on two opposite sides and water on the other two makes a strait
      var ns = world.heightAt(travel(p, 0, 4.5).lat, travel(p, 0, 4.5).lon) >= 0 && world.heightAt(travel(p, 180, 4.5).lat, travel(p, 180, 4.5).lon) >= 0;
      var ew = world.heightAt(travel(p, 90, 4.5).lat, travel(p, 90, 4.5).lon) >= 0 && world.heightAt(travel(p, 270, 4.5).lat, travel(p, 270, 4.5).lon) >= 0;
      closed.push({ lat: p.lat, lon: p.lon, metres: -depth, hemmed: hemmed, strait: ns !== ew && hemmed <= 5, score: hemmed / 8 + rand() * 0.4 });
    }
    open.sort(function (a, b) { return b.score - a.score; });
    closed.sort(function (a, b) { return b.score - a.score; });
    var oceans = [], gulfs = [];
    for (i = 0; i < open.length && oceans.length < 5; i++) if (farEnough(open[i], oceans, 30)) oceans.push(open[i]);
    for (i = 0; i < closed.length && gulfs.length < 6; i++) {
      if (farEnough(closed[i], gulfs, 13) && farEnough(closed[i], oceans, 9)) gulfs.push(closed[i]);
    }
    return { oceans: oceans, gulfs: gulfs };
  }

  // Summits: the highest point of each block of the survey that stands
  // above all the blocks around it.
  function sitePeaks(world, count) {
    var B = 8, W = world.width / B, H = world.height / B;
    var top = new Float32Array(W * H), where = new Int32Array(W * H);
    var x, y;
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        var best = -Infinity, at = 0;
        for (var j = 0; j < B; j++) {
          for (var i = 0; i < B; i++) {
            var index = (y * B + j) * world.width + x * B + i;
            if (world.heights[index] > best) { best = world.heights[index]; at = index; }
          }
        }
        top[y * W + x] = best;
        where[y * W + x] = at;
      }
    }
    var summits = [];
    for (y = 2; y < H - 2; y++) {
      for (x = 0; x < W; x++) {
        var h = top[y * W + x];
        if (h < 2000) continue;
        var highest = true;
        for (var dy = -1; dy <= 1 && highest; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            if ((dx || dy) && top[(y + dy) * W + (x + dx + W) % W] > h) { highest = false; break; }
          }
        }
        if (!highest) continue;
        var cell = where[y * W + x];
        summits.push({
          lat: 90 - (((cell / world.width) | 0) + 0.5) / world.height * 180,
          lon: ((cell % world.width) + 0.5) / world.width * 360 - 180,
          metres: h
        });
      }
    }
    summits.sort(function (a, b) { return b.metres - a.metres; });
    var peaks = [];
    for (var s = 0; s < summits.length && peaks.length < count; s++) {
      if (farEnough(summits[s], peaks, 9)) peaks.push(summits[s]);
    }
    return peaks;
  }

  /* ---- a line or two about each ---- */

  var GOODS = {
    port: ['salt', 'rope', 'dried fish', 'charts', 'sailcloth', 'pearls', 'tar', 'whale oil'],
    hot: ['pepper', 'sugar', 'hardwood', 'indigo', 'coffee', 'cotton', 'vanilla', 'lacquer'],
    mild: ['wool', 'wine', 'glass', 'clocks', 'paper', 'cheese', 'linen', 'cider', 'bells'],
    cold: ['furs', 'amber', 'smoked fish', 'iron', 'timber', 'salted butter', 'whetstones'],
    high: ['silver', 'tea', 'cut stone', 'felt', 'copper', 'honey', 'mountain salt']
  };
  var CLAIMS = [
    'a bell that is rung for fog', 'seven bridges, of which two are trusted', 'a library older than its walls',
    'a market held on the ice in winter', 'an argument about the calendar that has lasted a century',
    'a clock that has never agreed with the sun', 'the longest staircase on the coast', 'its blue roofs',
    'a lighthouse that was moved inland, stone by stone', 'a festival at which nobody may speak',
    'bread stamped with the baker\'s initials', 'a harbour chain as thick as a mast', 'kites flown at funerals',
    'a wall built to keep out a neighbour who never came', 'an orchard planted in the shape of a map',
    'soup served at every public meeting', 'a school of navigation with no windows facing the sea',
    'a tower leaning the opposite way to the wind', 'streets named after weather', 'the echo in its main square',
    'a ferry that runs whether or not anyone boards', 'its habit of painting doors the colour of the owner\'s trade'
  ];
  var SEA_NOTES = [
    'Fog most mornings.', 'Charts of it disagree.', 'Crossed in nine days with a fair wind.', 'Calm in summer, and only then.',
    'Its currents run against the wind.', 'Whales winter here.', 'Pilots are taken on at both ends.', 'Known for a long, slow swell.',
    'Sounded once, and not everywhere.', 'Ice reaches it in hard years.', 'The old routes keep to its northern edge.'
  ];
  var PEAK_NOTES = [
    'Snow lies all year above the second shoulder.', 'Its north face has not been climbed.', 'Visible from the sea on a clear day.',
    'First climbed by a survey party that was looking for something else.', 'Cloud sits on it nine days in ten.',
    'The pass below it closes in the first week of winter.', 'Shepherds use its shadow to tell the hour.',
    'Two countries print it on their money.', 'Its height was argued over for forty years.'
  ];

  function positionText(lat, lon) {
    function part(value, positive, negative) {
      var v = Math.abs(value), d = Math.floor(v), m = Math.round((v - d) * 60);
      if (m === 60) { d++; m = 0; }
      return d + '°' + (m < 10 ? '0' : '') + m + '′' + (value >= 0 ? positive : negative);
    }
    return part(lat, 'N', 'S') + ' ' + part(lon, 'E', 'W');
  }

  function roundNicely(n) {
    var digits = Math.pow(10, Math.max(0, Math.floor(Math.log(n) / Math.LN10) - 1));
    return Math.round(n / digits) * digits;
  }

  function count(n) { return Math.round(n).toLocaleString('en-US'); }

  /* ---- putting the chart's contents together ---- */

  function find(world, tongue) {
    var rand = worldApi.fork(world.seedText, 'places');
    function pick(list) { return list[Math.floor(rand() * list.length)]; }
    function two(list) {
      var a = pick(list), b = pick(list);
      for (var t = 0; t < 8 && b === a; t++) b = pick(list);
      return [a, b];
    }

    var name = tongue.world();
    var lands = findLands(world);
    var places = [];

    // lands: the few bodies large enough to deserve a name on a globe
    var named = lands.bodies.filter(function (b) { return b.share > 0.004; })
      .sort(function (a, b) { return b.share - a.share; }).slice(0, 6);
    named.forEach(function (body, i) {
      body.place = {
        kind: 'land', name: tongue.place(), lat: body.lat, lon: body.lon,
        metres: world.heightAt(body.lat, body.lon),
        kindText: body.share > 0.05 ? 'Continent' : body.share > 0.012 ? 'Land' : 'Island',
        areaKm2: roundNicely(body.share * world.stats.surfaceKm2),
        priority: 100 - i, towns: []
      };
      places.push(body.place);
    });

    // towns
    var sites = siteTowns(world, rand, 26);
    var capitalPeople = 900000 + rand() * 3600000;
    sites.forEach(function (site, i) {
      var people = roundNicely(capitalPeople / Math.pow(i + 1, 1.45) * (0.65 + rand() * 0.7));
      var cold = Math.abs(site.lat) > 52, hot = Math.abs(site.lat) < 24, high = site.metres > 1100;
      var kindText = i === 0 ? 'Capital' : people > 300000 ? 'City' : site.coastal && people > 45000 ? 'Port' : people > 25000 ? 'Town' : 'Village';
      var goods = two(high ? GOODS.high : site.coastal && rand() < 0.5 ? GOODS.port : cold ? GOODS.cold : hot ? GOODS.hot : GOODS.mild);
      var setting = high ? 'in the high country' : site.coastal ? 'on the coast' : site.metres < 250 ? 'on the plain' : 'in the uplands';
      var town = {
        kind: 'town', name: tongue.town(site.coastal), lat: site.lat, lon: site.lon, metres: site.metres,
        kindText: kindText, people: people, capital: i === 0,
        priority: i === 0 ? 95 : 70 - i * 1.5,
        text: kindText + ' ' + setting + '. ' +
          pick(['It trades in ' + goods[0] + ' and ' + goods[1] + '.', capitalise(goods[0]) + ' and ' + goods[1] + ' leave from here.', 'Most of its money is in ' + goods[0] + '; the rest is in ' + goods[1] + '.']) + ' ' +
          pick(['Known for ', 'Visitors are shown ', 'People here will tell you about ']) + pick(CLAIMS) + '.'
      };
      var body = named.filter(function (b) { return b.id === lands.at(site.lat, site.lon); })[0];
      if (body) { town.land = body.place.name; body.place.towns.push(town.name); }
      places.push(town);
    });

    // waters
    var waters = siteWaters(world, rand);
    waters.oceans.forEach(function (site, i) {
      var word = tongue.place();
      var deep = -site.metres > world.shape.deepest * 0.72;
      places.push({
        kind: 'water', name: i < 2 ? word + ' Ocean' : deep ? word + ' Deep' : pick(['Sea of ' + word, word + ' Sea']),
        lat: site.lat, lon: site.lon, metres: site.metres, kindText: i < 2 ? 'Ocean' : deep ? 'Ocean deep' : 'Sea',
        priority: 88 - i * 4,
        text: 'Open water, ' + count(-site.metres) + ' m deep where the name is written. ' + pick(SEA_NOTES)
      });
    });
    waters.gulfs.forEach(function (site, i) {
      var word = tongue.place();
      places.push({
        kind: 'water', name: site.strait ? word + ' Strait' : site.hemmed >= 6 ? pick(['Gulf of ' + word, 'Bay of ' + word]) : pick([word + ' Sound', 'Gulf of ' + word]),
        lat: site.lat, lon: site.lon, metres: site.metres, kindText: site.strait ? 'Strait' : site.hemmed >= 6 ? 'Gulf' : 'Sound',
        priority: 52 - i * 2,
        text: (site.strait ? 'A passage between two shores, ' : 'Sheltered water with land on most sides, ') + count(-site.metres) + ' m deep here. ' + pick(SEA_NOTES)
      });
    });

    // summits
    sitePeaks(world, 9).forEach(function (site, i) {
      places.push({
        kind: 'peak', name: 'Mount ' + tongue.place(), lat: site.lat, lon: site.lon, metres: site.metres,
        kindText: i === 0 ? 'Highest summit' : 'Summit', priority: 78 - i * 3,
        text: (i === 0 ? 'The highest ground in ' + name + '. ' : '') + pick(PEAK_NOTES)
      });
    });

    places.forEach(function (place, i) {
      place.id = i;
      place.position = positionText(place.lat, place.lon);
      if (place.kind === 'land') {
        var n = place.towns.length;
        place.text = place.kindText + ' of about ' + count(place.areaKm2) + ' km². ' +
          (n ? (n === 1 ? 'One town' : n + ' towns') + ' on this chart stand on it, among them ' + place.towns[0] + '.' : 'No town on this chart stands on it.');
      }
    });

    return { name: name, places: places };
  }

  function capitalise(text) { return text.charAt(0).toUpperCase() + text.slice(1); }

  var api = { find: find, apart: apart, travel: travel };
  root.Atlas = root.Atlas || {};
  root.Atlas.places = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
