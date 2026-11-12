/* ===== neural card play =====
   Two small neural networks that choose the card to play, in place of the rules
   above. Each has three layers (two hidden layers of 128, one output per card)
   and was trained by self-play: every card was valued by playing the hand out
   many times with the current network in every seat, and the network was
   retrained on those values, generation after generation, until it stopped
   improving.

     Network 1   four players with a trump suit, 2 to 12 cards.
     Network 2   four players at no trump (2 to 13 cards, which includes the
                 round that deals the whole deck), five players (2 to 10 cards)
                 and six players (2 to 8), with or without trump.

   One network asked to learn all of it played four-handed trump worse, so that
   game keeps its own. Anything neither covers (three players, a one-card
   round) is played by the rules. Against the rules engine in the same seat,
   same deals and bids, network 1 scores about 0.2 Vienna points a round more
   at two cards rising to about 2.5 at twelve; network 2 about 0.2 to 1.8 at
   four players without trump, 0.2 to 1.7 at five players and 0.1 to 1.1 at
   six. Those are measured against this program's own engines, not people.

   A network sees only what a player at the table sees: its own hand, the cards
   played, which suits each seat has shown out of, the bids, the tricks won,
   the current trick and the turned card. Suits are relabelled so trump is
   always suit 0, and seats so the player to act is seat 0. The weights are at
   the end of this section, 16-bit, base64. */
const NETRT=[null,null,null];
/* Where each network's inputs sit. Network 2 has room for six seats and is told
   how many are playing and whether there is a trump suit. */
const NET_LAYOUT=[null,
  { n:252, pos:254, win:258, seats:-1,  nt:-1  },
  { n:272, pos:274, win:280, seats:286, nt:290 }];
function netDecode(b64,scale){
  const bin=atob(b64), nv=bin.length>>1, out=new Float32Array(nv);
  for(let i=0;i<nv;i++){
    let v=bin.charCodeAt(2*i)|(bin.charCodeAt(2*i+1)<<8);
    if(v>32767) v-=65536;
    out[i]=v*scale;
  }
  return out;
}
function netLoad(k){
  if(NETRT[k]) return NETRT[k];
  const d = k===1 ? { W1:NET_W1, W2:NET_W2, W3:NET_W3, S:NET_S,  B1:NET_B1,  B2:NET_B2,  B3:NET_B3 }
                  : { W1:NET2_W1,W2:NET2_W2,W3:NET2_W3,S:NET2_S, B1:NET2_B1, B2:NET2_B2, B3:NET2_B3 };
  return NETRT[k]={ L:NET_LAYOUT[k],
    W1:netDecode(d.W1.join(""),d.S[0]), W2:netDecode(d.W2.join(""),d.S[1]), W3:netDecode(d.W3.join(""),d.S[2]),
    b1:Float32Array.from(d.B1), b2:Float32Array.from(d.B2), b3:Float32Array.from(d.B3),
    acc:new Float32Array(NET_H), h1:new Float32Array(NET_H), h2:new Float32Array(NET_H) };
}
/* Which network plays this game: 1, 2, or 0 for neither. */
function netFor(P,n,trump){
  if(n<2) return 0;
  if(P===4) return trump>=0 ? (n<=12 ? 1 : 0) : (n<=13 ? 2 : 0);
  if(P===5) return n<=10 ? 2 : 0;
  if(P===6) return n<=8 ? 2 : 0;
  return 0;
}
const netCovers=(P,n,trump)=> netFor(P,n,trump)>0;
function netAdd(dst,W,row){ const o=row*NET_H; for(let j=0;j<NET_H;j++) dst[j]+=W[o+j]; }
function netAddV(dst,W,row,v){ const o=row*NET_H; for(let j=0;j<NET_H;j++) dst[j]+=v*W[o+j]; }

/* Suit relabelling for one decision at no trump, or null to leave the suits as
   they are. Every suit is equal at no trump, but the network's first suit slot
   is not: it is where trump sits in every trump deal, and training shuffled
   only the other three. Left alone, a hand with a very long spade suit (spades
   being the suit that lands in that slot) was played as if spades were trumps -
   found by Matt Glassman with twelve spades and a side deuce at 13 cards. So a
   player holding six or more spades sees the suits relabelled with its shortest
   suit in the first slot instead. Any relabelling is a legal view of a no-trump
   hand; this one keeps a long suit out of the odd slot. On ordinary deals it
   changes nothing measurable. The second network has since been retrained with all
   four suits shuffled at no trump (11 Nov 2026) and no longer needs this; it is
   kept because it costs nothing. */
const NT_LONG=6;
function ntMap(hand){
  const cnt=[0,0,0,0];
  for(let q=0;q<hand.length;q++) cnt[(hand[q]/13)|0]++;
  if(cnt[0]<NT_LONG) return null;
  let z=0;
  for(let s=1;s<4;s++) if(cnt[s]<cnt[z]) z=s;
  if(z===0) return null;
  const m=[0,0,0,0]; let k=1;
  for(let s=0;s<4;s++) m[s]=(s===z)?0:k++;
  return m;
}
const netRe=(c,pm)=> pm ? pm[(c/13)|0]*13+(c%13) : c;

/* Play one deal with the network in every seat. Same contract as playHand:
   seat 0 leads the first trick, returns tricks won per seat. `turned` is the
   card turned for trump, or -1 if there is none or it was not entered.
   `rulesSeat`, if given, is one seat to be played by the rules engine instead:
   the calculator uses it to price a bid both ways for the player it advises. */
