# Plan 11: GitHub, and two in the undercroft

Branch `feat/undercroft-together`, off `feat/undercroft-armoury`. One commit
per task, each verified (browser, 1440 and 375, console clean in a fresh tab).
No libraries, nothing built.

## Part one: GitHub

- A repository under `brianbuildsai` (the account gh calls brian77-git) (name `look-no-hands` unless you say
  otherwise), every branch pushed, `main` fast-forwarded to the finished game
  (it is a plain ancestor of it, 108 commits behind, so nothing is rewritten).
- GitHub Pages serving `main` from the root: the site is static and needs no
  build, and **a friend needs a URL to open before a code can mean anything.**
- History was checked before pushing: no key or token in any commit. Commits
  carry your address (krampbrian77@gmail.com), which a public repository shows.
- Multiplayer work then goes on its own branch with a pull request, as usual.

## Part two: multiplayer that does not need rewriting for every new boss

### The choice that matters: lockstep, not replication

There are two ways to put two people in this game.

*Replication*: the host simulates, and sends the guest the state of every
creature, missile, telegraph, bubble, cog, mirror and vine twenty times a
second. Every new guardian then needs its own network code (its private
`vars`, its hand-drawn missiles, its scenery), and anything forgotten is
invisible or harmless on the guest's screen. It would work today and rot
with every addition.

*Lockstep*: both machines run the **whole game** from the same seed, and send
each other **only the buttons pressed**, stamped with the frame they belong
to. A frame is simulated when both players' buttons for it have arrived. A
new boss, creature, weapon or item then needs **no network code at all**: if
it is deterministic it is multiplayer. The engine already steps at a fixed
sixtieth of a second from a seeded generator, which is most of what lockstep
asks for. That is the plan.

What lockstep costs, and what is done about it:

- *Determinism.* Anything random inside the simulation must come from the
  seeded stream, and drawing must never consume it. The generator is split in
  two (simulation and cosmetic; the engine switches by itself while
  rendering, so old and future drawing code cannot get it wrong). Both
  machines hash their state every half second and compare.
