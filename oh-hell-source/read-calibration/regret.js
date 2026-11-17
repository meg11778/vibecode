/* What does sampling noise cost a card-reading bot, by its own sums, and what do extra layouts on close calls buy?
   Card-reading bots play every seat (bids drawn from the bidding network). At each real choice the cards are priced
   once at 10x precision (the reference); then each setting chooses REP times, and the cost of a choice is the reference
   worth of the best card minus that of the card chosen. Also timed.
   node regret.js <P> <n> <deals> <seed> '<settings JSON list>'      (OHHELL_ENGINE = folder holding ohhell-play.html)
   Prints one JSON line per choice: {g: choices, gap: reference gap between the two best, r:[mean cost per setting], ms:[mean time per setting], lay:[mean layouts]} */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE || __dirname;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_rg_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={mulberry32,suitOf,bidNetProbs,legalCards,readChoose,beatsCard,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const { mulberry32, suitOf, legalCards, beatsCard, READ } = M;
const [Pn, n, deals, seed] = process.argv.slice(2, 6).map(Number), MODES = JSON.parse(process.argv[6] || '[{"rounds":1},{"rounds":4}]'), REP = 4, base = Object.assign({}, READ);
const rng = mulberry32(seed);
for (let d = 0; d < deals; d++) {
  const deck = [...Array(52).keys()]; for (let i = 51; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const h = []; for (let q = 0; q < Pn; q++) h.push(deck.slice(q * n, (q + 1) * n).sort((x, y) => x - y));
  const turned = Pn * n < 52 ? deck[Pn * n] : -1, trump = turned >= 0 ? suitOf(turned) : -1, order = [...Array(Pn).keys()];
  M.setKnown(turned >= 0 ? [turned] : []);
  const bids = []; let B = 0;
  for (let q = 0; q < Pn; q++) { const pb = M.bidNetProbs(Pn, n, turned, q, h[q], bids), u = rng(); let acc = 0, bb = n; for (let x = 0; x <= n; x++) { acc += pb[x]; if (u < acc) { bb = x; break; } }
    if (q === Pn - 1 && bb === n - B) { let bp = -1; for (let x = 0; x <= n; x++) if (x !== n - B && pb[x] > bp) { bp = pb[x]; bb = x; } } bids.push(bb); B += bb; }
  M.setKnown(turned >= 0 ? [turned] : []);
  const prng = mulberry32((seed * 7919 + d * 104729) >>> 0), won = new Array(Pn).fill(0), seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]), hist = [];
  let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [];
  for (let left = Pn * n; left > 0; left--) {
    const lg = legalCards(h[turn], led); let c;
    if (lg.length === 1) c = lg[0];
    else {
      const S = { Pn, n, trump, turned, bids, order, hand: h[turn], seen, voids, lens: h.map(x => x.length), won, turn, led, winCard, winner, playedInTrick: i, trick, hist };
      Object.assign(READ, base, { prec: 10, rounds: 1 }); const ref = M.readChoose(S, prng);
      if (!ref.same) { const w = new Map(ref.alts.map(x => [x.card, x.score])), sorted = [...new Set(ref.alts.map(x => x.score))].sort((x, y) => y - x), top = sorted[0];
        const r = [], ms = [], lay = [];
        for (const m of MODES) { Object.assign(READ, base, m); let cost = 0, L = 0; const t0 = process.hrtime.bigint(); for (let k = 0; k < REP; k++) { const o = M.readChoose(S, prng); cost += top - w.get(o.card); L += o.layouts; } ms.push(+(Number(process.hrtime.bigint() - t0) / 1e6 / REP).toFixed(1)); r.push(+(cost / REP).toFixed(3)); lay.push(L / REP); }
        console.log(JSON.stringify({ g: sorted.length, gap: +(top - (sorted[1] === undefined ? top : sorted[1])).toFixed(2), r, ms, lay })); }
      Object.assign(READ, base); c = M.readChoose(S, prng).card;
    }
    h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); hist.push({ seat: turn, card: c });
    if (i === 0) led = suitOf(c); else if (suitOf(c) !== led) voids[turn][led] = true;
    if (beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
    if (++i === Pn) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn;
  }
}
