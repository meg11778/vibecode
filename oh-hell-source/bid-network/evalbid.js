/* The bidding network as a bidder: one seat bids from the network instead of the formula, same deals, seats ahead and
   behind bidding by formula, cards played by the networks. Gain in dollars a deal, by seat.
   node evalbid.js <bidnet.json> <P> <n> <deals> <seed> */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE || '/home/claude/ohhell-engine';
const lines = fs.readFileSync(path.join(ENG, 'ohhell.html'), 'utf8').split('\n');
const a = lines.findIndex(l => l.includes('===== cards:')), b = lines.findIndex(l => l.includes('===== UI ====='));
const tmp = path.join(os.tmpdir(), '_ohhell_evalbid_' + process.pid + '.js');
fs.writeFileSync(tmp, lines.slice(a, b).join('\n') + '\nmodule.exports={muFor,bidAt,auctionFactor,playHandNet,playHand,netFor,vienna,mulberry32,suitOf,setKnown:(k)=>{KNOWN=k;}};');
const E = require(tmp); fs.unlinkSync(tmp);
const BN = require('./bidnet.js').load(process.argv[2]), [P, n, deals, seed] = process.argv.slice(3, 7).map(Number), rng = E.mulberry32(seed);
const S = Array.from({ length: P }, () => ({ k: 0, g: 0, g2: 0, differ: 0, bF: 0, bN: 0 }));
const formula = (hand, trump, pos, B) => E.bidAt(Math.max(0, Math.min(n, E.muFor(hand, trump, n, P, pos) * E.auctionFactor(n, P, B, P - pos))), n, pos === P - 1 ? n - B : -1);
for (let i = 0; i < deals; i++) {
  const d = [...Array(52).keys()];
  for (let k = 51; k > 0; k--) { const j = (rng() * (k + 1)) | 0; [d[k], d[j]] = [d[j], d[k]]; }
  const hands = []; for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n).sort((x, y) => x - y));
  const turned = P * n < 52 ? d[P * n] : -1, trump = turned < 0 ? -1 : E.suitOf(turned), s = i % P;
  E.setKnown(turned < 0 ? [] : [turned]);
  const prior = []; let B = 0; for (let p = 0; p < s; p++) { const x = formula(hands[p], trump, p, B); prior.push(x); B += x; }
  const bf = formula(hands[s], trump, s, B), bn = BN.bid(P, n, turned, s, hands[s], prior);
  const play = mine => { const bids = prior.concat([mine]); let T = B + mine; E.setKnown(turned < 0 ? [] : [turned]); for (let p = s + 1; p < P; p++) { const x = formula(hands[p], trump, p, T); bids.push(x); T += x; }
    const won = E.netFor(P, n, trump) ? E.playHandNet(hands, bids, trump, P, n, turned) : E.playHand(hands, bids, trump, P, n); let tot = 0; for (let p = 0; p < P; p++) tot += E.vienna(bids[p], won[p], n);
    return E.vienna(mine, won[s], n) - tot / P; };
  const df = bn === bf ? 0 : play(bn) - play(bf), t = S[s]; t.k++; t.g += df; t.g2 += df * df; if (bn !== bf) t.differ++; t.bF += bf; t.bN += bn;
}
console.log(JSON.stringify({ P, n, deals, seats: S.map(t => { const m = t.g / t.k; return { gain: +m.toFixed(3), ci: +(1.96 * Math.sqrt((t.g2 / t.k - m * m) / t.k)).toFixed(3), differ: +(100 * t.differ / t.k).toFixed(0), bidFormula: +(t.bF / t.k).toFixed(2), bidNet: +(t.bN / t.k).toFixed(2) }; }) }));
