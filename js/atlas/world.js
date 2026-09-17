/* world.js — a planet from a word.

   The word is hashed to a 32-bit number, and that number seeds everything
   that follows, so the same word always gives the same world. Terrain is
   layered gradient noise sampled on the surface of a sphere (so there is no
   seam and no pinching at the poles), surveyed onto a 1024 × 512 grid of
   heights in metres. The grid is filled a few rows at a time so the page
   never locks up and the globe can show the survey arriving.

   No DOM in here: the same file is loaded by the page and tested in Node. */
(function (root) {
  'use strict';

  var WIDTH = 1024;
  var HEIGHT = 512;

  /* ---- numbers from words ------------------------------------------------ */

  function normaliseWord(word) {
    return String(word == null ? '' : word).trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 32);
  }

  // A 32-bit hash of a string (xmur3). Integer arithmetic only, so every
  // machine agrees on the answer.
  function hashString(text) {
    var h = 1779033703 ^ text.length;
    for (var i = 0; i < text.length; i++) {
      h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // A stream of random numbers in [0, 1) from a seed (mulberry32).
  function random(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Independent streams for independent jobs, so that changing how towns are
  // sited can never move a coastline.
  function fork(seed, label) {
    return random(hashString(seed + ':' + label));
  }

  /* ---- gradient noise ------------------------------------------------------ */

  // Three-dimensional simplex noise (after Ken Perlin and Stefan Gustavson):
  // smooth, random-looking values between −1 and 1 for any point in space.
  // The shuffled table is what makes one world's noise unlike another's.
  var GRADIENTS = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];

  function makeNoise(rand) {
    var table = new Uint8Array(256);
    var i, j, swap;
    for (i = 0; i < 256; i++) table[i] = i;
    for (i = 255; i > 0; i--) {
      j = Math.floor(rand() * (i + 1));
      swap = table[i]; table[i] = table[j]; table[j] = swap;
    }
    var perm = new Uint8Array(512);
    var perm12 = new Uint8Array(512);
    for (i = 0; i < 512; i++) { perm[i] = table[i & 255]; perm12[i] = perm[i] % 12; }

    var F = 1 / 3, G = 1 / 6;

    function corner(gi, x, y, z) {
      var t = 0.6 - x * x - y * y - z * z;
      if (t < 0) return 0;
      t *= t;
      return t * t * (GRADIENTS[gi] * x + GRADIENTS[gi + 1] * y + GRADIENTS[gi + 2] * z);
    }

    return function (x, y, z) {
      var s = (x + y + z) * F;
      var i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
      var t = (i + j + k) * G;
      var x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
      var i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else {
        if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
        else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
        else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      }
      var ii = i & 255, jj = j & 255, kk = k & 255;
      return 32 * (
        corner(perm12[ii + perm[jj + perm[kk]]] * 3, x0, y0, z0) +
        corner(perm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3, x0 - i1 + G, y0 - j1 + G, z0 - k1 + G) +
        corner(perm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3, x0 - i2 + 2 * G, y0 - j2 + 2 * G, z0 - k2 + 2 * G) +
        corner(perm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3, x0 - 1 + 0.5, y0 - 1 + 0.5, z0 - 1 + 0.5)
      );
    };
  }

  /* ---- terrain --------------------------------------------------------------- */

  // The character of one world: how much land, how large the continents,
  // how crumpled the coasts, how high and how deep. Then a function giving
  // the raw, unitless height of any point on the unit sphere.
  function makeTerrain(seedText) {
    var rand = fork(seedText, 'terrain');
    var noise = makeNoise(rand);
    var shape = {
      landShare: 0.27 + rand() * 0.16,
      continents: 0.85 + rand() * 0.45,
      warp: 0.25 + rand() * 0.3,
      belts: 1.4 + rand() * 0.9,
      ridges: 2.6 + rand() * 1.2,
      peak: Math.round(5200 + rand() * 3600),
      deepest: Math.round(7000 + rand() * 4000),
      radiusKm: Math.round((3800 + rand() * 3600) / 10) * 10
    };
    var ox = rand() * 64, oy = rand() * 64, oz = rand() * 64;

    // several octaves of noise, each twice as fine as the last and weaker by `fade`
    function layered(x, y, z, octaves, fade) {
      var sum = 0, strength = 0.5, total = 0;
      for (var o = 0; o < octaves; o++) {
        sum += strength * noise(x, y, z);
        total += strength;
        x *= 2.03; y *= 2.03; z *= 2.03;
        strength *= fade;
      }
      return sum / total;
    }

    // the same, folded so that the zero crossings become sharp ridge lines
    function ridged(x, y, z, octaves) {
      var sum = 0, strength = 0.5, total = 0, carry = 1;
      for (var o = 0; o < octaves; o++) {
        var n = 1 - Math.abs(noise(x, y, z));
        n *= n;
        sum += n * strength * carry;
        total += strength;
        carry = n;
        x *= 2.1; y *= 2.1; z *= 2.1;
        strength *= 0.5;
      }
      return sum / total;
    }

    function smoothstep(a, b, v) {
      var t = (v - a) / (b - a);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      return t * t * (3 - 2 * t);
    }

    function raw(px, py, pz) {
      var x = px + ox, y = py + oy, z = pz + oz;
      // bend space a little first, so coasts meander instead of looking like noise
      var w = shape.warp;
      var bx = x + w * noise(x * 0.9 + 17.1, y * 0.9, z * 0.9);
      var by = y + w * noise(x * 0.9, y * 0.9 + 31.7, z * 0.9);
      var bz = z + w * noise(x * 0.9, y * 0.9, z * 0.9 + 47.3);
      var c = shape.continents;
      var land = layered(bx * c, by * c, bz * c, 5, 0.43);   // coarse features dominate: continents, not confetti
      // mountain ranges run in belts, and mostly where there is land to carry them
      var b = shape.belts;
      var belt = smoothstep(0.5, 0.95, 1 - Math.abs(noise(bx * b + 11.3, by * b + 5.9, bz * b + 23.1)));
      var r = shape.ridges;
      var range = ridged(bx * r, by * r, bz * r, 4);
      var detail = layered(x * 7.5, y * 7.5, z * 7.5, 3, 0.5);
      return land + belt * range * 0.5 * smoothstep(-0.12, 0.2, land) + detail * 0.028;
    }

    return { shape: shape, raw: raw };
  }

  /* ---- the survey -------------------------------------------------------------- */

  var ENCODE_MIN = -12000;       // metres; heights are packed into 16 bits over this range
  var ENCODE_MAX = 12000;

  function clock() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  function create(word) {
    var clean = normaliseWord(word);
    var seed = hashString(clean);
    var seedText = String(seed);          // from here on only the number matters
    var terrain = makeTerrain(seedText);
    var shape = terrain.shape;
    var raw = terrain.raw;
    var RAD = Math.PI / 180;
    var x, y;

    // A quick coarse survey first, to find where sea level has to be for
    // this world to have its share of land, and the extremes to scale by.
    var samples = [];
    var lowest = Infinity, highest = -Infinity;
    for (y = 0; y < 96; y++) {
      var lat = (90 - (y + 0.5) / 96 * 180) * RAD;
      var ring = Math.cos(lat), up = Math.sin(lat);
      for (x = 0; x < 192; x++) {
        var lon = ((x + 0.5) / 192 * 360 - 180) * RAD;
        var e = raw(ring * Math.cos(lon), up, ring * Math.sin(lon));
        samples.push({ e: e, area: ring });
        if (e < lowest) lowest = e;
        if (e > highest) highest = e;
      }
    }
    samples.sort(function (a, b) { return b.e - a.e; });
    var totalArea = samples.reduce(function (sum, s) { return sum + s.area; }, 0);
    var sea = samples[samples.length - 1].e;
    for (var i = 0, area = 0; i < samples.length; i++) {
      area += samples[i].area;
      if (area >= totalArea * shape.landShare) { sea = samples[i].e; break; }
    }
    var top = sea + (highest - sea) * 1.04;
    var bottom = sea - (sea - lowest) * 1.04;

    // Broad lowlands and few high summits; shallow shelves and few deeps.
    function toMetres(e) {
      var t;
      if (e >= sea) {
        t = Math.min(1, (e - sea) / (top - sea));
        return shape.peak * (0.1 * t + 0.9 * Math.pow(t, 2.3));
      }
      t = Math.min(1, (sea - e) / (sea - bottom));
      return -shape.deepest * (0.05 * t + 0.95 * Math.pow(t, 1.6));
    }

    var cosLon = new Float64Array(WIDTH), sinLon = new Float64Array(WIDTH);
    for (x = 0; x < WIDTH; x++) {
      var a = ((x + 0.5) / WIDTH * 360 - 180) * RAD;
      cosLon[x] = Math.cos(a);
      sinLon[x] = Math.sin(a);
    }

    var world = {
      word: clean,
      seed: seed,
      seedText: seedText,
      shape: shape,
      width: WIDTH,
      height: HEIGHT,
      heights: new Float32Array(WIDTH * HEIGHT),   // metres above (or below) the sea
      bytes: new Uint8Array(WIDTH * HEIGHT * 4),   // the same, packed for the graphics card
      encodeMin: ENCODE_MIN,
      encodeMax: ENCODE_MAX,
      rowsDone: 0,
      done: false,
      stats: null
    };

    // Survey more rows, pole to pole, for up to `budget` milliseconds.
    // Returns how much of the world is done, 0…1.
    world.step = function (budget) {
      var started = clock();
      while (world.rowsDone < HEIGHT) {
        var row = world.rowsDone;
        var latitude = (90 - (row + 0.5) / HEIGHT * 180) * RAD;
        var ringR = Math.cos(latitude), upY = Math.sin(latitude);
        for (var col = 0; col < WIDTH; col++) {
          var metres = toMetres(raw(ringR * cosLon[col], upY, ringR * sinLon[col]));
          var at = row * WIDTH + col;
          world.heights[at] = metres;
          var packed = Math.round((metres - ENCODE_MIN) / (ENCODE_MAX - ENCODE_MIN) * 65535);
          packed = packed < 0 ? 0 : packed > 65535 ? 65535 : packed;
          world.bytes[at * 4] = packed >> 8;
          world.bytes[at * 4 + 1] = packed & 255;
          world.bytes[at * 4 + 2] = 255;         // marks the cell as surveyed
          world.bytes[at * 4 + 3] = 255;
        }
        world.rowsDone++;
        if (clock() - started >= budget) break;
      }
      if (world.rowsDone >= HEIGHT && !world.done) {
        world.done = true;
        world.stats = measure(world);
      }
      return world.rowsDone / HEIGHT;
    };

    // Height in metres at a latitude and longitude in degrees, blended
    // between the four nearest cells.
    world.heightAt = function (latDeg, lonDeg) {
      var gx = (lonDeg + 180) / 360 * WIDTH - 0.5;
      var gy = (90 - latDeg) / 180 * HEIGHT - 0.5;
      gy = gy < 0 ? 0 : gy > HEIGHT - 1 ? HEIGHT - 1 : gy;
      var x0 = Math.floor(gx), y0 = Math.floor(gy);
      var fx = gx - x0, fy = gy - y0;
      var xa = ((x0 % WIDTH) + WIDTH) % WIDTH, xb = (xa + 1) % WIDTH;
      var yb = Math.min(HEIGHT - 1, y0 + 1);
      var h = world.heights;
      return (h[y0 * WIDTH + xa] * (1 - fx) + h[y0 * WIDTH + xb] * fx) * (1 - fy) +
             (h[yb * WIDTH + xa] * (1 - fx) + h[yb * WIDTH + xb] * fx) * fy;
    };

    return world;
  }

  // The almanac's raw material, measured from the finished grid. Cells near
  // the poles cover less ground, so everything is weighted by cos(latitude).
  function measure(world) {
    var RAD = Math.PI / 180;
    var h = world.heights;
    var land = 0, all = 0, landHeight = 0, seaDepth = 0, coast = 0;
    var high = { metres: -Infinity, lat: 0, lon: 0 }, low = { metres: Infinity, lat: 0, lon: 0 };
    var cellNorth = Math.PI * world.shape.radiusKm / HEIGHT;       // km, north to south
    for (var y = 0; y < HEIGHT; y++) {
      var lat = 90 - (y + 0.5) / HEIGHT * 180;
      var weight = Math.cos(lat * RAD);
      var cellEast = 2 * Math.PI * world.shape.radiusKm * weight / WIDTH;
      for (var x = 0; x < WIDTH; x++) {
        var m = h[y * WIDTH + x];
        all += weight;
        if (m >= 0) { land += weight; landHeight += m * weight; } else { seaDepth -= m * weight; }
        if (m > high.metres) { high.metres = m; high.lat = lat; high.lon = (x + 0.5) / WIDTH * 360 - 180; }
        if (m < low.metres) { low.metres = m; low.lat = lat; low.lon = (x + 0.5) / WIDTH * 360 - 180; }
        // a coast wherever a land cell meets a sea cell
        var east = h[y * WIDTH + (x + 1) % WIDTH];
        if ((m >= 0) !== (east >= 0)) coast += cellNorth;
        if (y + 1 < HEIGHT && (m >= 0) !== (h[(y + 1) * WIDTH + x] >= 0)) coast += cellEast;
      }
    }
    return {
      landShare: land / all,
      meanLandHeight: land ? landHeight / land : 0,
      meanSeaDepth: all > land ? seaDepth / (all - land) : 0,
      highest: high,
      deepest: low,
      coastKm: coast,
      surfaceKm2: 4 * Math.PI * world.shape.radiusKm * world.shape.radiusKm
    };
  }

  var api = {
    WIDTH: WIDTH,
    HEIGHT: HEIGHT,
    normaliseWord: normaliseWord,
    hashString: hashString,
    random: random,
    fork: fork,
    create: create
  };

  root.Atlas = root.Atlas || {};
  root.Atlas.world = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
