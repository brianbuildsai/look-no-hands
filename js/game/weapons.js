/* weapons.js: what the Warden can carry in her right hand.

   Eleven weapons in five rarities. A weapon is a piece of text art drawn
   pointing up, with the pixel of its grip marked; pixels.js turns it to lie
   flat or aslant and puts the grip in her hand in every frame, so each
   weapon gives the Warden a full set of frames of its own. A weapon also
   names a moveset (which frames its swings use, how long each takes, where
   its boxes fall), a trail colour, an element if it has one, and the thing
   it does at the end of its combo. The engine draws the rest: the crescents,
   the pillars of light, the flock. */
(function () {
  'use strict';

  var RARITY = {
    common:    { name: 'Common',    colour: '#c4c1ba', glow: 'rgba(196,193,186,0.0)', rank: 0 },
    rare:      { name: 'Rare',      colour: '#6ec6ff', glow: 'rgba(110,198,255,0.5)', rank: 1 },
    epic:      { name: 'Epic',      colour: '#b06cff', glow: 'rgba(176,108,255,0.6)', rank: 2 },
    master:    { name: 'Master',    colour: '#ff3b4e', glow: 'rgba(255,59,78,0.65)', rank: 3 },
    legendary: { name: 'Legendary', colour: '#ffd24d', glow: 'rgba(255,210,77,0.75)', rank: 4 }
  };

  // swings: which frames of which animation, how many steps each frame holds, which frames strike, and the shape of the blow
  var MOVESETS = {
    sword: [
      { anim: 'attack1', seq: [0, 1, 2, 3], ticks: [3, 3, 3, 4], active: [1, 2], shape: 'arc', reach: 1, lunge: 0.6 },
      { anim: 'attack2', seq: [0, 1, 2, 3], ticks: [3, 3, 3, 4], active: [1, 2], shape: 'rise', reach: 0.95, lunge: 0.5, lift: true },
      { anim: 'attack3', seq: [0, 1, 2, 3, 4], ticks: [4, 2, 3, 3, 5], active: [1, 2, 3], shape: 'thrust', reach: 1.4, lunge: 2.2, finisher: true }
    ],
    quick: [
      { anim: 'attack3', seq: [1, 2, 4], ticks: [2, 3, 2], active: [0, 1], shape: 'thrust', reach: 1, lunge: 0.8 },
      { anim: 'attack1', seq: [1, 2, 3], ticks: [2, 3, 2], active: [0, 1], shape: 'arc', reach: 0.9, lunge: 0.6 },
      { anim: 'attack3', seq: [1, 2, 4], ticks: [2, 3, 2], active: [0, 1], shape: 'thrust', reach: 1, lunge: 0.8 },
      { anim: 'attack2', seq: [0, 1, 2, 3], ticks: [2, 2, 3, 5], active: [1, 2], shape: 'rise', reach: 1.1, lunge: 1.4, lift: true, finisher: true }
    ],
    heavy: [
      { anim: 'heavy1', seq: [0, 1, 2, 3, 4], ticks: [7, 6, 3, 8, 6], active: [2, 3], shape: 'slam', reach: 1, lunge: 0.8 },
      { anim: 'heavy2', seq: [0, 1, 2, 3, 4], ticks: [8, 7, 3, 10, 7], active: [2, 3], shape: 'slam', reach: 1.15, lunge: 1.2, finisher: true }
    ],
    sweep: [
      { anim: 'attack1', seq: [0, 1, 2, 3], ticks: [4, 3, 4, 4], active: [1, 2], shape: 'arc', reach: 1, lunge: 0.5 },
      { anim: 'attack2', seq: [0, 1, 2, 3], ticks: [4, 3, 4, 4], active: [1, 2], shape: 'rise', reach: 1, lunge: 0.5, lift: true },
      { anim: 'attack1', seq: [0, 1, 2, 2, 3], ticks: [6, 3, 4, 4, 6], active: [1, 2, 3], shape: 'wide', reach: 1.1, lunge: 0.3, finisher: true }
    ],
    whip: [
      { anim: 'attack1', seq: [0, 1, 2, 3], ticks: [5, 3, 5, 4], active: [1, 2], shape: 'lash', reach: 1, lunge: 0.2 },
      { anim: 'attack2', seq: [0, 1, 2, 3], ticks: [5, 3, 5, 4], active: [1, 2], shape: 'lash', reach: 1.05, lunge: 0.2 },
      { anim: 'attack3', seq: [0, 1, 2, 3, 4], ticks: [6, 3, 4, 4, 5], active: [1, 2, 3], shape: 'lash', reach: 1.2, lunge: 0.4, finisher: true }
    ],
    // the lantern on its pole: held out upright, and a bolt of its light goes where she faces; the third goes through
    pole: [
      { anim: 'bow', seq: [0, 1, 2, 2], ticks: [5, 6, 3, 8], active: [2], shape: 'bolt', reach: 1, lunge: -0.3 },
      { anim: 'bow', seq: [0, 1, 2, 2], ticks: [5, 6, 3, 8], active: [2], shape: 'bolt', reach: 1, lunge: -0.3 },
      { anim: 'bow', seq: [0, 1, 1, 2, 2], ticks: [6, 8, 8, 3, 10], active: [3], shape: 'bolt', reach: 1, lunge: -1.2, finisher: true }
    ],
    bow: [
      { anim: 'bow', seq: [0, 1, 2, 2], ticks: [5, 6, 3, 6], active: [2], shape: 'shot', reach: 1, lunge: -0.4 },
      { anim: 'bow', seq: [0, 1, 2, 2], ticks: [5, 6, 3, 6], active: [2], shape: 'shot', reach: 1, lunge: -0.4 },
      { anim: 'bow', seq: [0, 1, 1, 2, 2], ticks: [6, 8, 8, 3, 8], active: [3], shape: 'shot', reach: 1, lunge: -1, finisher: true }
    ]
  };

  var WEAPONS = {
    forgehammer: { name: 'Forge Hammer', rarity: 'common', moveset: 'heavy', damage: [3, 4], reach: 24, trail: '#ffb347', finisher: 'quake', line: 'Two slow blows; the second cracks the floor both ways', grip: [3, 13],
      art: ['kkkkkkk', 'kgwggnk', 'kggggnk', 'kgfggnk', 'kggggnk', 'kkkkkkk', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..krk..', '..kkk..'] },
    lamppole: { name: 'Lantern Pole', rarity: 'common', moveset: 'pole', damage: [1, 1, 3], reach: 0, trail: '#ffdc9a', line: 'Three bolts of lantern light, the third straight through', grip: [3, 15],
      art: ['..kkk..', '.krRrk.', 'kaAAAak', 'kaAFAak', 'kaAAAak', '.krrrk.', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..krk..', '..kkk..'] },
    shortsword: { name: 'Short Sword', rarity: 'common', moveset: 'sword', damage: [2, 2, 4], reach: 24, trail: '#e9e6df', line: 'Three swings, the last a thrust', grip: [1, 11], handDrawn: true,
      art: ['.W.', 'kWk', 'kwk', 'kwk', 'kwk', 'kwk', 'kwk', 'kwk', 'kwk', 'rrr', 'krk', 'kbk', 'kkk'] },
    daggers: { name: 'Twin Daggers', rarity: 'rare', moveset: 'quick', damage: [1, 1, 1, 3], reach: 19, trail: '#6ec6ff', ability: 'dashslash', line: 'Four quick cuts; your dash cuts through what it passes', grip: [1, 7],
      art: ['.W.', 'kWk', 'kwk', 'kwk', 'kgk', 'rrr', 'kbk', 'kbk', 'kkk'] },
    hammer: { name: 'War Hammer', rarity: 'rare', moveset: 'heavy', damage: [5, 8], reach: 26, trail: '#c4c1ba', finisher: 'quake', line: 'Two slow blows; the second cracks the floor both ways', grip: [4, 15],
      art: ['kkkkkkkkk', 'kNmmmmmNk', 'kmMMMMMmk', 'kmMxxxMmk', 'kmMMMMMmk', 'kNmmmmmNk', 'kkkkbkkkk', '...kbk...', '...kbk...', '...kBk...', '...kbk...', '...kbk...', '...kBk...', '...kbk...', '...krk...', '...kbk...', '...kbk...', '...kkk...'] },
    emberbrand: { name: 'Ember Brand', rarity: 'epic', moveset: 'sword', damage: [3, 3, 5], reach: 26, trail: '#ff8c42', element: 'ember', finisher: 'flamewave', line: 'Every cut burns; the thrust throws a wave of flame', grip: [2, 13],
      art: ['..F..', '.kFk.', '.kfFk', '.kFfk', '.kfFk', '.kFfk', '.kfFk', '.kFfk', '.kfFk', '.kFfk', '.kffk', 'aaaaa', '.kck.', '.kbk.', '.kkk.'] },
    frostglaive: { name: 'Frost Glaive', rarity: 'epic', moveset: 'sweep', damage: [3, 3, 5], reach: 38, trail: '#9fd8ff', finisher: 'icespikes', line: 'A long reach; the last sweep raises a row of ice', grip: [2, 20],
      art: ['...kk..', '..kIIk.', '..kIiIk', '.kIiiIk', '.kIiik.', '.kIik..', '.kIik..', '.kiik..', '.kMk...', '.kMk...', '.kmk...', '.kMk...', '.kMk...', '.kmk...', '.kMk...', '.kMk...', '.kmk...', '.kMk...', '.kMk...', '.kmk...', '.kMk...', '.kMk...', '.kmk...', '.kkk...'] },
    stormrapier: { name: 'Storm Rapier', rarity: 'epic', moveset: 'quick', damage: [2, 2, 2, 4], reach: 30, trail: '#8fa3ff', finisher: 'arc', line: 'Fast thrusts; the last one arcs to three more', grip: [2, 15],
      art: ['..Z..', '..Z..', '..z..', '..Z..', '..Z..', '..z..', '..Z..', '..Z..', '..z..', '..Z..', '..Z..', '..z..', '.kZk.', 'zzzzz', 'z.k.z', '.kbk.', '.kbk.', '.kkk.'] },
    scythe: { name: "Reaper's Scythe", rarity: 'master', moveset: 'sweep', damage: [4, 4, 7], reach: 36, trail: '#ff3b4e', ability: 'reap', finisher: 'whirl', line: 'Wide arcs that reach behind you; every third kill gives back a heart', grip: [2, 18],
      art: ['....kkkkkkkk.', '..kkCCCCCCCCk', '.kCCccccccck.', 'kCcckkkkkkk..', 'kCck.........', 'kkMk.........', '.kMk.........', '.kmk.........', '.kMk.........', '.kMk.........', '.kmk.........', '.kMk.........', '.kMk.........', '.kmk.........', '.kMk.........', '.kMk.........', '.kmk.........', '.kMk.........', '.kMk.........', '.kcck........', '.kkk.........'] },
    thornwhip: { name: 'Thorn Whip', rarity: 'master', moveset: 'whip', damage: [3, 3, 5], reach: 62, trail: '#9ae66e', element: 'bloom', finisher: 'drag', line: 'A long living lash that poisons; the last crack drags them to you', grip: [1, 4],
      art: ['.U.', 'kuk', 'kuk', 'kUk', 'kbk', 'kbk', 'kkk'] },
    dawnbreaker: { name: 'Dawnbreaker', rarity: 'legendary', moveset: 'heavy', damage: [7, 11], reach: 34, trail: '#ffd24d', finisher: 'sunpillar', line: 'A greatsword of first light. Its last blow brings down the sun', grip: [3, 20],
      art: ['...Y...', '..kYk..', '..kYk..', '.kyYyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyYyk.', '.kyyyk.', 'kYYYYYk', 'kyrYryk', '.kkrkk.', '..krk..', '..kyk..', '..krk..', '..kYk..', '..kkk..'] },
    quicksilver: { name: 'Quicksilver', rarity: 'legendary', moveset: 'sword', damage: [4, 4, 6], reach: 30, trail: '#f4f8ff', finisher: 'droplets', flowing: true, line: 'A blade that has not decided to be solid. It ends in drops that seek', grip: [2, 14],
      art: ['..J..', '.kJk.', '.kjJk', 'kJjk.', 'kjJk.', '.kJjk', '.kjJk', 'kJjk.', 'kjJk.', '.kJjk', '.kjJk', '.kJjk', 'jJJJj', '.kjk.', '.kgk.', '.kkk.'] },
    murmuration: { name: 'Murmuration', rarity: 'legendary', moveset: 'bow', damage: [2, 2, 3], reach: 0, trail: '#ffd24d', finisher: 'flock', line: 'A bow that looses a flock of lights. They wheel, and fall on what you face', grip: [4, 9],
      art: ['..kk...', '.kYyk..', '..kyk..', '...kyk.', '...kyYk', 'h...kyk', 'h...kyk', 'h...kYk', 'h...kyk', 'h...kyk', 'h...kyk', 'h...kYk', 'h...kyk', 'h..kyYk', '...kyk.', '..kyk..', '.kYyk..', '..kk...'] }
  };
  var ORDER = ['shortsword', 'forgehammer', 'lamppole', 'daggers', 'hammer', 'emberbrand', 'frostglaive', 'stormrapier', 'scythe', 'thornwhip', 'dawnbreaker', 'quicksilver', 'murmuration'];

  // a weapon by chance: deeper floors and bosses lean toward the rarer
  function roll(rnd, floor, boost, exclude) {
    var weights = { common: 0, rare: 6, epic: 3 + floor, master: 0.6 + floor * 0.9, legendary: 0.15 + floor * 0.45 };
    if (boost) { weights.rare = 1; weights.epic += 3; weights.master += 2; weights.legendary += 1.2; }
    var pool = ORDER.filter(function (id) { return WEAPONS[id].rarity !== 'common' && id !== exclude; }), total = 0, k;
    for (k = 0; k < pool.length; k++) total += weights[WEAPONS[pool[k]].rarity];
    var pick = rnd() * total;
    for (k = 0; k < pool.length; k++) { pick -= weights[WEAPONS[pool[k]].rarity]; if (pick <= 0) return pool[k]; }
    return pool[pool.length - 1];
  }

  var viewCache = {};
  function views(id) {
    if (viewCache[id]) return viewCache[id];
    var w = WEAPONS[id] || WEAPONS.shortsword;
    viewCache[id] = window.Pixels.weaponViews(w.art, w.grip[0], w.grip[1], w.handDrawn);
    return viewCache[id];
  }

  window.Weapons = { RARITY: RARITY, MOVESETS: MOVESETS, WEAPONS: WEAPONS, ORDER: ORDER, roll: roll, views: views };
})();
