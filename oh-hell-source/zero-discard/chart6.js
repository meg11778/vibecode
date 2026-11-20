/* node chart6.js six_a.jsonl six_b.jsonl  ->  lone6.html (and lone6.png through Playwright)
   Heat map: a lone 6 against every doubleton, top card down the side, bottom card along the foot. */
const fs = require('fs'), R = ['', '', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'], cell = {};
for (const f of process.argv.slice(2)) for (const l of fs.readFileSync(f, 'utf8').trim().split('\n')) { const r = JSON.parse(l), k = r.h + '-' + r.l, c = cell[k] = cell[k] || { k: 0, d: 0, d2: 0, ms: 0, mh: 0 }; c.k += r.k; c.d += r.d; c.d2 += r.d2; c.ms += r.made[0]; c.mh += r.made[1]; var P = r.P, n = r.n, s = r.s; }
const val = (h, l) => { const c = cell[h + '-' + l]; if (!c) return null; const d = c.d / c.k; return { d, ci: 1.96 * Math.sqrt((c.d2 / c.k - d * d) / c.k), ms: 100 * c.ms / c.k, mh: 100 * c.mh / c.k, k: c.k }; };
const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t)), POS = [96, 158, 222], NEG = [226, 120, 108], MID = [240, 239, 236];
const col = d => { const t = Math.min(1, Math.abs(d) / 1.0); return 'rgb(' + mix(MID, d >= 0 ? POS : NEG, Math.pow(t, 0.8)).join(',') + ')'; };
let maxCi = 0, deals = 0, rows = '';
for (let h = 14; h >= 3; h--) { rows += '<tr><th class="side">' + R[h] + '</th>';
  for (let l = 2; l <= 13; l++) { const v = l < h ? val(h, l) : null; if (!v) { rows += '<td class="none"></td>'; continue; } maxCi = Math.max(maxCi, v.ci); deals = v.k;
    const txt = (v.d >= 0.005 ? '+' : v.d <= -0.005 ? '−' : '') + Math.abs(v.d).toFixed(2), dark = false;      // one ink for every cell: a change of ink read as a second signal
    rows += '<td style="background:' + col(v.d) + ';color:' + (dark ? '#fff' : '#1b2420') + '"' + (h === 9 && l === 7 ? ' class="mark"' : '') + '><b>' + txt + '</b><span>' + v.ms.toFixed(0) + ' / ' + v.mh.toFixed(0) + '</span></td>'; }
  rows += '</tr>'; }
