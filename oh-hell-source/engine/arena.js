/* Paired single-seat match, one round size.
 *
 *   node arena.js <test> <ref> <others> <n> <deals> <seed>
 *
 * Each of test / ref / others is a weights file, or `heur` for the heuristic.
 * Every deal is played twice with the same cards and bids; the only change is
 * whether `test` or `ref` sits in one seat (rotating), with `others` in the
 * remaining three. Prints one line of JSON: gain is test minus ref in Vienna
 * points per round, ci its 95% half-width.
 */
const T = require('./table.js'), E = require('./engine.js');
const cache = {};
function policy(spec) {
  if (spec === 'heur') return T.heuristicPolicy;
  return cache[spec] || (cache[spec] = require('./net.js').loadNet(spec).policy);
}

function seatTest(test, ref, bg, n, trials, seed) {
  const P = 4, rng = E.mulberry32(seed);
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
  return { n, trials, gain: m, ci: 1.96 * Math.sqrt(Math.max(g2 / trials - m * m, 0) / trials),
           makeTest: 100 * mkT / trials, makeRef: 100 * mkR / trials };
}

if (require.main === module) {
  const [test, ref, bg, n, trials, seed] = process.argv.slice(2);
  console.log(JSON.stringify(seatTest(policy(test), policy(ref), policy(bg), Number(n), Number(trials), Number(seed))));
}
module.exports = { seatTest, policy };
