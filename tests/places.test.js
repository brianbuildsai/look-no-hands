// Node checks for js/atlas/tongue.js and js/atlas/places.js. Run: node tests/places.test.js [word]
const world = require('../js/atlas/world.js');
const tongue = require('../js/atlas/tongue.js');
const places = require('../js/atlas/places.js');
let failures = 0;
function check(name, ok, detail) { if (!ok) failures++; if (!ok || process.env.VERBOSE) console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); }
function build(word) { const w = world.create(word); while (!w.done) w.step(200); const t0 = Date.now(); const speech = tongue.create(w.seedText); const found = places.find(w, speech, speech.world()); found.ms = Date.now() - t0; found.world = w; return found; }

const words = ['brian', 'hello', 'a', 'Zürich', 'the quick brown fox', '', '12345', 'nowhere', 'claude', 'atlas', 'x', 'moon'];
for (const word of words) {
  const a = build(word), b = build(word);
  const names = a.places.map(p => p.name);
  check('deterministic "' + word + '"', JSON.stringify(a.places) === JSON.stringify(b.places) && a.name === b.name);
  check('names unique "' + word + '"', new Set(names).size === names.length, names.filter((n, i) => names.indexOf(n) !== i).join(','));
  check('names well formed "' + word + '"', names.concat([a.name]).every(n => /^[A-ZÁÉÍÓÚÄËÖÜÂÊÔ]/.test(n) && n.length >= 3 && n.length <= 24 && !/undefined|NaN/.test(n)), names.filter(n => !/^[A-ZÁÉÍÓÚÄËÖÜÂÊÔ]/.test(n) || n.length > 24).join(','));
  const towns = a.places.filter(p => p.kind === 'town'), waters = a.places.filter(p => p.kind === 'water'), peaks = a.places.filter(p => p.kind === 'peak'), lands = a.places.filter(p => p.kind === 'land');
  check('enough of everything "' + word + '"', towns.length >= 12 && waters.length >= 4 && peaks.length >= 3 && lands.length >= 1, `towns ${towns.length} waters ${waters.length} peaks ${peaks.length} lands ${lands.length}`);
  check('towns on land, waters in water "' + word + '"', towns.every(p => a.world.heightAt(p.lat, p.lon) > 0) && waters.every(p => a.world.heightAt(p.lat, p.lon) < 0) && lands.every(p => a.world.heightAt(p.lat, p.lon) >= 0));
  check('no broken text "' + word + '"', a.places.every(p => p.text && !/undefined|NaN|null/.test(p.text + p.position) && isFinite(p.lat) && isFinite(p.lon) && isFinite(p.metres)));
  check('one capital "' + word + '"', towns.filter(p => p.capital).length === 1);
  check('fast enough "' + word + '"', a.ms < 1500, a.ms + ' ms');
}
const show = build(process.argv[2] || 'brian');
console.log('\nWorld of "' + show.world.word + '": ' + show.name + '  (' + show.ms + ' ms)');
for (const p of show.places) console.log(' ', p.kind.padEnd(5), p.name.padEnd(22), p.position.padEnd(20), String(Math.round(p.metres)).padStart(6) + ' m ', p.people ? String(p.people).padStart(9) : '         ', '|', p.text);
console.log(failures ? failures + ' FAILED' : 'all passed');
process.exit(failures ? 1 : 0);
