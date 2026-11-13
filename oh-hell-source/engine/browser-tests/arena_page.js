const { chromium } = require('playwright');
const [P, n, deals, seed] = process.argv.slice(2).map(Number);
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('file://'+require('path').resolve(__dirname,'../../../ohhell-play.html')+'');
  const mode = process.argv[6] || 'soft'; const r = await pg.evaluate(([P, n, deals, seed, mode]) => { window.__ohhell.READ.bid = mode; return window.__ohhell.readArena(P, n, deals, seed); }, [P, n, deals, seed, mode]);
  if (errs.length) console.error(errs); console.log(JSON.stringify(r)); await b.close(); })();
