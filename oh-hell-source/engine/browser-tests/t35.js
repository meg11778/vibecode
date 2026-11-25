/* Every player's play (25 Nov 2026, Matt Glassman).
   1. On a saved 7-card hand, reviewAll gives one assessment per seat; each covers that seat's own cards in order,
      every bid is judged, and seat 0's plays agree with the ordinary report.
   2. With every card marked as entered in a set-up, the ordinary report judges nothing but the review judges it all.
   3. In the page: a short hand is played, Study > Review every player runs, the summary names every player, the seat
      buttons switch the table, and the review is kept on the saved hand. */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), parse = require('./handtext.js');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1180, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(String(e))); let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload();
  if (!process.env.UI_ONLY) {
  const r = parse(fs.readFileSync(__dirname + '/hands/matt_4p7_zero.txt', 'utf8')); r.savedAt = 'a';
  const t0 = Date.now();
  const rv = await pg.evaluate(r => new Promise(res => window.__ohhell.reviewAll(r, 1, () => {}, res)), r);
  const sec = (Date.now() - t0) / 1000, own = await pg.evaluate(r => new Promise(res => window.__ohhell.assessHand(r, () => {}, res)), r);
  console.log('review of 4 seats, 7 cards: ' + sec.toFixed(0) + 's');
  rv.seats.forEach((a, s) => console.log('  ' + r.players[s] + ': bid ' + JSON.stringify(a.bid) + ' | ' + a.plays.map(p => p.played + (p.same ? '' : '(' + p.verdict + (p.cost ? ' ' + p.cost : '') + ')')).join(' ')));
  ok(rv.version === 1 && rv.seats.length === 4 && rv.seats.every((a, s) => a.version === 8 && (a.seat || 0) === s), 'one current assessment per seat');
  ok(rv.seats.every((a, s) => a.plays.length === 7 && a.plays.every((p, t) => p.played === r.tricks[t].plays.find(x => x.seat === s).card)), 'each covers that seat\'s own seven cards, in order');
  ok(rv.seats.every((a, s) => a.bid && a.bid.bid === r.bids.find(x => x.seat === s).bid && a.bid.verdict && a.bid.best != null), 'every bid is judged');
  // not identical figure for figure: a thin read draws more layouts when the clock allows, so two runs can differ inside their margins
  ok(rv.seats[0].plays.every((p, t) => { const q = own.plays[t]; return p.played === q.played && !!p.same === !!q.same && (p.same || Math.abs(p.cost - q.cost) <= 2 * (p.se + q.se) + 0.05); }), 'your seat agrees with your own report: same choices judged, costs within their margins');
  ok(rv.seats.every(a => a.plays.filter(p => !p.same).every(p => p.options.length > 1 && p.options.every(o => o.pm != null))), 'every real choice has its options and margins');
  // 2
  const r2 = JSON.parse(JSON.stringify(r)); r2.savedAt = 'b'; for (const t of r2.tricks) for (const p of t.plays) p.by = 'set';
  const own2 = await pg.evaluate(r => new Promise(res => window.__ohhell.assessHand(r, () => {}, res)), r2);
  const one = await pg.evaluate(r => new Promise(res => window.__ohhell.assessHand(r, () => {}, res, { seat: 2, judgeSet: true })), r2);
  ok(own2.plays.every(p => p.same), 'cards entered in a set-up are left alone by the ordinary report');
  ok(one.seat === 2 && one.plays.some(p => !p.same && p.options.length > 1), 'but are judged in the review (North: ' + one.plays.filter(p => !p.same).length + ' choices)');
  const html = await pg.evaluate(([r, a]) => window.__ohhell.assessmentHtml(r, a), [r2, one]);
  ok(/North played/.test(html) && /from North.s seat/.test(html), 'the table is headed for North and says whose seat it is');
  }
  // 3
  const act = async () => { const bid = await pg.$$('#actions .bidbtn:not([disabled])'); if (bid.length) { await bid[Math.min(1, bid.length - 1)].click(); return true; } const cont = await pg.$('#cont'); if (cont && await cont.isVisible()) { await cont.click(); return true; }
    const cards = await pg.$$('#myhand button.card:not([disabled])'); if (cards.length) { await cards[0].click(); return true; } return false; };
  await pg.selectOption('#nPlayers', '4'); await pg.fill('#fromN', '4'); await pg.fill('#toN', '4'); await pg.selectOption('#speed', '250'); await pg.uncheck('#pause'); await pg.click('#start');
  let g = 0; while (g++ < 4000) { if (await pg.isVisible('#rvNew') || await pg.isVisible('#rvNext')) break; if (!(await act())) await pg.waitForTimeout(80); }
  ok(await pg.$('#rvAll') !== null && !(await pg.isVisible('#rvAllGo')), 'the review has an "Every player\'s play" part, closed to begin with');
  await pg.click('#rvStudy > summary'); ok(/Review every player/.test(await pg.innerText('#rvStudy .menubody')), 'the Study menu offers it');
  // the page redraws when your own report finishes, which shuts the menu: open it again if so
  for (let i = 0; i < 20; i++) { if (!(await pg.evaluate(() => document.getElementById('rvStudy').open))) await pg.click('#rvStudy > summary'); try { await pg.click('#rvAllMenu', { timeout: 1500 }); break; } catch (e) {} }
  await pg.waitForTimeout(150);
  ok(await pg.isVisible('#rvAllStop'), 'it starts at once and shows progress with a Stop button');
  await pg.waitForSelector('[data-rvseat]', { timeout: 240000 });
  const txt = await pg.textContent('#rvAll');
  ok(['You', 'West', 'North', 'East'].every(n => txt.includes(n)) && /Given up/.test(txt), 'the summary has a line for each of the four players');
  ok(/You played/.test(await pg.textContent('#rvAllSeat')), 'your own table is shown first');
  await pg.click('[data-rvseat="2"]'); await pg.waitForTimeout(100);
  ok(/North played/.test(await pg.textContent('#rvAllSeat')), 'the North button shows North\'s table');
  const saved = (await pg.evaluate(() => window.__ohhell.loadHands()))[0];
  ok(saved.review && saved.review.seats.length === 4, 'the review is kept on the saved hand');
  ok(await pg.isVisible('#rvAllAgain') && await pg.isVisible('#rvAllPrec'), 'it can be done again at another precision');
  if (errs.length) { console.log(errs); fail++; } console.log(fail ? 'FAILED' : 'all passed'); await b.close(); process.exit(fail ? 1 : 0); })();
