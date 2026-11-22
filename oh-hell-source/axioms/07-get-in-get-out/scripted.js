/* Axiom 7, second part (Matt, 22 Nov 2026): take ALL your tricks at once, and the same on lead.
   Hand 1: A of trumps (spades), hearts 10-4-3-2, clubs 3-2, bid 1.     Hand 2: the same with clubs A-2, bid 2.
   Scenarios (7-card round, other cards random, others bid as the bots do, plain network plays every unscripted card):
     F2 : hand 2 in a seat other than the leader's; the opening lead is a diamond, not yet trumped.
     L1 : hand 1 on opening lead.        L2 : hand 2 on opening lead.
   A line is a first card (when following) plus a list of cards to lead, in order, whenever our seat is on lead; after
   the list the network plays our cards.
   OHHELL_ENGINE=<folder with ohhell-play.html> node scripted.js <scenario> <P> <deals> <seed>    one JSON summary.
   Modified work under GPL v3; engine from ohhell-play.html (Jim Agniel's calculator, modified by Matt Glassman). */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_gs_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={netChoose,legalCards,beatsCard,bidNetProbs,vienna,mulberry32,suitOf,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const SC = process.argv[2], [Pn, deals, seed] = process.argv.slice(3, 6).map(Number), n = 7, rng = M.mulberry32(seed), ri = k => (rng() * k) | 0, SECS = +(process.env.SECS || 1e9), T0 = Date.now();
const SA = 12, HT = 21, H4 = 15, H3 = 14, H2 = 13, CA = 51, C3 = 40, C2 = 39, trump = 0;
const DEF = { F2: { hand: [SA, H2, H3, H4, HT, C2, CA], bid: 2, lead: false, lines: [['ruff, club A, club 2', SA, [CA, C2]], ['ruff, club 2 (keep the club A)', SA, [C2]], ['ruff, heart 2', SA, [H2]], ['ruff, then network', SA, []], ['pitch heart 10', HT, []], ['pitch club 2', C2, []]] },
  L2: { hand: [SA, H2, H3, H4, HT, C2, CA], bid: 2, lead: true, lines: [['spade A, club A, club 2', null, [SA, CA, C2]], ['club A, spade A, club 2', null, [CA, SA, C2]], ['spade A, club 2 (keep the club A)', null, [SA, C2]], ['club A, club 2 (keep the spade A)', null, [CA, C2]], ['club 2', null, [C2]], ['heart 2', null, [H2]], ['heart 10', null, [HT]]] },
  L1: { hand: [SA, H2, H3, H4, HT, C2, C3], bid: 1, lead: true, lines: [['spade A, club 3', null, [SA, C3]], ['spade A, heart 2', null, [SA, H2]], ['club 3 (keep the spade A)', null, [C3]], ['heart 2', null, [H2]], ['heart 10', null, [HT]]] } }[SC];
const MINE = DEF.hand, BID = DEF.bid, LINES = DEF.lines, G = {}, nmc = c => '23456789TJQKA'[c % 13] + 'SHDC'[(c / 13) | 0];
const grp = key => G[key] = G[key] || { k: 0, m: LINES.map(() => 0), made: LINES.map(() => 0), over: LINES.map(() => 0), short: LINES.map(() => 0), d: LINES.map(() => 0), d2: LINES.map(() => 0), net: {} };
let tried = 0, used = 0, netBid = 0;
while (used < deals && Date.now() - T0 < SECS * 1000) { tried++;
  const me = DEF.lead ? 0 : 1 + ri(Pn - 1), turned = 1 + ri(11); M.setKnown([turned]);
  const taken = new Set(MINE); taken.add(turned); const deck = []; for (let c = 0; c < 52; c++) if (!taken.has(c)) deck.push(c);
  for (let i = deck.length - 1; i > 0; i--) { const j = ri(i + 1); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const hands = []; let k = 0; for (let q = 0; q < Pn; q++) hands.push(q === me ? MINE.slice() : deck.slice(k * n, (k++) * n + n).sort((p, q2) => p - q2));
  const bids = []; let B = 0, ok = true, nb = 0;
  for (let q = 0; q < Pn; q++) { let bb; const pb = M.bidNetProbs(Pn, n, turned, q, hands[q], bids);
    if (q === me) { bb = BID; if (q === Pn - 1 && n - B === BID) { ok = false; break; } let best = 0; for (let z = 1; z <= n; z++) if (pb[z] > pb[best]) best = z; nb = best === BID ? 1 : 0; }
    else { const u = rng(); let acc = 0; bb = n; for (let z = 0; z <= n; z++) { acc += pb[z]; if (u < acc) { bb = z; break; } } if (q === Pn - 1 && bb === n - B) { let bp = -1; for (let z = 0; z <= n; z++) if (z !== n - B && pb[z] > bp) { bp = pb[z]; bb = z; } } }
    bids.push(bb); B += bb; }
  if (!ok) continue; let decision = -1;
  const play = (first, leads, info) => { const h = hands.map(z => z.slice()), won = new Array(Pn).fill(0), seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]), Q = leads.slice();
    let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [], f = first, started = false;
    for (let left = Pn * n; left > 0; left--) { const lg = M.legalCards(h[turn], led); let c = -1;
      const st = () => ({ hand: h[turn], seen, voids, lens: h.map(z => z.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn });
      if (turn === me && !started) { started = true; if (!DEF.lead && (led !== 2 || M.suitOf(winCard) === trump)) return null; if (info) decision = M.netChoose(st(), true).card; if (f != null) c = f; }
      if (c < 0 && turn === me && i === 0) { while (Q.length && c < 0) { const x = Q.shift(); if (h[turn].includes(x)) c = x; } }
      if (c < 0) c = lg.length === 1 ? lg[0] : M.netChoose(st(), true).card;
      h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[turn][led] = true; if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
      if (++i === Pn) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn; }
    let tot = 0; for (let q = 0; q < Pn; q++) tot += M.vienna(bids[q], won[q], n); return { money: M.vienna(BID, won[me], n) - tot / Pn, tricks: won[me] }; };
  const res = []; for (let li = 0; li < LINES.length; li++) { const r = play(LINES[li][1], LINES[li][2], li === 0); if (!r) break; res.push(r); }
  if (res.length < LINES.length) continue; used++; netBid += nb;
  const over = B - n, key = over >= 2 ? 'over by 2 or more' : over === 1 ? 'over by 1' : over === -1 ? 'under by 1' : 'under by 2 or more', g = grp(key); g.k++;
  res.forEach((r, li) => { g.m[li] += r.money; if (r.tricks === BID) g.made[li]++; if (r.tricks > BID) g.over[li]++; if (r.tricks < BID) g.short[li]++; const d = res[0].money - r.money; g.d[li] += d; g.d2[li] += d * d; }); g.net[nmc(decision)] = (g.net[nmc(decision)] || 0) + 1;
}
console.log(JSON.stringify({ SC, P: Pn, n, tried, used, seed, netBid, BID, LINES: LINES.map(l => l[0]), G }));
