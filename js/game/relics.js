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
      wallgrip: false, glider: false, pound: false, ghost: false, parry: false, magnet: false, phoenix: 0, bell: false, snowflake: false, sandglass: false, breaker: false, reach: 1
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
  // what only a guardian gives: plain, strong, and taken as often as they are offered
  var BOONS = [
    { id: 'heartvessel', boon: true, stack: true, rarity: 'master', name: 'Heart Vessel', element: null, line: 'Two more hearts', apply: function (m) { m.maxHp += 2; } },
    { id: 'energycell', boon: true, stack: true, rarity: 'master', name: 'Energy Cell', element: null, line: 'One more point of energy', apply: function (m) { m.maxEnergy += 1; } },
    { id: 'whettededge', boon: true, stack: true, rarity: 'master', name: 'Whetted Edge', element: null, line: 'One more damage on every stroke', apply: function (m) { m.damage += 1; } },
    { id: 'secondflame', boon: true, stack: true, flame: true, rarity: 'legendary', name: 'A Flame for the Lantern', element: null, line: 'One more life', apply: function (m) {} },
    { id: 'quickstep', boon: true, stack: true, rarity: 'master', name: 'Quickstep', element: null, line: 'The dash returns a third sooner', apply: function (m) { m.dashCooldown *= 0.7; } },
    { id: 'longarm', boon: true, stack: true, rarity: 'master', name: 'Long Arm', element: null, line: 'Every weapon reaches a fifth further', apply: function (m) { m.reach *= 1.2; } }
  ];
  var BY_ID = {};
  RELICS.forEach(function (r) { BY_ID[r.id] = r; });
  BOONS.forEach(function (r) { BY_ID[r.id] = r; });
  /* What each thing does, said plainly, with its numbers: the infobox reads these.
     A line that begins with + is a gain and is drawn green, with - a cost and red. */
  var DETAILS = {
    kindling:    ['+Setting a creature alight also ignites every creature within 40 pixels of it', '+Burn deals 2 a tick instead of 1 (a tick every 0.7 s, for 3 s)'],
    glassheart:  ['+2 maximum hearts, filled when taken', '-The dash takes twice as long to return'],
    longstride:  ['+The dash travels 60% further, and cannot be hurt for all of it'],
    secondwind:  ['+Once: when a blow would kill you, you stand up with 3 hearts and cannot be hurt for 2 s', 'Used up when it happens'],
    hourglass:   ['+Every hit you land slows that creature to 40% speed for 0.75 s'],
    tuningfork:  ['+Every stroke of every weapon takes 30% less time'],
    aeolian:     ['+1 more jump in the air (three in all, four for the Kite)'],
    reiter:      ['+Frost holds a creature frozen for 3 s instead of 1.5 s', '+Frozen creatures take 2 more damage from every hit'],
    almanac:     ['+The map shows every chamber of the stage from the start', '+It marks the portal and every unopened chest'],
    fireflies:   ['+The lantern lights 40% further', '+Every creature carries its own light, twice as large, so it shows in the dark'],
    edge:        ['+1 damage on every stroke, bolt and finisher'],
    thornmantle: ['+Whatever wounds you takes 2 damage back, at once'],
    baton:       ['+Stormchain leaps to 2 more creatures (5 in all)', '+Shock lasts 2 s instead of 1 s'],
    deepbreath:  ['+1 energy back every 2nd hit you land, instead of every 4th'],
    luckycoin:   ['+1 maximum energy, filled when taken'],
    soapbubble:  ['+A film takes one blow for you entirely', 'It grows back 20 s after it bursts'],
    voidkey:     ['+Every 3rd cast of your power costs no energy'],
    harpstring:  ['+Blows knock creatures back 80% further', '+The stop on impact is 80% longer, which holds them in place'],
    magnet:      ['+Hearts, weapons and items within 90 pixels fly to you (normally 40)'],
    wallgrip:    ['+Lean on a wall in the air and you slide down it slowly', '+Jump from it: a wall-jump, which gives back your air jumps and air dash'],
    glider:      ['+Hold jump while falling and you sink at an eighth of the usual speed'],
    greaves:     ['+Down and jump in the air: you drop like a hammer and cannot be hurt on the way', '+Landing deals 5 to everything within 32 pixels'],
    ghostcloak:  ['+Your dash deals 2 to every creature it passes through'],
    parry:       ['+Begin a stroke within 0.2 s of a blow landing: the blow does nothing', '+The striker is stunned for 2.3 s and its attack is broken'],
    phoenix:     ['+Once: when a blow would kill you, you rise with every heart full', '+The burst deals 10 within 70 pixels and burns. You cannot be hurt for 2.5 s', 'Used up when it happens'],
    chladnibell: ['+Every 5th hit you land rings the bell', '+The ring deals 3 to every creature on the screen'],
    snowflake:   ['+Every dash leaves a flake where it began', '+It freezes every creature within 46 pixels for 2 s (guardians for 0.3 s)'],
    sandglass:   ['+At 2 hearts or fewer, everything but you moves at half speed'],
    heartvessel: ['+2 maximum hearts, filled when taken', 'Can be taken again'],
    energycell:  ['+1 maximum energy, filled when taken', 'Can be taken again'],
    whettededge: ['+1 damage on every stroke, bolt and finisher', 'Can be taken again'],
    secondflame: ['+1 flame in the lantern: one more death before the run ends (5 at most)'],
    quickstep:   ['+The dash returns 30% sooner', 'Can be taken again'],
    longarm:     ['+Every melee weapon reaches 20% further', 'Can be taken again']
  };
  var POWER_DETAILS = {
    emberwave:  ['A cone of flame 58 pixels long: 3 damage to everything in it', 'Sets them alight: 1 a tick for 3 s', 'Costs 1 energy'],
    frostlance: ['A spear of ice that flies straight and passes through everything: 4 damage each', 'Freezes them for 1.5 s', 'Costs 1 energy'],
    stormchain: ['A bolt to the nearest creature within 130 pixels, leaping to 2 more: 3 damage each', 'Shocks them: 40% speed for 1 s', 'Costs 1 energy'],
    bloomburst: ['A ring of thorns 44 pixels around you: 2 damage and poison (5 over 4 s)', '+Heals you 1 heart if it hits anything', 'Costs 1 energy']
  };
  RELICS.concat(BOONS).forEach(function (r) { r.detail = DETAILS[r.id] || [r.line]; });
  POWER_ORDER.forEach(function (id) { POWERS[id].detail = POWER_DETAILS[id]; });
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

  window.Relics = { POWERS: POWERS, POWER_ORDER: POWER_ORDER, RELICS: RELICS, BOONS: BOONS, BY_ID: BY_ID, offer: offer, mods: mods, baseMods: baseMods };
})();
