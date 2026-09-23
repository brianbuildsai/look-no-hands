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
