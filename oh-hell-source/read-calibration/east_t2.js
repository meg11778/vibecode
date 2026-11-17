/* Matt's discard hand, East's own choice at trick 2: holding 10♠ 6♣ 5♦ (bid 0, none taken), hearts led and East has none.
   What does a card-reading bot choose, how often, and how does it price the three throws?
   node east_t2.js     (OHHELL_ENGINE = folder holding ohhell-play.html) */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_e2_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,readLayouts,netChoose,mulberry32,suitOf,READ};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
const hist = [[2,'8♠'],[3,'3♠'],[0,'6♠'],[1,'J♥'], [1,'A♥'],[2,'K♥']].map(([seat, c]) => ({ seat, card: C(c) }));
const seen = new Uint8Array(52); for (const e of hist) seen[e.card] = 1;
const voids = [0, 1, 2, 3].map(() => [false, false, false, false]); voids[1][0] = true;
if (process.argv[3]) Object.assign(M.READ, JSON.parse(process.argv[3]));
const hand = (process.argv[2] || '10♠,6♣,5♦').split(',').map(C).sort((x, y) => x - y);
const S = { Pn: 4, n: 4, trump: 1, turned: C('9♥'), bids: [0, 2, 1, 0], order: [2, 3, 0, 1], hand, seen, voids, lens: [3, 2, 2, 3], won: [0, 1, 0, 0], turn: 3, led: 1, winCard: C('A♥'), winner: 1, playedInTrick: 2, trick: [C('A♥'), C('K♥')], hist };
const rand = M.mulberry32(99);
const net = M.netChoose({ hand, seen, voids, lens: S.lens, bids: S.bids, won: S.won, turn: 3, led: 1, winCard: S.winCard, winner: 1, playedInTrick: 2, trick: S.trick, turned: S.turned, trump: 1, n: 4, P: 4 }, 2).alts;
console.log('network alone: ' + net.map(x => T(x.card) + ' ' + x.score.toFixed(2)).join('   '));
for (const [prec, reps] of [[1, 300]]) { M.READ.prec = prec; const cnt = {}, sum = {}, sq = {};
  for (let r = 0; r < reps; r++) { const o = M.readChoose(S, rand); cnt[o.card] = (cnt[o.card] || 0) + 1; for (const x of o.alts) { sum[x.card] = (sum[x.card] || 0) + x.score; sq[x.card] = (sq[x.card] || 0) + x.score * x.score; } }
  console.log('precision x' + prec + ', ' + reps + ' runs: ' + hand.map(c => { const m = sum[c] / reps, sd = Math.sqrt(Math.max(0, sq[c] / reps - m * m)); return T(c) + ' chosen ' + (100 * (cnt[c] || 0) / reps).toFixed(0) + '%, worth ' + m.toFixed(2) + ' (run-to-run spread ' + sd.toFixed(2) + ')'; }).join(' | ')); }
// what East believes about the table at that moment (large sample)
M.READ.prec = 1; const L = M.readLayouts(S, rand, 4000 * 12, 4000); const who = ['You', 'West', 'North'];
const has = (q, f) => (100 * L.picks.filter(p => p[q].some(f)).length / L.picks.length).toFixed(0) + '%';
for (let q = 0; q < 3; q++) console.log(who[q] + ': a spade above the 10 ' + has(q, c => M.suitOf(c) === 0 && c > C('10♠')) + ', any spade ' + has(q, c => M.suitOf(c) === 0) + ', a club above the 6 ' + has(q, c => M.suitOf(c) === 3 && c > C('6♣')) + ', any club ' + has(q, c => M.suitOf(c) === 3) + ', a diamond above the 5 ' + has(q, c => M.suitOf(c) === 2 && c > C('5♦')) + ', a trump ' + has(q, c => M.suitOf(c) === 1));
