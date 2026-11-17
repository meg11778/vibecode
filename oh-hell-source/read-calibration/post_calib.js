/* Is the reading's picture of the hidden cards right, end to end?
   Card-reading bots play every seat. Before each choice, the seat to play reads the hidden cards, and for every other
   seat and every suit that seat has not shown out of, the reading's chance that the seat still holds that suit is
   written down beside the truth. Also written: the same chance from the bids alone, and whether that seat has thrown
   a card of that suit on an earlier trick (Matt's hand of 17 Nov 2026: East threw the 5 of diamonds).
   node post_calib.js <P> <n> <deals> <seed> ['<READ settings JSON>']     (OHHELL_ENGINE = folder holding ohhell-play.html)
   One JSON line per (choice, other seat, suit): {pl: cards played so far, len: cards that seat holds, tr: suit is trump,
   th: thrown that suit before, p: reading, p0: bids only, y: 1 if it does hold the suit}
   and one line per choice: {left, s:[network scores], k: card chosen, ty: "lead"|"follow"|"throw"} */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE || __dirname;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
if (a < 0 || b < 0) throw new Error('page layout not recognised');
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_pc_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={mulberry32,suitOf,bidNetCovers,bidNetProbs,bidAt,muFor,auctionFactor,legalCards,netChoose,readChoose,readLayouts,equivGroups,beatsCard,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const { mulberry32, suitOf, legalCards, beatsCard, READ } = M;
const [Pn, n, deals, seed] = process.argv.slice(2, 6).map(Number), SET = process.argv[6] ? JSON.parse(process.argv[6]) : {}, KP = 120;
Object.assign(READ, SET);
const rng = mulberry32(seed), out = [];
for (let d = 0; d < deals; d++) {
  const deck = [...Array(52).keys()]; for (let i = 51; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const h = []; for (let q = 0; q < Pn; q++) h.push(deck.slice(q * n, (q + 1) * n).sort((x, y) => x - y));
  const turned = Pn * n < 52 ? deck[Pn * n] : -1, trump = turned >= 0 ? suitOf(turned) : -1, order = [...Array(Pn).keys()];
  M.setKnown(turned >= 0 ? [turned] : []);
  const bids = []; let B = 0;
  for (let q = 0; q < Pn; q++) { const pb = M.bidNetProbs(Pn, n, turned, q, h[q], bids), u = rng(); let acc = 0, bb = n; for (let x = 0; x <= n; x++) { acc += pb[x]; if (u < acc) { bb = x; break; } }
    if (q === Pn - 1 && bb === n - B) { let bp = -1; for (let x = 0; x <= n; x++) if (x !== n - B && pb[x] > bp) { bp = pb[x]; bb = x; } } bids.push(bb); B += bb; }
  M.setKnown(turned >= 0 ? [turned] : []);
  const prng = mulberry32((seed * 7919 + d * 104729) >>> 0), xr = mulberry32((seed * 31337 + d * 7) >>> 0), won = new Array(Pn).fill(0), seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]), hist = [], thrown = h.map(() => [false, false, false, false]);
  let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [];
  for (let left = Pn * n; left > 0; left--) {
    const lg = legalCards(h[turn], led); let c;
    if (lg.length === 1) c = lg[0];
    else {
      const st = { hand: h[turn], seen, voids, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn };
      const al = M.netChoose(st, 2).alts, S = { Pn, n, trump, turned, bids, order, hand: h[turn], seen, voids, lens: h.map(x => x.length), won, turn, led, winCard, winner, playedInTrick: i, trick, hist };
      if (hist.some(e => e.seat !== turn)) {                                    // the picture of the hidden cards, before the choice
        const pic = () => { const L = M.readLayouts(S, xr, KP * READ.MF, KP), r = h.map(() => [0, 0, 0, 0]); for (const pk of L.picks) for (let q = 0; q < Pn; q++) { if (q === turn) continue; const has = [0, 0, 0, 0]; for (const x of pk[q]) has[suitOf(x)] = 1; for (let s = 0; s < 4; s++) r[q][s] += has[s] / L.picks.length; } return r; };
        const p = pic(); READ.noPlay = true; const p0 = pic(); READ.noPlay = !!SET.noPlay;
        for (let q = 0; q < Pn; q++) { if (q === turn || !h[q].length) continue; for (let s = 0; s < 4; s++) { if (voids[q][s]) continue;
          out.push({ pl: Pn * n - left, len: h[q].length, tr: s === trump ? 1 : 0, th: thrown[q][s] ? 1 : 0, p: +p[q][s].toFixed(3), p0: +p0[q][s].toFixed(3), y: h[q].some(x => suitOf(x) === s) ? 1 : 0 }); } }
      }
      c = M.readChoose(S, prng).card;
      if (M.equivGroups(lg, seen, trick, turned, winCard, trump).length > 1) out.push({ left: h[turn].length, s: al.map(x => +x.score.toFixed(3)), k: al.findIndex(x => x.card === c), ty: led < 0 ? 'lead' : suitOf(lg[0]) === led ? 'follow' : 'throw' });
    }
    h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); hist.push({ seat: turn, card: c });
    if (i === 0) led = suitOf(c); else if (suitOf(c) !== led) { voids[turn][led] = true; thrown[turn][suitOf(c)] = true; }
    if (beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
    if (++i === Pn) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn;
  }
}
for (const r of out) console.log(JSON.stringify(r));
