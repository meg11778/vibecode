/* The card-reading arena with a choice of bidding network as the reader's picture of the bids.
   node arena_net2.js <P> <n> <deals> <seed> <bidders: 1 simulation, 2 drawn from bidding network 1> '<modes JSON>' [raw]
   Each mode is a set of READ settings (net2:true = read with bidding network 2); every mode plays the same deals in
   one seat against the plain network. The bidders always use network 1, as in the published game. */
const M = require('./load.js')('readArena2,READ');
const [P, n, deals, seed, bidders] = process.argv.slice(2, 7).map(Number), modes = JSON.parse(process.argv[7]);
const r = M.readArena2(P, n, deals, seed, modes, bidders);
console.log(JSON.stringify(process.argv[8] === 'raw' ? Object.assign({ P, n, deals, seed, bidders, modes }, r) : { Pn: P, n, deals, diffs: r.diffs, unfit: r.unfit }));
