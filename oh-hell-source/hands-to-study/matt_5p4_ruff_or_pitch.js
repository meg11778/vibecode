/* Matt's hand of 22 Nov 2026 (hands/matt_5p4_ruff_or_pitch.txt). 5 players, 4 cards, hearts trump (K♥ turned).
   Bids NW 0, NE 1, East 1, You 1, West 0 (dealer): one fewer bid than tricks. Trick 1: NW 8♦, NE 7♦, East 6♦, and You
   hold Q♥ 10♠ 6♠ 3♠ with West still to play. Ruff with the queen (the report: safest, makes 97%) or throw a spade
   (the report: most money, makes 86%)? Where does the money come from?
   node matt_5p4_ruff_or_pitch.js [layouts]    (OHHELL_ENGINE = folder holding ohhell-play.html) */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_h2_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readChoose,readLayouts,netChoose,legalCards,beatsCard,vienna,mulberry32,suitOf,READ,setKnown:v=>{KNOWN=v;}};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const C = s => { const m = s.match(/^(10|[2-9JQKA])(.)$/), r = { J: 11, Q: 12, K: 13, A: 14 }[m[1]] || +m[1]; return '♠♥♦♣'.indexOf(m[2]) * 13 + r - 2; };
const T = c => (['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c % 13]) + '♠♥♦♣'[Math.floor(c / 13)];
const Pn = 5, n = 4, trump = 1, turned = C('K♥'), bids = [0, 1, 1, 1, 0], order = [0, 1, 2, 3, 4], ME = 3, names = ['NW (0)', 'NE (1)', 'East (1)', 'You (1)', 'West (0)'];
const hand = ['Q♥', '10♠', '6♠', '3♠'].map(C).sort((x, y) => x - y), K = +(process.argv[2] || 4000);
const hist = [[0, '8♦'], [1, '7♦'], [2, '6♦']].map(([seat, c]) => ({ seat, card: C(c) })), seen = new Uint8Array(52); for (const e of hist) seen[e.card] = 1;
const voids = order.map(() => [false, false, false, false]), trick0 = hist.map(e => e.card);
const S = { Pn, n, trump, turned, bids, order, hand, seen, voids, lens: [3, 3, 3, 4, 4], won: [0, 0, 0, 0, 0], turn: ME, led: 2, winCard: C('8♦'), winner: 0, playedInTrick: 3, trick: trick0, hist };
const rand = M.mulberry32(2211); M.setKnown([turned]);
const net = M.netChoose({ hand, seen, voids, lens: S.lens, bids, won: S.won, turn: ME, led: 2, winCard: S.winCard, winner: 0, playedInTrick: 3, trick: trick0, turned, trump, n, P: Pn }, 2).alts;
console.log('network alone: ' + net.map(x => T(x.card) + ' ' + x.score.toFixed(2)).join('   '));
for (const [prec, reps] of [[1, 100], [10, 20]]) { M.READ.prec = prec; const cnt = {}, sum = {}; for (let r = 0; r < reps; r++) { const o = M.readChoose(S, rand); cnt[o.card] = (cnt[o.card] || 0) + 1; for (const x of o.alts) sum[x.card] = (sum[x.card] || 0) + x.score / reps; }
  console.log('card-reading bot in your seat, precision x' + prec + ', ' + reps + ' runs: ' + hand.slice().reverse().map(c => T(c) + ' chosen ' + (100 * (cnt[c] || 0) / reps).toFixed(0) + '%, $' + sum[c].toFixed(2)).join(' | ')); }
M.READ.prec = 1;
const RL = M.readLayouts(S, rand, +(process.env.DRAW || K * 12), K), L = RL.picks;
console.log('\n' + K + ' layouts kept from ' + RL.cands.length + ' that fit the bids; effective number after weighing the cards played: ' + RL.ess.toFixed(0));
function play(pk, first) { const h = pk.map(x => x.slice()); h[ME] = hand.slice(); const won = [0, 0, 0, 0, 0], sn = Uint8Array.from(seen), vd = voids.map(x => x.slice());
  let turn = ME, led = 2, winCard = S.winCard, winner = 0, i = 3, trick = trick0.slice(), f = first, tr = 0, t1 = -1; const myWins = [];let cur = -1;
  for (let left = h.reduce((s, x) => s + x.length, 0); left > 0; left--) { const lg = M.legalCards(h[turn], led); let c; if (f != null) { c = f; f = null; } else c = lg.length === 1 ? lg[0] : M.netChoose({ hand: h[turn], seen: sn, voids: vd, lens: h.map(x => x.length), bids, won, turn, led, winCard, winner, playedInTrick: i, trick, turned, trump, n, P: Pn }, 0).card;
    if (turn === ME) cur = c; h[turn].splice(h[turn].indexOf(c), 1); sn[c] = 1; trick.push(c); if (i === 0) led = M.suitOf(c); else if (M.suitOf(c) !== led) vd[turn][led] = true; if (M.beatsCard(c, winCard, trump)) { winCard = c; winner = turn; }
    if (++i === Pn) { won[winner]++; if (winner === ME) myWins.push(cur); if (tr === 0) t1 = winner; tr++; turn = winner; i = 0; led = -1; winCard = -1; trick = []; } else turn = (turn + 1) % Pn; }
  let tot = 0; for (let q = 0; q < Pn; q++) tot += M.vienna(bids[q], won[q], n);
  return { money: M.vienna(bids[ME], won[ME], n) - tot / Pn, won, t1, myWins }; }
const mean = v => v.reduce((s, x) => s + x, 0) / v.length, eff = Math.min(K, RL.ess), se = v => { const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) * (x - m), 0) / v.length / Math.max(1, eff - 1)); };
const res = {}; for (const c of hand) res[c] = L.map(pk => play(pk, c)); const base = res[C('Q♥')], bonus = q => bids[q] === 0 ? 5 + n : 10;
console.log('\nplayed out on the same layouts (network in every seat after your card):');
for (const c of hand.slice().reverse()) { const r = res[c], d = r.map((x, k) => x.money - base[k].money), f = g => (100 * r.filter(g).length / K).toFixed(1) + '%';
  console.log('  ' + T(c).padEnd(4) + ' worth $' + mean(r.map(x => x.money)).toFixed(2) + ' (against the ruff ' + (mean(d) >= 0 ? '+' : '') + mean(d).toFixed(2) + ' ±' + se(d).toFixed(2) + ') | you make ' + f(x => x.won[ME] === 1) + ', short ' + f(x => x.won[ME] === 0) + ', over ' + f(x => x.won[ME] > 1) + ' | trick 1 goes to ' + [0, 4, 3].map(q => names[q] + ' ' + f(x => x.t1 === q)).join(', ') + ' | busted: ' + [0, 1, 2, 4].map(q => names[q] + ' ' + f(x => x.won[q] !== bids[q])).join(', ')); }
