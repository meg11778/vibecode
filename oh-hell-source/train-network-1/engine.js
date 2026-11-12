/* Rules and heuristic play engine, extracted verbatim from ohhell.html. Do not edit here; rebuild from the HTML. */
/* ===== cards: card = suit*13 + rankIndex, rankIndex 0..12 => rank 2..14 ===== */
const GLYPH = ["\u2660","\u2665","\u2666","\u2663"];
const RANKL = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const SHOW  = [12,11,10,9,8,7,6,5,4,3,2,1,0];
const suitOf = c => (c/13)|0;
const rankOf = c => (c%13)+2;
const isRed  = s => s===1 || s===2;

/* Seeded PRNG. A fixed seed means the same hand always returns the same answer,
   which matters when you want to compare two runs and know the difference is real. */
function mulberry32(a){return function(){a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);
  t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}

/* ===== Vienna scoring ===== */
const vienna = (bid,won,n) => bid===won ? (bid===0 ? 5+n : 10+won) : won;

/* ===== hand strength and bidding ===== */
const COEF_T={
1:{b:[0.03601,1.06427,0.00797,0.03431,0.65363,0.02391,0.02805,-0.3244,0.064,0.064,-0.15849,0.03601,0],sm:0.107,so:0.3083},
2:{b:[0.13248,0.71777,0.32867,0.03799,0.87385,-0.0072,-0.06371,-0.24243,0.03112,0.01556,0.12714,-0.08833,0],sm:0.1155,so:0.4552},
3:{b:[0.08466,0.54831,0.27941,0.02365,1.60142,0.08036,-0.02543,-0.15617,0.05745,0.01915,0.1774,-0.09898,0],sm:0.124,so:0.5449},
4:{b:[0.06756,0.53261,0.28659,0.04756,2.69484,0.12405,-0.01636,-0.09464,0.05735,0.01434,0.21511,-0.11107,0.03075],sm:0.142,so:0.6162},
5:{b:[0.04586,0.5226,0.25736,0.08674,3.99986,0.18808,-0.02805,0.03755,0.04513,0.00903,0.23802,-0.12008,0.01272],sm:0.1913,so:0.6775},
6:{b:[0.05027,0.51295,0.36693,0.07788,7.6947,0.15647,-0.06529,0.08297,0.02356,0.00393,0.27638,-0.06894,-0.00598],sm:0.2407,so:0.74},
7:{b:[0.04847,0.54112,0.46478,0.0701,11.35231,0.09636,-0.12544,0.17734,0.00015,0.00002,0.31257,0.00531,-0.02583],sm:0.29,so:0.7903},
8:{b:[0.04771,0.54574,0.55023,0.09214,20.13098,0.02822,-0.16853,0.24269,-0.00823,-0.00103,0.32167,0.0618,-0.01887],sm:0.348,so:0.8358},
9:{b:[0.04881,0.49958,0.62717,0.07455,33.92295,0.0051,-0.18784,0.23559,-0.01917,-0.00213,0.38474,0.08524,-0.0612],sm:0.406,so:0.9355},
10:{b:[0.04565,0.50131,0.66461,0.08498,61.3101,-0.02549,-0.20815,0.28932,-0.03514,-0.00351,0.39983,0.0977,-0.03924],sm:0.464,so:0.9748},
11:{b:[0.05135,0.41925,0.76715,0.05583,51.92707,-0.04667,-0.20217,0.22785,0.00968,0.00088,0.4894,0.07222,-0.08186],sm:0.4918,so:1.1058},
12:{b:[0.04898,0.42203,0.80696,0.06461,44.98693,-0.0639,-0.21918,0.3056,-0.03083,-0.00257,0.48368,0.06634,-0.08061],sm:0.5197,so:1.1284},
13:{b:[0.04775,0.41564,0.86288,0.10369,-10.8613,-0.10365,-0.24224,0.32976,0.00156,0.00012,0.49159,0.07153,-0.07169],sm:0.5475,so:1.1867}
};
const COEF_NT={
1:{b:[0.02239,0,0,0.30292,0.30292,0,0.02239,-0.15525,0.28304,0.28304,-0.35455,0.02239,0],sm:0.107,so:0.324},
2:{b:[0.02829,0,0,0.41267,0.41267,0,0.05658,-0.22592,0.34789,0.17395,-0.2149,-0.08887,0],sm:0.1155,so:0.6537},
3:{b:[0.02009,0,0,0.43784,0.43784,0,0.06029,-0.23916,0.21645,0.07215,-0.09502,-0.08224,0],sm:0.124,so:0.802},
4:{b:[0.02274,0,0,0.47087,0.47087,0,0.09097,-0.19104,0.1376,0.0344,-0.05328,-0.12196,0.13311],sm:0.142,so:0.8647},
5:{b:[0.01926,0,0,0.45368,0.45368,0,0.09629,-0.2292,0.07298,0.0146,0.05764,-0.10961,0.00852],sm:0.1913,so:0.924},
6:{b:[0.01771,0,0,0.43032,0.43032,0,0.1063,-0.2209,0.07548,0.01258,0.15946,-0.1292,-0.0052],sm:0.2407,so:0.9715},
7:{b:[0.01593,0,0,0.3764,0.3764,0,0.11147,-0.23427,0.06984,0.00998,0.30137,-0.13039,-0.01579],sm:0.29,so:1.0305},
8:{b:[0.01617,0,0,0.31348,0.31348,0,0.12938,-0.28848,0.10163,0.0127,0.46857,-0.15829,-0.01892],sm:0.348,so:1.0661},
9:{b:[0.01374,0,0,0.22544,0.22544,0,0.12354,-0.3163,0.13893,0.01544,0.63509,-0.09292,-0.13414],sm:0.406,so:1.1981},
10:{b:[0.01328,0,0,0.18402,0.18402,0,0.13292,-0.32481,0.15549,0.01555,0.75416,-0.09872,-0.13859],sm:0.464,so:1.242},
11:{b:[0.01385,0,0,0.11366,0.11366,0,0.15214,-0.34479,0.31493,0.02863,0.86965,-0.09956,-0.14108],sm:0.4918,so:1.4093},
12:{b:[0.01358,0,0,0.09805,0.09805,0,0.16287,-0.31422,0.33366,0.02781,0.94779,-0.12167,-0.1624],sm:0.5197,so:1.4619},
13:{b:[0.01254,0,0,0.12512,0.12512,0,0.16294,-0.24876,0.37529,0.02887,0.94433,-0.12991,-0.16754],sm:0.5475,so:1.5092}
};

