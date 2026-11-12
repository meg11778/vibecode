/* A card-reading teacher.
 *
 * Like rollout.js, it values each legal card by playing the hand out on
 * sampled layouts of the hidden cards. The difference is which layouts. The
 * plain teacher draws layouts that fit the bids and the shown voids. This one
 * draws many more of those, then asks of each: had the cards lain like this,
 * how likely is it that every other seat would have played the cards it
 * actually played? (Likelihood from the network: softmax of its scores over
 * the seat's legal cards at that moment.) Layouts are resampled in proportion
 * to that likelihood, so the playouts run on layouts the play so far supports.
 *
 * readValues(obs, policies, K, rand, net, opt) -> { legal, q, fit }
 *   opt.M     candidate layouts (default 8K)
 *   opt.beta  sharpness of the likelihood (1 = the network's own scale)
 *   opt.eps   floor: each observed play is given at least eps/legal
 *   opt.truth optional true hands, to report how well layouts match them
 */
const { determinize, beats, suitOf } = require('./br.js');
const { finish } = require('./rollout.js');
const { encode, canon } = require('./encode.js');

function legalOf(hand, led) {
  if (led < 0) return hand;
  const f = hand.filter(c => suitOf(c) === led);
  return f.length ? f : hand;
}

/* log-likelihood of the other seats' plays so far, given full starting hands */
function logLik(start, obs, net, beta, eps) {
  const { history, bids, turned, trump, n, P, turn: me } = obs;
  const h = start.map(x => x.slice()), won = new Array(P).fill(0), seen = new Uint8Array(52);
  const voids = Array.from({ length: P }, () => [false, false, false, false]);
  let led = -1, winCard = -1, winner = 0, i = 0, trick = [], ll = 0;
  for (let k = 0; k < history.length; k += 2) {
    const p = history[k], c = history[k + 1];
    if (i === 0) winner = p;
    if (p !== me) {
      const legal = legalOf(h[p], led);
      if (legal.length > 1) {
        const { x, map } = encode({ hand: h[p], seen, voids, lens: h.map(a => a.length), bids, won, turn: p, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P });
        const z = net.logits(x);
        let mx = -Infinity; for (const d of legal) mx = Math.max(mx, z[canon(d, map)]);
        let tot = 0; for (const d of legal) tot += Math.exp(beta * (z[canon(d, map)] - mx));
        const pr = Math.exp(beta * (z[canon(c, map)] - mx)) / tot;
        ll += Math.log((1 - eps) * pr + eps / legal.length);
      }
    }
    h[p].splice(h[p].indexOf(c), 1);
    seen[c] = 1; trick.push(c);
    if (i === 0) led = suitOf(c); else if (suitOf(c) !== led) voids[p][led] = true;
    if (beats(c, winCard, trump)) { winCard = c; winner = p; }
    if (++i === P) { won[winner]++; i = 0; led = -1; winCard = -1; trick = []; }
  }
  return ll;
}

function readValues(obs, policies, K, rand, net, opt) {
  opt = opt || {};
  const { hand, seen, voids, lens, bids, won, turn, led, winCard, winner, playedInTrick, trick, turned, trump, n, P, playedBy } = obs;
  const legal = legalOf(hand, led);
  const q = new Map(); for (const c of legal) q.set(c, 0);
  if (legal.length === 1) return { legal, q };
  const M = opt.M || 8 * K, beta = opt.beta == null ? 1 : opt.beta, eps = opt.eps == null ? 0.02 : opt.eps;

  const inHand = new Uint8Array(52); for (const c of hand) inHand[c] = 1;
  const unseen = []; for (let c = 0; c < 52; c++) if (!seen[c] && !inHand[c] && c !== turned) unseen.push(c);
  const check = obs.bidCheck || null, budget = M * 30; let tries = 0;
  const cands = [], lw = [];
  const reading = opt.read !== false && obs.history.length > 0;
  for (let m = 0; m < M; m++) {
    let hands;
    for (;;) {
      hands = determinize(unseen, lens, voids, P, turn, rand);
      if (!check || tries >= budget) break;
      tries++;
      let ok = true;
      for (let p = 0; p < P && ok; p++) if (p !== turn) ok = check(p, playedBy[p].length ? hands[p].concat(playedBy[p]) : hands[p]);
      if (ok) break;
    }
    hands[turn] = hand;
    cands.push(hands);
    lw.push(reading ? logLik(hands.map((x, p) => x.concat(playedBy[p])), obs, net, beta, eps) : 0);
  }
  // resample K layouts in proportion to likelihood (systematic)
  const mx = Math.max(...lw), w = lw.map(v => Math.exp(v - mx));
  let sum = 0, sum2 = 0; for (const v of w) { sum += v; sum2 += v * v; }
  const picks = []; { const step = sum / K; let u = rand() * step, acc = 0, i = 0;
    for (let k = 0; k < K; k++) { const x = u + k * step; while (i < M - 1 && acc + w[i] < x) { acc += w[i]; i++; } picks.push(cands[i]); } }
  const st = { won, seen, voids, trick, led, winCard, winner, playedInTrick, turn };
  for (const hands of picks) for (const c of legal) q.set(c, q.get(c) + finish(hands, st, c, policies, bids, trump, turned, n, P, turn));
  for (const c of legal) q.set(c, q.get(c) / K);
  const out = { legal, q, ess: sum * sum / sum2 };
  if (opt.truth) {                       // share of hidden cards the layouts put in the right hand
    const where = new Int8Array(52).fill(-1);
    for (let p = 0; p < P; p++) if (p !== turn) for (const c of opt.truth[p]) where[c] = p;
    const score = set => { let ok = 0, tot = 0; for (const hands of set) for (let p = 0; p < P; p++) if (p !== turn) for (const c of hands[p]) { tot++; if (where[c] === p) ok++; } return tot ? ok / tot : 1; };
    out.hitRead = score(picks); out.hitPlain = score(cands);
  }
  return out;
}
module.exports = { readValues, logLik };
