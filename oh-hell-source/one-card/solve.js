/* One-card Oh Hell, solved numerically.
   P players each get one card; one more card is turned for trump. Seat 0 (left of the dealer) bids first and leads;
   seat P-1 is the dealer and may not make the bids total 1 (the hook). Nobody has a choice of card, so the game is
   the bidding alone. Vienna scoring: bid 1 and take it 11, bid 0 and take none 6, bid 0 and take it 1, bid 1 and
   miss 0. Payoff in dollars: own points less the table's average.

   What a player knows that matters: its own card, as one of 25 types - a trump with h higher trumps still out
   (h = 0..11; the turned card is gone, so 12 trumps remain and its rank does not matter), or a non-trump of rank
   2..A - and the bids so far.

   Method: chance-sampled counterfactual regret minimisation (CFR+ with linear averaging). With more than two players
   this is not guaranteed to reach an equilibrium, so the result is checked: for each seat, the most it could gain by
   changing its own strategy alone (best response), on a separate sample of deals.

     node solve.js <players> <iterations> <checkDeals> [seed]                                                     */
const P = +process.argv[2], ITER = +process.argv[3], CHECK = +process.argv[4], SEED = +(process.argv[5] || 1);
let s = SEED >>> 0; const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
// deck after the turned card: 12 trumps (0..11, 0 highest), then 3 side suits x 13 ranks (12 + suit*13 + rank, rank 12 = ace)
const type = c => c < 12 ? c : 12 + (c - 12) % 13;                       // 0..11 trump by higher-count, 12..24 non-trump rank 2..A
const NT = 25, deck = Int32Array.from({ length: 51 }, (_, i) => i), card = new Int32Array(P), ty = new Int32Array(P);
function deal() { for (let i = 0; i < P; i++) { const j = i + ((rnd() * (51 - i)) | 0), t = deck[i]; deck[i] = deck[j]; deck[j] = t; card[i] = deck[i]; ty[i] = type(card[i]); }
  let w = -1, best = 99; for (let i = 0; i < P; i++) if (card[i] < 12 && card[i] < best) { best = card[i]; w = i; }
  if (w < 0) { const suit = ((card[0] - 12) / 13) | 0; let hi = -1; for (let i = 0; i < P; i++) if (card[i] >= 12 && (((card[i] - 12) / 13) | 0) === suit && (card[i] - 12) % 13 > hi) { hi = (card[i] - 12) % 13; w = i; } }
  return w; }
// information sets: seat i, bids so far (i bits, seat 0 lowest), type
const off = []; { let o = 0; for (let i = 0; i < P; i++) { off.push(o); o += (1 << i) * NT; } off.push(o); }
const NI = off[P], regret = new Float64Array(NI * 2), ssum = new Float64Array(NI * 2);
const idx = (i, h, t) => off[i] + h * NT + t;
const pop = h => { let c = 0; while (h) { c += h & 1; h >>= 1; } return c; };
const legal = (i, h) => i < P - 1 ? 3 : (pop(h) === 0 ? 1 : pop(h) === 1 ? 2 : 3);     // bit 0: may bid 0; bit 1: may bid 1
const pts = (b, w) => b === w ? (b ? 11 : 6) : w;
const util = new Float64Array(P);
function leaf(h, w, out) { let tot = 0; for (let i = 0; i < P; i++) { out[i] = pts((h >> i) & 1, i === w ? 1 : 0); tot += out[i]; } tot /= P; for (let i = 0; i < P; i++) out[i] -= tot; }
function stratAt(I, lg, cur) { if (lg !== 3) return lg === 1 ? 0 : 1; if (!cur) { const a = ssum[2 * I], b = ssum[2 * I + 1]; return a + b > 0 ? b / (a + b) : 0.5; }
  const a = Math.max(regret[2 * I], 0), b = Math.max(regret[2 * I + 1], 0); return a + b > 0 ? b / (a + b) : 0.5; }     // probability of bidding 1
