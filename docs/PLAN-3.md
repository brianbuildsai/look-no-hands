# Ten more rooms — plan

"Look, no hands." grows from a five-room hall into a fifteen-room building.
The Atlas is removed. Each new room is its own page: one work, full screen,
with a wall label, controls and a way on to the next room. Same rules as the
hall: nothing is an image, a recording or a library; everything is computed
live by code written in this conversation.

## The ten rooms

Chosen so that no two share a technique, a look, or a way of being touched,
and none repeats the hall (raymarched metal, particle type, a neural net,
reaction–diffusion, a harp).

| Room | Title | What the visitor does | How it is made |
|---|---|---|---|
| 6 | *Indoor Weather* | Stirs coloured smoke that curls, shears and rolls like the real thing | Navier–Stokes fluid solver on the GPU: advection, vorticity, pressure projection |
| 7 | *Where Light Turns Back* | Orbits a black hole and watches it bend the stars and its own glowing disc | Light paths integrated through curved space per pixel; Doppler-lit accretion disc |
| 8 | *Nearly Alike* | Releases 1,500 double pendulums a millionth of a degree apart and watches them agree, then don't | Runge–Kutta integration; a live readout of how far apart they have drifted |
| 9 | *Ptolemy's Pencil* | Draws any shape; a chain of turning circles learns to redraw it | Fourier transform of the drawing, animated as epicycles, with a "how many circles" dial |
| 10 | *Endpapers* | Drops ink, rakes and swirls it into marbled paper | Mathematical marbling: every stroke is an exactly invertible map, undone per pixel in a shader |
| 11 | *Wayfinding* | Feeds or scares a slime mould that builds road networks with no brain at all | 100,000 agents that sense, turn and leave a trail (Physarum model) |
| 12 | *An Introduction* | Sends two spiral galaxies through each other and turns the view | 40,000 stars under two moving gravity wells (Toomre's method), WebGL points |
| 13 | *The Hand It Doesn't Have* | Watches one continuous thread, wound nail to nail, become a hand; or types letters for it to wind | Greedy string-art solver running live, thread length counted in metres |
| 14 | *Necklaces* | Spins rhythm wheels; evenly spaced beats turn out to be the world's traditional rhythms | Euclidean rhythm algorithm, drums and bells synthesised on an audio-clock scheduler |
| 15 | *Hourglass* | Pours sand, water, wood and fire and lets them fall, flow, float and burn | Falling-sand cellular automaton, a few hundred thousand cells a frame |

## How they join the building

- Pages live in `rooms/`, share `css/style.css` and `js/core.js`, one script
  each in `js/rooms/`. All still open from disk.
- The hall gains a **floor plan** after room 5: fifteen rooms drawn as a plan,
  each new one with a small line glyph computed on a canvas (no images), its
  number, title and one line. The masthead's old "Next door" link becomes
  "Floor plan".
- Every room page: masthead (home, "Room 7 of 15", floor plan, motion switch),
  the work, its wall label and controls, a wall text, and previous / next room
  links by name.
- Room pages are stamped from one template by `tools/make-rooms.js`, so the
  ten mastheads and footers cannot drift. The output is plain committed HTML;
  nothing runs at view time and the site still has no build step.

## Design

Unchanged system: true black, Bone/Ash text, Amber / Ultramarine / Rose inside
works only, Fraunces + Hanken Grotesk, museum wall-label voice, one loud thing
per room. New pieces of chrome, each kept as quiet as the rest:

- a hairline range slider (for dials like "how many circles", tempo),
- tool toggles as the existing pill buttons with `aria-pressed`,
- the floor plan: hairline rooms with door gaps, glyph, number, italic title.

Reduced motion, failure notices, 375/1440 layout, keyboard paths and the
manual `Gallery.step` hook apply to every new room exactly as in the hall.

## Tasks (each one commit, each verified in the browser)

1. Remove the Atlas — pages, scripts, tests, cross-links, README; branch `feat/ten-rooms`.
2. Building work — room-page template and generator, room-page CSS, slider,
   floor-plan section and glyph canvas, float-texture helpers in core.
3. Room 6 *Indoor Weather*.
4. Room 7 *Where Light Turns Back*.
5. Room 8 *Nearly Alike*.
6. Room 9 *Ptolemy's Pencil*.
7. Room 10 *Endpapers*.
8. Room 11 *Wayfinding*.
9. Room 12 *An Introduction*.
10. Room 13 *The Hand It Doesn't Have*.
11. Room 14 *Necklaces*.
12. Room 15 *Hourglass*.
13. Adversarial pass over all fifteen rooms — overflow at 375/1440, computed
    contrast, undefined classes, NaN hunt, reduced motion, fresh-tab console;
    colophon copy and true line count; README; plan docs tidy.

Each room lands in the floor plan only in its own commit, so the building is
never open with an empty room.

## Status

All thirteen tasks are done and committed on `feat/ten-rooms` (one commit per
room, plus the Atlas removal and the final pass). Where the build departs from
the table above:

- *Wayfinding* runs about 53,000 agents on a desktop, not 100,000: at a fifth of
  the cells the network reads as roads rather than fog.
- *An Introduction* uses 39,000 stars (16,000 on a phone) on a bound orbit, and
  starts again after the two cores have merged.
- *Hourglass* is about 140,000 cells on a desktop. It opens as a real hourglass
  that turns itself over; the frame is wood and will burn.
- The final pass checked every room at 375 and 1440 pixels for overflow, NaN in
  the live figures, computed text contrast, paused-motion rendering and console
  errors after a hard reload. `tools/rooms.js` is the single source for room
  copy; regenerate with `node tools/make-rooms.js`.
