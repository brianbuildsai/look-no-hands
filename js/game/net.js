/* net.js: two machines, one game.

   Nothing about the game travels but the buttons. Both machines run the
   whole simulation from the same seed; each sends the other what its player
   pressed, stamped with the step it belongs to; a step is simulated when
   both players' buttons for it are in hand. So a new guardian, creature,
   weapon or item needs nothing here: if it is deterministic, it is
   multiplayer.

   What that asks for, and how it is met:

   - Your own buttons are applied `delay` steps late (two to twelve), so that
     the other machine has them in time. Each side sets its own from the
     round trip it measures once a second and how much that wobbles, and
     moves it a step at a time as the wire changes. The two need not be equal.
     Steps before the first `delay` have no buttons at all, for anybody.
   - Every input message carries the last dozen steps, so a lost one costs
     nothing, and messages may arrive twice or out of order.
   - Every thirty steps both hash their state and compare. If they ever
     differ the host sends the small record of the run (stage, flames, each
     player's life, hands and items) and both begin that stage again from it.
   - If the other side goes quiet the game waits and says so; if the wire
     closes, or you ask, the one who is left plays on alone.

   A transport is anything with send(text, loose), onmessage, onclose and
   close(); `loose` marks what may be dropped. The game is anything with
   sample(), begin(config), step(pads), checksum(), record(), restore(record,
   step), leave(index), notice(text) and ended(). net.js knows nothing else
   about either. */
