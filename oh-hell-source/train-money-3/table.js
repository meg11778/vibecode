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
const { bidNetProbs, bidNetCovers } = require('./bidnet.js');

/* Today's bots (23 Nov 2026). The run before this one bid every training table by the bid formula; the game's bots bid by
   simulation with the bidding network, and seat by seat only 42% (12 cards) to 61% (5 cards) of bids are the same.
   Here a seat's bid is drawn from the bidding network, which was trained on what those bots bid. */
function botBidDraw(rng, hand, turned, P, n, p, prior) {
  const pb = bidNetProbs(P, n, turned, p, hand, prior), u = rng(); let acc = 0;
  for (let b = 0; b <= n; b++) { acc += pb[b]; if (u < acc) return b; }
  let best = 0; for (let b = 1; b <= n; b++) if (pb[b] > pb[best]) best = b; return best;
}

/* Deal n cards to each of P seats and turn the next card for trump. With the
   whole deck dealt there is nothing to turn and the round is no-trump; pass
   noTrump to play a shorter round at no trump as well, with no card turned. */
function makeDeal(rng, P, n, noTrump) {
  const d = new Array(52);
  for (let i = 0; i < 52; i++) d[i] = i;
  for (let i = 51; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = d[i]; d[i] = d[j]; d[j] = t; }
  const hands = [];
  for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n).sort((a, b) => a - b));
  const turned = (P * n < 52 && !noTrump) ? d[P * n] : -1;
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

/* A deal in which one seat holds a long suit: more than half its cards, up to
   all of them. Everything else is dealt at random. Rounds of 5 cards and up. */
function makeLongDeal(rng, P, n, noTrump) {
  const d = new Array(52);
  for (let i = 0; i < 52; i++) d[i] = i;
  for (let i = 51; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = d[i]; d[i] = d[j]; d[j] = t; }
  const lo = Math.floor(n / 2) + 2, L = Math.min(n, 13, lo + ((rng() * (n - lo + 1)) | 0));
  const s = (rng() * 4) | 0, seat = (rng() * P) | 0;
  const mine = [], rest = []; let a = 0, b = 0;
  for (const c of d) {
    if (suitOf(c) === s && a < L) { mine.push(c); a++; }
    else if (suitOf(c) !== s && b < n - L) { mine.push(c); b++; }
    else rest.push(c);
  }
  const hands = []; let q = 0;
  for (let p = 0; p < P; p++) hands.push((p === seat ? mine : rest.slice(q, q += n)).sort((x, y) => x - y));
  const turned = (P * n < 52 && !noTrump) ? rest[q] : -1;
  return { hands, turned, trump: turned >= 0 ? suitOf(turned) : -1, longSeat: seat };
}

/* A deal and its bids for the robustness run. Most deals are ordinary. A share
   (`freak`) give one seat a long suit; on half of those that seat's bid is
   anything from 0 to n. On a share (`perturb`) of deals each seat, with
   probability a half, bids one to three tricks away from the bid model. So the
   network practises hands and contracts it never met when every seat bid by
   the book. slack[p] is how far seat p's bid may be from the model's; the
   auction check uses it, so sampled deals still fit the bids. */
/* OVERSHARE (environment, 0 to 1): that share of deals is redrawn until the table is overbid, so the network gets more
   practice at overbid tables (24 to 29% of ordinary deals at today's bidding). Added 24 Nov 2026. */
const OVERSHARE = Number(process.env.OVERSHARE || 0);
function makeScenario(rng, P, n, ntShare, perturb, freak) {
  if (OVERSHARE > 0 && rng() < OVERSHARE) { for (let t = 0; t < 40; t++) { const sc = makeScenario1(rng, P, n, ntShare, perturb, freak); if (sc.bids.reduce((x, y) => x + y, 0) > n) return sc; } }
  return makeScenario1(rng, P, n, ntShare, perturb, freak);
}
function makeScenario1(rng, P, n, ntShare, perturb, freak) {
  const nt = rng() < (ntShare || 0);
  const long = n >= 5 && rng() < (freak || 0);
  const deal = long ? makeLongDeal(rng, P, n, nt) : makeDeal(rng, P, n, nt);
  const off = rng() < (perturb || 0), wild = long && rng() < 0.5;
  E.setKnown(deal.turned >= 0 ? [deal.turned] : []);
  const bids = [], slack = []; let B = 0;
  for (let p = 0; p < P; p++) {
    const banned = p === P - 1 ? n - B : -1;
    const useNet = deal.turned >= 0 && bidNetCovers(P, n);
    const mu = useNet ? 0 : muFor(deal.hands[p], deal.trump, n, P, p) * auctionFactor(n, P, B, P - p);
    let b = useNet ? botBidDraw(rng, deal.hands[p], deal.turned, P, n, p, bids) : bidAt(Math.max(0, Math.min(n, mu)), n, banned), sl = 0;
    if (wild && p === deal.longSeat) {
      b = (rng() * (n + 1)) | 0;
      if (b === banned) b = b > 0 ? b - 1 : b + 1;
      sl = n;
    } else if (off && rng() < 0.5) {
      const r = rng(), dlt = (r < 0.5 ? 1 : r < 0.8 ? 2 : 3) * (rng() < 0.5 ? -1 : 1);
      let nb = Math.max(0, Math.min(n, b + dlt));
      if (nb === banned) nb += dlt > 0 ? 1 : -1;
      if (nb < 0 || nb > n || nb === banned) nb = b;
      sl = Math.abs(nb - b); b = nb;
    }
    bids.push(b); slack.push(sl); B += b;
  }
  return { deal, bids, slack };
}

/* How likely is it that seat p, holding `hand`, would have made the bid it made (to within its slack)? A number from
   0 to 1, from the bidding network. Sampled deals are kept with this probability, so they fit the auction the way
   today's bots bid. (The run before this one asked whether the bid formula gave exactly that bid.) */
function makeBidCheck(bids, trump, n, P, slack, turned) {
  const before = []; let B = 0;
  for (let p = 0; p < P; p++) { before.push(B); B += bids[p]; }
  const useNet = turned >= 0 && bidNetCovers(P, n), prior = bids.map((_, p) => bids.slice(0, p));
  return (p, hand) => {
    const sl = slack ? slack[p] : 0;
    if (sl >= n) return 1;
    if (!useNet) { const mu = muFor(hand, trump, n, P, p) * auctionFactor(n, P, before[p], P - p);
      return Math.abs(bidAt(Math.max(0, Math.min(n, mu)), n, p === P - 1 ? n - before[p] : -1) - bids[p]) <= sl ? 1 : 0; }
    const pb = bidNetProbs(P, n, turned, p, hand, prior[p]); let pr = 0;
    for (let b = Math.max(0, bids[p] - sl); b <= Math.min(n, bids[p] + sl); b++) pr += pb[b];
    return pr;
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
function playDeal(deal, bids, P, n, policies, slack) {
  const { trump, turned } = deal;
  const h = deal.hands.map(x => x.slice()), won = new Array(P).fill(0);
  const seen = new Uint8Array(52);
  const voids = Array.from({ length: P }, () => [false, false, false, false]);
  const playedBy = Array.from({ length: P }, () => []);
  const bidCheck = makeBidCheck(bids, trump, n, P, slack, turned);
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

module.exports = { makeDeal, makeLongDeal, makeScenario, makeBids, makeBidCheck, playDeal, heuristicPolicy, vienna, suitOf };
