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
index.html            the hall: rooms 1 to 5
css/style.css
js/core.js            frame loop, visibility, motion switch, GL helpers
js/quicksilver.js     room 1  signed-distance raymarcher (GLSL)
js/murmuration.js     room 2  particle physics + WebGL points
js/mind.js            room 3  MLP, backprop and Adam, written longhand
js/garden.js          room 4  Gray-Scott on float textures (WebGL 2)
js/harp.js            room 5  Karplus-Strong strings, computed reverb
docs/                 design and task plans
```

## Testing without a painted window

Browsers stop `requestAnimationFrame` in hidden tabs and panes, which makes
animated pages hard to check from automation. Works can be driven by hand from
the console:

```js
Gallery.step('garden', 600, 1 / 60)   // advance one work by 600 frames
Gallery.inspect('harp').sound()       // { state, level, rate } of the audio engine
```

## Notes

- `prefers-reduced-motion` is honoured: the site starts paused (with a Play
  control) and shows each work's resting state.
- Works that need WebGL, WebGL 2 float targets or Web Audio say so plainly in
  place of the work if the browser lacks them; the rest of the page carries on.
- The Gray-Scott feed/kill pairs in `garden.js` were chosen by simulating on the
  CPU at half-float rounding: two textbook pairs die out in this discretisation.