/* Hand strength. Refit September 2026 against the current play policy: 40,000
   hands per round size per trump mode, tables of 3 to 6 seats, every seat
   bidding from the model being fitted and playing with the engine in this file,
   two passes so the bids that generated the data came from the refit. Ridge
   least squares on the 13 features below; `so` is the residual spread of
   tricks around the prediction, `sm` is unchanged from the original. One
   coefficient set per round size from 1 to 13. Separate tables because no-trump is a different
   game: topTrump, trumpLen and ruff are all identically zero there, so the model
   has to price the hand on suit length and running a suit instead.

   The hypergeometric term is what makes a jack worth 0.83 when three opponents hold
   one card each and ~0 when they hold ten: rank only matters relative to how much
   of the deck is actually in play. */
const LF=[0]; for(let i=1;i<=60;i++) LF[i]=LF[i-1]+Math.log(i);
const lc=(a,b)=> (b<0||b>a) ? -Infinity : LF[a]-LF[b]-LF[a-b];
function pNoneDealt(h,U,D){                 // P(no higher card of the suit is in play)
  if(h===0) return 1;
  if(U-h < D) return 0;
  return Math.exp(lc(U-h,D)-lc(U,D));
}
function pAtMostOne(h,U,D){                 // P(card wins on the second round of its suit)
  if(h<=1) return 1;
  let p=pNoneDealt(h,U,D);
  if(U-h>=D-1 && D>=1) p+=h*Math.exp(lc(U-h,D-1)-lc(U,D));
  return Math.min(1,p);
}
/* Cards everyone can see and nobody holds - in practice the card turned over to
   set trump. They shrink the unseen pool and, if they outrank one of yours,
   promote it: with the trump ace face up on the table, your trump king is the
   highest trump anyone can actually hold. */
