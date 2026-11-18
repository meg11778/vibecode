/* The report gives, beside each choice's worth in dollars, how often that choice makes your own bid (18 Nov 2026,
   Matt Glassman: at Bust Out a bust sits you out of the next hand, so the safest line can matter more than the money).
   On his trump-lead hand (5 players, 3 cards, on lead with 9♦ 3♦ 2♣, bid 1): every choice carries a make %, a trump
   lead makes more often than the club, and the table shows a Makes column and its note. */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), parse = require('./handtext.js');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e))); let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  await pg.goto(URL); const r = parse(fs.readFileSync(path.join(__dirname, 'hands/matt_5p3_trump_lead.txt'), 'utf8')); for (const t of r.tricks) for (const p of t.plays) if (p.seat === 0) p.by = 'you';
  const a = await pg.evaluate(r => new Promise(res => { window.__ohhell.READ.prec = 4; r.savedAt = 'mk'; window.__ohhell.assessHand(r, () => {}, x => { window.__ohhell.READ.prec = 1; res(x); }); }), r), p = a.plays.find(x => x.trick === 0);
  const m = c => p.options.find(o => o.cards.includes(c)).make;
  ok(a.plays.every(x => x.same ? x.make >= 0 && x.make <= 100 : x.options.every(o => o.make >= 0 && o.make <= 100)), 'every choice at every trick has a make % between 0 and 100');
  ok(Math.max(m('3D'), m('9D')) > m('2C'), 'a trump lead makes the bid more often than the club (3♦ ' + m('3D') + '%, 9♦ ' + m('9D') + '%, 2♣ ' + m('2C') + '%)');
  // a hand played through the page: the table has the column and the note
  await pg.evaluate(() => localStorage.clear()); await pg.reload();
  await pg.selectOption('#nPlayers', '4'); await pg.fill('#fromN', '4'); await pg.fill('#toN', '4'); await pg.selectOption('#speed', '250'); await pg.uncheck('#pause');
  await pg.click('#start'); let guard = 0;
  while (guard++ < 2000) { if (await pg.isVisible('#rvNew') || await pg.isVisible('#rvNext')) break;
    const bid = await pg.$$('#actions .bidbtn:not([disabled])'); if (bid.length) { await bid[Math.min(1, bid.length - 1)].click(); continue; }
    const cards = await pg.$$('#myhand button.card:not([disabled])'); if (cards.length) { await cards[0].click(); continue; } await pg.waitForTimeout(100); }
  await pg.waitForFunction(() => { const h = window.__ohhell.loadHands(); return h.length && h[0].assessment; }, null, { timeout: 60000 });
  await pg.waitForTimeout(500); const txt = await pg.innerText('#rvAssess');
  ok(/Makes/.test(txt) && /how often you make your own bid/.test(txt), 'the report on screen has the Makes column and its note');
  ok(/\d+%/.test(txt), 'and shows percentages');
  if (process.argv[3]) await (await pg.$('#rvAssess')).screenshot({ path: process.argv[3] });
  console.log(fail ? fail + ' FAILED' : 'all passed', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
