/* The dealer's bid, three ways on the same deals: formula, formula without the adjustment for bids ahead, simulation.
   Seats ahead always bid by formula. node dealer.js <P> <n> <deals> <seed> [sim=1|0] */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = '/home/claude/ohhell-engine';
const lines = fs.readFileSync(path.join(ENG, 'ohhell.html'), 'utf8').split('\n');
const a = lines.findIndex(l => l.includes('===== cards:')), b = lines.findIndex(l => l.includes('===== UI ====='));
const tmp = path.join(os.tmpdir(), '_ohhell_dealer_' + process.pid + '.js');
fs.writeFileSync(tmp, lines.slice(a, b).join('\n') + '\n' + fs.readFileSync(path.join(ENG, 'simbid_block.js'), 'utf8') +
  '\nmodule.exports={simulateBid,muFor,bidAt,auctionFactor,playHandNet,playHand,netFor,vienna,mulberry32,suitOf,setKnown:(k)=>{KNOWN=k;}};');
const E = require(tmp); fs.unlinkSync(tmp);
const [P, n, deals, seed] = process.argv.slice(2, 6).map(Number), doSim = process.argv[6] !== '0';
const rng = E.mulberry32(seed), modes = doSim ? ['formula', 'noAdjust', 'sim'] : ['formula', 'noAdjust'];
const S = modes.map(() => ({ m: 0, m2: 0, made: 0, bid: 0, won: 0, over: 0, under: 0, d: 0, d2: 0 })); const first = { m: 0, bid: 0, won: 0, made: 0, over: 0, under: 0 }; let gapSum = 0;
for (let i = 0; i < deals; i++) {
  const d = [...Array(52).keys()];
  for (let k = 51; k > 0; k--) { const j = (rng() * (k + 1)) | 0; [d[k], d[j]] = [d[j], d[k]]; }
  const hands = []; for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n).sort((x, y) => x - y));
  const turned = P * n < 52 ? d[P * n] : -1, trump = turned < 0 ? -1 : E.suitOf(turned), D = P - 1;
  E.setKnown(turned < 0 ? [] : [turned]);
  const prior = []; let B = 0;
  for (let p = 0; p < D; p++) { const adj = Math.max(0, Math.min(n, E.muFor(hands[p], trump, n, P, p) * E.auctionFactor(n, P, B, P - p))); const bid = E.bidAt(adj, n, -1); prior.push(bid); B += bid; }
  const est = E.muFor(hands[D], trump, n, P, D), adj = Math.max(0, Math.min(n, est * E.auctionFactor(n, P, B, 1))), ban = n - B;
  const bidF = E.bidAt(adj, n, ban), bidN = E.bidAt(Math.max(0, Math.min(n, est)), n, ban);
  const bids3 = [bidF, bidN]; if (doSim) bids3.push(E.simulateBid(hands[D], trump, turned, n, P, D, prior.slice(), { bid: bidF, adj }, (seed * 7919 + i) >>> 0, { samples: 150 }).bid);
  gapSum += n - B; const cache = {}; let base = 0;
  bids3.forEach((bd, k) => { E.setKnown(turned < 0 ? [] : [turned]);
    const r = cache[bd] || (cache[bd] = (() => { const bids = prior.concat([bd]), won = E.netFor(P, n, trump) ? E.playHandNet(hands, bids, trump, P, n, turned) : E.playHand(hands, bids, trump, P, n); let tot = 0; for (let p = 0; p < P; p++) tot += E.vienna(bids[p], won[p], n);
      return { m: E.vienna(bd, won[D], n) - tot / P, won: won[D], m0: E.vienna(bids[0], won[0], n) - tot / P, w0: won[0], b0: bids[0] }; })());
    const s = S[k]; s.m += r.m; s.m2 += r.m * r.m; s.bid += bd; s.won += r.won; if (r.won === bd) s.made++; else if (r.won > bd) s.over++; else s.under++;
    if (k === 0) { base = r.m; first.m += r.m0; first.bid += r.b0; first.won += r.w0; if (r.w0 === r.b0) first.made++; else if (r.w0 > r.b0) first.over++; else first.under++; }
    else { const df = r.m - base; s.d += df; s.d2 += df * df; } });
}
console.log(JSON.stringify({ P, n, deals, modes, S, first, gapSum }));
