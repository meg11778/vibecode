/* "As the cards lay" must end at the actual result. Plays hands by clicking the first legal card (so the user often busts). */
const { chromium } = require('playwright');
const URL = process.argv[2] || 'file://' + require('path').resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs=[]; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload();
  await pg.selectOption('#nPlayers', '4'); await pg.fill('#fromN', '4'); await pg.fill('#toN', '9'); await pg.selectOption('#speed', '250'); await pg.uncheck('#pause');
  await pg.click('#start'); let guard = 0;
  while (guard++ < 4000) {
    if (await pg.isVisible('#rvNext')) { await pg.click('#rvNext'); continue; }
    if (await pg.isVisible('#rvNew')) break;
    const bid = await pg.$$('#actions .bidbtn:not([disabled])'); if (bid.length) { await bid[Math.min(2, bid.length - 1)].click(); continue; }
    const cards = await pg.$$('#myhand button.card:not([disabled])'); if (cards.length) { await cards[cards.length - 1].click(); continue; }
    await pg.waitForTimeout(100);
  }
  const out = await pg.evaluate(async () => { const O = window.__ohhell, res = [];
    for (const r of O.loadHands()) { const a = await new Promise(ok => O.assessHand(r, () => {}, ok));
      const P = r.players.length, avg = r.points.reduce((x, y) => x + y, 0) / P, bid = r.bids.find(x => x.seat === 0).bid;
      res.push({ n: r.cards, bid, won: r.won[0], actual: +(r.points[0] - avg).toFixed(2), lay: a.lay.map(x => x.worth) }); }
    return res; });
  let bad = 0; for (const h of out) { const ok = Math.abs(h.lay[h.lay.length - 1] - h.actual) < 0.011; if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${h.n} cards, bid ${h.bid} took ${h.won}, actual ${h.actual} | lay ${h.lay.join(' ')}`); }
  console.log(bad ? bad + ' FAILED' : 'all passed', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
