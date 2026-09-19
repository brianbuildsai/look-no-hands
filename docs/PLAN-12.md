# Plan 12: the first real test failed; and a main screen worth the name

Branch `feat/undercroft-lobby`, off `main`.

## What was wrong

The guest sat at "Looking for the game" and the host at "Someone is joining".
That is the handshake failing, not the networks: the guest never received the
host's answer. Reproduced here: **the PeerJS public broker closes the socket
of anyone who sends it a network candidate with nothing in it**, and Firefox
and Safari send exactly that to say "that is all of them". The guest was cut
off before the answer could reach it. (Two Chrome tabs never send it, which
is why the earlier two-tab proof passed.)

## Tasks

1. `wire.js`: send no candidates at all. Each side gathers its own and sends
   them inside the offer or the answer: two broker messages in all. The guest
   repeats its offer until answered, the host repeats its answer to a repeated
   offer, either reconnects to the broker under the same name if hung up on,
   and a failure says at which step, with what each side had to offer.
2. The main screen: a menu (go down alone, host a game, join a game, power),
   the four heroes on a ledge with the one who went last lit, the keys as
   key-caps, thumb-sized lines on a phone. Hosting and joining happen on it:
   the code large, the lobby's words, Enter to start, Esc to close. Choosing
   who goes leads to the run, to hosting, or to joining.
3. The long paragraph leaves room 36's page (kept, shortened in purpose, for
   the docent's corpus only). README and this status.

## Status

All three done, one commit each.

- The handshake was proved in two tabs through the real broker with the
  host's broker socket hung up (it came back under the same code) and its
  first two answers thrown away (the guest asked three times and connected),
  then 400 steps in lockstep with identical hashes. Then the whole flow from
  the new main screen: host by menu, guest by menu, code typed, Enter, Enter.
- No free public TURN relay answers any more (the Open Relay Project's were
  tried: nothing). So two networks that both refuse direct connections still
  cannot be joined. `wire.js` takes a relay in one place (`ICE`, or
  `window.UndercroftICE`); a free Metered or Cloudflare account gives one.
  When that is the cause the page now says so and shows a note such as
  `guest h2s1r0, host h1s0r0` (s0 means STUN could not see that side from
  outside; r0 means no relay).
- Not proved here: Firefox or Safari as a real guest (neither is available in
  this environment). The cause was reproduced at the broker with the message
  they send, and that message is no longer sent by anybody.
