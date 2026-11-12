// new network against the old one (and each against the rules), same seat, same deals
const { seatTest, policy } = require('./arena.js');
const [P, n, nt, pert, freak, deals] = process.argv.slice(2).map(Number);
const N = policy('net3_best.json'), O = policy('net_weights.json'), H = policy('heur');
const a = seatTest(N, O, O, P, n, deals, 31337 + P * 100 + n, nt, pert, freak);
const b = seatTest(N, H, O, P, n, deals, 31337 + P * 100 + n, nt, pert, freak);
const c = seatTest(O, H, O, P, n, deals, 31337 + P * 100 + n, nt, pert, freak);
const f = r => `${r.gain >= 0 ? '+' : ''}${r.gain.toFixed(2)} ±${r.ci.toFixed(2)}`;
console.log(`${P} seats ${String(n).padStart(2)} cards ${nt === 1 ? 'nt' : '  '} ${pert ? 'HARD    ' : 'ordinary'} | new over old ${f(a)} | new over rules ${f(b)} | old over rules ${f(c)}`);
