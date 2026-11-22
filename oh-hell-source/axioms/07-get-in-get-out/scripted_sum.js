/* node scripted_sum.js s_F2_4.json ...   prints each run's summary */
const fs = require('fs'), f2 = x => (x >= 0 ? '+' : '') + x.toFixed(2), pc = (x, k) => (100 * x / k).toFixed(1).padStart(5) + '%', TITLE = { F2: 'hand 2 (clubs A-2, bid 2), diamond led', L1: 'hand 1 (clubs 3-2, bid 1) on opening lead', L2: 'hand 2 (clubs A-2, bid 2) on opening lead' };
for (const f of process.argv.slice(2)) { const t = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log(`\n===== ${TITLE[t.SC]}: ${t.P} players, 7 cards, ${t.used} deals. The bidding network's own bid is ${t.BID} on ${pc(t.netBid, t.used).trim()} =====`);
  for (const k of ['under by 2 or more', 'under by 1', 'over by 1', 'over by 2 or more']) { const g = t.G[k]; if (!g || g.k < 300) continue; console.log(`\n${k} (${g.k} deals)`);
    console.log('   line                                 money     made    over   short   first line beats it by');
    t.LINES.forEach((l, i) => { const md = g.d[i] / g.k, se = Math.sqrt((g.d2[i] / g.k - md * md) / g.k); console.log('   ' + l.padEnd(35) + f2(g.m[i] / g.k).padStart(7) + '  ' + pc(g.made[i], g.k) + ' ' + pc(g.over[i], g.k) + '  ' + pc(g.short[i], g.k) + '   ' + (i ? f2(md) + ' +/-' + (2 * se).toFixed(2) : '')); });
    console.log('   plain network plays first: ' + Object.entries(g.net).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, v]) => c + ' ' + pc(v, g.k).trim()).join(', ')); } }
