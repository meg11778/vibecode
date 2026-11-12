/* The table: dealing, bidding and the trick loop, with a pluggable card policy
 * per seat. Everything that plays Oh Hell in this folder goes through here, so
 * data generation and evaluation cannot drift apart on the rules.
 *
 * A policy is a function (obs) -> card. `obs` is exactly what that seat can
 * see: its own hand, the cards played, the voids each seat has shown, the bids,
 * the tricks won, the current trick and the turned trump card.
 */

const E = require('./engine.js');
const { suitOf, beats, vienna, muFor, bidAt, auctionFactor } = E;

/* Deal n cards to each of P seats and turn the next card for trump. With the
   whole deck dealt there is nothing to turn and the round is no-trump. */
function makeDeal(rng, P, n) {
  const d = new Array(52);
  for (let i = 0; i < 52; i++) d[i] = i;
  for (let i = 51; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = d[i]; d[i] = d[j]; d[j] = t; }
  const hands = [];
  for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n).sort((a, b) => a - b));
  const turned = P * n < 52 ? d[P * n] : -1;
  return { hands, turned, trump: turned >= 0 ? suitOf(turned) : -1 };
}

/* Bids from the app's own model, in seat order, dealer hooked. */
function makeBids(hands, trump, turned, P, n) {
  E.setKnown(turned >= 0 ? [turned] : []);
  const bids = []; let B = 0;
  for (let p = 0; p < P; p++) {
    const mu = muFor(hands[p], trump, n, P, p) * auctionFactor(n, P, B, P - p);
    const b = bidAt(Math.max(0, Math.min(n, mu)), n, p === P - 1 ? n - B : -1);
    bids.push(b); B += b;
  }
  return bids;
}

/* Would seat p, holding `hand`, have made the bid it made? Used to keep sampled
   deals consistent with the auction. Call after makeBids for the same deal. */
function makeBidCheck(bids, trump, n, P) {
  const before = []; let B = 0;
  for (let p = 0; p < P; p++) { before.push(B); B += bids[p]; }
  return (p, hand) => {
    const mu = muFor(hand, trump, n, P, p) * auctionFactor(n, P, before[p], P - p);
    return bidAt(Math.max(0, Math.min(n, mu)), n, p === P - 1 ? n - before[p] : -1) === bids[p];
  };
}

/* The app's heuristic, as a policy. It sees played cards and shown voids, the
   same as it does inside ohhell.html. */
function heuristicPolicy(obs) {
  const { hand, seen, voids, bids, won, turn, led, winCard, trump, P } = obs;
  const mine = new Set(hand), needyVoidIn = [false, false, false, false];
  for (let q = 0; q < P; q++) {
    if (q === turn || bids[q] - won[q] <= 0) continue;
    for (let s = 0; s < 4; s++) if (voids[q][s]) needyVoidIn[s] = true;
  }
  return E.chooseCard(hand, led, winCard, trump, bids[turn] - won[turn], { seen, mine, trump, needyVoidIn });
}

/* Play one deal. policies[p] is the policy for seat p. Returns tricks won. */
function playDeal(deal, bids, P, n, policies) {
  const { trump, turned } = deal;
  const h = deal.hands.map(x => x.slice()), won = new Array(P).fill(0);
  const seen = new Uint8Array(52);
  const voids = Array.from({ length: P }, () => [false, false, false, false]);
  const playedBy = Array.from({ length: P }, () => []);
  const bidCheck = makeBidCheck(bids, trump, n, P);
  let leader = 0;
  for (let t = 0; t < n; t++) {
    let led = -1, winCard = -1, winner = leader;
    const trick = [];
    for (let i = 0; i < P; i++) {
      const p = (leader + i) % P;
      const obs = { hand: h[p], seen, voids, lens: h.map(x => x.length), bids, won, turn: p,
                    led, winCard, winner, playedInTrick: i, trick, leader, turned, trump, n, P,
                    playedBy, bidCheck };
      const c = policies[p](obs);
      const at = h[p].indexOf(c);
      if (at < 0) throw new Error('policy played a card it does not hold');
      if (led >= 0 && suitOf(c) !== led && h[p].some(x => suitOf(x) === led)) throw new Error('policy revoked');
      h[p].splice(at, 1);
      seen[c] = 1; trick.push(c); playedBy[p].push(c);
      if (i === 0) led = suitOf(c); else if (suitOf(c) !== led) voids[p][led] = true;
      if (beats(c, winCard, trump)) { winCard = c; winner = p; }
    }
    won[winner]++; leader = winner;
  }
  return won;
}

module.exports = { makeDeal, makeBids, makeBidCheck, playDeal, heuristicPolicy, vienna, suitOf };
