/* Self-play data for one generation.
 *
 *   node selfplay.js <n> <deals> <seed> <K> <out.bin> <weights.json | heur>
 *
 * Two seats (alternating which two) are "improved" seats: they play the
 * best-valued card from rollouts and write one record per real decision, in
 * the same format gen.js writes. The other two seats play the current policy,
 * or on a third of deals the heuristic, so the network keeps seeing opponents
 * that do not play like it does.
 *
 * The current policy is the network if a weights file is given, otherwise the
 * heuristic (used to start rounds the network has never been trained on).
 */

const fs = require('fs');
const T = require('./table.js');
const E = require('./engine.js');
const { rolloutValues } = require('./rollout.js');
const { F, encode, canon } = require('./encode.js');

const n = Number(process.argv[2]), deals = Number(process.argv[3]), seed = Number(process.argv[4]);
const K = Number(process.argv[5]), out = process.argv[6], src = process.argv[7] || 'heur';
const P = 4, REC = F + 1 + 104;
const current = src === 'heur' ? T.heuristicPolicy : require('./net.js').loadNet(src).policy;
const rng = E.mulberry32(seed), prng = E.mulberry32(seed ^ 0x2545f491);

const chunks = []; let count = 0;
let seatPolicies = null;                       // what each seat follows inside rollouts
function improved(obs) {
  const { legal, q } = rolloutValues(obs, seatPolicies, K, prng);
  let best = legal[0], bv = -Infinity;
  for (const c of legal) { const v = q.get(c); if (v > bv) { bv = v; best = c; } }
  if (legal.length > 1) {
    const { x, map } = encode(obs);
    const buf = Buffer.alloc(REC);
    for (let i = 0; i < F; i++) buf.writeInt8(x[i], i);
    buf.writeUInt8(canon(T.heuristicPolicy(obs), map), F);
    for (let i = 0; i < 52; i++) buf.writeInt16LE(-32768, F + 1 + 2 * i);
    for (const c of legal) buf.writeInt16LE(Math.round(q.get(c) * 100), F + 1 + 2 * canon(c, map));
    chunks.push(buf); count++;
  }
  return best;
}

const t0 = Date.now();
for (let i = 0; i < deals; i++) {
  const deal = T.makeDeal(rng, P, n);
  const bids = T.makeBids(deal.hands, deal.trump, deal.turned, P, n);
  const other = (src !== 'heur' && i % 3 === 0) ? T.heuristicPolicy : current;
  const table = [0, 1, 2, 3].map(p => ((p + i) % 2 === 0) ? improved : other);
  // inside a rollout an improved seat continues with the current policy
  seatPolicies = table.map(pol => pol === improved ? current : pol);
  T.playDeal(deal, bids, P, n, table);
}
// written under a temporary name so a run that is interrupted never leaves a
// half file that looks finished
fs.writeFileSync(out + '.part', Buffer.concat(chunks));
fs.renameSync(out + '.part', out);
console.log(`n=${n} deals=${deals} records=${count} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
