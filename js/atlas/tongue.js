/* tongue.js — one invented language per world.

   Names that sound as if they belong together do so because they share a
   phonology: a small set of allowed consonants and vowels, rules for how a
   syllable may start and end, and a few habitual endings. Each world draws
   its own set from its seed, then coins every name from that set only, so
   one planet is all soft vowels and another is all hard stops.

   No DOM in here: loaded by the page and tested in Node. */
(function (root) {
  'use strict';

  var world = root.Atlas && root.Atlas.world ? root.Atlas.world
    : (typeof require === 'function' ? require('./world.js') : null);

  // Sounds a language may choose from, with how common each tends to be.
  var CONSONANTS = [
    ['n', 9], ['r', 9], ['l', 8], ['s', 8], ['t', 8], ['m', 7], ['k', 7], ['d', 6], ['v', 5], ['h', 5],
    ['b', 4], ['g', 4], ['p', 4], ['th', 4], ['sh', 4], ['f', 3], ['z', 3], ['y', 3], ['w', 2], ['ch', 2], ['q', 1]
  ];
  var VOWELS = [['a', 10], ['e', 8], ['i', 7], ['o', 7], ['u', 5]];
  var LONG_VOWELS = ['ae', 'ai', 'ei', 'ia', 'io', 'oa', 'ou', 'ua', 'ea'];
  var MARKED_VOWELS = ['á', 'é', 'í', 'ó', 'ú', 'ä', 'ë', 'ö', 'ü', 'â', 'ê', 'ô'];
  var CLUSTERS = ['br', 'dr', 'tr', 'kr', 'gr', 'st', 'sk', 'sl', 'vl', 'thr', 'kl', 'pl', 'fl', 'sn', 'vr'];
  var CODAS = ['n', 'r', 'l', 's', 'm', 'th', 'k', 'sh', 't', 'd', 'x', 'nd', 'rn', 'st'];

  // Syllables that would spell something unfortunate in English are refused.
  var REFUSED = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'rape', 'piss', 'dick', 'cock', 'tits', 'anal', 'anus',
    'slut', 'whor', 'nazi', 'kill', 'dead', 'poo', 'ass', 'cum', 'sex', 'jew', 'gook', 'spic', 'kike', 'turd', 'puss'];

  function create(seedText) {
    var rand = world.fork(seedText, 'tongue');

    function chance(p) { return rand() < p; }
    function pick(list) { return list[Math.floor(rand() * list.length)]; }

    // choose `count` different items, favouring the heavier ones
    function draw(weighted, count) {
      var pool = weighted.slice(), chosen = [];
      while (chosen.length < count && pool.length) {
        var total = pool.reduce(function (sum, item) { return sum + item[1]; }, 0);
        var roll = rand() * total, i = 0;
        while (roll > pool[i][1]) { roll -= pool[i][1]; i++; }
        chosen.push(pool.splice(i, 1)[0]);
      }
      return chosen;
    }
    function weightedPick(weighted) {
      var total = 0, i;
      for (i = 0; i < weighted.length; i++) total += weighted[i][1];
      var roll = rand() * total;
      for (i = 0; i < weighted.length; i++) { roll -= weighted[i][1]; if (roll <= 0) return weighted[i][0]; }
      return weighted[weighted.length - 1][0];
    }

    /* ---- this world's phonology ---- */

    var consonants = draw(CONSONANTS, 7 + Math.floor(rand() * 5));
    var vowels = draw(VOWELS, 3 + Math.floor(rand() * 3));
    var extra = Math.floor(rand() * 3);
    for (var e = 0; e < extra; e++) vowels.push([pick(LONG_VOWELS), 2]);
    if (chance(0.45)) vowels.push([pick(MARKED_VOWELS), 3]);
    var clusters = chance(0.55) ? [pick(CLUSTERS), pick(CLUSTERS), pick(CLUSTERS)] : [];
    var codas = [pick(CODAS), pick(CODAS), pick(CODAS), pick(CODAS)];
    var codaRate = 0.12 + rand() * 0.4;          // how often a syllable is closed
    var openEndings = chance(0.5);               // does this language like to end on a vowel?
    var longWords = rand();                      // taste for three-syllable names

    function syllable(first, last) {
      var s = '';
      if (!(first && chance(0.22))) {
        s += clusters.length && chance(0.16) ? pick(clusters) : weightedPick(consonants);
      }
      s += weightedPick(vowels);
      var closeIt = last ? chance(openEndings ? 0.2 : 0.75) : chance(codaRate);
      if (closeIt) s += pick(codas);
      return s;
    }

    function acceptable(word) {
      if (word.length < 3 || word.length > 10) return false;
      if (/(.)\1\1/.test(word)) return false;                       // no tripled letters
      if (/[aeiouáéíóúäëöüâêô]{3}/.test(word)) return false;         // no vowel pile-ups
      if (/[^aeiouáéíóúäëöüâêô]{4}/.test(word)) return false;        // nor consonant ones
      if (/^(.{1,2})\1+$/.test(word)) return false;                  // not "lala" or "momo"
      var plain = word.replace(/[áâä]/g, 'a').replace(/[éêë]/g, 'e').replace(/í/g, 'i').replace(/[óôö]/g, 'o').replace(/[úü]/g, 'u');
      for (var i = 0; i < REFUSED.length; i++) if (plain.indexOf(REFUSED[i]) >= 0) return false;
      return true;
    }

    function bare(syllables) {
      for (var tries = 0; tries < 40; tries++) {
        var word = '';
        for (var i = 0; i < syllables; i++) word += syllable(i === 0, i === syllables - 1);
        if (acceptable(word)) return word;
      }
      return 'alun';        // never reached in testing; a last resort that is at least a name
    }

    function capital(word) { return word.charAt(0).toUpperCase() + word.slice(1); }

    /* ---- habits of naming ---- */

    var townEndings = [bare(1), bare(1), bare(1)].map(function (s) { return s.slice(-3); });
    var portWord = capital(bare(1));              // the word this language puts before harbours
    var used = {};

    // A name nobody else on this world has, and not confusable at a glance.
    function unique(make) {
      var name = '';
      for (var tries = 0; tries < 60; tries++) {
        name = make();
        var key = name.toLowerCase().replace(/[^a-záéíóúäëöüâêô]/g, '').slice(0, 4);
        var sound = name.toLowerCase().split(' ').every(acceptable);
        if (sound && !used[key]) { used[key] = true; return name; }
      }
      return name;
    }

    function root() {
      return bare(rand() < 0.35 + longWords * 0.35 ? 3 : 2);
    }

    return {
      world: function () {
        return unique(function () {
          var name = root();
          // worlds read best ending softly
          if (!/[aeiounrs]$/.test(name)) name += weightedPick(vowels).charAt(0);
          return capital(name);
        });
      },
      town: function (isPort) {
        return unique(function () {
          if (isPort && chance(0.22)) return portWord + ' ' + capital(bare(2));
          if (chance(0.4)) return capital(bare(chance(0.7) ? 1 : 2) + pick(townEndings));
          return capital(root());
        });
      },
      place: function () { return unique(function () { return capital(root()); }); },
      portWord: portWord
    };
  }

  var api = { create: create };
  root.Atlas = root.Atlas || {};
  root.Atlas.tongue = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
