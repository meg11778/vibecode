/* One card-reading seat at a table of simulation bidders and plain-network players, the same deals under each setting.
   node arena_think.js <P> <n> <deals> <seed> '<modes JSON>'      Each mode is a set of READ settings. */
const M = require('./load.js')('readArena2,READ');
const [P, n, deals, seed] = process.argv.slice(2, 6).map(Number), modes = JSON.parse(process.argv[6]);
const r = M.readArena2(P, n, deals, seed, modes, 1);
console.log(JSON.stringify(Object.assign({ P, n, deals, seed, modes }, r)));
