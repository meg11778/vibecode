/* Matt's discard (17 Nov 2026): 4 players, 4 cards, a zero bid, choosing between the 10♦ and the 4♠ at trick 3 with
   West out of spades. The uneven deal of hidden cards made the report prefer throwing the 4♠ on a large sample.
   With the even deal throwing the 10♦ must never be called a mistake, and on a large sample must not be worse. */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), parse = require('./handtext.js');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e))); let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  await pg.goto(URL); const r = parse(fs.readFileSync(path.join(__dirname, 'hands/matt_4p4_discard.txt'), 'utf8')); for (const t of r.tricks) for (const p of t.plays) if (p.seat === 0) p.by = 'you';
  ok(await pg.evaluate(() => window.__ohhell.READ.deal) === 'fair', 'the even deal is in use');
  let flagged = 0; for (let k = 0; k < 6; k++) { const a = await pg.evaluate(([r, sv]) => new Promise(res => { r.savedAt = sv; window.__ohhell.assessHand(r, () => {}, res); }), [r, 'd' + k]), p = a.plays.find(x => x.trick === 2); if (p.verdict === 'minor' || p.verdict === 'major') flagged++; }
  ok(flagged === 0, 'throwing the 10♦ is not called a mistake in 6 reports');
  const big = await pg.evaluate(r => new Promise(res => { window.__ohhell.READ.prec = 10; r.savedAt = 'big'; window.__ohhell.assessHand(r, () => {}, a => { window.__ohhell.READ.prec = 1; res(a.plays.find(x => x.trick === 2)); }); }), r);
  ok(big.cost <= 0.08, 'at Very high precision the 10♦ costs at most a few cents (' + big.cost + '): ' + big.options.map(o => o.cards.join('=') + ' ' + o.worth + ' ±' + o.pm).join(', '));
  console.log(fail ? fail + ' FAILED' : 'all passed', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
