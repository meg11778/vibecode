/* Cards that are the same play (18 Nov 2026, Matt Glassman's choice): a bot picks at random between them, and the
   card reading counts them as one choice. Before, a bot holding the 6 and 5 of a suit never played the 5.
   Checks, on East's seat from Matt's discard hand: the settings are on; with only 6♦ 5♦ to throw the choice is
   reported as one group of two; with 6♦ 5♦ 6♣, whenever a diamond is chosen its group holds both diamonds. */
const { chromium } = require('playwright'), path = require('path');
const URL = process.argv[2] || 'file://' + path.resolve(__dirname, '../../../ohhell-play.html');
(async () => { const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e))); let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  await pg.goto(URL);
  const r = await pg.evaluate(() => { const O = window.__ohhell, C = t => { const s = 'SHDC'.indexOf(t.slice(-1)), v = { J: 11, Q: 12, K: 13, A: 14 }[t.slice(0, -1)] || +t.slice(0, -1); return s * 13 + v - 2; };
    const hist = [[2, '8S'], [3, '3S'], [0, '6S'], [1, 'JH'], [1, 'AH'], [2, 'KH']].map(([seat, c]) => ({ seat, card: C(c) })), seen = new Uint8Array(52); for (const e of hist) seen[e.card] = 1;
    const voids = [0, 1, 2, 3].map(() => [false, false, false, false]); voids[1][0] = true;
    const S = hand => ({ Pn: 4, n: 4, trump: 1, turned: C('9H'), bids: [0, 2, 1, 0], order: [2, 3, 0, 1], hand: hand.map(C).sort((x, y) => x - y), seen, voids, lens: [3, 2, 2, hand.length], won: [0, 1, 0, 0], turn: 3, led: 1, winCard: C('AH'), winner: 1, playedInTrick: 2, trick: [C('AH'), C('KH')], hist });
    let s = 77; const rand = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const two = O.readChoose(S(['6D', '5D']), rand); let dia = 0, both = 0;
    for (let k = 0; k < 40; k++) { const x = O.readChoose(S(['6D', '5D', '6C']), rand); if (x.group.length !== (x.card === C('6C') ? 1 : 2)) both = -1e9; if (x.card !== C('6C')) { dia++; if (x.group.includes(C('6D')) && x.group.includes(C('5D'))) both++; } }
    return { touch: O.READ.touch, any: O.READ.anyTouch, two: { same: !!two.same, g: two.group.length }, dia, both }; });
  ok(r.touch === true && r.any === true, 'both settings are on (READ.touch, READ.anyTouch)');
  ok(r.two.same && r.two.g === 2, 'holding only the 6♦ and 5♦: one choice, a group of two for the bot to pick from');
  ok(r.both === r.dia, 'holding 6♦ 5♦ 6♣: every choice comes with its group (a diamond chosen ' + r.dia + ' times in 40, both diamonds in its group each time)');
  console.log(fail ? fail + ' FAILED' : 'all passed', '| page errors:', errs.length ? errs : 'none'); await b.close(); })();
