/* Matt's 6 and 4 of trumps: the 5 is led and the ace is on it, so the 6 and the 4 are the same play. The report must
   join them, and so cannot prefer one to the other. Also checks the published rule cases stay as they were at trick 2. */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), parse = require('./handtext.js');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e))); let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  await pg.goto(URL); const r = parse(fs.readFileSync(path.join(__dirname, 'hands/matt_5p7_six_four.txt'), 'utf8'));
  for (const t of r.tricks) for (const p of t.plays) if (p.seat === 0) p.by = 'you';
  const a = await pg.evaluate(r => new Promise(res => window.__ohhell.assessHand(r, () => {}, res)), r), p = a.plays.find(x => x.trick === 0);
  const groups = p.options.map(o => o.cards.join('=')); console.log('     trick 1 choices: ' + p.options.map(o => o.cards.join('=') + ' ' + o.worth).join(', '));
  ok(p.options.some(o => o.cards.includes('6D') && o.cards.includes('4D')), 'trick 1: the 6♦ and the 4♦ are one choice');
  ok(p.options.length === 3 && !p.options.some(o => o.cards.includes('8D') && o.cards.length > 1) && !p.options.some(o => o.cards.includes('2D') && o.cards.length > 1), 'trick 1: the 8♦ and the 2♦ stay separate (7♦ and 3♦ are still out)');
  console.log(fail ? fail + ' FAILED' : 'all passed', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
