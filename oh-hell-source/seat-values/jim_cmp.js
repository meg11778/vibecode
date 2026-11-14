/* One seat bids from Jim Agniel's current coefficient tables instead of the fork's; everything else the same.
   node cmp.js <P> <n> <deals> <seed>   -> gain of Jim's tables over the fork's for that seat, dollars a deal */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = '/home/claude/ohhell-engine';
const lines = fs.readFileSync(path.join(ENG, 'ohhell.html'), 'utf8').split('\n');
const a = lines.findIndex(l => l.includes('===== cards:')), b = lines.findIndex(l => l.includes('===== UI ====='));
let src = lines.slice(a, b).join('\n'); const old = 'const cf=n=>{ const t=(CUR_TRUMP>=0?COEF_T:COEF_NT);';
if (!src.includes(old)) throw new Error('cf not found');
src = src.replace(old, 'let ALT=0; const cf=n=>{ const t=(CUR_TRUMP>=0?(ALT?J_COEF_T:COEF_T):(ALT?J_COEF_NT:COEF_NT));');
const tmp = path.join(os.tmpdir(), '_ohhell_jim_' + process.pid + '.js');
fs.writeFileSync(tmp, fs.readFileSync(path.join(__dirname, 'jim_coef.js'), 'utf8') + src +
  '\nmodule.exports={setAlt:v=>{ALT=v; for(const k in THRESH) delete THRESH[k];},muFor,bidAt,auctionFactor,playHandNet,playHand,netFor,vienna,mulberry32,suitOf,setKnown:(k)=>{KNOWN=k;}};');
const E = require(tmp); fs.unlinkSync(tmp);
const [P, n, deals, seed] = process.argv.slice(2, 6).map(Number), rng = E.mulberry32(seed);
let g = 0, g2 = 0, differ = 0, bidA = 0, bidB = 0, mkA = 0, mkB = 0, muA = 0, muB = 0;
const bidOf = (hand, trump, pos, B, alt) => { E.setAlt(alt); const mu = E.muFor(hand, trump, n, P, pos), adj = Math.max(0, Math.min(n, mu * E.auctionFactor(n, P, B, P - pos))); const r = { bid: E.bidAt(adj, n, pos === P - 1 ? n - B : -1), mu }; if (alt) E.setAlt(0); return r; };
for (let i = 0; i < deals; i++) {
  const d = [...Array(52).keys()];
  for (let k = 51; k > 0; k--) { const j = (rng() * (k + 1)) | 0; [d[k], d[j]] = [d[j], d[k]]; }
  const hands = []; for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n).sort((x, y) => x - y));
  const turned = P * n < 52 ? d[P * n] : -1, trump = turned < 0 ? -1 : E.suitOf(turned), s = i % P;
  E.setKnown(turned < 0 ? [] : [turned]);
  const prior = []; let B = 0; for (let p = 0; p < s; p++) { const x = bidOf(hands[p], trump, p, B, 0).bid; prior.push(x); B += x; }
  const A = bidOf(hands[s], trump, s, B, 0), J = bidOf(hands[s], trump, s, B, 1);
  const play = mine => { const bids = prior.concat([mine]); let T = B + mine; for (let p = s + 1; p < P; p++) { const x = bidOf(hands[p], trump, p, T, 0).bid; bids.push(x); T += x; }
    E.setKnown(turned < 0 ? [] : [turned]); const won = E.netFor(P, n, trump) ? E.playHandNet(hands, bids, trump, P, n, turned) : E.playHand(hands, bids, trump, P, n); let tot = 0; for (let p = 0; p < P; p++) tot += E.vienna(bids[p], won[p], n);
    return { m: E.vienna(mine, won[s], n) - tot / P, made: won[s] === mine }; };
  const ra = play(A.bid), rb = J.bid === A.bid ? ra : play(J.bid), df = rb.m - ra.m;
  g += df; g2 += df * df; if (J.bid !== A.bid) differ++; bidA += A.bid; bidB += J.bid; if (ra.made) mkA++; if (rb.made) mkB++; muA += A.mu; muB += J.mu;
}
const m = g / deals;
console.log(JSON.stringify({ P, n, deals, gain: +m.toFixed(4), ci: +(1.96 * Math.sqrt((g2 / deals - m * m) / deals)).toFixed(4), differ: +(100 * differ / deals).toFixed(1), bidFork: +(bidA / deals).toFixed(3), bidJim: +(bidB / deals).toFixed(3), madeFork: +(100 * mkA / deals).toFixed(1), madeJim: +(100 * mkB / deals).toFixed(1), muFork: +(muA / deals).toFixed(3), muJim: +(muB / deals).toFixed(3) }));
