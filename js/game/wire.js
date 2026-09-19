/* wire.js: a line between two browsers, and the code that finds it.

   The game's traffic goes straight from one browser to the other over a
   WebRTC data connection: two channels, a firm one (ordered, retried) for
   the few messages that must arrive, and a loose one (unordered, never
   retried) for the buttons, which are sent a dozen times over anyway.

   Two browsers cannot find each other unaided. The host takes a short code
   and registers under it with a public broker (the PeerJS project's free
   one, spoken to here directly over a WebSocket: no library); the guest
   sends its offer there addressed to the code; the broker passes the offer
   one way and the answer the other and is not needed again. It never sees
   the game. Public STUN servers tell each browser its own address from
   outside.

   The broker is strict and silent, and this file is written round that:

   - It hangs up on any message not shaped exactly as the PeerJS library
     shapes them, so ours are shaped so.
   - It hangs up on a network candidate with nothing in it, which Firefox
     and Safari send to say "that is all of them". That was the first real
     failure of this file: the guest was cut off before the answer reached
     it. So candidates are no longer sent at all. Each side waits until it
     has gathered its own and sends them inside the offer or the answer:
     two messages in all.
   - A message can be lost, and a socket can be dropped (a tab put away
     stops sending heartbeats). So the guest repeats its offer until it is
     answered, the host repeats its answer to a repeated offer, and either
     reconnects to the broker under the same name if it is hung up on.

   There is no relay. Two networks that both refuse direct connections
   (some phone, school and office networks) cannot be joined without a TURN
   server, which costs somebody money; put one in ICE below (or in
   window.UndercroftICE before this file loads) and it will be used. When a
   connection fails the page says at which step, with a short note of what
   each side had to offer (h: its own addresses, s: as seen from outside,
   r: relayed).

   A wire, to net.js, is send(text, loose), onmessage, onclose, close(). */
