/* Bidding network 2 against bidding network 1, as the picture inside the bid simulation.
   Every seat bids by the game's simulation with network 1 as its picture (the game as published). In one seat, on the
   same deals, the simulation is also run with network 2 as its picture. Where the two bids agree nothing changes;
   where they differ the hand is finished both ways (the seats behind bid again, then the cards are played by the
   networks) and the difference in dollars is kept.
   node netcmp.js <P> <n> <deals> <seed> [raw] */
const E = require('./load.js')('simulateBid,bidNetProbs,bidNetBid,bidNetCovers,muFor,bidAt,auctionFactor,playHandNet,playHand,netFor,vienna,mulberry32,suitOf');
const [P, n, deals, seed] = process.argv.slice(2, 6).map(Number), rng = E.mulberry32(seed);
let d1 = 0, d2 = 0, differ = 0, bid1 = 0, bid2 = 0, m1 = 0, up = 0; const bySeat = Array.from({ length: P }, () => ({ k: 0, d: 0, d2: 0, differ: 0 }));
for (let i = 0; i < deals; i++) {
  const d = [...Array(52).keys()];
  for (let k = 51; k > 0; k--) { const j = (rng() * (k + 1)) | 0; [d[k], d[j]] = [d[j], d[k]]; }
  const hands = []; for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n).sort((x, y) => x - y));
  const turned = P * n < 52 ? d[P * n] : -1, trump = turned < 0 ? -1 : E.suitOf(turned), s = i % P;
  const sim = (p, prior, net) => { E.setKnown(turned < 0 ? [] : [turned]); E.useNet(net); let B = 0; for (const x of prior) B += x;
    const mu = E.muFor(hands[p], trump, n, P, p), adj = Math.max(0, Math.min(n, mu * E.auctionFactor(n, P, B, P - p))), model = { bid: E.bidAt(adj, n, p === P - 1 ? n - B : -1), adj };
    const r = E.simulateBid(hands[p], trump, turned, n, P, p, prior.slice(), model, (seed * 7919 + i * 31 + p) >>> 0, { samples: 150, model: 'net' }); E.useNet(1); return r.bid != null ? r.bid : model.bid; };
  const prior = []; for (let p = 0; p < s; p++) prior.push(sim(p, prior, 1));
  const b1 = sim(s, prior, 1), b2 = sim(s, prior, 2); bid1 += b1; bid2 += b2; bySeat[s].k++;
  if (b1 === b2) continue;
  differ++; bySeat[s].differ++; if (b2 > b1) up++;
  const finish = bd => { const bids = prior.concat([bd]); for (let p = s + 1; p < P; p++) bids.push(sim(p, bids, 1)); E.setKnown(turned < 0 ? [] : [turned]);
    const won = E.netFor(P, n, trump) ? E.playHandNet(hands, bids, trump, P, n, turned) : E.playHand(hands, bids, trump, P, n); let tot = 0; for (let p = 0; p < P; p++) tot += E.vienna(bids[p], won[p], n);
    return E.vienna(bd, won[s], n) - tot / P; };
  const df = finish(b2) - finish(b1); d1 += df; d2 += df * df; bySeat[s].d += df; bySeat[s].d2 += df * df;
}
const out = { P, n, deals, seed, differ, up, d: d1, d2, bid1, bid2, bySeat };
if (process.argv[6] === 'raw') console.log(JSON.stringify(out));
else { const m = d1 / deals; console.log(P + ' players ' + n + ' cards, ' + deals + ' deals: bids differ ' + (100 * differ / deals).toFixed(1) + '% (network 2 higher in ' + up + ' of ' + differ + '); network 2 minus network 1 ' + (m >= 0 ? '+' : '') + m.toFixed(3) + ' ±' + (1.96 * Math.sqrt((d2 / deals - m * m) / deals)).toFixed(3) + ' a deal'); }
