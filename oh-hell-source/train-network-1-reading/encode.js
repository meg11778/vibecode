/* Observation -> network input, and network output -> card.
 *
 * Suits are relabelled so trump is always suit 0. The three side suits keep
 * their relative order; training shuffles them, since nothing about the game
 * depends on which side suit is which. Seats are relabelled relative to the
 * player to act (0 = me, 1 = next to play after me, ...).
 *
 * Everything is a small non-negative integer: flags are 0/1, counts run 0..n.
 * SCALE says what to divide each input by before it reaches the network.
 *
 * Layout (F = 418):
 *     0  my hand                     52
 *    52  every card played so far    52   (current trick included, and the
 *                                          turned trump card, which is out)
 *   104  cards in the current trick  52
 *   156  the card winning the trick  52
 *   208  led suit                     4   (all zero when I am leading)
 *   212  per seat, 4 seats x 10:     40   bid, won, still needed, over by,
 *                                          cards held, has played this trick,
 *                                          shown void in suit 0..3
 *   252  round size, tricks left      2
 *   254  my position in the trick     4
 *   258  seat winning the trick       4   (relative to me)
 *   262  cards each other seat has played, 3 seats x 52 (the seat that plays
 *        after me first), so the network can see who played what
 */

const suitOf = c => (c / 13) | 0;
const F = 418, PLAYED = 262;
const MAX_N = 7;                      // counts are scaled by this

const SCALE = new Array(F).fill(1);
for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) SCALE[212 + r * 10 + k] = MAX_N;
SCALE[252] = MAX_N; SCALE[253] = MAX_N;

/* suit -> canonical suit, trump first. */
function suitMap(trump) {
  const m = [0, 0, 0, 0]; let k = 1;
  for (let s = 0; s < 4; s++) m[s] = (s === trump) ? 0 : k++;
  return m;
}
const canon = (c, m) => m[suitOf(c)] * 13 + (c % 13);

function encode(obs) {
  const { hand, seen, voids, lens, bids, won, turn, led, winCard, winner, playedInTrick, trick, turned, trump, n, P } = obs;
  if (trump < 0) throw new Error('encoder covers trump rounds only');
  if (P !== 4) throw new Error('encoder covers four seats only');
  const m = suitMap(trump);
  const x = new Int8Array(F);
  for (const c of hand) x[canon(c, m)] = 1;
  for (let c = 0; c < 52; c++) if (seen[c]) x[52 + canon(c, m)] = 1;
  if (turned >= 0) x[52 + canon(turned, m)] = 1;
  for (const c of trick) x[104 + canon(c, m)] = 1;
  if (winCard >= 0) x[156 + canon(winCard, m)] = 1;
  if (led >= 0) x[208 + m[led]] = 1;
  for (let r = 0; r < 4; r++) {
    const p = (turn + r) % P, o = 212 + r * 10, need = bids[p] - won[p];
    x[o] = bids[p]; x[o + 1] = won[p];
    x[o + 2] = Math.max(need, 0); x[o + 3] = Math.max(-need, 0);
    x[o + 4] = lens[p];
    // seats that have already played this trick sit just before me in turn order
    x[o + 5] = (r > 0 && r >= P - playedInTrick) ? 1 : 0;
    for (let s = 0; s < 4; s++) if (voids[p][s]) x[o + 6 + m[s]] = 1;
  }
  if (!obs.playedBy) throw new Error('observation lacks playedBy');
  for (let r = 1; r < 4; r++) { const o = PLAYED + (r - 1) * 52; for (const c of obs.playedBy[(turn + r) % P]) x[o + canon(c, m)] = 1; }
  x[252] = n; x[253] = hand.length;
  x[254 + playedInTrick] = 1;
  if (playedInTrick > 0) x[258 + ((winner - turn + P) % P)] = 1;
  return { x, map: m };
}

/* Canonical card index -> real card, and legal-move mask in canonical space. */
function decoder(map) {
  const inv = [0, 0, 0, 0];
  for (let s = 0; s < 4; s++) inv[map[s]] = s;
  return cc => inv[(cc / 13) | 0] * 13 + (cc % 13);
}

/* The six relabellings of the side suits, as gather indices:
   xAug[i] = x[X[i]] for inputs, qAug[i] = q[Q[i]] for the 52 outputs. */
function sideSuitPerms() {
  const perms = [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]];
  return perms.map(pm => {
    const from = [0, pm[0], pm[1], pm[2]];        // new suit s reads old suit from[s]
    const X = new Array(F), Q = new Array(52);
    for (let i = 0; i < F; i++) X[i] = i;
    for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) {
      Q[s * 13 + r] = from[s] * 13 + r;
      for (const base of [0, 52, 104, 156, 262, 314, 366]) X[base + s * 13 + r] = base + from[s] * 13 + r;
    }
    for (let s = 0; s < 4; s++) {
      X[208 + s] = 208 + from[s];
      for (let r = 0; r < 4; r++) X[212 + r * 10 + 6 + s] = 212 + r * 10 + 6 + from[s];
    }
    return { X, Q };
  });
}

module.exports = { F, MAX_N, SCALE, encode, decoder, canon, suitMap, sideSuitPerms };
