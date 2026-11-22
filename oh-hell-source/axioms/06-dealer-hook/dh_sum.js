/* Reads dealer_hook.js output (one JSON line per hand) and prints the summary for axiom 6.
   node dh_sum.js dh_4x7_a.jsonl dh_4x7_b.jsonl
   Per hand:  D     = money bidding X+1 minus money bidding X-1 at the hooked table (same deals)
              tilt  = make rate of X at tables overbid by one minus make rate of X at tables underbid by one
              lean  = average tricks taken when bidding X (mean of the over and under tables) minus X
   +/- figures are two standard errors across hands. */
const fs = require('fs');
const L = process.argv.slice(2).flatMap(f => fs.readFileSync(f, 'utf8').trim().split('\n').flatMap(l => { try { return [JSON.parse(l)]; } catch (e) { return []; } }));
const MINK = +(process.env.MINK || 150);
const f2 = x => (x >= 0 ? '+' : '') + x.toFixed(2), pc = x => (100 * x).toFixed(1) + '%';
const stat = a => { const k = a.length, m = a.reduce((s, x) => s + x, 0) / k, v = a.reduce((s, x) => s + (x - m) * (x - m), 0) / Math.max(1, k - 1); return { k, m, se2: 2 * Math.sqrt(v / k) }; };
const show = a => { const s = stat(a); return f2(s.m) + ' +/-' + s.se2.toFixed(2); };
const hands = [];
for (const r of L) { const h = r.half, sum = (key, fld) => h[0][key][fld] + h[1][key][fld];
  const kh = sum('up', 'k'), ko = sum('over', 'k'), ku = sum('under', 'k'); if (kh < MINK || ko < MINK || ku < MINK) continue;
  const trump = (r.turned / 13) | 0, T = r.hand.filter(c => ((c / 13) | 0) === trump), side = r.hand.filter(c => ((c / 13) | 0) !== trump), rk = c => c % 13 + 2;
  const lens = [0, 1, 2, 3].filter(s => s !== trump).map(s => side.filter(c => ((c / 13) | 0) === s).length);
  const half = i => ({ D: h[i].d / h[i].up.k, tilt: h[i].over.made / h[i].over.k - h[i].under.made / h[i].under.k });
  hands.push({ r, X: r.X, kh, ko, ku, D: (h[0].d + h[1].d) / kh, half: [half(0), half(1)],
    mkOver: sum('over', 'made') / ko, mkUnder: sum('under', 'made') / ku, tilt: sum('over', 'made') / ko - sum('under', 'made') / ku,
    tiltMoney: sum('over', 'm') / ko - sum('under', 'm') / ku,
    lean: (sum('over', 'tricks') / ko + sum('under', 'tricks') / ku) / 2 - r.X,
    netLean: (h[0].netLean + h[1].netLean) / kh, netUp: (h[0].netUp + h[1].netUp) / kh,
    mkUp: sum('up', 'made') / kh, mkDown: sum('down', 'made') / kh, mUp: sum('up', 'm') / kh, mDown: sum('down', 'm') / kh,
    shortUp: sum('up', 'short') / kh, bustUp: sum('up', 'busts') / kh, bustDown: sum('down', 'busts') / kh,
    feat: { trumps: T.length, 'trump A-Q': T.filter(c => rk(c) >= 12).length, 'trump 9-J': T.filter(c => rk(c) >= 9 && rk(c) <= 11).length, 'trump 2-8': T.filter(c => rk(c) <= 8).length,
      'side aces': side.filter(c => rk(c) === 14).length, 'side kings': side.filter(c => rk(c) === 13).length, 'side Q-J': side.filter(c => rk(c) === 12 || rk(c) === 11).length,
      'side 7-10': side.filter(c => rk(c) >= 7 && rk(c) <= 10).length, 'side 2-6': side.filter(c => rk(c) <= 6).length, 'short suits (0-1)': lens.filter(x => x <= 1).length } });
}
const r0 = L[0]; console.log(`\n===== ${r0.P} players, ${r0.n} cards: ${hands.length} dealer hands kept of ${L.length} (need ${MINK}+ deals of each table) =====`);
console.log('average deals per hand: hooked ' + stat(hands.map(h => h.kh)).m.toFixed(0) + ', over ' + stat(hands.map(h => h.ko)).m.toFixed(0) + ', under ' + stat(hands.map(h => h.ku)).m.toFixed(0));
console.log('forbidden bid X: ' + [...new Set(hands.map(h => h.X))].sort((a, b) => a - b).map(x => x + ' (' + hands.filter(h => h.X === x).length + ')').join(', '));
console.log('\n1. Whole sample');
console.log('   money X+1 ' + show(hands.map(h => h.mUp)) + ', X-1 ' + show(hands.map(h => h.mDown)) + ';  up minus down ' + show(hands.map(h => h.D)));
console.log('   makes: X+1 ' + pc(stat(hands.map(h => h.mkUp)).m) + ', X-1 ' + pc(stat(hands.map(h => h.mkDown)).m) + ';  X when over ' + pc(stat(hands.map(h => h.mkOver)).m) + ', X when under ' + pc(stat(hands.map(h => h.mkUnder)).m));
console.log('   opponents busted: bidding up ' + stat(hands.map(h => h.bustUp)).m.toFixed(2) + ', bidding down ' + stat(hands.map(h => h.bustDown)).m.toFixed(2));
console.log('   tilt ' + show(hands.map(h => h.tilt)) + ' (share of hands with tilt > 0: ' + pc(hands.filter(h => h.tilt > 0).length / hands.length) + ')');
const bins = (key, q, label) => { const s = hands.slice().sort((a, b) => a[key] - b[key]); console.log('\n' + label);
  for (let i = 0; i < q; i++) { const g = s.slice(Math.floor(i * s.length / q), Math.floor((i + 1) * s.length / q));
    console.log('   ' + key + ' ' + f2(g[0][key]).padStart(6) + ' to ' + f2(g[g.length - 1][key]).padStart(6) + ' (' + String(g.length).padStart(3) + ' hands): up minus down ' + show(g.map(h => h.D)) + '   tilt ' + f2(stat(g.map(h => h.tilt)).m) + '  lean ' + f2(stat(g.map(h => h.lean)).m)); } };
