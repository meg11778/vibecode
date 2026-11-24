/* Matt's study hand of 24 Nov 2026: 5 players, 4 cards, spades trump. Third seat holds A♠ A♥ 2♥ 2♣ (no diamond) and
   bids 1; the table is underbid by one (bids total 3).
   Real deals: your hand fixed, a random spade turned, the other 16 cards dealt at random; the other four seats bid as
   the game's bots do (simulation, 150 deals each; BIDS=net draws them from the bidding network instead, faster); deals
   where the bids do not total 3 are thrown away. Then the hand is played: PLAY=net (network in every seat),
   PLAY=read (card-reading bot in your seat, network elsewhere), PLAY=all (card-reading bots in every seat).
   node matt_5p4_two_aces.js [deals kept] [seed]    (OHHELL_ENGINE = folder holding ohhell-play.html)
   Writes one line per kept deal to OUT (default none) so later questions can reuse the same deals. */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_h3_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,readLayouts,netChoose,legalCards,beatsCard,vienna,mulberry32,suitOf,READ,simulateBid,muFor,auctionFactor,bidAt,bidNetProbs,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
const Pn = 5, n = 4, trump = 0, ME = 2, order = [0, 1, 2, 3, 4], MYBID = +(process.env.MYBID || 1), TOTAL = +(process.env.TOTAL || 3);
const hand = (process.env.HAND || 'A♠,A♥,2♥,2♣').split(',').map(C).sort((x, y) => x - y), KEEP = +(process.argv[2] || 2000), seed = +(process.argv[3] || 2411);
const BIDS = process.env.BIDS || 'sim', PLAY = process.env.PLAY || 'net', rng = M.mulberry32(seed);
const bidOf = (h, turned, q, prior, d) => { M.setKnown([turned]);
  if (BIDS === 'net') { const pb = M.bidNetProbs(Pn, n, turned, q, h, prior), B = prior.reduce((s, x) => s + x, 0), u = rng(); let acc = 0, bb = n; for (let x = 0; x <= n; x++) { acc += pb[x]; if (u < acc) { bb = x; break; } } if (q === Pn - 1 && bb === n - B) { let bp = -1; for (let x = 0; x <= n; x++) if (x !== n - B && pb[x] > bp) { bp = pb[x]; bb = x; } } return bb; }
  const B = prior.reduce((s, x) => s + x, 0), est = M.muFor(h, trump, n, Pn, q), adj = Math.max(0, Math.min(n, est * M.auctionFactor(n, Pn, B, Pn - q))), f = M.bidAt(adj, n, q === Pn - 1 ? n - B : -1);
  const r = M.simulateBid(h, trump, turned, n, Pn, q, prior.slice(), { bid: f, adj }, (seed * 7919 + d * 31 + q) >>> 0, null); return r.bid != null ? r.bid : f; };
function playDeal(hands0, turned, bids, d) { const prng = M.mulberry32((seed ^ 0x51ed270b) + d), h = hands0.map(x => x.slice()), won = [0, 0, 0, 0, 0], seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]), hist = [];
  let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = []; M.setKnown([turned]);
  for (let left = Pn * n; left > 0; left--) { const lg = M.legalCards(h[turn], led); let c;
    if (lg.length === 1) c = lg[0];
    else if (PLAY === 'all' || (PLAY === 'read' && turn === ME)) c = M.readChoose({ Pn, n, trump, turned, bids, order, hand: h[turn], seen, voids, lens: h.map(x => x.length), won, turn, led, winCard, winner, playedInTrick: i, trick, hist }, prng).card;
    else c = M.netChoose({ hand: h[turn], seen, voids, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, true).card;
    h[turn].splice(h[turn].indexOf(c), 1); seen[c] = 1; trick.push(c); hist.push({ seat: turn, card: c });
    if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) voids[turn][led] = true;
    if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
    if (++i === Pn) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn; }
  let t = 0; for (let q = 0; q < Pn; q++) t += M.vienna(bids[q], won[q], n);
  return { won, money: M.vienna(bids[ME], won[ME], n) - t / Pn, hist }; }
