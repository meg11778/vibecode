const fs=require('fs');for(const f of process.argv.slice(2)){const D={lone:0,low:0,mid:0,big:0},E={lone:0,low:0,mid:0,big:0};let k=0,k2=0,top2=0,P,n;
for(const l of fs.readFileSync(f,'utf8').split('\n')){if(!l)continue;let r;try{r=JSON.parse(l)}catch(e){continue}P=r.P;n=r.n;if(r.need!==1||!(r.ledTrump>0&&r.ledTrump<=7))continue;
const oth=r.tr.filter(x=>x!==r.ledTrump),best=Math.max(0,...oth),cls=!oth.length?'lone':best<=7?'low':best<=11?'mid':'big';D[cls]++;k++;const all=r.out.concat(oth).sort((a,b)=>b-a);if(oth.length&&(best>=all[1]))top2++;
if(r.left>=3&&r.left>=r.n-2){E[cls]++;k2++;}}
const s=(D,k)=>['lone','low','mid','big'].map(c=>c+' '+(100*D[c]/k).toFixed(1)+'%').join(' | ');
console.log(P+'p'+n+': low trump led by a seat needing 1 ('+k+'): best other trump: '+s(D,k)+' || holds one of the two highest trumps left '+(100*top2/k).toFixed(1)+'% || first three tricks only ('+k2+'): '+s(E,k2));}
