/* wire.js: a line between two browsers, and the code that finds it.

   There are two ways from one browser to the other, and both are tried at
   once under the same six-character code.

   The direct way is a WebRTC data connection: two channels, a firm one
   (ordered, retried) for the few messages that must arrive, and a loose one
   (unordered, never retried) for the buttons, which are sent a dozen times
   over anyway. Two browsers cannot find each other unaided: the host
   registers under its code with a public broker (the PeerJS project's free
   one, spoken to here directly over a WebSocket: no library); the guest sends
   its offer there addressed to the code; the broker passes the offer one way
   and the answer the other and is not needed again. Public STUN servers tell
   each browser its own address from outside.

   That broker is strict and silent, and this file is written round that:

   - It hangs up on any message not shaped exactly as the PeerJS library
     shapes them, so ours are shaped so.
   - It hangs up on a network candidate with nothing in it, which Firefox
     and Safari send to say "that is all of them". That was the first real
     failure of this file. So candidates are not sent at all: each side waits
     until it has gathered its own and sends them inside the offer or the
     answer, two messages in all.
   - A message can be lost, and a socket can be dropped. So the guest repeats
     its offer until it is answered, the host repeats its answer to a
     repeated offer, and either reconnects under the same name.

   The second real failure was not this file's to mend: the two found each
   other and no route between their networks would open (each had addresses,
   none could be reached from the other's). For that there is the long way
   round (relay.js): the same messages passed along by a public MQTT broker.
   It is slower, so the direct way is preferred; the guest decides. If the
   direct connection opens within a few seconds of the answer, its first
   message says so. If it does not, and the host has answered through some
   broker, the guest's first message comes that way instead. The host takes
   whichever arrives. Neither way depends on the other: with the PeerJS
   broker down the relay still finds the host, and with every relay down a
   direct connection still works.

   A TURN server, if you have one, goes in ICE below (or in
   window.UndercroftICE before this file loads) and will be used.

   A wire, to net.js, is send(text, loose), onmessage, onclose, close();
   `via` says which way it goes, and `most` may raise the delay allowed. */
