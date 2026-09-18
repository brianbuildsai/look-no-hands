/* actors.js: what lives in the undercroft, and how it behaves.

   Ten creatures, two to an element. Each is struck in its hurt boxes and
   strikes only with the boxes of its attacks; touching one is harmless, so
   every wound is one that could have been read. An attack is a wind-up that
   tells, a few active steps, and a recovery in which the creature is open.
   Arenas get elders, larger, tougher, and not to be staggered. Each creature
   carries its element's touch: ember burns, frost chills, storm shocks,
   bloom poisons, the void drains the lantern.

   The behaviours are written against a small set of engine helpers handed
   in by undercroft.js (moving bodies, tiles, sparks, lights, projectiles),
   so the creatures know nothing of the canvas. */
(function () {
  'use strict';

  /* ---- the palettes ----
     One per element: p the body, q its shadow, l its light, e the eye, w its
     white heat, k the outline. The same letters in every creature, so each
     element's pair share a colour and nothing else. */

  var PALETTES = {
    ember: { k: '#1a0806', p: '#c9401f', q: '#7a2412', l: '#ffb347', e: '#ffdc9a', w: '#ffdc9a' },
    frost: { k: '#0a1220', p: '#7fb4d8', q: '#3f6f94', l: '#e6f6ff', e: '#ffffff', w: '#d8f1ff' },
    storm: { k: '#0e0a1c', p: '#6b5aa8', q: '#3a2f6a', l: '#c9b8ff', e: '#ffffff', w: '#8fa3ff' },
    bloom: { k: '#06120a', p: '#4e9a52', q: '#2c5e31', l: '#c5ff9a', e: '#f0ffd8', w: '#9ae66e' },
    void:  { k: '#000000', p: '#1e1a2c', q: '#0d0b14', l: '#5b3fa0', e: '#ffffff', w: '#a48cff' },
    tide:  { k: '#03100f', p: '#2f8f86', q: '#1a5550', l: '#9ff5e6', e: '#ffffff', w: '#d6fff8' },
    gear:  { k: '#140d04', p: '#b08a3c', q: '#6e5220', l: '#efd27a', e: '#fff3b0', w: '#ffdc9a' },
    glass: { k: '#140a12', p: '#d88ab4', q: '#8a4f72', l: '#ffe8f4', e: '#ffffff', w: '#ffd0e6' }
  };

  /* ---- the kinds ----
     A kind says what a creature is made of: its element, the box that stops
     at walls (body), the box it can be struck in (hurt), its life, how it
     gets about, and its attacks, each with a range it begins from, a wind-up,
     active steps, a recovery, and the boxes or missiles it strikes with. */

  function aim(e, ctx, speed) { var hero = ctx.hero, dx = hero.x - e.x, dy = hero.y - 11 - e.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy)); return { vx: dx / len * speed, vy: dy / len * speed, len: len }; }

  var KINDS = {};
  var BY_ELEMENT = {};

  /* ---- rigs ----
     A creature is drawn from parts placed by poses, as the Warden is: one set
     of parts gives every frame, so it stays the same creature while it walks,
     winds up and strikes. A frame is a list of [part, x, y, options]. */

  function paletteOf(element) {
    var pal = {}, base = window.Pixels.PALETTE, over = PALETTES[element], key;
    for (key in base) pal[key] = base[key];
    for (key in over) pal[key] = over[key];
    return pal;
  }
  function rig(element, parts, w, h, anchor, anims) {
    var pal = paletteOf(element), A = window.Pixels.art, C = window.Pixels.compose, imgs = {}, frames = {};
    Object.keys(parts).forEach(function (n) { imgs[n] = A(parts[n], pal); });
    Object.keys(anims).forEach(function (anim) {
      frames[anim] = anims[anim].map(function (layers) {
        return C(w, h, layers.filter(Boolean).map(function (L) { return { img: imgs[L[0]], x: L[1], y: L[2], flip: L[3] && L[3].flip, rot: L[3] && L[3].rot }; }));
      });
    });
    return { frames: frames, anchor: anchor };
  }

  /* The Bellows Imp: a squat kiln imp with a bellows strapped to its back. It swells the bellows, then breathes. */
  function impRig() {
    var P = {
      head: ['.k.......k.', 'kqk.....kqk', 'kqkkkkkkkqk', '.kpppppppk.', 'kppeppepplk', 'kpppppppllk', 'kppkkkkpppk', '.kpppppppk.', '..kkkkkkk..'],
      headOpen: ['.k.......k.', 'kqk.....kqk', 'kqkkkkkkkqk', '.kpppppppk.', 'kppeppepplk', 'kppppkkkkkk', 'kppkwwwwwlk', '.kpkkkkkkk.', '..kkk......'],
      body: ['.kkkkkkk.', 'kpppppppk', 'kppplllpk', 'kpppllllk', 'kqppllllk', 'kqppplllk', '.kqppppk.', '..kkkkk..'],
      bellows: ['..kkkk..', '.krRRrk.', 'kbBbBbBk', 'kBbBbBbk', 'kbBbBbBk', 'kBbBbBbk', 'kbBbBbBk', '.krrrrk.', '..kkkk..'],
      bellowsBig: ['...kkkk...', '..krRRrk..', '.kbBbBbBk.', 'kBbBbBbBbk', 'kbBbBbBbBk', 'kBbBbBbBbk', 'kbBbBbBbBk', 'kBbBbBbBbk', '.kbBbBbBk.', '..krrrrk..', '...kkkk...'],
      bellowsFlat: ['..kkkk..', '.krRRrk.', 'kbBbBbBk', 'kBbBbBbk', '.krrrrk.', '..kkkk..'],
      leg: ['kqk.', 'kqk.', 'kqk.', 'kppk', 'kkkk'],
      arm: ['kpk', 'kpk', 'kpk', 'klk', 'kkk'],
      armUp: ['kkk', 'klk', 'kpk', 'kpk', 'kpk']
    };
    var walk = [], k;
    for (k = 0; k < 4; k++) {
      var bob = k % 2 ? -1 : 0, a = [1, 0, -1, 0][k], lift = [0, 1, 0, 0][k], lift2 = [0, 0, 0, 1][k];
      walk.push([['bellows', 5, 12 + bob], ['leg', 12 - a, 25 - lift2], ['body', 11, 17 + bob], ['leg', 18 + a, 25 - lift], ['head', 13, 8 + bob], ['arm', 19, 18 + bob + (k === 1 ? -1 : 0)]]);
    }
    return rig('ember', P, 34, 30, { x: 17, y: 30 }, {
      walk: walk,
      windup: [
        [['bellowsBig', 3, 11], ['leg', 12, 25], ['body', 11, 17], ['leg', 18, 25], ['head', 12, 7], ['armUp', 19, 15]],
        [['bellowsBig', 3, 10], ['leg', 11, 25], ['body', 11, 16], ['leg', 19, 25], ['head', 11, 6], ['armUp', 19, 14]]
      ],
      attack: [
        [['bellows', 5, 12], ['leg', 11, 25], ['body', 12, 17], ['leg', 19, 25], ['headOpen', 15, 9], ['arm', 20, 18]],
        [['bellowsFlat', 6, 15], ['leg', 11, 25], ['body', 12, 17], ['leg', 19, 25], ['headOpen', 16, 9], ['arm', 20, 18]],
        [['bellowsFlat', 6, 16], ['leg', 11, 25], ['body', 12, 18], ['leg', 19, 25], ['headOpen', 16, 10], ['arm', 20, 19]]
      ],
      hurt: [[['bellows', 4, 13], ['leg', 13, 25], ['body', 10, 17], ['leg', 17, 25], ['head', 10, 7], ['armUp', 18, 15]]]
    });
  }

  /* The Coal Lantern: a cracked iron lantern with a face in its flame, afloat, a chain and a lump of coal hanging under it. */
  function lanternRig() {
    var P = {
      ring: ['.rrr.', 'r...r', 'r...r', '.rrr.'],
      lid: ['...kkkkk...', '..knnnnnk..', '.knNNNNNnk.'],
      cage: ['kkkkkkkkkkk', 'knlllllllnk', 'knlwwlwwlnk', 'knlwkwkwlnk', 'knllwwwllnk', 'knlwkkkwlnk', 'kknllwlllnk', 'knkkllllnnk', 'knnnknnnnnk', '.kNNNNNNNk.', '..kkkkkkk..'],
      cageHot: ['kkkkkkkkkkk', 'knwwwwwwwnk', 'knwwwwwwwnk', 'knwwkwkwwnk', 'knwwwwwwwnk', 'knwkkkkkwnk', 'kknwwwwwwnk', 'knkkwwwwnnk', 'knnnknnnnnk', '.kNNNNNNNk.', '..kkkkkkk..'],
      link: ['.g.', 'g.g', '.g.'],
      coal: ['.kkk.', 'kqqqk', 'kqlqk', 'kqqqk', '.kkk.'],
      flare: ['..kk...', '.kllk..', 'klwwlk.', 'kwwwwlk', 'klwwwwk', 'kwwwwlk', 'klwwlk.', '.kllk..', '..kk...']
    };
    function hang(sway, lift) { return [['link', 13 + Math.round(sway * 0.3), 19 + lift], ['link', 13 + Math.round(sway * 0.6), 22 + lift], ['link', 13 + sway, 25 + lift], ['coal', 12 + sway, 28 + lift]]; }
    var walk = [], k;
    for (k = 0; k < 4; k++) { var sway = [-2, 0, 2, 0][k], bob = k % 2 ? 1 : 0; walk.push(hang(sway, bob).concat([['ring', 12, 2 + bob], ['lid', 9, 5 + bob], [k % 2 ? 'cageHot' : 'cage', 9, 8 + bob]])); }
    return rig('ember', P, 30, 36, { x: 15, y: 14 }, {
      walk: walk,
      windup: [
        hang(-3, 0).concat([['ring', 11, 1], ['lid', 8, 3], ['cageHot', 9, 8]]),
        hang(-4, -1).concat([['ring', 10, 0], ['lid', 7, 2], ['cageHot', 9, 8]])
      ],
      attack: [
        hang(3, 0).concat([['ring', 8, 0], ['lid', 5, 1], ['cageHot', 9, 8], ['flare', 20, 9]]),
        hang(4, 1).concat([['ring', 7, 0], ['lid', 4, 1], ['cageHot', 10, 8], ['flare', 22, 9]]),
        hang(2, 1).concat([['ring', 9, 1], ['lid', 6, 2], ['cage', 9, 8]])
      ],
      hurt: [hang(4, -1).concat([['ring', 13, 3], ['lid', 10, 6], ['cage', 8, 9]])]
    });
  }

  /* The Glacier Crab: a crab under a berg. It snaps; struck, it shuts itself in, and bursts a ring of ice. */
  function crabRig() {
    var P = {
      shell: ['......kk....kk......', '.....kwlk..klwk.....', '...kkwllkkkkllwkk...', '..kwlllllllllllllk..', '.kwllpllllplllllplk.', '.klllpplllpplllpplk.', 'kllpppplpppplppppplk', 'kpppppppppppppppqqqk', 'kppqpppqppppqpppqqqk', '.kqqqqqqqqqqqqqqqqk.', '..kkkkkkkkkkkkkkkk..'],
      body: ['.kkkkkkkkkkkkkk.', 'kqppppppppppppqk', 'kqpppppppppppppk', '.kqqppppppppqqk.', '..kkkkkkkkkkkk..'],
      eyes: ['kek.kek', 'kpk.kpk', 'kpk.kpk'],
      clawOpen: ['..kkkk..', '.kpppplk', 'kpplkkk.', 'kppk....', 'kpplkkk.', '.kpppplk', '..kkkk..'],
      clawShut: ['..kkkkk.', '.kpppplk', 'kppkkkkk', '.kpppplk', '..kkkkk.'],
      legA: ['.kk', 'kpk', 'kpk', 'kk.'],
      legB: ['kk.', 'kpk', '.kpk', '..kk'],
      spikeUp: ['..k..', '.kwk.', '.kwk.', '.klk.', 'kwllk', 'kwllk', 'kllpk', 'kllpk', 'klppk', 'klppk', 'kpppk', 'kkkkk'],
      spikeUpS: ['..k..', '.kwk.', 'kwllk', 'kllpk', 'klppk', 'kkkkk'],
      spikeSide: ['kkkkkkkk....', 'kpplllwwkk..', 'kppplllwwwkk', 'kpplllwwkk..', 'kkkkkkkk....'],
      spikeSideS: ['kkkkk..', 'kpllwkk', 'kkkkk..'],
      spikeDiag: ['......kk.', '.....kwk.', '....kwlk.', '...kwlk..', '..kllk...', '.kllpk...', 'kllpk....', 'kppk.....', 'kkk......']
    };
    function legs(k) { var a = k % 2; return [[a ? 'legA' : 'legB', 23, 35 - (a ? 1 : 0)], [a ? 'legB' : 'legA', 27, 35 - (a ? 0 : 1)], [a ? 'legA' : 'legB', 31, 35 - (a ? 1 : 0), { flip: true }], [a ? 'legB' : 'legA', 35, 35 - (a ? 0 : 1), { flip: true }]]; }
    var walk = [], k;
    for (k = 0; k < 4; k++) { var bob = k % 2 ? -1 : 0; walk.push(legs(k).concat([['clawShut', 13, 31 + bob, { flip: true }], ['body', 22, 31 + bob], ['shell', 20, 22 + bob], ['eyes', 35, 27 + bob], ['clawOpen', 38, 29 + (k === 1 ? -1 : 0)]])); }
    var shut = [[['shell', 20, 28]], [['shell', 21, 28]], [['shell', 19, 28]]];
    return rig('frost', P, 60, 40, { x: 30, y: 40 }, {
      walk: walk,
      windup: [
        legs(0).concat([['clawShut', 13, 31, { flip: true }], ['body', 22, 31], ['shell', 20, 22], ['eyes', 35, 27], ['clawOpen', 34, 24]]),
        legs(0).concat([['clawShut', 13, 31, { flip: true }], ['body', 21, 31], ['shell', 19, 22], ['eyes', 34, 27], ['clawOpen', 31, 21]])
      ],
      attack: [
        legs(1).concat([['clawShut', 14, 31, { flip: true }], ['body', 23, 31], ['shell', 21, 22], ['eyes', 36, 27], ['clawOpen', 42, 28]]),
        legs(1).concat([['clawShut', 15, 31, { flip: true }], ['body', 24, 31], ['shell', 22, 22], ['eyes', 37, 27], ['clawShut', 46, 29]]),
        legs(0).concat([['clawShut', 14, 31, { flip: true }], ['body', 23, 31], ['shell', 21, 22], ['eyes', 36, 27], ['clawShut', 43, 29]])
      ],
      hurt: [legs(0).concat([['clawOpen', 12, 28, { flip: true }], ['body', 21, 31], ['shell', 19, 23], ['eyes', 33, 28], ['clawOpen', 37, 27]])],
      shut: shut,
      burst: [
        [['spikeUpS', 28, 22], ['spikeSideS', 41, 32], ['spikeSideS', 12, 32, { flip: true }], ['shell', 20, 28]],
        [['spikeUp', 28, 16], ['spikeDiag', 38, 19], ['spikeDiag', 13, 19, { flip: true }], ['spikeSide', 41, 31], ['spikeSide', 7, 31, { flip: true }], ['shell', 20, 28]],
        [['spikeUp', 28, 17], ['spikeDiag', 38, 20], ['spikeDiag', 13, 20, { flip: true }], ['spikeSide', 40, 31], ['spikeSide', 8, 31, { flip: true }], ['shell', 20, 28]]
      ]
    });
  }

  /* The Snow Owl: drops an icicle from above, then shows the line it will fly and flies it. */
  function owlRig() {
    var P = {
      body: ['...kkkkk...', '..klllllk..', '.klwwlwwlk.', '.klwewlewk.', '.kllwklwllk', '.kllllkllk.', 'kplllllllpk', 'kpplllllppk', 'kppplllpppk', '.kpppppppk.', '..kqqkqqk..', '..kk.k.kk..'],
      bodyAngry: ['...kkkkk...', '..klllllk..', '.kkklllkkk.', '.klkewlekk.', '.kllwklwllk', '.kllllkllk.', 'kplllllllpk', 'kpplllllppk', 'kppplllpppk', '.kpppppppk.', '..kqqkqqk..', '..kk.k.kk..'],
      wingUp: ['k..........', 'kk.........', 'kpk........', 'kppkk......', 'kplppkk....', '.kplpppkk..', '..kpplpppk.', '...kkkkkkk.'],
      wingMid: ['.kkkkkkkkk.', 'kpplpplpppk', '.kkpplpppk.', '...kkkkkk..'],
      wingDown: ['...kkkkkkk.', '..kpplpppk.', '.kplpppkk..', 'kplppkk....', 'kppkk......', 'kpk........', 'kk.........', 'k..........'],
      icicle: ['kkk', 'kwk', 'kwk', 'klk', 'klk', 'klk', '.k.', '.k.'],
      talons: ['k.k.k', 'kkkkk']
    };
    function bird(wing, wy, body, by, extra) { return [[wing, 3, wy], [wing, 22, wy, { flip: true }], [body, 13, by], ['talons', 16, by + 12]].concat(extra || []); }
    return rig('frost', P, 36, 32, { x: 18, y: 15 }, {
      walk: [bird('wingUp', 3, 'body', 8), bird('wingMid', 10, 'body', 9), bird('wingDown', 13, 'body', 8), bird('wingMid', 10, 'body', 7)],
      windup: [bird('wingUp', 2, 'bodyAngry', 8, [['icicle', 17, 21]]), bird('wingUp', 1, 'bodyAngry', 7, [['icicle', 17, 21]])],
      attack: [bird('wingDown', 12, 'bodyAngry', 9), bird('wingMid', 10, 'bodyAngry', 9), bird('wingDown', 13, 'bodyAngry', 10)],
      hurt: [bird('wingDown', 14, 'body', 10)]
    });
  }

  /* The Spark Hound: lean, a lightning rod for a tail. It crouches, leaps, and bites at the end of the leap. */
  function houndRig() {
    var P = {
      body: ['....kkkkkkkkkkkk..', '..kkpplpplppppppkk', '.kpppppppppppppppk', 'kpppppppppppppppqk', 'kqpppppppppppppqqk', '.kqqqppppppppqqqk.', '..kkkqqqqqqqqkkk..', '.....kkkkkkkk.....'],
      head: ['.kk...kk.', 'kplk.kplk', 'kppkkkppk', 'kppppppek', 'kpppppppkk', 'kqpppplllk', '.kqqkkkkk.', '..kk.....'],
      headOpen: ['.kk...kk.', 'kplk.kplk', 'kppkkkppk', 'kppppppek', 'kppppkkkkk', 'kqppkwxwxk', '.kqpkkkkk.', '..kqplllk.', '...kkkkk..'],
      leg: ['kpk', 'kpk', 'kpk', 'kpk', 'kqk', 'kqk', 'kkk'],
      legBent: ['kpk', 'kppk', '.kqk', '.kqk', '.kkk'],
      legFwd: ['kkkkkkk', 'kppppqk', 'kkkkkkk'],
      tail: ['.kwk.', 'kwwwk', '.kwk.', '..g..', '..g..', '..g..', '..g..', '..g..'],
      tailSpark: ['w.w.w', '.www.', 'wwwww', '.www.', 'w.g.w', '..g..', '..g..', '..g..'],
      mane: ['.w..w.', 'kwkkwk', '.kk.k.']
    };
    var walk = [], k;
    for (k = 0; k < 4; k++) {
      var bob = k % 2 ? -1 : 0, f = [0, 1, 0, -1][k], b = [0, -1, 0, 1][k];
      walk.push([['tail', 8, 3 + bob], ['leg', 9 + b, 19], ['leg', 22 + f, 19], ['body', 8, 11 + bob], ['leg', 12 - b, 19 - (k === 1 ? 1 : 0)], ['leg', 25 - f, 19 - (k === 3 ? 1 : 0)], ['mane', 19, 8 + bob], ['head', 24, 5 + bob]]);
    }
    return rig('storm', P, 42, 26, { x: 20, y: 26 }, {
      walk: walk,
      windup: [
        [['tailSpark', 7, 4], ['legBent', 9, 21], ['legBent', 22, 21], ['body', 8, 13], ['legBent', 12, 21], ['legBent', 25, 21], ['mane', 19, 10], ['head', 24, 9]],
        [['tailSpark', 6, 5], ['legBent', 8, 21], ['legBent', 21, 21], ['body', 7, 14], ['legBent', 11, 21], ['legBent', 24, 21], ['mane', 18, 11], ['head', 23, 11]]
      ],
      attack: [
        [['tail', 8, 1], ['legFwd', 3, 16, { flip: true }], ['body', 9, 9], ['legFwd', 25, 16], ['mane', 20, 6], ['headOpen', 26, 3]],
        [['tail', 8, 2], ['legFwd', 3, 17, { flip: true }], ['body', 9, 10], ['legFwd', 26, 17], ['mane', 20, 7], ['headOpen', 27, 4]],
        [['tail', 8, 4], ['leg', 9, 19], ['body', 8, 12], ['leg', 25, 19], ['legBent', 12, 21], ['legBent', 22, 21], ['mane', 19, 9], ['head', 24, 7]]
      ],
      hurt: [[['tail', 9, 2], ['leg', 10, 19], ['leg', 21, 19], ['body', 7, 10], ['leg', 13, 19], ['leg', 24, 19], ['head', 22, 3]]]
    });
  }

  /* The Tesla Jelly: a bell of glass with a coil in it. Its tentacles stiffen, and it discharges straight down. */
  function jellyRig() {
    var P = {
      bell: ['....kkkkkkk....', '..kkplllllpkk..', '.kpllwwlwwllpk.', 'kpllwkkwkkwllpk', 'kplwkllwllkwlpk', 'kpllwkkwkkwllpk', 'kppllwwlwwllppk', '.kppplllllpppk.', '..kkqpqpqpqkk..', '....k.k.k.k....'],
      bellHot: ['....kkkkkkk....', '..kkwwwwwwwkk..', '.kwwwwwwwwwwwk.', 'kwwwwkkwkkwwwwk', 'kwwwkwwwwwkwwwk', 'kwwwwkkwkkwwwwk', 'kplwwwwwwwwwlpk', '.kppwwwwwwwppk.', '..kkqpqpqpqkk..', '....k.k.k.k....'],
      tentA: ['.p.', 'p..', '.p.', '..p', '.p.', 'p..', '.p.', '..p', '.l.', 'l..'],
      tentB: ['.p.', '..p', '.p.', 'p..', '.p.', '..p', '.p.', 'p..', '.l.', '..l'],
      tentStiff: ['.p.', '.p.', '.p.', '.l.', '.l.', '.l.', '.w.', '.w.', '.w.', '.w.', 'w.w', '.w.'],
      spark: ['w.w', '.w.', 'w.w']
    };
    function jelly(bell, tent, by, stiff) {
      var xs = [10, 13, 16, 19], out = [], k;
      for (k = 0; k < 4; k++) out.push([stiff ? 'tentStiff' : (k % 2 ? (tent ? 'tentA' : 'tentB') : (tent ? 'tentB' : 'tentA')), xs[k] - 1, by + 10]);
      out.push([bell, 8, by]);
      return out;
    }
    return rig('storm', P, 30, 40, { x: 15, y: 12 }, {
      walk: [jelly('bell', 0, 6), jelly('bell', 1, 7), jelly('bell', 0, 8), jelly('bell', 1, 7)],
      windup: [jelly('bellHot', 0, 6, true), jelly('bell', 0, 5, true).concat([['spark', 6, 30], ['spark', 21, 28]])],
      attack: [jelly('bellHot', 0, 5, true).concat([['spark', 9, 31], ['spark', 18, 33]]), jelly('bellHot', 0, 6, true).concat([['spark', 5, 34], ['spark', 22, 31]]), jelly('bell', 0, 7, true)],
      hurt: [jelly('bell', 1, 9)]
    });
  }

  /* The Thorn Toad: squat, thorned, patient. Its throat swells, its mouth opens, and its tongue is longer than you think. */
  function toadRig() {
    var P = {
      body: ['....k..k...k......', '...kwkkwk.kwk.....', '..kkpppppkpppkk...', '.kppppppppppppekk.', 'kpppppppppppppeelk', 'kpplppppppppppppk.', 'kppplllpppppkkkkk.', 'kqppllllllpppppk..', '.kqqlllllllppqk...', '..kkkkkkkkkkkk....'],
      bodyPuff: ['....k..k...k......', '...kwkkwk.kwk.....', '..kkpppppkpppkk...', '.kppppppppppppekk.', 'kpppppppppppppeelk', 'kpplpppppppppppk..', 'kppllllllppppkkk..', 'kplllllllllpppk...', 'kqlllllllllllqk...', '.kqllllllllqqk....', '..kkkkkkkkkkk.....'],
      bodyOpen: ['....k..k...k......', '...kwkkwk.kwk.....', '..kkpppppkpppkkk..', '.kpppppppppppeelk.', 'kppppppppppppkkkk.', 'kpplpppppppkPPPk..', 'kppplllppppkPxPk..', 'kqppllllllpkkkkkk.', '.kqqlllllllppppk..', '..kkkkkkkkkkkkk...'],
      legBack: ['.kkkk.', 'kppppk', 'kpqqpk', 'kkkqqk', '..kkkk'],
      legBackExt: ['kk......', 'kpkk....', '.kppkk..', '..kqppkk', '...kkqqk', '.....kkk'],
      legFront: ['kpk', 'kpk', 'kqk', 'kkkk'],
      tongue: ['kkkkkkkk', 'PPPPPPPP', 'kkkkkkkk'],
      tongueTip: ['.kkk.', 'kPxPk', 'kPPPk', '.kkk.']
    };
    function reach(n) { var out = [], k; for (k = 0; k < n; k++) out.push(['tongue', 30 + k * 8, 17]); out.push(['tongueTip', 30 + n * 8, 16]); return out; }
    return rig('bloom', P, 78, 28, { x: 20, y: 28 }, {
      walk: [
        [['legBack', 8, 23], ['body', 10, 15], ['legFront', 23, 24]],
        [['legBackExt', 4, 22], ['body', 11, 12], ['legFront', 25, 22]],
        [['legBack', 9, 19], ['body', 11, 10], ['legFront', 24, 20]],
        [['legBack', 8, 22], ['body', 10, 14], ['legFront', 23, 24]]
      ],
      windup: [
        [['legBack', 8, 23], ['bodyPuff', 9, 15], ['legFront', 22, 24]],
        [['legBack', 7, 23], ['bodyPuff', 8, 14], ['legFront', 21, 24]]
      ],
      attack: [
        [['legBack', 9, 23], ['bodyOpen', 12, 15], ['legFront', 25, 24]].concat(reach(1)),
        [['legBack', 9, 23], ['bodyOpen', 13, 15], ['legFront', 26, 24]].concat(reach(4)),
        [['legBack', 9, 23], ['bodyOpen', 12, 15], ['legFront', 25, 24]].concat(reach(2))
      ],
      hurt: [[['legBackExt', 5, 22], ['body', 9, 13], ['legFront', 22, 22]]]
    });
  }

  /* The Puffball: a sulky spore sac. It swells until it cracks, bursts into a ring of spores, and is small for a while. */
  function puffRig() {
    var P = {
      small: ['..kkkkk..', '.kpplppk.', 'kplppppqk', 'kpekpekpk', 'kpppppppk', 'kqpkkkpqk', '.kqpppqk.', '..kkkkk..'],
      mid: ['....kkkkk....', '..kkpplppkk..', '.kpllpppppqk.', 'kpllppppppppk', 'kplppppppppqk', 'kppekppekpppk', 'kppkkppkkpppk', 'kpppppppppppk', 'kqppkkkkkppqk', 'kqqpppppppqqk', '.kqqqpppqqqk.', '..kkqqqqqkk..', '....kkkkk....'],
      big: ['......kkkkkkk......', '....kkpplllppkk....', '..kkpllllpppppqkk..', '.kpllllpppppppppqk.', '.kpllppppppppppppk.', 'kpllpppppppppppppqk', 'kplppppppppppppppqk', 'kpppekkpppppekkpppk', 'kpppkkkpppppkkkpppk', 'kpppppppppppppppppk', 'kppppppkkkkkppppppk', 'kqpppppppppppppppqk', 'kqqpppppppppppppqqk', '.kqqpppppppppppqqk.', '.kqqqqpppppppqqqqk.', '..kkqqqqqqqqqqqkk..', '....kkqqqqqqqkk....', '......kkkkkkk......'],
      bigCracked: ['......kkkkkkk......', '....kkpplwlppkk....', '..kkpllwlpppwpqkk..', '.kpllllwppppwpppqk.', '.kpllppwwpppwwpppk.', 'kpllppppwpppppwppqk', 'kplpppppppppppwppqk', 'kpppekkpppppekkpppk', 'kpppkkkpppppkkkpppk', 'kpwpppppppppppppppk', 'kpwwpppkkkkkppppwpk', 'kqpwpppppppppppwwqk', 'kqqwppppppppppwpqqk', '.kqqpppppppppppqqk.', '.kqqqqpppppppqqqqk.', '..kkqqqqqqqqqqqkk..', '....kkqqqqqqqkk....', '......kkkkkkk......'],
      tuft: ['k.k.k', '.klk.', '..k..'],
      roots: ['k.k.k', '.k.k.'],
      rootsB: ['.k.k.', 'k.k.k'],
      puff: ['.w.', 'wlw', '.w.']
    };
    return rig('bloom', P, 40, 40, { x: 20, y: 20 }, {
      walk: [
        [['roots', 17, 26], ['mid', 13, 13], ['tuft', 17, 10]], [['rootsB', 17, 27], ['mid', 13, 14], ['tuft', 17, 11]],
        [['roots', 17, 28], ['mid', 13, 15], ['tuft', 17, 12]], [['rootsB', 17, 27], ['mid', 13, 14], ['tuft', 17, 11]]
      ],
      windup: [[['roots', 17, 29], ['big', 10, 11], ['tuft', 17, 8]], [['rootsB', 17, 29], ['bigCracked', 10, 11], ['tuft', 17, 8]]],
      attack: [
        [['puff', 6, 8], ['puff', 30, 8], ['puff', 4, 22], ['puff', 33, 22], ['puff', 12, 32], ['puff', 26, 32], ['small', 15, 16]],
        [['puff', 2, 5], ['puff', 35, 5], ['puff', 0, 24], ['puff', 37, 24], ['puff', 9, 36], ['puff', 29, 36], ['small', 15, 16]],
        [['small', 15, 17]]
      ],
      hurt: [[['rootsB', 17, 27], ['mid', 12, 13], ['tuft', 16, 10]]],
      little: [[['small', 15, 16]], [['small', 15, 17]]]
    });
  }

  /* The Reaper Shade: a hood with nothing in it but two lights, and a scythe. It is behind you; then it reaps. */
  function shadeRig() {
    var P = {
      robe: ['....kkkk....', '...kppppk...', '..kppppppk..', '..kpqqqqpk..', '..kpqeqeqk..', '..kpqqqqpk..', '.kkppqqppkk.', 'kpppppppppk.', 'kppppppppppk', 'kpplpppppppk', 'kpplppppppqk', 'kpplpppppqqk', 'kppplppppqqk', '.kpplpppqqk.', '.kppplppqqk.', '.kpppppqqqk.', '.kppkppkqpk.', '.kpk.kpk.kk.', '..k...k.....'],
      robeB: ['....kkkk....', '...kppppk...', '..kppppppk..', '..kpqqqqpk..', '..kpqeqeqk..', '..kpqqqqpk..', '.kkppqqppkk.', 'kpppppppppk.', 'kppppppppppk', 'kpplpppppppk', 'kpplppppppqk', 'kpplpppppqqk', 'kppplppppqqk', '.kpplpppqqk.', '.kppplppqqk.', '.kpppppqqqk.', '.kpkppkpqkk.', '..k.kpk.k...', '.....k......'],
      robeFlare: ['....kkkk....', '...kppppk...', '..kppppppk..', '..kpqqqqpk..', '..kpwewewk..', '..kpqqqqpk..', '.kkppqqppkk.', 'kpppppppppk.', 'kppppppppppk', 'kpplpppppppk', 'kpplppppppqk', 'kpplpppppqqk', 'kppplppppqqk', '.kpplpppqqk.', '.kppplppqqk.', '.kpppppqqqk.', '.kppkppkqpk.', '.kpk.kpk.kk.', '..k...k.....'],
      arm: ['kpk', 'kpk', 'kpk', 'kpk', 'klk', 'kkk'],
      armFwd: ['kkkkkk', 'kpppplk', 'kkkkkk'],
      // the scythe in three places: over the shoulder, swung out in front, and low
      scytheUp: ['.....kkkkkkkk.', '...kkwwwwwwwwk', '..kwwllllllkk.', '.kwllkkkkkk...', 'kwlk..........', 'kkM...........', '..M...........', '..M...........', '..M...........', '..M...........', '..M...........', '..M...........', '..M...........', '..M...........'],
      scytheFwd: ['MMMMMMMMMMMMkk....', '...........kwlk...', '...........kwllk..', '............kwllk.', '............kwllk.', '.............kwlk.', '.............kwlk.', '............kwlk..', '...........kwk....', '...........kk.....'],
      scytheLow: ['M.............', '.M............', '..M...........', '...M..........', '....M.........', '.....M........', '......Mkkkkk..', '......kwwwwwkk', '.......kllllwk', '........kkklwk', '...........kk.']
    };
    return rig('void', P, 60, 40, { x: 30, y: 40 }, {
      walk: [
        [['scytheUp', 27, 6], ['robe', 24, 20], ['arm', 33, 28]], [['scytheUp', 27, 7], ['robeB', 24, 21], ['arm', 33, 29]],
        [['scytheUp', 27, 6], ['robe', 24, 20], ['arm', 33, 28]], [['scytheUp', 27, 5], ['robeB', 24, 19], ['arm', 33, 27]]
      ],
      windup: [
        [['scytheUp', 22, 2], ['robeFlare', 24, 20], ['arm', 31, 24]],
        [['scytheUp', 19, 0], ['robeFlare', 23, 19], ['arm', 30, 22]]
      ],
      attack: [
        [['robeFlare', 25, 20], ['armFwd', 34, 27], ['scytheFwd', 36, 18]],
        [['robeFlare', 26, 21], ['armFwd', 35, 29], ['scytheLow', 38, 22]],
        [['robe', 25, 20], ['arm', 34, 28], ['scytheLow', 36, 24]]
      ],
      hurt: [[['scytheUp', 29, 8], ['robeB', 22, 20], ['arm', 31, 28]]]
    });
  }

  /* The Watcher: an eye with nothing behind it. It draws a line of sight, then burns along the line, turning slowly. */
  function watcherRig() {
    var P = {
      ball: ['.....kkkkk.....', '...kkxxxxxkk...', '..kxxxxxxxxxk..', '.kxxxxxxxxxxxk.', '.kxxxxxxxxxxxk.', 'kxxxxxxxxxxxxxk', 'kxxxxxxxxxxxxxk', 'kxxxxxxxxxxxxxk', 'kxxxxxxxxxxxxMk', 'kMxxxxxxxxxxxMk', '.kMxxxxxxxxxMk.', '.kMMxxxxxxxMMk.', '..kMMMxxxMMMk..', '...kkMMMMMkk...', '.....kkkkk.....'],
      iris: ['.kkkkk.', 'klllllk', 'kllkllk', 'klkkklk', 'kllkllk', 'klllllk', '.kkkkk.'],
      irisNarrow: ['.kkkkk.', 'klwwwlk', 'kwwkwwk', 'kwwkwwk', 'kwwkwwk', 'klwwwlk', '.kkkkk.'],
      irisHot: ['.kkkkk.', 'kwwwwwk', 'kwwwwwk', 'kwwwwwk', 'kwwwwwk', 'kwwwwwk', '.kkkkk.'],
      lidTop: ['.....kkkkk.....', '...kkpppppkk...', '..kpppppppppk..', '.kpppqqqqqpppk.', '.kkkk.....kkkk.'],
      lidLow: ['.kkkk.....kkkk.', '.kpppqqqqqpppk.', '..kpppppppppk..', '...kkpppppkk...', '.....kkkkk.....'],
      tendA: ['k..', '.k.', '..k', '.k.', 'k..', '.k.'],
      tendB: ['..k', '.k.', 'k..', '.k.', '..k', '.k.'],
      ring: ['...wwwwwwwww...', '..w.........w..', '.w...........w.']
    };
    function eye(iris, ix, iy, t, by) { return [[t ? 'tendA' : 'tendB', 5, by + 14], [t ? 'tendB' : 'tendA', 12, by + 16], [t ? 'tendA' : 'tendB', 19, by + 16], [t ? 'tendB' : 'tendA', 26, by + 14], ['ball', 10, by], [iris, 14 + ix, by + 4 + iy], ['lidTop', 10, by - 2], ['lidLow', 10, by + 12]]; }
    return rig('void', P, 36, 40, { x: 17, y: 14 }, {
      walk: [eye('iris', 2, 0, 0, 6), eye('iris', 3, 0, 1, 7), eye('iris', 2, 1, 0, 8), eye('iris', 1, 0, 1, 7)],
      windup: [eye('irisNarrow', 3, 0, 0, 6), eye('irisNarrow', 3, 0, 1, 6).concat([['ring', 10, 3]])],
      attack: [eye('irisHot', 4, 0, 0, 6), eye('irisHot', 4, 0, 1, 7), eye('irisNarrow', 3, 0, 0, 6)],
      hurt: [eye('iris', 0, 1, 1, 8)]
    });
  }

  /* ---- the first five, redrawn ---- */

  function flameJet(e, ctx, reach) {
    for (var n = 0; n < 3; n++) ctx.particle({ x: e.x + e.dir * 13 * e.size, y: e.y - 14 * e.size + (ctx.random() - 0.5) * 3, vx: e.dir * (1.4 + ctx.random() * 2.2) * (reach / 40), vy: (ctx.random() - 0.5) * 0.9, life: 12 + ctx.random() * 12, max: 24, colour: ctx.random() < 0.4 ? '#ffdc9a' : ctx.random() < 0.6 ? '#ffb347' : '#ff6a2b', size: ctx.random() < 0.5 ? 2 : 1, gravity: -0.015 });
    ctx.light(e.x + e.dir * 24, e.y - 12, 34, 0.7);
  }

  KINDS.imp = { element: 'ember', flying: false, body: { w: 12, h: 16 }, hurt: { w: 16, h: 21 }, hp: 8, speed: 0.45, sight: 120, move: 'walk', keep: 30, rig: impRig,
    attacks: [{ name: 'breath', range: [8, 48], windup: 36, active: 28, recover: 44, cooldown: 70, grounded: true,
      telling: function (e, ctx, t) { if (t % 6 === 0) ctx.particle({ x: e.x - e.dir * 10, y: e.y - 18, vx: -e.dir * 0.3, vy: -0.5, life: 22, max: 22, colour: '#8f8d88', size: 2, gravity: -0.01 }); },
      box: function (e, t) { return [front(e, 10, 14 + Math.min(34, t * 4), 19, -3)]; },
      during: function (e, ctx, t) { flameJet(e, ctx, 14 + Math.min(34, t * 4)); } }] };

  KINDS.lantern = { element: 'ember', flying: true, body: { w: 10, h: 12 }, hurt: { w: 13, h: 16 }, hp: 6, speed: 0.6, sight: 150, move: 'hover', stand: 62, height: 50, rig: lanternRig,
    attacks: [{ name: 'embers', range: [30, 130], above: 30, below: 120, windup: 32, active: 6, recover: 34, cooldown: 110,
      telling: function (e, ctx, t) { if (t % 5 === 0) ctx.spark(e.x, e.y, '#ffb347', 2, 0.8, 12, -0.02); },
      fire: function (e, ctx) {
        var a = aim(e, ctx, 2.4), base = Math.atan2(a.vy - 0.5, a.vx);
        for (var n = -1; n <= 1; n++) ctx.projectile({ x: e.x + e.dir * 8, y: e.y, vx: Math.cos(base + n * 0.3) * 2.4, vy: Math.sin(base + n * 0.3) * 2.4, life: 150, colour: '#ffb347', size: 3, damage: 1, element: 'ember', gravity: 0.035, ember: true });
      } }] };

  var CRAB_BURST = { name: 'burst', range: [-2, -1], steady: true, anims: { windup: 'shut', attack: 'burst' }, windup: 50, active: 12, recover: 46, cooldown: 80,
    start: function (e) { e.vars.shelled = true; },
    telling: function (e, ctx, t) { if (t % 5 === 0) ctx.spark(e.x + (ctx.random() - 0.5) * 20, e.y - 8, '#d8f1ff', 2, 0.8, 12, -0.02); },
    fire: function (e, ctx) { ctx.shake(2); ctx.spark(e.x, e.y - 10, '#d8f1ff', 24, 2.4, 22, 0.04); },
    box: function (e) { return [{ x0: e.x - 27 * e.size, x1: e.x + 27 * e.size, y0: e.y - 25 * e.size, y1: e.y }]; },
    resting: function (e) { e.vars.shelled = false; },
    end: function (e) { e.vars.shelled = false; } };
  KINDS.crab = { element: 'frost', flying: false, body: { w: 22, h: 12 }, hurt: { w: 28, h: 17 }, hp: 12, speed: 0.3, sight: 110, move: 'walk', keep: 28, rig: crabRig,
    attacks: [{ name: 'snap', range: [6, 38], windup: 28, active: 8, recover: 34, cooldown: 60, grounded: true,
      box: function (e) { return [front(e, 8, 26, 13, -2)]; } }, CRAB_BURST],
    struck: function (e, ctx) { if (e.hp > 0 && !(e.vars.shellCd > 0) && !(e.attack && e.attack.def === CRAB_BURST)) { e.vars.shellCd = 360; beginAttack(e, CRAB_BURST, ctx); } },
    always: function (e) { if (e.vars.shellCd > 0) e.vars.shellCd--; } };

  KINDS.owl = { element: 'frost', flying: true, body: { w: 10, h: 12 }, hurt: { w: 15, h: 15 }, hp: 6, speed: 0.8, sight: 160, move: 'hover', stand: 0, height: 66, rig: owlRig,
    attacks: [
      { name: 'icicle', range: [0, 20], minBelow: 34, below: 130, windup: 26, active: 4, recover: 30, cooldown: 90,
        fire: function (e, ctx) { ctx.projectile({ x: e.x, y: e.y + 10, vx: 0, vy: 1, life: 130, colour: '#d8f1ff', size: 4, damage: 1, element: 'frost', gravity: 0.12, icicle: true }); } },
      { name: 'swoop', range: [40, 130], below: 110, windup: 40, active: 34, recover: 36, cooldown: 140, moves: true,
        start: function (e, ctx) { e.vars.ty = ctx.hero.y - 12; },
        telling: function (e, ctx, t, w) { e.vy = (e.vars.ty - e.y) * 0.1; e.vx *= 0.8; if (t === 10) ctx.telegraph(e.dir > 0 ? e.x : e.x - 150, e.vars.ty - 6, 150, 12, w - 10, '#9fd8ff'); },
        fire: function (e) { e.vx = e.dir * 4.2; e.vy = 0; },
        box: function (e) { return [{ x0: e.x - 8, x1: e.x + 8, y0: e.y - 7, y1: e.y + 7 }]; },
        resting: function (e) { e.vy -= 0.12; e.vx *= 0.9; } }] };

  KINDS.hound = { element: 'storm', flying: false, body: { w: 18, h: 12 }, hurt: { w: 26, h: 15 }, hp: 9, speed: 0.85, sight: 150, move: 'walk', keep: 46, rig: houndRig,
    attacks: [{ name: 'leap', range: [26, 86], windup: 30, active: 24, recover: 34, cooldown: 80, grounded: true, moves: true,
      telling: function (e, ctx, t) { if (t % 5 === 0) ctx.spark(e.x - e.dir * 15, e.y - 20, '#ffffff', 2, 1, 10, 0); },
      fire: function (e, ctx) { e.vx = e.dir * 3.1; e.vy = -2.8; ctx.spark(e.x, e.y - 4, '#8fa3ff', 8, 1.4, 14, 0); },
      box: function (e) { return [front(e, 8, 23, 16, -3)]; },
      resting: function (e) { e.vx *= 0.85; } }] };

  BY_ELEMENT.ember = ['imp', 'lantern']; BY_ELEMENT.frost = ['crab', 'owl'];

  /* ---- the second five ---- */

  function groundBelow(e, ctx, max) { for (var y = e.y; y < e.y + max; y += 8) if (ctx.tileAt(Math.floor(e.x / 16), Math.floor(y / 16)) === 1) return Math.floor(y / 16) * 16; return e.y + max; }
  function turnToward(angle, target, most) { var d = target - angle; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return angle + Math.max(-most, Math.min(most, d)); }

  KINDS.jelly = { element: 'storm', flying: true, body: { w: 12, h: 10 }, hurt: { w: 16, h: 13 }, hp: 6, speed: 0.7, sight: 150, move: 'hover', stand: 0, height: 60, rig: jellyRig,
    attacks: [{ name: 'discharge', range: [0, 18], minBelow: 10, below: 130, windup: 40, active: 16, recover: 40, cooldown: 110,
      start: function (e, ctx) { e.vars.ground = groundBelow(e, ctx, 140); },
      telling: function (e, ctx, t, w) { if (t === 1) ctx.telegraph(e.x - 7, e.y + 8, 14, e.vars.ground - e.y - 8, w, '#8fa3ff'); if (t % 6 === 0) ctx.spark(e.x + (ctx.random() - 0.5) * 12, e.y + 14, '#ffffff', 1, 0.8, 10, 0); },
      box: function (e) { return [{ x0: e.x - 7, x1: e.x + 7, y0: e.y + 8, y1: e.vars.ground }]; },
      during: function (e, ctx, t) { if (t % 3 === 1) { ctx.zap(e.x, e.y + 10, e.x + (ctx.random() - 0.5) * 8, e.vars.ground, '#ffffff'); ctx.spark(e.x, e.vars.ground, '#8fa3ff', 3, 1.6, 12, 0.05); } ctx.light(e.x, (e.y + e.vars.ground) / 2, 40, 0.8); } }] };

  KINDS.toad = { element: 'bloom', flying: false, body: { w: 16, h: 11 }, hurt: { w: 21, h: 15 }, hp: 10, speed: 0.5, sight: 120, move: 'hop', rig: toadRig,
    pose: function (e) { e.frame = e.onGround ? (e.wait > 8 ? 0 : 3) : (e.vy < 0 ? 1 : 2); },
    attacks: [{ name: 'tongue', range: [18, 64], above: 16, below: 16, windup: 30, active: 10, recover: 40, cooldown: 80, grounded: true,
      box: function (e, t) { var reach = t < 3 ? 22 : t < 8 ? 62 : 38; return [front(e, 8, reach, 13, -6)]; } }] };

  KINDS.puff = { element: 'bloom', flying: true, body: { w: 12, h: 12 }, hurt: { w: 15, h: 15 }, hp: 5, speed: 0.5, sight: 130, move: 'hover', stand: 30, height: 28, rig: puffRig,
    attacks: [{ name: 'burst', range: [0, 54], above: 60, below: 60, windup: 46, active: 6, recover: 80, cooldown: 140,
      telling: function (e, ctx, t, w) { if (t === 1) ctx.telegraphCircle(e.x, e.y, 46, w, '#9ae66e'); },
      fire: function (e, ctx) { for (var n = 0; n < 10; n++) { var a = n / 10 * Math.PI * 2; ctx.projectile({ x: e.x + Math.cos(a) * 8, y: e.y + Math.sin(a) * 8, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, life: 26, colour: '#c5ff9a', size: 4, damage: 1, element: 'bloom', gravity: 0, cloud: true }); } ctx.spark(e.x, e.y, '#c5ff9a', 16, 1.4, 20, 0); } }] };

  KINDS.shade = { element: 'void', flying: false, body: { w: 10, h: 20 }, hurt: { w: 14, h: 22 }, hp: 10, speed: 0.5, sight: 170, move: 'walk', keep: 30, rig: shadeRig,
    attacks: [{ name: 'reap', range: [0, 130], windup: 34, active: 10, recover: 44, cooldown: 130, grounded: true,
      start: function (e, ctx) {
        var hero = ctx.hero;
        if (Math.abs(hero.x - e.x) < 44 || !hero.onGround) return;
        var nx = hero.x - hero.dir * 26, tx = Math.floor(nx / 16), ty = Math.floor((hero.y - 1) / 16), under = ctx.tileAt(tx, ty + 1);
        if (ctx.tileAt(tx, ty) !== 0 || ctx.tileAt(tx, ty - 1) !== 0 || (under !== 1 && under !== 2)) return;
        ctx.spark(e.x, e.y - 12, '#a48cff', 14, 1.4, 22, -0.02);
        e.x = nx; e.y = hero.y; e.vx = 0; e.vy = 0; e.dir = hero.x > e.x ? 1 : -1;
        ctx.spark(e.x, e.y - 12, '#a48cff', 14, 1.4, 22, -0.02);
      },
      fire: function (e, ctx) { ctx.crescent(e.x, e.y - 16, e.dir, 34, '#a48cff', 12); },
      box: function (e) { return [front(e, -10, 38, 32, 0)]; } }] };

  KINDS.watcher = { element: 'void', flying: true, body: { w: 12, h: 12 }, hurt: { w: 16, h: 16 }, hp: 7, speed: 0.45, sight: 180, move: 'hover', stand: 74, height: 30, rig: watcherRig,
    attacks: [{ name: 'gaze', range: [40, 160], above: 80, below: 100, windup: 50, active: 44, recover: 40, cooldown: 150,
      start: function (e, ctx) { e.vars.angle = Math.atan2(ctx.hero.y - 11 - e.y, ctx.hero.x - e.x); },
      telling: function (e, ctx, t, w) {
        if (t < w - 16) e.vars.angle = turnToward(e.vars.angle, Math.atan2(ctx.hero.y - 11 - e.y, ctx.hero.x - e.x), 0.04);
        ctx.telegraphLine(e.x, e.y, e.x + Math.cos(e.vars.angle) * 190, e.y + Math.sin(e.vars.angle) * 190, 2, '#a48cff');
      },
      box: function (e, t, ctx) {
        e.vars.angle = turnToward(e.vars.angle, Math.atan2(ctx.hero.y - 11 - e.y, ctx.hero.x - e.x), 0.007);
        var out = [], c = Math.cos(e.vars.angle), s = Math.sin(e.vars.angle), len = 8;
        for (; len < 190; len += 8) { var x = e.x + c * len, y = e.y + s * len; if (ctx.tileAt(Math.floor(x / 16), Math.floor(y / 16)) === 1) break; out.push({ x0: x - 4, x1: x + 4, y0: y - 4, y1: y + 4 }); }
        e.vars.len = len;
        return out;
      },
      during: function (e, ctx) { ctx.beam(e.x, e.y, e.x + Math.cos(e.vars.angle) * e.vars.len, e.y + Math.sin(e.vars.angle) * e.vars.len, '#a48cff'); } }] };

  BY_ELEMENT.storm = ['hound', 'jelly']; BY_ELEMENT.bloom = ['toad', 'puff']; BY_ELEMENT.void = ['shade', 'watcher'];
  // until their own are written, the newer floors borrow
  BY_ELEMENT.tide = ['crab', 'puff']; BY_ELEMENT.gear = ['hound', 'lantern']; BY_ELEMENT.glass = ['shade', 'watcher'];

  // compile every kind's rig into frames, and their mirror images
  var SPRITES = null;
  function build() {
    if (SPRITES) return SPRITES;
    SPRITES = {};
    Object.keys(KINDS).forEach(function (name) {
      var kind = KINDS[name], set;
      set = kind.rig();
      set.flipped = {};
      Object.keys(set.frames).forEach(function (anim) { set.flipped[anim] = set.frames[anim].map(window.Pixels.flipH); });
      kind.frames = set.frames;
      SPRITES[name] = set;
    });
    return SPRITES;
  }

  /* ---- the core: bodies, boxes, the clock of an attack ----

     A creature is struck in its hurt boxes and strikes with its attack
     boxes, and nothing else about it can wound: touching one is harmless.
     An attack is a wind-up (a pose that tells), some active steps (the
     boxes are live and the frames show the blow) and a recovery (it is
     open). Struck during the wind-up, an ordinary creature loses the
     attack; an elder does not. */

  var STATUS = {
    ember: { name: 'burn', time: 70, colour: '#ff8c42' },
    frost: { name: 'chill', time: 200, colour: '#9fd8ff' },
    storm: { name: 'shock', time: 90, colour: '#8fa3ff' },
    bloom: { name: 'poison', time: 130, colour: '#9ae66e' },
    void:  { name: 'drain', time: 1, colour: '#a48cff' },
    tide:  { name: 'soak', time: 170, colour: '#5fd4c4' },
    gear:  { name: 'jam', time: 180, colour: '#e0b04a' },
    glass: { name: 'cut', time: 240, colour: '#ff9ecb' }
  };
  function statusName(element) { return STATUS[element].name; }

  function make(name, x, groundY, elder, floor, rnd) {
    var K = KINDS[name], scale = 1 + ((floor || 1) - 1) * 0.17, size = elder ? 1.4 : 1;
    var hp = Math.round(K.hp * scale * (elder ? 3 : 1));
    return {
      kind: name, spec: K, element: K.element, elder: !!elder, size: size,
      x: x, y: K.flying ? groundY - 36 : groundY, vx: 0, vy: 0, w: K.body.w * size, h: K.body.h * size,
      hp: hp, maxHp: hp, dir: rnd() < 0.5 ? -1 : 1, onGround: false, clock: Math.floor(rnd() * 60), frame: 0, anim: 'walk',
      state: 'idle', wait: Math.floor(rnd() * 40), cooldown: 50 + Math.floor(rnd() * 40), hurt: 0, flash: 0, dying: 0,
      home: { x: x, y: groundY - 36 }, drop: 0, status: {}, seen: false, attack: null, boxes: [], hitHero: false, vars: {}
    };
  }
  // a creature for a spawn point: the element's walker or flyer, an elder for arenas
  function spawn(point, element, floor, rnd) {
    var pair = BY_ELEMENT[element], name = (point.kind === 'flyer' || point.kind === 'perch') ? pair[1] : pair[0];
    return make(name, point.x * 16 + 8, point.y * 16, point.kind === 'brute', floor, rnd);
  }

  // where a creature can be struck: a walker stands on (x, y), a flyer is centred on it
  function hurtBoxes(e) {
    var K = e.spec, w = K.hurt.w * e.size, h = K.hurt.h * e.size, oy = (K.hurt.oy || 0) * e.size;
    if (e.vars && e.vars.shelled) return [];
    if (K.boxes) return K.boxes(e, w, h);
    if (K.flying) return [{ x0: e.x - w / 2, x1: e.x + w / 2, y0: e.y - h / 2 + oy, y1: e.y + h / 2 + oy, mult: 1 }];
    return [{ x0: e.x - w / 2, x1: e.x + w / 2, y0: e.y - h + oy, y1: e.y + oy, mult: 1 }];
  }
  // a box in front of a creature: from `near` to `far` ahead of it, `up` above its feet (or centre) to `down` below
  function front(e, near, far, up, down) {
    var s = e.size, x0 = e.dir > 0 ? e.x + near * s : e.x - far * s, x1 = e.dir > 0 ? e.x + far * s : e.x - near * s;
    return { x0: x0, x1: x1, y0: e.y - up * s, y1: e.y + down * s };
  }

  function hurt(e, damage, fromX, ctx) {
    if (e.dying) return false;
    e.hp -= damage; e.hurt = 10; e.flash = 4;
    if (!e.elder) { e.vx = (e.x < fromX ? -1 : 1) * (e.spec.flying ? 1.6 : 1.2); if (!e.spec.flying) e.vy = Math.min(e.vy, -1.4); }
    // a blow during the wind-up breaks an ordinary creature's attack
    if (e.attack && e.attack.phase === 'windup' && !e.elder && !e.attack.def.steady) { if (e.attack.def.end) e.attack.def.end(e, ctx); e.attack = null; e.boxes = []; e.cooldown = 40; }
    if (e.spec.struck) e.spec.struck(e, ctx);
    if (e.hp <= 0) { e.hp = 0; e.dying = 1; e.boxes = []; e.attack = null; }
    return true;
  }

  function towards(e, hero) { return hero.x > e.x ? 1 : -1; }
  function dist(e, hero) { var dx = hero.x - e.x, dy = (hero.y - 11) - (e.spec.flying ? e.y : e.y - e.h / 2); return Math.sqrt(dx * dx + dy * dy); }
  // is there floor ahead, and no wall?
  function edgeAhead(e, ctx) {
    var ax = e.x + e.dir * (e.w / 2 + 2), ty = Math.floor((e.y + 2) / 16), tx = Math.floor(ax / 16);
    var below = ctx.tileAt(tx, ty), ahead = ctx.tileAt(tx, ty - 1);
    return (below !== 1 && below !== 2) || ahead === 1;
  }

  function beginAttack(e, A, ctx) {
    e.attack = { def: A, t: 0, phase: 'windup' };
    e.dir = towards(e, ctx.hero); e.hitHero = false; e.boxes = [];
    if (A.start) A.start(e, ctx);
  }
  function stepAttack(e, ctx) {
    var a = e.attack, A = a.def, F = e.spec.frames;
    var w = Math.round(A.windup * (e.elder ? 0.85 : 1)), act = A.active, rec = A.recover;
    var wn = (A.anims && A.anims.windup) || 'windup', an = (A.anims && A.anims.attack) || 'attack';
    a.t++;
    if (a.t <= w) {
      a.phase = 'windup'; e.anim = wn; e.frame = wn === 'windup' ? Math.min(F[wn].length - 1, Math.floor((a.t - 1) / w * F[wn].length)) : Math.floor(a.t / 4) % F[wn].length;
      if (A.telling) A.telling(e, ctx, a.t, w);
    } else if (a.t <= w + act) {
      if (a.phase !== 'active') { a.phase = 'active'; if (A.fire) A.fire(e, ctx); }
      e.anim = an; e.frame = Math.min(F[an].length - 1, Math.floor((a.t - w - 1) / act * F[an].length));
      e.boxes = A.box ? A.box(e, a.t - w, ctx) : [];
      if (A.during) A.during(e, ctx, a.t - w);
    } else if (a.t <= w + act + rec) {
      a.phase = 'recover'; e.boxes = [];
      e.anim = a.t - w - act < rec * 0.4 ? an : 'walk'; e.frame = e.anim === an ? F[an].length - 1 : 0;
      if (A.resting) A.resting(e, ctx, a.t - w - act);
    } else {
      e.attack = null; e.boxes = []; e.cooldown = Math.round(A.cooldown * (e.elder ? 0.75 : 1));
      if (A.end) A.end(e, ctx);
    }
  }
  // which attack, if any, the creature will begin: the first whose range the Warden stands in
  function chooseAttack(e, ctx, sees) {
    if (!sees || e.cooldown > 0 || e.hurt > 0) return null;
    var hero = ctx.hero, dx = Math.abs(hero.x - e.x), dy = (hero.y - 11) - (e.spec.flying ? e.y : e.y - e.h / 2), list = e.spec.attacks;
    for (var k = 0; k < list.length; k++) {
      var A = list[k];
      if (A.elderOnly && !e.elder) continue;
      if (dx >= A.range[0] * e.size && dx <= A.range[1] * e.size && dy >= (A.above === undefined ? -28 : -A.above) && dy <= (A.below === undefined ? 28 : A.below)) {
        if (A.chance && ctx.random() > A.chance) continue;
        if (A.grounded && !e.onGround) continue;
        if (A.minBelow && dy < A.minBelow) continue;
        return A;
      }
    }
    return null;
  }

  function step(e, ctx) {
    var hero = ctx.hero, K = e.spec;
    if (e.dying) { e.dying++; e.boxes = []; return; }
    if (e.hurt > 0) e.hurt--;
    if (e.flash > 0) e.flash--;
    if (e.cooldown > 0) e.cooldown--;
    if (e.status.burn > 0) { e.status.burn--; if (e.status.burn % 40 === 0) { e.hp -= (e.status.burnDamage || 1); ctx.spark(e.x, e.y - e.h / 2, '#ff8c42', 4, 1, 16, -0.02); if (e.hp <= 0) { e.hp = 0; e.dying = 1; return; } } }
    if (e.status.poison > 0) { e.status.poison--; if (e.status.poison % 50 === 0) { e.hp -= 1; ctx.spark(e.x, e.y - e.h / 2, '#9ae66e', 3, 0.8, 16, -0.01); if (e.hp <= 0) { e.hp = 0; e.dying = 1; return; } } }
    var stunned = e.status.stun > 0, frozen = e.status.freeze > 0 || stunned, shocked = e.status.shock > 0, soaked = e.status.soak > 0;
    if (e.status.freeze > 0) e.status.freeze--;
    if (stunned) e.status.stun--;
    if (shocked) e.status.shock--;
    if (soaked) { e.status.soak--; if (e.clock % 9 === 0) ctx.particle({ x: e.x + (ctx.random() - 0.5) * e.w, y: e.y - e.h / 2, vx: 0, vy: 0.4, life: 14, max: 14, colour: '#5fd4c4', size: 1, gravity: 0.05 }); }
    if (e.status.cut > 0) e.status.cut--;
    var d = dist(e, hero), sees = d < K.sight && hero.alive;
    if (sees) e.seen = true;
    e.clock++;
    if (frozen) { e.boxes = []; if (!K.flying) { e.vx = 0; e.vy = Math.min(5, e.vy + 0.32); ctx.moveBody(e); } return; }
    var slow = shocked ? 0.4 : soaked ? 0.6 : 1;
    if (e.attack) {
      stepAttack(e, ctx);
      if (!K.flying) { e.vy = Math.min(5, e.vy + 0.32); if (!(e.attack && e.attack.def.moves)) e.vx *= 0.8; var t = ctx.moveBody(e); e.onGround = t.floor; if (t.wall && e.attack && e.attack.def.moves) e.vx = 0; }
      else {
        if (ctx.tileAt(Math.floor((e.x + e.vx * 2) / 16), Math.floor(e.y / 16)) === 1) e.vx = 0;
        if (ctx.tileAt(Math.floor(e.x / 16), Math.floor((e.y + e.vy * 2 + (e.vy > 0 ? 6 : -6)) / 16)) === 1) e.vy = 0;
        e.x += e.vx; e.y += e.vy;
        if (!(e.attack && e.attack.def.moves)) { e.vx *= 0.85; e.vy *= 0.85; }
      }
    } else {
      var A = chooseAttack(e, ctx, sees);
      if (A) beginAttack(e, A, ctx);
      else {
        MOVES[K.move](e, ctx, sees, d, slow);
        var rate = K.flying ? 6 : 8;
        e.anim = e.hurt > 0 ? 'hurt' : 'walk';
        if (e.clock % rate === 0) e.frame = (e.frame + 1) % K.frames.walk.length;
        if (e.anim === 'hurt') e.frame = 0; else if (K.pose) K.pose(e);
      }
    }
    if (K.always) K.always(e, ctx);
  }

  /* ---- ways of getting about ---- */

  var MOVES = {
    // on foot, turning at edges, toward the Warden when it sees her, stopping just short
    walk: function (e, ctx, sees, d, slow) {
      var hero = ctx.hero, K = e.spec, speed = K.speed * slow;
      e.vy = Math.min(5, e.vy + 0.32);
      if (e.hurt > 0) e.vx *= 0.85;
      else {
        if (sees) e.dir = towards(e, hero);
        if (e.onGround && edgeAhead(e, ctx)) { if (sees) { e.vx = 0; } else e.dir = -e.dir; }
        var keep = K.keep || 18;
        e.vx = sees && Math.abs(hero.x - e.x) < keep ? 0 : e.dir * speed * (sees ? 1.5 : 1);
        if (e.onGround && edgeAhead(e, ctx)) e.vx = 0;
      }
      var t = ctx.moveBody(e); e.onGround = t.floor;
      if (t.wall && !sees) e.dir = -e.dir;
    },
    // in hops: sits, then hops along its patrol or toward the Warden
    hop: function (e, ctx, sees, d, slow) {
      var hero = ctx.hero, speed = e.spec.speed * slow;
      e.vy = Math.min(5, e.vy + 0.32);
      if (e.hurt > 0) e.vx *= 0.85;
      else if (e.onGround) {
        e.vx *= 0.6;
        if (e.wait > 0) e.wait--;
        else { e.dir = sees ? towards(e, hero) : e.dir; if (edgeAhead(e, ctx)) e.dir = -e.dir; if (!edgeAhead(e, ctx)) { e.vx = e.dir * speed * 2.2; e.vy = sees ? -3.2 : -2.4; } e.wait = sees ? 30 : 55; }
      }
      var t = ctx.moveBody(e); e.onGround = t.floor;
      if (t.wall) e.dir = -e.dir;
    },
    // in the air: drifting to a place above and beside the Warden, or home, with a slow bob
    hover: function (e, ctx, sees, d, slow) {
      var hero = ctx.hero, K = e.spec, speed = K.speed * slow;
      if (e.hurt > 0) { e.vx *= 0.9; e.vy *= 0.9; }
      else {
        var tx = sees ? hero.x - towards(e, hero) * (K.stand === undefined ? 46 : K.stand) : e.home.x, ty = sees ? hero.y - (K.height === undefined ? 42 : K.height) : e.home.y;
        e.vx += (tx - e.x) * 0.004 * speed + Math.sin(e.clock * 0.05) * 0.02; e.vy += (ty - e.y) * 0.004 * speed + Math.cos(e.clock * 0.07) * 0.02;
        e.vx *= 0.93; e.vy *= 0.93;
        var cap = speed * 1.4; if (Math.abs(e.vx) > cap) e.vx = cap * (e.vx > 0 ? 1 : -1); if (Math.abs(e.vy) > cap) e.vy = cap * (e.vy > 0 ? 1 : -1);
        if (sees) e.dir = towards(e, hero); else if (Math.abs(e.vx) > 0.1) e.dir = e.vx > 0 ? 1 : -1;
      }
      var nx = e.x + e.vx, ny = e.y + e.vy;
      if (ctx.tileAt(Math.floor(nx / 16), Math.floor(e.y / 16)) === 1) { e.vx = -e.vx * 0.5; nx = e.x; }
      if (ctx.tileAt(Math.floor(e.x / 16), Math.floor(ny / 16)) === 1) { e.vy = -e.vy * 0.5; ny = e.y; }
      e.x = nx; e.y = ny;
    }
  };

  window.Actors = { kit: { rig: rig, front: front, aim: aim, beginAttack: beginAttack, groundBelow: groundBelow, turnToward: turnToward, towards: towards, edgeAhead: edgeAhead }, KINDS: KINDS, BY_ELEMENT: BY_ELEMENT, build: build, spawn: spawn, make: make, step: step, hurt: hurt, hurtBoxes: hurtBoxes, statusName: statusName, STATUS: STATUS };
})();
