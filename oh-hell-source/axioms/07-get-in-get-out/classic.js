/* Axiom 7 (Matt, 22 Nov 2026): "Get in and get out." In an underbid hand, once you are comfortable that you can take
   no more tricks afterwards, take your tricks early and get off lead instead of ducking for the sake of ducking.
   Matt's classic example: A of trumps (spades), hearts 10-4-3-2, clubs 3-2, no diamond; bid 1; a diamond is led.
   Novices throw the heart 10; Matt says take the ace of trumps, get out with a club and be done with the hand.

   Test. 7-card round. One seat (not the leader) is given that hand and bids 1. The other cards are random and the other
   seats bid as the bidding network says the game's bots do. The deal is used when the opening lead is a diamond and
   nobody has trumped before our seat plays. Each line below is then played out on the same deal, the plain network
   playing every other card (ours too, after the scripted cards):
     ruff + club 3 / club 2 / heart 2 / heart 10 : take the trump ace now, then lead that card
     ruff + network                             : take the trump ace now, the network chooses the exit
     pitch heart 10 / pitch club 3              : throw that card now, network afterwards
   PROBE=<share> also asks the game's card-reading bot what it plays at the decision.
   OHHELL_ENGINE=<folder with ohhell-play.html> node classic.js <P> <deals> <seed>     prints one JSON summary.
   Modified work under GPL v3; engine from ohhell-play.html (Jim Agniel's calculator, modified by Matt Glassman). */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_gg_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,netChoose,legalCards,beatsCard,bidNetProbs,vienna,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const [Pn, deals, seed] = process.argv.slice(2, 5).map(Number), n = 7, rng = M.mulberry32(seed), ri = k => (rng() * k) | 0;
