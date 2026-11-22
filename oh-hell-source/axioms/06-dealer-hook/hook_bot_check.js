/* Axiom 6 cross-check: what does the GAME's dealer do at the hook, and do its own sums agree with real play-outs?
   For each dealer hand in a dealer_hook.js results file, the other cards are redealt until the bids ahead leave exactly
   X; the game's bid simulation (simulateBid, 150 sampled deals, as the bots use) then bids the dealer's hand and its
   own prices for X+1 and X-1 are recorded next to the hand's measured up-minus-down from the results file.
   OHHELL_ENGINE=<folder> node hook_bot_check.js <results.jsonl> <perHand> <seed> [SAMPLES=150]   one JSON line per try */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_hb_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={simulateBid,playHandNet,bidNetProbs,bidNetBid,vienna,mulberry32,suitOf,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const L = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').flatMap(l => { try { return [JSON.parse(l)]; } catch (e) { return []; } });
const PER = +process.argv[3], seed = +process.argv[4], K = +(process.env.SAMPLES || 150), SECS = +(process.env.SECS || 1e9), T0 = Date.now(), rng = M.mulberry32(seed), ri = k => (rng() * k) | 0;
for (const r of L) { if (Date.now() - T0 > SECS * 1000) break; const { P, n, X, hand, turned } = r, D = P - 1, trump = M.suitOf(turned), used = new Set(hand); used.add(turned);
  const rest = []; for (let c = 0; c < 52; c++) if (!used.has(c)) rest.push(c);
  const kh = r.half[0].up.k + r.half[1].up.k; if (kh < 100) continue; const Dhand = (r.half[0].d + r.half[1].d) / kh;
  for (let t = 0, tries = 0; t < PER && tries < 5000; tries++) { M.setKnown([turned]);
    for (let i = rest.length - 1; i > 0; i--) { const j = ri(i + 1); const z = rest[i]; rest[i] = rest[j]; rest[j] = z; }
    const hands = []; for (let q = 0; q < D; q++) hands.push(rest.slice(q * n, q * n + n).sort((p, q2) => p - q2)); hands.push(hand);
    const bids = []; let S = 0; for (let q = 0; q < D; q++) { const pb = M.bidNetProbs(P, n, turned, q, hands[q], bids), u = rng(); let acc = 0, bb = n; for (let z = 0; z <= n; z++) { acc += pb[z]; if (u < acc) { bb = z; break; } } bids.push(bb); S += bb; }
    if (S !== n - X) continue; t++;
    const pb = M.bidNetProbs(P, n, turned, D, hand, bids), s = M.simulateBid(hand, trump, turned, n, P, D, bids, { adj: X, bid: X - 1 }, (seed * 7919 + tries * 31 + hand[0]) >>> 0, { also: [X - 1, X + 1], samples: K });
    M.setKnown([turned]); const money = bid => { const bb = bids.concat([bid]), won = M.playHandNet(hands, bb, trump, P, n, turned); let tot = 0; for (let q = 0; q < P; q++) tot += M.vienna(bb[q], won[q], n); return M.vienna(bid, won[D], n) - tot / P; };
    const e = bid => { const z = s.table && s.table.find(q => q.bid === bid); return z ? z.edge : null; };
    console.log(JSON.stringify({ P, n, X, Dhand: +Dhand.toFixed(3), simBid: s.bid, by: s.by, why: s.why, ess: s.ess, eUp: e(X + 1), eDown: e(X - 1), netUp: +pb[X + 1].toFixed(3), netDown: +pb[X - 1].toFixed(3), netBid: M.bidNetBid(P, n, turned, D, hand, bids), realUp: money(X + 1), realDown: money(X - 1) })); } }
