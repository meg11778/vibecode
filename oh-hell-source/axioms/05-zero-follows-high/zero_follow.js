/* Axiom 5 (Matt, 22 Nov 2026): "a zero bidder following suit never plays a lower card than it needs to: it plays the
   highest card that still loses the trick. So a 2 under a queen means no other card of the suit below the queen
   (touching cards apart)."
   Random deals, bids from the bidding network, plain network plays. Every time a seat that bid 0 and has taken no
   trick follows suit with a real choice and holds at least one card that loses to the card now winning the trick:
   did it play the highest such card (or one touching it: every rank between is already seen or in its own hand)?
   For comparison the same count for seats that have exactly made a bid of one or more.
   PROBE=p: on that share of the zero bidders' decisions also ask the card-reading bot what it would play.
   node zero_follow.js <P> <n> <deals> <seed> */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_zf_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={vienna,readChoose,netChoose,legalCards,beatsCard,bidNetProbs,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const [Pn, n, deals, seed] = process.argv.slice(2, 6).map(Number), PROBE = +(process.env.PROBE || 0), SECS = +(process.env.SECS || 1e9), T0 = Date.now(), rng = M.mulberry32(seed);
const Z = () => ({ k: 0, top: 0, lower: 0, took: 0, gap1: 0, gap2: 0, gap3: 0, rk: 0, rtop: 0, rlower: 0, rtook: 0 }), G = {}; const grp = k => G[k] = G[k] || Z();
const ex = [], view = { k: 0, hid: 0, k2: 0, hid2: 0 };
const COST = +(process.env.COST || 0), cost = { net: { k: 0, d: 0, d2: 0, m: 0 }, read: { k: 0, d: 0, d2: 0, m: 0 } };
/* finish the hand from a copied state with the plain network, after the seat to play plays card `first`; returns that seat's money and whether it made its bid */
function finishFrom(st, first, vienna) { const h = st.h.map(z => z.slice()), won = st.won.slice(), seen = Uint8Array.from(st.seen), voids = st.voids.map(z => z.slice()), me = st.turn; let { turn, led, winCard, winner, i } = st, trick = st.trick.slice(), f = first, left = h.reduce((x, z) => x + z.length, 0);
  for (; left > 0; left--) { const lg = M.legalCards(h[turn], led); let c; if (f != null) { c = f; f = null; } else c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen, voids, lens: h.map(z => z.length), bids: st.bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned: st.turned, trump: st.trump, n: st.n, P: st.P }, true).card;
    h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[turn][led] = true; if (M.beatsCard(c, winCard, st.trump)) { winCard = c; winner = turn; }
    if (++i === st.P) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % st.P; }
  let tot = 0; for (let q = 0; q < st.P; q++) tot += vienna(st.bids[q], won[q], st.n); return { money: vienna(st.bids[me], won[me], st.n) - tot / st.P, made: won[me] === st.bids[me] }; }