const foot = '<tr><th></th>' + [2,3,4,5,6,7,8,9,10,11,12,13].map(l => '<th class="foot">' + R[l] + '</th>').join('') + '</tr>';
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Lone 6 against every doubleton</title><style>
body{margin:0;background:#f7f8f6;color:#1b2420;font:15px/1.45 -apple-system,"Segoe UI",Inter,Helvetica,Arial,sans-serif}
.wrap{width:980px;padding:34px 40px 30px}
.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#1f6b4c;font-weight:700}
h1{font-size:30px;line-height:1.15;margin:6px 0 8px;letter-spacing:-.01em}
p.sub{margin:0 0 18px;color:#5d6a63;max-width:820px}
table{border-collapse:separate;border-spacing:3px;margin-left:34px}
td{width:66px;height:50px;text-align:center;border-radius:4px;font-variant-numeric:tabular-nums}
td b{display:block;font-size:15px;font-weight:650}
td span{display:block;font-size:10.5px;opacity:.8;margin-top:1px}
td.none{background:transparent}
td.mark{outline:2.5px solid #1b2420;outline-offset:-1px}
th.side{width:34px;text-align:right;padding-right:8px;font-size:15px;font-weight:650}
th.foot{font-size:15px;font-weight:650;padding-top:6px}
.ylab{position:absolute;left:14px;top:330px;transform:rotate(-90deg);transform-origin:left top;color:#5d6a63;font-size:13px;letter-spacing:.04em;width:300px;text-align:center}
.xlab{margin:6px 0 0 34px;width:840px;text-align:center;color:#5d6a63;font-size:13px;letter-spacing:.04em}
.grid{position:relative}
.legend{display:flex;align-items:center;gap:10px;margin:20px 0 0 68px;color:#5d6a63;font-size:13px}
.legend i{display:inline-block;width:26px;height:14px;border-radius:2px}
.read{position:absolute;left:660px;top:258px;width:330px;font-size:13.5px;color:#1b2420}
.read h3{margin:0 0 6px;font-size:14px;border-top:2px solid #1f6b4c;padding-top:8px}
.read p{margin:0 0 12px;color:#5d6a63}
.note{margin:22px 0 0;padding-top:12px;border-top:1px solid #dfe4df;color:#5d6a63;font-size:12.5px;max-width:900px}
</style></head><body><div class="wrap">
<div class="eyebrow">Oh Hell · zero bid · ${P} players · ${n}-card round</div>
<h1>You hold a lone 6 and a doubleton. Throw the 6?</h1>
<p class="sub">Dollars gained, at $1 a point, by throwing the 6 rather than the top card of the doubleton on your first free throw. Small figures: how often you make your zero, throwing the 6 / throwing the top card (%).</p>
<div class="grid"><div class="ylab">TOP CARD OF THE DOUBLETON</div>
<table>${rows}${foot}</table><div class="xlab">BOTTOM CARD OF THE DOUBLETON</div>
<div class="read"><h3>Throw the 6 against every doubleton.</h3><p>${'READ1'}</p><h3>The bottom card sets how safe you are, not which card to throw.</h3><p>${'READ2'}</p><h3>Outlined: 9-7, the hand that started this.</h3><p>${'READ3'}</p></div></div>
<div class="legend"><span>Throw the top card</span><i style="background:${col(-1)}"></i><i style="background:${col(-0.5)}"></i><i style="background:${col(-0.2)}"></i><i style="background:${col(0)}"></i><i style="background:${col(0.2)}"></i><i style="background:${col(0.5)}"></i><i style="background:${col(1)}"></i><span>Throw the 6</span><span style="margin-left:14px">colour stops at ±$1.00</span></div>
<p class="note"><b>How it was measured.</b> ${deals.toLocaleString('en-US')} deals for each of the 78 doubletons. You have bid zero and the first trick is led in a suit you do not hold (here always a trump; your fourth card is the 2 of a third suit). The other hands, the trump, your seat and the other bids are random. Each throw is played out on the same deal with the project's neural network in every seat. Each figure is good to about ±$${maxCi.toFixed(2)}. Computer bots against each other, not people. github.com/meg11778/vibecode</p>
</div></body></html>`;
// the three reading notes, from the data
const avg = fn => { let k = 0, d = 0; for (let h = 3; h <= 14; h++) for (let l = 2; l < h; l++) if (fn(h, l)) { const v = val(h, l); k++; d += v.d; } return d / k; };
let neg = []; for (let h = 3; h <= 14; h++) for (let l = 2; l < h; l++) { const v = val(h, l); if (v.d < -v.ci) neg.push(R[h] + '-' + R[l]); }
const lo = { d: 9 }, hi = { d: -9 }; for (let h = 3; h <= 14; h++) for (let l = 2; l < h; l++) { const v = val(h, l); if (v.d < lo.d) { lo.d = v.d; lo.n = R[h] + '-' + R[l]; } if (v.d > hi.d) { hi.d = v.d; hi.n = R[h] + '-' + R[l]; } }
const m = val(9, 7), fmt = x => (x >= 0 ? '+$' : '−$') + Math.abs(x).toFixed(2);
const r1 = 'From ' + fmt(hi.d) + ' (' + hi.n + ') down to ' + fmt(lo.d) + ' (' + lo.n + '). ' + (neg.length ? 'Throwing the top card is clearly better only with ' + neg.join(', ') + '.' : 'There is no doubleton where throwing its top card is clearly better.') + ' The gain is largest when both of the doubleton’s cards are below the 6, and fades as the top card rises to the ace.';
const r2 = 'Along any row the make figures climb steeply as the bottom card gets smaller (with the jack on top: ' + val(11, 10).ms.toFixed(0) + '% with J-10, ' + val(11, 2).ms.toFixed(0) + '% with J-2), but the gain from throwing the 6 hardly moves (' + fmt(val(11, 10).d) + ' against ' + fmt(val(11, 2).d) + ').';
const r3 = 'The holding that started this. Throwing the 6 gains ' + fmt(m.d) + '; you make zero ' + m.ms.toFixed(0) + '% of the time against ' + m.mh.toFixed(0) + '%.';
const R1 = 'The gain runs from ' + fmt(hi.d) + ' (' + hi.n + ') down to ' + fmt(lo.d) + ' (' + lo.n + '), fading as the top card rises. ' + (neg.length ? 'Throwing the top card is better only with ' + neg.join(', ') + '.' : 'No doubleton makes its top card the better throw.');
const R2 = 'Along the jack\u2019s row you make zero ' + val(11, 10).ms.toFixed(0) + '% of the time with J-10 and ' + val(11, 2).ms.toFixed(0) + '% with J-2, yet the 6 is the throw at both ends (' + fmt(val(11, 10).d) + ', ' + fmt(val(11, 2).d) + ').';
const R3 = 'Throwing the 6 gains ' + fmt(m.d) + ': zero made ' + m.ms.toFixed(0) + '% against ' + m.mh.toFixed(0) + '%.';
fs.writeFileSync('lone6.html', html.replace('READ1', R1).replace('READ2', R2).replace('READ3', R3));
console.log(r1 + '\n' + r2 + '\n' + r3 + '\nmax margin ' + maxCi.toFixed(3) + ', deals per cell ' + deals);
