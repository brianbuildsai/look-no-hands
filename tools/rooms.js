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
    }
  ]
};
