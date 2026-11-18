/* node aggregate.js results.jsonl out.json   - turns an overnight results file into the heat map's table
   (one entry per table size: money per seat with its 95% margin, contracts made %, average bid, points). */
const fs = require('fs'), A = {};
for (const l of fs.readFileSync(process.argv[2], 'utf8').split('\n')) { if (!l.trim()) continue; const r = JSON.parse(l), k = r.P + ':' + r.n, a = A[k] = A[k] || { P: r.P, n: r.n, deals: 0, mode: r.mode, over: 0, simDiff: 0, seats: r.seats.map(() => ({ m: 0, m2: 0, made: 0, bid: 0, pts: 0 })) };
  a.deals += r.deals; a.over += r.over; a.simDiff += r.simDiff || 0; r.seats.forEach((s, i) => { for (const f of ['m', 'm2', 'made', 'bid', 'pts']) a.seats[i][f] += s[f]; }); }
const out = Object.values(A).sort((x, y) => x.P - y.P || x.n - y.n).map(a => ({ P: a.P, n: a.n, deals: a.deals, mode: a.mode, over: a.over / a.deals, simDiff: a.simDiff / (a.deals * a.P),
  seats: a.seats.map(s => { const m = s.m / a.deals; return { ev: +m.toFixed(4), ci: +(1.96 * Math.sqrt((s.m2 / a.deals - m * m) / a.deals)).toFixed(4), made: +(100 * s.made / a.deals).toFixed(1), bid: +(s.bid / a.deals).toFixed(3), pts: +(s.pts / a.deals).toFixed(3) }; }) }));
fs.writeFileSync(process.argv[3], JSON.stringify(out));
for (const a of out) console.log(a.P + ' players ' + String(a.n).padStart(2) + ' cards ' + String(a.deals).padStart(6) + ' deals | ' + a.seats.map(s => (s.ev >= 0 ? '+' : '') + s.ev.toFixed(2)).join('  ') + ' | ±' + Math.max(...a.seats.map(s => s.ci)).toFixed(2));
