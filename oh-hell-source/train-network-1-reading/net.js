/* The trained play network, as a policy. Plain JavaScript, no libraries: the
   forward pass is three matrix multiplies, so it can run inside a web page. */

const fs = require('fs');
const { F, encode, decoder, canon } = require('./encode.js');

function loadNet(path) {
  const j = JSON.parse(fs.readFileSync(path, 'utf8'));
  const L = j.W.length;
  // weights stored [in][out]; flatten to out-major for a tight inner loop
  const W = [], B = [], dims = j.sizes;
  for (let l = 0; l < L; l++) {
    const a = dims[l], b = dims[l + 1], w = new Float32Array(a * b);
    for (let i = 0; i < a; i++) for (let o = 0; o < b; o++) w[i * b + o] = j.W[l][i][o];
    W.push(w); B.push(Float32Array.from(j.b[l]));
  }
  const inv = Float32Array.from(j.scale.map(s => 1 / s));

  function logits(x) {
    let act = new Float32Array(F);
    for (let i = 0; i < F; i++) act[i] = x[i] * inv[i];
    for (let l = 0; l < L; l++) {
      const a = dims[l], b = dims[l + 1], w = W[l], out = Float32Array.from(B[l]);
      for (let i = 0; i < a; i++) {
        const v = act[i]; if (v === 0) continue;
        const row = i * b;
        for (let o = 0; o < b; o++) out[o] += v * w[row + o];
      }
      if (l < L - 1) for (let o = 0; o < b; o++) if (out[o] < 0) out[o] = 0;
      act = out;
    }
    return act;
  }

  function policy(obs) {
    const { hand, led } = obs;
    let legal = hand;
    if (led >= 0) { const f = hand.filter(c => ((c / 13) | 0) === led); if (f.length) legal = f; }
    if (legal.length === 1) return legal[0];
    const { x, map } = encode(obs);
    const z = logits(x);
    let best = legal[0], bv = -Infinity;
    for (const c of legal) { const v = z[canon(c, map)]; if (v > bv) { bv = v; best = c; } }
    return best;
  }

  return { policy, logits, info: j.trained_on };
}

module.exports = { loadNet };