bins('tilt', 5, '2. Hands in five groups by tilt (the axiom: up minus down should rise and cross zero near tilt 0)');
bins('lean', 5, '3. Hands in five groups by lean (how far the hand\'s tricks sit above or below X)');
// regression D ~ 1 + tilt + lean, ordinary least squares with standard errors
const ols = (ys, xs, names) => { const k = xs[0].length, A = Array.from({ length: k }, () => new Array(k).fill(0)), bv = new Array(k).fill(0);
  xs.forEach((x, i) => { for (let p = 0; p < k; p++) { bv[p] += x[p] * ys[i]; for (let q = 0; q < k; q++) A[p][q] += x[p] * x[q]; } });
  const inv = A.map((row, i) => row.concat(Array.from({ length: k }, (_, j) => +(i === j)))); for (let i = 0; i < k; i++) { let p = i; for (let j = i + 1; j < k; j++) if (Math.abs(inv[j][i]) > Math.abs(inv[p][i])) p = j; [inv[i], inv[p]] = [inv[p], inv[i]]; const d = inv[i][i]; for (let j = 0; j < 2 * k; j++) inv[i][j] /= d; for (let j = 0; j < k; j++) if (j !== i) { const f = inv[j][i]; for (let c = 0; c < 2 * k; c++) inv[j][c] -= f * inv[i][c]; } }
  const I = inv.map(row => row.slice(k)), beta = I.map(row => row.reduce((s, v, j) => s + v * bv[j], 0)); let rss = 0, tss = 0; const my = ys.reduce((s, y) => s + y, 0) / ys.length;
  xs.forEach((x, i) => { const e = ys[i] - x.reduce((s, v, j) => s + v * beta[j], 0); rss += e * e; tss += (ys[i] - my) * (ys[i] - my); }); const s2 = rss / (ys.length - k);
  return names.map((nm, j) => ({ nm, b: beta[j], se: Math.sqrt(s2 * I[j][j]) })).concat([{ nm: 'R2', b: 1 - rss / tss, se: 0 }]); };
