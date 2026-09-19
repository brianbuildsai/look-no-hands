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

(filled in at the end)