let KNOWN=[];
function features(hand,trump,n,P,leadPos){
  const U=52-n-KNOWN.length, D=(P-1)*n, mine=new Set(hand);
  const isKnown=c=>KNOWN.indexOf(c)>=0;
  const bySuit=[[],[],[],[]];
  for(const c of hand) bySuit[suitOf(c)].push(c);
  let topTrump=0, topSide=0, trumpLen=0, voids=0, singles=0, sideCards=0, runNext=0, longest=0;
  for(let s=0;s<4;s++){
    const cards=bySuit[s];
    if(s!==trump){
      if(cards.length===0) voids++; else if(cards.length===1) singles++;
      sideCards+=cards.length;
    } else trumpLen=cards.length;
    if(cards.length>longest) longest=cards.length;
    for(const c of cards){
      let h=0;
      for(let r=rankOf(c)+1;r<=14;r++){ const d=s*13+(r-2); if(!mine.has(d) && !isKnown(d)) h++; }
      const top=pNoneDealt(h,U,D);
      if(s===trump) topTrump+=top; else topSide+=top;
      runNext += pAtMostOne(h,U,D);
    }
  }
  const ruff = trump>=0 ? Math.min(trumpLen,3)*(voids+0.4*singles) : 0;
  // trumps that could still be in an opponent's hand: not mine, not face up
  let knownTrumps=0;
  if(trump>=0) for(const k of KNOWN) if(suitOf(k)===trump) knownTrumps++;
  const noTrumpOut = trump>=0 ? pNoneDealt(Math.max(0,13-trumpLen-knownTrumps),U,D) : 1;
  const onLead = leadPos===0 ? 1 : 0;
  return [1,topTrump,trumpLen,topSide,topSide*noTrumpOut,ruff,sideCards,n/P,onLead,onLead/n,
          runNext,longest,Math.max(0,longest-3)];
}
/* Pick the coefficient set: trump mode, then round size clamped to the fitted range. */
let CUR_TRUMP=0;
const cf=n=>{ const t=(CUR_TRUMP>=0?COEF_T:COEF_NT); return t[Math.min(Math.max(n,1),13)]; };
function muFor(hand,trump,n,P,leadPos){
  CUR_TRUMP=trump;
  const b=cf(n).b, f=features(hand,trump,n,P,leadPos);
  let m=0; for(let i=0;i<b.length;i++) m+=b[i]*f[i];
  return Math.max(0,Math.min(n,m));
}

/* One generative model, used in both directions: a player's true strength is
   mu +/- sigModel, and they bid whatever maximises Vienna EV at that strength.
   sigOutcome is deal luck (their own uncertainty); sigModel is my error about them. */
const erf=x=>{const s=x<0?-1:1; x=Math.abs(x);
  const t=1/(1+0.3275911*x);
  return s*(1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x));};
const Phi=z=> z<=-8?0 : z>=8?1 : 0.5*(1+erf(z/Math.SQRT2));
/* P(taking exactly k tricks) given a hand strength, as a discretised gaussian.
   Used by the bidder to price each candidate bid under Vienna. */
function trickDist(mu,n,sig){
  const p=[]; let tot=0;
  for(let k=0;k<=n;k++){ const w=Math.exp(-((k-mu)*(k-mu))/(2*sig*sig)); p.push(w); tot+=w; }
  return p.map(x=>x/tot);
}
function bestBidFor(mu,n,banned){
  const p=trickDist(mu,n,cf(n).so);
  let best=-1,bev=-Infinity;
  for(let b=0;b<=n;b++){
    if(b===banned) continue;
    let ev=0; for(let k=0;k<=n;k++) ev+=p[k]*vienna(b,k,n);
    if(ev>bev){bev=ev;best=b;}
  }
  return best;
}
const THRESH={};
/* The EV-optimal bid is a step function of hand strength, so precompute the
   strength ranges that map to each bid. Cached per (round size, banned bid):
   the bands only move when the hook removes an option. */