console.log('\nwhere the money comes from, in dollars a hand (your tricks + 4/5 of your bonus - 1/5 of everyone else\'s points):');
for (const c of hand.slice().reverse()) { const r = res[c], own = mean(r.map(x => x.won[ME] === 1 ? 10 * (Pn - 1) / Pn : 0)), myTr = mean(r.map(x => x.won[ME])) * (Pn - 1) / Pn, oth = [0, 1, 2, 4].map(q => -mean(r.map(x => (x.won[q] === bids[q] ? bonus(q) : 0))) / Pn), othTr = -mean(r.map(x => [0, 1, 2, 4].reduce((s, q) => s + x.won[q], 0))) / Pn;
  console.log('  ' + T(c).padEnd(4) + ' your bonus ' + own.toFixed(2) + ' | your tricks ' + myTr.toFixed(2) + ' | their tricks ' + othTr.toFixed(2) + ' | their bonuses: ' + [0, 1, 2, 4].map((q, j) => names[q] + ' ' + oth[j].toFixed(2)).join(', ') + ' | total ' + (own + myTr + othTr + oth.reduce((s, x) => s + x, 0)).toFixed(2)); }
// the cases: can West get under the 8♦, and where are the hearts above the queen (only the ace)
const dia = c => M.suitOf(c) === 2, he = c => M.suitOf(c) === 1, cases = {};
L.forEach((pk, k) => { const w = pk[4], wd = w.filter(dia), key = (wd.length ? (wd.some(c => c < C('8♦')) ? 'West can duck the diamond' : 'West has only diamonds above the 8') : w.some(he) ? 'West has no diamond but has a trump' : 'West has no diamond and no trump') + ' | ' + (pk.some((x, q) => q !== ME && x.includes(C('A♥'))) ? 'A♥ is out' : 'A♥ not dealt'); (cases[key] = cases[key] || []).push(k); });
console.log('\nby case (share of layouts): worth and make % for the ruff and for the best spade throw');
const sp = hand.filter(c => M.suitOf(c) === 0).sort((x, y) => mean(res[y].map(v => v.money)) - mean(res[x].map(v => v.money)))[0];
for (const key of Object.keys(cases).sort((x, y) => cases[y].length - cases[x].length)) { const ks = cases[key], g = (c, fn) => mean(ks.map(k => fn(res[c][k])));
  console.log('  ' + key.padEnd(52) + (100 * ks.length / K).toFixed(1).padStart(5) + '% | Q♥ $' + g(C('Q♥'), x => x.money).toFixed(2) + ' (makes ' + (100 * g(C('Q♥'), x => x.won[ME] === 1 ? 1 : 0)).toFixed(0) + '%, NW busted ' + (100 * g(C('Q♥'), x => x.won[0] > 0 ? 1 : 0)).toFixed(0) + '%) | ' + T(sp) + ' $' + g(sp, x => x.money).toFixed(2) + ' (makes ' + (100 * g(sp, x => x.won[ME] === 1 ? 1 : 0)).toFixed(0) + '%, NW busted ' + (100 * g(sp, x => x.won[0] > 0 ? 1 : 0)).toFixed(0) + '%)'); }
const r = res[sp]; console.log('\nafter throwing the ' + T(sp) + ': you take the Q♥ later ' + (100 * r.filter(x => x.myWins.includes(C('Q♥'))).length / K).toFixed(1) + '% | a spade wins a trick ' + (100 * r.filter(x => x.myWins.some(c => M.suitOf(c) === 0)).length / K).toFixed(1) + '% | A♥ held by someone ' + (100 * L.filter(pk => pk.some((x, q) => q !== ME && x.includes(C('A♥')))).length / K).toFixed(1) + '%');
