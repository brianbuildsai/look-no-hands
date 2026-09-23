# Plan 16: two doors in, and a floor to begin on

Same branch as plan 15 (`feat/undercroft-sunken-wood`), so that one merge
carries both, as the user asked: "Merge it, and allow me to test the new room.
Have the new merge show two tabs upon entry of the website, one for the cool
tabs, then one for the game. Then in the game allow me to select the new level
to test."

## Tasks

1. **A floor to begin on (room 36).** A FLOOR line on the main screen, left
   and right to change it, each floor named in its own colour, the Sunken
   Wood marked new. `?floor=N` on the room's address chooses it in advance.
   A run begun below floor 1 is practice: it starts at that floor's
   sanctuary with the starting kit, and nothing it does is kept (best floor,
   wins, runs, unlocks). A hosted game carries the host's floor to the guest
   in the start message, and the run's record carries it through a resync.
   Proof: begin on floor 2 alone and hosted (two tabs), the summary says
   practice, the lockstep harness still passes.
2. **Two tabs on the way in (the hall).** A pill of two tabs under the
   masthead, there from the first moment: the exhibition, as it is now, and
   the game. The game tab is a page of its own: the Undercroft, a way down,
   how to play together, and all ten floors to begin on, each a link to the
   room with `?floor=N`, the new one marked. `#game` opens it directly;
   the exhibition's links bring the exhibition back. While the game tab is
   shown the hall's works are hidden and stop drawing. Proof: both tabs at
   375 and 1440, keyboard, the address, the works paused.
3. **Words and the merge.** README, this plan's status, the PR; merge; check
   both on the live site.

## Status

Built, 2026-09-22, on the plan 15 branch so that one merge carries both. No
plan gate: the request said what to build and to merge it.

### Decisions made for the user

- Practice runs keep nothing, so beginning on floor 9 cannot put a false
  "best floor" or a win on the main screen.
- A practice run starts in the chosen floor's sanctuary (a font and three
  perks), not in its first stage, with the starting weapon and power.
- The game tab is a page that sends you into the game, not the game inside
  the hall: the room's own page is where the game, its sound and its
  two-player controls live.
- The Game tab says "New floor" while the Sunken Wood is new.

### Proof

| what | result |
| --- | --- |
| `?floor=2` | the main screen's FLOOR line reads 2 THE SUNKEN WOOD |
| the FLOOR line | right, right, left from 2, then Go down: the run begins in floor 3's sanctuary |
| a practice death | best floor, runs, wins and unlocks unchanged; the last screen says practice |
| hosted on floor 2 | host and guest both in the Wood's sanctuary; 597 hashes compared, none differed |
| lockstep harness `all` | 20 of 20 together; final hashes identical to plan 15's (floor-1 runs unchanged) |
| net harness | 6 of 6 held |
| the hall at 1440 and 375 | two tabs on arrival; game page; floors 5 and 2 to a row; no sideways scroll |
| keys and address | arrows move between tabs; `#game` opens straight to the game; a room link brings the exhibition back |
| from the hall into the game | the Sunken Wood's card, then Enter, Enter: a run on floor 2 |
