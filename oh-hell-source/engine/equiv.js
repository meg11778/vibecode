/* Do the networks inside ohhell.html play the same cards as the reference
   implementations (net.js here for network 1, ../ohhell-engine-2/net.js for
   network 2)?  node equiv.js */
const fs=require('fs'), path=require('path'), os=require('os');
const lines=fs.readFileSync(path.join(__dirname,'ohhell.html'),'utf8').split('\n');
const a=lines.findIndex(l=>l.includes('===== cards:')), b=lines.findIndex(l=>l.includes('===== UI ====='));
const tmp=path.join(os.tmpdir(),'_ohhell_page_engine.js');
fs.writeFileSync(tmp, lines.slice(a,b).join('\n')+'\nmodule.exports={playHandNet,playHand,netFor};');
const PG=require(tmp);
const T=require('../ohhell-engine-2/table.js'), E=require('../ohhell-engine-2/engine.js');
const net1=require('./net.js').loadNet(path.join(__dirname,'net_best.json')).policy;
const net2=require('../ohhell-engine-2/net.js').loadNet(path.join(__dirname,'net2_best.json')).policy;
console.log(' seats cards trump | network | deals | identical result | ms/deal network | ms/deal rules');
for(const [P,n,nt] of [[4,3,0],[4,7,0],[4,12,0],[4,5,1],[4,9,1],[4,13,1],[5,4,0],[5,10,0],[5,7,1],[6,3,0],[6,8,0],[6,6,1]]){
  const rng=E.mulberry32(77+P*100+n), N=n>=9?800:1500, deals=[]; let same=0;
  for(let i=0;i<N;i++){ const deal=T.makeDeal(rng,P,n,!!nt); deals.push([deal,T.makeBids(deal.hands,deal.trump,deal.turned,P,n)]); }
  const k=PG.netFor(P,n,deals[0][0].trump), ref=k===1?net1:net2;
  for(const [deal,bids] of deals){
    const w1=T.playDeal(deal,bids,P,n,Array.from({length:P},()=>ref));
    const w2=PG.playHandNet(deal.hands,bids,deal.trump,P,n,deal.turned);
    if(w1.join()===w2.join()) same++;
  }
  let t0=process.hrtime.bigint(); for(const [deal,bids] of deals) PG.playHandNet(deal.hands,bids,deal.trump,P,n,deal.turned);
  const tn=Number(process.hrtime.bigint()-t0)/1e6/N;
  t0=process.hrtime.bigint(); for(const [deal,bids] of deals) PG.playHand(deal.hands,bids,deal.trump,P,n);
  const tr=Number(process.hrtime.bigint()-t0)/1e6/N;
  console.log(`   ${P}    ${String(n).padStart(2)}   ${nt?'none ':'yes  '} |    ${k}    | ${String(N).padStart(4)}  | ${(100*same/N).toFixed(2).padStart(6)}%          | ${tn.toFixed(3)}           | ${tr.toFixed(3)}`);
}