/* CFR: returns utilities for all players in out; reach[i] is player i's own reach probability */
const reach = new Float64Array(P), bufs = Array.from({ length: P + 1 }, () => [new Float64Array(P), new Float64Array(P)]);
function cfr(i, h, w, out, wt) {
  if (i === P) return leaf(h, w, out);
  const I = idx(i, h, ty[i]), lg = legal(i, h), p1 = stratAt(I, lg, true), u0 = bufs[i][0], u1 = bufs[i][1], r = reach[i];
  if (lg & 1) { reach[i] = r * (1 - p1); cfr(i + 1, h, w, u0, wt); }
  if (lg & 2) { reach[i] = r * p1; cfr(i + 1, h | (1 << i), w, u1, wt); }
  reach[i] = r;
  for (let k = 0; k < P; k++) out[k] = (lg & 1 ? (1 - p1) * u0[k] : 0) + (lg & 2 ? p1 * u1[k] : 0);
  if (lg === 3) { let cf = 1; for (let k = 0; k < P; k++) if (k !== i) cf *= reach[k];
    regret[2 * I] = Math.max(regret[2 * I] + cf * (u0[i] - out[i]), 0); regret[2 * I + 1] = Math.max(regret[2 * I + 1] + cf * (u1[i] - out[i]), 0);
    ssum[2 * I] += wt * r * (1 - p1); ssum[2 * I + 1] += wt * r * p1; }
}
const out = new Float64Array(P);
for (let it = 1; it <= ITER; it++) { const w = deal(); reach.fill(1); cfr(0, 0, w, out, it); }
/* check: value of the average strategy and each seat's best response to it */
const val = new Float64Array(P), br = new Float64Array(NI * 2), visits = new Float64Array(NI);
function evalAvg(i, h, w, out2, depthBuf) { if (i === P) return leaf(h, w, out2);
  const I = idx(i, h, ty[i]), lg = legal(i, h), p1 = stratAt(I, lg, false), u0 = depthBuf[i][0], u1 = depthBuf[i][1];
  if (lg & 1) evalAvg(i + 1, h, w, u0, depthBuf); if (lg & 2) evalAvg(i + 1, h | (1 << i), w, u1, depthBuf);
  for (let k = 0; k < P; k++) out2[k] = (lg & 1 ? (1 - p1) * u0[k] : 0) + (lg & 2 ? p1 * u1[k] : 0); }
const eb = Array.from({ length: P + 1 }, () => [new Float64Array(P), new Float64Array(P)]), tmp = new Float64Array(P);
function walk(i, h, w, pr) {            // pr[k]: probability the seats before i other than k produced h  (one array of P numbers)
  if (i === P) return;
  const I = idx(i, h, ty[i]), lg = legal(i, h), p1 = stratAt(I, lg, false);
  for (let a = 0; a < 2; a++) if (lg & (1 << a)) { evalAvg(i + 1, a ? h | (1 << i) : h, w, tmp, eb); br[2 * I + a] += pr[i] * tmp[i]; }
  let all = 1; for (let k = 0; k < i; k++) all = 0; visits[I] += pr[i];
  for (let a = 0; a < 2; a++) if (lg & (1 << a)) { const q = a ? p1 : 1 - p1; if (q <= 0 && i !== -1) { /* still needed for seats' own deviations */ }
    const npr = new Float64Array(P); for (let k = 0; k < P; k++) npr[k] = k === i ? pr[k] : pr[k] * q; walk(i + 1, a ? h | (1 << i) : h, w, npr); } }
for (let d = 0; d < CHECK; d++) { const w = deal(); evalAvg(0, 0, w, tmp, eb); for (let k = 0; k < P; k++) val[k] += tmp[k]; walk(0, 0, w, new Float64Array(P).fill(1)); }
const gain = new Float64Array(P);
for (let i = 0; i < P; i++) { let b = 0; for (let h = 0; h < (1 << i); h++) for (let t = 0; t < NT; t++) { const I = idx(i, h, t), lg = legal(i, h);
    b += lg === 3 ? Math.max(br[2 * I], br[2 * I + 1]) : lg === 1 ? br[2 * I] : br[2 * I + 1]; } gain[i] = b / CHECK - val[i] / CHECK; }
const res = { P, iterations: ITER, checkDeals: CHECK, value: Array.from(val, v => +(v / CHECK).toFixed(4)), bestResponseGain: Array.from(gain, v => +v.toFixed(4)), strategy: [] };
for (let i = 0; i < P; i++) for (let h = 0; h < (1 << i); h++) { const lg = legal(i, h); const row = { seat: i, bids: Array.from({ length: i }, (_, k) => (h >> k) & 1).join(''), forced: lg === 3 ? null : lg === 1 ? 0 : 1, reach: 0, p1: [] };
  for (let t = 0; t < NT; t++) { const I = idx(i, h, t); row.p1.push(+stratAt(I, lg, false).toFixed(3)); row.reach += visits[I]; } row.reach = +(row.reach / CHECK).toFixed(4); res.strategy.push(row); }
console.log(JSON.stringify(res));
