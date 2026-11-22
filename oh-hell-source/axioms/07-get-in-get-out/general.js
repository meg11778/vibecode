/* Axiom 7, general test (Matt, 22 Nov 2026): "get in and get out" on ordinary deals.
   Ordinary deals, bids from the bidding network, plain network plays every seat. Tables bid UNDER the tricks only.

   Part A, the danger spot. Every time a trick starts while spare tricks remain (tricks left minus the tricks still
   needed by seats that can make), each seat that has exactly made its bid is counted: is it on lead or not, how many
   cards are left, does it take this trick, and does it finish over its bid.

   Part B, take now or later. The first moment in a deal when a seat (1) still needs tricks, (2) holds exactly that many
   sure winners (the top remaining trumps), and (3) may play one now and win the trick (on lead, or void in the suit
   led, or trumps led) but could also legally play something else. Moments are also grouped by the rest of the hand:
   SAFE = no other trump and a 2, 3 or 4 in every side suit held (Matt's "comfortable that you can take zero"). From that moment the deal is finished three ways:
     TAKE ALL : the sure winner now, then lead the other sure winners at once, then the network
     TAKE ONE : the sure winner now, then the network
     DUCK     : the network's best card that is not a sure winner now, then the network
   OHHELL_ENGINE=<folder with ohhell-play.html> node general.js <P> <n> <deals> <seed>     one JSON summary.
   Modified work under GPL v3; engine from ohhell-play.html (Jim Agniel's calculator, modified by Matt Glassman). */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_gn_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={netChoose,legalCards,beatsCard,bidNetProbs,vienna,mulberry32,suitOf,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const [Pn, n, deals, seed] = process.argv.slice(2, 6).map(Number), rng = M.mulberry32(seed), ri = k => (rng() * k) | 0, SECS = +(process.env.SECS || 1e9), T0 = Date.now();
const A = {}, B = {}, LN = ['TAKE ALL', 'TAKE ONE', 'DUCK'];
const ga = k => A[k] = A[k] || { k: 0, tookThis: 0, over: 0 }, gb = k => B[k] = B[k] || { k: 0, m: [0, 0, 0], made: [0, 0, 0], over: [0, 0, 0], short: [0, 0, 0], d: 0, d2: 0, d1: 0, d12: 0, netTake: 0 };
let done = 0, under = 0, found = 0;
for (; done < deals && Date.now() - T0 < SECS * 1000; done++) {
  const deck = [...Array(52).keys()]; for (let i = 51; i > 0; i--) { const j = ri(i + 1); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const turned = deck[Pn * n], trump = M.suitOf(turned); M.setKnown([turned]);
  const hands = []; for (let q = 0; q < Pn; q++) hands.push(deck.slice(q * n, q * n + n).sort((p, q2) => p - q2));
  const bids = []; let Bs = 0; for (let q = 0; q < Pn; q++) { const pb = M.bidNetProbs(Pn, n, turned, q, hands[q], bids), u = rng(); let acc = 0, bb = n; for (let z = 0; z <= n; z++) { acc += pb[z]; if (u < acc) { bb = z; break; } }
    if (q === Pn - 1 && bb === n - Bs) { let bp = -1; for (let z = 0; z <= n; z++) if (z !== n - Bs && pb[z] > bp) { bp = pb[z]; bb = z; } } bids.push(bb); Bs += bb; }
  if (Bs >= n) continue; under++;
  const fresh = () => ({ h: hands.map(z => z.slice()), won: new Array(Pn).fill(0), seen: new Uint8Array(52), voids: hands.map(() => [false, false, false, false]), turn: 0, led: -1, winCard: -1, winner: 0, i: 0, trick: [], left: Pn * n });
  const clone = S => ({ h: S.h.map(z => z.slice()), won: S.won.slice(), seen: S.seen.slice(), voids: S.voids.map(z => z.slice()), turn: S.turn, led: S.led, winCard: S.winCard, winner: S.winner, i: S.i, trick: S.trick.slice(), left: S.left });
  const stOf = S => ({ hand: S.h[S.turn], seen: S.seen, voids: S.voids, lens: S.h.map(z => z.length), bids, won: S.won, turn: S.turn, led: S.led, winCard: S.winCard, winner: S.winner, playedInTrick: S.i, trick: S.trick, turned, trump, n, P: Pn });
  const put = (S, c) => { const t = S.turn; S.h[t].splice(S.h[t].indexOf(c), 1); S.seen[c] = 1; S.trick.push(c); if (S.i === 0) S.led = M.suitOf(c); else if (M.suitOf(c) !== S.led) S.voids[t][S.led] = true; if (M.beatsCard(c, S.winCard, trump)) { S.winCard = c; S.winner = t; }
    S.left--; if (++S.i === Pn) { S.won[S.winner]++; S.turn = S.winner; S.i = 0; S.led = -1; S.winCard = -1; S.trick = []; } else S.turn = (t + 1) % Pn; };
  const bosses = S => { const out = [], hand = S.h[S.turn]; for (let r = 12; r >= 0; r--) { const c = trump * 13 + r; if (c === turned || S.seen[c]) continue; if (hand.includes(c)) out.push(c); else break; } return out; };
  const netCard = S => { const lg = M.legalCards(S.h[S.turn], S.led); return lg.length === 1 ? lg[0] : M.netChoose(stOf(S), true).card; };
  const finish = (S, seat, all) => { while (S.left > 0) { let c = -1; if (all && S.turn === seat && S.i === 0 && S.won[seat] < bids[seat]) { const bs = bosses(S); if (bs.length) c = bs[0]; } put(S, c >= 0 ? c : netCard(S)); }
    let tot = 0; for (let q = 0; q < Pn; q++) tot += M.vienna(bids[q], S.won[q], n); return { money: M.vienna(bids[seat], S.won[seat], n) - tot / Pn, tricks: S.won[seat] }; };
  // the deal as the network plays it, collecting part A and the first part-B moment
  const S = fresh(), evA = []; let snap = null;
  while (S.left > 0) {
    if (S.i === 0) { const tl = S.h[0].length; let needSum = 0; for (let q = 0; q < Pn; q++) if (S.won[q] < bids[q]) needSum += bids[q] - S.won[q];
      if (tl - needSum > 0) for (let q = 0; q < Pn; q++) if (S.won[q] === bids[q]) evA.push({ q, lead: q === S.turn, tl, wonThen: S.won[q], trickNo: n - tl }); }
    const lg = M.legalCards(S.h[S.turn], S.led);
    if (!snap && lg.length > 1) { const s = S.turn, need = bids[s] - S.won[s]; if (need >= 1) { const bs = bosses(S); if (bs.length === need && lg.includes(bs[0]) && (S.winCard < 0 || M.beatsCard(bs[0], S.winCard, trump)) && lg.some(c => !bs.includes(c))) snap = { S: clone(S), s, need, bs }; } }
    put(S, lg.length === 1 ? lg[0] : M.netChoose(stOf(S), true).card);
    if (S.i === 0) for (const e of evA) if (e.tookNow == null && e.tl === S.h[0].length + 1) e.tookNow = S.won[e.q] > e.wonThen;
  }
  for (const e of evA) { const tb = e.tl >= 7 ? '7+' : String(e.tl); for (const k of [(e.lead ? 'on lead' : 'not on lead') + ' | ' + tb + ' cards left', (e.lead ? 'on lead' : 'not on lead') + ' | all']) { const g = ga(k); g.k++; if (e.tookNow) g.tookThis++; if (S.won[e.q] > bids[e.q]) g.over++; } }
  if (!snap) continue; found++;
  const Z = snap.S, s = snap.s, lg = M.legalCards(Z.h[s], Z.led), alts = M.netChoose(stOf(Z), 2).alts, netPick = alts.reduce((x, y) => y.score > x.score ? y : x).card;
  const duck = alts.filter(z => !snap.bs.includes(z.card)).reduce((x, y) => y.score > x.score ? y : x).card;
  const run = (card, all) => { const C = clone(Z); put(C, card); return finish(C, s, all); }, res = [run(snap.bs[0], true), run(snap.bs[0], false), run(duck, false)];
  const cl = Z.h[s].length, tb = cl >= 7 ? '7+' : String(cl), type = Z.led < 0 ? 'on lead' : Z.led === trump ? 'trumps led' : 'can ruff';
  const cnt = [0, 0, 0, 0]; for (const c of Z.h[s]) cnt[M.suitOf(c)]++; const single = Z.led >= 0 && Z.led !== trump && cnt[M.suitOf(duck)] === 1 && M.suitOf(duck) !== trump;
  const keys = ['all', 'cards left ' + tb, type, 'needs ' + (snap.need >= 2 ? '2 or more' : '1'), type + ' | cards left ' + (cl >= 6 ? '6+' : cl >= 4 ? '4-5' : '2-3')]; if (type === 'can ruff') keys.push(single ? 'can ruff | the duck throws a singleton' : 'can ruff | the duck throws from a longer suit');
  { const rest = Z.h[s].filter(c => !snap.bs.includes(c)), low = [99, 99, 99, 99]; let spare = 0, top = 0; for (const c of rest) { const su = M.suitOf(c), r = c % 13 + 2; if (su === trump) spare++; else { if (r < low[su]) low[su] = r; if (r > top) top = r; } }
    const safe = spare ? 'rest of hand: has another trump' : low.every(x => x === 99 || x <= 4) ? 'rest of hand: SAFE (no other trump, a 2-4 in every suit held)' : 'rest of hand: some suit has nothing under 5';
    keys.push(safe, safe + ' | ' + type, safe + ' | cards left ' + (cl >= 6 ? '6+' : cl >= 4 ? '4-5' : '2-3')); keys.push((spare ? 'other trump' : safe.includes('SAFE') ? 'SAFE' : 'not safe') + ' | ' + type + ' | cards left ' + (cl >= 6 ? '6+' : cl >= 4 ? '4-5' : '2-3')); if (!spare && snap.need === 1) { let opp = 0; for (let r = 0; r < 13; r++) { const x = trump * 13 + r; if (x !== turned && !Z.seen[x] && !Z.h[s].includes(x)) opp++; } const ok2 = 'LOCK (one top trump, needs one) | others hold ' + (opp === 0 ? 'no trump' : opp === 1 ? '1 trump' : '2 or more trumps'); keys.push(ok2, ok2 + ' | cards left ' + (cl >= 6 ? '6+' : cl >= 4 ? '4-5' : '2-3')); }
    if (!spare && low.every(x => x === 99 || x <= 4)) keys.push('SAFE | highest other card ' + (top <= 8 ? '8 or lower' : top <= 11 ? '9 to jack' : 'queen to ace')); }
  for (const k of keys) { const g = gb(k); g.k++; res.forEach((r, i) => { g.m[i] += r.money; if (r.tricks === bids[s]) g.made[i]++; if (r.tricks > bids[s]) g.over[i]++; if (r.tricks < bids[s]) g.short[i]++; }); const d = res[0].money - res[2].money, d1 = res[0].money - res[1].money; g.d += d; g.d2 += d * d; g.d1 += d1; g.d12 += d1 * d1; if (snap.bs.includes(netPick)) g.netTake++; }
}
console.log(JSON.stringify({ P: Pn, n, deals: done, under, found, seed, LN, A, B }));
