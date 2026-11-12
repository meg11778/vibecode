/* Head-to-head evaluation against the app's heuristic.
 *
 *   node evaluate.js br  [K]            best-response player (slow)
 *   node evaluate.js net [weights.json] trained network
 *
 * Paired design. Every deal is played twice with the same cards and the same
 * bids: once with the heuristic in all four seats, once with the test policy
 * in two of them (alternating which two). "gain" is how much better the test
 * seats scored than the heuristic did in those same seats on the same deal -
 * the improvement from swapping the player and nothing else. "table gap" is
 * the older measure, test seats against the heuristic seats at the same table;
 * it runs higher because a stronger player also takes points off its
 * neighbours.
 */

const T = require('./table.js');
const E = require('./engine.js');
const { brChoose } = require('./br.js');

function evaluate(makePolicy, n, trials, seed) {
  const P = 4, rng = E.mulberry32(seed), prng = E.mulberry32(seed ^ 0x5bd1e995);
  const test = makePolicy(prng);
  let gain = 0, gain2 = 0, cnt = 0, tSum = 0, hSum = 0, hCnt = 0, mkT = 0, mkB = 0;
  for (let i = 0; i < trials; i++) {
    const deal = T.makeDeal(rng, P, n);
    const bids = T.makeBids(deal.hands, deal.trump, deal.turned, P, n);
    const base = T.playDeal(deal, bids, P, n, [0, 1, 2, 3].map(() => T.heuristicPolicy));
    const pol = [0, 1, 2, 3].map(p => ((p + i) % 2 === 0) ? test : T.heuristicPolicy);
    const won = T.playDeal(deal, bids, P, n, pol);
    for (let p = 0; p < P; p++) {
      const s = T.vienna(bids[p], won[p], n);
      if (pol[p] === test) {
        const d = s - T.vienna(bids[p], base[p], n);
        gain += d; gain2 += d * d; cnt++; tSum += s;
        if (won[p] === bids[p]) mkT++;
        if (base[p] === bids[p]) mkB++;
      } else { hSum += s; hCnt++; }
    }
  }
  const m = gain / cnt, se = Math.sqrt(Math.max(gain2 / cnt - m * m, 0) / cnt);
  return { n, trials, gain: m, se, gap: tSum / cnt - hSum / hCnt, makeTest: 100 * mkT / cnt, makeBase: 100 * mkB / cnt };
}

function report(label, rows) {
  console.log(label);
  console.log('  n | deals  |  gain   +/-95%  | table gap | makes: heuristic -> test');
  console.log(' ---+--------+-----------------+-----------+-------------------------');
  for (const r of rows)
    console.log(` ${String(r.n).padStart(2)} | ${String(r.trials).padStart(6)} | ${((r.gain >= 0 ? '+' : '') + r.gain.toFixed(3)).padStart(7)}  ${(1.96 * r.se).toFixed(3)}   | ${((r.gap >= 0 ? '+' : '') + r.gap.toFixed(3)).padStart(8)}  |   ${r.makeBase.toFixed(1)}% -> ${r.makeTest.toFixed(1)}%`);
}

if (require.main === module) {
  const kind = process.argv[2] || 'net';
  const seed0 = Number(process.env.SEED || 9100);
  const rows = [];
  if (kind === 'br') {
    const K = Number(process.argv[3] || 30);
    // INFER=0 turns off inference from the auction, for comparison.
    const infer = process.env.INFER !== '0';
    const mk = prng => obs => brChoose(infer ? obs : Object.assign({}, obs, { bidCheck: null }),
                                       obs.trump, obs.n, obs.P, K, prng, E.chooseCard);
    const plan = process.env.PLAN ? JSON.parse(process.env.PLAN)
      : [[2, 3000], [3, 2500], [4, 1500], [5, 800], [6, 400], [7, 200]];
    for (const [n, t] of plan) rows.push(evaluate(mk, n, t, seed0 + n));
    report(`best-response player, ${K} sampled deals per decision, auction inference ${infer ? 'on' : 'off'}`, rows);
  } else {
    const { loadNet } = require('./net.js');
    const net = loadNet(process.argv[3] || './net_weights.json');
    const trials = Number(process.env.TRIALS || 20000);
    for (const n of [2, 3, 4, 5, 6, 7]) rows.push(evaluate(() => net.policy, n, trials, seed0 + n));
    report('network', rows);
  }
}

module.exports = { evaluate, report };
