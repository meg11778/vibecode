const fs = require('fs');
for (const n of [8, 11]) { const f = `res_${n}.txt`; if (!fs.existsSync(f)) continue;
  const rows = fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); if (!rows.length) continue;
  const tot = { rn: [0, 0], pn: [0, 0], rp: [0, 0] }; let deals = 0, hitR = 0, hitP = 0, hitN = 0, ess = 0, mk = [0, 0, 0];
  for (const r of rows) { deals += r.deals; for (const k in tot) { tot[k][0] += r.S[k][0]; tot[k][1] += r.S[k][1]; } hitR += r.hitR; hitP += r.hitP; hitN += r.hitN; ess += r.essSum; r.mk.forEach((v, i) => mk[i] += v); }
  const f2 = a => { const m = a[0] / deals, se = Math.sqrt(Math.max(a[1] / deals - m * m, 0) / deals); return `${m >= 0 ? '+' : ''}${m.toFixed(3)} ±${(1.96 * se).toFixed(3)}`; };
  console.log(`${n} cards, ${deals} deals | reader over plain teacher ${f2(tot.rp)} | reader over network ${f2(tot.rn)} | plain teacher over network ${f2(tot.pn)} | made: net ${(100 * mk[0] / deals).toFixed(1)}% plain ${(100 * mk[1] / deals).toFixed(1)}% reader ${(100 * mk[2] / deals).toFixed(1)}% | cards placed right: plain ${(hitP / hitN).toFixed(3)} reader ${(hitR / hitN).toFixed(3)} | ess ${(ess / hitN).toFixed(0)}`); }
