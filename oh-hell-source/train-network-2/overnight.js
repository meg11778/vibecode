/* Robustness run for the second network (4 seats at no trump, 5 and 6 seats).
 *
 *   node overnight.js            run for 8 hours
 *   node overnight.js 6          run for 6 hours
 *
 * Safe to stop (Ctrl+C) and start again: it picks up where it was.
 *
 * It starts from the network the last run produced and changes three things,
 * all prompted by the twelve-spade hand Matt Glassman found:
 *   - at no trump, training shuffles all four suits, so no suit is special;
 *   - on 40% of deals some seats bid one to three tricks off the bid model;
 *   - on 15% of deals one seat is dealt a long suit (more than half its
 *     cards), and half the time bids anything from 0 to all the tricks.
 * The rest is as before: play with rollouts, train, test, keep the new network
 * if it is not worse.
 *
 * Each generation is tested on ordinary deals, as before, and on "hard" deals
 * (every deal off-bid, half with a long suit). A new network is kept if it is
 * not worse on ordinary deals, or if it gives up under 0.05 points there and
 * is clearly better on the hard ones.
 *
 * Results go to gens/log.txt. The best network so far is always net_best.json.
 *
 * Settings (environment variables, all optional):
 *   WORKERS=n      parallel games; default leaves four logical processors free
 *   RECORDS=12000  decisions recorded per table per generation
 *   SAMPLES=20     sampled deals behind each card's value
 *   NOTRUMP=0.15   share of 5- and 6-seat deals played at no trump
 *   PERTURB=0.4    share of deals with off-model bids
 *   FREAK=0.15     share of deals with a long suit
 */
const fs = require('fs'), os = require('os'), path = require('path');
const { spawn, spawnSync } = require('child_process');

const HOURS = Number(process.argv[2] || process.env.HOURS || 8);
const WORKERS = Number(process.env.WORKERS || Math.max(1, os.cpus().length - 4));
const RECORDS = Number(process.env.RECORDS || 12000);
const SAMPLES = Number(process.env.SAMPLES || 20);
const NOTRUMP = Number(process.env.NOTRUMP || 0.15);
const PERTURB = Number(process.env.PERTURB || 0.4), FREAK = Number(process.env.FREAK || 0.15);
const HIDDEN = process.env.HIDDEN || '128,128';
const TEST_DEALS = Number(process.env.TEST_DEALS || 2500);
const EPOCHS = Number(process.env.EPOCHS || 12);
const CHUNKS = Number(process.env.CHUNKS || 4);
const SEED_NET = 'net_weights.json';        // the network the previous run produced
const KEEP = 3;                             // generations of data used for training
const MAXN = { 4: 13, 5: 10, 6: 8 };
const SEATS = (process.env.SEATS || '4,5,6').split(',').map(Number);
/* One table per seat count and round size. nt is the share of its deals played
   at no trump, w how much of the generation's data it gets. Four seats is no
   trump only: the 13-card round ends every game, so it gets the most; shorter
   no-trump rounds are a house rule and get less. */
const TABLES = [];
for (const P of SEATS) for (let n = 2; n <= MAXN[P]; n++) {
  if (process.env.MAXCARDS && n > +process.env.MAXCARDS && !(P === 4 && n === 13)) continue;
  TABLES.push(P === 4 ? { P, n, nt: 1, w: n === 13 ? 2 : 0.5 } : { P, n, nt: NOTRUMP, w: 1 });
}
// no-trump deals at 5 and 6 seats, tested on their own so the log shows them
const NT_TESTS = [{ P: 5, n: 5 }, { P: 5, n: 9 }, { P: 6, n: 4 }, { P: 6, n: 7 }]
  .filter(t => TABLES.some(c => c.P === t.P && c.n === t.n));

const HARD = [{ P: 4, n: 13, nt: 1 }, { P: 4, n: 8, nt: 1 }, { P: 5, n: 6, nt: NOTRUMP }, { P: 5, n: 10, nt: NOTRUMP }, { P: 6, n: 5, nt: NOTRUMP }, { P: 6, n: 8, nt: NOTRUMP }]
  .filter(t => TABLES.some(c => c.P === t.P && c.n === t.n));

process.chdir(__dirname);
fs.mkdirSync('gens', { recursive: true });
const STATE = path.join('gens', 'state.json');
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8'))
  : { gen: 1, current: null, started: new Date().toISOString() };
const save = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 1));
function log(line) { console.log(line); fs.appendFileSync(path.join('gens', 'log.txt'), line + '\n'); }

