/* Matt's hand of 20 Nov 2026 (5 players, 4 cards, diamonds trump, zero bid holding 6♠ 6♥ 9♣ 7♣): how the chance of
   making the zero bid moves card by card, as seen from his seat. After each card of the first two tricks the hidden
   cards are read from everything seen so far, and the rest of the hand is played out by the network in every seat.
   node make_path.js     (OHHELL_ENGINE = folder holding ohhell-play.html) */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_mp_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readLayouts,netChoose,legalCards,beatsCard,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
const Pn = 5, n = 4, trump = 2, turned = C('6♦'), bids = [0, 0, 2, 1, 0], order = [3, 4, 0, 1, 2], names = ['You', 'West', 'NW', 'NE', 'East'];
const full = [[3,'5♠'],[4,'9♠'],[0,'6♠'],[1,'8♣'],[2,'10♠'], [2,'A♦'],[3,'8♦'],[4,'10♣'],[0,'6♥'],[1,'Q♥']].map(([seat, c]) => ({ seat, card: C(c) }));
const mine0 = ['6♠', '6♥', '9♣', '7♣'].map(C), rand = M.mulberry32(2011), K = 3000;
function state(k, extra) {      // the position after the first k cards (plus, optionally, one more card of mine)
  const hist = full.slice(0, k).concat(extra ? [extra] : []), seen = new Uint8Array(52), voids = [0,1,2,3,4].map(() => [false,false,false,false]), won = [0,0,0,0,0], lens = [4,4,4,4,4], hand = mine0.slice();
  let led = -1, winCard = -1, winner = 0, i = 0, trick = [], turn = order[0];
  for (const e of hist) { if (i === 0) winner = e.seat; if (e.seat === 0) hand.splice(hand.indexOf(e.card), 1); lens[e.seat]--; seen[e.card] = 1; trick.push(e.card);
    if (i === 0) led = M.suitOf(e.card); else if (M.suitOf(e.card) !== led) voids[e.seat][led] = true; if (M.beatsCard(e.card, winCard, trump)) { winCard = e.card; winner = e.seat; }
    if (++i === Pn) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (e.seat + 1) % Pn; }
  return { hist, seen, voids, won, lens, hand, led, winCard, winner, i, trick, turn }; }
function makePct(k, extra) { const st = state(k, extra); M.setKnown([turned]);
  const S = { Pn, n, trump, turned, bids, order, hand: st.hand.slice().sort((x, y) => x - y), seen: st.seen, voids: st.voids, lens: st.lens, won: st.won, turn: 0, led: st.led, winCard: st.winCard, winner: st.winner, playedInTrick: st.i, trick: st.trick, hist: st.hist };
  const L = M.readLayouts(S, rand, K * 12, K).picks; let made = 0, taker = [0,0,0,0,0], spareTo = 0;
  for (const pk of L) { const h = pk.map(x => x.slice()); h[0] = st.hand.slice(); const won = st.won.slice(), sn = Uint8Array.from(st.seen), vd = st.voids.map(x => x.slice());
    let turn = st.turn, led = st.led, winCard = st.winCard, winner = st.winner, i = st.i, trick = st.trick.slice(), left = h.reduce((s, x) => s + x.length, 0);
    for (; left > 0; left--) { const lg = M.legalCards(h[turn], led), c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen: sn, voids: vd, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, 0).card;
      h[turn].splice(h[turn].indexOf(c), 1); sn[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) vd[turn][led] = true; if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
      if (++i === Pn) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn; }
    if (won[0] === 0) made++; for (let q = 0; q < Pn; q++) if (won[q] > bids[q]) taker[q]++; }
  // what the reading believes about clubs
  const cl = c => M.suitOf(c) === 3, low = c => cl(c) && c < C('7♣'), mid = c => cl(c) && c > C('7♣') && c < C('9♣'), hi = c => cl(c) && c > C('9♣');
  const cnt = f => (L.reduce((s, pk) => s + pk.slice(1).reduce((u, x) => u + x.filter(f).length, 0), 0) / L.length).toFixed(2);
  return { made: (100 * made / L.length).toFixed(0) + '%', over: taker.map((x, q) => names[q] + ' ' + (100 * x / L.length).toFixed(0) + '%').join(', '), clubs: 'below the 7: ' + cnt(low) + ', above the 9: ' + cnt(hi) }; }
const lab = ['before a card is played', 'NE leads 5♠', 'East 9♠', 'You 6♠ (forced)', 'West throws 8♣', 'NW wins with 10♠', 'NW leads A♦', 'NE 8♦', 'East throws 10♣', 'You throw 6♥', 'West throws Q♥'];
console.log('after…'.padEnd(26) + 'you make 0'.padEnd(12) + 'who ends up taking more than they bid'.padEnd(64) + 'clubs the others hold, on average');
for (let k = 0; k <= 10; k++) { const r = makePct(k); console.log(lab[k].padEnd(26) + r.made.padEnd(12) + r.over.padEnd(64) + r.clubs); }
console.log('\nat your trick-2 choice (A♦, 8♦, 10♣ on the table):');
for (const c of ['6♥', '9♣', '7♣']) { const r = makePct(8, { seat: 0, card: C(c) }); console.log('  throw ' + c + ': you make 0 ' + r.made); }
