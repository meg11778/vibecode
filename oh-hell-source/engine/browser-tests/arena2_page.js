const { chromium } = require('playwright');
const [P, n, deals, seed, sim] = process.argv.slice(2).map(Number);
const modes = JSON.parse(process.argv[7] || '[{"bid":"soft"},{"bid":"soft","sig":0.5},{"bid":"exact"},{"bid":"soft","noPlay":true}]');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('file://'+require('path').resolve(__dirname,'../../../ohhell-play.html')+'');
  const t0=Date.now(); const r = await pg.evaluate(([P, n, deals, seed, modes, sim]) => window.__ohhell.readArena2(P, n, deals, seed, modes, !!sim), [P, n, deals, seed, modes, sim]);
  r.sec=(Date.now()-t0)/1000; r.modes=modes; if (errs.length) console.error(errs); console.log(JSON.stringify(r)); await b.close(); })();
