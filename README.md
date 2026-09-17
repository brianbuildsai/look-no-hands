# Look, no hands. / An Atlas of Nowhere

Two shows, one site. No build step, no dependencies, no images, no media files.
Everything on screen is computed in the visitor's browser.

| | Open | What it is |
|---|---|---|
| **Look, no hands.** | `index.html` | A dark gallery of five live works: raymarched liquid metal, 40,000 particles that spell what you type, a neural network learning in front of you, a paintable reaction–diffusion garden, a synthesised harp. |
| **An Atlas of Nowhere** | `atlas.html` | Type a word and it becomes a planet, charted like a sea chart: continents, seas, towns and summits named in that world's own invented language. Same word, same world; share it as a link. |

## Running it

Double-click `index.html`. It works from disk.

To serve it instead (this is what `.claude/launch.json` does):

```bash
python -m http.server 4174 --bind 127.0.0.1
```

The only network request either page makes is for its two typefaces from
Google Fonts. Offline, both fall back to system fonts and still work.

## Layout

```
index.html            show one
css/style.css
js/core.js            frame loop, visibility, motion switch, GL helpers
js/quicksilver.js     room 1  signed-distance raymarcher (GLSL)
js/murmuration.js     room 2  particle physics + WebGL points
js/mind.js            room 3  MLP, backprop and Adam, written longhand
js/garden.js          room 4  Gray–Scott on float textures (WebGL 2)
js/harp.js            room 5  Karplus–Strong strings, computed reverb

atlas.html            show two
css/atlas.css
js/atlas/world.js     word -> seed -> noise terrain on a sphere   (no DOM)
js/atlas/tongue.js    one invented phonology per world            (no DOM)
js/atlas/places.js    siting and describing lands, towns, waters  (no DOM)
js/atlas/globe.js     the chart shader, drag, fly-to
js/atlas/sheet.js     labels, gazetteer, key, almanac, URL word

tests/                Node checks for the three DOM-free Atlas modules
docs/PLAN.md          design and task plan, show one
docs/PLAN-2.md        design and task plan, show two
```

## Tests

```bash
node tests/world.test.js
```

```bash
node tests/places.test.js
```

`node tests/world.look.js <word>` prints a rough ASCII chart of any world, and
`node tests/places.test.js <word>` prints its whole gazetteer.

## Testing without a painted window

Browsers stop `requestAnimationFrame` in hidden tabs and panes, which makes
animated pages hard to check from automation. Both shows can be driven by hand
from the console:

```js
Gallery.step('garden', 600, 1 / 60)   // advance one work by 600 frames
Gallery.inspect('harp').sound()       // { state, level, rate } of the audio engine
Atlas.sheet.globe().step(1 / 60)      // draw one globe frame now
Atlas.sheet.chart().places            // everything on the current world
```

## Notes

- `prefers-reduced-motion` is honoured: show one starts paused (with a Play
  control) and shows each work's resting state; the Atlas stops its idle turn
  and jumps instead of flying.
- Works that need WebGL, WebGL 2 float targets or Web Audio say so plainly in
  place of the work if the browser lacks them; the rest of the page carries on.
- The Gray–Scott feed/kill pairs in `garden.js` were chosen by simulating on the
  CPU at half-float rounding: two textbook pairs die out in this discretisation.
- Line counts quoted in the two colophons are real; recount with
  `wc -l index.html css/style.css js/*.js` and
  `wc -l atlas.html css/atlas.css js/atlas/*.js` after editing.
