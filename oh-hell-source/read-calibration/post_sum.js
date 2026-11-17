/* Summary of post_calib.js: does the reading's chance that a seat holds a suit match how often it does? */
const fs = require('fs'); let rows = [];
for (const f of process.argv.slice(2)) if (fs.existsSync(f)) rows = rows.concat(fs.readFileSync(f, 'utf8').trim().split('\n').filter(x => x[0] === '{').map(JSON.parse));
const R = rows.filter(r => 'y' in r), D = rows.filter(r => 'ty' in r);
const tab = (name, S, key) => { if (!S.length) return; const edges = [0, 0.05, 0.15, 0.3, 0.5, 0.7, 0.85, 0.95, 1.0001]; console.log(name + ' (' + S.length + ' cases)');
  for (let i = 0; i < edges.length - 1; i++) { const B = S.filter(r => r[key] >= edges[i] && r[key] < edges[i + 1]); if (B.length < 20) continue; const p = B.reduce((a, r) => a + r[key], 0) / B.length, y = B.reduce((a, r) => a + r.y, 0) / B.length;
    console.log('   said ' + (100 * p).toFixed(0).padStart(3) + '%  held it ' + (100 * y).toFixed(0).padStart(3) + '% ±' + (196 * Math.sqrt(Math.max(y * (1 - y), 0.0001) / B.length)).toFixed(0) + '   (' + B.length + ')'); }
  const cl = p => Math.min(0.995, Math.max(0.005, p)), ls = k => S.reduce((a, r) => a + (r.y ? Math.log(cl(r[k])) : Math.log(1 - cl(r[k]))), 0) / S.length;
  console.log('   score (log, higher is better): reading ' + ls('p').toFixed(4) + ' | bids alone ' + ls('p0').toFixed(4)); };
tab('All seats and suits, the reading', R, 'p'); tab('All, bids alone', R, 'p0');
const TH = R.filter(r => r.th); tab('The seat has thrown a card of that suit earlier: the reading', TH, 'p'); tab('Same cases, bids alone', TH, 'p0');
if (TH.length) console.log('   thrown-suit cases overall: reading says ' + (100 * TH.reduce((a, r) => a + r.p, 0) / TH.length).toFixed(1) + '%, bids alone ' + (100 * TH.reduce((a, r) => a + r.p0, 0) / TH.length).toFixed(1) + '%, truth ' + (100 * TH.reduce((a, r) => a + r.y, 0) / TH.length).toFixed(1) + '%');
for (const ty of ['lead', 'follow', 'throw']) { const S = D.filter(r => r.ty === ty); if (!S.length) continue;
  const pr = (r, beta, eps) => { const mx = Math.max(...r.s); let tot = 0; for (const x of r.s) tot += Math.exp(beta * (x - mx)); return (1 - eps) * Math.exp(beta * (r.s[r.k] - mx)) / tot + eps / r.s.length; };
  const ll = (b, e) => S.reduce((a, r) => a + Math.log(pr(r, b, e)), 0) / S.length; let best = null; for (let b = 0.1; b <= 6.001; b += 0.1) for (let e = 0; e <= 0.6001; e += 0.01) { const v = ll(b, e); if (!best || v > best.v) best = { b, e, v }; }
  console.log(ty + ': ' + S.length + ' choices, network first choice played ' + (100 * S.filter(r => r.s[r.k] >= Math.max(...r.s) - 1e-9).length / S.length).toFixed(0) + '% | published ' + ll(2, 0.02).toFixed(4) + ' | best beta ' + best.b.toFixed(1) + ' eps ' + best.e.toFixed(2) + ' ' + best.v.toFixed(4)); }
