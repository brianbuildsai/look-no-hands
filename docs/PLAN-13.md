# Plan 13: the long way round

Branch `feat/undercroft-relay`. Follows plan 12, whose aim ("fix multiplayer
and ensure it works") was not met.

## What happened

Second real test, 2026-09-19. The handshake fix of plan 12 held: the two
browsers found each other and exchanged descriptions. Then ICE failed. The
note on the screen was `[host h2s2r0, guest h2s2r0]`: both sides had their own
addresses and addresses as seen from outside, neither had a relayed one, and no
pair of them could reach each other. That is what two networks look like when
at least one maps every outgoing connection to a different port (carrier NAT,
many phone and campus networks, some home routers). No code on either page can
open a direct route through that. It needs a third machine both can reach.

Plan 11 chose "no relay" because a TURN relay costs somebody money and no free
public one works (tested in plan 12). That choice is what failed here.

## The idea

The game sends almost nothing: one small message of buttons per step. It does
not need a TURN server; it needs any machine that will pass small messages
between two sockets. Public MQTT brokers do exactly that, over WebSocket, for
free and without an account. Three answered from this machine on 2026-09-19:
`broker.emqx.io` (echo in 37 ms), `test.mosquitto.org` (122 ms),
`broker.hivemq.com` (131 ms).

So: a second kind of wire. Same four functions to `net.js`; underneath, MQTT
spoken by hand over a WebSocket (no library), to a topic made from the invite
code. Direct is still tried first and preferred, because it is quicker. If no
direct route opens within a few seconds the two go round by the broker
instead, without being asked and without a new code.

## Tasks

1. **`js/game/relay.js`**: MQTT 3.1.1 over WebSocket by hand (connect,
   subscribe, publish, ping, reconnect); a hub that holds a line to each broker
   in a list; a wire over one of them with a firm layer of its own (numbered,
   acknowledged, resent, delivered in order) and a loose one (the newest of
   each kind, thirty times a second), a keep-alive, and a silence limit.
2. **`js/game/wire.js`**: host and guest run both ways at once. The guest
   decides: direct if it opens in time, otherwise the first broker through
   which the host answered. The host takes whichever the guest's first message
   arrives by. The PeerJS broker being down no longer stops anybody. A full
   game says so. Test hooks: `noDirect`, `relays`.
3. **`js/game/net.js`**: a side that is stuck asks for the step it lacks
   (`want`) instead of hoping it is among the last fourteen; a wire may raise
   the most delay allowed. Harness: a scene with a blackout.
4. **The room**: the script list, the hall's source list, README, the words on
   the lobby ("relayed" or "direct", and how far apart).
5. **Proof**: two tabs with direct routes switched off for real (no
   candidates at all), through each broker in turn, 600 steps with equal
   hashes; first broker dead; a broker hung up on in mid-run; then the same on
   the live site after merging.

## Status

Done, 2026-09-19.

### What was found on the way

- **The quickest broker is the worst.** `broker.emqx.io` echoed in 37 ms and
  was chosen first by "whoever answers first". The game then ran at 20 steps a
  second. Measured: at thirty messages a second it passed on 45 of 120, in
  bursts three quarters of a second apart (its Chinese sibling the same). It
  is left out. `test.mosquitto.org` and `broker.hivemq.com` passed 120 of 120
  at thirty a second and 360 of 360 at sixty, 122 and 142 ms each way from
  here. No free broker answers on port 443 without an account (five tried).
- **How to measure a broker before adding it**: in the room's console, set
  `UndercroftRelay.test.relays = [url]`, open two hubs on the same made-up
  code (`UndercroftRelay.hub(code, 'h', ...)` and `hub(code, 'g1', ...)`), say
  `l` messages from one to the other every 16 ms with `Date.now()` in them,
  count what arrives and the gaps between. It must pass every one.
- **A socket may never finish closing.** The first hang-up test stalled for
  good: `close()` waits for the broker's half of the closing handshake, and
  nothing came back for fifteen seconds. Lines now let go of a socket
  (handlers off, close, forget) and reconnect at once.
- Relayed messages go one a step (15 ms apart at least), not thirty a second:
  both brokers take it, and it is two steps less delay.

### Proof

| what (all on localhost, two tabs) | how | result |
| --- | --- | --- |
| no direct route at all | two tabs, `test.noDirect` (no candidates gathered) | joined by relay 5 s after the answer; 1300 steps, hashes equal at every fiftieth, no resync |
| relay hung up on in mid-run | `line.hangUp()` on the host at step 276 | back in 1.1 s, one `want`, no resync, ran on to 651 and beyond |
| the PeerJS broker down | `test.noBroker` on both | host shows its code after 9 s, guest joins by relay in 9 s |
| the first relay dead | `test.relays = [dead, hivemq]`, `noDirect` | joined through the second in 6 s, ran |
| leaving over a relay | guest `netLeave()` | host: "The other of you has gone", plays on, line released |
| the direct way still preferred | two tabs, no flags | direct in 0.9 s, relay lines closed |
| net harness | six scenes, one new (a blackout of 1.5 s with the delay held at 18) | 6/6 held; the blackout used `want` once each side |
| paired scenes | `quick2` | 3/3 same |

Relayed, from this machine: round trip 246 ms (mosquitto) or 278 ms (HiveMQ),
delay chosen 10 steps, 58 to 61 steps a second.

### Not proved

- Two machines on two real networks. Both tabs here share one network; what
  the relay path needs from a network is only an outgoing WebSocket to port
  8081 or 8884, which is much less than WebRTC needs, but it is not nothing.
- A network that blocks those ports as well. The page says so; nothing else
  can be done for it without a relay on port 443, which means an account
  somewhere (a TURN server in `ICE`, or a broker in `window.UndercroftRelays`).
- The brokers staying as they are. They are free and promise nothing. If one
  begins to throttle as EMQX does, relayed games through it will crawl;
  nothing here notices that by itself.

### Decisions made for the user

- Relay through public MQTT brokers rather than ask for a TURN account.
  The buttons are readable by anybody who knows the code. Nothing else
  crosses.
- Built without a plan gate: this is the unfinished half of plan 12.
- Merged as PR #3 (`9118af4`) when the user said "make it live".

### On the live site, after the merge

Two tabs on `https://brianbuildsai.github.io/look-no-hands/rooms/undercroft.html`
with `test.noDirect`: joined by relay in 6.2 s, started, 600 steps, hashes
equal at steps 200 and 400, round trip 245 ms, delay 10, no resync, console
clean.
