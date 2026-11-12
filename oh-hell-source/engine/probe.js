/* Paired single-seat test with the seat's bid shifted off what the bid model
 * would choose.
 *
 *   node probe.js <test> <ref> <others> <n> <deals> <seed> <delta> [K]
 *
 * test / ref / others: a weights file, `heur`, or `rollout:<weights>` (picks
 * each card by K-sample rollouts with that network, i.e. the self-play teacher).
 * delta is added to the test seat's bid; deals where that leaves 0..n are skipped.
 */
const T = require('./table.js'), E = require('./engine.js');
const { rolloutValues } = require('./rollout.js');
const { loadNet } = require('./net.js');
const [tS, rS, bS, nS, dS, sS, deltaS, KS] = process.argv.slice(2);
const n = +nS, deals = +dS, delta = +deltaS, K = +(KS || 20), P = 4;
const prng = E.mulberry32(+sS ^ 0x9e3779b9), cache = {};
function policy(spec) {
  if (spec === 'heur') return T.heuristicPolicy;
  if (spec.startsWith('rollout:')) {
    const base = policy(spec.slice(8)), pols = [base, base, base, base];
    return obs => { const { legal, q } = rolloutValues(obs, pols, K, prng);
      let best = legal[0], bv = -Infinity; for (const c of legal) { const v = q.get(c); if (v > bv) { bv = v; best = c; } } return best; };
  }
  return cache[spec] || (cache[spec] = loadNet(spec).policy);
}
const test = policy(tS), ref = policy(rS), bg = policy(bS), rng = E.mulberry32(+sS);
let g = 0, g2 = 0, cnt = 0, mkT = 0, mkR = 0, ptT = 0, ptR = 0;
for (let i = 0; i < deals; i++) {
  const deal = T.makeDeal(rng, P, n), bids = T.makeBids(deal.hands, deal.trump, deal.turned, P, n);
  const s = i % P, b2 = bids.slice(); b2[s] += delta;
  if (b2[s] < 0 || b2[s] > n) continue;
  const a = T.playDeal(deal, b2, P, n, [0, 1, 2, 3].map(p => p === s ? ref : bg));
  const b = T.playDeal(deal, b2, P, n, [0, 1, 2, 3].map(p => p === s ? test : bg));
  const sa = T.vienna(b2[s], a[s], n), sb = T.vienna(b2[s], b[s], n), d = sb - sa;
  g += d; g2 += d * d; cnt++; ptT += sb; ptR += sa; if (b[s] === b2[s]) mkT++; if (a[s] === b2[s]) mkR++;
}
const m = g / cnt;
console.log(`n=${String(n).padStart(2)} bid${delta >= 0 ? '+' : ''}${delta}  deals ${String(cnt).padStart(5)}  gain ${(m >= 0 ? '+' : '') + m.toFixed(3)} ±${(1.96 * Math.sqrt(Math.max(g2 / cnt - m * m, 0) / cnt)).toFixed(3)}   points ref ${(ptR / cnt).toFixed(2)} -> test ${(ptT / cnt).toFixed(2)}   makes ref ${(100 * mkR / cnt).toFixed(1)}% -> test ${(100 * mkT / cnt).toFixed(1)}%`);
