const fs=require('fs'),pc=(a,b)=>(100*a/b).toFixed(1).padStart(5)+'%';
for(const f of process.argv.slice(2)){const r=JSON.parse(fs.readFileSync(f,'utf8'));console.log(`\n${r.P} players ${r.n} cards (${r.mode})`);
 const keys=['all seats','on lead',...Object.keys(r.G).filter(k=>k.startsWith('seat')).sort(),'dealer'];
 for(const k of keys){const g=r.G[k];if(!g)continue;
  if(r.mode==='bid'){const m=g.d/g.k;console.log(`  ${k.padEnd(10)} ${String(g.k).padStart(6)} | bid 0 makes ${pc(g.bid0made,g.k)} ($${(g.m0/g.k).toFixed(2)}) | bid 1 makes ${pc(g.bid1made,g.k)} ($${(g.m1/g.k).toFixed(2)}) | zero better by $${m.toFixed(2)} ±${(1.96*Math.sqrt((g.d2/g.k-m*m)/g.k)).toFixed(2)} | network's own bid: 0 ${pc(g.netBid[0],g.k)}, 1 ${pc(g.netBid[1],g.k)}`);}
  else console.log(`  ${k.padEnd(10)} ${String(g.k).padStart(6)} | DUCK: none ${pc(g.duck0,g.k)}, one ${pc(g.duck1,g.k)}, two+ ${pc(g.duck2,g.k)} (ace forced to win ${pc(g.aceForced,g.k)}, a small card won ${pc(g.lowWon,g.k)}) | CASH: exactly one ${pc(g.cash1,g.k)}, none ${pc(g.cash0,g.k)}, two+ ${pc(g.cash2,g.k)} (ace trumped ${pc(g.ruffed,g.k)})`);}}
