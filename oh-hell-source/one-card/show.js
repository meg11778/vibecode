const r=require('./'+process.argv[2]);const TR=['top','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'],NR=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
console.log('P',r.P,'value',r.value.join(' '),'| BR gain',r.bestResponseGain.join(' '));
for(const s of r.strategy){ if(s.forced!==null){console.log(s.seat,s.bids||'-','reach',s.reach,'FORCED',s.forced);continue;}
 const t=s.p1.slice(0,12),n=s.p1.slice(12);
 // threshold: number of trumps bid (p>=0.5), mixed entries
 const tb=t.filter(x=>x>=0.5).length, mix=t.map((x,i)=>x>0.1&&x<0.9?TR[i]+':'+x:'').filter(Boolean).join(' ');
 const nb=n.map((x,i)=>x>=0.5?NR[i]:'').filter(Boolean).join(''), nmix=n.map((x,i)=>x>0.1&&x<0.9?NR[i]+':'+x:'').filter(Boolean).join(' ');
 console.log(s.seat,s.bids||'-','reach',s.reach,'| trumps bid: best',tb,mix?'(mixed '+mix+')':'','| side:',nb||'none',nmix?'(mixed '+nmix+')':''); }
