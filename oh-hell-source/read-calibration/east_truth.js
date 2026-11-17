/* Matt's discard hand: what a card-reading bot in East's seat really does, for each card East might still hold.
   East's choices depend only on East's own cards and what everyone has seen, so they can be replayed exactly:
   for each possible last card X, East holds 3♠ 5♦ 6♣ X and the bot is asked for its play at each of East's three turns,
   REPS times with fresh random numbers. The share of times it plays what East actually played is the true likelihood;
   times the chance of X from the bids alone, that gives the true odds of East's last card.
   node east_truth.js [REPS]     (OHHELL_ENGINE = folder holding ohhell-play.html) */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_et_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,readLayouts,netChoose,legalCards,beatsCard,suitOf,mulberry32,READ};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
const REPS = +process.argv[2] || 40, only = process.argv[3] ? process.argv[3].split(',').map(C) : null;
const hist = [[2,'8♠'],[3,'3♠'],[0,'6♠'],[1,'J♥'], [1,'A♥'],[2,'K♥'],[3,'5♦'],[0,'2♥'], [1,'2♣'],[2,'4♣'],[3,'6♣']].map(([seat, c]) => ({ seat, card: C(c) }));
const bids = [0, 2, 1, 0], order = [2, 3, 0, 1], trump = 1, turned = C('9♥'), Pn = 4, n = 4, mineNow = [C('4♠'), C('10♦')];
const used = new Set(hist.map(e => e.card).concat(mineNow, [turned]));
const rand = M.mulberry32(20261117);
for (let X = 0; X < 52; X++) { if (used.has(X) || M.suitOf(X) === 1 || (only && !only.includes(X))) continue;
  const h = [C('3♠'), C('5♦'), C('6♣'), X].sort((x, y) => x - y), won = [0, 0, 0, 0], seen = new Uint8Array(52), voids = [0, 1, 2, 3].map(() => [false, false, false, false]), lens = [4, 4, 4, 4], past = [];
  let led = -1, winCard = -1, winner = 0, i = 0, trick = []; const f = [], net = [];
  for (const e of hist) { const q = e.seat, c = e.card; if (i === 0) winner = q;
    if (q === 3) { const lg = M.legalCards(h, led);
      if (lg.length > 1) { let hit = 0; const S = { Pn, n, trump, turned, bids, order, hand: h.slice(), seen, voids, lens: lens.slice(), won, turn: 3, led, winCard, winner, playedInTrick: i, trick, hist: past };
        for (let r = 0; r < REPS; r++) if (M.readChoose(S, rand).card === c) hit++; f.push(hit / REPS);
        const al = M.netChoose({ hand: h, seen, voids, lens, bids, won, turn: 3, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, 2).alts; let mx = -Infinity, zc = 0, tot = 0; for (const x of al) { if (x.score > mx) mx = x.score; if (x.card === c) zc = x.score; } for (const x of al) tot += Math.exp(M.READ.beta * (x.score - mx));
        net.push((1 - M.READ.eps) * Math.exp(M.READ.beta * (zc - mx)) / tot + M.READ.eps / lg.length); } else { f.push(1); net.push(1); }
      h.splice(h.indexOf(c), 1); }
    past.push(e); lens[q]--; seen[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[q][led] = true;
    if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = q; } if (++i === Pn) { won[winner]++; i = 0; led = -1; winCard = -1; trick = []; } }
  console.log(JSON.stringify({ X: T(X), bot: f, model: net.map(x => +x.toFixed(3)) })); }
