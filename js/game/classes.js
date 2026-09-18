/* classes.js: the four who go down.

   They share one skeleton (pixels.js), so each can carry every weapon and
   every weapon's frames are built for whoever holds it. What differs is the
   drawing, the numbers, the first weapon, and what a dash and a jump are.

   The Warden is the all-rounder. The Smith is slow and heavy: a shoulder
   charge for a dash, an anvil's drop from the air, blows that break a
   wind-up. The Lamplighter fights from a distance with the lantern on its
   pole, floats on her coat, and leaves a flare where she stood. The Kite is
   for getting about: he blinks rather than dashes, jumps three times, holds
   and leaves walls, and turns over in the air.

   A class is numbers and switches the engine reads; a skin is parts and
   where they hang, which pixels.js composes into every frame. */
(function () {
  'use strict';
  var P = window.Pixels;
  if (!P) return;

  var CLASSES = {
    warden: {
      id: 'warden', name: 'The Warden', line: 'A sword, a lantern, and no particular weakness',
      hp: 6, energy: 3, run: 1, weapon: 'shortsword', dash: 'roll', colour: '#6b84ff',
      traits: ['A dash nothing can hurt', 'Three strokes, the last a thrust'],
      apply: function (m) {}
    }
  };
  var ORDER = ['warden'];

  /* [smith] */

  /* [lamplighter] */

  /* [kite] */

  window.Classes = { CLASSES: CLASSES, ORDER: ORDER };
})();
