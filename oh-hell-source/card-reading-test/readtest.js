/* One seat, same deals and bids, three ways: the network; the plain rollout
 * teacher; the card-reading teacher. Everyone else is the network.
 *   node readtest.js <n> <deals> <seed> [K] [beta] [eps] [Mfactor]
 * Prints one JSON line. */
const T = require('./table.js'), E = require('./engine.js');
const net = require('./net.js').loadNet('net.json');
const { readValues } = require('./reader.js');
const [n, deals, seed, Ka, ba, ea, Ma] = process.argv.slice(2).map(Number);
const K = Ka || 30, beta = ba || 1, eps = ea || 0.02, MF = Ma || 8, P = 4;
const rng = E.mulberry32(seed), prng = E.mulberry32(seed ^ 0x51ed270b);
const NETS = [net.policy, net.policy, net.policy, net.policy];
let truth = null, hitR = 0, hitP = 0, hitN = 0, essSum = 0;
const pick = r => { let b = r.legal[0], bv = -Infinity; for (const c of r.legal) { const v = r.q.get(c); if (v > bv) { bv = v; b = c; } } return b; };
const reader = obs => { const r = readValues(obs, NETS, K, prng, net, { M: MF * K, beta, eps, truth });
  if (r.hitRead != null && obs.history.length >= 8) { hitR += r.hitRead; hitP += r.hitPlain; hitN++; essSum += r.ess; } return pick(r); };
const plain = obs => pick(readValues(obs, NETS, K, prng, net, { M: K, read: false }));
const S = { rn: [0, 0], pn: [0, 0], rp: [0, 0] }, add = (a, d) => { a[0] += d; a[1] += d * d; };
let mk = [0, 0, 0];
for (let i = 0; i < deals; i++) {
  const deal = T.makeDeal(rng, P, n), bids = T.makeBids(deal.hands, deal.trump, deal.turned, P, n), s = i % P;
  const run = pol => T.playDeal(deal, bids, P, n, [0, 1, 2, 3].map(p => p === s ? pol : net.policy))[s];
  truth = null; const a = run(net.policy), c = run(plain);
  truth = deal.hands; const b = run(reader);                    // truth holds the full deal; reader.js compares against cards still held via seat lookup
  const va = T.vienna(bids[s], a, n), vb = T.vienna(bids[s], b, n), vc = T.vienna(bids[s], c, n);
  add(S.rn, vb - va); add(S.pn, vc - va); add(S.rp, vb - vc);
  if (a === bids[s]) mk[0]++; if (c === bids[s]) mk[1]++; if (b === bids[s]) mk[2]++;
}
console.log(JSON.stringify({ n, deals, K, beta, eps, MF, S, mk, hitR, hitP, hitN, essSum }));
