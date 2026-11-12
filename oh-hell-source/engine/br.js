/* Best-response search.
 *
 * At each decision: sample deals of the unseen cards consistent with hand sizes
 * and the voids each seat has shown, then search each sample with the opponents
 * replaying a fixed policy. Only my own turns branch. The answer is the best
 * play against opponents who play the way that policy plays - not against
 * perfect defenders who can see every card, which is the assumption that made
 * the perfect-information solver lose to the heuristic.
 *
 * The same search doubles as an exploitability probe: hand it any policy as
 * `oppPolicy` and it reports how much a player who knew that policy could take
 * from it.
 */

const suitOf = c => (c / 13) | 0;
const rankOf = c => (c % 13) + 2;
const vienna = (bid, won, n) => bid === won ? (bid === 0 ? 5 + n : 10 + won) : won;

function beats(c, w, trump) {
  if (w < 0) return true;
  const ct = suitOf(c) === trump, wt = suitOf(w) === trump;
  if (ct && !wt) return true;
  if (!ct && wt) return false;
  if (suitOf(c) !== suitOf(w)) return false;
  return rankOf(c) > rankOf(w);
}

/* Deal the unseen cards out, respecting shown voids. Most-constrained seat
   first, with retries; if a sample cannot be completed the void constraints are
   dropped rather than looping forever. */
function determinize(unseen, lens, voids, P, me, rand) {
  const order = [];
  for (let p = 0; p < P; p++) if (p !== me) order.push(p);
  order.sort((a, b) => voids[b].filter(Boolean).length - voids[a].filter(Boolean).length);
  for (let attempt = 0; attempt < 12; attempt++) {
    const pool = unseen.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    const out = new Array(P); let ok = true;
    for (const p of order) {
      const take = [];
      for (let i = 0; i < pool.length && take.length < lens[p]; i++) {
        if (pool[i] >= 0 && !voids[p][suitOf(pool[i])]) { take.push(pool[i]); pool[i] = -1; }
      }
      if (take.length < lens[p]) { ok = false; break; }
      out[p] = take;
    }
    if (ok) return out;
  }
  const pool = unseen.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  const out = new Array(P); let k = 0;
  for (const p of order) { out[p] = pool.slice(k, k + lens[p]); k += lens[p]; }
  return out;
}

/* Value to `me` of each legal move, in one fully specified deal.
   oppPolicy(hand, led, winCard, trump, needed, ctx) -> card */
function bestResponse(hands, bids, trump, n, P, me, state, oppPolicy, seen0, voids0) {
  const H = hands.map(h => h.slice());
  const seen = Uint8Array.from(seen0);
  const voids = voids0.map(v => v.slice());
  const won = state.won.slice();
  let left = 0; for (const h of H) left += h.length;

  /* Opponents can be modelled two ways: by the heuristic's own signature
     (oppPolicy), or by any policy that takes a full observation (state.oppObs),
     which is how the search is pointed at the network. */
  let trick = (state.trick || []).slice();
  function oppCard(p, led, winCard, winner, playedInTrick) {
    if (state.oppObs) {
      return state.oppObs({ hand: H[p], seen, voids, lens: H.map(h => h.length), bids, won, turn: p,
        led, winCard, winner, playedInTrick, trick, turned: state.turned, trump, n, P });
    }
    const mine = new Set(H[p]);
    const needyVoidIn = [false, false, false, false];
    for (let q = 0; q < P; q++) {
      if (q === p || bids[q] - won[q] <= 0) continue;
      for (let s = 0; s < 4; s++) if (voids[q][s]) needyVoidIn[s] = true;
    }
    return oppPolicy(H[p], led, winCard, trump, bids[p] - won[p], { seen, mine, trump, needyVoidIn });
  }

  function play(turn, c, led, winCard, winner, playedInTrick) {
    const hand = H[turn];
    const pos = hand.indexOf(c);
    hand.splice(pos, 1); left--;
    seen[c] = 1;
    let voidSet = -1;
    if (playedInTrick > 0 && suitOf(c) !== led && !voids[turn][led]) { voids[turn][led] = true; voidSet = led; }
    const nled = playedInTrick === 0 ? suitOf(c) : led;
    let nw = winCard, nwr = winner;
    if (beats(c, winCard, trump)) { nw = c; nwr = turn; }
    let v;
    trick.push(c);
    if (playedInTrick + 1 === P) {
      const saved = trick; trick = [];
      won[nwr]++; v = rec(nwr, -1, -1, nwr, 0); won[nwr]--;
      trick = saved;
    }
    else v = rec((turn + 1) % P, nled, nw, nwr, playedInTrick + 1);
    trick.pop();
    if (voidSet >= 0) voids[turn][voidSet] = false;
    seen[c] = 0;
    hand.splice(pos, 0, c); left++;
    return v;
  }

  function rec(turn, led, winCard, winner, playedInTrick) {
    if (left === 0) return vienna(bids[me], won[me], n);
    if (turn !== me) return play(turn, oppCard(turn, led, winCard, winner, playedInTrick), led, winCard, winner, playedInTrick);
    const hand = H[me];
    let legal = hand;
    if (led >= 0) { const f = hand.filter(c => suitOf(c) === led); if (f.length) legal = f; }
    let bv = -Infinity;
    for (const c of legal.slice()) {
      const v = play(me, c, led, winCard, winner, playedInTrick);
      if (v > bv) bv = v;
    }
    return bv;
  }

  const hand = H[me];
  let legal = hand;
  if (state.led >= 0) { const f = hand.filter(c => suitOf(c) === state.led); if (f.length) legal = f; }
  const out = [];
  for (const c of legal.slice())
    out.push({ card: c, value: play(me, c, state.led, state.winCard, state.winner, state.playedInTrick) });
  return out;
}

