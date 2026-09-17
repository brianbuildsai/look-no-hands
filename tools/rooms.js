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
      medium: '2026. <span class="live" data-live="horizon.rays">0</span> paths of light, each bent step by step through curved space, <span class="live" data-live="horizon.fps">0</span> frames a second.',
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
    }
  ]
};
