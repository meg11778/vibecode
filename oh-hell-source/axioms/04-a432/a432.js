/* Axiom 4 (Matt, 22 Nov 2026): "A-4-3-2 in a side suit is a zero, not a one. Ducking it is close to a lock in every
   round and seat; making exactly one trick with it is always less sure, often much less."
   One seat is given A-4-3-2 of a side suit plus random other cards; everyone else gets random cards; all bid as the
   bidding network says the bots do; the plain network plays every card except where a plan overrides it.
   On the same deal the suit is handled two ways:
     DUCK  never lead the ace while another card can be led; follow with the lowest card that is not the ace; when the
           network would throw a plain discard, throw the ace instead.
     CASH  lead the ace the first time on lead; if the suit is led first, play the ace on it (unless the trick is
           already trumped, then the lowest). The small cards are then played as the network likes.
   Counted: tricks won by the four cards of that suit. DUCK succeeds with 0, CASH with exactly 1.
   MODE=bid (4-card round only, the hand IS A-4-3-2): no plans; the seat bids 0 and then 1 and the network plays for it.
   node a432.js <P> <n> <deals> <seed> */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_a432_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={netChoose,legalCards,beatsCard,bidNetProbs,vienna,mulberry32,suitOf,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const [Pn, n, deals, seed] = process.argv.slice(2, 6).map(Number), MODE = process.env.MODE || 'plan', rng = M.mulberry32(seed), ri = k => (rng() * k) | 0;
const G = {}; const grp = k => G[k] = G[k] || { k: 0, duck0: 0, duck1: 0, duck2: 0, cash0: 0, cash1: 0, cash2: 0, ruffed: 0, aceForced: 0, lowWon: 0, bid0made: 0, bid1made: 0, m0: 0, m1: 0, d: 0, d2: 0, netBid: [0, 0, 0] };
for (let dl = 0; dl < deals; dl++) {
  const trump = ri(4); let suit; do { suit = ri(4); } while (suit === trump); const seat = dl % Pn;
  const mine = [suit * 13 + 12, suit * 13 + 2, suit * 13 + 1, suit * 13], used = new Set(mine); let turned; do { turned = trump * 13 + ri(13); } while (used.has(turned)); used.add(turned);
  const deck = []; for (let c = 0; c < 52; c++) if (!used.has(c)) deck.push(c); for (let i = deck.length - 1; i > 0; i--) { const j = ri(i + 1); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  let p = 0; const hands = []; for (let q = 0; q < Pn; q++) { if (q === seat) { const h = mine.slice(); while (h.length < n) { const c = deck[p++]; if (M.suitOf(c) === suit) { deck.push(c); continue; } h.push(c); } hands.push(h.sort((x, y) => x - y)); } else hands.push(null); }
  /* the seat holds exactly four cards of the suit: its other cards are drawn from the other three suits */
  for (let q = 0; q < Pn; q++) if (q !== seat) { hands[q] = deck.slice(p, p + n).sort((x, y) => x - y); p += n; }
  M.setKnown([turned]);
  const bidAll = force => { const bids = []; let B = 0; for (let q = 0; q < Pn; q++) { let bb; if (q === seat && force != null) bb = force; else { const pb = M.bidNetProbs(Pn, n, turned, q, hands[q], bids); if (q === seat) { let best = 0; for (let z = 1; z <= n; z++) if (pb[z] > pb[best]) best = z; bb = best; if (q === Pn - 1 && bb === n - B) { let bp = -1; for (let z = 0; z <= n; z++) if (z !== n - B && pb[z] > bp) { bp = pb[z]; bb = z; } } } else { const u = rng(); let acc = 0; bb = n; for (let z = 0; z <= n; z++) { acc += pb[z]; if (u < acc) { bb = z; break; } } if (q === Pn - 1 && bb === n - B) { let bp = -1; for (let z = 0; z <= n; z++) if (z !== n - B && pb[z] > bp) { bp = pb[z]; bb = z; } } } }
      bids.push(bb); B += bb; } return bids; };
  const ACE = suit * 13 + 12;
  const play = (bids, plan) => { const h = hands.map(z => z.slice()), won = new Array(Pn).fill(0), seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]);
    let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [], suitTricks = 0, ruffed = false, aceForced = false, lowWon = false, cashed = false;
    for (let left = Pn * n; left > 0; left--) { const lg = M.legalCards(h[turn], led); let c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen, voids, lens: h.map(z => z.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, true).card;
      if (turn === seat && plan && h[seat].includes(ACE)) { const lows = lg.filter(x => M.suitOf(x) === suit && x !== ACE);
        if (plan === 'duck') { if (i === 0) { if (c === ACE) { const alt = lg.filter(x => x !== ACE); if (alt.length) c = M.netChoose({ hand: alt, seen, voids, lens: h.map(z => z.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, true).card; if (!alt.includes(c)) c = alt[0]; } }
          else if (led === suit) { if (lows.length) c = lows[0]; else aceForced = true; }
          else if (M.suitOf(lg[0]) !== led && M.suitOf(c) !== trump) c = ACE; }
        else if (plan === 'cash' && !cashed) { if (i === 0) { c = ACE; cashed = true; } else if (led === suit) { cashed = true; if (M.suitOf(winCard) === trump && trump !== suit) { c = lows.length ? lows[0] : ACE; } else c = ACE; } } }
      const isMineSuit = turn === seat && M.suitOf(c) === suit;
      h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[turn][led] = true; if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
      if (++i === Pn) { won[winner]++; if (winner === seat && M.suitOf(winCard) === suit) { suitTricks++; if (winCard !== ACE) lowWon = true; } if (trick.includes(ACE) && winCard !== ACE && M.suitOf(winCard) === trump && led === suit) ruffed = true; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn; }
    let tot = 0; for (let q = 0; q < Pn; q++) tot += M.vienna(bids[q], won[q], n); return { suitTricks, ruffed, aceForced, lowWon, made: won[seat] === bids[seat], money: M.vienna(bids[seat], won[seat], n) - tot / Pn }; };
  for (const key of ['all seats', seat === 0 ? 'on lead' : seat === Pn - 1 ? 'dealer' : 'seat ' + (seat + 1)]) { const g = grp(key);
    if (MODE === 'bid') { if (key === 'all seats') { g._b0 = bidAll(0); g._b1 = bidAll(1); g._r0 = play(g._b0, null); g._r1 = play(g._b1, null); g._nb = bidAll(null)[seat]; } const A = G['all seats'], r0 = A._r0, r1 = A._r1, legal1 = !(seat === Pn - 1 && A._b1[seat] !== 1);
      g.k++; if (r0.made) g.bid0made++; if (r1.made) g.bid1made++; g.m0 += r0.money; g.m1 += r1.money; const d = r0.money - r1.money; g.d += d; g.d2 += d * d; g.netBid[Math.min(2, A._nb)]++; }
    else { if (key === 'all seats') { g._bids = bidAll(null); g._d = play(g._bids, 'duck'); g._c = play(g._bids, 'cash'); } const A = G['all seats'], D = A._d, Cc = A._c;
      g.k++; g['duck' + Math.min(2, D.suitTricks)]++; g['cash' + Math.min(2, Cc.suitTricks)]++; if (Cc.ruffed) g.ruffed++; if (D.aceForced) g.aceForced++; if (D.lowWon) g.lowWon++; } }
}
for (const k in G) for (const f in G[k]) if (f[0] === '_') delete G[k][f];
console.log(JSON.stringify({ P: Pn, n, deals, seed, mode: MODE, G }));
