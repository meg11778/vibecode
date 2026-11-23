/* Loads the game page's own engine into node and adds two counters to its card-reading arena: layouts played out and
   seconds spent, per setting. Used by arena_think.js.
   Built on Jim Agniel's Oh Hell bid calculator (GNU GPL v3), modified by Matt Glassman. */
const fs = require('fs'), path = require('path'), os = require('os'), ENG = process.env.OHHELL_ENGINE || __dirname;
module.exports = function (exportsList) {
  const page = fs.readFileSync(path.join(ENG, 'ohhell-play.html'), 'utf8').split('\n');
  const a = page.findIndex(l => l.includes('===== cards:')), b = page.findIndex(l => l.startsWith('function bustStudy'));
  if (a < 0 || b < 0) throw new Error('page layout not recognised');
  let inScript = true; let body = page.slice(a, b).filter(l => { const t = l.trim(); if (t.startsWith('</script>')) { inScript = false; return false; } if (t.startsWith('<script')) { inScript = true; return false; } return inScript; }).join('\n');
  const p1 = 'hist }, prng); c=rr.card;', p2 = 'for(let mi=0;mi<modes.length;mi++) out[mi].push(+(play(mi)-base).toFixed(4));', p3 = 'return { firstBids, Pn, n, deals, diffs:out,';
  if (!body.includes(p1) || !body.includes(p2) || !body.includes(p3)) throw new Error('arena code not recognised');
  body = body.replace(p1, p1 + ' __lay[mi]=(__lay[mi]||0)+rr.layouts;')
    .replace(p2, 'for(let mi=0;mi<modes.length;mi++){ const __t=process.hrtime.bigint(); out[mi].push(+(play(mi)-base).toFixed(4)); __sec[mi]=(__sec[mi]||0)+Number(process.hrtime.bigint()-__t)/1e9; }')
    .replace(p3, 'return { layouts:__lay.splice(0), seconds:__sec.splice(0).map(x=>+x.toFixed(2)), decisions:decs.slice(), firstBids, Pn, n, deals, diffs:out,');
  const stubs = 'const document={getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}} , window={}, localStorage={getItem:()=>null,setItem(){}}; const $=()=>({}); const __lay=[], __sec=[];\n';
  const tmp = path.join(os.tmpdir(), '_ohhell_think_' + process.pid + '.js');
  fs.writeFileSync(tmp, stubs + body + '\nmodule.exports={' + exportsList + '};\n})();');
  try { return require(tmp); } finally { fs.unlinkSync(tmp); }
};
