/* Matt Glassman's book hand 1 (5 players, 4 cards, spades trump). Trick 3: NW leads the 4♠, NE and East show out,
   You (bid 1, none taken) hold K♠ 2♠ and West (bid 1, none taken) plays after you. The king loses to West's lone ace;
   the two keeps the king for the last trick. Reports made before 17 Nov 2026 preferred the king by a dollar or more:
   the hidden cards were dealt unevenly once seats had shown out, and the formula was the picture of the bids.
   Checks: at Very high precision the two is priced above the king; a stored version-5 report is marked as old. */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), parse = require('./handtext.js');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e))); let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  await pg.goto(URL); const r = parse(fs.readFileSync(path.join(__dirname, 'hands/matt_5p4_book_hand1.txt'), 'utf8')); for (const t of r.tricks) for (const p of t.plays) if (p.seat === 0) p.by = 'you';
  const a = await pg.evaluate(r => new Promise(res => { window.__ohhell.READ.prec = 10; r.savedAt = 'big'; window.__ohhell.assessHand(r, () => {}, x => { window.__ohhell.READ.prec = 1; res(x); }); }), r), p = a.plays.find(x => x.trick === 2);
  const w = c => p.options.find(o => o.cards.includes(c)).worth;
  ok(a.version === 6, 'new reports are version 6');
  ok(w('2S') > w('KS'), 'the two is priced above the king (2♠ ' + w('2S') + ', K♠ ' + w('KS') + '; playing the king costs ' + p.cost + ')');
  const old = await pg.evaluate(() => { const O = window.__ohhell, k = O.READ; O.READ.deal = 'first'; O.READ.bid = 'soft'; return 1; });
  const a0 = await pg.evaluate(r => new Promise(res => { window.__ohhell.READ.prec = 10; r.savedAt = 'big'; window.__ohhell.assessHand(r, () => {}, x => { const R = window.__ohhell.READ; R.prec = 1; R.deal = 'fair'; R.bid = 'net'; res(x); }); }), r), p0 = a0.plays.find(x => x.trick === 2), w0 = c => p0.options.find(o => o.cards.includes(c)).worth;
  console.log('     with the uneven deal and the formula picture (as before 17 Nov): 2♠ ' + w0('2S') + ', K♠ ' + w0('KS'));
  ok(w0('KS') > w0('2S'), 'the old method preferred the king, which is what the old reports showed');
  console.log(fail ? fail + ' FAILED' : 'all passed', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
