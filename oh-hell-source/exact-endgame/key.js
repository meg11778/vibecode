/* Answer key for late positions (27 Nov 2026, Matt Glassman's project; idea from the outside review of that date).
 *
 * The game's card reading and its mistake report both estimate, by sampling, one well-defined quantity: the average
 * money of each legal card over every layout of the hidden cards, each layout weighted by (a) how likely the bidding
 * network makes every other seat's bid on the hand the layout gives it and (b) how likely the card-play network makes
 * every card that seat has played (sharpness READ.beta, floor READ.eps), with the plain network playing the hand out.
 * This file computes that quantity without the game's sampler, so the sampler can be checked against it.
 *
 * How: both weights depend on one seat's own hand and public information only, so the weight of a layout is a product
 * of one factor per seat. For each other seat every hand it could hold is listed and its factor worked out. Layouts
 * are then drawn EXACTLY in proportion to their weight (each seat's hand drawn from its own table, the draw thrown
 * away if two seats share a card), or all listed when there are few enough. No fitting budget, no resampling of a
 * few candidates, no dealing step.
 *
 * What it is not: it is exact only for these beliefs and this continuation (the plain network plays on). It says
 * nothing about best play against people.
 *
 *   node key.js <players> <cards> <deals> <seed> [maxLeft=3] [readSeeds=30] [reportSeeds=10]   -> JSON lines on stdout
 *   Settings from the environment: MINLEFT (fewest cards hidden in the fullest other hand, default 0), MAXHANDS, DRAWS, LISTALL, OHHELL_PAGE.
 */
