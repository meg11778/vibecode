/* Axiom 6 (Matt, 22 Nov 2026): "Dealer, and the bid you want (X) is the one you may not make? Imagine you could bid X
   and ask whether X would be easier to make at an overbid or an underbid table. Overbid: bid X+1. Underbid: bid X-1."

   Test. A dealer hand is taken from an ordinary deal in which the dealer is torn across the hook: X is the forbidden bid
   (1 <= X <= n-1) and the bidding network, which knows the hook and so never chooses X itself, gives X-1 and X+1 at
   least 15% each and 80% together. That hand and turned card are then kept and the other cards redealt many times; the
   other seats bid as the bidding network says the game's bots do (they bid before the dealer, so their bids do not
   depend on the dealer's cards). Three kinds of table turn up by themselves:
     hook   : the bids ahead leave exactly X.  The same deal is played twice, dealer bidding X+1 and X-1.
     over   : the bids ahead are one higher.   The dealer bids X (legal): a table overbid by one.
     under  : the bids ahead are one lower.    The dealer bids X (legal): a table underbid by one.
   Plain network plays every seat. Money = own points minus the table's average.
   Each hand's figures are kept in two halves (even / odd redeals) so that rules chosen on one half can be scored on
   the other.

   OHHELL_ENGINE=<folder with ohhell-play.html> node dealer_hook.js <P> <n> <hands> <redeals> <seed> [SECS=..]
   Appends one JSON line per hand to stdout. Modified work under GPL v3; engine from ohhell-play.html
   (Jim Agniel's calculator, modified by Matt Glassman). */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_dh_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={netChoose,legalCards,beatsCard,bidNetProbs,vienna,mulberry32,suitOf,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const [Pn, n, HANDS, REDEALS, seed] = process.argv.slice(2, 7).map(Number), rng = M.mulberry32(seed), ri = k => (rng() * k) | 0;
const MINP = +(process.env.MINP || 0.15), SECS = +(process.env.SECS || 1e9), T0 = Date.now(), D = Pn - 1;
const shuffle = d => { for (let i = d.length - 1; i > 0; i--) { const j = ri(i + 1); const t = d[i]; d[i] = d[j]; d[j] = t; } return d; };
const sampleBid = pb => { const u = rng(); let acc = 0; for (let z = 0; z <= n; z++) { acc += pb[z]; if (u < acc) return z; } return n; };
const play = (hands, bids, turned, trump) => { const h = hands.map(z => z.slice()), won = new Array(Pn).fill(0), seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]);
  let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [];
  for (let left = Pn * n; left > 0; left--) { const lg = M.legalCards(h[turn], led);
    const c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen, voids, lens: h.map(z => z.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, true).card;
    h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[turn][led] = true; if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
    if (++i === Pn) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn; }
  let tot = 0, busts = 0; for (let q = 0; q < Pn; q++) { tot += M.vienna(bids[q], won[q], n); if (q !== D && won[q] !== bids[q]) busts++; }
  return { money: M.vienna(bids[D], won[D], n) - tot / Pn, tricks: won[D], busts }; };
const blank = () => ({ k: 0, m: 0, m2: 0, made: 0, tricks: 0, short: 0, busts: 0 });
const add = (s, r, bid) => { s.k++; s.m += r.money; s.m2 += r.money * r.money; s.tricks += r.tricks; s.busts += r.busts; if (r.tricks === bid) s.made++; if (r.tricks < bid) s.short++; };
for (let hd = 0; hd < HANDS && Date.now() - T0 < SECS * 1000;) {
  // 1. find a dealer hand whose first choice is the forbidden bid
  const full = shuffle([...Array(52).keys()]), turned = full[Pn * n], trump = M.suitOf(turned); M.setKnown([turned]);
  const hs = []; for (let q = 0; q < Pn; q++) hs.push(full.slice(q * n, q * n + n).sort((p, q2) => p - q2));
  const bids0 = []; let S0 = 0; for (let q = 0; q < D; q++) { const bb = sampleBid(M.bidNetProbs(Pn, n, turned, q, hs[q], bids0)); bids0.push(bb); S0 += bb; }
  const X = n - S0; if (X < 1 || X > n - 1) continue;
  const pd = M.bidNetProbs(Pn, n, turned, D, hs[D], bids0); if (pd[X - 1] < MINP || pd[X + 1] < MINP || pd[X - 1] + pd[X + 1] < 0.8) continue;
  hd++;
  // 2. keep the dealer's hand and the turned card, redeal the rest
  const mine = hs[D], used = new Set(mine); used.add(turned); const rest = []; for (let c = 0; c < 52; c++) if (!used.has(c)) rest.push(c);
  const rec = { P: Pn, n, X, hand: mine, turned, redeals: 0, sums: {}, half: [0, 1].map(() => ({ up: blank(), down: blank(), d: 0, d2: 0, over: blank(), under: blank(), netLean: 0, netUp: 0 })) };
  for (let r = 0; r < REDEALS; r++) { shuffle(rest); const hands = []; for (let q = 0; q < D; q++) hands.push(rest.slice(q * n, q * n + n).sort((p, q2) => p - q2)); hands.push(mine);
    const bids = []; let S = 0; for (let q = 0; q < D; q++) { const bb = sampleBid(M.bidNetProbs(Pn, n, turned, q, hands[q], bids)); bids.push(bb); S += bb; }
    const off = S - (n - X); rec.redeals++; rec.sums[off] = (rec.sums[off] || 0) + 1; if (off < -1 || off > 1) continue; const H = rec.half[r & 1];
    if (off === 0) { const pb = M.bidNetProbs(Pn, n, turned, D, mine, bids); H.netLean += pb[X + 1] - pb[X - 1]; if (pb[X + 1] > pb[X - 1]) H.netUp++;
      const up = play(hands, bids.concat([X + 1]), turned, trump), dn = play(hands, bids.concat([X - 1]), turned, trump); add(H.up, up, X + 1); add(H.down, dn, X - 1); const d = up.money - dn.money; H.d += d; H.d2 += d * d; }
    else add(off === 1 ? H.over : H.under, play(hands, bids.concat([X]), turned, trump), X); }
  console.log(JSON.stringify(rec));
}
