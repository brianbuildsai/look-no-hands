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
  var SWORD_FLAT = ['kkkkkkkkkkrkk', 'bwwwwwwwwwrWW', 'kkkkkkkkkkrkk'];
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
      var sx = sw.kind === 'flat' ? 20 : sw.kind === 'diag' ? 19 : 18, sy = sw.kind === 'flat' ? 16 : sw.kind === 'diag' ? 10 : 5;
      layers.push({ img: img, x: sx + sw.x + fa.x + lean, y: sy + sw.y + fa.y + bob, rot: sw.rot || 0, flip: sw.flip });
    }
    return Pixels.compose(32, 32, layers);
  }

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
    /* [warden-more] */
    return F;
  }

  var warden = { frames: null, build: function () { if (!warden.frames) warden.frames = wardenFrames(); return warden.frames; } };

  window.Pixels = { PALETTE: PALETTE, art: art, compose: compose, flipH: flipH, silhouette: silhouette, count: count, blank: blank, warden: warden };
})();
