/* Matt's discard hand: what does the reading think East's last card is, when I choose at trick 3? */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_el_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readLayouts,READ};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
// seats: You 0, West 1, North 2, East 3
const hist = [[2,'8♠'],[3,'3♠'],[0,'6♠'],[1,'J♥'], [1,'A♥'],[2,'K♥'],[3,'5♦'],[0,'2♥'], [1,'2♣'],[2,'4♣'],[3,'6♣']].map(([seat, c]) => ({ seat, card: C(c) }));
const seen = new Uint8Array(52); for (const e of hist) seen[e.card] = 1;
const voids = [[false,false,false,false],[true,false,false,false],[false,false,false,false],[false,true,false,false]];
const S = { Pn: 4, n: 4, trump: 1, turned: C('9♥'), bids: [0, 2, 1, 0], order: [2, 3, 0, 1], hand: [C('4♠'), C('10♦')], seen, voids, lens: [2, 1, 1, 1], turn: 0, hist };
let s = 12345; const rand = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
for (const [name, set] of [['as published (beta 2, eps 0.02)', {}], ['bids only', { noPlay: true }], ['softer (beta 1, eps 0.1)', { beta: 1, eps: 0.1 }]]) {
  const keep = Object.assign({}, M.READ); Object.assign(M.READ, set);
  const K = 4000, L = M.readLayouts(S, rand, K * 12, K), cnt = {};
  for (const h of L.picks) { const c = h[3][0]; cnt[c] = (cnt[c] || 0) + 1; }
  const suit = [0, 0, 0, 0]; for (const c in cnt) suit[Math.floor(c / 13)] += cnt[c];
  console.log('\n' + name + '  (layouts that explain the play, effective: ' + (L.ess == null ? '-' : Math.round(L.ess)) + ')');
  console.log('  East\'s last card by suit:  ' + '♠♥♦♣'.split('').map((x, i) => x + ' ' + (100 * suit[i] / K).toFixed(1) + '%').join('   '));
  console.log('  spade below the 4: ' + (100 * (cnt[C('2♠')] || 0) / K).toFixed(1) + '%   diamond below the 10: ' + (100 * Object.keys(cnt).filter(c => c >= 26 && c < C('10♦')).reduce((x, c) => x + cnt[c], 0) / K).toFixed(1) + '%');
  console.log('  ' + Object.keys(cnt).map(Number).sort((x, y) => cnt[y] - cnt[x]).slice(0, 14).map(c => T(c) + ' ' + (100 * cnt[c] / K).toFixed(1)).join('  '));
  Object.assign(M.READ, keep);
}
