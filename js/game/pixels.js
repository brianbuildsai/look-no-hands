/* pixels.js: the sprite compiler for room 36, Undercroft, and the art itself.

   There are no image files in this building. Every sprite is written here as
   text, one character a pixel, one letter a colour, and compiled to a canvas
   when the page opens. Characters are assembled from parts (a head, a torso,
   a cloak, legs, arms, a sword, a lantern) placed by a pose, so that one set
   of parts gives dozens of frames that agree with each other, which is how a
   sprite stays the same creature while it runs, swings and falls. */
(function () {
  'use strict';

  var PALETTE = {
    k: '#0b0b12',            // outline
    s: '#f1c27d', S: '#c9955f',   // skin
    h: '#3d5bff', H: '#6b84ff', d: '#2438a8',   // the cloak, ultramarine
    t: '#d9d5cc', T: '#a09c93',   // tunic, bone
    b: '#3b2a24', B: '#5a4036',   // leather
    r: '#c9a44c', R: '#efd27a',   // brass
    w: '#d8d8e0', W: '#ffffff', g: '#8f8f9c',   // steel
    a: '#ffb347', A: '#ffdc9a', o: '#4a3b2a',   // the lantern, amber
    p: '#ff4f7b', P: '#ff8aa6',   // the scarf, rose
    e: '#0b0b12',            // an eye
    m: '#8f8d88', M: '#c4c1ba', n: '#5c5a56', N: '#3a3936',   // stone
    x: '#e9e6df'             // bone white
  };

  var cache = {};

  // text to canvas: one character a pixel; '.' and ' ' are clear
  function art(rows, palette) {
    var key = rows.join('|');
    if (cache[key]) return cache[key];
    palette = palette || PALETTE;
    var w = 0, h = rows.length, y, x;
    for (y = 0; y < h; y++) w = Math.max(w, rows[y].length);
    var c = document.createElement('canvas');
    c.width = Math.max(1, w); c.height = Math.max(1, h);
    var pen = c.getContext('2d');
    for (y = 0; y < h; y++) {
      for (x = 0; x < rows[y].length; x++) {
        var ch = rows[y][x];
        if (ch === '.' || ch === ' ') continue;
        pen.fillStyle = palette[ch] || '#ff00ff';
        pen.fillRect(x, y, 1, 1);
      }
    }
    cache[key] = c;
    return c;
  }

  function blank(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // lay parts on a frame: layers are { img, x, y, flip, rot } in drawing order, rot in quarter turns clockwise
  function compose(w, h, layers) {
    var c = blank(w, h), pen = c.getContext('2d');
    pen.imageSmoothingEnabled = false;
    for (var k = 0; k < layers.length; k++) {
      var L = layers[k];
      if (!L || !L.img) continue;
      pen.save();
      var iw = L.img.width, ih = L.img.height;
      if (L.rot) {
        pen.translate(L.x + (L.rot === 2 ? iw : L.rot === 1 ? ih : 0), L.y + (L.rot === 2 ? ih : L.rot === 3 ? iw : 0));
        pen.rotate(L.rot * Math.PI / 2);
        if (L.flip) { pen.translate(iw, 0); pen.scale(-1, 1); }
        pen.globalAlpha = L.alpha === undefined ? 1 : L.alpha;
        pen.drawImage(L.img, 0, 0);
      } else {
        if (L.flip) { pen.translate(L.x + iw, L.y); pen.scale(-1, 1); } else pen.translate(L.x, L.y);
        pen.globalAlpha = L.alpha === undefined ? 1 : L.alpha;
        pen.drawImage(L.img, 0, 0);
      }
      pen.restore();
    }
    return c;
  }

  function flipH(img) {
    var c = blank(img.width, img.height), pen = c.getContext('2d');
    pen.translate(img.width, 0); pen.scale(-1, 1); pen.drawImage(img, 0, 0);
    return c;
  }

  // every opaque pixel in one colour: for hit flashes and afterimages
  function silhouette(img, colour) {
    var c = blank(img.width, img.height), pen = c.getContext('2d');
    pen.drawImage(img, 0, 0);
    pen.globalCompositeOperation = 'source-in';
    pen.fillStyle = colour;
    pen.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // how many opaque pixels a frame has (for checking that nothing compiled blank)
  function count(img) {
    var d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data, n = 0;
    for (var i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  }

  /* ---- the Warden: parts ----
     Drawn facing right. The frame is 32 by 32; the feet stand on row 30 and
     the body's middle is column 15. */

  var HEAD = [
    '...kkkkk..',
    '..khhhhhk.',
    '.khhHHhhhk',
    '.khhhhhhhk',
    '.khhkkkkk.',
    '.khksssssk',
    '.khksssesk',
    '.khhksSssk',
    '..kkkksSk.',
    '.....kkk..'
  ];
  var TORSO = [
    '.kkkkkk.',
    'kttttttk',
    'kttTtttk',
    'kttttttk',
    'ktTtttTk',
    'kbbbrbbk',
    'kttttttk',
    'kTttttTk',
    '.kkkkkk.'
  ];
  var CLOAK = [
    '..kkkkkk..',
    '.khhhhhhk.',
    '.khhhhhhhk',
    'khhhdhhhhk',
    'khhhhhhhhk',
    'khhdhhhdhk',
    'khhhhhhhhk',
    'kdhhhhhhdk',
    'khhhhhhhhk',
    'kdhhhdhhhk',
    'khhhhhhhhk',
    '.kddhhhdk.',
    '.kkkkkkkk.'
  ];
  var ARM = ['kkk', 'ktk', 'ktk', 'ktk', 'ksk', 'ksk', 'kkk'];
  var LEG = ['kkkk', 'kttk', 'kttk', 'kttk', 'kbbk', 'kBbk', 'kBbk', 'kbbk', 'kkkk'];
  var LEG_BENT = ['kkkk', 'kttk', 'kttk', 'kbbk', 'kBbk', 'kkkk'];
  var SWORD = ['.W.', 'kWk', 'kwk', 'kwk', 'kwk', 'kwk', 'kwk', 'kwk', 'kwk', 'rrr', 'krk', 'kbk', 'kkk'];
  var SWORD_DIAG = [
    '......kW',
    '.....kWk',
    '....kwk.',
    '...kwk..',
    '..kwk...',
    '.rrk....',
    'krk.....',
    'kbk.....'
  ];
  var SWORD_FLAT = ['...kk.........', '.kbrkkkkkkkkk.', 'kbbrwwwwwwwwWk', '.kkrkkkkkkkkk.', '...kk.........'];
  var LANTERN = ['..kk..', '.kook.', 'kaAAak', 'kaAAak', 'kaaaak', 'kaaaak', '.kook.', '..kk..'];
  var SCARF = ['kppPpk.', '.kpppPk', '..kkkk.'];
  var SCARF_UP = ['....kpk', '..kpPpk', 'kpppkk.', '.kkk...'];

  /* ---- the Warden: poses ----
     A pose is a list of parts and where they go. Order is drawing order:
     cloak, back leg, back arm and lantern, torso, front leg, head, scarf,
     front arm and sword. Offsets are from the frame's top left. */

  function pose(o) {
    o = o || {};
    var bob = o.bob || 0, lean = o.lean || 0;
    var A = Pixels.art;
    var layers = [];
    // cloak, trailing behind by `trail`
    layers.push({ img: A(CLOAK), x: 8 - (o.trail || 0) + lean, y: 10 + bob + (o.cloakLift || 0) });
    // back leg
    var back = o.back || { x: 0, y: 0 };
    layers.push({ img: A(back.bent ? LEG_BENT : LEG), x: 11 + back.x, y: 21 + back.y + bob });
    // back arm, with the lantern hanging from it
    var ba = o.backArm || { x: 0, y: 0 };
    layers.push({ img: A(ARM), x: 10 + ba.x + lean, y: 13 + ba.y + bob, rot: ba.rot || 0 });
    var lant = o.lantern || { x: 0, y: 0 };
    layers.push({ img: A(LANTERN), x: 7 + ba.x + lant.x + lean, y: 19 + ba.y + lant.y + bob });
    // torso
    layers.push({ img: A(TORSO), x: 11 + lean, y: 12 + bob });
    // front leg
    var front = o.front || { x: 0, y: 0 };
    layers.push({ img: A(front.bent ? LEG_BENT : LEG), x: 15 + front.x, y: 21 + front.y + bob });
    // head
    layers.push({ img: A(HEAD), x: 10 + lean + (o.headX || 0), y: 3 + bob + (o.headY || 0) });
    // scarf, streaming back
    var sc = o.scarf || { x: 0, y: 0 };
    layers.push({ img: A(sc.up ? SCARF_UP : SCARF), x: 4 + sc.x + lean, y: 11 + sc.y + bob });
    // front arm and the sword it holds
    var fa = o.frontArm || { x: 0, y: 0 };
    layers.push({ img: A(ARM), x: 17 + fa.x + lean, y: 13 + fa.y + bob, rot: fa.rot || 0 });
    var sw = o.sword;
    if (sw !== null) {
      sw = sw || { kind: 'up', x: 0, y: 0 };
      var img = sw.kind === 'flat' ? A(SWORD_FLAT) : sw.kind === 'diag' ? A(SWORD_DIAG) : A(SWORD);
      // the grip sits in the front hand, which is the bottom of the front arm
      var reaching = fa.rot === 3;
      var sx = sw.kind === 'flat' ? (reaching ? 21 : 16) : 17, sy = sw.kind === 'flat' ? (reaching ? 12 : 15) : sw.kind === 'diag' ? 11 : 7;
      layers.push({ img: img, x: sx + sw.x + fa.x + lean, y: sy + sw.y + fa.y + bob, rot: sw.rot || 0, flip: sw.flip });
    }
    return Pixels.compose(32, 32, layers);
  }

  // the Warden lying on the ground, composed by hand: the cloak spread, the body turned, the lantern set down
  function lying(raise) {
    var A = Pixels.art;
    return Pixels.compose(32, 32, [
      { img: A(CLOAK), x: 3, y: 18 - raise, rot: 1 },
      { img: A(LEG), x: 1, y: 25 - raise, rot: 3 },
      { img: A(LEG), x: 3, y: 27 - raise, rot: 3 },
      { img: A(TORSO), x: 11, y: 22 - raise, rot: 1 },
      { img: A(ARM), x: 12, y: 25 - raise, rot: 1 },
      { img: A(HEAD), x: 20, y: 21 - raise, rot: 3 },
      { img: A(SCARF), x: 16, y: 18 - raise },
      { img: A(SWORD_FLAT), x: 18, y: 28 },
      { img: A(LANTERN), x: 26, y: 23 }
    ]);
  }

  // a training dummy: a sack on a post, for swinging at
  var DUMMY = [
    '....kkkk....',
    '...ktTTtk...',
    '..ktTTTTtk..',
    '..kttTTttk..',
    '..kttttttk..',
    '..kTttttTk..',
    '..kttttttk..',
    '...kttttk...',
    '....kkkk....',
    '.....kok....',
    '.....kok....',
    '.....kok....',
    '.....kok....',
    '.....kok....',
    '.....kok....',
    '....kkkkk...'
  ];

  /* ---- the Warden: frames ---- */

  function wardenFrames() {
    var F = {}, k, t;
    // idle: a slow breath, the scarf lifting, the lantern swaying
    F.idle = [];
    for (k = 0; k < 4; k++) {
      var breath = k === 1 || k === 2 ? -1 : 0;
      F.idle.push(pose({ bob: breath, scarf: { x: k === 2 ? -1 : 0, y: k === 3 ? -1 : 0 }, lantern: { x: k === 1 ? -1 : k === 3 ? 1 : 0, y: 0 } }));
    }
    // run: eight frames, legs swinging past each other, a bob at the passing, the cloak and scarf streaming
    F.run = [];
    for (k = 0; k < 8; k++) {
      t = k / 8 * Math.PI * 2;
      var swing = Math.round(Math.sin(t) * 4), lift = Math.round(Math.max(0, Math.sin(t)) * 2);
      var swingB = Math.round(Math.sin(t + Math.PI) * 4), liftB = Math.round(Math.max(0, Math.sin(t + Math.PI)) * 2);
      F.run.push(pose({
        bob: k % 4 === 1 ? -1 : k % 4 === 3 ? 0 : k % 4 === 2 ? -1 : 0,
        lean: 1,
        trail: 3,
        front: { x: swing, y: -lift, bent: lift > 1 },
        back: { x: swingB, y: -liftB, bent: liftB > 1 },
        frontArm: { x: Math.round(-Math.sin(t) * 2), y: 0 },
        backArm: { x: Math.round(Math.sin(t) * 2), y: 0 },
        scarf: { x: -2 - (k % 2), y: (k % 4 < 2 ? -1 : 0) },
        lantern: { x: Math.round(Math.sin(t) * 1.5), y: 0 },
        sword: { kind: 'up', x: 0, y: 0 }
      }));
    }
    // jump: rising, legs tucking; fall: legs apart, cloak up; land: a crouch
    F.jump = [
      pose({ bob: 0, front: { x: 2, y: -2, bent: true }, back: { x: -2, y: 0 }, scarf: { x: 0, y: 2 }, cloakLift: 1, frontArm: { x: 0, y: -1 } }),
      pose({ bob: -1, front: { x: 3, y: -4, bent: true }, back: { x: -1, y: -2, bent: true }, scarf: { x: 0, y: 3 }, cloakLift: 2, frontArm: { x: 0, y: -2 }, backArm: { x: 0, y: -1 } })
    ];
    F.fall = [
      pose({ bob: 0, front: { x: 3, y: -1 }, back: { x: -3, y: 0 }, scarf: { x: -1, y: -3, up: true }, cloakLift: -3, frontArm: { x: 1, y: -3 }, backArm: { x: -1, y: -3 }, lantern: { x: 0, y: -2 } }),
      pose({ bob: 0, front: { x: 4, y: 0 }, back: { x: -2, y: 0 }, scarf: { x: -1, y: -4, up: true }, cloakLift: -4, frontArm: { x: 1, y: -4 }, backArm: { x: -1, y: -4 }, lantern: { x: 0, y: -3 } })
    ];
    F.land = [
      pose({ bob: 3, front: { x: 4, y: 3, bent: true }, back: { x: -4, y: 3, bent: true }, scarf: { x: -1, y: 1 }, cloakLift: 2, frontArm: { x: 1, y: 1 }, backArm: { x: -1, y: 1 } }),
      pose({ bob: 1, front: { x: 2, y: 1, bent: true }, back: { x: -2, y: 1, bent: true }, scarf: { x: 0, y: 0 } })
    ];
    // attack one: a level cut. Wind up behind, sweep through, follow, recover
    F.attack1 = [
      pose({ lean: -1, frontArm: { x: -2, y: 0 }, sword: { kind: 'up', x: -3, y: -2 }, scarf: { x: 1, y: 0 }, front: { x: -1, y: 0 } }),
      pose({ lean: 2, trail: 2, frontArm: { x: 1, y: 2, rot: 3 }, sword: { kind: 'flat', x: 0, y: 0 }, scarf: { x: -2, y: 0 }, front: { x: 2, y: 0 } }),
      pose({ lean: 3, trail: 3, frontArm: { x: 2, y: 3, rot: 3 }, sword: { kind: 'flat', x: 1, y: 0 }, scarf: { x: -3, y: 0 }, front: { x: 3, y: 0 }, back: { x: -2, y: 0 } }),
      pose({ lean: 1, trail: 1, frontArm: { x: 1, y: 1 }, sword: { kind: 'diag', x: 0, y: 0 }, scarf: { x: -1, y: 0 } })
    ];
    // attack two: a rising cut from low to high
    F.attack2 = [
      pose({ bob: 1, lean: 0, frontArm: { x: 1, y: 3 }, sword: { kind: 'diag', rot: 1, x: -2, y: 5 }, front: { x: 1, y: 1, bent: true }, back: { x: -1, y: 1, bent: true } }),
      pose({ lean: 1, trail: 2, frontArm: { x: 1, y: -1, rot: 3 }, sword: { kind: 'flat', x: 0, y: -1 }, scarf: { x: -2, y: 1 } }),
      pose({ bob: -1, lean: 1, trail: 2, frontArm: { x: 2, y: -3 }, sword: { kind: 'diag', x: 4, y: -7 }, scarf: { x: -2, y: 2 }, front: { x: 1, y: -1 } }),
      pose({ lean: 0, frontArm: { x: 0, y: -1 }, sword: { kind: 'up', x: 1, y: -2 } })
    ];
    // attack three: a thrust, from a crouch to a lunge
    F.attack3 = [
      pose({ bob: 2, lean: -1, frontArm: { x: -3, y: 1 }, sword: { kind: 'flat', x: -6, y: -1 }, front: { x: 0, y: 2, bent: true }, back: { x: -2, y: 2, bent: true }, scarf: { x: 1, y: 0 } }),
      pose({ lean: 3, trail: 4, frontArm: { x: 3, y: 1, rot: 3 }, sword: { kind: 'flat', x: 1, y: 0 }, front: { x: 4, y: 0 }, back: { x: -3, y: 0 }, scarf: { x: -3, y: 0 } }),
      pose({ lean: 4, trail: 5, frontArm: { x: 4, y: 1, rot: 3 }, sword: { kind: 'flat', x: 2, y: 0 }, front: { x: 5, y: 0 }, back: { x: -4, y: 0 }, scarf: { x: -4, y: -1 } }),
      pose({ bob: 1, lean: 4, trail: 5, frontArm: { x: 4, y: 2, rot: 3 }, sword: { kind: 'flat', x: 2, y: 0 }, front: { x: 5, y: 1 }, back: { x: -4, y: 1 }, scarf: { x: -4, y: 0 } }),
      pose({ lean: 1, trail: 1, frontArm: { x: 1, y: 1 }, sword: { kind: 'diag', x: 1, y: 0 } })
    ];
    // dash: low and long, the cloak and scarf flat out behind
    F.dash = [
      pose({ lean: 3, trail: 5, cloakLift: -1, front: { x: 5, y: 0, bent: true }, back: { x: -4, y: -1 }, scarf: { x: -4, y: -1 }, sword: { kind: 'diag', x: -2, y: 2 }, frontArm: { x: -1, y: 1 }, backArm: { x: -2, y: 0 } }),
      pose({ bob: -1, lean: 3, trail: 6, cloakLift: -2, front: { x: 6, y: 0, bent: true }, back: { x: -5, y: -1, bent: true }, scarf: { x: -5, y: -2 }, sword: { kind: 'diag', x: -2, y: 2 }, frontArm: { x: -1, y: 1 }, backArm: { x: -2, y: 0 } })
    ];
    // cast: the lantern raised high in the back hand, the sword lowered
    F.cast = [];
    for (k = 0; k < 5; k++) {
      var lift = [-8, -11, -13, -12, -10][k];
      F.cast.push(pose({ bob: k === 2 ? -1 : 0, backArm: { x: -1, y: -6, rot: 2 }, lantern: { x: -2, y: lift }, frontArm: { x: 0, y: 2 }, sword: { kind: 'diag', rot: 1, x: -1, y: 5 }, scarf: { x: -1, y: -1 }, front: { x: 1, y: 0 }, back: { x: -1, y: 0 } }));
    }
    // hurt: thrown back
    F.hurt = [
      pose({ lean: -2, headX: -1, headY: 1, frontArm: { x: 2, y: -2 }, backArm: { x: -2, y: -2 }, scarf: { x: 2, y: -1 }, sword: { kind: 'up', x: 2, y: 1 }, front: { x: 2, y: 0 }, back: { x: -2, y: 0 } }),
      pose({ lean: -3, headX: -1, headY: 1, frontArm: { x: 3, y: -3 }, backArm: { x: -3, y: -3 }, scarf: { x: 3, y: -2 }, sword: { kind: 'up', x: 3, y: 2 }, front: { x: 3, y: 0 }, back: { x: -3, y: 0 } })
    ];
    // death: to the knees, then down, the lantern set by the hand
    F.death = [
      F.hurt[1],
      pose({ bob: 4, front: { x: 1, y: 4, bent: true }, back: { x: -2, y: 4, bent: true }, sword: { kind: 'diag', rot: 1, x: -1, y: 6 }, frontArm: { x: 0, y: 2 }, headY: 1 }),
      pose({ bob: 6, front: { x: 1, y: 6, bent: true }, back: { x: -2, y: 6, bent: true }, sword: { kind: 'diag', rot: 1, x: -1, y: 6 }, frontArm: { x: 0, y: 2 }, headY: 2, headX: 1 }),
      pose({ bob: 8, front: { x: 1, y: 8, bent: true }, back: { x: -2, y: 8, bent: true }, sword: null, frontArm: { x: 1, y: 3 }, backArm: { x: -1, y: 3 }, lantern: { x: 0, y: 2 }, headY: 4, headX: 2 }),
      lying(1),
      lying(0)
    ];
    return F;
  }

  var warden = { frames: null, build: function () { if (!warden.frames) warden.frames = wardenFrames(); return warden.frames; } };

  window.Pixels = { PALETTE: PALETTE, art: art, compose: compose, flipH: flipH, silhouette: silhouette, count: count, blank: blank, warden: warden, DUMMY: DUMMY };
})();
