/* Matt's two jacks: holding J♠ and J♦ on lead with no spade or diamond yet played, the two leads are the same play.
   The report must show them as one choice (joined by =) and never call the lead a mistake; a bot in that seat sees one choice. */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), parse = require('./handtext.js');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e))); let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  await pg.goto(URL); const r = parse(fs.readFileSync(path.join(__dirname, 'hands/matt_5p4_two_jacks.txt'), 'utf8'));
  for (const t of r.tricks) for (const p of t.plays) if (p.seat === 0) p.by = 'you';
  const a = await pg.evaluate(r => new Promise(res => window.__ohhell.assessHand(r, () => {}, res)), r), p = a.plays.find(x => x.trick === 2);
  ok(p && p.same === true && p.cost === 0 && p.verdict === 'ok', 'trick 3: the two jacks are one choice, no cost (' + JSON.stringify(p && { same: p.same, why: p.why, cost: p.cost, worth: p.worth }) + ')');
  const p1 = a.plays.find(x => x.trick === 1); ok(p1 && (p1.same || p1.options.length >= 1), 'trick 2 still assessed');
  console.log(fail ? fail + ' FAILED' : 'all passed', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
