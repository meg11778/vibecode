/* Axiom 1 (Matt, 21 Nov 2026): "a player who wants one more trick and exits with a low trump is almost certainly
   holding a high trump for later."  Collects every lead by a seat that still needs tricks and holds a trump.
   Bids drawn from the bidding network (as the game's bots bid, near enough); cards played by WHO in every seat:
   "net" = plain network, "read" = card-reading bots as in the published game.
   "probe" = plain network plays, but at each lead by a seat needing exactly one trick and holding a trump of rank 6
   or lower the card-reading bot is ALSO asked what it would lead and what each lead is worth (stops after SECS seconds).
   node tell_collect.js <P> <n> <deals> <seed> <net|read|probe>      one JSON row per lead:
   { P,n,left,need,over (table bids minus tricks), led (card), tr (leader's trump ranks 2..14), out (unseen trump ranks),
     vals (read only: [card, dollars] per choice) } */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_tell_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,netChoose,legalCards,beatsCard,bidNetProbs,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const [Pn, n, deals, seed] = process.argv.slice(2, 6).map(Number), who = process.argv[6] || 'net', rng = M.mulberry32(seed);
const T0 = Date.now(), SECS = +(process.env.SECS || 1e9);
for (let d = 0; d < deals && Date.now() - T0 < SECS * 1000; d++) {
  const deck = [...Array(52).keys()]; for (let i = 51; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const h = []; for (let q = 0; q < Pn; q++) h.push(deck.slice(q * n, (q + 1) * n).sort((x, y) => x - y));
  const turned = deck[Pn * n], trump = M.suitOf(turned), order = [...Array(Pn).keys()]; M.setKnown([turned]);
  const bids = []; let B = 0;
  for (let q = 0; q < Pn; q++) { const pb = M.bidNetProbs(Pn, n, turned, q, h[q], bids), u = rng(); let acc = 0, bb = n; for (let x = 0; x <= n; x++) { acc += pb[x]; if (u < acc) { bb = x; break; } }
    if (q === Pn - 1 && bb === n - B) { let bp = -1; for (let x = 0; x <= n; x++) if (x !== n - B && pb[x] > bp) { bp = pb[x]; bb = x; } } bids.push(bb); B += bb; }
  const prng = M.mulberry32((seed * 7919 + d * 104729) >>> 0), won = new Array(Pn).fill(0), seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]), hist = [];
  let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [];
  for (let left = Pn * n; left > 0; left--) {
    const lg = M.legalCards(h[turn], led); let c, vals = null;
    if (lg.length === 1) c = lg[0];
    else if (who !== 'read') c = M.netChoose({ hand: h[turn], seen, voids, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, true).card;
    else { const o = M.readChoose({ Pn, n, trump, turned, bids, order, hand: h[turn], seen, voids, lens: h.map(x => x.length), won, turn, led, winCard, winner, playedInTrick: i, trick, hist }, prng); c = o.card; if (i === 0) vals = o.alts.map(x => [x.card, +x.score.toFixed(2)]); }
    if (who === 'probe' && i === 0 && h[turn].length >= 2 && bids[turn] - won[turn] === 1 && lg.length > 1 && h[turn].some(x => M.suitOf(x) === trump && x % 13 + 2 <= 6) && h[turn].some(x => M.suitOf(x) !== trump)) {
      const o = M.readChoose({ Pn, n, trump, turned, bids, order, hand: h[turn], seen, voids, lens: h.map(x => x.length), won, turn, led, winCard, winner, playedInTrick: i, trick, hist }, prng); vals = o.alts.map(x => [x.card, +x.score.toFixed(2)]); vals.unshift([o.card, 0]); }
    if ((who !== 'probe' || vals) && i === 0 && h[turn].length >= 2 && bids[turn] - won[turn] >= 1) { const tr = h[turn].filter(x => M.suitOf(x) === trump).map(x => x % 13 + 2);
      if (tr.length) { const out = []; for (let r = 0; r < 13; r++) { const x = trump * 13 + r; if (!seen[x] && x !== turned && !h[turn].includes(x)) out.push(r + 2); }
        const row = { netLed: c, P: Pn, n, left: h[turn].length, need: bids[turn] - won[turn], over: B - n, led: c, ledTrump: M.suitOf(c) === trump ? c % 13 + 2 : 0, tr, out }; if (vals) row.vals = vals; console.log(JSON.stringify(row)); } }
    h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); hist.push({ seat: turn, card: c });
    if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[turn][led] = true;
    if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
    if (++i === Pn) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn;
  }
}
