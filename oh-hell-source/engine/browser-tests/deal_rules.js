/* The deal of hidden cards must be even: every card a seat is allowed to hold is equally likely to be in its hand.
   Runs in node:   node deal_rules.js     (reads ../play_template.html)
   The case is Matt's hand of 17 Nov 2026: 4 players, 4 cards, one card left each; West has shown out of spades, East
   out of hearts. The old first-come deal gave East a spade about half the time (an even deal: about a third). */
const fs = require('fs'), path = require('path'), t = fs.readFileSync(path.join(__dirname, '..', 'play_template.html'), 'utf8');
const cut = name => { const i = t.indexOf('function ' + name + '('), k = t.indexOf('\n}\n', i) + 3; if (i < 0) throw new Error(name + ' not found'); return t.slice(i, k); };
const suitOf = c => (c / 13) | 0, READ = { deal: 'fair' }, M = new Function('suitOf', 'READ', cut('dealHidden') + cut('dealFirstFit') + '; return {dealHidden};')(suitOf, READ);
let s = 12345; const rand = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let x = Math.imul(s ^ s >>> 15, 1 | s); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
const C = x => { const su = 'SHDC'.indexOf(x.slice(-1)), v = { J: 11, Q: 12, K: 13, A: 14 }[x.slice(0, -1)] || +x.slice(0, -1); return su * 13 + v - 2; };
const gone = ['9H', '8S', '3S', '6S', 'JH', 'AH', 'KH', '5D', '2H', '2C', '4C', '6C', '4S', '10D'].map(C), unseen = [...Array(52).keys()].filter(c => !gone.includes(c));
const voids = [0, 1, 2, 3].map(() => [false, false, false, false]); voids[1][0] = true; voids[3][1] = true;       // seat 1 (West) out of spades, seat 3 (East) out of hearts
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
function run(mode) { READ.deal = mode; const N = 60000, cnt = [null, {}, {}, {}], suit = [null, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]; let bad = 0;
  for (let i = 0; i < N; i++) { const h = M.dealHidden(unseen, [1, 1, 1, 1], voids, 4, rand, 0); for (const p of [1, 2, 3]) { const c = h[p][0]; cnt[p][c] = (cnt[p][c] || 0) + 1; suit[p][suitOf(c)]++; if (voids[p][suitOf(c)]) bad++; } }
  return { N, cnt, suit, bad }; }
const allowed = p => unseen.filter(c => !voids[p][suitOf(c)]), names = [null, 'West', 'North', 'East'];
const f = run('fair'); ok(f.bad === 0, 'nobody is dealt a suit they have shown out of');
for (const p of [1, 2, 3]) { const a = allowed(p), want = f.N / a.length, worst = Math.max(...a.map(c => Math.abs((f.cnt[p][c] || 0) - want) / want));
  ok(worst < 0.12, names[p] + ': each of its ' + a.length + ' possible cards comes up equally often (largest departure ' + (100 * worst).toFixed(0) + '%)'); }
const eSp = f.suit[3][0] / f.N, want = allowed(3).filter(c => suitOf(c) === 0).length / allowed(3).length; ok(Math.abs(eSp - want) < 0.015, 'East holds a spade ' + (100 * eSp).toFixed(1) + '% of the time (even deal: ' + (100 * want).toFixed(1) + '%)');
const o = run('first'); console.log('     for the record, the old deal gave East a spade ' + (100 * o.suit[3][0] / o.N).toFixed(1) + '% of the time');
console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