(function () {
  'use strict';

  var RELAY = window.UndercroftRelay && window.UndercroftRelay.supported() ? window.UndercroftRelay : null;
  var BROKER = 'wss://0.peerjs.com/peerjs?key=peerjs&version=1.5.4', PREFIX = 'undercroft-36-';
  var ICE = window.UndercroftICE || { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }] };
  var LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // nothing that looks like something else
  var GATHER = 2600, AGAIN = 3500, PATIENCE = 40000;
  var SOON = 5000, LATE = 12000, ASK = 1500;   // the direct way has this long after the answer, or this long with no answer at all, before the relay is taken; how often a guest asks a relay for the host
  var test = { dropAnswers: 0, dropOffers: 0, hangUp: null, noDirect: false, noBroker: false };   // a harness may lose the first few, hang up on the broker, or shut the direct way as a bad network would

  function direct() { return !!window.RTCPeerConnection; }
  function supported() { return !!window.WebSocket && (direct() || !!RELAY); }
  function ice() { return test.noDirect ? { iceServers: [], iceTransportPolicy: 'relay' } : ICE; }   // relayed candidates only, and nobody to relay: none at all
  function newCode() { var s = '', a = new Uint32Array(6); (window.crypto || window.msCrypto).getRandomValues(a); for (var k = 0; k < 6; k++) s += LETTERS[a[k] % LETTERS.length]; return s; }
  function tidy(code) { return String(code || '').toUpperCase().split('').filter(function (ch) { return LETTERS.indexOf(ch) >= 0; }).join('').slice(0, 6); }
  function token() { return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }
  // what a description has to offer: h(ost) addresses, s(erver-reflexive, from STUN), r(elayed)
  function offered(desc) { var sdp = desc && desc.sdp || '', n = function (kind) { return (sdp.match(new RegExp('typ ' + kind, 'g')) || []).length; }; return 'h' + n('host') + 's' + n('srflx') + 'r' + n('relay'); }

  // the broker: register under an id, pass a message to another id, hear what is passed to us; come back under the same name if dropped
  function broker(id, on) {
    var ws = null, beat = null, shut = false, mine = token(), drops = 0;
    function connect() {
      try { ws = new WebSocket(test.noBroker ? 'wss://localhost:9/none' : BROKER + '&id=' + encodeURIComponent(id) + '&token=' + mine); } catch (e) { on.error('The broker could not be reached.'); return; }
      ws.onopen = function () { if (beat) clearInterval(beat); beat = setInterval(function () { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'HEARTBEAT' })); }, 5000); };
      ws.onmessage = function (ev) {
        var msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (msg.type === 'OPEN') { drops = 0; on.open(); }
        else if (msg.type === 'ID-TAKEN') on.taken();
        else if (msg.type === 'EXPIRE') on.expire();
        else if (msg.type === 'ERROR' || msg.type === 'INVALID-KEY') on.error('The broker refused the connection.');
        else if (msg.type === 'OFFER' || msg.type === 'ANSWER') on.signal(msg.type, msg.src, msg.payload || {});
      };
      ws.onclose = function () {
        if (beat) { clearInterval(beat); beat = null; }
        if (shut) return;
        // hung up on, or the network blinked: come back under the same name
        if (++drops <= 5) { if (on.dropped) on.dropped(drops); setTimeout(function () { if (!shut) connect(); }, 600 * drops); }
        else on.error('The broker keeps hanging up. Check your connection and try again.');
      };
      ws.onerror = function () { /* onclose follows, and decides */ };
    }
    connect();
    test.hangUp = function () { try { ws.close(); } catch (e) { /* */ } };
    return {
      send: function (type, dst, payload) { if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ type: type, dst: dst, payload: payload })); return true; } return false; },
      close: function () { shut = true; if (beat) clearInterval(beat); try { ws.close(); } catch (e) { /* gone */ } }
    };
  }

  // when this side has gathered its network candidates (or has waited long enough), so that they travel inside the description
  function gathered(pc) {
    return new Promise(function (done) {
      if (pc.iceGatheringState === 'complete') { done(); return; }
      var timer = setTimeout(finish, GATHER);
      function finish() { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', check); done(); }
      function check() { if (pc.iceGatheringState === 'complete') finish(); }
      pc.addEventListener('icegatheringstatechange', check);
    });
  }

  // the two channels as one wire
  function makeWire(pc) {
    var W = { onmessage: null, onclose: null, firm: null, loose: null, closed: false, opened: false, onopen: null, via: 'direct' };
    function gone() { if (W.closed) return; W.closed = true; try { pc.close(); } catch (e) { /* already */ } if (W.onclose) W.onclose(); }
    function adopt(ch) {
      if (ch.label === 'firm') W.firm = ch; else W.loose = ch;
      ch.onmessage = function (ev) { if (W.onmessage && typeof ev.data === 'string') W.onmessage(ev.data); };
      ch.onopen = function () { if (!W.opened && W.firm && W.firm.readyState === 'open') { W.opened = true; if (W.onopen) W.onopen(); } };
      if (ch.label === 'firm') ch.onclose = gone;
      if (ch.readyState === 'open') ch.onopen();
    }
    W.adopt = adopt;
    W.send = function (text, loose) { var ch = loose && W.loose && W.loose.readyState === 'open' ? W.loose : W.firm; if (ch && ch.readyState === 'open') ch.send(text); };
    W.close = function () { gone(); };
    pc.addEventListener('connectionstatechange', function () { if (W.opened && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) gone(); });
    return W;
  }
  function noWay(note) { return 'You found each other, but no direct route would open between your two networks, and no relay answered either (a network that blocks unusual ports will do that). Try another network or a phone hotspot. [' + note + ']'; }

  /* Host: take a code, wait under it both ways, and take whoever's first message arrives. on: code(text), wire(wire), status(text), error(text) */
  function host(on) {
    if (!supported()) { on.error('This browser cannot make the connection the game needs.'); return { close: function () {} }; }
    var code = newCode(), B = null, H = null, tries = 0, closed = false, got = null, attempt = null, shown = false, brokerDead = !direct(), brokerWords = '';   // attempt: { cid, src, pc, wire, answer, timer, theirs }
    function show() { if (shown || closed) return; shown = true; on.code(code); if (!attempt && !got) on.status(brokerDead && direct() ? 'Waiting for someone to join with the code. (The direct broker cannot be reached, so they will come by relay.)' : 'Waiting for someone to join with the code.'); }
    function drop(a) { if (!a) return; clearTimeout(a.timer); if (!got || got.wire !== a.wire) { a.wire.onclose = null; try { a.pc.close(); } catch (e) { /* */ } } if (attempt === a) attempt = null; }
    function answer(a) { if (test.dropAnswers > 0) { test.dropAnswers--; return; } B.send('ANSWER', a.src, { sdp: a.answer, type: 'data', connectionId: a.cid, browser: 'chrome' }); }
    function begin(src, payload) {
      var a = attempt = { cid: payload.connectionId || ('dc_' + token().slice(0, 12)), src: src, pc: new RTCPeerConnection(ice()), answer: null, timer: null, theirs: offered(payload.sdp) };
      a.wire = makeWire(a.pc);
      a.pc.ondatachannel = function (ev) { a.wire.adopt(ev.channel); };
      // open is not yet taken: the guest may have gone round by the relay in the same moment. Its first message this way settles it.
      a.wire.onmessage = function (text) {
        if (got || closed || attempt !== a) return;
        clearTimeout(a.timer); got = { wire: a.wire }; attempt = null; if (H) { H.close(); H = null; }
        a.wire.onmessage = null; on.wire(a.wire);
        if (text !== '!direct' && a.wire.onmessage) a.wire.onmessage(text);   // a page from before the relay says hello straight away
      };
      a.pc.addEventListener('iceconnectionstatechange', function () {
        if (attempt !== a || a.wire.opened) return;
        if (a.pc.iceConnectionState === 'checking') on.status('Found each other. Trying the direct route…');
        if (a.pc.iceConnectionState === 'failed') { on.status(H && H.any() ? 'No direct route between your networks. Waiting for them to come round by a relay…' : noWay('host ' + offered(a.answer) + ', guest ' + a.theirs) + ' Still waiting under the same code.'); drop(a); }
      });
      a.timer = setTimeout(function () { if (!got && !closed && attempt === a) { on.status('That attempt did not get through. Still waiting under the same code.'); drop(a); } }, PATIENCE);
      on.status('Someone is joining…');
      a.pc.setRemoteDescription(payload.sdp).then(function () { return a.pc.createAnswer(); }).then(function (ans) { return a.pc.setLocalDescription(ans); }).then(function () { return gathered(a.pc); })
        .then(function () { if (attempt !== a) return; a.answer = a.pc.localDescription; answer(a); })
        .catch(function () { if (attempt === a) { on.status('That attempt failed to start. Still waiting under the same code.'); drop(a); } });
    }
    function openBroker() {
      if (!direct()) return;
      B = broker(PREFIX + code, {
        open: function () { brokerDead = false; show(); },
        taken: function () { B.close(); if (++tries < 4) { code = newCode(); shown = false; openBroker(); openRelays(); } else { brokerDead = true; brokerWords = 'Could not get a code from the broker. Try again in a moment.'; settle(); } },
        expire: function () {}, dropped: function () { if (!got && !shown) on.status('The broker hung up. Reconnecting under the same code…'); },
        error: function (words) { brokerDead = true; brokerWords = words; settle(); },
        signal: function (type, src, payload) {
          if (type !== 'OFFER' || got || closed) return;
          if (test.dropOffers > 0) { test.dropOffers--; return; }
          if (attempt && attempt.cid === payload.connectionId) { if (attempt.answer) answer(attempt); return; }   // the same offer again: the same answer again
          drop(attempt); begin(src, payload);
        }
      });
    }
    // with the broker gone: the relays will do if any is up, and if none is either there is nothing to wait under
    function settle() { if (got || closed) return; if (H && H.any()) show(); else if (!H || H.dead) on.error(brokerWords || 'Nothing could be reached to wait under. Check your connection.'); }
    function openRelays() {
      if (!RELAY) return;
      if (H) H.close();
      var hub = H = RELAY.hub(code, 'h', {
        open: function () { if (brokerDead) show(); },
        none: function () { hub.dead = true; if (brokerDead && hub === H) settle(); },
        message: function (i, who, kind, rest) {
          if (closed || hub !== H) return;
          if (got) { if (got.who === who && got.index === i) got.wire.take(kind, rest); else if (kind === '?') hub.say(i, who, who, 'x', ''); return; }
          if (kind === '?') { hub.say(i, who, who, '!', ''); if (!attempt) on.status('Someone is joining…'); return; }
          if (kind !== 'f') return;
          // a guest's first firm message by this way: it has chosen the relay
          var w = RELAY.wire(function (k, r) { return hub.say(i, who, who, k, r); }, { where: hub.where(i), over: function () { hub.close(); } });
          got = { wire: w, who: who, index: i }; hub.keep(i); drop(attempt);
          on.wire(w); w.take(kind, rest);
        },
        lost: function (i) { if (got && got.index === i && got.who) got.wire.lost(); }
      });
    }
    openBroker(); openRelays();
    return { code: function () { return code; }, done: function () { if (B) B.close(); }, close: function () { closed = true; if (B) B.close(); drop(attempt); if (got) got.wire.close(); if (H) H.close(); } };
  }

  /* Guest: look for whoever waits under the code both ways, and choose. on: wire(wire), status(text), error(text) */
  function join(rawCode, on) {
    if (!supported()) { on.error('This browser cannot make the connection the game needs.'); return { close: function () {} }; }
    var code = tidy(rawCode);
    if (code.length !== 6) { on.error('A code is six letters and numbers.'); return { close: function () {} }; }
    var closed = false, decided = null, began = Date.now(), timers = [];
    var pc = null, wire = null, B = null, answered = 0, offer = null, sends = 0, again = null, cid = 'dc_' + token().slice(0, 12), theirs = '', directOut = !direct(), dst = PREFIX + code;
    var H = null, me = RELAY ? RELAY.name(8) : '', ready = -1, relayOut = !RELAY, relayWire = null;

    function stop() { closed = true; timers.forEach(clearInterval); clearInterval(again); if (B) B.close(); if (decided !== 'direct' && pc) try { pc.close(); } catch (e) { /* */ } if (decided !== 'relay' && H) H.close(); }
    function fail(words) { if (closed || decided) return; on.error(words); stop(); }
    function note() { return 'guest ' + offered(offer) + ', host ' + (theirs || 'unheard'); }
    // the one decision: the direct way if it has opened, the relay if the direct way has had its chance
    function consider() {
      if (closed || decided) return;
      var t = Date.now();
      if (wire && wire.opened) {
        decided = 'direct'; timers.forEach(clearInterval); clearInterval(again); if (B) B.close(); if (H) { H.close(); H = null; }
        wire.send('!direct'); on.wire(wire); return;
      }
      var hadItsChance = directOut || (answered ? t - answered > SOON : t - began > LATE);
      if (hadItsChance && ready >= 0) {
        decided = 'relay'; timers.forEach(clearInterval); clearInterval(again); if (B) B.close(); if (pc) { if (wire) wire.onclose = null; try { pc.close(); } catch (e) { /* */ } }
        var i = ready, hub = H;
        hub.keep(i);
        relayWire = RELAY.wire(function (k, r) { return hub.say(i, 'h', me, k, r); }, { where: hub.where(i), over: function () { hub.close(); } });
        on.status('No direct route between your networks. Going round by a relay…');
        on.wire(relayWire); return;
      }
      if (directOut && relayOut) { fail(noWay(note())); return; }
      if (t - began > PATIENCE) fail(answered || ready >= 0 ? noWay(note()) : 'Nobody answered under that code. Check it with whoever sent it, and that their page is still open.');
    }

    /* the direct way */
    function sendOffer() {
      if (answered || closed || decided || !offer) return;
      var sent = B.send('OFFER', dst, { sdp: offer, type: 'data', connectionId: cid, metadata: { game: 'undercroft' }, label: cid, reliable: true, serialization: 'json', browser: 'chrome' });
      if (sent) { sends++; if (ready < 0) on.status(sends > 1 ? 'Looking for the game… (asking again, ' + sends + ')' : 'Looking for the game…'); }
    }
    if (direct()) {
      pc = new RTCPeerConnection(ice()); wire = makeWire(pc);
      wire.adopt(pc.createDataChannel('firm', { ordered: true }));
      wire.adopt(pc.createDataChannel('loose', { ordered: false, maxRetransmits: 0 }));
      wire.onopen = consider;
      pc.addEventListener('iceconnectionstatechange', function () {
        if (closed || decided || wire.opened) return;
        if (pc.iceConnectionState === 'checking' && answered) on.status('Found. Trying the direct route…');
        if (pc.iceConnectionState === 'failed') { directOut = true; consider(); }
      });
      pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).then(function () { return gathered(pc); }).then(function () {
        if (closed || decided) return;
        offer = pc.localDescription;
        B = broker(PREFIX + 'g-' + token().slice(0, 12), {
          open: function () { sendOffer(); if (!again) again = setInterval(sendOffer, AGAIN); },
          taken: function () { directOut = true; consider(); },
          expire: function () { /* the broker gave up holding one offer; the next is already on its way */ },
          dropped: function () { if (!answered && ready < 0) on.status('The broker hung up. Reconnecting…'); },
          error: function () { if (!answered) { directOut = true; consider(); } },
          signal: function (type, src, payload) {
            if (type !== 'ANSWER' || answered || decided || payload.connectionId !== cid) return;
            answered = Date.now(); clearInterval(again); theirs = offered(payload.sdp); on.status('Found. Connecting…');
            pc.setRemoteDescription(payload.sdp).catch(function () { directOut = true; consider(); });
          }
        });
      }).catch(function () { directOut = true; consider(); });
    }

    /* the long way round */
    if (RELAY) {
      H = RELAY.hub(code, me, {
        open: function (i) { if (!decided && !closed) H.say(i, 'h', me, '?', ''); },
        none: function () { relayOut = true; consider(); },
        message: function (i, who, kind, rest) {
          if (closed || who !== me) return;
          if (decided === 'relay') { if (i === ready && relayWire) relayWire.take(kind, rest); return; }
          if (decided) return;
          if (kind === '!' && ready < 0) { ready = i; if (!answered) on.status('Found. Trying the direct route first…'); consider(); }
          else if (kind === 'x') fail('That game already has two in it.');
        },
        lost: function (i) { if (decided === 'relay' && i === ready && relayWire) relayWire.lost(); }
      });
      timers.push(setInterval(function () { if (decided || closed || ready >= 0) return; for (var i = 0; i < H.count(); i++) if (H.up(i)) H.say(i, 'h', me, '?', ''); }, ASK));
    }
    on.status('Getting ready…');
    timers.push(setInterval(consider, 400));
    return { close: function () { var w = decided === 'direct' ? wire : relayWire; stop(); if (w) w.close(); } };
  }

  window.UndercroftWire = { supported: supported, host: host, join: join, tidy: tidy, test: test };
})();