(function () {
  'use strict';

  var BROKER = 'wss://0.peerjs.com/peerjs?key=peerjs&version=1.5.4', PREFIX = 'undercroft-36-';
  var ICE = window.UndercroftICE || { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }] };
  var LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // nothing that looks like something else
  var GATHER = 2600, AGAIN = 3500, PATIENCE = 40000;
  var test = { dropAnswers: 0, dropOffers: 0, hangUp: null };   // a harness may ask for the first few to be lost, or for the broker to be hung up on

  function supported() { return !!(window.RTCPeerConnection && window.WebSocket); }
  function newCode() { var s = '', a = new Uint32Array(6); (window.crypto || window.msCrypto).getRandomValues(a); for (var k = 0; k < 6; k++) s += LETTERS[a[k] % LETTERS.length]; return s; }
  function tidy(code) { return String(code || '').toUpperCase().split('').filter(function (ch) { return LETTERS.indexOf(ch) >= 0; }).join('').slice(0, 6); }
  function token() { return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }
  // what a description has to offer: h(ost) addresses, s(erver-reflexive, from STUN), r(elayed)
  function offered(desc) { var sdp = desc && desc.sdp || '', n = function (kind) { return (sdp.match(new RegExp('typ ' + kind, 'g')) || []).length; }; return 'h' + n('host') + 's' + n('srflx') + 'r' + n('relay'); }

  // the broker: register under an id, pass a message to another id, hear what is passed to us; come back under the same name if dropped
  function broker(id, on) {
    var ws = null, beat = null, shut = false, mine = token(), drops = 0;
    function connect() {
      try { ws = new WebSocket(BROKER + '&id=' + encodeURIComponent(id) + '&token=' + mine); } catch (e) { on.error('The broker could not be reached.'); return; }
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
    var W = { onmessage: null, onclose: null, firm: null, loose: null, closed: false, opened: false, onopen: null };
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
  function blocked(note) { return 'You found each other, but a direct connection could not be made. One of the networks refuses it (some phone, school and office networks do). Try another network or a phone hotspot. [' + note + ']'; }

  /* Host: take a code, wait under it, answer whoever offers. on: code(text), wire(wire), status(text), error(text) */
  function host(on) {
    if (!supported()) { on.error('This browser cannot make the direct connection the game needs (no WebRTC).'); return { close: function () {} }; }
    var code = newCode(), B = null, tries = 0, closed = false, got = null, attempt = null;   // attempt: { cid, src, pc, wire, answer, timer, theirs }
    function drop(a) { if (!a) return; clearTimeout(a.timer); if (!a.wire.opened) { try { a.pc.close(); } catch (e) { /* */ } } if (attempt === a) attempt = null; }
    function answer(a) { if (test.dropAnswers > 0) { test.dropAnswers--; return; } B.send('ANSWER', a.src, { sdp: a.answer, type: 'data', connectionId: a.cid, browser: 'chrome' }); }
    function begin(src, payload) {
      var a = attempt = { cid: payload.connectionId || ('dc_' + token().slice(0, 12)), src: src, pc: new RTCPeerConnection(ICE), answer: null, timer: null, theirs: offered(payload.sdp) };
      a.wire = makeWire(a.pc);
      a.pc.ondatachannel = function (ev) { a.wire.adopt(ev.channel); };
      a.wire.onopen = function () { clearTimeout(a.timer); got = a; on.wire(a.wire); };
      a.pc.addEventListener('iceconnectionstatechange', function () {
        if (attempt !== a || a.wire.opened) return;
        if (a.pc.iceConnectionState === 'checking') on.status('Found each other. Trying the routes between you…');
        if (a.pc.iceConnectionState === 'failed') { on.status(blocked('host ' + offered(a.answer) + ', guest ' + a.theirs) + ' Still waiting under the same code.'); drop(a); }
      });
      a.timer = setTimeout(function () { if (!a.wire.opened && !closed && attempt === a) { on.status('That attempt did not get through. Still waiting under the same code.'); drop(a); } }, PATIENCE);
      on.status('Someone is joining…');
      a.pc.setRemoteDescription(payload.sdp).then(function () { return a.pc.createAnswer(); }).then(function (ans) { return a.pc.setLocalDescription(ans); }).then(function () { return gathered(a.pc); })
        .then(function () { if (attempt !== a) return; a.answer = a.pc.localDescription; answer(a); })
        .catch(function () { if (attempt === a) { on.status('That attempt failed to start. Still waiting under the same code.'); drop(a); } });
    }
    function open() {
      B = broker(PREFIX + code, {
        open: function () { on.code(code); if (!attempt && !got) on.status('Waiting for someone to join with the code.'); },
        taken: function () { B.close(); if (++tries < 4) { code = newCode(); open(); } else on.error('Could not get a code from the broker. Try again in a moment.'); },
        expire: function () {}, dropped: function () { if (!got) on.status('The broker hung up. Reconnecting under the same code…'); },
        error: function (words) { if (!got) on.error(words); },
        signal: function (type, src, payload) {
          if (type !== 'OFFER' || got || closed) return;
          if (test.dropOffers > 0) { test.dropOffers--; return; }
          if (attempt && attempt.cid === payload.connectionId) { if (attempt.answer) answer(attempt); return; }   // the same offer again: the same answer again
          drop(attempt); begin(src, payload);
        }
      });
    }
    open();
    return { code: function () { return code; }, done: function () { if (B) B.close(); }, close: function () { closed = true; if (B) B.close(); drop(attempt); if (got) got.wire.close(); } };
  }

  /* Guest: offer to whoever waits under the code, and go on offering until answered. on: wire(wire), status(text), error(text) */
  function join(rawCode, on) {
    if (!supported()) { on.error('This browser cannot make the direct connection the game needs (no WebRTC).'); return { close: function () {} }; }
    var code = tidy(rawCode), closed = false;
    if (code.length !== 6) { on.error('A code is six letters and numbers.'); return { close: function () {} }; }
    var pc = new RTCPeerConnection(ICE), wire = makeWire(pc), dst = PREFIX + code, B = null, answered = false, offer = null, sends = 0, again = null, cid = 'dc_' + token().slice(0, 12), theirs = '';
    wire.adopt(pc.createDataChannel('firm', { ordered: true }));
    wire.adopt(pc.createDataChannel('loose', { ordered: false, maxRetransmits: 0 }));
    var giveUp = setTimeout(function () { if (wire.opened || closed) return; fail(answered ? blocked('guest ' + offered(offer) + ', host ' + theirs) : 'Nobody answered under that code. Check it with whoever sent it, and that their page is still open.'); }, PATIENCE);
    function stop() { closed = true; clearTimeout(giveUp); clearInterval(again); if (B) B.close(); if (!wire.opened) try { pc.close(); } catch (e) { /* */ } }
    function fail(words) { if (closed) return; on.error(words); stop(); }
    function sendOffer() {
      if (answered || closed || !offer) return;
      var sent = B.send('OFFER', dst, { sdp: offer, type: 'data', connectionId: cid, metadata: { game: 'undercroft' }, label: cid, reliable: true, serialization: 'json', browser: 'chrome' });
      if (sent) { sends++; on.status(sends > 1 ? 'Looking for the game… (asking again, ' + sends + ')' : 'Looking for the game…'); }
    }
    wire.onopen = function () { clearTimeout(giveUp); clearInterval(again); if (B) B.close(); on.wire(wire); };
    pc.addEventListener('iceconnectionstatechange', function () {
      if (wire.opened || closed) return;
      if (pc.iceConnectionState === 'checking' && answered) on.status('Found. Trying the routes between you…');
      if (pc.iceConnectionState === 'failed') fail(blocked('guest ' + offered(offer) + ', host ' + theirs));
    });
    on.status('Getting ready…');
    pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).then(function () { return gathered(pc); }).then(function () {
      if (closed) return;
      offer = pc.localDescription;
      B = broker(PREFIX + 'g-' + token().slice(0, 12), {
        open: function () { sendOffer(); if (!again) again = setInterval(sendOffer, AGAIN); },
        taken: function () { fail('Try again.'); },
        expire: function () { /* the broker gave up holding one offer; the next is already on its way */ },
        dropped: function () { if (!answered) on.status('The broker hung up. Reconnecting…'); },
        error: function (words) { if (!wire.opened) fail(words); },
        signal: function (type, src, payload) {
          if (type !== 'ANSWER' || answered || payload.connectionId !== cid) return;
          answered = true; clearInterval(again); theirs = offered(payload.sdp); on.status('Found. Connecting…');
          pc.setRemoteDescription(payload.sdp).catch(function () { fail('The connection could not be completed.'); });
        }
      });
    }).catch(function () { fail('The connection could not be started.'); });
    return { close: function () { stop(); if (wire.opened) wire.close(); } };
  }

  window.UndercroftWire = { supported: supported, host: host, join: join, tidy: tidy, test: test };
})();
