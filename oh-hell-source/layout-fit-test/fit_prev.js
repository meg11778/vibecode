/* How often do the card-reading bot's imagined layouts fail to fit the bids? Random deals, plain network plays; at each
   real choice of one seat, count how many of the 360 candidate layouts fit the bids within the game's search budget
   (READ.tries = 30 a layout). The rest are, in the game today, filled with layouts that ignore the bids.
   node fit_prev.js <P> <n> <deals> <seed> */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_fp_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readLayouts,netChoose,legalCards,beatsCard,bidNetProbs,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const [Pn, n, deals, seed] = process.argv.slice(2, 6).map(Number), rng = M.mulberry32(seed), G = {};
const add = (key, f) => { const g = G[key] = G[key] || { k: 0, f: 0, low: 0, zero: 0 }; g.k++; g.f += f / 360; if (f < 90) g.low++; if (f === 0) g.zero++; };
for (let d = 0; d < deals; d++) {
  const deck = [...Array(52).keys()]; for (let i = 51; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const h = []; for (let q = 0; q < Pn; q++) h.push(deck.slice(q * n, (q + 1) * n).sort((x, y) => x - y));
  const turned = deck[Pn * n], trump = M.suitOf(turned), order = [...Array(Pn).keys()], seat = d % Pn; M.setKnown([turned]);
  const bids = []; let B = 0;
  for (let q = 0; q < Pn; q++) { const pb = M.bidNetProbs(Pn, n, turned, q, h[q], bids), u = rng(); let acc = 0, bb = n; for (let x = 0; x <= n; x++) { acc += pb[x]; if (u < acc) { bb = x; break; } }
    if (q === Pn - 1 && bb === n - B) { let bp = -1; for (let x = 0; x <= n; x++) if (x !== n - B && pb[x] > bp) { bp = pb[x]; bb = x; } } bids.push(bb); B += bb; }
  const won = new Array(Pn).fill(0), seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]), hist = [], prng = M.mulberry32(seed * 31 + d);
  let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [];
  for (let left = Pn * n; left > 0; left--) {
    const lg = M.legalCards(h[turn], led); const c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen, voids, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, true).card;
    if (turn === seat && lg.length > 1) { M.READ.strict = true; const f = M.readLayouts({ Pn, n, trump, turned, bids, order, hand: h[turn], seen, voids, lens: h.map(x => x.length), won, turn, led, winCard, winner, playedInTrick: i, trick, hist }, prng, 360, 30).cands.length; M.READ.strict = false;
      const ov = B > n ? (B - n >= 2 ? 'over by 2+' : 'over by 1') : (n - B >= 2 ? 'under by 2+' : 'under by 1'); add('all', f); add(ov, f); add(h[turn].length === n ? 'first trick' : h[turn].length > n / 2 ? 'first half' : 'second half', f); }
    h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); hist.push({ seat: turn, card: c });
    if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[turn][led] = true;
    if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
    if (++i === Pn) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn;
  }
}
const o = k => G[k] ? `${k}: ${(100 * G[k].f / G[k].k).toFixed(0)}% fit (under a quarter fit in ${(100 * G[k].low / G[k].k).toFixed(0)}% of choices, none in ${(100 * G[k].zero / G[k].k).toFixed(0)}%)` : '';
console.log(`${Pn} players ${n} cards (${G.all.k} choices): ` + ['all', 'over by 2+', 'over by 1', 'under by 1', 'under by 2+', 'first trick', 'first half', 'second half'].map(o).filter(Boolean).join(' | '));
