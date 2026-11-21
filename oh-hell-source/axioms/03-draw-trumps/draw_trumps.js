/* Axiom 3 (Matt, 21 Nov 2026): with side-suit winners and small trumps in an overbid hand, lead trumps every time you
   get in, so the later rounds of your suit stand up.
   Matt's hand: 4 players, 10 cards, spades trump, A♠ turned, You first to bid and on lead with
   4♠ 3♠ 2♠ A♥ Q♥ J♥ A♣ 2♣ J♦ 4♦, bid 3. The other 30 cards are dealt at random and the other seats bid as the bots do.
   On each deal these lines are played out, the plain network in every other seat (and in your seat except as stated):
     one line per opening lead (then the network plays your hand on);
     "trump every time": you lead a trump whenever you are on lead and have one, while you still need tricks;
     "trump twice": the same for your first two leads only.
   node draw_trumps.js <deals> <seed>      PROBE=1 SECS=n: also ask the card-reading bot for its opening lead on overbid deals. */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_dt_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,netChoose,legalCards,beatsCard,bidNetProbs,vienna,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
const Pn = 4, n = 10, trump = 0, turned = C('A♠'), MYBID = +(process.env.BID || 3), mine = (process.env.HAND || '4♠ 3♠ 2♠ A♥ Q♥ J♥ A♣ 2♣ J♦ 4♦').split(' ').map(C).sort((x, y) => x - y);
const [deals, seed] = process.argv.slice(2, 4).map(Number), rng = M.mulberry32(seed), ri = k => (rng() * k) | 0, PROBE = +(process.env.PROBE || 0), SECS = +(process.env.SECS || 1e9), T0 = Date.now();
const OPEN = (process.env.OPEN || '2♠ A♥ Q♥ A♣ 2♣ J♦ 4♦').split(' ').map(C);
const LINES = OPEN.map(c => 'open ' + T(c)).concat(['trump every time', 'trump twice', 'network throughout']), G = {};
const grp = key => G[key] = G[key] || { k: 0, v: LINES.map(() => 0), v2: LINES.map(() => 0), made: LINES.map(() => 0), short: LINES.map(() => 0), tricks: LINES.map(() => 0), hearts: LINES.map(() => 0), netOpen: {}, readOpen: {}, rk: 0, rv: {} };
let total = 0, netBid = {};
for (let dl = 0; dl < deals && Date.now() - T0 < SECS * 1000; dl++) {
  const used = new Set(mine); used.add(turned); const deck = []; for (let c = 0; c < 52; c++) if (!used.has(c)) deck.push(c); for (let i = deck.length - 1; i > 0; i--) { const j = ri(i + 1); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const hands = [mine.slice()]; for (let q = 1; q < Pn; q++) hands.push(deck.slice((q - 1) * n, q * n).sort((p, q2) => p - q2));
  M.setKnown([turned]); total++;
  { const pb = M.bidNetProbs(Pn, n, turned, 0, hands[0], []); let best = 0; for (let q = 1; q <= n; q++) if (pb[q] > pb[best]) best = q; netBid[best] = (netBid[best] || 0) + 1; }
  const bids = [MYBID]; let B = MYBID;
  for (let q = 1; q < Pn; q++) { const pb = M.bidNetProbs(Pn, n, turned, q, hands[q], bids), u = rng(); let acc = 0, bb = n; for (let z = 0; z <= n; z++) { acc += pb[z]; if (u < acc) { bb = z; break; } }
    if (q === Pn - 1 && bb === n - B) { let bp = -1; for (let z = 0; z <= n; z++) if (z !== n - B && pb[z] > bp) { bp = pb[z]; bb = z; } } bids.push(bb); B += bb; }
  const over = B - n, key = over >= 2 ? 'over by 2 or more' : over === 1 ? 'over by 1' : over === -1 ? 'under by 1' : 'under by 2 or more';
  /* first: forced opening lead or null. drawN: lead the lowest trump on my first drawN leads (while I hold one and still need a trick). */
  const play = (first, drawN) => { const h = hands.map(z => z.slice()), won = new Array(Pn).fill(0), seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]);
    let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [], f = first, myLeads = 0, hearts = 0;
    for (let left = Pn * n; left > 0; left--) { const lg = M.legalCards(h[turn], led); let c = null;
      if (turn === 0 && i === 0) { myLeads++; if (f != null) { c = f; f = null; } else if (myLeads <= drawN && won[0] < MYBID) { const tr = h[0].filter(x => M.suitOf(x) === trump); if (tr.length) c = tr[0]; } }
      if (c == null) c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen, voids, lens: h.map(z => z.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, true).card;
      h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[turn][led] = true; if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
      if (++i === Pn) { won[winner]++; if (winner === 0 && M.suitOf(winCard) === 1) hearts++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn; }
    let tot = 0; for (let q = 0; q < Pn; q++) tot += M.vienna(bids[q], won[q], n); return { money: M.vienna(MYBID, won[0], n) - tot / Pn, tricks: won[0], hearts }; };
  const res = OPEN.map(c => play(c, 0)).concat([play(null, 99), play(null, 2), play(null, 0)]);
  const st0 = { hand: hands[0], seen: new Uint8Array(52), voids: hands.map(() => [false, false, false, false]), lens: hands.map(() => n), bids, won: new Array(Pn).fill(0), turn: 0, led: -1, winCard: -1, winner: 0, playedInTrick: 0, trick: [], turned, trump, n, P: Pn };
  const g = grp(key); g.k++; res.forEach((r, i) => { g.v[i] += r.money; g.v2[i] += r.money * r.money; g.tricks[i] += r.tricks; g.hearts[i] += r.hearts; if (r.tricks === MYBID) g.made[i]++; if (r.tricks < MYBID) g.short[i]++; });
  const nl = T(M.netChoose(st0, true).card); g.netOpen[nl] = (g.netOpen[nl] || 0) + 1;
  if (PROBE && over >= 1) { M.READ.prec = 1; const o = M.readChoose({ Pn, n, trump, turned, bids, order: [0, 1, 2, 3], hand: hands[0], seen: st0.seen, voids: st0.voids, lens: st0.lens, won: st0.won, turn: 0, led: -1, winCard: -1, winner: 0, playedInTrick: 0, trick: [], hist: [] }, M.mulberry32((seed * 31 + dl) >>> 0));
    const rl = T(o.card); g.readOpen[rl] = (g.readOpen[rl] || 0) + 1; g.rk++; for (const z of o.alts) g.rv[T(z.card)] = (g.rv[T(z.card)] || 0) + z.score; }
}
console.log(JSON.stringify({ deals: total, seed, hand: mine.map(T).join(' '), bid: MYBID, netBid, LINES, G }));
