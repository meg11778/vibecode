// A seat holding L cards of one suit: points for that seat with rules / old net / new net playing it (new net elsewhere).
const T = require('./table.js'), E = require('./engine.js'), enc = require('./encode.js');
const { loadNet } = require('./net.js');
const [P, n, withTrump, deals, suitArg, mapMode] = process.argv.slice(2);
enc.setNoTrumpMap(mapMode || 'long');
const N = loadNet('net3_best.json').policy, O = loadNet('net_weights.json').policy, H = T.heuristicPolicy;
const rng = E.mulberry32(99 + n * 7 + +P);
function dealLong(L, seat) {
  for (;;) {
    const s = suitArg === 'any' ? (rng() * 4) | 0 : +suitArg, d = [...Array(52).keys()];
    for (let i = 51; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; }
    const sc = d.filter(c => T.suitOf(c) === s).slice(0, L), rest = d.filter(c => T.suitOf(c) !== s);
    const mine = sc.concat(rest.slice(0, n - L)), cnt = [0, 0, 0, 0]; for (const c of mine) cnt[T.suitOf(c)]++;
    if (Math.max(...cnt) !== L) continue;
    const others = d.filter(c => !mine.includes(c)), hands = []; let q = 0;
    for (let p = 0; p < +P; p++) hands.push((p === seat ? mine : others.slice(q, q += +n)).slice().sort((a, b) => a - b));
    const turned = (+withTrump && P * n < 52) ? others[q] : -1;
    return { hands, turned, trump: turned >= 0 ? T.suitOf(turned) : -1 };
  }
}
console.log(`${P} seats ${n} cards ${+withTrump ? 'trump' : 'no trump'}, long suit ${suitArg === 'any' ? 'any' : 'SHDC'[+suitArg]}, nt map ${mapMode || 'long'}: seat points rules / old / new`);
for (const L of process.argv.slice(8).map(Number)) {
  const out = [];
  for (const mode of ['formula', 'any bid']) {
    let r = 0, o = 0, w = 0, c = 0;
    for (let i = 0; i < +deals; i++) {
      const s = i % P, deal = dealLong(L, s), bids = T.makeBids(deal.hands, deal.trump, deal.turned, +P, +n), slack = bids.map(() => 0);
      if (mode !== 'formula') { let b = (rng() * (+n + 1)) | 0; const B = bids.reduce((a, x) => a + x, 0) - bids[s]; if (B + b === +n) b = b ? b - 1 : b + 1; bids[s] = b; slack[s] = +n; }
      const seats = [...Array(+P).keys()], play = pol => T.vienna(bids[s], T.playDeal(deal, bids, +P, +n, seats.map(p => p === s ? pol : N), slack)[s], +n);
      r += play(H); o += play(O); w += play(N); c++;
    }
    out.push(`${mode}: ${(r / c).toFixed(2)} / ${(o / c).toFixed(2)} / ${(w / c).toFixed(2)}`);
  }
  console.log(`  ${String(L).padStart(2)} long | ${out.join('  |  ')}`);
}
