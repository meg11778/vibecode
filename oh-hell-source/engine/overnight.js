/* Self-play training, built to be left running.
 *
 *   node overnight.js            run for 8 hours
 *   node overnight.js 6          run for 6 hours
 *
 * Repeats one generation after another until HOURS have passed or you press
 * Ctrl+C. Safe to stop at any time and start again: it picks up at the
 * generation it was on and reuses whatever that generation had finished.
 *
 * One generation:
 *   1. PLAY   every round size from 2 to 12 cards. Two seats choose each card
 *             by rollouts with the current network and record the value of
 *             every card they could have played.
 *   2. TRAIN  a new network on those values (this and the two generations
 *             before it), starting from the current network.
 *   3. TEST   the new network against the current one, and against the
 *             heuristic, on fresh deals. It replaces the current network only
 *             if it is not worse.
 *
 * Results go to gens/log.txt. The best network so far is always net_best.json.
 *
 * Settings (environment variables, all optional):
 *   HOURS=8        stop starting new generations after this long
 *   WORKERS=n      parallel games; default leaves four logical processors free
 *   RECORDS=30000  decisions recorded per round size per generation
 *   SAMPLES=20     sampled deals behind each card's value
 *   HIDDEN=128,128 network size
 */

const fs = require('fs'), os = require('os'), path = require('path');
const { spawn, spawnSync } = require('child_process');

const HOURS = Number(process.argv[2] || process.env.HOURS || 8);     // node overnight.js 6  -> six hours
const WORKERS = Number(process.env.WORKERS || Math.max(1, os.cpus().length - 4));
const RECORDS = Number(process.env.RECORDS || 30000);
const SAMPLES = Number(process.env.SAMPLES || 20);
const HIDDEN = process.env.HIDDEN || '128,128';
const TEST_DEALS = Number(process.env.TEST_DEALS || 4000);
const EPOCHS = Number(process.env.EPOCHS || 12);
const ROUNDS = (process.env.ROUNDS || '2,3,4,5,6,7,8,9,10,11,12').split(',').map(Number);
const SEED_NET = 'net_weights.json';        // starting network, already covers rounds 2-12
const SEED_MAX_N = 12;
const KEEP = 3;                             // generations of data used for training

process.chdir(__dirname);
fs.mkdirSync('gens', { recursive: true });
const STATE = path.join('gens', 'state.json');
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8'))
  : { gen: 1, current: null, started: new Date().toISOString() };
const save = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 1));

function log(line) {
  console.log(line);
  fs.appendFileSync(path.join('gens', 'log.txt'), line + '\n');
}

/* Which Python to call: `python` on Windows, `python3` elsewhere. */
const PY = ['python', 'python3', 'py'].find(c => {
  const r = spawnSync(c, ['-c', 'import numpy'], { stdio: 'ignore' });
  return !r.error && r.status === 0;
});
if (!PY) { console.error('Python with NumPy was not found. Run:  python -m pip install numpy'); process.exit(1); }

/* Run a list of jobs, WORKERS at a time. A job is { args, done? } for node. */
function pool(jobs, label) {
  return new Promise((resolve, reject) => {
    const out = new Array(jobs.length); let next = 0, live = 0, finished = 0, failed = false;
    const t0 = Date.now();
    const pump = () => {
      if (failed) return;
      if (finished === jobs.length) return resolve(out);
      while (live < WORKERS && next < jobs.length) {
        const i = next++; live++;
        const ch = spawn(process.execPath, jobs[i], { stdio: ['ignore', 'pipe', 'pipe'] });
        let so = '', se = '';
        ch.stdout.on('data', d => so += d); ch.stderr.on('data', d => se += d);
        ch.on('close', code => {
          live--; finished++;
          if (code !== 0) { failed = true; return reject(new Error(`${jobs[i].join(' ')}\n${se}`)); }
          out[i] = so.trim();
          process.stdout.write(`\r  ${label}: ${finished}/${jobs.length}  (${((Date.now() - t0) / 60000).toFixed(1)} min)   `);
          if (finished === jobs.length) process.stdout.write('\n');
          pump();
        });
      }
    };
    pump();
  });
}

/* The policy that plays round size n right now. Before the first generation
   that is the starting network; the heuristic stands in for any round size it
   does not cover. */
function currentFor(n) {
  if (state.current) return state.current;
  return (n <= SEED_MAX_N && fs.existsSync(SEED_NET)) ? SEED_NET : 'heur';
}

