/* Axiom 7 follow-ups (Matt, 22 Nov 2026), on ordinary UNDERBID deals, plain network in every seat.

   KNUCKLE. A trick is about to start with 2 to 4 cards left and spare tricks still out. The leader (K) holds a trump
   and a non-trump; another seat (V) holds the top remaining trump as its ONLY trump and needs exactly one more trick.
   Leading a trump forces V to win and puts V on lead, bid made, with almost nothing left ("knuckling").
     KNUCKLE : K leads its lowest trump, then the network       OTHER : K's best non-trump lead by the network, then the network
   ZOMBIE. The first moment a seat holds every remaining trump, needs exactly that many tricks and has other cards
   (no trump in the trick being played).
     WAIT : never play a trump while a non-trump may legally be played     CASH : lead the trumps at the first chance
     NET  : as the network plays it
   PROBE=<share> also asks the game's card-reading bot for its lead at the knuckle moment.
   OHHELL_ENGINE=<folder with ohhell-play.html> node late.js <P> <n> <deals> <seed>     one JSON summary.
   Modified work under GPL v3; engine from ohhell-play.html (Jim Agniel's calculator, modified by Matt Glassman). */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_lt_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,READ,netChoose,legalCards,beatsCard,bidNetProbs,vienna,mulberry32,suitOf,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const [Pn, n, deals, seed] = process.argv.slice(2, 6).map(Number), rng = M.mulberry32(seed), ri = k => (rng() * k) | 0, SECS = +(process.env.SECS || 1e9), PROBE = +(process.env.PROBE || 0), T0 = Date.now();
