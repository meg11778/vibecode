/* What is each seat worth? Every seat bid and played by the same bots.
 *
 *   node posmap.js <players> <cards> <deals> <seed> <formula|sim>
 *
 * Seat 0 bids first and leads; seat P-1 is the dealer (hooked). Bids: the bid formula, or the game's simulation
 * bidding (150 sampled deals) in every seat. Cards: the networks where they apply, the rules elsewhere (three
 * players, one-card rounds). Money: a seat's Vienna points less the table's average. Prints one line of JSON.
 */
const fs = require('fs'), path = require('path'), os = require('os');
const ENG = process.env.OHHELL_ENGINE || path.join(__dirname, '..', 'engine');
const lines = fs.readFileSync(path.join(ENG, 'ohhell.html'), 'utf8').split('\n');
const a = lines.findIndex(l => l.includes('===== cards:')), b = lines.findIndex(l => l.includes('===== UI ====='));
const tmp = path.join(os.tmpdir(), '_ohhell_posmap_' + process.pid + '.js');
fs.writeFileSync(tmp, lines.slice(a, b).join('\n') + '\n' + fs.readFileSync(path.join(ENG, 'simbid_block.js'), 'utf8') +
  '\nmodule.exports={simulateBid,muFor,bidAt,auctionFactor,playHandNet,playHand,netFor,vienna,mulberry32,suitOf,setKnown:(k)=>{KNOWN=k;}};');
const E = require(tmp); fs.unlinkSync(tmp);
const [P, n, deals, seed] = process.argv.slice(2, 6).map(Number), mode = process.argv[6] || 'formula';
const rng = E.mulberry32(seed), S = Array.from({ length: P }, () => ({ m: 0, m2: 0, made: 0, bid: 0, pts: 0 })); let over = 0, under = 0, simDiff = 0;
for (let i = 0; i < deals; i++) {
  const d = [...Array(52).keys()];
  for (let k = 51; k > 0; k--) { const j = (rng() * (k + 1)) | 0; [d[k], d[j]] = [d[j], d[k]]; }
  const hands = []; for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n).sort((x, y) => x - y));
  const turned = P * n < 52 ? d[P * n] : -1, trump = turned < 0 ? -1 : E.suitOf(turned);
  const bids = []; let B = 0;
  for (let p = 0; p < P; p++) {
    E.setKnown(turned < 0 ? [] : [turned]);
    const est = E.muFor(hands[p], trump, n, P, p), adj = Math.max(0, Math.min(n, est * E.auctionFactor(n, P, B, P - p)));
    const model = { bid: E.bidAt(adj, n, p === P - 1 ? n - B : -1), adj };
    let bid = model.bid;
    if (mode === 'sim' && n > 1) { bid = E.simulateBid(hands[p], trump, turned, n, P, p, bids.slice(), model, (seed * 7919 + i * 31 + p) >>> 0, { samples: 150 }).bid; if (bid !== model.bid) simDiff++; }
    bids.push(bid); B += bid;
  }
  E.setKnown(turned < 0 ? [] : [turned]);
  const won = E.netFor(P, n, trump) ? E.playHandNet(hands, bids, trump, P, n, turned) : E.playHand(hands, bids, trump, P, n); let tot = 0; const pt = [];
  for (let p = 0; p < P; p++) { pt.push(E.vienna(bids[p], won[p], n)); tot += pt[p]; }
  if (B > n) over++; else under++;
  for (let p = 0; p < P; p++) { const m = pt[p] - tot / P, s = S[p]; s.m += m; s.m2 += m * m; s.pts += pt[p]; s.bid += bids[p]; if (won[p] === bids[p]) s.made++; }
}
console.log(JSON.stringify({ P, n, deals, mode, over: over / deals, simDiff: simDiff / deals / P,
  seats: S.map(s => ({ ev: +(s.m / deals).toFixed(4), ci: +(1.96 * Math.sqrt((s.m2 / deals - (s.m / deals) ** 2) / deals)).toFixed(4), made: +(100 * s.made / deals).toFixed(1), bid: +(s.bid / deals).toFixed(3), pts: +(s.pts / deals).toFixed(3) })) }));
