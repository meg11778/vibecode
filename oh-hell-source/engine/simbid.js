/* Does bidding by simulation beat bidding by the formula?
 *
 *   node simbid.js <n> <deals> <seed> [samples] [window]
 *
 * Four seats, every card played by the network. Each deal is played twice with
 * the same cards. In both, the seats ahead of the test seat bid from the
 * formula. The test seat (rotating) bids once from the formula and once from a
 * short simulation: sample the unseen hands consistent with the bids so far,
 * play each candidate bid out with the network, take the bid with the best
 * score against the table. The seats behind then bid from the formula given
 * what was bid. "gain" is simulation minus formula for the test seat.
 */
const fs = require('fs'), path = require('path'), os = require('os');
const lines = fs.readFileSync(path.join(__dirname, 'ohhell.html'), 'utf8').split('\n');
const a = lines.findIndex(l => l.includes('===== cards:')), b = lines.findIndex(l => l.includes('===== UI ====='));
const tmp = path.join(os.tmpdir(), '_ohhell_simbid_' + process.pid + '.js');
fs.writeFileSync(tmp, lines.slice(a, b).join('\n') +
  '\n' + fs.readFileSync(path.join(__dirname, 'simbid_block.js'), 'utf8') +
  '\nmodule.exports={simulateBid,muFor,bidAt,auctionFactor,playHandNet,vienna,mulberry32,suitOf,setKnown:(k)=>{KNOWN=k;}};');
const E = require(tmp); fs.unlinkSync(tmp);

const [nS, dS, sS, kS, winS] = process.argv.slice(2);
const n = +nS, deals = +dS, seed = +sS, K = +(kS || 150), WIN = +(winS || 2), P = 4;

function formula(hand, trump, pos, claimed) {
  const est = E.muFor(hand, trump, n, P, pos), adj = Math.max(0, Math.min(n, est * E.auctionFactor(n, P, claimed, P - pos)));
  return { bid: E.bidAt(adj, n, pos === P - 1 ? n - claimed : -1), adj };
}
function simulate(hand, trump, turned, pos, prior, model, sseed) {
  const r = E.simulateBid(hand, trump, turned, n, P, pos, prior, model, sseed, { samples: K, window: WIN });
  return { bid: r.bid, fallback: r.by !== 'simulation', done: r.drawn || 0, ess: r.ess || 0 };
}

const rng = E.mulberry32(seed);
let g = 0, g2 = 0, differ = 0, fb = 0, ms = 0, itSum = 0, ptsF = 0, ptsS = 0, mkF = 0, mkS = 0, up = 0, down = 0;
const byPos = [0, 1, 2, 3].map(() => ({ g: 0, c: 0, ms: 0 }));
for (let i = 0; i < deals; i++) {
  const d = [...Array(52).keys()];
  for (let k = 51; k > 0; k--) { const j = (rng() * (k + 1)) | 0; [d[k], d[j]] = [d[j], d[k]]; }
  const hands = []; for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n).sort((x, y) => x - y));
  // a round that deals the whole deck has no card to turn and is no trump
  const turned = P * n < 52 ? d[P * n] : -1, trump = turned < 0 ? -1 : E.suitOf(turned), s = i % P;
  E.setKnown(turned < 0 ? [] : [turned]);
  const prior = []; let B = 0;
  for (let p = 0; p < s; p++) { const f = formula(hands[p], trump, p, B); prior.push(f.bid); B += f.bid; }
  const model = formula(hands[s], trump, s, B);
  const t0 = Date.now();
  const sim = simulate(hands[s], trump, turned, s, prior.slice(), model, (seed * 7919 + i) >>> 0);
  const dt = Date.now() - t0; ms += dt; itSum += sim.done; if (sim.fallback) fb++;
  E.setKnown(turned < 0 ? [] : [turned]);
  const finish = mine => { const bids = prior.concat([mine]); let T = B + mine;
    for (let p = s + 1; p < P; p++) { const f = formula(hands[p], trump, p, T); bids.push(f.bid); T += f.bid; }
    const won = E.playHandNet(hands, bids, trump, P, n, turned); return { pts: E.vienna(bids[s], won[s], n), made: won[s] === bids[s] }; };
  const A = finish(model.bid), Bw = sim.bid === model.bid ? A : finish(sim.bid);
  const diff = Bw.pts - A.pts; g += diff; g2 += diff * diff; ptsF += A.pts; ptsS += Bw.pts; if (A.made) mkF++; if (Bw.made) mkS++;
  if (sim.bid !== model.bid) { differ++; if (sim.bid > model.bid) up++; else down++; }
  byPos[s].g += diff; byPos[s].c++; byPos[s].ms += dt;
}
const m = g / deals, ci = 1.96 * Math.sqrt(Math.max(g2 / deals - m * m, 0) / deals);
console.log(`n=${String(n).padStart(2)} deals ${deals} samples ${K} window ${WIN} | gain ${(m >= 0 ? '+' : '') + m.toFixed(3)} ±${ci.toFixed(3)} | points ${(ptsF / deals).toFixed(2)} -> ${(ptsS / deals).toFixed(2)} | makes ${(100 * mkF / deals).toFixed(1)}% -> ${(100 * mkS / deals).toFixed(1)}% | bid differs ${(100 * differ / deals).toFixed(0)}% (${up} higher, ${down} lower) | fell back ${fb} | ${(ms / deals / 1000).toFixed(2)}s per bid, ${Math.round(itSum / deals)} deals drawn`);
console.log('   by bidding position: ' + byPos.map((x, p) => `${p + 1}: ${(x.g / x.c >= 0 ? '+' : '') + (x.g / x.c).toFixed(2)} (${(x.ms / x.c / 1000).toFixed(2)}s)`).join('  '));
