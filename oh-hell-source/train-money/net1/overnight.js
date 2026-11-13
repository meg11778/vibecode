/* Money-scored run: four seats with a trump suit, rounds of 2 to 12 cards.
 *
 * Started by ../overnight.js; can also be run on its own (node overnight.js 5).
 *
 * The network keeps its inputs and starts from the one now in the pages. The
 * only change from the last run is what a playout is worth: the seat's points
 * less the table's average ($1 a point), not its own points. So a card that
 * busts another player, or lets one off, is valued for that. Off-model bids
 * (40% of deals) and long suits (15%) are kept. The log is in dollars a round.
 */

const fs = require('fs'), os = require('os'), path = require('path');
const { spawn, spawnSync } = require('child_process');

const HOURS = Number(process.argv[2] || process.env.HOURS || 8);     // node overnight.js 6  -> six hours
const WORKERS = Number(process.env.WORKERS || Math.max(1, os.cpus().length - 4));
const RECORDS = Number(process.env.RECORDS || 30000);
const SAMPLES = Number(process.env.SAMPLES || 20);
const PERTURB = Number(process.env.PERTURB || 0.4), FREAK = Number(process.env.FREAK || 0.15);
const HIDDEN = process.env.HIDDEN || '128,128';
const TEST_DEALS = Number(process.env.TEST_DEALS || 4000);
const EPOCHS = Number(process.env.EPOCHS || 12);
const ROUNDS = (process.env.ROUNDS || '2,3,4,5,6,7,8,9,10,11,12').split(',').map(Number);
const SEED_NET = 'net_weights.json';        // starting network, already covers rounds 2-12
const SEED_MAX_N = 12;
const KEEP = 3;                             // generations of data used for training
const HARD = [5, 8, 10, 12].filter(n => ROUNDS.includes(n));   // round sizes tested on hard deals

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
      jobs.push(['selfplay.js', n, deals, g * 100000 + n * 100 + c, SAMPLES, out, currentFor(n), PERTURB, FREAK].map(String));
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
  // hard deals: every deal off-bid, half with a long suit
  for (const n of HARD) {
    tests.push(['arena.js', cand, 'heur', currentFor(n), n, TEST_DEALS, 5000000 + g * 1000 + n, 1, 0.5].map(String));
    tests.push(['arena.js', cand, currentFor(n), currentFor(n), n, TEST_DEALS, 6000000 + g * 1000 + n, 1, 0.5].map(String));
  }
  const resAll = (await pool(tests, 'testing')).map(s => JSON.parse(s));
  const hard = resAll.splice(resAll.length - 2 * HARD.length), res = resAll;
  let sumH = 0, sumP = 0, se2 = 0;
  log('  dollars a round: $1 a point, each seat paid its points less the table average');
  log('  cards | vs rules     | vs current network | contracts made (new)');
  ROUNDS.forEach((n, i) => {
    const h = res[2 * i], p = res[2 * i + 1];
    sumH += h.gain; sumP += p.gain; se2 += (p.ci / 1.96) ** 2;
    const f = v => ((v >= 0 ? '+' : '') + v.toFixed(2)).padStart(6);
    log(`  ${String(n).padStart(5)} | ${f(h.gain)} ±${h.ci.toFixed(2)} | ${f(p.gain)} ±${p.ci.toFixed(2)}       | ${h.makeTest.toFixed(0)}%`);
  });
  const meanH = sumH / ROUNDS.length, meanP = sumP / ROUNDS.length, ciP = 1.96 * Math.sqrt(se2) / ROUNDS.length;
  let meanHd = 0, ciHd = 0;
  if (HARD.length) {
    const hc = HARD.map((n, i) => hard[2 * i + 1]);
    meanHd = hc.reduce((s, r) => s + r.gain, 0) / hc.length; ciHd = 1.96 * Math.sqrt(hc.reduce((s, r) => s + (r.ci / 1.96) ** 2, 0)) / hc.length;
    const f2 = v => (v >= 0 ? '+' : '') + v.toFixed(2);
    log('  hard deals (off-model bids, long suits), gain over the rules: ' + HARD.map((n, i) => `${n} cards ${f2(hard[2 * i].gain)}`).join(', '));
    log(`  hard deals, gain over the current network: ${f2(meanHd)} ±${ciHd.toFixed(3)}`);
  }
  // Accept unless it is measurably worse than what it replaces; a very small
  // loss on ordinary deals is allowed when it is clearly better on hard ones.
  const accept = meanP > -ciP || (HARD.length > 0 && meanP > -0.05 && meanHd > ciHd);
  log(`  average: ${meanH >= 0 ? '+' : ''}${meanH.toFixed(3)} over the rules, ${meanP >= 0 ? '+' : ''}${meanP.toFixed(3)} ±${ciP.toFixed(3)} over the current network`);
  log(accept ? `  ACCEPTED - generation ${g} is now the current network` : `  rejected - keeping the current network; its data is still used`);
  if (accept) { state.current = cand; fs.copyFileSync(cand, 'net_best.json'); }
  state.history = (state.history || []).concat([{ gen: g, vsHeuristic: +meanH.toFixed(3), vsCurrent: +meanP.toFixed(3), hardVsCurrent: +meanHd.toFixed(3), accepted: accept,
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
