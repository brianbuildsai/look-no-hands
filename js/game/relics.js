/* relics.js: the Warden's powers, and the items that bend the rules.

   One power at a time, chosen at the start and swapped at altars: a cone
   of flame, a piercing spear of frost, a bolt that leaps between creatures,
   a ring of thorns that heals. Twenty-eight items in four rarities (rare,
   epic, master, legendary), found in chests and alcoves, dropped by elders
   and offered by bosses. Most change numbers in a bag of modifiers the
   engine reads; ten of them give the Warden something new to do (a wall to
   hold, a cape to glide on, a blow to turn), and the four legendaries have
   ceremonies and effects of their own. Several are named for other rooms
   in this building. */
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
      maxHp: 0, maxEnergy: 0, damage: 0, comboSpeed: 1, dashLength: 1, dashCooldown: 1, airJumps: 1, secondWind: 0,
      lantern: 1, hitsPerEnergy: 4, burnSpread: false, burnDamage: 1, freezeTime: 1, frozenBonus: 0, chainMore: 0, shockTime: 1,
      thorns: 0, shield: 0, freeCast: 0, knockback: 1, hitstop: 1, slowOnHit: 0, map: false, glowFar: false, lifeOnKill: 0, speed: 1,
      wallgrip: false, glider: false, pound: false, ghost: false, parry: false, magnet: false, phoenix: 0, bell: false, snowflake: false, sandglass: false
    };
  }

  var RELICS = [
    { id: 'kindling', rarity: 'epic', name: 'Kindling', element: 'ember', line: 'Burning spreads to what stands near, and burns twice as hard', apply: function (m) { m.burnSpread = true; m.burnDamage = 2; } },
    { id: 'glassheart', rarity: 'rare', name: 'Glass Heart', element: null, line: 'Two more hearts; the dash comes back half as fast', apply: function (m) { m.maxHp += 2; m.dashCooldown *= 2; } },
    { id: 'longstride', rarity: 'rare', name: 'Longstride', element: null, line: 'The dash carries half again as far', apply: function (m) { m.dashLength *= 1.6; } },
    { id: 'secondwind', rarity: 'master', name: 'Second Wind', element: null, line: 'Once, when you would die, you stand up with three hearts', apply: function (m) { m.secondWind += 1; } },
    { id: 'hourglass', rarity: 'epic', name: 'Hourglass Shard', element: null, line: 'Every hit you land slows the creature for a breath', apply: function (m) { m.slowOnHit = 45; } },
    { id: 'tuningfork', rarity: 'epic', name: 'Tuning Fork', element: null, line: 'Your weapon comes round a third faster', apply: function (m) { m.comboSpeed *= 0.7; } },
    { id: 'aeolian', rarity: 'epic', name: 'Aeolian Boots', element: null, ability: true, line: 'A third jump, from the air', apply: function (m) { m.airJumps += 1; } },
    { id: 'reiter', rarity: 'epic', name: "Reiter's Crystal", element: 'frost', line: 'Frost holds twice as long, and frozen things take two more', apply: function (m) { m.freezeTime *= 2; m.frozenBonus += 2; } },
    { id: 'almanac', rarity: 'rare', name: "Standish's Almanac", element: null, ability: true, line: 'The whole floor is drawn small at the top of your sight', apply: function (m) { m.map = true; } },
    { id: 'fireflies', rarity: 'rare', name: "Fireflies' Lantern", element: null, line: 'The lantern reaches further, and every creature glows from afar', apply: function (m) { m.lantern *= 1.4; m.glowFar = true; } },
    { id: 'edge', rarity: 'rare', name: 'Whetstone', element: null, line: 'One more on every stroke', apply: function (m) { m.damage += 1; } },
    { id: 'thornmantle', rarity: 'epic', name: 'Thorn Mantle', element: 'bloom', line: 'Whatever strikes you is cut for two', apply: function (m) { m.thorns += 2; } },
    { id: 'baton', rarity: 'epic', name: "Conductor's Baton", element: 'storm', line: 'Stormchain leaps to two more, and the shock lasts longer', apply: function (m) { m.chainMore += 2; m.shockTime *= 2; } },
    { id: 'deepbreath', rarity: 'rare', name: 'Deep Breath', element: null, line: 'Energy returns on every second hit instead of every fourth', apply: function (m) { m.hitsPerEnergy = 2; } },
    { id: 'luckycoin', rarity: 'rare', name: 'Lucky Coin', element: null, line: 'One more point of energy to spend', apply: function (m) { m.maxEnergy += 1; } },
    { id: 'soapbubble', rarity: 'master', name: 'Soap Bubble', element: null, line: 'A film that takes one hit for you, and grows back in twenty seconds', apply: function (m) { m.shield = 1200; } },
    { id: 'voidkey', rarity: 'master', name: 'Void Key', element: 'void', line: 'Every third cast costs nothing', apply: function (m) { m.freeCast = 3; } },
    { id: 'harpstring', rarity: 'rare', name: 'Harp String', element: null, line: 'Every blow lands harder: further knockback, a longer stop', apply: function (m) { m.knockback *= 1.8; m.hitstop *= 1.8; } },
    // the ten that give her something to do
    { id: 'magnet', rarity: 'rare', name: 'Magnet Lantern', element: null, ability: true, line: 'Hearts and finds fly to you from across the room', apply: function (m) { m.magnet = true; } },
    { id: 'wallgrip', rarity: 'rare', name: 'Wall-grip Gauntlets', element: null, ability: true, line: 'Slide down a wall you lean on, and jump away from it', apply: function (m) { m.wallgrip = true; } },
    { id: 'glider', rarity: 'epic', name: 'Glider Cape', element: null, ability: true, line: 'Hold jump in the air and the cloak carries you', apply: function (m) { m.glider = true; } },
    { id: 'greaves', rarity: 'epic', name: 'Pounding Greaves', element: null, ability: true, line: 'Down and jump in the air: you come down like a hammer', apply: function (m) { m.pound = true; } },
    { id: 'ghostcloak', rarity: 'epic', name: 'Ghost Cloak', element: 'void', ability: true, line: 'Your dash wounds whatever it passes through', apply: function (m) { m.ghost = true; } },
    { id: 'parry', rarity: 'master', name: 'Parry Bracer', element: null, ability: true, line: 'Strike just as a blow would land: it is turned, and the striker reels', apply: function (m) { m.parry = true; } },
    { id: 'phoenix', rarity: 'legendary', name: 'Phoenix Feather', element: 'ember', ability: true, line: 'When you would die you rise instead, whole, in a burst of fire. Once', apply: function (m) { m.phoenix += 1; } },
    { id: 'chladnibell', rarity: 'legendary', name: "Chladni's Bell", element: null, ability: true, line: 'Every fifth hit rings the bell, and its still lines cut across the room', apply: function (m) { m.bell = true; } },
    { id: 'snowflake', rarity: 'legendary', name: "Reiter's Snowflake", element: 'frost', ability: true, line: 'Every dash leaves a six-fold flake that freezes what is near', apply: function (m) { m.snowflake = true; } },
    { id: 'sandglass', rarity: 'legendary', name: 'Hourglass of Sand', element: null, ability: true, line: 'At two hearts or fewer, time runs slow for everything but you', apply: function (m) { m.sandglass = true; } }
  ];
  var BY_ID = {};
  RELICS.forEach(function (r) { BY_ID[r.id] = r; });
  var RARITY_WEIGHT = { rare: 6, epic: 3.2, master: 1.4, legendary: 0.5 };

  // some items to choose from: not yet held, leaning toward the floor's element and the power's, rarer with depth
  function offer(held, elementName, powerElement, rnd, count, floor, boost) {
    var pool = RELICS.filter(function (r) { return held.indexOf(r.id) < 0; });
    var weighted = [];
    pool.forEach(function (r) {
      var w = RARITY_WEIGHT[r.rarity] || 1;
      if (r.rarity === 'master') w += (floor || 1) * 0.5; if (r.rarity === 'legendary') w += (floor || 1) * 0.3;
      if (boost && r.rarity !== 'rare') w *= 2;
      if (r.element === elementName) w *= 1.6; if (r.element && r.element === powerElement) w *= 1.5;
      weighted.push({ r: r, w: w });
    });
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
