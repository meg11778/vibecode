/* Matt's 5-player 3-card hand: West has made its bid of 1 and holds A♠ and 7♥ (trump), on lead.
   Leading the ace cannot lose the trick; the low trump can. The bot must lead the trump every time. */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), parse = require('./handtext.js');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(URL); const r = parse(fs.readFileSync(path.join(__dirname, 'hands/matt_5p3_west_ace.txt'), 'utf8'));
  const res = await pg.evaluate(r => { const O = window.__ohhell, C = t => { const s = 'SHDC'.indexOf(t.slice(-1)), v = { J: 11, Q: 12, K: 13, A: 14 }[t.slice(0, -1)] || +t.slice(0, -1); return s * 13 + v - 2; };
    const hist = r.tricks[0].plays.map(p => ({ seat: p.seat, card: C(p.card) })), seen = new Uint8Array(52); hist.forEach(e => seen[e.card] = 1);
    const voids = r.players.map(() => [false, false, false, false]); voids[0][0] = true;      // You showed out of spades
    const bids = [0, 1, 0, 0, 0], S = () => ({ Pn: 5, n: 3, trump: 1, turned: C('10H'), bids, order: [1, 2, 3, 4, 0], hand: [C('AS'), C('7H')], seen, voids, lens: [2, 2, 2, 2, 2], won: [0, 1, 0, 0, 0], turn: 1, led: -1, winCard: -1, winner: 1, playedInTrick: 0, trick: [], hist });
    let trump = 0, seed = 99; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let k = 0; k < 100; k++) if (O.readChoose(S(), rand).card === C('7H')) trump++;
    return trump; }, r);
  console.log((res === 100 ? 'ok  ' : 'FAIL') + ` West leads the 7♥ in ${res} of 100 draws`); console.log(res === 100 ? 'all passed' : '1 FAILED', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
