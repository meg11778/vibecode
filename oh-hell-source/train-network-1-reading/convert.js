/* Widen a 262-input network to this run's 418 inputs. The new inputs get zero
   weight, so the widened network plays exactly as the old one does. */
const fs = require('fs');
const [src, dst] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(src, 'utf8'));
if (j.sizes[0] !== 262) throw new Error('expected a 262-input network');
const H = j.sizes[1];
for (let i = 262; i < 418; i++) { j.W[0].push(new Array(H).fill(0)); j.scale.push(1); }
j.sizes[0] = 418; j.trained_on += '; widened to 418 inputs';
fs.writeFileSync(dst, JSON.stringify(j));
console.log('wrote', dst);
