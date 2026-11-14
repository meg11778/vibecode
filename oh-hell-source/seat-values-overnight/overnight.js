/* Seat values with simulation bidding: the overnight run.
 *
 *   node overnight.js [hours]          (default 8)
 *
 * Plays every round size at 4, 5 and 6 players with every seat bidding by the game's simulation (150 sampled
 * deals a bid) and the networks playing the cards. Works through all 31 round sizes in passes of 100 deals each,
 * using every processor core, until the time is up. Each finished batch is added to results.jsonl at once, so
 * stopping early (Ctrl+C) loses only the batches in progress, and running it again carries on from where it was.
 * Send back results.jsonl.
 */
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const HOURS = +(process.argv[2] || 8), BATCH = +(process.argv[3] || 100), WORKERS = +(process.argv[4] || os.cpus().length);
const RES = path.join(__dirname, 'results.jsonl'), LOG = path.join(__dirname, 'log.txt'), end = Date.now() + HOURS * 3600e3;
const cells = []; for (const [P, top] of [[4, 13], [5, 10], [6, 8]]) for (let n = 1; n <= top; n++) cells.push([P, n]);
const done = {}; if (fs.existsSync(RES)) for (const l of fs.readFileSync(RES, 'utf8').split('\n')) { if (!l.trim()) continue; try { const r = JSON.parse(l), k = r.P + ':' + r.n; (done[k] = done[k] || []).push(r.seed); } catch (e) {} }
const log = m => { const line = new Date().toLocaleString() + '  ' + m; console.log(line); fs.appendFileSync(LOG, line + '\n'); };
let pass = 0, queue = [], running = 0, finished = 0, dealsDone = 0, stopping = false; const t0 = Date.now();
function fill() { pass++; for (const [P, n] of cells) { const seed = P * 1000000 + n * 10000 + pass; if (!(done[P + ':' + n] || []).includes(seed)) queue.push([P, n, seed]); } }
function next() {
  if (stopping || Date.now() >= end) { if (!running) finish(); return; }
  while (running < WORKERS) {
    if (!queue.length) { fill(); if (!queue.length) continue; log('pass ' + pass + ' started (' + dealsDone + ' deals so far, ' + ((end - Date.now()) / 3600e3).toFixed(1) + ' hours left)'); }
    const [P, n, seed] = queue.shift(); running++;
    const ch = spawn(process.execPath, [path.join(__dirname, 'posmap.js'), P, n, BATCH, seed, 'sim', 'raw'].map(String), { stdio: ['ignore', 'pipe', 'inherit'] }); let out = '';
    ch.stdout.on('data', d => out += d);
    ch.on('close', code => { running--; if (code === 0 && out.trim()) { fs.appendFileSync(RES, out.trim() + '\n'); finished++; dealsDone += BATCH; } else if (!stopping) log('a batch failed (' + P + ' players, ' + n + ' cards); carrying on'); next(); });
  }
}
function finish() { log('stopped after ' + ((Date.now() - t0) / 3600e3).toFixed(2) + ' hours: ' + finished + ' batches, ' + dealsDone + ' deals this run. Results are in results.jsonl'); process.exit(0); }
process.on('SIGINT', () => { if (stopping) process.exit(1); stopping = true; log('stopping: waiting for the batches in progress (press Ctrl+C again to stop at once)'); if (!running) finish(); });
log('seat values, simulation bidding: ' + HOURS + ' hours, ' + WORKERS + ' workers, batches of ' + BATCH + ' deals' + (Object.keys(done).length ? ', carrying on from an earlier run' : ''));
next();
