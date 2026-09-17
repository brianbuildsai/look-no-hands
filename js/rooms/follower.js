/* A Follower — room 22.

   A many-legged thing that follows the visitor round the room and walks
   properly while it does. There is no animation in it: no drawn frames, no
   recorded motion. There are four small rules.

     - The head turns toward where it wants to go, no faster than a head can,
       and moves forward. Each joint of the spine is dragged along behind the
       one in front at a fixed distance.
     - Each foot stays planted where it is. Its leg is solved backwards from
       that (two bones, so it is the cosine rule: "inverse kinematics").
     - When the body has moved so far that a planted foot is too far from
       where it would like to be, that foot steps, to a little ahead of where
       it would like to be, because the body is still moving.
     - A foot only steps if its neighbours are on the ground.

   The walking is what those add up to. The wave that runs along the legs of
   a centipede comes out of the last rule on its own. */
(function () {
  'use strict';

  Gallery.register('follower', function (env) {
    var canvas = env.canvas;
    var size = env.size;
    var pen = canvas.getContext('2d');
    if (!pen) {
      env.fail('This work needs a canvas to draw on, and this browser would not provide one. The other rooms still run.');
      return null;
    }

    var kind = null;                 // the species: proportions, all in units of one joint of spine
    var spine = [];                  // joints, head first: { x, y }
    var legs = [];                   // { joint, side, foot: {x,y}, from, to, t (0..1 while stepping, else -1), knee: {x,y} }
    var feelers = [[], []];
    var prints = [];                 // where feet have been lately
    var head = { heading: 0, speed: 0 };
    var goal = { x: 0, y: 0 }, called = null, sinceCalled = 99, present = false;
    var clock = 0, steps = 0, walked = 0, unit = 12, pairs = 8;
    var seed = 22;
    function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    function between(a, b) { return a + (b - a) * random(); }

    /* ---- the body ---- */

    function species() {
      kind = {
        thigh: between(2.0, 3.1), shin: between(2.6, 4.0),      // leg bones
        girth: between(0.9, 1.5), taper: between(0.5, 1.5),   // how wide the body is at the head, and how it narrows
        feeler: between(2.5, 6.5), tails: random() < 0.6 ? between(1.5, 5) : 0,
        pace: between(150, 250), sway: between(0.06, 0.2),
        every: random() < 0.75 ? 2 : 3                          // a pair of legs every so many joints
      };
    }

    function halfWidth(i) {
      var t = i / (spine.length - 1);
      // a head, a neck, a body that swells a little and then tapers to a point
      var body = Math.pow(Math.sin(Math.min(1, t * 1.15 + 0.12) * Math.PI), kind.taper * 0.6 + 0.3);
      return unit * kind.girth * (i === 0 ? 0.95 : i === 1 ? 0.6 : 0.35 + 0.75 * body);
    }

    function assemble() {
      unit = size.w >= 900 ? (pairs > 14 ? 13 : 17) : (pairs > 12 ? 7.5 : 10);        // the long ones are made of smaller pieces, to fit the room
      var joints = 3 + pairs * kind.every + 3, x = size.w * (size.w >= 900 ? 0.62 : 0.5), y = size.h * 0.55, i, k;
      spine = [];
      for (i = 0; i < joints; i++) spine.push({ x: x - i * unit, y: y });
      head.heading = 0; head.speed = 0;
      legs = [];
      for (k = 0; k < pairs; k++) {
        for (var side = -1; side <= 1; side += 2) {
          var leg = { joint: 2 + k * kind.every, side: side, pair: k, foot: { x: 0, y: 0 }, from: null, to: null, t: -1, knee: { x: 0, y: 0 }, lift: 0 };
          var rest = wish(leg, 0);
          leg.foot.x = rest.x; leg.foot.y = rest.y;
          legs.push(leg);
        }
      }
      feelers = [[], []];
      for (k = 0; k < 2; k++) for (i = 0; i < 7; i++) feelers[k].push({ x: x + i * unit * 0.5, y: y });
      prints = [];
      goal.x = x + 200; goal.y = y;
      env.live('legs', legs.length);
    }

    function forward(i) {
      var a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)];
      var dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: dx / d, y: dy / d };
    }

    // where a foot would like to be: out to the side of its joint, and a little ahead when the body is moving
    function wish(leg, lead) {
      var j = spine[leg.joint], f = forward(leg.joint);
      var reach = unit * (kind.thigh + kind.shin) * 0.62;
      // legs toward the back splay backwards, as they do
      var rake = (leg.pair / Math.max(1, pairs - 1) - 0.35) * 0.55;
      var sx = -f.y * leg.side, sy = f.x * leg.side;
      return { x: j.x + (sx - f.x * rake) * reach + f.x * lead, y: j.y + (sy - f.y * rake) * reach + f.y * lead };
    }

    function grounded(leg) { return leg.t < 0; }

    function walk(dt) {
      var i, k;
      // --- the head: turn toward the goal and go
      var dx = goal.x - spine[0].x, dy = goal.y - spine[0].y, far = Math.sqrt(dx * dx + dy * dy);
      var want = Math.atan2(dy, dx), turn = want - head.heading;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      var eager = Gallery.clamp((far - unit * 2.5) / (unit * 12), 0, 1);
      var hurry = called && sinceCalled < 2.5 ? 1.5 : 1;
      head.speed += (kind.pace * eager * hurry * (unit / 13) - head.speed) * Math.min(1, dt * 3.5);
      head.heading += Gallery.clamp(turn, -1, 1) * Math.min(1, dt * 3.2) * (0.35 + 0.65 * eager);
      var wiggle = Math.sin(clock * (4 + head.speed * 0.02)) * kind.sway * Math.min(1, head.speed / 60);
      var hx = Math.cos(head.heading + wiggle), hy = Math.sin(head.heading + wiggle);
      spine[0].x += hx * head.speed * dt; spine[0].y += hy * head.speed * dt;
      walked += head.speed * dt;

      // --- the spine: each joint is dragged behind the one in front, and will not bend too sharply
      for (i = 1; i < spine.length; i++) {
        var a = spine[i - 1], b = spine[i];
        var bx = b.x - a.x, by = b.y - a.y, d = Math.sqrt(bx * bx + by * by) || 1;
        bx /= d; by /= d;
        if (i > 1) {
          var p = spine[i - 2], px = a.x - p.x, py = a.y - p.y, pd = Math.sqrt(px * px + py * py) || 1;
          px /= pd; py /= pd;
          // (bx, by) points backwards along the body; (px, py) is the way the last bone points, which is also backwards
          var cross = px * by - py * bx, dot = px * bx + py * by, limit = 0.3;
          var angle = Math.atan2(cross, dot);
          if (Math.abs(angle) > limit) {
            var fix = (angle > 0 ? limit : -limit), c = Math.cos(fix), s = Math.sin(fix);
            bx = px * c - py * s; by = px * s + py * c;
          }
        }
        b.x = a.x + bx * unit; b.y = a.y + by * unit;
      }

      // --- the feet
      var stride = unit * (kind.thigh + kind.shin) * 0.42, moving = head.speed > 8;
      for (k = 0; k < legs.length; k++) {
        var leg = legs[k];
        if (leg.t >= 0) {
          leg.t += dt / 0.13;
          var e = Math.min(1, leg.t), ease = e * e * (3 - 2 * e);
          leg.foot.x = leg.from.x + (leg.to.x - leg.from.x) * ease;
          leg.foot.y = leg.from.y + (leg.to.y - leg.from.y) * ease;
          leg.lift = Math.sin(e * Math.PI);
          if (e >= 1) { leg.t = -1; leg.lift = 0; steps++; prints.push({ x: leg.foot.x, y: leg.foot.y, born: clock }); if (prints.length > 260) prints.shift(); }
          continue;
        }
        var home = wish(leg, moving ? stride * 0.55 : 0);
        var off = Math.sqrt((home.x - leg.foot.x) * (home.x - leg.foot.x) + (home.y - leg.foot.y) * (home.y - leg.foot.y));
        if (off < stride * (moving ? 1 : 0.35)) continue;
        // the neighbours: the other foot of this pair, and the feet in front and behind on this side
        var free = off > stride * 2.2;                              // too far to wait any longer
        if (!free) {
          free = true;
          for (var n = 0; n < legs.length; n++) {
            var other = legs[n];
            if (other === leg || grounded(other)) continue;
            if (other.pair === leg.pair || (other.side === leg.side && Math.abs(other.pair - leg.pair) === 1)) { free = false; break; }
          }
        }
        if (free) { leg.from = { x: leg.foot.x, y: leg.foot.y }; leg.to = home; leg.t = 0; }
      }

      // --- the legs themselves, solved backwards from foot to hip
      for (k = 0; k < legs.length; k++) {
        var l = legs[k], hip = spine[l.joint], w = halfWidth(l.joint), f = forward(l.joint);
        var hipX = hip.x - f.y * l.side * w * 0.8, hipY = hip.y + f.x * l.side * w * 0.8;
        var tx = l.foot.x - hipX, ty = l.foot.y - hipY, L1 = unit * kind.thigh, L2 = unit * kind.shin;
        var span = Gallery.clamp(Math.sqrt(tx * tx + ty * ty), Math.abs(L1 - L2) + 0.5, L1 + L2 - 0.5);
        var base = Math.atan2(ty, tx), bend = Math.acos(Gallery.clamp((L1 * L1 + span * span - L2 * L2) / (2 * L1 * span), -1, 1));
        var ka = base + bend * l.side;                               // knees point forward, on both sides
        l.hip = { x: hipX, y: hipY };
        l.knee.x = hipX + Math.cos(ka) * L1; l.knee.y = hipY + Math.sin(ka) * L1;
        // a foot that cannot be reached (after a sudden turn) is dragged in
        var fx = l.foot.x - l.knee.x, fy = l.foot.y - l.knee.y, fd = Math.sqrt(fx * fx + fy * fy);
        if (fd > L2 * 1.02 && grounded(l)) { l.foot.x = l.knee.x + fx / fd * L2; l.foot.y = l.knee.y + fy / fd * L2; }
      }

      // --- feelers trail from the head and swing as it turns
      for (k = 0; k < 2; k++) {
        var sideways = k ? 1 : -1, chain = feelers[k], piece = unit * kind.feeler / chain.length;
        var rootA = head.heading + wiggle + sideways * (0.5 + 0.12 * Math.sin(clock * 2.3 + k * 2));
        chain[0].x = spine[0].x + hx * unit * 0.8; chain[0].y = spine[0].y + hy * unit * 0.8;
        for (i = 1; i < chain.length; i++) {
          var aim = { x: chain[i - 1].x + Math.cos(rootA) * piece, y: chain[i - 1].y + Math.sin(rootA) * piece };
          // each piece is pulled toward pointing the way the root points, but lags, so the feeler whips
          chain[i].x += (aim.x - chain[i].x) * Math.min(1, dt * (22 - i * 2.4));
          chain[i].y += (aim.y - chain[i].y) * Math.min(1, dt * (22 - i * 2.4));
          var qx = chain[i].x - chain[i - 1].x, qy = chain[i].y - chain[i - 1].y, qd = Math.sqrt(qx * qx + qy * qy) || 1;
          chain[i].x = chain[i - 1].x + qx / qd * piece; chain[i].y = chain[i - 1].y + qy / qd * piece;
        }
      }
    }

    // left alone it wanders; called, it comes
    function decide(dt) {
      sinceCalled += dt;
      if (called && (present || sinceCalled < 5)) { goal.x = called.x; goal.y = called.y; return; }
      var wide = size.w >= 900, t = clock * 0.16;
      var cx = size.w * (wide ? 0.66 : 0.5), cy = size.h * 0.52, rx = size.w * (wide ? 0.27 : 0.36), ry = size.h * 0.34;
      goal.x = cx + Math.sin(t * 1.3 + 0.4) * rx; goal.y = cy + Math.sin(t * 2.1) * ry;
    }

    /* ---- drawing ---- */

    function render() {
      var ratio = canvas.width / size.w, i, k;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, size.w, size.h);
      pen.lineCap = 'round'; pen.lineJoin = 'round';

      // where it has trodden
      for (k = 0; k < prints.length; k++) {
        var age = clock - prints[k].born, fade = Math.max(0, 1 - age / 7);
        if (fade <= 0) continue;
        pen.fillStyle = 'rgba(96,124,255,' + (fade * 0.5).toFixed(3) + ')';
        pen.beginPath(); pen.arc(prints[k].x, prints[k].y, 1.6, 0, 6.2832); pen.fill();
      }
      // where it is being called to
      if (called && sinceCalled < 2) {
        var ring = Math.min(1, sinceCalled * 1.5);
        pen.strokeStyle = 'rgba(255,179,71,' + (0.7 * (1 - sinceCalled / 2)).toFixed(3) + ')';
        pen.lineWidth = 1;
        pen.beginPath(); pen.arc(called.x, called.y, 4 + ring * 14, 0, 6.2832); pen.stroke();
      }

      // legs: thigh, shin, a knee, a foot. A lifted foot is drawn a little up and away from its shadow.
      pen.strokeStyle = 'rgba(233,230,223,0.85)';
      pen.lineWidth = 1.3;
      pen.beginPath();
      for (k = 0; k < legs.length; k++) {
        var l = legs[k];
        if (!l.hip) continue;
        pen.moveTo(l.hip.x, l.hip.y); pen.lineTo(l.knee.x, l.knee.y); pen.lineTo(l.foot.x, l.foot.y - l.lift * 5);
      }
      pen.stroke();
      for (k = 0; k < legs.length; k++) {
        l = legs[k];
        if (!l.hip) continue;
        if (l.lift > 0.02) { pen.fillStyle = 'rgba(233,230,223,0.16)'; pen.beginPath(); pen.arc(l.foot.x, l.foot.y, 2.4, 0, 6.2832); pen.fill(); }
        pen.fillStyle = '#e9e6df';
        pen.beginPath(); pen.arc(l.foot.x, l.foot.y - l.lift * 5, 2.3 + l.lift * 0.9, 0, 6.2832); pen.fill();
        pen.beginPath(); pen.arc(l.knee.x, l.knee.y, 1.6, 0, 6.2832); pen.fill();
      }

      // the body: an outline down both sides, a rib at every joint, and the spine itself
      var left = [], right = [];
      for (i = 0; i < spine.length; i++) {
        var f = forward(i), w = halfWidth(i);
        left.push({ x: spine[i].x - f.y * w, y: spine[i].y + f.x * w });
        right.push({ x: spine[i].x + f.y * w, y: spine[i].y - f.x * w });
      }
      var nose = forward(0);
      pen.fillStyle = '#000';
      pen.strokeStyle = 'rgba(233,230,223,0.95)';
      pen.lineWidth = 1.3;
      pen.beginPath();
      pen.moveTo(spine[0].x + nose.x * unit * 0.9, spine[0].y + nose.y * unit * 0.9);
      for (i = 0; i < left.length; i++) pen.lineTo(left[i].x, left[i].y);
      for (i = right.length - 1; i >= 0; i--) pen.lineTo(right[i].x, right[i].y);
      pen.closePath();
      pen.fill(); pen.stroke();
      pen.strokeStyle = 'rgba(233,230,223,0.4)';
      pen.lineWidth = 1;
      pen.beginPath();
      for (i = 2; i < spine.length - 1; i++) { pen.moveTo(left[i].x, left[i].y); pen.lineTo(right[i].x, right[i].y); }
      pen.moveTo(spine[1].x, spine[1].y);
      for (i = 2; i < spine.length; i++) pen.lineTo(spine[i].x, spine[i].y);
      pen.stroke();

      // two tails, if this kind has them
      if (kind.tails) {
        var end = spine[spine.length - 1], back = forward(spine.length - 1);
        pen.strokeStyle = 'rgba(233,230,223,0.8)';
        pen.beginPath();
        for (k = -1; k <= 1; k += 2) {
          var ta = Math.atan2(-back.y, -back.x) + k * (0.32 + 0.06 * Math.sin(clock * 3 + k));
          pen.moveTo(end.x, end.y);
          pen.quadraticCurveTo(end.x + Math.cos(ta) * unit * kind.tails * 0.6, end.y + Math.sin(ta) * unit * kind.tails * 0.6,
            end.x + Math.cos(ta + k * 0.25) * unit * kind.tails, end.y + Math.sin(ta + k * 0.25) * unit * kind.tails);
        }
        pen.stroke();
      }

      // feelers, and two eyes
      pen.strokeStyle = 'rgba(233,230,223,0.85)';
      pen.lineWidth = 1;
      for (k = 0; k < 2; k++) {
        pen.beginPath();
        pen.moveTo(feelers[k][0].x, feelers[k][0].y);
        for (i = 1; i < feelers[k].length; i++) pen.lineTo(feelers[k][i].x, feelers[k][i].y);
        pen.stroke();
      }
      pen.fillStyle = '#ffb347';
      for (k = -1; k <= 1; k += 2) {
        pen.beginPath();
        pen.arc(spine[0].x + nose.x * unit * 0.35 - nose.y * k * unit * 0.42, spine[0].y + nose.y * unit * 0.35 + nose.x * k * unit * 0.42, 1.8, 0, 6.2832);
        pen.fill();
      }
    }

    /* ---- wiring ---- */

    function place(e) {
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    // a mouse is followed for as long as it is in the room; a finger, for a few seconds after each touch
    canvas.addEventListener('pointermove', function (e) { called = place(e); if (e.pointerType === 'mouse') present = true; else sinceCalled = Math.min(sinceCalled, 1); });
    canvas.addEventListener('pointerdown', function (e) { called = place(e); sinceCalled = 0; env.redraw(); });
    canvas.addEventListener('pointerleave', function () { present = false; sinceCalled = Math.max(sinceCalled, 3); });
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'pan-y';

    var pairsDial = env.room.querySelector('[data-follower-pairs]');
    var pairsReadout = env.room.querySelector('[data-follower-pairs-value]');
    function readPairs() {
      pairs = Number(pairsDial.value);
      if (pairsReadout) pairsReadout.textContent = pairs * 2 + ' legs';
      assemble();
    }
    if (pairsDial) pairsDial.addEventListener('input', readPairs);
    var another = env.room.querySelector('[data-follower-another]');
    if (another) {
      another.addEventListener('click', function () {
        seed = (Math.random() * 1e9) >>> 0;
        species();
        pairs = [3, 4, 6, 8, 10, 14, 18, 22][Math.floor(random() * 8)];
        if (pairsDial) { pairsDial.value = pairs; if (pairsReadout) pairsReadout.textContent = pairs * 2 + ' legs'; }
        assemble();
        env.redraw();
      });
    }

    species();

    return {
      resize: function () {
        var ratio = Math.min(size.dpr, 2);
        canvas.width = Math.max(1, Math.round(size.w * ratio));
        canvas.height = Math.max(1, Math.round(size.h * ratio));
        if (pairsDial) pairs = Number(pairsDial.value);
        if (pairsReadout) pairsReadout.textContent = pairs * 2 + ' legs';
        assemble();
      },
      frame: function (time, dt) {
        clock += dt;
        decide(dt);
        walk(dt);
        env.live('steps', Gallery.formatCount(steps));
        env.live('walked', (walked / (unit * 40)).toFixed(1));      // forty joints of spine to the metre: it is a big one
        render();
      },
      // for checking the gait from the console: how many feet are in the air, and how far the most stretched leg is stretched
      gait: function () {
        var up = 0, stretch = 0;
        legs.forEach(function (l) {
          if (l.t >= 0) up++;
          if (l.hip) stretch = Math.max(stretch, Math.sqrt((l.foot.x - l.hip.x) * (l.foot.x - l.hip.x) + (l.foot.y - l.hip.y) * (l.foot.y - l.hip.y)) / (unit * (kind.thigh + kind.shin)));
        });
        return { up: up, of: legs.length, stretch: stretch, speed: head.speed, head: { x: spine[0].x, y: spine[0].y } };
      },
      // With motion paused: caught mid-stride
      still: function () {
        if (clock === 0) { for (var i = 0; i < 150; i++) { clock += 1 / 60; decide(1 / 60); walk(1 / 60); } }
        render();
      }
    };


  });
})();
