# Look, no hands.

An exhibition of live, interactive works. No build step, no dependencies, no
images, no media files. Everything on screen is computed in the visitor's
browser.

## Running it

Double-click `index.html`. It works from disk.

To serve it instead (this is what `.claude/launch.json` does):

```bash
python -m http.server 4174 --bind 127.0.0.1
```

The only network request the site makes is for its two typefaces from Google
Fonts. Offline it falls back to system fonts and still works.

## Layout

```
index.html            the hall: rooms 1 to 5, and the floor plan to the rest
rooms/*.html          rooms 6 to 35, one work to a page (generated, committed)
css/style.css
js/core.js            frame loop, visibility, motion switch, GL helpers
js/plan.js            the floor plan's hairline glyphs
js/hand.js            a hand outline drawn in code, shared by rooms 9 and 13
js/quicksilver.js     room 1   signed-distance raymarcher (GLSL)
js/murmuration.js     room 2   particle physics + WebGL points
js/mind.js            room 3   MLP, backprop and Adam, written longhand
js/garden.js          room 4   Gray-Scott on float textures (WebGL 2)
js/harp.js            room 5   Karplus-Strong strings, computed reverb
js/rooms/weather.js       room 6   stable-fluids Navier-Stokes on the GPU
js/rooms/horizon.js       room 7   Schwarzschild geodesics, raymarched per pixel
js/rooms/alike.js         room 8   1,500 double pendulums, RK4
js/rooms/pencil.js        room 9   Fourier epicycles; draw your own
js/rooms/endpapers.js     room 10  paper marbling by invertible maps
js/rooms/wayfinding.js    room 11  Physarum slime-mould agents
js/rooms/introduction.js  room 12  two galaxies meeting, Toomre's restricted N-body
js/rooms/hand.js          room 13  greedy string-art solver
js/rooms/necklaces.js     room 14  Euclidean rhythms, Web Audio synthesis
js/rooms/hourglass.js     room 15  falling-sand cellular automaton
js/rooms/bottom.js        room 16  Mandelbrot deep zoom by perturbation (CPU doubles + GPU floats)
js/rooms/drapery.js       room 17  Verlet cloth, lit as silk in WebGL
js/rooms/slits.js         room 18  the wave equation on float textures: a ripple tank
js/rooms/numbers.js       room 19  a strange attractor iterated in a vertex shader
js/rooms/reaching.js      room 20  space-colonisation tree growth
js/rooms/limit.js         room 21  hyperbolic tilings folded per pixel
js/rooms/follower.js      room 22  inverse kinematics and a stepping gait
js/rooms/choir.js         room 23  formant voice synthesis, Web Audio
js/rooms/shadow.js        room 24  the six regular 4D solids, generated and projected
js/rooms/guesses.js       room 25  progressive Monte Carlo path tracer
js/rooms/six.js           room 26  Reiter's snow-crystal automaton on a hexagonal grid
js/rooms/chladni.js       room 27  Chladni plate: sand settling on the nodal lines of a sounding plate
js/rooms/fireflies.js     room 28  three thousand pulse-coupled oscillators falling into step
js/rooms/weathering.js    room 29  droplet hydraulic erosion of a random range
js/rooms/soap.js          room 30  thin-film interference on a draining soap film (WebGL 2)
js/rooms/knotwork.js      room 31  an endless Celtic knot by wave-function collapse
js/rooms/tonight.js       room 32  the planets tonight, from Standish's mean orbital elements
js/rooms/selection.js     room 33  Dawkins biomorphs, bred by the visitor
js/rooms/lightning.js     room 34  dielectric breakdown over a live-relaxed Laplace field
js/rooms/docent.js        room 35  a Markov chain that writes and typesets a label for a room that does not exist
js/corpus.js          every wall text, written by make-rooms.js for room 35 to read
tools/                authoring tools (Node): rooms.js is the copy, make-rooms.js stamps the pages
docs/                 design and task plans
```

## Getting from room to room

Every room page has previous and next arrows in its masthead, a "Next room"
link under its controls, and the same in a footer; the left and right arrow
keys do the same unless a slider or text box has focus. Rooms 1 to 5 in the
hall have the link too. Room 25 leads back to room 1. All of it is stamped by
the generator from the order of the list in `tools/rooms.js`.

## Adding or editing a room

The site has no build step: what is committed is what is served. The ten room
pages share one template so their mastheads, labels and footers cannot drift.
Edit the words and controls in `tools/rooms.js`, then run

```bash
node tools/make-rooms.js
```

which rewrites `rooms/*.html` and the floor plan between the `plan:start` and
`plan:end` markers in `index.html`. Commit the output.

## Testing without a painted window

Browsers stop `requestAnimationFrame` in hidden tabs and panes, which makes
animated pages hard to check from automation. Works can be driven by hand from
the console:

```js
Gallery.step('garden', 600, 1 / 60)   // advance one work by 600 frames
Gallery.inspect('harp').sound()       // { state, level, rate } of the audio engine
Gallery.step('hourglass', 3000, 1 / 60) // on rooms/hourglass.html: run the sand out
Gallery.inspect('bottom').look()        // rooms/bottom.html: where the dive is, how many steps
Gallery.inspect('slits').plate()        // rooms/slits.html: the far wall's fringe record
Gallery.inspect('follower').gait()      // rooms/follower.html: feet in the air, leg stretch
Gallery.inspect('choir').sound()        // rooms/choir.html: level and spectral peaks
Gallery.inspect('chladni').rest()       // rooms/chladni.html: mean |f| under the grains (small when settled)
Gallery.inspect('fireflies').sync()     // rooms/fireflies.html: the order parameter, 0 to 1
Gallery.inspect('weathering').relief()  // rooms/weathering.html: drops, soil moved, lowest and highest
Gallery.inspect('soap').film()          // rooms/soap.html: mean thickness, age, films so far
Gallery.inspect('knotwork').weave()     // rooms/knotwork.html: seams and alternation errors (both must be 0), loops, crossings
Gallery.inspect('tonight').where(ms)    // rooms/tonight.html: heliocentric positions and elongations for a Date.now() value
Gallery.inspect('selection').litter()   // rooms/selection.html: generation, the parent's genes, the children's
Gallery.inspect('lightning').bolt()     // rooms/lightning.html: steps, branches, strikes, the field's Laplace residual
Gallery.inspect('docent').label()       // rooms/docent.html: the label being written and its longest copied run
```

## Notes

- `prefers-reduced-motion` is honoured: the site starts paused (with a Play
  control) and shows each work's resting state.
- Works that need WebGL, WebGL 2 float targets or Web Audio say so plainly in
  place of the work if the browser lacks them; the rest of the page carries on.
- Rooms 5, 14, 23 and 27 make sound only after the visitor asks for it, and
  pausing motion silences them (rooms 23 and 27 also hush when the tab is
  hidden). Room 35 speaks, with the Web Speech API, only when asked.
- Room 31's weave is checked every seam and every strand between crossings
  (no mismatches, no alternation errors over thousands of frames); room 32 was
  checked against the 2012 Venus transit, the 2020 Mars opposition, the 2003
  Mars closest approach and the 2020 great conjunction; room 34 reports the
  mean Laplace residual of its field.
- Room 16 was checked against a double-precision CPU render at 2.8 trillion
  times magnification (99.5% agreement on inside/outside); room 18's fringe
  spacing matches Young's formula within 3%; room 24's solids are checked by
  corner, edge and degree counts.
- The Gray-Scott feed/kill pairs in `garden.js` were chosen by simulating on the
  CPU at half-float rounding: two textbook pairs die out in this discretisation.
