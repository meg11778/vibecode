/* Two checks on the trained network.
 *
 *   node check.js table              net among nets, and whole-table totals
 *   node check.js exploit <who> <plan-json> [K]
 *        who = net | heur : the policy in the other three seats, and the one
 *        the best-response search is told to expect.
 *
 * Everything is paired and single-seat. A deal is played twice with identical
 * cards and bids; the only change is who sits in one seat (rotating). "gain"
 * is the test player's score minus the reference player's in that seat.
 */
const T = require('./table.js'), E = require('./engine.js');
const { brChoose } = require('./br.js');
const { loadNet } = require('./net.js');
const net = loadNet('./net_imitation.json');
const P = 4;

function seatTest(test, ref, bg, n, trials, seed) {
  const rng = E.mulberry32(seed);
  let g = 0, g2 = 0, mkT = 0, mkR = 0;
  for (let i = 0; i < trials; i++) {
    const deal = T.makeDeal(rng, P, n), bids = T.makeBids(deal.hands, deal.trump, deal.turned, P, n);
    const s = i % P;
    const a = T.playDeal(deal, bids, P, n, [0, 1, 2, 3].map(p => p === s ? ref : bg));
    const b = T.playDeal(deal, bids, P, n, [0, 1, 2, 3].map(p => p === s ? test : bg));
    const d = T.vienna(bids[s], b[s], n) - T.vienna(bids[s], a[s], n);
    g += d; g2 += d * d; if (b[s] === bids[s]) mkT++; if (a[s] === bids[s]) mkR++;
  }
  const m = g / trials;
  return { n, trials, gain: m, ci: 1.96 * Math.sqrt(Math.max(g2 / trials - m * m, 0) / trials), mkT: 100 * mkT / trials, mkR: 100 * mkR / trials };
}
const fmt = r => ` ${String(r.n).padStart(2)} | ${String(r.trials).padStart(6)} | ${((r.gain >= 0 ? '+' : '') + r.gain.toFixed(3)).padStart(7)}  ${r.ci.toFixed(3)} |  ${r.mkR.toFixed(1)}% -> ${r.mkT.toFixed(1)}%`;
const head = '  n | deals  |  gain   +/-95% |  makes: reference -> test';

const mode = process.argv[2];
if (mode === 'table') {
  const trials = Number(process.env.TRIALS || 20000);
  console.log('A. network vs heuristic in one seat, other three seats HEURISTIC\n' + head);
  for (const n of [2, 3, 4, 5, 6, 7]) console.log(fmt(seatTest(net.policy, T.heuristicPolicy, T.heuristicPolicy, n, trials, 600 + n)));
  console.log('\nB. network vs heuristic in one seat, other three seats NETWORK\n' + head);
  for (const n of [2, 3, 4, 5, 6, 7]) console.log(fmt(seatTest(net.policy, T.heuristicPolicy, net.policy, n, trials, 700 + n)));
  console.log('\nC. whole table: mean points per seat and contracts made\n  n | all heuristic        | all network');
  for (const n of [2, 3, 4, 5, 6, 7]) {
    const rng = E.mulberry32(800 + n); const acc = [[0, 0], [0, 0]];
    for (let i = 0; i < trials; i++) {
      const deal = T.makeDeal(rng, P, n), bids = T.makeBids(deal.hands, deal.trump, deal.turned, P, n);
      [T.heuristicPolicy, net.policy].forEach((pol, k) => {
        const w = T.playDeal(deal, bids, P, n, [pol, pol, pol, pol]);
        for (let p = 0; p < P; p++) { acc[k][0] += T.vienna(bids[p], w[p], n); if (w[p] === bids[p]) acc[k][1]++; }
      });
    }
    const f = a => `${(a[0] / trials / P).toFixed(3)} pts  ${(100 * a[1] / trials / P).toFixed(1)}%`;
    console.log(` ${String(n).padStart(2)} | ${f(acc[0]).padEnd(20)} | ${f(acc[1])}`);
  }
} else {
  const who = process.argv[3], plan = JSON.parse(process.argv[4]), K = Number(process.argv[5] || 30);
  const bg = who === 'net' ? net.policy : T.heuristicPolicy;
  const prng = E.mulberry32(4242);
  const br = obs => brChoose(who === 'net' ? Object.assign({}, obs, { oppObs: net.policy }) : obs,
                             obs.trump, obs.n, obs.P, K, prng, E.chooseCard);
  console.log(`best-response player vs the ${who === 'net' ? 'NETWORK' : 'HEURISTIC'} in one seat, other three seats the same; search told to expect them\n` + head);
  for (const [n, t] of plan) console.log(fmt(seatTest(br, bg, bg, n, t, 900 + n)));
}
