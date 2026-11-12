/* Teacher data.
 *
 *   node gen.js <n> <deals> <seed> <K> <out.bin>
 *
 * Deals are played at a four-seat table with the best-response player in two
 * seats (alternating which two) and the heuristic in the others. Every time a
 * teacher seat has a real choice, one record is written:
 *
 *   x   int8[262]   what the seat could see, encoded (see encode.js)
 *   h   uint8       the card the heuristic would have played, canonical index
 *   q   int16[52]   the teacher's value for each card in hundredths of a Vienna
 *                   point, canonical index; -32768 marks a card not legal
 *
 * Keeping the whole value vector rather than just the chosen card matters:
 * many plays are exactly equivalent (touching cards, a forced loser), and the
 * values say so where a single label would pretend one of them was right.
 */

const fs = require('fs');
const T = require('./table.js');
const E = require('./engine.js');
const { brValues } = require('./br.js');
const { F, encode, canon } = require('./encode.js');

const n = Number(process.argv[2]), deals = Number(process.argv[3]), seed = Number(process.argv[4]);
const K = Number(process.argv[5] || 40), out = process.argv[6];
const P = 4, REC = F + 1 + 104;
const rng = E.mulberry32(seed), prng = E.mulberry32(seed ^ 0x2545f491);

const chunks = []; let count = 0;
function teacher(obs) {
  const { legal, q } = brValues(obs, obs.trump, n, P, K, prng, E.chooseCard);
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
  T.playDeal(deal, bids, P, n, [0, 1, 2, 3].map(p => ((p + i) % 2 === 0) ? teacher : T.heuristicPolicy));
}
fs.writeFileSync(out, Buffer.concat(chunks));
console.log(`n=${n}  deals=${deals}  records=${count}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
