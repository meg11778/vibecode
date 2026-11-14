/* Matt's 5-player 3-card zero bid (2♠ 2♥ 8♦, on lead): leading a deuce must never be flagged as a mistake.
   Measured on 12,000 layouts the 8♦ lead is ahead by under 10 cents (zero made 92% against 91%). */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), parse = require('./handtext.js');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(URL); const r = parse(fs.readFileSync(path.join(__dirname, 'hands/matt_5p3_zero_lead.txt'), 'utf8')); let bad = 0;
  for (let k = 0; k < 8; k++) { const a = await pg.evaluate(([r, sv]) => new Promise(res => { r.savedAt = sv; window.__ohhell.assessHand(r, () => {}, res); }), [r, 'v' + k]);
    const p = a.plays.find(x => x.trick === 0), flagged = p.verdict === 'minor' || p.verdict === 'major', last = a.lay[a.lay.length - 1].worth;
    if (flagged || Math.abs(last - 0.6) > 0.011) bad++;
    console.log(`${flagged ? 'FAIL' : 'ok  '} run ${k}: 2♠ lead ${p.verdict}, cost ${p.cost} | ${p.options.map(o => o.cards.join('=') + ' ' + o.worth).join(', ')} | as the cards lay ends ${last}`); }
  console.log(bad ? bad + ' FAILED' : 'all passed', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
