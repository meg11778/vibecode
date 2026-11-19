/* The page's layout after 19 Nov 2026 (Matt Glassman): explanations only on request, the review's actions in two
   menus that are the same on every review, no choice of bot bidding or card play, Precision labelled by use.
   Checks, with a two-hand game stopped after its first hand: the two bot settings are fixed at simulation and card
   reading; the Precision labels; the report's explanation is closed until asked for; the Study menu is closed, opens,
   holds Edit / Play again / New opponents / Watch / Bid calculator even with a game in progress and says the first
   three leave it; a second menu closes the first; Edit this deal then opens the deal editor with the hand loaded. */
const { chromium } = require('playwright'), path = require('path');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1180, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(String(e))); let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  await pg.goto(URL); await pg.evaluate(() => localStorage.clear()); await pg.reload();
  const s = await pg.evaluate(() => ({ bid: document.getElementById('bidMode').value, play: document.getElementById('playMode').value, shown: ['bidMode', 'playMode'].map(i => document.getElementById(i).offsetParent !== null), prec: [...document.getElementById('precision').options].map(o => o.textContent) }));
  ok(s.bid === 'sim' && s.play === 'read' && !s.shown[0] && !s.shown[1], 'bots always bid by simulation and play with card reading; neither is a setting on the page');
  ok(/best for just playing/.test(s.prec[0]) && /10× slower, best for study/.test(s.prec[2]), 'Precision says what each level is for (' + s.prec.join(' | ') + ')');
  await pg.selectOption('#nPlayers', '4'); await pg.fill('#fromN', '4'); await pg.fill('#toN', '5'); await pg.selectOption('#speed', '250'); await pg.uncheck('#pause');
  await pg.click('#start'); let guard = 0;
  while (guard++ < 3000) { if (await pg.isVisible('#rvNext')) break;
    const bid = await pg.$$('#actions .bidbtn:not([disabled])'); if (bid.length) { await bid[Math.min(1, bid.length - 1)].click(); continue; }
    const cards = await pg.$$('#myhand button.card:not([disabled])'); if (cards.length) { await cards[0].click(); continue; } await pg.waitForTimeout(100); }
  await pg.waitForFunction(() => { const h = window.__ohhell.loadHands(); return h.length && h[0].assessment; }, null, { timeout: 90000 }); await pg.waitForTimeout(400);
  ok(await pg.isVisible('#rvNext'), 'a game is in progress (Next hand is offered)');
  ok(!(await pg.isVisible('#rvAssess details.explain .hint')) && await pg.isVisible('#rvAssess details.explain > summary'), 'the report\'s explanation is hidden behind "Explain these columns"');
  await pg.click('#rvAssess details.explain > summary'); ok(await pg.isVisible('#rvAssess details.explain .hint'), 'and opens when asked');
  ok(!(await pg.isVisible('#rvEdit')), 'the Study menu starts closed');
  await pg.click('#rvStudy > summary');
  const vis = []; for (const id of ['rvEdit', 'rvAgain', 'rvRedeal', 'rvWatchGo', 'rvCalc']) vis.push(await pg.isVisible('#' + id));
  ok(vis.every(Boolean), 'opened, it holds Edit, Play again, New opponents, Watch and Bid calculator, with a game in progress');
  ok(/leave it/.test(await pg.innerText('#rvStudy .menubody')), 'and says the first three leave the game');
  await pg.click('#rvFile > summary'); ok(!(await pg.isVisible('#rvEdit')) && await pg.isVisible('#rvCopy'), 'opening Save or share closes the Study menu');
  await pg.keyboard.press('Escape'); ok(!(await pg.isVisible('#rvCopy')), 'Escape closes a menu');
  const before = await pg.evaluate(() => window.__ohhell.loadHands()[0]);
  await pg.click('#rvStudy > summary'); await pg.click('#rvEdit'); await pg.waitForTimeout(300);
  const st = await pg.evaluate(() => ({ setup: !document.getElementById('setup').hidden, deal: document.getElementById('deal').open, review: document.getElementById('review').hidden, n: document.getElementById('dsN').value, saved: window.__ohhell.loadHands().length }));
  ok(st.setup && st.deal && st.review && +st.n === before.cards && st.saved >= 1, 'Edit this deal opens the deal editor with the hand loaded (' + st.n + ' cards), and the finished hand is still saved');
  ok(await pg.isVisible('#dsStart'), 'ready to start from there');
  console.log(fail ? fail + ' FAILED' : 'all passed', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
