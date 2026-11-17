/* Matt's zero bid: first to bid at 5 players, 3 cards, trump clubs, holding A♥ Q♥ A♦. With the bid formula as the
   picture of the other bidders the simulation bid 0; with the bidding network as that picture (the game's setting
   since 17 Nov 2026) it bids 1. Checked on 3,000 deals so the answer does not hang on a small sample.
   Also times a bot's ordinary 150-deal bid. */
const { chromium } = require('playwright');
const URL = process.argv[2] || 'file://' + require('path').resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e))); let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  await pg.goto(URL);
  const r = await pg.evaluate(() => { const C = t => { const s = 'SHDC'.indexOf(t.slice(-1)), v = { J: 11, Q: 12, K: 13, A: 14 }[t.slice(0, -1)] || +t.slice(0, -1); return s * 13 + v - 2; };
    const hand = ['AH', 'QH', 'AD'].map(C).sort((x, y) => x - y), turned = C('3C'), trump = 3, n = 3, P = 5; KNOWN = [turned];
    const mu = muFor(hand, trump, n, P, 0), model = { bid: bidAt(mu, n, -1), adj: mu }, run = m => { const x = simulateBid(hand, trump, turned, n, P, 0, [], model, 12345, { samples: 3000, model: m, maxDraws: 120000 }); return { bid: x.bid, t: x.table.map(q => q.bid + ':' + q.edge.toFixed(2)).join(' ') }; };
    const out = { def: SIMBID_MODEL, net: run('net'), formula: run('formula'), readBid: window.__ohhell.READ.bid };
    // timing: a dealer's bid at 4 players, 10 cards
    let s = 7; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }, d = [...Array(52).keys()]; for (let k = 51; k > 0; k--) { const j = (rnd() * (k + 1)) | 0; [d[k], d[j]] = [d[j], d[k]]; }
    const hs = [0, 1, 2, 3].map(p => d.slice(p * 10, p * 10 + 10).sort((x, y) => x - y)), tc = d[40], tr = (tc / 13) | 0; KNOWN = [tc]; const prior = [2, 3, 2];
    const m2 = { bid: 2, adj: 2.2 }, t0 = performance.now(); for (let k = 0; k < 4; k++) simulateBid(hs[3], tr, tc, 10, 4, 3, prior, m2, 100 + k, {}); out.msNet = (performance.now() - t0) / 4;
    const t1 = performance.now(); for (let k = 0; k < 4; k++) simulateBid(hs[3], tr, tc, 10, 4, 3, prior, m2, 100 + k, { model: 'formula' }); out.msFormula = (performance.now() - t1) / 4; return out; });
  ok(r.def === 'net' && r.readBid === 'net', 'the game uses the bidding network as its picture of the other bidders (bids: ' + r.def + ', card reading: ' + r.readBid + ')');
  ok(r.net.bid === 1, 'network picture: bids ' + r.net.bid + '  (' + r.net.t + ')');
  ok(r.formula.bid === 0, 'formula picture, for the record: bids ' + r.formula.bid + '  (' + r.formula.t + ')');
  console.log('     a dealer\'s bid at 4 players, 10 cards: ' + r.msNet.toFixed(0) + ' ms with the network picture, ' + r.msFormula.toFixed(0) + ' ms with the formula picture');
  console.log(fail ? fail + ' FAILED' : 'all passed', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
