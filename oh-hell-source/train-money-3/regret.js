/* How far is a network from its own teacher? At each real decision of ordinary deals (today's bidding), the teacher
   (rollouts on K fitted deals, everyone continuing with the same network) prices every legal card; the network's
   regret is the value of the teacher's pick minus the value of the card the network plays, both priced on a second,
   independent set of deals. Large regret = the
   network has not absorbed what the teacher already knows (more capacity or data would help). Small = the teacher
   is the limit.     node regret.js <weights> <n> <deals> <seed> [K=100] */
const T = require('./table.js'), E = require('./engine.js'), { rolloutValues } = require('./rollout.js');
const pol = require('./net.js').loadNet(process.argv[2]).policy, n = +process.argv[3], deals = +process.argv[4], seed = +process.argv[5], K = +(process.argv[6] || 100);
const rng = E.mulberry32(seed), prng = E.mulberry32(seed ^ 0x5bd1e995), G = {};
const add = (k, r, se) => { const g = G[k] = G[k] || { k: 0, r: 0, wrong: 0, big: 0 }; g.k++; g.r += r; g.r2 = (g.r2 || 0) + r * r; if (r !== 0) g.wrong++; if (r > 0.5) g.big++; };
for (let i = 0; i < deals; i++) { const { deal, bids, slack } = T.makeScenario(rng, 4, n, 0, 0, 0), B = bids.reduce((a, b) => a + b, 0), s = i % 4;
  const probe = obs => { const c = pol(obs); const { legal, q } = rolloutValues(obs, [pol, pol, pol, pol], K, prng); if (legal.length > 1) {
      /* Two independent sets of deals: the teacher's pick comes from the first, and both cards are priced on the second.
         (Pricing the pick on the deals that chose it would count the luck of those deals as regret.) */
      let best = legal[0], bv = -1e9; for (const x of legal) if (q.get(x) > bv) { bv = q.get(x); best = x; }
      const q2 = rolloutValues(obs, [pol, pol, pol, pol], K, prng).q, r = q2.get(best) - q2.get(c);
      add('all', r); add(B > n ? 'table over' : 'table under', r); add(obs.playedInTrick === 0 ? 'on lead' : 'following', r); if (obs.hand.length === n && obs.playedInTrick === 0) add('opening lead', r); if (obs.hand.length === n && obs.playedInTrick === 0 && B > n) add('opening lead, table over', r); } return c; };
  T.playDeal(deal, bids, 4, n, [0, 1, 2, 3].map(p => p === s ? probe : pol), slack); }
console.log(JSON.stringify({ file: process.argv[2], n, deals, K, G: Object.fromEntries(Object.entries(G).map(([k, g]) => [k, { decisions: g.k, regret: +(g.r / g.k).toFixed(3), ci: +(1.96 * Math.sqrt(Math.max(0, g.r2 / g.k - (g.r / g.k) ** 2) / g.k)).toFixed(3), differs: +(g.wrong / g.k).toFixed(2), over50c: +(g.big / g.k).toFixed(3) }])) }));
