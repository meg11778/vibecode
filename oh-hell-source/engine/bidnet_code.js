let BIDNET_RT=null;
function bidNetLoad(){
  if(BIDNET_RT) return BIDNET_RT;
  const dec=(parts,scale)=>{ const s=parts.join(""), bin=(typeof atob==="function") ? atob(s) : Buffer.from(s,"base64").toString("binary");
    const out=new Float32Array(bin.length>>1); for(let i=0;i<out.length;i++){ let v=bin.charCodeAt(2*i)|(bin.charCodeAt(2*i+1)<<8); if(v>32767) v-=65536; out[i]=v*scale; } return out; };
  BIDNET_RT={ W:[dec(BIDNET_W1,BIDNET_S[0]),dec(BIDNET_W2,BIDNET_S[1]),dec(BIDNET_W3,BIDNET_S[2])], b:BIDNET_B.map(v=>Float32Array.from(v)),
    h1:new Float32Array(BIDNET_SIZES[1]), h2:new Float32Array(BIDNET_SIZES[2]), z:new Float32Array(BIDNET_SIZES[3]), on:new Int32Array(64), val:new Float32Array(64) };
  return BIDNET_RT;
}
/* Tables the network was trained on: 4 to 6 seats, rounds of 2 cards up to what the deck allows. */
function bidNetCovers(P,n){ return P>=4 && P<=6 && n>=2 && P*n<=52; }
/* Probability of each bid 0..n for the seat at place `pos` (0 bids first) holding `hand`, after the bids in `prior`.
   The dealer's hooked bid gets 0. Inputs as in train_bids.py: only the non-zero ones are listed. */
function bidNetProbs(P,n,turned,pos,hand,prior){
  const R=bidNetLoad(), on=R.on, val=R.val; let k=0;
  const trump = turned>=0 ? (turned/13)|0 : -1, masks=[0,0,0,0], cnt=[0,0,0,0];
  for(const c of hand){ const s=(c/13)|0; masks[s]|=1<<(c%13); cnt[s]++; }
  const order=[]; if(trump>=0) order.push(trump);
  const side=[0,1,2,3].filter(s=>s!==trump).sort((a,b)=>(cnt[b]-cnt[a])||(masks[b]-masks[a])||(a-b));
  for(const s of side) order.push(s);
  for(let q=0;q<order.length;q++){ const m=masks[order[q]]; for(let r=0;r<13;r++) if(m>>r&1){ on[k]=13*q+r; val[k++]=1; } }
  let o=52; if(trump>=0){ on[k]=o; val[k++]=1; on[k]=o+1+turned%13; val[k++]=1; } o+=14;
  on[k]=o+P-4; val[k++]=1; o+=3; on[k]=o+n-1; val[k++]=1; o+=13; on[k]=o+pos; val[k++]=1; o+=6;
  if(pos===P-1){ on[k]=o; val[k++]=1; } o+=1;
  let B=0, zeros=0; for(const b of prior){ B+=b; if(b===0) zeros++; }
  if(B>0){ on[k]=o; val[k++]=B/n; } if(n-B!==0){ on[k]=o+1; val[k++]=(n-B)/n; } o+=2;
  for(let q=0;q<prior.length;q++){ if(prior[q]>0){ on[k]=o+q; val[k++]=prior[q]/n; } on[k]=o+5+q; val[k++]=1; } o+=10;
  if(zeros>0){ on[k]=o; val[k++]=zeros/5; }
  const H1=BIDNET_SIZES[1], H2=BIDNET_SIZES[2], NB=BIDNET_SIZES[3], h1=R.h1, h2=R.h2, z=R.z, W1=R.W[0], W2=R.W[1], W3=R.W[2];
  h1.set(R.b[0]); for(let q=0;q<k;q++){ const off=on[q]*H1, v=val[q]; for(let x=0;x<H1;x++) h1[x]+=v*W1[off+x]; }
  h2.set(R.b[1]); for(let a=0;a<H1;a++){ const v=h1[a]; if(v>0){ const off=a*H2; for(let x=0;x<H2;x++) h2[x]+=v*W2[off+x]; } }
  z.set(R.b[2]); for(let a=0;a<H2;a++){ const v=h2[a]; if(v>0){ const off=a*NB; for(let x=0;x<NB;x++) z[x]+=v*W3[off+x]; } }
  const ban = pos===P-1 ? n-B : -1, p=new Array(n+1).fill(0); let mx=-Infinity, tot=0;
  for(let b=0;b<=n;b++) if(b!==ban && z[b]>mx) mx=z[b];
  for(let b=0;b<=n;b++) if(b!==ban){ p[b]=Math.exp(z[b]-mx); tot+=p[b]; }
  for(let b=0;b<=n;b++) p[b]/=tot;
  return p;
}
function bidNetBid(P,n,turned,pos,hand,prior){ const p=bidNetProbs(P,n,turned,pos,hand,prior); let best=0; for(let b=1;b<p.length;b++) if(p[b]>p[best]) best=b; return best; }
