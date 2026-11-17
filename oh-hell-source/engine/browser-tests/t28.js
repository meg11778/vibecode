/* East's throw in Matt's discard hand (17 Nov 2026): holding 10♠ 6♣ 5♦ with a zero bid, hearts led and none held, the
   bot threw the 5♦ about one time in four. Throwing the 6♣ is worth about 45 cents more by its own sums; the two
   figures were too noisy to tell apart on one batch of layouts. Close calls now get up to READ.rounds batches.
   Checks the setting is on, that the 5♦ is now rare, and times a choice with and without the extra batches. */
const { chromium } = require('playwright'), path = require('path');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e))); let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  await pg.goto(URL);
  const r = await pg.evaluate(() => { const O = window.__ohhell, C = t => { const s = 'SHDC'.indexOf(t.slice(-1)), v = { J: 11, Q: 12, K: 13, A: 14 }[t.slice(0, -1)] || +t.slice(0, -1); return s * 13 + v - 2; };
    const hist = [[2, '8S'], [3, '3S'], [0, '6S'], [1, 'JH'], [1, 'AH'], [2, 'KH']].map(([seat, c]) => ({ seat, card: C(c) })), seen = new Uint8Array(52); for (const e of hist) seen[e.card] = 1;
    const voids = [0, 1, 2, 3].map(() => [false, false, false, false]); voids[1][0] = true;
    const S = { Pn: 4, n: 4, trump: 1, turned: C('9H'), bids: [0, 2, 1, 0], order: [2, 3, 0, 1], hand: [C('10S'), C('5D'), C('6C')].sort((x, y) => x - y), seen, voids, lens: [3, 2, 2, 3], won: [0, 1, 0, 0], turn: 3, led: 1, winCard: C('AH'), winner: 1, playedInTrick: 2, trick: [C('AH'), C('KH')], hist };
    let s = 4242; const rand = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const def = O.READ.rounds, run = (rounds, reps) => { O.READ.rounds = rounds; let five = 0, six = 0, mx = 0; const t0 = performance.now(); for (let k = 0; k < reps; k++) { const t1 = performance.now(), c = O.readChoose(S, rand).card; mx = Math.max(mx, performance.now() - t1); if (c === C('5D')) five++; if (c === C('6C')) six++; } return { five: five / reps, six: six / reps, ms: (performance.now() - t0) / reps, mx }; };
    const one = run(1, 150), many = run(def, 150); O.READ.rounds = def; return { def, one, many }; });
  ok(r.def === 4, 'close calls get up to 4 batches of layouts (READ.rounds = ' + r.def + ')');
  ok(r.many.five <= 0.14, 'East throws the 5♦ ' + (100 * r.many.five).toFixed(0) + '% of the time (one batch: ' + (100 * r.one.five).toFixed(0) + '%), the 6♣ ' + (100 * r.many.six).toFixed(0) + '%');
  console.log('     this choice: ' + r.one.ms.toFixed(0) + ' ms with one batch (longest ' + r.one.mx.toFixed(0) + '), ' + r.many.ms.toFixed(0) + ' ms now (longest ' + r.many.mx.toFixed(0) + ')');
  console.log(fail ? fail + ' FAILED' : 'all passed', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
