# Plan 15: the Sunken Wood

Branch `feat/undercroft-sunken-wood`. One commit per task, each verified in
the browser. Art is text compiled at load, as everywhere else in the site: no
images, no libraries. The reference art (the asset library's creatures and
backgrounds, the Godot project's tilesets) is looked at, never copied or
shipped; both folders are read-only.

## The ask

"Make one new room, using enemies picked from creatures on the assets page.
Add animation frames based off the static image choices. Entirely animated,
and design this new room off the source backgrounds and these tilesets."

In the Undercroft a "room" has meant a floor (plan 10's "three more rooms"
became three floors). So: **one new floor, a new element**, with its own
creatures, stone, hazard, touch, backdrop and music.

## What the references say

- **Backgrounds** (`Backgrounds/Swamps`, with `Enchanted_Forests`,
  `Temple_Ruins`): a misty teal wood at night; a gnarled black tree frames the
  top; pale gold and rose orbs hang in the haze; terraces of trees fade into
  fog; dead branches in silhouette at the bottom.
- **Tilesets** (`fp_set1`, `ssworlds_set1`, `ssw_set7`): dark mossy earth
  blocks with thick grass caps that hang over the edges, root-dark
  undersides, log platforms, twisted teal trees, mossy boulders, old temple
  stone, hanging vines.
- **Creatures** (from the asset library's Creatures, all 64x64 stills):
  - `Treants_and_Plant_Monsters/43.png`: a squat treant, root legs, branch
    arms splayed wide, a crown of grass.
  - `Slimes/414.png`: a mound of bog moss with twigs growing out of it and
    two small eyes.
  - `Wraiths_and_Spirits/83__64x64_A006338.png`: a teal drowned spirit with
    long floating hair.

## The floor

**The Sunken Wood** (element `mire`): a wood that grew in the dark under the
Kilns. It becomes floor 2, after the Golem, so it is reached early. It has no
guardian (none was asked for): a sanctuary, a stage, a sanctuary, a second
stage, then down to the Cellars. Creature life grows a little more gently per
floor (0.17 to 0.15) so the last floor stays as hard as it is now.

- **Stone**: peat and root in three variants; a moss cap with blades that
  sway; moss hanging over edges. **Ledges** are mossy logs. **Spikes** are
  bramble thorns.
- **Hazard, bog**: black water with bubbles, duckweed and a slow shimmer.
  It wounds and snares.
- **Touch, snared**: roots hold your feet; for a few seconds you cannot dash.
- **Backdrop, every layer moving**: far terraces of trees in fog, near
  twisted trunks with hanging moss, the black canopy framing the top, fog
  bands drifting at two speeds, pale wisp-orbs pulsing in the haze,
  fireflies, falling leaves. The wood is lit by moonlit mist, so its dark is
  lighter than the other floors'.
- **Dressing**: hanging vines that sway, glowing mushrooms in place of wall
  lamps, reeds at the water.
- **Music**: its own root and scale.

## The creatures (every frame drawn from its still)

1. **The Rootwalker** (treant). Walks on shuffling roots, crown swaying. It
   drives its arms into the ground; a line of roots bursts up along the floor
   toward you, marked by cracks before it breaks. Hurt: it staggers, leaves
   fall. Elders are larger.
2. **The Bog Mound** (moss slime). Hops with squash and stretch, twigs
   wobbling, blinks. It sinks into the ground, travels as a ripple of bubbles
   and bursts up under you where the bubbling is marked.
3. **The Rusalka** (drowned spirit). Floats with her hair streaming. She holds
   out a hand, a wisp gathers in it, and she lets it drift after you, slow,
   lighting the dark as it comes.

Each gets walk (or float), wind-up, attack, recovery and hurt frames. Three
kinds, not the usual two: the Bog Mound shares the walkers' spawn points.

## Tasks

1. **The element and the floor**: `mire` in world.js, status and snare, a
   stand-in pair of creatures, music, the new place in the way down, the
   gentler scaling, the words that count floors. Proof: the stage list, a
   run from floor 1 into it, lockstep harness.
2. **Tiles**: stone, moss cap, logs, brambles, the bog in frames. Proof:
   screenshots at 1440 and 375.
3. **The backdrop**: layers, fog, orbs, fireflies, leaves, the lighter dark.
   Proof: a film strip of it moving.
4. **Dressing**: vines, mushroom lamps, reeds. Proof: screenshots.
5. **The Rootwalker**. Proof: sprite sheet and a film strip of the attack.
6. **The Bog Mound**. Proof: the same.
7. **The Rusalka**. Proof: the same.
8. **Together**: the three spawned on the floor, a duel-bot balance check,
   lockstep harness (`all`, `all2`, net), Chrome against Firefox, the stamp.
9. **Words**: README, the room's wall text, the hall's source list, this
   plan's status.

## Proof at the end

Every piece above seen moving in the browser; lockstep harness and
cross-browser print equal; console clean after a hard reload.

## Status

Built, 2026-09-22. The user chose "Build it" at the plan gate.

### What was found on the way

- **The dark was never the number in the code.** The engine lays its dark
  over what is left of the last frame's (it is never cleared), so outside
  the lights every floor goes to black whatever alpha it is given. The wood
  needs its painted sky to be seen, so a floor that sets a night of its own
  (`dark` on the element, 0.42 here) starts each frame from clear. Every
  other floor is untouched and looks as it did.
- **Green on moss is invisible.** The creatures' warnings (the crack for the
  roots, the ring where the Mound comes up) were first drawn in the floor's
  green and could not be seen on the moss. They are amber.
- **A creature that can be stood inside is harmless.** A scripted fighter
  that simply mashes attack took no wound from the first Rootwalker in any
  run: blows stop an ordinary creature from beginning an attack, and its
  roots need distance. It gained a close sweep that blows do not break and
  that reaches through its own trunk, and a `stout` flag (only it has one):
  struck, it is barely moved and may still begin.
- A test hall is not flat: the sanctuary's raised floor stopped the roots,
  correctly, and looked at first like a bug.
- A custom wind-up animation loops unless the attack sets its own frame
  (only one named `windup` is spread over the wind-up): the Mound sank over
  and over until it did.

### Decisions made for the user

- Floor 2, reached after the first guardian. No guardian of its own; it has
  a second stage instead. Creature life grows 0.15 a floor instead of 0.17,
  so floor 10 is as tough as floor 9 was.
- The references are looked at, never shipped: the site has no images, and
  the asset library and tilesets are licensed to the user, not to a public
  repository. The creatures were drawn by hand in text at game size from a
  shrunk copy of each still, then given the frames the still lacks.
- Three creatures, not the usual two; the Bog Mound takes some of the
  walkers' places (an extra draw of chance only on this floor, so no other
  floor's layout or creatures change).
- Sounds are borrowed from the recorded set (`roots` already existed; the
  rest map to `spit`, `crack`, `castbloom`, `blink`): making new recordings
  needs the ElevenLabs key, which is not in this environment.

### Proof

| what | result |
| --- | --- |
| the way down | 37 stages; floor 2 is sanctuary, stage, sanctuary, stage |
| the bog and the snare | the bog wounds and snares; dash refused while snared, back after |
| tiles, backdrop, dressing | seen at 1280 wide in the browser; a four-frame strip of the sky moving |
| each creature | frames rendered offline from its rig; filmed in the browser through its attack; each wounds and snares |
| the floor's creatures | stage 4: 5 Rusalkas, 3 Rootwalkers, 3 Mounds, an elder Rootwalker; stage 6: 3, 4, 7 |
| balance (scripted fighter, four creatures on flat ground, wounds a run) | Kilns about 2.5, Wood about 1, Cellars 7 (and not cleared) |
| lockstep harness `all` after each creature | 18 of 18 together; the other floors' hashes unchanged |
| harness scenes | now cover both of the wood's stages (4 and 6) and every guardian, floor 10's included (20 scenes) |
| `all`, Chrome against headless Firefox | 20 of 20 together in each; the twenty final hashes identical in both |
| `all2` (two players), Chrome against headless Firefox | 20 of 20 together; the twenty final hashes identical in both |
| net harness (a bad wire) | 6 of 6 held |
| at 375 and 1440 wide | no sideways scroll; 3.1 and 1.9 ms a frame on the wood; console clean |

### Not proved

- Safari, as before (none here). Nothing new in the simulation is left to
  the engine: the wood's creatures use only the engine's chance, adding,
  multiplying, square roots and rounding.
- Play by a person. The balance numbers come from a scripted fighter that
  never dashes, so the snare costs it nothing; a player will feel the wood
  as harder than the fighter did.
