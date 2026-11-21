/* Axiom 2 (Matt, 21 Nov 2026), an open question: on opening lead in a 7-card round with one small trump, 2-2-2 in the
   side suits and two aces, bid 2, table overbid: cash an ace at once, or lead the small trump first?
   Seat 0 (first to bid, on lead) is given such a hand: one trump from 2 to 6, ace + one other card in two side suits,
   two cards below the ace in the third. It bids 2. The other seats get random cards and bid as the bidding network says
   the game's bots do. Each opening lead is then played out on the same deal with the plain network in every seat.
   node ace_or_trump.js <P> <deals> <seed>          prints one JSON summary. Leads: ace, trump, low card under the ace,
   high and low card of the aceless suit. Groups: table over by 1, by 2+, under by 1, by 2+. */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_aot_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,netChoose,legalCards,beatsCard,bidNetProbs,vienna,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const [Pn, deals, seed] = process.argv.slice(2, 5).map(Number), n = 7, rng = M.mulberry32(seed), ri = k => (rng() * k) | 0;
const PROBE = +(process.env.PROBE || 0), SECS = +(process.env.SECS || 1e9), T0 = Date.now();
const LEADS = ['ace', 'trump', 'low under the ace', 'top of the aceless suit', 'bottom of the aceless suit'], G = {};
const grp = (key) => G[key] = G[key] || { k: 0, v: LEADS.map(() => 0), made: LEADS.map(() => 0), tricks: LEADS.map(() => 0), d: 0, d2: 0, bust: LEADS.map(() => 0), netLead: LEADS.map(() => 0), readLead: LEADS.map(() => 0), rk: 0, rd: 0, rd2: 0 };
let netBid2 = 0, total = 0;
for (let dl = 0; dl < deals && Date.now() - T0 < SECS * 1000; dl++) {
  const suits = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = ri(i + 1); [suits[i], suits[j]] = [suits[j], suits[i]]; }
  const [trump, s1, s2, s3] = suits, myT = trump * 13 + ri(5); let turned; do { turned = trump * 13 + ri(13); } while (turned === myT);
  const c1 = s1 * 13 + ri(12), c2 = s2 * 13 + ri(12); let x = ri(12), y; do { y = ri(12); } while (y === x); const hi3 = s3 * 13 + Math.max(x, y), lo3 = s3 * 13 + Math.min(x, y);
  const mine = [myT, s1 * 13 + 12, c1, s2 * 13 + 12, c2, hi3, lo3], used = new Set(mine); used.add(turned);
  const deck = []; for (let c = 0; c < 52; c++) if (!used.has(c)) deck.push(c); for (let i = deck.length - 1; i > 0; i--) { const j = ri(i + 1); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const hands = [mine.slice().sort((p, q) => p - q)]; for (let q = 1; q < Pn; q++) hands.push(deck.slice((q - 1) * n, q * n).sort((p, q2) => p - q2));
  M.setKnown([turned]); total++;
  { const pb = M.bidNetProbs(Pn, n, turned, 0, hands[0], []); let best = 0; for (let q = 1; q <= n; q++) if (pb[q] > pb[best]) best = q; if (best === 2) netBid2++; }
  const bids = [2]; let B = 2;
  for (let q = 1; q < Pn; q++) { const pb = M.bidNetProbs(Pn, n, turned, q, hands[q], bids), u = rng(); let acc = 0, bb = n; for (let z = 0; z <= n; z++) { acc += pb[z]; if (u < acc) { bb = z; break; } }
    if (q === Pn - 1 && bb === n - B) { let bp = -1; for (let z = 0; z <= n; z++) if (z !== n - B && pb[z] > bp) { bp = pb[z]; bb = z; } } bids.push(bb); B += bb; }
  const over = B - n, key = over >= 2 ? 'over by 2 or more' : over === 1 ? 'over by 1' : over === -1 ? 'under by 1' : 'under by 2 or more';
  const play = first => { const h = hands.map(z => z.slice()), won = new Array(Pn).fill(0), seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]);
    let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [], f = first;
    for (let left = Pn * n; left > 0; left--) { const lg = M.legalCards(h[turn], led); let c; if (f != null) { c = f; f = null; } else c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen, voids, lens: h.map(z => z.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, true).card;
      h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[turn][led] = true; if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
      if (++i === Pn) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn; }
    let tot = 0; for (let q = 0; q < Pn; q++) tot += M.vienna(bids[q], won[q], n); return { money: M.vienna(2, won[0], n) - tot / Pn, tricks: won[0] }; };
  const cards = [s1 * 13 + 12, myT, c1, hi3, lo3], res = cards.map(play);
  const st0 = { hand: hands[0], seen: new Uint8Array(52), voids: hands.map(() => [false, false, false, false]), lens: hands.map(() => n), bids, won: new Array(Pn).fill(0), turn: 0, led: -1, winCard: -1, winner: 0, playedInTrick: 0, trick: [], turned, trump, n, P: Pn };
  const nl = M.netChoose(st0, true).card, cat = c => c === myT ? 1 : (c === s1 * 13 + 12 || c === s2 * 13 + 12) ? 0 : (c === c1 || c === c2) ? 2 : c === hi3 ? 3 : 4;
  let rv = null, rl = -1;
  if (PROBE && over >= 1 && rng() < PROBE) { M.READ.prec = 2; const o = M.readChoose({ Pn, n, trump, turned, bids, order: [...Array(Pn).keys()], hand: hands[0], seen: st0.seen, voids: st0.voids, lens: st0.lens, won: st0.won, turn: 0, led: -1, winCard: -1, winner: 0, playedInTrick: 0, trick: [], hist: [] }, M.mulberry32((seed * 31 + dl) >>> 0));
    rl = cat(o.card); const val = c => { const z = o.alts.find(q => q.card === c); return z ? z.score : null; }, va = Math.max(val(s1 * 13 + 12) ?? -99, val(s2 * 13 + 12) ?? -99), vt = val(myT); if (vt != null && va > -99) rv = vt - va; }
  for (const k2 of [key, key + ' | trump ' + (myT % 13 <= 1 ? '2-3' : '4-6'), key + ' | ace with ' + (c1 % 13 >= 9 ? 'J-K' : 'a low card')]) { const g = grp(k2); g.k++; res.forEach((r, i) => { g.v[i] += r.money; g.tricks[i] += r.tricks; if (r.tricks === 2) g.made[i]++; if (r.tricks < 2) g.bust[i]++; });
    const d = res[1].money - res[0].money; g.d += d; g.d2 += d * d; g.netLead[cat(nl)]++; if (rl >= 0) { g.readLead[rl]++; } if (rv != null) { g.rk++; g.rd += rv; g.rd2 += rv * rv; } }
}
console.log(JSON.stringify({ P: Pn, n, deals: total, seed, netBid2, LEADS, G }));
