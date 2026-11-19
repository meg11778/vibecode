/* Coming back to a game after studying a hand, and a precision choice inside the report (19 Nov 2026, Matt Glassman).
   1. Two-hand game; after hand 1, "Play this deal again" from the Study menu; the study hand is played out; "Back to
      your game" returns to hand 1's review; Next hand deals hand 2 with the scores carried over.
   2. During a hand, a saved hand is opened and "Edit this deal" chosen; the start screen offers the waiting game;
      going back puts the same cards on the table and the hand can be finished.
   3. Choosing High under the report re-does that report at 4x without changing the game's Precision. */
const { chromium } = require('playwright'), path = require('path');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1180, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(String(e))); let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const act = async () => { const bid = await pg.$$('#actions .bidbtn:not([disabled])'); if (bid.length) { await bid[Math.min(1, bid.length - 1)].click(); return true; } const cont = await pg.$('#cont'); if (cont && await cont.isVisible()) { await cont.click(); return true; }
    const cards = await pg.$$('#myhand button.card:not([disabled])'); if (cards.length) { await cards[0].click(); return true; } return false; };
  const playUntil = async sel => { let g = 0; while (g++ < 4000) { if (await pg.isVisible(sel)) return true; if (!(await act())) await pg.waitForTimeout(80); } return false; };
  const hands = () => pg.evaluate(() => window.__ohhell.loadHands());
  await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload();
  await pg.selectOption('#nPlayers', '4'); await pg.fill('#fromN', '3'); await pg.fill('#toN', '4'); await pg.selectOption('#speed', '250'); await pg.uncheck('#pause');
  // 1
  await pg.click('#start'); ok(await playUntil('#rvNext'), 'hand 1 of 2 is finished and Next hand is offered');
  const h1 = (await hands())[0];
  await pg.click('#rvStudy > summary'); ok(/waits while you study/.test(await pg.innerText('#rvStudy .menubody')), 'the Study menu says the game waits');
  await pg.click('#rvAgain'); await pg.waitForTimeout(300);
  ok(await pg.isVisible('#table') && await pg.isVisible('#resumeLive'), 'the study hand is on the table, with "Back to your game" beside it');
  ok(await playUntil('#rvResume'), 'the study hand is played out; its review offers "Back to your game"');
  await pg.click('#rvResume'); await pg.waitForTimeout(300);
  ok(await pg.isVisible('#rvNext') && !(await pg.isVisible('#rvResume')) && /Hand 1 of 2/.test(await pg.innerText('#review h2')), 'back at the review of hand 1 of 2, Next hand offered');
  await pg.click('#rvNext'); ok(await playUntil('#rvNew'), 'hand 2 of 2 is played to the end of the game');
  const all = await hands(), h2 = all.find(x => x.game.id === h1.game.id && x.game.hand === 2);
  ok(all.length === 3 && h2 && h2.cards === 4 && JSON.stringify(h2.totalsBefore) === JSON.stringify(h1.totalsAfter), 'three hands saved; hand 2 started from hand 1\'s scores (' + JSON.stringify(h1.totalsAfter) + ')');
  // 2
  await pg.click('#rvNew'); await pg.check('#pause'); await pg.click('#start'); let g = 0;
  while (g++ < 2000) { if (await pg.$('#cont') && await pg.isVisible('#cont')) break; if (!(await act())) await pg.waitForTimeout(80); }
  ok(await pg.isVisible('#cont'), 'a new game is stopped at the end of a trick (Continue)');
  const mine = await pg.evaluate(() => [...document.querySelectorAll('#myhand .card')].map(x => x.textContent).join(' '));
  await pg.evaluate(() => { document.querySelector('#history details').open = true; }); await pg.click('#histBody button[data-i]'); await pg.waitForTimeout(300);
  ok(await pg.isVisible('#rvBack'), 'a saved hand is opened during the hand');
  await pg.click('#rvStudy > summary'); await pg.click('#rvEdit'); await pg.waitForTimeout(300);
  ok(await pg.isVisible('#resumeBar') && /waiting at hand 1 of 2/.test(await pg.innerText('#resumeBar')), 'the start screen says the game is waiting: ' + (await pg.innerText('#resumeText')));
  await pg.click('#resumeGo'); await pg.waitForTimeout(300);
  const mine2 = await pg.evaluate(() => [...document.querySelectorAll('#myhand .card')].map(x => x.textContent).join(' '));
  ok(await pg.isVisible('#table') && await pg.isVisible('#cont') && mine2 === mine && !(await pg.isVisible('#resumeLive')), 'back at the table with the same cards (' + mine2.replace(/\s+/g, ' ') + ') and Continue');
  ok(await playUntil('#rvNext'), 'and the hand plays on to its end');
  // 3
  await pg.waitForFunction(() => { const h = window.__ohhell.loadHands(); return h[h.length - 1].assessment; }, null, { timeout: 90000 }); await pg.waitForTimeout(300);
  const stamp = await pg.evaluate(() => { const h = window.__ohhell.loadHands(); return h[h.length - 1].savedAt; });
  if (await pg.isVisible('#rvPrec')) { await pg.selectOption('#rvPrec', '4');
    await pg.waitForFunction(s => { const h = window.__ohhell.loadHands().find(x => x.savedAt === s); return h && h.assessment && h.assessment.prec === 4; }, stamp, { timeout: 180000 });
    const r = await pg.evaluate(s => ({ a: window.__ohhell.loadHands().find(x => x.savedAt === s).assessment, game: window.__ohhell.READ.prec, sel: document.getElementById('precision').value }), stamp); await pg.waitForTimeout(300);
    ok(r.a.prec === 4 && r.a.samples === 640 && r.game === 1 && r.sel === '1', 'High chosen under the report: report redone on ' + r.a.samples + ' layouts, the game\'s Precision still Normal');
    ok(await pg.inputValue('#rvPrec') === '4' && await pg.isVisible('#rvNext'), 'the report shows High, and the game can go on');
  } else ok(true, 'this hand had nothing to assess (no choice of card); precision step skipped');
  console.log(fail ? fail + ' FAILED' : 'all passed', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