- *If they ever differ* (a browser whose `Math.sin` rounds differently, a
  bug): the host sends the small authoritative record of the run (stage,
  seed, flames, each player's life, hands, items, power) and both reload the
  stage from it. You lose progress within that stage, not the run.
- *Latency.* Your own buttons are applied a few frames late (2 to 6,
  measured from the round trip), which is below notice at friend-to-friend
  pings; if packets stall the game waits and says so rather than guessing.
  Every packet repeats the last dozen frames of input, so loss costs nothing.
- *Two heroes in one simulation.* Today the hero is one object and some
  forty loose variables (hands, items, afflictions, power, weapon effects).
  They become a player record that is loaded into those variables while that
  player is stepped or drawn. Single-player is the same code with one record.

### Rules for two (decided here; easy to change)

- Two players. The simulation is written for a list of players; the lobby
  admits two.
- One lantern: the three flames are shared. A fallen player rises, half
  whole, when the other reaches the next stage; if both fall a flame is spent
  and the floor begins again, as now.
- Creatures go for whoever is nearer. Creature life x1.5, guardians x1.6.
- Anyone stepping through a portal takes both. In a sanctuary, and after a
  guardian, each takes one of the three. What falls from chests is first come.
- Each player has their own camera, HUD, class, hands, items and power; a
  small marker at the edge of the picture points to the other, with their life.
- Pause is either player's, for both. A tab that is hidden pauses for both.

### Connection

An invite is a short code (and a link with the code in it). Under it is a
WebRTC data channel straight between the two browsers; only the handshake
needs a third party. The transport is one small interface, so the means of
handshake can be changed or added to without touching the game.

## Tasks

1. GitHub: ignore file, repository, branches, `main`, Pages, README badge of
   where it lives.
2. Two random streams, a state hash, and `tools/lockstep.html`: a harness
   that runs two copies of the room side by side, feeds both the same
   buttons, and fails on the first frame their hashes differ. Run it through
   every stage kind and all nine guardians, and fix what it finds.
3. Buttons as data: the simulation reads a per-player record of held and
   just-pressed buttons, filled from the keyboard or touch (one player) or
   from the wire.
4. The player record: every per-hero variable moves into it and is switched
   in and out; one player, nothing changes (proved by the existing probes,
   all weapons, scripted duels).
5. A second hero in the simulation: stepped, drawn in their own class and
   weapon, lit, targeted by whoever is nearer, struck separately (an attack
   can hit each once), their missiles and weapon effects credited to them.
   A probe adds a second player driven by script, so this is testable alone.
6. The rules for two: portals, perks and rewards one each, first-come loot,
   falling and rising, the shared flames, scaling, pause, the legendary
   ceremony, the summary, the pointer to the other player. Guardians' own
   contact checks (bubbles, cogs, shards, echoes, brambles) go through one
   new helper that tries every hero, and that helper is what future content
   is told to use.
7. `js/game/net.js`: the lockstep session over any transport: start
   handshake (seed, classes, powers, delay), stamped and repeated input,
   waiting, hashes, resync, leaving (the one left plays on alone). Proved in
   the harness with added delay, jitter and loss.
8. The transport: WebRTC, and the handshake behind the invite code.
9. The lobby: Host / Join in the room's controls and on the title screen, the
   code and a link to copy, who has joined, errors in plain words; works on a
   phone.
10. End to end in two tabs through the real transport: a stage, a sanctuary,
    a guardian, a death and a rising, a leaver. README: how it works and the
    three rules new content must keep. Plan status, audits.

## Status

All ten tasks done on `feat/undercroft-together` (tasks 8 and 9 in one commit:
the wire and the lobby could only be proved together).

GitHub: the repository is <https://github.com/brianbuildsai/look-no-hands>
(`brianbuildsai` is the account's real login; `gh` labels it brian77-git).
Every branch is pushed, `main` was fast-forwarded to the finished game, and
Pages serves `main` at <https://brianbuildsai.github.io/look-no-hands/>. The
first push hung on Windows' credential prompt; pushes are made with
`git -c credential.helper='!gh auth git-credential' push`, which changes no
configuration. History was searched for keys before it went public: none.

Decided along the way:

- Lockstep, not replication: only buttons cross the wire, so new content needs
  no network code, only determinism. The cost was moving the hero's forty
  loose variables into a player record that is switched in and out (`use`).
  The refactor was proved by hash: eighteen harness scenes ended on exactly
  the hashes they had before it.
- Chance is two streams, and `render()` switches them itself. `begin()` now
  seeds the simulation's stream from the run's seed (it never had been).
- Two leaks were found by the harness and fixed: the bell relic reached as far
  as the *camera*, and Thunderhead's bolt drew more or less chance depending
  on the camera's height. Both now measure from the hero or the ground.
- Each side sets its own input delay (2 to 12 steps) from the round trip it
  measures and how much it wobbles. An earlier version raised the delay
  whenever it had to wait, which a merely slower machine also causes, and
  climbed to the maximum on a good wire; that was removed.
- The PeerJS public broker silently hangs up on any message not shaped like
  the PeerJS library's own (payload `type`, `connectionId`, and for offers
  `label`, `reliable`, `serialization`, `browser`). `wire.js` shapes its
  messages so. This cost an hour and is written in the file's header.
- With company a blow's pause (hitstop) is at most two steps, since everybody
  feels it. Whoever is down rises at the next stage with half their life.
  Perks and guardian rewards are one each; chest loot is first come.
- Room 36's controls now come before its long label text (they were 1600
  pixels down the page), by a `controlsFirst` flag in `tools/rooms.js`; every
  other room's page is byte for byte what it was.
- Not done: a relay for networks that refuse direct connections (you chose
  the broker alone; `wire.js` is four functions to replace if you add one),
  more than two players (the simulation is written for a list; the lobby and
  `net.js` admit two), joining a run already under way.

Proved:

- `tools/lockstep.html`: eighteen scenes alone, the same eighteen with two
  heroes and each copy seated as a different one, 1000 to 1200 steps each,
  never apart. Five scenes over a bad wire: good; 110 ms each way with jitter
  and one packet in five lost (96% of full speed); begun with far too little
  delay (it learns); a copy spoiled on purpose (one resync, then identical);
  the wire cut (both play on alone).
- Two real browser tabs through the real broker and WebRTC: code issued, link
  prefilled the guest's field, 900 steps with identical hashes and no resync,
  delay settled at 2; the guest left and each side played on.
- By script in one simulation: life scaling, one perk each and the portal
  opening only after both, one down and the run going on, rising half whole
  through a portal, both down spending a flame.
- Not proved here: two machines on two real networks. That needs you and a
  friend; what would fail there is NAT traversal, and the page reports it.
