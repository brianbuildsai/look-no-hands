# Ten more rooms, and a way on from every one — plan

"Look, no hands." grows from fifteen rooms to twenty-five, and every room gets
an always-visible way to the next. Same rules as before: nothing is an image,
a recording or a library; everything is computed live in the browser by code
written in this conversation. Branch: `feat/ten-more-rooms` (off
`feat/ten-rooms`).

## Going to the next one each time

Today the way on is a footer below the wall text, which has to be scrolled to.

- **Masthead, every room page:** `‹ Room 16 of 25 ›`. The arrows are links to
  the previous and next room and never scroll away. On a phone the middle
  shortens to `16 / 25`.
- **In the wall label, under the controls:** "Next room: 17. Drapery →", so on
  a desktop it sits beside the work without scrolling.
- **Keyboard:** left and right arrow keys move between room pages unless a
  control has focus (sliders and text boxes keep their arrows).
- **The hall:** each of rooms 1–5 gets the same "Next room" link; room 5 leads
  to room 6. Room 25 leads back to room 1, so the building is a loop.
- The footer stays. All of it is stamped by `tools/make-rooms.js`, so the
  existing ten pages get it too.

## The ten rooms

Chosen so none repeats a technique, a look or a way of being touched from the
first fifteen (metaballs, particle type, a neural net, reaction–diffusion, a
harp, fluid, a black hole, pendulums, epicycles, marbling, slime mould,
galaxies, string art, rhythm wheels, falling sand).

| Room | Title | What the visitor does | How it is made |
|---|---|---|---|
| 16 | *No Bottom* | Points, and the page dives into the Mandelbrot set there, ten trillion times deep, far past what a graphics card can count | Perturbation: one orbit worked out carefully in double precision on the CPU; every pixel tracks only its tiny difference from it on the GPU |
| 17 | *Drapery* | Takes hold of a sheet of silk, pulls it, lets it fall over a hidden form | Verlet cloth with distance constraints and collision, lit as silk in WebGL |
| 18 | *Two Slits* | Draws walls in a ripple tank, taps to make waves, watches the fringes build on the far wall | The wave equation on float textures; a slow-glass tool makes lenses |
| 19 | *Four Numbers* | Drags, and four numbers change; a million points redraw a silk-like figure that has never existed before | A strange attractor iterated on the GPU, accumulated as light and tone-mapped |
| 20 | *Reaching* | Scatters light; a tree grows toward it, branch by branch, and sways | Space-colonisation growth; branch thickness by Leonardo's rule |
| 21 | *Circle Limit* | Drags an infinite tiling of the hyperbolic plane through a disc; changes how many tiles meet at a corner | Repeated reflection into one triangle, per pixel, in a shader (after Escher) |
| 22 | *A Follower* | Is followed round the room by a many-legged thing that walks properly | Inverse kinematics and a stepping gait, no animation data |
| 23 | *Choir* | Moves through the vowels and up and down the scale; four synthetic voices sing in harmony | Formant synthesis: a buzzing source through the resonances of a throat, in Web Audio |
| 24 | *A Shadow of a Shadow* | Turns four-dimensional solids by hand, up to the 120-cell's 600 corners | Polytopes generated from their symmetries, rotated in 4D, projected twice |
| 25 | *A Thousand Guesses* | Walks round a small gallery of glass and mirror that starts as noise and clears as they wait | A Monte Carlo path tracer accumulating samples in a float buffer; the finale |

Alternates if one is vetoed: a six-fold snowflake grown by humidity and
temperature; endless Celtic knotwork by wave-function collapse; lightning.

## Design

Unchanged: true black, bone hairlines, amber / ultramarine / rose, Fraunces
and Hanken Grotesk, museum wall-label voice, one loud thing per room, a wall
text that says how it is made in plain words. Each room gets a floor-plan
glyph; the plan becomes five by four.

## Tasks (one commit each, browser-verified at 375 and 1440 px)

1. Next/previous everywhere: generator, masthead, label link, arrow keys, hall
   links, loop from the last room to the first.
2. Room 16 *No Bottom* — checked against a double-precision CPU render.
3. Room 17 *Drapery*.
4. Room 18 *Two Slits*.
5. Room 19 *Four Numbers*.
6. Room 20 *Reaching*.
7. Room 21 *Circle Limit*.
8. Room 22 *A Follower*.
9. Room 23 *Choir* — sound verified by measured level and formant peaks.
10. Room 24 *A Shadow of a Shadow*.
11. Room 25 *A Thousand Guesses*.
12. Adversarial pass over all twenty-five: overflow, NaN, contrast, undefined
    classes, paused-motion rendering, fresh-tab console; hall copy, colophon
    (third brief, true line count, sources), README, memory notes.
