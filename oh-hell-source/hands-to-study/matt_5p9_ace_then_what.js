/* Matt's hand of 22 Nov 2026 (hands-to-study conversation). 5 players, 9 cards, spades trump (5♠ turned).
   Third seat holds A♠ 2♠ A♥ 4♥ 3♥ 2♥ J♣ 4♣ 2♦. Bids 0 0 2(you) 4 2(dealer): one fewer bid than tricks.
   The first seat (a zero bidder) leads the 4♠. Four lines: duck with the 2♠; or win the A♠ and lead J♣, A♥ or 2♦.

   What this does: draws layouts of the hidden cards that fit the bids and the 4♠ lead (the game's readLayouts),
   lets the second seat follow as the network would, then plays every line on the same layouts with the network in
   every seat after the forced cards. Differences between lines are paired (same layouts).
   node matt_5p9_ace_then_what.js [layouts] [bids like 0,0,2,4,2] [hand like A♠,2♠,...]   (OHHELL_ENGINE = folder holding ohhell-play.html)
   DRAW=n sets how many fitting layouts to look for (default 12 x layouts). Add READ=1 to also run the card-reading bot's own choice at trick 1 and at the trick-2 lead (slow). */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_h1_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,readLayouts,netChoose,legalCards,beatsCard,vienna,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
const Pn = 5, n = 9, trump = 0, turned = C('5♠'), order = [0, 1, 2, 3, 4], ME = 2, LEAD = C('4♠');
const K = +(process.argv[2] || 3000), bids = (process.argv[3] || '0,0,2,4,2').split(',').map(Number);
const hand = (process.argv[4] || 'A♠,2♠,A♥,4♥,3♥,2♥,J♣,4♣,2♦').split(',').map(C).sort((x, y) => x - y);
const rand = M.mulberry32(+(process.env.SEED || 2211)); M.setKnown([turned]);
const mkVoids = () => order.map(() => [false, false, false, false]);

