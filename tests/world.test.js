// Node checks for js/atlas/world.js. Run: node tests/world.test.js
const world = require('../js/atlas/world.js');
let failures = 0;
function check(name, ok, detail) { if (!ok) failures++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); }

function build(word) { const w = world.create(word); const t0 = Date.now(); while (!w.done) w.step(50); w.ms = Date.now() - t0; return w; }
function digest(w) { let h = 2166136261; for (let i = 0; i < w.bytes.length; i += 97) h = Math.imul(h ^ w.bytes[i], 16777619); return h >>> 0; }

check('hash is stable', world.hashString('brian') === world.hashString('brian') && world.hashString('brian') !== world.hashString('brian '));
check('words are normalised', world.normaliseWord('  Hello   World ') === 'hello world');
check('same seed, same stream', world.random(42)() === world.random(42)());

const words = ['brian', 'hello', 'a', 'Zürich', 'the quick brown fox', '', '12345', 'nowhere'];
for (const word of words) {
  const a = build(word), b = build(word);
  check('deterministic: "' + word + '"', digest(a) === digest(b), a.ms + ' ms');
  let bad = 0; for (let i = 0; i < a.heights.length; i++) if (!(a.heights[i] === a.heights[i]) || Math.abs(a.heights[i]) > 12000) bad++;
  check('no NaN or out-of-range heights: "' + word + '"', bad === 0, bad + ' bad');
  const s = a.stats;
  check('land share near target: "' + word + '"', Math.abs(s.landShare - a.shape.landShare) < 0.04, 'target ' + a.shape.landShare.toFixed(3) + ' got ' + s.landShare.toFixed(3));
  check('peak and deep plausible: "' + word + '"', s.highest.metres > 2500 && s.highest.metres <= a.shape.peak + 1 && s.deepest.metres < -3000, Math.round(s.highest.metres) + ' m / ' + Math.round(s.deepest.metres) + ' m, coast ' + Math.round(s.coastKm) + ' km, R ' + a.shape.radiusKm);
  check('heightAt agrees with grid: "' + word + '"', Math.abs(a.heightAt(s.highest.lat, s.highest.lon) - s.highest.metres) < 1);
}
check('different words differ', digest(build('brian')) !== digest(build('brianna')));

// a look at one world
const w = build(process.argv[2] || 'brian');
const ramp = ' .:-=+*#%@';
for (let y = 0; y < 32; y++) { let line = ''; for (let x = 0; x < 96; x++) { const m = w.heights[Math.floor((y + 0.5) / 32 * w.height) * w.width + Math.floor((x + 0.5) / 96 * w.width)]; line += m < 0 ? (m < -3000 ? ' ' : '.') : ramp[Math.min(9, 3 + Math.floor(m / 900))]; } console.log(line); }
console.log(failures ? failures + ' FAILED' : 'all passed');
process.exit(failures ? 1 : 0);