const KG = {}, ZG = {};
const gk = k => KG[k] = KG[k] || { k: 0, d: 0, d2: 0, kMade: [0, 0], vOver: [0, 0], vMade: [0, 0], others: [0, 0], netTrump: 0, rk: 0, readTrump: 0 };
const gz = k => ZG[k] = ZG[k] || { k: 0, m: [0, 0, 0], made: [0, 0, 0], over: [0, 0, 0], short: [0, 0, 0], d: 0, d2: 0, dn: 0, dn2: 0 };
let done = 0, under = 0;
for (; done < deals && Date.now() - T0 < SECS * 1000; done++) {
  const deck = [...Array(52).keys()]; for (let i = 51; i > 0; i--) { const j = ri(i + 1); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const turned = deck[Pn * n], trump = M.suitOf(turned); M.setKnown([turned]);
  const hands = []; for (let q = 0; q < Pn; q++) hands.push(deck.slice(q * n, q * n + n).sort((p, q2) => p - q2));
  const bids = []; let Bs = 0; for (let q = 0; q < Pn; q++) { const pb = M.bidNetProbs(Pn, n, turned, q, hands[q], bids), u = rng(); let acc = 0, bb = n; for (let z = 0; z <= n; z++) { acc += pb[z]; if (u < acc) { bb = z; break; } }
    if (q === Pn - 1 && bb === n - Bs) { let bp = -1; for (let z = 0; z <= n; z++) if (z !== n - Bs && pb[z] > bp) { bp = pb[z]; bb = z; } } bids.push(bb); Bs += bb; }
  if (Bs >= n) continue; under++;
  const clone = S => ({ h: S.h.map(z => z.slice()), won: S.won.slice(), seen: S.seen.slice(), voids: S.voids.map(z => z.slice()), turn: S.turn, led: S.led, winCard: S.winCard, winner: S.winner, i: S.i, trick: S.trick.slice(), left: S.left });
  const stOf = S => ({ hand: S.h[S.turn], seen: S.seen, voids: S.voids, lens: S.h.map(z => z.length), bids, won: S.won, turn: S.turn, led: S.led, winCard: S.winCard, winner: S.winner, playedInTrick: S.i, trick: S.trick, turned, trump, n, P: Pn });
  const put = (S, c) => { const t = S.turn; S.h[t].splice(S.h[t].indexOf(c), 1); S.seen[c] = 1; S.trick.push(c); if (S.i === 0) S.led = M.suitOf(c); else if (M.suitOf(c) !== S.led) S.voids[t][S.led] = true; if (M.beatsCard(c, S.winCard, trump)) { S.winCard = c; S.winner = t; }
    S.left--; if (++S.i === Pn) { S.won[S.winner]++; S.turn = S.winner; S.i = 0; S.led = -1; S.winCard = -1; S.trick = []; } else S.turn = (t + 1) % Pn; };
  const netCard = S => { const lg = M.legalCards(S.h[S.turn], S.led); return lg.length === 1 ? lg[0] : M.netChoose(stOf(S), true).card; };
  const bestOf = (S, keep) => { const al = M.netChoose(stOf(S), 2).alts.filter(z => keep(z.card)); return al.length ? al.reduce((x, y) => y.score > x.score ? y : x).card : -1; };
  const isT = c => M.suitOf(c) === trump;
  const finish = (S, seat, mode) => { while (S.left > 0) { let c = -1; if (S.turn === seat) { const lg = M.legalCards(S.h[seat], S.led);
        if (mode === 'wait' && lg.length > 1 && lg.some(x => !isT(x)) && lg.some(isT)) c = bestOf(S, x => !isT(x));
        if (mode === 'cash' && S.i === 0 && S.won[seat] < bids[seat]) { const ts = S.h[seat].filter(isT); if (ts.length) c = ts[ts.length - 1]; } }
      put(S, c >= 0 ? c : netCard(S)); }
    let tot = 0; for (let q = 0; q < Pn; q++) tot += M.vienna(bids[q], S.won[q], n); return { won: S.won, money: q => M.vienna(bids[q], S.won[q], n) - tot / Pn }; };
  const S = { h: hands.map(z => z.slice()), won: new Array(Pn).fill(0), seen: new Uint8Array(52), voids: hands.map(() => [false, false, false, false]), turn: 0, led: -1, winCard: -1, winner: 0, i: 0, trick: [], left: Pn * n }, hist = [];
  let ks = null, zs = null;
  while (S.left > 0) { const s = S.turn, lg = M.legalCards(S.h[s], S.led), c = lg.length === 1 ? lg[0] : M.netChoose(stOf(S), true).card;
    if (lg.length > 1) { const out = []; for (let r = 12; r >= 0; r--) { const x = trump * 13 + r; if (x !== turned && !S.seen[x] && !S.h[s].includes(x)) out.push(x); }      // trumps the others still hold, highest first
      const myT = S.h[s].filter(isT);
      if (!zs && myT.length >= 1 && out.length === 0 && !S.trick.some(isT) && bids[s] - S.won[s] === myT.length && S.h[s].length > myT.length) zs = { S: clone(S), s, T: myT.length, net: c };
      if (!ks && S.i === 0 && S.h[s].length >= 2 && S.h[s].length <= 4 && myT.length >= 1 && S.h[s].length > myT.length && out.length && out[0] > myT[myT.length - 1]) {
        let needSum = 0; for (let q = 0; q < Pn; q++) if (S.won[q] < bids[q]) needSum += bids[q] - S.won[q];
        if (S.h[s].length - needSum > 0) { let V = -1; for (let q = 0; q < Pn; q++) if (q !== s && S.h[q].includes(out[0])) V = q;
          if (V >= 0 && S.h[V].filter(isT).length === 1 && bids[V] - S.won[V] === 1) { ks = { S: clone(S), K: s, V, net: c, low: myT[0] };
            if (PROBE && rng() < PROBE) { M.setKnown([turned]); const o = M.readChoose({ Pn, n, trump, turned, bids, order: [...Array(Pn).keys()], hand: S.h[s], seen: S.seen, voids: S.voids, lens: S.h.map(z => z.length), won: S.won, turn: s, led: -1, winCard: -1, winner: S.winner, playedInTrick: 0, trick: [], hist }, M.mulberry32((seed * 31 + done) >>> 0)); ks.read = o.card; } } } } }
    hist.push({ seat: s, card: c }); put(S, c); }
  if (zs) { const { s, T } = zs, tot0 = (() => { let t = 0; for (let q = 0; q < Pn; q++) t += M.vienna(bids[q], S.won[q], n); return t; })();
    const W = finish(clone(zs.S), s, 'wait'), C = finish(clone(zs.S), s, 'cash'), res = [{ t: W.won[s], m: W.money(s) }, { t: C.won[s], m: C.money(s) }, { t: S.won[s], m: M.vienna(bids[s], S.won[s], n) - tot0 / Pn }];
    const oth = zs.S.h[s].length - T, keys = ['all', 'trumps held: ' + (T >= 3 ? '3 or more' : T), 'other cards left: ' + (oth >= 4 ? '4 or more' : oth), zs.S.i === 0 ? 'on lead' : 'following'];
    for (const k of keys) { const g = gz(k); g.k++; res.forEach((r, i) => { g.m[i] += r.m; if (r.t === bids[s]) g.made[i]++; if (r.t > bids[s]) g.over[i]++; if (r.t < bids[s]) g.short[i]++; }); const d = res[0].m - res[1].m, dn = res[0].m - res[2].m; g.d += d; g.d2 += d * d; g.dn += dn; g.dn2 += dn * dn; } }
  if (ks) { const { K, V } = ks, run = card => { const C = clone(ks.S); put(C, card); return finish(C, -1, ''); }, other = bestOf(ks.S, x => !isT(x)), A = run(ks.low), B = run(other);
    const cl = ks.S.h[K].length, kst = ks.S.won[K] === bids[K] ? 'K has made' : ks.S.won[K] > bids[K] ? 'K is already over' : 'K still needs tricks';
    for (const k of ['all', cl + ' cards left', kst, kst + ' | ' + cl + ' cards left']) { const g = gk(k); g.k++; const d = A.money(K) - B.money(K); g.d += d; g.d2 += d * d;
      [A, B].forEach((R, i) => { if (R.won[K] === bids[K]) g.kMade[i]++; if (R.won[V] > bids[V]) g.vOver[i]++; if (R.won[V] === bids[V]) g.vMade[i]++; let o = 0; for (let q = 0; q < Pn; q++) if (q !== K && q !== V && R.won[q] === bids[q]) o++; g.others[i] += o / (Pn - 2); });
      if (isT(ks.net)) g.netTrump++; if (ks.read != null) { g.rk++; if (isT(ks.read)) g.readTrump++; } } }
}
console.log(JSON.stringify({ P: Pn, n, deals: done, under, seed, KG, ZG }));