const fs = require('fs'), path = require('path'), os = require('os');
const page = fs.readFileSync(process.env.OHHELL_PAGE || (fs.existsSync(path.join(__dirname, "ohhell-play.html")) ? path.join(__dirname, "ohhell-play.html") : path.join(__dirname, "..", "..", "ohhell-play.html")), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
if (a < 0 || b < 0) throw new Error('page layout not recognised');
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_ohhell_key_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={READ,readChoose,readLayouts,playOut,netChoose,legalCards,equivGroups,mirrorGroups,bidNetProbs,bidNetCovers,suitOf,beatsCard,vienna,mulberry32,cardStr};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const { READ, readChoose, readLayouts, playOut, netChoose, legalCards, equivGroups, mirrorGroups, bidNetProbs, bidNetCovers, suitOf, beatsCard, vienna, mulberry32, cardStr } = M;
const ASSESS = { thin: 30, samples: 160, minor: 0.25, major: 1.0 };
const verdictOf = (cost, se) => cost < ASSESS.minor ? 'ok' : cost <= 2 * se ? 'close' : cost < ASSESS.major ? 'minor' : 'major';

/* every hand of `k` cards from `pool` */
function combos(pool, k) { const out = []; (function rec(i, cur) { if (cur.length === k) { out.push(cur.slice()); return; } for (let j = i; j <= pool.length - (k - cur.length); j++) { cur.push(pool[j]); rec(j + 1, cur); cur.pop(); } })(0, []); return out; }

/* One seat's factor for every hand it could hold now: the bidding network's probability of its bid on the hand as
   dealt, times the play model's probability of each card it has played. Same sums as readLayouts, one seat at a time. */
function seatTable(S, q, unseen) {
  const Pn = S.Pn, playedQ = S.hist.filter(e => e.seat === q).map(e => e.card), pos = S.order.indexOf(q), ahead = S.order.slice(0, pos).map(x => S.bids[x]);
  const pool = unseen.filter(c => !S.voids[q][suitOf(c)]), hands = combos(pool, S.lens[q]), f = new Float64Array(hands.length);
  for (let x = 0; x < hands.length; x++) {
    const full = hands[x].concat(playedQ).sort((u, v) => u - v);
    let lw = Math.log(Math.max(1e-300, bidNetProbs(Pn, S.n, S.turned, pos, full, ahead)[S.bids[q]]));
    const hq = full.slice(), won = new Array(Pn).fill(0), seen = new Uint8Array(52), voids = [...Array(Pn)].map(() => [false, false, false, false]), lens = new Array(Pn).fill(S.n);
    let led = -1, winCard = -1, winner = 0, i = 0, trick = [], bad = false;
    for (const e of S.hist) {
      const p = e.seat, c = e.card; if (i === 0) winner = p;
      if (p === q) {
        const lg = legalCards(hq, led);
        if (!lg.includes(c)) { bad = true; break; }                      // this hand could not have played that card (it held the suit led)
        if (lg.length > 1) {
          const al = netChoose({ hand: hq, seen, voids, lens: lens.slice(), bids: S.bids, won, turn: q, led, winCard, winner, playedInTrick: i, trick, turned: S.turned, trump: S.trump, n: S.n, P: Pn }, 2).alts;
          let mx = -Infinity, zc = 0; for (const o of al) { if (o.score > mx) mx = o.score; if (o.card === c) zc = o.score; }
          let tot = 0; for (const o of al) tot += Math.exp(READ.beta * (o.score - mx));
          let pc = Math.exp(READ.beta * (zc - mx));
          if (READ.touch) { const g = equivGroups(lg, seen, trick, S.turned, winCard, S.trump).find(z => z.includes(c)); if (g && g.length > 1) { pc = 0; for (const o of al) if (g.includes(o.card)) pc += Math.exp(READ.beta * (o.score - mx)); pc /= g.length; } }
          lw += Math.log((1 - READ.eps) * pc / tot + READ.eps / lg.length);
        }
        hq.splice(hq.indexOf(c), 1);
      }
      lens[p]--; seen[c] = 1; trick.push(c);
      if (i === 0) led = suitOf(c); else if (suitOf(c) !== led) voids[p][led] = true;
      if (beatsCard(c, winCard, S.trump)) { winCard = c; winner = p; }
      if (++i === Pn) { won[winner]++; i = 0; led = -1; winCard = -1; trick = []; }
    }
    f[x] = bad ? 0 : Math.exp(lw);
  }
  return { hands, f };
}

/* The key for one decision. Returns each choice's value, and how it was found. */
function answerKey(S, groups, rng, opt) {
  const me = S.turn, Pn = S.Pn, mine = new Set(S.hand), unseen = []; for (let c = 0; c < 52; c++) if (!S.seen[c] && !mine.has(c) && c !== S.turned) unseen.push(c);
  const others = []; for (let q = 0; q < Pn; q++) if (q !== me) others.push(q);
  // too many possible hands to list in reasonable time: leave this decision out (MAXHANDS, default 400,000 over the seats)
  { const choose = (x, y) => { if (y < 0 || y > x) return 0; let r = 1; for (let i = 1; i <= y; i++) r = r * (x - y + i) / i; return r; }; let tot = 0; for (const q of others) tot += choose(unseen.filter(c => !S.voids[q][suitOf(c)]).length, S.lens[q]); if (tot > +(process.env.MAXHANDS || 400000)) return null; }
  const tabs = others.map(q => S.lens[q] > 0 ? seatTable(S, q, unseen) : { hands: [[]], f: Float64Array.from([1]) });
  // drop hands that carry next to nothing (under a millionth of that seat's best), then cumulative tables
  for (const t of tabs) { let mx = 0; for (const v of t.f) if (v > mx) mx = v; if (!(mx > 0)) return null; const keep = []; for (let x = 0; x < t.hands.length; x++) if (t.f[x] > mx * 1e-6) keep.push(x); t.hands = keep.map(x => t.hands[x]); t.f = Float64Array.from(keep.map(x => t.f[x])); t.cum = new Float64Array(t.f.length); let s = 0; for (let x = 0; x < t.f.length; x++) { s += t.f[x]; t.cum[x] = s; } t.sum = s; }
  const A = { Pn, n: S.n, trump: S.trump, turned: S.turned, bids: S.bids }, st = { won: S.won, seen: S.seen, voids: S.voids, trick: S.trick, led: S.led, winCard: S.winCard, winner: S.winner, playedInTrick: S.playedInTrick };
  const G = groups.length, sum = new Float64Array(G), sw2 = { w: 0, w2: 0 }, per = groups.map(() => []), wts = [];
  const price = (hs, w) => { const hands = new Array(Pn); others.forEach((q, k) => { hands[q] = hs[k]; }); hands[me] = S.hand; for (let g = 0; g < G; g++) { const v = playOut(A, st, hands, groups[g][0], true, me); sum[g] += w * v; per[g].push(v); } wts.push(w); sw2.w += w; sw2.w2 += w * w; };
  const total = tabs.reduce((x, t) => x * t.hands.length, 1); let how;
  if (total <= (opt.listAll || 6000)) {                                   // few enough: every layout, with its weight
    how = 'all'; const used = new Uint8Array(52);
    (function rec(k, hs, w) { if (k === tabs.length) { price(hs, w); return; } const t = tabs[k];
      for (let x = 0; x < t.hands.length; x++) { const h = t.hands[x]; let clash = false; for (const c of h) if (used[c]) { clash = true; break; } if (clash) continue; for (const c of h) used[c] = 1; hs.push(h); rec(k + 1, hs, w * t.f[x] / t.sum); hs.pop(); for (const c of h) used[c] = 0; } })(0, [], 1);
    if (!wts.length) return null;
  } else {                                                                // exact draws: each seat from its own table, thrown away on a shared card
    how = 'drawn'; const N = opt.draws || 3000, used = new Uint8Array(52); let got = 0, tries = 0;
    const pick = t => { const u = rng() * t.sum; let lo = 0, hi = t.cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (t.cum[m] < u) lo = m + 1; else hi = m; } return t.hands[lo]; };
    while (got < N && tries < N * 400) { tries++; used.fill(0); const hs = []; let clash = false;
      for (const t of tabs) { const h = pick(t); for (const c of h) if (used[c]) clash = true; if (clash) break; for (const c of h) used[c] = 1; hs.push(h); }
      if (clash) continue; price(hs, 1); got++; }
    if (got < N / 2) return null;
  }
  const W = sw2.w, val = Array.from(sum, v => v / W), n = wts.length, ess = W * W / sw2.w2;
  // standard error of each choice's gap to the best (zero when every layout was listed)
  let best = 0; for (let g = 1; g < G; g++) if (val[g] > val[best]) best = g;
  const gapSe = val.map((v, g) => { if (how === 'all' || g === best) return 0; let s2 = 0; const m = val[best] - v; for (let i = 0; i < n; i++) { const d = per[best][i] - per[g][i] - m; s2 += d * d; } return Math.sqrt(s2 / n / (n - 1)); });
  return { val, best, gapSe, how, layouts: n, ess: how === 'all' ? ess : n, total };
}

