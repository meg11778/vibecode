/* node summary.js   - prints the results so far from results.jsonl */
const fs = require('fs'), path = require('path'), f = path.join(__dirname, 'results.jsonl');
if (!fs.existsSync(f)) { console.log('no results yet'); process.exit(); }
const rows = fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
const sg = x => (x >= 0 ? '+' : '') + x.toFixed(3);
console.log('TEST 1  bids: simulation with bidding network 2 as its picture, minus the same with network 1 (dollars a deal)');
const B = {}; for (const r of rows) if (r.kind === 'bid') { const k = r.P + ':' + r.n, a = B[k] = B[k] || { P: r.P, n: r.n, deals: 0, d: 0, d2: 0, differ: 0, up: 0 }; a.deals += r.deals; a.d += r.d; a.d2 += r.d2; a.differ += r.differ; a.up += r.up; }
let T = { deals: 0, d: 0, d2: 0 };
for (const a of Object.values(B).sort((x, y) => x.P - y.P || x.n - y.n)) { const m = a.d / a.deals; T.deals += a.deals; T.d += a.d; T.d2 += a.d2;
  console.log('  ' + a.P + ' players ' + String(a.n).padStart(2) + ' cards ' + String(a.deals).padStart(7) + ' deals | bids differ ' + (100 * a.differ / a.deals).toFixed(1).padStart(4) + '% (network 2 higher ' + (a.differ ? (100 * a.up / a.differ).toFixed(0) : '-') + '%) | ' + sg(m) + ' ±' + (1.96 * Math.sqrt((a.d2 / a.deals - m * m) / a.deals)).toFixed(3)); }
if (T.deals) { const m = T.d / T.deals; console.log('  all sizes ' + T.deals + ' deals | ' + sg(m) + ' ±' + (1.96 * Math.sqrt((T.d2 / T.deals - m * m) / T.deals)).toFixed(3)); }
console.log('\nTEST 2  card reading in one seat at a table of simulation bidders (dollars a deal, same deals)');
const R = {}; for (const r of rows) if (r.kind === 'read') { const k = r.P + ':' + r.n, a = R[k] = R[k] || { P: r.P, n: r.n, o: r.modes.map(() => []) }; r.diffs.forEach((v, i) => { for (const x of v) a.o[i].push(x); }); }
const st = v => { const N = v.length, m = v.reduce((x, y) => x + y, 0) / N, s2 = v.reduce((x, y) => x + (y - m) * (y - m), 0) / N; return sg(m) + ' ±' + (1.96 * Math.sqrt(s2 / N)).toFixed(3); };
const all = [[], []];
for (const a of Object.values(R).sort((x, y) => x.P - y.P || x.n - y.n)) { const N = a.o[0].length, c4 = a.o[1].map((x, i) => x - a.o[0][i]), n2 = a.o[2].map((x, i) => x - a.o[0][i]); all[0].push(...c4); all[1].push(...n2);
  console.log('  ' + a.P + ' players ' + String(a.n).padStart(2) + ' cards ' + String(N).padStart(6) + ' deals | reading over plain network ' + st(a.o[0]) + ' | up to 4 batches minus 1 batch ' + st(c4) + ' | network 2 picture minus network 1 ' + st(n2)); }
if (all[0].length) console.log('  all sizes ' + all[0].length + ' deals | up to 4 batches minus 1 batch ' + st(all[0]) + ' | network 2 picture minus network 1 ' + st(all[1]));
