/* Paired single-seat match, one round size.
 *
 *   node arena.js <test> <ref> <others> <n> <deals> <seed> [offBidShare] [longSuitShare]
 *
 * Each of test / ref / others is a weights file, or `heur` for the heuristic.
 * Every deal is played twice with the same cards and bids; the only change is
 * whether `test` or `ref` sits in one seat (rotating), with `others` in the
 * remaining three. Prints one line of JSON: gain is test minus ref in dollars a
 * round ($1 a point, each seat paid its points less the table's average), ci
 * its 95% half-width.
 */
const T = require('./table.js'), E = require('./engine.js');
const cache = {};
function policy(spec) {
  if (spec === 'heur') return T.heuristicPolicy;
  return cache[spec] || (cache[spec] = require('./net.js').loadNet(spec).policy);
}

function seatTest(test, ref, bg, n, trials, seed, perturb, freak) {
  const P = 4, rng = E.mulberry32(seed);
  let g = 0, g2 = 0, mkT = 0, mkR = 0;
  for (let i = 0; i < trials; i++) {
    const { deal, bids, slack } = T.makeScenario(rng, P, n, 0, perturb, freak);
    // on a long-suit deal the test seat is the one holding the suit, two times in three
    const s = (deal.longSeat >= 0 && i % 3) ? deal.longSeat : i % P;
    const a = T.playDeal(deal, bids, P, n, [0, 1, 2, 3].map(p => p === s ? ref : bg), slack);
    const b = T.playDeal(deal, bids, P, n, [0, 1, 2, 3].map(p => p === s ? test : bg), slack);
    const money = w => { let t = 0; for (let p = 0; p < P; p++) t += T.vienna(bids[p], w[p], n); return T.vienna(bids[s], w[s], n) - t / P; };
    const d = money(b) - money(a);
    g += d; g2 += d * d; if (b[s] === bids[s]) mkT++; if (a[s] === bids[s]) mkR++;
  }
  const m = g / trials;
  return { n, trials, gain: m, ci: 1.96 * Math.sqrt(Math.max(g2 / trials - m * m, 0) / trials),
           makeTest: 100 * mkT / trials, makeRef: 100 * mkR / trials };
}

if (require.main === module) {
  const [test, ref, bg, n, trials, seed, pert, freak] = process.argv.slice(2);
  console.log(JSON.stringify(seatTest(policy(test), policy(ref), policy(bg), Number(n), Number(trials), Number(seed), Number(pert || 0), Number(freak || 0))));
}
module.exports = { seatTest, policy };
