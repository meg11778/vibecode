/* Matt's hand of 20 Nov 2026 (4 players, 7 cards, spades trump): trick 4, You (2 bid, 2 taken) lead the 2♠, West
   throws the Q♦, and North (bid 1, none taken) holds Q♠ 4♠ 5♥ 2♣ with East (bid 1, 1 taken) still to play.
   The bot played the 4. How does it price the two cards, how often does it choose each, what does it believe about
   the other spades, and what happens after each card by where the spades lie?
   node north_t4.js     (OHHELL_ENGINE = folder holding ohhell-play.html) */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_n4_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,readLayouts,netChoose,legalCards,beatsCard,vienna,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
const Pn = 4, n = 7, trump = 0, turned = C('7♠'), bids = [2, 2, 1, 1], order = [0, 1, 2, 3], ME = 2;
const hist = [[0,'10♣'],[1,'Q♣'],[2,'6♣'],[3,'K♣'], [3,'10♠'],[0,'A♠'],[1,'8♠'],[2,'6♠'], [0,'A♥'],[1,'K♥'],[2,'Q♥'],[3,'10♥'], [0,'2♠'],[1,'Q♦']].map(([seat, c]) => ({ seat, card: C(c) }));
const seen = new Uint8Array(52); for (const e of hist) seen[e.card] = 1;
const voids = [0, 1, 2, 3].map(() => [false, false, false, false]); voids[1][0] = true;
const hand = ['Q♠', '4♠', '5♥', '2♣'].map(C).sort((x, y) => x - y), won0 = [2, 0, 0, 1];
const S = { Pn, n, trump, turned, bids, order, hand, seen, voids, lens: [3, 3, 4, 4], won: won0, turn: ME, led: 0, winCard: C('2♠'), winner: 0, playedInTrick: 2, trick: [C('2♠'), C('Q♦')], hist };
const rand = M.mulberry32(2020); M.setKnown([turned]);
const net = M.netChoose({ hand, seen, voids, lens: S.lens, bids, won: won0, turn: ME, led: 0, winCard: S.winCard, winner: 0, playedInTrick: 2, trick: S.trick, turned, trump, n, P: Pn }, 2).alts;
console.log('network alone: ' + net.map(x => T(x.card) + ' ' + x.score.toFixed(2)).join('   '));
for (const [prec, reps] of [[1, 100], [10, 12]]) { M.READ.prec = prec; const cnt = {}, sum = {}; for (let r = 0; r < reps; r++) { const o = M.readChoose(S, rand); cnt[o.card] = (cnt[o.card] || 0) + 1; for (const x of o.alts) sum[x.card] = (sum[x.card] || 0) + x.score / reps; }
  console.log('card reading, precision x' + prec + ', ' + reps + ' runs: ' + [C('4♠'), C('Q♠')].map(c => T(c) + ' chosen ' + (100 * (cnt[c] || 0) / reps).toFixed(0) + '%, worth $' + sum[c].toFixed(2)).join(' | ')); }
M.READ.prec = 1;
const K = 3000, L = M.readLayouts(S, rand, K * 12, K).picks, sp = c => M.suitOf(c) === 0, above = c => sp(c) && c > C('4♠');
const cls = pk => { const e = pk[3].filter(sp), y = pk[0].filter(sp); const eK = e.includes(C('K♠'));
  if (!e.length) return 'East has no spade'; if (e.length === 1) return e[0] < C('4♠') ? 'East has only the 3♠' : eK ? 'East has the K♠ alone' : 'East has one spade, between the 4 and the queen'; return 'East has two or more spades'; };
const stat = {}; 
for (const pk of L) { const key = cls(pk) + (pk[0].some(sp) ? ' | You hold a spade' : ' | You hold none'); const st = stat[key] = stat[key] || { k: 0, made: [0, 0], money: [0, 0] }; st.k++;
  [C('4♠'), C('Q♠')].forEach((first, idx) => { const h = pk.map(x => x.slice()); h[ME] = hand.slice(); const won = won0.slice(), sn = Uint8Array.from(seen), vd = voids.map(x => x.slice());
    let turn = ME, led = 0, winCard = S.winCard, winner = 0, i = 2, trick = S.trick.slice(), f = first, left = h.reduce((s, x) => s + x.length, 0);
    for (; left > 0; left--) { const lg = M.legalCards(h[turn], led); let c; if (f != null) { c = f; f = null; } else c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen: sn, voids: vd, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, 0).card;
      h[turn].splice(h[turn].indexOf(c), 1); sn[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) vd[turn][led] = true; if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
      if (++i === Pn) { won[winner]++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn; }
    let tot = 0; for (let q = 0; q < Pn; q++) tot += M.vienna(bids[q], won[q], n); st.made[idx] += won[ME] === 1 ? 1 : 0; st.money[idx] += M.vienna(bids[ME], won[ME], n) - tot / Pn; }); }
console.log('\nwhere the other spades are (K J 9 5 3 unseen), as North reads it, and what each card then does (network in every seat):');
let tm = [0, 0], tk = 0, td = [0, 0];
for (const key of Object.keys(stat).sort((x, y) => stat[y].k - stat[x].k)) { const st = stat[key]; tk += st.k; tm[0] += st.made[0]; tm[1] += st.made[1]; td[0] += st.money[0]; td[1] += st.money[1];
  console.log('  ' + key.padEnd(66) + (100 * st.k / K).toFixed(1).padStart(5) + '% | play 4♠: makes ' + (100 * st.made[0] / st.k).toFixed(0).padStart(3) + '% ($' + (st.money[0] / st.k).toFixed(2) + ') | play Q♠: makes ' + (100 * st.made[1] / st.k).toFixed(0).padStart(3) + '% ($' + (st.money[1] / st.k).toFixed(2) + ')'); }
console.log('  all layouts: play 4♠ makes ' + (100 * tm[0] / tk).toFixed(1) + '% ($' + (td[0] / tk).toFixed(2) + ') | play Q♠ makes ' + (100 * tm[1] / tk).toFixed(1) + '% ($' + (td[1] / tk).toFixed(2) + ')');