(function () {
  'use strict';

  var KEEP = 14, CHECK = 30, MOST = 12, FIRST = 2, VERSION = 2;   // FIRST: after a beginning, this many steps have no buttons for anybody

  function create(game, wire, opts) {
    opts = opts || {};
    var S = { role: null, state: 'lobby', me: 0, other: 1, delay: 3, step: 0, rtt: 0, wobble: 0, stalled: 0, guest: null, config: null, resyncs: 0, epoch: 0, sent: 0, got: 0, reason: '', via: wire.via || 'direct', asked: 0 };
    var mine = {}, theirs = {}, newest = -1, sampled = -1, hashes = {}, pending = null, pingAt = 0, pingId = 0, pings = {};
    var now = opts.now || function () { return Date.now(); };

    function send(msg, loose) { try { wire.send(JSON.stringify(msg), !!loose); S.sent++; } catch (e) { /* the wire will tell us itself */ } }
    function pack(p) { return (p.held & 2047) | ((p.pressed & 2047) << 11); }
    function unpack(m) { return { held: m & 2047, pressed: (m >> 11) & 2047 }; }
    function clearBuffers(from) { mine = {}; theirs = {}; hashes = {}; S.zeroUntil = from + FIRST - 1; newest = S.zeroUntil; sampled = S.zeroUntil; }

    /* ---- the lobby: who is here, how far away, and the word to begin ---- */

    function hello(who, power) { send({ t: 'hello', v: VERSION, b: opts.build || '', who: who, power: power }); }
    function ping() { var id = ++pingId; pings[id] = now(); send({ t: 'ping', id: id }, true); }
    function chooseDelay() { return Math.max(2, Math.min(wire.most || MOST, Math.ceil((S.rtt / 2 + 2 * S.wobble + 10) / (1000 / 60)) + 1)); }
    // the host says go: the seed, who is who, and how late everybody's buttons are applied
    function start(config) {
      if (S.role !== 'host' || !S.guest || S.state !== 'lobby') return false;   // once: a second Start (a double click, Enter twice) would begin the host's game again under a guest already playing
      S.delay = opts.delay || chooseDelay();
      S.config = { seed: config.seed, roster: [{ who: config.who, power: config.power }, { who: S.guest.who, power: S.guest.power }], delay: S.delay };
      send({ t: 'start', config: S.config, you: 1 });
      begin(0);
      return true;
    }
    function begin(meIndex) {
      S.me = meIndex; S.other = 1 - meIndex; S.step = 0; S.state = 'run'; S.stalled = 0;
      clearBuffers(0);
      game.begin({ seed: S.config.seed, roster: S.config.roster, me: S.me });
    }

    /* ---- the run ---- */

    // once per step the machine has time for: true if the step was simulated
    function advance() {
      if (S.state !== 'run') return false;
      // buttons for the step `delay` ahead are read now, and sent with the dozen before them
      while (sampled < S.step + S.delay) { sampled++; mine[sampled] = pack(game.sample()); sendInputs(); }
      if (theirs[S.step] === undefined && S.step > newestZero()) { S.stalled++; if (S.stalled === 45) game.notice('WAITING FOR THE OTHER OF YOU'); if (S.stalled % 30 === 0) { sendInputs(); send({ t: 'want', e: S.epoch, f: S.step }, true); } return false; }
      if (S.stalled >= 45) game.notice(null);
      S.stalled = 0;
      var pads = [];
      pads[S.me] = unpack(mine[S.step] || 0); pads[S.other] = unpack(theirs[S.step] || 0);
      game.step(pads);
      delete mine[S.step - 40]; delete theirs[S.step - 40];
      S.step++;
      if (S.step % CHECK === 0) { hashes[S.step] = game.checksum(); send({ t: 'hash', e: S.epoch, f: S.step, h: hashes[S.step] }); delete hashes[S.step - CHECK * 8]; }
      if (game.ended()) finish('the run is over');
      return true;
    }
    // the other side is stuck for want of a step that is no longer among the last few we send: send from there
    function sendFrom(from) {
      if (from > sampled || sampled - from > 60 || (from > S.zeroUntil && mine[from] === undefined)) return;
      var list = []; for (var f = from; f <= sampled; f++) list.push(mine[f] || 0);
      S.asked++; send({ t: 'in', e: S.epoch, f: from, m: list }, true);
    }
    function newestZero() { return S.zeroUntil; }   // steps this early have no buttons, by agreement
    function sendInputs() { var from = Math.max(0, sampled - KEEP + 1), list = []; for (var f = from; f <= sampled; f++) list.push(mine[f] || 0); send({ t: 'in', e: S.epoch, f: from, m: list }, true); }
    // how many steps of the other side's buttons are already in hand: a machine that has fallen behind may hurry
    function ahead() { return newest - S.step; }

    // they differ: the host's record is the truth, and both begin the stage again from it
    function resync(why) {
      if (S.role !== 'host' || S.state !== 'run') return;
      S.resyncs++; S.state = 'syncing';
      pending = { record: game.record(), from: S.step + 1 };
      send({ t: 'sync', e: S.epoch + 1, record: pending.record, from: pending.from, why: why });
    }
    function applySync(record, from, epoch) {
      S.epoch = epoch; S.theirHashes = {}; S.from0 = from; S.step = from; clearBuffers(from);
      game.restore(record, from);
      game.notice('TOGETHER AGAIN, FROM THE HEAD OF THE STAGE');
      S.state = 'run'; S.stalled = 0; pending = null;
    }

    function finish(reason) {
      if (S.state === 'over') return;
      var was = S.state; S.state = 'over'; S.reason = reason;
      if (was === 'run' || was === 'syncing') { game.notice(null); if (!game.ended()) { game.leave(S.other); game.notice('THE OTHER OF YOU HAS GONE. YOU PLAY ON ALONE'); } }
      if (opts.onover) opts.onover(reason);
    }
    function leave() { send({ t: 'bye' }); finish('you left'); try { wire.close(); } catch (e) { /* already */ } }

    /* ---- the wire ---- */

    wire.onmessage = function (text) {
      var msg; try { msg = JSON.parse(text); } catch (e) { return; }
      if (!msg || typeof msg.t !== 'string') return;
      S.got++;
      if (msg.t === 'ping') send({ t: 'pong', id: msg.id }, true);
      else if (msg.t === 'pong') { if (pings[msg.id]) { var r = now() - pings[msg.id]; S.wobble = S.rtt ? S.wobble * 0.8 + Math.abs(r - S.rtt) * 0.2 : 0; S.rtt = S.rtt ? S.rtt * 0.8 + r * 0.2 : r; delete pings[msg.id]; if (S.state === 'run' && !opts.fixed) { var want = chooseDelay(); if (want > S.delay) S.delay++; else if (want < S.delay - 1) S.delay--; } if (opts.onchange) opts.onchange(S); } }
      else if (msg.t === 'hello' && S.role === 'host' && S.state === 'lobby') {
        // the same protocol, and the same game to the letter: two builds would drift apart within a second and be put back at the head of the stage for ever
        if (msg.v !== VERSION || (opts.build || '') !== (msg.b || '')) { var why = 'The two of you have different versions of the game (' + (opts.build || 'old') + ' and ' + (msg.b || 'old') + '). Both reload the page with Ctrl+Shift+R, then host and join again.'; send({ t: 'no', why: why }); if (opts.onrefuse) opts.onrefuse(why); return; }
        S.guest = { who: String(msg.who || 'warden'), power: String(msg.power || 'emberwave') }; send({ t: 'welcome' }); if (opts.onchange) opts.onchange(S);
      }
      else if (msg.t === 'welcome' && S.role === 'guest') { S.welcomed = true; if (opts.onchange) opts.onchange(S); }
      else if (msg.t === 'no') finish(String(msg.why || 'refused'));
      else if (msg.t === 'start' && S.role === 'guest' && S.state === 'lobby') { S.config = msg.config; S.delay = msg.config.delay; begin(msg.you); if (opts.onchange) opts.onchange(S); }
      else if (msg.t === 'in' && msg.e === S.epoch && msg.m && msg.m.length <= 64) { for (var k = 0; k < msg.m.length; k++) { var f = msg.f + k; if (f >= S.step && theirs[f] === undefined) { theirs[f] = msg.m[k] | 0; if (f > newest) newest = f; } } }
      else if (msg.t === 'want' && msg.e === S.epoch && S.state === 'run') sendFrom(msg.f | 0);
      else if (msg.t === 'hash' && msg.e === S.epoch) { if (hashes[msg.f] !== undefined && hashes[msg.f] !== msg.h) resync('step ' + msg.f); else if (hashes[msg.f] === undefined && msg.f > S.step) (S.theirHashes || (S.theirHashes = {}))[msg.f] = msg.h; }
      else if (msg.t === 'sync' && S.role === 'guest') { applySync(msg.record, msg.from, msg.e); send({ t: 'synced', from: msg.from }); }
      else if (msg.t === 'synced' && S.role === 'host' && pending && msg.from === pending.from) applySync(pending.record, pending.from, S.epoch + 1);
      else if (msg.t === 'bye') finish('they left');
    };
    wire.onclose = function () { finish('the connection closed'); };

    // hashes that arrived before ours was made are compared when it is
    var rawAdvance = advance;
    advance = function () {
      var did = rawAdvance();
      if (did && S.theirHashes && S.theirHashes[S.step] !== undefined) { if (hashes[S.step] !== undefined && hashes[S.step] !== S.theirHashes[S.step]) resync('step ' + S.step); delete S.theirHashes[S.step]; }
      return did;
    };

    return {
      S: S,
      host: function () { S.role = 'host'; },
      join: function (who, power) { S.role = 'guest'; hello(who, power); },
      start: start, advance: function () { return advance(); }, ahead: ahead, leave: leave,
      // call about once a second while in the lobby or the run: keeps the round trip measured
      beat: function () { if (S.state !== 'over') ping(); },
      active: function () { return S.state === 'run' || S.state === 'syncing'; },
      waiting: function () { return S.state === 'syncing' || S.stalled >= 45; }
    };
  }

  window.UndercroftNet = { create: create, VERSION: VERSION };
})();
