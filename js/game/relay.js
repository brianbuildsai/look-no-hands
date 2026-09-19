/* relay.js: the long way round.

   Two browsers can only be joined directly if at least one of their networks
   lets a stranger's packets in through a door the browser has just opened
   outward. Many do not (phone carriers, campuses, some home routers), and
   then no page can do anything about it: a third machine that both can reach
   has to pass the messages along. The usual one is a TURN server, which
   somebody has to pay for.

   This game sends almost nothing, though: a few dozen bytes of buttons per
   step. Anything that will pass small messages between two sockets will do,
   and public MQTT brokers do exactly that, over a WebSocket, free and without
   an account (they are run for people trying out thermostats). So this file
   speaks MQTT 3.1.1 by hand, as little of it as will do, and makes of a
   broker a wire that net.js cannot tell from the direct one: send(text,
   loose), onmessage, onclose, close().

   Each side keeps a line to every broker in the list while the two look for
   each other, so that any one broker both can reach is enough; the guest
   takes the first through which the host answers (which is also the quickest
   round trip), and the rest are hung up on.

   The host listens on  undercroft36/<code>/h , a guest on
   undercroft36/<code>/<its own name> . A message is  <guest's name> <kind>
   <the rest> :  ? are you there,  ! here,  x full,  f <n> <text> a firm
   message (numbered, acknowledged, resent until it is, handed on in order),
   a <n> got all up to n,  l <text> a loose one (the newest of each sort,
   thirty times a second),  k still here,  z goodbye.

   A public broker promises nothing, and anybody who knew the code could
   listen to the buttons or press some. Nothing else crosses it. */
