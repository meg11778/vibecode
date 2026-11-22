/* node general_sum.js gen_4x7.json ... */
const fs = require('fs'), f2 = x => (x >= 0 ? '+' : '') + x.toFixed(2), pc = (x, k) => (100 * x / k).toFixed(1).padStart(5) + '%';
for (const f of process.argv.slice(2)) { const t = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log(`\n===== ${t.P} players, ${t.n} cards: ${t.deals} deals, ${t.under} underbid, ${t.found} with a take-now-or-later moment =====`);
  console.log('\nA. A seat that has exactly made, spare tricks still out, at the start of a trick');
  console.log('   cards left      ON LEAD: count  takes this trick  finishes over  |  NOT ON LEAD: count  takes this trick  finishes over');
  for (const tb of ['7+', '6', '5', '4', '3', '2', '1', 'all']) { const k = tb === 'all' ? 'all' : tb + ' cards left', x = t.A['on lead | ' + k], y = t.A['not on lead | ' + k]; if (!x || !y || x.k < 100) continue;
    console.log('   ' + tb.padEnd(10) + String(x.k).padStart(18) + pc(x.tookThis, x.k).padStart(14) + pc(x.over, x.k).padStart(16) + '     |' + String(y.k).padStart(19) + pc(y.tookThis, y.k).padStart(14) + pc(y.over, y.k).padStart(16)); }
  console.log('\nB. Take now or later (money for the seat; +/- two standard errors)');
  console.log('   group                                                                                moments  TAKE ALL minus DUCK   made: take / duck    over: take / duck   short: take / duck   network takes');
  const order = k => k === 'all' ? 0 : k.split('|').length === 3 ? 8 : k.startsWith('SAFE') ? 7 : k.startsWith('rest of hand') ? (k.includes('|') ? 6 : 5) : k.startsWith('cards left') ? 1 : k.startsWith('needs') ? 2 : k.includes('|') ? 4 : 3;
  for (const k of Object.keys(t.B).sort((a, b) => order(a) - order(b) || b.localeCompare(a))) { const g = t.B[k]; if (g.k < 200) continue; const md = g.d / g.k, se = Math.sqrt((g.d2 / g.k - md * md) / g.k);
    console.log('   ' + k.padEnd(84) + String(g.k).padStart(7) + ('  ' + f2(md) + ' +/-' + (2 * se).toFixed(2)).padEnd(22) + (pc(g.made[0], g.k) + ' /' + pc(g.made[2], g.k)).padStart(18) + (pc(g.over[0], g.k) + ' /' + pc(g.over[2], g.k)).padStart(20) + (pc(g.short[0], g.k) + ' /' + pc(g.short[2], g.k)).padStart(20) + pc(g.netTake, g.k).padStart(12)); }
  const g = t.B['needs 2 or more']; if (g) { const md = g.d1 / g.k, se = Math.sqrt((g.d12 / g.k - md * md) / g.k); console.log('   needing 2 or more: TAKE ALL minus TAKE ONE ' + f2(md) + ' +/-' + (2 * se).toFixed(2)); } }
