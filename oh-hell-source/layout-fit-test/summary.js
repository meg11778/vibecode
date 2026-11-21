/* node summary.js   - prints the results so far from results.jsonl */
const fs = require('fs'), path = require('path'), f = path.join(__dirname, 'results.jsonl');
if (!fs.existsSync(f)) { console.log('no results yet'); process.exit(); }
const rows = fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
const NAMES = ['A today (fill up)', 'B fitted only', 'C fitted only, at least 60', 'D ten times the search'];
const sg = x => (x >= 0 ? '+' : '') + x.toFixed(3);
const st = v => { const N = v.length, m = v.reduce((x, y) => x + y, 0) / N, s2 = v.reduce((x, y) => x + (y - m) * (y - m), 0) / N; return sg(m) + ' ±' + (1.96 * Math.sqrt(s2 / N)).toFixed(3); };
const R = {}, all = { o: NAMES.map(() => []), sec: NAMES.map(() => 0), lay: NAMES.map(() => 0), dec: NAMES.map(() => 0) };
for (const r of rows) { const k = r.P + ':' + r.n, a = R[k] = R[k] || { P: r.P, n: r.n, o: NAMES.map(() => []), sec: NAMES.map(() => 0), lay: NAMES.map(() => 0), dec: NAMES.map(() => 0) };
  for (const t of [a, all]) r.diffs.forEach((v, i) => { for (const x of v) t.o[i].push(x); t.sec[i] += r.seconds[i]; t.lay[i] += r.layouts[i]; t.dec[i] += r.decisions[i]; }); }
const show = (title, a) => { console.log(title + '  (' + a.o[0].length + ' deals)');
  console.log('  ' + NAMES[0].padEnd(28) + 'over the plain network ' + st(a.o[0]) + ' | ' + Math.round(a.lay[0] / a.dec[0]) + ' layouts and ' + (1000 * a.sec[0] / a.dec[0]).toFixed(0) + ' ms a choice');
  for (let i = 1; i < NAMES.length; i++) console.log('  ' + NAMES[i].padEnd(28) + 'minus A ' + st(a.o[i].map((x, j) => x - a.o[0][j])) + ' | ' + Math.round(a.lay[i] / a.dec[i]) + ' layouts, ' + (a.sec[i] / a.sec[0]).toFixed(1) + ' times the time'); };
for (const a of Object.values(R).sort((x, y) => x.P - y.P || x.n - y.n)) show(a.P + ' players ' + a.n + ' cards', a);
show('ALL SIZES', all);
