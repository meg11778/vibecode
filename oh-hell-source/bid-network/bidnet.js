/* The bidding network in JavaScript: the same inputs as train_bids.py, and the forward pass.
   const B = require('./bidnet.js').load('bidnet.json');  B.probs(P, n, turned, pos, hand, prior) -> 14 probabilities; B.bid(...) -> most likely legal bid */
const fs = require('fs'), F = 102, NB = 14;
function features(P, n, turned, pos, hand, prior) {
  const x = new Float32Array(F), trump = turned >= 0 ? (turned / 13) | 0 : -1, masks = [0, 0, 0, 0];
  for (const c of hand) masks[(c / 13) | 0] |= 1 << (c % 13);
  const pc = m => { let k = 0; while (m) { k += m & 1; m >>= 1; } return k; };
  const side = [0, 1, 2, 3].filter(s => s !== trump).sort((a, b) => (pc(masks[b]) - pc(masks[a])) || (masks[b] - masks[a]) || (a - b));
  const order = (trump >= 0 ? [trump] : []).concat(side);
  order.forEach((s, k) => { for (let r = 0; r < 13; r++) if (masks[s] >> r & 1) x[13 * k + r] = 1; });
  let o = 52; if (trump >= 0) { x[o] = 1; x[o + 1 + turned % 13] = 1; } o += 14;
  x[o + P - 4] = 1; o += 3; x[o + n - 1] = 1; o += 13; x[o + pos] = 1; o += 6; x[o] = pos === P - 1 ? 1 : 0; o += 1;
  const B = prior.reduce((a, b) => a + b, 0); x[o] = B / n; x[o + 1] = (n - B) / n; o += 2;
  prior.forEach((b, j) => { x[o + j] = b / n; x[o + 5 + j] = 1; }); o += 10;
  x[o] = prior.filter(b => b === 0).length / 5;
  return x;
}
function load(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8')), L = j.W.length;
  const W = j.W.map(w => { const rows = w.length, cols = w[0].length, a = new Float32Array(rows * cols); for (let i = 0; i < rows; i++) for (let k = 0; k < cols; k++) a[i * cols + k] = w[i][k]; return { a, rows, cols }; });
  const b = j.b.map(v => Float32Array.from(v));
  function logits(x) { let h = x; for (let l = 0; l < L; l++) { const { a, rows, cols } = W[l], out = Float32Array.from(b[l]);
      for (let i = 0; i < rows; i++) { const v = h[i]; if (v !== 0) { const off = i * cols; for (let k = 0; k < cols; k++) out[k] += v * a[off + k]; } }
      if (l < L - 1) for (let k = 0; k < cols; k++) if (out[k] < 0) out[k] = 0; h = out; } return h; }
  function probs(P, n, turned, pos, hand, prior) { const z = logits(features(P, n, turned, pos, hand, prior)), B = prior.reduce((a, c) => a + c, 0), ban = pos === P - 1 ? n - B : -1, p = new Float64Array(NB);
    let mx = -Infinity; for (let k = 0; k <= n; k++) if (k !== ban && z[k] > mx) mx = z[k]; let tot = 0; for (let k = 0; k <= n; k++) if (k !== ban) { p[k] = Math.exp(z[k] - mx); tot += p[k]; } for (let k = 0; k < NB; k++) p[k] /= tot; return p; }
  return { probs, bid: (...a) => { const p = probs(...a); let best = 0; for (let k = 1; k < NB; k++) if (p[k] > p[best]) best = k; return best; }, features };
}
module.exports = { load, features };
