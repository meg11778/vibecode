/* Fit how sharply the network's scores predict a card-reading bot's play:  P(card) = (1-eps)·softmax(beta·score) + eps/legal
   node fit.js file...   Each line: {left, s:[network score of each legal card], k: index of the card played} */
const fs = require('fs'); let rows = [];
for (const f of process.argv.slice(2)) if (fs.existsSync(f)) rows = rows.concat(fs.readFileSync(f, 'utf8').trim().split('\n').filter(x => x[0] === '{').map(JSON.parse));
const N = rows.length; if (!N) { console.log('no rows'); process.exit(); }
const pr = (r, beta, eps) => { const mx = Math.max(...r.s); let tot = 0; for (const x of r.s) tot += Math.exp(beta * (x - mx)); return (1 - eps) * Math.exp(beta * (r.s[r.k] - mx)) / tot + eps / r.s.length; };
const ll = (beta, eps, R = rows) => R.reduce((a, r) => a + Math.log(pr(r, beta, eps)), 0) / R.length;
let best = null; for (let b = 0.1; b <= 6.001; b += 0.1) for (let e = 0; e <= 0.6001; e += 0.01) { const v = ll(b, e); if (!best || v > best.v) best = { b, e, v }; }
const top = rows.filter(r => r.s[r.k] >= Math.max(...r.s) - 1e-9).length;
console.log(N + ' decisions | the bot played the network\'s first choice ' + (100 * top / N).toFixed(1) + '%');
console.log('as published (beta 2, eps 0.02): log-likelihood per decision ' + ll(2, 0.02).toFixed(4));
console.log('best fit: beta ' + best.b.toFixed(1) + ', eps ' + best.e.toFixed(2) + ': ' + best.v.toFixed(4) + '   | uniform guess: ' + (rows.reduce((a, r) => a - Math.log(r.s.length), 0) / N).toFixed(4));
// error bar on the fit by resampling
let s = 7; const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const bs = [], es = []; for (let k = 0; k < 40; k++) { const R = rows.map(() => rows[(rnd() * N) | 0]); let bb = null; for (let b = Math.max(0.1, best.b - 1); b <= best.b + 1.001; b += 0.1) for (let e = Math.max(0, best.e - 0.15); e <= best.e + 0.1501; e += 0.01) { const v = ll(b, e, R); if (!bb || v > bb.v) bb = { b, e, v }; } bs.push(bb.b); es.push(bb.e); }
const rg = a => { a.sort((x, y) => x - y); return a[1].toFixed(2) + ' to ' + a[a.length - 2].toFixed(2); };
console.log('  resampled 40 times: beta ' + rg(bs) + ', eps ' + rg(es));
// how the published setting's confidence compares with what happened: plays it gave under 5%, 5-20%, ...
for (const [name, b, e] of [['published', 2, 0.02], ['best fit', best.b, best.e]]) { const bins = [0, 0.02, 0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 0.95, 1.0001], cnt = bins.map(() => 0), hit = bins.map(() => 0), sum = bins.map(() => 0);
  for (const r of rows) for (let j = 0; j < r.s.length; j++) { const p = pr({ s: r.s, k: j }, b, e); let i = 0; while (p >= bins[i + 1]) i++; cnt[i]++; sum[i] += p; if (j === r.k) hit[i]++; }
  console.log(name + ': predicted chance of a card -> how often it was played'); for (let i = 0; i < bins.length - 1; i++) if (cnt[i]) console.log('   ' + (100 * sum[i] / cnt[i]).toFixed(1).padStart(5) + '% -> ' + (100 * hit[i] / cnt[i]).toFixed(1).padStart(5) + '%   (' + cnt[i] + ' cards)'); }
// by stage of the hand
const byL = {}; for (const r of rows) { const g = r.s.length; (byL[g] = byL[g] || []).push(r); }
console.log('by number of legal cards: ' + Object.keys(byL).map(g => g + ': first choice ' + (100 * byL[g].filter(r => r.s[r.k] >= Math.max(...r.s) - 1e-9).length / byL[g].length).toFixed(0) + '% (' + byL[g].length + ')').join(' | '));