function playHandNet(hands,bids,trump,P,n,turned,rulesSeat){
  if(rulesSeat==null) rulesSeat=-1;
  const R=netLoad(netFor(P,n,trump)), L=R.L, H=NET_H, W1=R.W1, W2=R.W2, W3=R.W3, acc=R.acc, h1=R.h1, h2=R.h2, b3=R.b3;
  const hasTrump=trump>=0, m=[0,1,2,3];
  if(hasTrump){ let k=1; for(let s=0;s<4;s++) m[s]=(s===trump)?0:k++; }
  const cc=c=>m[(c/13)|0]*13+(c%13);
  const h=hands.map(x=>x.map(cc)), won=new Array(P).fill(0);
  const voids=[]; for(let s=0;s<P;s++) voids.push([0,0,0,0]);
  /* First-layer sum of the inputs that stay true for the rest of the hand
     (cards already played, the size of the table), kept running so it is not
     rebuilt at each play. */
  acc.set(R.b1);
  if(turned>=0) netAdd(acc,W1,52+cc(turned));
  netAddV(acc,W1,L.n,n);
  if(L.seats>=0) netAdd(acc,W1,L.seats+P-3);
  if(L.nt>=0 && !hasTrump) netAdd(acc,W1,L.nt);
  const trick=[0,0,0,0,0,0], played=[], tr=hasTrump?0:-1;
  const seenC = rulesSeat>=0 ? new Uint8Array(52) : null;
  const tc = turned>=0 ? cc(turned) : -1;
  let leader=0;
  for(let t=0;t<n;t++){
    let led=-1, win=-1, winner=leader;
    for(let i=0;i<P;i++){
      const p=(leader+i)%P, hand=h[p];
      let legal=hand;
      if(led>=0){
        const f=[];
        for(let q=0;q<hand.length;q++) if(((hand[q]/13)|0)===led) f.push(hand[q]);
        if(f.length) legal=f;
      }
      let card=legal[0];
      if(legal.length>1 && p===rulesSeat){
        const mine=new Set(hand), nv=[false,false,false,false];
        for(let q=0;q<P;q++){ if(q===p || bids[q]-won[q]<=0) continue; for(let u=0;u<4;u++) if(voids[q][u]) nv[u]=true; }
        card=chooseCard(hand,led,win,tr,bids[p]-won[p],{seen:seenC,mine,trump:tr,needyVoidIn:nv});
      } else if(legal.length>1){
        const pm = hasTrump ? null : ntMap(hand);
        if(pm){
          // relabelled view: nothing in the running sum applies, so build it afresh
          h1.set(R.b1);
          netAddV(h1,W1,L.n,n);
          if(L.seats>=0) netAdd(h1,W1,L.seats+P-3);
          if(L.nt>=0) netAdd(h1,W1,L.nt);
          if(tc>=0) netAdd(h1,W1,52+netRe(tc,pm));
          for(let q=0;q<played.length;q++) netAdd(h1,W1,52+netRe(played[q],pm));
        } else h1.set(acc);
        for(let q=0;q<hand.length;q++) netAdd(h1,W1,netRe(hand[q],pm));
        for(let q=0;q<i;q++) netAdd(h1,W1,104+netRe(trick[q],pm));
        if(win>=0) netAdd(h1,W1,156+netRe(win,pm));
        if(led>=0) netAdd(h1,W1,208+(pm?pm[led]:led));
        for(let r=0;r<P;r++){
          const s=(p+r)%P, o=212+r*10, need=bids[s]-won[s], v=voids[s];
          if(bids[s]) netAddV(h1,W1,o,bids[s]);
          if(won[s]) netAddV(h1,W1,o+1,won[s]);
          if(need>0) netAddV(h1,W1,o+2,need); else if(need<0) netAddV(h1,W1,o+3,-need);
          if(h[s].length) netAddV(h1,W1,o+4,h[s].length);
          if(r>0 && r>=P-i) netAdd(h1,W1,o+5);
          for(let u=0;u<4;u++) if(v[u]) netAdd(h1,W1,o+6+(pm?pm[u]:u));
        }
        netAddV(h1,W1,L.n+1,hand.length);
        netAdd(h1,W1,L.pos+i);
        if(i>0) netAdd(h1,W1,L.win+((winner-p+P)%P));
        h2.set(R.b2);
        for(let j=0;j<H;j++){
          const v=h1[j];
          if(v>0){ const o=j*H; for(let q=0;q<H;q++) h2[q]+=v*W2[o+q]; }
        }
        let bv=-Infinity;
        for(let q=0;q<legal.length;q++){
          const c=legal[q], cx=netRe(c,pm), o=cx*H; let z=b3[cx];
          for(let j=0;j<H;j++){ const v=h2[j]; if(v>0) z+=v*W3[o+j]; }
          if(z>bv){ bv=z; card=c; }
        }
      }
      hand.splice(hand.indexOf(card),1);
      netAdd(acc,W1,52+card); played.push(card);
      if(seenC) seenC[card]=1;
      trick[i]=card;
      const cs=(card/13)|0, ws=(win/13)|0;
      if(i===0) led=cs; else if(cs!==led) voids[p][led]=1;
      if(win<0 || (hasTrump && cs===0 && ws!==0) || (cs===ws && card>win)){ win=card; winner=p; }
    }
    won[winner]++; leader=winner;
  }
  return won;
}

