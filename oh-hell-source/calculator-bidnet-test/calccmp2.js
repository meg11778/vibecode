/* Does the bid calculator's top bid match the game bot's bid once it has enough deals behind it? (22 Nov 2026)
   The first test ran the calculator on 400 weighted deals a decision. With several bids ahead those 400 can carry the
   weight of 10 or 20, which is noise; the bot's own bid simulation never accepts that. Here the calculator keeps
   drawing (400 at a time) until at least ESS deals carry weight (default 400) or CAP deals are drawn (default 6000),
   under both pictures of the other bidders (bid formula, as published; bidding network, the candidate). Each top bid
   and the bot's own bid are finished on the real deal (seats behind bid by the game's simulation, cards by the
   networks). Results are kept by seat.
   node calccmp2.js <P> <n> <deals> <seed>        (OHHELL_ENGINE = folder with ohhell-play.html) */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE || __dirname;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_calc_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={initSim,runChunk,finalize,simulateBid,muFor,bidAt,auctionFactor,playHandNet,playHand,netFor,vienna,mulberry32,suitOf,setKnown:v=>{KNOWN=v;}};\n})();');
let E; try { E = require(tmp); } finally { fs.unlinkSync(tmp); }
const [P, n, deals, seed] = process.argv.slice(2, 6).map(Number), ESS = +(process.env.ESS || 400), CAP = +(process.env.CAP || 6000), rng = E.mulberry32(seed);
const Z = () => ({ k: 0, nf: 0, nf2: 0, nfDiffer: 0, fb: 0, fb2: 0, fbDiffer: 0, nb: 0, nb2: 0, nbDiffer: 0, essF: 0, essN: 0, drawsF: 0, drawsN: 0, thinF: 0, thinN: 0, bidF: 0, bidN: 0, bidB: 0 });
const bySeat = Array.from({ length: P }, Z);
for (let i = 0; i < deals; i++) {
  const d = [...Array(52).keys()];
  for (let k = 51; k > 0; k--) { const j = (rng() * (k + 1)) | 0; [d[k], d[j]] = [d[j], d[k]]; }
  const hands = []; for (let p = 0; p < P; p++) hands.push(d.slice(p * n, (p + 1) * n).sort((x, y) => x - y));
  const turned = P * n < 52 ? d[P * n] : -1, trump = turned < 0 ? -1 : E.suitOf(turned), s = i % P;
  const sim = (p, prior) => { E.setKnown(turned < 0 ? [] : [turned]); let B = 0; for (const x of prior) B += x;
    const mu = E.muFor(hands[p], trump, n, P, p), adj = Math.max(0, Math.min(n, mu * E.auctionFactor(n, P, B, P - p))), model = { bid: E.bidAt(adj, n, p === P - 1 ? n - B : -1), adj };
    const r = E.simulateBid(hands[p], trump, turned, n, P, p, prior.slice(), model, (seed * 7919 + i * 31 + p) >>> 0, { samples: 150 }); return r.bid != null ? r.bid : model.bid; };
  const calc = (prior, bidModel) => { const cfg = { hand: hands[s], players: P, seat: s, trump, trumpCard: turned, priorBids: prior.slice(), profiles: {}, iterations: CAP, play: 'net', seed: (seed * 104729 + i) >>> 0, bidModel };
    const S = E.initSim(cfg); let ess = 0; while (S.done < CAP) { E.runChunk(S, 400); ess = S.wSum2 > 0 ? S.wSum * S.wSum / S.wSum2 : 0; if (ess >= ESS) break; }
    const R = E.finalize(S); return { best: R.views.all.best, ess, draws: S.done }; };
  const prior = []; for (let p = 0; p < s; p++) prior.push(sim(p, prior));
  const cN = calc(prior, 'net'), cF = calc(prior, 'formula'), bBot = sim(s, prior), g = bySeat[s];
  const memo = {}; const finish = bd => { if (bd in memo) return memo[bd]; const bids = prior.concat([bd]); for (let p = s + 1; p < P; p++) bids.push(sim(p, bids)); E.setKnown(turned < 0 ? [] : [turned]);
    const won = E.netFor(P, n, trump) ? E.playHandNet(hands, bids, trump, P, n, turned) : E.playHand(hands, bids, trump, P, n); let tot = 0; for (let p = 0; p < P; p++) tot += E.vienna(bids[p], won[p], n);
    return memo[bd] = E.vienna(bd, won[s], n) - tot / P; };
  const vN = finish(cN.best), vF = finish(cF.best), vB = finish(bBot);
  g.k++; g.nf += vN - vF; g.nf2 += (vN - vF) ** 2; if (cN.best !== cF.best) g.nfDiffer++; g.fb += vF - vB; g.fb2 += (vF - vB) ** 2; if (cF.best !== bBot) g.fbDiffer++; g.nb += vN - vB; g.nb2 += (vN - vB) ** 2; if (cN.best !== bBot) g.nbDiffer++;
  g.essF += cF.ess; g.essN += cN.ess; g.drawsF += cF.draws; g.drawsN += cN.draws; if (cF.ess < ESS) g.thinF++; if (cN.ess < ESS) g.thinN++; g.bidF += cF.best; g.bidN += cN.best; g.bidB += bBot;
}
console.log(JSON.stringify({ P, n, deals, seed, ess: ESS, cap: CAP, bySeat }));
