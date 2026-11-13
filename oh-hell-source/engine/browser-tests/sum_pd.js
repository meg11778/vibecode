const fs=require('fs');
for(const f of process.argv.slice(2)){ if(!fs.existsSync(f)) continue;
  const rows=fs.readFileSync(f,'utf8').trim().split('\n').filter(x=>x[0]==='{').map(JSON.parse); if(!rows.length) continue;
  const modes=rows[0].modes, D=modes.map(()=>[]); let off=0; const unfit=modes.map(()=>0);
  for(const r of rows){ r.diffs.forEach((a,i)=>D[i].push(...a)); off+=r.bidsOffFormula/rows.length; r.unfit.forEach((u,i)=>unfit[i]+=u/rows.length); }
  const st=a=>{ const n=a.length, m=a.reduce((x,y)=>x+y,0)/n, v=a.reduce((x,y)=>x+(y-m)*(y-m),0)/n; return (m>=0?'+':'')+m.toFixed(3)+' ±'+(1.96*Math.sqrt(v/n)).toFixed(3); };
  console.log(f+': '+D[0].length+' deals, bids off formula '+(100*off).toFixed(0)+'%');
  modes.forEach((m,i)=>console.log('  '+JSON.stringify(m)+': over network '+st(D[i])+' | out of tries '+(100*unfit[i]).toFixed(0)+'%'+(i?' | over first setting '+st(D[i].map((x,k)=>x-D[0][k])):'')));
}