(function () {
  'use strict';

  // Measured 2026-09-19 at thirty messages a second, as the game sends: these two passed on every one, about an
  // eighth of a second each way. broker.emqx.io answers soonest of all and then lets through one in three, in
  // bursts three quarters of a second apart, so it is not here: a relay that connects and cannot be played over
  // is worse than none. Before adding one, put it through the same (docs/PLAN-13.md says how).
  var RELAYS = window.UndercroftRelays || ['wss://test.mosquitto.org:8081/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
  var ROOT = 'undercroft36/';
  var test = { relays: null, lines: [] };   // a harness may name its own brokers, and hang up on the ones in use
  var enc = window.TextEncoder ? new TextEncoder() : null, dec = window.TextDecoder ? new TextDecoder() : null;

  function supported() { return !!(window.WebSocket && enc && dec); }
  function now() { return Date.now(); }
  function name(n) { var s = ''; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); }

  /* ---- MQTT, as little of it as will do ---- */

  function str(s) { var e = enc.encode(s), a = new Uint8Array(2 + e.length); a[0] = e.length >> 8; a[1] = e.length & 255; a.set(e, 2); return a; }
  function packet(first, parts) {
    var n = 0, k; for (k = 0; k < parts.length; k++) n += parts[k].length;
    var len = [], x = n; do { var b = x % 128; x = Math.floor(x / 128); if (x > 0) b |= 128; len.push(b); } while (x > 0);
    var out = new Uint8Array(1 + len.length + n), at = 1 + len.length; out[0] = first; out.set(len, 1);
    for (k = 0; k < parts.length; k++) { out.set(parts[k], at); at += parts[k].length; }
    return out;
  }

  // one line to one broker, listening on one topic; it comes back by itself if dropped. on: open(), message(text), lost()
  function line(url, topic, on) {
    var ws = null, shut = false, buf = new Uint8Array(0), beat = null, drops = 0, up = false, upAt = 0, ponged = true;
    function connect() {
      var mine;
      try { mine = ws = new WebSocket(url, 'mqtt'); } catch (e) { again(); return; }
      ws.binaryType = 'arraybuffer';
      ws.onopen = function () { if (mine !== ws) return; buf = new Uint8Array(0); ws.send(packet(0x10, [str('MQTT'), new Uint8Array([4, 2, 0, 30]), str('uc' + name(14))])); };   // level 4, a clean session, thirty seconds' grace
      ws.onmessage = function (ev) { if (mine === ws && ev.data instanceof ArrayBuffer) feed(new Uint8Array(ev.data)); };
      ws.onclose = function () { if (mine === ws) cut(); };
      ws.onerror = function () { /* onclose follows, and decides */ };
    }
    // Let go of a socket without waiting on it: a broker may take its time over the closing handshake, or never finish it.
    function cut() {
      var old = ws; ws = null; up = false;
      if (beat) { clearInterval(beat); beat = null; }
      if (old) { old.onopen = old.onmessage = old.onclose = old.onerror = null; try { old.close(); } catch (e) { /* gone */ } }
      if (!shut) again();
    }
    function again() {
      if (now() - upAt > 10000 && upAt) drops = 0;
      if (++drops > 6) { shut = true; on.lost(); return; }
      setTimeout(function () { if (!shut) connect(); }, 400 * drops);
    }
    // a frame may hold part of a packet, or several
    function feed(bytes) {
      var joined = new Uint8Array(buf.length + bytes.length); joined.set(buf); joined.set(bytes, buf.length); buf = joined;
      for (;;) {
        if (buf.length < 2) return;
        var len = 0, mult = 1, at = 1, b;
        do { if (at >= buf.length) return; if (at > 4) { cut(); return; } b = buf[at++]; len += (b & 127) * mult; mult *= 128; } while (b & 128);
        if (buf.length < at + len) return;
        var first = buf[0], body = buf.subarray(at, at + len);
        buf = buf.slice(at + len);
        handle(first, body);
      }
    }
    function handle(first, body) {
      var type = first >> 4;
      if (type === 2) {   // connected, or refused
        if (body[1] !== 0) { cut(); return; }
        ws.send(packet(0x82, [new Uint8Array([0, 1]), str(topic), new Uint8Array([0])]));
      } else if (type === 9) {   // listening
        up = true; upAt = now(); ponged = true;
        if (beat) clearInterval(beat);
        beat = setInterval(function () { if (!ws || ws.readyState !== 1) return; if (!ponged) { cut(); return; } ponged = false; ws.send(new Uint8Array([0xC0, 0])); }, 12000);
        on.open();
      } else if (type === 3) {   // something for us
        var qos = (first >> 1) & 3, tl = (body[0] << 8) | body[1], at = 2 + tl;
        if (qos) { ws.send(new Uint8Array([0x40, 2, body[at], body[at + 1]])); at += 2; }
        on.message(dec.decode(body.subarray(at)));
      } else if (type === 13) ponged = true;
    }
    connect();
    var L = {
      up: function () { return up && ws && ws.readyState === 1; },
      publish: function (to, text) { if (!L.up()) return false; try { ws.send(packet(0x30, [str(to), enc.encode(text)])); } catch (e) { return false; } return true; },
      hangUp: function () { if (ws) cut(); },   // as a network would: it comes back
      close: function () { shut = true; try { if (ws && ws.readyState === 1) ws.send(new Uint8Array([0xE0, 0])); } catch (e) { /* gone */ } cut(); }
    };
    return L;
  }

  /* ---- a line to every broker, until one is chosen ----
     me: 'h' for the host, or a guest's own name. on: open(index), message(index, who, kind, rest), lost(index), none() */
  function hub(code, me, on) {
    var urls = test.relays || RELAYS, lines = [], dead = 0, closed = false;
    urls.forEach(function (url, i) {
      lines[i] = line(url, ROOT + code + '/' + me, {
        open: function () { if (!closed) on.open(i); },
        message: function (text) {
          if (closed) return;
          var a = text.indexOf(' '), b = a < 0 ? -1 : text.indexOf(' ', a + 1); if (a < 1) return;
          on.message(i, text.slice(0, a), b < 0 ? text.slice(a + 1) : text.slice(a + 1, b), b < 0 ? '' : text.slice(b + 1));
        },
        lost: function () { lines[i] = null; if (closed) return; if (on.lost) on.lost(i); if (++dead >= urls.length && on.none) on.none(); }
      });
    });
    test.lines = lines;
    return {
      // to: 'h' or a guest's name; who: the guest the message is about (the host speaks to many, a guest only as itself)
      say: function (i, to, who, kind, rest) { return !!lines[i] && lines[i].publish(ROOT + code + '/' + to, who + ' ' + kind + (rest ? ' ' + rest : '')); },
      up: function (i) { return !!lines[i] && lines[i].up(); },
      any: function () { return lines.some(function (l) { return l && l.up(); }); },
      count: function () { return lines.length; },
      where: function (i) { return String(urls[i] || '').replace(/^wss?:\/\//, '').replace(/[:\/].*$/, ''); },
      keep: function (i) { lines.forEach(function (l, k) { if (l && k !== i) { l.close(); lines[k] = null; } }); },
      close: function () { closed = true; lines.forEach(function (l) { if (l) l.close(); }); lines = []; }
    };
  }

  /* ---- one chosen line as a wire ----
     say(kind, rest) sends to the other side; the owner feeds what arrives to take(kind, rest) and calls lost() if the line is gone for good. */
  function wire(say, info) {
    var W = { onmessage: null, onclose: null, closed: false, via: 'relay', where: info && info.where || '', most: 20, resent: 0 };
    var out = [], next = 0, expect = 0, held = {}, sentAt = {}, waiting = {}, heard = now(), spoke = now();
    function tell(kind, rest) { spoke = now(); return say(kind, rest); }
    function gone() { if (W.closed) return; W.closed = true; clearInterval(quick); clearInterval(slow); if (info && info.over) info.over(); if (W.onclose) W.onclose(); }
    function deliver(text) { if (!W.closed && W.onmessage) W.onmessage(text); }
    // the loose ones that were held back because one like them had only just gone
    var quick = setInterval(function () { var t = now(); for (var key in waiting) if (t - sentAt[key] >= 30) { sentAt[key] = t; tell('l', waiting[key]); delete waiting[key]; } }, 16);
    // the firm ones not yet acknowledged go again; a word if there has been none; and how long since the other side was heard
    var slow = setInterval(function () {
      var t = now();
      for (var k = 0; k < out.length; k++) if (t - out[k].at > 900) { out[k].at = t; W.resent++; tell('f', out[k].n + ' ' + out[k].text); }
      if (t - spoke > 2500) tell('k', '');
      if (t - heard > 20000) gone();
    }, 300);
    W.send = function (text, loose) {
      if (W.closed) return;
      if (!loose) { var m = { n: next++, text: text, at: now() }; out.push(m); tell('f', m.n + ' ' + text); return; }
      var key = text.slice(0, 9), t = now();   // {"t":"in" and its like: of loose messages that begin alike only the newest matters
      if (t - (sentAt[key] || 0) >= 30) { sentAt[key] = t; delete waiting[key]; tell('l', text); } else waiting[key] = text;
    };
    W.take = function (kind, rest) {
      if (W.closed) return;
      heard = now();
      if (kind === 'l') deliver(rest);
      else if (kind === 'f') {
        var cut = rest.indexOf(' '), n = parseInt(rest.slice(0, cut), 10), text = rest.slice(cut + 1);
        if (cut < 1 || !(n >= 0)) return;
        if (n === expect) { expect++; deliver(text); while (held[expect] !== undefined && !W.closed) { var t = held[expect]; delete held[expect]; expect++; deliver(t); } }
        else if (n > expect && n < expect + 200) held[n] = text;
        tell('a', String(expect - 1));
      }
      else if (kind === 'a') { var got = parseInt(rest, 10); while (out.length && out[0].n <= got) out.shift(); }
      else if (kind === 'z') gone();
    };
    W.lost = function () { gone(); };
    W.close = function () { if (W.closed) return; tell('z', ''); gone(); };
    return W;
  }

  window.UndercroftRelay = { supported: supported, hub: hub, wire: wire, name: name, test: test };
})();
