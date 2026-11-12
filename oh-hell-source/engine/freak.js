/* How does each engine play a seat that holds a long suit?
 *
 *   node freak.js <seats> <cards> <trump: 1|0> <deals>
 *
 * The test seat (rotating) is dealt a longest suit of exactly L cards, L from
 * 4 up; everything else is dealt at random. Bids come from the bid formula.
 * Same deal played with the network and with the rules in that seat, the
 * network in every other seat. Then the same again with the test seat's bid
 * pushed 3 below and 3 above the formula's, which is what the calculator asks
 * of the play engine when it prices every bid.
 */
const fs = require('fs'), path = require('path'), os = require('os');
const lines = fs.readFileSync(path.join(__dirname, 'ohhell.html'), 'utf8').split('\n');
const a = lines.findIndex(l => l.includes('===== cards:')), b = lines.findIndex(l => l.includes('===== UI ====='));
const tmp = path.join(os.tmpdir(), '_ohhell_freak_' + process.pid + '.js');
fs.writeFileSync(tmp, lines.slice(a, b).join('\n') + '\nmodule.exports={muFor,bidAt,auctionFactor,vienna,mulberry32,suitOf,chooseCard,netFor,setKnown:(k)=>{KNOWN=k;}};');
const E = require(tmp); fs.unlinkSync(tmp);
const [Ps, ns, ts, ds] = process.argv.slice(2), P = +Ps, n = +ns, withTrump = +ts === 1, deals = +ds;
const k = E.netFor(P, n, withTrump ? 0 : -1);
const T = require('../ohhell-engine-2/table.js');
const net = k === 1 ? require('./net.js').loadNet(path.join(__dirname, 'net_best.json')).policy
                    : require('../ohhell-engine-2/net.js').loadNet(path.join(__dirname, 'net2_best.json')).policy;
const rng = E.mulberry32(4711 + P * 100 + n);
function dealLong(L, seat) {
  // seat gets exactly L cards of one suit and no longer suit; the rest at random
  for (;;) {
    const s = (rng() * 4) | 0, d = [...Array(52).keys()];
    for (let i = 51; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; }
    const suitCards = d.filter(c => E.suitOf(c) === s).slice(0, L), rest = d.filter(c => !suitCards.includes(c) && E.suitOf(c) !== s);
    if (n - L > rest.length) continue;
    const mine = suitCards.concat(rest.slice(0, n - L));
    const cnt = [0, 0, 0, 0]; for (const c of mine) cnt[E.suitOf(c)]++;
    if (Math.max(...cnt) !== L) continue;
    const others = d.filter(c => !mine.includes(c)), hands = [];
    let q = 0; for (let p = 0; p < P; p++) hands.push((p === seat ? mine : others.slice(q, q += n)).slice().sort((x, y) => x - y));
    const turned = (withTrump && P * n < 52) ? others[q] : -1;
    return { hands, turned, trump: turned >= 0 ? E.suitOf(turned) : -1 };
  }
}
console.log(`${P} seats, ${n} cards, ${withTrump ? 'trump' : 'no trump'}, network ${k}; ${deals} deals per row. Points for the test seat: rules -> network.`);
console.log(' longest suit | at the formula bid          | bid 3 lower                 | bid 3 higher');
for (let L = 4; L <= Math.min(n, 13); L++) {
  const out = [];
  for (const delta of [0, -3, 3]) {
    let pr = 0, pn = 0, mr = 0, mn = 0, c = 0;
    for (let i = 0; i < deals; i++) {
      const s = i % P, deal = dealLong(L, s), bids = T.makeBids(deal.hands, deal.trump, deal.turned, P, n);
      bids[s] += delta; if (bids[s] < 0 || bids[s] > n) continue;
      const seatsArr = [...Array(P).keys()];
      const wr = T.playDeal(deal, bids, P, n, seatsArr.map(p => p === s ? T.heuristicPolicy : net));
      const wn = T.playDeal(deal, bids, P, n, seatsArr.map(() => net));
      pr += E.vienna(bids[s], wr[s], n); pn += E.vienna(bids[s], wn[s], n); if (wr[s] === bids[s]) mr++; if (wn[s] === bids[s]) mn++; c++;
    }
    out.push(c < 30 ? '            (too few)        ' : `${(pr / c).toFixed(1).padStart(5)} -> ${(pn / c).toFixed(1).padStart(5)}  (${(100 * mr / c).toFixed(0)}% -> ${(100 * mn / c).toFixed(0)}%)`.padEnd(27));
  }
  console.log(`     ${String(L).padStart(2)}       | ${out.join(' | ')}`);
}
