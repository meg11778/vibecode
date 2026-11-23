/* Rollout values: the teacher for self-play.
 *
 * For each card I could play now: sample deals consistent with what I can see
 * and with the auction, play that card, then let every seat - me included -
 * follow its own policy to the end of the hand. The average Vienna score is the
 * value of the card.
 *
 * This is one step of policy improvement. Nothing branches after the first
 * card, so the cost grows with the length of the hand rather than exploding
 * with it, which is what lets it reach the long rounds the best-response search
 * cannot. Playing the best-valued card is at least as good as the policy the
 * rollouts used; train a network on those values, use the network for the next
 * round of rollouts, and repeat.
 *
 * Every card is tried on the same sampled deals, so the differences between
 * cards are far less noisy than the values themselves.
 */

const { determinize, beats, vienna, suitOf } = require('./br.js');

/* Play from a mid-hand position to the end. `first` is the card the seat to
   act plays now. Returns that seat's Vienna score. */
function finish(hands, st, first, policies, bids, trump, turned, n, P, me) {
  const h = hands.map(x => x.slice()), won = st.won.slice();
  const seen = Uint8Array.from(st.seen), voids = st.voids.map(v => v.slice());
  let trick = st.trick.slice(), led = st.led, winCard = st.winCard, winner = st.winner;
  let i = st.playedInTrick, p = st.turn, forced = first;
  let left = 0; for (const x of h) left += x.length;
  while (left > 0) {
    let c;
    if (forced >= 0) { c = forced; forced = -1; }
    else c = policies[p]({ hand: h[p], seen, voids, lens: h.map(x => x.length), bids, won, turn: p,
                           led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P });
    h[p].splice(h[p].indexOf(c), 1); left--;
    seen[c] = 1; trick.push(c);
    if (i === 0) led = suitOf(c); else if (suitOf(c) !== led) voids[p][led] = true;
    if (beats(c, winCard, trump)) { winCard = c; winner = p; }
    if (++i === P) { won[winner]++; p = winner; i = 0; led = -1; winCard = -1; trick = []; }
    else p = (p + 1) % P;
  }
  // money: my points less the table's average ($1 a point)
  let tot = 0; for (let q = 0; q < P; q++) tot += vienna(bids[q], won[q], n);
  return vienna(bids[me], won[me], n) - tot / P;
}

/* obs as in table.js; policies[p] is the policy seat p is assumed to follow
   (for my own seat, the policy I will follow after this card). */
function rolloutValues(obs, policies, K, rand) {
  const { hand, seen, voids, lens, bids, won, turn, led, winCard, winner, playedInTrick, trick, turned, trump, n, P } = obs;
  let legal = hand;
  if (led >= 0) { const f = hand.filter(c => suitOf(c) === led); if (f.length) legal = f; }
  const q = new Map();
  for (const c of legal) q.set(c, 0);
  if (legal.length === 1) return { legal, q };

  const inHand = new Uint8Array(52); for (const c of hand) inHand[c] = 1;
  const unseen = [];
  for (let c = 0; c < 52; c++) if (!seen[c] && !inHand[c] && c !== turned) unseen.push(c);

  // Keep a sampled deal with the probability that every other seat would have bid what it did bid (bidCheck gives
  // each seat's probability from the bidding network). FITTED DEALS ONLY (23 Nov 2026): when the search budget runs
  // out, earlier fitted deals are used again; the run before this one filled up with deals that ignored the bids,
  // which makes an overbid table look softer than it is. Only if nothing at all fits is an unfitted deal used.
  const check = obs.bidCheck || null, playedBy = obs.playedBy;
  const budget = K * (obs.maxTries || 60);
  let tries = 0; const kept = [];
  const st = { won, seen, voids, trick, led, winCard, winner, playedInTrick, turn };
  for (let k = 0; k < K; k++) {
    let hands = null;
    while (check && tries < budget) {
      const h = determinize(unseen, lens, voids, P, turn, rand); tries++;
      let ok = true;
      for (let p = 0; p < P && ok; p++) {
        if (p === turn) continue;
        const pr = check(p, playedBy[p].length ? h[p].concat(playedBy[p]) : h[p]);
        ok = pr >= 1 || rand() < pr;
      }
      if (ok) { hands = h; kept.push(h); break; }
    }
    if (!hands) hands = kept.length ? kept[(rand() * kept.length) | 0].map(x => x && x.slice()) : determinize(unseen, lens, voids, P, turn, rand);
    hands[turn] = hand;
    for (const c of legal) q.set(c, q.get(c) + finish(hands, st, c, policies, bids, trump, turned, n, P, turn));
  }
  for (const c of legal) q.set(c, q.get(c) / K);
  return { legal, q, fitted: kept.length, tries };
}

module.exports = { rolloutValues, finish };
