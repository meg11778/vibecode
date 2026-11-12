/* ===== bidding by simulation =====
   A bot's bid, chosen the way the bid calculator prices a bid, but sized to
   take about half a second instead of half a minute.

     1. Deal the unseen cards out a few thousand times and weigh each deal by
        how well it explains the bids already made (the same likelihood the
        calculator uses). This is cheap: no cards are played.
     2. Draw `samples` deals from those in proportion to their weight, so every
        deal that gets played out counts fully.
     3. On each drawn deal, try each candidate bid: the seats still to bid
        answer from the bid model, the hand is played out with the network in
        every seat (the rules engine where the network does not apply), and the
        bot's Vienna points are compared with the table's average.
     4. Bid the candidate with the best average.

   Candidates are the bids within `window` of what the bid model expects, so
   hopeless bids are not played out. If the bids already made are too unlikely
   under the bid model to learn from, it falls back to the model's own bid.

   hand: the bot's cards. pos: its place in the bidding (0 bids first and leads).
   prior: the bids made so far, in order. model: { bid, adj } from the bid model.
   Uses the engine's globals; touches nothing on the page. */
function simulateBid(hand, trump, turned, n, P, pos, prior, model, seed, opt){
  opt = opt || {};
  const K = opt.samples || 150, WIN = opt.window == null ? 2 : opt.window, MAXDRAW = opt.maxDraws || 6000;
  const rng = mulberry32(seed >>> 0), cfg = { profiles:{} };
  const mine = new Set(hand), pool = [];
  KNOWN = (turned >= 0) ? [turned] : [];
  for(let c=0;c<52;c++) if(!mine.has(c) && c!==turned) pool.push(c);
  const claimed = prior.reduce((a,b)=>a+b,0), banned = (pos===P-1) ? n-claimed : -1;
  const c0 = Math.round(model.adj), cands = [];
  const also = opt.also || [];
  for(let b=0;b<=n;b++) if(b!==banned && (Math.abs(b-c0)<=WIN || b===model.bid || also.includes(b))) cands.push(b);
  if(cands.length<2) return { bid:model.bid, by:"formula", why:"only one bid in range" };

  // 1. candidate deals and their weights
  const need = (P-1)*n, deals = [], wts = [];
  let wSum = 0, wSum2 = 0;
  const target = pos===0 ? K : MAXDRAW;
  for(let d=0; d<target; d++){
    for(let i=0;i<need;i++){ const j=i+((rng()*(pool.length-i))|0); const t=pool[i]; pool[i]=pool[j]; pool[j]=t; }
    const hands = new Array(P); let k=0;
    for(let s=0;s<P;s++) hands[s] = (s===pos) ? hand : pool.slice(k*n, (k++)*n+n);
    let w=1, Bo=0;
    for(let s=0;s<pos && w>0;s++){
      w *= bidLikelihood(muFor(hands[s],trump,n,P,s)*auctionFactor(n,P,Bo,P-s), n, -1, prior[s], profOf(cfg,s));
      Bo += prior[s];
    }
    if(w>0){ deals.push(hands); wts.push(w); wSum+=w; wSum2+=w*w; }
    // enough distinct, well-weighted deals to draw K from
    if(pos>0 && d%200===199 && wSum2>0 && (wSum*wSum)/wSum2 >= 3*K) break;
  }
  const ess = wSum2>0 ? (wSum*wSum)/wSum2 : 0;
  if(ess < 25) return { bid:model.bid, by:"formula", why:"the bids so far do not fit the bid model", ess:+ess.toFixed(1) };

  // 2. draw K deals in proportion to weight (systematic resampling)
  const picks = []; { let acc=0, i=0; const stepW=wSum/K, u0=rng()*stepW;
    for(let k=0;k<K;k++){ const x=u0+k*stepW; while(i<wts.length-1 && acc+wts[i]<x){ acc+=wts[i]; i++; } picks.push(deals[i]); } }

  // 3. play every candidate out on each drawn deal
  const net = netCovers(P,n,trump);
  const vals = opt.cmp!=null ? cands.map(()=>new Float32Array(K)) : null; let pk=0;
  const sum = cands.map(()=>0), made = cands.map(()=>0), raw = new Array(P).fill(0), u = new Array(P).fill(0);
  for(const hands of picks){
    for(let s=pos+1;s<P;s++){
      raw[s]=muFor(hands[s],trump,n,P,s);
      const a=Math.max(rng(),1e-12), b2=rng();
      u[s]=Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*b2);
    }
    for(let ci=0;ci<cands.length;ci++){
      const bids=new Array(P).fill(0); let B=0;
      for(let s=0;s<pos;s++){ bids[s]=prior[s]; B+=prior[s]; }
      bids[pos]=cands[ci]; B+=cands[ci];
      for(let s=pos+1;s<P;s++){
        const pr=profOf(cfg,s);
        const e=Math.max(0,Math.min(n, raw[s]*auctionFactor(n,P,B,P-s)+pr.bias+u[s]*sigLik(n,pr)));
        const b=bidAt(e,n,(s===P-1)?n-B:-1); bids[s]=b; B+=b;
      }
      const won = net ? playHandNet(hands,bids,trump,P,n,turned) : playHand(hands,bids,trump,P,n);
      let tot=0, me=0;
      for(let s=0;s<P;s++){ const v=vienna(bids[s],won[s],n); tot+=v; if(s===pos) me=v; }
      sum[ci]+=me-tot/P; if(won[pos]===cands[ci]) made[ci]++;
      if(vals) vals[ci][pk]=me-tot/P;
    }
    pk++;
  }
  // 4. best average; a tie goes to the bid model's own choice
  let best=0;
  for(let ci=1;ci<cands.length;ci++) if(sum[ci]>sum[best] || (sum[ci]===sum[best] && cands[ci]===model.bid)) best=ci;
  // what one particular bid gave up against the best, with its sampling error
  let cmp=null; const mi = vals ? cands.indexOf(opt.cmp) : -1;
  if(mi>=0){ const cost=(sum[best]-sum[mi])/K; let d2=0;
    for(let k=0;k<K;k++){ const d=vals[best][k]-vals[mi][k]-cost; d2+=d*d; }
    cmp={ bid:opt.cmp, cost:+cost.toFixed(2), se:+Math.sqrt(d2/K/(K-1)).toFixed(2) }; }
  return { cmp, bid:cands[best], by:"simulation", samples:K, drawn:deals.length, ess:Math.round(ess),
           table:cands.map((b,ci)=>({ bid:b, edge:+(sum[ci]/K).toFixed(2), makes:Math.round(100*made[ci]/K) })) };
}
