/* Price one hand's bids on a large sample, with the formula and with the bidding network as the picture of the other bidders.
   node price_bid.js AH,QH,AD 3C 5 0 "" 6000     (hand, turned card, players, place in the bidding, bids ahead, deals)
   Matt's hand, 15 Nov 2026: first to bid at 5 players with A♥ Q♥ A♦, trump clubs. Formula picture: bid 0 -1.82, bid 1 -2.24. Network picture: bid 0 -2.28, bid 1 -1.99. */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE || require('path').join(__dirname, '..', 'engine');
const lines = fs.readFileSync((fs.existsSync(path.join(ENG, 'ohhell.html')) ? path.join(ENG, 'ohhell.html') : path.join(ENG, '..', '..', 'ohhell.html')), 'utf8').split('\n');
const a = lines.findIndex(l => l.includes('===== cards:')), b = lines.findIndex(l => l.includes('===== UI ====='));
const tmp = path.join(os.tmpdir(), '_wb_' + process.pid + '.js');
fs.writeFileSync(tmp, lines.slice(a, b).join('\n') + '\n' + fs.readFileSync(path.join(ENG, 'bidnet_block.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ENG, 'simbid_block.js'), 'utf8') +
  '\nmodule.exports={simulateBid,bidNetProbs,muFor,bidAt,auctionFactor,setKnown:(k)=>{KNOWN=k;}};');
const E = require(tmp); fs.unlinkSync(tmp);
const C = t => { const s = 'SHDC'.indexOf(t.slice(-1)), v = { J: 11, Q: 12, K: 13, A: 14 }[t.slice(0, -1)] || +t.slice(0, -1); return s * 13 + v - 2; };
const [handS, turnedS, Ps, posS, priorS, K] = process.argv.slice(2), hand = handS.split(',').map(C).sort((x, y) => x - y), turned = C(turnedS), P = +Ps, pos = +posS, prior = priorS ? priorS.split(',').map(Number) : [], n = hand.length, trump = (turned / 13) | 0;
E.setKnown([turned]); const B = prior.reduce((x, y) => x + y, 0), mu = E.muFor(hand, trump, n, P, pos), adj = Math.max(0, Math.min(n, mu * E.auctionFactor(n, P, B, P - pos))), model = { bid: E.bidAt(adj, n, pos === P - 1 ? n - B : -1), adj };
console.log('formula expects', mu.toFixed(2), 'tricks, bids', model.bid, '| bidding network:', Array.from(E.bidNetProbs(P, n, turned, pos, hand, prior)).map((p, i) => i + ': ' + (100 * p).toFixed(0) + '%').join('  '));
for (const m of ['formula', 'net']) { const r = E.simulateBid(hand, trump, turned, n, P, pos, prior, model, 12345, { samples: +K, model: m, window: 3, maxDraws: 40 * K });
  console.log('simulation, picture of the others = ' + m + ', ' + K + ' deals:', r.table ? r.table.map(t => 'bid ' + t.bid + ' ' + (t.edge >= 0 ? '+' : '') + t.edge.toFixed(2) + ' (makes ' + t.makes + '%)').join(' | ') : JSON.stringify(r), '-> bids', r.bid); }
