/* node discard_sum.js d_PxN.jsonl ...   - reads discard.js rows and prints, per table: the overall result, a grid of
   singleton rank against the doubleton's top card (dollars gained by throwing the singleton rather than the top of
   the doubleton, averaged over the doubleton's low card), the same in make %, and the effect of the low card. */
const fs = require('fs'), R = ['', '', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
for (const f of process.argv.slice(2)) { if (!fs.existsSync(f)) continue; const rows = fs.readFileSync(f, 'utf8').trim().split('\n').filter(x => x[0] === '{').map(JSON.parse); if (!rows.length) continue;
  const P = rows[0].P, n = rows[0].n, K = rows.reduce((a, r) => a + r.k, 0), sum = (g, fn) => g.reduce((a, r) => a + fn(r), 0);
  const stat = g => { const k = sum(g, r => r.k), d = sum(g, r => r.d) / k, v = sum(g, r => r.d2) / k - d * d; return { k, d, ci: 1.96 * Math.sqrt(Math.max(v, 0) / k), ms: 100 * sum(g, r => r.made[0]) / k, mh: 100 * sum(g, r => r.made[1]) / k, ml: 100 * sum(g, r => r.made[2]) / k }; };
  const all = stat(rows); console.log('\n=== ' + P + ' players, ' + n + ' cards (' + K + ' deals, ' + rows.length + ' holdings) ===');
  console.log('all holdings: throw the singleton makes ' + all.ms.toFixed(1) + '%, throw the top of the doubleton ' + all.mh.toFixed(1) + '%, throw its low card ' + all.ml.toFixed(1) + '% | singleton minus top: $' + all.d.toFixed(2) + ' ±' + all.ci.toFixed(2));
  for (const [title, val] of [['dollars gained by throwing the singleton rather than the top of the doubleton', x => (x.d >= 0 ? '+' : '') + x.d.toFixed(1)], ['make % gained', x => ((x.ms - x.mh) >= 0 ? '+' : '') + (x.ms - x.mh).toFixed(0)]]) {
    console.log('\n' + title + '   (rows: singleton; columns: top card of the doubleton)');
    console.log('      ' + [3,4,5,6,7,8,9,10,11,12,13,14].map(h => R[h].padStart(6)).join(''));
    for (let s = 2; s <= 14; s++) console.log(R[s].padStart(4) + '  ' + [3,4,5,6,7,8,9,10,11,12,13,14].map(h => { const g = rows.filter(r => r.s === s && r.h === h); return g.length ? val(stat(g)).padStart(6) : '      '; }).join('')); }
  // the low card: doubletons that touch (l = h-1), one apart, and wide (l at least 4 below)
  console.log('\nby the doubleton\'s shape (singleton minus top, dollars; make % for singleton / top):');
  for (const [name, fn] of [['touching (9-8)', r => r.h - r.l === 1], ['one between (9-7)', r => r.h - r.l === 2], ['two or three between', r => r.h - r.l >= 3 && r.h - r.l <= 4], ['wide (low card 5+ below)', r => r.h - r.l >= 5]]) { const g = rows.filter(fn), x = stat(g); console.log('  ' + name.padEnd(26) + (x.d >= 0 ? '+' : '') + x.d.toFixed(2) + ' ±' + x.ci.toFixed(2) + '   ' + x.ms.toFixed(1) + '% / ' + x.mh.toFixed(1) + '%'); }
  console.log('by which card is bigger:');
  for (const [name, fn] of [['singleton below the doubleton\'s low card', r => r.s < r.l], ['singleton between the two', r => r.s > r.l && r.s < r.h], ['singleton above the top', r => r.s > r.h], ['singleton equal to the low card', r => r.s === r.l], ['singleton equal to the top', r => r.s === r.h]]) { const g = rows.filter(fn); if (!g.length) continue; const x = stat(g); console.log('  ' + name.padEnd(42) + (x.d >= 0 ? '+' : '') + x.d.toFixed(2) + ' ±' + x.ci.toFixed(2) + '   ' + x.ms.toFixed(1) + '% / ' + x.mh.toFixed(1) + '%'); }
  const m = rows.find(r => r.s === 6 && r.h === 9 && r.l === 7); if (m) { const x = stat([m]); console.log('Matt\'s holding (lone 6, 9-7): singleton minus top $' + x.d.toFixed(2) + ' ±' + x.ci.toFixed(2) + ' | makes ' + x.ms.toFixed(0) + '% / ' + x.mh.toFixed(0) + '% / low ' + x.ml.toFixed(0) + '%'); } }
