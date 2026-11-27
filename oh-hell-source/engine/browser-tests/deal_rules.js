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
/* 27 Nov 2026, from an outside review: deals that differ only by a three-way or four-way exchange. Three seats with one
   card each, the unseen cards the three deuces, each seat out of a different suit: two deals fit and each must come up
   half the time (exchanges of two cards alone left it 75 to 25). Then the same with four seats and four deuces. */
READ.deal = 'fair';
function split(P, unseen, lens, voids, label) { const cnt = {}, N = 40000; for (let i = 0; i < N; i++) { const h = M.dealHidden(unseen, lens, voids, P, rand, 0), k = h.slice(1).map(x => x.slice().sort((a, b) => a - b).join('.')).join(' | '); cnt[k] = (cnt[k] || 0) + 1; }
  return { cnt, N }; }
{ const r = split(4, [0, 13, 26], [1, 1, 1, 1], [[0, 0, 0, 0], [0, 0, 1, 0], [1, 0, 0, 0], [0, 1, 0, 0]]), v = Object.values(r.cnt);
  ok(v.length === 2 && v.every(x => Math.abs(x / r.N - 0.5) < 0.02), 'three seats, three deuces, each out of a different suit: the two deals come up ' + v.map(x => (100 * x / r.N).toFixed(1) + '%').join(' and ')); }
{ const r = split(5, [0, 13, 26, 39], [1, 1, 1, 1, 1], [[0, 0, 0, 0], [0, 0, 1, 1], [1, 0, 0, 1], [1, 1, 0, 0], [0, 1, 1, 0]]), v = Object.values(r.cnt);
  ok(v.length === 2 && v.every(x => Math.abs(x / r.N - 0.5) < 0.02), 'four seats, four deuces, each holding one of two suits: the two deals come up ' + v.map(x => (100 * x / r.N).toFixed(1) + '%').join(' and ')); }
/* Against a full count: small random cases, every deal that fits listed, each must come up equally often. */
{ let worstAll = 0, cases = 0, zero = 0;
  for (let t = 0; t < 40; t++) { const P = 4, lens = [0, 1 + ((rand() * 2) | 0), 1 + ((rand() * 2) | 0), 1 + ((rand() * 2) | 0)], need = lens[1] + lens[2] + lens[3], nU = need + ((rand() * 3) | 0);
    const deck = [...Array(52).keys()]; for (let i = 51; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [deck[i], deck[j]] = [deck[j], deck[i]]; } const un = deck.slice(0, nU);
    const vd = [0, 1, 2, 3].map(p => [0, 1, 2, 3].map(() => p > 0 && rand() < 0.35 ? 1 : 0));
    const all = []; (function rec(p, left, acc) { if (p === 4) { all.push(acc.join(' | ')); return; } const can = left.filter(c => !vd[p][suitOf(c)]);
      (function pick(i, chosen) { if (chosen.length === lens[p]) { rec(p + 1, left.filter(c => !chosen.includes(c)), acc.concat([chosen.slice().sort((a, b) => a - b).join('.')])); return; } for (let j = i; j < can.length; j++) pick(j + 1, chosen.concat([can[j]])); })(0, []); })(1, un, []);
    if (all.length < 2 || all.length > 400) continue; cases++;
    const N = 150 * all.length, cnt = {}; for (let i = 0; i < N; i++) { const h = M.dealHidden(un, lens, vd, P, rand, 0), k = h.slice(1).map(x => x.slice().sort((a, b) => a - b).join('.')).join(' | '); cnt[k] = (cnt[k] || 0) + 1; }
    for (const k of all) { const d = Math.abs((cnt[k] || 0) - 150) / Math.sqrt(150); if (d > worstAll) worstAll = d; if (!cnt[k]) zero++; }
    for (const k in cnt) if (!all.includes(k)) { zero += 1000; } }
  ok(cases >= 10 && zero === 0 && worstAll < 5, cases + ' small random cases counted in full: every deal that fits comes up, none that does not, largest departure ' + worstAll.toFixed(1) + ' standard errors'); }
console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
