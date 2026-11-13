const { seatTest, policy } = require('./arena.js');
const [n, pert, freak, deals, seed] = process.argv.slice(2).map(Number);
const N = policy('net_g8.json'), O = policy('net_weights.json');
const a = seatTest(N, O, O, n, deals, seed || 9000 + n, pert, freak);       // new seat among old
const b = seatTest(N, O, N, n, deals, (seed || 9000 + n) + 1, pert, freak);  // new seat vs old seat, among new
console.log(JSON.stringify({ n, pert, deals, a, b }));