const pr = (title, res, unit) => { console.log(title); for (const z of res) console.log('   ' + z.nm.padEnd(20) + f2(z.b) + (z.se ? ' +/-' + (2 * z.se).toFixed(2) + (unit || '') : '')); };
const corr = (a, b) => { const ma = stat(a).m, mb = stat(b).m; let sab = 0, saa = 0, sbb = 0; a.forEach((x, i) => { sab += (x - ma) * (b[i] - mb); saa += (x - ma) * (x - ma); sbb += (b[i] - mb) * (b[i] - mb); }); return sab / Math.sqrt(saa * sbb); };
console.log('\n4. Does tilt tell you anything the lean does not?');
console.log('   correlations: up-minus-down with tilt ' + f2(corr(hands.map(h => h.D), hands.map(h => h.tilt))) + ', with lean ' + f2(corr(hands.map(h => h.D), hands.map(h => h.lean))) + ';  tilt with lean ' + f2(corr(hands.map(h => h.tilt), hands.map(h => h.lean))));
console.log('   split-half reliability: up-minus-down ' + f2(corr(hands.map(h => h.half[0].D), hands.map(h => h.half[1].D))) + ', tilt ' + f2(corr(hands.map(h => h.half[0].tilt), hands.map(h => h.half[1].tilt))));
pr('   up-minus-down = a + b x tilt (tilt in units of 10 points of make rate)', ols(hands.map(h => h.D), hands.map(h => [1, h.tilt * 10]), ['constant', 'tilt (per 10 pts)']));
pr('   up-minus-down = a + c x lean (per tenth of a trick)', ols(hands.map(h => h.D), hands.map(h => [1, h.lean * 10]), ['constant', 'lean (per 0.1)']));
pr('   up-minus-down = a + b x tilt + c x lean', ols(hands.map(h => h.D), hands.map(h => [1, h.tilt * 10, h.lean * 10]), ['constant', 'tilt (per 10 pts)', 'lean (per 0.1)']));
// rules, in dollars per hooked hand above "always bid X-1"
console.log('\n5. Rules, dollars per hooked hand above "always bid X-1"');
const rule = (nm, pick) => console.log('   ' + nm.padEnd(46) + show(hands.map(h => pick(h) ? h.D : 0)) + '   bids up ' + pc(hands.filter(pick).length / hands.length));
rule('always X+1', () => true);
rule('axiom as stated: up when tilt > 0', h => h.tilt > 0);
const med = hands.map(h => h.tilt).sort((a, b) => a - b)[hands.length >> 1]; rule('up when tilt is above the middle hand (' + f2(med) + ')', h => h.tilt > med);
rule('up when lean > 0', h => h.lean > 0);
const medL = hands.map(h => h.lean).sort((a, b) => a - b)[hands.length >> 1]; rule('up when lean is above the middle hand (' + f2(medL) + ')', h => h.lean > medL);
rule('bidding network (its likelier of the two)', h => h.netLean > 0);
{ const v = []; for (const h of hands) { v.push(((h.half[0].D > 0 ? h.half[1].D : 0) + (h.half[1].D > 0 ? h.half[0].D : 0)) / 2); } console.log('   ' + 'best per hand (chosen on half the deals, scored on the other half)'.padEnd(46) + ' ' + show(v)); }
// fitted rule: threshold on a*tilt + lean, fitted on even hands, scored on odd and the reverse
{ const fit = (train) => { let best = null; for (let w = -4; w <= 4; w += 0.25) for (let t = -0.6; t <= 0.6; t += 0.02) { const v = train.reduce((s, h) => s + (h.lean + w * h.tilt > t ? h.D : 0), 0); if (!best || v > best.v) best = { v, w, t }; } return best; };
  const A = hands.filter((_, i) => i % 2 === 0), B = hands.filter((_, i) => i % 2 === 1), fa = fit(A), fb = fit(B), v = hands.map((h, i) => { const f = i % 2 === 0 ? fb : fa; return h.lean + f.w * h.tilt > f.t ? h.D : 0; });
  console.log('   ' + 'best mix of lean and tilt (fitted on other hands)'.padEnd(46) + show(v) + '   weights on tilt ' + fa.w + ' / ' + fb.w + ', cut ' + fa.t.toFixed(2) + ' / ' + fb.t.toFixed(2));
  const fit1 = (train) => { let best = null; for (let t = -0.6; t <= 0.6; t += 0.02) { const v2 = train.reduce((s, h) => s + (h.lean > t ? h.D : 0), 0); if (!best || v2 > best.v) best = { v: v2, t }; } return best; };
  const ga = fit1(A), gb = fit1(B), v1 = hands.map((h, i) => (h.lean > (i % 2 === 0 ? gb : ga).t ? h.D : 0)); console.log('   ' + 'best cut on lean alone (fitted on other hands)'.padEnd(46) + show(v1) + '   cut ' + ga.t.toFixed(2) + ' / ' + gb.t.toFixed(2)); }
// what makes a hand tilt
const names = Object.keys(hands[0].feat);
console.log('\n6. What kind of hand? Each line: change per extra card of that kind, other kinds and X held equal');
const X6 = hands.map(h => [1, h.X].concat(names.filter(nm => nm !== 'trumps' && nm !== 'side 2-6').map(nm => h.feat[nm]))), nm6 = ['constant', 'X'].concat(names.filter(nm => nm !== 'trumps' && nm !== 'side 2-6'));
const rt = ols(hands.map(h => h.tilt * 100), X6, nm6), rd = ols(hands.map(h => h.D), X6, nm6), rl = ols(hands.map(h => h.lean), X6, nm6);
console.log('   (compared with a low side card, 2 to 6)'.padEnd(44) + 'tilt, points'.padEnd(20) + 'up minus down, $'.padEnd(22) + 'lean, tricks');
rt.forEach((z, i) => console.log('   ' + z.nm.padEnd(22) + (f2(z.b) + (z.se ? ' +/-' + (2 * z.se).toFixed(1) : '')).padStart(18) + (f2(rd[i].b) + (rd[i].se ? ' +/-' + (2 * rd[i].se).toFixed(2) : '')).padStart(22) + (f2(rl[i].b) + (rl[i].se ? ' +/-' + (2 * rl[i].se).toFixed(2) : '')).padStart(20)));
console.log('\n7. By forbidden bid X');
for (const x of [...new Set(hands.map(h => h.X))].sort((a, b) => a - b)) { const g = hands.filter(h => h.X === x); if (g.length < 15) continue; console.log('   X=' + x + ' (' + g.length + ' hands): up minus down ' + show(g.map(h => h.D)) + ', tilt ' + f2(stat(g.map(h => h.tilt)).m) + ', makes X+1 ' + pc(stat(g.map(h => h.mkUp)).m) + ' X-1 ' + pc(stat(g.map(h => h.mkDown)).m) + ', corr(D,tilt) ' + f2(corr(g.map(h => h.D), g.map(h => h.tilt)))); }
