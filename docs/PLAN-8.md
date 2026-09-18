# Plan 8: Undercroft, third pass — who goes down, and where

Branch `feat/undercroft-classes`, off `feat/undercroft-bosses`. One commit per
task, each verified in the browser (1440 and 375 px, console clean in a fresh
tab). Art is text compiled at load, as everywhere else; no images, no
libraries.

## What changes

**Everyone jumps twice.** The second jump stops being an item. The Aeolian
Boots become a third jump.

**Four who go down**, chosen on a screen before the run (remembered between
visits). They share one skeleton, so every one of them can carry all eleven
weapons and every weapon's frames are built for whoever holds it; what differs
is the drawing, the numbers, the first weapon, and what dash and jump *are*.

1. **The Warden** — as she is. Short sword, six hearts, three energy, a dash
   that cannot be hurt. The all-rounder.
2. **The Smith** — broad, a visored helm with one glowing slit, leather apron,
   great gauntlets, a forge-lamp at the belt. Eight hearts, slower on the
   feet. Starts with the hammer. The dash is a shoulder charge that wounds and
   staggers what it meets instead of passing through; down-and-jump in the air
   comes down like an anvil without needing the greaves; a blow landed during
   a creature's wind-up always breaks it.
3. **The Lamplighter** — tall hat with a wide brim, long coat, and the lantern
   on a pole: the pole is the weapon (new, common: three shots of lantern
   light, the third a piercing one). Four hearts, five energy, energy back
   twice as fast. Holding jump floats her down without the cape; the dash is a
   backward flicker that leaves a flare where she stood, which bursts.
4. **The Kite** — the movement one. Slim, a white mask under a hood, two long
   ribbons, wrapped legs, a short cape. Five hearts, the quickest runner.
   Starts with the twin daggers. His dash is a blink: he is simply elsewhere,
   64 pixels on, through creatures and blows, with a ribbon of afterimages,
   and it comes back quickly and again in the air after a kill. He jumps
   three times, holds and leaps from walls without the gauntlets, and the
   second and third jumps are full somersaults: a tucked frame turned through
   eight headings, ribbons trailing.

The Lightless's first third becomes whoever came down, not always the Warden.

**Rooms you explore.** Stages stop being corridors sixteen tiles high. A
stage is a grid of chambers (4 wide by 3 tall, each about a screen), some 72
by 44 tiles: three screens across and three and a half high. The generator
walks a guaranteed way from the start to a far chamber and puts the portal
there, then opens side chambers as branches and dead ends: shafts with
one-way ledges to climb and drop through, terraces, bridges over the element's
hazard, high alcoves, a few sealed pockets you reach only by dropping in.
Chests and elders sit in the dead ends, so looking around pays. Every layout
is checked by the same conservative flood fill as before (single jumps only,
so the second jump is slack, not a requirement), and tested in Node over
hundreds of seeds. A small map of the chambers you have seen sits under the
clock; the Almanac shows the whole of it and the portal.

**The portal.** No door at the end of a corridor: a turning ring of the
element's colour somewhere in the stage, heard before it is seen. Stand in it
and press Up.

**The sanctuary between.** Every portal leads first to a small still hall: a
font that makes you whole as you arrive, and three perks floating over plinths,
turning slowly in their rarity's aura (blue, purple, red, gold), named as you
come near. Take one with Up; the other two go out; the portal onward wakes.
After a guardian the offer leans rarer. The old choice cards go.

**The way down, as it will be:** Kilns → sanctuary → Golem → sanctuary →
Cellars → sanctuary → Cisterns → sanctuary → Wyrm → sanctuary → Galleries →
sanctuary → Vault approach → sanctuary → Herald → sanctuary → the Lightless.
A lost flame still raises you at the head of the floor.

## Tasks

1. Two jumps for everyone; the Boots become a third; reachability untouched.
2. Skins: `pixels.js` builds frames for a class and a weapon; the Warden
   looks exactly as she did; the engine and the Lightless ask by class.
3. The Smith: drawing, numbers, charge, anvil drop, wind-up breaking.
4. The Lamplighter: drawing, the lantern pole (new weapon), float, flare.
5. The Kite: drawing, blink, three jumps, walls, the somersault frames.
6. The choosing screen: four on plinths, moving; name, line, hearts, energy,
   first weapon, what is theirs alone; keys and touch; remembered; probes.
7. The explorer generator: levels of any height, chambers, the sure way,
   branches, pockets, chests, lamps, creatures; flood fill; Node test.
8. The engine for tall stages: camera, backdrop, culling, the seen-chambers
   map, the portal and stepping through it.
9. The sanctuary: the hall, the font, three floating perks, the new order of
   stages, guardians' rewards adjusted, the cards retired.
10. Balance (creatures per chamber, time per stage, each class through a
    guardian by script) and the final pass: copy, README, plan status,
    audits, consoles.

## Status

All ten tasks done on `feat/undercroft-classes`, one commit each, every one
verified in the browser with a clean console in a fresh tab.

Decided along the way:

- The four share one skeleton: a class is a skin (parts, where they hang,
  where the hand is, a palette, optional extra frames) plus numbers and
  switches. The Warden's frames are pixel for pixel what they were. The
  Lightless begins as whoever came down.
- The Smith begins with a common Forge Hammer and the Lamplighter with a
  common Lantern Pole, both new, so neither starts with a rare weapon.
  Measured against a guardian held still: Warden 3.3 damage a second, Kite
  3.3, Lamplighter 4.1 from a distance with four hearts, Smith 7.5 with a slow
  step. By the scripted fighter the Kiln Golem falls to the Warden in 31 s,
  the Smith in 32 s, the Kite in 32 s; the Kite beats the Lightless in 48 s.
  The fighter cannot play the Lamplighter (it stands in front of everything).
- "Heard before it is seen" became seen: a glimmer at the edge of the picture
  on the side the portal lies, when it is within a chamber or two.
- A guardian's fall still opens the altar (powers); only the relic cards were
  retired. A sanctuary risen into again after a death has a font and bare
  plinths, so dying is not a way to a second perk.
- The run is seventeen stages: five explored, eight sanctuaries, four
  guardians.
- The old corridor generator is still in `world.js` (its chunks and flood
  fill are what the explorer's checks are built on) but no stage uses it.

Fixed on the way: the keys held down and the relics carried shared one
variable name, so a window losing focus emptied the relic list.

Generator: 800 seeds in Node, none unreachable, under a millisecond each;
about fourteen creatures and two or three chests a stage, the portal eight
chambers from the start on average. Ladders were climbed in the real physics
with single jumps.

Audits: static audit clean; all 32 pages at 1440 and 375 with no overflow,
errors or fallbacks; the choosing screen and the game fit a phone.