function bands(n,banned){
  const key=n+"|"+banned+"|"+(CUR_TRUMP>=0?"T":"N");
  if(THRESH[key]) return THRESH[key];
  const STEP=0.004, sw=[]; let prev=bestBidFor(0,n,banned);
  for(let mu=STEP; mu<=n+1e-9; mu+=STEP){
    const b=bestBidFor(mu,n,banned);
    if(b!==prev){ sw.push({mu,to:b}); prev=b; }
  }
  const edges=[0].concat(sw.map(x=>x.mu)).concat([n]);
  const out=[]; let b=bestBidFor(0,n,banned);
  for(let i=0;i<edges.length-1;i++){ out.push({lo:edges[i],hi:edges[i+1],bid:b});
    if(sw[i]) b=sw[i].to; }
  return THRESH[key]=out;
}
function bidAt(mu,n,banned){
  for(const bd of bands(n,banned)) if(mu>=bd.lo && mu<bd.hi) return bd.bid;
  return bands(n,banned)[bands(n,banned).length-1].bid;
}
/* Per-player profile.
     bias  - tricks this player habitually bids above (+) or below (-) optimal
     noise - how far their bid strays from EV-optimal, as a fraction of the
             round's outcome spread. 0 means they bid perfectly every time, so
             the only uncertainty left is my own error estimating their hand.
   Both default to "plays optimally" until scoresheet data says otherwise. */
const PROFILE_DEFAULT = {bias:0, noise:0};
function profOf(cfg,seat){ return (cfg.profiles && cfg.profiles[seat]) || PROFILE_DEFAULT; }
function sigLik(n,prof){
  const c=cf(n), pn=(prof||PROFILE_DEFAULT).noise;
  return Math.sqrt(c.sm*c.sm + (pn*c.so)*(pn*c.so));
}
function bidLikelihood(muHat,n,banned,obs,prof){
  const pr=prof||PROFILE_DEFAULT;
  muHat += pr.bias;                       // they bid as if this strong
  const sig=sigLik(n,pr); let p=0;
  for(const bd of bands(n,banned)){
    if(bd.bid!==obs) continue;
    const lo = bd.lo<=0 ? -Infinity : (bd.lo-muHat)/sig;
    const hi = bd.hi>=n ?  Infinity : (bd.hi-muHat)/sig;
    p += Phi(hi)-Phi(lo);
  }
  return Math.max(p,1e-12);
}

/* ===== play policy ===== */
function beats(c,w,trump){
  if(w<0) return true;
  const ct=suitOf(c)===trump, wt=suitOf(w)===trump;
  if(ct&&!wt) return true;
  if(!ct&&wt) return false;
  if(suitOf(c)!==suitOf(w)) return false;
  return rankOf(c)>rankOf(w);
}
const skey=(c,trump)=>(suitOf(c)===trump?100:0)+rankOf(c);

/* Card memory. `seen` is a 52-flag array of cards already played; anything
   neither seen nor in my own hand is outstanding in someone else's hand. */
function outHigher(c,seen,mine){
  const s=suitOf(c); let k=0;
  for(let r=rankOf(c)+1;r<=14;r++){ const d=s*13+(r-2); if(!seen[d]&&!mine.has(d)) k++; }
  return k;
}
function outTrumps(trump,seen,mine){
  if(trump<0) return 0;
  let k=0;
  for(let r=2;r<=14;r++){ const d=trump*13+(r-2); if(!seen[d]&&!mine.has(d)) k++; }
  return k;
}
const isBoss=(c,ctx)=>outHigher(c,ctx.seen,ctx.mine)===0;

/* Is anyone else still holding this suit? If every card of it is either played
   or in my own hand, nobody will ever lead it to me. */
function suitLiveElsewhere(s,seen,mine){
  for(let r=2;r<=14;r++){ const d=s*13+(r-2); if(!seen[d]&&!mine.has(d)) return true; }
  return false;
}

/* A winner that does not need the lead. A boss trump qualifies outright - it
   takes the trick whenever it is played, including as a ruff. A boss side card
   qualifies only while opponents still hold the suit, because that is what makes
   them lead it to me. Once the suit is dead everywhere else, the card cashes
   only on my own lead, and if I give the lead up I am reduced to discarding it. */
