# Plan 7: Undercroft, the second pass: creatures, bosses, weapons, items

The brief: "focus on the enemy design and hit boxes and attacks; enemies with
high quality character design, unique and creative, with high quality attack
animations. Three bosses with boss fights and boss arenas, their patterns well
thought out, creative and powerful. One final boss after the three. Not crazy
difficult to complete. More weapons and items, with rarities and a glowing
aura: purple for epic, red for master, gold for legendary. Crazy cool
animations for legendary weapons and items. Items give abilities; weapons have
their own abilities and attack animations."

Still no images, no libraries: every sprite is text compiled to canvases, every
effect is drawn in code, every sound synthesised.

## 1. Hit boxes and the rule of contact

Every body gets three kinds of box: a **hurt box** (where it can be struck), a
**body box** (what stops at walls) and **attack boxes** that exist only on an
attack's active frames and are placed relative to the sprite and its facing.
Touching a creature no longer hurts: only its attack boxes do, so every wound
is one the player could have read. Attacks run on one shared clock: **wind-up**
(a telegraph pose and a cue), **active** (the box is live, the frames show the
blow), **recover** (the creature is open). `Gallery.inspect('undercroft')
.boxes(true)` draws all boxes over the game so they can be tuned against the
art.

## 2. Ten creatures, redrawn as rigs

Each creature is rebuilt from parts placed by poses (as the Warden is), about
twice the size of the first pass, with four walk or hover frames, two wind-up
frames, three attack frames and a hurt frame, and an attack of its own:

| Element | Creature | What it does |
|---|---|---|
| Ember | **Bellows Imp** | Swells the bellows on its back, then breathes a short cone of flame |
| Ember | **Coal Lantern** | A cracked lantern on a chain that winds up and spits a fan of three embers |
| Frost | **Glacier Crab** | Snaps a pincer; struck, it shuts in its shell, then bursts a ring of ice spikes |
| Frost | **Snow Owl** | Drops an icicle from above, then swoops along a line it shows first |
| Storm | **Spark Hound** | Crouches, leaps, and bites at the end of the leap |
| Storm | **Tesla Jelly** | Stiffens its tentacles and discharges a column straight down |
| Bloom | **Thorn Toad** | Opens its mouth and lashes a long tongue; hops between |
| Bloom | **Puffball** | Inflates and bursts into a ring of spores, then regrows small |
| Void | **Reaper Shade** | Is suddenly behind you, then sweeps a scythe in a wide arc |
| Void | **Watcher** | Draws a line of sight, then burns a beam along it that slowly turns |

Elders remain (larger, tougher, one extra trick each).

## 3. Three bosses and a last one

The run becomes **three floors and a vault**: two generated sections and a
boss on each floor, then one section and the final boss. Sections mix the five
elements so nothing drawn is lost: Kilns (ember, ember), Cellars (frost,
bloom), Galleries (storm, void), Vault (void).

**The Kiln Golem**, a walking furnace, in the Great Kiln (lava pits at both
ends, two ledges). Fist slam that sends a wave along the floor; coals lobbed
in arcs that leave burning patches; from 60%, a furnace breath swept in front
of it (its back vent takes half again as much) and a leap that lands with
waves both ways; from 30% the lava rises at the edges and the arena narrows.

**The Rime Wyrm**, a serpent of ice in eleven segments that swims through
floor and ceiling, in the Frozen Cistern (slick floor, three ledges, icicles).
It cracks the ice where it will surface, arcs over and dives back, the head
the soft part; rains icicles from the ceiling it swims through; puts its head
out of a wall and breathes along the floor so that the ledges matter; from
half life it coils, tail-whips, and erupts in a ring of shards.

**The Storm Herald**, a conductor with a baton, in the Gallery of Rails (four
pylons). Bolts marked in a rhythm and struck in the same rhythm; half the
floor electrified after a sweeping warning; two ball lightnings that waltz
round the hall and can be struck away; a blink above you and a bolt; from half
life the pylons link in turning arcs. After each great attack it sinks,
spent, and is open.

