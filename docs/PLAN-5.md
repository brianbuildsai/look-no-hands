# Rooms 26 to 35 — plan

"Look, no hands." grows from twenty-five rooms to thirty-five. Same rules:
nothing is an image, a recording or a library; everything is computed live in
the browser by code written in this conversation; one loud thing per room;
museum wall-label voice; true black, bone hairlines, amber, ultramarine and
rose. Branch: `feat/rooms-26-35` (off `feat/ten-more-rooms`).

## The ten rooms

Chosen so that none repeats a technique, a look, or a way of being touched
from the first twenty-five.

| Room | Title | What the visitor does | How it is made |
|---|---|---|---|
| 26 | *Six* | Grows a snowflake, and steers it with humidity and cold; no two alike | Reiter's cellular model of snow crystal growth on a hexagonal grid, drawn with six-fold symmetry |
| 27 | *Chladni* | Bows a metal plate; sand jumps to the silent lines, and the plate sounds | Standing-wave patterns of a square plate; ten thousand grains drift downhill of the vibration; the tone is synthesised |
| 28 | *Fireflies* | Watches three thousand fireflies fall into step, and scatters them | Coupled oscillators (Kuramoto): each firefly nudges its clock by its neighbours' flashes |
| 29 | *Weathering* | Makes it rain on a mountain range and watches valleys carve themselves | Hydraulic erosion: drops of water carry sediment downhill over a height map, lit in relief |
| 30 | *Soap* | Blows on a soap film and watches the colours drain to black before it pops | Thin-film interference across the visible spectrum, on a film that thins under gravity |
| 31 | *Knotwork* | Fixes a tile and watches an endless knot resolve itself around it | Wave-function collapse: constraint propagation over tiles drawn as Celtic strands |
| 32 | *Tonight* | Sees where the planets are tonight, and scrubs centuries forward and back | Keplerian orbital elements evaluated for any date; no ephemeris table, no data files |
| 33 | *Selection* | Breeds creatures by choosing the offspring they like, generation after generation | Dawkins's biomorphs: nine genes, recursive drawing, artificial selection by hand |
| 34 | *Lightning* | Calls down lightning between a cloud and the ground, and sees why it forks | Dielectric breakdown: a Laplace field solved live on a grid; the leader steps where the field is strongest |
| 35 | *Docent* | Reads a new wall label for a room that does not exist, written by the building | A Markov chain trained, in the page, on every wall text in the exhibition; typeset as it is written |

Alternates: phyllotaxis at 137.5 degrees; the coastline paradox on a fractal island.

## Design

Unchanged. Each room gets a floor-plan glyph; the plan becomes five by six.
Rooms 26–35 follow rooms 6–25 in the next/previous chain; room 35 leads back
to room 1.

## Tasks (one commit each, browser-verified at 375 and 1440 px)

1. Room 26 *Six*.
2. Room 27 *Chladni* — sound verified by measured level and pitch.
3. Room 28 *Fireflies* — synchrony measured (order parameter).
4. Room 29 *Weathering*.
5. Room 30 *Soap*.
6. Room 31 *Knotwork* — constraint consistency checked (no contradictions).
7. Room 32 *Tonight* — positions checked against known conjunction dates.
8. Room 33 *Selection*.
9. Room 34 *Lightning*.
10. Room 35 *Docent*.
11. Adversarial pass over all thirty-five: overflow, NaN, contrast, undefined
    classes, paused-motion rendering, fresh-tab console; hall copy, colophon
    (fourth brief, true line count, sources), README, memory notes.