/* Which Python to call: `python` on Windows, `python3` elsewhere. */
const PY = ['python', 'python3', 'py'].find(c => {
  const r = spawnSync(c, ['-c', 'import numpy'], { stdio: 'ignore' });
  return !r.error && r.status === 0;
});
if (!PY) { console.error('Python with NumPy was not found. Run:  python -m pip install numpy'); process.exit(1); }
if (!fs.existsSync(SEED_NET)) { console.error('net_weights.json is missing from this folder.'); process.exit(1); }

/* Run a list of node jobs, WORKERS at a time. */
function pool(jobs, label) {
  return new Promise((resolve, reject) => {
    const out = new Array(jobs.length); let next = 0, live = 0, finished = 0, failed = false;
    const t0 = Date.now();
    if (!jobs.length) return resolve(out);
    const pump = () => {
      if (failed) return;
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
          if (finished === jobs.length) { process.stdout.write('\n'); return resolve(out); }
          pump();
        });
      }
    };
    pump();
  });
}

const current = () => state.current || SEED_NET;
const ntShare = t => t.nt;
const fmt = v => ((v >= 0 ? '+' : '') + v.toFixed(2)).padStart(6);
const mean = a => a.reduce((x, y) => x + y, 0) / Math.max(a.length, 1);

async function generation(g) {
  const dir = path.join('gens', `g${String(g).padStart(2, '0')}`);
  fs.mkdirSync(dir, { recursive: true });
  const tStart = Date.now();
  log(`\n=== generation ${g}   ${new Date().toLocaleString()} ===`);

  // 1. PLAY. Costliest tables first so the slow jobs are not left to the end.
  const jobs = [];
  for (const t of TABLES.slice().sort((a, b) => b.P * b.n - a.P * a.n)) {
    const deals = Math.ceil(t.w * RECORDS / CHUNKS / Math.max(1, 1.6 * t.n - 1.5));
    for (let c = 0; c < CHUNKS; c++) {
      const out = path.join(dir, `p${t.P}n${t.n}_${c}.bin`);
      if (fs.existsSync(out) && fs.statSync(out).size > 0) continue;       // finished before a restart
      const job = ['selfplay.js', t.P, t.n, deals, g * 1000000 + t.P * 10000 + t.n * 100 + c, SAMPLES, out, current(), ntShare(t), PERTURB, FREAK];
      jobs.push(job.map(String));
    }
  }
  await pool(jobs, 'playing');

  // 2. TRAIN on this generation and the ones just before it.
  const pats = [];
  for (let k = Math.max(1, g - KEEP + 1); k <= g; k++) pats.push(path.join('gens', `g${String(k).padStart(2, '0')}`, 'p*.bin'));
  const cand = path.join('gens', `net_g${String(g).padStart(2, '0')}.json`);
  process.stdout.write('  training...\n');
  const tr = spawnSync(PY, ['train.py', String(EPOCHS)], {
    env: Object.assign({}, process.env, { DATA: pats.join(';'), OUT: cand, HIDDEN, INIT: current() }),
    encoding: 'utf8', maxBuffer: 1 << 26 });
  if (tr.status !== 0) throw new Error('training failed\n' + tr.stderr);
  fs.writeFileSync(path.join(dir, 'train.txt'), tr.stdout);

  // 3. TEST on fresh deals: against the rules, and against what it would replace.
  const tests = [];
  TABLES.forEach((t, i) => {
    tests.push(['arena.js', cand, 'heur', 'heur', t.P, t.n, TEST_DEALS, 7000000 + g * 10000 + i, ntShare(t)].map(String));
    tests.push(['arena.js', cand, current(), current(), t.P, t.n, TEST_DEALS, 8000000 + g * 10000 + i, ntShare(t)].map(String));
  });
  NT_TESTS.forEach((t, i) => tests.push(['arena.js', cand, 'heur', 'heur', t.P, t.n, TEST_DEALS, 9000000 + g * 10000 + i, 1].map(String)));
  // hard deals: every deal off-bid, half with a long suit
  HARD.forEach((t, i) => {
    tests.push(['arena.js', cand, 'heur', current(), t.P, t.n, TEST_DEALS, 5000000 + g * 10000 + i, t.nt, 1, 0.5].map(String));
    tests.push(['arena.js', cand, current(), current(), t.P, t.n, TEST_DEALS, 6000000 + g * 10000 + i, t.nt, 1, 0.5].map(String));
  });
  const resAll = (await pool(tests, 'testing')).map(s => JSON.parse(s));
  const hard = resAll.splice(resAll.length - 2 * HARD.length), res = resAll;
  const vsRules = TABLES.map((t, i) => res[2 * i]), vsCur = TABLES.map((t, i) => res[2 * i + 1]);
  const nt = res.slice(2 * TABLES.length);

  const maxN = Math.max(...TABLES.map(t => t.n)), cols = []; for (let n = 2; n <= maxN; n++) cols.push(n);
  log('  gain over the rules (Vienna points a round), by cards in the round');
  log('  seats |' + cols.map(n => String(n).padStart(6)).join(''));
  for (const P of SEATS) log(`  ${(P === 4 ? '4 nt' : String(P)).padStart(5)} |` + cols.map(n => { const k = TABLES.findIndex(t => t.P === P && t.n === n); return k < 0 ? '      ' : fmt(vsRules[k].gain); }).join(''));
  if (nt.length) log('  no trump at 5 and 6 seats: ' + nt.map((r, i) => `${NT_TESTS[i].P} seats ${NT_TESTS[i].n} cards ${fmt(r.gain).trim()}`).join(', '));

  const group = P => { const idx = TABLES.map((t, i) => t.P === P ? i : -1).filter(i => i >= 0);
    return { m: mean(idx.map(i => vsCur[i].gain)), ci: 1.96 * Math.sqrt(idx.reduce((s, i) => s + (vsCur[i].ci / 1.96) ** 2, 0)) / idx.length,
             r: mean(idx.map(i => vsRules[i].gain)) }; };
  const meanP = mean(vsCur.map(r => r.gain)), ciP = 1.96 * Math.sqrt(vsCur.reduce((s, r) => s + (r.ci / 1.96) ** 2, 0)) / vsCur.length;
  const meanR = mean(vsRules.map(r => r.gain));
  const groups = {}; for (const P of SEATS) groups[P] = group(P);
  log('  gain over the current network: ' + SEATS.map(P => `${P} seats ${fmt(groups[P].m).trim()} ±${groups[P].ci.toFixed(2)}`).join(' | ')
    + ` | all ${fmt(meanP).trim()} ±${ciP.toFixed(3)}`);
  log(`  average over the rules: ` + SEATS.map(P => `${P} seats ${fmt(groups[P].r).trim()}`).join(' | ') + ` | all ${fmt(meanR).trim()}`);
  const hardR = HARD.map((t, i) => hard[2 * i]), hardC = HARD.map((t, i) => hard[2 * i + 1]);
  const meanH = mean(hardC.map(r => r.gain)), ciH = 1.96 * Math.sqrt(hardC.reduce((s, r) => s + (r.ci / 1.96) ** 2, 0)) / Math.max(hardC.length, 1);
  if (HARD.length) {
    log('  hard deals (off-model bids, long suits), gain over the rules: ' + HARD.map((t, i) => `${t.P} seats ${t.n} cards${t.nt === 1 ? ' nt' : ''} ${fmt(hardR[i].gain).trim()}`).join(', '));
    log(`  hard deals, gain over the current network: ${fmt(meanH).trim()} ±${ciH.toFixed(3)}`);
  }
  // Accept unless it is measurably worse than what it replaces; a very small
  // loss on ordinary deals is allowed when it is clearly better on hard ones.
  const accept = meanP > -ciP || (HARD.length > 0 && meanP > -0.05 && meanH > ciH);
  log(accept ? `  ACCEPTED - generation ${g} is now the current network` : `  rejected - keeping the current network; its data is still used`);
  if (accept) { state.current = cand; fs.copyFileSync(cand, 'net_best.json'); }
  state.history = (state.history || []).concat([{ gen: g, vsRules: +meanR.toFixed(3), vsCurrent: +meanP.toFixed(3), hardVsCurrent: +meanH.toFixed(3), accepted: accept,
    bySeats: Object.fromEntries(SEATS.map(P => [P, { vsRules: +groups[P].r.toFixed(3), vsCurrent: +groups[P].m.toFixed(3) }])),
    minutes: +((Date.now() - tStart) / 60000).toFixed(1) }]);
  state.gen = g + 1; save();

  // data older than the training window is no longer read; remove it to save disk
  const old = path.join('gens', `g${String(g - KEEP).padStart(2, '0')}`);
  if (g - KEEP >= 1 && fs.existsSync(old)) for (const f of fs.readdirSync(old)) if (f.endsWith('.bin')) fs.unlinkSync(path.join(old, f));
  log(`  generation took ${((Date.now() - tStart) / 60000).toFixed(1)} minutes`);
}

(async () => {
  const until = Date.now() + HOURS * 3600e3;
  console.log(`self-play: ${TABLES.length} tables, ${WORKERS} parallel games, ${RECORDS} decisions per table, stopping after ${HOURS} hours. Ctrl+C to stop sooner.`);
  while (Date.now() < until) await generation(state.gen);
  log(`\nstopped after ${HOURS} hours. Best network: net_best.json`);
})().catch(e => { console.error('\n' + e.message); process.exit(1); });
