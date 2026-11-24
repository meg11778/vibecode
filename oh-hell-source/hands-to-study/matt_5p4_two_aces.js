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
function playDeal(hands0, turned, bids, d, forced) { let myPlays = 0; const prng = M.mulberry32((seed ^ 0x51ed270b) + d), h = hands0.map(x => x.slice()), won = [0, 0, 0, 0, 0], seen = new Uint8Array(52), voids = h.map(() => [false, false, false, false]), hist = [];
  let turn = 0, led = -1, winCard = -1, winner = 0, i = 0, trick = []; M.setKnown([turned]);
  for (let left = Pn * n; left > 0; left--) { const lg = M.legalCards(h[turn], led); let c;
    if (turn === ME && forced && forced[myPlays] != null && lg.includes(forced[myPlays])) c = forced[myPlays];
    else if (lg.length === 1) c = lg[0];
    else if (PLAY === 'all' || (PLAY === 'read' && turn === ME)) c = M.readChoose({ Pn, n, trump, turned, bids, order, hand: h[turn], seen, voids, lens: h.map(x => x.length), won, turn, led, winCard, winner, playedInTrick: i, trick, hist }, prng).card;
    else c = M.netChoose({ hand: h[turn], seen, voids, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, true).card;
    if (turn === ME) myPlays++;
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
// by the suit of the opening lead, and by the card you played to trick 1
console.log('by the suit of the opening lead:');
for (const su of [0, 1, 2, 3]) { const s = rows.filter(r => M.suitOf(r.hist[0]) === su); if (!s.length) continue;
  console.log('  ' + '♠♥♦♣'[su] + ' led ' + (100 * s.length / N).toFixed(1).padStart(5) + '% of hands | make ' + pc(r => r.won[ME] === MYBID, s) + ' | take 2+: ' + pc(r => r.won[ME] > MYBID, s) + ' | worth $' + mean(s.map(r => r.money)).toFixed(2) + ' ±' + sd(s.map(r => r.money)).toFixed(2) + ' | opponents busted ' + mean(s.map(r => [0, 1, 3, 4].filter(q => r.won[q] !== r.bids[q]).length)).toFixed(2));
  const by = {}; for (const r of s) { const k2 = T(r.hist[2]) + (r.hist.slice(0, 5).reduce((b2, c, j) => { if (j === 0) return { c, j }; return M.beatsCard(c, b2.c, trump) ? { c, j } : b2; }, null).j === 2 ? ' (wins the trick)' : ' (loses it)'); (by[k2] = by[k2] || []).push(r); }
  for (const k2 of Object.keys(by).sort((x, y) => by[y].length - by[x].length)) { const g = by[k2]; if (g.length < 5) continue; console.log('      you play ' + k2.padEnd(22) + (100 * g.length / s.length).toFixed(1).padStart(5) + '% | make ' + pc(r => r.won[ME] === MYBID, g) + ' | worth $' + mean(g.map(r => r.money)).toFixed(2) + ' ±' + sd(g.map(r => r.money)).toFixed(2)); } }
// busts sorted by how the unwanted trick came: knuckled (you were on lead) or eaten (someone else led), and with which card
{ const tricksOf = r => { const out = []; let leader = 0; for (let t = 0; t < n; t++) { const cs = r.hist.slice(t * Pn, t * Pn + Pn); let w = 0; for (let j = 1; j < Pn; j++) if (M.beatsCard(cs[j], cs[w], trump)) w = j; const mine = cs[(ME - leader + Pn) % Pn]; out.push({ t, leader, winner: (leader + w) % Pn, mine, ledSuit: M.suitOf(cs[0]) }); leader = (leader + w) % Pn; } return out; };
  const busts = rows.filter(r => r.won[ME] > MYBID), cat = {}, first = {};
  for (const r of busts) { const mineW = tricksOf(r).filter(x => x.winner === ME), u = mineW[MYBID], w1 = mineW[0];
    const k2 = (u.leader === ME ? 'knuckled: led the ' : 'ate a trick with the ') + T(u.mine) + (u.leader === ME ? '' : M.suitOf(u.mine) === u.ledSuit ? ' (following suit)' : ' (trumping)') + ' at trick ' + (u.t + 1); cat[k2] = (cat[k2] || 0) + 1;
    const k3 = (u.leader === ME ? 'knuckled' : 'ate') + ' with the ' + T(u.mine) + ' | the wanted trick was the ' + T(w1.mine) + (w1.leader === ME ? ' (led)' : ''); first[k3] = (first[k3] || 0) + 1; }
  const B = busts.length, kn = busts.filter(r => tricksOf(r).filter(x => x.winner === ME)[MYBID].leader === ME).length;
  console.log('busts: ' + B + ' of ' + N + ' hands (' + (100 * B / N).toFixed(1) + '%). The unwanted trick is the one after your bid was made.');
  console.log('  knuckled (on lead) ' + (100 * kn / B).toFixed(1) + '% of busts | ate (someone else led) ' + (100 * (B - kn) / B).toFixed(1) + '%');
  for (const k2 of Object.keys(cat).sort((x, y) => cat[y] - cat[x])) if (cat[k2] / B >= 0.005) console.log('    ' + (100 * cat[k2] / B).toFixed(1).padStart(5) + '% of busts (' + (100 * cat[k2] / N).toFixed(2) + '% of hands)  ' + k2);
  console.log('  with the wanted trick:'); for (const k3 of Object.keys(first).sort((x, y) => first[y] - first[x])) if (first[k3] / B >= 0.005) console.log('    ' + (100 * first[k3] / B).toFixed(1).padStart(5) + '%  ' + k3); }
// the A♥ busts: was there an earlier trick on which the A♥ could have been thrown as a certain loser, and what was played instead?
{ const AH = C('A♥'), cat = {}; let tot = 0;
  for (const r of rows) { if (r.won[ME] <= MYBID || !hand.includes(AH)) continue; let leader = 0, mine = hand.slice(), myW = 0, unwanted = -1; const chances = [];
    for (let t = 0; t < n; t++) { const cs = r.hist.slice(t * Pn, t * Pn + Pn), pos = (ME - leader + Pn) % Pn, c = cs[pos]; let w = 0; for (let j = 1; j < Pn; j++) if (M.beatsCard(cs[j], cs[w], trump)) w = j;
      if (pos > 0 && mine.includes(AH) && c !== AH) { const led = M.suitOf(cs[0]), legal = M.legalCards(mine, led), trumped = cs.slice(0, pos).some(x => M.suitOf(x) === trump) && led !== trump;
        if (legal.includes(AH) && (led !== 1 || trumped)) chances.push({ t, c, led, wonIt: (leader + w) % Pn === ME, hadWon: myW }); }
      if ((leader + w) % Pn === ME) { myW++; if (myW === MYBID + 1) unwanted = c; }
      mine.splice(mine.indexOf(c), 1); leader = (leader + w) % Pn; }
    if (unwanted !== AH) continue; tot++;
    const k2 = !chances.length ? 'no chance: never a trick the A♥ could be thrown on' : chances.map(x => 'trick ' + (x.t + 1) + ', ' + '♠♥♦♣'[x.led] + ' led: played the ' + T(x.c) + (x.wonIt ? ' and won' : '') + (x.hadWon ? ' (bid already made)' : '')).join('; '); cat[k2] = (cat[k2] || 0) + 1; }
  console.log('the A♥ busts (' + tot + ', ' + (100 * tot / N).toFixed(1) + '% of hands): was there an earlier trick where the A♥ could have been thrown as a sure loser?');
  for (const k2 of Object.keys(cat).sort((x, y) => cat[y] - cat[x])) if (cat[k2] / tot >= 0.004) console.log('  ' + (100 * cat[k2] / tot).toFixed(1).padStart(5) + '% (' + (100 * cat[k2] / N).toFixed(2) + '% of hands)  ' + k2); }

// Matt's question of 24 Nov: a club is led at trick 1 (your 2♣ goes), then a club or a diamond is led at trick 2 and you
// are void: throw the A♥, or trump with the A♠ and lead the 2♥? (network in every seat except the forced cards)
if (process.env.Q2) { const AS = C('A♠'), AH = C('A♥'), H2 = C('2♥'), set = [];
  for (const r of rows) { if (M.suitOf(r.hist[0]) !== 3) continue; let w = 0; const cs = r.hist.slice(0, Pn); for (let j = 1; j < Pn; j++) if (M.beatsCard(cs[j], cs[w], trump)) w = j; if (w === ME) continue; const led2 = M.suitOf(r.hist[Pn]); if (led2 !== 2 && led2 !== 3) continue;
    const pos = (ME - w + Pn) % Pn, before = r.hist.slice(Pn, Pn + pos), trumped = before.some(c => M.suitOf(c) === trump);
    const run = f => { const x = playDeal(r.hands, r.turned, r.bids, r.d, f); return { money: x.money, won: x.won, hist: x.hist.map(e => e.card) }; };
    set.push({ r, led2, pos, trumped, lines: { 'throw the A♥': run({ 1: AH }), 'trump with the A♠, lead the 2♥': run({ 1: AS, 2: H2 }), 'trump with the A♠, lead the A♥': run({ 1: AS, 2: AH }), 'throw the 2♥': run({ 1: H2 }) }, net: r.hist[Pn + pos] }); }
  const show = (label, g) => { if (g.length < 20) return; console.log('\n' + label + ': ' + g.length + ' hands (' + (100 * g.length / N).toFixed(1) + '% of all)'); const names = Object.keys(g[0].lines), base = names[0];
    for (const nm of names) { const m = g.map(x => x.lines[nm].money), d = g.map(x => x.lines[nm].money - x.lines[base].money), p = g.filter(x => x.lines[nm].won[ME] === MYBID).length / g.length;
      console.log('  ' + nm.padEnd(32) + ' makes ' + (100 * p).toFixed(1).padStart(5) + '% ±' + (100 * Math.sqrt(p * (1 - p) / g.length)).toFixed(1) + ' | takes 0: ' + (100 * g.filter(x => x.lines[nm].won[ME] === 0).length / g.length).toFixed(1) + '%, 2+: ' + (100 * g.filter(x => x.lines[nm].won[ME] > MYBID).length / g.length).toFixed(1) + '% | worth $' + mean(m).toFixed(2) + ' | against throwing the A♥ ' + (mean(d) >= 0 ? '+' : '') + mean(d).toFixed(2) + ' ±' + sd(d).toFixed(2) + ' | opponents busted ' + mean(g.map(x => [0, 1, 3, 4].filter(q => x.lines[nm].won[q] !== x.r.bids[q]).length)).toFixed(2)); }
    const nc = {}; for (const x of g) nc[T(x.net)] = (nc[T(x.net)] || 0) + 1; console.log('  the network itself plays: ' + Object.keys(nc).sort((x, y) => nc[y] - nc[x]).map(k2 => k2 + ' ' + (100 * nc[k2] / g.length).toFixed(0) + '%').join(', ')); };
  show('club at trick 1, then a club or diamond at trick 2, you are void', set);
  show('  trick 2 is a club', set.filter(x => x.led2 === 3)); show('  trick 2 is a diamond', set.filter(x => x.led2 === 2));
  show('  nobody ahead of you has trumped trick 2', set.filter(x => !x.trumped)); show('  someone ahead of you has trumped trick 2', set.filter(x => x.trumped));
  for (const ps of [1, 2, 3, 4]) show('  you are ' + ['', 'second', 'third', 'fourth', 'last'][ps] + ' to play at trick 2', set.filter(x => x.pos === ps));
  // how the trump line fails and how the throw fails
  const fl = (nm, f) => (100 * set.filter(x => f(x.lines[nm])).length / set.length).toFixed(1) + '%';
  const lastTrick = L => { const cs = L.hist.slice(15, 20); return cs; };
  console.log('\nafter trumping and leading the 2♥: the 2♥ wins trick 3 ' + fl('trump with the A♠, lead the 2♥', L => { const cs = L.hist.slice(10, 15); let w = 0; for (let j = 1; j < Pn; j++) if (M.beatsCard(cs[j], cs[w], trump)) w = j; return w === 0; }) + ' | the A♥ takes the last trick ' + fl('trump with the A♠, lead the 2♥', L => L.won[ME] >= 2));
  console.log('after throwing the A♥: you take no trick ' + fl('throw the A♥', L => L.won[ME] === 0) + ' | the 2♥ also takes a trick ' + fl('throw the A♥', L => L.won[ME] >= 2)); }
// the game's card-reading bot at that trick-2 choice, on sampled positions (RB=positions per group)
if (process.env.Q2 && process.env.RB) { const AS = C('A♠'), AH = C('A♥'), per = +process.env.RB, prng = M.mulberry32(99), groups = { 'nobody has trumped ahead of you': [], 'someone has trumped ahead of you': [] };
  for (const r of rows) { if (M.suitOf(r.hist[0]) !== 3) continue; let w = 0; const cs = r.hist.slice(0, Pn); for (let j = 1; j < Pn; j++) if (M.beatsCard(cs[j], cs[w], trump)) w = j; if (w === ME) continue; const led2 = M.suitOf(r.hist[Pn]); if (led2 !== 2 && led2 !== 3) continue;
    const pos = (ME - w + Pn) % Pn, before = r.hist.slice(Pn, Pn + pos), key = before.some(c => M.suitOf(c) === trump) ? 'someone has trumped ahead of you' : 'nobody has trumped ahead of you'; if (groups[key].length < per) groups[key].push({ r, w, pos, before }); }
  for (const key of Object.keys(groups)) { const cnt = {}, sum = {}; let tot = 0;
    for (const { r, w, pos, before } of groups[key]) { const seen = new Uint8Array(52), voids = order.map(() => [false, false, false, false]), hist = [], won = [0, 0, 0, 0, 0]; won[w] = 1;
      for (let j = 0; j < Pn; j++) { const c = r.hist[j]; seen[c] = 1; hist.push({ seat: j, card: c }); if (M.suitOf(c) !== 3) voids[j][3] = true; }
      let winCard = -1, winner = w; before.forEach((c, j) => { const q = (w + j) % Pn; seen[c] = 1; hist.push({ seat: q, card: c }); if (j > 0 && M.suitOf(c) !== M.suitOf(before[0])) voids[q][M.suitOf(before[0])] = true; if (j === 0 || M.beatsCard(c, winCard, trump)) { winCard = c; winner = q; } });
      const lens = order.map(q => n - 1 - (hist.slice(Pn).some(e => e.seat === q) ? 1 : 0)), mine = hand.filter(c => c !== C('2♣'));
      M.setKnown([r.turned]); const o = M.readChoose({ Pn, n, trump, turned: r.turned, bids: r.bids, order, hand: mine, seen, voids, lens, won, turn: ME, led: M.suitOf(before[0]), winCard, winner, playedInTrick: pos, trick: before.slice(), hist }, prng);
      tot++; cnt[T(o.card)] = (cnt[T(o.card)] || 0) + 1; for (const a2 of o.alts) sum[T(a2.card)] = (sum[T(a2.card)] || 0) + a2.score; }
    console.log('card-reading bot, ' + key + ' (' + tot + ' positions): ' + Object.keys(sum).sort((x, y) => sum[y] - sum[x]).map(k2 => k2 + ' chosen ' + (100 * (cnt[k2] || 0) / tot).toFixed(0) + '%, its own figure $' + (sum[k2] / tot).toFixed(2)).join(' | ')); } }
