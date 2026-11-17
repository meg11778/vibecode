/* For each card East might still hold: how likely the network makes each of East's three plays (the reading's own formula). */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_ew_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={netChoose,legalCards,beatsCard,suitOf,READ};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
const hist = [[2,'8♠'],[3,'3♠'],[0,'6♠'],[1,'J♥'], [1,'A♥'],[2,'K♥'],[3,'5♦'],[0,'2♥'], [1,'2♣'],[2,'4♣'],[3,'6♣']].map(([seat, c]) => ({ seat, card: C(c) }));
const bids = [0, 2, 1, 0], trump = 1, turned = C('9♥'), Pn = 4, n = 4, mineNow = [C('4♠'), C('10♦')];
const used = new Set(hist.map(e => e.card).concat(mineNow, [turned]));
const beta = +process.argv[2] || 2, eps = process.argv[3] === undefined ? 0.02 : +process.argv[3];
const rows = [];
for (let X = 0; X < 52; X++) { if (used.has(X) || M.suitOf(X) === 1) continue;
  const h = [C('3♠'), C('5♦'), C('6♣'), X], won = [0,0,0,0], seen = new Uint8Array(52), voids = [0,1,2,3].map(() => [false,false,false,false]), lens = [4,4,4,4];
  let led = -1, winCard = -1, winner = 0, i = 0, trick = [], ps = [];
  for (const e of hist) { const q = e.seat, c = e.card; if (i === 0) winner = q;
    if (q === 3) { const lg = M.legalCards(h, led); let p = 1;
      if (lg.length > 1) { const al = M.netChoose({ hand: h, seen, voids, lens, bids, won, turn: q, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, 2).alts;
        let mx = -Infinity, zc = 0; for (const x of al) { if (x.score > mx) mx = x.score; if (x.card === c) zc = x.score; } let tot = 0; for (const x of al) tot += Math.exp(beta * (x.score - mx));
        p = (1 - eps) * Math.exp(beta * (zc - mx)) / tot + eps / lg.length; ps.push(al.map(x => T(x.card) + ':' + x.score.toFixed(2)).join(' ')); } else ps.push('forced');
      ps.push(p); h.splice(h.indexOf(c), 1); }
    lens[q]--; seen[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[q][led] = true;
    if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = q; } if (++i === Pn) { won[winner]++; i = 0; led = -1; winCard = -1; trick = []; } }
  rows.push({ X, p1: ps[1], p2: ps[3], p3: ps[5], d2: ps[2], d3: ps[4] }); }
console.log('last card | trick1 3♠ | trick2 threw 5♦ | trick3 6♣ | all three | network scores at trick 2');
for (const r of rows) console.log(T(r.X).padEnd(4), r.p1.toFixed(2).padStart(8), r.p2.toFixed(3).padStart(12), r.p3.toFixed(2).padStart(12), (r.p1 * r.p2 * r.p3).toFixed(4).padStart(10), '  ', r.d2);
