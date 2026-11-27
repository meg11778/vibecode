/* Reads key.js output:   node summary.js results/k_*.jsonl */
const fs = require('fs'), rows = [].concat(...process.argv.slice(2).map(f => fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)));
const pc = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-', mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1), se = a => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length / Math.max(1, a.length - 1)); };
const pm = a => (mean(a) >= 0 ? '+' : '') + mean(a).toFixed(3) + ' ±' + (2 * se(a)).toFixed(3);
const sizes = [...new Set(rows.map(r => r.P + 'p' + r.n))];
for (const sz of ['all'].concat(sizes)) {
  const R = rows.filter(r => sz === 'all' || r.P + 'p' + r.n === sz); if (!R.length) continue;
  console.log('\n=== ' + sz + ': ' + R.length + ' late decisions (one a deal), ' + R.filter(r => r.key.how === 'all').length + ' with every layout listed ===');
  // a decision "matters" when the key puts the second-best choice at least $0.25 behind, clear of the key's own noise
  const second = r => Math.min(...r.key.val.map((v, g) => g === r.key.best ? Infinity : r.key.val[r.key.best] - v)), clear = r => { const g2 = r.key.val.map((v, g) => g === r.key.best ? Infinity : r.key.val[r.key.best] - v); const k = g2.indexOf(Math.min(...g2)); return g2[k] >= 0.25 && g2[k] > 3 * r.key.gapSe[k]; };
  const mat = R.filter(clear);
  console.log('decisions where the key separates the best card by $0.25 or more: ' + mat.length + ' (' + pc(mat.length, R.length) + ')');
  // live reader
  const reg = r => r.reads.map(x => r.key.val[r.key.best] - r.key.val[x.g]);
  const allReg = R.map(r => mean(reg(r))), wrongMat = mat.map(r => r.reads.filter(x => x.g !== r.key.best).length / r.reads.length);
  console.log('LIVE READER: given up against the key, a late decision: $' + pm(allReg).replace('+', '') + '   (plain network\'s own play: $' + pm(R.map(r => r.playedRegret)).replace('+', '') + ')');
  console.log('  where it matters: picks another card ' + (100 * mean(wrongMat)).toFixed(1) + '% of the time, giving up $' + pm(mat.map(r => mean(reg(r)))).replace('+', '') + ' a decision; plain network wrong ' + pc(mat.filter(r => r.played !== r.key.best).length, mat.length));
  const byEss = [[0, 10], [10, 30], [30, 1e9]];
  for (const [lo, hi] of byEss) { let n = 0, w = 0, rg = 0, stop1 = 0; for (const r of mat) for (const x of r.reads) if (x.ess >= lo && x.ess < hi) { n++; if (x.g !== r.key.best) w++; rg += r.key.val[r.key.best] - r.key.val[x.g]; if (x.rounds === 1) stop1++; }
    console.log('    reads carried by ' + lo + ' to ' + (hi > 1e8 ? 'more' : hi) + ' layouts: ' + n + ' reads, wrong ' + pc(w, n) + ', $' + (n ? (rg / n).toFixed(3) : '-') + ' given up, stopped after one batch ' + pc(stop1, n)); }
  // report
  let n = 0, falseM = 0, falseMaj = 0, fine = 0, missed = 0, real = 0, close = 0; const bias = [], biasLevel = [], err = [];
  for (const r of R) { const tc = r.playedRegret, tse = r.key.gapSe[r.played] || 0;
    for (const x of r.reps) { n++; bias.push(x.cost - tc); err.push(Math.abs(x.cost - tc)); if (tc < 0.05) biasLevel.push(x.cost);
      const flagged = x.verdict === 'minor' || x.verdict === 'major';
      if (tc + 3 * tse < 0.25) { fine++; if (flagged) falseM++; if (x.verdict === 'major') falseMaj++; }
      if (tc - 3 * tse >= 0.25) { real++; if (x.verdict === 'ok') missed++; if (x.verdict === 'close') close++; } } }
  console.log('REPORT (160 layouts, judging the card the network played; ' + n + ' reports):');
  console.log('  reported cost minus the key\'s: $' + pm(bias) + '; typical miss $' + mean(err).toFixed(3) + '; where the played card is really the best or level, reported cost averages $' + mean(biasLevel).toFixed(3) + ' (' + biasLevel.length + ')');
  console.log('  plays the key calls fine (cost under $0.25): ' + fine + ' reports, flagged as a mistake ' + pc(falseM, fine) + ' (major ' + pc(falseMaj, fine) + ')');
  console.log('  plays the key calls a mistake ($0.25 or more): ' + real + ' reports, passed as fine ' + pc(missed, real) + ', "too close to call" ' + pc(close, real));
  // against the deal as it really lay
  const kE = [], rE = [], kB = [], rB = [];
  for (const r of R) for (let g = 0; g < r.key.val.length; g++) { const t = r.truthVal[g]; kE.push((r.key.val[g] - t) ** 2); kB.push(r.key.val[g] - t); for (const x of r.reps) { rE.push((x.mean[g] - t) ** 2); rB.push(x.mean[g] - t); } }
  console.log('AGAINST THE REAL DEAL: key average error $' + pm(kB) + ', spread ' + Math.sqrt(mean(kE)).toFixed(2) + '; report average error $' + pm(rB).replace(/±.*/, '') + ', spread ' + Math.sqrt(mean(rE)).toFixed(2));
}
