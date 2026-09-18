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
    x: '#e9e6df',            // bone white
    y: '#ffd24d', Y: '#fff3b0',   // gold
    v: '#b06cff', V: '#d9b8ff',   // violet
    c: '#c4202f', C: '#ff3b4e',   // crimson
    i: '#9fd8ff', I: '#e6f6ff',   // ice
    f: '#ff8c42', F: '#ffdc9a',   // flame
    z: '#8fa3ff', Z: '#ffffff',   // storm
    u: '#4e9a52', U: '#9ae66e',   // green
    j: '#aab4c8', J: '#f4f8ff',   // quicksilver
    q: '#2fae9e', Q: '#9ff5e6',   // the tide
    l: '#ff9ecb', L: '#ffe8f4',   // glass, rose
    D: '#1b1430', G: '#7a5a1e'    // the umbral dark; old brass
  };

  var cache = {};

  // text to canvas: one character a pixel; '.' and ' ' are clear
  function art(rows, palette) {
    palette = palette || PALETTE;
    var key = rows.join('|') + (palette === PALETTE ? '' : '#' + (palette.id || (palette.p || '') + (palette.k || '')));
    if (cache[key]) return cache[key];
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

  // turn a canvas by 45 degrees clockwise, pixel for pixel, and say where a marked point went
  function rotate45(img, gx, gy) {
    var w = img.width, h = img.height, n = Math.ceil((w + h) * 0.7072) + 2;
    var tmp = blank(w, h), tg = tmp.getContext('2d', { willReadFrequently: true });
    tg.drawImage(img, 0, 0);
    var src = tg.getImageData(0, 0, w, h).data;
    var c = blank(n, n), g = c.getContext('2d'), out = g.createImageData(n, n), cx = (w - 1) / 2, cy = (h - 1) / 2, mx = (n - 1) / 2, my = (n - 1) / 2, r = 0.70710678;
    for (var ty = 0; ty < n; ty++) for (var tx = 0; tx < n; tx++) {
      var dx = tx - mx, dy = ty - my, sx = Math.round(dx * r + dy * r + cx), sy = Math.round(-dx * r + dy * r + cy);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      var si = (sy * w + sx) * 4, ti = (ty * n + tx) * 4;
      out.data[ti] = src[si]; out.data[ti + 1] = src[si + 1]; out.data[ti + 2] = src[si + 2]; out.data[ti + 3] = src[si + 3];
    }
    g.putImageData(out, 0, 0);
    var px = gx - cx, py = gy - cy;
    return { img: c, gx: Math.round(px * r - py * r + mx), gy: Math.round(px * r + py * r + my) };
  }
  // a weapon drawn pointing up, with the pixel of its grip: its three views, each with its grip
  function weaponViews(rows, gx, gy, handDrawn) {
    var up = art(rows), h = up.height, flatImg = compose(h, up.width, [{ img: up, x: 0, y: 0, rot: 1 }]);
    var set = { up: { img: up, gx: gx, gy: gy }, flat: { img: flatImg, gx: h - 1 - gy, gy: gx } };
    if (handDrawn) { set.diag = { img: art(SWORD_DIAG), gx: 1, gy: 7 }; set.flat = { img: art(SWORD_FLAT), gx: 2, gy: 2 }; }
    else set.diag = rotate45(up, gx, gy);
    return set;
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

  // the Warden's frames are 72 by 56, her body where it was in a 32 by 32 frame but moved 20 right and 20 down,
  // so that a long weapon has room on every side
  var FW = 72, FH = 56, OX = 20, OY = 20, currentWeapon = null;

  /* A skin is who is wearing the skeleton: the parts, where each hangs, where
     the hand is on the arm, and a palette of its own. The Warden's is below;
     the others are added by classes.js. Every skin makes every frame. */
  var SKINS = {
    warden: {
      parts: { head: HEAD, torso: TORSO, cloak: CLOAK, arm: ARM, leg: LEG, legBent: LEG_BENT, scarf: SCARF, scarfUp: SCARF_UP, lantern: LANTERN },
      at: { cloak: [8, 10], backLeg: [11, 21], backArm: [10, 13], lantern: [7, 19], torso: [11, 12], frontLeg: [15, 21], head: [10, 3], scarf: [4, 11], frontArm: [17, 13] },
      hand: { down: [1, 5], reach: [6, 1] }, palette: null
    }
  };
  var skin = SKINS.warden;
  function addSkin(id, def) { if (def.palette) { var pal = {}, key; for (key in PALETTE) pal[key] = PALETTE[key]; for (key in def.palette) pal[key] = def.palette[key]; pal.id = id; def.palette = pal; } SKINS[id] = def; }

  function pose(o) {
    o = o || {};
    var bob = o.bob || 0, lean = o.lean || 0, S = skin, P = S.parts, at = S.at, pal = S.palette || undefined;
    function A(rows) { return Pixels.art(rows, pal); }
    var layers = [];
    // cloak, trailing behind by `trail`
    if (P.cloak) layers.push({ img: A(P.cloak), x: at.cloak[0] - (o.trail || 0) + lean, y: at.cloak[1] + bob + (o.cloakLift || 0) });
    // back leg
    var back = o.back || { x: 0, y: 0 };
    layers.push({ img: A(back.bent ? P.legBent : P.leg), x: at.backLeg[0] + back.x, y: at.backLeg[1] + back.y + bob });
    // back arm, with the lantern hanging from it
    var ba = o.backArm || { x: 0, y: 0 };
    layers.push({ img: A(P.arm), x: at.backArm[0] + ba.x + lean, y: at.backArm[1] + ba.y + bob, rot: ba.rot || 0 });
    var lant = o.lantern || { x: 0, y: 0 };
    layers.push({ img: A(P.lantern), x: at.lantern[0] + ba.x + lant.x + lean, y: at.lantern[1] + ba.y + lant.y + bob });
    // torso
    layers.push({ img: A(P.torso), x: at.torso[0] + lean, y: at.torso[1] + bob });
    // front leg
    var front = o.front || { x: 0, y: 0 };
    layers.push({ img: A(front.bent ? P.legBent : P.leg), x: at.frontLeg[0] + front.x, y: at.frontLeg[1] + front.y + bob });
    // the skirt of a long coat, over the tops of the legs
    if (P.skirt) layers.push({ img: A(P.skirt), x: at.skirt[0] + lean + Math.round(((front.x || 0) + (back.x || 0)) / 4), y: at.skirt[1] + bob });
    // head
    layers.push({ img: A(P.head), x: at.head[0] + lean + (o.headX || 0), y: at.head[1] + bob + (o.headY || 0) });
    // scarf (or ribbons), streaming back
    var sc = o.scarf || { x: 0, y: 0 };
    if (P.scarf) layers.push({ img: A(sc.up ? P.scarfUp : P.scarf), x: at.scarf[0] + sc.x + lean, y: at.scarf[1] + sc.y + bob });
    if (P.ribbon) layers.push({ img: A(sc.up ? P.ribbonUp || P.ribbon : P.ribbon), x: at.ribbon[0] + Math.round(sc.x * 1.5) + lean, y: at.ribbon[1] + sc.y + bob + (sc.up ? -2 : 0) });
    // a pauldron or the like, over the shoulder
    if (P.over) layers.push({ img: A(P.over), x: at.over[0] + lean, y: at.over[1] + bob });
    // front arm and the weapon it holds
    var fa = o.frontArm || { x: 0, y: 0 };
    layers.push({ img: A(P.arm), x: at.frontArm[0] + fa.x + lean, y: at.frontArm[1] + fa.y + bob, rot: fa.rot || 0 });
    var sw = o.sword;
    if (sw !== null && currentWeapon) {
      sw = sw || { kind: 'up', x: 0, y: 0 };
      var view = currentWeapon[sw.kind === 'flat' ? 'flat' : sw.kind === 'diag' ? 'diag' : 'up'], img = view.img, rot = sw.rot || 0;
      var iw = img.width, ih = img.height, rgx = view.gx, rgy = view.gy;
      if (rot === 1) { rgx = ih - 1 - view.gy; rgy = view.gx; } else if (rot === 2) { rgx = iw - 1 - view.gx; rgy = ih - 1 - view.gy; } else if (rot === 3) { rgx = view.gy; rgy = iw - 1 - view.gx; }
      if (sw.flip) rgx = (rot % 2 ? ih : iw) - 1 - rgx;
      // the grip sits in the front hand: the bottom of the arm, or its far end when the arm reaches out
      var reaching = fa.rot === 3, hand = reaching ? S.hand.reach : S.hand.down, hx = at.frontArm[0] + fa.x + lean + hand[0], hy = at.frontArm[1] + fa.y + bob + hand[1];
      layers.push({ img: img, x: hx - rgx + (sw.x || 0), y: hy - rgy + (sw.y || 0), rot: rot, flip: sw.flip });
    }
    for (var n = 0; n < layers.length; n++) { layers[n].x += OX; layers[n].y += OY; }
    return Pixels.compose(FW, FH, layers);
  }

  // lying on the ground, composed by hand: the cloak spread, the body turned, the lantern set down
  function lying(raise) {
    var P = skin.parts, pal = skin.palette || undefined, flat = currentWeapon ? currentWeapon.flat.img : Pixels.art(SWORD_FLAT);
    function A(rows) { return Pixels.art(rows, pal); }
    var layers = [
      P.cloak ? { img: A(P.cloak), x: 3, y: 18 - raise, rot: 1 } : null,
      { img: A(P.leg), x: 1, y: 25 - raise, rot: 3 },
      { img: A(P.leg), x: 3, y: 27 - raise, rot: 3 },
      { img: A(P.torso), x: 11, y: 22 - raise, rot: 1 },
      { img: A(P.arm), x: 12, y: 25 - raise, rot: 1 },
      { img: A(P.head), x: 20, y: 31 - raise - A(P.head).width, rot: 3 },
      P.scarf ? { img: A(P.scarf), x: 16, y: 18 - raise } : null,
      { img: flat, x: 18, y: 31 - flat.height },
      { img: A(P.lantern), x: 26, y: 23 }
    ].filter(Boolean);
    for (var n = 0; n < layers.length; n++) { layers[n].x += OX; layers[n].y += OY; }
    return Pixels.compose(FW, FH, layers);
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

  function heroFrames() {
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
      pose({ bob: 1, lean: 0, frontArm: { x: 1, y: 3 }, sword: { kind: 'diag', rot: 1 }, front: { x: 1, y: 1, bent: true }, back: { x: -1, y: 1, bent: true } }),
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
      F.cast.push(pose({ bob: k === 2 ? -1 : 0, backArm: { x: -1, y: -6, rot: 2 }, lantern: { x: -2, y: lift }, frontArm: { x: 0, y: 2 }, sword: { kind: 'diag', rot: 1 }, scarf: { x: -1, y: -1 }, front: { x: 1, y: 0 }, back: { x: -1, y: 0 } }));
    }
    // hurt: thrown back
    F.hurt = [
      pose({ lean: -2, headX: -1, headY: 1, frontArm: { x: 2, y: -2 }, backArm: { x: -2, y: -2 }, scarf: { x: 2, y: -1 }, sword: { kind: 'up', x: 2, y: 1 }, front: { x: 2, y: 0 }, back: { x: -2, y: 0 } }),
      pose({ lean: -3, headX: -1, headY: 1, frontArm: { x: 3, y: -3 }, backArm: { x: -3, y: -3 }, scarf: { x: 3, y: -2 }, sword: { kind: 'up', x: 3, y: 2 }, front: { x: 3, y: 0 }, back: { x: -3, y: 0 } })
    ];
    // a heavy blow: the weapon carried up and behind, then brought down in front
    F.heavy1 = [
      pose({ lean: -2, frontArm: { x: -2, y: -3 }, sword: { kind: 'diag', flip: true }, scarf: { x: 1, y: 0 }, front: { x: -1, y: 0 } }),
      pose({ bob: -1, lean: -2, frontArm: { x: -2, y: -4 }, sword: { kind: 'diag', flip: true, y: -1 }, scarf: { x: 1, y: 1 }, front: { x: -1, y: 0 } }),
      pose({ bob: 1, lean: 3, trail: 3, frontArm: { x: 2, y: 3, rot: 3 }, sword: { kind: 'flat', y: 2 }, scarf: { x: -3, y: 0 }, front: { x: 3, y: 1 }, back: { x: -2, y: 1 } }),
      pose({ bob: 2, lean: 3, trail: 2, frontArm: { x: 2, y: 4, rot: 3 }, sword: { kind: 'flat', y: 3 }, scarf: { x: -2, y: 1 }, front: { x: 3, y: 2, bent: true }, back: { x: -2, y: 2, bent: true } }),
      pose({ lean: 1, frontArm: { x: 1, y: 2 }, sword: { kind: 'diag', rot: 1 }, scarf: { x: -1, y: 0 } })
    ];
    // the second: a crouch, a rise onto the toes, and everything brought down
    F.heavy2 = [
      pose({ bob: 2, lean: -1, frontArm: { x: -1, y: -2 }, sword: { kind: 'up', y: -2 }, front: { x: 0, y: 2, bent: true }, back: { x: -2, y: 2, bent: true }, scarf: { x: 1, y: 0 } }),
      pose({ bob: -3, lean: -2, frontArm: { x: -2, y: -5 }, sword: { kind: 'diag', flip: true, y: -2 }, front: { x: 1, y: -2 }, back: { x: -1, y: -1 }, scarf: { x: 0, y: 3 }, cloakLift: 2 }),
      pose({ bob: 2, lean: 4, trail: 4, frontArm: { x: 3, y: 4, rot: 3 }, sword: { kind: 'flat', y: 3 }, scarf: { x: -4, y: -1 }, front: { x: 4, y: 2, bent: true }, back: { x: -3, y: 2, bent: true }, cloakLift: -2 }),
      pose({ bob: 3, lean: 4, trail: 3, frontArm: { x: 3, y: 5, rot: 3 }, sword: { kind: 'flat', y: 4 }, scarf: { x: -3, y: 0 }, front: { x: 4, y: 3, bent: true }, back: { x: -3, y: 3, bent: true } }),
      pose({ bob: 1, lean: 1, frontArm: { x: 1, y: 2 }, sword: { kind: 'diag', rot: 1 }, scarf: { x: -1, y: 0 } })
    ];
    // a bow: held out upright, the string hand drawn back, and let go
    F.bow = [
      pose({ lean: -1, frontArm: { x: 1, y: 0, rot: 3 }, sword: { kind: 'up' }, backArm: { x: -1, y: -1 }, scarf: { x: 0, y: 0 } }),
      pose({ lean: -2, frontArm: { x: 1, y: 0, rot: 3 }, sword: { kind: 'up' }, backArm: { x: -3, y: -1 }, lantern: { x: -1, y: 0 }, scarf: { x: 1, y: 0 }, back: { x: -1, y: 0 } }),
      pose({ lean: 1, frontArm: { x: 2, y: 0, rot: 3 }, sword: { kind: 'up' }, backArm: { x: 0, y: 0 }, scarf: { x: -2, y: -1 }, front: { x: 1, y: 0 } })
    ];
    // death: to the knees, then down, the lantern set by the hand
    F.death = [
      F.hurt[1],
      pose({ bob: 4, front: { x: 1, y: 4, bent: true }, back: { x: -2, y: 4, bent: true }, sword: { kind: 'diag', rot: 1 }, frontArm: { x: 0, y: 2 }, headY: 1 }),
      pose({ bob: 6, front: { x: 1, y: 6, bent: true }, back: { x: -2, y: 6, bent: true }, sword: { kind: 'diag', rot: 1 }, frontArm: { x: 0, y: 2 }, headY: 2, headX: 1 }),
      pose({ bob: 8, front: { x: 1, y: 8, bent: true }, back: { x: -2, y: 8, bent: true }, sword: null, frontArm: { x: 1, y: 3 }, backArm: { x: -1, y: 3 }, lantern: { x: 0, y: 2 }, headY: 4, headX: 2 }),
      lying(1),
      lying(0)
    ];
    if (skin.more) skin.more(F, pose, { FW: FW, FH: FH, OX: OX, OY: OY });
    return F;
  }

  // frames, built once for each of them and each weapon they hold
  var hero = {
    sets: {}, anchor: { x: 16 + OX, y: 31 + OY }, width: FW, height: FH,
    build: function (who, id, viewSet) {
      who = SKINS[who] ? who : 'warden'; id = id || 'shortsword';
      var key = who + ':' + id;
      if (hero.sets[key]) return hero.sets[key];
      skin = SKINS[who]; currentWeapon = viewSet || weaponViews(SWORD, 1, 11, true);
      hero.sets[key] = heroFrames();
      skin = SKINS.warden;
      return hero.sets[key];
    }
  };
  // the old name, for whoever still asks for the Warden alone
  var warden = { anchor: hero.anchor, width: FW, height: FH, build: function (id, viewSet) { return hero.build('warden', id, viewSet); } };

  window.Pixels = { PALETTE: PALETTE, art: art, compose: compose, flipH: flipH, silhouette: silhouette, count: count, blank: blank, warden: warden, hero: hero, addSkin: addSkin, weaponViews: weaponViews, DUMMY: DUMMY };
})();
