/* Matt's book hand 1 (5 players, 4 cards, spades trump): at trick 3 NW leads the 4♠, NE and East show out, and
   You (bid 1, none taken) hold K♠ 2♠ with West (bid 1, none taken) still to play. King or two?
   Prints the bot's price for each card, and what the reading believes about West's and NW's cards.
   node k_or_2.js ['<READ settings JSON>']     (OHHELL_ENGINE = folder holding ohhell-play.html) */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_b1_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,readLayouts,netChoose,mulberry32,suitOf,READ,bidNetProbs,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
if (process.argv[2]) Object.assign(M.READ, JSON.parse(process.argv[2]));
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
// seats: You 0, West 1, NW 2, NE 3, East 4
const hist = [[4,'3♥'],[0,'4♥'],[1,'6♥'],[2,'8♥'],[3,'A♥'], [3,'5♣'],[4,'6♣'],[0,'3♣'],[1,'8♣'],[2,'A♣'], [2,'4♠'],[3,'8♦'],[4,'7♣']].map(([seat, c]) => ({ seat, card: C(c) }));
const seen = new Uint8Array(52); for (const e of hist) seen[e.card] = 1;
const voids = [0, 1, 2, 3, 4].map(() => [false, false, false, false]); voids[3][0] = true; voids[4][0] = true;
const S = { Pn: 5, n: 4, trump: 0, turned: C('6♠'), bids: [1, 1, 2, 1, 0], order: [4, 0, 1, 2, 3], hand: [C('2♠'), C('K♠')], seen, voids, lens: [2, 2, 1, 1, 1], won: [0, 0, 1, 1, 0], turn: 0, led: 0, winCard: C('4♠'), winner: 2, playedInTrick: 3, trick: [C('4♠'), C('8♦'), C('7♣')], hist };
const rand = M.mulberry32(2026);
M.setKnown([S.turned]);
const net = M.netChoose({ hand: S.hand, seen, voids, lens: S.lens, bids: S.bids, won: S.won, turn: 0, led: 0, winCard: S.winCard, winner: 2, playedInTrick: 3, trick: S.trick, turned: S.turned, trump: 0, n: 4, P: 5 }, 2).alts;
console.log('network alone: ' + net.map(x => T(x.card) + ' ' + x.score.toFixed(2)).join('   '));
const keepPrec = M.READ.prec; M.READ.prec = 10; const sum = {}, R = 12; for (let r = 0; r < R; r++) for (const x of M.readChoose(S, rand).alts) sum[x.card] = (sum[x.card] || 0) + x.score / R; M.READ.prec = keepPrec;
console.log('card reading, 10x precision, ' + R + ' runs: ' + S.hand.map(c => T(c) + ' worth ' + sum[c].toFixed(2)).join('   '));
const A = C('A♠'), sp = c => M.suitOf(c) === 0;
for (const [name, set] of [['the reading', {}], ['bids only', { noPlay: true }]]) { const keep = Object.assign({}, M.READ); Object.assign(M.READ, set);
  const K = 6000, L = M.readLayouts(S, rand, K * 12, K).picks, pc = f => (100 * L.filter(f).length / L.length).toFixed(1) + '%'; Object.assign(M.READ, keep);
  const W = p => p[1], N = p => p[2][0];
  console.log('\n' + name + ':');
  console.log('  West: A♠ alone ' + pc(p => W(p).includes(A) && W(p).filter(sp).length === 1) + ' | A♠ and another spade ' + pc(p => W(p).includes(A) && W(p).filter(sp).length === 2) + ' | one spade, not the ace ' + pc(p => !W(p).includes(A) && W(p).filter(sp).length === 1) + ' | two spades, no ace ' + pc(p => !W(p).includes(A) && W(p).filter(sp).length === 2) + ' | no spade ' + pc(p => W(p).filter(sp).length === 0));
  console.log('  NW\'s last card: A♠ ' + pc(p => N(p) === A) + ' | Q♠ ' + pc(p => N(p) === C('Q♠')) + ' | another spade ' + pc(p => sp(N(p)) && N(p) !== A && N(p) !== C('Q♠')) + ' | not a spade ' + pc(p => !sp(N(p))));
  console.log('  nobody but You holds a spade after this trick if West has none now and NW\'s card is no spade: ' + pc(p => W(p).filter(sp).length === 0 && !sp(N(p))));
  // outcome by simple logic (West plays to make exactly its bid): does each play make Your bid of 1?
  const res = p => { const w = W(p).filter(sp), nw = N(p), wA = w.includes(A);
    // play K
    let k; if (wA && w.length === 1) k = 0; else if (wA) k = 1; /* West ducks, its ace wins the last trick */ else k = (sp(nw) || w.length === 2 || (w.length === 1 && false)) ? 1 : (w.length === 1 ? 2 : 2);
    if (!wA && w.length >= 1 && !sp(nw)) k = w.length === 2 ? 1 : 2;       // West follows low now; a second spade of West's beats the 2 later, otherwise the 2 wins: two tricks
    // play 2
    let t; if (nw === A) t = 0; else if (wA && w.length === 2 && w.some(c => c !== A && c < C('4♠'))) t = 0; else t = 1;
    return [k, t]; };
  let mk = 0, mt = 0, both = 0, kOnly = 0, tOnly = 0; for (const p of L) { const [k, t] = res(p); if (k === 1) mk++; if (t === 1) mt++; if (k === 1 && t !== 1) kOnly++; if (t === 1 && k !== 1) tOnly++; }
  console.log('  by plain logic: the king makes the bid ' + (100 * mk / L.length).toFixed(1) + '%, the two ' + (100 * mt / L.length).toFixed(1) + '% (only the king works ' + (100 * kOnly / L.length).toFixed(1) + '%, only the two ' + (100 * tOnly / L.length).toFixed(1) + '%)'); }
