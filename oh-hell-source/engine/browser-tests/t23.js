/* Precision setting: remembered across reloads, multiplies the report's layouts, and offers to assess an older report again. */
const { chromium } = require('playwright');
const URL = process.argv[2] || 'file://' + require('path').resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e))); let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload();
  ok(await pg.inputValue('#precision') === '1' && await pg.evaluate(() => window.__ohhell.READ.prec) === 1, 'starts at Normal');
  await pg.selectOption('#nPlayers', '4'); await pg.fill('#fromN', '4'); await pg.fill('#toN', '4'); await pg.selectOption('#speed', '250'); await pg.uncheck('#pause');
  await pg.click('#start'); let guard = 0;
  while (guard++ < 2000) { if (await pg.isVisible('#rvNew') || await pg.isVisible('#rvNext')) break;
    const bid = await pg.$$('#actions .bidbtn:not([disabled])'); if (bid.length) { await bid[Math.min(1, bid.length - 1)].click(); continue; }
    const cards = await pg.$$('#myhand button.card:not([disabled])'); if (cards.length) { await cards[0].click(); continue; } await pg.waitForTimeout(100); }
  await pg.waitForFunction(() => { const h = window.__ohhell.loadHands(); return h.length && h[0].assessment; }, null, { timeout: 60000 });
  const a1 = await pg.evaluate(() => window.__ohhell.loadHands()[0].assessment);
  ok(a1.prec === 1 && a1.samples === 160, `report at Normal: ${a1.samples} layouts`);
  ok(!(await pg.$('#rvAssessAgain')), 'no "assess again" button at the same Precision');
  await pg.evaluate(() => { const s = document.getElementById('precision'); s.value = '4'; s.dispatchEvent(new Event('change')); });
  await pg.reload();
  ok(await pg.inputValue('#precision') === '4' && await pg.evaluate(() => window.__ohhell.READ.prec) === 4, 'High is remembered after a reload');
  // open the saved hand
  await pg.evaluate(() => { for (const d of document.querySelectorAll('details')) d.open = true; });
  const opened = await pg.evaluate(() => { const el = document.querySelector('#histBody button'); if (el) { el.click(); return 'Review button'; } return null; });
  await pg.waitForTimeout(500);
  const again = await pg.$('#rvAssessAgain'); ok(!!again, 'older report shows "Assess again at the current Precision" (opened via ' + opened + ')');
  if (again) { await again.click(); await pg.waitForFunction(() => { const a = window.__ohhell.loadHands()[0].assessment; return a && a.prec === 4; }, null, { timeout: 120000 });
    const a2 = await pg.evaluate(() => window.__ohhell.loadHands()[0].assessment); ok(a2.samples === 640, `report at High: ${a2.samples} layouts`);
    await pg.waitForTimeout(300); ok(!(await pg.$('#rvAssessAgain')), 'button gone after assessing again'); }
  const ph = await b.newPage({ viewport: { width: 390, height: 664 } }); await ph.goto(URL); const over = await ph.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(over <= 0, 'phone width: no sideways scroll (' + over + ')');
  await ph.screenshot({ path: require('os').tmpdir() + '/prec_phone.png' }); await pg.screenshot({ path: require('os').tmpdir() + '/prec_desk.png', fullPage: true });
  console.log(fail ? fail + ' FAILED' : 'all passed', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
