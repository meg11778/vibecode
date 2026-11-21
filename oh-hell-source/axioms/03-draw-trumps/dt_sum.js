const fs=require('fs'),sg=x=>(x>=0?'+':'')+x.toFixed(2);const rs=process.argv.slice(2).map(f=>JSON.parse(fs.readFileSync(f,'utf8'))),L=rs[0].LINES,G={};
for(const r of rs)for(const k in r.G){const g=r.G[k],t=G[k]=G[k]||{k:0,v:L.map(()=>0),v2:L.map(()=>0),made:L.map(()=>0),short:L.map(()=>0),hearts:L.map(()=>0),netOpen:{},readOpen:{},rk:0,rv:{}};t.k+=g.k;t.rk+=g.rk;
 for(const f of ['v','v2','made','short','hearts'])g[f].forEach((x,i)=>t[f][i]+=x);for(const f of ['netOpen','readOpen','rv'])for(const c in g[f])t[f][c]=(t[f][c]||0)+g[f][c];}
console.log('hand '+rs[0].hand+', bid '+rs[0].bid+', '+rs.reduce((a,r)=>a+r.deals,0)+' deals');
for(const k of ['over by 2 or more','over by 1','under by 1','under by 2 or more']){const g=G[k];if(!g)continue;console.log('\n'+k+' ('+g.k+' deals)');
 L.forEach((n,i)=>{const m=g.v[i]/g.k;console.log('  '+n.padEnd(20)+'$'+sg(m)+' ±'+(1.96*Math.sqrt((g.v2[i]/g.k-m*m)/g.k)).toFixed(2)+' | makes '+(100*g.made[i]/g.k).toFixed(0)+'% | short '+(100*g.short[i]/g.k).toFixed(0)+'% | heart tricks '+(g.hearts[i]/g.k).toFixed(2));});
 console.log('  network opens: '+Object.entries(g.netOpen).sort((a,b)=>b[1]-a[1]).map(([c,x])=>c+' '+(100*x/g.k).toFixed(0)+'%').join(', '));
 if(g.rk)console.log('  reading bot opens ('+g.rk+' deals): '+Object.entries(g.readOpen).sort((a,b)=>b[1]-a[1]).map(([c,x])=>c+' '+(100*x/g.rk).toFixed(0)+'%').join(', ')+' | its sums: '+Object.entries(g.rv).sort((a,b)=>b[1]-a[1]).map(([c,x])=>c+' '+sg(x/g.rk)).join(', '));}