/* The report's own sums for one decision, as assessHand does them (one read of 160 layouts; the clock-dependent extra draw left out). */
function reportPrice(S, groups, rng) {
  const K = ASSESS.samples, me = S.turn, A = { Pn: S.Pn, n: S.n, trump: S.trump, turned: S.turned, bids: S.bids }, st = { won: S.won, seen: S.seen, voids: S.voids, trick: S.trick, led: S.led, winCard: S.winCard, winner: S.winner, playedInTrick: S.playedInTrick };
  const was = READ.exact; if (READ.exact !== undefined) READ.exact = Math.max(READ.exact || 0, 20000);
  const L = readLayouts(S, rng, K * 4, K), ess = Math.min(K, L.ess); READ.exact = was; const _e = 0, vals = groups.map(() => new Float32Array(K));
  for (let k = 0; k < K; k++) { const hands = L.picks[k].slice(); hands[me] = S.hand; for (let g = 0; g < groups.length; g++) vals[g][k] = playOut(A, st, hands, groups[g][0], true, me); }
  const mean = vals.map(v => { let t = 0; for (let k = 0; k < K; k++) t += v[k]; return t / K; });
  return { mean, ess, vals, K, uniq: new Set(L.picks).size };
}

if (require.main === module) {
  const [P, n, deals, seed] = process.argv.slice(2, 6).map(Number), maxLeft = +(process.argv[6] || 3), readSeeds = +(process.argv[7] || 30), repSeeds = +(process.argv[8] || 10);
  const rng = mulberry32(seed), order = [...Array(P).keys()];
  for (let d = 0; d < deals; d++) {
    const deck = [...Array(52).keys()]; for (let i = 51; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    const h = []; for (let q = 0; q < P; q++) h.push(deck.slice(q * n, (q + 1) * n).sort((x, y) => x - y));
    const turned = P * n < 52 ? deck[P * n] : -1, trump = turned >= 0 ? suitOf(turned) : -1;
    const bids = []; let B = 0;
    for (let q = 0; q < P; q++) { const pb = bidNetProbs(P, n, turned, q, h[q], bids), u = rng(); let acc = 0, bq = n; for (let x = 0; x <= n; x++) { acc += pb[x]; if (u < acc) { bq = x; break; } } if (q === P - 1 && bq === n - B) { let bp = -1; for (let x = 0; x <= n; x++) if (x !== n - B && pb[x] > bp) { bp = pb[x]; bq = x; } } bids.push(bq); B += bq; }
    const won = new Array(P).fill(0), seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]), hist = []; let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = [];
    // one decision a deal is examined: chosen at random among those late enough, so a deal's decisions are not correlated
    const cand = [];
    for (let left = P * n; left > 0; left--) {
      const lg = legalCards(h[turn], led); let c;
      const o = { hand: h[turn], seen, voids, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P };
      c = lg.length === 1 ? lg[0] : netChoose(o, true).card;
      const hid = Math.max(...h.map((x, q) => q === turn ? 0 : x.length));
      if (lg.length > 1 && hid <= maxLeft && hid >= +(process.env.MINLEFT || 0)) {
        const groups = mirrorGroups(equivGroups(lg, seen, trick, turned, winCard, trump), h[turn], seen, voids, trump, turned);
        if (groups.length > 1) cand.push({ S: { Pn: P, n, trump, turned, bids, order, hand: h[turn].slice(), seen: Uint8Array.from(seen), voids: voids.map(v => v.slice()), lens: h.map(x => x.length), won: won.slice(), turn, led, winCard, winner, playedInTrick: i, trick: trick.slice(), hist: hist.slice() }, groups, played: c, truth: h.map(x => x.slice()) });
      }
      h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); hist.push({ seat: turn, card: c });
      if (i === 0) led = suitOf(c); else if (suitOf(c) !== led) voids[turn][led] = true;
      if (beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
      if (++i === P) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % P;
    }
    if (!cand.length) continue;
    const pickD = cand[(rng() * cand.length) | 0], { S, groups } = pickD, key = answerKey(S, groups, mulberry32(seed * 131 + d), { listAll: +(process.env.LISTALL || 6000), draws: +(process.env.DRAWS || 3000) });
    if (!key) continue;
    const gi = groups.findIndex(g => g.includes(pickD.played)), regret = g => key.val[key.best] - key.val[g];
    // the live reader, many seeds
    const reads = [], tR = Date.now(); for (let r = 0; r < readSeeds; r++) { const S1 = Object.assign({}, S), rr = readChoose(S1, mulberry32(seed * 7919 + d * 101 + r)); reads.push({ g: groups.findIndex(g => g.includes(rr.card)), rounds: rr.rounds, ess: +rr.ess.toFixed(1) }); }
    const readMs = Math.round((Date.now() - tR) / readSeeds);
    // the report, several seeds, judging the card the network actually played
    const reps = []; for (let r = 0; r < repSeeds; r++) { const R = reportPrice(Object.assign({}, S), groups, mulberry32(seed * 104729 + d * 37 + r)); let bi = 0; for (let g = 1; g < groups.length; g++) if (R.mean[g] > R.mean[bi]) bi = g;
      const cost = R.mean[bi] - R.mean[gi]; let d2 = 0; for (let k = 0; k < R.K; k++) { const x = R.vals[bi][k] - R.vals[gi][k] - cost; d2 += x * x; } const se = Math.sqrt(d2 / R.K / (Math.max(2, R.ess) - 1));
      reps.push({ best: bi, cost: +cost.toFixed(3), se: +se.toFixed(3), verdict: verdictOf(cost, se), ess: +R.ess.toFixed(1), uniq: R.uniq, mean: R.mean.map(v => +v.toFixed(3)) }); }
    // what each choice actually earns on the deal as it really lay (same continuation): the yardstick no model can argue with
    const A0 = { Pn: P, n, trump, turned, bids }, st0 = { won: S.won, seen: S.seen, voids: S.voids, trick: S.trick, led: S.led, winCard: S.winCard, winner: S.winner, playedInTrick: S.playedInTrick };
    const truthVal = groups.map(g => +playOut(A0, st0, pickD.truth.map(x => x.slice()), g[0], true, S.turn).toFixed(3));
    let chk; if (process.env.CHECK && key.how === 'all') { const k2 = answerKey(S, groups, mulberry32(seed * 977 + d), { listAll: 0, draws: 20000 }); chk = { val: k2.val.map(v => +v.toFixed(4)), gapSe: k2.gapSe.map(v => +v.toFixed(4)) }; }
    console.log(JSON.stringify({ P, n, d, seed, hidden: Math.max(...S.lens.map((x, q) => q === S.turn ? 0 : x)), seat: S.turn, left: S.lens, hand: S.hand.map(cardStr), groups: groups.map(g => g.map(cardStr)), played: gi, bids, won: S.won,
      key: { val: key.val.map(v => +v.toFixed(4)), best: key.best, gapSe: key.gapSe.map(v => +v.toFixed(4)), how: key.how, layouts: key.layouts, ess: +key.ess.toFixed(1), total: key.total }, playedRegret: +regret(gi).toFixed(4), truthVal, chk, readMs, reads, reps }));
  }
}
module.exports = { answerKey, seatTable, reportPrice, M };