// the position as the third seat sees it once the 4♠ is led (the second seat's card is filled in per layout)
const seen0 = new Uint8Array(52); seen0[LEAD] = 1;
const S0 = { Pn, n, trump, turned, bids, order, hand, seen: seen0, voids: mkVoids(), lens: [n - 1, n, n, n, n], won: [0, 0, 0, 0, 0], turn: ME, led: 0, winCard: LEAD, winner: 0, playedInTrick: 1, trick: [LEAD], hist: [{ seat: 0, card: LEAD }] };
const t0 = Date.now(), RL = M.readLayouts(S0, rand, +(process.env.DRAW || K * 12), K), L = RL.picks;
console.log('bids ' + bids.join(' ') + ' | hand ' + hand.map(T).join(' ') + ' | ' + K + ' layouts kept from ' + RL.cands.length + ' that fit the bids; effective number after weighing the 4♠ lead: ' + RL.ess.toFixed(0) + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');

// play one layout: forced = the third seat's first card, and its lead if it wins trick 1 (null = network)
function play(pk, first, second, over) {
  const h = pk.map(x => x.slice()); h[ME] = hand.slice(); const won = [0, 0, 0, 0, 0], sn = Uint8Array.from(seen0), vd = mkVoids();
  let turn = 1, led = 0, winCard = LEAD, winner = 0, i = 1, trick = [LEAD], tr = 0, t2won = -1, seat1 = -1, mine = 0, cur = -1; const wins = [], log = [];
  for (let left = h.reduce((s, x) => s + x.length, 0); left > 0; left--) { const lg = M.legalCards(h[turn], led); let c = null;
    if (turn === ME && mine === 0) c = first; else if (turn === ME && mine === 1 && tr === 1 && i === 0 && second != null) c = second;
    if (over && turn === ME && mine === over.idx) c = over.card;
    if (c == null) c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen: sn, voids: vd, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, 0).card;
    if (turn === ME) { mine++; cur = c; log.push({ c, tr, idx: mine - 1, lead: i === 0, ledSuit: i === 0 ? M.suitOf(c) : led, hand: h[ME].slice(), trick: trick.slice(), won: won.slice(), legal: lg.slice(), lens: h.map(x => x.length), winCardThen: winCard, winnerThen: winner }); } if (tr === 0 && turn === 1) seat1 = c;
    h[turn].splice(h[turn].indexOf(c), 1); sn[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) vd[turn][led] = true;
    if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
    if (++i === Pn) { won[winner]++; { const e = log[log.length - 1]; if (e && e.tr === tr) { e.winner = winner; e.winCard = winCard; } } if (winner === ME) wins.push(cur); if (tr === 1) t2won = winner; tr++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn; }
  let tot = 0, bust = 0; for (let q = 0; q < Pn; q++) { tot += M.vienna(bids[q], won[q], n); if (q !== ME && won[q] !== bids[q]) bust++; }
  return { money: M.vienna(bids[ME], won[ME], n) - tot / Pn, tricks: won[ME], bust, t2won, seat1, won, wins, log };
}
const has = c => hand.includes(c), lines = [];
if (has(C('2♠'))) lines.push({ name: 'duck 2♠', first: C('2♠'), second: null });
for (const s of ['J♣', 'A♥', '2♦', '4♣', '2♥', '4♥', '2♠']) if (has(C(s))) lines.push({ name: 'A♠, ' + s, first: C('A♠'), second: C(s) });
lines.push({ name: 'A♠, then network', first: C('A♠'), second: null }); lines.push({ name: 'network throughout', first: null, second: null });
for (const ln of lines) ln.res = L.map(pk => play(pk, ln.first, ln.second));
const mean = v => v.reduce((s, x) => s + x, 0) / v.length, se = v => { const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) * (x - m), 0) / v.length / Math.max(1, Math.min(v.length, RL.ess) - 1)); };
const base = lines.find(l => l.name === 'A♠, J♣') || lines[0], pct = x => (100 * x).toFixed(0).padStart(3) + '%';
const s1 = {}; for (const r of lines[0].res) s1[r.seat1] = (s1[r.seat1] || 0) + 1;
console.log('second seat follows the 4♠ with: ' + Object.keys(s1).sort((x, y) => s1[y] - s1[x]).slice(0, 8).map(c => T(+c) + ' ' + (100 * s1[c] / K).toFixed(0) + '%').join('  '));
console.log('\nline'.padEnd(22) + 'worth    vs ' + base.name + ' (±1 s.e.)   makes  you take 0/1/2/3/4+            others busted  the trick-2 lead wins');
for (const ln of lines) { const r = ln.res, d = r.map((x, k) => x.money - base.res[k].money), tk = [0, 1, 2, 3, 4].map(t => r.filter(x => t < 4 ? x.tricks === t : x.tricks >= 4).length / K);
  console.log(ln.name.padEnd(21) + ('$' + mean(r.map(x => x.money)).toFixed(2)).padStart(6) + '   ' + ((mean(d) >= 0 ? '+' : '') + mean(d).toFixed(2)).padStart(6) + ' ±' + se(d).toFixed(2) + '              ' + pct(tk[2]) + '   ' + tk.map(pct).join(' ') + '       ' + mean(r.map(x => x.bust)).toFixed(2) + '          ' + (ln.second != null ? pct(r.filter(x => x.t2won === ME).length / K) : '')); }

// the few cases that matter, read off the layouts themselves (after the A♠ wins trick 1 the other seats have each played a spade or shown out)
const jc = lines.find(l => l.name === 'A♠, J♣'), ah = lines.find(l => l.name === 'A♠, A♥'), show = lines.filter(l => ['duck 2♠', 'A♠, J♣', 'A♠, A♥', 'A♠, 2♦'].includes(l.name));
if (jc && ah) { const cases = {}; L.forEach((pk, k) => { const key = (jc.res[k].t2won === ME ? 'J♣ would win' : 'J♣ would lose') + ', ' + (ah.res[k].t2won === ME ? 'A♥ would stand up' : 'A♥ would be trumped'); (cases[key] = cases[key] || []).push(k); });
  console.log('\nby case (share of layouts): worth and make % of each line');
  for (const key of Object.keys(cases).sort((x, y) => cases[y].length - cases[x].length)) { const ks = cases[key];
    console.log('  ' + key.padEnd(38) + (100 * ks.length / K).toFixed(1).padStart(5) + '% | ' + show.map(ln => ln.name + ' $' + mean(ks.map(k => ln.res[k].money)).toFixed(2) + ' (' + (100 * mean(ks.map(k => ln.res[k].tricks === bids[ME] ? 1 : 0))).toFixed(0) + '%)').join(' | ')); } }
