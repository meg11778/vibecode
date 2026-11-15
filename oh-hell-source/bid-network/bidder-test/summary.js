/* node summary.js   - prints the tables so far from results.jsonl */
const fs = require('fs'), path = require('path'), A = {}, R = {};
for (const l of fs.readFileSync(path.join(__dirname, 'results.jsonl'), 'utf8').split('\n')) { if (!l.trim()) continue; const r = JSON.parse(l), k = r.P + ':' + r.n;
  if (r.kind === 'read') { const a = R[k] = R[k] || { P: r.P, n: r.n, d: r.diffs.map(() => []) }; r.diffs.forEach((v, i) => a.d[i].push(...v)); continue; }
  const a = A[k] = A[k] || { P: r.P, n: r.n, deals: 0, modes: r.modes, S: r.S.map(() => ({ m: 0, d: 0, d2: 0 })) };
  a.deals += r.deals; r.S.forEach((s, i) => { a.S[i].m += s.m; a.S[i].d += s.d; a.S[i].d2 += s.d2; }); }
const by = (x, y) => x.P - y.P || x.n - y.n, st = v => { const N = v.length, m = v.reduce((a, c) => a + c, 0) / N, s = Math.sqrt(v.reduce((a, c) => a + (c - m) * (c - m), 0) / N / N); return (m >= 0 ? '+' : '') + m.toFixed(3) + ' ±' + (1.96 * s).toFixed(3); };
console.log('BIDDERS, dollars a deal against today\'s simulation');
for (const a of Object.values(A).sort(by)) console.log('  ' + a.P + ' players ' + String(a.n).padStart(2) + ' cards ' + String(a.deals).padStart(6) + ' deals | ' +
  a.modes.map((nm, i) => { const m = a.S[i].d / a.deals, ci = 1.96 * Math.sqrt((a.S[i].d2 / a.deals - m * m) / a.deals); return nm + ' ' + (m >= 0 ? '+' : '') + m.toFixed(3) + ' ±' + ci.toFixed(3); }).filter((x, i) => i !== 2).join(' | '));
console.log('CARD READING, dollars a deal over the plain network; then network picture against formula picture');
for (const a of Object.values(R).sort(by)) console.log('  ' + a.P + ' players ' + String(a.n).padStart(2) + ' cards ' + String(a.d[0].length).padStart(6) + ' deals | formula picture ' + st(a.d[0]) + ' | network picture ' + st(a.d[1]) + ' | difference ' + st(a.d[1].map((v, i) => v - a.d[0][i])));
