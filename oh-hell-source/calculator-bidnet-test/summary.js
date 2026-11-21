/* node summary.js   - prints the results so far from results.jsonl */
const fs = require('fs'), path = require('path'), f = path.join(__dirname, 'results.jsonl');
if (!fs.existsSync(f)) { console.log('no results yet'); process.exit(); }
const rows = fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
const sg = x => (x >= 0 ? '+' : '') + x.toFixed(3), ci = (d, d2, k) => { const m = d / k; return sg(m) + ' ±' + (1.96 * Math.sqrt(Math.max(0, d2 / k - m * m) / k)).toFixed(3); };
const R = {}, T = { k: 0, differ: 0, up: 0, d: 0, d2: 0, vsBot: 0, vsBot2: 0, botDiffer: 0 };
for (const r of rows) { const a = R[r.P + ':' + r.n] = R[r.P + ':' + r.n] || { P: r.P, n: r.n, k: 0, differ: 0, up: 0, d: 0, d2: 0, vsBot: 0, vsBot2: 0, botDiffer: 0 }; for (const t of [a, T]) for (const key of ['k', 'differ', 'up', 'd', 'd2', 'vsBot', 'vsBot2', 'botDiffer']) t[key] += r[key]; }
console.log('Calculator with the bidding-network picture minus calculator with the formula picture (dollars a deal, one seat)');
const line = (name, a) => console.log('  ' + name.padEnd(22) + String(a.k).padStart(6) + ' deals | bids differ ' + (100 * a.differ / a.k).toFixed(1).padStart(4) + '% (network picture higher ' + (a.differ ? (100 * a.up / a.differ).toFixed(0) : '-') + '%) | ' + ci(a.d, a.d2, a.k) + ' | against the game bot\'s own bid ' + ci(a.vsBot, a.vsBot2, a.k) + ' (differs ' + (100 * a.botDiffer / a.k).toFixed(0) + '%)');
for (const a of Object.values(R).sort((x, y) => x.P - y.P || x.n - y.n)) line(a.P + ' players ' + String(a.n).padStart(2) + ' cards', a);
line('all sizes', T);
