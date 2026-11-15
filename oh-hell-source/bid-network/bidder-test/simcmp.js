/* A bidder in one seat, four ways, on the same deals: formula; bidding network; simulation with the formula as its
   picture of the others (the game today); simulation with the bidding network as that picture. The other seats bid
   from the bidding network's spread (a fast stand-in for simulation bidders). Cards by the networks. Dollars a deal.
   node simcmp.js <P> <n> <deals> <seed> [raw] */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE || __dirname;
const lines = fs.readFileSync(path.join(ENG, 'ohhell.html'), 'utf8').split('\n');
const a = lines.findIndex(l => l.includes('===== cards:')), b = lines.findIndex(l => l.includes('===== UI ====='));
const tmp = path.join(os.tmpdir(), '_ohhell_simcmp_' + process.pid + '.js');
fs.writeFileSync(tmp, lines.slice(a, b).join('\n') + '\n' + fs.readFileSync(path.join(ENG, 'bidnet_block.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ENG, 'simbid_block.js'), 'utf8') +
  '\nmodule.exports={simulateBid,bidNetProbs,bidNetBid,muFor,bidAt,auctionFactor,playHandNet,playHand,netFor,vienna,mulberry32,suitOf,setKnown:(k)=>{KNOWN=k;}};');
const E = require(tmp); fs.unlinkSync(tmp);
const [P, n, deals, seed] = process.argv.slice(2, 6).map(Number), rng = E.mulberry32(seed), MODES = ['formula', 'network', 'sim+formula', 'sim+network'];
const S = MODES.map(() => ({ m: 0, d: 0, d2: 0, bid: 0, made: 0 })); let tms = [0, 0], same = 0, bySim = [0, 0];
const draw = (pb, u, ban) => { let acc = 0; for (let q = 0; q < pb.length; q++) { acc += pb[q]; if (u < acc) return q; } return pb.length - 1; };
for (let i = 0; i < deals; i++) {
  const d = [...Array(52).keys()];
  for (let k = 51; k > 0; k--) { const j = (rng() * (k + 1)) | 0; [d[k], d[j]] = [d[j], d[k]]; }
  const hands = []; for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n).sort((x, y) => x - y));
  const turned = P * n < 52 ? d[P * n] : -1, trump = turned < 0 ? -1 : E.suitOf(turned), s = i % P, U = hands.map(() => rng());
  E.setKnown(turned < 0 ? [] : [turned]);
  const prior = []; let B = 0; for (let p = 0; p < s; p++) { const x = draw(E.bidNetProbs(P, n, turned, p, hands[p], prior), U[p]); prior.push(x); B += x; }
  const mu = E.muFor(hands[s], trump, n, P, s), adj = Math.max(0, Math.min(n, mu * E.auctionFactor(n, P, B, P - s))), model = { bid: E.bidAt(adj, n, s === P - 1 ? n - B : -1), adj };
  const sd = (seed * 7919 + i * 31 + s) >>> 0; let t = Date.now();
  const r0 = E.simulateBid(hands[s], trump, turned, n, P, s, prior.slice(), model, sd, { samples: 150, model: 'formula' }); tms[0] += Date.now() - t; t = Date.now();
  const r1 = E.simulateBid(hands[s], trump, turned, n, P, s, prior.slice(), model, sd, { samples: 150, model: 'net' }); tms[1] += Date.now() - t;
  if (r0.by === 'simulation') bySim[0]++; if (r1.by === 'simulation') bySim[1]++;
  const mine = [model.bid, E.bidNetBid(P, n, turned, s, hands[s], prior), r0.bid, r1.bid], cache = {}; if (r0.bid === r1.bid) same++;
  const play = bd => cache[bd] || (cache[bd] = (() => { const bids = prior.concat([bd]); let T = B + bd; E.setKnown(turned < 0 ? [] : [turned]);
    for (let p = s + 1; p < P; p++) { const pb = E.bidNetProbs(P, n, turned, p, hands[p], bids); let x = draw(pb, U[p]); bids.push(x); T += x; }
    const won = E.netFor(P, n, trump) ? E.playHandNet(hands, bids, trump, P, n, turned) : E.playHand(hands, bids, trump, P, n); let tot = 0; for (let p = 0; p < P; p++) tot += E.vienna(bids[p], won[p], n);
    return { m: E.vienna(bd, won[s], n) - tot / P, made: won[s] === bd }; })());
  const base = play(mine[2]).m;
  mine.forEach((bd, k) => { const r = play(bd), df = r.m - base; S[k].m += r.m; S[k].d += df; S[k].d2 += df * df; S[k].bid += bd; if (r.made) S[k].made++; });
}
if (process.argv[6] === 'raw') { console.log(JSON.stringify({ P, n, deals, seed, same, tms, bySim, modes: MODES, S })); process.exit(0); }
console.log(JSON.stringify({ P, n, deals, sameSimBid: +(100 * same / deals).toFixed(0), msFormulaModel: Math.round(tms[0] / deals), msNetModel: Math.round(tms[1] / deals), bySim: bySim.map(x => +(100 * x / deals).toFixed(0)),
  modes: MODES.map((nm, k) => { const t = S[k], m = t.d / deals; return { mode: nm, ev: +(t.m / deals).toFixed(3), vsSimFormula: +m.toFixed(3), ci: +(1.96 * Math.sqrt((t.d2 / deals - m * m) / deals)).toFixed(3), bid: +(t.bid / deals).toFixed(2), made: +(100 * t.made / deals).toFixed(0) }; }) }));
