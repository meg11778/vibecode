/* The card-reading arena outside the browser: the game page's own reading code, loaded into node.
   node arena_node.js <P> <n> <deals> <seed> <bidders: 0 formula, 1 simulation, 2 bidding network> '<modes JSON>' [raw]
   Each mode is a set of READ settings; every mode plays the same deals in one seat against the network. */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE || __dirname;
const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
if (a < 0 || b < 0) throw new Error('page layout not recognised');
// everything from the engine to the end of the arena, minus lines that touch the page itself
let inScript = true; const body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
const tmp = path.join(os.tmpdir(), '_ohhell_readnode_' + process.pid + '.js');
fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={readArena2,READ};\n})();');
let M; try { M = require(tmp); } finally { fs.unlinkSync(tmp); }
const [P, n, deals, seed, bidders] = process.argv.slice(2, 7).map(Number), modes = JSON.parse(process.argv[7]);
const r = M.readArena2(P, n, deals, seed, modes, bidders);
console.log(JSON.stringify(process.argv[8] === 'raw' ? Object.assign({ P, n, deals, seed, bidders, modes }, r) : { Pn: P, n, deals, diffs: r.diffs, bidsOffFormula: r.bidsOffFormula, unfit: r.unfit }));
