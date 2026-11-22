/* node summary.js   - prints the results so far from results.jsonl */
const fs = require('fs'), path = require('path'), f = path.join(__dirname, 'results.jsonl');
if (!fs.existsSync(f)) { console.log('no results yet'); process.exit(); }
const rows = fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
const sg = x => (x >= 0 ? '+' : '') + x.toFixed(2), ci = (d, d2, k) => { const m = d / k; return sg(m) + ' ±' + (1.96 * Math.sqrt(Math.max(0, d2 / k - m * m) / k)).toFixed(2); };
const R = {};
for (const r of rows) { const a = R[r.P + ':' + r.n] = R[r.P + ':' + r.n] || { P: r.P, n: r.n, seats: null }; if (!a.seats) a.seats = r.bySeat.map(() => ({})); r.bySeat.forEach((g, i) => { for (const k in g) a.seats[i][k] = (a.seats[i][k] || 0) + g[k]; }); }
for (const a of Object.values(R)) { const tot = {}; a.seats.forEach(g => { for (const k in g) tot[k] = (tot[k] || 0) + g[k]; });
  console.log('\n' + a.P + ' players ' + a.n + ' cards, ' + tot.k + ' deals (dollars a deal, one seat)');
  const line = (name, g) => console.log('  ' + name.padEnd(12) + String(g.k).padStart(5) + ' | calculator (formula picture) minus bot ' + ci(g.fb, g.fb2, g.k) + ' (differ ' + (100 * g.fbDiffer / g.k).toFixed(0) + '%) | calculator (network picture) minus bot ' + ci(g.nb, g.nb2, g.k) + ' (differ ' + (100 * g.nbDiffer / g.k).toFixed(0) + '%) | network minus formula ' + ci(g.nf, g.nf2, g.k)
    + ' | mean bid: bot ' + (g.bidB / g.k).toFixed(2) + ', formula ' + (g.bidF / g.k).toFixed(2) + ', network ' + (g.bidN / g.k).toFixed(2) + ' | still thin after 6,000 deals: ' + (100 * g.thinF / g.k).toFixed(0) + '% / ' + (100 * g.thinN / g.k).toFixed(0) + '%');
  a.seats.forEach((g, i) => line(i === a.P - 1 ? 'dealer' : 'seat ' + (i + 1), g)); line('all seats', tot); }
