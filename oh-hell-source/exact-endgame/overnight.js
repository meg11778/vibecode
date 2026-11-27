/* Answer key, overnight (27 Nov 2026).   node overnight.js <hours>
 * Runs key.js on every processor core but one, round and round a list of table sizes, adding to results.jsonl in this
 * folder. Safe to stop with Ctrl+C and start again later: it only ever adds lines. Read with: node summary.js results.jsonl */
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const hours = +(process.argv[2] || 8), until = Date.now() + hours * 3600e3, workers = Math.max(1, os.cpus().length - 1), out = path.join(__dirname, 'results.jsonl');
// players, cards, fewest and most cards hidden in the fullest other hand
const jobs = [[4, 7, 4, 4], [4, 10, 4, 5], [5, 8, 4, 4], [6, 6, 4, 4], [4, 12, 4, 5], [5, 8, 0, 3], [6, 6, 0, 3], [5, 10, 4, 4], [4, 10, 4, 5], [4, 7, 4, 4]];
let next = 0, done = 0, lines = 0, running = 0; const t0 = Date.now(), seed0 = (Date.now() / 1000) | 0;
function launch() {
  if (Date.now() > until) { if (!running) { console.log('Finished. ' + lines + ' decisions added to results.jsonl'); } return; }
  const k = next++, [P, n, lo, hi] = jobs[k % jobs.length], seed = seed0 + k * 17;
  const ch = spawn(process.execPath, [path.join(__dirname, 'key.js'), P, n, 4, seed, hi, 30, 10], { env: Object.assign({}, process.env, { MINLEFT: String(lo), OHHELL_PAGE: path.join(__dirname, 'ohhell-play.html') }), stdio: ['ignore', 'pipe', 'inherit'] });
  running++; let buf = '';
  // each decision is saved the moment it is finished
  ch.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (l.startsWith('{') && l.endsWith('}')) { fs.appendFileSync(out, l + '\n'); lines++; } } });
  ch.on('close', () => { running--; done++;
    const mins = (Date.now() - t0) / 60000; console.log(new Date().toLocaleTimeString() + '  ' + lines + ' decisions so far (' + mins.toFixed(0) + ' min; ' + Math.max(0, (until - Date.now()) / 3600e3).toFixed(1) + ' h left)'); launch(); });
}
console.log('Answer key run: ' + hours + ' hours on ' + workers + ' cores. Results go to results.jsonl. Ctrl+C stops it; nothing is lost.');
for (let w = 0; w < workers; w++) launch();
