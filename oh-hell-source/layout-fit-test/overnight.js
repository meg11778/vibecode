/* Imagined layouts that fit the bids: the overnight run.
 *
 *   node overnight.js [hours]          (default 8)
 *
 * When a card-reading bot imagines the hidden hands it looks for layouts that fit the bids. When its search budget
 * runs out it fills up with layouts that ignore the bids; on big or overbid deals that is most of them, and they make
 * the table look softer than it is. One card-reading bot at a table of the game's bidders and plain-network players
 * plays the same deals four ways:
 *   A  the game today: fill up with layouts that ignore the bids
 *   B  use only the layouts that fit
 *   C  use only the layouts that fit, and keep searching (up to 10 times as long) until at least 60 fit
 *   D  ten times the search budget, then fill up (slow: the yardstick)
 * Works through six table sizes in passes, on every processor core but two, until the time is up. Each finished
 * batch is added to results.jsonl at once, so stopping early (Ctrl+C) loses only the batches in progress, and running
 * it again carries on. Send back results.jsonl.   node summary.js prints the table so far.
 * Built on Jim Agniel's Oh Hell bid calculator (GNU GPL v3), modified by Matt Glassman.
 */
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const HOURS = +(process.argv[2] || 8), BATCH = +(process.argv[3] || 40), WORKERS = +(process.argv[4] || process.env.WORKERS || Math.max(1, os.cpus().length - 2));
const RES = path.join(__dirname, 'results.jsonl'), LOG = path.join(__dirname, 'log.txt'), end = Date.now() + HOURS * 3600e3;
const cells = [[4, 6], [4, 8], [4, 10], [5, 5], [5, 8], [6, 6]];
const MODES = '[{},{"strict":true},{"strict":true,"minFit":60,"extra":10},{"tries":300}]';
const done = {}; if (fs.existsSync(RES)) for (const l of fs.readFileSync(RES, 'utf8').split('\n')) { if (!l.trim()) continue; try { const r = JSON.parse(l), k = r.P + ':' + r.n; (done[k] = done[k] || []).push(r.seed); } catch (e) {} }
const log = m => { const line = new Date().toLocaleString() + '  ' + m; console.log(line); fs.appendFileSync(LOG, line + '\n'); };
let pass = 0, queue = [], running = 0, finished = 0, dealsDone = 0, stopping = false; const t0 = Date.now();
function fill() { pass++; for (const [P, n] of cells) { const seed = 88000000 + P * 1000000 + n * 10000 + pass; if (!(done[P + ':' + n] || []).includes(seed)) queue.push([P, n, seed]); } }
function next() {
  if (stopping || Date.now() >= end) { if (!running) finish(); return; }
  while (running < WORKERS) {
    if (!queue.length) { fill(); if (!queue.length) continue; log('pass ' + pass + ' started (' + dealsDone + ' deals so far, ' + ((end - Date.now()) / 3600e3).toFixed(1) + ' hours left)'); }
    const [P, n, seed] = queue.shift(); running++;
    const ch = spawn(process.execPath, [path.join(__dirname, 'arena_fit.js'), P, n, BATCH, seed, MODES].map(String), { stdio: ['ignore', 'pipe', 'inherit'] }); let out = '';
    ch.stdout.on('data', d => out += d);
    ch.on('close', code => { running--; if (code === 0 && out.trim()) { let r = null; try { r = JSON.parse(out); } catch (e) {} if (r) { fs.appendFileSync(RES, JSON.stringify(r) + '\n'); finished++; dealsDone += r.deals; } } else if (!stopping) log('a batch failed (' + P + ' players, ' + n + ' cards); carrying on'); next(); });
  }
}
function finish() { log('stopped after ' + ((Date.now() - t0) / 3600e3).toFixed(2) + ' hours: ' + finished + ' batches, ' + dealsDone + ' deals this run. Results are in results.jsonl'); process.exit(0); }
process.on('SIGINT', () => { if (stopping) process.exit(1); stopping = true; log('stopping: waiting for the batches in progress (press Ctrl+C again to stop at once)'); if (!running) finish(); });
log('layouts that fit the bids: ' + HOURS + ' hours, ' + WORKERS + ' workers, batches of ' + BATCH + ' deals' + (Object.keys(done).length ? ', carrying on from an earlier run' : ''));
next();
