// The report does not name another card as "best" when the played card is level with it (within the sampling noise).
// Matt's ace-or-three hand, 22 Nov 2026: A♦ and 3♣ two cents apart had read as "it wants the 3♣".
const { chromium } = require('playwright'), path = require('path');
(async () => { const b = await chromium.launch(), p = await b.newPage(); let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
  await p.goto('file://' + path.resolve(__dirname, '../../../ohhell-play.html'));
  const out = await p.evaluate(() => { const mk = (cost, se, verdict) => ({ id: 'x', savedAt: 1, cards: 3, tricks: [{ plays: [{ seat: 0, card: 'AD' }] }],
      assessment: { version: 8, prec: 1, unit: 'money', samples: 160, by: 'network', reading: true, lay: [{ trick: 0, worth: 3 }],
        plays: [{ trick: 0, played: 'AD', best: '3C', cost, se, verdict, worth: 3, pm: 0.1, make: 100, options: [{ cards: ['3C'], worth: 3.02, make: 100 }, { cards: ['AD'], worth: 3.0, pm: 0.1, make: 100 }, { cards: ['6D'], worth: 2.7, make: 97 }] }] } });
    const cell = h => { const d = document.createElement('div'); d.innerHTML = h; const tds = d.querySelectorAll('tbody tr td'); return { best: tds[2].textContent.trim(), cost: tds[3].textContent.trim(), verdict: tds[4].textContent.trim(), text: d.textContent }; };
    const f = window.__ohhell.assessmentHtml; return { level: cell(f(mk(0.02, 0.05, 'ok'))), clear: cell(f(mk(0.20, 0.05, 'ok'))), close: cell(f(mk(0.40, 0.30, 'close'))), same: cell(f(mk(0, 0.05, 'ok'))), old: cell(f(mk(0.02, undefined, 'ok'))) }; });
  ok(out.level.best === 'level' && out.level.verdict === 'fine' && out.level.cost === '0.02', 'two cents apart inside the noise: Best says level (' + JSON.stringify([out.level.best, out.level.cost, out.level.verdict]) + ')');
  ok(out.clear.best !== 'level' && out.clear.best.includes('3'), 'a fine play clearly behind the top card still shows that card (' + out.clear.best + ')');
  ok(out.close.best.includes('3') && out.close.verdict === 'too close to call', 'a bigger gap inside the noise keeps its card and "too close to call"');
  ok(out.same.best === 'same', 'the top card itself still says same');
  ok(out.old.best.includes('3'), 'a stored report without the noise figure is shown as before');
  ok(/Level/.test(out.level.text), 'the column note explains Level');
  await b.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0); })();
