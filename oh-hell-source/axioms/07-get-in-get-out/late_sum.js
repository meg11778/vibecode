/* node late_sum.js late_4x7.json ... */
const fs = require('fs'), f2 = x => (x >= 0 ? '+' : '') + x.toFixed(2), pc = (x, k) => (100 * x / k).toFixed(1).padStart(5) + '%', MIN = +(process.env.MIN || 150);
for (const f of process.argv.slice(2)) { const t = JSON.parse(fs.readFileSync(f, 'utf8')); console.log(`\n===== ${t.P} players, ${t.n} cards: ${t.deals} deals, ${t.under} underbid =====`);
  console.log('\nKNUCKLE (K on lead with a trump; V holds the lone top trump and needs one)');
  console.log('   group                                  moments   K: knuckle minus other   K makes: kn / other   V goes over: kn / other   V makes: kn / other   each other seat makes   network leads a trump   card-reading bot');
  for (const k of Object.keys(t.KG).sort()) { const g = t.KG[k]; if (g.k < MIN) continue; const md = g.d / g.k, se = Math.sqrt((g.d2 / g.k - md * md) / g.k);
    console.log('   ' + k.padEnd(38) + String(g.k).padStart(7) + ('   ' + f2(md) + ' +/-' + (2 * se).toFixed(2)).padEnd(26) + (pc(g.kMade[0], g.k) + ' /' + pc(g.kMade[1], g.k)).padEnd(22) + (pc(g.vOver[0], g.k) + ' /' + pc(g.vOver[1], g.k)).padEnd(26) + (pc(g.vMade[0], g.k) + ' /' + pc(g.vMade[1], g.k)).padEnd(22) + (pc(g.others[0], g.k) + ' /' + pc(g.others[1], g.k)).padEnd(24) + pc(g.netTrump, g.k).padEnd(24) + (g.rk ? pc(g.readTrump, g.rk) + ' of ' + g.rk : '')); }
  console.log('\nZOMBIE TRUMPS (holds every remaining trump and needs exactly that many)');
  console.log('   group                         moments   makes: WAIT / CASH / NET        goes over: WAIT / CASH / NET     WAIT minus CASH      WAIT minus NET');
  for (const k of Object.keys(t.ZG).sort()) { const g = t.ZG[k]; if (g.k < MIN) continue; const md = g.d / g.k, se = Math.sqrt((g.d2 / g.k - md * md) / g.k), mn = g.dn / g.k, sn = Math.sqrt((g.dn2 / g.k - mn * mn) / g.k);
    console.log('   ' + k.padEnd(29) + String(g.k).padStart(7) + '   ' + g.made.map(x => pc(x, g.k)).join(' /').padEnd(32) + g.over.map(x => pc(x, g.k)).join(' /').padEnd(33) + (f2(md) + ' +/-' + (2 * se).toFixed(2)).padEnd(21) + f2(mn) + ' +/-' + (2 * sn).toFixed(2)); } }
