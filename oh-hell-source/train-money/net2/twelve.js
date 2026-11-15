/* Matt's twelve-spades hand at no trump, in money: seat 0 (leads) holds every spade but the 3, and the 2 of diamonds,
   and has bid `bid`. The other seats' cards are dealt at random and they bid by formula. Which network earns more? */
const T = require('./table.js'), E = require('./engine.js'), { policy } = require('./arena.js');
const [bidS, trialsS] = process.argv.slice(2), bid = +bidS, trials = +trialsS, P = 4, n = 13, rng = E.mulberry32(7);
const mine = [2 * 13 + 0]; for (let r = 2; r <= 14; r++) if (r !== 3) mine.push(r - 2); mine.sort((a, b) => a - b);
const nets = { points: policy('net_weights.json'), money: policy('new.json') }, S = {}; for (const k in nets) S[k] = { m: 0, m2: 0, made: 0, tr: 0, bust: 0 };
for (let i = 0; i < trials; i++) {
  const rest = [...Array(52).keys()].filter(c => !mine.includes(c)); for (let k = rest.length - 1; k > 0; k--) { const j = (rng() * (k + 1)) | 0; [rest[k], rest[j]] = [rest[j], rest[k]]; }
  const hands = [mine.slice(), rest.slice(0, 13).sort((a, b) => a - b), rest.slice(13, 26).sort((a, b) => a - b), rest.slice(26, 39).sort((a, b) => a - b)], deal = { hands, turned: -1, trump: -1, longSeat: 0 };
  E.setKnown([]); const bids = [bid]; let B = bid;
  for (let p = 1; p < P; p++) { const mu = E.muFor(hands[p], -1, n, P, p) * E.auctionFactor(n, P, B, P - p), b = E.bidAt(Math.max(0, Math.min(n, mu)), n, p === P - 1 ? n - B : -1); bids.push(b); B += b; }
  for (const k in nets) { const w = T.playDeal(deal, bids, P, n, [nets[k], nets.points, nets.points, nets.points], [n, 0, 0, 0]); let t = 0, bust = 0; for (let p = 0; p < P; p++) { t += T.vienna(bids[p], w[p], n); if (p > 0 && w[p] !== bids[p]) bust++; }
    const m = T.vienna(bids[0], w[0], n) - t / P, s = S[k]; s.m += m; s.m2 += m * m; if (w[0] === bid) s.made++; s.tr += w[0]; s.bust += bust; }
}
for (const k in S) { const s = S[k], m = s.m / trials; console.log(`bid ${bid}, ${k}-trained network: $${m.toFixed(2)} ±${(1.96 * Math.sqrt((s.m2 / trials - m * m) / trials)).toFixed(2)} a deal | makes its bid ${(100 * s.made / trials).toFixed(0)}% | takes ${(s.tr / trials).toFixed(1)} tricks | other seats busted ${(s.bust / trials).toFixed(2)} of 3`); }
