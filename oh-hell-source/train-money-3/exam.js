/* The exam: habits Matt's axioms showed the installed card-play network gets wrong, plus money against the installed
 * network at tables bid the way today's bots bid.
 *
 *   node exam.js <weights.json> [reference.json]        reference defaults to net_weights.json (the installed network)
 *
 * 1. Overbid 10-card hand (4♠ 3♠ 2♠ A♥ Q♥ J♥ A♣ 2♣ J♦ 4♦, spades trump, bid 3, on lead, table over by one): how often
 *    it opens a trump. Real play-outs say the trump opening beats the A♥ by about $0.70.
 * 2. A-4-3-2 of a side suit as the whole hand, 4-card round, on lead, bid 1: how often it leads the ace, and how often
 *    it makes. Simply leading the ace makes about 58%.
 * 3. A live zero bidder following suit with a choice: how often it plays its highest losing card (7-card rounds).
 * 4. Money: one seat, this network against the reference, the other seats the reference; 5, 7, 10 and 12 cards;
 *    all deals, and the overbid deals alone.
 */
const T = require('./table.js'), E = require('./engine.js'), { bidNetProbs } = require('./bidnet.js');
const load = f => require('./net.js').loadNet(f).policy;
const test = load(process.argv[2]), refFile = process.argv[3] || 'net_weights.json', ref = load(refFile);
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const suitOf = c => (c / 13) | 0, pc = (a, b) => (100 * a / b).toFixed(0) + '%';
const money = (bids, won, s, n) => { let t = 0; for (let p = 0; p < 4; p++) t += T.vienna(bids[p], won[p], n); return T.vienna(bids[s], won[s], n) - t / 4; };
function dealAround(rng, mine, n, turnedSuit) {             // seat 0 holds `mine`; the rest and the turned card at random
  const used = new Set(mine); let turned; do { turned = turnedSuit * 13 + ((rng() * 13) | 0); } while (used.has(turned)); used.add(turned);
  const deck = []; for (let c = 0; c < 52; c++) if (!used.has(c)) deck.push(c);
  for (let i = deck.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  const hands = [mine.slice().sort((a, b) => a - b)]; for (let p = 1; p < 4; p++) hands.push(deck.slice((p - 1) * n, p * n).sort((a, b) => a - b));
  return { hands, turned, trump: turnedSuit, longSeat: -1 };
}
function bidsWith(rng, deal, n, myBid) { const bids = [myBid]; for (let p = 1; p < 4; p++) { const pb = bidNetProbs(4, n, deal.turned, p, deal.hands[p], bids), u = rng(); let acc = 0, b = n; for (let x = 0; x <= n; x++) { acc += pb[x]; if (u < acc) { b = x; break; } } bids.push(b); } return bids; }

// 1. the overbid 10-card hand
{ const rng = E.mulberry32(101), mine = '4♠ 3♠ 2♠ A♥ Q♥ J♥ A♣ 2♣ J♦ 4♦'.split(' ').map(C); let k = 0, tr = 0, ah = 0, m = 0;
  while (k < 3000) { const deal = dealAround(rng, mine, 10, 0), bids = bidsWith(rng, deal, 10, 3); if (bids.reduce((a, b) => a + b, 0) !== 11) continue; k++;
    let first = -1; const me = obs => { const c = test(obs); if (first < 0) first = c; return c; };
    const won = T.playDeal(deal, bids, 4, 10, [me, ref, ref, ref]); if (suitOf(first) === 0) tr++; if (first === C('A♥')) ah++; m += money(bids, won, 0, 10); }
  console.log(`1. overbid 10-card hand (${k} deals): opens a trump ${pc(tr, k)}, the A♥ ${pc(ah, k)}; earns $${(m / k).toFixed(2)} a deal`); }
// 2. A-4-3-2, bid 1, on lead
{ const rng = E.mulberry32(102); let k = 0, ace = 0, made = 0; const N = 6000;
  for (; k < N; k++) { const side = 1 + (k % 3), mine = [side * 13 + 12, side * 13 + 2, side * 13 + 1, side * 13], deal = dealAround(rng, mine, 4, 0), bids = bidsWith(rng, deal, 4, 1);
    let first = -1; const me = obs => { const c = test(obs); if (first < 0) first = c; return c; };
    const won = T.playDeal(deal, bids, 4, 4, [me, ref, ref, ref]); if (first === side * 13 + 12) ace++; if (won[0] === 1) made++; }
  console.log(`2. A-4-3-2 as the whole hand, bid 1, on lead (${N} deals): leads the ace ${pc(ace, N)}; makes its bid ${pc(made, N)}`); }
// 3. zero bidder's highest losing card
{ const rng = E.mulberry32(103), n = 7; let k = 0, top = 0, low = 0, took = 0;
  for (let i = 0; i < 12000; i++) { const { deal, bids, slack } = T.makeScenario(rng, 4, n, 0, 0, 0);
    const wrap = obs => { const c = test(obs); const p = obs.turn;
      if (obs.playedInTrick > 0 && bids[p] === 0 && obs.won[p] === 0) { const f = obs.hand.filter(x => suitOf(x) === obs.led);
        if (f.length > 1) { const safe = f.filter(x => !E.beats(x, obs.winCard, obs.trump)), known = x => obs.seen[x] || x === obs.turned || obs.hand.includes(x), touch = (x, y) => { for (let z = Math.min(x, y) + 1; z < Math.max(x, y); z++) if (!known(z)) return false; return true; };
          if (safe.length && !(safe.length === f.length && f.every(x => touch(x, f[0])))) { k++; const t = safe[safe.length - 1]; if (E.beats(c, obs.winCard, obs.trump)) took++; else if (touch(c, t)) top++; else low++; } } }
      return c; };
    T.playDeal(deal, bids, 4, n, [wrap, wrap, wrap, wrap], slack); }
  console.log(`3. zero bidder following suit with a choice (${k} plays, 7 cards): highest losing card ${pc(top, k)}, a lower card ${pc(low, k)}, takes the trick ${pc(took, k)}`); }
// 4. money against the reference at today's tables
{ let line = []; const all = { g: 0, g2: 0, k: 0 }, ovr = { g: 0, g2: 0, k: 0 };
  for (const n of [5, 7, 10, 12]) { const rng = E.mulberry32(200 + n), N = +(process.env.DEALS || 6000), a = { g: 0, g2: 0, k: 0 }, o = { g: 0, g2: 0, k: 0 };
    for (let i = 0; i < N; i++) { const { deal, bids, slack } = T.makeScenario(rng, 4, n, 0, 0, 0), s = i % 4, B = bids.reduce((x, y) => x + y, 0);
      const d = money(bids, T.playDeal(deal, bids, 4, n, [0, 1, 2, 3].map(p => p === s ? test : ref), slack), s, n) - money(bids, T.playDeal(deal, bids, 4, n, [ref, ref, ref, ref], slack), s, n);
      for (const t of B > n ? [a, o, all, ovr] : [a, all]) { t.g += d; t.g2 += d * d; t.k++; } }
    const ci = t => { const m = t.g / t.k; return (m >= 0 ? '+' : '') + m.toFixed(3) + ' ±' + (1.96 * Math.sqrt(Math.max(0, t.g2 / t.k - m * m) / t.k)).toFixed(3); };
    line.push(`${n} cards ${ci(a)} (overbid deals ${ci(o)})`); }
  const ci = t => { const m = t.g / t.k; return (m >= 0 ? '+' : '') + m.toFixed(3) + ' ±' + (1.96 * Math.sqrt(Math.max(0, t.g2 / t.k - m * m) / t.k)).toFixed(3); };
  console.log(`4. dollars a deal against ${refFile}, one seat: ` + line.join('; ') + `; all ${ci(all)}, overbid ${ci(ovr)}`); }
