/* steady.js: the arithmetic two different browsers agree on.

   When two play, both machines compute the whole game and compare notes
   (net.js), so every number has to come out the same on both, to the last
   bit. Adding, multiplying, dividing, square roots, rounding: those are fixed
   by the standard and every engine gets them alike. Sines are not. Each
   engine has its own sin, cos, atan2 and pow (Chrome's, Firefox's and
   Safari's differ in the last place now and then), and one last place is
   enough: the two games drift, the hashes differ, and both players are put
   back at the head of the stage, over and over. That was the third real
   failure of playing together, between a Chrome and another browser.

   So the game uses these instead, built only from the operations that are
   fixed. They are good to about fourteen places, which is more than a
   platformer needs, and they are the same fourteen places everywhere.

   The other thing engines do differently is sort: never shuffle by sorting
   with a comparator that answers at random (the engines ask it different
   questions in a different order). shuffle() here does it properly.

   tools/lockstep.html checks: it reads the game's sources for Math.sin and
   its like, and its last line ("across browsers") must be the same in every
   browser it is run in. */
(function () {
  'use strict';

  var PI = 3.141592653589793, TAU = 6.283185307179586, HALF = 1.5707963267948966, QUARTER = 0.7853981633974483, LN2 = 0.6931471805599453;
  // 1/3!, 1/5! ... for the sine; 1/2!, 1/4! ... for the cosine: divisions, so the same everywhere
  var S = [1 / 6, 1 / 120, 1 / 5040, 1 / 362880, 1 / 39916800, 1 / 6227020800, 1 / 1307674368000, 1 / 355687428096000, 1 / 121645100408832000, 1 / 51090942171709440000];
  var C = [1 / 2, 1 / 24, 1 / 720, 1 / 40320, 1 / 3628800, 1 / 479001600, 1 / 87178291200, 1 / 20922789888000, 1 / 6402373705728000, 1 / 2432902008176640000];

  function finite(x) { return x === x && x !== Infinity && x !== -Infinity; }
  // on [-pi/2, pi/2]
  function sinSmall(x) { var s = x * x; return x * (1 - s * (S[0] - s * (S[1] - s * (S[2] - s * (S[3] - s * (S[4] - s * (S[5] - s * (S[6] - s * (S[7] - s * (S[8] - s * S[9])))))))))); }
  function cosSmall(x) { var s = x * x; return 1 - s * (C[0] - s * (C[1] - s * (C[2] - s * (C[3] - s * (C[4] - s * (C[5] - s * (C[6] - s * (C[7] - s * (C[8] - s * C[9]))))))))); }
  function wrap(x) { return x - TAU * Math.round(x / TAU); }   // into [-pi, pi]

  function sin(x) {
    if (!finite(x)) return NaN;
    x = wrap(x);
    if (x > HALF) x = PI - x; else if (x < -HALF) x = -PI - x;
    return sinSmall(x);
  }
  function cos(x) {
    if (!finite(x)) return NaN;
    x = wrap(x); if (x < 0) x = -x;
    return x > HALF ? -cosSmall(PI - x) : cosSmall(x);
  }
  // for |w| <= tan(pi/8)
  function atanSmall(w) { var s = w * w, sum = 0; for (var n = 27; n >= 1; n -= 2) sum = 1 / n - s * sum; return w * sum; }
  function atan01(z) { return z > 0.4142135623730951 ? QUARTER + atanSmall((z - 1) / (z + 1)) : atanSmall(z); }   // 0 <= z <= 1
  function atan2(y, x) {
    if (!(y === y) || !(x === x)) return NaN;
    var ax = x < 0 ? -x : x, ay = y < 0 ? -y : y, a;
    if (ax === 0 && ay === 0) return 0;
    if (ax === Infinity && ay === Infinity) a = QUARTER;
    else a = ay > ax ? HALF - atan01(ax / ay) : atan01(ay / ax);
    if (x < 0) a = PI - a;
    return y < 0 ? -a : a;
  }
  function atan(x) { return atan2(x, 1); }

  // natural logarithm and exponential, for pow: halve or double into [0.75, 1.5), then a quick series
  function log(x) {
    if (!(x > 0)) return x === 0 ? -Infinity : NaN;
    if (x === Infinity) return Infinity;
    var e = 0; while (x >= 1.5) { x /= 2; e++; } while (x < 0.75) { x *= 2; e--; }
    var z = (x - 1) / (x + 1), s = z * z, sum = 0;
    for (var n = 25; n >= 1; n -= 2) sum = 1 / n + s * sum;
    return 2 * z * sum + e * LN2;
  }
  function exp(x) {
    if (!(x === x)) return NaN;
    if (x > 709) return Infinity; if (x < -745) return 0;
    var k = Math.round(x / LN2), r = x - k * LN2, term = 1, sum = 1, n;
    for (n = 1; n <= 16; n++) { term = term * r / n; sum += term; }
    for (; k > 0; k--) sum *= 2; for (; k < 0; k++) sum /= 2;
    return sum;
  }
  function pow(b, e) {
    if (e === 0) return 1;
    if (e === 1) return b;
    if (e === 2) return b * b;
    if (e === 0.5) return Math.sqrt(b);
    if (b === 0) return e > 0 ? 0 : Infinity;
    if (b < 0) { if (e !== Math.floor(e)) return NaN; var p = exp(e * log(-b)); return e % 2 === 0 ? p : -p; }
    return exp(e * log(b));
  }
  // every order equally likely, and the same order everywhere for the same `random`
  function shuffle(list, random) { for (var k = list.length - 1; k > 0; k--) { var j = Math.floor(random() * (k + 1)), t = list[k]; list[k] = list[j]; list[j] = t; } return list; }

  window.UndercroftSteady = { sin: sin, cos: cos, tan: function (x) { return sin(x) / cos(x); }, atan: atan, atan2: atan2, log: log, exp: exp, pow: pow, shuffle: shuffle, PI: PI };
})();
