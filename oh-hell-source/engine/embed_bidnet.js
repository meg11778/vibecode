/* Turns bidnet.json (from bid-network/train_bids.py) into bidnet_block.js: the weights as 16-bit numbers in base64
   and the code that uses them.   node embed_bidnet.js bidnet.json > bidnet_block.js */
const fs = require('fs'), j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const pack = M => { const flat = M.flat(), mx = Math.max(...flat.map(Math.abs)) || 1, a = new Int16Array(flat.length); flat.forEach((v, i) => a[i] = Math.round(v / mx * 32767)); return { s: mx / 32767, b64: Buffer.from(a.buffer).toString('base64') }; };
const W = j.W.map(pack), chunk = s => s.match(/.{1,16000}/g).map(x => '"' + x + '"').join(',\n');
let out = `/* ===== bidding network =====
 * Predicts the bid the game's simulation would make from what a bidder sees: hand, turned card, table size, round
 * size, place in the bidding and the bids already made. ${j.trained_on}. Sizes ${j.sizes.join(' x ')}.
 * Trained by bid-network/train_bids.py; this block is written by embed_bidnet.js. Added by Matt Glassman, November 2026.
 */
const BIDNET_SIZES=${JSON.stringify(j.sizes)}, BIDNET_S=${JSON.stringify(W.map(w => w.s))};
const BIDNET_B=${JSON.stringify(j.b.map(v => v.map(x => +x.toFixed(5))))};
`;
W.forEach((w, i) => { out += `const BIDNET_W${i + 1}=[\n${chunk(w.b64)}\n];\n`; });
out += fs.readFileSync(__dirname + '/bidnet_code.js', 'utf8');
process.stdout.write(out);
