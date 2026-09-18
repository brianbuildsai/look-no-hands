/* make-sounds.js: asks ElevenLabs for every effect in sounds.js and writes it to audio/undercroft/.

     ELEVENLABS_API_KEY=... node tools/make-sounds.js            every effect that has no file yet
     ELEVENLABS_API_KEY=... node tools/make-sounds.js hit roar   only these, made again
     node tools/make-sounds.js --list                            only rewrite js/game/samples.js from what is on disk

   The key is read from the environment and nowhere else: it is never written
   to a file. Each file is an mp3 of a second or so. When it is done it writes
   js/game/samples.js, the list sound.js loads: name, file, volume, loop. */
'use strict';
var fs = require('fs'), path = require('path');
var SOUNDS = require('./sounds.js');
var ROOT = path.join(__dirname, '..'), DIR = path.join(ROOT, 'audio', 'undercroft'), LIST = path.join(ROOT, 'js', 'game', 'samples.js');
var API = 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128';

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function make(name, spec, key) {
  for (var attempt = 0; attempt < 4; attempt++) {
    var res = await fetch(API, { method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: spec.text, duration_seconds: spec.seconds, prompt_influence: spec.influence, loop: !!spec.loop }) });
    if (res.ok) { var buf = Buffer.from(await res.arrayBuffer()); fs.writeFileSync(path.join(DIR, name + '.mp3'), buf); return buf.length; }
    var body = await res.text();
    if (res.status === 429 || res.status >= 500) { await sleep(2500 * (attempt + 1)); continue; }
    // the model may not take `loop`: ask again without it
    if (res.status === 422 && spec.loop && attempt === 0) { spec = Object.assign({}, spec, { loop: false }); continue; }
    throw new Error(name + ': ' + res.status + ' ' + body.slice(0, 200));
  }
  throw new Error(name + ': gave up after retries');
}

function writeList() {
  var names = Object.keys(SOUNDS).filter(function (n) { return fs.existsSync(path.join(DIR, n + '.mp3')); });
  var lines = names.map(function (n) { var s = SOUNDS[n]; return '    ' + JSON.stringify(n) + ': { file: ' + JSON.stringify('audio/undercroft/' + n + '.mp3') + ', volume: ' + s.volume + (s.loop ? ', loop: true' : '') + ' }'; });
  fs.writeFileSync(LIST, '/* samples.js: written by tools/make-sounds.js. The recorded effects sound.js may load; anything not here is synthesised. */\n(function () {\n  \'use strict\';\n  window.UndercroftSamples = {\n' + lines.join(',\n') + '\n  };\n})();\n');
  return names.length;
}

(async function () {
  var args = process.argv.slice(2);
  fs.mkdirSync(DIR, { recursive: true });
  if (args[0] === '--list') { console.log('listed', writeList()); return; }
  var key = process.env.ELEVENLABS_API_KEY;
  if (!key) { console.error('Set ELEVENLABS_API_KEY in the environment.'); process.exit(1); }
  var wanted = args.length ? args : Object.keys(SOUNDS).filter(function (n) { return !fs.existsSync(path.join(DIR, n + '.mp3')); });
  var made = 0, failed = [], seconds = 0;
  for (var k = 0; k < wanted.length; k++) {
    var name = wanted[k], spec = SOUNDS[name];
    if (!spec) { console.error('no such sound: ' + name); continue; }
    try { var bytes = await make(name, spec, key); made++; seconds += spec.seconds; console.log((k + 1) + '/' + wanted.length, name, Math.round(bytes / 1024) + ' KB'); }
    catch (err) { failed.push(name); console.error(String(err.message || err)); if (/401|quota|credits/i.test(String(err.message))) break; }
    await sleep(350);
  }
  console.log('made', made, 'failed', failed.join(' ') || 'none', 'seconds asked for', seconds.toFixed(1), 'listed', writeList());
})();