/* Mean value of each legal card over K sampled deals.
   obs: { hand, seen, voids, lens, bids, won, turn, led, winCard, winner,
          playedInTrick, turned }  -  `turned` is the face-up trump card, which
   nobody holds and so is kept out of the sampled hands. */
function brValues(obs, trump, n, P, K, rand, oppPolicy) {
  const { hand, seen, voids, lens, bids, won, turn, led, winCard, winner, playedInTrick } = obs;
  let legal = hand;
  if (led >= 0) { const f = hand.filter(c => suitOf(c) === led); if (f.length) legal = f; }
  const q = new Map();
  for (const c of legal) q.set(c, 0);
  if (legal.length === 1) return { legal, q };

  const inHand = new Uint8Array(52); for (const c of hand) inHand[c] = 1;
  const unseen = [];
  for (let c = 0; c < 52; c++) if (!seen[c] && !inHand[c] && c !== obs.turned) unseen.push(c);

  /* Inference from the auction. A sampled deal is kept only if every other
     seat, holding that hand plus the cards it has already played, would have
     made the bid it actually made. Without this the samples are uniform over
     everything the cards allow, which ignores the loudest evidence at the
     table: a seat that bid two in a three-card round is not holding rubbish.
     After `maxTries` rejections per wanted sample the filter is dropped, so an
     auction the bid model cannot explain degrades to uniform sampling. */
  const check = obs.bidCheck || null, playedBy = obs.playedBy;
  const budget = K * (obs.maxTries || 40);
  let tries = 0;
  for (let k = 0; k < K; k++) {
    let hands;
    for (;;) {
      hands = determinize(unseen, lens, voids, P, turn, rand);
      if (!check || tries >= budget) break;
      tries++;
      let ok = true;
      for (let p = 0; p < P && ok; p++) {
        if (p === turn) continue;
        ok = check(p, playedBy[p].length ? hands[p].concat(playedBy[p]) : hands[p]);
      }
      if (ok) break;
    }
    hands[turn] = hand.slice();
    const moves = bestResponse(hands, bids, trump, n, P, turn,
      { won, led, winCard, winner, playedInTrick, trick: obs.trick, turned: obs.turned, oppObs: obs.oppObs },
      oppPolicy, seen, voids);
    for (const m of moves) q.set(m.card, q.get(m.card) + m.value);
  }
  for (const c of legal) q.set(c, q.get(c) / K);
  return { legal, q };
}

function brChoose(obs, trump, n, P, K, rand, oppPolicy) {
  const { legal, q } = brValues(obs, trump, n, P, K, rand, oppPolicy);
  let best = legal[0], bv = -Infinity;
  for (const c of legal) { const v = q.get(c); if (v > bv) { bv = v; best = c; } }
  return best;
}

module.exports = { brValues, brChoose, bestResponse, determinize, beats, vienna, suitOf, rankOf };
