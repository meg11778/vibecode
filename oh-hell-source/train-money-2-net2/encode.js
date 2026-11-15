/* Observation -> network input, and network output -> card.   (layout 2)
 *
 * Covers 3 to 6 seats, with or without a trump suit.
 *
 * Suits are relabelled so trump is always suit 0; the three side suits keep
 * their relative order, and training shuffles them. With no trump the suits
 * keep their own numbers and a flag says so. Seats are relabelled relative to
 * the player to act (0 = me, 1 = next to play after me, ...); seats the table
 * does not have are left at zero.
 *
 * Everything is a small non-negative integer: flags are 0/1, counts run 0..n.
 * SCALE says what to divide each input by before it reaches the network.
 *
 * Layout (F = 291):
 *     0  my hand                     52
 *    52  every card played so far    52   (current trick included, and the
 *                                          turned trump card, which is out)
 *   104  cards in the current trick  52
 *   156  the card winning the trick  52
 *   208  led suit                     4   (all zero when I am leading)
 *   212  per seat, 6 seats x 10:     60   bid, won, still needed, over by,
 *                                          cards held, has played this trick,
 *                                          shown void in suit 0..3
 *   272  round size, tricks left      2
 *   274  my position in the trick     6
 *   280  seat winning the trick       6   (relative to me)
 *   286  number of seats              4   (3, 4, 5, 6)
 *   290  no trump                     1
 *
 * Layout 1 (262 inputs: four seats, trump only) is a subset of this one, so a
 * layout-1 network converts exactly; see convert.js.
 */

const suitOf = c => (c / 13) | 0;
const F = 291, SEATS = 6;
const COUNT_SCALE = 7;                // counts are divided by this (kept from layout 1)

const SCALE = new Array(F).fill(1);
for (let r = 0; r < SEATS; r++) for (let k = 0; k < 5; k++) SCALE[212 + r * 10 + k] = COUNT_SCALE;
SCALE[272] = COUNT_SCALE; SCALE[273] = COUNT_SCALE;

/* suit -> canonical suit. With a trump suit, trump goes first and the side
   suits keep their order.

   With no trump every suit is equal, but slot 0 is not: it is where trump sits
   in every trump deal the network sees, and training shuffled only slots 1 to
   3. Left as "spades always in slot 0", a hand with a very long spade suit was
   played as if spades were trumps (found by Matt Glassman: twelve spades and a
   side deuce at 13 cards). So at no trump the player's SHORTEST suit goes in
   slot 0 and the rest keep their order - any relabelling is a legal view of a
   no-trump hand, and this one keeps long suits out of the odd slot. */
let NT_MAP = 'long', NT_LONG = 6;
function suitMap(trump, hand) {
  if (trump < 0) {
    if (NT_MAP === 'identity' || !hand) return [0, 1, 2, 3];
    const cnt = [0, 0, 0, 0]; for (const c of hand) cnt[suitOf(c)]++;
    // 'long': relabel only when spades, the suit that would sit in slot 0, is long
    if (NT_MAP === 'long' && cnt[0] < NT_LONG) return [0, 1, 2, 3];
    let z = 0; for (let s = 1; s < 4; s++) if (cnt[s] < cnt[z]) z = s;
    const m = [0, 0, 0, 0]; let k = 1;
    for (let s = 0; s < 4; s++) m[s] = (s === z) ? 0 : k++;
    return m;
  }
  const m = [0, 0, 0, 0]; let k = 1;
  for (let s = 0; s < 4; s++) m[s] = (s === trump) ? 0 : k++;
  return m;
}
const canon = (c, m) => m[suitOf(c)] * 13 + (c % 13);

function encode(obs) {
  const { hand, seen, voids, lens, bids, won, turn, led, winCard, winner, playedInTrick, trick, turned, trump, n, P } = obs;
  if (P < 3 || P > SEATS) throw new Error('encoder covers 3 to 6 seats');
  const m = suitMap(trump, hand);
  const x = new Int8Array(F);
  for (const c of hand) x[canon(c, m)] = 1;
  for (let c = 0; c < 52; c++) if (seen[c]) x[52 + canon(c, m)] = 1;
  if (turned >= 0) x[52 + canon(turned, m)] = 1;
  for (const c of trick) x[104 + canon(c, m)] = 1;
  if (winCard >= 0) x[156 + canon(winCard, m)] = 1;
  if (led >= 0) x[208 + m[led]] = 1;
  for (let r = 0; r < P; r++) {
    const p = (turn + r) % P, o = 212 + r * 10, need = bids[p] - won[p];
    x[o] = bids[p]; x[o + 1] = won[p];
    x[o + 2] = Math.max(need, 0); x[o + 3] = Math.max(-need, 0);
    x[o + 4] = lens[p];
    // seats that have already played this trick sit just before me in turn order
    x[o + 5] = (r > 0 && r >= P - playedInTrick) ? 1 : 0;
    for (let s = 0; s < 4; s++) if (voids[p][s]) x[o + 6 + m[s]] = 1;
  }
  x[272] = n; x[273] = hand.length;
  x[274 + playedInTrick] = 1;
  if (playedInTrick > 0) x[280 + ((winner - turn + P) % P)] = 1;
  x[286 + (P - 3)] = 1;
  if (trump < 0) x[290] = 1;
  return { x, map: m };
}

/* The six relabellings of suits 1..3, as gather indices:
   xAug[i] = x[X[i]] for inputs, qAug[i] = q[Q[i]] for the 52 outputs. */
function sideSuitPerms() {
  const perms = [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]];
  return perms.map(pm => {
    const from = [0, pm[0], pm[1], pm[2]];        // new suit s reads old suit from[s]
    const X = new Array(F), Q = new Array(52);
    for (let i = 0; i < F; i++) X[i] = i;
    for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) {
      Q[s * 13 + r] = from[s] * 13 + r;
      for (const base of [0, 52, 104, 156]) X[base + s * 13 + r] = base + from[s] * 13 + r;
    }
    for (let s = 0; s < 4; s++) {
      X[208 + s] = 208 + from[s];
      for (let r = 0; r < SEATS; r++) X[212 + r * 10 + 6 + s] = 212 + r * 10 + 6 + from[s];
    }
    return { X, Q };
  });
}

/* Where each layout-1 input sits in this layout. */
function fromLayout1(i) {
  if (i < 252) return i;              // cards, led suit, first four seats
  if (i < 254) return i + 20;         // round size, tricks left
  if (i < 258) return i + 20;         // position in the trick
  return i + 22;                      // seat winning the trick
}

module.exports = { F, SEATS, SCALE, encode, canon, suitMap, sideSuitPerms, fromLayout1, setNoTrumpMap: (v, k) => { NT_MAP = v; if (k) NT_LONG = k; } };