// where the tricks came from on each line, and how it fails
console.log('\nwhere your tricks came from (share of layouts):');
for (const ln of show) { const r = ln.res, f = g => pct(r.filter(g).length / K), w = (x, s) => x.wins.includes(C(s));
  console.log('  ' + ln.name.padEnd(9) + ' A♠ wins ' + f(x => w(x, 'A♠')) + ' | A♥ wins ' + f(x => w(x, 'A♥')) + ' | J♣ wins ' + f(x => w(x, 'J♣')) + ' | 2♠ wins ' + f(x => w(x, '2♠')) + ' | a small heart, 4♣ or 2♦ wins ' + f(x => x.wins.some(c => ![C('A♠'), C('A♥'), C('J♣'), C('2♠')].includes(c))) + ' || fails short ' + f(x => x.tricks < bids[ME]) + ', fails over ' + f(x => x.tricks > bids[ME])); }
{ const x = lines.find(l => l.name === 'A♠, 2♦'), y = lines.find(l => l.name === 'A♠, A♥'); if (x && y) { const d = x.res.map((r, k) => r.money - y.res[k].money); console.log('  A♠, 2♦ minus A♠, A♥: ' + mean(d).toFixed(2) + ' ±' + se(d).toFixed(2)); } }
// which tricks you take, as a set, on each line (share of all layouts)
console.log('\nwhich tricks you take on each line (share of layouts; sets under 1% left out):');
for (const ln of show) { const sets = {}; for (const x of ln.res) { const key = (x.wins.length ? x.wins.map(T).join(' + ') : 'none') + (x.tricks === bids[ME] ? '' : x.tricks < bids[ME] ? '  [short]' : '  [over]'); sets[key] = (sets[key] || 0) + 1; }
  console.log('  ' + ln.name + ':'); for (const key of Object.keys(sets).sort((x, y) => sets[y] - sets[x])) if (sets[key] / K >= 0.01) console.log('      ' + (100 * sets[key] / K).toFixed(1).padStart(5) + '%  ' + key); }
// each lead line split by whether the trick-2 lead wins
console.log('\neach line split by whether the trick-2 lead wins:');
for (const ln of lines.filter(l => l.second != null && show.includes(l))) for (const w of [true, false]) { const r = ln.res.filter(x => (x.t2won === ME) === w); if (!r.length) continue; const f = g => (100 * r.filter(g).length / r.length).toFixed(1) + '%', p0 = r.filter(x => x.tricks === bids[ME]).length / r.length;
  const sets = {}; for (const x of r) { const key = x.wins.map(T).join(' + '); sets[key] = (sets[key] || 0) + 1; }
  console.log('  ' + ln.name + ', the ' + T(ln.second) + (w ? ' wins  ' : ' loses ') + (100 * r.length / K).toFixed(1).padStart(5) + '% of layouts (' + r.length + '): makes ' + f(x => x.tricks === bids[ME]) + ' ±' + (100 * Math.sqrt(p0 * (1 - p0) / r.length)).toFixed(1) + ', short ' + f(x => x.tricks < bids[ME]) + ', over ' + f(x => x.tricks > bids[ME]) + ' | worth $' + mean(r.map(x => x.money)).toFixed(2) + ' | tricks: ' + Object.keys(sets).sort((x, y) => sets[y] - sets[x]).slice(0, 4).map(k => k + ' ' + (100 * sets[k] / r.length).toFixed(1) + '%').join(', ')); }