**The Lightless**, last, in the Vault. First it is you: a dark double with
your weapon and your power. Unmasked, it is a great mask with one slit eye and
two hands: slams under a shadow, sweeps to jump, claps to dash through, a
turning beam, and one remembered attack from each boss you beat, in the
vault's colours. At a third of its life it puts out the lights: only your
lantern, its eye opening before each blow, and three braziers to relight by
striking them; all three lit stuns it and it takes double.

Every boss has a rig with real attack frames, a name banner, a bar with phase
marks, and telegraphs of at least three-quarters of a second.

## 4. Fair, not soft

Six hearts. Contact does not hurt. Creatures drop a heart now and then; a
fountain stands before every boss door and every boss heals you when it falls.
Three lantern flames: a death costs a flame and you rise at the start of the
floor; the run ends when the last goes out. Boss lives are tuned by a scripted
fight so that each takes about a minute to a minute and a half with a common
weapon.

## 5. Weapons, with their own movesets and abilities

Rarity: common (bone), rare (blue), **epic (purple)**, **master (red)**,
**legendary (gold)**, each with an aura on the ground, in the hand and on the
card. Weapons are found in chests, dropped by elders, and offered by bosses.

| Rarity | Weapon | Moveset and ability |
|---|---|---|
| Common | Short Sword | The three-swing combo |
| Rare | Twin Daggers | Four quick cuts; the dash becomes a slash through |
| Rare | War Hammer | Two slow blows; the second cracks the floor both ways |
| Epic | Ember Brand | Burning cuts; the finisher throws a wave of flame |
| Epic | Frost Glaive | Long sweeping reach; the finisher raises a row of ice spikes |
| Epic | Storm Rapier | Fast thrusts; the finisher arcs to three |
| Master | Reaper's Scythe | Wide arcs that reach behind; a kill gives back a little life |
| Master | Thorn Whip | A long lash drawn as a living curve; the finisher drags them in |
| Legendary | **Dawnbreaker** | A greatsword of light: golden crescents, and a finisher that brings down a pillar of sun with rings that travel the floor |
| Legendary | **Quicksilver** | A blade of liquid metal that flows along its own curve; the finisher bursts into droplets that seek |
| Legendary | **Murmuration** | A bow that looses a flock of lights which wheel and fall on what you face |

## 6. Items that give abilities

The eighteen relics gain rarities, and ten new items give things to do:
wall-grip gauntlets (slide and wall jump), a glider cape (hold jump to fall
slowly), pounding greaves (down and jump to slam), a parry bracer (strike at
the right moment to turn a blow), a ghost cloak (the dash wounds what it
passes), a magnet lantern, and four legendaries with ceremonies of their own:
the Phoenix Feather (rise once in a burst of fire), Chladni's Bell (every
fifth hit rings, and the rings' still lines cut across the screen), Reiter's
Snowflake (the dash leaves a six-fold flake that freezes), the Hourglass of
Sand (time slows while you are at one heart). A legendary found stops the game
for a breath: a pillar of gold, motes that orbit in, the name written large.

## Tasks (one commit each, browser-verified at 1440 and 375 px)

1. Boxes: hurt, body and attack boxes for the Warden and creatures, the
   wind-up/active/recover clock, contact made harmless, the box overlay.
2. Creatures I: Bellows Imp, Coal Lantern, Glacier Crab, Snow Owl, Spark Hound
   as rigs with their attacks.
3. Creatures II: Tesla Jelly, Thorn Toad, Puffball, Reaper Shade, Watcher.
4. Weapons: movesets, weapon art in the hand, per-weapon frames, slash
   effects, abilities, eleven weapons.
5. Items and rarity: auras, chests and drops, ten ability items, the legendary
   ceremony and the legendaries' own effects.
6. The run: three floors and a vault, mixed elements, hearts, fountains,
   lantern flames.
7. The Kiln Golem and the Great Kiln.
8. The Rime Wyrm and the Frozen Cistern.
9. The Storm Herald and the Gallery of Rails.
10. The Lightless and the Vault.
11. Balance by scripted fights, then the final pass (copy, README, plan
    status, audits, consoles).
