/* Does a bot bid better by simulation with more sampled deals?
 *
 *   node simbid2.js <n> <deals> <seed> <samplesA> <samplesB>
 *
 * Same deals; the test seat bids once from a simulation with samplesA deals and
 * once with samplesB. Scored in money: the seat's points less the table's
 * average. (Header below is from simbid.js, which this was made from.)
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

const [nS, dS, sS, aS, bS] = process.argv.slice(2);
const n = +nS, deals = +dS, seed = +sS, KA = +(aS || 150), KB = +(bS || 500), P = 4;
function formula(hand, trump, pos, claimed) {
  const est = E.muFor(hand, trump, n, P, pos), adj = Math.max(0, Math.min(n, est * E.auctionFactor(n, P, claimed, P - pos)));
  return { bid: E.bidAt(adj, n, pos === P - 1 ? n - claimed : -1), adj };
}
const rng = E.mulberry32(seed);
let g = 0, g2 = 0, differ = 0, msA = 0, msB = 0, mA = 0, mB = 0, mF = 0;
for (let i = 0; i < deals; i++) {
  const d = [...Array(52).keys()];
  for (let k = 51; k > 0; k--) { const j = (rng() * (k + 1)) | 0; [d[k], d[j]] = [d[j], d[k]]; }
  const hands = []; for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n).sort((x, y) => x - y));
  const turned = P * n < 52 ? d[P * n] : -1, trump = turned < 0 ? -1 : E.suitOf(turned), s = i % P;
  E.setKnown(turned < 0 ? [] : [turned]);
  const prior = []; let B = 0;
  for (let p = 0; p < s; p++) { const f = formula(hands[p], trump, p, B); prior.push(f.bid); B += f.bid; }
  const model = formula(hands[s], trump, s, B), sd = (seed * 7919 + i) >>> 0;
  let t0 = Date.now(); const a = E.simulateBid(hands[s], trump, turned, n, P, s, prior.slice(), model, sd, { samples: KA }).bid; msA += Date.now() - t0;
  t0 = Date.now(); const b = E.simulateBid(hands[s], trump, turned, n, P, s, prior.slice(), model, sd ^ 0x9e3779b9, { samples: KB, maxDraws: 6000 * Math.max(1, Math.round(KB / 150)) }).bid; msB += Date.now() - t0;
  E.setKnown(turned < 0 ? [] : [turned]);
  const money = mine => { const bids = prior.concat([mine]); let T = B + mine;
    for (let p = s + 1; p < P; p++) { const f = formula(hands[p], trump, p, T); bids.push(f.bid); T += f.bid; }
    const won = E.playHandNet(hands, bids, trump, P, n, turned); let tot = 0; for (let p = 0; p < P; p++) tot += E.vienna(bids[p], won[p], n);
    return E.vienna(bids[s], won[s], n) - tot / P; };
  const vF = money(model.bid), vA = a === model.bid ? vF : money(a), vB = b === a ? vA : b === model.bid ? vF : money(b);
  const diff = vB - vA; g += diff; g2 += diff * diff; if (a !== b) differ++; mA += vA; mB += vB; mF += vF;
}
const m = g / deals, ci = 1.96 * Math.sqrt(Math.max(g2 / deals - m * m, 0) / deals);
console.log(JSON.stringify({ n, deals, KA, KB, g, g2, differ, msA, msB, mA, mB, mF }));
