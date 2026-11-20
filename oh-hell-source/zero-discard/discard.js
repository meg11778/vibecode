/* Zero bid, first chance to throw a card: the singleton, or the top of the doubleton?
   (Matt Glassman, 20 Nov 2026: holding a lone 6 and 9-7 doubleton he throws the 6; when is that right?)
   A round of n cards. You hold a singleton of rank s in one side suit and a doubleton h, l in another (and, when
   n > 3, n-3 cards of the trump suit's... no: see FILL below), you have bid 0, and the first trick is led in a suit you
   do not hold. Everything else is dealt at random: the other hands, the trump (never one of your two suits), your
   seat, the other bids (drawn from the bidding network). The leader and the seats before you play the network's card;
   deals where the lead is in one of your suits are thrown away. Then each of your possible throws is played out on
   the real deal with the network in every seat, and what happens to you is counted.
   node discard.js <P> <n> <deals per holding> <seed> [s list] > rows.jsonl      (OHHELL_ENGINE = folder holding ohhell-play.html)
   One JSON line per holding: {P,n,s,h,l,k: deals, made:[throw s, throw h, throw l], money:[...], d:sum(money s - money h), d2}
   FILL: with n > 3 the extra cards are the lowest cards of a third side suit still free (2, 3, ...), safe cards that
   keep the hand's shape; the lead must then also be outside that suit. */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE || __dirname;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_dc_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={netChoose,legalCards,beatsCard,vienna,bidNetProbs,mulberry32,suitOf,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const [P, n, DEALS, seed] = process.argv.slice(2, 6).map(Number), sList = process.argv[6] ? process.argv[6].split(',').map(Number) : [2,3,4,5,6,7,8,9,10,11,12,13,14];
const rng = M.mulberry32(seed), card = (suit, rank) => suit * 13 + rank - 2;
function playOut(hands0, bids, trump, turned, st, me, first) {
  const h = hands0.map(x => x.slice()), won = st.won.slice(), sn = Uint8Array.from(st.seen), vd = st.voids.map(x => x.slice());
  let turn = st.turn, led = st.led, winCard = st.winCard, winner = st.winner, i = st.i, trick = st.trick.slice(), left = h.reduce((s, x) => s + x.length, 0), f = first;
  for (; left > 0; left--) { const lg = M.legalCards(h[turn], led); let c; if (f != null && turn === me) { c = f; f = null; } else c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen: sn, voids: vd, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P }, 0).card;
    h[turn].splice(h[turn].indexOf(c), 1); sn[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) vd[turn][led] = true; if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
    if (++i === P) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % P; }
  let tot = 0; for (let q = 0; q < P; q++) tot += M.vienna(bids[q], won[q], n); return { made: won[me] === 0 ? 1 : 0, money: M.vienna(bids[me], won[me], n) - tot / P }; }
// CELLS=7-11-9,3-14-6 (singleton-top-low, jack 11 ... ace 14) runs only those holdings
const CELLS = process.env.CELLS ? process.env.CELLS.split(',') : null;
for (const s of sList) for (let hh = 3; hh <= 14; hh++) for (let l = 2; l < hh; l++) {
  if (CELLS && !CELLS.includes(s + '-' + hh + '-' + l)) continue;
  const row = { P, n, s, h: hh, l, k: 0, made: [0, 0, 0], money: [0, 0, 0], d: 0, d2: 0, tries: 0 };
  while (row.k < DEALS && row.tries < DEALS * 30) { row.tries++;
    // suits: your singleton suit, your doubleton suit, a filler suit when n > 3; trump is one of the remaining suits
    const perm = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const A = perm[0], B = perm[1], F = perm[2], trump = n > 3 ? perm[3] : perm[2 + ((rng() * 2) | 0)];
    const mine = [card(A, s), card(B, hh), card(B, l)]; for (let x = 0; x < n - 3; x++) mine.push(card(F, 2 + x));
    const rest = []; for (let c = 0; c < 52; c++) if (!mine.includes(c)) rest.push(c); for (let i = rest.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [rest[i], rest[j]] = [rest[j], rest[i]]; }
    let turned = -1, ti = rest.findIndex(c => M.suitOf(c) === trump); turned = rest.splice(ti, 1)[0];
    const me = 1 + ((rng() * (P - 1)) | 0);            // seat 0 bids first and leads; you are never the leader
    const hands = []; let r = 0; for (let q = 0; q < P; q++) hands.push(q === me ? mine.slice().sort((x, y) => x - y) : rest.slice(r, r += n).sort((x, y) => x - y));
    M.setKnown([turned]); const bids = []; let Bsum = 0, bad = false;
    for (let q = 0; q < P; q++) { let bd; if (q === me) bd = 0; else { const pb = M.bidNetProbs(P, n, turned, q, hands[q], bids), u = rng(); let acc = 0; bd = n; for (let x = 0; x <= n; x++) { acc += pb[x]; if (u < acc) { bd = x; break; } }
        if (q === P - 1 && bd === n - Bsum) { let bp = -1; for (let x = 0; x <= n; x++) if (x !== n - Bsum && pb[x] > bp) { bp = pb[x]; bd = x; } } }
      if (q === P - 1 && q === me && Bsum === n) bad = true;      // you deal and a zero bid would make the bids come out even: not allowed
      bids.push(bd); Bsum += bd; }
    if (bad) continue; M.setKnown([turned]);
    // play up to your turn on the first trick
    const st = { won: new Array(P).fill(0), seen: new Uint8Array(52), voids: hands.map(() => [false, false, false, false]), turn: 0, led: -1, winCard: -1, winner: 0, i: 0, trick: [] }, h = hands.map(x => x.slice());
    while (st.turn !== me) { const q = st.turn, lg = M.legalCards(h[q], st.led), c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[q], seen: st.seen, voids: st.voids, lens: h.map(x => x.length), bids, won: st.won, turn: q, led: st.led, winCard: st.winCard, winner: st.winner, playedInTrick: st.i, trick: st.trick, turned, trump, n, P }, 0).card;
      if (st.i === 0) { st.winner = q; st.led = M.suitOf(c); } else if (M.suitOf(c) !== st.led) st.voids[q][st.led] = true; h[q].splice(h[q].indexOf(c), 1); st.seen[c] = 1; st.trick.push(c); if (M.beatsCard(c, st.winCard, trump)) { st.winCard = c; st.winner = q; } st.i++; st.turn = (q + 1) % P; }
    if (st.led === A || st.led === B || (n > 3 && st.led === F)) continue;             // you must be out of the suit led
    const res = [card(A, s), card(B, hh), card(B, l)].map(c => playOut(h, bids, trump, turned, st, me, c));
    row.k++; res.forEach((x, i) => { row.made[i] += x.made; row.money[i] += x.money; }); const df = res[0].money - res[1].money; row.d += df; row.d2 += df * df; }
  row.money = row.money.map(x => +x.toFixed(2)); row.d = +row.d.toFixed(2); row.d2 = +row.d2.toFixed(2); console.log(JSON.stringify(row)); }
