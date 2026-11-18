/* Matt's hand of 18 Nov 2026: 5 players, 3 cards, diamonds trump (7♦ turned). On lead with 9♦ 3♦ 2♣, bid 1, bids
   1 0 1 1 1 (one more bid than tricks). Lead the club, the big trump or the small trump?
   Prices each lead as the bot does, then plays each lead out on the same imagined layouts (every seat then plays the
   network's card) and counts what happens.
   node lead.js ['9♦,3♦,2♣']    (OHHELL_ENGINE = folder holding ohhell-play.html) */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_ld_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,readLayouts,netChoose,legalCards,beatsCard,vienna,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
const Pn = 5, n = 3, trump = 2, turned = C('7♦'), bids = [1, 0, 1, 1, 1], order = [0, 1, 2, 3, 4];
const hand = (process.argv[2] || '9♦,3♦,2♣').split(',').map(C).sort((x, y) => x - y);
const seen = new Uint8Array(52), voids = [0, 1, 2, 3, 4].map(() => [false, false, false, false]);
const S = { Pn, n, trump, turned, bids, order, hand, seen, voids, lens: [3, 3, 3, 3, 3], won: [0, 0, 0, 0, 0], turn: 0, led: -1, winCard: -1, winner: 0, playedInTrick: 0, trick: [], hist: [] };
const rand = M.mulberry32(1811); M.setKnown([turned]);
const net = M.netChoose({ hand, seen, voids, lens: S.lens, bids, won: S.won, turn: 0, led: -1, winCard: -1, winner: 0, playedInTrick: 0, trick: [], turned, trump, n, P: Pn }, 2).alts;
console.log('network alone: ' + net.map(x => T(x.card) + ' ' + x.score.toFixed(2)).join('   '));
M.READ.prec = 10; const sum = {}, R = 10; for (let r = 0; r < R; r++) for (const x of M.readChoose(S, rand).alts) sum[x.card] = (sum[x.card] || 0) + x.score / R; M.READ.prec = 1;
console.log('card reading, 10x precision, ' + R + ' runs: ' + hand.map(c => T(c) + ' worth $' + sum[c].toFixed(2)).join('   '));
// the same layouts for every lead; after the lead every seat plays the network's card
const K = 4000, L = M.readLayouts(S, rand, K * 12, K).picks, hi = c => M.suitOf(c) === trump && c > C('9♦'), tr = c => M.suitOf(c) === trump;
const stats = {};
for (const lead of hand) { const st = stats[lead] = { tricks: [0, 0, 0, 0], money: 0, firstWon: 0, othersBust: 0, cls: {} };
  for (const pk of L) { const h = pk.map(x => x.slice()); h[0] = hand.slice(); const won = [0, 0, 0, 0, 0], sn = new Uint8Array(52), vd = h.map(() => [false, false, false, false]);
    let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [], first = true, t1 = -1;
    for (let left = Pn * n; left > 0; left--) { const lg = M.legalCards(h[turn], led); let c;
      if (first) { c = lead; first = false; } else c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen: sn, voids: vd, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, 0).card;
      h[turn].splice(h[turn].indexOf(c), 1); sn[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) vd[turn][led] = true;
      if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
      if (++i === Pn) { won[winner]++; if (t1 < 0) t1 = winner; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn; }
    let tot = 0; for (let q = 0; q < Pn; q++) tot += M.vienna(bids[q], won[q], n); const mine = M.vienna(bids[0], won[0], n) - tot / Pn;
    st.tricks[won[0]]++; st.money += mine; if (t1 === 0) st.firstWon++; for (let q = 1; q < Pn; q++) if (won[q] !== bids[q]) st.othersBust++;
    // class of layout: how many trumps above the 9 are out, and whether any opponent holds two or more trumps
    const nHi = pk.slice(1).reduce((s, x) => s + x.filter(hi).length, 0), two = pk.slice(1).some(x => x.filter(tr).length >= 2), key = (nHi === 0 ? 'no trump above the 9 out' : nHi === 1 ? 'one trump above the 9 out' : 'two or more above the 9 out') + (two ? ', someone holds 2+ trumps' : ', nobody holds two trumps');
    const cl = st.cls[key] = st.cls[key] || { k: 0, made: 0, money: 0 }; cl.k++; cl.money += mine; if (won[0] === 1) cl.made++; } }
console.log('\nplayed out on ' + K + ' layouts fitted to the bids (network plays every seat after the lead):');
for (const lead of hand) { const st = stats[lead]; console.log('  lead ' + T(lead).padEnd(3) + ' worth $' + (st.money / K).toFixed(2) + ' | you take 0: ' + (100 * st.tricks[0] / K).toFixed(1) + '%  exactly 1: ' + (100 * st.tricks[1] / K).toFixed(1) + '%  2 or more: ' + (100 * (st.tricks[2] + st.tricks[3]) / K).toFixed(1) + '% | the lead wins trick 1: ' + (100 * st.firstWon / K).toFixed(1) + '% | opponents busted per hand: ' + (st.othersBust / K).toFixed(2)); }
console.log('\nby kind of layout (share of layouts; made % for each lead):');
const keys = Object.keys(stats[hand[0]].cls).sort();
for (const key of keys) console.log('  ' + key.padEnd(62) + (100 * stats[hand[0]].cls[key].k / K).toFixed(1).padStart(5) + '% | ' + hand.map(c => T(c) + ' ' + (100 * stats[c].cls[key].made / stats[c].cls[key].k).toFixed(0) + '% ($' + (stats[c].cls[key].money / stats[c].cls[key].k).toFixed(2) + ')').join('   '));
const pc = f => (100 * L.filter(f).length / K).toFixed(1) + '%';
console.log('\nthe layouts: no opponent trump above the 9: ' + pc(p => !p.slice(1).some(x => x.some(hi))) + ' | some opponent holds 2+ trumps: ' + pc(p => p.slice(1).some(x => x.filter(tr).length >= 2)) + ' | opponents\' trumps in all, average ' + (L.reduce((s, p) => s + p.slice(1).reduce((u, x) => u + x.filter(tr).length, 0), 0) / K).toFixed(2) + ' | some opponent is out of clubs: ' + pc(p => p.slice(1).some(x => !x.some(c => M.suitOf(c) === 3))));
