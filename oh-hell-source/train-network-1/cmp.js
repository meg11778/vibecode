const { seatTest, policy } = require('./arena.js');
const [n, pert, freak, deals] = process.argv.slice(2).map(Number);
const N = policy('net4_best.json'), O = policy('net_weights.json'), H = policy('heur');
const sd = 4242 + n;
const a = seatTest(N, O, O, n, deals, sd, pert, freak), b = seatTest(N, H, O, n, deals, sd, pert, freak), c = seatTest(O, H, O, n, deals, sd, pert, freak);
const f = r => `${r.gain >= 0 ? '+' : ''}${r.gain.toFixed(2)} ±${r.ci.toFixed(2)}`;
console.log(`${String(n).padStart(2)} cards ${pert ? (freak === 1 ? 'LONG    ' : 'HARD    ') : 'ordinary'} | new over old ${f(a)} | new over rules ${f(b)} | old over rules ${f(c)}`);
