/* Self-play data for one generation, one table size and round size.
 *
 *   node selfplay.js <seats> <n> <deals> <seed> <K> <out.bin> <weights.json | heur> [noTrumpShare] [offBidShare] [longSuitShare]
 *
 * Two seats (every other one, alternating which) are "improved" seats: they
 * play the best-valued card from rollouts and write one record per real
 * decision. The remaining seats play the current policy, or on a third of
 * deals the rules, so the network keeps meeting opponents that do not play
 * like it does. A share of deals is played at no trump; a round that deals the
 * whole deck always is. offBidShare and longSuitShare are the shares of deals
 * with bids pushed off the bid model and with a long suit dealt to one seat
 * (table.js, makeScenario).
 *
 * Record:  x  int8[F]    what the seat could see (encode.js)
 *          h  uint8      the card the rules would have played, canonical index
 *          q  int16[52]  value of each card in hundredths of a Vienna point,
 *                        canonical index; -32768 marks a card not legal
 */
const fs = require('fs');
const T = require('./table.js');
const E = require('./engine.js');
const { rolloutValues } = require('./rollout.js');
const { F, encode, canon } = require('./encode.js');

const [Ps, ns, ds, ss, Ks, out, srcArg, ntS, pertS, freakS] = process.argv.slice(2);
const ntSrcArg = null, PERTURB = +(pertS || 0), FREAK = +(freakS || 0);
const P = +Ps, n = +ns, deals = +ds, seed = +ss, K = +Ks, src = srcArg || 'heur', ntShare = +(ntS || 0);
const REC = F + 1 + 104;
const load = spec => spec === 'heur' ? T.heuristicPolicy : require('./net.js').loadNet(spec).policy;
const currentT = load(src), currentNT = ntSrcArg ? load(ntSrcArg) : currentT;
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
  const { deal, bids, slack } = T.makeScenario(rng, P, n, ntShare, PERTURB, FREAK);
  const current = deal.trump < 0 ? currentNT : currentT;
  const other = (current !== T.heuristicPolicy && i % 3 === 0) ? T.heuristicPolicy : current;
  const table = [];
  for (let p = 0; p < P; p++) table.push(((p + i) % 2 === 0) ? improved : other);
  // inside a rollout an improved seat continues with the current policy
  seatPolicies = table.map(pol => pol === improved ? current : pol);
  T.playDeal(deal, bids, P, n, table, slack);
}
// written under a temporary name so an interrupted run never leaves a half file
fs.writeFileSync(out + '.part', Buffer.concat(chunks));
fs.renameSync(out + '.part', out);
console.log(`seats=${P} n=${n} deals=${deals} records=${count} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
