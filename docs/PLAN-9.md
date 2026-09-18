# Plan 9: Undercroft, fourth pass — deeper, clearer, louder

Branch `feat/undercroft-depths`, off `feat/undercroft-classes`. One commit per
task, each verified in the browser (1440 and 375 px, console clean in a fresh
tab).

## What changes

**A guardian's reward is random, and floats.** Today a fallen guardian opens
the same card screen every time (the four powers). Instead, where it fell,
three rewards rise over plinths exactly as perks do in a sanctuary, drawn at
random from a guardian's pool: a power you do not hold (taking it swaps
yours), a boon only guardians give (a heart container, an energy cell, a
whetted edge, a second flame for the lantern, a quicker dash, a longer
reach), a weapon of master rarity or better, a master or legendary item.
Never the same three twice in a run. Take one; the door opens. The card
screen is retired entirely.

**Every item says what it does, in a box.** No more "one more on every
stroke". Each of the 28 items, 13 weapons, 4 powers and the new boons gets a
literal description with its numbers, read from the same constants the code
uses where that is possible: "Burning creatures set fire to others within 40
pixels. Burn deals 2 a tick instead of 1." The box is drawn over the dark, by
whatever you stand near (perk, reward, pickup on the floor): a framed panel in
the rarity's colour with the name, a rarity tag, the kind (ITEM, ABILITY,
WEAPON, POWER, BOON), the effect in short lines with + and - marked green and
red, a weapon's strokes and damage, and the key to take it. It flips side so
it never leaves the picture and never covers the thing itself.

**Two more floors.** Each element gets a floor of its own and a guardian of
its own: Kilns (Golem), Cellars (Wyrm), **Cisterns (new guardian)**, Galleries
(Herald), **the Vault's approach (new guardian)**, then the Lightless.

- *The Thornmother*, in the Overgrown Cistern (bloom). A great bulb rooted in
  the middle of the hall with a shut flower for a head and four vines. Vines
  sweep the floor low (jump) or high (stay down), roots burst up in a row of
  marked cracks that walks toward you, it spits seed pods that land and open
  into brambles you can cut down, and breathes a drifting pollen. After each
  great effort the flower opens and the heart inside is soft. Below half, two
  vines at once, the brambles fruit into puffballs, and the pollen hunts.
- *The Orrery*, in the Dark Observatory (void; the building has a room of
  tonight's planets). A black core with three moons on rings. The rings
  widen and narrow through marked orbits you weave between; a moon is flung at
  a marked spot and rolls back; the core pulls everything toward it while the
  inner ring spins, then lets go; it eclipses, and is elsewhere. Break a moon
  (they have their own life) and the core's shell cracks: it is soft until the
  moon re-forms. Below half, the moons leave trails that burn for a moment and
  the pull comes with a flung moon.

Creatures scale more gently with depth so six floors stay fair, and the run
gains two explored stages and their sanctuaries.

**Sound that is recorded, not only synthesised.** With your ElevenLabs key,
`tools/make-sounds.js` asks the sound-effects API for every effect the game
needs from a written manifest (name, prompt, length), about fifty: strokes for
each family of weapon, hits on flesh, stone and metal, each class's dash, the
jump and the somersault, landing, hurt, death, each power, each creature's
attack, each guardian's roar and signature blows, portal hum and stepping
through, the font, a perk taken, chests, rarities' stings, the legendary
ceremony, menus. Files go in `audio/undercroft/` as mp3, a few dozen
kilobytes each. `sound.js` loads them when sound is first asked for, plays
them with a little pitch variation so repeats do not grate, and keeps the
synthesised effect as the fallback for anything missing. The music stays
synthesised. The key is read from an environment variable, is never written to
a file and never committed.

## Tasks

1. Guardian rewards: the pool, the boons, floating rewards in the hall, the
   door opening on a choice, the card screen removed.
2. Literal descriptions for everything, and the infobox; used by perks,
   rewards and pickups.
3. Six floors: the stage table, an element a floor, gentler scaling, halls
   chosen by guardian rather than by floor number.
4. The Thornmother and the Overgrown Cistern.
5. The Orrery and the Dark Observatory.
6. `tools/make-sounds.js`, the manifest, and the generated files.
7. `sound.js` plays samples with synth fallback; new sound events wired in.
8. Balance by scripted fights, then the final pass (copy that no longer says
   nothing is loaded, README, plan status, audits, consoles).
