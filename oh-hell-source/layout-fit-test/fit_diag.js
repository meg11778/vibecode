/* Why does the card-reading bot over-value openings on overbid 10-card deals? (21 Nov 2026)
   Matt's hand on lead; deals where the table is over by exactly OVER (default 1). For each: how many of the 360
   imagined layouts fit the bids within the search budget (READ.tries per layout), and what the bot thinks the
   trump opening and the A♥ opening are worth as the budget is raised.   node fit_diag.js <deals> <seed> */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_fd_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,readLayouts,netChoose,legalCards,beatsCard,bidNetProbs,vienna,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const Pn = 4, n = 10, trump = 0, turned = C('A♠'), MYBID = 3, mine = '4♠ 3♠ 2♠ A♥ Q♥ J♥ A♣ 2♣ J♦ 4♦'.split(' ').map(C).sort((x, y) => x - y);
const [deals, seed] = process.argv.slice(2, 4).map(Number), OVER = +(process.env.OVER || 1), rng = M.mulberry32(seed), ri = k => (rng() * k) | 0;
const CONF = JSON.parse(process.env.CONF || '[{"tries":30},{"tries":300},{"tries":3000},{"tries":30,"strict":true}]'), base = Object.assign({}, M.READ);
const acc = CONF.map(() => ({ t: 0, a: 0, d: 0, d2: 0, ms: 0, trumpFirst: 0 })); let k = 0, fitSum = 0, fitHist = [0, 0, 0, 0, 0], oppTr = 0;
while (k < deals) {
  const used = new Set(mine); used.add(turned); const deck = []; for (let c = 0; c < 52; c++) if (!used.has(c)) deck.push(c); for (let i = deck.length - 1; i > 0; i--) { const j = ri(i + 1); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const hands = [mine.slice()]; for (let q = 1; q < Pn; q++) hands.push(deck.slice((q - 1) * n, q * n).sort((p, q2) => p - q2)); M.setKnown([turned]);
  const bids = [MYBID]; let B = MYBID;
  for (let q = 1; q < Pn; q++) { const pb = M.bidNetProbs(Pn, n, turned, q, hands[q], bids), u = rng(); let s = 0, bb = n; for (let z = 0; z <= n; z++) { s += pb[z]; if (u < s) { bb = z; break; } }
    if (q === Pn - 1 && bb === n - B) { let bp = -1; for (let z = 0; z <= n; z++) if (z !== n - B && pb[z] > bp) { bp = pb[z]; bb = z; } } bids.push(bb); B += bb; }
  if (B - n !== OVER) continue; k++;
  const S = () => ({ Pn, n, trump, turned, bids, order: [0, 1, 2, 3], hand: hands[0], seen: new Uint8Array(52), voids: hands.map(() => [false, false, false, false]), lens: hands.map(() => n), won: [0, 0, 0, 0], turn: 0, led: -1, winCard: -1, winner: 0, playedInTrick: 0, trick: [], hist: [] });
  Object.assign(M.READ, base, { strict: true, tries: 30 }); const f = M.readLayouts(S(), M.mulberry32(seed * 131 + k), 360, 30).cands.length; fitSum += f; fitHist[Math.min(4, Math.floor(f / 90))]++;
  CONF.forEach((cf, ci) => { Object.assign(M.READ, base, { rounds: 1 }, cf); const t0 = Date.now(), o = M.readChoose(S(), M.mulberry32(seed * 977 + k * 13 + ci)); const v = c => o.alts.find(z => z.card === c).score, A = acc[ci], d = v(C('2♠')) - v(C('A♥'));
    A.ms += Date.now() - t0; A.t += v(C('2♠')); A.a += v(C('A♥')); A.d += d; A.d2 += d * d; if (M.suitOf(o.card) === 0) A.trumpFirst++; });
}
Object.assign(M.READ, base);
console.log(JSON.stringify({ deals: k, over: OVER, fittedOf360: +(fitSum / k).toFixed(0), fitHist, conf: CONF.map((cf, i) => { const A = acc[i], m = A.d / k; return { cf, trump: +(A.t / k).toFixed(2), aceH: +(A.a / k).toFixed(2), gap: +m.toFixed(2), gapCI: +(1.96 * Math.sqrt((A.d2 / k - m * m) / k)).toFixed(2), opensTrump: +(A.trumpFirst / k).toFixed(2), ms: Math.round(A.ms / k) }; }) }, null, 1));