function selfCashing(c,ctx,trump){
  if(!isBoss(c,ctx)) return false;
  if(suitOf(c)===trump) return true;
  /* No trump suit at all: nothing is self-cashing. Every winner you hold can be
     stranded, because once you are void in the led suit you are discarding, and
     a discarded boss card wins nothing. That is the long-suit case - there the
     lead is the whole asset and must not be spent. */
  if(trump<0) return false;
  return suitLiveElsewhere(suitOf(c),ctx.seen,ctx.mine);
}

/* Weakness ordering for choosing which card to lead away. Raw rank is not
   enough: a side ace outranks nothing on the trump scale but is a certain
   trick, while a low trump looks strong and is a certain loser. Boss cards sort
   to the top so they are never led away as though they were junk. Used only
   here - applying the same bonus to the discard set tested slightly negative. */
const mstr=(c,trump,ctx)=> skey(c,trump) + (ctx && isBoss(c,ctx) ? 200 : 0);

/* Play policy. Three things beyond raw rank, each measured to pay for itself
   against the previous memoryless version (+0.11 points/round at a 4 seat table,
   most of it in rounds of 7 or more):

     grab  - once won > bid the contract is dead and Vienna pays raw tricks,
             so every further trick is worth +1. Ducking there was free money lost.
     lead  - with memory you can lead a card that is actually boss instead of
             just the highest one you hold, and avoid feeding a suit an opponent
             who still needs tricks is known void in.
     shed  - when discarding, do not throw a card that has become boss.

   Deliberately NOT here: ducking a trick because no card looks safe against the
   seats behind you. It tests clearly negative - a surrendered trick is gone,
   while an overspent card only costs if it was needed later. */
function chooseCard(hand, ledSuit, winCard, trump, needed, ctx){
  const left=hand.length;
  const grab = needed<0;                    // contract already busted high
  const eff  = grab ? left : needed;

  let legal=hand;
  if(ledSuit>=0){ const f=hand.filter(c=>suitOf(c)===ledSuit); if(f.length) legal=f; }

  const slack=left-Math.max(eff,0);
  const sorted=hand.slice().sort((a,b)=>skey(a,trump)-skey(b,trump));
  const dump=new Set(sorted.slice(0,Math.max(0,slack)));

  if(ledSuit<0){
    /* Cash first, or spend the lead on a loser? It turns on whether the tricks
       you still need survive losing the lead.

       A boss trump wins whenever it is played, so it needs no lead of its own.
       Count those: if they already cover everything still owed, the lead is
       spare, and the best use of a spare lead is to push out a loser while
       opponents still hold the cards that beat it. Hold A-2 of trumps needing
       one: lead the 2 and somebody is forced to win it, then the ace takes the
       rest. Cash the ace first and you strip the very cards that would have
       taken your 2, which then wins a trick you never wanted.

       Without that cover the opposite holds. A long side suit only cashes while
       you are leading it - give up the lead and you are discarding winners - so
       there you lead the boss card and keep going. */
    const safeWins = ctx ? legal.filter(c=>selfCashing(c,ctx,trump)).length : 0;
    const leadIsSpare = safeWins >= eff && slack > 0;

    if(eff>0 && ctx && !leadIsSpare){
      const boss=legal.filter(c=>isBoss(c,ctx) &&
        (suitOf(c)===trump || outTrumps(trump,ctx.seen,ctx.mine)===0));
      // lowest boss: keeps the higher cards of the run boss for later tricks
      if(boss.length) return boss.reduce((a,b)=>skey(b,trump)<skey(a,trump)?b:a);
    }
    if(eff<=0 || slack>0){
      const p=legal.filter(c=>dump.has(c));
      const pool=p.length?p:legal;
      const k=c=>mstr(c,trump,ctx);
      const risky=c=>(ctx&&ctx.needyVoidIn[suitOf(c)]&&suitOf(c)!==trump)?1:0;
      return pool.reduce((a,b)=>{
        const ra=risky(a), rb=risky(b);
        if(ra!==rb) return rb<ra?b:a;
        return k(b)<k(a)?b:a;
      });
    }
    const t=legal.filter(c=>suitOf(c)===trump);
    const pool=t.length?t:legal;
    return pool.reduce((a,b)=>rankOf(b)>rankOf(a)?b:a);
  }

  const winners=legal.filter(c=>beats(c,winCard,trump));
  const keepers=winners.filter(c=>!dump.has(c));
  if(eff>0 && keepers.length){
    const k=c=>rankOf(c)+(suitOf(c)===trump&&ledSuit!==trump?100:0);
    return keepers.reduce((a,b)=>k(b)<k(a)?b:a);
  }
  if(grab && winners.length){
    return winners.reduce((a,b)=>rankOf(b)<rankOf(a)?b:a);
  }
  const losers=legal.filter(c=>!beats(c,winCard,trump));
  if(losers.length){
    const p=losers.filter(c=>dump.has(c));
    const pool=p.length?p:losers;
    return pool.reduce((a,b)=>{
      const ba=(ctx&&eff>0&&isBoss(a,ctx))?1:0, bb=(ctx&&eff>0&&isBoss(b,ctx))?1:0;
      if(ba!==bb) return bb<ba?b:a;
      return rankOf(b)>rankOf(a)?b:a;
    });
  }
  if(eff>0 && winners.length){
    const k=c=>rankOf(c)+(suitOf(c)===trump&&ledSuit!==trump?100:0);
    return winners.reduce((a,b)=>k(b)<k(a)?b:a);
  }
  return legal.reduce((a,b)=>rankOf(b)<rankOf(a)?b:a);
}

