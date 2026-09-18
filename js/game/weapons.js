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
    // a spear: three long thrusts, the last a lunge
    spear: [
      { anim: 'attack3', seq: [0, 1, 2, 4], ticks: [4, 2, 4, 3], active: [1, 2], shape: 'thrust', reach: 1, lunge: 0.9 },
      { anim: 'attack3', seq: [0, 1, 2, 4], ticks: [3, 2, 4, 3], active: [1, 2], shape: 'thrust', reach: 1.05, lunge: 0.9 },
      { anim: 'attack3', seq: [0, 1, 2, 3, 4], ticks: [6, 2, 4, 4, 6], active: [1, 2, 3], shape: 'thrust', reach: 1.25, lunge: 2.6, finisher: true }
    ],
    // a thing thrown: it leaves the hand, and arms.js brings it back
    thrown: [
      { anim: 'attack1', seq: [0, 1, 2, 3], ticks: [4, 3, 3, 5], active: [1], shape: 'throw', reach: 1, lunge: -0.2 },
      { anim: 'attack1', seq: [0, 1, 2, 3], ticks: [4, 3, 3, 5], active: [1], shape: 'throw', reach: 1, lunge: -0.2 },
      { anim: 'attack1', seq: [0, 0, 1, 2, 3], ticks: [6, 5, 3, 4, 8], active: [2], shape: 'throw', reach: 1, lunge: -0.8, finisher: true }
    ],
    bow: [
      { anim: 'bow', seq: [0, 1, 2, 2], ticks: [5, 6, 3, 6], active: [2], shape: 'shot', reach: 1, lunge: -0.4 },
      { anim: 'bow', seq: [0, 1, 2, 2], ticks: [5, 6, 3, 6], active: [2], shape: 'shot', reach: 1, lunge: -0.4 },
      { anim: 'bow', seq: [0, 1, 1, 2, 2], ticks: [6, 8, 8, 3, 8], active: [3], shape: 'shot', reach: 1, lunge: -1, finisher: true }
    ]
  };

  var WEAPONS = {
    forgehammer: { name: 'Forge Hammer', starter: true, rarity: 'common', moveset: 'heavy', damage: [3, 4], reach: 24, trail: '#ffb347', finisher: 'quake', line: 'Two slow blows; the second cracks the floor both ways', grip: [3, 13],
      art: ['kkkkkkk', 'kgwggnk', 'kggggnk', 'kgfggnk', 'kggggnk', 'kkkkkkk', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..krk..', '..kkk..'] },
    lamppole: { name: 'Lantern Pole', starter: true, rarity: 'common', moveset: 'pole', damage: [1, 1, 3], reach: 0, trail: '#ffdc9a', line: 'Three bolts of lantern light, the third straight through', grip: [3, 15],
      art: ['..kkk..', '.krRrk.', 'kaAAAak', 'kaAFAak', 'kaAAAak', '.krrrk.', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..kBk..', '..kbk..', '..krk..', '..kkk..'] },
    shortsword: { name: 'Short Sword', starter: true, rarity: 'common', moveset: 'sword', damage: [2, 2, 4], reach: 24, trail: '#e9e6df', line: 'Three swings, the last a thrust', grip: [1, 11], handDrawn: true,
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
    handaxe: { name: 'Hand Axe', rarity: 'common', moveset: 'sword', damage: [2, 2, 5], reach: 20, trail: '#c4c1ba', line: 'Two chops and a heavy third', grip: [2, 9],
      art: ['..kkkk.', '.kbwWwk', '.kbwwwk', '.kbgwk.', '.kbkk..', '.kBk...', '.kbk...', '.kBk...', '.kbk...', '.kbk...', '.krk...', '.kkk...'] },
    pike: { name: 'Pike', rarity: 'rare', moveset: 'spear', damage: [3, 3, 5], reach: 40, trail: '#6ec6ff', finisher: 'skewer', line: 'Long thrusts; the last carries you through them', grip: [2, 21],
      art: ['..W..', '.kWk.', '.kwk.', 'kwwwk', '.kwk.', '.krk.', '.kbk.', '.kBk.', '.kbk.', '.kbk.', '.kBk.', '.kbk.', '.kbk.', '.kBk.', '.kbk.', '.kbk.', '.kBk.', '.kbk.', '.kbk.', '.kBk.', '.kbk.', '.kbk.', '.kBk.', '.kgk.', '.kkk.'] },
    disc: { name: 'Returning Disc', rarity: 'rare', moveset: 'thrown', damage: [2, 2, 4], reach: 0, trail: '#6ec6ff', line: 'Thrown; it strikes going out and again coming back', grip: [3, 5],
      art: ['..kkk..', '.kwWwk.', 'kwk.kwk', 'kW...Wk', 'kwk.kwk', '.kwWwk.', '..kkk..'] },
    trident: { name: 'Trident of the Stacks', rarity: 'epic', moveset: 'spear', damage: [3, 3, 5], reach: 38, trail: '#5fd4c4', element: 'tide', finisher: 'geyser', line: 'Every thrust soaks; the last raises a geyser under them', grip: [3, 19],
      art: ['Q..Q..Q', 'q..Q..q', 'qk.q.kq', 'qk.q.kq', 'kqqqqqk', '.kkqkk.', '..kqk..', '..kbk..', '..kBk..', '..kbk..', '..kbk..', '..kBk..', '..kbk..', '..kbk..', '..kBk..', '..kbk..', '..kbk..', '..kBk..', '..kbk..', '..kbk..', '..kBk..', '..kqk..', '..kkk..'] },
    mainspring: { name: 'Mainspring Saw', rarity: 'epic', moveset: 'sword', damage: [2, 2, 4], reach: 26, trail: '#e0b04a', element: 'gear', finisher: 'runningsaw', twice: true, line: 'Every cut lands twice; the last sends a saw along the floor and back', grip: [3, 13],
      art: ['...k...', '..kRk..', '.krRk..', '..kRrk.', '.krRk..', '..kRrk.', '.krRk..', '..kRrk.', '.krRk..', '..kRrk.', '.krRrk.', 'kgggggk', '.kkbkk.', '..kbk..', '..kkk..'] },
    glasssabre: { name: 'Glass Sabre', rarity: 'epic', moveset: 'sword', damage: [3, 3, 5], reach: 28, trail: '#ff9ecb', element: 'glass', finisher: 'shardfan', line: 'Every cut opens them to the next; the thrust breaks into three shards', grip: [2, 14],
      art: ['...L.', '..kLk', '..klL', '.kLlk', '.klLk', '.kLlk', 'kLlk.', 'klLk.', 'kLlk.', 'klLk.', '.kLlk', '.klLk', 'wwwww', '.kgk.', '.kbk.', '.kkk.'] },
    umbralflail: { name: 'Umbral Flail', rarity: 'master', moveset: 'whip', damage: [3, 3, 6], reach: 56, trail: '#a48cff', finisher: 'singularity', lash: ['#5b3fa0', '#d9b8ff'], line: 'A long dark lash; the last crack opens a hole that drags them in and crushes them', grip: [2, 8],
      art: ['.kkk.', 'kvVvk', 'kVDVk', 'kvVvk', '.kkk.', '..g..', '..g..', '.kbk.', '.kbk.', '.kkk.'] },
    bellmaul: { name: 'Bellringer\'s Maul', rarity: 'master', moveset: 'heavy', damage: [6, 9], reach: 28, trail: '#efd27a', finisher: 'toll', line: 'A bell on a haft. Its second blow tolls, and what hears it stands stunned', grip: [4, 16],
      art: ['...kkk...', '..krRrk..', '.krRRRrk.', '.krRrRrk.', '.krRRRrk.', 'krRRRRRrk', 'krrrrrrrk', 'kkkkRkkkk', '...kbk...', '...kBk...', '...kbk...', '...kbk...', '...kBk...', '...kbk...', '...kbk...', '...kBk...', '...kbk...', '...krk...', '...kkk...'] },
    dawnbreaker: { name: 'Dawnbreaker', rarity: 'legendary', moveset: 'heavy', damage: [7, 11], reach: 34, trail: '#ffd24d', finisher: 'sunpillar', line: 'A greatsword of first light. Its last blow brings down the sun', grip: [3, 20],
      art: ['...Y...', '..kYk..', '..kYk..', '.kyYyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyWyk.', '.kyYyk.', '.kyyyk.', 'kYYYYYk', 'kyrYryk', '.kkrkk.', '..krk..', '..kyk..', '..krk..', '..kYk..', '..kkk..'] },
    quicksilver: { name: 'Quicksilver', rarity: 'legendary', moveset: 'sword', damage: [4, 4, 6], reach: 30, trail: '#f4f8ff', finisher: 'droplets', flowing: true, line: 'A blade that has not decided to be solid. It ends in drops that seek', grip: [2, 14],
      art: ['..J..', '.kJk.', '.kjJk', 'kJjk.', 'kjJk.', '.kJjk', '.kjJk', 'kJjk.', 'kjJk.', '.kJjk', '.kjJk', '.kJjk', 'jJJJj', '.kjk.', '.kgk.', '.kkk.'] },
    murmuration: { name: 'Murmuration', rarity: 'legendary', moveset: 'bow', damage: [2, 2, 3], reach: 0, trail: '#ffd24d', finisher: 'flock', line: 'A bow that looses a flock of lights. They wheel, and fall on what you face', grip: [4, 9],
      art: ['..kk...', '.kYyk..', '..kyk..', '...kyk.', '...kyYk', 'h...kyk', 'h...kyk', 'h...kYk', 'h...kyk', 'h...kyk', 'h...kyk', 'h...kYk', 'h...kyk', 'h..kyYk', '...kyk.', '..kyk..', '.kYyk..', '..kk...'] }
  };
  /* What each weapon does, said plainly: the infobox reads these, and works out the damage and reach lines itself. */
  var STROKES = { sword: 'Cut, rising cut, thrust', quick: 'Four fast cuts', heavy: 'Two slow overhead blows', sweep: 'Three wide sweeps', whip: 'Three long lashes', bow: 'Three shots', pole: 'Three bolts', spear: 'Three long thrusts', thrown: 'Two throws and a great one' };
  var DETAILS = {
    shortsword:  ['The third stroke is a lunging thrust'],
    forgehammer: ['+Finisher: the floor cracks both ways, 4 damage along it, through everything'],
    lamppole:    ['+Fires bolts of light that fly 250 pixels', '+The third is a great bolt that passes through everything'],
    daggers:     ['+Your dash deals 2 to whatever it passes through (the Kite\'s blink cuts for 3)'],
    hammer:      ['+Finisher: the floor cracks both ways, 4 damage along it, through everything'],
    emberbrand:  ['+Every hit sets the creature alight: 1 a tick for 3 s', '+Finisher: a wave of flame flies forward, 4 damage, through everything'],
    frostglaive: ['+Finisher: five spikes of ice rise in a row ahead, 3 damage each, and freeze for 1.5 s'],
    stormrapier: ['+Finisher: a bolt arcs to the 3 nearest creatures, 3 damage each, and shocks them'],
    scythe:      ['+Every 3rd creature you kill heals 1 heart', '+Finisher: a whirl all round you, 5 damage within 42 pixels'],
    thornwhip:   ['+Every hit poisons: 5 damage over 4 s', '+Finisher: drags every lesser creature within 100 pixels to you and breaks its attack'],
    handaxe:     ['The third stroke is a heavy chop'],
    pike:        ['+Finisher: a lunge that carries you through them, unharmed, 3 damage to all you pass'],
    disc:        ['+Flies about 90 pixels and returns to your hand', '+Strikes once going out and once coming back', '+Finisher: three discs in a fan'],
    trident:     ['+Every hit soaks: the creature moves 40% slower for 4 s', '+Finisher: a geyser under the nearest ahead, 4 damage, and throws it in the air'],
    mainspring:  ['+Every cut lands a second time for half damage', '+Every hit jams: the creature cannot begin an attack for about 1 s', '+Finisher: a saw runs 130 pixels along the floor and back, 3 damage each way'],
    glasssabre:  ['+Every hit cuts: the creature takes 1 more from every blow for 4 s', '+Finisher: three shards in a fan, 3 damage each'],
    umbralflail: ['+Finisher: a hole opens where the lash ends and drags lesser creatures in', '+then collapses: 6 damage within 30 pixels'],
    bellmaul:    ['+Finisher: a toll. Lesser creatures within 84 pixels are stunned for 1.7 s', '+and whatever they were doing is broken off'],
    dawnbreaker: ['+Finisher: a pillar of light from vault to floor, 12 damage', '+and a wave of gold each way along the floor, 5 damage, through everything'],
    quicksilver: ['+The blade leaves a ribbon where its tip has been', '+Finisher: 8 drops orbit you, then seek the nearest creatures, 3 damage each'],
    murmuration: ['+Each shot looses 5 lights that wheel and home on what you face', '+Finisher: a flock of 16']
  };
  Object.keys(WEAPONS).forEach(function (id) { WEAPONS[id].detail = DETAILS[id] || [WEAPONS[id].line]; WEAPONS[id].strokes = STROKES[WEAPONS[id].moveset] || ''; });
  var ORDER = ['shortsword', 'forgehammer', 'lamppole', 'handaxe', 'daggers', 'hammer', 'pike', 'disc', 'emberbrand', 'frostglaive', 'stormrapier', 'trident', 'mainspring', 'glasssabre', 'scythe', 'thornwhip', 'umbralflail', 'bellmaul', 'dawnbreaker', 'quicksilver', 'murmuration'];

  // a weapon by chance: first a rarity (deeper floors and guardians lean toward the rarer), then any weapon of it,
  // so that adding weapons to a rarity does not make that rarity commoner
  function roll(rnd, floor, boost, exclude) {
    var weights = { common: floor <= 2 && !boost ? 2 : 0, rare: 12, epic: 9 + floor * 3, master: 1.2 + floor * 1.8, legendary: 0.45 + floor * 1.35 };
    if (boost) { weights.rare = 2; weights.epic += 9; weights.master += 4; weights.legendary += 3.6; }
    var not = exclude instanceof Array ? exclude : [exclude];
    var pool = ORDER.filter(function (id) { return !WEAPONS[id].starter && not.indexOf(id) < 0; }), byRarity = {}, total = 0, k, name;
    for (k = 0; k < pool.length; k++) (byRarity[WEAPONS[pool[k]].rarity] || (byRarity[WEAPONS[pool[k]].rarity] = [])).push(pool[k]);
    for (name in byRarity) total += weights[name];
    var pick = rnd() * total;
    for (name in byRarity) { pick -= weights[name]; if (pick <= 0 && weights[name] > 0) return byRarity[name][Math.floor(rnd() * byRarity[name].length)]; }
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