const spades = []; for (let c = 0; c < 13; c++) if (!hand.includes(c)) spades.push(c);
const rows = []; let dealt = 0, botBid = [0, 0, 0, 0, 0]; const totals = {}, t0 = Date.now();
while (rows.length < KEEP) { const d = dealt++, turned = spades[(rng() * spades.length) | 0], deck = []; for (let c = 0; c < 52; c++) if (c !== turned && !hand.includes(c)) deck.push(c);
  for (let i2 = deck.length - 1; i2 > 0; i2--) { const j = (rng() * (i2 + 1)) | 0, t = deck[i2]; deck[i2] = deck[j]; deck[j] = t; }
  const hands0 = []; let k = 0; for (let q = 0; q < Pn; q++) hands0.push(q === ME ? hand.slice() : deck.slice(k, k += n).sort((x, y) => x - y));
  const bids = []; for (let q = 0; q < Pn; q++) { if (q === ME) { if (process.env.MYBOT) botBid[bidOf(hand, turned, q, bids, d)]++; bids.push(MYBID); } else bids.push(bidOf(hands0[q], turned, q, bids, d)); }
  const tot = bids.reduce((s, x) => s + x, 0); totals[tot] = (totals[tot] || 0) + 1; if (tot !== TOTAL) continue;
  const r = playDeal(hands0, turned, bids, d); rows.push({ d, turned, bids, hands: hands0, won: r.won, money: r.money, hist: r.hist.map(e => e.card) }); }
if (process.env.OUT) fs.writeFileSync(process.env.OUT, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
const N = rows.length, mean = v => v.reduce((s, x) => s + x, 0) / v.length, sd = v => { const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1) / v.length); }, pc = (f, set) => { set = set || rows; const p = set.filter(f).length / set.length; return (100 * p).toFixed(1) + '% ±' + (100 * Math.sqrt(p * (1 - p) / set.length)).toFixed(1); };
console.log('hand ' + hand.map(T).join(' ') + ', third seat bids ' + MYBID + ' | bids: ' + BIDS + ' | play: ' + PLAY + ' | ' + dealt + ' deals dealt, ' + N + ' kept with bids totalling ' + TOTAL + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
console.log('bid totals over all deals: ' + Object.keys(totals).sort().map(t => t + ': ' + (100 * totals[t] / dealt).toFixed(0) + '%').join('  ') + (process.env.MYBOT ? ' | the bot in your seat would bid: ' + botBid.map((x, i2) => x ? i2 + ' ' + (100 * x / dealt).toFixed(0) + '%' : '').filter(Boolean).join(', ') : ''));
console.log('you make ' + pc(r => r.won[ME] === MYBID) + ' | take 0: ' + pc(r => r.won[ME] === 0) + ' | take 2: ' + pc(r => r.won[ME] === 2) + ' | take 3+: ' + pc(r => r.won[ME] >= 3));
console.log('worth $' + mean(rows.map(r => r.money)).toFixed(2) + ' ±' + sd(rows.map(r => r.money)).toFixed(2) + ' a hand | opponents busted ' + mean(rows.map(r => [0, 1, 3, 4].filter(q => r.won[q] !== r.bids[q]).length)).toFixed(2) + ' | when you make $' + mean(rows.filter(r => r.won[ME] === MYBID).map(r => r.money)).toFixed(2) + ', when you miss $' + mean(rows.filter(r => r.won[ME] !== MYBID).map(r => r.money)).toFixed(2));
const pat = {}; for (const r of rows) { const k2 = r.bids.join(' '); (pat[k2] = pat[k2] || []).push(r); }
console.log('by bids (first seat, second, you, fourth, dealer):'); for (const k2 of Object.keys(pat).sort((x, y) => pat[y].length - pat[x].length).slice(0, 12)) { const s = pat[k2]; console.log('  ' + k2 + '  ' + (100 * s.length / N).toFixed(1).padStart(5) + '% of hands | make ' + pc(r => r.won[ME] === MYBID, s) + ' | worth $' + mean(s.map(r => r.money)).toFixed(2) + (s.length > 1 ? ' ±' + sd(s.map(r => r.money)).toFixed(2) : '')); }
