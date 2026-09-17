/* sheet.js — the page around the globe.

   Takes the word, has the world surveyed a slice at a time, hands it to the
   globe, and fills in everything printed around it: the title block, the
   labels that ride on the sphere, the gazetteer, the key and the almanac. */
(function () {
  'use strict';

  var DEFAULT_WORD = 'nowhere';
  var SLICE_MS = 14;              // how long the survey may hold the page at a time

  var world = null;
  var globe = null;
  var surveyTimer = 0;

  var el = {
    globe: document.querySelector('[data-globe]'),
    progress: document.querySelector('[data-progress]'),
    name: document.querySelector('[data-world="name"]'),
    word: document.querySelector('[data-world="word"]')
  };

  /* ---- drawing a world ---- */

  function draw(word) {
    clearTimeout(surveyTimer);
    world = Atlas.world.create(word);
    el.word.textContent = world.word || 'nothing at all';
    el.name.textContent = world.word || 'Nowhere';
    globe.setWorld(world);
    survey();
  }

  // Survey a slice, show how far it has got, and come back for more.
  function survey() {
    var done = world.step(SLICE_MS);
    globe.invalidate();
    if (done < 1) {
      el.progress.textContent = 'Drawing this world, ' + Math.floor(done * 100) + '%';
      surveyTimer = setTimeout(survey, 0);
      return;
    }
    el.progress.textContent = '';
  }

  /* ---- boot ---- */

  globe = Atlas.globe.create(el.globe, {});
  draw(DEFAULT_WORD);

  // for testing from the console
  Atlas.sheet = {
    draw: draw,
    globe: function () { return globe; },
    world: function () { return world; }
  };
})();
