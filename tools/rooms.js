/* rooms.js — every word that appears on a room page, in one place.

   `hall` lists the five rooms that live in index.html, for the floor plan.
   `rooms` lists the pages stamped by make-rooms.js. A room appears on the
   site (its page, the floor plan, its neighbours' links) only once `ready`
   is true.

   In `medium`, <span class="live" data-live="slug.key"> marks a figure the
   work keeps up to date while it runs. */
'use strict';

module.exports = {
  planIntro: 'The hall is five rooms. There are {count} more through here, one work in each, and none of them is a picture either.',

  hall: [
    { number: 1, id: 'quicksilver', title: 'Quicksilver' },
    { number: 2, id: 'murmuration', title: 'Murmuration' },
    { number: 3, id: 'mind', title: 'Study for a Mind' },
    { number: 4, id: 'garden', title: "Turing's Garden" },
    { number: 5, id: 'harp', title: 'Aeolian Harp' }
  ],

  rooms: [
  ]
};
