/* Late in a hand the reader and the report draw their layouts exactly (27 Nov 2026). Runs in node: node exact_late.js
   Uses the answer key (../../exact-endgame/key.js) on the published page: 4 players, 5 cards, decisions with at most
   two cards hidden in a hand.
   1. Every such read is an exact one (all its layouts count: none carried by a handful).
   2. The layouts are legal: right number of cards, nobody dealt a suit they have shown out of, no card twice.
   3. How often each seat holds each card matches a full listing of every layout with its weight.
   4. The reader agrees with the key where the key separates the best card by $0.25 or more.
   5. An opening lead (too many hidden cards) still uses the ordinary read. */
const path = require('path'), K = require(path.join(__dirname, '..', '..', 'exact-endgame', 'key.js')), M = K.M;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const P = 4, n = 5, rng = M.mulberry32(77), order = [0, 1, 2, 3]; let exact = 0, tot = 0, illegal = 0, worst = 0, checked = 0, agree = 0, matter = 0, openExact = 0, opens = 0;
for (let d = 0; d < 40; d++) {
  const deck = [...Array(52).keys()]; for (let i = 51; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [deck[i], deck[j]] = [deck[j], deck[i]]; }
  const h = []; for (let q = 0; q < P; q++) h.push(deck.slice(q * n, (q + 1) * n).sort((x, y) => x - y)); const turned = deck[P * n], trump = M.suitOf(turned);
  const bids = []; let B = 0; for (let q = 0; q < P; q++) { const pb = M.bidNetProbs(P, n, turned, q, h[q], bids); let b = pb.indexOf(Math.max(...pb)); if (q === P - 1 && b === n - B) { let bp = -1; for (let x = 0; x <= n; x++) if (x !== n - B && pb[x] > bp) { bp = pb[x]; b = x; } } bids.push(b); B += b; }
  const won = [0, 0, 0, 0], seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]), hist = []; let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [];
  for (let left = P * n; left > 0; left--) {
    const lg = M.legalCards(h[turn], led), S = { Pn: P, n, trump, turned, bids, order, hand: h[turn].slice(), seen: Uint8Array.from(seen), voids: voids.map(v => v.slice()), lens: h.map(x => x.length), won: won.slice(), turn, led, winCard, winner, playedInTrick: i, trick: trick.slice(), hist: hist.slice() };
    if (left === P * n && lg.length > 1) { opens++; if (M.readLayouts(S, M.mulberry32(d + 1), 360, 30).exact) openExact++; }
    const late = lg.length > 1 && Math.max(...h.map((x, q) => q === turn ? 0 : x.length)) <= 2;
    if (late) { tot++;
      const L = M.readLayouts(S, M.mulberry32(d * 13 + left), 360, 400); if (L.exact) exact++;
      const cnt = {}; for (const hs of L.picks) { const used = new Set(S.hand); for (let q = 0; q < P; q++) { if (q === turn) continue; if (hs[q].length !== S.lens[q]) illegal++; for (const c of hs[q]) { if (used.has(c) || seen[c] || c === turned || voids[q][M.suitOf(c)]) illegal++; used.add(c); cnt[q + ':' + c] = (cnt[q + ':' + c] || 0) + 1; } } }
      // full listing of the same position: how often each seat holds each card
      const mine = new Set(S.hand), unseen = []; for (let c = 0; c < 52; c++) if (!seen[c] && !mine.has(c) && c !== turned) unseen.push(c);
      const others = [0, 1, 2, 3].filter(q => q !== turn), tabs = others.map(q => S.lens[q] ? K.seatTable(S, q, unseen) : { hands: [[]], f: [1] });
      if (tabs.reduce((x, t) => x * t.hands.length, 1) <= 400000) { const want = {}; let W = 0; const used = new Uint8Array(52);
        (function rec(k, w, acc) { if (k === tabs.length) { W += w; for (const key of acc) want[key] = (want[key] || 0) + w; return; } const t = tabs[k]; for (let x = 0; x < t.hands.length; x++) { if (!(t.f[x] > 0)) continue; const hh = t.hands[x]; if (hh.some(c => used[c])) continue; for (const c of hh) used[c] = 1; rec(k + 1, w * t.f[x], acc.concat(hh.map(c => others[k] + ':' + c))); for (const c of hh) used[c] = 0; } })(0, 1, []);
        checked++; for (const key in want) { const p = want[key] / W; if (p < 0.02) continue; const got = (cnt[key] || 0) / L.picks.length, z = Math.abs(got - p) / Math.sqrt(Math.max(p * (1 - p), 1e-4) / L.picks.length); if (z > worst) worst = z; } }
      const groups = M.mirrorGroups(M.equivGroups(lg, seen, trick, turned, winCard, trump), h[turn], seen, voids, trump, turned);
      if (groups.length > 1) { const key = K.answerKey(S, groups, M.mulberry32(d + 5), { listAll: 20000, draws: 3000 }); if (key) { const gaps = key.val.map((v, g) => g === key.best ? Infinity : key.val[key.best] - v), k2 = gaps.indexOf(Math.min(...gaps));
        if (gaps[k2] >= 0.25 && gaps[k2] > 3 * key.gapSe[k2]) { matter++; const rr = M.readChoose(Object.assign({}, S), M.mulberry32(d * 7 + left)); if (groups[key.best].includes(rr.card)) agree++; } } }
    }
    const c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen, voids, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P }, true).card;
    h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); hist.push({ seat: turn, card: c });
    if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[turn][led] = true;
    if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
    if (++i === P) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % P;
  }
}
ok(tot >= 40 && exact === tot, 'all ' + tot + ' late reads are exact ones (' + exact + ')');
ok(illegal === 0, 'every layout is legal: card counts right, shown-out suits respected, no card twice');
ok(checked >= 30 && worst < 5, checked + ' positions listed in full: how often each seat holds each card (where 2% or more) matches (largest departure ' + worst.toFixed(1) + ' standard errors)');
ok(matter >= 15 && agree >= matter - 1, 'where the key separates the best card by $0.25 or more, the reader plays it ' + agree + ' times in ' + matter);
ok(opens >= 20 && openExact === 0, 'opening leads (' + opens + ') still use the ordinary read');
console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