function playHand(hands,bids,trump,P,n){
  const h=hands.map(x=>x.slice()), won=new Array(P).fill(0);
  const seen=new Uint8Array(52);
  const voids=Array.from({length:P},()=>[false,false,false,false]);
  let leader=0;
  for(let t=0;t<n;t++){
    let ledSuit=-1, winCard=-1, winner=leader;
    for(let i=0;i<P;i++){
      const p=(leader+i)%P;
      const mine=new Set(h[p]);
      const needyVoidIn=[false,false,false,false];
      for(let q=0;q<P;q++){
        if(q===p || bids[q]-won[q]<=0) continue;
        for(let s=0;s<4;s++) if(voids[q][s]) needyVoidIn[s]=true;
      }
      const card=chooseCard(h[p],ledSuit,winCard,trump,bids[p]-won[p],
                            {seen,mine,trump,needyVoidIn});
      h[p].splice(h[p].indexOf(card),1);
      seen[card]=1;
      if(i===0) ledSuit=suitOf(card);
      else if(suitOf(card)!==ledSuit) voids[p][ledSuit]=true;
      if(beats(card,winCard,trump)){ winCard=card; winner=p; }
    }
    won[winner]++; leader=winner;
  }
  return won;
}

/* Bidders behind you read the auction. Tricks are conserved, so if B of the n
   tricks are already claimed and R players are still to bid, a bidder's share of
   what is left scales by P(n-B)/(R*n) against the prior. A round already sold out
   gets shaded hard; an undersold one gets a damped nudge upward. */
/* How a player behind you shades their own estimate after hearing the auction.
   Tricks are conserved: if B of the n tricks are already claimed and R players
   are still to bid, their share of what is left scales by P(n-B)/(R*n) against
   the prior. A round already sold out is shaded hard; an undersold one gets a
   damped nudge up, damped because the full correction steers the dealer onto
   the hooked number far too often. */
function auctionFactor(n,P,B,R){
  const free = n - B;
  if(free <= 0) return Math.max(0, 1 + free/n);
  const fair = Math.max(0, Math.min(2, (P*free)/(R*n)));
  return 1 + 0.5*(fair - 1);
}

/* ===== simulation ===== */
/* One full set of statistics. Three of these ride along per candidate bid: one
   over every simulated deal, and one each for the deals where the bids around
   the table sum to more or fewer tricks than the round actually holds. Every
   deal feeds `all` plus exactly one of the other two, so the subsets partition
   the run and each can be reported on its own terms - its own margin, its own
   make rate, its own trick distribution and its own error bars. Weight is
   tracked per bucket because a subset carries fewer effective deals than the
   whole run, and the error bars have to widen to say so. */
