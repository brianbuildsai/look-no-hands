/* hand.js — the outline of a hand, for the rooms that draw one.

   It is not traced from anything. It is thirty-eight points placed by
   reasoning about where a palm, a thumb and four fingers go, joined by a
   smooth curve. Units are arbitrary (about 155 wide, 235 tall, y downward);
   callers scale it to fit. */
(function () {
  'use strict';

  var POINTS = [
    [71, 238], [67, 210], [52, 186], [35, 161], [19, 133], [10, 108], [17, 95], [31, 104], [45, 128], [59, 143],
    [62, 118], [60, 70], [60, 31], [69, 16], [79, 29], [80, 70], [82, 110],
    [87, 60], [88, 19], [97, 5], [107, 19], [108, 62], [108, 110],
    [115, 68], [119, 31], [127, 19], [135, 32], [133, 74], [131, 116],
    [141, 86], [148, 59], [156, 49], [163, 61], [158, 96], [153, 132],
    [153, 170], [148, 210], [144, 238]
  ];

  // A closed Catmull-Rom curve through the points, as `steps` samples per span.
  function outline(steps) {
    var n = POINTS.length, out = [];
    for (var i = 0; i < n; i++) {
      var p0 = POINTS[(i + n - 1) % n], p1 = POINTS[i], p2 = POINTS[(i + 1) % n], p3 = POINTS[(i + 2) % n];
      for (var s = 0; s < steps; s++) {
        var t = s / steps, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    return out;
  }

  // The outline scaled to fit inside a box `size` tall, centred on (0, 0).
  window.Gallery.hand = function (size, steps) {
    var scale = size / 238;
    return outline(steps || 12).map(function (p) { return [(p[0] - 86) * scale, (p[1] - 121) * scale]; });
  };
})();
