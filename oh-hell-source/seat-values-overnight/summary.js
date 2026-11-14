/* node summary.js   - prints the table so far from results.jsonl */
const fs = require('fs'), path = require('path'), A = {};
for (const l of fs.readFileSync(path.join(__dirname, 'results.jsonl'), 'utf8').split('\n')) { if (!l.trim()) continue; const r = JSON.parse(l), k = r.P + ':' + r.n, a = A[k] = A[k] || { P: r.P, n: r.n, deals: 0, seats: r.seats.map(() => ({ m: 0, m2: 0, made: 0 })) };
  a.deals += r.deals; r.seats.forEach((s, i) => { a.seats[i].m += s.m; a.seats[i].m2 += s.m2; a.seats[i].made += s.made; }); }
for (const a of Object.values(A).sort((x, y) => x.P - y.P || x.n - y.n)) console.log(a.P + ' players ' + String(a.n).padStart(2) + ' cards ' + String(a.deals).padStart(6) + ' deals | ' +
  a.seats.map(s => { const m = s.m / a.deals; return (m >= 0 ? '+' : '') + m.toFixed(2); }).join('  ') + ' | ±' + Math.max(...a.seats.map(s => 1.96 * Math.sqrt((s.m2 / a.deals - (s.m / a.deals) ** 2) / a.deals))).toFixed(2));
