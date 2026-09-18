# Plan 6: room 36, *Undercroft*

The brief: "use all of your knowledge from these 35 rooms to make an in-browser
game: a rogue-like 2D platform side-scroller with pixel graphics; high-quality
character models; high-quality attack and power animations; good use of colour
and different elements; very good replayability and core gameplay loop; at the
end."

One last room, after the Docent, in the same house: no images, no libraries, no
build step. Every sprite is pixel art written as text in code and compiled to
canvases when the page opens; every sound is synthesised. The building has an
undercroft, and it draws itself again every time you go down.

## The room

| # | Title | The line on the door | How it is made |
|---|-------|----------------------|----------------|
| 36 | *Undercroft* | Go down. The floors draw themselves, and nothing you carry comes back up except what you learned. | A rogue-like platformer: seeded level grammar, a fixed-step engine, pixel sprites compiled from text, synthesised sound |

Room 35's next link leads here; this room's leads round again to room 1.

## Design

**The Warden.** A lantern-bearer with a short sword, 20 by 28 pixels, drawn
with a ten-colour palette (skin, cloak in ultramarine, brass, bone, the lantern's
amber). Animations: idle 4 frames, run 8, jump 2, fall 2, land 2, three-swing
attack combo 4 frames each, dash 3, cast 5, hurt 2, death 6. The lantern is a
real light: the undercroft is dark and the hero's glow, the enemies' eyes and
the powers' flashes are what you see by.

**Feel.** Fixed 60 Hz physics, coyote time, jump buffering, variable jump
height, dash with invulnerability frames, hit-stop on every hit, screen shake,
knockback, white hit-flash, damage numbers, particles for every element.

**Five elements, five floors.** Ember (kilns: lava, rising heat, burning),
Frost (cellars: ice you slide on, freezing), Storm (galleries: charged rails,
chain lightning), Bloom (cisterns: vines, spores, poison and healing), Void (the
vault: darkness, things that copy you). Each element has a palette, a tile set
and parallax backdrop drawn in code, two enemy kinds, a guardian, a power and
relics that lean toward it. Elements interact: frost thaws under ember, storm
chains between frozen or wet things, bloom heals on kills, void steals.

**Powers.** One active power at a time, chosen at the start and swapped at
altars: Emberwave (a cone of flame that burns), Frostlance (a piercing spear
that freezes), Stormchain (a bolt that leaps to three more), Bloomburst (a ring
of thorns that heals). Each has a wind-up, a cast pose, a flash in its colour,
its own particles and a distinct sound.

**Relics.** Eighteen passives with synergies, offered three at a time after
each guardian and found in alcoves: Kindling (burning spreads), Glass Heart
(two more hearts, no dash), Longstride, Second Wind (one revival), Hourglass
Shard (time slows on a hit), Tuning Fork (faster combo), Aeolian Boots (double
jump), Reiter's Crystal (frost lasts longer), Standish's Almanac (see the whole
floor's map), Fireflies' Lantern (enemies glow), and so on; several are named
for other rooms.

**The run.** Five floors of three generated sections and a guardian's arena.
Sections are stitched from a seeded grammar of chunks (ground, gaps, steps,
ledges, hazards, alcoves, arenas), placed by a difficulty budget that rises by
floor, and checked for reachability by a jump-graph flood fill before they are
used. Doors between sections; an altar and three relics after each guardian.
Death ends the run with a summary (floor, kills, time, seed) and a line about
what was learned; the seed can be typed in to replay, and a daily seed is
shared by everyone who visits that day.

**Replayability.** Seeded runs, elemental synergies between powers and relics,
unlocks kept in the browser (reaching floor 2 unlocks Frostlance as a start,
floor 3 Stormchain, floor 4 Bloomburst; feats add relics to the pool), best
runs remembered, daily seed, and a floor-5 guardian that fights with your own
loadout.

**Sound.** Synthesised effects (swing, hit, jump, dash, each power, hurt,
pickup, door, roar) and a generative music loop per floor (drone, pentatonic
arpeggio, a pulse that quickens near a guardian). Off until asked, as
everywhere in the building; the choice is remembered per browser.

**Presentation.** An internal 384 by 216 canvas, integer-scaled with no
smoothing into the stage. On wide screens the game sits over the right
two-thirds beside the wall label, with a full-screen button; on phones it
fills the width with touch controls drawn in the canvas. Pausing motion
pauses the game. The stage takes keyboard focus so the arrow keys steer the
Warden, not the rooms.

**Verification hooks.** `Gallery.inspect('undercroft').state()` (hero, floor,
hearts, enemies, seed, frame cost), `.press(keys, frames)` to drive input from
tests, `.generate(seed, floor)` to test the generator; the generator is checked
over 500 seeds for reachability; every sprite frame is checked non-blank.

## Files

- `js/game/pixels.js`: the sprite compiler (text art and palettes to canvases)
  and all the art.
- `js/game/world.js`: tiles, hazards, floor palettes and backdrops, the chunk
  grammar, the generator, the reachability check.
- `js/game/actors.js`: the Warden, ten enemies, five guardians.
- `js/game/relics.js`: powers, relics, statuses and their interactions.
- `js/game/sound.js`: synthesised effects and music.
- `js/rooms/undercroft.js`: the engine (loop, input, camera, render, HUD, run
  state, persistence) and the room's api.

## Tasks (one commit each, browser-verified at 1440 and 375 px)

1. Shell: room 36 entry and page, the engine loop with a fixed timestep, input
   (keyboard and touch), the pixel viewport, camera, the Warden's idle, run and
   jump on a test floor, the state api.
2. The Warden entire: attack combo, dash, cast, hurt, death; coyote time, jump
   buffer, hit-stop, particles, the lantern's light.
3. The world: tiles, hazards, five palettes and backdrops, the chunk grammar and
   seeded generator, reachability over 500 seeds.
4. Enemies: ten kinds with sprites, behaviours and deaths; elemental statuses.
5. Powers and relics: four powers with their cast animations; eighteen relics;
   the relic choice; synergies.
6. Guardians: five, with patterns, arenas, health bars and banners.
7. The run: HUD, floor transitions, death and victory summaries, seeds (daily
   and typed), best runs and unlocks in localStorage.
8. Sound: effects and floor music, with the toggle.
9. Phones and polish: touch controls, layout, full screen, paused motion, a
   performance pass (under 4 ms a frame on the desktop budget).
10. Integration and final pass: glyph, hall copy (thirty-six), colophon sources
    and line count, README, plan status, iframe audits, fresh-tab consoles.
