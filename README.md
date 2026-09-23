# Look, no hands.

An exhibition of live, interactive works. No build step, no dependencies, no
images, no media files. Everything on screen is computed in the visitor's
browser.

## Where it lives

The source is at <https://github.com/brianbuildsai/look-no-hands> and the site itself is served from `main` by GitHub Pages at
<https://brianbuildsai.github.io/look-no-hands/>. There is no build: what is in the repository is what is served (`.nojekyll` tells Pages to leave it alone).

## Two players (room 36)

Open the Undercroft and choose **Host a game** on its main screen (or in the
controls beside it), pick who you go down as, and send the six-character code
(or the link with it in) to someone. They open the same page, choose **Join a
game**, type the code and press Enter; you press Enter to start together.
The **FLOOR** line on the host's main screen says where you both begin.

## Beginning on any floor (room 36)

The main screen's **FLOOR** line (left and right to change it) or the room's
address (`rooms/undercroft.html?floor=2`) chooses the floor a run begins on.
Floor 1 is the true run. Begun deeper, a run starts in that floor's
sanctuary with what everyone starts with, and is practice: nothing it does is
kept (best floor, wins, runs, unlocks). The hall's game tab lists every floor
with a link of this kind.

How it works, because it decides how new things must be written:

- **Nothing about the game is sent but the buttons.** Both browsers run the
  whole simulation from the same seed (`js/game/net.js`). Each sends the other
  what its player pressed, stamped with the step it belongs to, and a step is
  simulated when both players' buttons for it are in hand. Your own buttons
  are applied two to twelve steps late, set from the measured round trip. Every
  thirty steps both hash their state; if they ever differ the host sends the
  small record of the run and both begin that stage again from it.
- So a new guardian, creature, weapon or item needs **no network code**. It
  needs to keep four rules:
  1. **Chance comes from the engine** (`ctx.random`, `T.random`, the engine's
     `random()`), never `Math.random()`, and nothing in the simulation reads
     the clock, the camera, the screen or the sound switch. (Drawing may: while
     the picture is drawn `random()` answers from a separate stream.)
  2. **Drawing does not change the game.** Timers that matter are counted in
     steps, in step code.
  3. **Arithmetic that every browser does alike.** Two different browsers may
     be playing. Adding, multiplying, dividing, `Math.sqrt`, rounding are the
     same everywhere; `Math.sin`, `cos`, `atan2`, `pow`, `exp`, `log` are not
     (each engine has its own, and one last place of difference puts both
     players back at the head of the stage for ever). Use `ST.sin` and the
     rest from `js/game/steady.js`. Never shuffle by sorting with a random
     comparator (engines sort differently): `ST.shuffle(list, random)`.
  4. **There may be two heroes.** `ctx.hero` is whoever this creature is going
     for (the engine chooses and loads her before it steps). For anything of
     your own that can touch a hero (a bubble, a cog, an echo) use
     `ctx.touch(box, damage, element, e)`, which tries everybody;
     `ctx.heroes()` lists who is up.
- **Both machines must run the same code to the letter.** Room 36's page
  carries a stamp (`data-build`, a hash of its scripts), asks for its scripts
  by that stamp so a browser cannot mix an old file with a new page, and a
  host refuses a guest whose stamp differs, saying so. `tools/make-rooms.js`
  writes the stamp: **run it after editing any script of the game**
  (`tools/lockstep.html` says when the stamp is stale).
- `tools/lockstep.html` (serve the site, then open it) proves it: two copies of
  the room on the same buttons, one drawn every frame and one every seventh,
  each seated as a different player, hashed after every step; then joined by
  a wire that delays, jitters, reorders and drops. Run it after adding
  anything. It also reads the sources for arithmetic that differs between
  browsers, and its last line (`across browsers: ...`) must be the same in
  every browser it is run in: run it in two. `tools/crossplay.html` goes
  further: one player of a real two-player game, played by script, so that
  two browsers (or two machines) can be set against each other over the real
  wire with nobody at either keyboard; it passes if `resyncs` stays 0.
  When a run fails, `Gallery.inspect('undercroft').hashed()` lists every
  value in the hash and `.traced([...])` lists who drew on the stream that step.
