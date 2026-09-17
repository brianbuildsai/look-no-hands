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
    }
  ]
};
