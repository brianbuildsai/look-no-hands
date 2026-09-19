/* wire.js: a line between two browsers, and the code that finds it.

   The game's traffic goes straight from one browser to the other over a
   WebRTC data connection: two channels, a firm one (ordered, retried) for
   the few messages that must arrive, and a loose one (unordered, never
   retried) for the buttons, which are sent a dozen times over anyway.

   Two browsers cannot find each other unaided. The host takes a short code
   and registers under it with a public broker (the PeerJS project's free
   one, spoken to here directly over a WebSocket: no library); the guest
   sends its offer there addressed to the code; the broker passes offer,
   answer and network candidates between them and is not needed again. It
   never sees the game. (It passes on only messages shaped exactly as the
   PeerJS library shapes them, and hangs up on anything else, so ours are
   shaped so.) Google's public STUN servers tell each browser its
   own address from outside. There is no relay: two networks that both
   refuse direct connections (some phone and campus networks) cannot be
   joined this way, and the player is told so plainly.

   A wire, to net.js, is send(text, loose), onmessage, onclose, close(). */
(function () {
  'use strict';

  var BROKER = 'wss://0.peerjs.com/peerjs?key=peerjs&version=1.5.4', PREFIX = 'undercroft-36-';
  var ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };
  var LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // nothing that looks like something else

  function supported() { return !!(window.RTCPeerConnection && window.WebSocket); }
  function newCode() { var s = '', a = new Uint32Array(6); (window.crypto || window.msCrypto).getRandomValues(a); for (var k = 0; k < 6; k++) s += LETTERS[a[k] % LETTERS.length]; return s; }
  function tidy(code) { return String(code || '').toUpperCase().split('').filter(function (ch) { return LETTERS.indexOf(ch) >= 0; }).join('').slice(0, 6); }
  function token() { return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }

  // the broker: register under an id, pass messages to another id, hear what is passed to us
  function broker(id, on) {
    var ws, beat = null, shut = false;
    try { ws = new WebSocket(BROKER + '&id=' + encodeURIComponent(id) + '&token=' + token()); } catch (e) { on.error('The broker could not be reached.'); return { send: function () {}, close: function () {} }; }
    ws.onopen = function () { beat = setInterval(function () { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'HEARTBEAT' })); }, 5000); };
    ws.onmessage = function (ev) {
      var msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.type === 'OPEN') on.open();
      else if (msg.type === 'ID-TAKEN') on.taken();
      else if (msg.type === 'EXPIRE') on.expire();
      else if (msg.type === 'ERROR' || msg.type === 'INVALID-KEY') on.error('The broker refused the connection.');
      else if (msg.type === 'OFFER' || msg.type === 'ANSWER' || msg.type === 'CANDIDATE') on.signal(msg.type, msg.src, msg.payload || {});
    };
    ws.onerror = function () { if (!shut) on.error('The broker could not be reached. Check your connection and try again.'); };
    ws.onclose = function () { if (beat) clearInterval(beat); };
    return {
      send: function (type, dst, payload) { if (ws.readyState === 1) ws.send(JSON.stringify({ type: type, dst: dst, payload: payload })); },
      close: function () { shut = true; if (beat) clearInterval(beat); try { ws.close(); } catch (e) { /* gone */ } }
    };
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
    pc.onconnectionstatechange = function () { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') gone(); };
    return W;
  }

  /* Host: take a code, wait under it, answer whoever offers. on: code(text), wire(wire), status(text), error(text) */
  function host(on) {
    if (!supported()) { on.error('This browser cannot make the direct connection the game needs (no WebRTC).'); return { close: function () {} }; }
    var code = newCode(), B = null, pc = null, wire = null, tries = 0, closed = false;
    function open() {
      B = broker(PREFIX + code, {
        open: function () { on.code(code); on.status('Waiting for someone to join with the code.'); },
        taken: function () { B.close(); if (++tries < 4) { code = newCode(); open(); } else on.error('Could not get a code from the broker. Try again in a moment.'); },
        expire: function () {}, error: function (words) { if (!wire || !wire.opened) on.error(words); },
        signal: function (type, src, payload) {
          if (type === 'OFFER' && !pc) {
            on.status('Someone is joining…');
            pc = new RTCPeerConnection(ICE); wire = makeWire(pc);
            pc.ondatachannel = function (ev) { wire.adopt(ev.channel); };
            var cid = payload.connectionId || ('dc_' + token().slice(0, 12));
            pc.onicecandidate = function (ev) { if (ev.candidate) B.send('CANDIDATE', src, { candidate: ev.candidate, type: 'data', connectionId: cid }); };
            wire.onopen = function () { on.wire(wire); };
            var failTimer = setTimeout(function () { if (!wire.opened && !closed) { try { pc.close(); } catch (e) { /* */ } pc = null; on.status('They could not get through (their network or yours blocks direct connections). Still waiting under the same code.'); } }, 20000);
            wire.onclose = function () { clearTimeout(failTimer); };
            pc.setRemoteDescription(payload.sdp).then(function () { return pc.createAnswer(); }).then(function (answer) { return pc.setLocalDescription(answer); }).then(function () { B.send('ANSWER', src, { sdp: pc.localDescription, type: 'data', connectionId: cid, browser: 'chrome' }); }).catch(function () { on.status('That attempt failed. Still waiting under the same code.'); pc = null; });
          } else if (type === 'CANDIDATE' && pc && payload.candidate) pc.addIceCandidate(payload.candidate).catch(function () { /* a late or useless candidate */ });
        }
      });
    }
    open();
    return { code: function () { return code; }, done: function () { if (B) B.close(); }, close: function () { closed = true; if (B) B.close(); if (wire) wire.close(); else if (pc) try { pc.close(); } catch (e) { /* */ } } };
  }

  /* Guest: offer to whoever waits under the code. on: wire(wire), status(text), error(text) */
  function join(rawCode, on) {
    if (!supported()) { on.error('This browser cannot make the direct connection the game needs (no WebRTC).'); return { close: function () {} }; }
    var code = tidy(rawCode), closed = false;
    if (code.length !== 6) { on.error('A code is six letters and numbers.'); return { close: function () {} }; }
    var pc = new RTCPeerConnection(ICE), wire = makeWire(pc), dst = PREFIX + code, B, answered = false, cid = 'dc_' + token().slice(0, 12);
    wire.adopt(pc.createDataChannel('firm', { ordered: true }));
    wire.adopt(pc.createDataChannel('loose', { ordered: false, maxRetransmits: 0 }));
    var giveUp = setTimeout(function () { if (wire.opened || closed) return; on.error(answered ? 'The two of you could not be connected directly. One of the networks blocks it (some phone, school and office networks do). Try another network, or a hotspot.' : 'Nobody is waiting under that code. Check it with whoever sent it.'); stop(); }, 22000);
    function stop() { closed = true; clearTimeout(giveUp); if (B) B.close(); if (!wire.opened) try { pc.close(); } catch (e) { /* */ } }
    wire.onopen = function () { clearTimeout(giveUp); if (B) B.close(); on.wire(wire); };
    B = broker(PREFIX + 'g-' + token().slice(0, 12), {
      open: function () {
        on.status('Looking for the game…');
        pc.onicecandidate = function (ev) { if (ev.candidate) B.send('CANDIDATE', dst, { candidate: ev.candidate, type: 'data', connectionId: cid }); };
        pc.createOffer().then(function (offer) { return pc.setLocalDescription(offer); }).then(function () { B.send('OFFER', dst, { sdp: pc.localDescription, type: 'data', connectionId: cid, metadata: { game: 'undercroft' }, label: cid, reliable: true, serialization: 'json', browser: 'chrome' }); }).catch(function () { on.error('The connection could not be started.'); stop(); });
      },
      taken: function () { on.error('Try again.'); stop(); },
      expire: function () { if (!answered && !wire.opened) { on.error('Nobody is waiting under that code. Check it with whoever sent it.'); stop(); } },
      error: function (words) { if (!wire.opened) { on.error(words); stop(); } },
      signal: function (type, src, payload) {
        if (type === 'ANSWER' && !answered) { answered = true; on.status('Found. Connecting…'); pc.setRemoteDescription(payload.sdp).catch(function () { on.error('The connection could not be completed.'); stop(); }); }
        else if (type === 'CANDIDATE' && payload.candidate) pc.addIceCandidate(payload.candidate).catch(function () { /* late */ });
      }
    });
    return { close: function () { stop(); if (wire.opened) wire.close(); } };
  }

  window.UndercroftWire = { supported: supported, host: host, join: join, tidy: tidy };
})();
