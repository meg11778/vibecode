// turns the game's "Copy as text" hand into a saved-hand record the page can assess
module.exports=function(text){
  const S={"♠":"S","♥":"H","♦":"D","♣":"C"}, card=t=>t.slice(0,-1)+S[t.slice(-1)];
  const L=text.split("\n").map(x=>x.trim()).filter(Boolean), head=L[0];
  const cards=+/\| (\d+) cards/.exec(head)[1], tm=/trump (\S) \(turned (\S+)\)/.exec(head);
  const names=[], hands=[]; let i=L.indexOf("Hands:")+1;
  for(; !L[i].startsWith("Bids"); i++){ const p=L[i].split(/\s+/); names.push(p[0]); hands.push(p.slice(1).map(card)); }
  const seat=n=>names.indexOf(n);
  const bids=L[i].replace("Bids, in order: ","").split(", ").map(x=>{ const p=x.split(" "); return { seat:seat(p[0]), bid:+p[1] }; });
  const tricks=[];
  for(const ln of L){ const m=/^Trick\s+\d+: (.*?)\s+-> (\S+)/.exec(ln); if(!m) continue;
    const plays=m[1].split(", ").map(x=>{ const p=x.split(" "); return { seat:seat(p[0]), card:card(p[p.length-1]), by:"network" }; });
    tricks.push({ leader:plays[0].seat, winner:seat(m[2]), plays }); }
  const dealer=seat(/dealer (\S+)/.exec(head)[1]);
  return { id:"t"+cards+names.length, savedAt:"2026-11-13T00:00:00Z", players:names, cards, trump:tm?S[tm[1]]:"", turned:tm?card(tm[2]):"", hands, bids, tricks, dealer, game:{hand:1,of:1} };
};
