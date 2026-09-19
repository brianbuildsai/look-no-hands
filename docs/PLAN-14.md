# Plan 14: the same game on both machines

Branch `fix/undercroft-steady`. Follows plan 13 (the relay), which got two
real players into one game for the first time.

## What happened

Third real test, 2026-09-19: "we got into the same lobby, it worked, but now
we can't even move from spawn without getting teleported back."

Being put back at the head of the stage is what a **resync** looks like: every
thirty steps the two machines compare a hash of the game, and when they differ
the host's record wins and both begin the stage again. Once is a hiccup. Every
half second is two games that can never agree.

Nothing in two tabs of one browser showed it. So the tests were changed until
something did.

## What was found, in the order it was found

1. **Two browsers do not compute the same game.** The harness was run in
   Chrome and in headless Firefox on the same eighteen scripted scenes and the
   final hashes compared: 8 of 18 differed, all of them ordinary stages, none
   of the guardian arenas. Cause: `explore.js` shuffled the furniture of a room
   with `list.sort(function () { return rnd() - 0.5; })`. Every engine sorts
   with a different algorithm, asks the comparator different questions, and so
   draws a different number of random numbers in a different order: **the two
   players were in different levels from the same seed**, for ever, and no
   resync could mend it. (The first failure, plan 12, was one only Firefox and
   Safari trigger, so the second player was almost certainly on one of them.)
   Beside it, `Math.sin`, `cos`, `atan2` and `pow` (311 uses) are each engine's
   own and differ in the last place now and then; Safari's most of all.
2. **Two players can be running different code.** The reproduction between
   two Chromes (20 resyncs in 600 steps, exactly the user's symptom) turned out
   to be one tab holding a cached `explore.js` from before the fix under a new
   page. That is a real hazard after every deploy: GitHub Pages lets browsers
   keep files for ten minutes and browsers keep them longer by guesswork.
3. **Start could count twice.** A second click (or Enter twice on the panel)
   began the host's game again under a guest already playing: one resync in the
   first second of every game started that way.
4. In passing: the site's "Pause motion" set the game's `state` on one machine
   only; and with the stage out of focus the site's arrow keys turn the page,
   which would leave the other player alone.

## What was done

- `js/game/steady.js`: `sin`, `cos`, `tan`, `atan`, `atan2`, `log`, `exp`,
  `pow` built only from operations the standard fixes (good to about 1e-12
  against the engine's own; exact at 0, pi/2, pi), and `shuffle`. All 311 uses
  in the game's files now go through `ST.`; the shuffle is a proper one.
  `sound.js` is not part of the simulation and keeps `Math`.
- `tools/make-rooms.js` stamps room 36 (`stamp: true`) with a hash of its
  scripts: `data-build` on the stage, `?v=<hash>` on every script. `net.js`
  sends the stamp in `hello`; the host refuses a different one with words that
  say what to do. Protocol version 2, so that a page from before refuses too.
- `net.js`: `start()` only from the lobby. The Start button goes dead once
  used.
- `undercroft.js`: `still`/`motion` leave `state` alone while a session runs;
  a game key pressed outside the stage during a session comes back to it.
- `tools/lockstep.html`: reads the sources for arithmetic that differs between
  engines and for random sorts; checks the stamp against the scripts; prints an
  `across browsers:` line to compare between browsers (with `?report=name` it
  also shows in the server's log, for a browser with no window).
- `tools/crossplay.html` (new): one player of a real two-player game, played by
  script through the room's own frame loop and real key events, so that two
  browsers can be set against each other over the real wire.

## Proof

| what | result |
| --- | --- |
| 18 solo scenes, Chrome against headless Firefox, before | 8 of 18 final hashes differ |
| the same, after | 18 of 18 equal |
| 18 two-player scenes, Chrome against Firefox, after | 18 of 18 equal |
| a real game, Chrome host and Firefox guest, relay forced, both mashing keys, Start clicked twice | 3,943 steps, **0 resyncs** (before the Start fix: 1, in the first second) |
| two Chromes on different origins (separate saved progress), relay, the room's real frame loop, real key events | 3,600 steps, 0 resyncs |
| mismatched code (one tab with a stale file) | reproduced the user's symptom: 20 resyncs in 600 steps. Now impossible to start: scripts are asked for by hash and the host refuses a different stamp |
| net harness | 6 of 6 held |
| source scan and stamp check | clean |
| steady against `Math`, 400,000 random arguments | sin, cos within 1.3e-12; atan2 2.4e-13; pow, exp, log within 4e-15 relative |

## Not proved

- **Safari.** There is none on this machine. The argument for it is the same
  as for Firefox: nothing the simulation computes is left to the engine any
  more. `tools/lockstep.html` on a Mac or an iPhone, its last line compared
  with Chrome's, would settle it in two minutes.
- Two machines on two networks, again. What differed between machines is now
  covered (engine, cached code, saved progress); the wire was covered in plan
  13.

## Decisions made for the user

- The drawing uses the steady functions too (one rule, no exceptions to
  remember). They cost about the same as the engine's.
- Hosts on the new version refuse guests on the old one, and the other way
  round. Both reload. That is the point of the stamp.