async function generation(g) {
  const dir = path.join('gens', `g${String(g).padStart(2, '0')}`);
  fs.mkdirSync(dir, { recursive: true });
  const tStart = Date.now();
  log(`\n=== generation ${g}   ${new Date().toLocaleString()} ===`);

  // 1. PLAY. Long rounds first so the slow jobs are not left to the end.
  const CHUNKS = 8, jobs = [];
  for (const n of ROUNDS.slice().sort((a, b) => b - a)) {
    const deals = Math.ceil(RECORDS / CHUNKS / Math.max(1, 1.6 * n - 1.5));
    for (let c = 0; c < CHUNKS; c++) {
      const out = path.join(dir, `n${n}_${c}.bin`);
      if (fs.existsSync(out) && fs.statSync(out).size > 0) continue;       // finished before a restart
      jobs.push(['selfplay.js', n, deals, g * 100000 + n * 100 + c, SAMPLES, out, currentFor(n)].map(String));
    }
  }
  await pool(jobs, 'playing');

  // 2. TRAIN on this generation and the ones just before it.
  const pats = [];
  for (let k = Math.max(1, g - KEEP + 1); k <= g; k++) pats.push(path.join('gens', `g${String(k).padStart(2, '0')}`, 'n*.bin'));
  const cand = path.join('gens', `net_g${String(g).padStart(2, '0')}.json`);
  process.stdout.write('  training...\n');
  const tr = spawnSync(PY, ['train.py', String(EPOCHS)], {
    env: Object.assign({}, process.env, { DATA: pats.join(';'), OUT: cand, HIDDEN, INIT: state.current || SEED_NET }),
    encoding: 'utf8', maxBuffer: 1 << 26 });
  if (tr.status !== 0) throw new Error('training failed\n' + tr.stderr);
  fs.writeFileSync(path.join(dir, 'train.txt'), tr.stdout);

  // 3. TEST on fresh deals: against the heuristic, and against what it would replace.
  const tests = [];
  for (const n of ROUNDS) {
    tests.push(['arena.js', cand, 'heur', 'heur', n, TEST_DEALS, 7000000 + g * 1000 + n].map(String));
    tests.push(['arena.js', cand, currentFor(n), currentFor(n), n, TEST_DEALS, 8000000 + g * 1000 + n].map(String));
  }
  const res = (await pool(tests, 'testing')).map(s => JSON.parse(s));
  let sumH = 0, sumP = 0, se2 = 0;
  log('  cards | vs heuristic | vs current network | contracts made (new)');
  ROUNDS.forEach((n, i) => {
    const h = res[2 * i], p = res[2 * i + 1];
    sumH += h.gain; sumP += p.gain; se2 += (p.ci / 1.96) ** 2;
    const f = v => ((v >= 0 ? '+' : '') + v.toFixed(2)).padStart(6);
    log(`  ${String(n).padStart(5)} | ${f(h.gain)} ±${h.ci.toFixed(2)} | ${f(p.gain)} ±${p.ci.toFixed(2)}       | ${h.makeTest.toFixed(0)}%`);
  });
  const meanH = sumH / ROUNDS.length, meanP = sumP / ROUNDS.length, ciP = 1.96 * Math.sqrt(se2) / ROUNDS.length;
  // Accept unless it is measurably worse than what it replaces.
  const accept = meanP > -ciP;
  log(`  average: ${meanH >= 0 ? '+' : ''}${meanH.toFixed(3)} over the heuristic, ${meanP >= 0 ? '+' : ''}${meanP.toFixed(3)} ±${ciP.toFixed(3)} over the current network`);
  log(accept ? `  ACCEPTED - generation ${g} is now the current network` : `  rejected - keeping the current network; its data is still used`);
  if (accept) { state.current = cand; fs.copyFileSync(cand, 'net_best.json'); }
  state.history = (state.history || []).concat([{ gen: g, vsHeuristic: +meanH.toFixed(3), vsCurrent: +meanP.toFixed(3), accepted: accept,
    minutes: +((Date.now() - tStart) / 60000).toFixed(1) }]);
  state.gen = g + 1; save();

  // data older than the training window is no longer read; remove it to save disk
  const old = path.join('gens', `g${String(g - KEEP).padStart(2, '0')}`);
  if (g - KEEP >= 1 && fs.existsSync(old)) for (const f of fs.readdirSync(old)) if (f.endsWith('.bin')) fs.unlinkSync(path.join(old, f));
  log(`  generation took ${((Date.now() - tStart) / 60000).toFixed(1)} minutes`);
}

(async () => {
  const until = Date.now() + HOURS * 3600e3;
  console.log(`self-play: ${WORKERS} parallel games, ${RECORDS} decisions per round size, stopping after ${HOURS} hours. Ctrl+C to stop sooner.`);
  while (Date.now() < until) await generation(state.gen);
  log(`\nstopped after ${HOURS} hours. Best network: net_best.json`);
})().catch(e => { console.error('\n' + e.message); process.exit(1); });
