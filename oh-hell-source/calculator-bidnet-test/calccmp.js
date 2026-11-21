/* The bid calculator with the bidding network as its picture of the other bidders, against the same calculator with
   the bid formula as its picture (what it used until 21 Nov 2026).
   Table: every seat bids by the game's bid simulation as published. In one seat, on the same deals, the calculator
   (ITERS weighted deals, network card play, two-way pricing) names its best bid under each picture. Where the two
   bids differ the hand is finished both ways (the seats behind bid again by the game's simulation, cards by the
   networks) and the difference in dollars is kept. The game bot's own quick bid is finished too, for reference.
   node calccmp.js <P> <n> <deals> <seed> [iters=400]        (OHHELL_ENGINE = folder with ohhell-play.html) */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE || __dirname;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_calc_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={initSim,runChunk,finalize,simulateBid,muFor,bidAt,auctionFactor,playHandNet,playHand,netFor,vienna,mulberry32,suitOf,setKnown:v=>{KNOWN=v;}};\n})();');
let E; try { E = require(tmp); } finally { fs.unlinkSync(tmp); }
const [P, n, deals, seed] = process.argv.slice(2, 6).map(Number), ITERS = +(process.argv[6] || 400), rng = E.mulberry32(seed);
const A = { k: 0, differ: 0, up: 0, d: 0, d2: 0, vsBot: 0, vsBot2: 0, botDiffer: 0, bySeat: Array.from({ length: P }, () => ({ k: 0, d: 0, d2: 0, differ: 0 })) };
for (let i = 0; i < deals; i++) {
  const d = [...Array(52).keys()];
  for (let k = 51; k > 0; k--) { const j = (rng() * (k + 1)) | 0; [d[k], d[j]] = [d[j], d[k]]; }
  const hands = []; for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n).sort((x, y) => x - y));
  const turned = P * n < 52 ? d[P * n] : -1, trump = turned < 0 ? -1 : E.suitOf(turned), s = i % P;
  const sim = (p, prior) => { E.setKnown(turned < 0 ? [] : [turned]); let B = 0; for (const x of prior) B += x;
    const mu = E.muFor(hands[p], trump, n, P, p), adj = Math.max(0, Math.min(n, mu * E.auctionFactor(n, P, B, P - p))), model = { bid: E.bidAt(adj, n, p === P - 1 ? n - B : -1), adj };
    const r = E.simulateBid(hands[p], trump, turned, n, P, p, prior.slice(), model, (seed * 7919 + i * 31 + p) >>> 0, { samples: 150 }); return r.bid != null ? r.bid : model.bid; };
  const calc = (prior, bidModel) => { const cfg = { hand: hands[s], players: P, seat: s, trump, trumpCard: turned, priorBids: prior.slice(), profiles: {}, iterations: ITERS, play: 'net', seed: (seed * 104729 + i) >>> 0, bidModel };
    const S = E.initSim(cfg); E.runChunk(S, ITERS); const R = E.finalize(S); return R.views.all.best; };
  const prior = []; for (let p = 0; p < s; p++) prior.push(sim(p, prior));
  const bN = calc(prior, 'net'), bF = calc(prior, 'formula'), bBot = sim(s, prior); A.k++; A.bySeat[s].k++;
  const memo = {}; const finish = bd => { if (bd in memo) return memo[bd]; const bids = prior.concat([bd]); for (let p = s + 1; p < P; p++) bids.push(sim(p, bids)); E.setKnown(turned < 0 ? [] : [turned]);
    const won = E.netFor(P, n, trump) ? E.playHandNet(hands, bids, trump, P, n, turned) : E.playHand(hands, bids, trump, P, n); let tot = 0; for (let p = 0; p < P; p++) tot += E.vienna(bids[p], won[p], n);
    return memo[bd] = E.vienna(bd, won[s], n) - tot / P; };
  if (bN !== bF) { A.differ++; A.bySeat[s].differ++; if (bN > bF) A.up++; const df = finish(bN) - finish(bF); A.d += df; A.d2 += df * df; A.bySeat[s].d += df; A.bySeat[s].d2 += df * df; }
  if (bN !== bBot) { A.botDiffer++; const df = finish(bN) - finish(bBot); A.vsBot += df; A.vsBot2 += df * df; }
}
console.log(JSON.stringify(Object.assign({ P, n, deals, seed, iters: ITERS }, A)));
