/* Does the teacher itself prefer the trump opening on Matt's overbid 10-card hand?  node teacher_check.js <weights> [K]
   For each overbid-by-one deal: the teacher's value for every opening lead (K fitted deals, the given network playing
   on in every seat), averaged over deals; how often each lead is the teacher's top choice; what the network leads. */
const T = require('./table.js'), E = require('./engine.js'), { bidNetProbs } = require('./bidnet.js'), { rolloutValues } = require('./rollout.js');
const pol = require('./net.js').loadNet(process.argv[2]).policy, K = +(process.argv[3] || 20);
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const Tn = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[(c / 13) | 0];
const mine = '4♠ 3♠ 2♠ A♥ Q♥ J♥ A♣ 2♣ J♦ 4♦'.split(' ').map(C).sort((a, b) => a - b), rng = E.mulberry32(7), prng = E.mulberry32(8), n = 10;
const sum = {}, top = {}, led = {}; let k = 0, fit = 0;
while (k < +(process.env.DEALS || 400)) { const used = new Set(mine); let turned; do { turned = (rng() * 13) | 0; } while (used.has(turned)); used.add(turned);
  const deck = []; for (let c = 0; c < 52; c++) if (!used.has(c)) deck.push(c); for (let i = deck.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const hands = [mine.slice()]; for (let p = 1; p < 4; p++) hands.push(deck.slice((p - 1) * n, p * n).sort((a, b) => a - b));
  const bids = [3]; for (let p = 1; p < 4; p++) { const pb = bidNetProbs(4, n, turned, p, hands[p], bids), u = rng(); let acc = 0, b = n; for (let x = 0; x <= n; x++) { acc += pb[x]; if (u < acc) { b = x; break; } } bids.push(b); }
  if (bids.reduce((a, b) => a + b, 0) !== 11) continue; k++;
  const obs = { hand: mine, seen: new Uint8Array(52), voids: [0, 1, 2, 3].map(() => [false, false, false, false]), lens: [n, n, n, n], bids, won: [0, 0, 0, 0], turn: 0, led: -1, winCard: -1, winner: 0, playedInTrick: 0, trick: [], leader: 0, turned, trump: 0, n, P: 4,
    playedBy: [[], [], [], []], bidCheck: T.makeBidCheck(bids, 0, n, 4, null, turned) };
  const r = rolloutValues(obs, [pol, pol, pol, pol], K, prng); fit += Math.min(K, r.fitted); let best = -1, bv = -1e9;
  for (const c of r.legal) { const v = r.q.get(c); sum[c] = (sum[c] || 0) + v; if (v > bv) { bv = v; best = c; } } top[best] = (top[best] || 0) + 1; const l = pol(obs); led[l] = (led[l] || 0) + 1; }
console.log(`${k} overbid deals, K=${K}, fitted ${(fit / k).toFixed(1)} of ${K}`);
for (const c of mine.slice().sort((a, b) => sum[b] - sum[a])) console.log(`  ${Tn(c).padEnd(4)} teacher's value $${(sum[c] / k).toFixed(2)} | teacher's top choice ${(100 * (top[c] || 0) / k).toFixed(0)}% | the network leads it ${(100 * (led[c] || 0) / k).toFixed(0)}%`);
