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

  /* ---- the Smith ----
     Broad and low: a great helm with a brass crest and one lit slit, a
     breastplate over a leather apron, a pauldron on the leading shoulder,
     gauntlets, greaves, a short hide cape and a tassel the colour of coals. */

  P.addSkin('smith', {
    parts: {
      head: ['....kRrk...', '..kkkkkkk..', '.knggggwwk.', 'kngggggggwk', 'knggggggggk', 'knggkkkkkkk', 'knggkFfFFfk', 'knggkkkkkkk', 'knggggggggk', 'knnggggggnk', '.knnggggnk.', '..kkkkkkk..'],
      torso: ['.kkkkkkkk.', 'kwggggggnk', 'kggwggggnk', 'kggggggnnk', 'kbbbbbbbbk', 'kBbBBBBbBk', 'kBbBrBBbBk', 'kBbBBBBbBk', 'kbBBBBBBbk', '.kkkkkkkk.'],
      over: ['.kkkk.', 'kwgggk', 'kggggk', 'kgnnnk', '.kkkk.'],
      cloak: ['..kkkkkk.', '.kBBBBBBk', '.kBbBBBBk', 'kBBBBbBBk', 'kBbBBBBBk', 'kBBBBBbBk', 'kbBBbBBBk', 'kBBBBBBbk', '.kbBBbBk.', '.kkkkkkk.'],
      arm: ['kkkk', 'kbBk', 'kbBk', 'kbBk', 'kggk', 'kgwk', 'kgnk', 'kkkk'],
      leg: ['kkkkk', 'kbBbk', 'kbBbk', 'kbBbk', 'kgggk', 'kgwgk', 'kgggk', 'kgnnk', 'kkkkk'],
      legBent: ['kkkkk', 'kbBbk', 'kbBbk', 'kgggk', 'kgwnk', 'kkkkk'],
      scarf: ['kfFfFk.', '.kffFfk', '..kkkk.'],
      scarfUp: ['....kfk', '..kfFfk', 'kfFfkk.', '.kkk...'],
      lantern: ['..kk..', '.krrk.', 'kfFFfk', 'kfFFfk', 'kffffk', 'knnnnk', '.knnk.', '..kk..']
    },
    at: { cloak: [8, 11], backLeg: [10, 21], backArm: [9, 13], lantern: [6, 20], torso: [10, 12], frontLeg: [15, 21], head: [9, 1], scarf: [7, 0], over: [15, 11], frontArm: [17, 13] },
    hand: { down: [1, 6], reach: [7, 1] }, palette: null
  });
  CLASSES.smith = {
    id: 'smith', name: 'The Smith', line: 'Slow, and not easily moved',
    hp: 8, energy: 3, run: 0.84, weapon: 'hammer', dash: 'charge', colour: '#ff8c42',
    traits: ['Eight hearts, a heavy step', 'The dash is a shoulder charge that wounds', 'Down and jump in the air: an anvil\'s drop', 'A blow breaks any creature\'s wind-up'],
    apply: function (m) { m.pound = true; m.breaker = true; }
  };
  ORDER.push('smith');

  /* [lamplighter] */

  /* [kite] */

  window.Classes = { CLASSES: CLASSES, ORDER: ORDER };
})();