const PROBE = +(process.env.PROBE || 0), SECS = +(process.env.SECS || 1e9), T0 = Date.now();
const SA = 12, HT = 21, H4 = 15, H3 = 14, H2 = 13, C3 = 40, C2 = 39, MINE = [SA, H2, H3, H4, HT, C2, C3], trump = 0;
const LINES = [['ruff + club 3', SA, C3], ['ruff + club 2', SA, C2], ['ruff + heart 2', SA, H2], ['ruff + heart 10', SA, HT], ['ruff + network', SA, -1], ['pitch heart 10', HT, -1], ['pitch club 3', C3, -1]];
const CATS = ['trump ace', 'heart 10', 'low heart', 'club'], cat = c => c === SA ? 0 : c === HT ? 1 : c < 26 ? 2 : 3, G = {};
const grp = key => G[key] = G[key] || { k: 0, m: LINES.map(() => 0), made: LINES.map(() => 0), over: LINES.map(() => 0), last: LINES.map(() => 0), d: LINES.map(() => 0), d2: LINES.map(() => 0), net: CATS.map(() => 0), exit: {}, read: CATS.map(() => 0), rk: 0, rd: 0, rd2: 0 };
let tried = 0, used = 0, netBid1 = 0;
while (used < deals && Date.now() - T0 < SECS * 1000) { tried++;
  const me = 1 + ri(Pn - 1), turned = 1 + ri(11); M.setKnown([turned]);       // a spade from the 3 to the king is turned
  const taken = new Set(MINE); taken.add(turned); const deck = []; for (let c = 0; c < 52; c++) if (!taken.has(c)) deck.push(c);
  for (let i = deck.length - 1; i > 0; i--) { const j = ri(i + 1); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const hands = []; let k = 0; for (let q = 0; q < Pn; q++) hands.push(q === me ? MINE.slice() : deck.slice(k * n, (k++) * n + n).sort((p, q2) => p - q2));
  const bids = []; let B = 0, ok = true;
  for (let q = 0; q < Pn; q++) { let bb; const pb = M.bidNetProbs(Pn, n, turned, q, hands[q], bids);
    if (q === me) { bb = 1; if (q === Pn - 1 && n - B === 1) { ok = false; break; } }
    else { const u = rng(); let acc = 0; bb = n; for (let z = 0; z <= n; z++) { acc += pb[z]; if (u < acc) { bb = z; break; } } if (q === Pn - 1 && bb === n - B) { let bp = -1; for (let z = 0; z <= n; z++) if (z !== n - B && pb[z] > bp) { bp = pb[z]; bb = z; } } }
    bids.push(bb); B += bb; }
  if (!ok) continue;
  let probe = null, decision = null, bid1 = 0; { const pb = M.bidNetProbs(Pn, n, turned, me, MINE, bids.slice(0, me)); let best = 0; for (let z = 1; z <= n; z++) if (pb[z] > pb[best]) best = z; bid1 = best === 1 ? 1 : 0; }
  const play = (first, exit, wantInfo) => { const h = hands.map(z => z.slice()), won = new Array(Pn).fill(0), seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]), hist = [];
    let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [], f = first, ex = exit, usable = true, netExit = -1, lastWinner = -1;
    for (let left = Pn * n; left > 0; left--) { const lg = M.legalCards(h[turn], led); let c;
      const st = () => ({ hand: h[turn], seen, voids, lens: h.map(z => z.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn });
      if (turn === me && f != null) { if (led !== 2 || M.suitOf(winCard) === trump) return null;          // not a diamond lead, or already trumped
        if (wantInfo) { decision = M.netChoose(st(), true).card;
          if (PROBE && rng() < PROBE) { const o = M.readChoose({ Pn, n, trump, turned, bids, order: [...Array(Pn).keys()], hand: h[turn], seen, voids, lens: h.map(z => z.length), won, turn, led, winCard, winner, playedInTrick: i, trick, hist }, M.mulberry32((seed * 31 + tried) >>> 0));
            const val = cc => { const z = o.alts.find(q => q.card === cc); return z ? z.score : null; }; probe = { card: o.card, d: val(SA) != null && val(HT) != null ? val(SA) - val(HT) : null }; } }
        c = f; f = null; }
      else if (turn === me && i === 0 && ex != null && ex >= 0 && h[turn].includes(ex)) { c = ex; ex = null; }
      else { c = lg.length === 1 ? lg[0] : M.netChoose(st(), true).card; if (turn === me && i === 0 && ex === -1 && first === SA && netExit < 0) netExit = c; }
      h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); hist.push({ seat: turn, card: c }); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[turn][led] = true; if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
      if (++i === Pn) { won[winner]++; lastWinner = winner; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn; }
    let tot = 0; for (let q = 0; q < Pn; q++) tot += M.vienna(bids[q], won[q], n); return { money: M.vienna(1, won[me], n) - tot / Pn, tricks: won[me], last: lastWinner === me, netExit }; };
  const res = []; for (let li = 0; li < LINES.length; li++) { const r = play(LINES[li][1], LINES[li][2], li === 0); if (!r) break; res.push(r); }
  if (res.length < LINES.length) continue; used++; netBid1 += bid1;
  const over = B - n, key = over >= 2 ? 'over by 2 or more' : over === 1 ? 'over by 1' : over === -1 ? 'under by 1' : 'under by 2 or more', pos = (me === Pn - 1 ? 'last to play' : me === 1 ? 'second to play' : 'in the middle');
  for (const k2 of [key, key + ' | ' + pos]) { const g = grp(k2); g.k++; res.forEach((r, li) => { g.m[li] += r.money; if (r.tricks === 1) g.made[li]++; if (r.tricks > 1) g.over[li]++; if (r.last) g.last[li]++; const d = res[0].money - r.money; g.d[li] += d; g.d2[li] += d * d; });
    g.net[cat(decision)]++; const ne = res[4].netExit; if (ne >= 0) g.exit[ne] = (g.exit[ne] || 0) + 1; if (probe) { g.read[cat(probe.card)]++; if (probe.d != null) { g.rk++; g.rd += probe.d; g.rd2 += probe.d * probe.d; } } }
}
console.log(JSON.stringify({ P: Pn, n, tried, used, seed, netBid1, LINES: LINES.map(l => l[0]), CATS, G }));