for (let d = 0; d < deals && Date.now() - T0 < SECS * 1000; d++) {
  const deck = [...Array(52).keys()]; for (let i = 51; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const h = []; for (let q = 0; q < Pn; q++) h.push(deck.slice(q * n, (q + 1) * n).sort((x, y) => x - y));
  const turned = deck[Pn * n], trump = M.suitOf(turned), order = [...Array(Pn).keys()]; M.setKnown([turned]);
  const bids = []; let B = 0;
  for (let q = 0; q < Pn; q++) { const pb = M.bidNetProbs(Pn, n, turned, q, h[q], bids), u = rng(); let acc = 0, bb = n; for (let x = 0; x <= n; x++) { acc += pb[x]; if (u < acc) { bb = x; break; } }
    if (q === Pn - 1 && bb === n - B) { let bp = -1; for (let x = 0; x <= n; x++) if (x !== n - B && pb[x] > bp) { bp = pb[x]; bb = x; } } bids.push(bb); B += bb; }
  const won = new Array(Pn).fill(0), seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]), hist = [], prng = M.mulberry32(seed * 31 + d);
  let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [];
  for (let left = Pn * n; left > 0; left--) {
    const lg = M.legalCards(h[turn], led); const c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen, voids, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, true).card;
    const zero = bids[turn] === 0 && won[turn] === 0, made = bids[turn] > 0 && won[turn] === bids[turn];
    /* the hand-reader's view: every time a live zero bidder follows suit with a card that loses, does it still hold a higher loser that is not touching the card played? */
    if (i > 0 && zero && M.suitOf(c) === led && !M.beatsCard(c, winCard, trump)) { const kn = x => seen[x] || x === turned || h[turn].includes(x); let hid = false;
      for (const x of h[turn]) if (M.suitOf(x) === led && x > c && !M.beatsCard(x, winCard, trump)) { let touch = true; for (let z = c + 1; z < x; z++) if (!kn(z)) { touch = false; break; } if (!touch) hid = true; }
      view.k++; if (hid) view.hid++; if (h[turn].filter(x => M.suitOf(x) === led).length > 1) { view.k2++; if (hid) view.hid2++; } }
    if (i > 0 && lg.length > 1 && M.suitOf(lg[0]) === led && (zero || made)) {
      const safe = lg.filter(x => !M.beatsCard(x, winCard, trump)), known = x => seen[x] || x === turned || h[turn].includes(x);
      const touching = (x, y) => { for (let z = Math.min(x, y) + 1; z < Math.max(x, y); z++) if (!known(z)) return false; return true; };
      if (safe.length && !(safe.length === lg.length && lg.every(x => touching(x, lg[0])))) { const top = safe[safe.length - 1];
        const cls = card => M.beatsCard(card, winCard, trump) ? 'took' : touching(card, top) ? 'top' : 'lower';
        const ov = B > n ? 'table over' : 'table under', who = zero ? 'zero bidder' : 'made bidder', r = cls(c);
        let rr = null, rc = -1; if (zero && PROBE && prng() < PROBE) { const o = M.readChoose({ Pn, n, trump, turned, bids, order, hand: h[turn], seen, voids, lens: h.map(x => x.length), won, turn, led, winCard, winner, playedInTrick: i, trick, hist }, prng); rr = cls(o.card); rc = o.card; }
        if (COST && zero) { const st = { h, won, seen, voids, turn, led, winCard, winner, i, trick, bids, turned, trump, n, P: Pn };
          for (const [who2, card, kind] of [['net', c, r], ['read', rc, rr]]) if (kind === 'lower') { const x = finishFrom(st, card, M.vienna), y = finishFrom(st, top, M.vienna), df = y.money - x.money, t = cost[who2]; t.k++; t.d += df; t.d2 += df * df; t.m += (y.made ? 1 : 0) - (x.made ? 1 : 0); } }
        for (const key of [who, who + ' | ' + ov, who + ' | ' + (i === Pn - 1 ? 'last to play' : 'not last'), who + ' | ' + (h[turn].length > n / 2 ? 'first half of the hand' : 'second half')]) { const g = grp(key); g.k++; g[r]++;
          if (r === 'lower') { let gap = 0; for (const x of safe) if (x > c && !touching(x, c)) gap++; g['gap' + Math.min(3, gap)]++; }
          if (rr) { g.rk++; g['r' + rr]++; } }
        if (zero && r === 'lower' && ex.length < 12) ex.push({ P: Pn, n, left: h[turn].length, hand: h[turn].slice(), led, winCard, played: c, top, trump, bids: bids.slice(), won: won.slice(), turn, pos: i }); } }
    h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); hist.push({ seat: turn, card: c });
    if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[turn][led] = true;
    if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
    if (++i === Pn) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn;
  }
}
console.log(JSON.stringify({ P: Pn, n, seed, G, ex, cost, view }));
