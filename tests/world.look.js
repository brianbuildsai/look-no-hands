// Prints a rough chart of a world. Run: node tests/world.look.js [word]
const world = require('../js/atlas/world.js');
const w = world.create(process.argv[2] || 'brian'); while (!w.done) w.step(100);
const COLS = 150, ROWS = 46;
for (let y = 0; y < ROWS; y++) { let line = ''; for (let x = 0; x < COLS; x++) {
  const m = w.heights[Math.floor((y + 0.5) / ROWS * w.height) * w.width + Math.floor((x + 0.5) / COLS * w.width)];
  line += m < -200 ? ' ' : m < 0 ? '.' : m < 500 ? ':' : m < 1500 ? 'o' : m < 3000 ? 'O' : '#'; } console.log(line); }
console.log(JSON.stringify(w.shape), 'land', w.stats.landShare.toFixed(3));
