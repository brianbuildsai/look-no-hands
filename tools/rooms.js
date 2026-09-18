/* rooms.js — every word that appears on a room page, in one place.

   `hall` lists the five rooms that live in index.html, for the floor plan.
   `rooms` lists the pages stamped by make-rooms.js. A room appears on the
   site (its page, the floor plan, its neighbours' links) only once `ready`
   is true.

   In `medium`, <span class="live" data-live="slug.key"> marks a figure the
   work keeps up to date while it runs. */
'use strict';

module.exports = {
  planIntro: 'The hall is five rooms. There {are} {count} more through here, one work in each, and none of them is a picture either.',

  hall: [
    { number: 1, id: 'quicksilver', title: 'Quicksilver' },
    { number: 2, id: 'murmuration', title: 'Murmuration' },
    { number: 3, id: 'mind', title: 'Study for a Mind' },
    { number: 4, id: 'garden', title: "Turing's Garden" },
    { number: 5, id: 'harp', title: 'Aeolian Harp' }
  ],

  rooms: [
    {
      number: 6,
      slug: 'weather',
      ready: true,
      title: 'Indoor Weather',
      line: 'Stir smoke that curls like the real thing.',
      description: 'Stir coloured smoke that curls, shears and rolls like the real thing: a fluid solver running live on your graphics card.',
      canvasLabel: 'Coloured smoke drifting and curling in the dark, pushed around by your pointer.',
      medium: '2026. <span class="live" data-live="weather.cells">0</span> cells of air, their pressure solved <span class="live" data-live="weather.solves">0</span> times a second on your graphics card.',
      text: 'Move through it and the air moves with you, then keeps going. Every curl comes from the two equations that run the real weather, solved on a grid far too coarse to forecast anything and just fine enough to fool the eye.',
      controls: `
<div class="controls" role="group" aria-label="Indoor Weather controls">
  <label class="dial">
    <span class="dial__label"><span>How much it curls</span><span data-weather-curl-value></span></span>
    <input class="dial__input" type="range" min="0" max="60" step="1" value="28" data-weather-curl>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-weather-gusts aria-pressed="true">Let it blow by itself</button>
    <button class="btn" type="button" data-weather-clear>Clear the air</button>
  </div>
</div>`,
      wall: 'Nothing in here was animated. There is no list of swirls to play back. The smoke goes where the arrows send it, the arrows push on each other, and what that ends up looking like is left entirely to the equations.'
    },
    {
      number: 7,
      slug: 'horizon',
      ready: true,
      title: 'Where Light Turns Back',
      line: 'Walk round a black hole and watch it bend the sky.',
      description: 'Orbit a black hole and watch it bend the stars and its own glowing disc: light paths traced through curved space, per pixel, live.',
      canvasLabel: 'A black disc ringed with glowing gas against a field of stars. The ring appears to arch over and under the hole, and the stars behind it are smeared into arcs.',
      medium: '2026. <span class="live" data-live="horizon.rays">0</span> paths of light, each bent step by step through curved space, <span class="live" data-live="horizon.fps">60</span> frames a second.',
      text: 'Drag to walk round it. The glowing disc is flat. The arch you see over the top, and the one underneath, are the far side of that same disc: its light set off away from you and was bent back. One side is brighter because the gas there is coming toward you at up to half the speed of light.',
      controls: `
<div class="controls" role="group" aria-label="Where Light Turns Back controls">
  <label class="dial">
    <span class="dial__label"><span>How close you stand</span><span data-horizon-distance-value></span></span>
    <input class="dial__input" type="range" min="14" max="44" step="1" value="26" data-horizon-distance>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-horizon-disc aria-pressed="true">Glowing disc</button>
  </div>
</div>`,
      wall: 'No picture of a black hole was used, because for most of history there was none to use. This is what general relativity says you would see, worked out one ray at a time. When a real one was finally photographed in 2019, the shadow and the bright ring were where the equations had put them.'
    },
    {
      number: 8,
      slug: 'alike',
      ready: true,
      title: 'Nearly Alike',
      line: 'Release 1,500 pendulums a millionth of a degree apart.',
      description: 'Fifteen hundred double pendulums released a millionth of a degree apart: watch them move as one, then come apart into chaos.',
      canvasLabel: 'A double pendulum swinging from a fixed point. It is really hundreds of pendulums drawn on top of each other, which slowly fan out into a coloured cloud.',
      medium: '2026. <span class="live" data-live="alike.count">0</span> double pendulums released together, almost exactly alike. <span class="live" data-live="alike.time">0.0</span> seconds later they differ by <span class="live" data-live="alike.drift">0°</span>.',
      text: 'For the first few seconds you are looking at all of them and seeing one. Nothing pushes them apart. The difference was there from the start, far too small to see, and it doubles several times a second. Take hold of the tip, put it where you like, and let go.',
      controls: `
<div class="controls" role="group" aria-label="Nearly Alike controls">
  <label class="dial">
    <span class="dial__label"><span>How alike they start</span><span data-alike-spread-value></span></span>
    <input class="dial__input" type="range" min="3" max="9" step="1" value="6" data-alike-spread>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-alike-again>Let go again</button>
  </div>
</div>`,
      wall: 'This is why the weather forecast gives up after ten days. Nothing in this room is random. Every pendulum obeys the same exact law, worked out to sixteen digits. It is the law itself that pulls them apart.'
    },
    {
      number: 9,
      slug: 'pencil',
      ready: true,
      scripts: ['hand.js'],
      title: "Ptolemy's Pencil",
      line: 'Draw anything. Turning circles learn to redraw it.',
      description: 'Draw any closed shape and a chain of turning circles learns to redraw it: a Fourier transform you can watch, with a dial for how many circles it may use.',
      canvasLabel: 'A chain of circles, each turning on the rim of the last, whose final point traces the outline of a hand in amber light.',
      medium: '2026. <span class="live" data-live="pencil.circles">0</span> turning circles, found by a Fourier transform of <span class="live" data-live="pencil.points">0</span> points along the drawing.',
      text: 'The drawing has been taken apart into circles, each turning at its own steady speed, each riding on the rim of the one before. Turn the dial down and the hand melts into a blob; turn it up and it comes back. Then draw a closed shape of your own, in one stroke, anywhere.',
      controls: `
<div class="controls" role="group" aria-label="Ptolemy's Pencil controls">
  <label class="dial">
    <span class="dial__label"><span>How many circles it may use</span></span>
    <input class="dial__input" type="range" min="0" max="100" step="1" value="45" data-pencil-circles>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-pencil-hand>Draw the hand again</button>
  </div>
</div>`,
      wall: 'Ptolemy stacked circles on circles to explain the wandering of the planets, and he was wrong about the planets. He was right about circles. Seventeen centuries later Fourier showed that enough of them, turning at whole-number speeds, can draw anything at all. It is the idea behind how music and pictures are stored.'
    },
    {
      number: 10,
      slug: 'endpapers',
      ready: true,
      title: 'Endpapers',
      line: 'Drop ink, rake it, swirl it: marbled paper by algebra.',
      description: 'Drop ink, rake it and swirl it into marbled paper. Every stroke is an exactly reversible map, undone per pixel in a shader; nothing is ever painted.',
      canvasLabel: 'A sheet of marbled paper in amber, blue, rose and bone inks, combed into feathered patterns.',
      medium: '2026. <span class="live" data-live="endpapers.strokes">0</span> strokes. For every pixel, each one is undone in turn, newest first, to find out which ink ended up there.',
      text: 'The machine lays a sheet to begin with. Then it is your bath: press and hold to let a drop of ink spread, drag to pull a rake or a comb through it, drag sideways to swirl. Each stroke moves everything already there, exactly as it would on water.',
      controls: `
<div class="controls" role="group" aria-label="Endpapers controls">
  <div class="controls__row" role="group" aria-label="Tool">
    <button class="btn" type="button" data-endpapers-tool="drop" aria-pressed="true">Drop</button>
    <button class="btn" type="button" data-endpapers-tool="rake" aria-pressed="false">Rake</button>
    <button class="btn" type="button" data-endpapers-tool="comb" aria-pressed="false">Comb</button>
    <button class="btn" type="button" data-endpapers-tool="swirl" aria-pressed="false">Swirl</button>
  </div>
  <div class="controls__row" role="group" aria-label="Ink for the next drop">
    <span class="controls__caption">Next drop</span>
    <button class="swatch swatch--amber" type="button" data-endpapers-ink="0" aria-pressed="true" aria-label="Amber ink"></button>
    <button class="swatch swatch--ultramarine" type="button" data-endpapers-ink="1" aria-pressed="false" aria-label="Ultramarine ink"></button>
    <button class="swatch swatch--rose" type="button" data-endpapers-ink="2" aria-pressed="false" aria-label="Rose ink"></button>
    <button class="swatch swatch--bone" type="button" data-endpapers-ink="3" aria-pressed="false" aria-label="Bone ink"></button>
    <button class="swatch swatch--void" type="button" data-endpapers-ink="4" aria-pressed="false" aria-label="Black ink"></button>
  </div>
  <div class="controls__row">
    <button class="btn" type="button" data-endpapers-undo>Take back the last stroke</button>
    <button class="btn" type="button" data-endpapers-fresh>Fresh bath</button>
    <button class="btn" type="button" data-endpapers-compose>Lay one for me</button>
  </div>
</div>`,
      wall: 'Marblers float ink on thickened water and pull it about with combs, and have done for five hundred years. Here there is no water and no ink, only a list of what was done. The sheet is worked out backwards from that list, which is why a drop can shove aside a pattern that was never really there.'
    },
    {
      number: 11,
      slug: 'wayfinding',
      ready: true,
      title: 'Wayfinding',
      line: 'A slime mould with no brain builds a road network.',
      description: 'Tens of thousands of brainless agents build road networks between flakes of food, the way slime mould redrew the Tokyo rail map. Put food down and watch the roads grow.',
      canvasLabel: 'Glowing veins spreading across the dark and joining small white circles of food into a network, like roads between towns.',
      medium: '2026. <span class="live" data-live="wayfinding.agents">0</span> agents, each smelling three points ahead and turning toward the strongest. <span class="live" data-live="wayfinding.flakes">0</span> flakes of food, <span class="live" data-live="wayfinding.fps">60</span> frames a second.',
      text: 'Slime mould has no brain and no plan. In 2010 researchers laid out oat flakes like the towns around Tokyo, and it grew something very close to the Tokyo rail network. This is that behaviour from one small rule. Click to put a flake down, click a flake to take it away, and drag through the roads to scatter them and watch them grow back.',
      controls: `
<div class="controls" role="group" aria-label="Wayfinding controls">
  <div class="controls__row" role="group" aria-label="Habit">
    <button class="btn" type="button" data-wayfinding-habit="roads" aria-pressed="true">Roads</button>
    <button class="btn" type="button" data-wayfinding-habit="lace" aria-pressed="false">Lace</button>
    <button class="btn" type="button" data-wayfinding-habit="rivers" aria-pressed="false">Rivers</button>
  </div>
  <div class="controls__row">
    <button class="btn" type="button" data-wayfinding-scatter>Scatter them</button>
    <button class="btn" type="button" data-wayfinding-clear>Take the food away</button>
  </div>
</div>`,
      wall: 'Each agent follows the scent the others left, and leaves a little of its own. That is the entire rule. Nobody is in charge of the network and nobody in it can see it. It is still, by any fair measure, a good network.'
    },
    {
      number: 12,
      slug: 'introduction',
      ready: true,
      title: 'An Introduction',
      line: 'Two spiral galaxies pass through each other.',
      description: 'Send two spiral galaxies through each other and watch tides pull them into bridges and tails: forty thousand stars, integrated live, that you can turn in your hand.',
      canvasLabel: 'Two glowing spiral discs of stars, one amber and one blue, swinging past each other and drawing out long curved tails.',
      medium: '2026. <span class="live" data-live="introduction.stars">0</span> stars and two heavy centres. <span class="live" data-live="introduction.years">0</span> million years since they first felt each other; <span class="live" data-live="introduction.fps">60</span> frames a second.',
      text: 'Each star here feels the two centres and nothing else, a shortcut two brothers named Toomre used in 1972 to show that the long tails on real colliding galaxies are tides and nothing stranger. Drag to see it from another side. Choose how close they pass.',
      controls: `
<div class="controls" role="group" aria-label="An Introduction controls">
  <div class="controls__row" role="group" aria-label="How close they pass">
    <button class="btn" type="button" data-introduction-pass="grazing" aria-pressed="false">A grazing pass</button>
    <button class="btn" type="button" data-introduction-pass="close" aria-pressed="true">A close pass</button>
    <button class="btn" type="button" data-introduction-pass="headon" aria-pressed="false">Head on</button>
  </div>
  <label class="dial">
    <span class="dial__label"><span>How fast time runs</span><span data-introduction-speed-value></span></span>
    <input class="dial__input" type="range" min="0" max="3" step="0.25" value="1" data-introduction-speed>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-introduction-again>Introduce them again</button>
  </div>
</div>`,
      wall: 'The Andromeda galaxy is coming toward ours at about a hundred kilometres a second. If the two do meet, several billion years from now, the night sky will look something like this, and almost no stars will actually collide. There is far too much room between them.'
    },
    {
      number: 13,
      slug: 'hand',
      ready: true,
      scripts: ['hand.js'],
      title: "The Hand It Doesn't Have",
      line: 'One thread, wound nail to nail, becomes a hand.',
      description: 'Watch one continuous thread, wound from nail to nail by a greedy solver, become a hand. Or type letters and it winds those instead.',
      canvasLabel: 'A ring of nails with fine pale thread criss-crossing between them. Where the threads pile up, the shape of an open hand appears.',
      medium: '2026. One unbroken thread: <span class="live" data-live="hand.runs">0</span> straight runs between <span class="live" data-live="hand.nails">0</span> nails so far, about <span class="live" data-live="hand.metres">0</span> metres of it if the board were 60 cm across.',
      text: 'Nothing here is drawn. A single thread goes from nail to nail, and each time the machine asks one question: from this nail, which straight line lies across the most of the picture still missing? The hand is what piles up. Type up to three letters and it will wind those instead.',
      controls: `
<form class="controls say" data-hand-form autocomplete="off">
  <label class="say__label" for="hand-letters">Letters to wind instead</label>
  <input class="say__input" id="hand-letters" name="letters" type="text" maxlength="3" placeholder="Your initials" spellcheck="false" autocapitalize="characters" enterkeyhint="done" data-hand-letters>
</form>
<div class="controls" role="group" aria-label="The Hand It Doesn't Have controls">
  <label class="dial">
    <span class="dial__label"><span>How fast it winds</span><span data-hand-pace-value></span></span>
    <input class="dial__input" type="range" min="1" max="30" step="1" value="1" data-hand-pace>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-hand-hand>Wind the hand</button>
    <button class="btn" type="button" data-hand-again>Start again</button>
  </div>
</div>`,
      wall: 'It has never had a hand, and has seen a great many. This one was not copied from any of them. It was reasoned out from where a palm, a thumb and four fingers have to go, and then given to a loop that knows nothing about hands at all.'
    },
    {
      number: 14,
      slug: 'necklaces',
      ready: true,
      title: 'Necklaces',
      line: 'Spread beats evenly round a wheel and get the world’s rhythms.',
      description: 'Four rhythm wheels with synthesised drums. Spread beats as evenly as they will go and the rhythms of Cuba, Brazil, West Africa and Turkey fall out.',
      canvasLabel: 'Four concentric rings of beads with a hand sweeping round them like a clock. Beads light up as the hand passes, each ring in its own colour.',
      medium: '2026. Four rings, <span class="live" data-live="necklaces.beats">0</span> beats a minute, four beats to a turn. Every sound is synthesised at the moment it is struck.',
      text: 'Each ring spreads its beats as evenly as they will go. Add or take away a beat and the ring rearranges itself, and more often than not the result already has a name somewhere in the world. Take hold of a ring to turn it against the others. Turn the sound on.',
      controls: `
<div class="controls" role="group" aria-label="Necklaces controls">
  <div class="ring-rows" role="group" aria-label="Beats on each ring, outermost first">
    <div class="ring-row ring-row--shaker">
      <span class="ring-row__name">Shaker</span>
      <button class="btn btn--step" type="button" data-ring-less="0" aria-label="Shaker: one beat fewer">&minus;</button>
      <span class="ring-row__count live" data-ring-count="0"></span>
      <button class="btn btn--step" type="button" data-ring-more="0" aria-label="Shaker: one beat more">+</button>
      <span class="ring-row__where" data-ring-where="0"></span>
    </div>
    <div class="ring-row ring-row--bell">
      <span class="ring-row__name">Bell</span>
      <button class="btn btn--step" type="button" data-ring-less="1" aria-label="Bell: one beat fewer">&minus;</button>
      <span class="ring-row__count live" data-ring-count="1"></span>
      <button class="btn btn--step" type="button" data-ring-more="1" aria-label="Bell: one beat more">+</button>
      <span class="ring-row__where" data-ring-where="1"></span>
    </div>
    <div class="ring-row ring-row--clap">
      <span class="ring-row__name">Clap</span>
      <button class="btn btn--step" type="button" data-ring-less="2" aria-label="Clap: one beat fewer">&minus;</button>
      <span class="ring-row__count live" data-ring-count="2"></span>
      <button class="btn btn--step" type="button" data-ring-more="2" aria-label="Clap: one beat more">+</button>
      <span class="ring-row__where" data-ring-where="2"></span>
    </div>
    <div class="ring-row ring-row--drum">
      <span class="ring-row__name">Low drum</span>
      <button class="btn btn--step" type="button" data-ring-less="3" aria-label="Low drum: one beat fewer">&minus;</button>
      <span class="ring-row__count live" data-ring-count="3"></span>
      <button class="btn btn--step" type="button" data-ring-more="3" aria-label="Low drum: one beat more">+</button>
      <span class="ring-row__where" data-ring-where="3"></span>
    </div>
  </div>
  <div class="controls__row" role="group" aria-label="Ensemble">
    <button class="btn" type="button" data-necklaces-ensemble="havana" aria-pressed="true">Havana</button>
    <button class="btn" type="button" data-necklaces-ensemble="accra" aria-pressed="false">Accra</button>
    <button class="btn" type="button" data-necklaces-ensemble="istanbul" aria-pressed="false">Istanbul</button>
  </div>
  <label class="dial">
    <span class="dial__label"><span>How fast the wheel turns</span><span data-necklaces-tempo-value></span></span>
    <input class="dial__input" type="range" min="60" max="160" step="2" value="104" data-necklaces-tempo>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-necklaces-sound>Turn sound on</button>
  </div>
</div>`,
      wall: 'In 2005 the computer scientist Godfried Toussaint pointed out that if you spread some beats as evenly as possible round a circle, using a method Euclid wrote down for another purpose entirely, you get rhythms people have played for centuries: the Cuban tresillo, the bossa nova, the bell pattern of West Africa. Nobody designed them that way. Evenness just sounds right.'
    },
    {
      number: 15,
      slug: 'hourglass',
      ready: true,
      title: 'Hourglass',
      line: 'Pour sand, water and fire. Every grain follows two rules.',
      description: 'A falling-sand world where every cell looks only at its neighbours, and sand piles, water levels and fire spreads. It starts as an hourglass. It need not stay one.',
      canvasLabel: 'An hourglass drawn in small square cells, sand streaming from the upper bulb into the lower one. Whatever the visitor pours in falls, flows or burns.',
      medium: '2026. <span class="live" data-live="hourglass.cells">0</span> cells, each looking only at the cells beside it, sixty times a second. <span class="live" data-live="hourglass.grains">0</span> grains of sand. Turns of the glass so far: <span class="live" data-live="hourglass.turns">0</span>.',
      text: 'Nothing here knows it is an hourglass. A grain of sand knows two things: fall if there is room below, otherwise slide. Water knows three. Fire knows that wood burns. Pour something in, set light to the frame, or rub out the glass and see what the sand does. When the sand runs out it turns itself over.',
      controls: `
<div class="controls" role="group" aria-label="Hourglass controls">
  <div class="controls__row" role="group" aria-label="What to pour">
    <button class="btn" type="button" data-hourglass-tool="sand" aria-pressed="true">Sand</button>
    <button class="btn" type="button" data-hourglass-tool="water" aria-pressed="false">Water</button>
    <button class="btn" type="button" data-hourglass-tool="fire" aria-pressed="false">Fire</button>
    <button class="btn" type="button" data-hourglass-tool="wood" aria-pressed="false">Wood</button>
    <button class="btn" type="button" data-hourglass-tool="stone" aria-pressed="false">Stone</button>
    <button class="btn" type="button" data-hourglass-tool="erase" aria-pressed="false">Rub out</button>
  </div>
  <label class="dial">
    <span class="dial__label"><span>How wide it pours</span><span data-hourglass-brush-value></span></span>
    <input class="dial__input" type="range" min="1" max="10" step="1" value="4" data-hourglass-brush>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-hourglass-turn>Turn it over</button>
    <button class="btn" type="button" data-hourglass-again>Start again</button>
    <button class="btn" type="button" data-hourglass-empty>Empty it</button>
  </div>
</div>`,
      wall: 'Falling-sand games turned up on the web in the mid-2000s and programmers have been rewriting them ever since, because so little code gives so much world. There is no physics engine here: no gravity constant, no pressure, no heat equation. Each cell is one number, and the rules for every number together would fit on a postcard.'
    },
    {
      number: 16,
      slug: 'bottom',
      ready: true,
      title: 'No Bottom',
      line: 'Fall a trillion times into one line of arithmetic.',
      description: 'A dive into the Mandelbrot set, trillions of times deep, far past what a graphics card can count, by keeping track only of how each pixel differs from one carefully computed point.',
      canvasLabel: 'The edge of the Mandelbrot set, magnified continuously: spirals inside spirals in blue, bone, amber and rose, closing in on a point that looks the same at every scale, until a small copy of the whole set appears at the bottom.',
      medium: '2026. Magnified <span class="live" data-live="bottom.zoom">1</span> times. Neighbouring pixels now differ in decimal place <span class="live" data-live="bottom.digits">3</span>; a graphics card keeps about seven. Up to <span class="live" data-live="bottom.steps">0</span> steps of arithmetic for every pixel of every frame.',
      text: 'The whole shape is one sum, repeated: square a number, add where you are standing, see if it runs away. Its edge never runs out of detail, but numbers do. So one point in the middle of the view is worked out with great care, and every pixel keeps track only of how it differs from that one. At the bottom of each fall there is a small copy of the whole thing, waiting. Press and hold to steer somewhere else.',
      controls: `
<div class="controls" role="group" aria-label="No Bottom controls">
  <label class="dial">
    <span class="dial__label"><span>How fast it falls</span><span data-bottom-speed-value></span></span>
    <input class="dial__input" type="range" min="2" max="16" step="1" value="7" data-bottom-speed>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-bottom-hold aria-pressed="false">Hold still</button>
    <button class="btn" type="button" data-bottom-up>Come back up</button>
  </div>
</div>`,
      wall: 'Benoit Mandelbrot had this shape drawn on an IBM printer in 1980 and nobody has reached the bottom of it since, because there is not one. Each fall here ends a few trillion times down, at one of the endless small copies of the whole set. It could not go much further: that is about where ordinary computer numbers give out. The shape was not getting any simpler.'
    },
    {
      number: 17,
      slug: 'drapery',
      ready: true,
      title: 'Drapery',
      line: 'Take hold of a sheet of silk that is only arithmetic.',
      description: 'A sheet of silk you can take hold of, hang from pegs, or let fall over a hidden form. It is a grid of points and threads that refuse to stretch, lit in WebGL.',
      canvasLabel: 'A sheet of pale silk with a blue lining, hanging in folds from five pegs and stirring in a light wind. It can also be let fall over a form that is never shown.',
      medium: '2026. <span class="live" data-live="drapery.points">0</span> points joined by <span class="live" data-live="drapery.threads">0</span> threads that refuse to stretch, each put back to its proper length ten times a frame.',
      text: 'There is no cloth here. There is a grid of points, each insisting on staying the same distance from its neighbours while gravity and the wind pull at it, and the folds are what that argument looks like. Take hold of it anywhere. Move a peg. Or let it fall over something: whatever is under there is never drawn, and is only there where the cloth touches it.',
      controls: `
<div class="controls" role="group" aria-label="Drapery controls">
  <div class="controls__row" role="group" aria-label="What the cloth is doing">
    <button class="btn" type="button" data-drapery-mode="hang" aria-pressed="true">Hang it up</button>
    <button class="btn" type="button" data-drapery-mode="drape" aria-pressed="false">Let it fall over something</button>
  </div>
  <p class="controls__caption">Ask again and something else will be under it.</p>
  <label class="dial">
    <span class="dial__label"><span>Wind</span><span data-drapery-wind-value></span></span>
    <input class="dial__input" type="range" min="0" max="10" step="1" value="4" data-drapery-wind>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-drapery-gust>A gust</button>
    <button class="btn" type="button" data-drapery-again>Smooth it out</button>
  </div>
</div>`,
      wall: 'Painters spent years of their apprenticeship on drapery, because a fold is hard: each one depends on all the others. A computer finds them the way the cloth does, by letting every thread pull until nothing is pulled any more. The method was worked out in 1967 to follow atoms, and borrowed in 2001 to make cloth for a video game.'
    },
    {
      number: 18,
      slug: 'slits',
      ready: true,
      title: 'Two Slits',
      line: 'Send waves through two gaps and watch the stripes build.',
      description: 'A ripple tank on your graphics card. Send waves through two slits and watch the interference stripes build on the far wall, focus them with a lens of slow glass, or draw your own walls.',
      canvasLabel: 'Blue ripples travelling across dark water, passing through two gaps in a pale wall and spreading as two sets of crossing rings. An amber strip on the far side shows bright and dark stripes.',
      medium: '2026. <span class="live" data-live="slits.cells">0</span> cells of water, each compared with its four neighbours <span class="live" data-live="slits.rate">180</span> times a second. Nothing else is calculated.',
      text: 'Waves come in from one side, meet a wall with two gaps in it, and leave as two sets of rings that cross. Where crest meets crest the water leaps; where crest meets trough it lies still. The amber strip on the far wall keeps count of how hard the water moved, and slowly shows stripes. Tap the water to drop a pebble in, hold for a dripping tap, or draw walls and glass of your own.',
      controls: `
<div class="controls" role="group" aria-label="Two Slits controls">
  <div class="controls__row" role="group" aria-label="What is in the tank">
    <button class="btn" type="button" data-slits-layout="two" aria-pressed="true">Two slits</button>
    <button class="btn" type="button" data-slits-layout="one" aria-pressed="false">One slit</button>
    <button class="btn" type="button" data-slits-layout="lens" aria-pressed="false">A lens</button>
    <button class="btn" type="button" data-slits-layout="open" aria-pressed="false">Open water</button>
  </div>
  <div class="controls__row" role="group" aria-label="What your hand does">
    <button class="btn" type="button" data-slits-tool="pebble" aria-pressed="true">Pebble</button>
    <button class="btn" type="button" data-slits-tool="wall" aria-pressed="false">Wall</button>
    <button class="btn" type="button" data-slits-tool="glass" aria-pressed="false">Glass</button>
    <button class="btn" type="button" data-slits-tool="rub" aria-pressed="false">Rub out</button>
  </div>
  <div class="controls__row">
    <button class="btn" type="button" data-slits-calm>Calm the water</button>
  </div>
</div>`,
      wall: 'In the first years of the 1800s Thomas Young let light through two slits and found stripes on the far wall, bright and dark, which only waves can make. So light was a wave. A century later it turned out that single particles of light, sent through one at a time, slowly build the same stripes. Nobody is entirely comfortable with that yet.'
    },
    {
      number: 19,
      slug: 'numbers',
      ready: true,
      title: 'Four Numbers',
      line: 'Drag, and four numbers redraw a figure nobody has seen.',
      description: 'A strange attractor drawn live: one point, moved by the same two lines of arithmetic for ever, traces a figure fixed entirely by four numbers. Drag to change them.',
      canvasLabel: 'A luminous figure like folded silk or smoke, in amber, blue and rose on black, made of millions of specks of light. It slowly changes shape as the four numbers that define it drift.',
      medium: '2026. a = <span class="live" data-live="numbers.a">0</span>, b = <span class="live" data-live="numbers.b">0</span>, c = <span class="live" data-live="numbers.c">0</span>, d = <span class="live" data-live="numbers.d">0</span>. <span class="live" data-live="numbers.points">0</span> specks of light a second, each put through the same two lines of arithmetic.',
      text: 'Take a point. Move it to sin(a·y) + c·cos(a·x) across and sin(b·x) + d·cos(b·y) up. Do it again, for ever, and mark everywhere it lands. That is the whole recipe, and the four numbers are the only ingredients: nearly every choice of them draws a figure nobody has seen before. Drag to change them. Leave it alone and it wanders off to find another.',
      controls: `
<div class="controls" role="group" aria-label="Four Numbers controls">
  <div class="controls__row" role="group" aria-label="Which numbers dragging changes">
    <button class="btn" type="button" data-numbers-pair="0" aria-pressed="true">Drag changes a and b</button>
    <button class="btn" type="button" data-numbers-pair="1" aria-pressed="false">c and d</button>
  </div>
  <div class="controls__row">
    <button class="btn" type="button" data-numbers-hold aria-pressed="false">Hold it there</button>
    <button class="btn" type="button" data-numbers-elsewhere>Somewhere else</button>
  </div>
</div>`,
      wall: 'The point never settles and never repeats, and yet it never leaves the figure. Shapes like this are called strange attractors. The first was found in 1963 by Edward Lorenz, a meteorologist, inside a toy model of the weather; this recipe is Clifford Pickover’s. Nothing here is drawn. The figure is only where the point happens to go.'
    },
    {
      number: 20,
      slug: 'reaching',
      ready: true,
      title: 'Reaching',
      line: 'Scatter light and a tree grows to reach it.',
      description: 'Scatter specks of light and a tree grows toward them, branch by branch, thickening by Leonardo’s rule and swaying as it goes. Nothing in the method says what a tree looks like.',
      canvasLabel: 'A pale, bare tree drawn in fine lines growing up from a ground line into a cloud of small blue specks of light. Where a branch reaches a speck it leaves an amber leaf of light. The tree sways slightly.',
      medium: '2026. <span class="live" data-live="reaching.branches">0</span> lengths of branch. <span class="live" data-live="reaching.reached">0</span> specks of light reached, <span class="live" data-live="reaching.left">0</span> still in the air.',
      text: 'Light hangs in the air as specks. Every moment, each bit of branch that can sense a speck grows a little way toward it, and a speck that is reached is used up. There is no plan of a tree anywhere in this. Its shape is the order in which the light ran out. Click or drag to scatter more light, anywhere you like, and it will go and get it.',
      controls: `
<div class="controls" role="group" aria-label="Reaching controls">
  <label class="dial">
    <span class="dial__label"><span>How far it can sense light</span><span data-reaching-sense-value></span></span>
    <input class="dial__input" type="range" min="36" max="160" step="4" value="80" data-reaching-sense>
  </label>
  <p class="controls__caption">Applies to what grows from now on. Plant another to see the whole difference.</p>
  <div class="controls__row">
    <button class="btn" type="button" data-reaching-rain>Let it rain light</button>
    <button class="btn" type="button" data-reaching-again>Plant another</button>
  </div>
</div>`,
      wall: 'Leonardo da Vinci noticed that when a branch forks, the two new branches together are as thick as the one they came from, all the way up, as though a tree were a bundle of pipes. The thicknesses here follow his rule. The growing follows a method published in 2007 for leaf veins, which turned out to make trees as well. Nobody tells it what a tree looks like.'
    },
    {
      number: 21,
      slug: 'limit',
      ready: true,
      title: 'Circle Limit',
      line: 'Drag an infinite plane through a disc. You never reach the rim.',
      description: 'An infinite tiling of the hyperbolic plane inside a disc, after Escher. Drag it and new tiles stream in from a rim you can never reach. Choose how many sides a tile has and how many meet at a corner.',
      canvasLabel: 'A disc filled with black and pale triangles that shrink without end toward its rim, arranged in seven-sided tiles. The whole pattern drifts and turns slowly, new tiles growing from the rim as others shrink away.',
      medium: '2026, after M. C. Escher. Tiles with <span class="live" data-live="limit.p">7</span> sides, <span class="live" data-live="limit.q">3</span> meeting at every corner: more than a flat sheet has room for. Every pixel is folded back into one triangle, by up to fifty-six reflections, every frame.',
      text: 'This is the whole of an infinite plane, seen from outside. Every tile is exactly the same size and shape as every other. They only look smaller toward the rim, the way a distant tree looks smaller, and the rim is infinitely far away. Drag it. However far you go there is always as much again ahead of you. Then change how many sides a tile has, and how many meet at a corner.',
      controls: `
<div class="controls" role="group" aria-label="Circle Limit controls">
  <label class="dial">
    <span class="dial__label"><span>Sides to a tile</span><span data-limit-sides-value></span></span>
    <input class="dial__input" type="range" min="3" max="8" step="1" value="7" data-limit-sides>
  </label>
  <label class="dial">
    <span class="dial__label"><span>Tiles meeting at a corner</span><span data-limit-meet-value></span></span>
    <input class="dial__input" type="range" min="3" max="8" step="1" value="3" data-limit-meet>
  </label>
  <p class="controls__caption">Pairs that would fit on flat paper, or on a ball, are moved up to the nearest that needs this much room.</p>
  <div class="controls__row" role="group" aria-label="How it is drawn">
    <button class="btn" type="button" data-limit-look="0" aria-pressed="true">Woodcut</button>
    <button class="btn" type="button" data-limit-look="1" aria-pressed="false">Lines</button>
    <button class="btn" type="button" data-limit-look="2" aria-pressed="false">Lanterns</button>
  </div>
</div>`,
      wall: 'In 1958 the geometer H. S. M. Coxeter sent M. C. Escher a figure like this one, and Escher, who said he understood none of the mathematics, worked out how to construct it with ruler and compass and cut four Circle Limit prints. The geometry itself dates from about 1830, when Bolyai and Lobachevsky each found that Euclid\u2019s rule about parallel lines could be broken without anything else going wrong.'
    },
    {
      number: 22,
      slug: 'follower',
      ready: true,
      title: 'A Follower',
      line: 'Something with a lot of legs follows you round the room.',
      description: 'A many-legged creature follows your pointer and walks properly while it does, with no animation anywhere in it: four small rules about heads, spines and feet.',
      canvasLabel: 'A pale, many-legged creature seen from above, drawn in fine lines like a specimen, with two feelers and amber eyes. It walks toward the pointer, each foot planting and stepping in turn, leaving a fading trail of blue footprints.',
      medium: '2026. <span class="live" data-live="follower.legs">16</span> legs, each solved backwards from its foot sixty times a second. <span class="live" data-live="follower.steps">0</span> steps taken, <span class="live" data-live="follower.walked">0.0</span> metres walked. No animation was drawn or recorded.',
      text: 'It follows you. Nothing tells it how to walk. Its head turns toward you and goes; its spine is dragged along behind; each foot stays planted until the body has left it too far behind, and then steps to where it ought to be, but only if the feet next to it are on the ground. The ripple that runs down its legs was never written. It is what those rules do. Move, and it comes. Tap, and it hurries.',
      controls: `
<div class="controls" role="group" aria-label="A Follower controls">
  <label class="dial">
    <span class="dial__label"><span>How many legs</span><span data-follower-pairs-value></span></span>
    <input class="dial__input" type="range" min="2" max="24" step="1" value="8" data-follower-pairs>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-follower-another>Another species</button>
  </div>
</div>`,
      wall: 'Animators call this procedural animation, and the leg part inverse kinematics: you say where the foot is, and the knee is worked out with the cosine rule you learned at school. Real centipedes do much the same. Nothing in a centipede knows the pattern its legs make; each leg only minds its neighbours.'
    },
    {
      number: 23,
      slug: 'choir',
      ready: true,
      title: 'Choir',
      line: 'Four voices that belong to nobody, singing in harmony.',
      description: 'Four synthetic voices sing in harmony: a buzz put through the resonances of a throat. Move across the stage for the vowel and up and down for the chord.',
      canvasLabel: 'Four simple faces in a row, amber, rose, bone and blue, each with a mouth that opens and spreads to the shape of the vowel being sung. Below them four coloured lines trace the notes of the bass, tenor, alto and soprano.',
      medium: '2026. <span class="live" data-live="choir.voices">4</span> voices singing \u201c<span class="live" data-live="choir.vowel">ah</span>\u201d on a chord of <span class="live" data-live="choir.chord">D major</span>. Each is a sawtooth buzz put through four resonant filters. Nobody was recorded.',
      text: 'A voice is a buzz in the throat, shaped by the mouth in front of it. Here the buzz is a plain sawtooth wave and the mouth is four filters; slide the filters and \u201cah\u201d becomes \u201cee\u201d. Let them sing, then move across the stage to change the vowel and up and down to change the chord. Rest a singer to hear the others. Left alone they carry on by themselves.',
      controls: `
<div class="controls" role="group" aria-label="Choir controls">
  <div class="controls__row">
    <button class="btn" type="button" data-choir-sound>Let them sing</button>
  </div>
  <div class="controls__row" role="group" aria-label="Who is singing">
    <button class="btn" type="button" data-choir-voice="0" aria-pressed="true">Bass</button>
    <button class="btn" type="button" data-choir-voice="1" aria-pressed="true">Tenor</button>
    <button class="btn" type="button" data-choir-voice="2" aria-pressed="true">Alto</button>
    <button class="btn" type="button" data-choir-voice="3" aria-pressed="true">Soprano</button>
  </div>
</div>`,
      wall: 'In 1791 Wolfgang von Kempelen finished a machine of bellows, a reed and a leather mouth that could say whole words, and showed that speech is only air, a buzz and a shape. The measurements of which shape makes which vowel date from the 1950s. The voices here use them, which is why they sound like people and are not.'
    },
    {
      number: 24,
      slug: 'shadow',
      ready: true,
      title: 'A Shadow of a Shadow',
      line: 'Turn a four-dimensional solid by hand.',
      description: 'The six regular solids of four dimensions, generated from their symmetries, turning in a direction you do not have, and flattened twice to reach your screen. Drag to turn them yourself.',
      canvasLabel: 'A large, intricate cage of fine curved lines, amber where it is near in the fourth dimension and blue where it is far, slowly turning inside out. It is the shadow of the 120-cell, a solid with four dimensions.',
      medium: '2026. <span class="live" data-live="shadow.name">The 120-cell</span>: <span class="live" data-live="shadow.corners">600</span> corners, <span class="live" data-live="shadow.edges">1,200</span> edges, and <span class="live" data-live="shadow.sides">120 dodecahedra</span> for sides. A solid with four dimensions, flattened twice to get here.',
      text: 'A cube\u2019s shadow on a wall is a flat drawing of something with one more dimension than the wall has. This is the same trick, played twice. The solid is turning in a direction you do not have, which is why it seems to pass through itself and turn inside out; it is doing neither. Drag to turn it yourself. If it is too much, work up from the 5-cell: there are exactly six of these, and no more.',
      controls: `
<div class="controls" role="group" aria-label="A Shadow of a Shadow controls">
  <label class="dial">
    <span class="dial__label"><span>Which of the six</span><span data-shadow-solid-value></span></span>
    <input class="dial__input" type="range" min="0" max="5" step="1" value="5" data-shadow-solid>
  </label>
  <div class="controls__row" role="group" aria-label="How four dimensions are flattened to three">
    <button class="btn" type="button" data-shadow-flat="bubble" aria-pressed="true">Flattened like a map</button>
    <button class="btn" type="button" data-shadow-flat="lamp" aria-pressed="false">As a shadow</button>
  </div>
  <div class="controls__row" role="group" aria-label="Which way dragging turns it">
    <button class="btn" type="button" data-shadow-drag="fourth" aria-pressed="true">Drag turns it through the fourth</button>
    <button class="btn" type="button" data-shadow-drag="ours" aria-pressed="false">In our three</button>
  </div>
</div>`,
      wall: 'Ludwig Schl\u00e4fli found all six of these in about 1850, in Bern, without ever seeing one; the work was not printed whole until after his death. In the 1880s Alicia Boole Stott, who had no mathematical schooling at all, found them again by picturing their slices, and gave English the word polytope. Neither had a screen to turn one on.'
    },
    {
      number: 25,
      slug: 'guesses',
      ready: true,
      title: 'A Thousand Guesses',
      line: 'A room that starts as noise and clears while you wait.',
      description: 'A small gallery of glass, mirror and chalk, lit by one lamp and rendered by Monte Carlo path tracing: it starts as noise and clears while you watch, because the picture is the average of thousands of guesses.',
      canvasLabel: 'A small open-fronted room with a blue wall, a rose wall and a skylight. Three balls stand on plinths: one mirror, one glass, one chalk. The picture begins as coloured noise and becomes clear and softly lit over a few seconds.',
      medium: '2026. <span class="live" data-live="guesses.count">0</span> guesses at every pixel so far. Each is one ray of light followed backwards from your eye through up to six bounces.',
      text: 'This room is not drawn. It is estimated. For every pixel a ray is followed backwards from your eye, bouncing off whatever it meets, at random where the surface is matt, until it finds the lamp or gives up. One such guess is nearly worthless. The picture is the average of all of them so far, which is why it starts as snow and clears as you wait. Look at the blue and the rose the walls lend to the floor: nobody painted that. Drag to walk round, and it has to start again.',
      controls: `
<div class="controls" role="group" aria-label="A Thousand Guesses controls">
  <div class="controls__row" role="group" aria-label="What the middle ball is made of">
    <button class="btn" type="button" data-guesses-ball="glass" aria-pressed="true">Glass</button>
    <button class="btn" type="button" data-guesses-ball="mirror" aria-pressed="false">Mirror</button>
    <button class="btn" type="button" data-guesses-ball="gold" aria-pressed="false">Gold</button>
    <button class="btn" type="button" data-guesses-ball="chalk" aria-pressed="false">Chalk</button>
  </div>
  <label class="dial">
    <span class="dial__label"><span>The lamp</span><span data-guesses-lamp-value></span></span>
    <input class="dial__input" type="range" min="15" max="200" step="5" value="80" data-guesses-lamp>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-guesses-again>Start guessing again</button>
  </div>
</div>`,
      wall: 'This is how films are lit now, and it is mostly patience: James Kajiya set the method out in 1986 and nothing about it has needed inventing since, only faster machines. Every work in this building was worked out rather than recorded. This one lets you watch the working. Thank you for coming. The way out is also the way in.'
    },
    {
      number: 26,
      slug: 'six',
      ready: true,
      title: 'Six',
      line: 'Grow a snowflake and steer it with the weather.',
      description: 'A snow crystal grows from a single cell of ice on a hexagonal grid, by Reiter\u2019s model. Steer it with humidity and cold as it grows: it keeps a record of every change in its shape, and no two are alike.',
      canvasLabel: 'A six-pointed snow crystal growing outward from its centre on black, drawn in pale blue-white, its branches sprouting side-branches as it grows.',
      medium: '2026. <span class="live" data-live="six.ice">1</span> cells of ice after <span class="live" data-live="six.steps">0</span> steps. Humidity <span class="live" data-live="six.humidity">0.40</span>, cold <span class="live" data-live="six.cold">1.0</span>. Nothing in the rules mentions six.',
      text: 'Every cell of air holds a little water. Ice, and the air touching ice, keeps its water and gathers more; everywhere else the water spreads out evenly. That is all it takes. Whether it grows needles, ferns or plates depends only on how much water there is and how fast it arrives, and a crystal that meets changing weather as it grows writes every change into its shape. Steer it with the two dials. Left alone, the weather wanders on its own.',
      controls: `
<div class="controls" role="group" aria-label="Six controls">
  <label class="dial">
    <span class="dial__label"><span>Humidity</span><span data-six-humidity-value></span></span>
    <input class="dial__input" type="range" min="30" max="80" step="1" value="40" data-six-humidity>
  </label>
  <label class="dial">
    <span class="dial__label"><span>Cold</span><span data-six-cold-value></span></span>
    <input class="dial__input" type="range" min="2" max="60" step="1" value="10" data-six-cold>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-six-drift aria-pressed="true">Let the weather wander</button>
    <button class="btn" type="button" data-six-again>Another</button>
  </div>
</div>`,
      wall: 'Wilson Bentley photographed five thousand snow crystals in Vermont between 1885 and 1931 and found no two the same, and Ukichiro Nakaya grew them to order in a cold room in the 1930s and showed that their shape follows the weather they fall through. The model here is Clifford Reiter\u2019s, from 2005: three rules on a honeycomb, and the six comes free.'
    },
    {
      number: 27,
      slug: 'chladni',
      ready: true,
      title: 'Chladni',
      line: 'Bow a plate; the sand runs to where it is still.',
      description: 'Sand on a vibrating plate leaps off wherever the plate moves and gathers on the lines where it is still. Choose the note, hear it, and watch fourteen thousand grains find the pattern.',
      canvasLabel: 'A dark square plate covered in pale sand. As the plate sounds, the sand rearranges itself into a symmetrical figure of curved lines. An amber bow strokes one edge.',
      medium: '2026. <span class="live" data-live="chladni.grains">14,000</span> grains of sand on a plate ringing in its (<span class="live" data-live="chladni.mode">2, 3</span>) mode at <span class="live" data-live="chladni.hz">0</span> Hz. Every grain is pushed by the motion under it, nothing more.',
      text: 'A plate that is bowed does not shake all over. It shakes in a pattern, with lines that keep still, and sand thrown about everywhere else comes to rest on them. Each note has its own figure. Turn the dial to change the note, let it sound, and pour more sand where you touch. Left alone, the plate is bowed for you every few seconds.',
      controls: `
<div class="controls" role="group" aria-label="Chladni controls">
  <label class="dial">
    <span class="dial__label"><span>Which note</span><span data-chladni-mode-value></span></span>
    <input class="dial__input" type="range" min="0" max="27" step="1" value="4" data-chladni-mode>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-chladni-bow>Bow it again</button>
    <button class="btn" type="button" data-chladni-sound>Let it sound</button>
  </div>
</div>`,
      wall: 'Ernst Chladni drew a violin bow along the edge of a sanded brass plate in 1787 and the sand made figures; in 1809 he showed them to Napoleon, who put up a prize for anyone who could explain them. Sophie Germain, who could not attend the Academy because she was a woman, won it. The figures here follow her equation, near enough, for a square plate held at its middle.'
    },
    {
      number: 28,
      slug: 'fireflies',
      ready: true,
      title: 'Fireflies',
      line: 'Three thousand fireflies fall into step. Scatter them.',
      description: 'Three thousand fireflies, each with its own clock and able to see only its nearest neighbours, fall into step until the whole meadow flashes together. Tap to scatter a patch of them and watch it won back.',
      canvasLabel: 'A dark meadow of tiny specks. Amber flashes appear at random, then in patches, then in waves sweeping across the field, until the whole field flashes in unison.',
      medium: '2026. <span class="live" data-live="fireflies.count">3,000</span> fireflies, each with a clock of its own and eyes only for its nearest neighbours. In step: <span class="live" data-live="fireflies.together">0</span> out of a hundred.',
      text: 'Nobody is in charge. Each firefly has a clock that fills and flashes; when it sees a neighbour flash, it sets its own clock a little forward, the more so the nearer it was to flashing itself. Watch what that adds up to: patches, then waves, then all of them together. Tap anywhere to scatter a patch and watch the rest win it back. The dial sets how much notice they take of each other.',
      controls: `
<div class="controls" role="group" aria-label="Fireflies controls">
  <label class="dial">
    <span class="dial__label"><span>How much they take notice</span><span data-fireflies-listen-value></span></span>
    <input class="dial__input" type="range" min="0" max="40" step="1" value="9" data-fireflies-listen>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-fireflies-scatter>Scatter them all</button>
  </div>
</div>`,
      wall: 'Travellers on the rivers of Thailand and Malaysia have written for centuries of whole trees of fireflies flashing as one, and were not believed. In 1990 Renato Mirollo and Steven Strogatz proved that clocks which nudge each other this way must always end up in step, however they start. The same arithmetic keeps the cells of your heart beating together.'
    },
    {
      number: 29,
      slug: 'weathering',
      ready: true,
      title: 'Weathering',
      line: 'Make it rain on a mountain range and watch the valleys come.',
      description: 'Rain falls on a mountain range made of random heights. Each drop runs downhill, picking up soil where it is fast and dropping it where it slows, and hundreds of thousands of drops later there are valleys, streams and silt fans that nobody drew.',
      canvasLabel: 'A survey map of a mountain range in pale bone tones, lit from the north-west and marked with contour lines. Thin blue threads of water run down its slopes and slowly carve branching valleys into it.',
      medium: '2026. <span class="live" data-live="weathering.cells">0</span> cells of ground and <span class="live" data-live="weathering.drops">0</span> drops of rain so far, each of which knows only how to run downhill and carry what it can.',
      text: 'The mountains were made at random. Everything else was done by rain. A drop lands, runs downhill with a little momentum, takes soil where it is fast and leaves it where it slows, and dries up. Watch the streams find each other, the valleys deepen, and the silt fan out where the water reaches the plain. Press anywhere to make it rain there, and see what a river does to a hillside.',
      controls: `
<div class="controls" role="group" aria-label="Weathering controls">
  <label class="dial">
    <span class="dial__label"><span>How hard it rains</span><span data-weathering-rain-value></span></span>
    <input class="dial__input" type="range" min="0" max="14" step="1" value="5" data-weathering-rain>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-weathering-everywhere aria-pressed="true">Rain everywhere</button>
    <button class="btn" type="button" data-weathering-again>New mountains</button>
  </div>
</div>`,
      wall: 'James Hutton looked at the layers in a Scottish cliff in 1788 and understood that the land is made and unmade by ordinary rain, given time, and that there was therefore a great deal more time than anyone had supposed. What takes ten million years out of doors takes a minute here, but it is the same arithmetic, one drop after another.'
    },
    {
      number: 30,
      slug: 'soap',
      ready: true,
      title: 'Soap',
      line: 'Blow on a soap film and watch it drain through every colour to black.',
      description: 'A soap film in a wire ring, coloured by thin-film interference worked out wavelength by wavelength from its thickness. It drains, swirls, goes black at the top and pops. Blow on it.',
      canvasLabel: 'A circle of shimmering colour inside a thin wire ring: bands of gold, magenta, blue and green swirl slowly downward, thinning to silver and then to black at the top, until the film bursts and a new one takes its place.',
      medium: '2026. A film about <span class="live" data-live="soap.mean">700</span> millionths of a millimetre thick, <span class="live" data-live="soap.age">0</span> seconds old, the <span class="live" data-live="soap.films">1</span>st in this ring. Every pixel\u2019s colour is the interference of twenty-four wavelengths in that thickness.',
      text: 'The colours are not paint. Light from the back of the film has travelled a little further than light from the front, and for each colour that extra distance either helps or hinders; which it does depends on how thick the film is just there. Thick liquid sinks and thin liquid rises, so the film drains and swirls, and the top goes black just before it pops, as a real one does. Move over it to stir it, press to blow.',
      controls: `
<div class="controls" role="group" aria-label="Soap controls">
  <label class="dial">
    <span class="dial__label"><span>How fast it drains</span><span data-soap-drain-value></span></span>
    <input class="dial__input" type="range" min="3" max="25" step="1" value="10" data-soap-drain>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-soap-pop>Pop it</button>
    <button class="btn" type="button" data-soap-new>Blow a new one</button>
  </div>
</div>`,
      wall: 'Robert Hooke and Isaac Newton both puzzled over the colours of soap bubbles in the 1660s and 1670s, and Newton measured the thickness of a film from its colour, which is very nearly what this room does in reverse. The black at the top, where the film is thinner than any wavelength of light, is what an experienced bubble-blower watches for: it means a few seconds are left.'
    },
    {
      number: 31,
      slug: 'knotwork',
      ready: true,
      title: 'Knotwork',
      line: 'Touch a tile of an endless knot and watch it re-tie itself around your finger.',
      description: 'An endless Celtic knot woven live by constraint propagation over sixteen strand tiles. Tap a tile to fix it, run a finger along the weave to untie it, and watch the strands around it resolve again.',
      canvasLabel: 'A band of interlaced pale strands, each a ribbon of two hairlines, crawling slowly leftward. Newly settled tiles glow amber and cool to bone. At the right, the squares that have not yet decided show every strand they might still become as faint grey ghosts.',
      medium: '2026. Constraint propagation over sixteen tiles, with no plan and no pattern. <span class="live" data-live="knotwork.tiles">0</span> tiles standing, <span class="live" data-live="knotwork.loops">0</span> of them tied into closed loops, crossing <span class="live" data-live="knotwork.crossings">0</span> times; unpicked <span class="live" data-live="knotwork.unpicked">0</span> times so far when it wove itself into a corner.',
      text: 'A Celtic knot has one law: over, under, over, under, along every strand, however far it wanders. Nobody drew this one. Each square of the cloth begins able to be any of sixteen tiles, a blank, a straight, a bend, or a crossing with one strand or the other on top, and whichever square has the fewest choices left is settled by lot. Then the news travels: its neighbours lose the choices that no longer fit, and theirs do, until nothing more follows. The law is not enforced from above. It hides in the tiles. The regions between the strands are shaded like a chessboard, and at every crossing the strand on top is the one with a shaded region on its left; keep that one habit at every seam and the whole cloth alternates, in every loop, without anyone counting. Tap a tile to make it something else. Draw a finger along the weave and it unties behind you, and ties itself again.',
      controls: `
<div class="controls" role="group" aria-label="Knotwork controls">
  <label class="dial">
    <span class="dial__label"><span>How often it crosses itself</span><span data-knotwork-cross-value></span></span>
    <input class="dial__input" type="range" min="0" max="40" step="1" value="24" data-knotwork-cross>
  </label>
  <label class="dial">
    <span class="dial__label"><span>How open the weave is</span><span data-knotwork-open-value></span></span>
    <input class="dial__input" type="range" min="0" max="40" step="1" value="6" data-knotwork-open>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-knotwork-again>Weave it again</button>
  </div>
</div>`,
      wall: 'The scribes of the Book of Kells, around the year 800, laid out their knotwork on a grid of dots and let the strands find their own way between them, which is why the great carpet pages look designed by no one. The method here, in which a grid of possibilities is narrowed until only one picture remains, was written down by Maxim Gumin in 2016 for making game maps, and named, as a joke, after quantum mechanics.'
    },
    {
      number: 32,
      slug: 'tonight',
      ready: true,
      title: 'Tonight',
      line: 'Where the planets are at this moment, from six numbers each, and which of them you can see tonight.',
      description: 'The solar system computed for the moment you open the page, from the mean orbital elements each planet has kept since 1800, with the evening and morning planets picked out. Scrub three centuries either way.',
      canvasLabel: 'Eight faint elliptical orbits around a small amber sun, the planets on them as pale dots with their names, Earth in blue. Thin lines run from Earth to each planet: amber for the evening sky, blue for the morning, pale for those up all night, dotted for those lost in the glare.',
      medium: '2026. The planets for <span class="live" data-live="tonight.date">tonight</span>, from Standish\u2019s mean elements. In the evening sky: <span class="live" data-live="tonight.evening">none</span>. Before dawn: <span class="live" data-live="tonight.morning">none</span>. Up all night: <span class="live" data-live="tonight.night">none</span>. Lost in the Sun\u2019s glare: <span class="live" data-live="tonight.glare">none</span>.',
      text: 'This is not a picture of the solar system. It is the solar system, tonight, as near as six numbers a planet can put it: the size and shape of each orbit, its tilt, where it is pointed, and how far along it the planet has got, each drifting by a known amount per century. From those, Kepler\u2019s equation gives every position, and looking out from Earth sorts the planets into the ones that follow the Sun down after dusk, the ones that rise ahead of it before dawn, and the ones opposite it that are up all night. Turn the dial and the same arithmetic gives any night for three centuries either way, though the numbers were fitted to 1800 to 2050 and grow loose beyond it. The distances are squeezed so the inner planets can be seen; press for true distances and watch them vanish into the glare of the Sun.',
      controls: `
<div class="controls" role="group" aria-label="Tonight controls">
  <label class="dial">
    <span class="dial__label"><span>When</span><span data-tonight-when-value></span></span>
    <input class="dial__input" type="range" min="-300" max="300" step="1" value="0" data-tonight-when>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-tonight-run aria-pressed="false">Let it run</button>
    <button class="btn" type="button" data-tonight-now>Tonight</button>
    <button class="btn" type="button" data-tonight-scale aria-pressed="false">True distances</button>
  </div>
</div>`,
      wall: 'Johannes Kepler found in 1609 that the planets move on ellipses with the Sun at one focus, and in 1619 that the square of a planet\u2019s year is the cube of its distance, which is why six numbers are enough. The particular six used here are the mean elements published by E. Myles Standish of the Jet Propulsion Laboratory in 1992, fitted to the ephemeris the space probes are steered by. On 21 December 2020 they put Jupiter and Saturn a tenth of a degree apart, as the sky did.'
    },
    {
      number: 33,
      slug: 'selection',
      ready: true,
      title: 'Selection',
      line: 'Breed a creature from nine numbers, one chosen child at a time, and see where your taste takes it.',
      description: 'Dawkins’s biomorphs: a creature drawn from nine genes, its eight children each one gene different, and the visitor as the only selection pressure. Choose a child and it becomes the parent of the next generation.',
      canvasLabel: 'A three-by-three litter of branching line creatures drawn in thin strokes. The parent, in amber, sits in the middle; its eight children, in bone, grow outward from their roots around it, each a little different from the parent.',
      medium: '2026. Nine genes, drawn by a tree that forks at every step. Generation <span class="live" data-live="selection.generation">0</span>; the parent’s genes are <span class="live" data-live="selection.genes">0 0 0 0 0 0 0 0 4</span>, which make a creature of <span class="live" data-live="selection.segments">15</span> strokes.',
      text: 'Nine small whole numbers make a creature. Eight of them say which way a branch may grow, the ninth how many times it forks, and a tree drawn by those rules is the creature’s body. Around the parent in the middle are its eight children, each with one gene nudged a notch. Nothing here judges them. You do: tap the child you like and it becomes the parent of eight more, and after twenty or thirty generations of that, something you never asked for is looking back at you. Richard Dawkins wrote this in 1986 expecting trees, and got insects, bats, spiders and a lamp. Leave it to breed itself and the only pressure is size, which is what a garden does.',
      controls: `
<div class="controls" role="group" aria-label="Selection controls">
  <label class="dial">
    <span class="dial__label"><span>How far a child may differ</span><span data-selection-nudge-value></span></span>
    <input class="dial__input" type="range" min="1" max="4" step="1" value="1" data-selection-nudge>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-selection-auto aria-pressed="false">Let it breed itself</button>
    <button class="btn" type="button" data-selection-back>A generation back</button>
    <button class="btn" type="button" data-selection-again>Start again</button>
  </div>
</div>`,
      wall: 'Richard Dawkins wrote the biomorph program for The Blind Watchmaker in 1986 to show that cumulative selection, one small step at a time, can reach forms that no single lucky step could, and that no plan was needed. He reported losing an insect he had bred and searching the space of genes for weeks to find it again. The encoding of the nine genes here is his: eight direction vectors and a depth.'
    },
    {
      number: 34,
      slug: 'lightning',
      ready: true,
      title: 'Lightning',
      line: 'A bolt that feels its way down through the field ahead of it, one step at a time, and strikes.',
      description: 'Lightning by the dielectric breakdown model: the electric field between cloud and ground is solved live, and the leader grows one cell at a time toward the strongest field ahead. Tap to raise a lightning rod.',
      canvasLabel: 'A tall dark sky with faint grey contour lines of the electric field bending around a branched, pale blue leader that creeps down from the top. When it reaches the ground line at the bottom the connecting channel flares white and the whole sky brightens for a moment before a new bolt begins.',
      medium: '2026. A discharge choosing each step by the potential ahead of it, raised to the power <span class="live" data-live="lightning.eta">2.5</span>, over a field re-solved as it grows. Bolt <span class="live" data-live="lightning.strikes">0</span>; this one has taken <span class="live" data-live="lightning.steps">0</span> steps and forked <span class="live" data-live="lightning.branches">0</span> times.',
      text: 'Between the cloud at the top and the ground at the bottom lies an electric field, worked out here by the oldest method there is: every cell is the average of its neighbours, swept over and over until it settles. The bolt is a set of cells at the cloud’s potential, and at each step one of the cells touching it is added, chosen by lot with the odds set by the field there raised to a power. A low power gives a fluffy bush that fills the sky; a high one a nearly straight strike; three or so gives lightning, forked and hesitant, feeling for the ground. When it arrives, the channel that connects cloud and ground lights, and the rest is left as the dim branches a photograph shows. Tap the sky to raise a lightning rod, and watch the field bend toward it.',
      controls: `
<div class="controls" role="group" aria-label="Lightning controls">
  <label class="dial">
    <span class="dial__label"><span>How choosy each step is</span><span data-lightning-eta-value></span></span>
    <input class="dial__input" type="range" min="10" max="50" step="1" value="25" data-lightning-eta>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-lightning-strike>Another bolt</button>
    <button class="btn" type="button" data-lightning-field aria-pressed="true">Show the field</button>
  </div>
</div>`,
      wall: 'Niemeyer, Pietronero and Wiesmann published the dielectric breakdown model in 1984, after photographing discharges spreading across glass plates. Their single parameter, the power the field is raised to, sets the shape of the whole: at one, the discharge fills space like frost; at four or five, it is a single stroke. Real lightning, measured from photographs, behaves as though the power were about three. The field solver here is Gauss–Seidel relaxation, sped up a little by over-correcting, the method David Young worked out in 1950.'
    },
    {
      number: 35,
      slug: 'docent',
      ready: true,
      scripts: ['corpus.js'],
      title: 'Docent',
      line: 'The building reads every label in it, then writes one for a room that does not exist.',
      description: 'A Markov chain trained in the page on every wall text in the exhibition writes and typesets a new label, with an invented title and glyph, for a room that does not exist. It confesses how much it copied.',
      canvasLabel: 'A wall label being typed out, letter by letter, in the exhibition’s own style: a small invented glyph, a room number, an invented title in italic serif, a grey medium line, a paragraph of plausible nonsense and an italic note beneath. An amber caret marks the pen.',
      medium: '2026. A chain of <span class="live" data-live="docent.words">6,000</span> words, learned when this page opened from the thirty-five labels in this building, writing its <span class="live" data-live="docent.written">1</span>st label. The longest run in it copied from any real label is <span class="live" data-live="docent.copied">fewer than four</span> words.',
      text: 'Every other room in this building has a label that someone wrote. This one writes its own. When the page opens it reads the other thirty-four, the hall’s and the rooms’, and learns the oldest kind of language model there is: a chain that knows, for every pair of words, which word has followed them. That is all it knows. Then it writes a label for a room that is not here, invents a title by the same trick applied to letters, and a glyph, and sets the lot in the house style as it goes. It is a fair imitation of a docent and no imitation of a mind, and it says on the label how much it has copied. Turn the dial and it strays further from what it read.',
      controls: `
<div class="controls" role="group" aria-label="Docent controls">
  <label class="dial">
    <span class="dial__label"><span>How far it strays from what it read</span><span data-docent-stray-value></span></span>
    <input class="dial__input" type="range" min="0" max="60" step="1" value="20" data-docent-stray>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-docent-another>Another room</button>
    <button class="btn" type="button" data-docent-speak aria-pressed="false">Let it speak</button>
  </div>
</div>`,
      wall: 'Andrei Markov introduced his chains in 1913 by counting the vowels and consonants in the first twenty thousand letters of Pushkin’s Eugene Onegin, and Claude Shannon in 1948 used the same idea to generate English-shaped nonsense from letter and word frequencies, one order at a time. The chain here is of the second order, over words. Everything it says it has heard in this building, which is the confession of every docent.'
    },
    {
      number: 36,
      slug: 'undercroft',
      ready: true,
      scripts: ['game/pixels.js', 'game/classes.js', 'game/weapons.js', 'game/world.js', 'game/explore.js', 'game/actors.js', 'game/relics.js', 'game/guardians.js', 'game/boss-golem.js', 'game/boss-wyrm.js', 'game/boss-herald.js', 'game/boss-lightless.js', 'game/sound.js'],
      stageAttributes: 'tabindex="0"',
      title: 'Undercroft',
      line: 'Go down. The floors draw themselves, four guardians wait at the foot of them, and nothing you carry comes back up except what you learned.',
      description: 'A rogue-like platformer, the last room: three floors and a vault that draw themselves from a seed, ten creatures, eleven weapons and twenty-eight items in four rarities, three guardians with halls of their own and a last one after them. Pixel art compiled from text, sound synthesised, nothing loaded.',
      canvasLabel: 'A dark vaulted undercroft in crisp pixels, lit by the Warden’s amber lantern: a small hooded figure in an ultramarine cloak and rose scarf running, jumping and fighting along stone floors and ledges.',
      medium: '2026. A game engine of sixteen-pixel tiles and a sixtieth-of-a-second step, sprites compiled from text when the page opened, floors stitched from a seeded grammar. Floor <span class="live" data-live="undercroft.floor">0</span>, seed <span class="live" data-live="undercroft.seed">36</span>, <span class="live" data-live="undercroft.cost">0</span> milliseconds a frame.',
      text: 'Every other room shows you something. This one is a game, and it is the sum of the others: the seeded chance of the marbling and the snow, the steady step of the pendulums and the sand, the light of the lantern room, the rules that make a knot or a bolt of lightning. Go down. Each floor is drawn from a seed as you arrive, so no two descents are the same, and each stretch belongs to an element that changes what the ground does to you and what you can do back. Creatures wind up before they strike and only the blow itself can hurt you, so everything can be read. There are eleven weapons, each with its own strokes and its own ending, and items in four rarities: blue, then a purple aura for the epic, red for the master’s, gold for the legendary, which arrive with some ceremony. At the foot of each floor a guardian waits in a hall built for it: a walking furnace, a serpent that swims in the ice, a conductor of lightning. Under them, in the Vault, is the last, which begins as you. A fountain stands before every guardian’s door, and the lantern carries three flames: a death costs one and you rise at the head of the floor. Arrows or WASD move, X or K jumps, Z or J attacks, C or L dashes, V or I casts, Up takes what lies at your feet; press the stage first so it hears you.',
      controls: `
<div class="controls" role="group" aria-label="Undercroft controls">
  <label class="dial">
    <span class="dial__label"><span>Seed</span><span data-undercroft-seed-note></span></span>
    <input class="dial__text" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="leave empty for today’s" data-undercroft-seed>
  </label>
  <div class="controls__row">
    <button class="btn" type="button" data-undercroft-start>Go down</button>
    <button class="btn" type="button" data-undercroft-daily>Today’s seed</button>
    <button class="btn" type="button" data-undercroft-sound aria-pressed="false">Let it sound</button>
    <button class="btn" type="button" data-undercroft-full>Full screen</button>
  </div>
</div>`,
      wall: 'Rogue was written by Michael Toy and Glenn Wichman in 1980 for a Unix machine that drew its dungeon in letters, a new one each time, and threw away the game when you died, which is the lineage of everything here. The platformer half is older than the arcade: Donkey Kong in 1981 was the first to be called one. The undercroft borrows its seeded rooms from the first, its coyote time and jump buffer from the second, and its lantern from room 28.'
    }
  ]
};
