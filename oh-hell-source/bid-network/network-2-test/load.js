/* Loads the game page's own engine into node, with a second bidding network (bidnet2.json) beside the one built into
   the page, and a switch between them. Used by netcmp.js and arena_net2.js.
   Built on Jim Agniel's Oh Hell bid calculator (GNU GPL v3), modified by Matt Glassman. */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE || __dirname;
module.exports = function (exportsList) {
  const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
  const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
  if (a < 0 || b < 0) throw new Error('page layout not recognised');
  let inScript = true; let body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
  // the card-reading arena: bidders always use network 1; a mode with net2:true reads the cards with network 2
  const p1 = 'if(mi>=0) Object.assign(READ,keep,modes[mi]);', p2 = '    const bids=[]; let B=0;\n    for(let q=0;q<Pn;q++){ KNOWN';
  if (!body.includes(p1) || !body.includes(p2)) throw new Error('arena code not recognised');
  body = body.replace(p1, p1 + ' __useNet(mi>=0 && modes[mi].net2 ? 2 : 1);').replace(p2, '    __useNet(1);\n' + p2);
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, 'bidnet2.json'), 'utf8'));
  const extra = `
const __RT1 = bidNetLoad();
const __J2 = ${JSON.stringify({ sizes: j.sizes })};
if (JSON.stringify(__J2.sizes) !== JSON.stringify(BIDNET_SIZES)) throw new Error('second network has a different shape');
const __RT2 = (() => { const j = JSON.parse(require('fs').readFileSync(${JSON.stringify(path.join(__dirname, 'bidnet2.json'))}, 'utf8'));
  return { W: j.W.map(M => Float32Array.from(M.flat())), b: j.b.map(v => Float32Array.from(v)), h1: new Float32Array(BIDNET_SIZES[1]), h2: new Float32Array(BIDNET_SIZES[2]), z: new Float32Array(BIDNET_SIZES[3]), on: new Int32Array(64), val: new Float32Array(64) }; })();
function __useNet(k){ BIDNET_RT = k === 2 ? __RT2 : __RT1; }
`;
  const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({});\n';
  const tmp = path.join(os.tmpdir(), '_ohhell_net2_' + process.pid + '.js');
  fs.writeFileSync(tmp, stubs + body + extra + '\nmodule.exports={' + exportsList + ',useNet:__useNet,setKnown:(k)=>{KNOWN=k;}};\n})();');
  try { return require(tmp); } finally { fs.unlinkSync(tmp); }
};
