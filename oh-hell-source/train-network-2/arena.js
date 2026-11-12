/* Paired single-seat match, one table size and round size.
 *
 *   node arena.js <test> <ref> <others> <seats> <n> <deals> <seed> [noTrumpShare] [offBidShare] [longSuitShare]
 *
 * Each of test / ref / others is a weights file, or `heur` for the rules.
 * Every deal is played twice with the same cards and bids; the only change is
 * whether `test` or `ref` sits in one seat (rotating), with `others` in the
 * rest. Prints one line of JSON: gain is test minus ref in Vienna points per
 * round, ci its 95% half-width.
 */
const T = require('./table.js'), E = require('./engine.js');
const cache = {};
function policy(spec) {
  if (spec === 'heur') return T.heuristicPolicy;
  return cache[spec] || (cache[spec] = require('./net.js').loadNet(spec).policy);
}
function seatTest(test, ref, bg, P, n, trials, seed, ntShare, perturb, freak) {
  const rng = E.mulberry32(seed);
  let g = 0, g2 = 0, mkT = 0, mkR = 0;
  for (let i = 0; i < trials; i++) {
    const { deal, bids, slack } = T.makeScenario(rng, P, n, ntShare, perturb, freak);
    // on a long-suit deal the test seat is the one holding the suit, two times in three
    const s = (deal.longSeat >= 0 && i % 3) ? deal.longSeat : i % P, seats = [...Array(P).keys()];
    const a = T.playDeal(deal, bids, P, n, seats.map(p => p === s ? ref : bg), slack);
    const b = T.playDeal(deal, bids, P, n, seats.map(p => p === s ? test : bg), slack);
    const d = T.vienna(bids[s], b[s], n) - T.vienna(bids[s], a[s], n);
    g += d; g2 += d * d; if (b[s] === bids[s]) mkT++; if (a[s] === bids[s]) mkR++;
  }
  const m = g / trials;
  return { P, n, trials, gain: m, ci: 1.96 * Math.sqrt(Math.max(g2 / trials - m * m, 0) / trials),
           makeTest: 100 * mkT / trials, makeRef: 100 * mkR / trials };
}
if (require.main === module) {
  const [test, ref, bg, P, n, trials, seed, nt, pert, freak] = process.argv.slice(2);
  console.log(JSON.stringify(seatTest(policy(test), policy(ref), policy(bg), +P, +n, +trials, +seed, +(nt || 0), +(pert || 0), +(freak || 0))));
}
module.exports = { seatTest, policy };
