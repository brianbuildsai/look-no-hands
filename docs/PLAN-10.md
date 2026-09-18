# Plan 10: Undercroft, fifth pass — two hands, three more floors, an armoury

Branch `feat/undercroft-armoury`, off `feat/undercroft-depths`. One commit per
task, each verified in the browser (1440 and 375 px, console clean in a fresh
tab). No new dependencies, nothing built.

## What changes

**Two weapons.** The hero carries two. `Q` (and a tap on the slots on a phone)
changes hands with a quick flourish; the frames for both are built when a
weapon is picked up so the change costs nothing. A weapon found goes into the
empty hand if there is one, otherwise it takes the place of the one in use,
which drops where you stand. Bottom left of the picture: two framed slots in
each weapon's rarity colour with the weapon itself drawn in them, the one in
use larger and lit, the other dim, the key between them. The infobox says
which hand a found weapon would take. Class starters stay in hand one.

**Three more floors, nine in all.** Each new floor is a new element with its
own stone, hazard, touch, music, two creatures and a guardian in a hall of its
own. The way down becomes: Kilns, Cellars, Cisterns, **the Drowned Stacks**,
Galleries, **the Works**, **the Hall of Glass**, the Vault's approach, the
Vault. Creature life grows more gently per floor so nine stay fair.

- *Tide, the Drowned Stacks* (sea-green, brine pools; touch: **soaked**, your
  jumps and dashes fall short for a few seconds).
  The **Diver**: a drowned brass diving suit that plods, plants its feet and
  fires a harpoon on a chain along a marked line, then reels itself to where
  it stuck. The **Angler**: swims through the air with a lure that is the
  only thing you see of it in the dark; the lure goes out, and it bites along
  a marked line.
  Guardian, **the Bellkeeper**, in the Sunken Belfry: a great hermit crab
  living in a fallen bronze bell. Claw sweeps; it shuts itself in the bell and
  tolls rings of force along the floor at two heights; streams of bubbles that
  can be burst; a marked surge crosses the hall and the ledges are the only
  dry place. Shut in the bell it cannot be hurt, but strike the bell three
  times and it tolls on the crab, which falls out stunned and soft.
- *Gear, the Works* (brass, grinding cogs; touch: **jammed**, your power will
  not fire and your energy does not return for a few seconds).
  The **Winder**: a wind-up knight with a key in its back; a three-turn
  spinning advance, then it runs down and stands open until it has wound
  itself again. The **Governor**: a spinning flyball that throws a cog which
  runs along the floor, climbs the wall and comes back.
  Guardian, **the Regulator**, in the Escapement: a clock face on the far
  wall and a pendulum with a face of its own that swings the width of the
  hall. The hands sweep as marked lines; it strikes the hour, and that many
  weights fall on marked spots; thrown cogs stick in the walls and then, at a
  tick, fly back the way they came. When it strikes, the face opens and the
  works inside are soft. Below half, time runs fast then slow in marked beats.
- *Glass, the Hall of Glass* (rose and silver, standing shards; touch:
  **cut**, the next wound within four seconds costs one heart more).
  The **Reflection**: a glass knight that turns to face you and throws back
  anything flung at its shield; open from behind and after its lunge. The
  **Prism**: a floating crystal whose beam splits in three at a marked point.
  Guardian, **the Reflected**, in the Hall of Glass: three tall mirrors stand
  in the hall and it lives in them. It reaches out of one to strike while the
  others show false reflections (the true one casts your lantern's glint);
  hanging shards turn and fly along marked lines; strike the true pane to
  crack it. With all three broken it steps out, quick and brittle, throwing
  fans of shards and leaving reflections that strike a beat after it does.

**Thirteen more weapons, twenty-six in all**, with two new movesets (spear:
long thrusts; thrown: goes out and comes back) and a small module of their
finishing effects so the engine file does not swell.

- Common: **Hand Axe**, found on the first floors so the second hand fills early.
- Rare: **Pike** (finisher: a lunge that carries you through them);
  **Returning Disc** (strikes going out and coming back).
- Epic, one per new element: **Trident of the Stacks** (a geyser lifts and
  soaks), **Mainspring Saw** (each hit is two; a saw runs along the floor and
  back), **Glass Sabre** (the thrust splits into a fan of three shards).
- Master: **Umbral Flail** (a small singularity drags them together and
  crushes), **Bellringer's Maul** (a toll that stuns everything near).
- Legendary, the five the work goes into:
  **Thunderhead**, a storm spear: the finisher calls a storm, marked bolts
  fall on the six nearest one after another, the hall flashes, and your dash
  leaves lightning behind it.
  **Last Light**, a sheathed blade: single draw-cuts; the finisher crosses a
  hundred and twenty pixels through everything, the picture goes black but
  for one white line, and a beat later everything on the line is cut.
  **Pendulum**, an hourglass on a chain: the finisher stops time, creatures
  and missiles hang in sepia for two and a half seconds while you do not.
  **Constellation**, a staff: bolts leave stars where they strike; the
  finisher joins up to seven with lines of light that burn what crosses them,
  then the whole figure bursts.
  **Leviathan**, an anchor: the finisher brings a spectral whale up through
  the floor in an arc across the screen, and a wave each way where it lands.

## Tasks

1. Two hands: slots, `Q` and touch, pickup and drop rules, the HUD slots,
   infobox foot, summary and probes.
2. The finishing-effects module, the two new movesets, and the eight weapons
   below legendary.
3. Legendaries I: Thunderhead and Last Light.
4. Legendaries II: Pendulum, Constellation and Leviathan.
5. Three elements (stone, hazard, touch, palette, music), the nine-floor stage
   table with stand-ins, gentler scaling.
6. Tide's creatures: the Diver and the Angler.
7. Gear's creatures: the Winder and the Governor.
8. Glass's creatures: the Reflection and the Prism.
9. The Bellkeeper and the Sunken Belfry.
10. The Regulator and the Escapement.
11. The Reflected and the Hall of Glass.
12. Sounds for what is new (recorded if a key is given in the environment,
    otherwise the nearest existing recording), balance by scripted fights,
    copy, README, audits, consoles.
