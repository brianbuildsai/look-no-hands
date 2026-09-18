/* relics.js: the Warden's powers, and the relics that bend the rules.

   One power at a time, chosen at the start and swapped at altars: a cone
   of flame, a piercing spear of frost, a bolt that leaps between creatures,
   a ring of thorns that heals. Eighteen relics, passives with a leaning
   toward one element or none, offered three at a time after a guardian and
   one at a time in the alcoves. A relic changes numbers in a bag of
   modifiers that the engine reads: how far a dash goes, how fast a combo
   comes round, how long frost holds, whether there is a second jump.
   Several are named for other rooms in this building. */
(function () {
  'use strict';

  var POWERS = {
    emberwave:  { name: 'Emberwave',  element: 'ember', colour: '#ff8c42', cost: 1, line: 'A cone of flame that burns' },
    frostlance: { name: 'Frostlance', element: 'frost', colour: '#9fd8ff', cost: 1, line: 'A spear of ice that pierces and freezes' },
    stormchain: { name: 'Stormchain', element: 'storm', colour: '#8fa3ff', cost: 1, line: 'A bolt that leaps to three more' },
    bloomburst: { name: 'Bloomburst', element: 'bloom', colour: '#9ae66e', cost: 1, line: 'A ring of thorns that heals you' }
  };
  var POWER_ORDER = ['emberwave', 'frostlance', 'stormchain', 'bloomburst'];

  // the bag of modifiers the engine reads; a fresh one for every run
  function baseMods() {
    return {
      maxHp: 0, maxEnergy: 0, damage: 0, comboSpeed: 1, dashLength: 1, dashCooldown: 1, doubleJump: false, secondWind: 0,
      lantern: 1, hitsPerEnergy: 4, burnSpread: false, burnDamage: 1, freezeTime: 1, frozenBonus: 0, chainMore: 0, shockTime: 1,
      thorns: 0, shield: 0, freeCast: 0, knockback: 1, hitstop: 1, slowOnHit: 0, map: false, glowFar: false, lifeOnKill: 0, speed: 1
    };
  }

  var RELICS = [
    { id: 'kindling', name: 'Kindling', element: 'ember', line: 'Burning spreads to what stands near, and burns twice as hard', apply: function (m) { m.burnSpread = true; m.burnDamage = 2; } },
    { id: 'glassheart', name: 'Glass Heart', element: null, line: 'Two more hearts; the dash comes back half as fast', apply: function (m) { m.maxHp += 2; m.dashCooldown *= 2; } },
    { id: 'longstride', name: 'Longstride', element: null, line: 'The dash carries half again as far', apply: function (m) { m.dashLength *= 1.6; } },
    { id: 'secondwind', name: 'Second Wind', element: null, line: 'Once, when you would die, you stand up with three hearts', apply: function (m) { m.secondWind += 1; } },
    { id: 'hourglass', name: 'Hourglass Shard', element: null, line: 'Every hit you land slows the creature for a breath', apply: function (m) { m.slowOnHit = 45; } },
    { id: 'tuningfork', name: 'Tuning Fork', element: null, line: 'The sword comes round a third faster', apply: function (m) { m.comboSpeed *= 0.7; } },
    { id: 'aeolian', name: 'Aeolian Boots', element: null, line: 'A second jump, from the air', apply: function (m) { m.doubleJump = true; } },
    { id: 'reiter', name: "Reiter's Crystal", element: 'frost', line: 'Frost holds twice as long, and frozen things take two more', apply: function (m) { m.freezeTime *= 2; m.frozenBonus += 2; } },
    { id: 'almanac', name: "Standish's Almanac", element: null, line: 'The whole floor is drawn small at the top of your sight', apply: function (m) { m.map = true; } },
    { id: 'fireflies', name: "Fireflies' Lantern", element: null, line: 'The lantern reaches further, and every creature glows from afar', apply: function (m) { m.lantern *= 1.4; m.glowFar = true; } },
    { id: 'edge', name: 'Sharpened Edge', element: null, line: 'One more on every stroke of the sword', apply: function (m) { m.damage += 1; } },
    { id: 'thornmantle', name: 'Thorn Mantle', element: 'bloom', line: 'Whatever touches you is cut for two', apply: function (m) { m.thorns += 2; } },
    { id: 'baton', name: "Conductor's Baton", element: 'storm', line: 'Stormchain leaps to two more, and the shock lasts longer', apply: function (m) { m.chainMore += 2; m.shockTime *= 2; } },
    { id: 'deepbreath', name: 'Deep Breath', element: null, line: 'Energy returns on every second hit instead of every fourth', apply: function (m) { m.hitsPerEnergy = 2; } },
    { id: 'luckycoin', name: 'Lucky Coin', element: null, line: 'One more point of energy to spend', apply: function (m) { m.maxEnergy += 1; } },
    { id: 'soapbubble', name: 'Soap Bubble', element: null, line: 'A film that takes one hit for you, and grows back in twenty seconds', apply: function (m) { m.shield = 1200; } },
    { id: 'voidkey', name: 'Void Key', element: 'void', line: 'Every third cast costs nothing', apply: function (m) { m.freeCast = 3; } },
    { id: 'harpstring', name: 'Harp String', element: null, line: 'Every blow lands harder: further knockback, a longer stop', apply: function (m) { m.knockback *= 1.8; m.hitstop *= 1.8; } }
  ];
  var BY_ID = {};
  RELICS.forEach(function (r) { BY_ID[r.id] = r; });

  // three relics to choose from: not yet held, leaning toward the floor's element and the power's
  function offer(held, elementName, powerElement, rnd, count) {
    var pool = RELICS.filter(function (r) { return held.indexOf(r.id) < 0; });
    var weighted = [];
    pool.forEach(function (r) { var w = 1; if (r.element === elementName) w = 2.2; if (r.element === powerElement) w += 1.5; if (r.element && r.element !== elementName && r.element !== powerElement) w = 0.45; weighted.push({ r: r, w: w }); });
    var out = [];
    while (out.length < (count || 3) && weighted.length) {
      var total = 0, k;
      for (k = 0; k < weighted.length; k++) total += weighted[k].w;
      var pick = rnd() * total, chosen = weighted.length - 1;
      for (k = 0; k < weighted.length; k++) { pick -= weighted[k].w; if (pick <= 0) { chosen = k; break; } }
      out.push(weighted[chosen].r);
      weighted.splice(chosen, 1);
    }
    return out;
  }

  function mods(held) {
    var m = baseMods();
    held.forEach(function (id) { if (BY_ID[id]) BY_ID[id].apply(m); });
    return m;
  }

  window.Relics = { POWERS: POWERS, POWER_ORDER: POWER_ORDER, RELICS: RELICS, BY_ID: BY_ID, offer: offer, mods: mods, baseMods: baseMods };
})();