- There are two ways from one browser to the other, and both are tried at
  once under the same code (`js/game/wire.js`). The direct way is WebRTC,
  browser to browser; only its handshake uses a third party (the PeerJS
  project's free public broker, and public STUN servers). That broker is
  strict: it hangs up on anything not shaped like PeerJS's own messages, and
  on the empty candidate Firefox and Safari send, so `wire.js` sends two
  messages in all (an offer and an answer with the candidates inside),
  repeats them until they land, and reconnects if dropped.
- Many pairs of networks will not let a direct connection open at all (phone
  carriers, campuses, some home routers). For them there is the long way
  round (`js/game/relay.js`): the same messages passed along by a public MQTT
  broker over a WebSocket, spoken by hand, no account. The guest decides:
  direct if it opens within five seconds of the answer, otherwise the first
  broker through which the host answered. It costs about a sixth of a second
  of delay on the buttons. The brokers are other people's free services and
  promise nothing; the list is at the top of `relay.js` with how each was
  measured (one popular broker passes only a third of the messages at game
  rate and is left out for it). Anybody who knew the code could listen to the
  buttons. A TURN server of your own, if you have one, goes in `ICE` in
  `wire.js` (or `window.UndercroftICE`) and makes the direct way work
  everywhere instead. Networks that block unusual ports (8081, 8884) as well
  as direct connections still cannot be joined, and the page says so.
  A transport is four functions
  (`send`, `onmessage`, `onclose`, `close`); another can be put in its place
  without touching the game.

Rules for two: the three flames are shared; whoever is down rises half whole
at the next stage; a portal takes both; in a sanctuary and after a guardian
each takes one of the three; creatures have half again their life and
guardians three fifths more; pause is either player's, for both.

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
index.html            the hall: two tabs, the exhibition (rooms 1 to 5 and the floor plan to the rest) and the game (#game)
rooms/*.html          rooms 6 to 36, one work to a page (generated, committed)
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
js/rooms/undercroft.js    room 36  the game's engine: fixed step, tiles, camera, HUD, the run, persistence
js/game/steady.js         room 36  sines, arctangents and powers that every browser computes alike, and a proper shuffle: two machines must agree to the bit
js/game/pixels.js         room 36  the sprite compiler (text art to canvases), part-based rigs, the Warden's frames per weapon
js/game/classes.js        room 36  the four who go down: skins for the shared skeleton, numbers, what a dash is
js/game/weapons.js        room 36  twenty-six weapons in five rarities: movesets, grips, what each says it does
js/game/arms.js           room 36  what the newer weapons do at the end of their strokes: effects with lives of their own, the world held still
js/game/world.js          room 36  nine elements, levels of any height, the flood fill, nine guardians' halls (and the old corridor grammar)
js/game/wood.js           room 36  the Sunken Wood (floor 2) draws itself: tiles that know their neighbours, a sky of moving layers, vines, reeds, pod lamps
js/game/explore.js        room 36  stages of chambers: the maze walk, doorways, ladders, furniture, the portal; the sanctuary hall
js/game/actors.js         room 36  ten creatures as rigs: hurt boxes, attack boxes, the wind-up/active/recover clock
js/game/actors-deep.js    room 36  six more for the newer floors: Diver, Angler, Winder, Governor, Reflection, Prism
js/game/actors-wood.js    room 36  three for the Sunken Wood, drawn from stills in an asset library and given their frames: Rootwalker, Bog Mound, Rusalka
js/game/relics.js         room 36  four powers, twenty-eight items in four rarities
js/game/guardians.js      room 36  what the guardians share: registry, rig, turned pieces, attack clock, phases, soft boxes
js/game/boss-golem.js     room 36  the Kiln Golem: slam and wave, coals, furnace breath, leap, the vent on its back
js/game/boss-wyrm.js      room 36  the Rime Wyrm: eleven pieces on a rope; breach, beach, icicle rain, gust, coil and nova, lash
js/game/boss-thornmother.js room 36  the Thornmother: rooted; lashes low and high, walking roots, pods and brambles, pollen, a flower that opens
js/game/boss-bellkeeper.js room 36  the Bellkeeper: a crab in a bell; claw, bubbles, tolls low and high, the surge; ring it thrice from outside
js/game/boss-regulator.js room 36  the Regulator: a pendulum under a dial; cogs that come back, a loose hand, the hour struck in weights
js/game/boss-reflected.js room 36  the Reflected: three mirrors and the true one's glint; then out of the glass, fans of shards and a cut with an echo
js/game/boss-orrery.js    room 36  the Orrery: a core and three moons on rings; lit orbits, a flung moon, the pull, the eclipse
js/game/boss-herald.js    room 36  the Storm Herald: rhythm bolts, the live rail, blink, the waltzing balls, the turning pylons
js/game/boss-lightless.js room 36  the Lightless: your double, then the mask and hands, then the dark and three braziers
js/game/net.js            room 36  two machines, one game: lockstep over any transport (buttons only, hashes, resync, leaving)
js/game/relay.js          room 36  the long way round: MQTT by hand to a public broker, for networks that refuse direct connections
js/game/wire.js           room 36  a line between two browsers, direct (WebRTC) or relayed, and the six-character code that finds it
js/game/samples.js        room 36  written by tools/make-sounds.js: the recorded effects sound.js may load
js/game/sound.js          room 36  plays the recordings (with the synthesised effect under each as a fallback) and the synthesised floor music
audio/undercroft/         room 36  about sixty short mp3 effects made by ElevenLabs from the prompts in tools/sounds.js
tools/                authoring tools (Node): rooms.js is the copy, make-rooms.js stamps the pages
docs/                 design and task plans
```

## Getting from room to room

The hall opens with two tabs under its masthead: **Exhibition**, which is
everything described here, and **Game**, a page for room 36 with a way down,
all ten floors to begin on and how to play together. `index.html#game` opens
the second; any link to a place in the exhibition brings the first back.
While the game's tab is open the exhibition is not displayed, so its works are
out of sight and stop drawing (`js/core.js`, `wireDoors`).

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
Gallery.inspect('undercroft').state()   // rooms/undercroft.html: the Warden, the run, the creatures, the frame cost
Gallery.inspect('undercroft').press('right jump', 12)  // hold keys for so many steps (left right up down jump attack dash cast start pause)
Gallery.inspect('undercroft').generate(seed, floor, section)  // a floor: columns, reachable, enemies, relics
Gallery.inspect('undercroft').begin(seed, 'kite', floor); .pick(who); .classes(); .choose(index)  // who goes down, and on which floor (1 if left out)
Gallery.inspect('undercroft').portal(); .perks(); .reward()  // where the portal is and the chamber grid; what is offered (a sanctuary's perks or a guardian's rewards)
Sound.recorded()  // rooms/undercroft.html: how many recorded effects are listed and loaded
Gallery.inspect('undercroft').stage(n)  // any of the thirty-seven stages of the way down; .arena(floor) goes straight to a guardian (1, and 3 to 10: floor 2, the Sunken Wood, has none)
Gallery.inspect('undercroft').guardian(); .command('slam'); .slay()  // watch it (attack, phase, hurt-box targets), make it begin an attack by name, end it
Gallery.inspect('undercroft').party([{ who: 'smith' }, { who: 'kite' }], 0); .begin(36); .together(['right attack', 'left'], true); .players(); .place(1, x, y)  // two heroes in one simulation, driven by script
Gallery.inspect('undercroft').checksum(); .hashed(); .traced(['', '']); .record()  // the state's hash, what went into it, who drew chance this step, the run's small record
Gallery.inspect('undercroft').netInfo()  // the session: role, step, delay, round trip, resyncs
Gallery.inspect('undercroft').boxes(true)  // draw every hurt box, attack box and strike over the game
Gallery.inspect('undercroft').hands(); .swap(); .wield('lastlight'); .arms('whale')  // the two hands; change them; take a weapon as if found; count arms.js effects alive
Gallery.inspect('undercroft').summon('hound', 40, true); .equip('scythe'); .setPower('frostlance'); .take('aeolian'); .offer(3); .drop('weapon', 'dawnbreaker')
Gallery.inspect('undercroft').sheet(true, 3, 'idle,slamUp', 'golem')  // sprite frames large on the stage ('warden', 'creatures', 'golem', 'golem:2', 'herald'); sheet(false) resumes
```

## Notes

- `prefers-reduced-motion` is honoured: the site starts paused (with a Play
  control) and shows each work's resting state.
- Works that need WebGL, WebGL 2 float targets or Web Audio say so plainly in
  place of the work if the browser lacks them; the rest of the page carries on.
- Room 36's sound effects are the only files the site loads besides its own pages, styles and scripts. They are
  fetched only when sound is asked for; without them every effect is still synthesised. To make them again:
  `ELEVENLABS_API_KEY=... node tools/make-sounds.js` (every missing one) or `... make-sounds.js hit roar` (these,
  again). The key is read from the environment and never written down.
- Rooms 5, 14, 23, 27 and 36 make sound only after the visitor asks for it,
  and pausing motion silences them (rooms 23, 27 and 36 also hush when the tab
  is hidden). Room 35 speaks, with the Web Speech API, only when asked.
- Room 36 keeps its best floor, wins, unlocks and sound choice in
  localStorage, guarded so a private window simply forgets. Its keys: arrows
  or WASD move, X or K jumps, Z or J attacks, C or L dashes, V or I casts,
  Enter begins, Escape or P pauses; the stage must have focus (it has a
  tabindex, so the arrow keys steer the Warden and not the rooms). On touch
  screens the controls are drawn below the frame.
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
