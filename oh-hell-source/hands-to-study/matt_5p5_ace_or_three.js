/* Matt's hand of 22 Nov 2026 (5 players, 5 cards, spades trump, K♠ turned, dealer NE). Bids: East 2, You 0, West 2,
   NW 0, NE 0 (table under by one). Trick 3: NE (busted, 1 taken) leads the J♥, East plays the 5♥, and You (bid 0,
   none taken, out of hearts and trumps) must throw from 3♣ A♦ 6♦. Matt threw the A♦; the report at Very high
   precision prefers the 3♣. What does each throw earn, and in which layouts?   node discard_t3.js */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_h5_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,readLayouts,netChoose,legalCards,beatsCard,vienna,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
const Pn = 5, n = 5, trump = 0, turned = C('K♠'), bids = [0, 2, 0, 0, 2], order = [4, 0, 1, 2, 3], ME = 0, NAMES = ['You', 'West', 'NW', 'NE', 'East'];
const hist = [[4,'8♠'],[0,'10♥'],[1,'10♠'],[2,'6♠'],[3,'7♠'], [1,'4♣'],[2,'2♦'],[3,'10♣'],[4,'6♣'],[0,'9♣'], [3,'J♥'],[4,'5♥']].map(([seat, c]) => ({ seat, card: C(c) }));
const seen = new Uint8Array(52); for (const e of hist) seen[e.card] = 1;
const voids = [0, 1, 2, 3, 4].map(() => [false, false, false, false]); voids[0][0] = true; voids[2][3] = true;
const hand = ['3♣', 'A♦', '6♦'].map(C).sort((x, y) => x - y), won0 = [0, 1, 0, 1, 0], lens = [3, 3, 3, 2, 2];
const S = () => ({ Pn, n, trump, turned, bids, order, hand, seen, voids, lens, won: won0, turn: ME, led: 1, winCard: C('J♥'), winner: 3, playedInTrick: 2, trick: [C('J♥'), C('5♥')], hist });
const rand = M.mulberry32(77); M.setKnown([turned]);
const net = M.netChoose({ hand, seen, voids, lens, bids, won: won0, turn: ME, led: 1, winCard: C('J♥'), winner: 3, playedInTrick: 2, trick: S().trick, turned, trump, n, P: Pn }, 2).alts;
console.log('network alone: ' + net.map(x => T(x.card) + ' ' + x.score.toFixed(2)).join('   '));
for (const [prec, reps] of [[1, 60], [10, 10]]) { M.READ.prec = prec; const cnt = {}, sum = {}; let lay = 0; for (let r = 0; r < reps; r++) { const o = M.readChoose(S(), rand); cnt[o.card] = (cnt[o.card] || 0) + 1; lay += o.layouts; for (const x of o.alts) sum[x.card] = (sum[x.card] || 0) + x.score / reps; }
  console.log('card reading, precision x' + prec + ', ' + reps + ' runs (' + Math.round(lay / reps) + ' layouts): ' + hand.map(c => T(c) + ' thrown ' + (100 * (cnt[c] || 0) / reps).toFixed(0) + '%, worth $' + sum[c].toFixed(2)).join(' | ')); }
M.READ.prec = 1;
/* layouts as the report draws them, then each throw played out with the network in every seat */
const K = 3000, R = M.readLayouts(S(), rand, K * 4, K), L = R.picks; console.log('layouts that fit the bids: ' + R.cands.length + ' of ' + K * 4 + ' tried slots; effective ' + Math.round(R.ess));
const stat = {}, tot = hand.map(() => ({ made: 0, money: 0, tricks: 0 })); const lead4 = hand.map(() => ({}));
for (const pk of L) { const wHas = s => pk[1].some(c => M.suitOf(c) === s), key = 'West (next to play): ' + (pk[1].filter(c => M.suitOf(c) === 1).some(c => c > C('J♥')) ? 'can beat the J♥' : pk[1].some(c => M.suitOf(c) === 1) ? 'has only lower hearts' : pk[1].some(c => M.suitOf(c) === 0) ? 'no heart, has a trump' : 'no heart, no trump');
  const st = stat[key] = stat[key] || { k: 0, r: hand.map(() => ({ made: 0, money: 0 })) }; st.k++;
  hand.forEach((first, idx) => { const h = pk.map(x => x.slice()); h[ME] = hand.slice(); const won = won0.slice(), sn = Uint8Array.from(seen), vd = voids.map(x => x.slice());
    let turn = ME, led = 1, winCard = C('J♥'), winner = 3, i = 2, trick = S().trick.slice(), f = first, left = h.reduce((s, x) => s + x.length, 0), tr = 3, leader4 = -1;
    for (; left > 0; left--) { const lg = M.legalCards(h[turn], led); let c; if (f != null) { c = f; f = null; } else c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen: sn, voids: vd, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, 0).card;
      h[turn].splice(h[turn].indexOf(c), 1); sn[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) vd[turn][led] = true; if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
      if (++i === Pn) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; tr++; } else turn = (turn + 1) % Pn; }
    let t2 = 0; for (let q = 0; q < Pn; q++) t2 += M.vienna(bids[q], won[q], n); const money = M.vienna(0, won[ME], n) - t2 / Pn, made = won[ME] === 0 ? 1 : 0;
    st.r[idx].made += made; st.r[idx].money += money; tot[idx].made += made; tot[idx].money += money; tot[idx].tricks += won[ME]; }); }
console.log('\neach throw played out on ' + L.length + ' layouts (plain network in every seat afterwards):');
for (const key of Object.keys(stat).sort((x, y) => stat[y].k - stat[x].k)) { const st = stat[key]; console.log('  ' + key.padEnd(44) + (100 * st.k / L.length).toFixed(1).padStart(5) + '% | ' + hand.map((c, i) => T(c) + ': zero made ' + (100 * st.r[i].made / st.k).toFixed(0) + '% ($' + (st.r[i].money / st.k).toFixed(2) + ')').join(' | ')); }
console.log('  ' + 'all layouts'.padEnd(44) + '       | ' + hand.map((c, i) => T(c) + ': zero made ' + (100 * tot[i].made / L.length).toFixed(1) + '% ($' + (tot[i].money / L.length).toFixed(2) + ')').join(' | '));
