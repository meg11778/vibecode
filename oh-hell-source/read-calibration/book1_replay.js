/* Book hand 1: would today's bots bid and play the first tricks as in the book?
   Each bot decision is asked REPS times with fresh random numbers; prints how often each choice comes up.
   node replay.js [REPS]     (OHHELL_ENGINE = folder holding ohhell-play.html) */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_rp_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,simulateBid,muFor,auctionFactor,bidAt,legalCards,beatsCard,equivGroups,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const REPS = +process.argv[2] || 60;
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
const names = ['You (Matt)', 'West (Chaney)', 'NW (Bagley)', 'NE (Geoffrey)', 'East (Randy)'];
const hands = ['K♠ 2♠ 4♥ 3♣', 'A♠ 6♥ 8♣ 5♦', 'Q♠ 4♠ 8♥ A♣', 'A♥ 5♣ 8♦ 7♦', '3♥ 2♥ 7♣ 6♣'].map(s => s.split(' ').map(C).sort((x, y) => x - y));
const Pn = 5, n = 4, trump = 0, turned = C('6♠'), order = [4, 0, 1, 2, 3], actual = [1, 1, 2, 1, 0], rand = M.mulberry32(1118);
console.log('BIDS (simulation over 150 deals, ' + REPS + ' runs each; the bids ahead are the book\'s)');
const prior = []; let B = 0;
for (let pos = 0; pos < Pn; pos++) { const q = order[pos];
  if (q !== 0) { const cnt = {}; for (let r = 0; r < REPS; r++) { M.setKnown([turned]); const mu = M.muFor(hands[q], trump, n, Pn, pos), adj = Math.max(0, Math.min(n, mu * M.auctionFactor(n, Pn, B, Pn - pos))), model = { bid: M.bidAt(adj, n, pos === Pn - 1 ? n - B : -1), adj };
      const x = M.simulateBid(hands[q], trump, turned, n, Pn, pos, prior.slice(), model, (rand() * 4294967296) >>> 0, null), bd = x.bid != null ? x.bid : model.bid; cnt[bd] = (cnt[bd] || 0) + 1; }
    console.log('  ' + names[q].padEnd(14) + ' book bid ' + actual[q] + ' | bots: ' + Object.keys(cnt).sort().map(k => 'bid ' + k + ' ' + (100 * cnt[k] / REPS).toFixed(0) + '%').join(', ')); }
  prior.push(actual[q]); B += actual[q]; }
console.log('\nPLAY (card-reading bot, ' + REPS + ' runs at each choice; cards that are the same play are counted together)');
const hist = [[4,'3♥'],[0,'4♥'],[1,'6♥'],[2,'8♥'],[3,'A♥'], [3,'5♣'],[4,'6♣'],[0,'3♣'],[1,'8♣'],[2,'A♣'], [2,'4♠'],[3,'8♦'],[4,'7♣'],[0,'K♠'],[1,'A♠'], [1,'5♦'],[2,'Q♠'],[3,'7♦'],[4,'2♥'],[0,'2♠']].map(([seat, c]) => ({ seat, card: C(c) }));
const h = hands.map(x => x.slice()), won = [0, 0, 0, 0, 0], seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]), past = [];
let led = -1, winCard = -1, winner = 0, i = 0, trick = [], tn = 1;
for (const e of hist) { const q = e.seat, c = e.card; if (i === 0) winner = q; const lg = M.legalCards(h[q], led);
  if (q !== 0 && lg.length > 1) { const groups = M.equivGroups(lg, seen, trick, turned, winCard, trump), cnt = groups.map(() => 0);
    if (groups.length > 1) { const S = { Pn, n, trump, turned, bids: actual, order, hand: h[q].slice(), seen, voids, lens: h.map(x => x.length), won: won.slice(), turn: q, led, winCard, winner, playedInTrick: i, trick: trick.slice(), hist: past.slice() };
      const val = groups.map(() => 0); for (let r = 0; r < REPS; r++) { const o = M.readChoose(S, rand); cnt[groups.findIndex(g => g.includes(o.card))]++; groups.forEach((g, k) => { val[k] += o.alts.find(x => x.card === g[0]).score / REPS; }); }
      console.log('  trick ' + tn + ', ' + names[q].padEnd(14) + (i === 0 ? ' leads ' : ' plays ') + T(c) + ' in the book | bots: ' + groups.map((g, k) => g.map(T).join('=') + ' ' + (100 * cnt[k] / REPS).toFixed(0) + '% ($' + val[k].toFixed(2) + ')').join(', ')); }
    else console.log('  trick ' + tn + ', ' + names[q].padEnd(14) + ' plays ' + T(c) + ' | all its cards are the same play (' + lg.map(T).join('=') + ')'); }
  past.push(e); h[q].splice(h[q].indexOf(c), 1); seen[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[q][led] = true;
  if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = q; } if (++i === Pn) { won[winner]++; i = 0; led = -1; winCard = -1; trick = []; tn++; } }