function bucket(n,P){
  return { w:0, w2:0, pts:0, d:0, d2:0, makes:0, tricks:0,
           hist:new Array(n+1).fill(0), behind:0, oppMakes:0, bidTot:0 };
}
/* Fold one played-out deal into a bucket. */
function push(b,w,score,d,tricks,behind,oppMakes,bidTot,made){
  b.w+=w; b.w2+=w*w; b.pts+=w*score; b.d+=w*d; b.d2+=w*d*d;
  b.tricks+=w*tricks; b.hist[tricks]+=w; b.behind+=w*behind;
  b.oppMakes+=w*oppMakes; b.bidTot+=w*bidTot; if(made) b.makes+=w;
}

/* Set up a run: work out which bids are legal, which cards are unseen, and
   allocate one accumulator per candidate bid. */
function initSim(cfg){
  const n=cfg.hand.length, P=cfg.players;
  const inHand=new Set(cfg.hand), pool=[];
  /* The turned card is face up and out of the deal, so it never gets dealt to
     an opponent and it is public information while reading the auction. */
  KNOWN = (cfg.trumpCard>=0 && !inHand.has(cfg.trumpCard)) ? [cfg.trumpCard] : [];
  for(let c=0;c<52;c++) if(!inHand.has(c) && KNOWN.indexOf(c)<0) pool.push(c);
  const isDealer = cfg.seat===P-1;
  const priorSum = cfg.priorBids.reduce((a,b)=>a+b,0);
  const banned = isDealer ? n-priorSum : -1;
  const cands=[];
  for(let b=0;b<=n;b++) if(b!==banned) cands.push(b);
  return { cfg,n,P,pool,cands,banned, rng:mulberry32(cfg.seed>>>0), done:0, wSum:0, wSum2:0,
    acc: cands.map(()=>({ all:bucket(n,P), over:bucket(n,P), under:bucket(n,P) })),
  };
}

/* The main loop, run in slices so the page stays responsive.
   Per deal: shuffle the unseen cards, weight the deal by how well it explains
   the bids ahead of you, then play out every candidate bid you could make
   against that same deal. Reusing one deal across all candidates is deliberate:
   the differences between bids are far more precise than any single row's
   confidence interval suggests, because the deal luck is held constant. */
function runChunk(S,count){
  const {cfg,n,P,pool,cands,rng}=S, nOpp=P-1;
  for(let it=0; it<count && S.done<cfg.iterations; it++, S.done++){
    for(let i=pool.length-1;i>0;i--){ const j=(rng()*(i+1))|0; const t=pool[i]; pool[i]=pool[j]; pool[j]=t; }
    const opp=[]; for(let k=0;k<nOpp;k++) opp.push(pool.slice(k*n,k*n+n));
    const hands=new Array(P); let oi=0;
    for(let s=0;s<P;s++) hands[s] = (s===cfg.seat) ? cfg.hand : opp[oi++];

    // weight this deal by how plausible the bids ahead of you are, given the hands
    // it dealt - this is what conditions the unseen cards on the auction
    let w=1, Bo=0;
    for(let s=0;s<cfg.seat;s++){
      const mu = muFor(hands[s],cfg.trump,n,P,s)*auctionFactor(n,P,Bo,P-s);
      w *= bidLikelihood(mu,n,-1,cfg.priorBids[s],profOf(cfg,s));
      Bo += cfg.priorBids[s];
    }
    S.wSum+=w; S.wSum2+=w*w;
    if(w < 1e-9) continue;              // contributes nothing, skip the playouts

    // raw hand strength and one uniform per seat behind you, drawn once per deal so
    // every candidate bid is judged against the same cards and the same coin flips
    const raw=new Array(P).fill(0), u=new Array(P).fill(0);
    for(let s=cfg.seat+1;s<P;s++){
      raw[s]=muFor(hands[s],cfg.trump,n,P,s);
      // box-muller: their true strength is my estimate plus my own model error
      const a=Math.max(rng(),1e-12), b2=rng();
      u[s]=Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*b2);
    }

    for(let ci=0; ci<cands.length; ci++){
      const bids=new Array(P).fill(0);
      let B=0, behind=0;
      for(let s=0;s<cfg.seat;s++){ bids[s]=cfg.priorBids[s]; B+=bids[s]; }
      bids[cfg.seat]=cands[ci]; B+=cands[ci];
      for(let s=cfg.seat+1;s<P;s++){
        const pr=profOf(cfg,s);
        const e=Math.max(0, Math.min(n,
          raw[s]*auctionFactor(n,P,B,P-s) + pr.bias + u[s]*sigLik(n,pr)));
        const banned = (s===P-1) ? n-B : -1;    // only the dealer is hooked
        const b=bidAt(e,n,banned);
        bids[s]=b; B+=b; behind+=b;
      }
      const won=playHand(hands,bids,cfg.trump,P,n);
      const sc=new Array(P); let tot=0;
      for(let s=0;s<P;s++){ sc[s]=vienna(bids[s],won[s],n); tot+=sc[s]; }
      const d = sc[cfg.seat] - tot/P;
      const a=S.acc[ci];
      let oppMade=0, bidTot=0;
      for(let s=0;s<P;s++){
        bidTot+=bids[s];
        if(s!==cfg.seat && won[s]===bids[s]) oppMade++;
      }
      const made = won[cfg.seat]===cands[ci];
      const args=[w, sc[cfg.seat], d, won[cfg.seat], behind, oppMade, bidTot, made];
      push(a.all, ...args);
      /* B is the full table total once every seat has bid, mine included. A
         round that sold exactly n has no tension either way; the hook normally
         makes it impossible, and where it is not, it belongs in neither subset. */
      if(B>n)      push(a.over,  ...args);
      else if(B<n) push(a.under, ...args);
    }
  }
}