// when a line fails, what went wrong (share of all layouts)
console.log('\nwhen each line fails, what went wrong (share of all layouts):');
{ const who = q => ['the first seat (0)', 'the second seat (0)', 'you', 'the fourth seat (' + bids[3] + ')', 'the dealer (' + bids[4] + ')'][q], when = t => t <= 2 ? 'tricks 2-3' : t <= 5 ? 'tricks 4-6' : 'tricks 7-9';
  const fate = (x, name) => { const c = C(name), e = x.log.find(l => l.c === c); if (!e) return name + ' ?'; if (e.winner === ME) return name + ' won';
    const su = M.suitOf(c); if (su === trump) return e.ledSuit === trump ? name + ' fell under a trump lead' : name + ' overtrumped';
    if (e.ledSuit !== su) return name + ' thrown away'; return M.suitOf(e.winCard) === trump ? name + ' trumped' : name + ' beaten by a higher one'; };
  for (const ln of show) { const sh = {}, ov = {}, ahW = {}, ahT = {}; let nS = 0, nO = 0;
    for (const x of ln.res) { if (x.tricks < bids[ME]) { nS++; const k = ['A♥', 'J♣', '2♠'].filter(has0 => hand.includes(C(has0))).map(n2 => fate(x, n2)).join(', '); sh[k] = (sh[k] || 0) + 1;
        const e = x.log.find(l => l.c === C('A♥')); if (e && e.winner !== ME && M.suitOf(e.winCard) === trump && e.ledSuit === 1) { const a = who(e.winner), b = when(e.tr) + (e.lead ? ', you led it' : ', a heart was led to you'); ahW[a] = (ahW[a] || 0) + 1; ahT[b] = (ahT[b] || 0) + 1; } }
      else if (x.tricks > bids[ME]) { nO++; const extra = x.log.filter(l => l.winner === ME).slice(bids[ME]); const e = extra[0]; const k = T(e.c) + (e.tr === n - 1 ? ' on the last trick' : e.lead ? ' led and it held' : ' won when following') ; ov[k] = (ov[k] || 0) + 1; } }
    const list = o => Object.keys(o).sort((x, y) => o[y] - o[x]).filter(k => o[k] / K >= 0.003).map(k => '      ' + (100 * o[k] / K).toFixed(1).padStart(4) + '%  ' + k).join('\n');
    console.log('  ' + ln.name + ': one short ' + (100 * nS / K).toFixed(1) + '%, over ' + (100 * nO / K).toFixed(1) + '%');
    console.log('    short:\n' + list(sh)); console.log('    A♥ trumped by: ' + Object.keys(ahW).sort((x, y) => ahW[y] - ahW[x]).map(k => k + ' ' + (100 * ahW[k] / K).toFixed(1) + '%').join(', ') + ' | when: ' + Object.keys(ahT).sort((x, y) => ahT[y] - ahT[x]).map(k => k + ' ' + (100 * ahT[k] / K).toFixed(1) + '%').join(', '));
    console.log('    over (the third trick was):\n' + list(ov)); } }
// what the layouts say about the hidden cards
const cl = c => M.suitOf(c) === 3, sp = c => M.suitOf(c) === 0, he = c => M.suitOf(c) === 1, di = c => M.suitOf(c) === 2, sh = f => (100 * L.filter(f).length / K).toFixed(0) + '%', names = ['first seat (0)', 'second seat (0)', 'you', 'fourth seat (' + bids[3] + ')', 'dealer (' + bids[4] + ')'];
console.log('\nwhat the layouts hold (the first seat\'s count includes the 4♠ it led):');
for (const q of [0, 1, 3, 4]) { const full = pk => q === 0 ? pk[q].concat([LEAD]) : pk[q]; const av = f => mean(L.map(pk => full(pk).filter(f).length)).toFixed(2);
  console.log('  ' + names[q].padEnd(18) + ' spades ' + av(sp) + ' hearts ' + av(he) + ' diamonds ' + av(di) + ' clubs ' + av(cl) + ' | has a club above the jack ' + sh(pk => pk[q].some(c => cl(c) && c > C('J♣'))) + ' | no club ' + sh(pk => !pk[q].some(cl)) + ' | no heart ' + sh(pk => !pk[q].some(he)) + ' | K♠ ' + sh(pk => pk[q].includes(C('K♠'))) + ' | 2+ spades left after trick 1 ' + sh(pk => full(pk).filter(sp).length >= 3)); }