/* Turn the weighted accumulators into per-bid figures, once per view. Each view
   divides by its own weight, so "40% of deals" in the oversold view means 40% of
   oversold deals, not 40% of the run. Error bars use that view's effective
   sample size, which is why a subset's bars are wider than the full run's. */
function finalizeView(S,key){
  const W=S.acc.map(a=>a[key].w);
  const tot=W.reduce((x,y)=>x+y,0)/Math.max(S.cands.length,1);  // typical bucket weight
  const rows=S.cands.map((bid,i)=>{
    const b=S.acc[i][key];
    const N=b.w;
    if(N<=1e-12){
      // This bid cannot produce a table total of that sign, so the view is empty
      // for this row. Reported as absent rather than as zero.
      return { bid, empty:true, share:0, points:null, delta:null, se:null,
               makePct:null, avgTricks:null, hist:new Array(S.n+1).fill(0),
               behind:null, oppMakePct:null, avgBidTotal:null };
    }
    const m=b.d/N, v=b.d2/N-m*m;
    const ess=b.w2>0 ? (b.w*b.w)/b.w2 : 0;
    return { bid, empty:false,
      share: 100*b.w/Math.max(S.acc[i].all.w,1e-12),   // how much of this bid's deals land here
      points:b.pts/N, delta:m,
      se: Math.sqrt(Math.max(v,0)/Math.max(ess,1)),
      makePct:100*b.makes/N, avgTricks:b.tricks/N,
      hist:b.hist.map(h=>h/N), behind:b.behind/N,
      oppMakePct:100*b.oppMakes/(N*(S.P-1)), avgBidTotal:b.bidTot/N, ess };
  });
  const live=rows.filter(r=>!r.empty);
  const best=live.length ? live.reduce((a,b)=> b.delta>a.delta ? b : a).bid : null;
  const ess=live.length ? Math.max(...live.map(r=>r.ess)) : 0;
  return { rows, best, ess, empty:live.length===0,
           coverage: S.wSum>1e-12 ? 100*tot/S.wSum : 0 };
}

function finalize(S){
  const ess=S.wSum2>0 ? (S.wSum*S.wSum)/S.wSum2 : 0;   // effective sample size
  return {
    views: { all:finalizeView(S,"all"), over:finalizeView(S,"over"), under:finalizeView(S,"under") },
    n:S.n, banned:S.banned, iterations:S.done, ess,
  };
}


module.exports={suitOf,rankOf,mulberry32,vienna,muFor,bidAt,beats,chooseCard,playHand,auctionFactor,features,initSim,runChunk,finalize,setKnown:(a)=>{KNOWN=a;}};