console.log('  no club above the jack was dealt to anyone: ' + sh(pk => !pk.some((x, q) => q !== ME && x.some(c => cl(c) && c > C('J♣')))) + ' | clubs above the jack only with zero bidders: ' + sh(pk => [0, 1].some(q => pk[q].some(c => cl(c) && c > C('J♣'))) && ![3, 4].some(q => pk[q].some(c => cl(c) && c > C('J♣')))));
const tb = lines.find(l => l.name === 'A♠, J♣'); if (tb) { const w = [0, 1, 3, 4].map(q => mean(tb.res.map(x => x.won[q]))); console.log('  after A♠ then J♣, average tricks: first seat ' + w[0].toFixed(2) + ', second seat ' + w[1].toFixed(2) + ', fourth seat ' + w[2].toFixed(2) + ', dealer ' + w[3].toFixed(2)); }

if (process.env.WHY) {   // the network in your seat throws the A♥ away while still a trick short: what was it looking at, and what would the other cards have done?
  const AH = C('A♥'), sn = c => M.suitOf(c);
  for (const ln of lines.filter(l => ['A♠, J♣', 'A♠, 2♦'].includes(l.name))) { const hit = []; let allThrown = 0;
    ln.res.forEach((x, k) => { const e = x.log.find(l => l.c === AH); if (e && e.ledSuit !== 1) { allThrown++; if (e.won[ME] < bids[ME]) hit.push({ k, x, e }); } });
    console.log('\n' + ln.name + ': the A♥ is thrown on another suit on ' + (100 * allThrown / K).toFixed(1) + '% of layouts; on ' + (100 * hit.length / K).toFixed(1) + '% you were still a trick short when it went');
    const fin = { made: 0, short: 0, over: 0 }; for (const { x } of hit) fin[x.tricks === bids[ME] ? 'made' : x.tricks < bids[ME] ? 'short' : 'over']++;
    console.log('  how those ended with the network\'s throw: made ' + (100 * fin.made / hit.length).toFixed(0) + '%, short ' + (100 * fin.short / hit.length).toFixed(0) + '%, over ' + (100 * fin.over / hit.length).toFixed(0) + '%  (' + hit.length + ' layouts)');
    const sit = {}; for (const { e } of hit) { const key = 'trick ' + (e.tr + 1) + ', ' + '♠♥♦♣'[e.ledSuit] + ' led, ' + (M.suitOf(e.winCardThen) === trump && e.ledSuit !== trump ? 'already trumped' : 'not yet trumped') + ', ' + (e.hand.includes(C('2♠')) ? 'you hold the 2♠' : 'no 2♠') + ', small hearts held ' + e.hand.filter(c => sn(c) === 1 && c !== AH).length; sit[key] = (sit[key] || 0) + 1; }
    console.log('  the situation when it was thrown:'); for (const key of Object.keys(sit).sort((x, y) => sit[y] - sit[x]).slice(0, 8)) console.log('    ' + String(sit[key]).padStart(4) + '  ' + key);
    // the same layouts with a different card at that moment, network afterwards
    const alt = {}; const add = (name, r, base) => { const o = alt[name] = alt[name] || { n: 0, made: 0, money: 0, d: [] }; o.n++; o.made += r.tricks === bids[ME] ? 1 : 0; o.money += r.money; o.d.push(r.money - base.money); };
    for (const { k, x, e } of hit) { add('throw the A♥ (network)', x, x);
      for (const c of e.legal) { if (c === AH) continue; const kind = sn(c) === trump ? 'trump with the ' + T(c) : sn(c) === 1 ? 'throw a small heart' : 'throw the ' + T(c); if (sn(c) === 1 && e.legal.some(d => sn(d) === 1 && d !== AH && d > c)) continue;   // one small heart stands for all
        add(kind, play(L[k], ln.first, ln.second, { idx: e.idx, card: c }), x); } }
    console.log('  the same layouts with another card at that moment (network before and after):');
    for (const name of Object.keys(alt).sort((x, y) => alt[y].n - alt[x].n)) { const o = alt[name]; console.log('    ' + name.padEnd(26) + ' possible on ' + String(o.n).padStart(4) + ' | makes ' + (100 * o.made / o.n).toFixed(0).padStart(3) + '% | worth $' + (o.money / o.n).toFixed(2) + ' | against the A♥ throw ' + (mean(o.d) >= 0 ? '+' : '') + mean(o.d).toFixed(2) + ' ±' + Math.sqrt(o.d.reduce((s2, v) => s2 + (v - mean(o.d)) ** 2, 0) / o.n / Math.max(1, o.n - 1)).toFixed(2)); }
    // the whole line if the best single replacement were used every time it is possible
    for (const rule of ['trump with the 2♠', 'throw a small heart']) { const tot = ln.res.map(r => r.money), mk = ln.res.map(r => r.tricks === bids[ME] ? 1 : 0); let used = 0;
      for (const { k, e } of hit) { const c = rule[1] === 'r' ? (e.legal.includes(C('2♠')) ? C('2♠') : null) : (e.legal.filter(d => sn(d) === 1 && d !== AH).sort((p, q) => q - p)[0] ?? null); if (c == null) continue; const r = play(L[k], ln.first, ln.second, { idx: e.idx, card: c }); tot[k] = r.money; mk[k] = r.tricks === bids[ME] ? 1 : 0; used++; }
      console.log('  whole line with "' + rule + '" in place of the A♥ throw (used ' + used + ' times): worth $' + mean(tot).toFixed(2) + ', makes ' + (100 * mean(mk)).toFixed(1) + '%  (was $' + mean(ln.res.map(r => r.money)).toFixed(2) + ', ' + (100 * mean(ln.res.map(r => r.tricks === bids[ME] ? 1 : 0))).toFixed(1) + '%)'); }
    // it was the last card in every case, so the question is earlier: was a heart ever led while you held the ace, and what if you had put the ace on it?
    { let never = 0, ducked = 0, mk = 0, d = []; const pos = {}, trk = {}, tr2 = {};
      for (const { k, x } of hit) { const e1 = x.log.find(l => l.ledSuit === 1 && !l.lead && l.c !== AH && l.legal.includes(AH)); if (!e1) { never++; continue; } ducked++;
        const r = play(L[k], ln.first, ln.second, { idx: e1.idx, card: AH }); mk += r.tricks === bids[ME] ? 1 : 0; d.push(r.money - x.money);
        const a = 'trick ' + (e1.tr + 1); trk[a] = (trk[a] || 0) + 1; const b = e1.trick.length === Pn - 1 ? 'you were last to play' : (Pn - 1 - e1.trick.length) + ' still to play behind you'; pos[b] = (pos[b] || 0) + 1;
        const c = M.suitOf(e1.winCardThen) === trump ? 'already trumped when it reached you' : 'not trumped when it reached you'; tr2[c] = (tr2[c] || 0) + 1; }
      console.log('  no heart was ever led while you held the ace: ' + never + ' (' + (100 * never / K).toFixed(1) + '% of all layouts) | a heart was led and the network played a small one: ' + ducked + ' (' + (100 * ducked / K).toFixed(1) + '%)');
      if (ducked) { console.log('    the first such heart lead: ' + [trk, pos, tr2].map(o => Object.keys(o).sort((x, y) => o[y] - o[x]).map(q => q + ' ' + o[q]).join(', ')).join(' | '));
        console.log('    putting the ace on that first heart lead instead (network afterwards): makes ' + (100 * mk / ducked).toFixed(0) + '%, worth ' + (mean(d) >= 0 ? '+' : '') + mean(d).toFixed(2) + ' a layout more');
        const tot = ln.res.map(r => r.money), mm = ln.res.map(r => r.tricks === bids[ME] ? 1 : 0); for (const { k, x } of hit) { const e1 = x.log.find(l => l.ledSuit === 1 && !l.lead && l.c !== AH && l.legal.includes(AH)); if (!e1 || M.suitOf(e1.winCardThen) === trump) continue; const r = play(L[k], ln.first, ln.second, { idx: e1.idx, card: AH }); tot[k] = r.money; mm[k] = r.tricks === bids[ME] ? 1 : 0; }
        console.log('    whole line if you had done that on these layouts (hindsight: only the layouts that ended short are changed, so this is an upper limit): worth $' + mean(tot).toFixed(2) + ', makes ' + (100 * mean(mm)).toFixed(1) + '%'); } }
    for (const { k, x, e } of hit.slice(0, 5)) console.log('    e.g. trick ' + (e.tr + 1) + ': table ' + e.trick.map(T).join(' ') + ' | you hold ' + e.hand.map(T).join(' ') + ' | tricks so far ' + e.won.join(' ') + ' | ended with ' + x.tricks + ' | others: ' + [0, 1, 3, 4].map(q => q + ':' + L[k][q].map(T).join(' ')).join(' / ')); }
}
if (process.env.READ) {   // the card-reading bot's own choices
  const top1 = +Object.keys(s1).sort((x, y) => s1[y] - s1[x])[0], seen = Uint8Array.from(seen0); seen[top1] = 1; const vd = mkVoids(); if (M.suitOf(top1) !== 0) vd[1][0] = true;
  const win1 = M.beatsCard(top1, LEAD, trump);
  const S1 = { Pn, n, trump, turned, bids, order, hand, seen, voids: vd, lens: [n - 1, n - 1, n, n, n], won: [0, 0, 0, 0, 0], turn: ME, led: 0, winCard: win1 ? top1 : LEAD, winner: win1 ? 1 : 0, playedInTrick: 2, trick: [LEAD, top1], hist: [{ seat: 0, card: LEAD }, { seat: 1, card: top1 }] };
  const run = (S, label, cards) => { for (const [prec, reps] of [[1, +(process.env.REPS || 20)], [10, +(process.env.REPS10 || 3)]]) { M.READ.prec = prec; const cnt = {}, sum = {}; const t = Date.now();
      for (let r = 0; r < reps; r++) { const o = M.readChoose(S, rand); cnt[o.card] = (cnt[o.card] || 0) + 1; for (const x of o.alts) sum[x.card] = (sum[x.card] || 0) + x.score / reps; }
      console.log(label + ', precision x' + prec + ', ' + reps + ' runs (' + ((Date.now() - t) / reps / 1000).toFixed(1) + ' s each): ' + cards.map(c => T(c) + ' chosen ' + (100 * (cnt[c] || 0) / reps).toFixed(0) + '%, $' + sum[c].toFixed(2)).join(' | ')); } M.READ.prec = 1; };
  console.log('\nthe card-reading bot in your seat, second seat having played the ' + T(top1) + ':');
  run(S1, '  trick 1', M.legalCards(hand, 0));
  // trick 2: you won with the ace; the two seats behind followed with their most common cards on the layouts
  const after = {}; for (const pk of L) { const r = play(pk, C('A♠'), null); } // (kept simple: take the seats' cards from one typical layout below)
  const typ = L.find(pk => { const h1 = pk[1]; return h1.includes(top1); });
  if (typ) { const h = typ.map(x => x.slice()); h[ME] = hand.slice(); const sn = Uint8Array.from(seen), v2 = vd.map(x => x.slice()), trick = [LEAD, top1, C('A♠')], hist = S1.hist.concat([{ seat: ME, card: C('A♠') }]); sn[C('A♠')] = 1; h[1].splice(h[1].indexOf(top1), 1);
    for (const q of [3, 4]) { const lg = M.legalCards(h[q], 0), c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[q], seen: sn, voids: v2, lens: h.map(x => x.length), bids, won: [0, 0, 0, 0, 0], turn: q, led: 0, winCard: C('A♠'), winner: ME, playedInTrick: trick.length, trick, turned, trump, n, P: Pn }, 0).card; h[q].splice(h[q].indexOf(c), 1); sn[c] = 1; trick.push(c); hist.push({ seat: q, card: c }); if (M.suitOf(c) !== 0) v2[q][0] = true; }
    const h2 = hand.filter(c => c !== C('A♠')), S2 = { Pn, n, trump, turned, bids, order, hand: h2, seen: sn, voids: v2, lens: [n - 1, n - 1, n - 1, n - 1, n - 1], won: [0, 0, 1, 0, 0], turn: ME, led: -1, winCard: -1, winner: ME, playedInTrick: 0, trick: [], hist };
    console.log('\n  trick 1 was ' + trick.map(T).join(' ') + '; you are on lead:'); run(S2, '  trick 2 lead', h2); }
}
